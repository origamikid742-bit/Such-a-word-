'use strict';

// Bots: their vocabulary, their decisions, whole games played by bots, bots
// in matches, their chat lines, and bots on a real server.

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { io } = require('socket.io-client');
const { Game, GameError } = require('../src/game/game');
const { WordList } = require('../src/game/words');
const { patternOf } = require('../src/game/tiles');
const { vocabularies } = require('../src/bots/vocabulary');
const { decide, chooseMove, legalMoves } = require('../src/bots/brain');
const { BotChat } = require('../src/bots/chat');
const LINES = require('../src/bots/lines');
const { MatchRegistry, MatchError } = require('../src/matches');
const { createServer } = require('../server');
const { BOT_PERSONALITIES, BOT_PERSONALITY_KEYS, BOT_DIFFICULTIES } = require('../public/bot-personalities');

const words = WordList.load();
const vocab = vocabularies(words);

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

let nextTileId = 90_000;
const tiles = (picture) => [...picture.replace(/\s/g, '')].map((symbol) => ({
  id: nextTileId++,
  type: symbol === '_' ? 'blank' : symbol === '!' ? 'removal' : symbol,
}));

const failsMatch = (code) => (err) => err instanceof MatchError && err.code === code;

// ---------- Vocabulary ----------

test('the fast word index agrees with the word list on thousands of boards', () => {
  const rng = seeded(1);
  for (let i = 0; i < 3000; i++) {
    const length = 2 + Math.floor(rng() * 12);
    let pattern = '';
    for (let j = 0; j < length; j++) pattern += rng() < 0.55 ? '_' : String.fromCharCode(65 + Math.floor(rng() * 26));
    assert.equal(vocab.expert.fits(pattern), words.isValidBoard(pattern), pattern);
  }
});

test('each difficulty knows more words than the one below it', () => {
  const sizes = BOT_DIFFICULTIES.map(({ key }) => [5, 6, 7].reduce((total, length) => total + vocab[key].count('_'.repeat(length)), 0));
  for (let i = 1; i < sizes.length; i++) assert.ok(sizes[i] > sizes[i - 1], `${BOT_DIFFICULTIES[i].key} knows more than ${BOT_DIFFICULTIES[i - 1].key}`);
  assert.ok(vocab.easy.fits('C_T'), 'everyday words are known to Easy bots');
  const word = vocab.medium.word('P_ANET');
  assert.equal(word, 'PLANET');
  assert.equal(vocab.expert.word('ZQ_'), null);
});

// ---------- Decisions ----------

test('every move a bot considers is one the rules allow', () => {
  for (let seed = 0; seed < 20; seed++) {
    const game = new Game(['a', 'b'], { words, rng: seeded(seed), now: 0 });
    const player = game.player(game.phase.playerId);
    for (const { move } of legalMoves(game, player)) {
      const copy = new Game(['a', 'b'], { words, rng: seeded(seed), now: 0 });
      assert.doesNotThrow(() => copy.move(player.id, move, 1), JSON.stringify(move));
    }
  }
});

test('even on a huge board with a huge hand, an Expert decides in well under a tenth of a second', () => {
  const game = new Game(['a', 'b'], { words, rng: seeded(3), now: 0 });
  game.board = tiles('S _ R _ N _ T _ E _ L _ A _ R _ S _ T _ E _ N _');
  const player = game.player('a');
  player.hand = tiles('A B C D E F G H I J K L M N O P Q R S T U V W X Y Z _ _ ! !');
  game.startTurn('a', 0);
  const started = Date.now();
  const choice = chooseMove(game, player, { difficulty: 'expert', personality: 'quiet' }, vocab, seeded(4));
  assert.ok(choice);
  assert.ok(Date.now() - started < 100, `took ${Date.now() - started} ms`);
});

test('an Expert never plays its last tile onto a board no word fits', () => {
  const game = new Game(['a', 'b'], { words, rng: seeded(5), now: 0 });
  game.board = tiles('C _ T');
  game.player('a').hand = tiles('Q');
  game.player('b').hand = tiles('E E E');
  game.startTurn('a', 0);
  const plan = decide(game, 'a', { difficulty: 'expert', personality: 'quiet' }, vocab, seeded(6));
  assert.notEqual(plan.move.type, 'playLetter', 'CQT is not a word');
});

test('an Expert always challenges a board no word fits, and never a valid one', () => {
  for (const [board, invalid] of [['Z Q X', true], ['C A T', false]]) {
    const game = new Game(['a', 'b'], { words, rng: seeded(7), now: 0 });
    game.board = tiles(board);
    game.lastMove = { playerId: 'b', type: 'swap', a: 0, b: 1 };
    game.startTurn('a', 0);
    let challenges = 0;
    for (let i = 0; i < 30; i++) {
      if (decide(game, 'a', { difficulty: 'expert', personality: 'quiet' }, vocab, seeded(i))?.type === 'challenge') challenges++;
    }
    if (invalid) assert.ok(challenges >= 27, `challenged ${challenges} of 30`);
    else assert.equal(challenges, 0);
  }
});

test('a challenged bot names a word it knows, or gives up', () => {
  const game = new Game(['a', 'b'], { words, rng: seeded(8), now: 0 });
  game.board = tiles('P _ A N E T');
  game.phase = { name: 'challenge', kind: 'move', challengerId: 'b', challengedId: 'a', deadline: 30_000 };
  const plan = decide(game, 'a', { difficulty: 'medium', personality: 'quiet' }, vocab, seeded(9));
  assert.deepEqual([plan.type, plan.word], ['nameWord', 'PLANET']);
  game.board = tiles('Z Q X');
  assert.equal(decide(game, 'a', { difficulty: 'expert', personality: 'quiet' }, vocab, seeded(9)).type, 'giveUp');
});

// ---------- Whole games played by bots ----------

// Plays a game with only bots, carrying out whichever bot's plan comes first,
// as the server would. Returns the game and how many plans the rules refused.
function playBots(bots, seed, maxActions = 3000) {
  const ids = bots.map((bot, i) => `${bot.difficulty}-${i}`);
  const byId = Object.fromEntries(ids.map((id, i) => [id, bots[i]]));
  const rng = seeded(seed);
  let now = 0;
  const game = new Game(ids, { words, rng, now });
  let refused = 0;
  for (let actions = 0; actions < maxActions && game.phase.name !== 'over'; actions++) {
    const plans = ids.map((id) => ({ id, plan: decide(game, id, byId[id], vocab, rng, {}) })).filter(({ plan }) => plan);
    if (plans.length === 0) {
      now = game.deadline() ?? now + 1000;
      game.advanceTime(now);
      continue;
    }
    plans.sort((a, b) => a.plan.delay - b.plan.delay);
    const { id, plan } = plans[0];
    now += plan.delay;
    game.advanceTime(now);
    try {
      switch (plan.type) {
        case 'move': game.move(id, plan.move, now); break;
        case 'challenge': game.challengeMove(id, now); break;
        case 'challengeStartingBoard': game.challengeStartingBoard(id, now); break;
        case 'nameWord': game.nameWord(id, plan.word, now); break;
        case 'giveUp': game.giveUp(id, now); break;
        case 'pass': game.pass(id, now); break;
        case 'tradeTile': game.tradeTile(id, plan.tileId, now); break;
        case 'keepTiles': game.keepTiles(id, now); break;
        default: throw new Error(plan.type);
      }
    } catch (err) {
      if (!(err instanceof GameError)) throw err;
      refused++;
    }
  }
  return { game, refused };
}

test('bot-only games of every difficulty and personality finish without breaking a rule', () => {
  let seed = 10;
  for (const personality of BOT_PERSONALITY_KEYS) {
    const bots = BOT_DIFFICULTIES.map(({ key }) => ({ difficulty: key, personality }));
    const { game, refused } = playBots(bots, seed++);
    assert.equal(game.phase.name, 'over', `${personality} game finished`);
    assert.equal(refused, 0, `${personality}: no plan was refused by the rules`);
    const total = game.bag.length + game.board.length + game.discard.length + game.setAside.length
      + game.players.reduce((sum, player) => sum + player.hand.length, 0);
    assert.equal(total, 130, 'no tile was lost');
  }
});

test('an Expert beats Easy and Medium bots almost every time', () => {
  let expertWins = 0;
  for (let seed = 0; seed < 12; seed++) {
    const { game } = playBots([{ difficulty: 'easy', personality: 'quiet' }, { difficulty: 'medium', personality: 'quiet' }, { difficulty: 'expert', personality: 'quiet' }], 100 + seed);
    if (game.phase.winnerId?.startsWith('expert')) expertWins++;
  }
  assert.ok(expertWins >= 10, `Expert won ${expertWins} of 12`);
});

// ---------- Chat lines ----------

const SWEARING = /\b(damn|damned|hell|crap|shit|fuck\w*|ass|bastard|bitch|piss|whoreson|mierda|dumbass)\b/i;
const STRONG = /\b(shit|fuck\w*|ass|bastard|bitch|whoreson|mierda|dumbass)\b/i;

test('every talking personality has plenty of clean lines, with known placeholders only', () => {
  for (const key of BOT_PERSONALITY_KEYS) {
    if (key === 'quiet') {
      assert.equal(LINES[key], undefined, 'Quiet bots never talk');
      continue;
    }
    const lines = LINES[key];
    assert.ok(lines, `${key} has lines`);
    const base = Object.values(lines.base).flat();
    assert.ok(base.length >= 60, `${key} has ${base.length} clean lines`);
    for (const situation of ['join', 'leave', 'idle', 'win', 'lose', 'challenged', 'mention_other', 'reactBot']) {
      assert.ok(lines.base[situation]?.length > 0, `${key} has ${situation} lines`);
    }
    const all = [base, Object.values(lines.mild ?? {}).flat(), Object.values(lines.strong ?? {}).flat(), Object.values(lines.pairs ?? {}).flat()].flat();
    for (const line of all) {
      for (const [, name] of line.matchAll(/\{(\w+)\}/g)) assert.ok(['player', 'word', 'me', 'other'].includes(name), `${key}: {${name}}`);
    }
    for (const line of base) assert.doesNotMatch(line, SWEARING, `${key} clean line: ${line}`);
    for (const line of Object.values(lines.mild ?? {}).flat()) assert.doesNotMatch(line, STRONG, `${key} mild line: ${line}`);
    for (const other of Object.keys(lines.pairs ?? {})) assert.ok(BOT_PERSONALITIES[other], `${key} pairs with a real personality: ${other}`);
  }
});

function chatFor(matchSeats, { rng = seeded(1) } = {}) {
  const sent = [];
  const registry = { matches: new Map(), seatFor: (match, id) => match.seats.find((seat) => seat.id === id) };
  const match = { code: 'TEST', status: 'lobby', seats: matchSeats, game: null };
  registry.matches.set('TEST', match);
  const chat = new BotChat({ registry, words, rng, timeScale: 0, send: (m, seat, text) => sent.push({ seat: seat.id, text }) });
  return { chat, match, sent };
}

const botSeat = (id, personality, extra = {}) => ({ id, name: BOT_PERSONALITIES[personality].names[0], bot: { personality, difficulty: 'medium', chattiness: 'normal', swearing: 'mild', ...extra } });

test('Clean bots never swear and Mild bots never say strong words', () => {
  const { chat, match } = chatFor([botSeat('1', 'annoying', { swearing: 'clean' }), botSeat('2', 'annoying', { swearing: 'mild' })]);
  for (const situation of Object.keys(LINES.annoying.base)) {
    for (let i = 0; i < 20; i++) {
      assert.doesNotMatch(chat.pickLine(match, match.seats[0], situation, {}) ?? '', SWEARING);
      assert.doesNotMatch(chat.pickLine(match, match.seats[1], situation, {}) ?? '', STRONG);
    }
  }
});

test('lines fill in names and words, and a bot avoids repeating itself', () => {
  const { chat, match } = chatFor([botSeat('1', 'encouraging')]);
  const seen = new Set();
  for (let i = 0; i < 12; i++) {
    const line = chat.pickLine(match, match.seats[0], 'otherNamed', { player: 'Ana', word: 'PLANET' });
    assert.doesNotMatch(line, /\{\w+\}/);
    seen.add(line);
  }
  assert.equal(seen.size, LINES.encouraging.base.otherNamed.length, 'every line used before any repeats');
});

test('muted and Quiet bots never speak; a mentioned bot answers', async () => {
  const quiet = botSeat('1', 'quiet');
  const muted = botSeat('2', 'marvin', { chattiness: 'muted' });
  const talker = botSeat('3', 'rocky');
  const { chat, match, sent } = chatFor([quiet, muted, talker]);
  chat.botJoined(match, quiet);
  chat.botJoined(match, muted);
  chat.personSaid(match, { id: '9', name: 'Ana' }, 'hey marvin, you ok?');
  chat.personSaid(match, { id: '9', name: 'Ana' }, 'Rocky, thank you!');
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.deepEqual(sent.map((message) => message.seat), ['3']);
  assert.ok(LINES.rocky.base.mention_thanks.map((line) => line.replace('{player}', 'Ana')).includes(sent[0].text));
  chat.stop();
});

// ---------- Bots in a match ----------

function lobby() {
  const registry = new MatchRegistry({ now: () => 0, words, rng: seeded(11) });
  const { match, seat: host } = registry.createMatch('Ana');
  registry.attach(match, host, 'socket-Ana');
  return { registry, match, host };
}

test('the host adds bots in the lobby, up to 6 players, with their own names and icons', () => {
  const { registry, match, host } = lobby();
  const dobby = registry.addBot(match, host, { personality: 'dobby', difficulty: 'hard' });
  const dobby2 = registry.addBot(match, host, { personality: 'dobby' });
  assert.equal(dobby.name, 'Dobby');
  assert.equal(dobby2.name, 'Dobby 2');
  assert.equal(dobby.bot.difficulty, 'hard');
  assert.equal(dobby2.bot.difficulty, 'medium');
  assert.equal(dobby.icon.value, '🧦');
  const quiet = registry.addBot(match, host, {});
  assert.equal(quiet.bot.personality, 'quiet', 'Quiet by default');
  assert.ok(BOT_PERSONALITIES.quiet.names.includes(quiet.name));
  for (let i = 0; i < 2; i++) assert.notEqual(registry.addBot(match, host, { personality: 'random' }).bot.personality, 'quiet');
  assert.throws(() => registry.addBot(match, host, {}), failsMatch('full'));
  const view = registry.view(match, host);
  assert.equal(view.players.length, 6);
  assert.ok(view.players.filter((player) => player.bot).every((player) => player.connected));
});

test('only the host adds bots, only in the lobby, with real options', () => {
  const { registry, match, host } = lobby();
  const { seat: ben } = registry.join(match.code, 'Ben');
  assert.throws(() => registry.addBot(match, ben, {}), failsMatch('not-host'));
  assert.throws(() => registry.addBot(match, host, { personality: 'yoda' }), failsMatch('bad-bot'));
  assert.throws(() => registry.addBot(match, host, { difficulty: 'godlike' }), failsMatch('bad-bot'));
  registry.addBot(match, host, {});
  registry.start(match, host);
  assert.throws(() => registry.addBot(match, host, {}), failsMatch('not-lobby'));
});

test("the host changes a bot's chattiness, swearing and name any time, and the rest in the lobby", () => {
  const { registry, match, host } = lobby();
  const bot = registry.addBot(match, host, { personality: 'annoying' });
  registry.updateBot(match, host, bot.id, { personality: 'gollum', difficulty: 'expert' });
  assert.equal(bot.name, 'Gollum', 'an automatic name follows the personality');
  assert.equal(bot.icon.value, '💍');
  registry.updateBot(match, host, bot.id, { name: 'Smeagol' });
  registry.start(match, host);
  registry.updateBot(match, host, bot.id, { chattiness: 'chatty', swearing: 'uncensored', name: 'Sneaky' });
  assert.deepEqual([bot.name, bot.bot.chattiness, bot.bot.swearing], ['Sneaky', 'chatty', 'uncensored']);
  assert.throws(() => registry.updateBot(match, host, bot.id, { difficulty: 'idiot' }), failsMatch('not-lobby'));
  assert.throws(() => registry.updateBot(match, host, bot.id, { name: 'ana' }), failsMatch('name-taken'));
});

test('a bot can never be host, and a lobby with only bots left is deleted', () => {
  const { registry, match, host } = lobby();
  const bot = registry.addBot(match, host, {});
  const { seat: ben } = registry.join(match.code, 'Ben');
  assert.throws(() => registry.makeHost(match, host, bot.id), failsMatch('bad-seat'));
  registry.leave(match, host);
  assert.equal(match.hostId, ben.id, 'the host role skips the bot');
  registry.leave(match, ben);
  assert.equal(registry.matches.has(match.code), false);
});

test('bots are never swept away for being disconnected', () => {
  let now = 0;
  const registry = new MatchRegistry({ now: () => now, words });
  const { match, seat: host } = registry.createMatch('Ana');
  registry.attach(match, host, 'socket-Ana');
  registry.addBot(match, host, {});
  now += 10 * 60_000;
  registry.sweep();
  assert.equal(match.seats.length, 2);
});

test('a game whose human players have all left ends with no winner', () => {
  const { registry, match, host } = lobby();
  registry.addBot(match, host, {});
  registry.addBot(match, host, {});
  const { seat: ben } = registry.join(match.code, 'Ben');
  registry.start(match, host);
  registry.leave(match, ben);
  assert.equal(registry.checkForPeople(match), true);
  assert.equal(match.status, 'started', 'Ana is still playing');
  registry.leave(match, host);
  assert.equal(registry.checkForPeople(match), false, 'nobody is left at all');
  assert.equal(registry.matches.has(match.code), false);
});

test("bots' caught bluffs and named words are counted", () => {
  const { registry, match, host } = lobby();
  const bot = registry.addBot(match, host, {});
  registry.start(match, host);
  match.game.events.push(
    { type: 'challengeSettled', kind: 'move', challengerId: bot.id, challengedId: host.id, valid: false },
    { type: 'challengeSettled', kind: 'move', challengerId: host.id, challengedId: bot.id, valid: true, word: 'CAT' },
  );
  registry.trackBotStats(match);
  registry.trackBotStats(match);
  assert.deepEqual(bot.bot.stats, { bluffsCaught: 1, wordsNamed: 1 });
});

// ---------- Bots on a real server ----------

let server;
let url;
const clients = [];

before(async () => {
  server = createServer({ botTimeScale: 0.02 });
  await new Promise((resolve) => server.httpServer.listen(0, resolve));
  url = `http://localhost:${server.httpServer.address().port}`;
});

after(async () => {
  for (const client of clients) client.disconnect();
  await server.close();
});

async function connect() {
  const client = io(url, { forceNew: true, reconnection: false, transports: ['websocket'] });
  clients.push(client);
  await new Promise((resolve, reject) => {
    client.once('connect', resolve);
    client.once('connect_error', reject);
  });
  return client;
}

const call = (client, event, payload = {}) => client.timeout(2_000).emitWithAck(event, payload);
const waitFor = (client, event, matches) => new Promise((resolve) => {
  const listener = (data) => {
    if (!matches(data)) return;
    client.off(event, listener);
    resolve(data);
  };
  client.on(event, listener);
});

test('on a real server, bots join with a hello, play their turns and answer their names', async () => {
  const client = await connect();
  const created = await call(client, 'createMatch', { name: 'Ana' });
  assert.equal(created.ok, true);
  const hello = waitFor(client, 'chat', (message) => message.bot);
  const added = await call(client, 'addBot', { personality: 'rocky', difficulty: 'expert', chattiness: 'chatty' });
  assert.equal(added.ok, true);
  await call(client, 'addBot', { personality: 'zaphod', difficulty: 'medium' });
  assert.ok(LINES.rocky.base.join.includes((await hello).text));

  const reply = waitFor(client, 'chat', (message) => message.bot && message.name === 'Rocky');
  await call(client, 'sendChat', { text: 'hi rocky!' });
  assert.ok(LINES.rocky.base.mention_greeting.map((line) => line.replace('{player}', 'Ana')).includes((await reply).text));

  // Once the game starts, the bots play their turns. Ana swaps two tiles on hers.
  client.on('state', (state) => {
    const phase = state.game?.phase;
    if (phase?.name !== 'turn' || phase.playerId !== state.youId) return;
    const { board } = state.game;
    const b = board.findIndex((tile) => tile.type !== board[0].type);
    if (b > 0) call(client, 'move', { move: { type: 'swap', a: 0, b } }).catch(() => {});
  });
  const botMoved = waitFor(client, 'state', (state) => state.game?.events.some((event) => event.type === 'moved' && event.playerId !== state.youId));
  assert.equal((await call(client, 'startMatch')).ok, true);
  const state = await botMoved;
  assert.ok(state.players.filter((player) => player.bot).length === 2);

  // When Ana leaves, nobody is left, so the match is gone.
  await call(client, 'leaveMatch');
  assert.equal(server.registry.matches.has(created.code), false);
});
