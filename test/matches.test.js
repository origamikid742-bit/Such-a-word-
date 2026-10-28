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

test('a match holds at most 6 players; the next people to join watch, up to 20', () => {
  const { registry } = setUp();
  const { match } = lobbyWith(registry, 'Ben', 'Cy', 'Di', 'Ed', 'Flo');
  assert.equal(registry.info(match.code).full, true);
  const { seat: gus } = registry.join(match.code, 'Gus');
  assert.equal(gus.role, 'spectator');
  for (let i = 2; i <= 20; i++) registry.join(match.code, `Watcher ${i}`);
  assert.equal(registry.info(match.code).spectators, 20);
  assert.equal(registry.info(match.code).watchersFull, true);
  assert.throws(() => registry.join(match.code, 'One too many'), fails('full'));
  assert.throws(() => registry.join(match.code, 'gus'), fails('name-taken'), 'names are unique among spectators too');
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

test('people who join once the game has started watch it, and are not dealt in', () => {
  const { registry } = setUp();
  const { match, host } = lobbyWith(registry, 'Ben');
  registry.start(match, host);
  const { seat: cy } = registry.join(match.code, 'Cy');
  assert.equal(cy.role, 'spectator');
  assert.equal(match.game.players.length, 2);
  const view = registry.view(match, cy);
  assert.equal(view.youWatch, true);
  assert.deepEqual(view.players.map((player) => player.name), ['Ana', 'Ben']);
  assert.deepEqual(view.spectators.map((spectator) => spectator.name), ['Cy']);
  assert.deepEqual(view.game.hand, [], 'a spectator holds no tiles');
  assert.equal(view.game.unseen.inOtherHands, 14, "a spectator can't see anyone's hand");
  assert.equal(view.game.canChallenge, false);
  assert.ok(!JSON.stringify(view).includes(host.key));
});

test('spectators become players when the next lobby has room, in the order they came', () => {
  const { registry } = setUp();
  const { match, host, guests } = lobbyWith(registry, 'Ben', 'Cy', 'Di', 'Ed', 'Flo');
  const { seat: gus } = registry.join(match.code, 'Gus');
  registry.start(match, host);
  const { seat: hal } = registry.join(match.code, 'Hal');
  const { seat: ivy } = registry.join(match.code, 'Ivy');
  registry.leave(match, guests[0]); // Ben leaves mid-game
  registry.leave(match, guests[1]); // and so does Cy
  match.game.finish(host.id, 'lastTile');
  registry.playAgain(match);
  assert.deepEqual(match.seats.filter((seat) => seat.role === 'player').map((seat) => seat.name), ['Ana', 'Di', 'Ed', 'Flo', 'Gus', 'Hal']);
  assert.equal(ivy.role, 'spectator', 'no room yet for Ivy');
  assert.equal(gus.role, 'player');
  assert.equal(hal.role, 'player');

  registry.leave(match, guests[2]); // Di leaves the lobby, making room
  assert.equal(ivy.role, 'player');
});

test('a spectator who leaves, or is away for a minute, gives up their place', () => {
  const { registry, clock } = setUp();
  const { match, host } = lobbyWith(registry, 'Ben');
  registry.start(match, host);
  const { seat: cy } = registry.join(match.code, 'Cy');
  const { seat: di } = registry.join(match.code, 'Di');
  registry.attach(match, cy, 'socket-Cy');
  registry.attach(match, di, 'socket-Di');
  registry.leave(match, cy);
  assert.equal(match.seats.length, 3);
  registry.detach(match, di, 'socket-Di');
  clock.now = MINUTE;
  assert.deepEqual(registry.sweep(), [match]);
  assert.deepEqual(match.seats.map((seat) => seat.name), ['Ana', 'Ben']);
});

test('everyone gets an icon: the one they chose, or their letter tile on a random color', () => {
  const { registry } = setUp();
  const { match, seat: ana } = registry.createMatch('Ana', { color: 3, kind: 'drawing', value: 'owl' });
  assert.deepEqual(ana.icon, { color: 3, kind: 'drawing', value: 'owl' });
  const { seat: ben } = registry.join(match.code, 'Ben');
  assert.equal(ben.icon.kind, 'letter');
  assert.ok(ben.icon.color >= 0 && ben.icon.color < 10);
  const { seat: cy } = registry.join(match.code, 'Cy', { color: 99, kind: 'drawing', value: 'dragon' });
  assert.equal(cy.icon.kind, 'letter', 'an icon that does not exist is replaced by the default');

  registry.setIcon(match, ben, { color: 0, kind: 'emoji', value: '🤥' });
  assert.deepEqual(registry.view(match, ana).players[1].icon, { color: 0, kind: 'emoji', value: '🤥' });
  assert.throws(() => registry.setIcon(match, ben, { color: 0, kind: 'emoji', value: '🦄' }), fails('bad-icon'));
  registry.start(match, ana);
  assert.throws(() => registry.setIcon(match, ben, { color: 1, kind: 'letter' }), fails('not-lobby'));
});

test('chat: up to 100 characters, one message a second, and the last 100 are kept', () => {
  const { registry, clock } = setUp();
  const { match, host, guests: [ben] } = lobbyWith(registry, 'Ben');
  const message = registry.sendChat(match, host, '  nice   try 😏 ');
  assert.equal(message.text, 'nice try 😏');
  assert.equal(message.name, 'Ana');
  assert.equal(message.watching, false);
  assert.throws(() => registry.sendChat(match, host, 'again'), fails('too-fast'));
  registry.sendChat(match, ben, 'hi'); // the limit is for each person

  clock.now += 1_000;
  assert.throws(() => registry.sendChat(match, host, '   '), fails('empty-chat'));
  assert.throws(() => registry.sendChat(match, host, 'x'.repeat(101)), fails('long-chat'));
  assert.equal(registry.sendChat(match, host, '❤️'.repeat(100)).text.length, 200, 'an emoji counts as one character');

  for (let i = 0; i < 120; i++) {
    clock.now += 1_000;
    registry.sendChat(match, ben, `message ${i}`);
  }
  assert.equal(match.chat.length, 100);
  assert.equal(match.chat.at(-1).text, 'message 119');
});

test('spectators can chat too', () => {
  const { registry } = setUp();
  const { match, host } = lobbyWith(registry, 'Ben');
  registry.start(match, host);
  const { seat: cy } = registry.join(match.code, 'Cy');
  assert.equal(registry.sendChat(match, cy, '👀').watching, true);
});

test('the host can remove spectators any time, and players only in the lobby', () => {
  const { registry } = setUp();
  const { match, host, guests: [ben, cy] } = lobbyWith(registry, 'Ben', 'Cy');
  assert.throws(() => registry.remove(match, ben, cy.id), fails('not-host'));
  assert.throws(() => registry.remove(match, host, host.id), fails('bad-seat'));
  assert.equal(registry.remove(match, host, cy.id), cy);
  assert.deepEqual(match.seats.map((seat) => seat.name), ['Ana', 'Ben']);

  registry.start(match, host);
  const { seat: di } = registry.join(match.code, 'Di');
  assert.throws(() => registry.remove(match, host, ben.id), fails('in-game'));
  registry.remove(match, host, di.id);
  assert.deepEqual(match.seats.map((seat) => seat.name), ['Ana', 'Ben']);
});

test('the host can pass the role to another player, then leave', () => {
  const { registry } = setUp();
  const { match, host, guests: [ben] } = lobbyWith(registry, 'Ben');
  registry.start(match, host);
  const { seat: cy } = registry.join(match.code, 'Cy');
  assert.throws(() => registry.makeHost(match, host, cy.id), fails('bad-seat'), 'spectators cannot host');
  assert.throws(() => registry.makeHost(match, ben, host.id), fails('not-host'));
  registry.makeHost(match, host, ben.id);
  assert.equal(match.hostId, ben.id);
  registry.leave(match, host);
  assert.equal(match.hostId, ben.id);
});

test('each win is counted once, and the tally lasts for the whole match', () => {
  const { registry } = setUp();
  const { match, host, guests: [ben] } = lobbyWith(registry, 'Ben');
  registry.start(match, host);
  match.game.finish(ben.id, 'lastTile');
  registry.noteResult(match);
  registry.noteResult(match);
  assert.equal(ben.wins, 1);
  registry.playAgain(match);
  registry.start(match, host);
  registry.endGame(match, host); // ended games have no winner
  registry.start(match, host);
  match.game.finish(ben.id, 'lastTile');
  registry.playAgain(match);
  assert.deepEqual(registry.view(match, host).players.map((player) => [player.name, player.wins]), [['Ana', 0], ['Ben', 2]]);
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
});

test('after a game ends, Play again returns everyone to the lobby with the same link', () => {
  const { registry } = setUp();
  const { match, host, guests: [ben] } = lobbyWith(registry, 'Ben');
  registry.start(match, host);
  assert.equal(match.gameNumber, 1);
  assert.throws(() => registry.playAgain(match), fails('not-over'));

  match.game.finish(ben.id, 'lastTile');
  registry.playAgain(match);
  assert.equal(match.status, 'lobby');
  assert.equal(match.game, null);
  assert.deepEqual(match.seats.map((seat) => seat.name), ['Ana', 'Ben']);
  assert.equal(registry.join(match.code, 'Cy').seat.name, 'Cy', 'new friends can join for the next game');

  registry.start(match, host);
  assert.equal(match.gameNumber, 2);
  assert.equal(match.game.players.length, 3);
});

test('leaving a finished game gives up the seat', () => {
  const { registry } = setUp();
  const { match, host, guests: [ben] } = lobbyWith(registry, 'Ben', 'Cy');
  registry.start(match, host);
  match.game.finish(host.id, 'lastTile');
  registry.leave(match, ben);
  assert.deepEqual(match.seats.map((seat) => seat.name), ['Ana', 'Cy']);
});

test('a player who leaves mid-game is out, keeps their name on screen, and cannot rejoin', () => {
  const { registry } = setUp();
  const { match, host, guests: [ben] } = lobbyWith(registry, 'Ben', 'Cy');
  registry.start(match, host);
  registry.leave(match, ben);
  assert.equal(match.seats.length, 3, 'their name stays until the next lobby');
  assert.equal(ben.left, true);
  assert.equal(ben.socketId, null);
  assert.equal(match.game.player(ben.id).left, true);
  assert.equal(registry.view(match, host).players.find((player) => player.id === ben.id).left, true);
  assert.throws(() => registry.rejoin(match.code, ben.key), fails('left'));
});

test('when the host leaves mid-game, the host role passes on', () => {
  const { registry } = setUp();
  const { match, host, guests: [ben] } = lobbyWith(registry, 'Ben', 'Cy');
  registry.start(match, host);
  registry.leave(match, host);
  assert.equal(match.hostId, ben.id);
});

test('the host can end a game: everyone goes back to the lobby, without those who left', () => {
  const { registry } = setUp();
  const { match, host, guests: [ben, cy] } = lobbyWith(registry, 'Ben', 'Cy');
  registry.start(match, host);
  assert.throws(() => registry.endGame(match, ben), fails('not-host'));
  registry.leave(match, cy);
  registry.endGame(match, host);
  assert.equal(match.status, 'lobby');
  assert.equal(match.game, null);
  assert.equal(match.endedBy, 'Ana');
  assert.deepEqual(match.seats.map((seat) => seat.name), ['Ana', 'Ben']);
  assert.throws(() => registry.endGame(match, host), fails('not-started'));
  registry.start(match, host);
  assert.equal(match.endedBy, null);
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
