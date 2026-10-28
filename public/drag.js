'use strict';

// Lets a player drag a tile with a mouse or a finger. A press that doesn't
// move is still a tap, so tapping keeps working. While dragging, a copy of the
// tile follows the pointer, and the element under it with a data-drop
// attribute is where it will land.

const DRAG_DISTANCE = 8;
let dragEndedAt = 0;

// onStart() runs when the drag begins and may return false to cancel it.
// onDrop(target, point, ghostRect) runs when it ends; target is null when the
// tile was let go somewhere it can't land.
function makeDraggable(source, { onStart, onDrop }) {
  source.dataset.draggable = '';
  source.addEventListener('pointerdown', (down) => {
    if (down.button !== 0 || source.disabled) return;
    // Touch presses stick to the tile they started on. Let them go, so the
    // drag still works if the tile is redrawn while it is being dragged.
    if (source.hasPointerCapture?.(down.pointerId)) source.releasePointerCapture(down.pointerId);

    let ghost = null;
    let target = null;

    const highlight = (element) => {
      if (element === target) return;
      target?.classList.remove('is-drop-target');
      target = element;
      target?.classList.add('is-drop-target');
    };

    const finish = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', cancel);
      source.classList.remove('is-drag-source');
      target?.classList.remove('is-drop-target');
    };

    const move = (event) => {
      if (event.pointerId !== down.pointerId) return;
      if (!ghost) {
        if (Math.hypot(event.clientX - down.clientX, event.clientY - down.clientY) < DRAG_DISTANCE) return;
        if (onStart() === false) {
          finish();
          return;
        }
        ghost = makeGhost(source);
        source.classList.add('is-drag-source');
      }
      event.preventDefault();
      ghost.style.left = `${event.clientX}px`;
      ghost.style.top = `${event.clientY}px`;
      highlight(document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-drop]') ?? null);
    };

    const up = (event) => {
      if (event.pointerId !== down.pointerId) return;
      const dropTarget = target;
      finish();
      if (!ghost) return; // just a tap: the click handler takes it from here
      dragEndedAt = Date.now();
      const ghostRect = ghost.getBoundingClientRect();
      ghost.remove();
      onDrop(dropTarget, { x: event.clientX, y: event.clientY }, ghostRect);
    };

    const cancel = (event) => {
      if (event.pointerId !== down.pointerId) return;
      finish();
      if (!ghost) return;
      ghost.remove();
      onDrop(null, null, null);
    };

    window.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', cancel);
  });
}

function makeGhost(source) {
  const rect = source.getBoundingClientRect();
  const ghost = source.cloneNode(true);
  ghost.removeAttribute('data-tile-id');
  ghost.removeAttribute('data-drop');
  ghost.classList.remove('is-selected', 'is-drag-source');
  ghost.classList.add('drag-ghost');
  ghost.style.setProperty('--tile-size', `${rect.width}px`);
  document.body.append(ghost);
  return ghost;
}

// The browser also sends a click when a drag ends on the tile it started from.
// That click isn't a tap, so it is ignored.
window.addEventListener('click', (event) => {
  if (Date.now() - dragEndedAt < 350) {
    event.stopPropagation();
    event.preventDefault();
  }
}, true);
