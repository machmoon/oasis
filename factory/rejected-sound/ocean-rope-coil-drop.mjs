// Rope coil drop: one dull low thump as the coil lands (lowpassed noise body + soft sine drop), two or three quieter loop slumps, then a short sparse rustle of fibres. Surface changes only the knock colour and a damped contact tick (hollow plank, hard stone, short metal clank); the tail is a quiet room wash. Level scales with weight.
export const meta = {
  title: "Rope Coil Drop", kind: "foley", format: "sound", duration: 1, price: 1, author: "stormfront", payout: "stormfront@creators.oasis.example", kit: "Ocean Harbour", description: "A coil of heavy rope dropped onto a dock: one dull thump, softer loop slumps and a short fibrous slither as it settles; for harbour, ship and pirate scenes.",
  tags: ["rope", "coil", "drop", "dock", "harbour", "foley", "ship", "thud"],
};
export const params = { knobs: {
  surface: { type: "choice", label: "Surface", default: "wood-plank", options: ["wood-plank", "stone", "steel-deck"] },
  weight: { type: "range", label: "Weight", default: 0.5, min: 0, max: 1, step: 0.01 },
  slither: { type: "range", label: "Slither", default: 0.5, min: 0, max: 1, step: 0.01 },
  wetness: { type: "range", label: "Wetness", default: 0.2, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Dock tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + 3), w = p.weight, s = p.slither, wet = p.wetness;
  const out = new Float32Array(c.seconds(1.4, sr));
  const S = {
    "wood-plank": { lp: 420, m: [[210, 1], [430, 0.4]], d: 0.05, ma: 0.25, hit: 1500, ha: 0.35, th: 1 },
    stone: { lp: 700, m: [[1900, 1], [3100, 0.5]], d: 0.01, ma: 0.15, hit: 3200, ha: 0.6, th: 0.5 },
    "steel-deck": { lp: 550, m: [[520, 1], [1340, 0.7], [2310, 0.4]], d: 0.03, ma: 0.22, hit: 4200, ha: 0.45, th: 0.7 },
  }[p.surface];
  const slump = (t, g, big) => {
    const n = c.seconds(0.15, sr), x = c.noise(r, n), lp = c.biquad("lp", S.lp * (1.2 - 0.5 * w) * (0.85 + 0.3 * r()), 0.7, sr), e = c.env(n, 0.003, 0.03 + 0.04 * w * big, sr);
    for (let i = 0; i < n; i++) x[i] = lp(x[i]) * e[i];
    c.mix(out, x, t, g * 2.2, sr);
    const m = c.seconds(0.12, sr), f0 = 60 + 40 * (1 - w) + 20 * r(), th = c.osc("sine", (q) => f0 * (1 - 3 * q), m, sr), te = c.env(m, 0.004, 0.04, sr);
    for (let i = 0; i < m; i++) th[i] *= te[i];
    c.mix(out, th, t, g * S.th * (0.5 + 0.5 * w), sr);
    c.mix(out, c.burst(r, 0.015, "bp", S.hit * (0.8 + 0.4 * r()) * (1 - 0.3 * wet), 1, 0.001, 0.005, sr), t, g * S.ha, sr);
    c.mix(out, c.ring(S.m.map(([f, a]) => [f * (0.97 + 0.06 * r()), a]), 0.1, S.d, sr), t + 0.001, g * S.ma * big, sr);
  };
  const lvl = 0.3 + 0.7 * w;
  slump(0.008, 1, 1);
  const loops = 2 + Math.round(2 * w);
  let t = 0.008;
  for (let i = 0; i < loops; i++) { t += 0.07 + 0.05 * i + 0.04 * r(); slump(t, (0.38 - 0.08 * i) * (0.8 + 0.4 * r()), 0.4); }
  const span = 0.15 + 0.4 * s, g0 = t + 0.03;
  const grains = Math.round(8 + 60 * s);
  for (let j = 0; j < grains; j++) {
    const u = Math.pow(r(), 0.9);
    c.mix(out, c.burst(r, 0.006 + r() * 0.01, "bp", 1000 + r() * 2200, 1.4, 0.001, 0.003 + r() * 0.004, sr), g0 + u * span, (0.04 + 0.1 * r()) * (1 - 0.7 * u) * (0.4 + 0.6 * s), sr);
  }
  const sn = c.seconds(span, sr), x = c.noise(r, sn), bp = c.biquad("bp", 1400 + 900 * s, 1, sr);
  let gg = 0, tg = 0;
  for (let i = 0; i < sn; i++) {
    if (i % 400 === 0) tg = r() < 0.6 ? 0.3 + 0.7 * r() : 0;
    gg += (tg - gg) * 0.03;
    const u = i / sn;
    x[i] = bp(x[i]) * gg * Math.min(1, u * 10) * (1 - u) * (1 - u);
  }
  c.mix(out, x, g0, 0.12 * s, sr);
  for (let j = 0, nd = Math.round(wet * 9); j < nd; j++) {
    const f = 700 + r() * 1200, tt = 0.02 + r() * (0.1 + span), m = c.seconds(0.018, sr);
    const d = c.osc("sine", (q) => f * (1 + 25 * q), m, sr);
    for (let i = 0; i < m; i++) d[i] *= Math.sin(Math.PI * i / m);
    c.mix(out, d, tt, 0.05 * wet, sr);
    c.mix(out, c.burst(r, 0.025, "bp", 600 + r() * 600, 2, 0.002, 0.01, sr), tt + 0.01, 0.1 * wet, sr);
  }
  const body = g0 + span + 0.08;
  let res = out;
  if (p.tail) {
    const wash = c.reverb(out, { size: 0.35, decay: 0.3, mixAmt: 1 }, sr);
    res = new Float32Array(out.length);
    for (let i = 0; i < out.length; i++) res[i] = out[i] * 0.9 + wash[i] * 0.3;
  }
  const fin = res.slice(0, Math.min(c.seconds(body + (p.tail ? 0.35 : 0), sr), res.length));
  c.filter(fin, c.biquad("hp", 45, 0.7, sr));
  c.fade(fin, p.tail ? 120 : 60, sr);
  c.finish(fin, 0.9, 1.05);
  c.gain(fin, 0.4 + 0.6 * lvl);
  return { samples: fin };
}
