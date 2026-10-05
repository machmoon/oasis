// Tankard Slam: a heavy mug slammed on an oak table. Layers: a material contact click and the mug's modes (pewter rings, ceramic clacks, wood thocks), the oak top's thump and board modes, ale slosh with bubble chirps and drops, and a short wooden-room tail.
export const meta = {
  title: "Tankard Slam", kind: "impact", format: "sound", duration: 0.9, price: 3, author: "hollowbody", payout: "hollowbody@creators.oasis.example", kit: "Wooden Tavern", description: "A heavy pewter, ceramic or wooden mug slammed down on an oak table, with knobs for force, table ring and ale splash; use it for tavern brawls, toasts and drinking-game beats.",
  tags: ["mug", "tankard", "slam", "table", "tavern", "impact", "splash", "wood"],
};
export const params = { knobs: {
  material: { type: "choice", label: "Mug material", default: "pewter", options: ["pewter", "ceramic", "wood"] },
  force: { type: "range", label: "Force", default: 0.7, min: 0, max: 1, step: 0.01 },
  table: { type: "range", label: "Table resonance", default: 0.5, min: 0, max: 1, step: 0.01 },
  splash: { type: "range", label: "Liquid splash", default: 0.5, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Room tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, mi = params.knobs.material.options.indexOf(p.material), r = c.rng(p.seed * 7919 + mi * 131 + 3);
  const F = p.force, T = p.table, S = p.splash, fg = 0.4 + 0.6 * F;
  const dur = 0.38 + 0.12 * F + 0.18 * T + 0.08 * S + (p.tail ? 0.3 : 0), n = c.seconds(dur, sr), out = new Float32Array(n);
  const M = {
    pewter: { modes: [[1180, 1], [1192, 0.5], [2870, 0.6], [4960, 0.38], [7350, 0.2]], dec: 0.085, click: [6000, 1.2, 0.0004, 0.0025], g: 0.6 },
    ceramic: { modes: [[2150, 1], [5200, 0.6], [8300, 0.35]], dec: 0.026, click: [10000, 0.9, 0.0003, 0.0012], g: 0.85 },
    wood: { modes: [[320, 1], [760, 0.5], [1500, 0.2]], dec: 0.014, click: [1500, 0.8, 0.0015, 0.006], g: 0.8 },
  }[p.material];
  const t0 = 0.004, det = () => 0.97 + r() * 0.06;
  const bst = (type, f, q, a, d, at, g) => c.mix(out, c.burst(r, a + d * 7, type, f, q, a, d, sr), at, g, sr);
  const rng2 = (modes, d, at, g) => c.mix(out, c.ring(modes, d * 7 + 0.01, d, sr), at, g, sr);
  bst("lp", M.click[0] * (0.55 + 0.6 * F), M.click[1], M.click[2], M.click[3] * (1.2 - 0.4 * F), t0, 0.9 * (0.5 + 0.5 * F));
  if (p.material === "ceramic") bst("hp", 5500, 0.8, 0.0003, 0.0018, t0, 0.6 * fg);
  if (p.material === "wood") bst("lp", 600, 1.1, 0.002, 0.012, t0, 0.7 * fg);
  rng2(M.modes.map(([f, a]) => [f * det(), a]), M.dec * (1.1 - 0.3 * F), t0 + 0.0005, M.g * fg);
  const tf = 88 * det() * (1 - 0.08 * F);
  bst("lp", 160 + 120 * F, 0.9, 0.0015, 0.016 + 0.018 * F, t0, 0.9 * (0.35 + 0.65 * F));
  bst("bp", 1100 * det(), 1, 0.0008, 0.006, t0, 0.4 * fg);
  const tm = [[tf, 1], [tf * 2.27 * det(), 0.7], [tf * 3.9 * det(), 0.5], [tf * 6.6 * det(), 0.3], [tf * 9.4 * det(), 0.18]];
  rng2(tm, 0.015 + 0.085 * T, t0 + 0.001, (0.15 + 0.6 * T) * fg);
  bst("bp", 520 * det(), 1.4, 0.001, 0.01 + 0.04 * T, t0, (0.1 + 0.4 * T) * fg);
  if (S > 0) {
    const amt = S * fg;
    bst("bp", 1500 + 900 * F, 0.7, 0.003, 0.025 + 0.02 * S, t0 + 0.006, 0.7 * amt);
    const nb = Math.round(4 + 40 * amt);
    for (let b = 0; b < nb; b++) {
      const t = t0 + 0.005 + Math.pow(r(), 1.7) * (0.06 + 0.1 * S), d = 0.008 + r() * 0.03, m = c.seconds(d, sr);
      const f0 = 450 + r() * 2200 * (0.6 + 0.4 * F), rise = 0.6 + r() * 1.4;
      const x = c.osc("sine", (tt, i) => f0 * (1 + rise * i / m), m, sr);
      c.multiply(x, c.env(m, 0.0006, d * 0.25, sr));
      c.mix(out, x, t, (0.15 + 0.35 * r()) * amt, sr);
    }
    const nd = Math.round(3 + 14 * amt);
    for (let k = 0; k < nd; k++) {
      const t = t0 + 0.06 + Math.pow(r(), 1.6) * (0.12 + 0.1 * S);
      bst("bp", 2500 + r() * 3500, 3, 0.0004, 0.0015, t, (0.1 + 0.25 * r()) * amt);
      if (r() < 0.5) {
        const m = c.seconds(0.014, sr), f0 = 1200 + r() * 1800, x = c.osc("sine", (tt, i) => f0 * (1 + 0.8 * i / m), m, sr);
        c.multiply(x, c.env(m, 0.0004, 0.0025, sr));
        c.mix(out, x, t + 0.001, 0.12 * amt, sr);
      }
    }
  }
  if (p.tail) {
    const wet = new Float32Array(n), a = 1 - Math.exp(-c.TAU * 2800 / sr);
    for (const d0 of [0.0231, 0.0289, 0.0337, 0.0397]) {
      const d = Math.round(d0 * (0.95 + 0.1 * r()) * sr), buf = new Float32Array(d); let k = 0, lp = 0;
      for (let i = 0; i < n; i++) { const y = buf[k]; lp += a * (y - lp); buf[k] = out[i] + 0.6 * lp; k = (k + 1) % d; wet[i] += 0.25 * y; }
    }
    for (const d0 of [0.005, 0.0017]) {
      const d = Math.max(1, Math.round(d0 * sr)), buf = new Float32Array(d); let k = 0;
      for (let i = 0; i < n; i++) { const x = wet[i], y = buf[k] - 0.5 * x; buf[k] = x + 0.5 * y; wet[i] = y; k = (k + 1) % d; }
    }
    const early = out.slice();
    c.filter(early, c.biquad("lp", 2500, 0.7, sr));
    c.mix(out, early, 0.009 + r() * 0.003, 0.22, sr);
    c.mix(out, early, 0.017 + r() * 0.004, 0.13, sr);
    for (let i = 0; i < n; i++) out[i] += 0.4 * wet[i];
  }
  c.finish(out, 0.9, 1 + 0.8 * F);
  const fl = c.seconds(p.tail ? 0.12 : 0.06, sr);
  for (let i = 0; i < fl; i++) out[n - 1 - i] *= 0.5 - 0.5 * Math.cos(Math.PI * i / fl);
  out[n - 1] = 0;
  for (let i = 0, a = c.seconds(0.001, sr); i < a; i++) out[i] *= i / a;
  c.gain(out, 0.6 + 0.4 * F);
  return { samples: out };
}
