// Scanner sweep: a rotating sensor beam passing the listener. A harmonic beam tone with a wide doppler glide, gated and brightened by a rotating lobe, a resonator tracking the glide, and a lobe-gated noise and data-blip bed. A range echo follows, plus an optional ringing tail with sonar returns.
export const meta = {
  title: "Sensor Sweep Pass", kind: "sfx", format: "sound", duration: 1.6, price: 2, author: "quietmachine", payout: "quietmachine@creators.oasis.example", kit: "Sci-fi Console", description: "A rotating starship sensor beam sweeping past with a doppler-bent, lobe-pulsed tone. Range, rotation rate, resonance, noise bed and tail are knobs, and every seed is a new pass for scanner and radar moments.",
  tags: ["scanner", "sweep", "doppler", "sci-fi", "sensor", "radar", "console", "beam"],
};
export const params = { knobs: {
  range: { type: "choice", label: "Range", default: "medium", options: ["short", "medium", "long"] },
  rate: { type: "range", label: "Sweep rate", default: 1, min: 0.5, max: 2, step: 0.05 },
  resonance: { type: "range", label: "Resonance", default: 0.5, min: 0, max: 1, step: 0.01 },
  noise: { type: "range", label: "Noise bed", default: 0.3, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, ri = params.knobs.range.options.indexOf(p.range), r = c.rng(p.seed * 7477 + ri * 97 + 3);
  const R = [
    { pass: 0.8, f0: 1150, depth: 0.26, xs: 6, dl: 0.06, eg: 0.36, tail: 0.45, ed: 0.11 },
    { pass: 1.25, f0: 1060, depth: 0.3, xs: 5, dl: 0.14, eg: 0.3, tail: 0.6, ed: 0.19 },
    { pass: 1.85, f0: 980, depth: 0.34, xs: 4.2, dl: 0.26, eg: 0.26, tail: 0.75, ed: 0.29 },
  ][ri];
  const pass = R.pass * (0.92 + 0.16 * r()), depth = R.depth * (0.85 + 0.3 * r()), endPass = pass + R.dl;
  const tailLen = p.tail ? R.tail : 0.03, n = c.seconds(endPass + tailLen, sr), out = new Float32Array(n);
  const np = c.seconds(pass, sr), main = new Float32Array(np), rel = 0.12 * pass;
  const f0 = R.f0 * (0.85 + 0.3 * r()), tc = 0.36 + 0.24 * r(), k2 = [2, 3, 1.5, 2.5][Math.floor(r() * 4)];
  const rotHz = 4.5 * p.rate * (0.9 + 0.2 * r()), lph = r() * c.TAU, dr = 0.3 + 0.5 * r(), dp = r() * c.TAU, sharp = 3 + Math.floor(r() * 3);
  const res = p.resonance, q = 1 - 0.94 * res, exc = c.noise(r, np);
  const rotPh = (t) => c.TAU * rotHz * t + lph + dr * Math.sin(c.TAU * 0.7 * t + dp);
  const lobeAt = (t) => { const b = 0.5 + 0.5 * Math.cos(rotPh(t)); let l = b; for (let j = 1; j < sharp; j++) l *= b; return l; };
  const envAt = (t) => { const x = (t / pass - tc) * R.xs; return [x, Math.min(1, t / 0.02, (pass - t) / rel) / (1 + 0.6 * x * x)]; };
  let ph = 0, lo = 0, bd = 0, fEnd = f0;
  for (let i = 0; i < np; i++) {
    const t = i / sr, [x, a] = envAt(t), v = x / Math.sqrt(1 + x * x), lobe = lobeAt(t);
    const f = f0 * (1 - depth * v) * (1 + 0.025 * Math.sin(rotPh(t)));
    ph += c.TAU * f / sr; fEnd = f;
    const s = Math.sin(ph) + (0.15 + 0.5 * lobe) * Math.sin(k2 * ph + 0.4) + (0.05 + 0.35 * lobe) * Math.sin(3 * ph);
    const fk = 2 * Math.sin(Math.PI * Math.min(f * k2, sr * 0.2) / sr);
    lo += fk * bd; const hi = 0.3 * s + 0.5 * exc[i] - lo - q * bd; bd += fk * hi;
    main[i] = a * (0.18 + 0.82 * lobe) * (0.6 * s * (1 - 0.4 * res) + bd * q * (0.2 + 1.5 * res));
  }
  c.mix(out, main, 0, 1, sr);
  const echo = Float32Array.from(main); c.filter(echo, c.biquad("lp", 3500, 0.7, sr));
  c.mix(out, echo, R.dl, R.eg, sr);
  if (p.noise > 0) {
    const bed = c.pink(r, np), bp = c.biquad("bp", f0 * 1.6, 0.8, sr), hp = c.biquad("hp", 300, 0.7, sr);
    for (let i = 0; i < np; i++) { const t = i / sr; bed[i] = bp(hp(bed[i])) * (0.3 + 0.7 * envAt(t)[1]) * (0.12 + 0.88 * lobeAt(t)) * Math.min(1, t / 0.02, (pass - t) / rel); }
    c.mix(out, bed, 0, 0.6 * p.noise, sr);
    const grains = Math.round(12 + 50 * p.noise);
    for (let g = 0; g < grains; g++) {
      const t = 0.01 + r() * (pass - 0.03), l = lobeAt(t);
      c.mix(out, c.burst(r, 0.004 + r() * 0.004, "bp", 2500 + r() * 3500, 5, 0.0004, 0.0015, sr), t, (0.06 + 0.12 * r()) * p.noise * l * (0.3 + envAt(t)[1]), sr);
    }
  }
  if (p.tail) {
    const m = c.seconds(tailLen, sr), tt = new Float32Array(m); let tp = 0;
    for (let i = 0; i < m; i++) {
      const t = i / sr, lobe = lobeAt(pass + t);
      tp += c.TAU * fEnd * (1 - 0.05 * t / tailLen) / sr;
      tt[i] = (Math.sin(tp) + 0.25 * Math.sin(k2 * tp + 0.4)) * Math.min(1, t / 0.02) * Math.exp(-t / (tailLen * 0.3)) * (0.2 + 0.8 * lobe);
    }
    c.mix(out, tt, pass - rel * 0.5, 0.16 * (0.4 + 0.9 * res), sr);
    const d = c.seconds(R.ed * (0.9 + 0.2 * r()), sr), lpf = c.onepole(sr);
    for (let i = d; i < n; i++) out[i] += 0.4 * lpf(out[i - d], 2500);
    const wet = new Float32Array(n);
    for (const s of [0.0297, 0.0371, 0.0411, 0.0437]) {
      const dd = c.seconds(s, sr), g = Math.exp(-6.9 * dd / sr / (tailLen * 0.5)), y = new Float32Array(n);
      for (let i = 0; i < n; i++) { y[i] = out[i] + (i >= dd ? g * y[i - dd] : 0); wet[i] += y[i]; }
    }
    for (let i = 0; i < n; i++) out[i] += 0.05 * wet[i];
  }
  c.filter(out, c.biquad("lp", 7000, 0.7, sr));
  const e0 = c.seconds(endPass, sr), kd = Math.exp(-3 / (sr * tailLen)), fl = c.seconds(tailLen * 0.35, sr);
  let gEnv = 1;
  for (let i = e0; i < n; i++) { gEnv *= kd; out[i] *= gEnv; }
  for (let i = Math.max(0, n - fl); i < n; i++) out[i] *= (n - i) / fl;
  c.fade(c.finish(out, 0.9), 10, sr);
  return { samples: out };
}
