'use strict';

const { isLetter, isBlank, isRemoval, patternOf } = require('../game/tiles');
const { BOT_PERSONALITIES } = require('../../public/bot-personalities');

// How each difficulty plays. A bot judges boards with its own vocabulary
// (src/bots/vocabulary.js), so a weaker bot thinks fewer boards are valid.
//   noise          randomness added to each move's score
//   randomMove     chance of a completely random legal move
//   mistakes       chance of thinking a board no word fits is fine
//   bluffCost      how much it dislikes leaving a board it knows no word for
//   bluffMood      chance it bluffs on purpose this turn, when that gets rid of a tile
//   challengeSure  chance it challenges a board it knows no word for
//   challengeWild  chance it challenges a board it does know a word for
//   nameMiss       chance it fails to name a word it knows
//   obscureBait    preference for boards only rare words fit, to tempt wrong challenges
const DIFFICULTY = {
  idiot: { noise: 6, randomMove: 0.7, mistakes: 0.5, bluffCost: 1, bluffMood: 0.5, challengeSure: 0.3, challengeWild: 0.15, nameMiss: 0.5, obscureBait: 0 },
  easy: { noise: 2.5, randomMove: 0.04, mistakes: 0.12, bluffCost: 4, bluffMood: 0.04, challengeSure: 0.35, challengeWild: 0.02, nameMiss: 0.1, obscureBait: 0 },
  medium: { noise: 1.5, randomMove: 0.01, mistakes: 0.05, bluffCost: 5, bluffMood: 0.07, challengeSure: 0.5, challengeWild: 0, nameMiss: 0.03, obscureBait: 0 },
  hard: { noise: 1, randomMove: 0, mistakes: 0.02, bluffCost: 5, bluffMood: 0.14, challengeSure: 0.72, challengeWild: 0, nameMiss: 0, obscureBait: 0.3 },
  expert: { noise: 0.2, randomMove: 0, mistakes: 0, bluffCost: 12, bluffMood: 0, challengeSure: 0.97, challengeWild: 0, nameMiss: 0, obscureBait: 0.8 },
};

// How many milliseconds a bot waits before each kind of action.
const DELAYS = {
  move: [1000, 2000],
  openingChallenge: [900, 1600],
  challenge: [700, 1500],
  nameWord: [1700, 2800],
  giveUp: [1500, 2500],
  pass: [900, 1800],
  quickPass: [450, 900],
  trade: [900, 1800],
};

const SHRINK = 3; // the value of getting rid of a tile
const VALID = 5; // the value of a board it knows a word for
const MOVE_LIMIT = 3000; // moves looked at per turn, so a huge board can't slow the server
const TIME_LIMIT_MS = 60;

// A personality's nudges, made smaller for Expert so it stays practically unbeatable.
function nudgesFor(personality, difficulty) {
  const nudges = { challenge: 1, bluff: 1, safe: 0, trade: 1, randomMove: 0, contrarian: 0, blankLove: 0, swapDislike: 0, hostShy: 1, revenge: 1, grudge: 1, hoardBlanks: 0, mistakes: 1, quickPass: false, pace: 1, ...BOT_PERSONALITIES[personality]?.nudges };
  if (difficulty !== 'expert') return nudges;
  const soften = (value, neutral) => neutral + (value - neutral) * 0.4;
  for (const key of ['challenge', 'bluff', 'trade', 'hostShy', 'revenge', 'grudge', 'mistakes']) nudges[key] = soften(nudges[key], 1);
  for (const key of ['safe', 'randomMove', 'contrarian', 'blankLove', 'swapDislike', 'hoardBlanks']) nudges[key] = soften(nudges[key], 0);
  return nudges;
}

const between = ([low, high], rng) => low + Math.floor(rng() * (high - low));

// ---------- Moves ----------

const swapped = (pattern, a, b) => {
  const letters = [...pattern];
  [letters[a], letters[b]] = [letters[b], letters[a]];
  return letters.join('');
};
const replaced = (pattern, index, letter) => pattern.slice(0, index) + letter + pattern.slice(index + 1);

// Every legal move this player could make, with the board it would leave.
// `shrinks` says whether it gets rid of a tile from their hand.
function legalMoves(game, player) {
  const board = game.board;
  const pattern = patternOf(board);
  const moves = [];
  const seen = new Set();
  const add = (move, after, shrinks) => {
    const key = `${move.type}:${after}`;
    if (seen.has(key)) return;
    seen.add(key);
    moves.push({ move, pattern: after, shrinks });
  };

  // One tile of each kind from the hand is enough: two Es make the same moves.
  const firstOfType = new Map();
  for (const tile of player.hand) if (!firstOfType.has(tile.type)) firstOfType.set(tile.type, tile);
  const handLetters = [...firstOfType.values()].filter(isLetter);
  const blank = firstOfType.get('blank');
  const removal = firstOfType.get('removal');

  for (let a = 0; a < board.length; a++) {
    for (let b = a + 1; b < board.length; b++) {
      if (board[a].type !== board[b].type) add({ type: 'swap', a, b }, swapped(pattern, a, b), false);
    }
  }
  board.forEach((target, index) => {
    if (isBlank(target)) {
      for (const tile of handLetters) add({ type: 'playLetter', tileId: tile.id, index }, replaced(pattern, index, tile.type), true);
    } else {
      for (const tile of handLetters) {
        if (tile.type !== target.type) add({ type: 'replace', tileId: tile.id, index }, replaced(pattern, index, tile.type), false);
      }
      if (removal && board.length > 1) add({ type: 'remove', tileId: removal.id, index }, pattern.slice(0, index) + pattern.slice(index + 1), true);
    }
  });
  if (blank) {
    for (let index = 0; index <= board.length; index++) {
      add({ type: 'playBlank', tileId: blank.id, index }, `${pattern.slice(0, index)}_${pattern.slice(index)}`, true);
    }
  }
  return moves;
}

// Picks this bot's move for its turn. Returns { move, bluff } where bluff
// means the bot doesn't know a word for the board it leaves.
function chooseMove(game, player, bot, vocabularies, rng) {
  const level = DIFFICULTY[bot.difficulty];
  const nudges = nudgesFor(bot.personality, bot.difficulty);
  const vocab = vocabularies[bot.difficulty];
  const moves = legalMoves(game, player);
  if (moves.length === 0) return null;
  const known = (pattern) => vocab.fits(pattern);

  if (rng() < level.randomMove + nudges.randomMove) {
    const pick = moves[Math.floor(rng() * moves.length)];
    return { move: pick.move, bluff: !known(pick.pattern) };
  }

  const lastTile = player.hand.length === 1;
  const bluffing = rng() < level.bluffMood * nudges.bluff;
  const bluffCost = bluffing ? -2.5 : level.bluffCost / nudges.bluff;
  const started = Date.now();
  const scored = [];
  for (const candidate of moves.slice(0, MOVE_LIMIT)) {
    if (scored.length > 50 && Date.now() - started > TIME_LIMIT_MS) break;
    const fits = known(candidate.pattern) || rng() < level.mistakes * nudges.mistakes * 0.2;
    let score = candidate.shrinks ? SHRINK : 0;
    if (fits) score += VALID + nudges.safe * 3;
    else score -= bluffCost + (candidate.shrinks ? nudges.safe * 2 : 0);
    // Playing your last tile means naming a word for it yourself, so never bluff it.
    if (lastTile && candidate.shrinks) score += fits ? 20 : -15;
    if (fits && level.obscureBait > 0 && vocabularies.medium.count(candidate.pattern, 1) === 0) score += level.obscureBait;
    if (candidate.move.type === 'playBlank') score += nudges.blankLove * 2 - (lastTile ? 0 : nudges.hoardBlanks * 3);
    if (candidate.move.type === 'swap') score -= nudges.swapDislike * 2;
    score += (rng() - 0.5) * 2 * level.noise;
    scored.push({ ...candidate, fits, score });
  }
  scored.sort((a, b) => b.score - a.score);
  const pick = scored.length > 1 && rng() < nudges.contrarian ? scored[1] : scored[0];
  return { move: pick.move, bluff: !known(pick.pattern) };
}

// ---------- Challenges ----------

// Would this bot challenge the most recent move? `memory` holds who last
// challenged the bot and whether it was challenged this round.
function wantsToChallenge(game, bot, botId, vocabularies, rng, { hostId = null, memory = {} } = {}) {
  const { lastMove } = game;
  if (!lastMove || lastMove.playerId === botId) return false;
  const level = DIFFICULTY[bot.difficulty];
  const nudges = nudgesFor(bot.personality, bot.difficulty);
  const believesValid = vocabularies[bot.difficulty].fits(game.pattern());
  let chance = believesValid ? level.challengeWild : level.challengeSure;
  chance *= nudges.challenge;
  if (lastMove.playerId === hostId) chance *= nudges.hostShy;
  if (memory.lastChallengerId === lastMove.playerId) chance *= nudges.revenge;
  if (memory.challengedThisRound) chance *= nudges.grudge;
  return rng() < Math.min(0.98, chance);
}

// Would this bot, as the first player, challenge the starting board?
function wantsToChallengeStart(game, bot, vocabularies, rng) {
  if (vocabularies[bot.difficulty].fits(game.pattern())) return rng() < DIFFICULTY[bot.difficulty].challengeWild;
  return rng() < Math.min(0.98, DIFFICULTY[bot.difficulty].challengeSure * nudgesFor(bot.personality, bot.difficulty).challenge);
}

// A word this bot can name for the board, or null.
function wordToName(game, bot, vocabularies, rng) {
  const word = vocabularies[bot.difficulty].word(game.pattern(), rng);
  if (!word || rng() < DIFFICULTY[bot.difficulty].nameMiss) return null;
  return word;
}

// ---------- Between rounds ----------

const AWKWARD = { Q: 5, Z: 3, X: 3, J: 3, K: 2, V: 2, W: 1.5, Y: 1, F: 1, H: 1, B: 0.5, C: 0.5, M: 0.5, P: 0.5, G: 0.5 };

// The tile this bot trades in, or null to keep its tiles.
function tileToTrade(player, bot, rng) {
  if (player.hand.length === 0) return null;
  if (bot.difficulty === 'idiot') return rng() < 0.5 ? player.hand[Math.floor(rng() * player.hand.length)] : null;
  const nudges = nudgesFor(bot.personality, bot.difficulty);
  const counts = new Map();
  for (const tile of player.hand) counts.set(tile.type, (counts.get(tile.type) ?? 0) + 1);
  const hasU = counts.has('U');
  let worst = null;
  let worstScore = 0;
  for (const tile of player.hand) {
    let score = 0;
    if (isLetter(tile)) {
      score = AWKWARD[tile.type] ?? 0;
      if (tile.type === 'Q' && hasU) score -= 2;
      if (counts.get(tile.type) > 2) score += 1;
    } else if (isRemoval(tile) && counts.get('removal') > 1) {
      score = 1.5;
    }
    if (score > worstScore) {
      worst = tile;
      worstScore = score;
    }
  }
  if (!worst) return null;
  const chance = Math.min(0.95, (worstScore / 5) * nudges.trade + 0.15);
  return rng() < chance ? worst : null;
}

// ---------- Deciding what to do now ----------

// What this bot should do in the game right now, or null when nothing is
// waiting on it: { type, ...details, delay, bluff? }. The server waits
// `delay` milliseconds, checks the game hasn't moved on, then acts.
function decide(game, botId, bot, vocabularies, rng, context = {}) {
  const player = game.players.find((candidate) => candidate.id === botId);
  if (!player || player.ejected) return null;
  const { phase } = game;
  const pace = nudgesFor(bot.personality, bot.difficulty).pace;
  const wait = (kind) => Math.round(between(DELAYS[kind], rng) * pace);

  switch (phase.name) {
    case 'turn': {
      const challengeable = game.lastMove && game.lastMove.playerId !== botId;
      if (challengeable && wantsToChallenge(game, bot, botId, vocabularies, rng, context)) {
        return { type: 'challenge', delay: wait('challenge') };
      }
      if (phase.playerId !== botId) return null;
      if (phase.opening && wantsToChallengeStart(game, bot, vocabularies, rng)) {
        return { type: 'challengeStartingBoard', delay: wait('openingChallenge') };
      }
      const choice = chooseMove(game, player, bot, vocabularies, rng);
      return choice ? { type: 'move', move: choice.move, bluff: choice.bluff, delay: wait('move') } : null;
    }
    case 'challenge': {
      if (phase.challengedId !== botId) return null;
      const word = wordToName(game, bot, vocabularies, rng);
      return word ? { type: 'nameWord', word, delay: wait('nameWord') } : { type: 'giveUp', delay: wait('giveUp') };
    }
    case 'roundEnding': {
      if (phase.moverId === botId || phase.passed.includes(botId)) return null;
      if (wantsToChallenge(game, bot, botId, vocabularies, rng, context)) return { type: 'challenge', delay: wait('challenge') };
      return { type: 'pass', delay: wait(nudgesFor(bot.personality, bot.difficulty).quickPass ? 'quickPass' : 'pass') };
    }
    case 'startingChallenge': {
      if (phase.challengerId === botId || phase.passed.includes(botId)) return null;
      const word = wordToName(game, bot, vocabularies, rng);
      return word ? { type: 'nameWord', word, delay: wait('nameWord') } : { type: 'pass', delay: wait('pass') };
    }
    case 'betweenRounds': {
      if (phase.done.includes(botId)) return null;
      const tile = tileToTrade(player, bot, rng);
      return tile ? { type: 'tradeTile', tileId: tile.id, delay: wait('trade') } : { type: 'keepTiles', delay: wait('trade') };
    }
    default:
      return null;
  }
}

module.exports = { decide, legalMoves, chooseMove, wantsToChallenge, wordToName, tileToTrade, nudgesFor, DIFFICULTY };
