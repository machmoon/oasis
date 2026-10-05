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

// ---------- the cut's sound: whooshes, risers, hits, ticks ----------
// A speed ramp or a whip without a sound is half a cut. These are the stock sound-design gestures of an edit, each a
// few lines of synthesis: a whoosh is filtered noise whose cutoff sweeps (the "swoosh" every sample library sells),
// a riser is noise and a sine climbing into the cut, a hit is a sub boom (a sine falling from 90 Hz) under a noise
// slap, a tick is a damped sine. All placed from the film's shot list, so the sound lands on the frame.
const landAt = (p, W) => { // mirrors dropOrder in public/film-fx.js
  const ground = p.asset === "town-plaza" || p.asset === "town-road";
  const h = (([...String(p.id)].reduce((a, c) => (Math.imul(a, 31) + c.charCodeAt(0)) | 0, 7) >>> 0) % 1000) / 1000;
  return ground ? 0.04 + 0.14 * h : 0.22 + 0.62 * Math.min(1, Math.max(0, p.at[0] / Math.max(1, W))) + 0.12 * h;
};
/** The sound events a film's cut asks for, as { t, kind, ... } in seconds on the film's clock. */
export function eventsOf(film) {
  const out = [];
  let start = 0;
  const W = film.world?.size?.[0] || 30;
  for (const s of film.shots || []) {
    if (s.cut === "whip") out.push({ t: start - 0.15, kind: "whoosh", len: 0.45 });
    if (s.cut === "zoom") out.push({ t: start - 0.12, kind: "whoosh", len: 0.35, up: true });
    if (s.cut === "glitch") out.push({ t: start - 0.04, kind: "glitch" });
    if (s.cut === "flash") { out.push({ t: start - 0.7, kind: "riser", len: 0.7 }); out.push({ t: start, kind: "hit", soft: true }); }
    if (s.title) { const at = start + (s.title.at ?? 1); out.push({ t: at - 0.45, kind: "riser", len: 0.45 }); out.push({ t: at, kind: "hit" }); }
    if (s.build) for (const p of film.world?.placements || []) if (["town-shop", "town-house", "town-flats", "town-stall", "town-torii"].includes(p.asset)) out.push({ t: start + landAt(p, W) * (s.build - 0.55) + 0.5, kind: "tick" });
    if (s.rebuild) {
      const n = s.rebuild.steps.length, S = s.seconds, span = Math.min(0.62 * S, 0.9 * (n + 1)), t0 = Math.max(0.3, 0.2 * S), each = span / (n + 1); // the player's rebuildBeats
      for (let k = 0; k <= n; k++) out.push({ t: start + t0 + k * each, kind: "click", up: k < n });
    }
    start += s.seconds;
  }
  return out.filter((e) => e.t >= 0).sort((a, b) => a.t - b.t);
}
function sfx(L, R, total, events, r) {
  const add = (start, n, f) => { const s0 = Math.floor(start * SR); for (let i = 0; i < n && s0 + i < total; i++) { if (s0 + i < 0) continue; const [l, rr] = f(i / SR, i / n); L[s0 + i] += l; R[s0 + i] += rr; } };
  for (const e of events) {
    if (e.kind === "whoosh") {
      let lp = 0, bp = 0;
      const n = Math.round(e.len * SR);
      add(e.t, n, (t, u) => {
        const env = Math.sin(Math.PI * u) ** 1.6, cut = e.up ? 0.02 + 0.3 * u : 0.3 - 0.26 * u;
        const w = r() * 2 - 1; lp += cut * (w - lp); bp += 0.5 * (lp - bp);
        const v = (lp - bp) * 2.2 * env * 0.9;
        const pan = e.up ? 0.5 : 0.25 + 0.5 * u;
        return [v * (1 - pan) * 2, v * pan * 2];
      });
    } else if (e.kind === "riser") {
      let lp = 0;
      const n = Math.round(e.len * SR);
      add(e.t, n, (t, u) => {
        const env = u * u, w = r() * 2 - 1; lp += (0.01 + 0.25 * u) * (w - lp);
        const tone = Math.sin(2 * Math.PI * (220 + 660 * u * u) * t) * 0.08;
        const v = (lp * 1.6 + tone) * env * 0.5;
        return [v, v];
      });
    } else if (e.kind === "hit") {
      const g = e.soft ? 0.45 : 1;
      add(e.t, Math.round(0.6 * SR), (t) => { const f = 90 * Math.exp(-t * 6) + 38, v = Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 4.5) * 0.55 * g; return [v, v]; });
      add(e.t, Math.round(0.08 * SR), (t, u) => { const v = (r() * 2 - 1) * (1 - u) * 0.3 * g; return [v, v]; });
    } else if (e.kind === "glitch") {
      add(e.t, Math.round(0.14 * SR), (t, u) => { const v = (Math.sin(2 * Math.PI * 1100 * t) > 0 ? 1 : -1) * ((Math.floor(t * 180) % 2) ? 0.08 : 0) * (1 - u); return [v, -v]; });
    } else if (e.kind === "tick") {
      add(e.t, Math.round(0.07 * SR), (t) => { const v = Math.sin(2 * Math.PI * 1400 * t) * Math.exp(-t * 90) * 0.16 + (r() * 2 - 1) * Math.exp(-t * 200) * 0.1; return [v, v]; });
    } else if (e.kind === "click") {
      add(e.t, Math.round(0.12 * SR), (t) => { const f = e.up ? 520 + 900 * t * 8 : 880 - 500 * t * 8, v = Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 40) * 0.2 + (r() * 2 - 1) * Math.exp(-t * 300) * 0.12; return [v, v]; });
    }
  }
}

/** The bed for `seconds` of film: Float32 stereo interleaved, mastered with a soft clip and a fade at both ends. */
export function compose({ seed, mood = "warm", seconds = 16, events = [] }) {
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
  sfx(L, R, total, events, rng(hash(seed) ^ 0x5f3759df));
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

export const musicFor = (film) => toWav(compose({ seed: film.music?.seed ?? film.id ?? film.brief, mood: film.music?.mood, seconds: film.seconds, events: eventsOf(film) }));
