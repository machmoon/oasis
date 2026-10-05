// Trencher set down: a plate body (wood knock, pewter ring or clay tick) under a broadband contact click and thump, then each cutlery piece lands as an inharmonic metal strike with bouncing rattle, plus an optional low-ceilinged room tail.
export const meta = {
  title: "Trencher Set Down", kind: "foley", format: "sound", duration: 0.75, price: 2, author: "hollowbody", payout: "hollowbody@creators.oasis.example", kit: "Wooden Tavern", description: "A trencher or plate set on a tavern table with knives and spoons clattering after it; plate material, force, rattle, item count and room tail are knobs for feast scenes and inn foley.",
  tags: ["plate", "cutlery", "tavern", "table", "foley", "pewter", "dinner", "medieval"],
};
export const params = { knobs: {
  material: { type: "choice", label: "Plate material", default: "wood", options: ["wood", "pewter", "clay"] },
  force: { type: "range", label: "Force", default: 0.5, min: 0, max: 1, step: 0.01 },
  rattle: { type: "range", label: "Cutlery rattle", default: 0.5, min: 0, max: 1, step: 0.01 },
  count: { type: "range", label: "Item count", default: 2, min: 1, max: 5, step: 1 },
  tail: { type: "toggle", label: "Room tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, mi = params.knobs.material.options.indexOf(p.material), r = c.rng(p.seed * 7919 + mi * 131 + 3);
  const F = p.force, R = p.rattle, items = Math.max(1, Math.round(p.count)), dk = p.tail ? 1 : 0.55;
  const ok = (m) => m.filter(([f]) => f < 0.45 * sr);
  const M = [
    { modes: [[210, 1], [530, 0.6], [1180, 0.35], [2300, 0.15]], dec: 0.022, click: [2000, 0.8], thump: 95 },
    { modes: [[620, 0.8], [1490, 1], [2730, 0.7], [4180, 0.45], [5960, 0.25]], dec: 0.33, click: [7000, 0.7], thump: 125 },
    { modes: [[480, 0.7], [1270, 1], [2350, 0.6], [3900, 0.3]], dec: 0.045, click: [4800, 0.9], thump: 150 },
  ][mi];
  const dur = 0.32 + 0.09 * items + 0.08 * R + (p.tail ? 0.3 : 0.08) + (mi === 1 ? 0.9 * dk : 0);
  const n = c.seconds(dur, sr), out = new Float32Array(n);
  const pm = ok(M.modes.map(([f, a]) => [f * (0.96 + 0.08 * r()) * (1 - 0.03 * F), a * (0.8 + 0.4 * r())]));
  const pDec = M.dec * dk * (0.8 + 0.4 * F);
  const plate = (at, g, scale) => c.mix(out, c.ring(pm, Math.min(dur - at, pDec * 7 + 0.02), pDec * scale, sr), at, g, sr);
  const t0 = 0.003;
  c.mix(out, c.burst(r, 0.012, "lp", Math.min(0.45 * sr, M.click[0] * (0.6 + 0.7 * F)), M.click[1], 0.0005, 0.0015 + 0.0025 * F, sr), t0, 0.45 + 0.5 * F, sr);
  c.mix(out, c.ring([[M.thump * (1 - 0.25 * F), 1], [M.thump * 2.13, 0.3]], 0.1, 0.012 + 0.03 * F, sr), t0 + 0.001, 0.3 + 0.6 * F, sr);
  plate(t0 + 0.001, 0.5 + 0.4 * F, 1);
  if (mi === 0) c.mix(out, c.burst(r, 0.03, "lp", 900 + 600 * F, 1.2, 0.001, 0.009, sr), t0 + 0.001, 0.5 * (0.5 + F), sr);
  if (mi === 2) c.mix(out, c.burst(r, 0.008, "hp", 3000, 0.8, 0.0003, 0.0012, sr), t0 + 0.002, 0.35, sr);
  const rim = t0 + 0.008 + 0.012 * r();
  plate(rim, 0.18 + 0.15 * F, 0.6);
  c.mix(out, c.burst(r, 0.006, "bp", Math.min(0.45 * sr, M.click[0]), 1.5, 0.0004, 0.0012, sr), rim, 0.2 + 0.2 * F, sr);
  let t = 0.06 + 0.03 * r();
  for (let k = 0; k < items; k++) {
    const base = 1900 + r() * 2400, cm = ok([[base, 1], [base * 2.71, 0.45], [base * 5.13, 0.18]]);
    const cd = (0.03 + 0.05 * r()) * (0.6 + 0.4 * dk), g0 = (0.15 + 0.22 * F) * (0.7 + 0.3 * r()) * (1 - 0.08 * k);
    const strike = (at, a, det) => {
      if (at > dur - 0.12) return;
      c.mix(out, c.ring(cm.map(([f, m]) => [f * det, m]), cd * 6, cd, sr), at, a, sr);
      c.mix(out, c.burst(r, 0.004, "hp", 3500 + 3000 * r(), 0.8, 0.0003, 0.0009, sr), at, a * 0.5, sr);
      plate(at, a * 0.2, 0.5);
    };
    strike(t, g0, 1);
    const nb = Math.round(1 + R * 6);
    let gap = 0.03 + 0.025 * r(), tt = t, a = g0;
    for (let b = 0; b < nb; b++) {
      gap *= 0.55 + 0.25 * r(); tt += gap + 0.003 * r(); a *= 0.5 + 0.25 * r();
      strike(tt, a * (0.5 + 0.5 * R), 0.985 + 0.03 * r());
    }
    const ch = Math.round(R * 20);
    for (let g = 0; g < ch; g++) {
      const at = t + Math.pow(r(), 1.7) * (0.06 + 0.1 * R);
      if (at < dur - 0.12) c.mix(out, c.burst(r, 0.003 + 0.003 * r(), "bp", Math.min(0.42 * sr, 3000 + r() * 5000), 5, 0.0003, 0.0008, sr), at, (0.03 + 0.06 * r()) * R * (0.6 + 0.4 * F), sr);
    }
    t += 0.06 + 0.07 * r();
  }
  let o = out;
  if (p.tail) { const w = c.reverb(out, { size: 0.3, decay: 0.45, mixAmt: 0.22 }, sr); if (w) o = w.length > n ? w.subarray(0, n) : w; }
  const rel = c.seconds(0.12, sr);
  for (let i = 0; i < rel; i++) { const x = i / rel; o[o.length - rel + i] *= 0.5 + 0.5 * Math.cos(Math.PI * x); }
  c.finish(o, 0.9, 1.1);
  c.fade(o, 1, sr);
  return { samples: o };
}
