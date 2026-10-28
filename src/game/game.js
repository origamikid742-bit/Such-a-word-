'use strict';

const {
  TILE_COUNTS,
  createTileSet,
  shuffle,
  isLetter,
  isBlank,
  isRemoval,
  patternOf,
} = require('./tiles');

const HAND_SIZE = 7;
const TURN_MS = 60_000;
const CHALLENGE_MS = 30_000;
const ROUND_END_MS = 30_000;
const BETWEEN_ROUNDS_MS = 20_000;
const PENALTY_TILES = 3;
const STARTING_BOARD_PENALTY = 2;
const MISSED_TURNS_LIMIT = 3;
const STARTING_BLANKS = 4;
const STARTING_DRAWS = 2;

// A move or action the rules don't allow. Nothing changes when one is thrown.
class GameError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

// One match's game, from the first round to the winner. See rules.md and the
// Decisions in CLAUDE.md.
//
// The rules never read the clock. Every action takes `now` (milliseconds), and
// the server calls advanceTime(now) when the current deadline passes.
//
// `phase` says what the game is waiting for:
//   turn              { playerId, deadline, opening }  opening: may challenge the starting board
//   challenge         { kind: 'move' | 'lastTile', challengerId, challengedId, deadline }
//   roundEnding       { reason: 'completion' | 'stalemate', moverId, deadline, passed }
//   startingChallenge { challengerId, deadline, passed }
//   betweenRounds     { starterId, deadline, done }
//   over              { winnerId, reason: 'lastTile' | 'lastPlayer' }
//
// A player who is out of the game (ejected, or left) has `ejected: true`;
// one who chose to leave also has `left: true`.
class Game {
  constructor(playerIds, { words, rng = Math.random, now = Date.now() } = {}) {
    if (playerIds.length < 2) throw new GameError('not-enough-players', 'A game needs at least 2 players.');
    this.words = words;
    this.rng = rng;
    this.players = playerIds.map((id) => ({ id, hand: [], missedTurns: 0, ejected: false, left: false }));
    this.bag = shuffle(createTileSet(), rng);
    this.board = [];
    this.discard = []; // face up, and kept across rounds until the bag runs out
    this.setAside = []; // { playerId, tile }: traded tiles, face down until the next round starts
    this.linedUp = null; // { playerId, move }: the move lined up this turn, never shown to others
    this.round = 0;
    this.phase = null;
    this.lastMove = null; // the move that can still be challenged
    this.swapStreak = 0; // swaps in a row, for stalemate
    this.events = []; // what happened, for the players' screens

    for (const player of this.players) this.draw(player, HAND_SIZE);
    const first = this.players[Math.floor(rng() * this.players.length)];
    this.startRound(first.id, now);
  }

  // ---------- Questions ----------

  player(id) {
    const player = this.players.find((candidate) => candidate.id === id);
    if (!player) throw new GameError('not-in-game', "You're not in this game.");
    return player;
  }

  activePlayer(id) {
    const player = this.player(id);
    if (player.ejected) throw new GameError('ejected', 'You were removed from this game.');
    return player;
  }

  activePlayers() {
    return this.players.filter((player) => !player.ejected);
  }

  // The next player in turn order who is still in the game.
  nextActiveAfter(id) {
    const start = this.players.findIndex((player) => player.id === id);
    for (let step = 1; step < this.players.length; step++) {
      const candidate = this.players[(start + step) % this.players.length];
      if (!candidate.ejected) return candidate.id;
    }
    return id;
  }

  pattern() {
    return patternOf(this.board);
  }

  deadline() {
    return this.phase.deadline ?? null;
  }

  // Could this player make any of the five moves, whether or not it leaves a word?
  canMove(player) {
    const boardTypes = new Set(this.board.map((tile) => tile.type));
    if (boardTypes.size >= 2) return true; // 1. swap
    if (player.hand.some(isBlank)) return true; // 4. play a blank
    const boardLetters = this.board.filter(isLetter);
    if (player.hand.some(isRemoval) && boardLetters.length > 0) return true; // 5. remove a letter
    const handLetters = player.hand.filter(isLetter);
    if (handLetters.length > 0 && this.board.some(isBlank)) return true; // 3. play a letter
    return handLetters.some((mine) => boardLetters.some((theirs) => theirs.type !== mine.type)); // 2. replace
  }

  // For one player: how many of each tile they can't see. That is the bag plus
  // the other players' hands (and tiles they traded, until they're revealed),
  // because the board and discard pile are in view.
  unseenTiles(playerId) {
    const me = this.player(playerId);
    const mySetAside = this.setAside.filter((entry) => entry.playerId === playerId).map((entry) => entry.tile);
    const counts = { ...TILE_COUNTS };
    for (const tile of [...me.hand, ...mySetAside, ...this.board, ...this.discard]) counts[tile.type] -= 1;
    const inOtherHands = this.players
      .filter((player) => player.id !== playerId)
      .reduce((total, player) => total + player.hand.length, 0)
      + this.setAside.length - mySetAside.length;
    return { counts, inBag: this.bag.length, inOtherHands };
  }

  // ---------- Turns and moves ----------

  // `auto` marks a lined-up move played because the turn clock ran out.
  move(playerId, move, now, { auto = false } = {}) {
    const player = this.activePlayer(playerId);
    if (this.phase.name !== 'turn' || this.phase.playerId !== playerId) {
      throw new GameError('not-your-turn', "It's not your turn.");
    }
    const summary = this.applyMove(player, move ?? {});
    player.missedTurns = 0;
    this.lastMove = { playerId, ...summary };
    this.swapStreak = summary.type === 'swap' ? this.swapStreak + 1 : 0;
    this.log('moved', { playerId, move: summary, ...(auto ? { auto: true } : {}) });

    if (player.hand.length === 0) {
      this.phase = {
        name: 'challenge',
        kind: 'lastTile',
        challengerId: null,
        challengedId: playerId,
        deadline: now + CHALLENGE_MS,
      };
      this.log('challenged', { kind: 'lastTile', challengerId: null, challengedId: playerId });
    } else if (summary.type === 'playLetter' && !this.board.some(isBlank)) {
      this.openRoundEnding('completion', playerId, now);
    } else if (this.swapStreak >= this.activePlayers().length) {
      this.openRoundEnding('stalemate', playerId, now);
    } else {
      this.startTurn(this.nextActiveAfter(playerId), now);
    }
  }

  applyMove(player, move) {
    switch (move.type) {
      case 'swap': return this.swap(move.a, move.b);
      case 'replace': return this.replace(player, move.tileId, move.index);
      case 'playLetter': return this.playLetter(player, move.tileId, move.index);
      case 'playBlank': return this.playBlank(player, move.tileId, move.index);
      case 'remove': return this.removeLetter(player, move.tileId, move.index);
      default: throw new GameError('bad-move', 'Choose one of the five moves.');
    }
  }

  // Move 1: swap two different tiles on the board.
  swap(a, b) {
    const first = this.boardTile(a);
    const second = this.boardTile(b);
    if (a === b || first.type === second.type) {
      throw new GameError('bad-move', 'Swap two different tiles: not two blanks, and not two of the same letter.');
    }
    [this.board[a], this.board[b]] = [second, first];
    return { type: 'swap', a, b };
  }

  // Move 2: put a letter from your hand on a different board letter, then draw 1.
  replace(player, tileId, index) {
    const tile = this.handTile(player, tileId);
    const target = this.boardTile(index);
    if (!isLetter(tile)) throw new GameError('bad-move', 'Replace a board letter with a letter from your hand.');
    if (!isLetter(target)) {
      throw new GameError('bad-move', 'You can only replace a letter. To cover a blank, play a letter on it.');
    }
    if (tile.type === target.type) throw new GameError('bad-move', `Replace the ${target.type} with a different letter.`);
    this.takeFromHand(player, tile);
    this.board[index] = tile;
    this.discard.push(target);
    this.draw(player, 1);
    return { type: 'replace', index, letter: tile.type, replaced: target.type };
  }

  // Move 3: put a letter from your hand on a blank.
  playLetter(player, tileId, index) {
    const tile = this.handTile(player, tileId);
    const target = this.boardTile(index);
    if (!isLetter(tile)) throw new GameError('bad-move', 'Play a letter from your hand on a blank.');
    if (!isBlank(target)) {
      throw new GameError('bad-move', 'You can only play a letter on a blank. To change a letter, replace it.');
    }
    this.takeFromHand(player, tile);
    this.board[index] = tile;
    this.discard.push(target);
    return { type: 'playLetter', index, letter: tile.type };
  }

  // Move 4: add a blank from your hand at either end or between two tiles.
  playBlank(player, tileId, index) {
    const tile = this.handTile(player, tileId);
    if (!isBlank(tile)) throw new GameError('bad-move', 'Choose a blank from your hand.');
    if (!Number.isInteger(index) || index < 0 || index > this.board.length) {
      throw new GameError('bad-move', 'Add the blank at either end or between two tiles.');
    }
    this.takeFromHand(player, tile);
    this.board.splice(index, 0, tile);
    return { type: 'playBlank', index };
  }

  // Move 5: play a removal tile on a board letter. Both are discarded.
  removeLetter(player, tileId, index) {
    const tile = this.handTile(player, tileId);
    const target = this.boardTile(index);
    if (!isRemoval(tile)) throw new GameError('bad-move', 'Choose a removal tile from your hand.');
    if (!isLetter(target)) throw new GameError('bad-move', 'A removal tile can only remove a letter, never a blank.');
    this.takeFromHand(player, tile);
    this.board.splice(index, 1);
    this.discard.push(target, tile);
    return { type: 'remove', index, removed: target.type };
  }

  boardTile(index) {
    if (!Number.isInteger(index) || index < 0 || index >= this.board.length) {
      throw new GameError('bad-move', 'Choose a tile on the board.');
    }
    return this.board[index];
  }

  handTile(player, tileId) {
    const tile = player.hand.find((candidate) => candidate.id === tileId);
    if (!tile) throw new GameError('bad-move', 'Choose a tile from your hand.');
    return tile;
  }

  takeFromHand(player, tile) {
    player.hand.splice(player.hand.indexOf(tile), 1);
  }

  // The move a player has chosen but not played yet. If their turn clock runs
  // out, it is played for them instead of the penalty. null clears it.
  lineUp(playerId, move) {
    this.activePlayer(playerId);
    if (this.phase.name !== 'turn' || this.phase.playerId !== playerId) {
      throw new GameError('not-your-turn', "It's not your turn.");
    }
    this.linedUp = move ? { playerId, move } : null;
  }

  // Starts a player's turn. A player who can't make any move draws until they
  // can; with nothing left to draw, their turn is skipped (not a missed turn).
  startTurn(playerId, at, { opening = false } = {}) {
    this.linedUp = null;
    let id = playerId;
    for (let skipped = 0; skipped < this.activePlayers().length; skipped++) {
      const player = this.player(id);
      let drawn = 0;
      while (!this.canMove(player) && this.draw(player, 1) === 1) drawn++;
      if (drawn > 0) this.log('drewToMove', { playerId: id, count: drawn });
      if (this.canMove(player)) {
        this.phase = { name: 'turn', playerId: id, deadline: at + TURN_MS, opening };
        return;
      }
      this.log('skipped', { playerId: id });
      this.swapStreak = 0;
      opening = false;
      id = this.nextActiveAfter(id);
    }
    // Nobody can move at all, so start a fresh round.
    this.endRound(id, at);
  }

  // The turn clock ran out. A lined-up move is played for the player;
  // otherwise they draw 3 and lose the turn, and three in a row ejects them.
  timeOut(at) {
    const player = this.player(this.phase.playerId);
    if (this.linedUp?.playerId === player.id && this.playLinedUp(player, at)) return;
    const nextId = this.nextActiveAfter(player.id);
    this.draw(player, PENALTY_TILES);
    player.missedTurns += 1;
    this.swapStreak = 0;
    this.log('timedOut', { playerId: player.id, missedTurns: player.missedTurns });
    if (player.missedTurns >= MISSED_TURNS_LIMIT) {
      this.removePlayer(player, 'ejected');
      if (this.phase.name === 'over') return;
    }
    this.startTurn(nextId, at);
  }

  // Plays the lined-up move as the clock runs out. A move the rules don't
  // allow (it never should be) changes nothing, and the penalty applies.
  playLinedUp(player, at) {
    const { move } = this.linedUp;
    this.linedUp = null;
    try {
      this.move(player.id, move, at, { auto: true });
      return true;
    } catch (err) {
      if (err instanceof GameError) return false;
      throw err;
    }
  }

  // A player chooses to leave mid-game. It works like being ejected, and
  // leaving while challenged counts as giving up first.
  leave(playerId, now) {
    const player = this.activePlayer(playerId);
    if (this.phase.name === 'over') throw new GameError('game-over', 'The game is already over.');
    if (this.phase.name === 'challenge' && this.phase.challengedId === playerId) this.settleChallenge(null, now);
    const phase = this.phase;
    this.removePlayer(player, 'left');
    if (this.phase.name === 'over') return;

    // Whatever the game was waiting for may have been waiting on this player.
    if (phase.name === 'turn' && phase.playerId === playerId) {
      this.startTurn(this.nextActiveAfter(playerId), now);
    } else if (phase.name === 'startingChallenge' && phase.challengerId === playerId) {
      this.resetBoard();
      this.startTurn(this.nextActiveAfter(playerId), now, { opening: true });
    } else if (phase.name === 'roundEnding' && phase.moverId === playerId) {
      this.endRound(this.nextActiveAfter(playerId), now);
    } else if (phase.name === 'roundEnding' || phase.name === 'startingChallenge') {
      if (this.everyonePassed()) this.expire(now);
    } else if (phase.name === 'betweenRounds') {
      if (phase.starterId === playerId) phase.starterId = this.nextActiveAfter(playerId);
      this.startRoundIfReady(now);
    }
  }

  // Takes a player out of the game. Their tiles, including a traded tile not
  // yet revealed, go face up onto the discard pile for everyone to see.
  removePlayer(player, how) {
    const tiles = [...player.hand, ...this.takeSetAside(player.id)];
    this.discard.push(...tiles);
    player.hand = [];
    player.ejected = true;
    player.left = how === 'left';
    if (this.lastMove?.playerId === player.id) this.lastMove = null;
    if (this.linedUp?.playerId === player.id) this.linedUp = null;
    this.log(how, { playerId: player.id, tiles: tiles.map((tile) => tile.type) });
    const remaining = this.activePlayers();
    if (remaining.length === 1) this.finish(remaining[0].id, 'lastPlayer');
  }

  // ---------- Challenges ----------

  // Claims the most recent move left an invalid board.
  challengeMove(playerId, now) {
    const challenger = this.activePlayer(playerId);
    const open = this.phase.name === 'turn' || this.phase.name === 'roundEnding';
    if (!open || !this.lastMove) {
      throw new GameError('nothing-to-challenge', 'There is no move to challenge right now.');
    }
    const challengedId = this.lastMove.playerId;
    if (challengedId === playerId) throw new GameError('own-move', "You can't challenge your own move.");
    if (this.phase.name === 'turn' && this.phase.playerId === playerId) challenger.missedTurns = 0;
    this.phase = { name: 'challenge', kind: 'move', challengerId: playerId, challengedId, deadline: now + CHALLENGE_MS };
    this.log('challenged', { kind: 'move', challengerId: playerId, challengedId });
  }

  // The first player may challenge the starting board before their first move.
  challengeStartingBoard(playerId, now) {
    const player = this.activePlayer(playerId);
    if (this.phase.name !== 'turn' || !this.phase.opening || this.phase.playerId !== playerId) {
      throw new GameError(
        'cannot-challenge-board',
        'Only the first player can challenge the starting board, before their first move.',
      );
    }
    player.missedTurns = 0;
    this.phase = { name: 'startingChallenge', challengerId: playerId, deadline: now + CHALLENGE_MS, passed: [] };
    this.log('startingBoardChallenged', { playerId });
  }

  // Answers a challenge with a word. Returns the word check; a word that
  // doesn't count changes nothing, and the player can try again in time.
  nameWord(playerId, rawWord, now) {
    this.activePlayer(playerId);
    const phase = this.phase;
    if (phase.name === 'challenge') {
      if (playerId !== phase.challengedId) {
        throw new GameError('not-challenged', 'Only the challenged player can name a word.');
      }
    } else if (phase.name === 'startingChallenge') {
      if (playerId === phase.challengerId) {
        throw new GameError('own-challenge', 'Another player has to name a word for the starting board.');
      }
    } else {
      throw new GameError('no-challenge', 'There is no challenge to answer right now.');
    }
    const result = this.words.check(this.pattern(), rawWord);
    if (!result.ok) return result;
    if (phase.name === 'challenge') this.settleChallenge(result, now);
    else this.settleStartingChallenge(playerId, result, now);
    return result;
  }

  // The challenged player admits they can't name a word.
  giveUp(playerId, now) {
    if (this.phase.name !== 'challenge' || this.phase.challengedId !== playerId) {
      throw new GameError('no-challenge', 'There is no challenge for you to answer right now.');
    }
    this.settleChallenge(null, now);
  }

  // "No challenge": lets a round end, or a starting-board challenge fail, early.
  pass(playerId, now) {
    this.activePlayer(playerId);
    const phase = this.phase;
    const ownerId = phase.name === 'roundEnding' ? phase.moverId
      : phase.name === 'startingChallenge' ? phase.challengerId
      : null;
    if (ownerId === null || ownerId === playerId) {
      throw new GameError('nothing-to-pass', 'There is nothing for you to pass on right now.');
    }
    if (!phase.passed.includes(playerId)) phase.passed.push(playerId);
    if (this.everyonePassed()) this.expire(now);
  }

  // Has everyone except the player the round ending or starting-board
  // challenge belongs to passed?
  everyonePassed() {
    const { phase } = this;
    const ownerId = phase.name === 'roundEnding' ? phase.moverId : phase.challengerId;
    return this.activePlayers().every((player) => player.id === ownerId || phase.passed.includes(player.id));
  }

  // `result` is the accepted word, or null when no valid word was named in time.
  // The event keeps the board so the screen can list every word that fitted.
  settleChallenge(result, at) {
    const { kind, challengerId, challengedId } = this.phase;
    const valid = result !== null;
    this.log('challengeSettled', {
      kind,
      challengerId,
      challengedId,
      valid,
      word: result?.word ?? null,
      blanks: result?.blanks ?? null,
      pattern: this.pattern(),
    });
    if (kind === 'lastTile' && valid) {
      this.finish(challengedId, 'lastTile');
      return;
    }
    const loser = this.player(kind === 'move' && valid ? challengerId : challengedId);
    if (!loser.ejected) this.draw(loser, PENALTY_TILES); // a challenger who has left draws nothing
    this.endRound(loser.id, at);
  }

  // Another player found a word for the starting board: the first player
  // draws 2, then takes their turn with a fresh minute.
  settleStartingChallenge(namerId, result, at) {
    const starterId = this.phase.challengerId;
    this.log('startingBoardSettled', { starterId, namerId, word: result.word, blanks: result.blanks });
    this.draw(this.player(starterId), STARTING_BOARD_PENALTY);
    this.startTurn(starterId, at);
  }

  // Nobody found a word for the starting board: build a new one, which the
  // first player may challenge again.
  rebuildStartingBoard(at) {
    const starterId = this.phase.challengerId;
    this.log('startingBoardRebuilt', { starterId, pattern: this.pattern() });
    this.resetBoard();
    this.startTurn(starterId, at, { opening: true });
  }

  // ---------- Rounds ----------

  openRoundEnding(reason, moverId, now) {
    this.phase = { name: 'roundEnding', reason, moverId, deadline: now + ROUND_END_MS, passed: [] };
    this.log('roundEnding', { reason, moverId });
  }

  // A starter who is out of the game hands the next round to the next player.
  endRound(starterId, at) {
    const starter = this.player(starterId).ejected ? this.nextActiveAfter(starterId) : starterId;
    this.lastMove = null;
    this.swapStreak = 0;
    this.phase = { name: 'betweenRounds', starterId: starter, deadline: at + BETWEEN_ROUNDS_MS, done: [] };
    this.log('roundEnded', { starterId: starter });
  }

  // Between rounds, each player may discard 1 tile and draw 1. The discarded
  // tile stays face down until the next round starts, when everyone's traded
  // tiles are revealed together.
  tradeTile(playerId, tileId, now) {
    const player = this.activePlayer(playerId);
    const phase = this.betweenRoundsFor(playerId);
    const tile = this.handTile(player, tileId);
    this.takeFromHand(player, tile);
    this.setAside.push({ playerId, tile });
    this.draw(player, 1);
    phase.done.push(playerId);
    this.log('traded', { playerId });
    this.startRoundIfReady(now);
  }

  // Everyone's traded tiles go face up onto the discard pile at the same time.
  revealTrades() {
    if (this.setAside.length === 0) return;
    const trades = this.setAside.map(({ playerId, tile }) => ({ playerId, type: tile.type }));
    this.discard.push(...this.setAside.map((entry) => entry.tile));
    this.setAside = [];
    this.log('tradesRevealed', { trades });
  }

  takeSetAside(playerId) {
    const mine = this.setAside.filter((entry) => entry.playerId === playerId);
    this.setAside = this.setAside.filter((entry) => entry.playerId !== playerId);
    return mine.map((entry) => entry.tile);
  }

  keepTiles(playerId, now) {
    this.activePlayer(playerId);
    this.betweenRoundsFor(playerId).done.push(playerId);
    this.startRoundIfReady(now);
  }

  betweenRoundsFor(playerId) {
    if (this.phase.name !== 'betweenRounds') {
      throw new GameError('not-between-rounds', 'You can only trade a tile between rounds.');
    }
    if (this.phase.done.includes(playerId)) {
      throw new GameError('already-traded', 'You already made your choice for this round.');
    }
    return this.phase;
  }

  startRoundIfReady(now) {
    const { done, starterId } = this.phase;
    if (this.activePlayers().every((player) => done.includes(player.id))) this.startRound(starterId, now);
  }

  startRound(starterId, at) {
    this.revealTrades();
    this.resetBoard();
    this.round += 1;
    this.log('roundStarted', { round: this.round, starterId });
    this.startTurn(starterId, at, { opening: true });
  }

  // Moves the board onto the discard pile and lays a new starting board: 4
  // blanks (or as many as there are), taken from the discard pile first and
  // then the bag, shuffled with 2 tiles from the top of the bag. A drawn
  // removal tile is discarded with no replacement. The bag itself is never
  // shuffled here; the discard pile goes back into it only when it runs out.
  resetBoard() {
    this.discard.push(...this.board);
    this.board = [];
    const row = [];
    for (const pile of [this.discard, this.bag]) {
      while (row.length < STARTING_BLANKS) {
        const index = pile.findIndex(isBlank);
        if (index === -1) break;
        row.push(...pile.splice(index, 1));
      }
    }
    for (let drawn = 0; drawn < STARTING_DRAWS; drawn++) {
      const tile = this.drawTile();
      if (!tile) break;
      if (isRemoval(tile)) this.discard.push(tile);
      else row.push(tile);
    }
    this.board = shuffle(row, this.rng);
  }

  finish(winnerId, reason) {
    this.phase = { name: 'over', winnerId, reason };
    this.log('gameOver', { winnerId, reason });
  }

  // ---------- Time ----------

  // Handles every deadline that has passed by `now`, in order.
  advanceTime(now) {
    for (let deadline = this.deadline(); deadline !== null && deadline <= now; deadline = this.deadline()) {
      this.expire(deadline);
    }
  }

  expire(at) {
    switch (this.phase.name) {
      case 'turn': this.timeOut(at); break;
      case 'challenge': this.settleChallenge(null, at); break;
      case 'roundEnding': this.endRound(this.nextActiveAfter(this.phase.moverId), at); break;
      case 'startingChallenge': this.rebuildStartingBoard(at); break;
      case 'betweenRounds': this.startRound(this.phase.starterId, at); break;
      default: break;
    }
  }

  // ---------- Tiles ----------

  // Draws up to `count` tiles; when there's nothing left to draw, the draw is skipped.
  draw(player, count) {
    let drawn = 0;
    while (drawn < count) {
      const tile = this.drawTile();
      if (!tile) break;
      player.hand.push(tile);
      drawn++;
    }
    return drawn;
  }

  // The top tile of the bag. When the bag runs out, the discard pile is
  // shuffled and becomes the bag; with both empty, there's nothing to draw.
  drawTile() {
    if (this.bag.length === 0) {
      if (this.discard.length === 0) return null;
      this.bag = shuffle(this.discard, this.rng);
      this.discard = [];
      this.log('bagRefilled', {});
    }
    return this.bag.pop();
  }

  log(type, details) {
    this.events.push({ ...details, seq: this.events.length + 1, type });
  }
}

module.exports = {
  Game,
  GameError,
  HAND_SIZE,
  TURN_MS,
  CHALLENGE_MS,
  ROUND_END_MS,
  BETWEEN_ROUNDS_MS,
  MISSED_TURNS_LIMIT,
};
