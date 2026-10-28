'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { MatchRegistry, MatchError, CODE_ALPHABET } = require('../src/matches');

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

// A registry with a clock the test controls.
function setUp() {
  const clock = { now: 0 };
  const registry = new MatchRegistry({ now: () => clock.now });
  return { registry, clock };
}

const fails = (code) => (err) => err instanceof MatchError && err.code === code;

// A lobby with a connected host and the given connected guests.
function lobbyWith(registry, ...guestNames) {
  const { match, seat: host } = registry.createMatch('Ana');
  registry.attach(match, host, 'socket-Ana');
  const guests = guestNames.map((name) => {
    const { seat } = registry.join(match.code, name);
    registry.attach(match, seat, `socket-${name}`);
    return seat;
  });
  return { match, host, guests };
}

test('a new match has a 6-character code with no look-alike characters', () => {
  const { registry } = setUp();
  const { match, seat } = registry.createMatch('Ana');
  assert.equal(match.code.length, 6);
  for (const letter of match.code) assert.ok(CODE_ALPHABET.includes(letter));
  assert.doesNotMatch(match.code, /[ILO01]/);
  assert.equal(match.status, 'lobby');
  assert.equal(match.hostId, seat.id);
});

test('names are tidied, limited to 16 characters and unique within a match', () => {
  const { registry } = setUp();
  const { match } = registry.createMatch('  Ana   Banana ');
  assert.equal(match.seats[0].name, 'Ana Banana');
  assert.throws(() => registry.join(match.code, '   '), fails('bad-name'));
  assert.throws(() => registry.join(match.code, 'x'.repeat(17)), fails('bad-name'));
  assert.throws(() => registry.join(match.code, 'ana banana'), fails('name-taken'));
  assert.equal(registry.join(match.code, 'x'.repeat(16)).seat.name.length, 16);
});

test('match codes work in lower case too', () => {
  const { registry } = setUp();
  const { match } = registry.createMatch('Ana');
  assert.equal(registry.join(match.code.toLowerCase(), 'Ben').match, match);
});

test('a match holds at most 6 players', () => {
  const { registry } = setUp();
  const { match } = lobbyWith(registry, 'Ben', 'Cy', 'Di', 'Ed', 'Flo');
  assert.equal(registry.info(match.code).full, true);
  assert.throws(() => registry.join(match.code, 'Gus'), fails('full'));
});

test('only the host can start, and only with at least 2 players', () => {
  const { registry } = setUp();
  const { match, seat: host } = registry.createMatch('Ana');
  assert.throws(() => registry.start(match, host), fails('not-enough-players'));
  const { seat: guest } = registry.join(match.code, 'Ben');
  assert.throws(() => registry.start(match, guest), fails('not-host'));
  registry.start(match, host);
  assert.equal(match.status, 'started');
});

test('nobody new can join once the match has started', () => {
  const { registry } = setUp();
  const { match, host } = lobbyWith(registry, 'Ben');
  registry.start(match, host);
  assert.throws(() => registry.join(match.code, 'Cy'), fails('started'));
  assert.equal(registry.info(match.code).status, 'started');
});

test('a seat key gets the same seat back, and a wrong key does not', () => {
  const { registry } = setUp();
  const { match, guests: [ben] } = lobbyWith(registry, 'Ben');
  registry.detach(match, ben, 'socket-Ben');
  assert.equal(registry.rejoin(match.code, ben.key).seat, ben);
  assert.throws(() => registry.rejoin(match.code, 'not-a-real-key'), fails('bad-key'));
  assert.throws(() => registry.rejoin('ZZZZZZ', ben.key), fails('not-found'));
});

test('a seat that is open in another tab can only be taken over on purpose', () => {
  const { registry } = setUp();
  const { match, guests: [ben] } = lobbyWith(registry, 'Ben');
  assert.throws(() => registry.rejoin(match.code, ben.key, { socketId: 'new-tab' }), (err) => {
    return fails('in-use')(err) && err.details.name === 'Ben' && err.details.status === 'lobby';
  });
  const { seat } = registry.rejoin(match.code, ben.key, { socketId: 'new-tab', takeover: true });
  assert.equal(registry.attach(match, seat, 'new-tab'), 'socket-Ben');
});

test('a closed old tab does not disconnect the tab that took over its seat', () => {
  const { registry } = setUp();
  const { match, guests: [ben] } = lobbyWith(registry, 'Ben');
  registry.attach(match, ben, 'new-tab');
  assert.equal(registry.detach(match, ben, 'socket-Ben'), false);
  assert.equal(ben.socketId, 'new-tab');
});

test('a lobby player who stays away for a minute loses their seat', () => {
  const { registry, clock } = setUp();
  const { match, guests: [ben] } = lobbyWith(registry, 'Ben');
  registry.detach(match, ben, 'socket-Ben');
  clock.now = MINUTE - 1;
  assert.deepEqual(registry.sweep(), []);
  assert.equal(match.seats.length, 2);
  clock.now = MINUTE;
  assert.deepEqual(registry.sweep(), [match]);
  assert.deepEqual(match.seats.map((seat) => seat.name), ['Ana']);
});

test('a lobby player who comes back within a minute keeps their seat', () => {
  const { registry, clock } = setUp();
  const { match, guests: [ben] } = lobbyWith(registry, 'Ben');
  registry.detach(match, ben, 'socket-Ben');
  clock.now = 30_000;
  registry.attach(match, ben, 'socket-Ben-again');
  clock.now = 5 * MINUTE;
  registry.sweep();
  assert.equal(match.seats.length, 2);
});

test('when the host leaves the lobby, the next connected player becomes host', () => {
  const { registry, clock } = setUp();
  const { match, host, guests: [ben, cy] } = lobbyWith(registry, 'Ben', 'Cy');
  registry.detach(match, ben, 'socket-Ben');
  registry.leave(match, host);
  assert.equal(match.hostId, cy.id);

  registry.detach(match, cy, 'socket-Cy');
  clock.now = MINUTE;
  registry.sweep();
  assert.equal(registry.matches.has(match.code), false, 'an empty lobby is deleted');
});

test('players in a started match keep their seats while away', () => {
  const { registry, clock } = setUp();
  const { match, host, guests: [ben] } = lobbyWith(registry, 'Ben');
  registry.start(match, host);
  registry.detach(match, ben, 'socket-Ben');
  clock.now = 30 * MINUTE;
  registry.sweep();
  assert.equal(match.seats.length, 2);
  assert.throws(() => registry.leave(match, ben), fails('started'));
});

test('a match nobody has been connected to for 2 hours is deleted', () => {
  const { registry, clock } = setUp();
  const { match, host, guests: [ben] } = lobbyWith(registry, 'Ben');
  registry.start(match, host);
  registry.detach(match, host, 'socket-Ana');
  registry.detach(match, ben, 'socket-Ben');
  clock.now = 2 * HOUR - 1;
  registry.sweep();
  assert.equal(registry.matches.has(match.code), true);
  clock.now = 2 * HOUR;
  registry.sweep();
  assert.equal(registry.matches.has(match.code), false);
});

test("a player's view never includes anyone's seat key", () => {
  const { registry } = setUp();
  const { match, host, guests: [ben] } = lobbyWith(registry, 'Ben');
  const view = JSON.stringify(registry.view(match, ben));
  assert.ok(!view.includes(host.key));
  assert.ok(!view.includes(ben.key));
});
