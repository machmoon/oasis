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
//
// Inner loops (every sound runs these per sample in the QuickJS interpreter, where a closure call, a property read
// or a Math.* lookup each cost about as much as the arithmetic):
// - Filter state lives in locals for the length of a block and goes back to the object after it, as Chromium's
//   Web Audio BiquadFilterNode does (third_party/blink/renderer/platform/audio/biquad.cc, Biquad::Process: "Create
//   local copies of member variables" ... "Local variables back to member"); `filter(buf, biquad(...))` takes that
//   block path. Coefficients are computed once per filter, not per sample.
// - Delay lines wrap with a compare instead of a modulo, one named buffer and index per line, as Jezar's Freeverb
//   does (Components/comb.hpp, comb::process: `if(++bufidx>=bufsize) bufidx = 0;`).
// - The PRNG fills a whole block from a local copy of its state (noise/pink/brown call r.fill rather than r() per
//   sample) and caches Math.imul. Same sequence, same samples.
// - ring() and env() advance their decaying sine and exponential by one complex/real multiply per sample instead
//   of calling Math.sin and Math.exp per sample. ring() is Faust's damped 2D-rotation resonator (faustlibraries
//   filters.lib `nlf2(f,r,x)`: rotate by cos/sin(2πf/SR), scale by r; oscillators.lib `oscrq` is its r = 1 case). This is the one change that is not bit-exact: it differs from the
//   libm calls by a float32 rounding step at most (about 1.5e-8, checked over the catalogue). It is plain IEEE
//   double arithmetic, so the browser Worker, the CDN import (V8) and the sandbox (QuickJS) still agree bit for bit.

export const TAU = Math.PI * 2;

/** Seeded PRNG: the same seed is the same sequence in every runtime. */
const imul = Math.imul;
export function rng(seed) {
  // `(a + k) | 0` is the same int32 whether a starts as uint32 or int32, so the old leading `a |= 0` is not needed.
  let a = (Number(seed) >>> 0) || 1;
  const r = () => { a = (a + 0x6d2b79f5) | 0; let t = imul(a ^ (a >>> 15), 1 | a); t = (t + imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  /** out[i] = r() * mul + add for i in [0, n): the same draws as n calls of r(), from a local copy of the state. */
  r.fill = (out, n, mul, add) => {
    let s = a;
    for (let i = 0; i < n; i++) { s = (s + 0x6d2b79f5) | 0; let t = imul(s ^ (s >>> 15), 1 | s); t = (t + imul(t ^ (t >>> 7), 61 | t)) ^ t; out[i] = ((t ^ (t >>> 14)) >>> 0) / 4294967296 * mul + add; }
    a = s; return out;
  };
  return r;
}
// White noise in [-1, 1) as doubles (r() * 2 - 1 per draw), through r.fill when the PRNG has it.
function white(r, n) { const w = new Float64Array(n); if (r.fill) return r.fill(w, n, 2, -1); for (let i = 0; i < n; i++) w[i] = r() * 2 - 1; return w; }
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
  const f = (x) => { const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = x; y2 = y1; y1 = y; return y; };
  // Block path (Chromium Biquad::Process): state into locals, the loop, state back. Same arithmetic as f; with
  // `gains`, each output is y * gains[i] (rounded once, as `fl(x) * e[i]` was).
  f.process = (buf, gains) => {
    let p1 = x1, p2 = x2, q1 = y1, q2 = y2;
    const n = buf.length;
    if (gains) for (let i = 0; i < n; i++) { const x = buf[i], y = b0 * x + b1 * p1 + b2 * p2 - a1 * q1 - a2 * q2; p2 = p1; p1 = x; q2 = q1; q1 = y; buf[i] = y * gains[i]; }
    else for (let i = 0; i < n; i++) { const x = buf[i], y = b0 * x + b1 * p1 + b2 * p2 - a1 * q1 - a2 * q2; p2 = p1; p1 = x; q2 = q1; q1 = y; buf[i] = y; }
    x1 = p1; x2 = p2; y1 = q1; y2 = q2; return buf;
  };
  return f;
}
/** One-pole lowpass with a cutoff you can move per sample: returns (x, f0) => y. */
export function onepole(sr) {
  // The coefficient is recomputed only when the cutoff changes: most callers hold it still for a whole buffer.
  let y = 0, lf = NaN, k = 0;
  const hi = sr * 0.49, exp = Math.exp;
  const f = (x, f0) => { if (f0 !== lf) { lf = f0; k = 1 - exp(-TAU * (f0 > hi ? hi : f0 < 5 ? 5 : f0) / sr); } y += k * (x - y); return y; };
  /** Block path at a fixed cutoff, in place: the same y as calling f(buf[i], f0) for each i. */
  f.process = (buf, f0) => { if (f0 !== lf) { lf = f0; k = 1 - exp(-TAU * (f0 > hi ? hi : f0 < 5 ? 5 : f0) / sr); } let s = y; const n = buf.length; for (let i = 0; i < n; i++) { s += k * (buf[i] - s); buf[i] = s; } y = s; return buf; };
  return f;
}
/** Runs a whole buffer through a filter function, in place. */
export function filter(buf, fn) { if (fn.process) return fn.process(buf); for (let i = 0; i < buf.length; i++) buf[i] = fn(buf[i]); return buf; }

// ---------- sources ----------
export function noise(r, n) { const out = new Float32Array(n); if (r.fill) return r.fill(out, n, 2, -1); for (let i = 0; i < n; i++) out[i] = r() * 2 - 1; return out; }
/** Pink noise (Tone.js Noise.ts, Paul Kellet's filter). */
export function pink(r, n) {
  const out = new Float32Array(n), ws = white(r, n); let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < n; i++) {
    const w = ws[i];
    b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852;
    b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
    out[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11; b6 = w * 0.115926;
  }
  return out;
}
/** Brown noise (Tone.js Noise.ts: a leaky integrator over white noise). */
export function brown(r, n) { const out = new Float32Array(n), ws = white(r, n); let last = 0; for (let i = 0; i < n; i++) { last = (last + 0.02 * ws[i]) / 1.02; out[i] = last * 3.5; } return out; }
/**
 * An oscillator: shape "sine" | "tri" | "saw" | "square", freq a number or (t, i) => Hz (sweeps), duty for square.
 * Phase accumulates per sample, so a sweep never clicks (jsfxr slides the period the same way).
 */
export function osc(shape, freq, n, sr, { duty = 0.5, phase = 0 } = {}) {
  // The shape and a fixed frequency are resolved once, outside the loop; the per-sample arithmetic is unchanged.
  const out = new Float32Array(n), fn = typeof freq === "function", step = fn ? 0 : freq / sr, floor = Math.floor, sin = Math.sin, abs = Math.abs;
  const k = shape === "sine" ? 0 : shape === "tri" ? 1 : shape === "saw" ? 2 : 3;
  let ph = phase;
  for (let i = 0; i < n; i++) {
    const fp = ph - floor(ph);
    out[i] = k === 0 ? sin(TAU * fp) : k === 1 ? 1 - 4 * abs(fp - 0.5) : k === 2 ? 2 * fp - 1 : fp < duty ? 1 : -1;
    ph += fn ? freq(i / sr, i) / sr : step;
  }
  return out;
}
/** Damped modes: [[Hz, amp], ...] ringing with one decay time (seconds to 1/e), the body of any struck object. */
export function ring(modes, dur, decay, sr, amp = 1) {
  const n = seconds(dur, sr), out = new Float32Array(n);
  // a·e^(d·i)·sin(w·i) as a rotating, shrinking phasor (re, im) *= e^d·(cos w, sin w): one complex multiply per
  // sample instead of Math.sin + Math.exp. Re-anchored from libm every 4096 samples so rounding can't accumulate.
  for (const [f, a] of modes) {
    const w = TAU * f / sr, d = -1 / (decay * sr), g = a * amp, ed = Math.exp(d), cr = ed * Math.cos(w), ci = ed * Math.sin(w);
    let re = 1, im = 0;
    for (let i = 0; i < n; i++) {
      if ((i & 4095) === 0) { const m = Math.exp(d * i); re = m * Math.cos(w * i); im = m * Math.sin(w * i); }
      out[i] += g * im; const t = re * cr - im * ci; im = re * ci + im * cr; re = t;
    }
  }
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
export function env(n, attack, decay, sr) {
  // The decay runs as a running product (one multiply per sample, re-anchored from Math.exp every 4096 samples).
  const out = new Float32Array(n), a = Math.max(1, attack * sr), d = Math.max(1, decay * sr), k = Math.exp(-1 / d);
  let i = 0;
  for (; i < n && i <= a; i++) out[i] = i < a ? i / a : 1;
  let e = 0;
  for (let j = 0; i < n; i++, j++) { if ((j & 4095) === 0) e = Math.exp(-(i - a) / d); out[i] = e; e *= k; }
  return out;
}
/** jsfxr's three-stage envelope: attack, sustain (with punch: starts at 1 + 2·punch and falls to 1), linear decay. */
export function adsr(n, { attack = 0.005, sustain = 0.1, decay = 0.2, punch = 0 }, sr) {
  const out = new Float32Array(n), a = attack * sr, s = sustain * sr, d = decay * sr;
  for (let i = 0; i < n; i++) out[i] = i < a ? i / Math.max(1, a) : i < a + s ? 1 + (1 - (i - a) / Math.max(1, s)) * 2 * punch : Math.max(0, 1 - (i - a - s) / Math.max(1, d));
  return out;
}
/** A filtered noise burst with an attack/decay envelope: the grain of gravel, a click, a scuff. */
export function burst(r, dur, type, f0, Q, attack, decay, sr) { const n = seconds(dur, sr), e = env(n, attack, decay, sr), x = noise(r, n); return biquad(type, f0, Q, sr).process(x, e); }

// ---------- combining ----------
/** Adds src into out at `at` seconds with a gain; the way every layer lands on the timeline. */
export function mix(out, src, at, gain, sr) { const o = Math.round(at * sr); for (let i = Math.max(0, -o); i < src.length && o + i < out.length; i++) out[o + i] += src[i] * gain; return out; }
export function gain(buf, g) { for (let i = 0; i < buf.length; i++) buf[i] *= g; return buf; }
export function multiply(buf, e) { for (let i = 0; i < buf.length; i++) buf[i] *= e[i] ?? 0; return buf; }
/** Peak-normalise to `peak`, then a soft tanh ceiling so layers can't clip. */
export function finish(buf, peak = 0.9, drive = 1) {
  const n = buf.length, tanh = Math.tanh; let p = 0;
  for (let i = 0; i < n; i++) { const v = buf[i], a = v < 0 ? -v : v; if (a > p || a !== a) p = a; } // a NaN sticks, as Math.max(p, NaN) did
  const g = peak / Math.max(p, 1e-6), post = drive > 1 ? peak / tanh(peak * drive) : 1;
  for (let i = 0; i < n; i++) buf[i] = tanh(buf[i] * g * drive) * post;
  return buf;
}
/** Fades the first and last `ms` so a loop or a cut never clicks. */
export function fade(buf, ms, sr) { const n = Math.min(buf.length >> 1, Math.round(ms / 1000 * sr)); for (let i = 0; i < n; i++) { const k = i / n; buf[i] *= k; buf[buf.length - 1 - i] *= k; } return buf; }
/** Schroeder reverb (four combs, two allpasses), a small room for doors, impacts and footsteps. mixAmt 0..1. */
export function reverb(buf, { size = 0.5, decay = 0.6, mixAmt = 0.2 } = {}, sr) {
  // Each line is its own buffer, index and length in locals, wrapped Freeverb-style (comb.hpp) rather than `% d`.
  const cl = (d) => Math.round(d * (0.6 + size) * sr / 44100), al = (d) => Math.round(d * sr / 44100);
  const d0 = cl(1116), d1 = cl(1188), d2 = cl(1277), d3 = cl(1356), e0 = al(556), e1 = al(441);
  const c0 = new Float32Array(d0), c1 = new Float32Array(d1), c2 = new Float32Array(d2), c3 = new Float32Array(d3), p0 = new Float32Array(e0), p1 = new Float32Array(e1);
  let i0 = 0, i1 = 0, i2 = 0, i3 = 0, j0 = 0, j1 = 0;
  const fb = 0.7 + 0.28 * decay, dry = 1 - mixAmt, N = buf.length, out = new Float32Array(N);
  for (let n = 0; n < N; n++) {
    const x = buf[n]; let y = 0, v;
    v = c0[i0]; c0[i0] = x + v * fb; if (++i0 >= d0) i0 = 0; y += v;
    v = c1[i1]; c1[i1] = x + v * fb; if (++i1 >= d1) i1 = 0; y += v;
    v = c2[i2]; c2[i2] = x + v * fb; if (++i2 >= d2) i2 = 0; y += v;
    v = c3[i3]; c3[i3] = x + v * fb; if (++i3 >= d3) i3 = 0; y += v;
    y *= 0.25;
    v = p0[j0]; let w = y + v * 0.5; p0[j0] = w; if (++j0 >= e0) j0 = 0; y = v - w * 0.5;
    v = p1[j1]; w = y + v * 0.5; p1[j1] = w; if (++j1 >= e1) j1 = 0; y = v - w * 0.5;
    out[n] = x * dry + y * mixAmt;
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
