// Loose shutter: gusts (a swelling, wandering wind bed) throw a hanging shutter against its frame; each knock is a thump, a material-coloured ring, a contact crack and a rattle of hinge ticks, with an optional room tail.
export const meta = {
  title: "Loose Shutter", kind: "sfx", format: "sound", duration: 3.2, price: 3, author: "hollowbody", payout: "hollowbody@creators.oasis.example", kit: "Horror House", description: "A loose wooden or tin shutter knocking against its frame in gusts of wind, for abandoned houses and night exteriors in horror scenes.",
  tags: ["shutter", "knock", "wind", "horror", "house", "wood", "tin", "gust"],
};
export const params = { knobs: {
  material: { type: "choice", label: "Material", default: "wood", options: ["wood", "tin"] },
  gust: { type: "range", label: "Gust strength", default: 0.6, min: 0, max: 1, step: 0.01 },
  irregularity: { type: "range", label: "Irregularity", default: 0.5, min: 0, max: 1, step: 0.01 },
  rate: { type: "range", label: "Knock rate", default: 2.5, min: 1, max: 6, step: 0.1 },
  tail: { type: "toggle", label: "Room tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + (p.material === "tin" ? 91 : 7)), dur = 3.2, n = c.seconds(dur, sr), out = new Float32Array(n);
  const tin = p.material === "tin", g = p.gust, irr = p.irregularity;
  const wind = c.pink(r, n), bp = c.biquad("bp", 350 + 500 * g, 0.8, sr), gl = c.onepole(sr);
  let ph = r() * 6, ph2 = r() * 6;
  for (let i = 0; i < n; i++) {
    const t = i / sr, swell = 0.35 + 0.65 * Math.max(0, Math.sin(t * 1.9 + ph) * 0.6 + Math.sin(t * 0.7 + ph2) * 0.5);
    wind[i] = bp(wind[i]) * swell * (0.25 + 0.75 * g);
  }
  c.mix(out, wind, 0, 0.35 + 0.3 * g, sr);
  const hiss = c.noise(r, n), hp = c.biquad("hp", 2500, 0.7, sr);
  for (let i = 0; i < n; i++) hiss[i] = hp(hiss[i]) * 0.05 * g * (0.5 + 0.5 * Math.sin(i / sr * 1.3 + ph));
  c.mix(out, hiss, 0, 1, sr);
  const base = tin ? [[420, 1], [910, 0.7], [1530, 0.5], [2470, 0.35], [3650, 0.2]] : [[170, 1], [340, 0.5], [610, 0.3], [980, 0.15]];
  let t = 0.15 + r() * 0.2, k = 0, amp = 0.6;
  while (t < dur - 0.5 && k < 40) {
    const lull = Math.max(0, Math.sin(t * 1.9 + ph) * 0.6 + Math.sin(t * 0.7 + ph2) * 0.5);
    const hit = (0.25 + 0.75 * g) * (0.4 + 0.6 * lull + 0.3 * r() * irr) * (1 - 0.4 * irr * r());
    if (hit > 0.12) {
      const det = 0.97 + r() * 0.06, modes = base.map(([f, a]) => [f * det * (1 + 0.02 * irr * (r() - 0.5)), a]);
      c.mix(out, c.ring(modes, tin ? 0.7 : 0.25, tin ? 0.2 + 0.1 * g : 0.05 + 0.03 * g, sr), t, hit, sr);
      c.mix(out, c.ring([[tin ? 130 : 80, 1]], 0.12, 0.03, sr), t, hit * 0.7, sr);
      c.mix(out, c.burst(r, 0.01, "hp", tin ? 3500 : 1800, 0.8, 0.0004, 0.003, sr), t, hit * 0.7, sr);
      const rat = 2 + Math.floor(r() * 3 + 3 * g);
      for (let j = 0; j < rat; j++) c.mix(out, c.burst(r, 0.006, "bp", (tin ? 2500 : 1200) + r() * 2000, 5, 0.0003, 0.002, sr), t + 0.03 + j * (0.018 + r() * 0.03) * (1 + j * 0.3), hit * 0.3 * (1 - j / (rat + 1)), sr);
      if (g > 0.5 && r() < g - 0.3) c.mix(out, c.ring(modes.map(([f, a]) => [f * 1.01, a * 0.6]), 0.3, 0.06, sr), t + 0.07 + r() * 0.05, hit * 0.5, sr);
    }
    const gap = (1 / p.rate) * (1 + irr * (r() * 2 - 0.9)) * (hit > 0.5 ? 0.8 : 1.3);
    t += Math.max(0.09, gap); k++;
  }
  let res = out;
  if (p.tail) {
    const w = c.reverb(out, { size: 0.5, decay: 0.45, mixAmt: 0.4 }, sr);
    res = w.length === n ? w : w.subarray(0, n);
  }
  const o = new Float32Array(n);
  for (let i = 0; i < n; i++) o[i] = res[i];
  c.fade(o, 40, sr);
  c.finish(o, 0.85, 1.1);
  c.fade(o, 30, sr);
  return { samples: o };
}
