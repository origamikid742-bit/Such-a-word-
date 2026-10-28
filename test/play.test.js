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

test('"No challenge" from everyone else ends the round early', async () => {
  const { match, first, second } = await startGame();
  match.game.board = tiles('C _ T');
  match.game.player(first.state.youId).hand.push(...tiles('A'));
  const handTile = match.game.player(first.state.youId).hand.at(-1);
  await call(first.client, 'move', { move: { type: 'playLetter', tileId: handTile.id, index: 1 } });
  assert.equal(match.game.phase.name, 'roundEnding');

  assert.equal((await call(first.client, 'pass')).error, 'nothing-to-pass', 'the mover cannot pass');
  const roundOver = next(first.client, 'state', (state) => state.game.phase.name === 'betweenRounds');
  assert.equal((await call(second.client, 'pass')).ok, true);
  assert.equal((await roundOver).game.phase.starterId, second.state.youId);
});

test('between rounds, players trade a tile or keep theirs, then the next round starts', async () => {
  const { match, first, second } = await startGame();
  match.game.endRound(first.state.youId, Date.now());
  const traded = match.game.player(first.state.youId).hand[0];
  assert.equal((await call(first.client, 'tradeTile', { tileId: traded.id })).ok, true);
  assert.equal((await call(first.client, 'keepTiles')).error, 'already-traded');

  const nextRound = next(first.client, 'state', (state) => state.game.round === 2);
  assert.equal((await call(second.client, 'keepTiles')).ok, true);
  const state = await nextRound;
  assert.equal(state.game.hand.length, 7);
  assert.ok(!state.game.hand.some((tile) => tile.id === traded.id), 'the traded tile left the hand');
  assert.equal(state.game.phase.playerId, first.state.youId);
});

test('the first player can challenge the starting board, and another player answers it', async () => {
  const { match, first, second } = await startGame();
  match.game.board = tiles('C _ T');
  assert.equal((await call(second.client, 'challengeStartingBoard')).error, 'cannot-challenge-board');
  assert.equal((await call(first.client, 'challengeStartingBoard')).ok, true);

  const settled = next(first.client, 'state', (state) => state.game.phase.name === 'turn');
  const named = await call(second.client, 'nameWord', { word: 'cut' });
  assert.equal(named.accepted, true);
  const state = await settled;
  assert.equal(state.game.hand.length, 7 + 2, 'the first player draws 2');
  assert.equal(state.game.phase.opening, false);
});

test('after the game ends, Play again sends everyone back to the lobby', async () => {
  const { match, first, second } = await startGame();
  match.game.finish(first.state.youId, 'lastTile');
  const backInLobby = next(second.client, 'state', (state) => state.status === 'lobby');
  assert.equal((await call(second.client, 'playAgain')).ok, true);
  const lobby = await backInLobby;
  assert.equal(lobby.game, null);
  assert.equal(lobby.players.length, 2);

  const host = lobby.hostId === first.state.youId ? first.client : second.client;
  const newGame = next(second.client, 'state', (state) => state.game !== null);
  assert.equal((await call(host, 'startMatch')).ok, true);
  const state = await newGame;
  assert.equal(state.gameNumber, 2);
  assert.equal(state.game.round, 1);
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

test('a lined-up move is played for the player when their clock runs out', async () => {
  const { match, first, second } = await startGame();
  match.game.board = tiles('C _ T');
  assert.equal((await call(second.client, 'lineUp', { move: { type: 'swap', a: 0, b: 1 } })).error, 'not-your-turn');
  assert.equal((await call(first.client, 'lineUp', { move: { type: 'swap', a: 0, b: 1 } })).ok, true);
  match.game.phase.deadline = Date.now() + 50;
  const moved = next(second.client, 'state', (state) => state.game.phase.playerId === second.state.youId);
  server.scheduleTimer(match);
  const state = await moved;
  assert.deepEqual(state.game.board.map((tile) => tile.type), ['blank', 'C', 'T']);
  assert.equal(state.game.players.find((player) => player.id === first.state.youId).handCount, 7, 'no penalty');
  const event = state.game.events.at(-1);
  assert.equal(event.type, 'moved');
  assert.equal(event.auto, true);
  assert.equal(JSON.stringify(state).includes('linedUp'), false);
});

test('clearing a lined-up move means the clock running out costs 3 tiles again', async () => {
  const { match, first, second } = await startGame();
  match.game.board = tiles('C _ T');
  await call(first.client, 'lineUp', { move: { type: 'swap', a: 0, b: 1 } });
  assert.equal((await call(first.client, 'lineUp', { move: null })).ok, true);
  match.game.phase.deadline = Date.now() + 50;
  const moved = next(second.client, 'state', (state) => state.game.phase.playerId === second.state.youId);
  server.scheduleTimer(match);
  const state = await moved;
  assert.equal(state.game.players.find((player) => player.id === first.state.youId).handCount, 7 + 3);
});

test('after a challenge, everyone sees the words that fitted the board', async () => {
  const { match, first, second } = await startGame();
  match.game.board = tiles('C _ T');
  await call(first.client, 'move', { move: { type: 'swap', a: 0, b: 1 } }); // now _ C T
  await call(second.client, 'challenge');
  const settled = next(second.client, 'state', (state) => state.game.phase.name === 'betweenRounds');
  await call(first.client, 'nameWord', { word: 'act' });
  const event = (await settled).game.events.find((candidate) => candidate.type === 'challengeSettled');
  assert.equal(event.pattern, '_CT');
  assert.ok(event.possible.words.includes('ACT'));
  assert.equal(event.possible.total, event.possible.words.length);
});

test('a player who leaves mid-game drops their tiles face up and cannot come back', async () => {
  const ana = await connect();
  const created = await call(ana, 'createMatch', { name: 'Ana' });
  const ben = await connect();
  const benJoined = await call(ben, 'joinMatch', { code: created.code, name: 'Ben' });
  const cy = await connect();
  await call(cy, 'joinMatch', { code: created.code, name: 'Cy' });
  const started = next(ana, 'state', (state) => state.game !== null);
  await call(ana, 'startMatch');
  const before = await started;
  const benId = before.players.find((player) => player.name === 'Ben').id;

  const anaSees = next(ana, 'state', (state) => state.game.events.some((event) => event.type === 'left'));
  assert.equal((await call(ben, 'leaveMatch')).ok, true);
  const after = await anaSees;
  const left = after.game.events.find((event) => event.type === 'left');
  assert.equal(left.playerId, benId);
  assert.equal(left.tiles.length, 7);
  assert.equal(after.game.discard.count, before.game.discard.count + 7);
  assert.equal(after.players.find((player) => player.id === benId).left, true);
  assert.equal(after.game.players.find((player) => player.id === benId).ejected, true);
  assert.notEqual(after.game.phase.name, 'over', 'two players are still playing');

  const again = await connect();
  const refused = await call(again, 'rejoin', { code: created.code, seatKey: benJoined.seatKey });
  assert.equal(refused.error, 'left');
});

test('the host can end the game, which sends everyone back to the lobby', async () => {
  const { match, first, second } = await startGame();
  const hostClient = match.hostId === first.state.youId ? first.client : second.client;
  const guestClient = hostClient === first.client ? second.client : first.client;
  assert.equal((await call(guestClient, 'endGame')).error, 'not-host');
  const guestSees = next(guestClient, 'state', (state) => state.status === 'lobby');
  assert.equal((await call(hostClient, 'endGame')).ok, true);
  const lobby = await guestSees;
  assert.equal(lobby.game, null);
  assert.equal(lobby.endedBy, 'Ana');
  assert.equal(lobby.players.length, 2);
});
