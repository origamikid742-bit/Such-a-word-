'use strict';

// The match settings the host picks when creating a match, with their ranges
// and defaults. Shared by the browser (the settings screen and the custom rules
// panel) and the server (which checks every value again).

const SETTING_LETTERS = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'];

// Standard Scrabble letter distribution: 98 letters.
const DEFAULT_LETTER_COUNTS = {
  A: 9, B: 2, C: 2, D: 4, E: 12, F: 2, G: 3, H: 2, I: 9, J: 1, K: 1, L: 4, M: 2,
  N: 6, O: 8, P: 2, Q: 1, R: 6, S: 4, T: 6, U: 4, V: 2, W: 2, X: 1, Y: 2, Z: 1,
};

// Every number setting: its range, default, and whether it's a time in seconds.
const NUMBER_SETTINGS = {
  handSize: { label: 'Starting hand size', min: 1, max: 20, default: 7 },
  turnSeconds: { label: 'Time per turn', min: 10, max: 300, default: 60, time: true },
  challengeSeconds: { label: 'Challenge time', min: 10, max: 300, default: 30, time: true },
  blanks: { label: 'Blank tiles', min: 5, max: 50, default: 26 },
  removals: { label: 'Removal tiles', min: 5, max: 50, default: 6 },
  startingBlanks: { label: 'Blanks on the starting board', min: 2, max: 10, default: 4 },
  startingDraws: { label: 'Random tiles on the starting board', min: 1, max: 5, default: 2 },
};

const SWITCH_SETTINGS = {
  reshuffleEachRound: { label: 'Reshuffle bag every round', default: false },
  forceValidStart: { label: 'Force valid starting board', default: false },
};

const LETTER_LIMITS = { min: 1, max: 50 };

// Turns outside these get a warning on the settings screen.
const SHORT_TURN_SECONDS = 20;
const LONG_TURN_SECONDS = 120;
const MOST_PLAYERS = 6;

function defaultSettings() {
  const settings = { letters: { ...DEFAULT_LETTER_COUNTS } };
  for (const [key, setting] of Object.entries(NUMBER_SETTINGS)) settings[key] = setting.default;
  for (const [key, setting] of Object.entries(SWITCH_SETTINGS)) settings[key] = setting.default;
  return settings;
}

// A whole number pulled into the range. Anything that isn't a number gets the default.
function clampNumber(value, min, max, fallback) {
  const number = Math.round(Number(value));
  if (!Number.isFinite(number) || typeof value === 'boolean' || value === null || value === '') return fallback;
  return Math.min(max, Math.max(min, number));
}

// Settings from the browser, made safe: every value in its range, anything
// missing or broken set to its default.
function cleanSettings(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const settings = defaultSettings();
  for (const [key, setting] of Object.entries(NUMBER_SETTINGS)) {
    settings[key] = clampNumber(source[key], setting.min, setting.max, setting.default);
  }
  for (const key of Object.keys(SWITCH_SETTINGS)) {
    if (typeof source[key] === 'boolean') settings[key] = source[key];
  }
  const letters = source.letters && typeof source.letters === 'object' ? source.letters : {};
  for (const letter of SETTING_LETTERS) {
    settings.letters[letter] = clampNumber(letters[letter], LETTER_LIMITS.min, LETTER_LIMITS.max, DEFAULT_LETTER_COUNTS[letter]);
  }
  return settings;
}

// How many of each tile type the bag holds: letters, then 'blank' and 'removal'.
function tileCountsFor(settings) {
  return { ...settings.letters, blank: settings.blanks, removal: settings.removals };
}

const letterTotal = (settings) => SETTING_LETTERS.reduce((total, letter) => total + settings.letters[letter], 0);
const bagSize = (settings) => letterTotal(settings) + settings.blanks + settings.removals;

// Tiles needed before the first move: everyone's hand plus the starting board.
const tilesNeeded = (settings, players) => players * settings.handSize + settings.startingBlanks + settings.startingDraws;

// The most players the bag has room for (0 to 6).
function playersBagAllows(settings) {
  const room = bagSize(settings) - settings.startingBlanks - settings.startingDraws;
  return Math.max(0, Math.min(MOST_PLAYERS, Math.floor(room / settings.handSize)));
}

// 75 seconds is "1:15".
function formatTime(seconds) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

// The digits in a time box, without leading zeros and at most 3 of them.
const timeDigits = (text) => String(text).replace(/\D/g, '').replace(/^0+/, '').slice(0, 3);

// Digits typed into a time box, filled in from the right: '130' is 1:30 and
// '175' is 1:75, which counts as 2:15. Returns seconds, or null with no digits.
function secondsFromDigits(digits) {
  const clean = timeDigits(digits);
  if (clean === '') return /\d/.test(String(digits)) ? 0 : null;
  const number = Number(clean);
  return Math.floor(number / 100) * 60 + (number % 100);
}

// What the time box shows while typing: '130' shows 1:30, '5' shows 0:05.
function timeFromDigits(digits) {
  const clean = timeDigits(digits);
  if (clean === '') return /\d/.test(String(digits)) ? '0:00' : '';
  const padded = clean.padStart(3, '0');
  return `${Number(padded.slice(0, -2))}:${padded.slice(-2)}`;
}

const describeValue = (key, value) => {
  if (Object.hasOwn(SWITCH_SETTINGS, key)) return value ? 'On' : 'Off';
  return NUMBER_SETTINGS[key].time ? formatTime(value) : String(value);
};

// Every setting that differs from the default, as { key, label, value,
// normally } in words, in the order of the settings screen.
function settingChanges(settings) {
  const defaults = defaultSettings();
  const changes = [];
  const add = (key, label, value, normally) => changes.push({ key, label, value, normally });
  if (settings.reshuffleEachRound !== defaults.reshuffleEachRound) {
    add('reshuffleEachRound', SWITCH_SETTINGS.reshuffleEachRound.label, describeValue('reshuffleEachRound', settings.reshuffleEachRound), 'Off');
  }
  for (const key of ['handSize', 'turnSeconds', 'challengeSeconds', 'blanks', 'removals']) {
    if (settings[key] !== defaults[key]) {
      add(key, NUMBER_SETTINGS[key].label, describeValue(key, settings[key]), describeValue(key, defaults[key]));
    }
  }
  for (const letter of SETTING_LETTERS) {
    if (settings.letters[letter] !== defaults.letters[letter]) {
      add(`letter-${letter}`, `${letter} tiles`, String(settings.letters[letter]), String(defaults.letters[letter]));
    }
  }
  for (const key of ['startingBlanks', 'startingDraws']) {
    if (settings[key] !== defaults[key]) {
      add(key, NUMBER_SETTINGS[key].label, describeValue(key, settings[key]), describeValue(key, defaults[key]));
    }
  }
  if (settings.forceValidStart !== defaults.forceValidStart) {
    add('forceValidStart', SWITCH_SETTINGS.forceValidStart.label, describeValue('forceValidStart', settings.forceValidStart), 'Off');
  }
  if (bagSize(settings) !== bagSize(defaults)) add('bagSize', 'Total bag size', String(bagSize(settings)), String(bagSize(defaults)));
  return changes;
}

// What changed between two sets of settings, as short lines like
// "Time per turn: 1:00 → 0:30", for the notice everyone gets in the lobby.
function describeSettingEdits(before, after) {
  const lines = [];
  for (const key of [...Object.keys(SWITCH_SETTINGS), ...Object.keys(NUMBER_SETTINGS)]) {
    if (before[key] === after[key]) continue;
    const label = SWITCH_SETTINGS[key]?.label ?? NUMBER_SETTINGS[key].label;
    lines.push(`${label}: ${describeValue(key, before[key])} → ${describeValue(key, after[key])}`);
  }
  for (const letter of SETTING_LETTERS) {
    if (before.letters[letter] !== after.letters[letter]) {
      lines.push(`${letter} tiles: ${before.letters[letter]} → ${after.letters[letter]}`);
    }
  }
  return lines;
}

const sameSettings = (a, b) => describeSettingEdits(a, b).length === 0;

if (typeof module !== 'undefined') {
  module.exports = {
    SETTING_LETTERS,
    DEFAULT_LETTER_COUNTS,
    NUMBER_SETTINGS,
    SWITCH_SETTINGS,
    LETTER_LIMITS,
    SHORT_TURN_SECONDS,
    LONG_TURN_SECONDS,
    MOST_PLAYERS,
    defaultSettings,
    cleanSettings,
    tileCountsFor,
    letterTotal,
    bagSize,
    tilesNeeded,
    playersBagAllows,
    formatTime,
    secondsFromDigits,
    timeFromDigits,
    settingChanges,
    describeSettingEdits,
    sameSettings,
  };
}
