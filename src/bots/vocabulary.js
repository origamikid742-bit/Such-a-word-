'use strict';

const fs = require('node:fs');
const path = require('node:path');

// The most common words that are also in ENABLE, most common first (see the
// file's header for where it comes from).
const COMMON_FILE = path.join(__dirname, '..', '..', 'data', 'common-words.txt');

const A = 'A'.charCodeAt(0);

// A fast index over the word list: for each word length, which words have
// each letter at each position, as bit sets (one bit per word). Checking a
// board is then a few AND operations instead of a scan of every word.
class WordIndex {
  constructor(wordList) {
    this.wordList = wordList;
    this.lengths = new Map(); // length → { words, blocks, bits[position][letter], scratch }
  }

  forLength(length) {
    let entry = this.lengths.get(length);
    if (entry) return entry;
    const words = this.wordList.byLength.get(length) ?? [];
    const blocks = Math.ceil(words.length / 32);
    const bits = Array.from({ length }, () => Array.from({ length: 26 }, () => new Uint32Array(blocks)));
    words.forEach((word, i) => {
      for (let position = 0; position < length; position++) {
        bits[position][word.charCodeAt(position) - A][i >>> 5] |= 1 << (i & 31);
      }
    });
    entry = { words, blocks, bits, scratch: new Uint32Array(blocks) };
    this.lengths.set(length, entry);
    return entry;
  }

  // The words of this length a vocabulary knows, as a bit set.
  maskFor(length, knows) {
    const { words, blocks } = this.forLength(length);
    const mask = new Uint32Array(blocks);
    words.forEach((word, i) => {
      if (knows(word)) mask[i >>> 5] |= 1 << (i & 31);
    });
    return mask;
  }

  // The bit set of known words that fit the pattern ('_' is a blank), in a
  // shared scratch array, or null when the length has no words.
  matching(pattern, mask) {
    const entry = this.forLength(pattern.length);
    if (entry.blocks === 0) return null;
    const result = entry.scratch;
    result.set(mask);
    for (let position = 0; position < pattern.length; position++) {
      const letter = pattern.charCodeAt(position);
      if (letter === 95) continue; // '_'
      const column = entry.bits[position][letter - A];
      for (let block = 0; block < entry.blocks; block++) result[block] &= column[block];
    }
    return { result, entry };
  }
}

const popCount = (value) => {
  let v = value - ((value >>> 1) & 0x55555555);
  v = (v & 0x33333333) + ((v >>> 2) & 0x33333333);
  return (((v + (v >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24;
};

// One bot's vocabulary: the words it knows, with fast board checks.
class Vocabulary {
  constructor(index, knows) {
    this.index = index;
    this.knowsWord = knows;
    this.masks = new Map();
  }

  mask(length) {
    if (!this.masks.has(length)) this.masks.set(length, this.index.maskFor(length, this.knowsWord));
    return this.masks.get(length);
  }

  // Does any word this vocabulary knows fit the board? Boards of 0 or 1 tiles never do.
  fits(pattern) {
    if (pattern.length < 2) return false;
    const found = this.index.matching(pattern, this.mask(pattern.length));
    return Boolean(found) && found.result.some((block) => block !== 0);
  }

  // How many known words fit, up to `limit`.
  count(pattern, limit = Infinity) {
    if (pattern.length < 2) return 0;
    const found = this.index.matching(pattern, this.mask(pattern.length));
    if (!found) return 0;
    let total = 0;
    for (const block of found.result) {
      if (block !== 0) total += popCount(block);
      if (total >= limit) return limit;
    }
    return total;
  }

  // A known word that fits, picked at random, or null.
  word(pattern, rng = Math.random) {
    if (pattern.length < 2) return null;
    const found = this.index.matching(pattern, this.mask(pattern.length));
    if (!found) return null;
    const hits = [];
    found.result.forEach((block, i) => {
      for (let bit = 0; block !== 0 && bit < 32; bit++) {
        if (block & (1 << bit)) hits.push(i * 32 + bit);
      }
    });
    if (hits.length === 0) return null;
    return found.entry.words[hits[Math.floor(rng() * hits.length)]];
  }
}

// How much of the word list each difficulty knows.
const COMMON_WORDS_KNOWN = { idiot: 400, easy: 6_000, medium: 16_000 };
const HARD_EXTRA_SHARE = 5; // Hard also knows one in five of the rarer words

// A steady pseudo-random number for a word, so Hard always knows the same rare words.
function wordHash(word) {
  let hash = 2166136261;
  for (let i = 0; i < word.length; i++) hash = Math.imul(hash ^ word.charCodeAt(i), 16777619);
  return hash >>> 0;
}

let shared = null;

// Every difficulty's vocabulary, built once per word list and shared by every bot.
function vocabularies(wordList) {
  if (shared?.wordList === wordList) return shared.levels;
  const common = fs.readFileSync(COMMON_FILE, 'utf8').split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));
  const rank = new Map(common.map((word, i) => [word, i]));
  const index = new WordIndex(wordList);
  const byRank = (limit) => (word) => (rank.get(word) ?? Infinity) < limit;
  const levels = {
    idiot: new Vocabulary(index, byRank(COMMON_WORDS_KNOWN.idiot)),
    easy: new Vocabulary(index, byRank(COMMON_WORDS_KNOWN.easy)),
    medium: new Vocabulary(index, byRank(COMMON_WORDS_KNOWN.medium)),
    hard: new Vocabulary(index, (word) => rank.has(word) || wordHash(word) % HARD_EXTRA_SHARE === 0),
    expert: new Vocabulary(index, () => true),
  };
  shared = { wordList, levels };
  return levels;
}

module.exports = { WordIndex, Vocabulary, vocabularies, COMMON_FILE };
