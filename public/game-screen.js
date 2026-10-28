'use strict';

// The game screen: players, bag, board, your hand and the five moves.
// Uses byId, makeElement, initialOf, request, showToast, showScreen and
// currentScreen from client.js, the animations in motion.js and dragging
// from drag.js.

const LETTERS = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'];
const TILE_TYPES = [...LETTERS, 'blank', 'removal'];
const PHASE_SECONDS = { turn: 60, challenge: 30, roundEnding: 30, startingChallenge: 30, betweenRounds: 20 };
const SEAT_RING = 2 * Math.PI * 19;
const CONFIRM_MS = 3_000;
const SAME_TILES_SWAP = 'Swap two different tiles: not two blanks, and not two of the same letter.';

let gameState = null; // the latest match state with a game in it
let clockOffset = 0; // the server's clock minus this computer's clock
let lastSeenEvent = null; // the newest game event already shown
let selection = emptySelection();
let confirming = { action: null, until: 0 }; // a button tapped once, waiting for a second tap
let wasNaming = false;
let shownCounts = new Map(); // tiles each player held at the last update, for "+3" labels
let shownActive = null;
let shownBag = null;
let shownDiscard = null;
let sentLineUp = 'null'; // the lined-up move the server knows about, as JSON
let openWordList = null; // the challenge whose full list of possible words is open

function emptySelection() {
  return { handId: null, boardIndex: null, move: null };
}

// ---------- Who is who ----------

const game = () => gameState.game;
const isYou = (id) => id === gameState.youId;
const nameOf = (id) => gameState.players.find((player) => player.id === id)?.name ?? 'Someone';
const subject = (id) => (isYou(id) ? 'You' : nameOf(id));
const object = (id) => (isYou(id) ? 'you' : nameOf(id));
const possessive = (id) => (isYou(id) ? 'your' : `${nameOf(id)}'s`);
const verb = (id, forOthers, forYou) => (isYou(id) ? forYou : forOthers);
const myInfo = () => game().players.find((player) => isYou(player.id));
const tileCount = (count) => (count === 1 ? '1 tile' : `${count} tiles`);
const typeName = (type) => (isBlankType(type) ? 'blank' : isRemovalType(type) ? 'removal tile' : type);
const spacedPattern = (pattern) => pattern.split('').join(' ');
// "an F", "a G": letters whose names start with a vowel sound take "an".
const withArticle = (letter) => `${'AEFHILMNORSX'.includes(letter) ? 'an' : 'a'} ${letter}`;

const isBlankType = (type) => type === 'blank';
const isRemovalType = (type) => type === 'removal';
const isLetterType = (type) => type.length === 1;
const sortOrder = (type) => (isBlankType(type) ? 26 : isRemovalType(type) ? 27 : type.charCodeAt(0) - 65);
const seatOf = (id) => document.querySelector(`.seat[data-player-id="${CSS.escape(id)}"]`);

function isMyTurn() {
  const phase = gameState?.game?.phase;
  return Boolean(phase && phase.name === 'turn' && isYou(phase.playerId));
}

const canAct = () => Boolean(myInfo() && !myInfo().ejected);
const hasPassed = () => (game().phase.passed ?? []).includes(gameState.youId);

// Between rounds, until you trade a tile or keep your tiles.
function canTrade() {
  const { phase } = game();
  return phase.name === 'betweenRounds' && canAct() && !phase.done.includes(gameState.youId);
}

// "No challenge" after the last blank is covered or a stalemate, or
// "I can't find one" when the starting board is challenged.
function canPass() {
  const { phase } = game();
  if (!canAct() || hasPassed()) return false;
  if (phase.name === 'roundEnding') return !isYou(phase.moverId);
  if (phase.name === 'startingChallenge') return !isYou(phase.challengerId);
  return false;
}

function isNaming() {
  const { phase } = game();
  if (phase.name === 'challenge') return isYou(phase.challengedId);
  return phase.name === 'startingChallenge' && canPass();
}

// What the player is choosing tiles for, so a choice survives updates that
// don't change it: a move on this turn, or a trade between these rounds.
function selectionMode(state) {
  const { phase, round, players } = state.game;
  const me = players.find((player) => player.id === state.youId);
  if (phase.name === 'turn' && phase.playerId === state.youId) return `move-${round}-${phase.deadline}`;
  if (phase.name === 'betweenRounds' && me && !me.ejected && !phase.done.includes(state.youId)) return `trade-${round}`;
  return null;
}

function tileName(tile) {
  if (isBlankType(tile.type)) return 'your blank';
  if (isRemovalType(tile.type)) return 'your removal tile';
  return `your ${tile.type}`;
}

// Whose clock is running: the player taking a turn, or the one who must name a word.
function actingPlayerId() {
  const { phase } = game();
  if (phase.name === 'turn') return phase.playerId;
  if (phase.name === 'challenge') return phase.challengedId;
  return null;
}

// ---------- What happened, in words ----------

function describeMove(playerId, move) {
  const who = subject(playerId);
  switch (move.type) {
    case 'swap': return `${who} swapped two tiles.`;
    case 'replace': return `${who} replaced the ${move.replaced} with ${withArticle(move.letter)}.`;
    case 'playLetter': return `${who} played ${withArticle(move.letter)} on a blank.`;
    case 'playBlank': return `${who} added a blank.`;
    case 'remove': return `${who} removed the ${move.removed}.`;
    default: return null;
  }
}

function describeSettled(event) {
  const named = event.valid ? `${subject(event.challengedId)} named ${event.word}` : null;
  if (event.kind === 'lastTile') {
    return named ? `${named}!` : `${subject(event.challengedId)} couldn't name a word and drew 3 tiles.`;
  }
  const loserId = event.valid ? event.challengerId : event.challengedId;
  const opening = named ?? `${subject(event.challengedId)} couldn't name a word`;
  return `${opening}, so ${object(loserId)} ${verb(loserId, 'draws', 'draw')} 3 tiles.`;
}

function describeEvent(event) {
  switch (event.type) {
    case 'moved': {
      const text = describeMove(event.playerId, event.move);
      return event.auto && text ? text.replace(/\.$/, ' as time ran out.') : text;
    }
    case 'timedOut': return `${subject(event.playerId)} ran out of time and drew 3 tiles.`;
    case 'ejected':
      return `${subject(event.playerId)} ${verb(event.playerId, 'was', 'were')} removed after missing 3 turns in a row.`;
    case 'left': return `${subject(event.playerId)} left the game. ${isYou(event.playerId) ? 'Your' : 'Their'} tiles went to the discard pile.`;
    case 'tradesRevealed':
      if (event.trades.length === 0) return null;
      return `Traded in: ${event.trades.map((trade) => `${possessive(trade.playerId)} ${typeName(trade.type)}`).join(', ')}.`;
    case 'challenged':
      return event.kind === 'lastTile'
        ? `${subject(event.challengedId)} played ${isYou(event.challengedId) ? 'your' : 'their'} last tile!`
        : `${subject(event.challengerId)} challenged ${possessive(event.challengedId)} move!`;
    case 'challengeSettled': return describeSettled(event);
    case 'roundEnding':
      return event.reason === 'completion'
        ? `${subject(event.moverId)} covered the last blank!`
        : 'Stalemate! Everyone swapped in a row.';
    case 'roundStarted':
      return `Round ${event.round}: ${subject(event.starterId)} ${verb(event.starterId, 'goes', 'go')} first.`;
    case 'drewToMove': return `${subject(event.playerId)} couldn't move and drew ${tileCount(event.count)}.`;
    case 'skipped': return `${subject(event.playerId)} couldn't move, so the turn passed.`;
    case 'bagRefilled': return 'The bag ran out, so the discard pile was shuffled back in.';
    case 'traded': return `${subject(event.playerId)} traded a tile.`;
    case 'startingBoardChallenged': return `${subject(event.playerId)} challenged the starting board!`;
    case 'startingBoardSettled':
      return `${subject(event.namerId)} named ${event.word}, so ${object(event.starterId)} ${verb(event.starterId, 'draws', 'draw')} 2 tiles.`;
    case 'startingBoardRebuilt': return 'Nobody found a word, so the starting board was rebuilt.';
    case 'gameOver':
      return event.reason === 'lastPlayer'
        ? `${subject(event.winnerId)} won as the last player left!`
        : `${subject(event.winnerId)} won!`;
    default: return null;
  }
}

// The line under the board: what the game is waiting for.
function describePhase() {
  const { phase } = game();
  switch (phase.name) {
    case 'turn':
      return { text: isYou(phase.playerId) ? 'Your turn' : `${nameOf(phase.playerId)}'s turn` };
    case 'challenge':
      if (isYou(phase.challengedId)) {
        return phase.kind === 'lastTile'
          ? { text: 'Name a word that fits to win', callout: 'Last tile!' }
          : { text: 'Name a word that fits, or draw 3', callout: 'Challenge!' };
      }
      return {
        text: phase.kind === 'lastTile'
          ? `${nameOf(phase.challengedId)} wins by naming a word`
          : `Waiting for ${nameOf(phase.challengedId)} to name a word`,
      };
    case 'roundEnding': {
      const ending = phase.reason === 'completion'
        ? `${subject(phase.moverId)} covered the last blank.`
        : 'Everyone swapped in a row, so this is a stalemate.';
      if (isYou(phase.moverId)) {
        return {
          text: 'Waiting to see if anyone challenges',
          detail: `${ending} The round ends when everyone passes or time runs out.`,
        };
      }
      if (!canPass()) return { text: 'Waiting for the others', detail: ending };
      return { text: 'Last chance to challenge', detail: `${ending} Challenge if you think no word fits, or pass.` };
    }
    case 'startingChallenge':
      if (isYou(phase.challengerId)) {
        return {
          text: 'Waiting for the others',
          detail: 'If anyone names a word that fits, you draw 2 tiles. If nobody can, the board is rebuilt.',
        };
      }
      if (canPass()) {
        return {
          text: 'Name a word that fits, or pass',
          callout: 'Board challenged!',
          detail: `${nameOf(phase.challengerId)} says no word fits the starting board. If you find one, they draw 2 tiles.`,
        };
      }
      return { text: 'Waiting for the others', detail: 'If nobody names a word, the board is rebuilt.' };
    case 'betweenRounds':
      if (canTrade()) return { text: 'Round over' };
      return { text: `Next round soon. ${subject(phase.starterId)} ${verb(phase.starterId, 'goes', 'go')} first` };
    case 'over':
      return { text: '', hideStatus: true, noClock: true };
    default:
      return { text: '', noClock: true };
  }
}

// ---------- Drawing the screen ----------

// justStarted: the game began while this page was showing the lobby, so the
// first tiles are dealt with an animation. After a page refresh they just appear.
function renderGame(state, { justStarted = false } = {}) {
  const sameMatch = gameState?.code === state.code;
  const animate = justStarted || (sameMatch && currentScreen === 'game');
  const modeBefore = gameState?.game ? selectionMode(gameState) : null;
  if (!sameMatch || gameState?.gameNumber !== state.gameNumber) {
    lastSeenEvent = null;
    wasNaming = false;
    shownCounts = new Map();
    shownActive = null;
    shownBag = null;
    shownDiscard = null;
  }
  const fresh = lastSeenEvent === null ? [] : state.game.events.filter((event) => event.seq > lastSeenEvent);
  const containers = [byId('hand'), byId('board')];
  const before = animate ? tilePositions(...containers) : null;

  gameState = state;
  clockOffset = state.game.now - Date.now();
  const modeNow = selectionMode(state);
  if (modeNow === null || modeNow !== modeBefore) {
    selection = emptySelection();
    sentLineUp = 'null'; // a new turn starts with nothing lined up
  }
  keepSelectionValid();

  showScreen('game');
  renderSeats();
  renderPiles();
  renderBanner();
  renderBoard();
  renderPanel();
  renderHand();
  renderActionBar();
  if (before) {
    animateTiles(before, containers, {
      originFor: (element) => tileOrigin(element, fresh),
      goneTo: (old) => tileDestination(old, fresh),
    });
    celebrate(fresh);
  }
  rememberShown();
  announceNewEvents();
  updateClocks();
  syncLineUp();
}

function keepSelectionValid() {
  const { hand, board } = game();
  if (selection.handId !== null && !hand.some((tile) => tile.id === selection.handId)) selection = emptySelection();
  if (selection.boardIndex !== null && selection.boardIndex >= board.length) selection = emptySelection();
}

function makeTile(tile, tag = 'span') {
  const element = makeElement(tag, 'tile');
  if (tag === 'button') element.type = 'button';
  if (isBlankType(tile.type)) {
    element.classList.add('blank');
    element.setAttribute('aria-label', 'Blank');
  } else if (isRemovalType(tile.type)) {
    element.classList.add('removal');
    element.setAttribute('aria-label', 'Removal tile');
  } else {
    element.textContent = tile.type;
  }
  return element;
}

function makeRing(className, radius, size) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'ring');
  svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
  svg.setAttribute('aria-hidden', 'true');
  for (const part of ['ring-track', className]) {
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('class', part);
    circle.setAttribute('cx', size / 2);
    circle.setAttribute('cy', size / 2);
    circle.setAttribute('r', radius);
    svg.append(circle);
  }
  return svg;
}

function renderSeats() {
  const players = gameState.players;
  const half = Math.ceil(players.length / 2);
  byId('seats-left').replaceChildren(...players.slice(0, half).map(makeSeat));
  byId('seats-right').replaceChildren(...players.slice(half).map(makeSeat));
}

function makeSeat(player) {
  const info = game().players.find((candidate) => candidate.id === player.id);
  const seat = makeElement('div', 'seat');
  seat.dataset.playerId = player.id;
  seat.classList.toggle('is-active', actingPlayerId() === player.id);
  seat.classList.toggle('is-away', !player.connected);
  seat.classList.toggle('is-out', info.ejected);

  const iconWrap = makeElement('div', 'seat-avatar');
  const ring = makeRing('ring-fill seat-ring', 19, 42);
  ring.querySelector('.ring-fill').style.strokeDasharray = SEAT_RING;
  ring.querySelector('.ring-fill').style.strokeDashoffset = SEAT_RING;
  iconWrap.append(ring, makeIcon(player.icon, player.name, 34));

  const name = makeElement('span', 'seat-name', isYou(player.id) ? 'You' : player.name);
  name.title = player.name;
  const out = info.left ? 'Left' : 'Out';
  const count = makeElement('span', 'seat-count', info.ejected ? out : tileCount(info.handCount));
  seat.append(iconWrap, name, count);
  return seat;
}

// The bag and, under it, the face-up discard pile.
function renderPiles() {
  const { bagCount, discard } = game();
  byId('bag-count').textContent = bagCount;
  byId('bag-button').setAttribute('aria-label', `${tileCount(bagCount)} in the bag. Show unseen tiles.`);
  if (byId('bag-dialog').open) renderUnseen();

  byId('discard-count').textContent = discard.count;
  byId('discard-button').setAttribute('aria-label', `${tileCount(discard.count)} in the discard pile. Show them.`);
  if (byId('discard-dialog').open) renderDiscard();
}

function renderUnseen() {
  const { unseen } = game();
  if (!unseen) return;
  const hands = gameState.youWatch ? "the players' hands" : "other players' hands";
  byId('bag-summary').textContent = `${tileCount(unseen.inBag)} in the bag · ${tileCount(unseen.inOtherHands)} in ${hands}`;
  renderTileCounts(byId('unseen-grid'), unseen.counts);
}

function renderDiscard() {
  const { discard } = game();
  byId('discard-summary').textContent = discard.count === 0
    ? 'The discard pile is empty.'
    : `${tileCount(discard.count)}, face up for everyone to see`;
  renderTileCounts(byId('discard-grid'), discard.counts);
}

// How many of each kind of tile, A to Z, then blanks and removal tiles.
function renderTileCounts(grid, counts) {
  grid.replaceChildren(...TILE_TYPES.map((type) => {
    const count = counts[type];
    const cell = makeElement('div', 'unseen-cell');
    cell.classList.toggle('is-zero', count === 0);
    const plural = count === 1 ? '' : 's';
    const label = isBlankType(type) ? `blank${plural}` : isRemovalType(type) ? `removal tile${plural}` : `${type}${plural}`;
    cell.setAttribute('aria-label', `${count} ${label}`);
    const tile = makeTile({ type });
    tile.setAttribute('aria-hidden', 'true');
    cell.append(tile, makeElement('span', '', String(count)));
    return cell;
  }));
}

function renderBanner() {
  const latest = [...game().events].reverse().map(describeEvent).find(Boolean) ?? 'Good luck!';
  const banner = byId('game-banner');
  if (banner.textContent === latest) return;
  banner.textContent = latest;
  pulse(banner, 'rise-in');
}

// Tiles shrink so a long board still fits on one line of a phone screen. Past
// the smallest readable size, the board wraps onto a second line instead.
function tileSizeFor(tileCount, gapCount) {
  const available = Math.min(document.documentElement.clientWidth, 480) - 32 - 16;
  const free = available - gapCount * 22 - Math.max(0, tileCount - 1) * 6;
  return Math.max(28, Math.min(48, Math.floor(free / Math.max(1, tileCount))));
}

// Board positions touched by the most recent move, shown darker.
function lastMoveIndexes() {
  const move = game().lastMove;
  if (!move) return new Set();
  if (move.type === 'swap') return new Set([move.a, move.b]);
  if (move.type === 'remove') return new Set();
  return new Set([move.index]);
}

function renderBoard() {
  const { board } = game();
  const preview = selection.move ? previewBoard(selection.move) : null;
  const tiles = preview ? preview.board : board;
  const lastMoved = preview ? new Set() : lastMoveIndexes();
  const handTile = selectedHandTile();
  const choosing = isMyTurn() && !preview;
  const choosingGap = choosing && handTile !== null && isBlankType(handTile.type);

  const element = byId('board');
  element.style.setProperty('--tile-size', `${tileSizeFor(tiles.length, choosingGap ? tiles.length + 1 : 0)}px`);
  const children = [];
  tiles.forEach((tile, index) => {
    if (choosingGap) children.push(makeGap(index));
    const button = makeTile(tile, 'button');
    button.dataset.tileId = tile.id;
    button.dataset.drop = 'tile';
    button.dataset.index = index;
    const what = isBlankType(tile.type) ? 'blank' : tile.type;
    button.setAttribute('aria-label', `Tile ${index + 1}: ${what}`);
    if (lastMoved.has(index) && isLetterType(tile.type)) button.style.background = 'var(--tile-dark)';

    // Tiles that are part of the move you're about to play: tap one to undo it.
    const inMove = preview?.changed.has(index) ?? false;
    button.classList.toggle('is-preview', inMove && preview.removing !== index);
    button.classList.toggle('is-removing', inMove && preview.removing === index);
    button.classList.toggle('is-selected', !preview && selection.boardIndex === index);
    button.disabled = !(choosing || inMove);
    if (inMove) {
      button.setAttribute('aria-label', `Tile ${index + 1}: ${what}. Tap to undo your move.`);
      button.addEventListener('click', clearMove);
      // A letter or blank from your hand can be dragged somewhere else.
      if (tile.id === selection.move.tileId && preview.removing !== index) {
        makeTileDraggable(button, { kind: 'preview', index, tileId: tile.id });
      }
    } else {
      button.addEventListener('click', () => chooseBoardTile(index));
      if (choosing) makeTileDraggable(button, { kind: 'board', index, tileId: tile.id });
    }
    children.push(button);
  });
  if (choosingGap) children.push(makeGap(tiles.length));
  if (children.length === 0) children.push(makeElement('p', 'board-empty', 'The board is empty.'));
  element.replaceChildren(...children);
}

function makeGap(index) {
  const gap = makeElement('button', 'gap-slot');
  gap.type = 'button';
  gap.dataset.drop = 'gap';
  gap.dataset.index = index;
  const { board } = game();
  gap.setAttribute('aria-label', index === 0 ? 'Add the blank at the start'
    : index === board.length ? 'Add the blank at the end'
    : `Add the blank between tiles ${index} and ${index + 1}`);
  gap.addEventListener('click', () => {
    selection.move = { type: 'playBlank', tileId: selection.handId, index };
    renderMoveParts();
  });
  return gap;
}

// While a move is lined up, tapping any hand tile undoes it, and dropping a
// dragged tile back on the hand does too.
function renderHand() {
  const me = myInfo();
  byId('hand-area').hidden = !me || me.ejected || game().phase.name === 'over';
  const hand = [...game().hand].sort((a, b) => sortOrder(a.type) - sortOrder(b.type));
  const myTurn = isMyTurn();
  const pendingTileId = selection.move?.tileId ?? null;
  const handElement = byId('hand');
  if (selection.move) handElement.dataset.drop = 'hand';
  else delete handElement.dataset.drop;
  handElement.replaceChildren(...hand.map((tile) => {
    const button = makeTile(tile, 'button');
    button.dataset.tileId = tile.id;
    button.classList.toggle('is-selected', selection.handId === tile.id);
    button.disabled = !(canTrade() || myTurn);
    if (tile.id === pendingTileId) {
      button.setAttribute('aria-label', `${button.getAttribute('aria-label') ?? tile.type}. Tap to undo your move.`);
    }
    button.addEventListener('click', () => chooseHandTile(tile));
    if (myTurn) makeTileDraggable(button, { kind: 'hand', tile, tileId: tile.id });
    return button;
  }));
}

function renderPanel() {
  const { phase, pattern, canChallenge, lastMove } = game();
  const me = myInfo();
  const status = describePhase();

  byId('status-line').hidden = Boolean(status.hideStatus);
  byId('status-text').textContent = status.text;
  byId('status-clock').hidden = Boolean(status.noClock) || phase.deadline === undefined;
  byId('status-detail').hidden = !status.detail;
  byId('status-detail').textContent = status.detail ?? '';
  byId('callout').hidden = !status.callout;
  byId('callout').textContent = status.callout ?? '';

  const missed = me && !me.ejected && isMyTurn() ? me.missedTurns : 0;
  byId('missed-warning').hidden = missed === 0;
  byId('missed-warning').textContent =
    `You've missed ${missed === 1 ? '1 turn' : `${missed} turns`} in a row. Miss 3 and you're out of the game.`;
  byId('ejected-notice').hidden = !me?.ejected || phase.name === 'over';
  byId('watching-notice').hidden = !gameState.youWatch || phase.name === 'over';

  // Challenging a move, challenging the starting board, or passing.
  const challenge = byId('challenge-button');
  challenge.hidden = !canChallenge || hasPassed();
  if (!challenge.hidden) {
    challenge.textContent = isConfirming('challenge')
      ? 'Confirm Challenge'
      : `Challenge ${possessive(lastMove.playerId)} move`;
  }
  const boardChallenge = byId('start-challenge-button');
  boardChallenge.hidden = !(isMyTurn() && phase.opening);
  boardChallenge.textContent = isConfirming('startingBoard') ? 'Confirm Challenge' : 'Challenge the starting board';
  const pass = byId('pass-button');
  pass.hidden = !canPass();
  pass.textContent = phase.name === 'startingChallenge' ? "I can't find one" : 'No challenge';

  // Naming a word, when challenged or when the starting board is challenged.
  const naming = isNaming();
  byId('name-word-form').hidden = !naming;
  if (naming) {
    byId('name-word-hint').textContent = `A ${pattern.length}-letter word that fits ${pattern.split('').join(' ')}`;
    byId('give-up').hidden = phase.name !== 'challenge';
    byId('give-up').textContent = isConfirming('giveUp') ? 'Confirm Give Up' : 'Give up';
    if (!wasNaming) {
      byId('name-word-input').value = '';
      byId('name-word-feedback').hidden = true;
      byId('name-word-input').focus();
    }
  }
  wasNaming = naming;

  // Trading a tile between rounds.
  const trading = canTrade();
  byId('trade-controls').hidden = !trading;
  if (trading) {
    const tile = selectedHandTile();
    byId('trade-hint').textContent = tile
      ? `Trade ${tileName(tile)} for a tile from the bag?`
      : 'Before the next round you may trade one tile for one from the bag. Tap a tile in your hand to choose it.';
    byId('trade-tile').disabled = !tile;
  }

  renderWordList();
  renderGameOver();
  renderGameMenu();
}

// ---------- Words that fitted ----------

// The latest settled challenge, while it's still news: until the next move,
// the next round, or a new challenge of the starting board. A starting board
// that someone named a word for gets no list.
function wordListEvent() {
  const { events } = game();
  for (let i = events.length - 1; i >= 0; i--) {
    const event = events[i];
    if (['moved', 'roundStarted', 'startingBoardChallenged', 'startingBoardSettled'].includes(event.type)) return null;
    if (event.type === 'challengeSettled' || event.type === 'startingBoardRebuilt') return event.possible ? event : null;
  }
  return null;
}

// How many words fit in about three lines, so short words show more.
function wordsToShow(length) {
  const width = byId('word-list').clientWidth || 320;
  const room = width * 3 - 280; // less the label and "and 99 more"
  return Math.max(3, Math.floor(room / ((length + 2) * 10)));
}

function renderWordList() {
  const card = byId('word-list');
  const event = wordListEvent();
  card.hidden = !event;
  if (!event) return;

  const named = event.type === 'challengeSettled' && event.valid ? event.word : null;
  const words = event.possible.words.filter((word) => word !== named);
  const total = event.possible.total - (named ? 1 : 0);
  // The board that was challenged, as small tiles.
  const pattern = makeElement('div', 'word-list-board');
  pattern.setAttribute('aria-label', `The board was ${spacedPattern(event.pattern)}`);
  pattern.append(...[...event.pattern].map((symbol) => makeTile({ type: symbol === '_' ? 'blank' : symbol })));
  if (total === 0) {
    card.replaceChildren(
      makeElement('p', 'word-list-none', named ? 'No other words fit this board.' : 'No words were possible with this board.'),
      pattern,
    );
    return;
  }

  const open = openWordList === event.seq;
  const shown = open ? words : words.slice(0, wordsToShow(event.pattern.length));
  const line = makeElement('p', 'word-list-line');
  line.append(
    makeElement('strong', '', named ? 'Other possible words: ' : 'Possible words: '),
    makeElement('span', 'word-list-words', shown.join(', ')),
  );
  const more = total - shown.length;
  if (!open && more > 0) {
    const button = makeElement('button', 'link-button', `and ${more} more`);
    button.type = 'button';
    button.addEventListener('click', () => {
      openWordList = event.seq;
      renderWordList();
    });
    line.append(' ', button);
  }
  const parts = [line];
  if (open) {
    line.classList.add('is-open');
    if (more > 0) parts.push(makeElement('p', 'word-list-cap', `Showing the first ${words.length} of ${total}.`));
    const fewer = makeElement('button', 'link-button', 'Show fewer');
    fewer.type = 'button';
    fewer.addEventListener('click', () => {
      openWordList = null;
      renderWordList();
    });
    parts.push(fewer);
  }
  card.replaceChildren(...parts, pattern);
}

// ---------- Leaving and ending ----------

// Spectators can stop watching at any time. The host can also hand the role
// to another player, or end the game for everyone.
function renderGameMenu() {
  const menu = byId('game-menu');
  menu.hidden = game().phase.name === 'over';
  if (menu.hidden) return;
  const isHost = gameState.hostId === gameState.youId;
  const leaving = isConfirming('leave');
  const ending = isConfirming('endGame');
  const leave = byId('leave-game');
  leave.textContent = gameState.youWatch ? 'Stop watching' : leaving ? 'Confirm Leave' : 'Leave game';
  leave.classList.toggle('is-confirming', leaving);
  byId('pass-host').hidden = !isHost || !gameState.players.some((player) => !isYou(player.id) && !player.left);
  const end = byId('end-game');
  end.hidden = !isHost;
  end.textContent = ending ? 'Confirm End Game' : 'End game';
  end.classList.toggle('is-confirming', ending);

  const hint = byId('game-menu-hint');
  hint.hidden = !leaving && !ending;
  hint.textContent = leaving
    ? (canAct() ? "Your tiles go face up to the discard pile, and you can't come back to this game." : "You can't come back to this game.")
    : 'The game ends for everyone with no winner, and everyone goes back to the lobby.';
}

// The winner, how they won, and how many tiles everyone else was left holding.
function renderGameOver() {
  const { phase, events, players } = game();
  const card = byId('game-over');
  card.hidden = phase.name !== 'over';
  if (card.hidden) return;

  const { winnerId } = phase;
  byId('game-over-title').textContent = isYou(winnerId) ? 'You win!' : `${nameOf(winnerId)} wins!`;
  const named = [...events].reverse()
    .find((event) => event.type === 'challengeSettled' && event.kind === 'lastTile' && event.valid);
  byId('game-over-reason').textContent = phase.reason === 'lastPlayer'
    ? `Everyone else is out of the game, so ${object(winnerId)} won as the last player left.`
    : `${subject(winnerId)} played ${isYou(winnerId) ? 'your' : 'their'} last tile${named ? ` and named ${named.word}` : ''}.`;

  const info = (id) => players.find((player) => player.id === id);
  const rank = (id) => (id === winnerId ? -1 : info(id).ejected ? 1_000 : info(id).handCount);
  const standings = gameState.players
    .filter((player) => info(player.id))
    .sort((a, b) => rank(a.id) - rank(b.id));
  byId('game-over-players').replaceChildren(...standings.map((player) => {
    const item = makeElement('li', 'player');
    item.classList.toggle('is-you', isYou(player.id));
    const name = makeElement('span', 'player-name', player.name);
    if (isYou(player.id)) name.append(makeElement('span', 'you-label', ' (you)'));
    const details = makeElement('span', 'player-details');
    details.append(name, makeElement('span', 'wins-label', `${winsLabel(player.wins)} this match`));
    item.append(makeIcon(player.icon, player.name, 40), details);
    const { ejected, left, handCount } = info(player.id);
    if (player.id === winnerId) item.append(makeElement('span', 'badge', 'Winner'));
    else item.append(makeElement('span', 'away-label', left ? 'Left' : ejected ? 'Removed' : `${tileCount(handCount)} left`));
    return item;
  }));
}

function renderActionBar() {
  const mine = isMyTurn();
  byId('action-bar').hidden = !mine;
  if (!mine) return;
  const description = byId('move-description');
  if (selection.move) {
    description.replaceChildren(
      document.createTextNode(describePending(selection.move)),
      makeElement('span', 'undo-hint', "Tap a highlighted tile to undo. If time runs out, it's played for you."),
    );
  } else {
    description.textContent = moveHint();
  }
  byId('play-move').disabled = selection.move === null;
  byId('clear-move').disabled = selection.move === null && selection.handId === null && selection.boardIndex === null;
}

// Redraws what a choice changes. Tiles slide to their new places; a tile
// that was just dropped slides from where it was let go.
function renderMoveParts({ dropped = null } = {}) {
  const containers = [byId('hand'), byId('board')];
  const before = tilePositions(...containers);
  if (dropped?.rect) before.set(String(dropped.tileId), { rect: dropped.rect, copy: null });
  renderBoard();
  renderHand();
  renderActionBar();
  animateTiles(before, containers);
  syncLineUp();
}

// The server keeps the move you've lined up, so it can be played for you if
// your clock runs out. It's only told when the move changes.
function syncLineUp() {
  if (!isMyTurn()) return;
  const move = JSON.stringify(selection.move);
  if (move === sentLineUp) return;
  sentLineUp = move;
  request('lineUp', { move: selection.move });
}

// ---------- Choosing a move ----------

const selectedHandTile = () => game().hand.find((tile) => tile.id === selection.handId) ?? null;

function moveHint() {
  const handTile = selectedHandTile();
  if (handTile && isBlankType(handTile.type)) return 'Now tap a gap on the board to add the blank.';
  if (handTile && isRemovalType(handTile.type)) return 'Now tap the letter to remove.';
  if (handTile) return 'Now tap a blank to cover, or a letter to replace.';
  if (selection.boardIndex !== null) return 'Tap another board tile to swap with it.';
  return 'Tap or drag a tile from your hand, or swap two board tiles.';
}

function clearMove() {
  selection = emptySelection();
  renderMoveParts();
}

function chooseHandTile(tile) {
  if (canTrade()) {
    selection.handId = selection.handId === tile.id ? null : tile.id;
    renderHand();
    renderPanel();
    return;
  }
  if (!isMyTurn()) return;
  // Tapping the tile you picked undoes your choice. Any other tile undoes a
  // lined-up move and becomes your new pick.
  selection = selection.handId === tile.id ? emptySelection() : { handId: tile.id, boardIndex: null, move: null };
  renderMoveParts();
}

function chooseBoardTile(index) {
  if (!isMyTurn() || selection.move) return;
  const { board } = game();
  const handTile = selectedHandTile();
  const shakeTile = () => pulse(byId('board').querySelector(`[data-index="${index}"]`), 'shake');
  if (handTile) {
    const move = moveWithHandTile(handTile, board[index], index);
    if (typeof move === 'string') {
      showToast(move);
      shakeTile();
      return;
    }
    selection.move = move;
  } else if (selection.boardIndex === null) {
    selection.boardIndex = index;
  } else if (selection.boardIndex === index) {
    selection.boardIndex = null;
  } else if (board[selection.boardIndex].type === board[index].type) {
    showToast(SAME_TILES_SWAP);
    shakeTile();
    return;
  } else {
    selection.move = { type: 'swap', a: selection.boardIndex, b: index };
  }
  renderMoveParts();
}

// The move a hand tile makes on a board tile, or why it can't.
function moveWithHandTile(handTile, target, index) {
  if (isBlankType(handTile.type)) return 'Tap one of the dashed gaps to add your blank.';
  if (isRemovalType(handTile.type)) {
    return isLetterType(target.type)
      ? { type: 'remove', tileId: handTile.id, index }
      : 'A removal tile can only remove a letter, never a blank.';
  }
  if (isBlankType(target.type)) return { type: 'playLetter', tileId: handTile.id, index };
  if (target.type === handTile.type) return `Replace the ${target.type} with a different letter.`;
  return { type: 'replace', tileId: handTile.id, index };
}

// The move made by dropping a dragged tile, null if it was let go somewhere
// it can't land, or a message saying why the move isn't allowed. A blank
// dropped on a tile goes on whichever side of it the pointer was.
function moveFromDrop(source, target, point, board) {
  if (!target) return null;
  const index = Number(target.dataset.index);
  if (source.kind === 'board') {
    if (target.dataset.drop !== 'tile' || index === source.index) return null;
    if (board[index].type === board[source.index].type) return SAME_TILES_SWAP;
    return { type: 'swap', a: source.index, b: index };
  }
  const handTile = source.tile;
  if (target.dataset.drop === 'gap') return { type: 'playBlank', tileId: handTile.id, index };
  if (target.dataset.drop !== 'tile') return null;
  if (isBlankType(handTile.type)) {
    const rect = target.getBoundingClientRect();
    return { type: 'playBlank', tileId: handTile.id, index: point.x > rect.left + rect.width / 2 ? index + 1 : index };
  }
  return moveWithHandTile(handTile, board[index], index);
}

// Where a letter or blank already placed on the board (but not yet played)
// goes when it's dragged somewhere else. The board on screen is the preview,
// so a blank's position is mapped back to the real board. Returns null to
// leave the move as it was.
function moveFromPreviewDrop(target, point) {
  const { move } = selection;
  if (!target || target.dataset.drop !== 'tile') return null;
  const shown = Number(target.dataset.index);
  if (shown === move.index) return null;
  if (move.type === 'playBlank') {
    const real = shown > move.index ? shown - 1 : shown;
    const rect = target.getBoundingClientRect();
    const index = point.x > rect.left + rect.width / 2 ? real + 1 : real;
    return index === move.index ? null : { type: 'playBlank', tileId: move.tileId, index };
  }
  const handTile = game().hand.find((tile) => tile.id === move.tileId);
  return moveWithHandTile(handTile, game().board[shown], shown);
}

// Drag a hand tile onto the board, a board tile onto another to swap them, or
// a placed letter or blank to a new spot. Dropping a tile back on your hand
// undoes the move.
function makeTileDraggable(button, source) {
  makeDraggable(button, {
    onStart: () => {
      if (!isMyTurn()) return false;
      if (source.kind === 'hand') {
        selection = { handId: source.tile.id, boardIndex: null, move: null };
        byId('hand').querySelectorAll('.is-selected').forEach((tile) => tile.classList.remove('is-selected'));
        button.classList.add('is-selected');
        delete byId('hand').dataset.drop;
        renderBoard(); // shows the gaps when dragging a blank
        renderActionBar();
      } else if (source.kind === 'board') {
        if (selection.move) return false;
        selection = { handId: null, boardIndex: source.index, move: null };
      } else if (!selection.move) {
        return false;
      }
      return true;
    },
    onDrop: (target, point, ghostRect) => {
      const dropped = { tileId: source.tileId, rect: ghostRect };
      if (target?.dataset.drop === 'hand') {
        selection = emptySelection();
        renderMoveParts({ dropped });
        return;
      }
      const move = source.kind === 'preview'
        ? moveFromPreviewDrop(target, point)
        : moveFromDrop(source, target, point, game().board);
      if (typeof move === 'string') {
        showToast(move);
        pulse(target, 'shake');
      }
      if (!move || typeof move === 'string') {
        // A placed tile goes back where it was; anything else is let go.
        if (source.kind !== 'preview') selection = emptySelection();
        renderMoveParts({ dropped });
        return;
      }
      selection = { handId: source.kind === 'board' ? null : move.tileId, boardIndex: null, move };
      renderMoveParts({ dropped });
    },
  });
}

// The board as it would look after the move, and which positions change. A
// letter about to be removed stays in place, marked, so it can be tapped to undo.
function previewBoard(move) {
  const tiles = [...game().board];
  const handTile = game().hand.find((tile) => tile.id === move.tileId);
  switch (move.type) {
    case 'swap':
      [tiles[move.a], tiles[move.b]] = [tiles[move.b], tiles[move.a]];
      return { board: tiles, changed: new Set([move.a, move.b]) };
    case 'replace':
    case 'playLetter':
      tiles[move.index] = handTile;
      return { board: tiles, changed: new Set([move.index]) };
    case 'playBlank':
      tiles.splice(move.index, 0, handTile);
      return { board: tiles, changed: new Set([move.index]) };
    case 'remove':
      return { board: tiles, changed: new Set([move.index]), removing: move.index };
    default:
      return { board: tiles, changed: new Set() };
  }
}

function describePending(move) {
  const { board } = game();
  const handTile = game().hand.find((tile) => tile.id === move.tileId);
  const label = (tile) => (isBlankType(tile.type) ? 'the blank' : `the ${tile.type}`);
  switch (move.type) {
    case 'swap': return `Swap ${label(board[move.a])} and ${label(board[move.b])}`;
    case 'replace': return `Replace the ${board[move.index].type} with ${withArticle(handTile.type)}`;
    case 'playLetter': return `Play ${withArticle(handTile.type)} on the blank`;
    case 'playBlank':
      if (move.index === 0) return 'Add a blank at the start';
      if (move.index === board.length) return 'Add a blank at the end';
      return `Add a blank between ${label(board[move.index - 1])} and ${label(board[move.index])}`;
    case 'remove': return `Remove the ${board[move.index].type}`;
    default: return '';
  }
}

// ---------- Buttons that need a second tap ----------

function isConfirming(action) {
  return confirming.action === action && Date.now() < confirming.until;
}

// Returns true on the second tap. The first tap only changes the button's label.
function confirmTap(action) {
  if (isConfirming(action)) {
    confirming = { action: null, until: 0 };
    return true;
  }
  confirming = { action, until: Date.now() + CONFIRM_MS };
  renderPanel();
  setTimeout(() => { if (gameState?.game) renderPanel(); }, CONFIRM_MS + 50);
  return false;
}

// ---------- Animations for what just happened ----------

// Where a tile that wasn't on screen before comes from: another player's seat
// when they just played it, otherwise the bag (dealing and drawing).
function tileOrigin(element, fresh) {
  if (element.closest('#board')) {
    const moved = [...fresh].reverse().find((event) => event.type === 'moved');
    if (moved && !isYou(moved.playerId) && ['playLetter', 'replace', 'playBlank'].includes(moved.move.type)) {
      const icon = seatOf(moved.playerId)?.querySelector('.player-icon');
      if (icon) return icon.getBoundingClientRect();
    }
  }
  return byId('bag-button').getBoundingClientRect();
}

// Where a tile that left the screen went: the discard pile, except a tile you
// just traded, which stays face down until the next round starts.
function tileDestination(old, fresh) {
  const traded = fresh.some((event) => event.type === 'traded' && isYou(event.playerId));
  if (traded && old.container === byId('hand')) return null;
  return byId('discard-button').getBoundingClientRect();
}

// A tile that pops up over a player's seat, then flies to the discard pile.
function flyToDiscard(playerId, type, options) {
  const icon = seatOf(playerId)?.querySelector('.player-icon');
  flyTile(makeTile({ type }), icon?.getBoundingClientRect(), byId('discard-button').getBoundingClientRect(), options);
}

function celebrate(fresh) {
  const board = document.querySelector('#screen-game .board-area');
  for (const event of fresh) {
    if (event.type === 'challenged' || event.type === 'startingBoardChallenged') pulse(board, 'flash-yellow');
    if (event.type === 'challengeSettled') pulse(board, event.valid ? 'flash-green' : 'flash-red');
    if (event.type === 'startingBoardSettled') pulse(board, 'flash-green');
    if (event.type === 'roundEnding' && event.reason === 'completion') pulse(board, 'flash-green');
    if (event.type === 'gameOver' && isYou(event.winnerId)) confetti(byId('game-over'));
    // Everyone's traded tiles are shown at the same time, over their seats.
    if (event.type === 'tradesRevealed') {
      for (const trade of event.trades) flyToDiscard(trade.playerId, trade.type, { hold: 1400 });
    }
    // A player who left or was removed drops their tiles face up, one after another.
    if (event.type === 'left' || event.type === 'ejected') {
      event.tiles.forEach((type, i) => flyToDiscard(event.playerId, type, { delay: i * 110, hold: 500 }));
    }
  }

  for (const player of game().players) {
    const before = shownCounts.get(player.id);
    const change = player.handCount - (before ?? player.handCount);
    if (change === 0 || player.ejected) continue;
    const seatCount = seatOf(player.id)?.querySelector('.seat-count');
    floatLabel(seatCount, change > 0 ? `+${change}` : String(change), change > 0 ? 'is-gain' : 'is-loss');
  }

  const active = actingPlayerId();
  if (active && active !== shownActive) pulse(seatOf(active)?.querySelector('.seat-avatar'), 'bump');
  if (shownBag !== null && game().bagCount !== shownBag) pulse(byId('bag-count'), 'bump');
  if (shownDiscard !== null && game().discard.count !== shownDiscard) pulse(byId('discard-button'), 'bump');
}

function rememberShown() {
  shownCounts = new Map(game().players.map((player) => [player.id, player.handCount]));
  shownActive = actingPlayerId();
  shownBag = game().bagCount;
  shownDiscard = game().discard.count;
}

// ---------- Messages and clocks ----------

// Shows a pop-up for big news that arrived since the last update.
function announceNewEvents() {
  const { events } = game();
  const newest = events.at(-1)?.seq ?? 0;
  if (lastSeenEvent !== null) {
    for (const event of events) {
      if (event.seq > lastSeenEvent && ['ejected', 'left', 'gameOver'].includes(event.type)) {
        showToast(describeEvent(event));
      }
    }
  }
  lastSeenEvent = newest;
}

function updateClocks() {
  if (!gameState?.game || currentScreen !== 'game') return;
  const { phase } = game();
  if (phase.deadline === undefined) return;
  const remaining = Math.max(0, phase.deadline - (Date.now() + clockOffset));
  const seconds = Math.ceil(remaining / 1000);
  const clock = byId('status-clock');
  clock.textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  clock.classList.toggle('is-low', seconds <= 10);

  const ring = document.querySelector('.seat.is-active .ring-fill');
  if (ring) {
    const total = (PHASE_SECONDS[phase.name] ?? 60) * 1000;
    ring.style.strokeDashoffset = SEAT_RING * (1 - Math.min(1, remaining / total));
    ring.classList.toggle('is-low', seconds <= 10);
  }
}

setInterval(updateClocks, 250);

// ---------- Buttons ----------

byId('play-move').addEventListener('click', async () => {
  const { move } = selection;
  if (!move) return;
  byId('play-move').disabled = true;
  const result = await request('move', { move });
  if (!result.ok) {
    showToast(result.message);
    clearMove();
  }
});

byId('clear-move').addEventListener('click', clearMove);

byId('challenge-button').addEventListener('click', async () => {
  if (!confirmTap('challenge')) return;
  const result = await request('challenge');
  if (!result.ok) showToast(result.message);
});

byId('name-word-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const feedback = byId('name-word-feedback');
  const result = await request('nameWord', { word: byId('name-word-input').value });
  const problem = !result.ok ? result.message : !result.accepted ? result.reason : null;
  feedback.hidden = problem === null;
  feedback.textContent = problem ?? '';
  if (problem) pulse(byId('name-word-input'), 'shake');
});

byId('name-word-input').addEventListener('input', () => { byId('name-word-feedback').hidden = true; });

byId('give-up').addEventListener('click', async () => {
  if (!confirmTap('giveUp')) return;
  const result = await request('giveUp');
  if (!result.ok) showToast(result.message);
});

byId('start-challenge-button').addEventListener('click', async () => {
  if (!confirmTap('startingBoard')) return;
  const result = await request('challengeStartingBoard');
  if (!result.ok) showToast(result.message);
});

byId('pass-button').addEventListener('click', async () => {
  const result = await request('pass');
  if (!result.ok) showToast(result.message);
});

byId('trade-tile').addEventListener('click', async () => {
  const tile = selectedHandTile();
  if (!tile) return;
  byId('trade-tile').disabled = true;
  const result = await request('tradeTile', { tileId: tile.id });
  if (!result.ok) {
    showToast(result.message);
    byId('trade-tile').disabled = false;
  }
});

byId('keep-tiles').addEventListener('click', async () => {
  const result = await request('keepTiles');
  if (!result.ok) showToast(result.message);
});

byId('play-again').addEventListener('click', async () => {
  const result = await request('playAgain');
  if (!result.ok) showToast(result.message);
});

byId('go-home').addEventListener('click', async () => {
  await request('leaveMatch');
  forgetSeat(matchCode);
  goHome();
});

byId('leave-game').addEventListener('click', async () => {
  if (!gameState.youWatch && !confirmTap('leave')) return;
  const result = await request('leaveMatch');
  if (!result.ok) {
    showToast(result.message);
    return;
  }
  forgetSeat(matchCode);
  goHome();
});

byId('pass-host').addEventListener('click', () => openPeople('host')); // in client.js

byId('end-game').addEventListener('click', async () => {
  if (!confirmTap('endGame')) return;
  const result = await request('endGame');
  if (!result.ok) showToast(result.message);
});

byId('bag-button').addEventListener('click', () => {
  renderUnseen();
  byId('bag-dialog').showModal();
});

byId('discard-button').addEventListener('click', () => {
  renderDiscard();
  byId('discard-dialog').showModal();
});

window.addEventListener('resize', () => {
  if (!gameState?.game || currentScreen !== 'game') return;
  renderBoard();
  renderWordList();
});
