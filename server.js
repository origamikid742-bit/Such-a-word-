'use strict';

const http = require('node:http');
const path = require('node:path');
const express = require('express');
const { Server } = require('socket.io');
const { MatchRegistry, MatchError } = require('./src/matches');
const { GameError } = require('./src/game/game');
const { WordList } = require('./src/game/words');

const PUBLIC_DIR = path.join(__dirname, 'public');
const SWEEP_EVERY_MS = 5_000;

// The word list takes a moment to load, so every server shares one copy.
let sharedWords = null;
function loadWords() {
  sharedWords ??= WordList.load();
  return sharedWords;
}

function createServer(options = {}) {
  const registry = new MatchRegistry({ words: loadWords(), ...options });
  const app = express();
  app.disable('x-powered-by');
  app.use(express.static(PUBLIC_DIR));
  // Every match link loads the same page. The page reads the match code from the address.
  app.get('/m/:code', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'index.html')));
  // Lets the hosting service check that the server is up.
  app.get('/healthz', (req, res) => res.send('ok'));

  const httpServer = http.createServer(app);
  const io = new Server(httpServer);

  // Sends everyone connected their own view of the match. A game that just
  // ended has its win counted first.
  function broadcast(match) {
    registry.noteResult(match);
    for (const seat of match.seats) {
      if (seat.socketId) io.to(seat.socketId).emit('state', registry.view(match, seat));
    }
  }

  function sendToMatch(match, event, data) {
    for (const seat of match.seats) {
      if (seat.socketId) io.to(seat.socketId).emit(event, data);
    }
  }

  // One timer per match, set for the game's next deadline (a turn clock, a
  // challenge, the gap between rounds). When it fires, the rules catch up.
  const timers = new Map();

  function scheduleTimer(match) {
    clearTimeout(timers.get(match.code));
    timers.delete(match.code);
    const deadline = match.game?.deadline() ?? null;
    if (deadline === null) return;
    const timer = setTimeout(() => {
      timers.delete(match.code);
      if (registry.matches.get(match.code) !== match) return;
      match.game.advanceTime(registry.now());
      broadcast(match);
      scheduleTimer(match);
    }, Math.max(0, deadline - registry.now()) + 10);
    timer.unref();
    timers.set(match.code, timer);
  }

  io.on('connection', (socket) => {
    socket.data = {};

    // The seat this connection currently holds, if any.
    function currentSeat() {
      const { code, seatId } = socket.data;
      const match = code && registry.matches.get(code);
      const seat = match && match.seats.find((candidate) => candidate.id === seatId);
      return seat && seat.socketId === socket.id ? { match, seat } : null;
    }

    function requireSeat() {
      const current = currentSeat();
      if (!current) throw new MatchError('no-seat', 'You are not in a match.');
      return current;
    }

    // Takes this connection out of its seat, as if the tab had closed.
    function releaseSeat() {
      const current = currentSeat();
      socket.data = {};
      if (current && registry.detach(current.match, current.seat, socket.id)) broadcast(current.match);
    }

    // Puts this connection in a seat and sends it the chat so far. A tab that
    // held the seat before is told it moved.
    function takeSeat(match, seat) {
      const current = currentSeat();
      if (current && current.seat !== seat) releaseSeat();
      const replacedId = registry.attach(match, seat, socket.id);
      socket.data = { code: match.code, seatId: seat.id };
      const replaced = replacedId && io.sockets.sockets.get(replacedId);
      if (replaced) {
        replaced.data = {};
        replaced.emit('replaced');
      }
      socket.emit('chatHistory', { code: match.code, messages: match.chat });
    }

    // Runs one request from the browser, answers it, then sends the new state
    // to everyone in the match that changed.
    function handle(event, work) {
      socket.on(event, (payload, ack) => {
        const answer = typeof ack === 'function' ? ack : () => {};
        let outcome;
        try {
          outcome = work(payload ?? {});
        } catch (err) {
          const expected = err instanceof MatchError || err instanceof GameError;
          if (!expected) console.error(`Error handling ${event}:`, err);
          const problem = expected ? err : new MatchError('server-error', 'Something went wrong. Please try again.');
          answer({ ok: false, error: problem.code, message: problem.message, ...problem.details });
          return;
        }
        answer({ ok: true, ...outcome.reply });
        if (outcome.changed) broadcast(outcome.changed);
      });
    }

    handle('createMatch', ({ name, icon }) => {
      const { match, seat } = registry.createMatch(name, icon);
      takeSeat(match, seat);
      return { reply: { code: match.code, seatKey: seat.key }, changed: match };
    });

    handle('matchInfo', ({ code }) => ({ reply: registry.info(code) }));

    handle('joinMatch', ({ code, name, icon }) => {
      const { match, seat } = registry.join(code, name, icon);
      takeSeat(match, seat);
      return { reply: { seatKey: seat.key, watching: seat.role === 'spectator' }, changed: match };
    });

    handle('rejoin', ({ code, seatKey, takeover }) => {
      const { match, seat } = registry.rejoin(code, seatKey, { socketId: socket.id, takeover: takeover === true });
      takeSeat(match, seat);
      return { reply: {}, changed: match };
    });

    handle('startMatch', () => {
      const { match, seat } = requireSeat();
      registry.start(match, seat);
      scheduleTimer(match);
      return { reply: {}, changed: match };
    });

    // A game action from this seat's player. Time is brought up to date first,
    // so a move that arrives after the clock ran out counts as too late. A
    // quiet action only sends out the game when time moving on changed it.
    function handleGame(event, act, { quiet = false } = {}) {
      handle(event, (payload) => {
        const { match, seat } = requireSeat();
        if (!match.game) throw new MatchError('not-started', 'The game has not started yet.');
        const now = registry.now();
        const eventsBefore = match.game.events.length;
        match.game.advanceTime(now);
        try {
          const reply = act(match.game, seat.id, payload, now) ?? {};
          const changed = !quiet || match.game.events.length !== eventsBefore;
          return { reply, changed: changed ? match : null };
        } catch (err) {
          if (match.game.events.length !== eventsBefore) broadcast(match);
          throw err;
        } finally {
          scheduleTimer(match);
        }
      });
    }

    handleGame('move', (game, playerId, { move }, now) => { game.move(playerId, move, now); });
    handleGame('challenge', (game, playerId, payload, now) => { game.challengeMove(playerId, now); });
    handleGame('challengeStartingBoard', (game, playerId, payload, now) => { game.challengeStartingBoard(playerId, now); });
    handleGame('nameWord', (game, playerId, { word }, now) => {
      const result = game.nameWord(playerId, word, now);
      return { accepted: result.ok, word: result.word, reason: result.ok ? null : result.reason };
    });
    handleGame('giveUp', (game, playerId, payload, now) => { game.giveUp(playerId, now); });
    handleGame('pass', (game, playerId, payload, now) => { game.pass(playerId, now); });
    handleGame('tradeTile', (game, playerId, { tileId }, now) => { game.tradeTile(playerId, tileId, now); });
    handleGame('keepTiles', (game, playerId, payload, now) => { game.keepTiles(playerId, now); });
    // The move this player has lined up, kept privately in case their clock
    // runs out. Nobody else is told about it.
    handleGame('lineUp', (game, playerId, { move }) => { game.lineUp(playerId, move ?? null); }, { quiet: true });

    handle('playAgain', () => {
      const { match } = requireSeat();
      registry.playAgain(match);
      scheduleTimer(match);
      return { reply: {}, changed: match };
    });

    handle('endGame', () => {
      const { match, seat } = requireSeat();
      registry.endGame(match, seat);
      scheduleTimer(match);
      return { reply: {}, changed: match };
    });

    handle('leaveMatch', () => {
      const { match, seat } = requireSeat();
      match.game?.advanceTime(registry.now());
      registry.leave(match, seat);
      socket.data = {};
      scheduleTimer(match);
      return { reply: {}, changed: registry.matches.has(match.code) ? match : null };
    });

    handle('setIcon', ({ icon }) => {
      const { match, seat } = requireSeat();
      registry.setIcon(match, seat, icon);
      return { reply: {}, changed: match };
    });

    // A chat message goes to everyone in the match straight away.
    handle('sendChat', ({ text }) => {
      const { match, seat } = requireSeat();
      sendToMatch(match, 'chat', registry.sendChat(match, seat, text));
      return { reply: {} };
    });

    // The host removes someone. Their tab is told, and stops following the match.
    handle('removeSeat', ({ seatId }) => {
      const { match, seat } = requireSeat();
      const removed = registry.remove(match, seat, seatId);
      const removedSocket = removed.socketId && io.sockets.sockets.get(removed.socketId);
      if (removedSocket) {
        removedSocket.data = {};
        removedSocket.emit('removed');
      }
      return { reply: {}, changed: match };
    });

    handle('makeHost', ({ seatId }) => {
      const { match, seat } = requireSeat();
      registry.makeHost(match, seat, seatId);
      return { reply: {}, changed: match };
    });

    socket.on('disconnect', releaseSeat);
  });

  function sweep() {
    for (const match of registry.sweep()) broadcast(match);
    for (const [code, timer] of timers) {
      if (registry.matches.has(code)) continue;
      clearTimeout(timer);
      timers.delete(code);
    }
  }
  const sweepTimer = setInterval(sweep, SWEEP_EVERY_MS);
  sweepTimer.unref();

  function close() {
    clearInterval(sweepTimer);
    for (const timer of timers.values()) clearTimeout(timer);
    timers.clear();
    return new Promise((resolve) => io.close(() => resolve()));
  }

  return { app, httpServer, io, registry, sweep, scheduleTimer, close };
}

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  // Render tells the server its public address. Locally, it's this computer.
  const address = process.env.RENDER_EXTERNAL_URL || `http://localhost:${port}`;
  createServer().httpServer.listen(port, () => {
    console.log(`Such A Word is running at ${address}`);
  });
}

module.exports = { createServer };
