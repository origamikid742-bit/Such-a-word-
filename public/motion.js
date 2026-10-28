'use strict';

// Short animations that make the game feel alive. They only move things on
// screen and never change the game. Devices set to reduce motion get none.
// Uses makeElement from client.js.

const EASE_OUT = 'cubic-bezier(0.2, 0.8, 0.2, 1)';
const lessMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const centerOf = (rect) => ({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });

// Where each tile (anything with data-tile-id) is on screen right now, with a
// copy of it so a tile that disappears can fade out where it was. When a tile
// shows up twice, the later container wins: a tile being previewed on the
// board is also still shown in the hand.
function tilePositions(...containers) {
  const positions = new Map();
  for (const container of containers) {
    for (const element of container.querySelectorAll('[data-tile-id]')) {
      const rect = element.getBoundingClientRect();
      if (rect.width === 0) continue;
      positions.set(element.dataset.tileId, { rect, copy: element.cloneNode(true) });
    }
  }
  return positions;
}

// After a redraw: tiles that moved slide over from where they were, new tiles
// fly in from originFor(element) one after another (or pop in), and tiles
// that are gone fade away where they were.
function animateTiles(before, containers, { originFor = () => null, stagger = 45 } = {}) {
  if (lessMotion()) return;
  const now = new Map();
  for (const container of containers) {
    for (const element of container.querySelectorAll('[data-tile-id]')) now.set(element.dataset.tileId, { element, container });
  }

  const moved = new Map(); // container → tiles that were already on screen
  let newcomers = 0;
  for (const [id, { element, container }] of now) {
    const to = element.getBoundingClientRect();
    if (to.width === 0) continue;
    const old = before.get(id);
    if (old) {
      if (!moved.has(container)) moved.set(container, []);
      moved.get(container).push({ element, from: old.rect, to });
      continue;
    }
    const from = originFor(element);
    const delay = newcomers++ * stagger;
    if (from) {
      const dx = centerOf(from).x - centerOf(to).x;
      const dy = centerOf(from).y - centerOf(to).y;
      element.animate([
        { transform: `translate(${dx}px, ${dy}px) scale(0.35)`, opacity: 0 },
        { opacity: 1, offset: 0.25 },
        { transform: 'none', opacity: 1 },
      ], { duration: 450, delay, easing: EASE_OUT, fill: 'backwards' });
    } else {
      element.animate([
        { transform: 'scale(0.5)', opacity: 0 },
        { transform: 'none', opacity: 1 },
      ], { duration: 240, delay, easing: EASE_OUT, fill: 'backwards' });
    }
  }

  for (const tiles of moved.values()) {
    // When every tile in a row moved the same way, the row itself was pushed
    // (something above it grew or shrank), so nothing needs to slide.
    if (tiles.length > 1 && tiles.every((tile) => sameShift(tile, tiles[0]))) continue;
    for (const { element, from, to } of tiles) slide(element, from, to);
  }

  for (const [id, old] of before) {
    if (!now.has(id) && old.copy) fadeAway(old);
  }
}

function shiftOf({ from, to }) {
  return {
    x: centerOf(from).x - centerOf(to).x,
    y: centerOf(from).y - centerOf(to).y,
    scale: from.width / to.width,
  };
}

function sameShift(a, b) {
  const first = shiftOf(a);
  const second = shiftOf(b);
  return Math.abs(first.x - second.x) < 1 && Math.abs(first.y - second.y) < 1 && Math.abs(first.scale - second.scale) < 0.02;
}

function slide(element, from, to) {
  const { x, y, scale } = shiftOf({ from, to });
  if (Math.abs(x) < 1 && Math.abs(y) < 1 && Math.abs(scale - 1) < 0.02) return;
  element.animate(
    [{ transform: `translate(${x}px, ${y}px) scale(${scale})`, offset: 0 }],
    { duration: 300, easing: EASE_OUT },
  );
}

// A copy of a tile that shrinks and fades where the tile used to be.
function fadeAway({ rect, copy }) {
  copy.removeAttribute('data-tile-id');
  copy.classList.add('tile-ghost');
  copy.style.left = `${rect.left}px`;
  copy.style.top = `${rect.top}px`;
  copy.style.setProperty('--tile-size', `${rect.width}px`);
  document.body.append(copy);
  copy.animate([
    { transform: 'none', opacity: 1 },
    { transform: 'scale(0.3) rotate(-10deg)', opacity: 0 },
  ], { duration: 320, easing: 'ease-in' }).finished.then(() => copy.remove(), () => copy.remove());
}

// Replays a one-off CSS animation class, such as "bump" or "shake".
function pulse(element, className) {
  if (!element || lessMotion()) return;
  element.classList.remove(className);
  void element.offsetWidth; // restart the animation
  element.classList.add(className);
  element.addEventListener('animationend', () => element.classList.remove(className), { once: true });
}

// A small label, such as "+3", that floats up from an element and fades.
function floatLabel(anchor, text, kind) {
  if (!anchor || lessMotion()) return;
  const rect = anchor.getBoundingClientRect();
  if (rect.width === 0) return;
  const label = makeElement('span', `float-label ${kind}`, text);
  label.style.left = `${rect.left + rect.width / 2}px`;
  label.style.top = `${rect.top}px`;
  document.body.append(label);
  label.animate([
    { transform: 'translate(-50%, 4px)', opacity: 0 },
    { transform: 'translate(-50%, -6px)', opacity: 1, offset: 0.25 },
    { transform: 'translate(-50%, -30px)', opacity: 0 },
  ], { duration: 1200, easing: 'ease-out' }).finished.then(() => label.remove(), () => label.remove());
}

// A burst of tile-colored confetti from the top of an element.
function confetti(anchor) {
  if (!anchor || lessMotion()) return;
  const rect = anchor.getBoundingClientRect();
  const colors = ['var(--yellow)', 'var(--green)', 'var(--tile)', 'var(--removal)', 'var(--avatar-1)', 'var(--avatar-2)'];
  for (let i = 0; i < 32; i++) {
    const piece = makeElement('span', 'confetti');
    piece.style.background = colors[i % colors.length];
    piece.style.left = `${rect.left + rect.width / 2}px`;
    piece.style.top = `${rect.top + 24}px`;
    document.body.append(piece);
    const angle = Math.PI * (1.1 + Math.random() * 0.8); // mostly upwards
    const distance = 70 + Math.random() * 130;
    const dx = Math.cos(angle) * distance;
    const dy = Math.sin(angle) * distance;
    const spin = 180 + Math.random() * 540;
    piece.animate([
      { transform: 'translate(0, 0) rotate(0deg)', opacity: 1 },
      { transform: `translate(${dx}px, ${dy}px) rotate(${spin / 2}deg)`, opacity: 1, offset: 0.45 },
      { transform: `translate(${dx * 1.2}px, ${dy + 220}px) rotate(${spin}deg)`, opacity: 0 },
    ], { duration: 1300 + Math.random() * 500, easing: 'cubic-bezier(0.2, 0.6, 0.4, 1)' })
      .finished.then(() => piece.remove(), () => piece.remove());
  }
}
