'use strict';

// Plays games through a real server, the way browsers do.

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { io } = require('socket.io-client');
const { createServer } = require('../server');

let server;
let url;
const clients = [];

before(async () => {
  server = createServer();
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

function next(client, event, matches = () => true) {
  return new Promise((resolve) => {
    const listener = (data) => {
      if (!matches(data)) return;
      client.off(event, listener);
      resolve(data);
    };
    client.on(event, listener);
  });
}

let nextTileId = 50_000;
const tiles = (picture) => [...picture.replace(/\s/g, '')].map((symbol) => ({
  id: nextTileId++,
  type: symbol === '_' ? 'blank' : symbol,
}));

// Starts a 2-player game. `first` is the player whose turn it is.
async function startGame() {
  const ana = await connect();
  const created = await call(ana, 'createMatch', { name: 'Ana' });
  const ben = await connect();
  await call(ben, 'joinMatch', { code: created.code, name: 'Ben' });
  const anaStarted = next(ana, 'state', (state) => state.game !== null);
  const benStarted = next(ben, 'state', (state) => state.game !== null);
  assert.equal((await call(ana, 'startMatch')).ok, true);
  const [anaState, benState] = await Promise.all([anaStarted, benStarted]);
  const match = server.registry.matches.get(created.code);
  const anaFirst = match.game.phase.playerId === anaState.youId;
  return {
    match,
    anaState,
    benState,
    first: anaFirst ? { client: ana, state: anaState } : { client: ben, state: benState },
    second: anaFirst ? { client: ben, state: benState } : { client: ana, state: anaState },
  };
}

test('game actions are refused before the game starts', async () => {
  const ana = await connect();
  await call(ana, 'createMatch', { name: 'Ana' });
  assert.equal((await call(ana, 'move', { move: { type: 'swap', a: 0, b: 1 } })).error, 'not-started');
});

test('each player sees the board and their own hand, but only the size of other hands', async () => {
  const { anaState, benState } = await startGame();
  assert.equal(anaState.game.hand.length, 7);
  assert.equal(benState.game.hand.length, 7);
  assert.deepEqual(anaState.game.board, benState.game.board);

  const anaSeesIds = new Set([...anaState.game.board, ...anaState.game.hand].map((tile) => tile.id));
  for (const tile of benState.game.hand) assert.ok(!anaSeesIds.has(tile.id), "Ana never sees Ben's tiles");
  assert.equal(anaState.game.players.find((player) => player.id === benState.youId).handCount, 7);

  const { counts, inBag, inOtherHands } = anaState.game.unseen;
  assert.equal(inOtherHands, 7);
  assert.equal(Object.values(counts).reduce((sum, count) => sum + count, 0), inBag + inOtherHands);
});

test('only the player whose turn it is can move, and everyone sees the move', async () => {
  const { match, first, second } = await startGame();
  match.game.board = tiles('C _ T');

  const wrong = await call(second.client, 'move', { move: { type: 'swap', a: 0, b: 1 } });
  assert.equal(wrong.error, 'not-your-turn');
  const illegal = await call(first.client, 'move', { move: { type: 'swap', a: 0, b: 0 } });
  assert.equal(illegal.error, 'bad-move');
  assert.match(illegal.message, /Swap two different tiles/);

  const secondSees = next(second.client, 'state', (state) => state.game.lastMove !== null);
  assert.equal((await call(first.client, 'move', { move: { type: 'swap', a: 0, b: 1 } })).ok, true);
  const seen = await secondSees;
  assert.deepEqual(seen.game.board.map((tile) => tile.type), ['blank', 'C', 'T']);
  assert.equal(seen.game.canChallenge, true);
  assert.equal(seen.game.phase.playerId, second.state.youId);
  assert.equal(seen.game.events.at(-1).type, 'moved');
});

test('a challenge is answered by naming a word, with another try after a word that does not fit', async () => {
  const { match, first, second } = await startGame();
  match.game.board = tiles('C _ T');
  await call(first.client, 'move', { move: { type: 'swap', a: 0, b: 1 } }); // now _ C T
  assert.equal((await call(second.client, 'challenge')).ok, true);

  const wrongWord = await call(first.client, 'nameWord', { word: 'cat' });
  assert.equal(wrongWord.ok, true);
  assert.equal(wrongWord.accepted, false);
  assert.match(wrongWord.reason, /doesn't fit/);

  const challengerSees = next(second.client, 'state', (state) => state.game.phase.name === 'betweenRounds');
  const named = await call(first.client, 'nameWord', { word: 'act' });
  assert.equal(named.accepted, true);
  const state = await challengerSees;
  assert.equal(state.game.hand.length, 7 + 3, 'the challenger draws 3');
  assert.equal(state.game.events.find((event) => event.type === 'challengeSettled').word, 'ACT');
});

test('when a turn clock runs out, the server moves on by itself', async () => {
  const { match, first, second } = await startGame();
  const firstId = first.state.youId;
  match.game.phase.deadline = Date.now() + 50;
  const moved = next(second.client, 'state', (state) => state.game.phase.playerId === second.state.youId);
  server.scheduleTimer(match);
  const state = await moved;
  assert.equal(state.game.players.find((player) => player.id === firstId).handCount, 7 + 3);
  assert.ok(state.game.events.some((event) => event.type === 'timedOut' && event.playerId === firstId));
});
