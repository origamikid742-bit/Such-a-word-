'use strict';

const { fits } = require('./words');

// Lists every word that fitted a board after a challenge, to help players
// learn words. It never affects the game.

const LIST_LIMIT = 500; // a board of blanks can fit tens of thousands of words
const CACHE_SIZE = 200;
const cache = new Map();

// Words that fit the pattern, alphabetically and cut at LIST_LIMIT; `total`
// counts them all.
function possibleWords(words, pattern) {
  if (!cache.has(pattern)) {
    const sameLength = words.byLength.get(pattern.length) ?? [];
    const all = sameLength.filter((word) => fits(pattern, word)).sort();
    cache.set(pattern, { words: all.slice(0, LIST_LIMIT), total: all.length });
    if (cache.size > CACHE_SIZE) cache.delete(cache.keys().next().value);
  }
  return cache.get(pattern);
}

module.exports = { possibleWords, LIST_LIMIT };
