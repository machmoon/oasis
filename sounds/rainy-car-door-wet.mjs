// Wet car door: handle clack, latch release and rubber peel, check-strap detents over a street-rain bed with rain pouring into the open frame, a swing whoosh into a damped panel-and-body slam with latch clack, a squelching gasket, loose-trim rattle, and an optional street slap-back with drips shaken off the door.
export const meta = {
  title: "Rainy Car Door", kind: "foley", format: "sound", duration: 2.0, price: 2, author: "foleyroom", payout: "foleyroom@creators.oasis.example", kit: "Rainy City Street", description: "A car door opened and slammed shut in the rain: vehicle, slam force, wet seal squelch and rain falling into the open cabin are knobs, and every seed is a different door.",
  tags: ["car door", "slam", "vehicle", "rain", "wet", "foley", "street", "taxi"],
};
export const params = { knobs: {
  vehicle: { type: "choice", label: "Vehicle", default: "sedan", options: ["compact", "sedan", "taxi", "van"] },
  force: { type: "range", label: "Slam force", default: 0.6, min: 0, max: 1, step: 0.01 },
  squelch: { type: "range", label: "Seal squelch", default: 0.5, min: 0, max: 1, step: 0.01 },
  rain: { type: "range", label: "Rain inside", default: 0.5, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Street tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, vi = Math.max(0, params.knobs.vehicle.options.indexOf(p.vehicle)), r = c.rng(p.seed * 6151 + vi * 97 + 3);
  const V = [
    { m: [[150, 1], [340, .55], [760, .3], [1500, .14]], low: 88, dec: .04, hold: .45, latch: 4300, det: 1, rat: .25 },
    { m: [[118, 1], [262, .5], [575, .25], [1180, .1]], low: 70, dec: .055, hold: .65, latch: 3500, det: 2, rat: .15 },
    { m: [[108, 1], [240, .6], [530, .35], [1320, .22]], low: 64, dec: .06, hold: .8, latch: 2900, det: 2, rat: .9 },
    { m: [[78, 1], [172, .6], [385, .3], [820, .12]], low: 46, dec: .08, hold: .95, latch: 2400, det: 3, rat: .4 },
  ][vi];
  const f = p.force, sq = p.squelch, rain = p.rain;
  const swing = 0.22 - 0.12 * f, tShut = 0.12 + V.hold * (1.15 - 0.35 * f) + swing, tailLen = p.tail ? 0.85 : 0.3;
  const dur = tShut + 0.12 + V.dec * 4 + tailLen, n = c.seconds(dur, sr), out = new Float32Array(n), hit = new Float32Array(n);
  const jit = (m) => m.map(([hz, a]) => [hz * (0.97 + r() * 0.06), a]);
  const squish = (dst, at, len, f0, f1, amt) => {
    const m = c.seconds(len, sr), x = c.noise(r, m), a = c.onepole(sr), b = c.onepole(sr); let g = 1, gs = 1;
    for (let i = 0; i < m; i++) {
      const u = i / m, fc = f0 + (f1 - f0) * u, v = x[i];
      if (i % Math.round(sr * 0.004) === 0) g = 0.2 + r() * 0.8; gs += (g - gs) * 0.02;
      x[i] = (a(v, fc * 1.6) - b(v, fc * 0.6)) * gs * Math.min(1, i / (0.003 * sr)) * (1 - u) * (1 - u);
    }
    c.mix(dst, x, at, 1.1 * amt, sr);
    for (let k = 0; k < Math.round(2 + 10 * amt); k++) {
      const L = 0.008 + r() * 0.016, m2 = c.seconds(L, sr), b0 = 350 + r() * 750, s = c.osc("sine", (t) => b0 * (1 + 1.6 * t / L), m2, sr);
      for (let i = 0; i < m2; i++) s[i] *= Math.sin(Math.PI * i / m2) ** 2;
      c.mix(dst, s, at + Math.pow(r(), 1.5) * len * 0.85, (0.18 + 0.22 * r()) * amt, sr);
    }
  };
  const bed = c.pink(r, n), bh = c.biquad("hp", 1000, 0.7, sr), bl = c.biquad("lp", 8000, 0.7, sr), ph = r() * 6;
  for (let i = 0; i < n; i++) { const t = i / sr; bed[i] = bl(bh(bed[i])) * (0.85 + 0.15 * Math.sin(t * 2.3 + ph)) * Math.max(0, Math.min(1, t / 0.03, (dur - t) / 0.25)); }
  c.mix(out, bed, 0, 0.18 + 0.12 * rain, sr);
  c.mix(out, c.burst(r, 0.01, "bp", 2200, 3, 0.0004, 0.0025, sr), 0.02, 0.4, sr);
  c.mix(out, c.burst(r, 0.014, "bp", V.latch * 0.8, 2.5, 0.0004, 0.003, sr), 0.06, 0.6, sr);
  c.mix(out, c.burst(r, 0.04, "lp", 350, 0.8, 0.001, 0.01, sr), 0.06, 0.4, sr);
  c.mix(out, c.ring(jit(V.m), 0.1, V.dec * 0.3, sr), 0.061, 0.3, sr);
  if (sq > 0) squish(out, 0.065, 0.06 + 0.1 * sq, 500, 280, 0.6 * sq);
  for (let k = 0; k < V.det; k++) {
    const t = 0.16 + k * (0.09 + 0.04 * r());
    c.mix(out, c.burst(r, 0.02, "lp", 900, 0.9, 0.001, 0.005, sr), t, 0.3, sr);
    c.mix(out, c.ring([[V.low * 3.1, 1], [V.low * 7.3, 0.4]], 0.05, 0.01, sr), t + 0.001, 0.14, sr);
  }
  if (vi === 2) {
    const m = c.seconds(0.22, sr), s = c.osc("saw", (t) => 600 + 90 * Math.sin(t * 23) + 50 * Math.sin(t * 61), m, sr), bp = c.biquad("bp", 1400, 3, sr);
    for (let i = 0; i < m; i++) s[i] = bp(s[i]) * Math.sin(Math.PI * i / m) * (0.6 + 0.4 * Math.sin(i / sr * 140));
    c.mix(out, s, 0.1, 0.2, sr);
  }
  const tO = 0.07, openN = c.seconds(tShut - tO + 0.05, sr), wash = c.pink(r, openN), wh = c.biquad("hp", 1800, 0.7, sr);
  for (let i = 0; i < openN; i++) { const t = i / sr; wash[i] = wh(wash[i]) * Math.min(1, t / 0.15) * Math.max(0, Math.min(1, (tShut - tO - t) / 0.03 + 1)); }
  c.mix(out, wash, tO, 0.2 * rain, sr);
  const drops = Math.round(rain * (tShut - tO) * 300);
  for (let d = 0; d < drops; d++) {
    const t = tO + 0.05 + r() * (tShut - tO - 0.05);
    if (r() < 0.55) c.mix(out, c.burst(r, 0.006, "bp", 2500 + r() * 3500, 5, 0.0003, 0.0015, sr), t, (0.07 + 0.14 * r()) * rain, sr);
    else c.mix(out, c.burst(r, 0.012, "lp", 600 + r() * 400, 0.8, 0.0005, 0.004, sr), t, (0.12 + 0.16 * r()) * rain, sr);
  }
  const wn = c.seconds(swing + 0.01, sr), wz = c.noise(r, wn), wo = c.onepole(sr);
  for (let i = 0; i < wn; i++) { const u = i / wn; wz[i] = wo(wz[i], 200 + (400 + 1500 * f) * u) * u * u; }
  c.mix(out, wz, tShut - swing, 0.2 + 0.35 * f, sr);
  c.mix(hit, c.ring([[V.low, 1], [V.low * 1.5, 0.4]], 0.3, V.dec * (0.8 + 0.6 * f), sr), tShut + 0.002, 0.5 + 0.7 * f, sr);
  c.mix(hit, c.ring(jit(V.m), 0.2, V.dec * (0.4 + 0.4 * f), sr), tShut + 0.001, 0.25 + 0.5 * f, sr);
  c.mix(hit, c.burst(r, 0.09, "lp", 250 + 500 * f, 0.8, 0.001, 0.018 + 0.03 * f, sr), tShut, 0.8 + 0.6 * f, sr);
  c.mix(hit, c.burst(r, 0.015, "bp", V.latch, 3, 0.0004, 0.003, sr), tShut + 0.003, 0.35 + 0.3 * f, sr);
  if (f < 0.4) c.mix(hit, c.burst(r, 0.015, "bp", V.latch * 1.1, 3, 0.0004, 0.003, sr), tShut + 0.03 + 0.02 * r(), 0.3, sr);
  c.mix(hit, c.burst(r, 0.01, "hp", 3000, 0.7, 0.0004, 0.002, sr), tShut, 0.45 * f, sr);
  if (vi === 3) c.mix(hit, c.burst(r, 0.2, "lp", 120, 0.9, 0.002, 0.06, sr), tShut + 0.003, 0.6 * (0.4 + f), sr);
  if (sq > 0) squish(hit, tShut + 0.004, 0.08 + 0.14 * sq, 300, 900 + 600 * sq, 1.3 * sq);
  for (let k = 0; k < Math.round(V.rat * (2 + 8 * f)); k++)
    c.mix(hit, c.burst(r, 0.006, "bp", 1800 + r() * 1700, 4, 0.0004, 0.0015, sr), tShut + 0.03 + Math.pow(r(), 1.3) * 0.15, (0.1 + 0.15 * r()) * (0.3 + f), sr);
  if (p.tail) {
    const echo = Float32Array.from(hit); c.filter(echo, c.biquad("lp", 1800, 0.7, sr));
    c.mix(hit, echo, 0.085 + 0.02 * r(), 0.22, sr); c.mix(hit, echo, 0.19 + 0.03 * r(), 0.09, sr);
    c.reverb(hit, { size: 0.55, decay: 0.45, mixAmt: 0.22 }, sr);
    for (let k = 0; k < Math.round(4 + 10 * f); k++) {
      const L = 0.01 + r() * 0.015, m2 = c.seconds(L, sr), b0 = 1500 + r() * 2000, s = c.osc("sine", (t) => b0 * (1 + 0.8 * t / L), m2, sr);
      for (let i = 0; i < m2; i++) s[i] *= Math.sin(Math.PI * i / m2) * Math.exp(-i / m2 * 3);
      c.mix(hit, s, tShut + 0.06 + -Math.log(1 - r() * 0.95) * 0.16, 0.08 + 0.1 * r(), sr);
    }
  }
  c.mix(out, hit, 0, 1, sr);
  c.finish(out, 0.9, 1.1);
  c.gain(out, 0.7 + 0.3 * f);
  let end = n - 1; while (end > 0 && Math.abs(out[end]) < 0.0009) end--;
  const res = out.slice(0, Math.min(n, end + c.seconds(0.02, sr)));
  c.fade(res, 12, sr);
  return { samples: res };
}
