'use strict';

// Sound effects, made by the browser itself (the Web Audio API), so there are
// no sound files to download. Short and soft: wooden clicks for tiles, gentle
// chimes, and a few bigger sounds for challenges and the winner. Uses
// soundVolume from prefs.js.

let audio = null; // { context, out } once the first sound is needed; out is the playing sound's volume

// Browsers only allow sound after the player has tapped or typed on the page.
function audioOut() {
  if (!audio) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    audio = { context: new AudioContext(), out: null };
  }
  if (audio.context.state === 'suspended') audio.context.resume().catch(() => {});
  return audio;
}

for (const unlock of ['pointerdown', 'keydown']) {
  window.addEventListener(unlock, () => { if (soundVolume() > 0) audioOut(); }, { capture: true, passive: true });
}

// A note: a frequency (or a slide between two) with a quick start and a
// smooth fade, so nothing clicks harshly.
function tone({ at = 0, freq, to = freq, length = 0.15, type = 'sine', gain = 0.3 }) {
  const { context, out } = audio;
  const start = context.currentTime + at;
  const oscillator = context.createOscillator();
  const envelope = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(freq, start);
  if (to !== freq) oscillator.frequency.exponentialRampToValueAtTime(to, start + length);
  envelope.gain.setValueAtTime(0.0001, start);
  envelope.gain.exponentialRampToValueAtTime(gain, start + 0.008);
  envelope.gain.exponentialRampToValueAtTime(0.0001, start + length);
  oscillator.connect(envelope).connect(out);
  oscillator.start(start);
  oscillator.stop(start + length + 0.02);
}

// A burst of filtered noise: a wooden tap when short, a whoosh when long.
function noise({ at = 0, length = 0.05, freq = 2000, to = freq, q = 1.5, gain = 0.3 }) {
  const { context, out } = audio;
  const start = context.currentTime + at;
  const samples = Math.ceil(context.sampleRate * length);
  const buffer = context.createBuffer(1, samples, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < samples; i++) data[i] = Math.random() * 2 - 1;
  const source = context.createBufferSource();
  source.buffer = buffer;
  const filter = context.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.value = q;
  filter.frequency.setValueAtTime(freq, start);
  if (to !== freq) filter.frequency.exponentialRampToValueAtTime(to, start + length);
  const envelope = context.createGain();
  envelope.gain.setValueAtTime(0.0001, start);
  envelope.gain.exponentialRampToValueAtTime(gain, start + Math.min(0.01, length / 3));
  envelope.gain.exponentialRampToValueAtTime(0.0001, start + length);
  source.connect(filter).connect(envelope).connect(out);
  source.start(start);
}

// A tile set down on wood: a soft knock with a little body.
function knock(at, pitch = 1, gain = 0.35) {
  noise({ at, length: 0.045, freq: 1400 * pitch, q: 2.5, gain });
  tone({ at, freq: 230 * pitch, to: 160 * pitch, length: 0.09, type: 'triangle', gain: gain * 0.7 });
}

const notes = (list, { gap = 0.07, length = 0.3, type = 'sine', gain = 0.18 } = {}) => {
  list.forEach((freq, i) => tone({ at: i * gap, freq, length, type, gain }));
};

const SOUNDS = {
  pick: () => noise({ length: 0.03, freq: 2600, q: 3, gain: 0.22 }),
  place: () => knock(0),
  blank: () => knock(0, 1.25, 0.3),
  swap: () => { knock(0, 1.1, 0.28); knock(0.09, 0.95, 0.3); },
  remove: () => {
    tone({ freq: 520, to: 180, length: 0.16, type: 'triangle', gain: 0.22 });
    noise({ length: 0.12, freq: 900, to: 300, gain: 0.15 });
  },
  turn: () => notes([659, 988], { gap: 0.11, length: 0.45, gain: 0.16 }),
  tick: () => tone({ freq: 1500, length: 0.03, gain: 0.08 }),
  challenge: () => {
    noise({ length: 0.08, freq: 600, q: 0.8, gain: 0.25 });
    notes([440, 587], { gap: 0.09, length: 0.22, type: 'triangle', gain: 0.24 });
  },
  valid: () => notes([523, 659, 784, 1047], { gap: 0.06, length: 0.4, gain: 0.15 }),
  complete: () => notes([659, 784, 1047], { gap: 0.06, length: 0.35, gain: 0.14 }),
  bluff: () => {
    tone({ freq: 160, to: 70, length: 0.3, gain: 0.4 });
    noise({ length: 0.1, freq: 300, q: 0.7, gain: 0.2 });
  },
  stalemate: () => notes([392, 392], { gap: 0.14, length: 0.2, type: 'triangle', gain: 0.14 }),
  draw: () => noise({ length: 0.25, freq: 500, to: 2200, q: 1, gain: 0.12 }),
  round: () => {
    noise({ length: 0.3, freq: 400, to: 1800, q: 0.9, gain: 0.1 });
    for (let i = 0; i < 4; i++) knock(0.12 + i * 0.06 + Math.random() * 0.02, 1.2 + Math.random() * 0.3, 0.15);
  },
  skip: () => tone({ freq: 500, to: 420, length: 0.12, type: 'triangle', gain: 0.12 }),
  timeout: () => notes([392, 294], { gap: 0.13, length: 0.25, type: 'triangle', gain: 0.16 }),
  out: () => notes([523, 440, 349], { gap: 0.12, length: 0.3, type: 'triangle', gain: 0.14 }),
  chat: () => tone({ freq: 620, to: 900, length: 0.07, gain: 0.14 }),
  join: () => { knock(0, 0.8, 0.3); knock(0.16, 0.8, 0.3); },
  settings: () => notes([784, 1047], { gap: 0.08, length: 0.3, gain: 0.12 }),
  win: () => {
    notes([523, 659, 784], { gap: 0.1, length: 0.25, type: 'triangle', gain: 0.18 });
    tone({ at: 0.32, freq: 1047, length: 0.9, type: 'triangle', gain: 0.2 });
    tone({ at: 0.32, freq: 1319, length: 0.9, gain: 0.1 });
  },
  gameOver: () => notes([659, 523], { gap: 0.15, length: 0.4, gain: 0.14 }),
};

// Plays one of the sounds above at the volume chosen in Preferences. Quiet
// sounds (other players' moves) play at about half volume.
function playSound(name, { quiet = false } = {}) {
  const volume = soundVolume();
  if (volume === 0 || !SOUNDS[name]) return;
  try {
    if (!audioOut()) return;
    // Each sound gets its own volume, so a quiet one never turns down another.
    const out = audio.context.createGain();
    out.gain.value = (volume / 100) * (quiet ? 0.5 : 1);
    out.connect(audio.context.destination);
    audio.out = out;
    SOUNDS[name]();
  } catch {
    // Sound is a nice extra; the game works without it.
  }
}
