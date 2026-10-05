// Moonlit Motif: a two-bar 3/4 plucked-string phrase that loops seamlessly. The motif is Karplus-Strong strings or kalimba tines, with an opening chord roll, a seed-walked melody and a resolving cadence. A dotted-eighth echo, a damped comb reverb and a soft root-fifth drone are added, and every tail is folded back into the head.
export const meta = {
  title: "Moonlit Motif", kind: "music-loop", format: "sound", duration: 3.75, price: 4, author: "kickdrum", payout: "kickdrum@creators.oasis.example", kit: "Forest at Night", description: "A gentle moonlit phrase on harp, kalimba or nylon guitar that loops seamlessly, with knobs for tempo, mystery, echo and tail; each seed writes a new melody for night-forest scenes, menus and quiet reveals.",
  tags: ["music", "loop", "harp", "kalimba", "guitar", "night", "forest", "motif"],
};
export const params = { knobs: {
  instrument: { type: "choice", label: "Instrument", default: "harp", options: ["harp", "kalimba", "nylon-guitar"] },
  tempo: { type: "range", label: "Tempo (BPM)", default: 96, min: 92, max: 132, step: 1 },
  mystery: { type: "range", label: "Mystery", default: 0.4, min: 0, max: 1, step: 0.01 },
  echo: { type: "range", label: "Echo", default: 0.35, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Reverb tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, inst = p.instrument, r = c.rng(p.seed * 6151 + params.knobs.instrument.options.indexOf(inst) * 97 + 3);
  const beat = Math.min(60 / p.tempo, 3.9 / 6), n = Math.round(6 * beat * sr), L = 3 * n, acc = new Float32Array(L), m = p.mystery;
  const root = [196, 207.65, 220, 233.08][Math.floor(r() * 4)];
  const sc = m < 0.34 ? [0, 2, 4, 7, 9] : m < 0.67 ? [0, 3, 5, 7, 10] : [0, 2, 3, 7, 8];
  const hz = (d) => { const o = Math.floor(d / 5), k = ((d % 5) + 5) % 5; return root * Math.pow(2, o + sc[k] / 12); };
  const reg = inst === "nylon-guitar" ? 1 : 2;
  const ks = (f, dur, b, exc, t60) => {
    const len = c.seconds(dur, sr), o = new Float32Array(len), D = sr / f, N = Math.ceil(D) + 2, line = new Float32Array(N);
    let s = 0;
    for (let j = 0; j < N; j++) { s += (r() * 2 - 1 - s) * exc; line[j] = s; }
    const g = Math.pow(10, -3 / (t60 * f)), att = 0.002 * sr;
    let w = 0, yp = 0;
    for (let i = 0; i < len; i++) {
      let rp = w - D; while (rp < 0) rp += N;
      const i0 = rp | 0, fr = rp - i0, y = line[i0] + (line[(i0 + 1) % N] - line[i0]) * fr;
      line[w] = g * (b * y + (1 - b) * yp); yp = y; w = (w + 1) % N;
      o[i] = y * (i < att ? i / att : 1) * (i > len - 400 ? (len - i) / 400 : 1);
    }
    return o;
  };
  const play = (f, t, v) => {
    if (inst === "kalimba") {
      const k = 1 + (r() - 0.5) * 0.04;
      c.mix(acc, c.ring([[f, 1], [f * 5.93 * k, 0.2], [f * 9.4 * k, 0.05]], 1.3, 0.22 + 0.1 * r(), sr), t + 0.0015, v * 0.9, sr);
      c.mix(acc, c.burst(r, 0.008, "lp", 900 + r() * 500, 0.8, 0.0008, 0.003, sr), t, v * 0.35, sr);
    } else if (inst === "harp") c.mix(acc, ks(f, 2.4, 0.82, 0.75, 2.6 + r() * 0.6), t, v, sr);
    else c.mix(acc, ks(f, 1.6, 0.6, 0.3 + 0.1 * r(), 1.1 + r() * 0.4), t, v * 1.2, sr);
  };
  const roll = inst === "harp" ? 0.055 : inst === "nylon-guitar" ? 0.016 : 0.01;
  const chords = [0, [3, 4, 1][Math.floor(r() * 3)]];
  chords.forEach((cd, bar) => {
    const t0 = bar * 3 * beat + 0.004, notes = inst === "kalimba" ? [cd, cd + 2] : [cd, cd + 2, cd + 4];
    notes.forEach((d, j) => play(hz(d) * (inst === "kalimba" ? 1 : 0.5) * reg, t0 + j * roll * (0.8 + 0.4 * r()), (j ? 0.4 : 0.55) * (0.85 + 0.3 * r())));
  });
  let d = 5 + Math.floor(r() * 3);
  for (let e = 0; e < 12; e++) {
    const pr = e % 2 ? 0.25 : e % 6 === 0 ? 0.95 : 0.7;
    if (e !== 0 && e !== 8 && r() > pr) continue;
    if (e === 8) d = r() < 0.6 ? 5 : 7; else if (e) d = c.clamp(d + [-2, -1, -1, 1, 1, 2][Math.floor(r() * 6)], 2, 10);
    const t = e * beat / 2 + 0.004 + r() * 0.012 + (e ? roll * 2 : 0), acc1 = e % 6 === 0 ? 1 : e % 2 ? 0.6 : 0.8;
    play(hz(d) * reg / 2, t, acc1 * (0.55 + 0.35 * r()));
  }
  if (p.echo > 0) {
    const dl = Math.round(0.75 * beat * sr), dry = acc.slice();
    for (let k = 1; k <= 3; k++) {
      const lp = c.onepole(sr), gk = 0.55 * p.echo * Math.pow(0.45 + 0.3 * p.echo, k - 1);
      for (let i = 0; i < L; i++) { dry[i] = lp(dry[i], 4200 / k); if (i + k * dl < L) acc[i + k * dl] += dry[i] * gk; }
    }
  }
  c.filter(acc, c.biquad("lp", 7500 - 5200 * m, 0.7, sr));
  if (p.tail) {
    const wet = new Float32Array(L);
    [0.0297, 0.0371, 0.0411, 0.0437].forEach((dt) => {
      const D = Math.round(dt * 1.3 * sr), g = Math.pow(10, -3 * D / sr / 2.0), buf = new Float32Array(D);
      let idx = 0, lp = 0;
      for (let i = 0; i < L; i++) { const y = buf[idx]; lp = y * 0.6 + lp * 0.4; buf[idx] = acc[i] + lp * g; wet[i] += y * 0.25; if (++idx >= D) idx = 0; }
    });
    [0.005, 0.0017].forEach((dt) => {
      const D = Math.round(dt * sr), buf = new Float32Array(D);
      let idx = 0;
      for (let i = 0; i < L; i++) { const b = buf[idx], v = wet[i], y = b - 0.6 * v; buf[idx] = v + 0.6 * y; wet[i] = y; if (++idx >= D) idx = 0; }
    });
    for (let i = 0; i < L; i++) acc[i] += 0.5 * wet[i];
  }
  const fl = c.seconds(0.05, sr);
  for (let i = 0; i < fl; i++) acc[L - 1 - i] *= i / fl;
  const out = new Float32Array(n);
  for (let i = 0; i < L; i++) out[i % n] += acc[i];
  const snap = (f) => Math.max(1, Math.round(f * n / sr)) * sr / n, ph = r() * c.TAU;
  const f1 = snap(root / 2), f2 = snap(root * 0.75), f3 = snap(root), dg = 0.02 + 0.08 * m;
  for (let i = 0; i < n; i++) {
    const tr = 0.85 + 0.15 * Math.sin(c.TAU * i / n + ph);
    out[i] += dg * tr * (Math.sin(c.TAU * f1 * i / sr) + 0.6 * Math.sin(c.TAU * f2 * i / sr) + 0.35 * Math.sin(c.TAU * f3 * i / sr));
  }
  c.finish(out, 0.85);
  return { samples: out };
}
