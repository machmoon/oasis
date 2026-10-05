// Rusty tap drip: a bubble plink (fast rising sine glide, the signature), a brief basin ring per material, a tiny contact tick, a small rebound droplet and an optional sparse dark echo that decays to silence.
export const meta = {
  title: "Rusty Tap Drip", kind: "sfx", format: "sound", duration: 0.9, price: 2, author: "hollowbody", payout: "hollowbody@creators.oasis.example", kit: "Horror House", description: "A single drip from a rusty tap falling into a basin: a bright rising bubble plink, a short basin ring and an optional dark echo, for abandoned bathrooms and horror beds.",
  tags: ["drip", "tap", "water", "horror", "basin", "abandoned", "plink", "haunted"],
};
export const params = { knobs: {
  basin: { type: "choice", label: "Basin", default: "porcelain", options: ["porcelain", "metal", "puddle"] },
  drop: { type: "range", label: "Drop size", default: 0.5, min: 0, max: 1, step: 0.01 },
  resonance: { type: "range", label: "Resonance", default: 0.5, min: 0, max: 1, step: 0.01 },
  pitch: { type: "range", label: "Pitch", default: 0.5, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Echo tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + params.knobs.basin.options.indexOf(p.basin) * 97 + 3);
  const out = new Float32Array(c.seconds(p.tail ? 0.9 : 0.5, sr));
  const pm = Math.pow(2, (p.pitch - 0.5) * 1.4), size = p.drop, res = p.resonance, t0 = 0.015;
  const cfg = {
    porcelain: { modes: [[1350, 1], [2210, 0.6], [3470, 0.35]], dec: 0.06, ring: 0.3, tick: 6000, plip: 1, f: 1, glide: 2.4 },
    metal: { modes: [[640, 1], [1710, 0.8], [2890, 0.6], [4310, 0.4]], dec: 0.2, ring: 0.5, tick: 7500, plip: 0.55, f: 0.9, glide: 1.2 },
    puddle: { modes: [[260, 1], [430, 0.5]], dec: 0.025, ring: 0.12, tick: 1800, plip: 1.5, f: 0.55, glide: 3.4 },
  }[p.basin];
  const f0 = (1000 - 520 * size) * pm * cfg.f;
  const pn = c.seconds(0.07 + 0.07 * size, sr), k = 38 + 30 * (1 - size);
  const plip = c.osc("sine", (t) => f0 * (1 + cfg.glide * (1 - Math.exp(-t * k))), pn, sr);
  const plip2 = c.osc("sine", (t) => 2 * f0 * (1 + cfg.glide * (1 - Math.exp(-t * k))), pn, sr);
  const pe = c.env(pn, 0.0025, 0.022 + 0.03 * size, sr);
  for (let i = 0; i < pn; i++) plip[i] = (plip[i] + 0.25 * plip2[i]) * pe[i];
  c.mix(out, plip, t0, (0.6 + 0.4 * size) * cfg.plip, sr);
  const modes = cfg.modes.map(([f, a]) => [f * pm * (0.985 + r() * 0.03) * (1 - 0.1 * size), a * (0.7 + 0.6 * r())]);
  const rd = cfg.dec * (0.5 + 1.1 * res);
  c.mix(out, c.ring(modes, rd * 5, rd, sr), t0 + 0.004, cfg.ring * (0.2 + 0.8 * res) * (0.5 + 0.5 * size), sr);
  c.mix(out, c.burst(r, 0.006, "hp", cfg.tick, 0.8, 0.0004, 0.0015, sr), t0, 0.15 + 0.2 * size, sr);
  if (p.basin === "puddle") c.mix(out, c.burst(r, 0.05, "bp", 500 * pm, 3, 0.004, 0.015, sr), t0 + 0.01, 0.25 * size + 0.1, sr);
  const rt = t0 + 0.11 + 0.05 * r(), sn = c.seconds(0.035, sr), sf = (1800 + 700 * r()) * pm * cfg.f;
  const sp = c.osc("sine", (t) => sf * (1 + 14 * t), sn, sr), se2 = c.env(sn, 0.002, 0.009, sr);
  for (let i = 0; i < sn; i++) sp[i] *= se2[i];
  c.mix(out, sp, rt, 0.14 * (1 - 0.5 * size), sr);
  if (p.tail) {
    const tl = new Float32Array(c.seconds(0.6, sr));
    c.mix(tl, plip, 0, 0.5, sr);
    c.mix(tl, c.ring(modes, rd * 5, rd, sr), 0, 0.3 * res, sr);
    const wet = c.reverb(tl, { size: 0.7, decay: 0.45, mixAmt: 1 }, sr);
    c.filter(wet, c.biquad("lp", 2800, 0.7, sr));
    c.mix(out, wet, t0 + 0.06, 0.12 + 0.2 * res, sr);
  }
  c.filter(out, c.biquad("hp", 150, 0.7, sr));
  c.finish(out, 0.85, 1.1);
  c.fade(out, 20, sr);
  return { samples: out };
}
