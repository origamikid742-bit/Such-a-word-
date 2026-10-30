'use strict';

const { decide } = require('./brain');
const { vocabularies } = require('./vocabulary');

// Runs the bots in every game. After each change to a match, each bot looks
// at the game and plans its next action (src/bots/brain.js), then waits a
// moment before doing it, so people can follow along. If the game moves on
// while a bot waits, it plans again.
class BotDriver {
  // `act(match, seat, plan)` carries out a plan. `timeScale` shortens every
  // wait (tests use a small one).
  constructor({ registry, words, act, timeScale = 1, rng = Math.random }) {
    this.registry = registry;
    this.words = words;
    this.act = act;
    this.timeScale = timeScale;
    this.rng = rng;
    this.pending = new Map(); // "code:seatId" → { match, key, timer }
  }

  // What the game is waiting for right now. A plan is only carried out if
  // this hasn't changed while the bot was waiting.
  static situation(match) {
    const { game } = match;
    const { phase } = game;
    const answered = (phase.passed ?? phase.done ?? []).length;
    return `${match.gameNumber}|${game.events.length}|${phase.name}|${phase.deadline ?? ''}|${answered}`;
  }

  update(match) {
    if (match.status !== 'started' || !match.game || this.registry.matches.get(match.code) !== match) {
      this.forget(match);
      return;
    }
    const key = BotDriver.situation(match);
    const vocab = vocabularies(this.words);
    for (const seat of match.seats) {
      if (!seat.bot) continue;
      const id = `${match.code}:${seat.id}`;
      const pending = this.pending.get(id);
      if (pending?.key === key) continue;
      if (pending) clearTimeout(pending.timer);
      this.pending.delete(id);
      const plan = decide(match.game, seat.id, seat.bot, vocab, this.rng, this.context(match, seat));
      if (!plan) {
        this.pending.set(id, { match, key, timer: null });
        continue;
      }
      const timer = setTimeout(() => this.fire(match, seat, key, plan), Math.round(plan.delay * this.timeScale));
      timer.unref?.();
      this.pending.set(id, { match, key, timer, plan });
    }
  }

  fire(match, seat, key, plan) {
    const id = `${match.code}:${seat.id}`;
    this.pending.delete(id);
    if (this.registry.matches.get(match.code) !== match || match.status !== 'started' || !match.seats.includes(seat)) return;
    if (BotDriver.situation(match) !== key) {
      this.update(match);
      return;
    }
    this.act(match, seat, plan);
  }

  // What a bot remembers: the host, who last challenged it, and whether it
  // was challenged this round (some personalities hold grudges).
  context(match, seat) {
    const memory = { lastChallengerId: null, challengedThisRound: false };
    let thisRound = true;
    const { events } = match.game;
    for (let i = events.length - 1; i >= 0; i--) {
      const event = events[i];
      if (event.type === 'roundStarted') thisRound = false;
      if (event.type === 'challenged' && event.kind === 'move' && event.challengedId === seat.id) {
        if (memory.lastChallengerId === null) memory.lastChallengerId = event.challengerId;
        if (thisRound) memory.challengedThisRound = true;
      }
      if (memory.lastChallengerId !== null && !thisRound) break;
    }
    return { hostId: match.hostId, memory };
  }

  // Stops every waiting bot in this match (the game ended or the match is gone).
  forget(match) {
    for (const [id, pending] of this.pending) {
      if (!id.startsWith(`${match.code}:`)) continue;
      clearTimeout(pending.timer);
      this.pending.delete(id);
    }
  }

  stop() {
    for (const pending of this.pending.values()) clearTimeout(pending.timer);
    this.pending.clear();
  }
}

module.exports = { BotDriver };
