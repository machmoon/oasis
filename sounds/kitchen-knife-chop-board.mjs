// Knife chop: one cut through an ingredient into a board. The blade fractures the food first (crunch grains over a
// fibrous tear), then lands: a steel contact tick, a fibre-contact smack, short damped board modes coloured by material,
// a weighted counter thump beneath, a few falling crumbs, and an optional small-kitchen room tail.
export const meta = {
  title: "Board Chop", kind: "foley", format: "sound", duration: 0.45, price: 2, author: "foleyroom", payout: "foleyroom@creators.oasis.example", kit: "Kitchen", description: "A single knife chop through food onto a cutting board, with board material, blade weight, ingredient crunch and board ring as knobs, for cooking scenes and kitchen gameplay.",
  tags: ["knife", "chop", "cutting-board", "kitchen", "foley", "cooking", "vegetable", "blade"],
};
export const params = { knobs: {
  board: { type: "choice", label: "Board", default: "wood", options: ["wood", "plastic", "bamboo"] },
  weight: { type: "range", label: "Blade weight", default: 0.5, min: 0, max: 1, step: 0.01 },
  crunch: { type: "range", label: "Ingredient crunch", default: 0.5, min: 0, max: 1, step: 0.01 },
  resonance: { type: "range", label: "Board resonance", default: 0.35, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Room tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, bi = params.knobs.board.options.indexOf(p.board), r = c.rng(p.seed * 6151 + bi * 271 + 3);
  const w = p.weight, k = p.crunch, res = p.resonance, angle = r(), smear = 0.0004 + 0.0025 * r();
  const tImp = 0.006 + 0.05 * k * (0.7 + 0.6 * r());
  const len = tImp + 0.17 + 0.2 * res + 0.08 * w + (p.tail ? 0.2 : 0);
  let out = new Float32Array(c.seconds(len, sr));
  if (k > 0) {
    const grains = Math.round(8 + 70 * k);
    for (let g = 0; g < grains; g++) {
      const u = Math.pow(r(), 0.6), t = 0.002 + u * (tImp - 0.002);
      const f = 1200 + r() * (2500 + 4500 * k);
      c.mix(out, c.burst(r, 0.002 + r() * 0.005, "bp", f, 1.2 + r() * 2.5, 0.0003, 0.0008 + r() * 0.002, sr), t, (0.2 + 0.6 * r()) * (0.4 + 0.6 * u) * (0.4 + 0.6 * k), sr);
    }
    const n = c.seconds(tImp + 0.008, sr), x = c.noise(r, n), bp = c.biquad("bp", 1700 + 1600 * k, 0.9, sr);
    let fl = 1, next = 0;
    for (let i = 0; i < n; i++) {
      if (i >= next) { fl = 0.25 + 0.75 * r(); next = i + 40 + Math.floor(r() * 180); }
      x[i] = bp(x[i]) * fl * Math.min(1, i / (0.003 * sr)) * (0.3 + 0.7 * i / n) * (i > n - 0.006 * sr ? (n - i) / (0.006 * sr) : 1);
    }
    c.mix(out, x, 0.001, 0.4 * k, sr);
    c.mix(out, c.burst(r, 0.02, "bp", 900 + 500 * r(), 1.5, 0.001, 0.006, sr), tImp * 0.6, 0.35 * k, sr);
    for (let g = 0; g < grains / 6; g++) {
      c.mix(out, c.burst(r, 0.003 + r() * 0.004, "bp", 1500 + r() * 3500, 2, 0.0004, 0.0012, sr), tImp + 0.02 + Math.pow(r(), 1.5) * 0.1, (0.05 + 0.15 * r()) * k, sr);
    }
  }
  const M = {
    wood: { modes: [[190, 1], [430, 0.55], [905, 0.3], [1720, 0.16]], dec: 0.022, click: ["lp", 3800, 0.8], thump: 150, fib: 1600 },
    plastic: { modes: [[340, 1], [790, 0.7], [1950, 0.4], [3600, 0.22]], dec: 0.014, click: ["hp", 2400, 0.9], thump: 230, fib: 2600 },
    bamboo: { modes: [[250, 1], [640, 0.6], [1420, 0.45], [3050, 0.3]], dec: 0.028, click: ["bp", 4600, 1.4], thump: 180, fib: 3400 },
  }[p.board];
  const strike = 0.6 + 0.6 * w;
  const modes = M.modes.map(([f, a], j) => [f * (0.94 + 0.12 * r()), a * (j === 0 ? 0.6 + 0.6 * w : 1.1 - 0.4 * w) * (0.7 + 0.6 * r())]);
  const dec = M.dec * (0.4 + 2.4 * res * res + 0.6 * res);
  c.mix(out, c.ring(modes, dec * 6 + 0.02, dec, sr), tImp + 0.0004, (0.15 + 0.5 * res) * strike, sr);
  if (p.board === "bamboo") c.mix(out, c.ring(modes.map(([f, a]) => [f * (1.06 + 0.03 * r()), a * 0.6]), dec * 4, dec * 0.6, sr), tImp + 0.0012, (0.12 + 0.35 * res) * strike, sr);
  if (p.board === "plastic") c.mix(out, c.burst(r, 0.04, "bp", 560 + 120 * r(), 3, 0.001, 0.008 + 0.015 * res, sr), tImp, 0.35 * strike, sr);
  c.mix(out, c.burst(r, 0.03, "bp", M.fib * (0.85 + 0.3 * r()), 0.7, 0.0005 + smear, 0.004 + 0.004 * w, sr), tImp, 0.45 + 0.2 * angle, sr);
  c.mix(out, c.burst(r, 0.01, M.click[0], M.click[1] * (0.85 + 0.3 * angle), M.click[2], 0.0004, 0.0012 + 0.002 * w, sr), tImp + smear * 0.5, (0.35 + 0.35 * (1 - w)) * (0.7 + 0.6 * angle), sr);
  c.mix(out, c.ring([[(3200 - 1000 * w) * (0.95 + 0.1 * r()), 1], [(7400 - 1600 * w) * (0.95 + 0.1 * r()), 0.4]], 0.05, 0.005 + 0.003 * (1 - w), sr), tImp + 0.0003, 0.1 * (0.6 + 0.8 * angle), sr);
  c.mix(out, c.burst(r, 0.06 + 0.08 * w, "lp", M.thump * (1.3 - 0.5 * w), 0.8, 0.0015, 0.01 + 0.03 * w, sr), tImp, (0.3 + 0.9 * w) * (0.8 + 0.4 * r()), sr);
  c.mix(out, c.ring([[(110 - 40 * w) * (0.95 + 0.1 * r()), 1], [(260 - 70 * w), 0.3]], 0.12, 0.01 + 0.022 * w, sr), tImp + 0.001, 0.15 + 0.5 * w, sr);
  if (p.tail) out = c.reverb(out, { size: 0.15 + 0.08 * r(), decay: 0.38, mixAmt: 0.2 }, sr);
  c.finish(out, 0.9, 1.3);
  c.gain(out, 0.72 + 0.28 * w);
  c.fade(out, 4, sr);
  return { samples: out };
}
