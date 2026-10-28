'use strict';

const crypto = require('node:crypto');
const { Game } = require('./game/game');
const { gameView } = require('./game/view');
const { ICON_COLORS, isValidIcon } = require('../public/icons');

const MIN_PLAYERS = 2;
const MAX_PLAYERS = 6;
const MAX_SPECTATORS = 20;
const MAX_NAME_LENGTH = 16;
const CODE_LENGTH = 6;
// No I, L, O, 0 or 1, so codes are easy to read out loud and type.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CHAT_KEPT = 100;
const CHAT_MAX_LENGTH = 500;
const CHAT_GAP_MS = 1_000;

// An expected problem with a request, such as a full match or a taken name.
// `code` is for the browser's logic; `message` is shown to the player.
class MatchError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

// Removes control characters and runs of spaces.
const tidy = (raw) => (typeof raw === 'string'
  ? raw.replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim()
  : '');

function cleanName(raw) {
  const name = tidy(raw);
  if (name.length === 0) throw new MatchError('bad-name', 'Please enter a name.');
  if (name.length > MAX_NAME_LENGTH) {
    throw new MatchError('bad-name', `Names can be at most ${MAX_NAME_LENGTH} characters.`);
  }
  return name;
}

function cleanCode(raw) {
  return typeof raw === 'string' ? raw.trim().toUpperCase() : '';
}

// A chosen icon, or the default: your letter tile on a random color.
function cleanIcon(raw) {
  if (!isValidIcon(raw)) return { color: crypto.randomInt(ICON_COLORS.length), kind: 'letter' };
  return raw.kind === 'letter' ? { color: raw.color, kind: 'letter' } : { color: raw.color, kind: raw.kind, value: raw.value };
}

// Characters as people count them: an emoji or an accented letter is one.
const graphemes = new Intl.Segmenter('en', { granularity: 'grapheme' });
const characterCount = (text) => [...graphemes.segment(text)].length;

const isPlayer = (seat) => seat.role === 'player';
const playersOf = (match) => match.seats.filter(isPlayer);
const spectatorsOf = (match) => match.seats.filter((seat) => !isPlayer(seat));

// Keeps every match in memory. Knows nothing about the network: the server
// tells it which connection (socket) sits in which seat. A seat is either a
// player's or a spectator's: spectators watch and chat, but don't play.
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

  createMatch(hostName, icon) {
    const name = cleanName(hostName);
    const match = {
      code: this.newCode(),
      status: 'lobby',
      seats: [],
      hostId: null,
      nextSeatId: 1,
      emptySince: this.now(),
      game: null,
      gameNumber: 0,
      talliedGame: 0,
      chat: [],
      nextMessageId: 1,
    };
    this.matches.set(match.code, match);
    const seat = this.addSeat(match, name, 'player', icon);
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
    const players = playersOf(match).length;
    const spectators = spectatorsOf(match).length;
    return {
      exists: true,
      code: match.code,
      status: match.status,
      players,
      spectators,
      full: players >= MAX_PLAYERS,
      watchersFull: spectators >= MAX_SPECTATORS,
    };
  }

  // Joins as a player while the lobby has room. Once the game has started, or
  // when 6 are already playing, newcomers watch as spectators.
  join(code, rawName, icon) {
    const match = this.find(code);
    const name = cleanName(rawName);
    if (match.seats.some((seat) => seat.name.toLowerCase() === name.toLowerCase())) {
      throw new MatchError('name-taken', 'Someone in this match already has that name.');
    }
    const asPlayer = match.status === 'lobby' && playersOf(match).length < MAX_PLAYERS;
    if (!asPlayer && spectatorsOf(match).length >= MAX_SPECTATORS) {
      throw new MatchError('full', `This match is full: ${MAX_PLAYERS} players and ${MAX_SPECTATORS} watching.`);
    }
    return { match, seat: this.addSeat(match, name, asPlayer ? 'player' : 'spectator', icon) };
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
    if (seat.left) throw new MatchError('left', "You left this game, so you can't rejoin it.");
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

  // Icons can be changed between games, in the lobby.
  setIcon(match, seat, icon) {
    if (match.status !== 'lobby') throw new MatchError('not-lobby', 'You can change your icon between games, in the lobby.');
    if (!isValidIcon(icon)) throw new MatchError('bad-icon', "That icon isn't available.");
    seat.icon = cleanIcon(icon);
  }

  start(match, seat) {
    if (match.status !== 'lobby') throw new MatchError('started', 'This match has already started.');
    if (seat.id !== match.hostId) throw new MatchError('not-host', 'Only the host can start the game.');
    const players = playersOf(match);
    if (players.length < MIN_PLAYERS) {
      throw new MatchError('not-enough-players', `You need at least ${MIN_PLAYERS} players to start.`);
    }
    match.status = 'started';
    match.gameNumber += 1;
    match.endedBy = null;
    match.game = new Game(players.map((player) => player.id), {
      words: this.words,
      rng: this.rng,
      now: this.now(),
    });
  }

  // Counts a finished game's win, once. Called whenever the match changes.
  noteResult(match) {
    const phase = match.game?.phase;
    if (phase?.name !== 'over' || match.talliedGame === match.gameNumber) return;
    match.talliedGame = match.gameNumber;
    const winner = match.seats.find((seat) => seat.id === phase.winnerId);
    if (winner) winner.wins += 1;
  }

  // After a game ends, everyone goes back to the lobby with the same link. New
  // friends can join, and players who have gone are dropped by the lobby sweep.
  playAgain(match) {
    if (match.status !== 'started' || match.game?.phase.name !== 'over') {
      throw new MatchError('not-over', 'The game is still going.');
    }
    this.noteResult(match);
    this.returnToLobby(match);
    match.endedBy = null;
  }

  // The host stops the game: no winner, and everyone goes back to the lobby.
  endGame(match, seat) {
    if (match.status !== 'started') throw new MatchError('not-started', 'There is no game to end.');
    if (seat.id !== match.hostId) throw new MatchError('not-host', 'Only the host can end the game.');
    this.noteResult(match);
    this.returnToLobby(match);
    match.endedBy = seat.name;
  }

  // Players who left the game don't come back to the lobby, and spectators
  // take any free places.
  returnToLobby(match) {
    match.status = 'lobby';
    match.game = null;
    for (const seat of match.seats.filter((other) => other.left)) this.removeSeat(match, seat);
    this.fillPlayerSeats(match);
  }

  // In the lobby, spectators become players while there's room, in the order they came.
  fillPlayerSeats(match) {
    if (match.status !== 'lobby') return;
    for (const seat of spectatorsOf(match)) {
      if (playersOf(match).length >= MAX_PLAYERS) break;
      seat.role = 'player';
    }
    if (!playersOf(match).some((seat) => seat.id === match.hostId) && match.seats.length > 0) this.passHost(match);
  }

  // Spectators, and anyone in the lobby or after the game is over, give up
  // their seat. In the middle of a game, a player leaves the game (their tiles
  // are discarded face up) and can't rejoin it; their name stays on screen
  // until the next lobby.
  leave(match, seat) {
    if (!isPlayer(seat) || match.status === 'lobby' || match.game.phase.name === 'over') {
      this.removeSeat(match, seat);
      return;
    }
    const player = match.game.players.find((candidate) => candidate.id === seat.id);
    if (player && !player.ejected) match.game.leave(seat.id, this.now());
    this.detach(match, seat, seat.socketId);
    seat.left = true;
    if (match.hostId === seat.id) this.passHost(match);
  }

  // The host removes someone: a player while in the lobby, or a spectator at any time.
  remove(match, host, seatId) {
    if (host.id !== match.hostId) throw new MatchError('not-host', 'Only the host can remove people.');
    const seat = match.seats.find((candidate) => candidate.id === seatId);
    if (!seat || seat === host) throw new MatchError('bad-seat', "That person isn't in this match.");
    if (isPlayer(seat) && match.status !== 'lobby') {
      throw new MatchError('in-game', 'Players can only be removed in the lobby. You can end the game first.');
    }
    this.removeSeat(match, seat);
    return seat;
  }

  // The host hands the role to another player, for example before leaving.
  makeHost(match, host, seatId) {
    if (host.id !== match.hostId) throw new MatchError('not-host', 'Only the host can choose a new host.');
    const seat = match.seats.find((candidate) => candidate.id === seatId);
    if (!seat || seat === host || !isPlayer(seat) || seat.left) {
      throw new MatchError('bad-seat', 'Only another player can become the host.');
    }
    match.hostId = seat.id;
  }

  // A short chat message from anyone in the match, players and spectators
  // alike. Everyone sees the last 100.
  sendChat(match, seat, raw) {
    const text = tidy(raw);
    if (text.length === 0) throw new MatchError('empty-chat', 'Type a message or pick an emoji first.');
    if (characterCount(text) > CHAT_MAX_LENGTH) {
      throw new MatchError('long-chat', `Messages can be at most ${CHAT_MAX_LENGTH} characters.`);
    }
    const now = this.now();
    if (now - seat.lastChatAt < CHAT_GAP_MS) throw new MatchError('too-fast', 'Slow down: one message a second.');
    seat.lastChatAt = now;
    const message = {
      id: match.nextMessageId++,
      seatId: seat.id,
      name: seat.name,
      icon: seat.icon,
      watching: !isPlayer(seat),
      text,
      at: now,
    };
    match.chat.push(message);
    if (match.chat.length > CHAT_KEPT) match.chat.splice(0, match.chat.length - CHAT_KEPT);
    return message;
  }

  // Removes people who have been gone too long (in the lobby, or spectators
  // at any time), and deletes matches nobody has been connected to for a long
  // time. Returns the matches that changed and still exist, so their players
  // can be told.
  sweep() {
    const now = this.now();
    const changed = [];
    for (const match of this.matches.values()) {
      if (match.emptySince !== null && now - match.emptySince >= this.idleMatchMs) {
        this.matches.delete(match.code);
        continue;
      }
      const gone = match.seats.filter((seat) => (match.status === 'lobby' || !isPlayer(seat))
        && !seat.socketId && now - seat.disconnectedAt >= this.lobbyGraceMs);
      if (gone.length === 0) continue;
      for (const seat of gone) this.removeSeat(match, seat);
      if (this.matches.has(match.code)) changed.push(match);
    }
    return changed;
  }

  // What one person is allowed to see. Seat keys never leave the server.
  view(match, seat) {
    const seatView = (other) => ({
      id: other.id,
      name: other.name,
      icon: other.icon,
      connected: other.socketId !== null,
      left: other.left,
      wins: other.wins,
    });
    return {
      code: match.code,
      status: match.status,
      youId: seat.id,
      youWatch: !isPlayer(seat),
      hostId: match.hostId,
      minPlayers: MIN_PLAYERS,
      maxPlayers: MAX_PLAYERS,
      maxSpectators: MAX_SPECTATORS,
      players: playersOf(match).map(seatView),
      spectators: spectatorsOf(match).map(seatView),
      gameNumber: match.gameNumber,
      endedBy: match.endedBy ?? null,
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

  addSeat(match, name, role, icon) {
    const seat = {
      id: String(match.nextSeatId++),
      key: crypto.randomUUID(),
      name,
      role,
      icon: cleanIcon(icon),
      wins: 0,
      socketId: null,
      disconnectedAt: this.now(),
      left: false,
      lastChatAt: -Infinity,
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
    this.fillPlayerSeats(match);
    if (match.hostId === seat.id) this.passHost(match);
  }

  // The host role goes to the first player still here, preferring one who is connected.
  passHost(match) {
    const staying = playersOf(match).filter((seat) => !seat.left);
    const nextHost = staying.find((seat) => seat.socketId) ?? staying[0] ?? playersOf(match)[0] ?? match.seats[0];
    match.hostId = nextHost.id;
  }
}

module.exports = {
  MatchRegistry,
  MatchError,
  MIN_PLAYERS,
  MAX_PLAYERS,
  MAX_SPECTATORS,
  MAX_NAME_LENGTH,
  CHAT_MAX_LENGTH,
  CHAT_KEPT,
  CODE_ALPHABET,
};
