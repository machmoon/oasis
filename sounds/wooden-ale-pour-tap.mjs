// Ale pour: a barrel tap clacks open, a liquid stream (noise mass + a vessel air-column resonance that rises as it fills) carries bubble chirps, foam fizz builds, then the tap shuts and drips and foam settle.
export const meta = {
  title: "Ale From The Tap", kind: "sfx", format: "sound", duration: 2.6, price: 2, author: "hollowbody", payout: "hollowbody@creators.oasis.example", kit: "Wooden Tavern", description: "Ale drawn from a wooden barrel tap into a cup, tankard or pitcher, with the rising fill pitch, bubbling stream and settling foam; for tavern scenes, bar interactions and drinking animations.",
  tags: ["pour", "ale", "beer", "tavern", "liquid", "tap", "foam", "drink"],
};
export const params = { knobs: {
  vessel: { type: "choice", label: "Vessel", default: "tankard", options: ["small", "tankard", "pitcher"] },
  flow: { type: "range", label: "Flow rate", default: 0.55, min: 0, max: 1, step: 0.01 },
  fizz: { type: "range", label: "Foam fizz", default: 0.5, min: 0, max: 1, step: 0.01 },
  fill: { type: "range", label: "Fill duration", default: 1.6, min: 0.8, max: 3, step: 0.05 },
  tail: { type: "toggle", label: "Drips + settle tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, vi = params.knobs.vessel.options.indexOf(p.vessel), r = c.rng(p.seed * 4241 + vi * 97 + 11);
  const V = [
    { lo: 820, span: 2.6, bub: 1500, mass: 1900, body: [[1320, 1], [2950, 0.5], [4700, 0.25]], bd: 0.025 },
    { lo: 470, span: 3.0, bub: 1000, mass: 1300, body: [[410, 1], [960, 0.45], [1750, 0.2]], bd: 0.018 },
    { lo: 250, span: 3.5, bub: 680, mass: 850, body: [[290, 1], [680, 0.5], [1500, 0.25]], bd: 0.03 },
  ][vi];
  const fill = p.fill, fl = p.flow, fz = p.fizz, t0 = 0.04, se = t0 + fill, tl = p.tail ? 0.85 : 0.14;
  const n = c.seconds(se + tl, sr), out = new Float32Array(n);
  const tap = (at, g) => {
    c.mix(out, c.burst(r, 0.012, "bp", 2300 + 400 * r(), 0.9, 0.0008, 0.003, sr), at, 0.35 * g, sr);
    c.mix(out, c.ring([[1850 * (0.97 + 0.06 * r()), 1], [3720, 0.45], [5340, 0.25]], 0.05, 0.009, sr), at + 0.001, 0.22 * g, sr);
    c.mix(out, c.ring([[220 + 30 * r(), 1], [530, 0.4]], 0.07, 0.015, sr), at + 0.002, 0.3 * g, sr);
  };
  tap(0.004, 1);
  c.mix(out, c.ring(V.body.map(([f, a]) => [f * (0.97 + 0.06 * r()), a]), 0.08, V.bd, sr), t0 + 0.03, 0.25 + 0.2 * fl, sr);
  c.mix(out, c.burst(r, 0.03, "bp", V.body[0][0] * 2, 1.2, 0.002, 0.012, sr), t0 + 0.028, 0.3, sr);
  const m = c.seconds(fill + 0.07, sr), fs = c.seconds(fill, sr), src = c.noise(r, m), lpf = c.onepole(sr), st = new Float32Array(m);
  const k = 1 - 1 / V.span, q = 1 / (5 + 3 * (1 - fl)), mc = V.mass * (0.6 + 0.8 * fl), ma = 0.3 + 0.4 * fl;
  let L = 0, B = 0, F = 0, g = 0.8, gt = 0.8;
  for (let i = 0; i < m; i++) {
    if (i % 64 === 0) F = 2 * Math.sin(Math.PI * V.lo / (1 - k * Math.min(1, i / fs)) / sr);
    if (i % 400 === 0) gt = 0.55 + 0.45 * r();
    g += (gt - g) * 0.002;
    const s = src[i]; L += F * B; const H = s - L - q * B; B += F * H;
    const e = Math.min(1, i / (0.05 * sr)) * (i > fs ? Math.max(0, 1 - (i - fs) / (m - fs)) : 1);
    st[i] = (lpf(s, mc) * ma + B * q * 2.6) * e * e * g;
  }
  c.mix(out, st, t0, 0.8, sr);
  const bub = (at, f0, d, a, rise) => {
    const s0 = Math.floor(at * sr), kk = Math.floor(d * sr), dk = Math.exp(-6 / kk), atk = 0.0006 * sr;
    let ph = 0, e = 1;
    for (let i = 0; i < kk && s0 + i < n; i++) { ph += c.TAU * f0 * (1 + rise * i / kk) / sr; out[s0 + i] += a * e * Math.min(1, i / atk) * Math.sin(ph); e *= dk; }
  };
  const nb = Math.round(fill * (50 + 170 * fl));
  for (let b = 0; b < nb; b++) {
    const x = Math.pow(r(), 0.9), at = t0 + 0.03 + x * (fill - 0.06);
    const f0 = V.bub * (1.35 - 0.6 * fl) * (0.6 + 0.9 * r()) * (1 + 0.4 * x);
    bub(at, f0, 0.006 + (0.012 + 0.018 * r()) * (V.bub / f0), (0.12 + 0.35 * r()) * (0.7 + 0.3 * fl), 0.25 + 0.6 * r());
  }
  tap(se - 0.01, 0.8);
  if (p.tail) {
    const nd = 3 + Math.floor(r() * 3);
    let at = se + 0.08 + 0.06 * r();
    for (let d = 0; d < nd; d++) {
      bub(at, V.bub * (1.1 + 0.7 * r()), 0.035 + 0.02 * r(), 0.35 * (1 - d / (nd + 1)), 0.8 + 0.6 * r());
      c.mix(out, c.burst(r, 0.01, "hp", 3000, 0.8, 0.0005, 0.003, sr), at, 0.12, sr);
      at += 0.08 + 0.14 * r();
    }
    const sl = c.brown(r, c.seconds(0.3, sr)), slp = c.biquad("lp", V.mass * 0.5, 0.8, sr);
    for (let i = 0; i < sl.length; i++) sl[i] = slp(sl[i]) * Math.min(1, i / (0.01 * sr)) * Math.exp(-i / sr / 0.07);
    c.mix(out, sl, se, 0.6, sr);
  }
  const b1 = c.biquad("bp", 4300, 3, sr), b2 = c.biquad("bp", 7000, 3, sr), fd = p.tail ? 0.3 : 0.025;
  for (let i = c.seconds(t0, sr); i < n; i++) {
    const t = i / sr, e = t < se ? c.clamp(((t - t0) / fill - 0.15) / 0.55, 0, 1) : Math.exp(-(t - se) / fd);
    let a = 0, b = 0;
    if (r() < 3800 * fz * e / sr) { if (r() < 0.6) a = 0.4 + r(); else b = 0.4 + r(); }
    out[i] += 0.55 * (b1(a) + b2(b));
  }
  c.finish(out, 0.9);
  c.fade(out, 4, sr);
  return { samples: out };
}
