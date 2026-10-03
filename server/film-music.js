// A soundtrack is a program too: the music bed for a film is synthesised from the film's seed and mood, so the same
// film always has the same music, and it is licensed like everything else (it is Oasis's own, free).
//
// Three voices, all textbook: a plucked arpeggio by Karplus-Strong string synthesis (Karplus & Strong, "Digital
// Synthesis of Plucked-String and Drum Timbres", Computer Music Journal 1983; the same loop Tone.js's PluckSynth
// builds from a LowpassCombFilter, Tone/instrument/PluckSynth.ts), a detuned-triangle pad through a one-pole
// low-pass, and a sine bass. Output is 16-bit stereo WAV (RIFF layout as in the WAV spec, same as node-wav writes).
const SR = 44100;

const rng = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const hash = (s) => [...String(s)].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 17);
const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

// Moods: tempo, scale (semitones from the root), chord roots (scale degrees), register.
export const MOODS = {
  warm: { bpm: 84, scale: [0, 2, 4, 7, 9], chords: [[0, 4, 7], [9, 12, 16], [5, 9, 12], [7, 11, 14]], root: 57, pad: 0.13, pluck: 0.3 },   // major pentatonic, I vi IV V
  bright: { bpm: 96, scale: [0, 2, 4, 7, 9], chords: [[0, 4, 7], [5, 9, 12], [7, 11, 14], [0, 4, 7]], root: 60, pad: 0.1, pluck: 0.32 }, // I IV V I
  cool: { bpm: 76, scale: [0, 3, 5, 7, 10], chords: [[0, 3, 7], [8, 12, 15], [5, 8, 12], [7, 10, 14]], root: 55, pad: 0.16, pluck: 0.26 },  // minor pentatonic, i VI iv v
};
export const moodOf = (theme, time) => (time === "night" ? "cool" : theme === "seaside" || theme === "candy" ? "bright" : theme === "winter" ? "cool" : "warm");

function pluck(freq, seconds, r) {
  const n = Math.round(SR / freq), out = new Float32Array(Math.round(seconds * SR));
  const buf = new Float32Array(n);
  for (let i = 0; i < n; i++) buf[i] = r() * 2 - 1;
  let last = 0;
  for (let i = 0; i < out.length; i++) {
    const k = i % n;
    const v = buf[k];
    buf[k] = 0.5 * (v + last) * 0.996; // the averaging filter in the delay loop: the string's loss
    last = v;
    out[i] = v;
  }
  return out;
}

/** The bed for `seconds` of film: Float32 stereo interleaved, mastered with a soft clip and a fade at both ends. */
export function compose({ seed, mood = "warm", seconds = 16 }) {
  const M = MOODS[mood] || MOODS.warm;
  const r = rng(hash(seed));
  const total = Math.ceil((seconds + 1.5) * SR);
  const L = new Float32Array(total), R = new Float32Array(total);
  const beat = 60 / M.bpm, bar = beat * 4;
  const rootShift = [0, 2, 3, 5, 7, -2, -4][Math.floor(r() * 7)];
  const root = M.root + rootShift;
  const bars = Math.ceil((seconds + 1.5) / bar);
  const arp = Array.from({ length: 8 }, () => (r() < 0.78 ? Math.floor(r() * 5) : -1)); // 8ths; -1 is a rest
  let lp = 0;
  for (let b = 0; b < bars; b++) {
    const chord = M.chords[b % M.chords.length], t0 = b * bar;
    // pad: three detuned triangle pairs, slow attack, bar-long release
    for (let i = Math.floor(t0 * SR); i < Math.min(total, (t0 + bar) * SR); i++) {
      const t = i / SR - t0, env = Math.min(1, t / 0.6) * (t > bar - 0.4 ? (bar - t) / 0.4 : 1);
      let v = 0;
      for (const n of chord) { const f = midi(root + n); const tri = (p) => 2 * Math.abs(2 * ((p % 1) + 1) % 1 - 1) - 1; v += tri(f * (i / SR)) + tri(f * 1.003 * (i / SR)); }
      lp += 0.02 * (v / 6 - lp); // one-pole low-pass, the pad's warmth
      L[i] += lp * M.pad * env; R[i] += lp * M.pad * env;
      const bass = Math.sin(2 * Math.PI * midi(root + chord[0] - 24) * (i / SR)) * 0.13 * Math.min(1, t / 0.05) * Math.exp(-t * 0.25);
      L[i] += bass; R[i] += bass;
    }
    // plucks: an arpeggio of chord and scale tones, panned left and right by turns
    for (let s = 0; s < 8; s++) {
      const deg = arp[(s + b * 3) % 8];
      if (deg < 0) continue;
      const note = root + 12 + (s % 2 === 0 ? chord[deg % 3] : M.scale[deg]) + (deg > 3 ? 12 : 0);
      const start = Math.floor((t0 + s * beat * 0.5) * SR);
      if (start >= total) break;
      const p = pluck(midi(note), 1.6, r), g = M.pluck * (s % 4 === 0 ? 1 : 0.7), pan = s % 2 ? 0.7 : 0.3;
      for (let i = 0; i < p.length && start + i < total; i++) { L[start + i] += p[i] * g * (1 - pan); R[start + i] += p[i] * g * pan; }
    }
    // brush: a whisper of noise on the off-beats
    for (let s = 1; s < 8; s += 2) {
      const start = Math.floor((t0 + s * beat * 0.5) * SR);
      for (let i = 0; i < SR * 0.05 && start + i < total; i++) { const v = (r() * 2 - 1) * 0.035 * (1 - i / (SR * 0.05)); L[start + i] += v; R[start + i] += v; }
    }
  }
  const fadeIn = 0.4 * SR, fadeOut = 1.6 * SR, end = Math.floor(seconds * SR) + Math.floor(0.6 * SR);
  for (let i = 0; i < total; i++) {
    let g = i < fadeIn ? i / fadeIn : 1;
    if (i > end - fadeOut) g *= Math.max(0, (end - i) / fadeOut);
    L[i] = Math.tanh(L[i] * 1.4) * g; R[i] = Math.tanh(R[i] * 1.4) * g;
  }
  return { left: L, right: R, sampleRate: SR, seconds: total / SR, bpm: M.bpm, root, mood };
}

/** 16-bit stereo PCM WAV. */
export function toWav({ left, right, sampleRate }) {
  const n = left.length, data = Buffer.alloc(n * 4);
  for (let i = 0; i < n; i++) {
    data.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(left[i] * 32767))), i * 4);
    data.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(right[i] * 32767))), i * 4 + 2);
  }
  const h = Buffer.alloc(44);
  h.write("RIFF", 0); h.writeUInt32LE(36 + data.length, 4); h.write("WAVE", 8);
  h.write("fmt ", 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(2, 22);
  h.writeUInt32LE(sampleRate, 24); h.writeUInt32LE(sampleRate * 4, 28); h.writeUInt16LE(4, 32); h.writeUInt16LE(16, 34);
  h.write("data", 36); h.writeUInt32LE(data.length, 40);
  return Buffer.concat([h, data]);
}

export const musicFor = (film) => toWav(compose({ seed: film.music?.seed ?? film.id ?? film.brief, mood: film.music?.mood, seconds: film.seconds }));
