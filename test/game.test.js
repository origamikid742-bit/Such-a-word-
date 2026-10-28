'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Game, GameError, TURN_MS, CHALLENGE_MS } = require('../src/game/game');
const { TILE_COUNTS, isBlank } = require('../src/game/tiles');
const { WordList } = require('../src/game/words');

const words = WordList.load();

// ---------- Helpers ----------

// A random number generator that gives the same numbers every run.
function seeded(seed) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let nextTileId = 10_000;
// Tiles from a picture like 'G _ O _ T'. '_' is a blank and '!' a removal tile.
function tiles(picture) {
  return [...picture.replace(/\s/g, '')].map((symbol) => ({
    id: nextTileId++,
    type: symbol === '_' ? 'blank' : symbol === '!' ? 'removal' : symbol,
  }));
}

const picture = (board) => board.map((tile) => (isBlank(tile) ? '_' : tile.type)).join(' ');

// A game in a chosen position: who holds what, the board, the bag (drawn from
// the end) and whose turn it is, at time 0.
function setUp({ hands, board, turn, bag = 'EEEEEEEEEEEE' }) {
  const game = new Game(Object.keys(hands), { words, rng: seeded(1), now: 0 });
  for (const player of game.players) player.hand = tiles(hands[player.id]);
  game.board = tiles(board);
  game.bag = tiles(bag);
  game.discard = [];
  game.events = [];
  game.startTurn(turn, 0, { opening: true });
  return game;
}

const symbolOf = (type) => (type === 'blank' ? '_' : type === 'removal' ? '!' : type);
function tileId(game, playerId, symbol) {
  const tile = game.player(playerId).hand.find((candidate) => symbolOf(candidate.type) === symbol);
  assert.ok(tile, `${playerId} should hold ${symbol}`);
  return tile.id;
}

const handSize = (game, playerId) => game.player(playerId).hand.length;
const timeOut = (game) => game.advanceTime(game.deadline());
const fails = (code) => (err) => err instanceof GameError && err.code === code;

// Every one of the 130 tiles is in exactly one place.
function assertAllTilesAccountedFor(game) {
  const counts = {};
  const ids = new Set();
  const everywhere = [...game.bag, ...game.board, ...game.discard, ...game.players.flatMap((player) => player.hand)];
  for (const tile of everywhere) {
    counts[tile.type] = (counts[tile.type] ?? 0) + 1;
    ids.add(tile.id);
  }
  assert.deepEqual(counts, TILE_COUNTS);
  assert.equal(ids.size, 130);
}

// ---------- A new game ----------

test('a new game deals 7 tiles each and lays a starting board of 4 blanks and 2 drawn tiles', () => {
  const game = new Game(['p1', 'p2', 'p3'], { words, rng: seeded(7), now: 0 });
  for (const player of game.players) assert.equal(player.hand.length, 7);
  assert.ok(game.board.filter(isBlank).length >= 4);
  assert.equal(game.board.length + game.discard.length, 6, 'a drawn removal tile is discarded');
  assert.ok(game.discard.every((tile) => tile.type === 'removal'));
  assert.equal(game.phase.name, 'turn');
  assert.equal(game.phase.opening, true);
  assert.equal(game.phase.deadline, TURN_MS);
  assert.equal(game.round, 1);
  assertAllTilesAccountedFor(game);
});

// ---------- The rulebook's examples ----------

test('the worked example from the rulebook plays out as written', () => {
  const game = setUp({
    hands: { p1: 'PCRONIE', p2: '_!DATEL', p3: 'MSUBHAE' },
    board: '_ _ A _ _ T',
    turn: 'p1',
  });
  const step = (playerId, move, expectedBoard, wordThatFits) => {
    game.move(playerId, move, 1_000);
    assert.equal(picture(game.board), expectedBoard);
    assert.equal(words.check(game.pattern(), wordThatFits).ok, true);
  };

  step('p1', { type: 'playLetter', tileId: tileId(game, 'p1', 'P'), index: 0 }, 'P _ A _ _ T', 'PLANET');
  step('p2', { type: 'playBlank', tileId: tileId(game, 'p2', '_'), index: 6 }, 'P _ A _ _ T _', 'PLANETS');
  step('p3', { type: 'swap', a: 1, b: 2 }, 'P A _ _ _ T _', 'PARENTS');
  step('p1', { type: 'replace', tileId: tileId(game, 'p1', 'C'), index: 0 }, 'C A _ _ _ T _', 'CARPETS');
  assert.equal(handSize(game, 'p1'), 6, 'player 1 drew a tile after replacing');
  step('p2', { type: 'remove', tileId: tileId(game, 'p2', '!'), index: 0 }, 'A _ _ _ T _', 'ADMITS');

  assert.equal(game.phase.playerId, 'p3');
  game.challengeMove('p3', 2_000);
  assert.equal(game.phase.challengedId, 'p2');
  const named = game.nameWord('p2', 'ADMITS', 3_000);
  assert.deepEqual(named.blanks, ['D', 'M', 'I', 'S']);
  assert.equal(handSize(game, 'p3'), 10, 'player 3 draws 3');
  assert.equal(game.phase.name, 'betweenRounds');
  assert.equal(game.phase.starterId, 'p3', 'player 3 starts the next round');
});

test('the QUOTE bluff: nobody can name a word for Q _ T E, so player 2 draws 3', () => {
  const game = setUp({
    hands: { p1: 'AEIOU', p2: 'QBRST', p3: 'LMNOP' },
    board: '_ _ T E',
    turn: 'p2',
  });
  game.move('p2', { type: 'playLetter', tileId: tileId(game, 'p2', 'Q'), index: 0 }, 1_000);
  assert.equal(picture(game.board), 'Q _ T E');
  assert.equal(game.phase.name, 'turn', 'if nobody challenges, the game goes on as normal');

  game.challengeMove('p1', 2_000);
  const attempt = game.nameWord('p2', 'QUOTE', 3_000);
  assert.equal(attempt.ok, false);
  assert.equal(game.phase.name, 'challenge', 'a word that does not count lets them try again');

  game.advanceTime(2_000 + CHALLENGE_MS);
  assert.equal(handSize(game, 'p2'), 4 + 3);
  assert.equal(game.phase.starterId, 'p2', 'the loser starts the next round');
});

test('the AGLET challenge: the board was valid, so the challenger draws 3 and starts next', () => {
  const game = setUp({
    hands: { p1: 'ABCDE', p2: 'FGHIJ', p3: 'KLMNO' },
    board: '_ G E _ T',
    turn: 'p1',
  });
  game.move('p1', { type: 'swap', a: 2, b: 3 }, 1_000);
  assert.equal(picture(game.board), '_ G _ E T');
  game.challengeMove('p3', 2_000);
  assert.deepEqual(game.nameWord('p1', 'aglet', 3_000).blanks, ['A', 'L']);
  assert.equal(handSize(game, 'p3'), 5 + 3);
  assert.equal(handSize(game, 'p1'), 5);
  assert.equal(game.phase.starterId, 'p3');
});

test('the stalemate lap from the rulebook ends the round after a last chance to challenge', () => {
  const game = setUp({
    hands: { p1: 'ABC', p2: 'DEF', p3: 'GHI' },
    board: 'S _ A T _',
    turn: 'p1',
  });
  game.move('p1', { type: 'swap', a: 0, b: 4 }, 1_000);
  assert.equal(picture(game.board), '_ _ A T S');
  game.move('p2', { type: 'swap', a: 0, b: 3 }, 2_000);
  assert.equal(picture(game.board), 'T _ A _ S');
  game.move('p3', { type: 'swap', a: 1, b: 2 }, 3_000);
  assert.equal(picture(game.board), 'T A _ _ S');

  assert.equal(game.phase.name, 'roundEnding');
  assert.equal(game.phase.reason, 'stalemate');
  game.pass('p1', 4_000);
  assert.equal(game.phase.name, 'roundEnding', 'waits for everyone else to pass');
  game.pass('p2', 5_000);
  assert.equal(game.phase.name, 'betweenRounds');
  assert.equal(game.phase.starterId, 'p1', 'the next player in turn order starts');
});

test('with 2 players, two swaps in a row are a stalemate', () => {
  const game = setUp({ hands: { p1: 'AB', p2: 'CD' }, board: 'C _ T', turn: 'p1' });
  game.move('p1', { type: 'swap', a: 0, b: 1 }, 1_000);
  game.move('p2', { type: 'swap', a: 0, b: 1 }, 2_000);
  assert.equal(game.phase.reason, 'stalemate');
  game.advanceTime(2_000 + CHALLENGE_MS);
  assert.equal(game.phase.name, 'betweenRounds');
  assert.equal(game.phase.starterId, 'p1');
});

test('a move in the stalemate window can still be challenged', () => {
  const game = setUp({ hands: { p1: 'AB', p2: 'CD' }, board: 'Z Q _', turn: 'p1' });
  game.move('p1', { type: 'swap', a: 0, b: 2 }, 1_000);
  game.move('p2', { type: 'swap', a: 0, b: 1 }, 2_000);
  game.challengeMove('p1', 3_000);
  game.giveUp('p2', 4_000);
  assert.equal(handSize(game, 'p2'), 2 + 3);
  assert.equal(game.phase.starterId, 'p2');
});

// ---------- Moves ----------

test('illegal moves are refused and change nothing', () => {
  const game = setUp({ hands: { p1: 'A!_', p2: 'BC' }, board: 'A _ _ T T', turn: 'p1' });
  const before = picture(game.board);
  const attempts = [
    { type: 'swap', a: 1, b: 2 }, // two blanks
    { type: 'swap', a: 3, b: 4 }, // two of the same letter
    { type: 'swap', a: 0, b: 9 }, // not on the board
    { type: 'replace', tileId: tileId(game, 'p1', 'A'), index: 0 }, // same letter
    { type: 'replace', tileId: tileId(game, 'p1', 'A'), index: 1 }, // a blank
    { type: 'playLetter', tileId: tileId(game, 'p1', 'A'), index: 3 }, // on a letter
    { type: 'playLetter', tileId: tileId(game, 'p1', '_'), index: 1 }, // a blank is not a letter
    { type: 'playBlank', tileId: tileId(game, 'p1', '_'), index: 6 }, // past the end
    { type: 'remove', tileId: tileId(game, 'p1', '!'), index: 1 }, // removing a blank
    { type: 'remove', tileId: 999_999, index: 0 }, // not in hand
    { type: 'pass' }, // not a move
  ];
  for (const move of attempts) {
    assert.throws(() => game.move('p1', move, 1_000), fails('bad-move'), JSON.stringify(move));
  }
  assert.throws(() => game.move('p2', { type: 'swap', a: 0, b: 1 }, 1_000), fails('not-your-turn'));
  assert.equal(picture(game.board), before);
  assert.equal(handSize(game, 'p1'), 3);
  assert.equal(game.phase.playerId, 'p1');
  assert.equal(game.phase.deadline, TURN_MS, 'the clock keeps running');
});

test('a blank can be added at either end or between two tiles', () => {
  const game = setUp({ hands: { p1: '___X', p2: 'Y' }, board: 'A B', turn: 'p1' });
  game.move('p1', { type: 'playBlank', tileId: tileId(game, 'p1', '_'), index: 0 }, 1_000);
  assert.equal(picture(game.board), '_ A B');
  game.move('p2', { type: 'swap', a: 1, b: 2 }, 2_000);
  game.move('p1', { type: 'playBlank', tileId: tileId(game, 'p1', '_'), index: 2 }, 3_000);
  assert.equal(picture(game.board), '_ B _ A');
});

test('each move is recorded for the players to see', () => {
  const game = setUp({ hands: { p1: 'AB', p2: 'CD' }, board: 'C _ T', turn: 'p1' });
  game.move('p1', { type: 'playLetter', tileId: tileId(game, 'p1', 'B'), index: 1 }, 1_000);
  const last = game.events.at(-1);
  assert.equal(last.type, 'roundEnding');
  const moved = game.events.at(-2);
  assert.deepEqual(moved, { seq: moved.seq, type: 'moved', playerId: 'p1', move: { type: 'playLetter', index: 1, letter: 'B' } });
});

test('used tiles go to the discard pile', () => {
  const game = setUp({ hands: { p1: 'CA!', p2: 'DEF' }, board: 'B _ T', turn: 'p1' });
  game.move('p1', { type: 'replace', tileId: tileId(game, 'p1', 'C'), index: 0 }, 1_000);
  game.move('p2', { type: 'swap', a: 0, b: 1 }, 2_000);
  game.move('p1', { type: 'remove', tileId: tileId(game, 'p1', '!'), index: 1 }, 3_000);
  assert.deepEqual(game.discard.map((tile) => tile.type), ['B', 'C', 'removal']);
  assert.equal(picture(game.board), '_ T');
});

// ---------- Challenges ----------

test("you can't challenge your own move, and only the latest move can be challenged", () => {
  const game = setUp({ hands: { p1: 'AB', p2: 'CD', p3: 'EF' }, board: 'C _ T', turn: 'p1' });
  assert.throws(() => game.challengeMove('p2', 500), fails('nothing-to-challenge'));
  game.move('p1', { type: 'swap', a: 0, b: 1 }, 1_000);
  assert.throws(() => game.challengeMove('p1', 1_500), fails('own-move'));
  game.move('p2', { type: 'swap', a: 1, b: 2 }, 2_000);
  game.challengeMove('p1', 2_500);
  assert.equal(game.phase.challengedId, 'p2', "player 1's move can no longer be challenged");
});

test('only the challenged player can name a word, and giving up loses the challenge', () => {
  const game = setUp({ hands: { p1: 'AB', p2: 'CD', p3: 'EF' }, board: 'C _ T', turn: 'p1' });
  game.move('p1', { type: 'swap', a: 0, b: 1 }, 1_000);
  game.challengeMove('p3', 2_000);
  assert.throws(() => game.nameWord('p3', 'ACT', 2_500), fails('not-challenged'));
  assert.throws(() => game.challengeMove('p2', 2_500), fails('nothing-to-challenge'), 'the first challenge counts');
  game.giveUp('p1', 3_000);
  assert.equal(handSize(game, 'p1'), 2 + 3);
  assert.equal(game.phase.starterId, 'p1');
});

test('covering the last blank gives everyone else 30 seconds to challenge', () => {
  const game = setUp({ hands: { p1: 'AB', p2: 'CD', p3: 'EF' }, board: 'C _ T', turn: 'p1' });
  game.move('p1', { type: 'playLetter', tileId: tileId(game, 'p1', 'A'), index: 1 }, 1_000);
  assert.equal(game.phase.name, 'roundEnding');
  assert.equal(game.phase.reason, 'completion');
  assert.throws(() => game.pass('p1', 1_500), fails('nothing-to-pass'));
  game.pass('p2', 2_000);
  game.pass('p3', 3_000);
  assert.equal(game.phase.name, 'betweenRounds');
  assert.equal(game.phase.starterId, 'p2', 'the next player in turn order starts');
});

test('a completed board can still be challenged in its 30 seconds', () => {
  const game = setUp({ hands: { p1: 'AB', p2: 'CD', p3: 'EF' }, board: 'C _ T', turn: 'p1' });
  game.move('p1', { type: 'playLetter', tileId: tileId(game, 'p1', 'A'), index: 1 }, 1_000);
  game.challengeMove('p2', 2_000);
  game.nameWord('p1', 'CAT', 3_000);
  assert.equal(handSize(game, 'p2'), 2 + 3);
  assert.equal(game.phase.starterId, 'p2');
});

// ---------- Winning ----------

test('playing your last tile triggers an automatic challenge, and naming a word wins', () => {
  const game = setUp({ hands: { p1: 'A', p2: 'CD' }, board: 'C _ T', turn: 'p1' });
  game.move('p1', { type: 'playLetter', tileId: tileId(game, 'p1', 'A'), index: 1 }, 1_000);
  assert.equal(game.phase.name, 'challenge');
  assert.equal(game.phase.kind, 'lastTile');
  assert.throws(() => game.challengeMove('p2', 1_500), fails('nothing-to-challenge'));
  game.nameWord('p1', 'cat', 2_000);
  assert.deepEqual(game.phase, { name: 'over', winnerId: 'p1', reason: 'lastTile' });
});

test('failing the automatic challenge draws 3, ends the round, and you start the next', () => {
  const game = setUp({ hands: { p1: 'Q', p2: 'CD' }, board: 'C _ T', turn: 'p1' });
  game.move('p1', { type: 'playLetter', tileId: tileId(game, 'p1', 'Q'), index: 1 }, 1_000);
  game.advanceTime(1_000 + CHALLENGE_MS);
  assert.equal(handSize(game, 'p1'), 3);
  assert.equal(game.phase.name, 'betweenRounds');
  assert.equal(game.phase.starterId, 'p1');
});

// ---------- Turn clock and ejection ----------

test('running out of time draws 3 tiles and passes the turn', () => {
  const game = setUp({ hands: { p1: 'AB', p2: 'CD', p3: 'EF' }, board: 'C _ T', turn: 'p1' });
  timeOut(game);
  assert.equal(handSize(game, 'p1'), 5);
  assert.equal(game.player('p1').missedTurns, 1);
  assert.equal(game.phase.playerId, 'p2');
  assert.equal(game.phase.deadline, 2 * TURN_MS);
});

test('a missed turn breaks a stalemate lap', () => {
  const game = setUp({ hands: { p1: 'AB', p2: 'CD' }, board: 'C _ T', turn: 'p1' });
  game.move('p1', { type: 'swap', a: 0, b: 1 }, 1_000);
  timeOut(game);
  game.move('p1', { type: 'swap', a: 0, b: 1 }, 70_000);
  assert.equal(game.phase.name, 'turn', 'only one swap in a row, so no stalemate');
});

test('three missed turns in a row eject a player, whose tiles are shuffled into the bag', () => {
  const game = setUp({ hands: { p1: 'AB', p2: 'CDE', p3: 'FG' }, board: 'C _ T', turn: 'p1' });
  for (let lap = 1; lap <= 3; lap++) {
    game.move('p1', { type: 'swap', a: 0, b: 1 }, game.deadline() - 1);
    timeOut(game); // player 2 misses a turn
    if (lap < 3) game.move('p3', { type: 'swap', a: 1, b: 2 }, game.deadline() - 1);
  }
  const p2 = game.player('p2');
  assert.equal(p2.ejected, true);
  assert.equal(p2.hand.length, 0);
  assert.equal(game.bag.length, 12 - 9 + 3 + 9, 'their 3 tiles and the 9 they drew went back into the bag');
  assert.equal(game.phase.playerId, 'p3', 'with 2 players left, play continues');
  assert.throws(() => game.move('p2', { type: 'swap', a: 0, b: 1 }, 0), fails('ejected'));
  game.move('p3', { type: 'swap', a: 1, b: 2 }, game.deadline() - 1);
  assert.equal(game.phase.playerId, 'p1', 'turns skip the ejected player');
});

test('making a move resets the missed-turn count', () => {
  const game = setUp({ hands: { p1: 'AB', p2: 'CD' }, board: 'C _ T', turn: 'p1' });
  timeOut(game);
  game.move('p2', { type: 'swap', a: 0, b: 1 }, game.deadline() - 1);
  timeOut(game);
  assert.equal(game.player('p1').missedTurns, 2);
  game.move('p2', { type: 'swap', a: 0, b: 1 }, game.deadline() - 1);
  game.move('p1', { type: 'swap', a: 0, b: 1 }, game.deadline() - 1);
  assert.equal(game.player('p1').missedTurns, 0);
});

test('challenging on your turn resets the count; a turn cut short by someone else does not change it', () => {
  const game = setUp({ hands: { p1: 'AB', p2: 'CD', p3: 'EF' }, board: 'C _ T', turn: 'p1' });
  game.player('p2').missedTurns = 2;
  game.player('p3').missedTurns = 2;
  game.move('p1', { type: 'swap', a: 0, b: 1 }, 1_000);
  game.challengeMove('p3', 2_000); // during player 2's turn
  assert.equal(game.player('p2').missedTurns, 2);

  const game2 = setUp({ hands: { p1: 'AB', p2: 'CD', p3: 'EF' }, board: 'C _ T', turn: 'p1' });
  game2.player('p2').missedTurns = 2;
  game2.move('p1', { type: 'swap', a: 0, b: 1 }, 1_000);
  game2.challengeMove('p2', 2_000); // on their own turn
  assert.equal(game2.player('p2').missedTurns, 0);
});

test('if an ejection leaves one player, that player wins', () => {
  const game = setUp({ hands: { p1: 'AB', p2: 'CD' }, board: 'C _ T', turn: 'p2' });
  for (let missed = 1; missed <= 3; missed++) {
    timeOut(game);
    if (missed < 3) game.move('p1', { type: 'swap', a: 0, b: 1 }, game.deadline() - 1);
  }
  assert.deepEqual(game.phase, { name: 'over', winnerId: 'p1', reason: 'lastPlayer' });
});

test('a player who has no possible move draws until they have one', () => {
  // All blanks: no swap, nothing to replace or remove, and no letters or blanks in hand.
  const game = setUp({ hands: { p1: 'AB', p2: '!!' }, board: '_ _ _', turn: 'p2', bag: 'A!' });
  assert.equal(game.phase.playerId, 'p2');
  assert.deepEqual(game.player('p2').hand.map((tile) => symbolOf(tile.type)), ['!', '!', '!', 'A']);
});

test('with no possible move and nothing to draw, the turn is skipped without counting as missed', () => {
  const game = setUp({ hands: { p1: 'AB', p2: '!', p3: 'C' }, board: '_ _ _', turn: 'p2', bag: '' });
  assert.equal(game.phase.playerId, 'p3');
  assert.equal(game.player('p2').missedTurns, 0);
});

test('an empty bag is refilled from the discard pile, and with both empty the draw is skipped', () => {
  const game = setUp({ hands: { p1: 'CA', p2: 'DE' }, board: 'B _ T', turn: 'p1', bag: '' });
  game.move('p1', { type: 'replace', tileId: tileId(game, 'p1', 'C'), index: 0 }, 1_000);
  assert.equal(handSize(game, 'p1'), 2, 'drew the discarded B back');
  assert.equal(game.player('p1').hand.some((tile) => tile.type === 'B'), true);
  timeOut(game);
  assert.equal(handSize(game, 'p2'), 2, 'nothing left to draw');
});

// ---------- Starting board ----------

test('the first player may challenge the starting board; if someone names a word, they draw 2', () => {
  const game = setUp({ hands: { p1: 'AB', p2: 'CD', p3: 'EF' }, board: '_ _ A _ _ T', turn: 'p1' });
  assert.throws(() => game.challengeStartingBoard('p2', 1_000), fails('cannot-challenge-board'));
  game.challengeStartingBoard('p1', 1_000);
  assert.throws(() => game.nameWord('p1', 'PLANET', 2_000), fails('own-challenge'));
  assert.equal(game.nameWord('p3', 'bright', 2_000).ok, false, 'BRIGHT does not fit');
  game.nameWord('p2', 'planet', 3_000);
  assert.equal(handSize(game, 'p1'), 4);
  assert.equal(game.phase.name, 'turn');
  assert.equal(game.phase.playerId, 'p1');
  assert.equal(game.phase.opening, false);
  assert.equal(game.phase.deadline, 3_000 + TURN_MS, 'their minute starts once the challenge is settled');
});

test('if nobody can name a word, the starting board is rebuilt and can be challenged again', () => {
  const game = setUp({
    hands: { p1: 'AB', p2: 'CD', p3: 'EF' },
    board: 'Z Q _',
    turn: 'p1',
    bag: '____RSTL',
  });
  game.challengeStartingBoard('p1', 1_000);
  game.pass('p2', 2_000);
  game.pass('p3', 3_000);
  assert.equal(game.board.filter(isBlank).length, 4, 'the old blank and 3 from the bag');
  assert.equal(game.board.length + game.discard.length, 6);
  assert.equal(game.phase.playerId, 'p1');
  assert.equal(game.phase.opening, true);
  assert.equal(game.phase.deadline, 3_000 + TURN_MS);
});

test('the starting board can only be challenged before the first move', () => {
  const game = setUp({ hands: { p1: 'AB', p2: 'CD' }, board: 'C _ T', turn: 'p1' });
  game.move('p1', { type: 'swap', a: 0, b: 1 }, 1_000);
  game.move('p2', { type: 'swap', a: 0, b: 1 }, 2_000);
  assert.throws(() => game.challengeStartingBoard('p1', 3_000), (err) => err instanceof GameError);
});

// ---------- Between rounds ----------

test('between rounds, each player may trade one tile, then a new starting board is laid', () => {
  const game = setUp({
    hands: { p1: 'ABC', p2: 'DEF', p3: 'GHI' },
    board: 'C _ T',
    turn: 'p1',
    bag: '_____RSTLNE',
  });
  game.move('p1', { type: 'playLetter', tileId: tileId(game, 'p1', 'A'), index: 1 }, 1_000);
  game.pass('p2', 2_000);
  game.pass('p3', 3_000);
  assert.equal(game.phase.name, 'betweenRounds');

  const traded = tileId(game, 'p1', 'B');
  game.tradeTile('p1', traded, 4_000);
  assert.equal(handSize(game, 'p1'), 2);
  assert.ok(!game.player('p1').hand.some((tile) => tile.id === traded));
  assert.throws(() => game.tradeTile('p1', tileId(game, 'p1', 'C'), 4_500), fails('already-traded'));
  game.keepTiles('p2', 5_000);
  game.keepTiles('p3', 6_000);

  assert.equal(game.round, 2);
  assert.equal(game.phase.name, 'turn');
  assert.equal(game.phase.playerId, 'p2');
  assert.equal(game.phase.opening, true);
  assert.equal(game.board.filter(isBlank).length >= 4, true);
  assert.equal(game.board.length + game.discard.length, 6);
});

test('with fewer than 4 blanks left, the starting board uses as many as there are', () => {
  const game = setUp({ hands: { p1: 'AB', p2: 'CD' }, board: 'C _ T', turn: 'p1', bag: 'RSTLNE' });
  game.move('p1', { type: 'playLetter', tileId: tileId(game, 'p1', 'A'), index: 1 }, 1_000);
  game.advanceTime(1_000 + CHALLENGE_MS + 20_000);
  assert.equal(game.round, 2);
  assert.equal(game.board.filter(isBlank).length, 1, 'only the discarded blank was available');
  assert.equal(game.board.length, 3);
});

// ---------- What each player can see ----------

test('unseen tiles are everything not in your hand, on the board or in the discard pile', () => {
  const game = new Game(['p1', 'p2', 'p3'], { words, rng: seeded(3), now: 0 });
  for (const player of game.players) {
    const unseen = game.unseenTiles(player.id);
    const total = Object.values(unseen.counts).reduce((sum, count) => sum + count, 0);
    assert.equal(total, unseen.inBag + unseen.inOtherHands);
    assert.equal(unseen.inOtherHands, 14);
    const seenBlanks = [...player.hand, ...game.board, ...game.discard].filter(isBlank).length;
    assert.equal(unseen.counts.blank, 26 - seenBlanks);
  }
});

// ---------- Every tile is always somewhere ----------

function playRandomly(game, rng, steps) {
  let now = 0;
  const pick = (items) => items[Math.floor(rng() * items.length)];
  const tryAction = (action) => {
    try {
      action();
      return true;
    } catch (err) {
      if (!(err instanceof GameError)) throw err;
      return false;
    }
  };

  for (let i = 0; i < steps && game.phase.name !== 'over'; i++) {
    // Usually act quickly, but sometimes let a whole turn clock run out.
    now += rng() < 0.2 ? TURN_MS + 1 : 1 + Math.floor(rng() * 20_000);
    const active = game.activePlayers();
    const phase = game.phase;
    const roll = rng();

    if (phase.name === 'turn') {
      const player = game.player(phase.playerId);
      if (roll < 0.1) tryAction(() => game.challengeMove(pick(active).id, now));
      else if (roll < 0.15) tryAction(() => game.challengeStartingBoard(player.id, now));
      else if (roll < 0.85) {
        for (let attempt = 0; attempt < 20; attempt++) {
          const move = {
            type: pick(['swap', 'replace', 'playLetter', 'playBlank', 'remove']),
            a: Math.floor(rng() * game.board.length),
            b: Math.floor(rng() * game.board.length),
            tileId: player.hand.length ? pick(player.hand).id : 0,
            index: Math.floor(rng() * (game.board.length + 1)),
          };
          if (tryAction(() => game.move(player.id, move, now))) break;
        }
      }
    } else if (phase.name === 'challenge' && roll < 0.5) {
      const word = words.findWord(game.pattern());
      if (word) game.nameWord(phase.challengedId, word, now);
    } else if (phase.name === 'startingChallenge' && roll < 0.5) {
      const word = words.findWord(game.pattern());
      const namer = active.find((player) => player.id !== phase.challengerId);
      if (word) game.nameWord(namer.id, word, now);
    } else if (phase.name === 'roundEnding' && roll < 0.5) {
      tryAction(() => game.pass(pick(active).id, now));
    } else if (phase.name === 'betweenRounds') {
      const player = pick(active);
      if (roll < 0.5 && player.hand.length) tryAction(() => game.tradeTile(player.id, pick(player.hand).id, now));
      else tryAction(() => game.keepTiles(player.id, now));
    }

    game.advanceTime(now);
    assertAllTilesAccountedFor(game);
    for (const player of game.players) {
      const unseen = game.unseenTiles(player.id);
      const total = Object.values(unseen.counts).reduce((sum, count) => sum + count, 0);
      assert.equal(total, unseen.inBag + unseen.inOtherHands);
    }
  }
}

test('random play never loses or duplicates a tile', () => {
  for (const playerCount of [2, 3, 6]) {
    for (const seed of [11, 22, 33]) {
      const rng = seeded(seed * playerCount);
      const ids = Array.from({ length: playerCount }, (_, i) => `p${i + 1}`);
      const game = new Game(ids, { words, rng, now: 0 });
      playRandomly(game, rng, 1_500);
    }
  }
});
