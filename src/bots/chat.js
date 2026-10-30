'use strict';

const { vocabularies } = require('./vocabulary');
const LINES = require('./lines');

// Bot chat: what bots say, and when. Each personality's lines are in
// src/bots/lines/, grouped by situation. Bots speak after something happens
// in the game or the lobby, when someone mentions their name, when another
// bot talks, and now and then for no reason at all. Cooldowns (per bot, and
// one shared by all the bots in a match) keep them from drowning out people.

// How likely a bot is to speak in each situation, before its chattiness.
const CHANCE = {
  join: 1, leave: 1, greet: 0.45, gameStart: 0.45, myMove: 0.16, myBluff: 0.25, otherMove: 0.07,
  challenged: 0.7, named: 0.75, caught: 0.75, challenging: 0.6, rightChallenge: 0.55, wrongChallenge: 0.65,
  otherChallenged: 0.22, otherCaught: 0.25, otherNamed: 0.18, roundEnd: 0.18, win: 1, lose: 0.55, lastTile: 0.8,
  tableTalk: 0.12, idle: 0.35,
};
// Situations that matter most win when several bots want to talk at once.
const PRIORITY = {
  win: 9, lose: 6, caught: 8, named: 8, wrongChallenge: 8, challenged: 7, lastTile: 7, rightChallenge: 6, challenging: 6,
  otherChallenged: 5, tableTalk: 5, otherCaught: 4, otherNamed: 4, gameStart: 3, myBluff: 3, myMove: 2, roundEnd: 2, otherMove: 1,
};
const CHATTINESS = { muted: 0, rare: 0.4, normal: 1, chatty: 1.8 };
const COOLDOWN_MS = { muted: Infinity, rare: 30_000, normal: 12_000, chatty: 6_000 };
const SHARED_GAP_MS = 3_500; // between any two bot messages in a match
const MAX_QUEUE_MS = 4_000; // a minor line that would wait longer than this is dropped
const REACTION_CHANCE = { pair: 0.4, same: 0.45, any: 0.1 };
const MAX_REACTION_CHANCE = 0.6;
const IDLE_EVERY_MS = 20_000;
const RECENT_KEPT = 20; // a bot doesn't repeat any of its last 20 lines

const MENTION_KINDS = [
  ['gg', /\b(gg|good game|well played|wp)\b/i],
  ['thanks', /\b(thanks|thank you|thx|ty|cheers)\b/i],
  ['insult', /\b(stupid|idiot|dumb|suck|sucks|trash|garbage|hate|loser|shut up|bad|worst|lame|cheat|cheater)\b/i],
  ['compliment', /\b(good|nice|great|smart|love|best|cool|awesome|genius|clever|amazing|legend)\b/i],
  ['greeting', /\b(hi|hello|hey|hiya|yo|sup|howdy|greetings)\b/i],
];

const spaced = (word) => word.split('').join(' ');

class BotChat {
  // `send(match, seat, text)` posts a message. `timeScale` shortens every wait.
  constructor({ registry, words, send, timeScale = 1, rng = Math.random, now = Date.now }) {
    this.registry = registry;
    this.words = words;
    this.send = send;
    this.timeScale = timeScale;
    this.rng = rng;
    this.now = now;
    this.state = new Map(); // match code → { eventsSeen, gameNumber, lastAt, recent, lastSpoke, idleTimer }
    this.timers = new Set();
  }

  stateFor(match) {
    if (!this.state.has(match.code)) {
      this.state.set(match.code, { eventsSeen: 0, gameNumber: 0, lastAt: -Infinity, recent: new Map(), lastSpoke: new Map(), idleTimer: null });
    }
    return this.state.get(match.code);
  }

  // ---------- Picking a line ----------

  // The lines a bot can say in a situation, given its swearing setting.
  linesFor(bot, situation) {
    const lines = LINES[bot.personality];
    if (!lines) return [];
    const pools = [lines.base?.[situation] ?? []];
    if (bot.swearing !== 'clean') pools.push(lines.mild?.[situation] ?? []);
    if (bot.swearing === 'uncensored') pools.push(lines.strong?.[situation] ?? []);
    return pools.flat();
  }

  pickLine(match, seat, situation, vars) {
    return this.pickFrom(match, seat, this.linesFor(seat.bot, situation), vars);
  }

  // One of these lines, avoiding the bot's recent ones, with placeholders filled in.
  pickFrom(match, seat, options, vars) {
    if (options.length === 0) return null;
    const state = this.stateFor(match);
    const recent = state.recent.get(seat.id) ?? [];
    const fresh = options.filter((line) => !recent.includes(line));
    const pool = fresh.length > 0 ? fresh : options;
    const line = pool[Math.floor(this.rng() * pool.length)];
    state.recent.set(seat.id, [...recent, line].slice(-RECENT_KEPT));
    return line.replace(/\{(\w+)\}/g, (whole, key) => vars[key] ?? whole);
  }

  canSpeak(match, seat, { ignoreCooldown = false } = {}) {
    const bot = seat?.bot;
    if (!bot || bot.chattiness === 'muted' || !LINES[bot.personality]) return false;
    if (ignoreCooldown) return true;
    const last = this.stateFor(match).lastSpoke.get(seat.id) ?? -Infinity;
    return this.now() - last >= COOLDOWN_MS[bot.chattiness];
  }

  // Says a line after a short pause, then maybe lets another bot react.
  // Unless it's important, a line that would have to queue too long behind
  // other bots is dropped, so the chat never piles up.
  say(match, seat, situation, vars = {}, { delay = [600, 1800], react = true, force = false, important = false } = {}) {
    const state = this.stateFor(match);
    const wait = (delay[0] + this.rng() * (delay[1] - delay[0])) * this.timeScale;
    const sharedWait = Math.max(0, state.lastAt + SHARED_GAP_MS * this.timeScale - (this.now() + wait));
    if (!important && sharedWait > MAX_QUEUE_MS * this.timeScale) return false;
    const text = this.pickLine(match, seat, situation, { me: seat.name, ...vars });
    if (!text) return false;
    state.lastAt = this.now() + wait + sharedWait;
    state.lastSpoke.set(seat.id, state.lastAt);
    this.later(wait + sharedWait, () => {
      if (!this.stillHere(match, seat)) return;
      if (!force && seat.bot.chattiness === 'muted') return;
      this.send(match, seat, text);
      if (react) this.maybeReact(match, seat);
    });
    return true;
  }

  later(ms, work) {
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      work();
    }, ms);
    timer.unref?.();
    this.timers.add(timer);
  }

  stillHere(match, seat) {
    return this.registry.matches.get(match.code) === match && match.seats.includes(seat);
  }

  bots(match) {
    return match.seats.filter((seat) => seat.bot);
  }

  // ---------- Reacting to each other ----------

  maybeReact(match, speaker) {
    const others = this.bots(match).filter((seat) => seat !== speaker && this.canSpeak(match, seat));
    const shuffled = others.sort(() => this.rng() - 0.5);
    for (const responder of shuffled) {
      const lines = LINES[responder.bot.personality];
      const same = responder.bot.personality === speaker.bot.personality;
      const pair = lines.pairs?.[speaker.bot.personality];
      const chance = (kind) => Math.min(MAX_REACTION_CHANCE, REACTION_CHANCE[kind] * CHATTINESS[responder.bot.chattiness]);
      const vars = { other: speaker.name };
      if (same && lines.base?.sameBot && this.rng() < chance('same')) {
        return this.say(match, responder, 'sameBot', vars, { delay: [1500, 3000], react: false });
      }
      if (pair && this.rng() < chance('pair')) {
        return this.sayText(match, responder, this.pickFrom(match, responder, pair, vars), [1500, 3000]);
      }
      if (this.rng() < chance('any')) return this.say(match, responder, 'reactBot', vars, { delay: [1500, 3000], react: false });
    }
    return false;
  }

  sayText(match, seat, text, delay) {
    const state = this.stateFor(match);
    const wait = (delay[0] + this.rng() * (delay[1] - delay[0])) * this.timeScale;
    const sharedWait = Math.max(0, state.lastAt + SHARED_GAP_MS * this.timeScale - (this.now() + wait));
    if (!text || sharedWait > MAX_QUEUE_MS * this.timeScale) return false;
    state.lastAt = this.now() + wait + sharedWait;
    state.lastSpoke.set(seat.id, state.lastAt);
    this.later(wait + sharedWait, () => {
      if (this.stillHere(match, seat) && seat.bot.chattiness !== 'muted') this.send(match, seat, text);
    });
    return true;
  }

  // ---------- Things that happen ----------

  // A bot was just added to the lobby.
  botJoined(match, seat) {
    if (!this.canSpeak(match, seat, { ignoreCooldown: true })) return;
    const twin = this.bots(match).find((other) => other !== seat && other.bot.personality === seat.bot.personality);
    this.say(match, seat, 'join', {}, { delay: [400, 1200], react: !twin, important: true });
    if (twin && this.canSpeak(match, twin, { ignoreCooldown: true })) {
      this.say(match, twin, 'sameBot', { other: seat.name }, { delay: [1800, 3000], react: false });
    }
  }

  // A bot is about to be removed: it says goodbye right away.
  botLeaving(match, seat) {
    if (!this.canSpeak(match, seat, { ignoreCooldown: true })) return;
    const text = this.pickLine(match, seat, 'leave', { me: seat.name });
    if (text) this.send(match, seat, text);
  }

  // A person joined the lobby or the match.
  personJoined(match, seat) {
    const greeter = this.randomSpeaker(match, 'greet');
    if (greeter) this.say(match, greeter, 'greet', { player: seat.name });
  }

  randomSpeaker(match, situation, filter = () => true) {
    const candidates = this.bots(match).filter((seat) => filter(seat) && this.canSpeak(match, seat)
      && this.rng() < Math.min(1, (CHANCE[situation] ?? 1) * CHATTINESS[seat.bot.chattiness]));
    return candidates[Math.floor(this.rng() * candidates.length)] ?? null;
  }

  // Someone typed in chat. A bot whose name they mention answers.
  personSaid(match, seat, text) {
    if (seat.bot) return;
    const lower = text.toLowerCase();
    for (const bot of this.bots(match)) {
      const name = bot.name.toLowerCase().replace(/ \d+$/, '');
      const first = name.split(' ').pop();
      const mentioned = [name, first].some((part) => part.length >= 3 && new RegExp(`\\b${part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(lower));
      if (!mentioned || !this.canSpeak(match, bot, { ignoreCooldown: true })) continue;
      const kind = MENTION_KINDS.find(([, pattern]) => pattern.test(text))?.[0] ?? (text.trim().endsWith('?') ? 'question' : 'other');
      const situation = this.linesFor(bot.bot, `mention_${kind}`).length > 0 ? `mention_${kind}` : 'mention_other';
      this.say(match, bot, situation, { player: seat.name }, { delay: [1200, 2600], important: true });
      return;
    }
    // "gg" at the end of a game gets an answer or two.
    if (match.game?.phase.name === 'over' && MENTION_KINDS[0][1].test(text)) {
      const replier = this.randomSpeaker(match, 'lose');
      if (replier) this.say(match, replier, 'mention_gg', { player: seat.name }, { delay: [1200, 2600] });
    }
  }

  // Looks at what happened in the game since last time and lets bots react.
  observe(match) {
    const state = this.stateFor(match);
    const { game } = match;
    if (!game) return;
    if (state.gameNumber !== match.gameNumber) {
      state.gameNumber = match.gameNumber;
      state.eventsSeen = 0;
    }
    const fresh = game.events.slice(state.eventsSeen);
    state.eventsSeen = game.events.length;
    if (fresh.length > 0) this.react(match, fresh);
    this.scheduleIdle(match);
  }

  // Which bots could say something about these events, and the most
  // important one that wants to.
  react(match, events) {
    const name = (id) => this.registry.seatFor(match, id)?.name ?? 'someone';
    const wishes = [];
    const wish = (seat, situation, vars = {}) => wishes.push({ seat, situation, vars });

    for (const event of events) {
      for (const seat of this.bots(match)) {
        const me = seat.id;
        switch (event.type) {
          case 'roundStarted':
            if (event.round === 1) wish(seat, 'gameStart');
            break;
          case 'moved':
            if (event.playerId === me) {
              const player = match.game.players.find((candidate) => candidate.id === me);
              if (player.hand.length === 0) wish(seat, 'lastTile');
              else wish(seat, seat.lastPlanBluff ? 'myBluff' : 'myMove');
            } else {
              wish(seat, 'otherMove', { player: name(event.playerId) });
            }
            break;
          case 'challenged':
            if (event.kind !== 'move') break;
            if (event.challengedId === me) wish(seat, 'challenged', { player: name(event.challengerId) });
            else if (event.challengerId === me) wish(seat, 'challenging', { player: name(event.challengedId) });
            else wish(seat, 'otherChallenged', { player: name(event.challengedId) });
            break;
          case 'challengeSettled': {
            const vars = { player: name(event.challengedId), word: event.word ?? '' };
            if (event.kind === 'lastTile') break;
            if (event.challengedId === me) wish(seat, event.valid ? 'named' : 'caught', { ...vars, player: name(event.challengerId) });
            else if (event.challengerId === me) wish(seat, event.valid ? 'wrongChallenge' : 'rightChallenge', vars);
            else wish(seat, event.valid ? 'otherNamed' : 'otherCaught', vars);
            break;
          }
          case 'startingBoardSettled':
            if (event.namerId === me) wish(seat, 'named', { word: event.word, player: name(event.starterId) });
            else wish(seat, 'otherNamed', { word: event.word, player: name(event.namerId) });
            break;
          case 'roundEnding':
            wish(seat, 'roundEnd', { player: name(event.moverId) });
            break;
          case 'gameOver':
            if (event.winnerId === me) wish(seat, 'win');
            else wish(seat, 'lose', { player: name(event.winnerId) });
            break;
          default:
            break;
        }
      }
    }

    // Encouraging bots sometimes say a word that fits, as someone's turn starts.
    const last = events.at(-1);
    if (['moved', 'roundStarted', 'challenged'].includes(last?.type) && match.game.phase.name !== 'over') {
      for (const seat of this.bots(match)) {
        if (!LINES[seat.bot.personality]?.base?.tableTalk) continue;
        const word = this.tableWord(match, seat);
        if (word) wish(seat, 'tableTalk', { word: spaced(word), player: name(match.game.phase.challengedId ?? match.game.phase.playerId) });
      }
    }

    const ready = wishes.filter(({ seat, situation }) => this.canSpeak(match, seat)
      && this.linesFor(seat.bot, situation).length > 0
      && this.rng() < Math.min(1, CHANCE[situation] * CHATTINESS[seat.bot.chattiness]));
    if (ready.length === 0) return;
    const top = Math.max(...ready.map(({ situation }) => PRIORITY[situation] ?? 0));
    const best = ready.filter(({ situation }) => (PRIORITY[situation] ?? 0) === top);
    const choice = best[Math.floor(this.rng() * best.length)];
    // A game's end gets a word from everyone who wants to say one.
    const speakers = choice.situation === 'win' || choice.situation === 'lose'
      ? ready.filter(({ situation }) => situation === 'win' || situation === 'lose').slice(0, 2)
      : [choice];
    const important = choice.situation === 'win' || choice.situation === 'lose';
    speakers.forEach(({ seat, situation, vars }, i) => this.say(match, seat, situation, vars, { delay: [700 + i * 1500, 1800 + i * 1500], react: i === 0, important }));
  }

  // A word the bot "spots" for the current board: one it knows, or for an
  // Idiot, any old letters.
  tableWord(match, seat) {
    const pattern = match.game.pattern();
    if (seat.bot.difficulty === 'idiot') {
      return pattern.replace(/_/g, () => 'QZXJKVW'[Math.floor(this.rng() * 7)]);
    }
    return vocabularies(this.words)[seat.bot.difficulty].word(pattern, this.rng);
  }

  // Quiet moments: now and then a bot says something, often off topic.
  // Annoying bots get salty when losing, Unsure bots braver when winning.
  scheduleIdle(match) {
    const state = this.stateFor(match);
    if (state.idleTimer || this.bots(match).length === 0) return;
    const wait = IDLE_EVERY_MS * (0.7 + this.rng() * 0.6) * this.timeScale;
    state.idleTimer = setTimeout(() => {
      state.idleTimer = null;
      if (this.registry.matches.get(match.code) !== match || this.bots(match).length === 0) return;
      const inLobby = match.status === 'lobby';
      const speaker = this.randomSpeaker(match, 'idle', () => !inLobby || this.rng() < 0.4);
      if (speaker && this.now() - state.lastAt > SHARED_GAP_MS * 2 * this.timeScale) {
        this.say(match, speaker, this.moodFor(match, speaker), {}, { delay: [0, 500] });
      }
      this.scheduleIdle(match);
    }, wait);
    state.idleTimer.unref?.();
  }

  moodFor(match, seat) {
    const players = match.game?.players.filter((player) => !player.ejected) ?? [];
    const me = players.find((player) => player.id === seat.id);
    if (!me || match.status !== 'started' || this.rng() < 0.4) return 'idle';
    const most = Math.max(...players.map((player) => player.hand.length));
    const fewest = Math.min(...players.map((player) => player.hand.length));
    if (this.linesFor(seat.bot, 'salty').length > 0 && me.hand.length === most && most > fewest) return 'salty';
    if (this.linesFor(seat.bot, 'confident').length > 0 && me.hand.length === fewest && most > fewest) return 'confident';
    return 'idle';
  }

  forget(match) {
    const state = this.state.get(match.code);
    if (state?.idleTimer) clearTimeout(state.idleTimer);
    this.state.delete(match.code);
  }

  stop() {
    for (const timer of this.timers) clearTimeout(timer);
    this.timers.clear();
    for (const state of this.state.values()) clearTimeout(state.idleTimer);
    this.state.clear();
  }
}

module.exports = { BotChat, CHANCE, COOLDOWN_MS };
