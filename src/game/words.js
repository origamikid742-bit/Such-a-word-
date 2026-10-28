'use strict';

const fs = require('node:fs');
const path = require('node:path');

// ENABLE: a public-domain word list of about 173,000 words.
const ENABLE_FILE = path.join(__dirname, '..', '..', 'data', 'enable1.txt');

// Does the word fit the board pattern? '_' (a blank) matches any letter.
function fits(pattern, word) {
  if (pattern.length !== word.length) return false;
  for (let i = 0; i < pattern.length; i++) {
    if (pattern[i] !== '_' && pattern[i] !== word[i]) return false;
  }
  return true;
}

class WordList {
  constructor(words) {
    this.words = new Set();
    this.byLength = new Map();
    for (const raw of words) {
      const word = raw.trim().toUpperCase();
      if (!/^[A-Z]+$/.test(word) || this.words.has(word)) continue;
      this.words.add(word);
      if (!this.byLength.has(word.length)) this.byLength.set(word.length, []);
      this.byLength.get(word.length).push(word);
    }
  }

  static load(file = ENABLE_FILE) {
    return new WordList(fs.readFileSync(file, 'utf8').split('\n'));
  }

  get size() {
    return this.words.size;
  }

  has(word) {
    return this.words.has(word);
  }

  // Any word that fits the board pattern, or null. A board of 0 or 1 tiles
  // never has one, because the list has no one-letter words.
  findWord(pattern) {
    const sameLength = this.byLength.get(pattern.length) ?? [];
    return sameLength.find((word) => fits(pattern, word)) ?? null;
  }

  isValidBoard(pattern) {
    return this.findWord(pattern) !== null;
  }

  // Checks a word a player named for a board. Says why when it doesn't count.
  check(pattern, rawWord) {
    const word = typeof rawWord === 'string' ? rawWord.trim().toUpperCase() : '';
    if (!/^[A-Z]+$/.test(word)) {
      return { ok: false, word, reason: 'Type a word using letters only.' };
    }
    if (word.length !== pattern.length) {
      return {
        ok: false,
        word,
        reason: `The board has ${pattern.length} tiles, so the word needs exactly ${pattern.length} letters.`,
      };
    }
    const clash = [...pattern].findIndex((letter, i) => letter !== '_' && letter !== word[i]);
    if (clash !== -1) {
      return { ok: false, word, reason: `${word} doesn't fit: tile ${clash + 1} is ${pattern[clash]}.` };
    }
    if (!this.has(word)) {
      return { ok: false, word, reason: `${word} isn't in the word list.` };
    }
    const blanks = [...pattern].flatMap((letter, i) => (letter === '_' ? [word[i]] : []));
    return { ok: true, word, blanks };
  }
}

module.exports = { WordList, fits };
