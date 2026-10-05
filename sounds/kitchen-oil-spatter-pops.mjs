// Oil spatter: sporadic hot-oil pops, each a sharp crack, a fast bubble-burst chirp, a low body for big pops, scattered droplet ticks and an optional sizzle tail, over a quiet fry bed that eases in and out.
export const meta = {
  title: "Spitting Oil", kind: "sfx", format: "sound", duration: 2, price: 2, author: "foleyroom", payout: "foleyroom@creators.oasis.example", kit: "Kitchen", description: "Hot oil spitting and popping in a pan, with knobs for the rate, size, irregularity and sharpness of the pops, for cooking scenes and kitchen foley.",
  tags: ["oil", "spatter", "pop", "sizzle", "frying", "kitchen", "pan", "cooking"],
};
export const params = { knobs: {
  rate: { type: "range", label: "Pop rate", default: 6, min: 2, max: 20, step: 0.5 },
  size: { type: "range", label: "Pop size", default: 0.5, min: 0, max: 1, step: 0.01 },
  randomness: { type: "range", label: "Randomness", default: 0.5, min: 0, max: 1, step: 0.01 },
  sharpness: { type: "range", label: "Sharpness", default: 0.6, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Sizzle tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 6151 + 29), rb = c.rng(p.seed * 409 + 3), rx = c.rng(p.seed * 2713 + 11);
  const dur = 2, n = c.seconds(dur, sr), out = new Float32Array(n);
  const S = p.size, K = p.sharpness, R = p.randomness, B = (lo, hi) => c.between(r, lo, hi);
  const bedEnv = (t) => Math.min(1, t / 0.08) * Math.min(1, Math.max(0, (dur - t) / 0.3));
  const hiss = c.noise(rb, n), bp = c.biquad("bp", 3500 + 3000 * K, 0.8, sr), hp = c.biquad("hp", 1200, 0.7, sr);
  let g = 0.75;
  for (let i = 0; i < n; i++) { if (i % 256 === 0) g = c.clamp(g + (rb() - 0.5) * 0.15, 0.55, 1); hiss[i] = bp(hp(hiss[i])) * g * bedEnv(i / sr); }
  c.mix(out, hiss, 0, 0.025 + 0.002 * p.rate, sr);
  const fizz = Math.round(dur * (50 + 8 * p.rate));
  for (let k = 0; k < fizz; k++) { const t = rb() * (dur - 0.01); c.mix(out, c.burst(rb, 0.002 + rb() * 0.002, "bp", 3000 + rb() * 6000, 1 + rb() * 1.5, 0.0002, 0.0005 + rb() * 0.0005, sr), t, (0.02 + 0.06 * rb()) * bedEnv(t), sr); }
  const att = 0.0003 + (1 - K) * 0.003;
  const pop = (t, a) => {
    const sz = c.clamp(S + (r() - 0.5) * 0.7 * R, 0, 1);
    const fc = (1800 + 5500 * K) * (1 - 0.45 * sz) * B(0.7, 1.35);
    c.mix(out, c.burst(r, 0.006 + 0.02 * sz, K > 0.5 ? "hp" : "bp", fc, 0.7 + 0.6 * (1 - K), att, 0.0008 + 0.004 * sz + 0.003 * (1 - K), sr), t, a * (0.65 + 0.35 * K), sr);
    const m = c.seconds(0.012 + 0.02 * sz, sr), f0 = (4200 - 2600 * sz) * B(0.7, 1.35), rise = B(1.1, 1.7), rs = 0.004 * sr;
    const x = c.osc("sine", (tt, i) => f0 * (1 + (rise - 1) * Math.min(1, i / rs)), m, sr);
    c.multiply(x, c.env(m, att * 0.6, 0.0015 + 0.005 * sz, sr));
    c.mix(out, x, t + 0.0005, a * 0.22 * (0.5 + 0.5 * sz), sr);
    if (sz > 0.3) c.mix(out, c.burst(r, 0.04, "lp", (250 + 300 * (1 - sz)) * B(0.8, 1.2), 0.7, 0.001, 0.005 + 0.012 * sz, sr), t, a * sz * 0.55, sr);
    const nd = Math.round(sz * 7 * r() + (sz > 0.5 ? 2 : 0));
    for (let d = 0; d < nd; d++) {
      const td = t + 0.008 + Math.pow(r(), 1.5) * (0.05 + 0.15 * sz);
      c.mix(out, c.burst(r, 0.003 + r() * 0.002, "bp", 3500 + r() * 6000, 1.5 + r() * 2.5, 0.0002 + (1 - K) * 0.001, 0.0008 + r() * 0.0015, sr), td, a * (0.1 + 0.25 * r()), sr);
    }
    if (p.tail) {
      const mt = c.seconds(0.06 + 0.2 * sz, sr), h = c.noise(rx, mt);
      c.filter(h, c.biquad("bp", 4500 + rx() * 3000, 0.8, sr));
      c.multiply(h, c.env(mt, 0.003, 0.02 + 0.06 * sz, sr));
      c.fade(h, 5, sr);
      c.mix(out, h, t + 0.002, a * (0.2 + 0.15 * rx()), sr);
    }
  };
  const mean = 1 / p.rate;
  let t = 0.03 + r() * Math.min(0.15, mean);
  while (t < dur - 0.3) {
    const a = Math.min(1.5, (0.6 + 0.4 * S) * Math.exp((r() - 0.5) * 1.4 * (0.3 + R)));
    pop(t, a);
    if (r() < 0.4 * R) {
      let tc = t;
      const k = 1 + Math.floor(r() * 3);
      for (let j = 0; j < k; j++) { tc += 0.012 + r() * 0.05; if (tc < dur - 0.3) pop(tc, a * B(0.3, 0.8)); }
    }
    t += mean * ((1 - R) * (0.6 + 0.8 * r()) + R * -Math.log(1 - r() * 0.999));
  }
  let res = out;
  if (p.tail) { const w = c.reverb(out, { size: 0.25, decay: 0.3, mixAmt: 0.16 }, sr); if (w instanceof Float32Array) res = w; }
  c.fade(c.finish(res, 0.9), 15, sr);
  return { samples: res };
}
