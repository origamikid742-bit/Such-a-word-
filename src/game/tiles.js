'use strict';

const { DEFAULT_LETTER_COUNTS } = require('../../public/match-settings');

// Every tile has an `id` (so a player can pick one specific tile) and a `type`:
// a capital letter, 'blank' or 'removal'.
const BLANK = 'blank';
const REMOVAL = 'removal';

// Standard Scrabble letter distribution: 98 letters.
const LETTER_COUNTS = { ...DEFAULT_LETTER_COUNTS };

// All 130 tiles: 98 letters, 26 blanks and 6 removal tiles.
const TILE_COUNTS = { ...LETTER_COUNTS, [BLANK]: 26, [REMOVAL]: 6 };

const isLetter = (tile) => tile.type.length === 1;
const isBlank = (tile) => tile.type === BLANK;
const isRemoval = (tile) => tile.type === REMOVAL;

// One tile for each count: the standard 130, or a host's custom mix.
function createTileSet(counts = TILE_COUNTS) {
  const tiles = [];
  for (const [type, count] of Object.entries(counts)) {
    for (let copy = 0; copy < count; copy++) tiles.push({ id: tiles.length + 1, type });
  }
  return tiles;
}

// Shuffles in place (Fisher–Yates) and returns the same array.
function shuffle(items, rng = Math.random) {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

// The board as text, with '_' for each blank: G _ O _ T becomes 'G_O_T'.
const patternOf = (board) => board.map((tile) => (isBlank(tile) ? '_' : tile.type)).join('');

module.exports = {
  BLANK,
  REMOVAL,
  LETTER_COUNTS,
  TILE_COUNTS,
  isLetter,
  isBlank,
  isRemoval,
  createTileSet,
  shuffle,
  patternOf,
};
