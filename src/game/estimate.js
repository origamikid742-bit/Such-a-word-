'use strict';

const { createTileSet, isBlank, isRemoval, patternOf, shuffle } = require('./tiles');
const { cleanSettings, tileCountsFor } = require('../../public/match-settings');

const SAMPLES = 200;
const KEPT = 200;

// Recent answers, so moving a slider back and forth doesn't redo the work.
const remembered = new Map();

// About how often (0 to 1) a starting board built with these settings has a
// word that fits, from sample boards drawn from a full bag. The settings
// screen recommends "Force valid starting board" when it's under a half.
function startingBoardChance(rawSettings, words, rng = Math.random) {
  const settings = cleanSettings(rawSettings);
  const key = JSON.stringify(tileCountsFor(settings)) + settings.startingBlanks + settings.startingDraws;
  if (remembered.has(key)) return remembered.get(key);

  const tiles = createTileSet(tileCountsFor(settings));
  let valid = 0;
  for (let sample = 0; sample < SAMPLES; sample++) {
    const bag = shuffle([...tiles], rng);
    const board = [];
    for (let i = bag.length - 1; i >= 0 && board.filter(isBlank).length < settings.startingBlanks; i--) {
      if (isBlank(bag[i])) board.push(...bag.splice(i, 1));
    }
    for (let drawn = 0; bag.length > 0 && (drawn < settings.startingDraws || board.length < 2); drawn++) {
      const tile = bag.pop();
      if (!isRemoval(tile)) board.push(tile);
    }
    if (words.isValidBoard(patternOf(shuffle(board, rng)))) valid += 1;
  }

  const chance = valid / SAMPLES;
  remembered.set(key, chance);
  if (remembered.size > KEPT) remembered.delete(remembered.keys().next().value);
  return chance;
}

module.exports = { startingBoardChance };
