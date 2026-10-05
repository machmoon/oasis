// Footstep: one step on gravel, wood, wet concrete or snow. Layered after Farnell's footstep model (Designing Sound,
// "Footsteps"): the ground thump of the body arriving, a heel click coloured by the surface, a surface-specific grain
// layer (stones, a hollow board, a hard slab, compressing powder) and an optional water layer. Ported from the mock's
// synth/footstep.mjs into the Oasis sound contract.
export const meta = {
  title: "Footstep", kind: "foley", format: "sound", duration: 0.5, price: 3, author: "foleyroom", payout: "foleyroom@creators.oasis.example",
  description: "One footstep whose surface, weight, pace and wetness are knobs; every seed is a different step, so a walk never repeats.",
  tags: ["footstep", "walk", "foley", "gravel", "wood", "concrete", "snow", "character"],
};
export const params = { knobs: {
  surface: { type: "choice", label: "Surface", default: "gravel", options: ["gravel", "wood", "wet-concrete", "snow"] },
  weight: { type: "range", label: "Weight", default: 0.5, min: 0, max: 1, step: 0.01 },
  pace: { type: "range", label: "Pace", default: 1, min: 0.5, max: 2, step: 0.05 },
  wetness: { type: "range", label: "Wetness", default: 0, min: 0, max: 1, step: 0.01 },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 7919 + params.knobs.surface.options.indexOf(p.surface) * 131 + 17);
  const dur = p.surface === "snow" ? 0.55 : 0.45, out = new Float32Array(c.seconds(dur, sr));
  const strike = 0.8 + 0.5 * p.pace, w = p.weight;
  let wet = p.wetness;
  // the ground thump: heavier is louder, lower and longer
  c.mix(out, c.ring([[105 - 55 * w, 1], [2 * (105 - 55 * w), 0.25]], 0.25, 0.03 + 0.09 * w, sr), 0.004, (0.12 + 0.6 * w) * strike, sr);
  const click = { gravel: [3200, 0.7], wood: [1800, 0.9], "wet-concrete": [5200, 0.6], snow: [700, 0.8] }[p.surface];
  c.mix(out, c.burst(r, 0.012, "lp", click[0], click[1], 0.0005, 0.003, sr), 0, 0.5 * strike, sr);
  if (p.surface === "gravel") {
    const grains = Math.round(50 + 90 * w);
    for (let g = 0; g < grains; g++) { const t = 0.005 + Math.pow(r(), 1.6) * (0.11 + 0.1 * w); c.mix(out, c.burst(r, 0.004 + r() * 0.004, "bp", 2200 + r() * 3200, 4, 0.0003, 0.0012, sr), t, (0.25 + 0.5 * r()) * (0.5 + 0.5 * w), sr); }
    for (let g = 0; g < grains / 3; g++) { const t = 0.16 + r() * 0.14; c.mix(out, c.burst(r, 0.004 + r() * 0.004, "bp", 1800 + r() * 2600, 4, 0.0003, 0.0012, sr), t, (0.15 + 0.35 * r()) * (0.5 + 0.5 * w), sr); }
  } else if (p.surface === "wood") {
    const k = 1 - 0.18 * w;
    c.mix(out, c.ring([[196 * k, 1], [392 * k, 0.5], [780 * k, 0.22]], 0.22, 0.045 + 0.03 * w, sr), 0.003, 0.55 * strike, sr);
    c.mix(out, c.burst(r, 0.03, "lp", 2600, 0.7, 0.001, 0.008, sr), 0.002, 0.5, sr);
    c.mix(out, c.ring([[196 * k * 1.01, 0.5], [392 * k, 0.25]], 0.16, 0.035, sr), 0.19, 0.25 * strike, sr);
  } else if (p.surface === "wet-concrete") {
    c.mix(out, c.burst(r, 0.02, "hp", 1400, 0.7, 0.0005, 0.004, sr), 0, 0.8 * strike, sr);
    c.mix(out, c.ring([[1250, 0.4], [3100, 0.2]], 0.04, 0.006, sr), 0.001, 0.4, sr);
    c.mix(out, c.burst(r, 0.07, "bp", 900, 2, 0.004, 0.02, sr), 0.03, 0.18, sr);
    wet = Math.max(wet, 0.6);
  } else {
    const n = c.seconds(0.2 + 0.18 * w, sr), x = c.noise(r, n), lp = c.biquad("lp", 650 + 350 * w, 0.9, sr); let flick = 1;
    for (let i = 0; i < n; i++) { if (i % 180 === 0) flick = 0.35 + r() * 0.65; x[i] = lp(x[i]) * flick * Math.exp(-i / sr / (0.08 + 0.1 * w)) * Math.min(1, i / (0.012 * sr)); }
    c.mix(out, x, 0.004, 0.75 * (0.6 + 0.4 * w), sr);
    c.mix(out, c.ring([[310, 1], [470, 0.4]], 0.12, 0.02, sr), 0.01, 0.12 * w, sr);
  }
  if (wet > 0) {
    const n = c.seconds(0.09, sr), x = c.noise(r, n), e = c.env(n, 0.003, 0.025, sr);
    for (let i = 0; i < n; i++) { const f = 4200 - 3000 * (i / n); x[i] = x[i] * e[i] * Math.sin(c.TAU * f / sr * i * 0.5); }
    c.mix(out, x, 0.006, 0.55 * wet, sr);
    c.mix(out, c.burst(r, 0.08, "bp", 2600, 1.2, 0.002, 0.03, sr), 0.004, 0.45 * wet, sr);
    const m = c.seconds(0.13, sr), s = c.noise(r, m), bp = c.biquad("bp", 700, 1.5, sr); let g = 0;
    for (let i = 0; i < m; i++) { if (i % 300 === 0) g = r() < 0.6 ? r() : 0; s[i] = bp(s[i]) * g * Math.exp(-i / sr / 0.05); }
    c.mix(out, s, 0.05 + 0.05 * r(), 0.7 * wet, sr);
  }
  c.finish(out, 0.9, 1.2);
  c.gain(out, 0.55 + 0.45 * w);
  return { samples: out };
}
