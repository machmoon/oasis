// Wet sidewalk footstep: a shaped low-noise heel thump and toe roll as the body, shoe-specific contact clicks, a wet sole slap, squelch grains and bubble chirps, clustered puddle spray settling into a patter, a scuff drag or squeak, a leather creak, and optional facade reflections.
export const meta = {
  title: "Slick Pavement Step", kind: "foley", format: "sound", duration: 0.45, price: 1, author: "foleyroom", payout: "foleyroom@creators.oasis.example", kit: "Rainy City Street", description: "One footstep on a rain-slick city sidewalk. Shoe, weight, squelch, scuff and puddle depth are knobs, and every seed is a different step, so a night walk in the rain never repeats.",
  tags: ["footstep", "wet", "rain", "pavement", "sidewalk", "foley", "city", "puddle"],
};
export const params = { knobs: {
  shoe: { type: "choice", label: "Shoe", default: "boot", options: ["sneaker", "boot", "heel", "leather"] },
  weight: { type: "range", label: "Weight", default: 0.5, min: 0, max: 1, step: 0.01 },
  squelch: { type: "range", label: "Squelch", default: 0.4, min: 0, max: 1, step: 0.01 },
  scuff: { type: "range", label: "Scuff", default: 0.25, min: 0, max: 1, step: 0.01 },
  puddle: { type: "range", label: "Puddle depth", default: 0.35, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Street reflections", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, si = params.knobs.shoe.options.indexOf(p.shoe), r = c.rng(p.seed * 6151 + si * 211 + 3);
  const w = p.weight, sq = p.squelch, sc = p.scuff, pd = p.puddle;
  const S = {
    sneaker: { bf: 170, ba: 1.25, atk: 0.005, dec: 0.03, clk: ["lp", 900, 0.7], ca: 0.25, cat: 0.003, modes: null, gap: 0.12, toe: 0.9, wet: 0.75, sf: 1800 },
    boot: { bf: 130, ba: 1.5, atk: 0.0015, dec: 0.022, clk: ["bp", 1300, 0.9], ca: 0.55, cat: 0.001, modes: [[380, 1], [870, 0.4]], md: 0.004, mg: 0.35, gap: 0.085, toe: 1.1, wet: 1, sf: 2400 },
    heel: { bf: 260, ba: 0.35, atk: 0.0004, dec: 0.01, clk: ["hp", 3800, 0.8], ca: 0.95, cat: 0.0003, modes: [[2350, 1], [3950, 0.6], [6200, 0.3]], md: 0.022, mg: 0.95, gap: 0.14, toe: 0.4, wet: 0.45, sf: 4200 },
    leather: { bf: 200, ba: 0.9, atk: 0.0008, dec: 0.016, clk: ["bp", 2600, 1.1], ca: 0.7, cat: 0.0006, modes: [[1300, 1], [2900, 0.4]], md: 0.006, mg: 0.5, gap: 0.1, toe: 0.85, wet: 0.8, sf: 3000 },
  }[p.shoe];
  const det = () => 0.95 + 0.1 * r(), wet = S.wet * (0.3 + 0.7 * pd);
  const gap = S.gap * (1 + 0.25 * w) * (0.85 + 0.3 * r()), t0 = 0.004, t1 = t0 + gap;
  const dry = t1 + 0.28, out = new Float32Array(c.seconds(dry + (p.tail ? 0.22 : 0.02), sr));
  const thump = (f, a, dec) => {
    const m = c.seconds(dec * 7 + a + 0.01, sr), x = c.brown(r, m), l1 = c.onepole(sr), l2 = c.onepole(sr), hp = c.biquad("hp", 45, 0.7, sr); let pk = 1e-9;
    for (let i = 0; i < m; i++) { const t = i / sr; x[i] = hp(l2(l1(x[i], f), f)) * Math.min(1, t / a) * Math.exp(-t / dec); pk = Math.max(pk, Math.abs(x[i])); }
    for (let i = 0; i < m; i++) x[i] /= pk;
    return x;
  };
  const chirp = (f0, d, rise) => {
    const m = c.seconds(d, sr), x = new Float32Array(m), a = 0.0008 * sr, tau = d * 0.3; let ph = 0;
    for (let i = 0; i < m; i++) { const t = i / sr; ph += c.TAU * f0 * (1 + rise * t / d) / sr; x[i] = Math.sin(ph) * Math.min(1, i / a) * Math.exp(-t / tau); }
    return x;
  };
  c.mix(out, thump(S.bf * (1 - 0.35 * w) * det(), S.atk, S.dec * (1 + 0.9 * w)), t0, S.ba * (0.45 + 0.75 * w), sr);
  c.mix(out, c.ring([[85 * (1 - 0.3 * w) * det(), 1]], 0.03, 0.005 + 0.004 * w, sr), t0, S.ba * (0.15 + 0.25 * w), sr);
  c.mix(out, c.burst(r, 0.014, S.clk[0], S.clk[1] * det(), S.clk[2], S.cat, 0.002 + S.cat * 2, sr), t0, S.ca * (1 - 0.3 * sq), sr);
  if (S.modes) c.mix(out, c.ring(S.modes.map(([f, a]) => [f * (1 - 0.08 * w) * det(), a]), S.md * 5, S.md, sr), t0 + S.cat, S.mg * (1 - 0.35 * sq), sr);
  c.mix(out, thump(S.bf * 1.3 * det(), S.atk * 1.5, S.dec * 0.7), t1, S.ba * S.toe * (0.25 + 0.35 * w), sr);
  c.mix(out, c.burst(r, 0.012, S.clk[0], S.clk[1] * 1.1 * det(), S.clk[2], S.cat * 1.5, 0.002 + S.cat * 2, sr), t1, S.ca * 0.45 * S.toe, sr);
  if (S.modes) c.mix(out, c.ring(S.modes.map(([f, a]) => [f * 1.06 * det(), a]), S.md * 4, S.md * 0.7, sr), t1, S.mg * 0.35, sr);
  c.mix(out, c.burst(r, 0.03, "bp", 1500 * det(), 0.6, 0.001, 0.006, sr), t0 + 0.001, 0.35 * wet, sr);
  c.mix(out, c.burst(r, 0.04 + 0.05 * pd, "hp", S.sf * det(), 0.7, 0.0015, 0.008 + 0.022 * pd, sr), t0 + 0.002, 0.4 * wet, sr);
  const nsp = Math.round(6 + 40 * wet), ssp = 0.025 + 0.06 * pd;
  for (let g = 0; g < nsp; g++) c.mix(out, c.burst(r, 0.006, "bp", S.sf * (0.9 + 1.4 * r()), 2.5, 0.0004, 0.0008 + 0.0012 * r(), sr), t0 + 0.002 + Math.pow(r(), 1.5) * ssp, (0.06 + 0.16 * r()) * wet, sr);
  if (pd > 0.05) {
    const ts = t0 + 0.03, span = 0.05 + 0.08 * pd;
    c.mix(out, c.burst(r, span + 0.04, "bp", 2400, 0.9, 0.012, 0.025 + 0.02 * pd, sr), ts, 0.12 * wet, sr);
    const nd = Math.round(4 + 14 * pd);
    for (let g = 0; g < nd; g++) c.mix(out, c.burst(r, 0.008, "bp", 1400 + 2400 * r(), 2, 0.0008, 0.0015 + 0.002 * r(), sr), ts + Math.pow(r(), 0.8) * span, (0.05 + 0.1 * r()) * wet, sr);
  }
  if (sq > 0) {
    const ng = Math.round(5 + 30 * sq), span = gap + 0.03 + 0.04 * sq;
    for (let g = 0; g < ng; g++) c.mix(out, c.burst(r, 0.01, "bp", (500 + 2000 * r()) * (1 - 0.25 * w), 2 + 2 * r(), 0.0005, 0.0015 + 0.003 * r(), sr), t0 + 0.003 + Math.pow(r(), 1.3) * span, (0.1 + 0.25 * r()) * sq, sr);
    const nb = Math.round(1 + 6 * sq);
    for (let b = 0; b < nb; b++) c.mix(out, chirp((900 + 1800 * r()) * (1 - 0.25 * w), 0.006 + 0.008 * r(), 1 + 2 * r()), t0 + 0.006 + r() * span, (0.08 + 0.14 * r()) * sq, sr);
    const ts = t1 + 0.015 + 0.015 * r(), ns = Math.round(4 + 12 * sq);
    for (let g = 0; g < ns; g++) { const u = Math.sqrt(r()); c.mix(out, c.burst(r, 0.01, "bp", 600 + 1200 * u, 1.5, 0.0006, 0.002 + 0.003 * r(), sr), ts + u * (0.03 + 0.03 * sq), (0.08 + 0.2 * r()) * sq, sr); }
  }
  if (p.shoe === "leather") {
    const m = c.seconds(0.05 + 0.04 * w, sr), x = new Float32Array(m), bp = c.biquad("bp", 750, 3, sr); let nx = 0;
    for (let i = 0; i < m; i++) { if (i >= nx) { x[i] = 0.5 + r(); nx = i + Math.round(sr / (90 + 60 * r())); } x[i] = bp(x[i]) * Math.sin(Math.PI * i / m); }
    c.mix(out, x, t1 + 0.01, 0.9 * (0.35 + 0.65 * w), sr);
  }
  if (sc > 0) {
    const d = 0.04 + 0.16 * sc, m = c.seconds(d, sr), x = c.noise(r, m), hold = Math.max(1, Math.round(sr * 0.002));
    const bp = c.biquad("bp", (p.shoe === "heel" ? 3800 : p.shoe === "sneaker" ? 1500 : 2400) * (1 - 0.2 * sq), 1.2, sr); let g = 1;
    for (let i = 0; i < m; i++) { if (i % hold === 0) g = 0.2 + 0.8 * r() * r(); x[i] = bp(x[i] * g) * Math.sin(Math.PI * Math.sqrt(i / m)); }
    c.mix(out, x, t1 + 0.004, (p.shoe === "sneaker" ? 0.35 : 0.85) * sc, sr);
    if (p.shoe === "sneaker") {
      const ms = c.seconds(0.05 + 0.12 * sc, sr), y = new Float32Array(ms), f0 = 1500 + 600 * r(), vr = 22 + 12 * r(); let ph = 0;
      for (let i = 0; i < ms; i++) { const u = i / ms; ph += c.TAU * (f0 * (1 + 0.5 * u) + 90 * Math.sin(c.TAU * vr * i / sr)) / sr; y[i] = (Math.sin(ph) + 0.4 * Math.sin(2 * ph) + 0.15 * Math.sin(3 * ph)) * Math.sin(Math.PI * u); }
      c.mix(out, y, t1 + 0.008, 0.35 * sc * (0.5 + 0.5 * sq), sr);
    }
  }
  if (p.tail) {
    const d = out.slice(0, c.seconds(dry, sr));
    c.filter(d, c.biquad("lp", 3000, 0.7, sr));
    c.filter(d, c.biquad("hp", 180, 0.7, sr));
    for (let k = 0; k < 12; k++) { const t = 0.015 + Math.pow(r(), 0.8) * 0.13; c.mix(out, d, t, (0.08 + 0.08 * r()) * Math.exp(-t / 0.06), sr); }
  }
  c.finish(out, 0.9, 1.1);
  let end = out.length - 1;
  while (end > 0 && Math.abs(out[end]) < 0.001) end--;
  const res = out.slice(0, Math.min(out.length, end + c.seconds(0.012, sr)));
  c.fade(res, 5, sr);
  c.gain(res, 0.62 + 0.38 * w);
  return { samples: res };
}
