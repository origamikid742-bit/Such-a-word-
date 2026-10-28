'use strict';

// Every tile has an `id` (so a player can pick one specific tile) and a `type`:
// a capital letter, 'blank' or 'removal'.
const BLANK = 'blank';
const REMOVAL = 'removal';

// Standard Scrabble letter distribution: 98 letters.
const LETTER_COUNTS = {
  A: 9, B: 2, C: 2, D: 4, E: 12, F: 2, G: 3, H: 2, I: 9, J: 1, K: 1, L: 4, M: 2,
  N: 6, O: 8, P: 2, Q: 1, R: 6, S: 4, T: 6, U: 4, V: 2, W: 2, X: 1, Y: 2, Z: 1,
};

// All 130 tiles: 98 letters, 26 blanks and 6 removal tiles.
const TILE_COUNTS = { ...LETTER_COUNTS, [BLANK]: 26, [REMOVAL]: 6 };

const isLetter = (tile) => tile.type.length === 1;
const isBlank = (tile) => tile.type === BLANK;
const isRemoval = (tile) => tile.type === REMOVAL;

function createTileSet() {
  const tiles = [];
  for (const [type, count] of Object.entries(TILE_COUNTS)) {
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
