'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { WordList, fits } = require('../src/game/words');

const words = WordList.load();

test('the ENABLE list loads with about 173,000 words', () => {
  assert.ok(words.size > 170_000);
  assert.ok(words.has('AGLET'));
});

test('C _ T is valid because CAT fits; Z Q _ is invalid', () => {
  assert.equal(words.isValidBoard('C_T'), true);
  assert.equal(words.check('C_T', 'cat').ok, true);
  assert.equal(words.isValidBoard('ZQ_'), false);
});

test('G _ O _ T fits GHOST but not GHOUL, because the last tile is a T', () => {
  assert.deepEqual(words.check('G_O_T', 'GHOST'), { ok: true, word: 'GHOST', blanks: ['H', 'S'] });
  const ghoul = words.check('G_O_T', 'GHOUL');
  assert.equal(ghoul.ok, false);
  assert.match(ghoul.reason, /tile 5 is T/);
});

test('no four-letter word fits Q _ T E, but B _ T E would have been safe', () => {
  assert.equal(words.isValidBoard('Q_TE'), false);
  const quote = words.check('Q_TE', 'QUOTE');
  assert.equal(quote.ok, false);
  assert.match(quote.reason, /exactly 4 letters/);
  assert.equal(words.check('B_TE', 'BITE').ok, true);
});

test('AGLET fits _ G _ E T, with the blanks standing for A and L', () => {
  assert.deepEqual(words.check('_G_ET', 'aglet'), { ok: true, word: 'AGLET', blanks: ['A', 'L'] });
});

test('the words from the worked example fit their boards', () => {
  const examples = [
    ['_ _ A _ _ T', 'PLANET'],
    ['P _ A _ _ T', 'PLANET'],
    ['P _ A _ _ T _', 'PLANETS'],
    ['P A _ _ _ T _', 'PARENTS'],
    ['C A _ _ _ T _', 'CARPETS'],
    ['A _ _ _ T _', 'ADMITS'],
  ];
  for (const [board, word] of examples) {
    assert.equal(words.check(board.replaceAll(' ', ''), word).ok, true, `${word} should fit ${board}`);
  }
});

test('boards of 0 or 1 tiles never have a word', () => {
  assert.equal(words.isValidBoard(''), false);
  assert.equal(words.isValidBoard('_'), false);
  assert.equal(words.isValidBoard('A'), false);
});

test('named words must be letters, the right length and in the list', () => {
  assert.match(words.check('C_T', 'C4T').reason, /letters only/);
  assert.match(words.check('C_T', 'CXT').reason, /isn't in the word list/);
  assert.equal(words.check('C_T', '  cat  ').word, 'CAT');
});

test('a blank matches any letter, and letters must match exactly', () => {
  assert.equal(fits('_A_', 'CAT'), true);
  assert.equal(fits('_A_', 'COT'), false);
  assert.equal(fits('_A_', 'CATS'), false);
});
