// The sound DSP kit: the `ctx` every sound program's build(knobs, ctx) receives. Pure math on Float32Arrays, no
// Web Audio, no Node, no DOM, so the same module runs in the server's QuickJS sandbox, in a browser Worker, in Node
// and inside a licensed CDN import, and the same knobs give the same samples everywhere.
//
// Where the pieces come from (all read in source, not from memory):
// - rng: mulberry32 (the seeded PRNG the rest of Oasis uses; Math.random is disabled in the sandbox).
// - biquad: RBJ Audio EQ Cookbook low/high/band-pass and notch, the same coefficients Tone.js feeds its
//   BiquadFilterNode and the mock's synth/footstep.mjs used.
// - pink/brown noise: Tone.js Tone/source/Noise.ts (Paul Kellet's pink filter, the 0.02 leaky integrator for brown).
// - pluck: Karplus-Strong as Tone.js PluckSynth builds it (Tone/instrument/PluckSynth.ts: a lowpass comb loop).
// - the envelope, sweep, square/saw/noise oscillators and the "punch" follow jsfxr's sfxr.js SoundEffect.getRawBuffer
//   (attack / sustain-with-punch / decay stages, period slides, duty cycle), rewritten over a sample rate in Hz.
// - the layering idioms (impact thump + surface grain + a wet layer; wind as filtered noise with slow gusts; rain
//   as a stream of tiny bandpassed bursts) follow Andy Farnell, Designing Sound (MIT Press 2010), chapters
//   "Footsteps", "Wind", "Rain", "Fire" and "Bouncing" practicals.
// - wav: the 44-byte RIFF/PCM16 header jsfxr's riffwave.js writes (mono here).

export const TAU = Math.PI * 2;

/** Seeded PRNG: the same seed is the same sequence in every runtime. */
export function rng(seed) {
  let a = (Number(seed) >>> 0) || 1;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
/** A number in [lo, hi) from a PRNG. */
export const between = (r, lo, hi) => lo + r() * (hi - lo);
export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
export const seconds = (s, sr) => Math.max(1, Math.round(s * sr));
export const db = (d) => Math.pow(10, d / 20);

/** RBJ cookbook biquad: type "lp" | "hp" | "bp" | "notch". Returns a per-sample function with its own state. */
export function biquad(type, f0, Q, sr) {
  const w = TAU * clamp(f0, 10, sr * 0.49) / sr, cw = Math.cos(w), sw = Math.sin(w), al = sw / (2 * Math.max(0.05, Q));
  let b0, b1, b2, a0 = 1 + al, a1 = -2 * cw, a2 = 1 - al;
  if (type === "lp") { b0 = (1 - cw) / 2; b1 = 1 - cw; b2 = b0; }
  else if (type === "hp") { b0 = (1 + cw) / 2; b1 = -(1 + cw); b2 = b0; }
  else if (type === "notch") { b0 = 1; b1 = -2 * cw; b2 = 1; }
  else { b0 = al; b1 = 0; b2 = -al; } // bandpass, constant skirt gain
  b0 /= a0; b1 /= a0; b2 /= a0; a1 /= a0; a2 /= a0;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  return (x) => { const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = x; y2 = y1; y1 = y; return y; };
}
/** One-pole lowpass with a cutoff you can move per sample: returns (x, f0) => y. */
export function onepole(sr) {
  let y = 0;
  return (x, f0) => { const k = 1 - Math.exp(-TAU * clamp(f0, 5, sr * 0.49) / sr); y += k * (x - y); return y; };
}
/** Runs a whole buffer through a filter function, in place. */
export function filter(buf, fn) { for (let i = 0; i < buf.length; i++) buf[i] = fn(buf[i]); return buf; }

// ---------- sources ----------
export function noise(r, n) { const out = new Float32Array(n); for (let i = 0; i < n; i++) out[i] = r() * 2 - 1; return out; }
/** Pink noise (Tone.js Noise.ts, Paul Kellet's filter). */
export function pink(r, n) {
  const out = new Float32Array(n); let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < n; i++) {
    const w = r() * 2 - 1;
    b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852;
    b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
    out[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11; b6 = w * 0.115926;
  }
  return out;
}
/** Brown noise (Tone.js Noise.ts: a leaky integrator over white noise). */
export function brown(r, n) { const out = new Float32Array(n); let last = 0; for (let i = 0; i < n; i++) { last = (last + 0.02 * (r() * 2 - 1)) / 1.02; out[i] = last * 3.5; } return out; }
/**
 * An oscillator: shape "sine" | "tri" | "saw" | "square", freq a number or (t, i) => Hz (sweeps), duty for square.
 * Phase accumulates per sample, so a sweep never clicks (jsfxr slides the period the same way).
 */
export function osc(shape, freq, n, sr, { duty = 0.5, phase = 0 } = {}) {
  const out = new Float32Array(n); let ph = phase; const f = typeof freq === "function" ? freq : () => freq;
  for (let i = 0; i < n; i++) {
    const fp = ph - Math.floor(ph);
    out[i] = shape === "sine" ? Math.sin(TAU * fp) : shape === "tri" ? 1 - 4 * Math.abs(fp - 0.5) : shape === "saw" ? 2 * fp - 1 : fp < duty ? 1 : -1;
    ph += f(i / sr, i) / sr;
  }
  return out;
}
/** Damped modes: [[Hz, amp], ...] ringing with one decay time (seconds to 1/e), the body of any struck object. */
export function ring(modes, dur, decay, sr, amp = 1) {
  const n = seconds(dur, sr), out = new Float32Array(n);
  for (const [f, a] of modes) { const w = TAU * f / sr, d = -1 / (decay * sr); for (let i = 0; i < n; i++) out[i] += a * amp * Math.sin(w * i) * Math.exp(d * i); }
  return out;
}
/** Karplus-Strong pluck (Tone.js PluckSynth: a noise burst through a lowpass comb loop). damp 0..1. */
export function pluck(r, freq, dur, sr, { damp = 0.5, loss = 0.996 } = {}) {
  const p = Math.max(2, Math.round(sr / freq)), n = seconds(dur, sr), out = new Float32Array(n), buf = noise(r, p); let last = 0;
  for (let i = 0; i < n; i++) { const k = i % p, v = buf[k]; buf[k] = (v * (1 - damp) + last * damp) * loss; last = v; out[i] = v; }
  return out;
}

// ---------- envelopes ----------
/** attack then exponential decay (seconds), the shape of almost every transient. */
export function env(n, attack, decay, sr) { const out = new Float32Array(n), a = Math.max(1, attack * sr), d = Math.max(1, decay * sr); for (let i = 0; i < n; i++) out[i] = (i < a ? i / a : 1) * Math.exp(-Math.max(0, i - a) / d); return out; }
/** jsfxr's three-stage envelope: attack, sustain (with punch: starts at 1 + 2·punch and falls to 1), linear decay. */
export function adsr(n, { attack = 0.005, sustain = 0.1, decay = 0.2, punch = 0 }, sr) {
  const out = new Float32Array(n), a = attack * sr, s = sustain * sr, d = decay * sr;
  for (let i = 0; i < n; i++) out[i] = i < a ? i / Math.max(1, a) : i < a + s ? 1 + (1 - (i - a) / Math.max(1, s)) * 2 * punch : Math.max(0, 1 - (i - a - s) / Math.max(1, d));
  return out;
}
/** A filtered noise burst with an attack/decay envelope: the grain of gravel, a click, a scuff. */
export function burst(r, dur, type, f0, Q, attack, decay, sr) { const n = seconds(dur, sr), e = env(n, attack, decay, sr), fl = biquad(type, f0, Q, sr), x = noise(r, n); for (let i = 0; i < n; i++) x[i] = fl(x[i]) * e[i]; return x; }

// ---------- combining ----------
/** Adds src into out at `at` seconds with a gain; the way every layer lands on the timeline. */
export function mix(out, src, at, gain, sr) { const o = Math.round(at * sr); for (let i = Math.max(0, -o); i < src.length && o + i < out.length; i++) out[o + i] += src[i] * gain; return out; }
export function gain(buf, g) { for (let i = 0; i < buf.length; i++) buf[i] *= g; return buf; }
export function multiply(buf, e) { for (let i = 0; i < buf.length; i++) buf[i] *= e[i] ?? 0; return buf; }
/** Peak-normalise to `peak`, then a soft tanh ceiling so layers can't clip. */
export function finish(buf, peak = 0.9, drive = 1) { let p = 0; for (let i = 0; i < buf.length; i++) p = Math.max(p, Math.abs(buf[i])); const g = peak / Math.max(p, 1e-6); for (let i = 0; i < buf.length; i++) buf[i] = Math.tanh(buf[i] * g * drive) * (drive > 1 ? peak / Math.tanh(peak * drive) : 1); return buf; }
/** Fades the first and last `ms` so a loop or a cut never clicks. */
export function fade(buf, ms, sr) { const n = Math.min(buf.length >> 1, Math.round(ms / 1000 * sr)); for (let i = 0; i < n; i++) { const k = i / n; buf[i] *= k; buf[buf.length - 1 - i] *= k; } return buf; }
/** Schroeder reverb (four combs, two allpasses), a small room for doors, impacts and footsteps. mixAmt 0..1. */
export function reverb(buf, { size = 0.5, decay = 0.6, mixAmt = 0.2 } = {}, sr) {
  const combs = [1116, 1188, 1277, 1356].map((d) => ({ d: Math.round(d * (0.6 + size) * sr / 44100), b: new Float32Array(Math.round(d * (0.6 + size) * sr / 44100)), i: 0 }));
  const aps = [556, 441].map((d) => ({ d: Math.round(d * sr / 44100), b: new Float32Array(Math.round(d * sr / 44100)), i: 0 }));
  const fb = 0.7 + 0.28 * decay, out = new Float32Array(buf.length);
  for (let n = 0; n < buf.length; n++) {
    const x = buf[n]; let y = 0;
    for (const c of combs) { const v = c.b[c.i]; c.b[c.i] = x + v * fb; c.i = (c.i + 1) % c.d; y += v; }
    y *= 0.25;
    for (const a of aps) { const v = a.b[a.i]; const w = y + v * 0.5; a.b[a.i] = w; a.i = (a.i + 1) % a.d; y = v - w * 0.5; }
    out[n] = x * (1 - mixAmt) + y * mixAmt;
  }
  return out;
}

// ---------- analysis: what the harness measures and the pages draw ----------
/**
 * Min/max envelope (cols pairs), a log-ish-frequency spectrogram (frames × bins, 0..255), and the numbers a grader
 * can't argue with: peak, RMS, spectral centroid in Hz, how much of the buffer is near-silent, and clipped samples.
 */
export function analyse(x, sr, { cols = 240, bins = 64, win = 512, hop = 256 } = {}) {
  const n = x.length, wave = new Array(cols), per = n / cols;
  let peak = 0, sq = 0, clipped = 0, quiet = 0;
  for (let i = 0; i < n; i++) { const v = x[i], a = Math.abs(v); if (a > peak) peak = a; sq += v * v; if (a >= 0.999) clipped++; if (a < 0.002) quiet++; }
  for (let c = 0; c < cols; c++) { let lo = 0, hi = 0; for (let i = Math.floor(c * per); i < Math.floor((c + 1) * per); i++) { if (x[i] < lo) lo = x[i]; if (x[i] > hi) hi = x[i]; } wave[c] = [Math.round(lo * 1000) / 1000, Math.round(hi * 1000) / 1000]; }
  const frames = Math.max(1, Math.floor((n - win) / hop)), spec = new Array(frames), hann = new Float32Array(win);
  for (let i = 0; i < win; i++) hann[i] = 0.5 - 0.5 * Math.cos(TAU * i / win);
  const maxK = win / 2; // bins span 0..sr/2 on a curve that gives the low end room
  const ks = new Array(bins); for (let b = 0; b < bins; b++) ks[b] = Math.min(maxK - 1, Math.round(Math.pow((b + 0.5) / bins, 1.8) * (maxK - 2)) + 1);
  let cSum = 0, cW = 0;
  const cosT = new Float32Array(win), sinT = new Float32Array(win); for (let i = 0; i < win; i++) { cosT[i] = Math.cos(TAU * i / win); sinT[i] = Math.sin(TAU * i / win); }
  for (let f = 0; f < frames; f++) {
    const row = new Array(bins), o = f * hop;
    for (let b = 0; b < bins; b++) {
      const k = ks[b]; let re = 0, im = 0;
      for (let i = 0; i < win; i++) { const v = (x[o + i] || 0) * hann[i], idx = (k * i) % win; re += v * cosT[idx]; im -= v * sinT[idx]; }
      const mag = Math.sqrt(re * re + im * im) / win * 4;
      cSum += mag * (k * sr / win); cW += mag;
      row[b] = Math.max(0, Math.min(255, Math.round((20 * Math.log10(mag + 1e-6) + 72) / 72 * 255)));
    }
    spec[f] = row;
  }
  return { seconds: n / sr, sr, peak: Math.round(peak * 1000) / 1000, rms: Math.round(Math.sqrt(sq / Math.max(1, n)) * 1000) / 1000, centroid: Math.round(cW > 0 ? cSum / cW : 0), silence: Math.round(quiet / Math.max(1, n) * 1000) / 1000, clipped, wave, spec };
}

/** 16-bit mono PCM WAV bytes (the RIFF layout of jsfxr's riffwave.js). */
export function wav(samples, sr) {
  const n = samples.length, b = new Uint8Array(44 + n * 2), v = new DataView(b.buffer);
  const str = (o, s) => { for (let i = 0; i < s.length; i++) b[o + i] = s.charCodeAt(i); };
  str(0, "RIFF"); v.setUint32(4, 36 + n * 2, true); str(8, "WAVE"); str(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); str(36, "data"); v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, Math.max(-32768, Math.min(32767, Math.round(samples[i] * 32767))), true);
  return b;
}
