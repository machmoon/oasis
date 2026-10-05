// Shutter slam: a wooden or tin shutter blown shut against the wall. Layered as a wall thump, a bright crack, a slat/panel body (wood knock vs wobbling tin ring with rattle), dulling rebounds, a glass-pane shiver with tinkle grains and an optional empty-room tail.
export const meta = {
  title: "Shutter Slam", kind: "impact", format: "sound", duration: 1.8, price: 3, author: "hollowbody", payout: "hollowbody@creators.oasis.example", kit: "Horror House",
  description: "A window shutter blown shut against the wall, wood or tin, with bounce-backs and a glass shiver; a startling stinger hit for haunted-house scenes.",
  tags: ["shutter", "slam", "impact", "horror", "wood", "tin", "window", "haunted"],
};
export const params = { knobs: {
  material: { type: "choice", label: "Material", default: "wood", options: ["wood", "tin"] },
  force: { type: "range", label: "Force", default: 0.7, min: 0, max: 1, step: 0.01 },
  bounce: { type: "range", label: "Bounce", default: 0.5, min: 0, max: 1, step: 0.01 },
  shiver: { type: "range", label: "Glass shiver", default: 0.4, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Room tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + (p.material === "tin" ? 101 : 7));
  const tin = p.material === "tin", f = p.force, sh = p.shiver;
  const out = new Float32Array(c.seconds(p.tail ? 1.8 : 1.1, sr));
  const hit = (t, a, dull) => {
    const k = 0.92 + r() * 0.16, s = a * (0.45 + 0.55 * f);
    c.mix(out, c.ring([[62 * k + 35 * (1 - f), 1], [128 * k, 0.4]], 0.2, 0.04 + 0.05 * f, sr), t, s * (tin ? 0.45 : 0.95), sr);
    c.mix(out, c.burst(r, 0.014, "bp", (tin ? 4500 : 2300) * dull, 0.8, 0.0004, 0.004, sr), t, a * 0.9, sr);
    const modes = tin
      ? [[480 * k, 1], [790 * k, 0.8], [1290 * k, 0.65], [2100 * k, 0.45], [3300 * k, 0.3]]
      : [[200 * k, 1], [330 * k, 0.6], [570 * k, 0.4], [880 * k, 0.2]];
    const bn = c.seconds(tin ? 0.5 : 0.22, sr), body = c.ring(modes, tin ? 0.5 : 0.22, tin ? 0.1 + 0.08 * f : 0.045 + 0.03 * f, sr);
    if (tin) for (let i = 0; i < bn && i < body.length; i++) body[i] *= 0.75 + 0.25 * Math.sin(i / sr * 70 + t * 9);
    c.mix(out, body, t + 0.001, s * (tin ? 0.6 : 0.8), sr);
    const rn = c.seconds(tin ? 0.28 : 0.1, sr), x = c.noise(r, rn), bp = c.biquad("bp", (tin ? 3200 : 1300) * dull, 2, sr); let g = 1;
    for (let i = 0; i < rn; i++) { if (i % (tin ? 90 : 140) === 0) g = r() < 0.7 ? r() : 0; x[i] = bp(x[i]) * g * Math.exp(-i / sr / (tin ? 0.09 : 0.03)); }
    c.mix(out, x, t + 0.004, a * (tin ? 0.8 : 0.4), sr);
    if (sh > 0) {
      const m = 3 + Math.round(5 * sh);
      for (let j = 0; j < m; j++) { const ft = 2600 + r() * 5200; c.mix(out, c.ring([[ft, 1], [ft * 1.58, 0.45]], 0.45, 0.06 + 0.16 * r(), sr), t + 0.004 + r() * 0.08, 0.17 * sh * (0.3 + 0.7 * s) * (0.4 + 0.6 * r()), sr); }
    }
  };
  hit(0.01, 1, 1);
  let t = 0.01, gap = 0.12 + 0.08 * (1 - f), a = 0.6, dull = 0.85;
  const nb = Math.round(p.bounce * 6);
  for (let b = 0; b < nb; b++) { t += gap * (0.85 + r() * 0.3); gap *= 0.62; a *= 0.62; dull *= 0.9; hit(t, a, dull); }
  if (sh > 0) for (let j = 0, m = Math.round(10 + 40 * sh); j < m; j++) {
    const tt = 0.02 + Math.pow(r(), 1.5) * 0.7;
    c.mix(out, c.burst(r, 0.006, "bp", 5500 + r() * 4000, 6, 0.0003, 0.002, sr), tt, 0.13 * sh * (1 - tt) * (0.3 + 0.7 * r()), sr);
  }
  if (p.tail) {
    const n = c.seconds(1.2, sr), x = c.noise(r, n), hp = c.biquad("hp", 250, 0.7, sr), lp = c.biquad("lp", tin ? 3500 : 1800, 0.7, sr);
    for (let i = 0; i < n; i++) x[i] = lp(hp(x[i])) * Math.exp(-i / sr / 0.28) * Math.min(1, i / (0.01 * sr));
    c.mix(out, x, 0.012, 0.14 * (0.4 + 0.6 * f), sr);
    const rv = c.reverb(out.slice(0, c.seconds(1.0, sr)), { size: 0.85, decay: 0.75, mixAmt: 1 }, sr);
    c.mix(out, rv, 0.03, 0.4, sr);
  }
  c.fade(out, 30, sr);
  c.finish(out, 0.9, 1.3);
  c.fade(out, 30, sr);
  return { samples: out };
}
