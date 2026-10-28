'use strict';

// Live connection to the server. Socket.IO reconnects by itself after a dropped connection.
const socket = io();

const STORAGE_PREFIX = 'such-a-word';
const SCREENS = ['loading', 'home', 'tutorial', 'join', 'choose', 'lobby', 'game', 'message'];
const CODE_PATTERN = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/;
const byId = (id) => document.getElementById(id);

let currentScreen = null;
let matchCode = codeFromAddress();
// Set when another tab took this tab's seat, so reconnecting doesn't take it back.
let seatMovedAway = false;
// A code typed on the home screen, with the name to join under.
let pendingJoin = null;
// The last update shown, to notice the moment a game starts.
let lastUpdate = null;
// The latest match state, for redrawing lists and telling which chat messages are yours.
let latestState = null;
// Who was in the lobby last time, so new arrivals can slide in.
let lobbyShown = { code: null, ids: new Set() };
// A host's button tapped once, waiting for the second tap (see confirmRow).
let rowConfirm = { key: null, until: 0 };
const ROW_CONFIRM_MS = 3_000;

// ---------- Small helpers ----------

function codeFromAddress() {
  const found = location.pathname.match(/^\/m\/([A-Za-z0-9]{1,12})\/?$/);
  return found ? found[1].toUpperCase() : null;
}

function showScreen(name) {
  if (name === currentScreen) return;
  for (const screen of SCREENS) byId(`screen-${screen}`).hidden = screen !== name;
  currentScreen = name;
  const inMatch = name === 'lobby' || name === 'game';
  byId('match-toolbar').hidden = !inMatch;
  if (!inMatch) closeChat(); // in chat.js
  window.scrollTo(0, 0);
}

function showToast(text) {
  const toast = byId('toast');
  toast.textContent = text;
  toast.hidden = false;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => { toast.hidden = true; }, 3500);
}

function showError(form, message) {
  const error = byId(`${form}-error`);
  error.textContent = message;
  error.hidden = false;
}

function hideError(form) {
  byId(`${form}-error`).hidden = true;
}

function makeElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function fillCodeTiles(container, code) {
  container.replaceChildren(...Array.from(code, (letter) => makeElement('span', 'tile', letter)));
  container.setAttribute('aria-label', `Match code ${code.split('').join(' ')}`);
}

const initialOf = (name) => (Array.from((name ?? '').trim())[0] || '?').toUpperCase();
const matchLink = (code) => `${location.origin}/m/${code}`;

// ---------- Icons ----------

function drawingSvg(key) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_DRAWINGS[key].svg}</svg>`;
}

// A player's icon: their letter tile, a drawing or an emoji, on their color.
function makeIcon(icon, name, size) {
  const element = makeElement('span', 'player-icon');
  element.style.background = (ICON_COLORS[icon?.color] ?? ICON_COLORS[0]).hex;
  if (size) element.style.setProperty('--size', `${size}px`);
  if (icon?.kind === 'drawing' && Object.hasOwn(ICON_DRAWINGS, icon.value)) element.innerHTML = drawingSvg(icon.value);
  else if (icon?.kind === 'emoji') element.append(makeElement('span', 'icon-emoji', icon.value));
  else element.append(makeElement('span', 'icon-letter', initialOf(name)));
  element.setAttribute('aria-hidden', 'true');
  return element;
}

const ICON_STORAGE_KEY = `${STORAGE_PREFIX}:icon`;
const saveIcon = (icon) => writeStorage('localStorage', ICON_STORAGE_KEY, JSON.stringify(icon));

// Your icon, remembered in this browser. The first time, it's your letter
// tile on a random color.
function savedIcon() {
  try {
    const icon = JSON.parse(readStorage('localStorage', ICON_STORAGE_KEY));
    if (isValidIcon(icon)) return icon;
  } catch { /* nothing saved yet */ }
  const icon = { color: Math.floor(Math.random() * ICON_COLORS.length), kind: 'letter' };
  saveIcon(icon);
  return icon;
}

function renderHomeIcon() {
  byId('home-icon').replaceChildren(makeIcon(savedIcon(), byId('create-name').value, 52));
}

// A match code typed with spaces or dashes, in any case, or a whole pasted
// match link. Returns null when it can't be a code.
function cleanTypedCode(raw) {
  const fromLink = raw.match(/\/m\/([A-Za-z0-9]+)/);
  const code = (fromLink ? fromLink[1] : raw).replace(/[\s-]/g, '').toUpperCase();
  return CODE_PATTERN.test(code) ? code : null;
}

// Asks the server something and waits for its answer.
async function request(event, payload = {}) {
  try {
    return await socket.timeout(10_000).emitWithAck(event, payload);
  } catch {
    return { ok: false, error: 'timeout', message: 'The server did not answer. Check your connection and try again.' };
  }
}

// ---------- Remembering your seat ----------
// The seat key is saved for this tab (so a refresh keeps your seat, even with
// several players testing in one browser) and for the whole browser (so closing
// the tab and opening the link again still works). Private windows can block
// storage, so every access is guarded.

function readStorage(area, key) {
  try { return window[area].getItem(key); } catch { return null; }
}

function writeStorage(area, key, value) {
  try { window[area].setItem(key, value); } catch { /* storage unavailable */ }
}

function removeStorage(area, key) {
  try { window[area].removeItem(key); } catch { /* storage unavailable */ }
}

const seatStorageKey = (code) => `${STORAGE_PREFIX}:seat:${code}`;

function loadSeat(code) {
  const tabKey = readStorage('sessionStorage', seatStorageKey(code));
  if (tabKey) return { key: tabKey, fromThisTab: true };
  const browserKey = readStorage('localStorage', seatStorageKey(code));
  return browserKey ? { key: browserKey, fromThisTab: false } : null;
}

function saveSeat(code, key) {
  writeStorage('sessionStorage', seatStorageKey(code), key);
  writeStorage('localStorage', seatStorageKey(code), key);
}

function forgetSeat(code) {
  removeStorage('sessionStorage', seatStorageKey(code));
  removeStorage('localStorage', seatStorageKey(code));
}

const rememberName = (name) => writeStorage('localStorage', `${STORAGE_PREFIX}:name`, name.trim());
const rememberedName = () => readStorage('localStorage', `${STORAGE_PREFIX}:name`) || '';

// ---------- Getting into a match ----------

// Works out what to show for a match link: your seat, the join form, or an explanation.
async function enterMatch({ useSavedSeat = true } = {}) {
  const code = matchCode;
  const seat = useSavedSeat ? loadSeat(code) : null;
  if (seat) {
    const result = await request('rejoin', { code, seatKey: seat.key, takeover: seat.fromThisTab });
    if (result.ok) {
      pendingJoin = null; // already in this match
      saveSeat(code, seat.key); // The server sends the match next.
      return;
    }
    if (result.error === 'in-use') { showChoice(result); return; }
    if (result.error === 'not-found') { showGone(); return; }
    if (result.error === 'left') { showLeft(); return; }
    if (result.error !== 'bad-key') { showProblem(result); return; }
    forgetSeat(code); // That seat was removed, so join again.
  }

  const info = await request('matchInfo', { code });
  if (!info.ok) { showProblem(info); return; }
  if (!info.exists) { showGone(); return; }
  const watching = info.status !== 'lobby' || info.full;
  if (watching && info.watchersFull) {
    pendingJoin = null;
    showMessage({
      title: 'This match is full',
      text: 'It has 6 players and 20 people watching. Ask a friend to create a new match and send you its link.',
      primary: { label: 'Create a new match', action: goHome },
    });
    return;
  }
  showJoin(info, watching);
}

// Takes this player's seat back from another tab.
async function takeOverSeat() {
  const seat = loadSeat(matchCode);
  if (!seat) { enterMatch(); return; }
  seatMovedAway = false;
  const result = await request('rejoin', { code: matchCode, seatKey: seat.key, takeover: true });
  if (result.ok) { saveSeat(matchCode, seat.key); return; }
  if (result.error === 'not-found') { showGone(); return; }
  forgetSeat(matchCode);
  enterMatch({ useSavedSeat: false });
}

function goHome() {
  matchCode = null;
  seatMovedAway = false;
  latestState = null;
  resetChat(); // in chat.js
  if (location.pathname !== '/') history.pushState(null, '', '/');
  const input = byId('create-name');
  if (!input.value) input.value = rememberedName();
  renderHomeIcon();
  hideError('create');
  showScreen('home');
}

// ---------- Screens ----------

// Asks for a name, or joins straight away with the name typed on the home
// screen. Once the game has started, or 6 are playing, newcomers watch.
function showJoin(info, watching) {
  fillCodeTiles(byId('join-code'), info.code);
  const waiting = info.players === 1 ? '1 player is waiting' : `${info.players} players are waiting`;
  byId('join-summary').textContent = info.status !== 'lobby'
    ? "This game has already started. Enter your name to watch, and you'll get a seat in the next game if there's room."
    : watching
      ? "6 players are in. Enter your name to watch, and you'll get a seat if one opens up."
      : `${waiting}. Enter your name to join.`;
  byId('join-title').textContent = watching ? 'Watch the match' : 'Join the match';
  byId('join-form').querySelector('button').textContent = watching ? 'Watch match' : 'Join match';
  const typed = pendingJoin?.code === info.code ? pendingJoin : null;
  pendingJoin = null;
  const input = byId('join-name');
  if (typed?.name) input.value = typed.name;
  else if (!input.value) input.value = rememberedName();
  hideError('join');
  showScreen('join');
  if (typed?.name) joinWithName(typed.name);
  else input.focus();
}

async function joinWithName(name) {
  const button = byId('join-form').querySelector('button');
  button.disabled = true;
  const result = await request('joinMatch', { code: matchCode, name, icon: savedIcon() });
  button.disabled = false;
  if (result.ok) {
    rememberName(name);
    saveSeat(matchCode, result.seatKey); // The server sends the lobby next.
  } else if (['not-found', 'started', 'full'].includes(result.error)) {
    enterMatch({ useSavedSeat: false });
  } else {
    showError('join', result.message);
  }
}

function showChoice(result) {
  byId('choose-text').textContent = `This match is open as ${result.name} in another tab or window.`;
  byId('choose-continue').textContent = `Play as ${result.name} here`;
  byId('choose-new').hidden = result.status !== 'lobby';
  showScreen('choose');
}

function showGone() {
  forgetSeat(matchCode);
  const typed = pendingJoin?.code === matchCode;
  pendingJoin = null;
  if (typed) {
    showMessage({
      title: `No match with code ${matchCode}`,
      text: 'Check the code with your friend and try again. A code stops working when its match ends or the server restarts.',
      primary: {
        label: 'Try another code',
        action: () => {
          goHome();
          byId('code-input').select();
        },
      },
    });
    return;
  }
  showMessage({
    title: 'This match no longer exists',
    text: 'The server may have restarted, which ends matches in progress. Create a new match and share the new link.',
    primary: { label: 'Create a new match', action: goHome },
  });
}

function showLeft() {
  forgetSeat(matchCode);
  showMessage({
    title: 'You left this game',
    text: "Players who leave can't come back to a game in progress. When it's over, this link opens the lobby for the next game.",
    primary: { label: 'Go to the home screen', action: goHome },
  });
}

function showProblem(result) {
  showMessage({
    title: 'Something went wrong',
    text: result.message || 'Please try again.',
    primary: { label: 'Try again', action: () => enterMatch() },
  });
}

function showMessage({ title, text, primary, secondary }) {
  byId('message-title').textContent = title;
  byId('message-text').textContent = text;
  setUpButton(byId('message-primary'), primary);
  setUpButton(byId('message-secondary'), secondary);
  showScreen('message');
}

function setUpButton(button, config) {
  button.hidden = !config;
  if (!config) return;
  button.textContent = config.label;
  button.onclick = config.action;
}

const winsLabel = (wins) => (wins === 1 ? '1 win' : `${wins} wins`);

// ---------- Host buttons that need a second tap ----------

const isRowConfirming = (key) => rowConfirm.key === key && Date.now() < rowConfirm.until;

// Returns true on the second tap. The first tap only changes the button's label.
function confirmRow(key) {
  if (isRowConfirming(key)) {
    rowConfirm = { key: null, until: 0 };
    return true;
  }
  rowConfirm = { key, until: Date.now() + ROW_CONFIRM_MS };
  setTimeout(refreshPeople, ROW_CONFIRM_MS + 50);
  return false;
}

function makeRowAction(label, confirmLabel, key, run) {
  const confirming = isRowConfirming(key);
  const button = makeElement('button', 'row-action', confirming ? confirmLabel : label);
  button.type = 'button';
  button.classList.toggle('is-confirming', confirming);
  button.addEventListener('click', async () => {
    if (!confirmRow(key)) {
      refreshPeople();
      return;
    }
    const result = await run();
    if (!result.ok) showToast(result.message);
  });
  return button;
}

const removeAction = (person) => makeRowAction('Remove', 'Confirm Remove', `remove-${person.id}`,
  () => request('removeSeat', { seatId: person.id }));
const makeHostAction = (person) => makeRowAction('Make host', 'Confirm Host', `host-${person.id}`, async () => {
  const result = await request('makeHost', { seatId: person.id });
  if (result.ok) {
    byId('people-dialog').close();
    showToast(`${person.name} is now the host.`);
  }
  return result;
});

// Redraws the lists with host buttons, for example when a second tap runs out.
function refreshPeople() {
  if (!latestState) return;
  if (currentScreen === 'lobby' && latestState.status === 'lobby') renderLobby(latestState);
  if (byId('people-dialog').open) renderPeopleDialog();
}

// ---------- People ----------

// A list of players or spectators: icon, name, wins, and for the host, buttons
// to make someone host or remove them. In the lobby, tapping your own icon
// changes it.
function renderPeople(list, state, people, { canRemove = () => false, canMakeHost = () => false, showWins = true } = {}) {
  const isHost = state.youId === state.hostId;
  list.replaceChildren(...people.map((person) => {
    const isYou = person.id === state.youId;
    const item = makeElement('li', 'player');
    item.dataset.playerId = person.id;
    item.classList.toggle('is-you', isYou);
    item.classList.toggle('is-away', !person.connected);

    const icon = makeIcon(person.icon, person.name, 40);
    if (isYou && state.status === 'lobby') {
      const button = makeElement('button', 'icon-button');
      button.type = 'button';
      button.setAttribute('aria-label', 'Change your icon');
      button.append(icon);
      button.addEventListener('click', () => chooseLobbyIcon(person));
      item.append(button);
    } else {
      item.append(icon);
    }

    const details = makeElement('span', 'player-details');
    const name = makeElement('span', 'player-name', person.name);
    if (isYou) name.append(makeElement('span', 'you-label', ' (you)'));
    details.append(name);
    if (showWins && person.wins > 0) details.append(makeElement('span', 'wins-label', winsLabel(person.wins)));
    item.append(details);

    if (person.id === state.hostId) item.append(makeElement('span', 'badge', 'Host'));
    if (!person.connected) item.append(makeElement('span', 'away-label', 'Away'));
    if (isHost && !isYou && canMakeHost(person)) item.append(makeHostAction(person));
    if (isHost && !isYou && canRemove(person)) item.append(removeAction(person));
    return item;
  }));
}

function chooseLobbyIcon(person) {
  openIconChooser({ // in icon-chooser.js
    icon: person.icon,
    name: person.name,
    onSave: async (icon) => {
      saveIcon(icon);
      const result = await request('setIcon', { icon });
      if (!result.ok) showToast(result.message);
    },
  });
}

function renderLobby(state) {
  const count = state.players.length;
  const isHost = state.youId === state.hostId;
  const host = state.players.find((player) => player.id === state.hostId);

  fillCodeTiles(byId('lobby-code'), state.code);
  byId('share-link').value = matchLink(state.code);
  byId('lobby-count').textContent = `${count} of ${state.maxPlayers}`;

  const seen = lobbyShown.code === state.code ? lobbyShown.ids : null;
  lobbyShown = { code: state.code, ids: new Set([...state.players, ...state.spectators].map((person) => person.id)) };
  renderPeople(byId('lobby-players'), state, state.players, { canRemove: () => true, canMakeHost: () => true });
  renderPeople(byId('lobby-spectators'), state, state.spectators, { canRemove: () => true });
  for (const item of document.querySelectorAll('#screen-lobby .player')) {
    item.classList.toggle('is-new', seen !== null && !seen.has(item.dataset.playerId));
  }
  byId('lobby-watching').hidden = state.spectators.length === 0;
  byId('lobby-watching-count').textContent = `${state.spectators.length} of ${state.maxSpectators}`;
  document.querySelector('.lobby-icon-hint').hidden = state.youWatch;

  const start = byId('start-match');
  start.hidden = !isHost;
  start.disabled = count < state.minPlayers;
  if (state.youWatch) {
    byId('lobby-hint').textContent = "You're watching: 6 players are in. You'll get a seat if one opens up.";
  } else if (!isHost) {
    byId('lobby-hint').textContent = `Waiting for ${host ? host.name : 'the host'} to start the game.`;
  } else if (count < state.minPlayers) {
    byId('lobby-hint').textContent = 'Send the link to a friend. You need at least one more player.';
  } else {
    byId('lobby-hint').textContent = `Start whenever everyone is here (up to ${state.maxPlayers} players).`;
  }
  showScreen('lobby');
}

// The watching count at the top, shown in the lobby and the game.
function renderToolbar(state) {
  const count = state.spectators.length;
  const button = byId('watching-button');
  button.hidden = count === 0;
  byId('watching-count').textContent = `${count} watching`;
  button.setAttribute('aria-label', `${count} watching. Show who.`);
}

// The people sheet: who's watching (the host can remove them), or, for the
// host, the players who could take over as host.
let peopleMode = null;

function openPeople(mode) {
  peopleMode = mode;
  renderPeopleDialog();
  byId('people-dialog').showModal();
}

function renderPeopleDialog() {
  const state = latestState;
  if (!state) return;
  if (peopleMode === 'host') {
    const candidates = state.players.filter((player) => player.id !== state.youId && !player.left);
    byId('people-title').textContent = 'Pass host';
    byId('people-summary').textContent = 'Choose the new host. They can end this game and start the next one.';
    renderPeople(byId('people-list'), state, candidates, { canMakeHost: () => true });
    return;
  }
  const count = state.spectators.length;
  byId('people-title').textContent = 'Watching';
  byId('people-summary').textContent = count === 0
    ? 'Nobody is watching right now.'
    : `${count === 1 ? '1 person is' : `${count} people are`} watching. Spectators can chat, and get a seat in the next game if there's room.`;
  renderPeople(byId('people-list'), state, state.spectators, { canRemove: () => true, showWins: false });
}

// ---------- Messages from the server ----------

socket.on('connect', () => {
  byId('connection-banner').hidden = true;
  if (matchCode && !seatMovedAway) enterMatch();
});

socket.on('disconnect', () => { byId('connection-banner').hidden = false; });
socket.on('connect_error', () => { byId('connection-banner').hidden = false; });

socket.on('state', (state) => {
  if (seatMovedAway) return;
  const justStarted = lastUpdate?.code === state.code && lastUpdate.status === 'lobby' && state.status === 'started';
  const justEnded = lastUpdate?.code === state.code && lastUpdate.status === 'started' && state.status === 'lobby';
  lastUpdate = { code: state.code, status: state.status };
  latestState = state;
  matchCode = state.code;
  if (codeFromAddress() !== state.code) history.pushState(null, '', `/m/${state.code}`);
  if (state.status === 'lobby') renderLobby(state);
  else renderGame(state, { justStarted }); // in game-screen.js
  renderToolbar(state);
  if (byId('people-dialog').open) renderPeopleDialog();
  if (justEnded && state.endedBy) {
    const you = [...state.players, ...state.spectators].find((person) => person.id === state.youId);
    showToast(you?.name === state.endedBy ? 'You ended the game.' : `${state.endedBy} ended the game.`);
  }
});

// The host removed this player. The match stays open for everyone else.
socket.on('removed', () => {
  forgetSeat(matchCode);
  seatMovedAway = true;
  latestState = null;
  resetChat(); // in chat.js
  showMessage({
    title: 'You were removed from this match',
    text: 'The host removed you. If they invite you back, you can join again with the link.',
    primary: { label: 'Go to the home screen', action: goHome },
  });
});

socket.on('replaced', () => {
  seatMovedAway = true;
  showMessage({
    title: 'Playing in another tab',
    text: 'This match was opened in another tab or window, so your seat moved there.',
    primary: { label: 'Play here instead', action: takeOverSeat },
  });
});

// ---------- Buttons and forms ----------

byId('create-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = event.target.querySelector('button');
  const name = byId('create-name').value;
  button.disabled = true;
  const result = await request('createMatch', { name, icon: savedIcon() });
  button.disabled = false;
  if (!result.ok) { showError('create', result.message); return; }
  rememberName(name);
  saveSeat(result.code, result.seatKey);
});

byId('join-form').addEventListener('submit', (event) => {
  event.preventDefault();
  joinWithName(byId('join-name').value);
});

// Joining with a code typed on the home screen, using the name typed above it.
byId('code-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const code = cleanTypedCode(byId('code-input').value);
  if (!code) {
    showError('code', 'Match codes have 6 letters and numbers, like K7QX2P.');
    pulse(byId('code-input'), 'shake');
    return;
  }
  pendingJoin = { code, name: byId('create-name').value.trim() };
  matchCode = code;
  seatMovedAway = false;
  history.pushState(null, '', `/m/${code}`);
  showScreen('loading');
  enterMatch();
});

byId('create-name').addEventListener('input', () => {
  hideError('create');
  renderHomeIcon();
});
byId('home-icon').addEventListener('click', () => {
  openIconChooser({ // in icon-chooser.js
    icon: savedIcon(),
    name: byId('create-name').value,
    onSave: (icon) => {
      saveIcon(icon);
      renderHomeIcon();
    },
  });
});
byId('watching-button').addEventListener('click', () => openPeople('watching'));
byId('join-name').addEventListener('input', () => hideError('join'));
byId('code-input').addEventListener('input', () => hideError('code'));
byId('open-tutorial').addEventListener('click', () => openTutorial()); // in tutorial.js

byId('choose-continue').addEventListener('click', takeOverSeat);
byId('choose-new').addEventListener('click', () => enterMatch({ useSavedSeat: false }));

byId('copy-link').addEventListener('click', async () => {
  const input = byId('share-link');
  try {
    await navigator.clipboard.writeText(input.value);
    showToast('Link copied. Send it to your friends!');
  } catch {
    input.focus();
    input.select();
    showToast('Press Ctrl+C (or Cmd+C) to copy the link.');
  }
});

if (navigator.share) {
  const shareButton = byId('native-share');
  shareButton.hidden = false;
  shareButton.addEventListener('click', () => {
    navigator.share({ title: 'Such A Word', text: 'Join my Such A Word match!', url: byId('share-link').value })
      .catch(() => { /* the player closed the share sheet */ });
  });
}

byId('start-match').addEventListener('click', async () => {
  const button = byId('start-match');
  button.disabled = true;
  const result = await request('startMatch');
  if (!result.ok) {
    button.disabled = false;
    showToast(result.message);
  }
});

byId('leave-match').addEventListener('click', async () => {
  const result = await request('leaveMatch');
  if (!result.ok) { showToast(result.message); return; }
  forgetSeat(matchCode);
  goHome();
});

// The Back and Forward buttons switch between the home page and a match link.
window.addEventListener('popstate', () => location.reload());

// Starts once every script on the page has loaded.
window.addEventListener('DOMContentLoaded', () => {
  if (matchCode) showScreen('loading');
  else goHome();
});
