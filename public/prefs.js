'use strict';

// Preferences: sound effects and their volume, chat on or off, and dark
// mode. They're just for this player, saved in this browser, and opened with
// the gear button on the home screen, in the lobby and in the game. Uses
// byId, readStorage and writeStorage from client.js, applyChatPreference
// from chat.js and playSound from sounds.js.

const PREFS_STORAGE_KEY = 'such-a-word:prefs';
const DEFAULT_PREFS = { sound: true, volume: 50, chat: true, dark: false };
const VOLUME_MIN = 1;
const VOLUME_MAX = 100;

function loadPrefs() {
  try {
    const saved = JSON.parse(readStorage('localStorage', PREFS_STORAGE_KEY));
    const prefs = { ...DEFAULT_PREFS };
    if (typeof saved?.sound === 'boolean') prefs.sound = saved.sound;
    if (Number.isInteger(saved?.volume)) prefs.volume = Math.min(VOLUME_MAX, Math.max(VOLUME_MIN, saved.volume));
    if (typeof saved?.chat === 'boolean') prefs.chat = saved.chat;
    if (typeof saved?.dark === 'boolean') prefs.dark = saved.dark;
    return prefs;
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

const prefs = loadPrefs();

// 0 when sound effects are off, otherwise the volume from 1 to 100.
const soundVolume = () => (prefs.sound ? prefs.volume : 0);
const chatEnabled = () => prefs.chat;

function savePrefs() {
  writeStorage('localStorage', PREFS_STORAGE_KEY, JSON.stringify(prefs));
}

function applyTheme() {
  if (prefs.dark) document.documentElement.dataset.theme = 'dark';
  else delete document.documentElement.dataset.theme;
  document.querySelector('meta[name="theme-color"]').content = prefs.dark ? '#10151f' : '#ffffff';
}

function setSwitch(button, on) {
  button.setAttribute('aria-checked', String(on));
}

function renderPrefs() {
  setSwitch(byId('pref-sound'), prefs.sound);
  setSwitch(byId('pref-chat'), prefs.chat);
  setSwitch(byId('pref-dark'), prefs.dark);
  byId('pref-volume').value = prefs.volume;
  byId('pref-volume-number').value = prefs.volume;
  byId('pref-volume').disabled = !prefs.sound;
  byId('pref-volume-number').disabled = !prefs.sound;
}

function setVolume(value) {
  prefs.volume = Math.min(VOLUME_MAX, Math.max(VOLUME_MIN, Math.round(value)));
  savePrefs();
  renderPrefs();
}

// A sample sound while the volume changes, at most a few a second.
let lastSample = 0;
function sampleVolume() {
  if (Date.now() - lastSample < 120) return;
  lastSample = Date.now();
  playSound('place');
}

for (const button of document.querySelectorAll('.open-prefs')) {
  button.addEventListener('click', () => {
    renderPrefs();
    byId('prefs-dialog').showModal();
  });
}

byId('pref-sound').addEventListener('click', () => {
  prefs.sound = !prefs.sound;
  savePrefs();
  renderPrefs();
  if (prefs.sound) playSound('place');
});

byId('pref-volume').addEventListener('input', (event) => {
  setVolume(Number(event.target.value));
  sampleVolume();
});

// The volume box takes digits only. A number outside 1 to 100 snaps back
// into the range once you're done typing.
const volumeBox = byId('pref-volume-number');
volumeBox.addEventListener('input', () => {
  volumeBox.value = volumeBox.value.replace(/\D/g, '').slice(0, 3);
});
volumeBox.addEventListener('change', () => {
  if (volumeBox.value === '') renderPrefs();
  else setVolume(Number(volumeBox.value));
  sampleVolume();
});
volumeBox.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    volumeBox.blur();
  }
});

byId('pref-chat').addEventListener('click', () => {
  prefs.chat = !prefs.chat;
  savePrefs();
  renderPrefs();
  applyChatPreference(); // in chat.js
});

byId('pref-dark').addEventListener('click', () => {
  prefs.dark = !prefs.dark;
  savePrefs();
  renderPrefs();
  applyTheme();
});

applyTheme();
applyChatPreference();
