'use strict';

// Starts a real server and connects to it the way browsers do.

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

// Waits for the next event that matches. Set this up before the action that causes it.
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

async function createMatch(name = 'Ana') {
  const client = await connect();
  const firstState = next(client, 'state');
  const reply = await call(client, 'createMatch', { name });
  assert.equal(reply.ok, true);
  return { client, code: reply.code, seatKey: reply.seatKey, state: await firstState };
}

async function joinMatch(code, name) {
  const client = await connect();
  const firstState = next(client, 'state');
  const reply = await call(client, 'joinMatch', { code, name });
  assert.equal(reply.ok, true);
  return { client, seatKey: reply.seatKey, state: await firstState };
}

test('the page loads for the home address and for match links', async () => {
  for (const address of ['/', '/m/ABC234']) {
    const response = await fetch(url + address);
    assert.equal(response.status, 200);
    assert.match(await response.text(), /<title>Such A Word<\/title>/);
  }
});

test('players create, join and start a match', async () => {
  const ana = await createMatch('Ana');
  assert.equal(ana.state.status, 'lobby');
  assert.equal(ana.state.youId, ana.state.hostId);
  assert.deepEqual(ana.state.players.map((player) => player.name), ['Ana']);

  const anaSeesBen = next(ana.client, 'state', (state) => state.players.length === 2);
  const ben = await joinMatch(ana.code.toLowerCase(), 'Ben');
  assert.deepEqual((await anaSeesBen).players.map((player) => player.name), ['Ana', 'Ben']);
  assert.notEqual(ben.state.youId, ben.state.hostId);

  const notHost = await call(ben.client, 'startMatch');
  assert.equal(notHost.error, 'not-host');

  const benSeesStart = next(ben.client, 'state', (state) => state.status === 'started');
  assert.equal((await call(ana.client, 'startMatch')).ok, true);
  assert.equal((await benSeesStart).status, 'started');

  const late = await connect();
  const lateState = next(late, 'state');
  const joined = await call(late, 'joinMatch', { code: ana.code, name: 'Cy' });
  assert.equal(joined.watching, true, 'joining a started match means watching it');
  const watching = await lateState;
  assert.equal(watching.youWatch, true);
  assert.equal(watching.players.length, 2);
  assert.deepEqual(watching.game.hand, []);
});

test('chat reaches everyone in the match, and newcomers get the chat so far', async () => {
  const ana = await createMatch();
  const ben = await joinMatch(ana.code, 'Ben');
  const benHears = next(ben.client, 'chat');
  assert.equal((await call(ana.client, 'sendChat', { text: 'hi 👋' })).ok, true);
  const message = await benHears;
  assert.equal(message.text, 'hi 👋');
  assert.equal(message.name, 'Ana');
  assert.equal((await call(ana.client, 'sendChat', { text: 'again' })).error, 'too-fast');

  const cy = await connect();
  const history = next(cy, 'chatHistory');
  await call(cy, 'joinMatch', { code: ana.code, name: 'Cy' });
  assert.deepEqual((await history).messages.map((each) => each.text), ['hi 👋']);
});

test('the host can remove someone, whose tab is told', async () => {
  const ana = await createMatch();
  const ben = await joinMatch(ana.code, 'Ben');
  assert.equal((await call(ben.client, 'removeSeat', { seatId: ana.state.youId })).error, 'not-host');
  const benTold = next(ben.client, 'removed');
  const anaSees = next(ana.client, 'state', (state) => state.players.length === 1);
  assert.equal((await call(ana.client, 'removeSeat', { seatId: ben.state.youId })).ok, true);
  await benTold;
  await anaSees;
  assert.equal((await call(ben.client, 'sendChat', { text: 'hello?' })).error, 'no-seat');
});

test('players can change their icon in the lobby, and the host can hand over the role', async () => {
  const ana = await createMatch();
  const ben = await joinMatch(ana.code, 'Ben');
  const anaSeesIcon = next(ana.client, 'state', (state) => state.players[1].icon.kind === 'drawing');
  assert.equal((await call(ben.client, 'setIcon', { icon: { color: 2, kind: 'drawing', value: 'bike' } })).ok, true);
  assert.deepEqual((await anaSeesIcon).players[1].icon, { color: 2, kind: 'drawing', value: 'bike' });

  const benSeesHost = next(ben.client, 'state', (state) => state.hostId === ben.state.youId);
  assert.equal((await call(ana.client, 'makeHost', { seatId: ben.state.youId })).ok, true);
  await benSeesHost;
});

test('the host cannot start alone', async () => {
  const ana = await createMatch();
  const reply = await call(ana.client, 'startMatch');
  assert.equal(reply.error, 'not-enough-players');
  assert.match(reply.message, /at least 2 players/);
});

test('a refreshed page gets its seat back', async () => {
  const ana = await createMatch();
  const ben = await joinMatch(ana.code, 'Ben');

  const anaSeesBenLeave = next(ana.client, 'state', (state) => state.players[1].connected === false);
  ben.client.disconnect();
  await anaSeesBenLeave;

  const anaSeesBenReturn = next(ana.client, 'state', (state) => state.players[1].connected === true);
  const refreshed = await connect();
  const benState = next(refreshed, 'state');
  const reply = await call(refreshed, 'rejoin', { code: ana.code, seatKey: ben.seatKey, takeover: true });
  assert.equal(reply.ok, true);
  assert.equal((await benState).youId, ben.state.youId);
  await anaSeesBenReturn;
});

test('a second tab must choose to take over a seat, and the first tab is told', async () => {
  const ana = await createMatch();
  const secondTab = await connect();

  const asked = await call(secondTab, 'rejoin', { code: ana.code, seatKey: ana.seatKey });
  assert.equal(asked.error, 'in-use');
  assert.equal(asked.name, 'Ana');
  assert.equal(asked.status, 'lobby');

  const firstTabTold = next(ana.client, 'replaced');
  const taken = await call(secondTab, 'rejoin', { code: ana.code, seatKey: ana.seatKey, takeover: true });
  assert.equal(taken.ok, true);
  await firstTabTold;
  assert.equal((await call(ana.client, 'startMatch')).error, 'no-seat');
});

test('unknown match codes are reported as gone', async () => {
  const client = await connect();
  assert.deepEqual(await call(client, 'matchInfo', { code: 'ZZZZZZ' }), { ok: true, exists: false });
  assert.equal((await call(client, 'rejoin', { code: 'ZZZZZZ', seatKey: 'x' })).error, 'not-found');
  assert.equal((await call(client, 'joinMatch', { code: 'ZZZZZZ', name: 'Ana' })).error, 'not-found');
});

test('leaving the lobby removes the player for everyone', async () => {
  const ana = await createMatch();
  const ben = await joinMatch(ana.code, 'Ben');
  const anaSeesBenGo = next(ana.client, 'state', (state) => state.players.length === 1);
  assert.equal((await call(ben.client, 'leaveMatch')).ok, true);
  await anaSeesBenGo;
  assert.equal((await call(ben.client, 'rejoin', { code: ana.code, seatKey: ben.seatKey })).error, 'bad-key');
});
