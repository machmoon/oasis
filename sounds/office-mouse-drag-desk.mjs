// Mouse drag: a mouse swiped across a desk in speed-dependent strokes. Layers: a surface-coloured friction bed driven by a stick-slip pulse train that follows hand velocity, grit grains, a low plastic foot thrum, an optional cable layer (rumble, rub, thumps) and a set-down tail.
export const meta = {
  title: "Mouse Desk Drag", kind: "foley", format: "sound", duration: 1.8, price: 1, author: "foleyroom", payout: "foleyroom@creators.oasis.example", kit: "Office", description: "A mouse swiped across a mouse pad, laminate or glass desk, with stroke speed, grit and cable drag as knobs; used for office interaction foley and desk-work scenes.",
  tags: ["mouse", "drag", "slide", "desk", "office", "friction", "foley", "cable"],
};
export const params = { knobs: {
  surface: { type: "choice", label: "Surface", default: "laminate", options: ["mouse pad", "laminate", "glass"] },
  speed: { type: "range", label: "Speed", default: 1, min: 0.5, max: 2, step: 0.05 },
  grit: { type: "range", label: "Friction grit", default: 0.4, min: 0, max: 1, step: 0.01 },
  cable: { type: "range", label: "Cable drag", default: 0.3, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Set-down tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + params.knobs.surface.options.indexOf(p.surface) * 29 + 3);
  const T = 1.5, off = 0.015, n = c.seconds(T, sr), out = new Float32Array(c.seconds(off + T + 0.35, sr));
  const pad = p.surface === "mouse pad", glass = p.surface === "glass", sp = p.speed;
  const S = { "mouse pad": [300, 1800, 70, 0.45], laminate: [1500, 6000, 140, 0.85], glass: [3500, 10000, 260, 0.35] }[p.surface];
  const k = Math.max(1, Math.round(sp * 2.2)), L = n / k, amps = [], v = new Float32Array(n);
  for (let s = 0; s < k; s++) amps.push(0.85 + 0.25 * r());
  const vs = 0.3 + 0.7 * (sp - 0.5) / 1.5;
  for (let i = 0; i < n; i++) {
    const s = Math.min(k - 1, Math.floor(i / L)), u = (i - s * L) / L;
    v[i] = Math.pow(Math.sin(Math.PI * u), 1.2) * amps[s] * vs;
  }
  const x = c.noise(r, n), hp = c.biquad("hp", S[0], 0.7, sr), l1 = c.onepole(sr), l2 = c.onepole(sr), cap = 0.45 * sr;
  const depth = Math.min(0.97, S[3] + 0.3 * p.grit);
  let ph = 0, amp = 1;
  for (let i = 0; i < n; i++) {
    ph += S[2] * (0.4 + 1.2 * v[i] / vs * vs) * (1 + 0.25 * (r() - 0.5)) / sr;
    if (ph >= 1) { ph -= 1; amp = 0.5 + 0.5 * r(); }
    const m = (1 - depth) + depth * amp * Math.exp(-ph * 4);
    const f = Math.min(cap, S[1] * (0.25 + 0.9 * v[i] / vs * vs));
    x[i] = l2(l1(hp(x[i]), f), f) * Math.pow(v[i], 1.3) * m * (pad ? 2.4 : 1.4);
  }
  c.mix(out, x, off, 1, sr);
  const grains = Math.round((20 + 300 * p.grit) * sp * 0.9);
  for (let g = 0; g < grains; g++) {
    const t = r() * T, a = v[Math.min(n - 1, Math.floor(t / T * n))];
    if (a < 0.08) continue;
    c.mix(out, c.burst(r, 0.002 + r() * 0.003, "bp", S[1] * (0.4 + r() * 0.7), 2 + 2 * r(), 0.0003, 0.0008 + r() * 0.001, sr), off + t, (0.15 + 0.5 * r()) * a * (0.3 + p.grit) * 1.3, sr);
  }
  const th = c.brown(r, n), tl = c.biquad("lp", pad ? 220 : 380, 0.8, sr);
  for (let i = 0; i < n; i++) th[i] = tl(th[i]) * v[i] * v[i] * (pad ? 1.2 : 0.9);
  c.mix(out, th, off, 1, sr);
  if (glass) for (let g = 0; g < 2 + Math.round(6 * p.grit); g++) {
    const t = r() * (T - 0.15), a = v[Math.floor(t / T * n)], f0 = 2600 + r() * 1200, m = c.seconds(0.05 + 0.04 * r(), sr);
    const q = c.osc("sine", (tt) => f0 * (1 + 0.25 * tt / 0.06), m, sr), e = c.env(m, 0.006, 0.03, sr);
    for (let i = 0; i < m; i++) q[i] *= e[i];
    c.mix(out, q, off + t, 0.07 * a, sr);
  }
  if (p.cable > 0) {
    const cb = c.pink(r, n), cl = c.biquad("bp", 600, 1.4, sr), lo = c.brown(r, n), ll = c.biquad("lp", 160, 0.8, sr);
    let ch = 0, kk = 0;
    for (let i = 0; i < n; i++) {
      if (ch-- <= 0) { ch = Math.floor(sr * (0.015 + 0.04 * r())); kk = r() < 0.5 ? 0.5 + r() : 0.15; }
      cb[i] = cl(cb[i]) * kk * v[i] * 1.2 + ll(lo[i]) * v[i] * 1.6;
    }
    c.mix(out, cb, off, 1.4 * p.cable, sr);
    for (let g = 0; g < 2 + Math.round(10 * p.cable); g++) {
      const t = 0.03 + r() * (T - 0.1), a = v[Math.floor(t / T * n)];
      c.mix(out, c.ring([[80 + r() * 60, 1], [210 + r() * 80, 0.3]], 0.12, 0.03, sr), off + t, (0.15 + 0.5 * p.cable) * (0.4 + a), sr);
    }
  }
  if (p.tail) {
    const at = off + T + 0.005, m = c.seconds(0.3, sr);
    c.mix(out, c.ring([[pad ? 150 : glass ? 330 : 240, 1], [pad ? 420 : 780, 0.4]], 0.2, pad ? 0.025 : 0.045, sr), at, 0.4, sr);
    c.mix(out, c.burst(r, 0.012, "bp", S[1] * 0.5, 1, 0.001, 0.004, sr), at, 0.35, sr);
    for (let g = 0; g < 3; g++) c.mix(out, c.burst(r, 0.006, "bp", S[1] * (0.3 + 0.3 * r()), 2, 0.0005, 0.002, sr), at + 0.04 + g * 0.045 + r() * 0.02, 0.18 / (1 + g), sr);
    c.mix(out, c.burst(r, 0.25, "lp", S[1] * 0.4, 0.7, 0.01, 0.06, sr), at + 0.01, 0.1, sr);
  }
  const len = p.tail ? out.length : c.seconds(off + T + 0.04, sr), fin = new Float32Array(len);
  let e2 = 0;
  for (let i = 0; i < len; i++) e2 += out[i] * out[i];
  const g0 = 0.13 / Math.sqrt(e2 / len + 1e-9), gs = 0.75 + 0.25 * (sp - 0.5) / 1.5;
  for (let i = 0; i < len; i++) fin[i] = Math.tanh(out[i] * g0 * 1.2) * 0.9 * gs;
  c.fade(fin, p.tail ? 25 : 20, sr);
  return { samples: fin };
}
