'use strict';

// The game screen: players, bag, board, your hand and the five moves.
// Uses byId, makeElement, initialOf, request, showToast, showScreen and
// currentScreen from client.js.

const LETTERS = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'];
const TILE_TYPES = [...LETTERS, 'blank', 'removal'];
const TOTAL_TILES = 130;
const PHASE_SECONDS = { turn: 60, challenge: 30, roundEnding: 30, startingChallenge: 30, betweenRounds: 20 };
const SEAT_RING = 2 * Math.PI * 19;
const BAG_RING = 2 * Math.PI * 25;
const CONFIRM_MS = 3_000;

let gameState = null; // the latest match state with a game in it
let clockOffset = 0; // the server's clock minus this computer's clock
let lastSeenEvent = null; // the newest game event already shown
let selection = emptySelection();
let confirming = { action: null, until: 0 }; // a button tapped once, waiting for a second tap
let wasNaming = false;

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
// "an F", "a G": letters whose names start with a vowel sound take "an".
const withArticle = (letter) => `${'AEFHILMNORSX'.includes(letter) ? 'an' : 'a'} ${letter}`;

const isBlankType = (type) => type === 'blank';
const isRemovalType = (type) => type === 'removal';
const isLetterType = (type) => type.length === 1;
const sortOrder = (type) => (isBlankType(type) ? 26 : isRemovalType(type) ? 27 : type.charCodeAt(0) - 65);

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
    case 'moved': return describeMove(event.playerId, event.move);
    case 'timedOut': return `${subject(event.playerId)} ran out of time and drew 3 tiles.`;
    case 'ejected':
      return `${subject(event.playerId)} ${verb(event.playerId, 'was', 'were')} removed after missing 3 turns in a row.`;
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

function renderGame(state) {
  const modeBefore = gameState?.game ? selectionMode(gameState) : null;
  if (gameState?.code !== state.code || gameState?.gameNumber !== state.gameNumber) {
    lastSeenEvent = null;
    wasNaming = false;
  }
  gameState = state;
  clockOffset = state.game.now - Date.now();
  const modeNow = selectionMode(state);
  if (modeNow === null || modeNow !== modeBefore) selection = emptySelection();
  keepSelectionValid();

  showScreen('game');
  renderSeats();
  renderBag();
  renderBanner();
  renderBoard();
  renderPanel();
  renderHand();
  renderActionBar();
  announceNewEvents();
  updateClocks();
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
  seat.classList.toggle('is-active', actingPlayerId() === player.id);
  seat.classList.toggle('is-away', !player.connected);
  seat.classList.toggle('is-out', info.ejected);

  const avatarWrap = makeElement('div', 'seat-avatar');
  const ring = makeRing('ring-fill seat-ring', 19, 42);
  ring.querySelector('.ring-fill').style.strokeDasharray = SEAT_RING;
  ring.querySelector('.ring-fill').style.strokeDashoffset = SEAT_RING;
  const avatar = makeElement('span', `avatar avatar-${player.avatar}`, initialOf(player.name));
  avatarWrap.append(ring, avatar);

  const name = makeElement('span', 'seat-name', isYou(player.id) ? 'You' : player.name);
  name.title = player.name;
  const count = makeElement('span', 'seat-count', info.ejected ? 'Out' : tileCount(info.handCount));
  seat.append(avatarWrap, name, count);
  return seat;
}

function renderBag() {
  const { bagCount } = game();
  byId('bag-count').textContent = bagCount;
  byId('bag-button').setAttribute('aria-label', `${tileCount(bagCount)} in the bag. Show unseen tiles.`);
  const ring = byId('bag-ring');
  ring.style.strokeDasharray = BAG_RING;
  ring.style.strokeDashoffset = BAG_RING * (1 - bagCount / TOTAL_TILES);
  if (byId('bag-dialog').open) renderUnseen();
}

function renderUnseen() {
  const { unseen } = game();
  if (!unseen) return;
  byId('bag-summary').textContent =
    `${tileCount(unseen.inBag)} in the bag · ${tileCount(unseen.inOtherHands)} in other players' hands`;
  byId('unseen-grid').replaceChildren(...TILE_TYPES.map((type) => {
    const count = unseen.counts[type];
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
  const latest = [...game().events].reverse().map(describeEvent).find(Boolean);
  byId('game-banner').textContent = latest ?? 'Good luck!';
}

// Tiles shrink so a long board still fits on a phone.
function tileSizeFor(tileCount, gapCount) {
  const available = Math.min(document.documentElement.clientWidth, 480) - 32 - 16;
  const free = available - gapCount * 22 - Math.max(0, tileCount - 1) * 6;
  return Math.max(24, Math.min(48, Math.floor(free / Math.max(1, tileCount))));
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
  const changed = preview ? preview.changed : new Set();
  const lastMoved = preview ? new Set() : lastMoveIndexes();
  const handTile = selectedHandTile();
  const choosingGap = isMyTurn() && !preview && handTile !== null && isBlankType(handTile.type);

  const element = byId('board');
  element.style.setProperty('--tile-size', `${tileSizeFor(tiles.length, choosingGap ? tiles.length + 1 : 0)}px`);
  const children = [];
  tiles.forEach((tile, index) => {
    if (choosingGap) children.push(makeGap(index));
    const button = makeTile(tile, 'button');
    const what = isBlankType(tile.type) ? 'blank' : tile.type;
    button.setAttribute('aria-label', `Tile ${index + 1}: ${what}`);
    if (lastMoved.has(index) && isLetterType(tile.type)) button.style.background = 'var(--tile-dark)';
    button.classList.toggle('is-preview', changed.has(index));
    button.classList.toggle('is-selected', !preview && selection.boardIndex === index);
    button.disabled = !isMyTurn() || preview !== null;
    button.addEventListener('click', () => chooseBoardTile(index));
    children.push(button);
  });
  if (choosingGap) children.push(makeGap(tiles.length));
  if (children.length === 0) children.push(makeElement('p', 'board-empty', 'The board is empty.'));
  element.replaceChildren(...children);
}

function makeGap(index) {
  const gap = makeElement('button', 'gap-slot');
  gap.type = 'button';
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

function renderHand() {
  const me = myInfo();
  byId('hand-area').hidden = !me || me.ejected || game().phase.name === 'over';
  const hand = [...game().hand].sort((a, b) => sortOrder(a.type) - sortOrder(b.type));
  const choosing = canTrade() || (isMyTurn() && selection.move === null);
  byId('hand').replaceChildren(...hand.map((tile) => {
    const button = makeTile(tile, 'button');
    button.classList.toggle('is-selected', selection.handId === tile.id);
    button.disabled = !choosing;
    button.addEventListener('click', () => chooseHandTile(tile));
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

  // Challenging a move, challenging the starting board, or passing.
  const challenge = byId('challenge-button');
  challenge.hidden = !canChallenge || hasPassed();
  if (!challenge.hidden) {
    challenge.textContent = isConfirming('challenge')
      ? 'Tap again to challenge'
      : `Challenge ${possessive(lastMove.playerId)} move`;
  }
  const boardChallenge = byId('start-challenge-button');
  boardChallenge.hidden = !(isMyTurn() && phase.opening);
  boardChallenge.textContent = isConfirming('startingBoard')
    ? 'Tap again to challenge the board'
    : 'Challenge the starting board';
  const pass = byId('pass-button');
  pass.hidden = !canPass();
  pass.textContent = phase.name === 'startingChallenge' ? "I can't find one" : 'No challenge';

  // Naming a word, when challenged or when the starting board is challenged.
  const naming = isNaming();
  byId('name-word-form').hidden = !naming;
  if (naming) {
    byId('name-word-hint').textContent = `A ${pattern.length}-letter word that fits ${pattern.split('').join(' ')}`;
    byId('give-up').hidden = phase.name !== 'challenge';
    byId('give-up').textContent = isConfirming('giveUp') ? 'Tap again' : 'Give up';
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

  renderGameOver();
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
    ? `Everyone else was removed, so ${object(winnerId)} won as the last player left.`
    : `${subject(winnerId)} played ${isYou(winnerId) ? 'your' : 'their'} last tile${named ? ` and named ${named.word}` : ''}.`;

  const info = (id) => players.find((player) => player.id === id);
  const rank = (id) => (id === winnerId ? -1 : info(id).ejected ? 1_000 : info(id).handCount);
  const standings = gameState.players
    .filter((player) => info(player.id))
    .sort((a, b) => rank(a.id) - rank(b.id));
  byId('game-over-players').replaceChildren(...standings.map((player) => {
    const item = makeElement('li', 'player');
    item.classList.toggle('is-you', isYou(player.id));
    const avatar = makeElement('span', `avatar avatar-${player.avatar}`, initialOf(player.name));
    avatar.setAttribute('aria-hidden', 'true');
    const name = makeElement('span', 'player-name', player.name);
    if (isYou(player.id)) name.append(makeElement('span', 'you-label', ' (you)'));
    item.append(avatar, name);
    if (player.id === winnerId) item.append(makeElement('span', 'badge', 'Winner'));
    else item.append(makeElement('span', 'away-label', info(player.id).ejected ? 'Removed' : `${tileCount(info(player.id).handCount)} left`));
    return item;
  }));
}

function renderActionBar() {
  const mine = isMyTurn();
  byId('action-bar').hidden = !mine;
  if (!mine) return;
  byId('move-description').textContent = selection.move ? describePending(selection.move) : moveHint();
  byId('play-move').disabled = selection.move === null;
  byId('clear-move').disabled = selection.move === null && selection.handId === null && selection.boardIndex === null;
}

function renderMoveParts() {
  renderBoard();
  renderHand();
  renderActionBar();
}

// ---------- Choosing a move ----------

const selectedHandTile = () => game().hand.find((tile) => tile.id === selection.handId) ?? null;

function moveHint() {
  const handTile = selectedHandTile();
  if (handTile && isBlankType(handTile.type)) return 'Now tap a gap on the board to add the blank.';
  if (handTile && isRemovalType(handTile.type)) return 'Now tap the letter to remove.';
  if (handTile) return 'Now tap a blank to cover, or a letter to replace.';
  if (selection.boardIndex !== null) return 'Tap another board tile to swap with it.';
  return 'Tap a tile in your hand, or two board tiles to swap.';
}

function chooseHandTile(tile) {
  if (canTrade()) {
    selection.handId = selection.handId === tile.id ? null : tile.id;
    renderHand();
    renderPanel();
    return;
  }
  if (!isMyTurn() || selection.move) return;
  selection = selection.handId === tile.id ? emptySelection() : { handId: tile.id, boardIndex: null, move: null };
  renderMoveParts();
}

function chooseBoardTile(index) {
  if (!isMyTurn() || selection.move) return;
  const { board } = game();
  const handTile = selectedHandTile();
  if (handTile) {
    const move = moveWithHandTile(handTile, board[index], index);
    if (typeof move === 'string') {
      showToast(move);
      return;
    }
    selection.move = move;
  } else if (selection.boardIndex === null) {
    selection.boardIndex = index;
  } else if (selection.boardIndex === index) {
    selection.boardIndex = null;
  } else if (board[selection.boardIndex].type === board[index].type) {
    showToast('Swap two different tiles: not two blanks, and not two of the same letter.');
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

// The board as it would look after the move, and which positions change.
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
      tiles.splice(move.index, 1);
      return { board: tiles, changed: new Set() };
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

// ---------- Messages and clocks ----------

// Shows a pop-up for big news that arrived since the last update.
function announceNewEvents() {
  const { events } = game();
  const newest = events.at(-1)?.seq ?? 0;
  if (lastSeenEvent !== null) {
    for (const event of events) {
      if (event.seq > lastSeenEvent && (event.type === 'ejected' || event.type === 'gameOver')) {
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
    selection = emptySelection();
    renderMoveParts();
  }
});

byId('clear-move').addEventListener('click', () => {
  selection = emptySelection();
  renderMoveParts();
});

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

byId('bag-button').addEventListener('click', () => {
  renderUnseen();
  byId('bag-dialog').showModal();
});

window.addEventListener('resize', () => {
  if (gameState?.game && currentScreen === 'game') renderBoard();
});
