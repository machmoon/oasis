// Coins counted onto a wooden counter: each coin is an inharmonic ring (metal-specific partials) with a bright edge tick and a wood thump, counted in loose groups onto a growing stack that clinks, then slid across the boards with a friction layer and a jingle, plus an optional room tail kept under the events.
export const meta = {
  title: "Counted Coins", kind: "foley", format: "sound", duration: 3, price: 2, author: "hollowbody", payout: "hollowbody@creators.oasis.example", kit: "Medieval Market",
  description: "Coins counted one by one onto a wooden counter, with stack clinks and a final slide across the boards; for merchant stalls, taverns and tense bargaining scenes.",
  tags: ["coins", "money", "counting", "wood", "counter", "medieval", "market", "merchant"],
};
export const params = { knobs: {
  metal: { type: "choice", label: "Coin metal", default: "silver", options: ["copper", "silver", "gold"] },
  rate: { type: "range", label: "Count rate", default: 3.5, min: 1.5, max: 7, step: 0.1 },
  stack: { type: "range", label: "Stack clink", default: 0.5, min: 0, max: 1, step: 0.01 },
  slide: { type: "range", label: "Slide amount", default: 0.5, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Room tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + params.knobs.metal.options.indexOf(p.metal) * 97 + 3);
  const dur = 3, out = new Float32Array(c.seconds(dur, sr));
  const M = { copper: { f: 1700, d: 0.035, m: [1, 2.31, 3.9, 5.6], a: [1, 0.5, 0.3, 0.12], tk: 3000, g: 1.7 },
    silver: { f: 2900, d: 0.08, m: [1, 2.76, 5.4, 8.9], a: [1, 0.6, 0.35, 0.2], tk: 6000, g: 1 },
    gold: { f: 2200, d: 0.14, m: [1, 2.02, 3.01, 4.5], a: [1, 0.5, 0.45, 0.2], tk: 4500, g: 0.7 } }[p.metal];
  const dk = M.d * (1.15 - 0.1 * p.rate);
  const coin = (stackAmt, lvl) => {
    const f0 = M.f * (0.88 + r() * 0.24), len = 0.03 + dk * 5, o = new Float32Array(c.seconds(len, sr));
    const modes = M.m.map((m, i) => [f0 * m * (0.99 + r() * 0.02), M.a[i] * (0.6 + 0.4 * r())]);
    c.mix(o, c.ring(modes, len, dk * (0.7 + 0.6 * r()), sr), 0.0004, 0.6 * M.g, sr);
    c.mix(o, c.burst(r, 0.006, "hp", M.tk, 0.8, 0.0003, 0.0016, sr), 0, 0.4, sr);
    c.mix(o, c.ring([[170 + r() * 60, 1], [420 + r() * 100, 0.4]], 0.06, 0.012, sr), 0.0005, 0.5 * (1 - 0.5 * stackAmt), sr);
    if (stackAmt > 0.05) {
      c.mix(o, c.ring(modes.map(([f, a]) => [f * (1.04 + r() * 0.1), a]), len * 0.8, dk * 0.6, sr), 0.004 + r() * 0.01, 0.4 * stackAmt * M.g, sr);
      c.mix(o, c.burst(r, 0.01, "bp", M.tk * 0.8, 3, 0.0003, 0.002, sr), 0.006, 0.3 * stackAmt, sr);
    }
    c.gain(o, lvl); return o;
  };
  const phase = 1.7, count = Math.max(4, Math.round(p.rate * phase)), gap = phase / count;
  let t = 0.08;
  for (let k = 0; k < count; k++) {
    const sa = p.stack * Math.min(1, k / 5);
    c.mix(out, coin(sa, 0.7 + 0.3 * r()), t, 1, sr);
    t += gap * (0.8 + 0.4 * r()) * (1 - 0.25 * Math.min(1, k / 8)) + (k % 5 === 4 ? gap * 0.5 : 0);
  }
  if (p.slide > 0.02) {
    const sd = 0.25 + 0.5 * p.slide, st = Math.min(t + 0.05, 2.7 - sd), n = c.seconds(sd, sr), x = c.noise(r, n);
    const bp = c.biquad("bp", 3500 + 1500 * p.stack, 1.2, sr), lo = c.biquad("lp", 900, 0.8, sr);
    let g = 0.5;
    for (let i = 0; i < n; i++) {
      if (i % 90 === 0) g = 0.3 + 0.7 * r();
      const u = i / n, e = Math.min(1, u * 12) * Math.min(1, (1 - u) * 5);
      x[i] = (bp(x[i]) * 0.8 + lo(x[i]) * 1.5) * g * e * (0.6 + 0.4 * Math.sin(u * 40 + r()));
    }
    c.mix(out, x, st, 0.4 * p.slide + 0.08, sr);
    const jn = Math.round(6 + 20 * p.slide);
    for (let j = 0; j < jn; j++) c.mix(out, coin(0.8, 0.1 + 0.2 * r()), st + r() * sd, 1, sr);
  }
  if (p.tail) {
    const wet = c.reverb(Float32Array.from(out), { size: 0.45, decay: 0.7, mixAmt: 1 }, sr);
    for (let i = 0; i < out.length; i++) out[i] = out[i] + wet[i] * 0.22;
  }
  c.fade(c.finish(out, 0.85, 1.1), 15, sr);
  return { samples: out };
}
