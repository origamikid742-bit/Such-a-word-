'use strict';

// The match settings window: opened by "Create a match", and by the host's
// "Change settings" in the lobby. Every number has a slider and a box that
// takes digits only, and every changed setting gets a circular arrow that
// restores its default. The rules for the settings live in match-settings.js.
// Uses byId, makeElement, request, showToast, showError, latestState,
// savedIcon, rememberName and saveSeat from client.js, and playSound from
// sounds.js.

const CHANCE_DELAY_MS = 350;
const CHANCE_TIP_BELOW = 0.5; // recommend Force valid when fewer than half the boards have a word

const settingsUi = {
  mode: null, // 'create' or 'lobby'
  name: '', // the creator's name, when creating
  draft: null, // the settings being edited
  controls: new Map(), // setting key → { refresh }
  chanceKey: null, // the settings the last chance was asked for
  chanceTimer: null,
  inTipZone: false, // fewer than half the boards had a word last time
  quietCheck: false, // the first check after opening never shows the tip
};

const RESET_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 12 A7.5 7.5 0 1 0 6.7 6.7"/><path d="M4.2 3.8 V7.6 H8"/></svg>';

const displayValue = (setting, value) => (setting.time ? formatTime(value) : String(value));
const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;

// ---------- Building blocks ----------

function makeResetButton(label, onReset) {
  const button = makeElement('button', 'reset-button');
  button.type = 'button';
  button.innerHTML = RESET_ICON;
  button.setAttribute('aria-label', label);
  button.title = label;
  button.addEventListener('click', () => {
    onReset();
    playSound('pick');
  });
  return button;
}

// A number with a slider and a box. Times fill in from the right with the
// colon added; anything outside the range snaps to the nearest end once you
// finish typing (leaving the box or pressing Enter).
function makeNumberControl({ id, label, min, max, time = false, sliderStep = 1, defaultValue, get, set }) {
  const row = makeElement('div', 'setting');
  const top = makeElement('div', 'setting-top');
  const name = makeElement('label', 'setting-label', label);
  name.htmlFor = id;
  const setting = { time };
  const reset = makeResetButton(`Restore the default, ${displayValue(setting, defaultValue)}`, () => set(defaultValue));
  const box = makeElement('input', 'number-input');
  box.id = id;
  box.inputMode = 'numeric';
  box.autocomplete = 'off';
  top.append(name, reset, box);

  const slider = makeElement('input', 'setting-slider');
  slider.type = 'range';
  slider.min = min;
  slider.max = max;
  slider.step = sliderStep;
  slider.setAttribute('aria-label', label);
  const ends = makeElement('div', 'setting-ends');
  ends.append(makeElement('span', '', displayValue(setting, min)), makeElement('span', '', displayValue(setting, max)));
  const warning = makeElement('p', 'setting-warning');
  warning.hidden = true;
  row.append(top, slider, ends, warning);

  const longest = String(max).length;
  box.addEventListener('input', () => {
    box.value = time ? timeFromDigits(box.value) : box.value.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, longest);
  });
  const finish = () => {
    const typed = time ? secondsFromDigits(box.value) : (box.value === '' ? null : Number(box.value));
    if (typed === null) refresh();
    else set(Math.min(max, Math.max(min, typed)));
  };
  box.addEventListener('change', finish);
  box.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    box.blur();
  });
  slider.addEventListener('input', () => set(Number(slider.value)));

  function refresh() {
    const value = get();
    box.value = displayValue(setting, value);
    slider.value = value;
    reset.hidden = value === defaultValue;
    row.classList.toggle('is-changed', value !== defaultValue);
  }
  return { row, refresh, warning };
}

function makeSwitchControl({ label, defaultValue, get, set }) {
  const row = makeElement('div', 'setting setting-switch');
  const name = makeElement('span', 'setting-label', label);
  const reset = makeResetButton(`Restore the default, ${defaultValue ? 'on' : 'off'}`, () => set(defaultValue));
  const button = makeElement('button', 'switch');
  button.type = 'button';
  button.setAttribute('role', 'switch');
  button.setAttribute('aria-label', label);
  button.addEventListener('click', () => {
    set(!get());
    playSound('pick');
  });
  row.append(name, reset, button);
  function refresh() {
    const on = get();
    button.setAttribute('aria-checked', String(on));
    reset.hidden = on === defaultValue;
    row.classList.toggle('is-changed', on !== defaultValue);
  }
  return { row, refresh };
}

// ---------- The settings ----------

function changeSetting(key, value) {
  settingsUi.draft[key] = value;
  refreshSettings();
}

function addNumber(container, key, extra = {}) {
  const setting = NUMBER_SETTINGS[key];
  const control = makeNumberControl({
    id: `setting-${key}`,
    label: setting.label,
    min: setting.min,
    max: setting.max,
    time: Boolean(setting.time),
    sliderStep: setting.time ? 5 : 1,
    defaultValue: setting.default,
    get: () => settingsUi.draft[key],
    set: (value) => changeSetting(key, value),
    ...extra,
  });
  settingsUi.controls.set(key, control);
  container.append(control.row);
}

function addSwitch(container, key) {
  const setting = SWITCH_SETTINGS[key];
  const control = makeSwitchControl({
    label: setting.label,
    defaultValue: setting.default,
    get: () => settingsUi.draft[key],
    set: (value) => changeSetting(key, value),
  });
  settingsUi.controls.set(key, control);
  container.append(control.row);
}

const lettersChanged = () => SETTING_LETTERS.some((letter) => settingsUi.draft.letters[letter] !== DEFAULT_LETTER_COUNTS[letter]);

// "Letter tiles": opens the list of letters.
function addLettersRow(container) {
  const row = makeElement('div', 'setting setting-switch');
  const open = makeElement('button', 'setting-link');
  open.type = 'button';
  const name = makeElement('span', 'setting-label', 'Letter tiles');
  const count = makeElement('span', 'setting-link-value');
  open.append(name, count);
  open.addEventListener('click', openLetters);
  const reset = makeResetButton('Restore every letter to its default', () => {
    settingsUi.draft.letters = { ...DEFAULT_LETTER_COUNTS };
    refreshSettings();
  });
  row.append(open, reset);
  container.append(row);
  settingsUi.controls.set('letters', {
    refresh() {
      count.textContent = `${letterTotal(settingsUi.draft)} ›`;
      reset.hidden = !lettersChanged();
      row.classList.toggle('is-changed', lettersChanged());
    },
  });
}

function buildSettings() {
  if (settingsUi.controls.size > 0) return;
  addSwitch(byId('settings-rules'), 'reshuffleEachRound');
  addNumber(byId('settings-rules'), 'handSize');
  addNumber(byId('settings-rules'), 'turnSeconds');
  addNumber(byId('settings-rules'), 'challengeSeconds');
  addNumber(byId('settings-tiles'), 'blanks');
  addNumber(byId('settings-tiles'), 'removals');
  addLettersRow(byId('settings-tiles'));
  addNumber(byId('settings-board'), 'startingBlanks');
  addNumber(byId('settings-board'), 'startingDraws');
  addSwitch(byId('settings-board'), 'forceValidStart');
  buildLetters();
}

// Redraws every control, the bag total and the warnings, after any change.
function refreshSettings() {
  const { draft } = settingsUi;
  for (const control of settingsUi.controls.values()) control.refresh();
  refreshLetters();

  byId('settings-bag-total').textContent = String(bagSize(draft));
  const players = playersBagAllows(draft);
  const bagNote = byId('settings-bag-note');
  bagNote.hidden = players >= MOST_PLAYERS;
  bagNote.textContent = players < 2
    ? `Not enough tiles for even 2 players: each needs ${draft.handSize}, plus ${draft.startingBlanks + draft.startingDraws} for the starting board. Lower the hand size or add tiles.`
    : `Enough tiles for up to ${players} players with ${draft.handSize} each. With more, the host can't start.`;
  bagNote.classList.toggle('is-serious', players < 2);

  const turn = settingsUi.controls.get('turnSeconds').warning;
  const lap = Math.ceil((MOST_PLAYERS * draft.turnSeconds) / 60);
  const ejectAfter = Math.ceil((3 * draft.turnSeconds) / 60);
  turn.hidden = draft.turnSeconds >= SHORT_TURN_SECONDS && draft.turnSeconds <= LONG_TURN_SECONDS;
  turn.textContent = draft.turnSeconds < SHORT_TURN_SECONDS
    ? 'Short turns: a slow connection could make someone miss turns, and 3 missed turns in a row puts them out.'
    : `Long turns: with 6 players a lap could take ${lap} minutes, and someone who's away isn't put out for ${ejectAfter} minutes.`;

  if (settingsUi.mode === 'lobby') {
    byId('settings-save').disabled = sameSettings(draft, latestState?.settings ?? defaultSettings());
  }
  scheduleChance();
}

// ---------- Letter tiles ----------

function buildLetters() {
  const list = byId('letters-list');
  for (const letter of SETTING_LETTERS) {
    const control = makeNumberControl({
      id: `setting-letter-${letter}`,
      label: letter,
      min: LETTER_LIMITS.min,
      max: LETTER_LIMITS.max,
      defaultValue: DEFAULT_LETTER_COUNTS[letter],
      get: () => settingsUi.draft.letters[letter],
      set: (value) => {
        settingsUi.draft.letters[letter] = value;
        refreshSettings();
      },
    });
    control.row.classList.add('letter-setting');
    settingsUi.controls.set(`letter-${letter}`, control);
    list.append(control.row);
  }
}

function refreshLetters() {
  const total = letterTotal(settingsUi.draft);
  byId('letters-summary').textContent = `${plural(total, 'letter tile')} (normally 98). Each letter can have 1 to 50.`;
  byId('letters-reset').disabled = !lettersChanged();
}

function openLetters() {
  refreshSettings();
  byId('letters-dialog').showModal();
  byId('letters-list').scrollTop = 0;
}

byId('letters-done').addEventListener('click', () => byId('letters-dialog').close());
byId('letters-reset').addEventListener('click', () => {
  settingsUi.draft.letters = { ...DEFAULT_LETTER_COUNTS };
  refreshSettings();
});

// ---------- Force valid starting board ----------

// Asks the server how often a starting board would have a word with these
// settings, a moment after the last change. When it drops under half, a
// pop-up recommends Force valid starting board, once each time.
function scheduleChance() {
  const { draft } = settingsUi;
  const key = JSON.stringify([draft.blanks, draft.removals, draft.letters, draft.startingBlanks, draft.startingDraws]);
  showChance();
  if (key === settingsUi.chanceKey) return;
  settingsUi.chanceKey = key;
  settingsUi.lastChance = null;
  clearTimeout(settingsUi.chanceTimer);
  settingsUi.chanceTimer = setTimeout(async () => {
    const result = await request('startingBoardChance', { settings: draft });
    if (!result.ok || key !== settingsUi.chanceKey || !byId('settings-dialog').open) return;
    settingsUi.lastChance = result.chance;
    const inZone = result.chance < CHANCE_TIP_BELOW;
    if (inZone && !settingsUi.inTipZone && !settingsUi.quietCheck && !settingsUi.draft.forceValidStart) {
      showForceTip(result.chance);
    }
    settingsUi.inTipZone = inZone;
    settingsUi.quietCheck = false;
    showChance();
  }, CHANCE_DELAY_MS);
}

const percent = (chance) => `${Math.round(chance * 100)}%`;

function showChance() {
  const note = byId('settings-chance');
  const chance = settingsUi.lastChance;
  note.hidden = chance === null || chance === undefined;
  if (note.hidden) return;
  note.textContent = settingsUi.draft.forceValidStart
    ? 'Every starting board will have a word that fits, so the first player can\'t challenge it.'
    : `About ${percent(chance)} of starting boards will have a word that fits.`;
  note.classList.toggle('is-warning', !settingsUi.draft.forceValidStart && chance < CHANCE_TIP_BELOW);
}

function showForceTip(chance) {
  byId('force-tip-text').textContent = `With these settings, only about ${percent(chance)} of starting boards would have a word that fits. Force valid starting board makes sure every one does, without showing the boards it threw away.`;
  byId('force-tip-dialog').showModal();
}

byId('force-tip-on').addEventListener('click', () => {
  byId('force-tip-dialog').close();
  changeSetting('forceValidStart', true);
});
byId('force-tip-keep').addEventListener('click', () => byId('force-tip-dialog').close());

// ---------- Opening and saving ----------

function openSettings(mode, settings) {
  buildSettings();
  settingsUi.mode = mode;
  settingsUi.draft = structuredClone(settings);
  settingsUi.chanceKey = null;
  settingsUi.lastChance = null;
  settingsUi.inTipZone = false;
  settingsUi.quietCheck = true;
  const creating = mode === 'create';
  byId('settings-title').textContent = creating ? 'Match settings' : 'Change settings';
  byId('settings-intro').textContent = creating
    ? 'Play by the standard rules, or change them for this match. You can change them again in the lobby.'
    : 'Changes apply from the next game. Everyone in the lobby is told what changed.';
  byId('settings-use-defaults').textContent = creating ? 'Use default settings' : 'Restore all defaults';
  byId('settings-or').textContent = creating ? 'or change the rules for this match' : 'or change them one by one';
  byId('settings-save').textContent = creating ? 'Create match' : 'Save settings';
  byId('settings-save').disabled = false;
  byId('settings-error').hidden = true;
  refreshSettings();
  byId('settings-dialog').showModal();
  byId('settings-dialog').scrollTop = 0;
}

// "Create a match" asks for the settings first.
function openCreateSettings(name) {
  settingsUi.name = name;
  openSettings('create', defaultSettings());
}

function openLobbySettings() {
  openSettings('lobby', latestState.settings);
}

async function createWith(settings, button) {
  button.disabled = true;
  const result = await request('createMatch', { name: settingsUi.name, icon: savedIcon(), settings });
  button.disabled = false;
  if (!result.ok) {
    byId('settings-error').textContent = result.message;
    byId('settings-error').hidden = false;
    return;
  }
  byId('settings-dialog').close();
  rememberName(settingsUi.name);
  saveSeat(result.code, result.seatKey); // The server sends the lobby next.
}

async function saveLobbySettings() {
  const button = byId('settings-save');
  button.disabled = true;
  const result = await request('updateSettings', { settings: settingsUi.draft });
  if (!result.ok) {
    button.disabled = false;
    byId('settings-error').textContent = result.message;
    byId('settings-error').hidden = false;
    return;
  }
  byId('settings-dialog').close();
  showToast(result.changes.length > 0 ? 'Settings saved. Everyone in the lobby was told.' : 'Nothing changed.');
}

byId('settings-use-defaults').addEventListener('click', (event) => {
  if (settingsUi.mode === 'create') {
    createWith(defaultSettings(), event.currentTarget);
    return;
  }
  settingsUi.draft = defaultSettings();
  refreshSettings();
});

byId('settings-save').addEventListener('click', (event) => {
  if (settingsUi.mode === 'create') createWith(settingsUi.draft, event.currentTarget);
  else saveLobbySettings();
});

byId('settings-cancel').addEventListener('click', () => byId('settings-dialog').close());
byId('lobby-change-settings').addEventListener('click', openLobbySettings);

// ---------- The rules for this match, in words ----------

// The settings that differ from the standard rules, or a line saying there are none.
function renderRuleChanges(container, settings) {
  const changes = settingChanges(settings);
  if (changes.length === 0) {
    container.replaceChildren(makeElement('p', 'rules-default', 'Default rules: 7 tiles each, 1:00 turns, 0:30 to challenge, and 130 tiles in the bag.'));
    return;
  }
  const list = makeElement('ul', 'rule-changes');
  for (const change of changes) {
    const item = makeElement('li', 'rule-change');
    item.append(
      makeElement('span', 'rule-change-label', change.label),
      makeElement('strong', 'rule-change-value', change.value),
      makeElement('span', 'rule-change-normally', `normally ${change.normally}`),
    );
    list.append(item);
  }
  container.replaceChildren(list);
}

// The "Custom rules" part of the rules page, shown in a lobby or a game.
function renderRulesCustomNote() {
  const settings = latestState?.settings;
  const inMatch = Boolean(settings) && (currentScreen === 'lobby' || currentScreen === 'game');
  byId('rules-custom-note').hidden = !inMatch;
  if (!inMatch) return;
  const count = settingChanges(settings).length;
  byId('rules-custom-text').textContent = count === 0
    ? 'This match uses the standard rules below.'
    : `This match has custom rules (${plural(count, 'change')}), so some numbers below are different.`;
}

for (const button of document.querySelectorAll('.open-rules')) button.addEventListener('click', renderRulesCustomNote);

byId('open-custom-rules').addEventListener('click', () => {
  renderRuleChanges(byId('custom-rules-list'), latestState.settings);
  byId('custom-rules-dialog').showModal();
});
