'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Game, GameError, TURN_MS, CHALLENGE_MS } = require('../src/game/game');
const { isBlank } = require('../src/game/tiles');
const { WordList } = require('../src/game/words');
const { gameView } = require('../src/game/view');

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

// Every tile (130 with the standard rules) is in exactly one place.
function assertAllTilesAccountedFor(game) {
  const counts = {};
  const ids = new Set();
  const everywhere = [
    ...game.bag,
    ...game.board,
    ...game.discard,
    ...game.setAside.map((entry) => entry.tile),
    ...game.players.flatMap((player) => player.hand),
  ];
  for (const tile of everywhere) {
    counts[tile.type] = (counts[tile.type] ?? 0) + 1;
    ids.add(tile.id);
  }
  assert.deepEqual(counts, game.tileCounts);
  assert.equal(ids.size, Object.values(game.tileCounts).reduce((sum, count) => sum + count, 0));
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

test('three missed turns in a row eject a player, whose tiles go face up onto the discard pile', () => {
  const game = setUp({ hands: { p1: 'AB', p2: 'CDE', p3: 'FG' }, board: 'C _ T', turn: 'p1' });
  for (let lap = 1; lap <= 3; lap++) {
    game.move('p1', { type: 'swap', a: 0, b: 1 }, game.deadline() - 1);
    timeOut(game); // player 2 misses a turn
    if (lap < 3) game.move('p3', { type: 'swap', a: 1, b: 2 }, game.deadline() - 1);
  }
  const p2 = game.player('p2');
  assert.equal(p2.ejected, true);
  assert.equal(p2.left, false);
  assert.equal(p2.hand.length, 0);
  assert.equal(game.bag.length, 12 - 9, 'nothing went back into the bag');
  assert.equal(game.discard.length, 3 + 9, 'their 3 tiles and the 9 they drew are face up');
  const ejected = game.events.find((event) => event.type === 'ejected');
  assert.deepEqual([...ejected.tiles].sort(), ['C', 'D', 'E', ...'EEEEEEEEE'].sort());
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

test('a player with no possible move is skipped straight away, without drawing or counting as missed', () => {
  // All blanks: no swap, nothing to replace or remove, and no letters or blanks in hand.
  const game = setUp({ hands: { p1: 'AB', p2: '!!', p3: 'C' }, board: '_ _ _', turn: 'p2', bag: 'A!' });
  assert.equal(game.phase.playerId, 'p3');
  assert.deepEqual(game.player('p2').hand.map((tile) => symbolOf(tile.type)), ['!', '!'], 'nothing drawn');
  assert.equal(game.player('p2').missedTurns, 0);
  assert.equal(game.events.at(-1).type, 'skipped');
  assert.equal(game.bag.length, 2);
});

test('the other ways to have no move: an empty board with no blank, or one repeated letter and only that letter', () => {
  const empty = setUp({ hands: { p1: 'AB', p2: 'C!', p3: 'D_' }, board: '', turn: 'p2', bag: 'A' });
  assert.equal(empty.phase.playerId, 'p3', 'p3 can add a blank');
  const same = setUp({ hands: { p1: 'AB', p2: 'EE', p3: 'D' }, board: 'E E', turn: 'p2', bag: 'A' });
  assert.equal(same.phase.playerId, 'p3');
  const canReplace = setUp({ hands: { p1: 'AB', p2: 'EF', p3: 'D' }, board: 'E E', turn: 'p2', bag: 'A' });
  assert.equal(canReplace.phase.playerId, 'p2', 'an F can replace an E');
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
  assert.equal(game.board.length, 6);
  assert.deepEqual(game.discard.map((tile) => tile.type), ['Z', 'Q'], 'the old board is on the discard pile');
  assert.deepEqual(game.bag.map((tile) => symbolOf(tile.type)), ['_', 'R', 'S'], 'the bag kept its order');
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
  assert.ok(!game.discard.some((tile) => tile.id === traded), 'the traded tile stays face down for now');
  assert.equal(game.unseenTiles('p2').counts.B, 2, 'other players still count it as unseen');
  assert.equal(game.unseenTiles('p1').counts.B, 1, 'the player who traded it knows where it is');
  assert.throws(() => game.tradeTile('p1', tileId(game, 'p1', 'C'), 4_500), fails('already-traded'));
  game.keepTiles('p2', 5_000);
  game.keepTiles('p3', 6_000);

  assert.equal(game.round, 2);
  assert.equal(game.phase.name, 'turn');
  assert.equal(game.phase.playerId, 'p2');
  assert.equal(game.phase.opening, true);
  const revealed = game.events.find((event) => event.type === 'tradesRevealed');
  assert.deepEqual(revealed.trades, [{ playerId: 'p1', type: 'B' }]);
  assert.equal(game.board.filter(isBlank).length, 4, 'the blank from the discard pile and 3 from the bag');
  assert.equal(game.board.length, 6, 'with 2 tiles from the top of the bag');
  assert.deepEqual(game.discard.map((tile) => tile.type), ['B', 'C', 'A', 'T'], 'the traded B and the old board');
  assert.deepEqual(game.bag.map((tile) => symbolOf(tile.type)), ['_', '_', 'R', 'S', 'T'], 'the bag kept its order');
  assertAllTilesAccountedForIn(game);
});

// Like assertAllTilesAccountedFor, for games set up with picture tiles.
function assertAllTilesAccountedForIn(game) {
  const everywhere = [
    ...game.bag,
    ...game.board,
    ...game.discard,
    ...game.setAside.map((entry) => entry.tile),
    ...game.players.flatMap((player) => player.hand),
  ];
  assert.equal(new Set(everywhere.map((tile) => tile.id)).size, everywhere.length, 'no tile is in two places');
}

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

// ---------- The bag and the discard pile ----------

test('at the end of a round the board goes onto the discard pile, and the bag is not shuffled', () => {
  const game = setUp({ hands: { p1: 'AB', p2: 'CD' }, board: 'C _ T', turn: 'p1', bag: 'GHIJKLMNOP' });
  game.move('p1', { type: 'swap', a: 0, b: 1 }, 1_000); // _ C T
  game.challengeMove('p2', 2_000);
  game.giveUp('p1', 3_000);
  const bagBefore = game.bag.map((tile) => tile.id);
  game.keepTiles('p1', 4_000);
  game.keepTiles('p2', 4_000);

  assert.equal(game.round, 2);
  assert.deepEqual(game.bag.map((tile) => tile.id), bagBefore.slice(0, -2), 'the 2 new tiles came off the top; the rest kept their order');
  assert.deepEqual(game.discard.map((tile) => tile.type), ['C', 'T'], 'the old board is face up, minus its blank, which was reused');
  assert.equal(game.board.length, 3, 'only 1 blank was available: the one from the old board');
});

test('the discard pile carries over from round to round until the bag runs out', () => {
  const game = setUp({ hands: { p1: 'AB', p2: 'CD' }, board: 'C _ T', turn: 'p1', bag: 'GHIJKLMNOPQRSTUVW' });
  for (let round = 1; round <= 2; round++) {
    game.move(game.phase.playerId, { type: 'swap', a: 0, b: 1 }, 1_000);
    const mover = game.lastMove.playerId;
    game.challengeMove(game.nextActiveAfter(mover), 2_000);
    game.giveUp(mover, 3_000);
    game.keepTiles('p1', 4_000);
    game.keepTiles('p2', 4_000);
  }
  assert.equal(game.round, 3);
  assert.equal(game.discard.length, 4, 'both old boards are still face up');
  assert.equal(game.events.some((event) => event.type === 'bagRefilled'), false);
});

test('when the bag runs out, the discard pile is shuffled to become the new bag', () => {
  const game = setUp({ hands: { p1: 'AB', p2: 'CD' }, board: 'C _ T', turn: 'p1', bag: 'E' });
  game.discard = tiles('XYZ');
  timeOut(game); // player 1 draws the E, then the bag is refilled for the other 2
  assert.equal(handSize(game, 'p1'), 5);
  assert.equal(game.discard.length, 0);
  assert.equal(game.bag.length, 1);
  assert.equal(game.events.filter((event) => event.type === 'bagRefilled').length, 1);
});

test('traded tiles stay face down until the next round starts, then everyone sees them together', () => {
  const game = setUp({ hands: { p1: 'AB', p2: 'CD', p3: 'EF' }, board: 'C _ T', turn: 'p1', bag: 'GHIJKLMNOP' });
  game.move('p1', { type: 'playLetter', tileId: tileId(game, 'p1', 'A'), index: 1 }, 1_000);
  game.pass('p2', 2_000);
  game.pass('p3', 3_000);
  game.tradeTile('p3', tileId(game, 'p3', 'F'), 4_000);
  game.tradeTile('p1', tileId(game, 'p1', 'B'), 5_000);
  assert.deepEqual(game.discard.map((tile) => tile.type), ['blank'], 'nothing traded is visible yet');
  assert.equal(game.events.some((event) => event.type === 'tradesRevealed'), false);
  game.keepTiles('p2', 6_000);

  const revealed = game.events.find((event) => event.type === 'tradesRevealed');
  assert.deepEqual(revealed.trades, [{ playerId: 'p3', type: 'F' }, { playerId: 'p1', type: 'B' }]);
  assert.ok(game.discard.some((tile) => tile.type === 'F') && game.discard.some((tile) => tile.type === 'B'));
  assert.equal(game.setAside.length, 0);
});

// ---------- A move lined up when time runs out ----------

test('a lined-up move is played when the turn clock runs out, without the penalty', () => {
  const game = setUp({ hands: { p1: 'AB', p2: 'CD' }, board: 'C _ T', turn: 'p1' });
  game.player('p1').missedTurns = 2;
  game.lineUp('p1', { type: 'playLetter', tileId: tileId(game, 'p1', 'A'), index: 1 });
  timeOut(game);
  assert.equal(picture(game.board), 'C A T');
  assert.equal(handSize(game, 'p1'), 1, 'no penalty tiles');
  assert.equal(game.player('p1').missedTurns, 0, 'not a missed turn');
  assert.equal(game.events.findLast((event) => event.type === 'moved').auto, true);
  assert.equal(game.phase.name, 'roundEnding', 'it covered the last blank, like any other move');
});

test('only the player whose turn it is can line up a move, and it lasts only for that turn', () => {
  const game = setUp({ hands: { p1: 'AB', p2: 'CD' }, board: 'C _ T', turn: 'p1' });
  assert.throws(() => game.lineUp('p2', { type: 'swap', a: 0, b: 1 }), fails('not-your-turn'));
  game.lineUp('p1', { type: 'swap', a: 0, b: 1 });
  game.lineUp('p1', null);
  timeOut(game);
  assert.equal(handSize(game, 'p1'), 2 + 3, 'a cleared move is not played');
  assert.equal(picture(game.board), 'C _ T');

  game.lineUp('p2', { type: 'swap', a: 0, b: 1 });
  game.move('p2', { type: 'swap', a: 1, b: 2 }, game.deadline() - 1);
  assert.equal(game.linedUp, null, 'playing a move clears it');
});

test('a lined-up move the rules do not allow falls back to the penalty', () => {
  const game = setUp({ hands: { p1: 'AB', p2: 'CD' }, board: 'C _ _', turn: 'p1' });
  game.lineUp('p1', { type: 'swap', a: 1, b: 2 }); // two blanks
  timeOut(game);
  assert.equal(handSize(game, 'p1'), 5);
  assert.equal(game.player('p1').missedTurns, 1);
  assert.equal(picture(game.board), 'C _ _');
});

// ---------- Leaving mid-game ----------

test('leaving on your turn passes it on, and your tiles go face up onto the discard pile', () => {
  const game = setUp({ hands: { p1: 'AB', p2: 'CD', p3: 'EF' }, board: 'C _ T', turn: 'p1' });
  game.leave('p1', 5_000);
  const p1 = game.player('p1');
  assert.equal(p1.ejected, true);
  assert.equal(p1.left, true);
  assert.deepEqual(game.discard.map((tile) => tile.type), ['A', 'B']);
  assert.deepEqual(game.events.find((event) => event.type === 'left').tiles, ['A', 'B']);
  assert.equal(game.phase.playerId, 'p2');
  assert.equal(game.phase.deadline, 5_000 + TURN_MS, 'with a fresh minute');
  assert.throws(() => game.leave('p1', 6_000), fails('ejected'));
});

test('leaving while challenged counts as giving up first', () => {
  const game = setUp({ hands: { p1: 'AB', p2: 'CD', p3: 'EF' }, board: 'C _ T', turn: 'p1' });
  game.move('p1', { type: 'swap', a: 0, b: 1 }, 1_000);
  game.challengeMove('p2', 2_000);
  game.leave('p1', 3_000);
  assert.equal(game.events.find((event) => event.type === 'challengeSettled').valid, false);
  assert.equal(game.discard.length, 2 + 3, 'their 2 tiles and the 3 they drew are face up');
  assert.equal(game.phase.name, 'betweenRounds');
  assert.equal(game.phase.starterId, 'p2', 'the next player starts instead of the one who left');
});

test('if the challenger leaves and a word is named, nobody draws and the next player starts', () => {
  const game = setUp({ hands: { p1: 'AB', p2: 'CD', p3: 'EF' }, board: 'C _ T', turn: 'p1' });
  game.move('p1', { type: 'swap', a: 0, b: 1 }, 1_000); // _ C T
  game.challengeMove('p3', 2_000);
  game.leave('p3', 2_500);
  game.nameWord('p1', 'ACT', 3_000);
  assert.equal(handSize(game, 'p1'), 2);
  assert.equal(game.phase.starterId, 'p1');
});

test('if leaving leaves one player, that player wins', () => {
  const game = setUp({ hands: { p1: 'AB', p2: 'CD' }, board: 'C _ T', turn: 'p2' });
  game.leave('p1', 1_000);
  assert.deepEqual(game.phase, { name: 'over', winnerId: 'p2', reason: 'lastPlayer' });
});

test('leaving between rounds discards your tiles, including one you traded', () => {
  const game = setUp({ hands: { p1: 'AB', p2: 'CD', p3: 'EF' }, board: 'C _ T', turn: 'p1', bag: 'GHIJ' });
  game.move('p1', { type: 'playLetter', tileId: tileId(game, 'p1', 'A'), index: 1 }, 1_000);
  game.pass('p2', 2_000);
  game.pass('p3', 3_000);
  assert.equal(game.phase.starterId, 'p2');
  game.tradeTile('p2', tileId(game, 'p2', 'C'), 4_000);
  game.leave('p2', 5_000);
  assert.deepEqual([...game.events.find((event) => event.type === 'left').tiles].sort(), ['C', 'D', 'J']);
  assert.equal(game.phase.starterId, 'p3', 'the next player starts instead');
  game.keepTiles('p1', 6_000);
  game.keepTiles('p3', 6_000);
  assert.equal(game.phase.playerId, 'p3');
  assert.equal(game.events.some((event) => event.type === 'tradesRevealed'), false, 'their trade was already shown');
});

test('the round ends early when the last player who could still challenge leaves', () => {
  const game = setUp({ hands: { p1: 'AB', p2: 'CD', p3: 'EF' }, board: 'C _ T', turn: 'p1' });
  game.move('p1', { type: 'playLetter', tileId: tileId(game, 'p1', 'A'), index: 1 }, 1_000);
  game.pass('p2', 2_000);
  game.leave('p3', 3_000);
  assert.equal(game.phase.name, 'betweenRounds');
  assert.equal(game.phase.starterId, 'p2');
});

// ---------- Words that could have been named ----------

test('after a challenge, the view lists every word that fitted the board', () => {
  const game = setUp({ hands: { p1: 'AB', p2: 'CD' }, board: 'C _ T', turn: 'p1' });
  game.move('p1', { type: 'replace', tileId: tileId(game, 'p1', 'B'), index: 0 }, 1_000); // B _ T
  game.challengeMove('p2', 2_000);
  game.nameWord('p1', 'bat', 3_000);
  const settled = gameView(game, 'p2', 3_000).events.find((event) => event.type === 'challengeSettled');
  assert.equal(settled.pattern, 'B_T');
  assert.deepEqual(settled.possible, { words: ['BAT', 'BET', 'BIT', 'BOT', 'BUT'], total: 5 });
});

test('a rebuilt starting board lists its words too, even when there are none', () => {
  const game = setUp({ hands: { p1: 'AB', p2: 'CD' }, board: 'Z Q _', turn: 'p1', bag: '____RSTL' });
  game.challengeStartingBoard('p1', 1_000);
  game.pass('p2', 2_000);
  const rebuilt = gameView(game, 'p1', 2_000).events.find((event) => event.type === 'startingBoardRebuilt');
  assert.deepEqual(rebuilt.possible, { words: [], total: 0 });
});

test('a very long list is cut short, but still counts every word', () => {
  const game = setUp({ hands: { p1: 'AB', p2: 'CD' }, board: '_ _ _ _ _ _', turn: 'p1' });
  game.player('p1').hand = tiles('A');
  game.move('p1', { type: 'playLetter', tileId: tileId(game, 'p1', 'A'), index: 0 }, 1_000); // last tile: A _ _ _ _ _
  game.advanceTime(1_000 + CHALLENGE_MS);
  const settled = gameView(game, 'p2', 40_000).events.find((event) => event.type === 'challengeSettled');
  assert.equal(settled.possible.words.length, 500);
  assert.ok(settled.possible.total > 500);
  assert.deepEqual(settled.possible.words.slice(0, 2), [...settled.possible.words].sort().slice(0, 2));
});

test("a player's view never shows traded tiles before they're revealed, or anyone's lined-up move", () => {
  const game = setUp({ hands: { p1: 'AB', p2: 'CD' }, board: 'C _ T', turn: 'p1' });
  const linedUp = { type: 'playLetter', tileId: tileId(game, 'p1', 'A'), index: 1 };
  game.lineUp('p1', linedUp);
  assert.ok(!JSON.stringify(gameView(game, 'p2', 0)).includes('"linedUp"'));
  timeOut(game);
  game.pass('p2', 70_000);
  const traded = tileId(game, 'p2', 'C');
  game.tradeTile('p2', traded, 71_000);
  const view = JSON.stringify(gameView(game, 'p1', 71_000));
  assert.ok(!view.includes(`"id":${traded}`), 'the traded tile is nowhere in the other player\'s view');
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
    now += rng() < 0.2 ? game.turnMs + 1 : 1 + Math.floor(rng() * 20_000);
    const active = game.activePlayers();
    const phase = game.phase;
    const roll = rng();

    // Now and then, someone leaves partway through.
    if (rng() < 0.003) tryAction(() => game.leave(pick(active).id, now));
    if (game.phase.name === 'over') break;

    if (phase.name === 'turn') {
      const player = game.player(phase.playerId);
      const randomMove = () => ({
        type: pick(['swap', 'replace', 'playLetter', 'playBlank', 'remove']),
        a: Math.floor(rng() * game.board.length),
        b: Math.floor(rng() * game.board.length),
        tileId: player.hand.length ? pick(player.hand).id : 0,
        index: Math.floor(rng() * (game.board.length + 1)),
      });
      if (roll < 0.1) tryAction(() => game.challengeMove(pick(active).id, now));
      else if (roll < 0.15) tryAction(() => game.challengeStartingBoard(player.id, now));
      else if (roll < 0.75) {
        for (let attempt = 0; attempt < 20; attempt++) {
          if (tryAction(() => game.move(player.id, randomMove(), now))) break;
        }
      } else if (roll < 0.9) {
        // Line up a move (allowed or not) and let the clock decide.
        tryAction(() => game.lineUp(player.id, randomMove()));
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

test('random play never loses or duplicates a tile with custom match settings', () => {
  const custom = [
    { handSize: 3, turnSeconds: 10, challengeSeconds: 10, blanks: 5, removals: 50, reshuffleEachRound: true, startingBlanks: 2, startingDraws: 5 },
    { handSize: 20, blanks: 50, removals: 5, letters: { E: 50, Q: 50 }, startingBlanks: 10, startingDraws: 1, forceValidStart: true },
    { handSize: 1, reshuffleEachRound: true, forceValidStart: true, startingBlanks: 2, startingDraws: 5 },
  ];
  for (const [i, settings] of custom.entries()) {
    const rng = seeded(100 + i);
    const game = new Game(['p1', 'p2', 'p3'], { words, rng, now: 0, settings });
    playRandomly(game, rng, 800);
  }
});
