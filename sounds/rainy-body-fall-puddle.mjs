// Body fall into street water: staggered body contacts as short pitch-dropping thumps, a surface-coloured slap, splash as water mass plus clustered pitched droplet chirps over a spray sheet, wet cloth slap and rustle, and an optional tail of drips, gutter flow and building slapback.
export const meta = {
  title: "Puddle Body Drop", kind: "impact", format: "sound", duration: 1.6, price: 3, author: "foleyroom", payout: "foleyroom@creators.oasis.example", kit: "Rainy City Street", description: "A body collapsing into a rain-soaked street: puddle, wet asphalt or gutter, with weight, splash, wet cloth slap and a dripping street tail as knobs; every seed is a different fall.",
  tags: ["bodyfall", "splash", "puddle", "impact", "foley", "rain", "street", "cloth"],
};
export const params = { knobs: {
  surface: { type: "choice", label: "Surface", default: "puddle", options: ["puddle", "wet asphalt", "gutter"] },
  weight: { type: "range", label: "Weight", default: 0.6, min: 0, max: 1, step: 0.01 },
  splash: { type: "range", label: "Splash", default: 0.6, min: 0, max: 1, step: 0.01 },
  cloth: { type: "range", label: "Cloth slap", default: 0.5, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Drip tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, si = params.knobs.surface.options.indexOf(p.surface);
  const r = c.rng(p.seed * 6151 + si * 211 + 3), w = p.weight, sp = p.splash, cl = p.cloth;
  const S = [
    { wet: 1, thump: 0.55, dF: [600, 2400], dk: 1, sheet: [2000, 1.0], slap: [900, 1.2], mass: 1, post: 0.12 },
    { wet: 0.35, thump: 1, dF: [2000, 5500], dk: 0.5, sheet: [5200, 0.7], slap: [3000, 0.8], mass: 0, post: 0 },
    { wet: 0.75, thump: 0.7, dF: [350, 1400], dk: 1.6, sheet: [1500, 1.3], slap: [700, 1.6], mass: 0.55, post: 0.6 },
  ][si];
  let out = new Float32Array(c.seconds(p.tail ? 2.6 : 1.2, sr));
  const drop = (t, f0, rise, dec, a) => {
    const m = c.seconds(dec * 6, sr), x = new Float32Array(m), k = Math.exp(-1 / (dec * sr)), att = Math.max(1, 0.0008 * sr);
    let ph = 0, e = 1;
    for (let i = 0; i < m; i++) { ph += c.TAU * f0 * (1 + rise * i / sr) / sr; x[i] = Math.sin(ph) * e * Math.min(1, i / att); e *= k; }
    c.mix(out, x, t, a, sr);
  };
  const thump = (t, f, dec, a) => {
    const m = c.seconds(dec * 7, sr), x = new Float32Array(m), k = Math.exp(-1 / (dec * sr)), kb = Math.exp(-1 / (0.012 * sr)), att = 0.002 * sr;
    let ph = 0, e = 1, b = 0.7;
    for (let i = 0; i < m; i++) { ph += c.TAU * f * (1 + b) / sr; x[i] = Math.sin(ph) * e * Math.min(1, i / att); e *= k; b *= kb; }
    c.mix(out, x, t, a, sr);
  };
  const droplet = (t, a) => drop(t, c.between(r, S.dF[0], S.dF[1]), c.between(r, 15, 55), c.between(r, 0.005, 0.018) * S.dk, a);
  const nc = 2 + Math.round(2 * w), times = [];
  let t = 0.012;
  for (let k = 0; k < nc; k++) { times.push(t); t += (0.035 + 0.075 * w) * (0.6 + 0.8 * r()); }
  const last = times[nc - 1];
  times.forEach((tc, k) => {
    const A = k === 1 ? 1 : 0.45 + 0.25 * r(), f = (95 - 45 * w) * (0.9 + 0.2 * r());
    thump(tc, f, 0.018 + 0.03 * w, A * S.thump * (0.5 + 0.6 * w));
    c.mix(out, c.burst(r, 0.12, "lp", 320 - 150 * w, 0.7, 0.003, 0.025 + 0.035 * w, sr), tc, A * (0.3 + 0.5 * w), sr);
    c.mix(out, c.burst(r, 0.035, "bp", S.slap[0] * (0.85 + 0.3 * r()), S.slap[1], 0.0006, 0.004 + 0.012 * S.wet, sr), tc, A * 0.6, sr);
    if (si === 1) {
      c.mix(out, c.burst(r, 0.02, "hp", 2500, 0.7, 0.0004, 0.003, sr), tc, A * 0.7, sr);
      for (let g = 0; g < 8 + 14 * w; g++) c.mix(out, c.burst(r, 0.004, "hp", 3000 + r() * 3500, 0.8, 0.0003, 0.001, sr), tc + r() * 0.025, A * 0.2 * r(), sr);
    }
    if (si === 2 && k < 2) c.mix(out, c.ring([[412 * (0.97 + 0.06 * r()), 1], [1037, 0.5], [2290, 0.25]], 0.15, 0.02, sr), tc + 0.003, A * 0.3, sr);
    if (S.mass) {
      c.mix(out, c.burst(r, 0.18, "bp", 380 + 200 * r(), 0.9, 0.008, 0.04 + 0.05 * sp, sr), tc + 0.004, A * S.mass * (0.25 + 0.5 * sp), sr);
      drop(tc + 0.01 + 0.02 * r(), c.between(r, 170, 300), c.between(r, 3, 8), 0.035 + 0.02 * w, A * S.mass * (0.15 + 0.3 * sp));
    }
    const nd = Math.round((10 + 60 * sp) * S.wet * A * (0.6 + 0.6 * w));
    for (let d = 0; d < nd; d++) droplet(tc + 0.003 + Math.pow(r(), 2) * (0.05 + 0.06 * sp), (0.06 + 0.12 * r()) * (0.4 + 0.6 * sp));
    c.mix(out, c.burst(r, 0.1 + 0.15 * sp, "bp", S.sheet[0] * (0.8 + 0.4 * r()), S.sheet[1], 0.002, 0.02 + 0.08 * sp * S.wet, sr), tc + 0.002, (0.1 + 0.5 * sp) * (0.4 + 0.6 * S.wet) * A, sr);
  });
  const nf = Math.round(45 * sp * S.wet * (0.5 + w));
  for (let d = 0; d < nf; d++) { const u = Math.pow(r(), 1.4); droplet(times[1] + 0.12 + u * (0.25 + 0.3 * sp), (0.04 + 0.1 * r()) * (1 - 0.6 * u) * (0.3 + 0.7 * sp)); }
  const ng = Math.round(70 * S.post * (0.5 + sp));
  for (let d = 0; d < ng; d++) { const u = Math.pow(r(), 1.2); drop(last + 0.02 + u * 0.45, c.between(r, 300, 900), c.between(r, 20, 60), c.between(r, 0.01, 0.025), 0.1 * (1 - 0.7 * u)); }
  if (cl > 0) {
    const ts = times[1] + 0.008 + 0.015 * r();
    c.mix(out, c.burst(r, 0.04, "bp", 1200 + 400 * r(), 0.7, 0.0008, 0.014, sr), ts, 1.1 * cl, sr);
    c.mix(out, c.burst(r, 0.06, "lp", 550, 0.8, 0.001, 0.022, sr), ts, 0.6 * cl, sr);
    c.mix(out, c.burst(r, 0.035, "bp", 1700 + 600 * r(), 0.9, 0.0008, 0.01, sr), last + 0.06 + 0.06 * r(), 0.75 * cl, sr);
    for (let g = 0; g < 6 + 34 * cl; g++) { const u = r(); c.mix(out, c.burst(r, 0.012, "bp", 1800 + r() * 3500, 1.3, 0.001, 0.004, sr), last + 0.08 + u * 0.4, (0.05 + 0.12 * r()) * (1 - 0.6 * u) * cl, sr); }
  }
  if (p.tail) {
    const nd = 6 + Math.round(10 * sp * S.wet);
    for (let d = 0; d < nd; d++) { const u = r(); drop(last + 0.3 + u * 1.3, c.between(r, 900, 2800), c.between(r, 20, 50), c.between(r, 0.008, 0.02), 0.12 * (1 - 0.5 * u)); }
    if (si === 2) for (let d = 0; d < 180; d++) { const u = Math.pow(r(), 1.3); drop(last + 0.3 + u * 1.5, c.between(r, 450, 1500), c.between(r, 10, 40), c.between(r, 0.006, 0.015), 0.06 * (1 - 0.8 * u)); }
    if (si === 0) for (let d = 0; d < 4; d++) drop(last + 0.2 + r() * 0.6, c.between(r, 220, 450), c.between(r, 6, 18), 0.03, 0.1);
    const dry = out.slice(), lp = c.onepole(sr), echoes = [[0.08 + 0.04 * r(), 0.32], [0.17 + 0.06 * r(), 0.2], [0.3 + 0.08 * r(), 0.11]];
    for (const [d, g] of echoes) { const x = dry.slice(); for (let i = 0; i < x.length; i++) x[i] = lp(x[i], 2200); c.mix(out, x.subarray(0, x.length - c.seconds(d, sr)), d, g, sr); }
    out = c.reverb(out, { size: 0.4, decay: 0.5, mixAmt: 0.16 }, sr) || out;
  }
  c.finish(out, 0.9, 1.1);
  let end = out.length - 1;
  while (end > 0 && Math.abs(out[end]) < 0.003) end--;
  const res = out.slice(0, Math.min(out.length, end + c.seconds(0.05, sr)));
  c.fade(res, 25, sr);
  return { samples: res };
}
