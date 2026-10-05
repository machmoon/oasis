// Rainy street bed: a loopable downpour of pink-noise hiss and a wet low splatter body, under bandpassed drop grains coloured by the surface, metal pings off parked car roofs and bubbling puddle drips, pre-rolled so the reverb and filters are settled at the loop point, all pushed back by distance.
export const meta = {
  title: "Downtown Downpour", kind: "ambience", format: "sound", duration: 3, price: 4, author: "stormfront", payout: "stormfront@creators.oasis.example", kit: "Rainy City Street", description: "A loopable steady downpour on asphalt, concrete and parked cars, with knobs for rain density, drip detail and distance; each seed is a different three seconds of the same storm.",
  tags: ["rain", "street", "ambience", "loop", "city", "night", "asphalt", "downpour"],
};
export const params = { knobs: {
  surface: { type: "choice", label: "Surface", default: "asphalt", options: ["asphalt", "concrete", "mixed"] },
  density: { type: "range", label: "Rain density", default: 0.6, min: 0, max: 1, step: 0.01 },
  drips: { type: "range", label: "Drip detail", default: 0.4, min: 0, max: 1, step: 0.01 },
  distance: { type: "range", label: "Distance", default: 0.25, min: 0, max: 1, step: 0.01 },
  crossfade: { type: "toggle", label: "Loop crossfade", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, si = params.knobs.surface.options.indexOf(p.surface), r = c.rng(p.seed * 1931 + si * 97 + 3);
  const dur = 3, n = c.seconds(dur, sr), pre = c.seconds(0.6, sr), xf = p.crossfade ? c.seconds(0.25, sr) : 0;
  const N = pre + n + xf, buf = new Float32Array(N);
  const far = p.distance, d = p.density, det = p.drips, ny = sr * 0.45, span = N / sr;
  const S = {
    asphalt: { hp: 320, lp: 5000, f: 1400, q: 1.3, metal: 0.35, body: 0.55 },
    concrete: { hp: 950, lp: 9800, f: 3300, q: 2.3, metal: 0.35, body: 0.15 },
    mixed: { hp: 560, lp: 7500, f: 2200, q: 1.8, metal: 1.1, body: 0.32 },
  }[p.surface];
  const h = c.pink(r, N), hp = c.biquad("hp", S.hp * (1 - 0.4 * far), 0.7, sr);
  const lp = c.biquad("lp", Math.min(ny, S.lp * (1 - 0.65 * far)), 0.7, sr);
  const ph1 = r() * c.TAU, ph2 = r() * c.TAU, w = c.TAU / dur;
  for (let i = 0; i < N; i++) {
    const t = i / sr;
    h[i] = lp(hp(h[i])) * (0.8 + 0.12 * Math.sin(w * t + ph1) + 0.08 * Math.sin(3 * w * t + ph2));
  }
  c.mix(buf, h, 0, (0.1 + 0.6 * d) * (1 - 0.35 * det) * (1 - 0.15 * far), sr);
  const b = c.brown(r, N), blp = c.biquad("lp", 180 + 120 * d, 0.8, sr), bhp = c.biquad("hp", 40, 0.7, sr);
  for (let i = 0; i < N; i++) b[i] = blp(bhp(b[i]));
  c.mix(buf, b, 0, S.body * (0.1 + 0.45 * d) * (1 - 0.6 * far), sr);
  const drops = Math.round((40 + 760 * d) * span * (1 - 0.45 * far));
  for (let k = 0; k < drops; k++) {
    const f = Math.min(ny, S.f * (0.55 + r() * 0.9) * (1 - 0.3 * far));
    const dec = 0.0012 + r() * 0.003 * (1 - 0.5 * det);
    const g = (0.12 + 0.4 * r()) * (0.45 + 0.65 * det) * (1 - 0.6 * far);
    c.mix(buf, c.burst(r, 0.006 + r() * 0.008, "bp", f, S.q + 3 * det, 0.0004, dec, sr), r() * span, g, sr);
  }
  const pings = Math.round(drops * 0.07 * S.metal);
  for (let k = 0; k < pings; k++) {
    const modes = [[700 + r() * 900, 1], [1900 + r() * 1400, 0.4], [Math.min(ny, 4100 + r() * 1500), 0.15]];
    const rg = c.ring(modes, 0.06, 0.008 + 0.012 * det, sr);
    c.multiply(rg, c.env(rg.length, 0.0006, 0.02, sr));
    c.mix(buf, rg, r() * span, (0.04 + 0.05 * r()) * (1 - 0.6 * far), sr);
  }
  const nd = Math.round(det * 36 * (1 - 0.4 * far));
  for (let k = 0; k < nd; k++) {
    const t = r() * span, f0 = 550 + r() * 1300, m = c.seconds(0.05, sr);
    const s = c.osc("sine", (tt) => f0 * (1 + 6 * tt), m, sr);
    c.multiply(s, c.env(m, 0.001, 0.01 + 0.012 * r(), sr));
    const g = (0.15 + 0.25 * r()) * det * (1 - 0.5 * far);
    c.mix(buf, s, t, g, sr);
    c.mix(buf, c.burst(r, 0.008, "lp", 1800, 0.8, 0.0005, 0.002, sr), t, g * 0.5, sr);
  }
  c.filter(buf, c.biquad("lp", Math.min(ny, 12000 - 8500 * far), 0.7, sr));
  const wet = c.reverb(buf, { size: 0.45 + 0.45 * far, decay: 0.35 + 0.45 * far, mixAmt: 0.08 + 0.35 * far }, sr) || buf;
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = wet[pre + i];
  for (let i = 0; i < xf; i++) {
    const a = i / xf;
    out[i] = wet[pre + i] * Math.sqrt(a) + wet[pre + n + i] * Math.sqrt(1 - a);
  }
  c.finish(out, 0.8);
  c.fade(out, p.crossfade ? 10 : 20, sr);
  return { samples: out };
}
