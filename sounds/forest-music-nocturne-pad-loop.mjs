// Nocturne pad: a fixed three-second loop. Two minor-key chords cross-breathe as detuned additive voices quantised to the loop length, with a warm sub, a moving low-pass and an optional high shimmer. Two crickets chirp on a wrapped grid above it, and a wrapped comb/allpass room is rendered twice and cut on the second pass so the seam is seamless.
export const meta = {
  title: "Nocturne Pad", kind: "music-loop", format: "sound", duration: 3, price: 5, author: "kickdrum", payout: "kickdrum@creators.oasis.example", kit: "Forest at Night", description: "A dark, seamless three-second minor pad breathing between two chords under a faint cricket pulse; key, warmth, motion, chirp rate and shimmer are knobs, and each seed is a new voicing and breath of the same night.",
  tags: ["pad", "loop", "night", "forest", "crickets", "ambient", "minor", "dark"],
};
export const params = { knobs: {
  key: { type: "choice", label: "Key", default: "A-minor", options: ["A-minor", "D-minor", "E-minor"] },
  warmth: { type: "range", label: "Warmth", default: 0.55, min: 0, max: 1, step: 0.01 },
  motion: { type: "range", label: "Motion", default: 0.4, min: 0, max: 1, step: 0.01 },
  rate: { type: "range", label: "Pulse rate (chirps/s)", default: 1.7, min: 0.5, max: 4, step: 0.1 },
  shimmer: { type: "range", label: "Shimmer", default: 0.35, min: 0, max: 1, step: 0.01 },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, ki = params.knobs.key.options.indexOf(p.key), r = c.rng(p.seed * 6113 + ki * 97 + 11);
  const L = 3, n = c.seconds(L, sr), TAU = c.TAU, w = p.warmth, m = p.motion, sh = p.shimmer;
  const q = f => Math.max(1, Math.round(f * L)) / L;
  const K = [{ root: 110, a: [0, 7, 12, 15, 19], b: [-4, 3, 8, 12, 15] },
    { root: 73.42, a: [0, 7, 15, 19, 22], b: [5, 12, 17, 20, 24] },
    { root: 164.81, a: [0, 7, 12, 15, 19], b: [-2, 5, 10, 14, 17] }][ki];
  const S = 4096, T = new Float32Array(S), roll = 0.9 + 1.6 * w;
  for (let k = 1; k <= 12; k++) { const a = Math.pow(k, -roll) * (0.85 + 0.3 * r()); for (let j = 0; j < S; j++) T[j] += a * Math.sin(TAU * k * j / S); }
  let tp = 0; for (let j = 0; j < S; j++) tp = Math.max(tp, Math.abs(T[j])); for (let j = 0; j < S; j++) T[j] /= tp;
  const chords = [K.a.slice(), K.b.slice()];
  for (const ch of chords) if (r() < 0.6) { const v = 1 + Math.floor(r() * 3); ch[v] += 12; }
  const phs = (r() < 0.5 ? 0 : Math.PI) + r() * 0.4, th = Math.tanh(3);
  const e1 = i => 0.5 + 0.5 * Math.tanh(3 * Math.cos(TAU * i / n + phs)) / th;
  const pad = new Float32Array(n), va = 0.3 / Math.sqrt(5), dep = 0.05 + 0.3 * m;
  chords.forEach((ch, ci) => ch.forEach((s, v) => {
    const f = K.root * Math.pow(2, s / 12), fa = q(f), fb = fa + (1 + Math.floor(r() * 2)) / L * (r() < 0.5 ? -1 : 1);
    const ia = fa / sr * S, ib = fb / sr * S, pa0 = r() * S, pb0 = r() * S, cyc = 1 + Math.floor(r() * 3), ph = r() * TAU, fsub = q(f / 2);
    let g = 1;
    for (let i = 0; i < n; i++) {
      if ((i & 31) === 0) { const e = ci ? 1 - e1(i) : e1(i); g = e * (1 - dep * 0.5 * (1 + Math.sin(TAU * cyc * i / n + ph))); }
      let x = (T[((pa0 + i * ia) % S) | 0] + T[((pb0 + i * ib) % S) | 0]) * va;
      if (v === 0) x += Math.sin(TAU * fsub * i / sr) * 0.4 * w;
      pad[i] += x * g;
    }
  }));
  const lp1 = c.onepole(sr), lp2 = c.onepole(sr), hp = c.biquad("hp", 30, 0.7, sr), base = 500 + 3000 * (1 - w);
  const fc = 1 + Math.floor(r() * 2), phF = r() * TAU, F = new Float32Array(n); let cut = base;
  for (let i = 0; i < 2 * n; i++) {
    const j = i % n;
    if ((j & 31) === 0) cut = base * Math.exp(m * 0.7 * Math.sin(TAU * fc * j / n + phF));
    const y = hp(lp2(lp1(pad[j], cut), cut * 1.5)); if (i >= n) F[j] = y;
  }
  if (sh > 0.01) chords.forEach((ch, ci) => { for (let v = 2; v < 5; v++) {
    const f = q(K.root * Math.pow(2, ch[v] / 12) * (v === 4 ? 4 : 2) * 2), cyc = 1 + Math.floor(r() * 2), ph = r() * TAU; let am = 0;
    for (let i = 0; i < n; i++) {
      if ((i & 31) === 0) { const e = ci ? 1 - e1(i) : e1(i), s0 = 0.5 + 0.5 * Math.sin(TAU * cyc * i / n + ph); am = e * s0 * s0 * 0.035 * sh; }
      F[i] += Math.sin(TAU * f * i / sr) * am;
    }
  } });
  const cr = new Float32Array(n), plen = Math.round(0.013 * sr), pe = new Float32Array(plen);
  for (let i = 0; i < plen; i++) pe[i] = Math.min(1, i / (0.0015 * sr)) * Math.exp(-i / (0.0045 * sr));
  const chirp = (t0, car, lvl) => {
    const pulses = 3 + Math.floor(r() * 3), gap = sr / (26 + r() * 8);
    for (let u = 0; u < pulses; u++) {
      const st = t0 + Math.round(u * gap * (0.9 + 0.2 * r())), a = lvl * (0.7 + 0.3 * r()) * (u === pulses - 1 ? 0.6 : 1), cf = car * (0.995 + 0.01 * r());
      for (let i = 0; i < plen; i++) cr[(((st + i) % n) + n) % n] += Math.sin(TAU * cf * i / sr) * pe[i] * a;
    }
  };
  const cA = Math.max(1, Math.round(p.rate * L)), cB = Math.max(1, Math.round(p.rate * L * 0.6)), carA = 4300 + r() * 600, carB = 5500 + r() * 800, offB = 0.3 + 0.4 * r();
  for (let k = 0; k < cA; k++) if (r() < 0.92) chirp(Math.round((k + 0.04 * (r() - 0.5)) / cA * n), carA, k % 2 ? 0.8 : 1);
  for (let k = 0; k < cB; k++) if (r() < 0.7) chirp(Math.round((k + offB + 0.05 * (r() - 0.5)) / cB * n), carB, 0.5);
  let rms = 0, cp = 1e-9; for (let i = 0; i < n; i++) { rms += F[i] * F[i]; cp = Math.max(cp, Math.abs(cr[i])); }
  rms = Math.sqrt(rms / n); const cs = 0.9 * rms / cp; for (let i = 0; i < n; i++) cr[i] *= cs;
  const N = 2 * n, y = new Float32Array(N), fbk = 0.72 + 0.14 * sh, damp = 0.25 + 0.4 * (1 - w);
  for (const d0 of [0.0297, 0.0371, 0.0411, 0.0437]) {
    const d = Math.round(d0 * (0.8 + 0.6 * sh) * sr * (0.97 + 0.06 * r())), buf = new Float32Array(d); let idx = 0, lp = 0;
    for (let i = 0; i < N; i++) { const j = i % n, o = buf[idx]; lp += damp * (o - lp); buf[idx] = F[j] + 0.3 * cr[j] + lp * fbk; if (++idx >= d) idx = 0; y[i] += o * 0.25; }
  }
  for (const d0 of [0.005, 0.0017]) {
    const d = Math.round(d0 * sr), buf = new Float32Array(d); let idx = 0;
    for (let i = 0; i < N; i++) { const o = -0.5 * y[i] + buf[idx]; buf[idx] = y[i] + 0.5 * o; y[i] = o; if (++idx >= d) idx = 0; }
  }
  const mx = 0.2 + 0.35 * sh, out = new Float32Array(n); let pk = 1e-9;
  for (let i = 0; i < n; i++) { out[i] = F[i] * (1 - 0.4 * mx) + y[n + i] * mx * 1.4 + cr[i]; pk = Math.max(pk, Math.abs(out[i])); }
  for (let i = 0; i < n; i++) out[i] *= 0.85 / pk;
  return { samples: out };
}
