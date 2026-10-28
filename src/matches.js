'use strict';

const crypto = require('node:crypto');
const { Game } = require('./game/game');
const { gameView } = require('./game/view');

const MIN_PLAYERS = 2;
const MAX_PLAYERS = 6;
const MAX_NAME_LENGTH = 16;
const CODE_LENGTH = 6;
// No I, L, O, 0 or 1, so codes are easy to read out loud and type.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const AVATAR_COUNT = 6;

// An expected problem with a request, such as a full match or a taken name.
// `code` is for the browser's logic; `message` is shown to the player.
class MatchError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

function cleanName(raw) {
  const name = typeof raw === 'string'
    ? raw.replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim()
    : '';
  if (name.length === 0) throw new MatchError('bad-name', 'Please enter a name.');
  if (name.length > MAX_NAME_LENGTH) {
    throw new MatchError('bad-name', `Names can be at most ${MAX_NAME_LENGTH} characters.`);
  }
  return name;
}

function cleanCode(raw) {
  return typeof raw === 'string' ? raw.trim().toUpperCase() : '';
}

// Keeps every match in memory. Knows nothing about the network: the server
// tells it which connection (socket) sits in which seat.
class MatchRegistry {
  constructor({
    lobbyGraceMs = 60_000,
    idleMatchMs = 2 * 60 * 60_000,
    now = Date.now,
    words = null,
    rng = Math.random,
  } = {}) {
    this.matches = new Map();
    this.lobbyGraceMs = lobbyGraceMs;
    this.idleMatchMs = idleMatchMs;
    this.now = now;
    this.words = words;
    this.rng = rng;
  }

  createMatch(hostName) {
    const name = cleanName(hostName);
    const match = {
      code: this.newCode(),
      status: 'lobby',
      seats: [],
      hostId: null,
      nextSeatId: 1,
      emptySince: this.now(),
    };
    this.matches.set(match.code, match);
    const seat = this.addSeat(match, name);
    match.hostId = seat.id;
    return { match, seat };
  }

  find(code) {
    const match = this.matches.get(cleanCode(code));
    if (!match) throw new MatchError('not-found', 'This match no longer exists.');
    return match;
  }

  // What someone opening a match link needs to know before joining.
  info(code) {
    const match = this.matches.get(cleanCode(code));
    if (!match) return { exists: false };
    return {
      exists: true,
      code: match.code,
      status: match.status,
      players: match.seats.length,
      full: match.seats.length >= MAX_PLAYERS,
    };
  }

  join(code, rawName) {
    const match = this.find(code);
    if (match.status !== 'lobby') throw new MatchError('started', 'This match has already started.');
    if (match.seats.length >= MAX_PLAYERS) throw new MatchError('full', 'This match is full.');
    const name = cleanName(rawName);
    if (match.seats.some((seat) => seat.name.toLowerCase() === name.toLowerCase())) {
      throw new MatchError('name-taken', 'Someone in this match already has that name.');
    }
    return { match, seat: this.addSeat(match, name) };
  }

  // Finds the seat for a seat key, for a player coming back after a refresh or a
  // lost connection. If the seat is open in another tab, the player must choose
  // to take it over.
  rejoin(code, seatKey, { socketId = null, takeover = false } = {}) {
    const match = this.find(code);
    const seat = typeof seatKey === 'string'
      ? match.seats.find((candidate) => candidate.key === seatKey)
      : undefined;
    if (!seat) throw new MatchError('bad-key', 'That seat is no longer in this match.');
    if (seat.socketId && seat.socketId !== socketId && !takeover) {
      throw new MatchError('in-use', 'You are already in this match in another tab.', {
        name: seat.name,
        status: match.status,
      });
    }
    return { match, seat };
  }

  // Connects a socket to a seat. Returns the socket it pushed out, if any.
  attach(match, seat, socketId) {
    const previous = seat.socketId;
    seat.socketId = socketId;
    seat.disconnectedAt = null;
    match.emptySince = null;
    return previous && previous !== socketId ? previous : null;
  }

  // Disconnects a socket from its seat. Returns false if another socket already
  // holds the seat, for example after a refresh.
  detach(match, seat, socketId) {
    if (seat.socketId !== socketId) return false;
    seat.socketId = null;
    seat.disconnectedAt = this.now();
    if (match.seats.every((other) => !other.socketId)) match.emptySince = this.now();
    return true;
  }

  start(match, seat) {
    if (match.status !== 'lobby') throw new MatchError('started', 'This match has already started.');
    if (seat.id !== match.hostId) throw new MatchError('not-host', 'Only the host can start the game.');
    if (match.seats.length < MIN_PLAYERS) {
      throw new MatchError('not-enough-players', `You need at least ${MIN_PLAYERS} players to start.`);
    }
    match.status = 'started';
    match.game = new Game(match.seats.map((player) => player.id), {
      words: this.words,
      rng: this.rng,
      now: this.now(),
    });
  }

  leave(match, seat) {
    if (match.status !== 'lobby') {
      throw new MatchError('started', 'You can only leave before the game starts.');
    }
    this.removeSeat(match, seat);
  }

  // Removes lobby players who have been gone too long, and deletes matches
  // nobody has been connected to for a long time. Returns the matches that
  // changed and still exist, so their players can be told.
  sweep() {
    const now = this.now();
    const changed = [];
    for (const match of this.matches.values()) {
      if (match.emptySince !== null && now - match.emptySince >= this.idleMatchMs) {
        this.matches.delete(match.code);
        continue;
      }
      if (match.status !== 'lobby') continue;
      const gone = match.seats.filter(
        (seat) => !seat.socketId && now - seat.disconnectedAt >= this.lobbyGraceMs,
      );
      if (gone.length === 0) continue;
      for (const seat of gone) this.removeSeat(match, seat);
      if (this.matches.has(match.code)) changed.push(match);
    }
    return changed;
  }

  // What one player is allowed to see. Seat keys never leave the server.
  view(match, seat) {
    return {
      code: match.code,
      status: match.status,
      youId: seat.id,
      hostId: match.hostId,
      minPlayers: MIN_PLAYERS,
      maxPlayers: MAX_PLAYERS,
      players: match.seats.map((player) => ({
        id: player.id,
        name: player.name,
        avatar: player.avatar,
        connected: player.socketId !== null,
      })),
      game: match.game ? gameView(match.game, seat.id, this.now()) : null,
    };
  }

  newCode() {
    let code;
    do {
      code = Array.from({ length: CODE_LENGTH }, () => CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)]).join('');
    } while (this.matches.has(code));
    return code;
  }

  addSeat(match, name) {
    const usedAvatars = new Set(match.seats.map((seat) => seat.avatar));
    const seat = {
      id: String(match.nextSeatId++),
      key: crypto.randomUUID(),
      name,
      avatar: [...Array(AVATAR_COUNT).keys()].find((index) => !usedAvatars.has(index)) ?? 0,
      socketId: null,
      disconnectedAt: this.now(),
    };
    match.seats.push(seat);
    return seat;
  }

  removeSeat(match, seat) {
    match.seats = match.seats.filter((other) => other !== seat);
    if (match.seats.length === 0) {
      this.matches.delete(match.code);
      return;
    }
    if (match.hostId === seat.id) {
      const nextHost = match.seats.find((other) => other.socketId) ?? match.seats[0];
      match.hostId = nextHost.id;
    }
  }
}

module.exports = { MatchRegistry, MatchError, MIN_PLAYERS, MAX_PLAYERS, MAX_NAME_LENGTH, CODE_ALPHABET };
