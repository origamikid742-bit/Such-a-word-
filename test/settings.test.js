'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Game, GameError } = require('../src/game/game');
const { isBlank, isRemoval } = require('../src/game/tiles');
const { WordList } = require('../src/game/words');
const { startingBoardChance } = require('../src/game/estimate');
const { MatchRegistry, MatchError } = require('../src/matches');
const {
  defaultSettings,
  cleanSettings,
  bagSize,
  playersBagAllows,
  formatTime,
  timeFromDigits,
  secondsFromDigits,
  settingChanges,
  describeSettingEdits,
} = require('../public/match-settings');

const words = WordList.load();

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

let nextTileId = 50_000;
// Tiles from a picture like 'G _ O _ T'. '_' is a blank and '!' a removal tile.
function tiles(picture) {
  return [...picture.replace(/\s/g, '')].map((symbol) => ({
    id: nextTileId++,
    type: symbol === '_' ? 'blank' : symbol === '!' ? 'removal' : symbol,
  }));
}

const picture = (board) => board.map((tile) => (isBlank(tile) ? '_' : tile.type)).join(' ');
const fails = (code) => (err) => err instanceof GameError && err.code === code;
const failsMatch = (code) => (err) => err instanceof MatchError && err.code === code;

// ---------- The settings themselves ----------

test('the default settings are the standard rules: 130 tiles, 7 each, 1:00 turns', () => {
  const settings = defaultSettings();
  assert.equal(bagSize(settings), 130);
  assert.equal(settings.handSize, 7);
  assert.equal(settings.turnSeconds, 60);
  assert.equal(settings.challengeSeconds, 30);
  assert.equal(settings.startingBlanks, 4);
  assert.equal(settings.startingDraws, 2);
  assert.equal(settings.reshuffleEachRound, false);
  assert.equal(settings.forceValidStart, false);
  assert.deepEqual(settingChanges(settings), []);
});

test('settings outside their range snap to the nearest end, and broken ones get the default', () => {
  const settings = cleanSettings({
    handSize: 99,
    turnSeconds: 3,
    challengeSeconds: 'soon',
    blanks: -4,
    removals: 7.6,
    startingBlanks: 11,
    startingDraws: 0,
    reshuffleEachRound: 'yes',
    forceValidStart: true,
    letters: { A: 0, E: 51, Q: '3' },
  });
  assert.equal(settings.handSize, 20);
  assert.equal(settings.turnSeconds, 10);
  assert.equal(settings.challengeSeconds, 30);
  assert.equal(settings.blanks, 5);
  assert.equal(settings.removals, 8);
  assert.equal(settings.startingBlanks, 10);
  assert.equal(settings.startingDraws, 1);
  assert.equal(settings.reshuffleEachRound, false, 'only true or false counts');
  assert.equal(settings.forceValidStart, true);
  assert.equal(settings.letters.A, 1);
  assert.equal(settings.letters.E, 50);
  assert.equal(settings.letters.Q, 3);
  assert.equal(settings.letters.Z, 1, 'a missing letter keeps its default');
  assert.deepEqual(cleanSettings(null), defaultSettings());
});

test('times typed as digits fill in from the right, with the colon added', () => {
  assert.equal(timeFromDigits('130'), '1:30');
  assert.equal(timeFromDigits('5'), '0:05');
  assert.equal(timeFromDigits('0:053'), '0:53', 'typing after 0:05');
  assert.equal(timeFromDigits('1:300'), '1:30', 'a fourth digit is ignored');
  assert.equal(timeFromDigits('a1b'), '0:01', 'letters are dropped');
  assert.equal(timeFromDigits(''), '');
  assert.equal(secondsFromDigits('1:30'), 90);
  assert.equal(secondsFromDigits('1:75'), 135, '1:75 is 2:15');
  assert.equal(secondsFromDigits(''), null);
  assert.equal(formatTime(135), '2:15');
});

test('the bag size and how many players it can deal to follow the tile counts', () => {
  const settings = cleanSettings({ blanks: 5, removals: 5, letters: Object.fromEntries([...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].map((l) => [l, 1])), handSize: 20 });
  assert.equal(bagSize(settings), 36);
  assert.equal(playersBagAllows(settings), 1, '36 tiles minus a 6-tile starting board is room for 1 hand of 20');
  assert.equal(playersBagAllows(defaultSettings()), 6);
});

test('settings changes are listed in words, with the default beside each', () => {
  const settings = cleanSettings({ turnSeconds: 45, letters: { E: 20 }, forceValidStart: true });
  assert.deepEqual(settingChanges(settings).map((change) => `${change.label}: ${change.value} (normally ${change.normally})`), [
    'Time per turn: 0:45 (normally 1:00)',
    'E tiles: 20 (normally 12)',
    'Force valid starting board: On (normally Off)',
    'Total bag size: 138 (normally 130)',
  ]);
  assert.deepEqual(describeSettingEdits(defaultSettings(), settings), [
    'Force valid starting board: Off → On',
    'Time per turn: 1:00 → 0:45',
    'E tiles: 12 → 20',
  ]);
});

// ---------- The game with custom settings ----------

test('a game deals the chosen hand size and uses the chosen tile counts and clocks', () => {
  const settings = { handSize: 12, turnSeconds: 90, challengeSeconds: 15, blanks: 40, removals: 10, letters: { E: 30 } };
  const game = new Game(['p1', 'p2'], { words, rng: seeded(3), now: 0, settings });
  for (const player of game.players) assert.equal(player.hand.length, 12);
  assert.equal(game.phase.deadline, 90_000);
  const total = game.bag.length + game.board.length + game.discard.length + 24;
  assert.equal(total, 98 + 18 + 40 + 10);

  // A swap, then a challenge: the challenge clock is 15 seconds.
  const mover = game.phase.playerId;
  game.board = tiles('C _ T');
  game.move(mover, { type: 'swap', a: 0, b: 1 }, 1_000);
  const other = game.players.find((candidate) => candidate.id !== mover);
  game.challengeMove(other.id, 2_000);
  assert.equal(game.phase.deadline, 2_000 + 15_000);
});

test('the starting board uses the chosen number of blanks and random tiles', () => {
  const game = new Game(['p1', 'p2'], { words, rng: seeded(5), now: 0, settings: { startingBlanks: 7, startingDraws: 3 } });
  game.board = [];
  game.discard = [];
  game.bag = tiles('_ _ _ _ _ _ _ _ C A T');
  game.resetBoard();
  assert.equal(game.board.length, 10);
  assert.equal(game.board.filter(isBlank).length, 7);
  assert.deepEqual(game.board.filter((tile) => !isBlank(tile)).map((tile) => tile.type).sort(), ['A', 'C', 'T']);
});

test('a starting board keeps drawing until it has at least 2 tiles', () => {
  const game = new Game(['p1', 'p2'], { words, rng: seeded(5), now: 0, settings: { startingDraws: 2 } });
  game.board = [];
  game.discard = [];
  game.bag = tiles('A B ! !'); // no blanks left anywhere; the bag is drawn from the end
  game.resetBoard();
  assert.deepEqual(picture(game.board).split(' ').sort(), ['A', 'B']);
  assert.equal(game.discard.filter(isRemoval).length, 2, 'the drawn removal tiles are discarded');
});

test('Reshuffle bag every round puts the board and discard pile back into the bag', () => {
  const settings = { reshuffleEachRound: true };
  const game = new Game(['p1', 'p2'], { words, rng: seeded(9), now: 0, settings });
  game.discard = tiles('X Y Z');
  const before = game.bag.length + game.board.length + game.discard.length;
  game.endRound('p1', 1_000);
  game.keepTiles('p1', 1_000);
  game.keepTiles('p2', 1_000);
  assert.equal(game.round, 2);
  assert.ok(game.events.some((event) => event.type === 'bagReshuffled'));
  assert.equal(game.bag.length + game.board.length + game.discard.length, before);
  assert.ok(game.discard.every(isRemoval), 'only drawn removal tiles are left in the discard pile');
});

test('without the reshuffle, the discard pile stays put between rounds', () => {
  const game = new Game(['p1', 'p2'], { words, rng: seeded(9), now: 0 });
  game.discard = tiles('X Y Z');
  game.endRound('p1', 1_000);
  game.keepTiles('p1', 1_000);
  game.keepTiles('p2', 1_000);
  assert.ok(['X', 'Y', 'Z'].every((letter) => game.discard.some((tile) => tile.type === letter)));
  assert.ok(!game.events.some((event) => event.type === 'bagReshuffled'));
});

test('traded tiles are revealed onto the discard pile after the reshuffle', () => {
  const game = new Game(['p1', 'p2'], { words, rng: seeded(9), now: 0, settings: { reshuffleEachRound: true } });
  game.endRound('p1', 1_000);
  const traded = game.player('p1').hand.find((tile) => !isBlank(tile)); // a blank could go onto the new board
  game.tradeTile('p1', traded.id, 1_000);
  game.keepTiles('p2', 1_000);
  assert.ok(game.discard.includes(traded));
});

// ---------- The last tile ----------

function setUp({ hands, board, turn, bag = 'EEEEEEEEEEEE' }) {
  const game = new Game(Object.keys(hands), { words, rng: seeded(1), now: 0 });
  for (const player of game.players) player.hand = tiles(hands[player.id]);
  game.board = tiles(board);
  game.bag = tiles(bag);
  game.discard = [];
  game.events = [];
  game.startTurn(turn, 0);
  return game;
}

test('the last tile on the board cannot be removed', () => {
  const game = setUp({ hands: { p1: '! A', p2: 'B' }, board: 'C', turn: 'p1' });
  const removal = game.player('p1').hand.find(isRemoval);
  assert.throws(() => game.move('p1', { type: 'remove', tileId: removal.id, index: 0 }, 1), fails('bad-move'));
  assert.equal(picture(game.board), 'C');
});

test('a player holding only removal tiles with one tile on the board is skipped', () => {
  const game = setUp({ hands: { p1: '! !', p2: 'B _' }, board: 'C', turn: 'p1' });
  assert.equal(game.phase.playerId, 'p2');
  assert.ok(game.events.some((event) => event.type === 'skipped' && event.playerId === 'p1'));
});

test('a letter can still be removed from a board of 2 tiles', () => {
  const game = setUp({ hands: { p1: '! A', p2: 'B' }, board: 'C _', turn: 'p1' });
  const removal = game.player('p1').hand.find(isRemoval);
  game.move('p1', { type: 'remove', tileId: removal.id, index: 0 }, 1);
  assert.equal(picture(game.board), '_');
});

// ---------- Force valid starting board ----------

test('with Force valid starting board, every starting board has a word, and it cannot be challenged', () => {
  const settings = { forceValidStart: true, startingBlanks: 2, startingDraws: 5 };
  for (let seed = 1; seed <= 25; seed++) {
    const game = new Game(['p1', 'p2', 'p3'], { words, rng: seeded(seed), now: 0, settings });
    assert.ok(words.isValidBoard(game.pattern()), `seed ${seed}: ${game.pattern()}`);
    assert.equal(game.phase.opening, false);
    assert.throws(() => game.challengeStartingBoard(game.phase.playerId, 1), fails('cannot-challenge-board'));
  }
});

test('when no valid starting board can be found, the last one is used and everyone is told', () => {
  const settings = { forceValidStart: true, startingBlanks: 2, startingDraws: 5 };
  const game = new Game(['p1', 'p2'], { words, rng: seeded(2), now: 0, settings });
  game.board = [];
  game.discard = [];
  game.bag = tiles('Q Q Q Q Q X X X X X Z Z Z Z Z'); // no blanks, and no word uses these letters
  game.resetBoard();
  assert.ok(game.events.some((event) => event.type === 'startingBoardNotValid'));
  assert.ok(game.events.some((event) => event.type === 'discardShuffledIn') || game.discard.length === 0);
  assert.equal(game.board.length, 5);
  game.startTurn('p1', 0, { opening: true });
  assert.equal(game.phase.opening, true, 'a board that may have no word can still be challenged');
});

test('Force valid puts unused drawn tiles back into the bag', () => {
  const settings = { forceValidStart: true, startingBlanks: 2, startingDraws: 2 };
  const game = new Game(['p1', 'p2'], { words, rng: seeded(4), now: 0, settings });
  game.board = [];
  game.discard = [];
  game.bag = tiles('_ _ A T Q Q'); // the first draw (Q Q) makes no 4-letter word
  game.resetBoard();
  assert.ok(words.isValidBoard(game.pattern()), game.pattern());
  assert.equal(game.board.length + game.bag.length, 6, 'no tile went missing');
});

test('the chance that a starting board has a word drops with few blanks and many random tiles', () => {
  const rng = seeded(8);
  assert.ok(startingBoardChance(defaultSettings(), words, rng) > 0.75);
  assert.ok(startingBoardChance({ ...defaultSettings(), startingBlanks: 2, startingDraws: 5 }, words, rng) < 0.5);
});

// ---------- Settings in a match ----------

function registryWith(...names) {
  const registry = new MatchRegistry({ now: () => 0, words, rng: seeded(6) });
  const { match, seat: host } = registry.createMatch('Ana', null, { handSize: 9 });
  registry.attach(match, host, 'socket-Ana');
  const guests = names.map((name) => registry.join(match.code, name).seat);
  return { registry, match, host, guests };
}

test('a match starts with the settings its creator chose, and the game uses them', () => {
  const { registry, match, host } = registryWith('Ben');
  assert.equal(match.settings.handSize, 9);
  assert.equal(registry.view(match, host).settings.handSize, 9);
  registry.start(match, host);
  assert.equal(match.game.players[0].hand.length, 9);
});

test('a new match without settings uses the defaults', () => {
  const registry = new MatchRegistry({ now: () => 0 });
  const { match } = registry.createMatch('Ana');
  assert.deepEqual(match.settings, defaultSettings());
});

test('only the host can change the settings, and only in the lobby', () => {
  const { registry, match, host, guests } = registryWith('Ben');
  assert.throws(() => registry.updateSettings(match, guests[0], { handSize: 3 }), failsMatch('not-host'));
  const changes = registry.updateSettings(match, host, { ...match.settings, turnSeconds: 30 });
  assert.deepEqual(changes, ['Time per turn: 1:00 → 0:30']);
  registry.start(match, host);
  assert.throws(() => registry.updateSettings(match, host, defaultSettings()), failsMatch('not-lobby'));
});

test('settings carry over to the next game in the same match', () => {
  const { registry, match, host } = registryWith('Ben');
  registry.start(match, host);
  match.game.finish(host.id, 'lastPlayer');
  registry.playAgain(match);
  assert.equal(match.settings.handSize, 9);
  registry.start(match, host);
  assert.equal(match.game.settings.handSize, 9);
});

test('the host cannot start when the bag is too small for everyone\'s hand and the starting board', () => {
  const { registry, match, host } = registryWith('Ben', 'Cy');
  const tiny = cleanSettings({
    handSize: 20,
    blanks: 5,
    removals: 5,
    letters: Object.fromEntries([...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].map((letter) => [letter, 1])),
  });
  registry.updateSettings(match, host, tiny);
  assert.throws(() => registry.start(match, host), failsMatch('too-few-tiles'));
  assert.equal(match.status, 'lobby');
  registry.updateSettings(match, host, { ...tiny, handSize: 10 });
  registry.start(match, host);
  assert.equal(match.status, 'started');
});
