// Docking clamp: a metal-on-metal clamp strike (pitched-down thump, contact crack, detuned hull modes), then a servo glide into a bolt latch, a falling-pitch hydraulic vent and an optional hull tail.
export const meta = {
  title: "Clamp Lock Clunk", kind: "impact", format: "sound", duration: 1.2, price: 3, author: "quietmachine", payout: "quietmachine@creators.oasis.example", kit: "Sci-fi Console", description: "A heavy docking clamp slamming shut, servo-driving into a latched lock and venting hydraulic pressure; for ship docking, airlocks and station sequences.",
  tags: ["docking", "clamp", "servo", "hydraulic", "sci-fi", "metal", "impact", "lock"],
};
export const params = { knobs: {
  size: { type: "choice", label: "Size", default: "medium", options: ["small", "medium", "massive"] },
  weight: { type: "range", label: "Weight", default: 0.6, min: 0, max: 1, step: 0.01 },
  hiss: { type: "range", label: "Hydraulic hiss", default: 0.5, min: 0, max: 1, step: 0.01 },
  resonance: { type: "range", label: "Resonance", default: 0.5, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Hull tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, si = Math.max(0, params.knobs.size.options.indexOf(p.size));
  const r = c.rng(p.seed * 4421 + si * 97 + 3);
  const S = [
    { f: 150, mode: 640, servo: 820, k: 0.7, rs: 0.35, hf: 5600, thump: 0.05, latch: 2400, lg: 0.22 },
    { f: 86, mode: 360, servo: 520, k: 1, rs: 0.6, hf: 4000, thump: 0.09, latch: 1600, lg: 0.3 },
    { f: 44, mode: 170, servo: 280, k: 1.4, rs: 0.9, hf: 2600, thump: 0.16, latch: 950, lg: 0.38 },
  ][si];
  const w = p.weight, res = p.resonance, hs = p.hiss, k = S.k;
  const ts = (0.07 + 0.03 * r()) * k, g = (0.2 + 0.08 * r()) * k, tl = ts + g, t2 = tl + (0.03 + 0.012 * r()) * k;
  const ringDecay = (0.05 + 0.28 * res) * (0.5 + S.rs) * (p.tail ? 1 : 0.6), ringLen = ringDecay * 4.5 + 0.03;
  const th0 = t2 + 0.015, hl = (0.25 + 0.35 * hs) * k + 0.1;
  const dryEnd = Math.max(t2 + 0.22, hs > 0 ? th0 + hl : 0, ringLen, S.thump * (1.5 + 2 * w) + 0.05);
  const tailT = p.tail ? 0.2 + 0.45 * S.rs * (0.5 + 0.5 * res) : 0.03;
  const n = c.seconds(dryEnd + tailT, sr);
  let out = new Float32Array(n);
  const f0 = S.f * (1 - 0.3 * w) * (0.97 + 0.06 * r());
  const tn = c.seconds(S.thump * (1.5 + 2 * w) + 0.05, sr);
  const th = c.osc("sine", (t) => f0 * (1 + 1.8 * Math.exp(-t / 0.018)), tn, sr);
  c.multiply(th, c.env(tn, 0.0015, S.thump * (0.5 + 0.9 * w), sr));
  c.mix(out, c.fade(th, 5, sr), 0, 0.55 + 0.65 * w, sr);
  c.mix(out, c.burst(r, 0.05, "lp", S.hf * (1.2 - 0.5 * w), 0.8, 0.0008, 0.006 + 0.012 * w, sr), 0, 0.7, sr);
  c.mix(out, c.burst(r, 0.03, "bp", S.mode * 3.1, 3, 0.0005, 0.008, sr), 0.001, 0.45, sr);
  const ratios = [1, 1.47, 2.09, 2.76, 3.91, 5.13], modes = [], hiModes = [];
  for (let m = 0; m < ratios.length; m++) {
    const f = S.mode * ratios[m] * (0.98 + 0.04 * r()), a = (1 / (1 + m * 0.55)) * (0.6 + 0.4 * r()), d = 1.0015 + 0.004 * r();
    (m < 3 ? modes : hiModes).push([f, a], [f * d, a * (0.5 + 0.4 * r())]);
  }
  c.mix(out, c.fade(c.ring(modes, ringLen, ringDecay, sr, 1), 10, sr), 0.001, 0.12 + 0.4 * res, sr);
  c.mix(out, c.fade(c.ring(hiModes, ringDecay * 2 + 0.03, ringDecay * 0.4, sr, 1), 8, sr), 0.001, 0.08 + 0.25 * res, sr);
  const gn = c.seconds(g, sr), wob = 5 + 6 * r(), ph = r() * c.TAU, rise = 0.55 + 0.25 * r();
  const sv = c.osc("saw", (t) => {
    const x = Math.min(1, t / g), s = x * x * (3 - 2 * x);
    return S.servo * (1 + rise * s + 0.03 * Math.sin(c.TAU * wob * t + ph) * (1 - x));
  }, gn, sr);
  const slp = c.biquad("lp", S.servo * 3, 0.9, sr), shp = c.biquad("hp", S.servo * 0.6, 0.7, sr);
  for (let i = 0; i < gn; i++) {
    const t = i / sr, a = Math.min(1, t / (0.35 * g)), cut = Math.min(1, (g - t) / 0.006, t / 0.004);
    sv[i] = shp(slp(sv[i])) * (0.45 + 0.55 * a) * cut;
  }
  c.mix(out, sv, ts, 0.38, sr);
  const latchModes = [[S.latch, 1], [S.latch * 1.004, 0.6], [S.latch * 2.63, 0.4], [S.latch * 2.645, 0.25]];
  c.mix(out, c.burst(r, 0.02, "hp", S.latch * 1.5, 0.8, 0.0005, 0.003, sr), tl, 0.4 * S.lg / 0.3, sr);
  c.mix(out, c.fade(c.ring(latchModes, 0.12, 0.02 + 0.025 * res, sr, 1), 5, sr), tl + 0.0005, S.lg, sr);
  c.mix(out, c.burst(r, 0.015, "hp", S.latch * 1.2, 0.8, 0.0005, 0.0025, sr), t2, 0.3, sr);
  c.mix(out, c.fade(c.ring([[f0 * 1.6, 1], [f0 * 2.5, 0.4]], 0.15, 0.03 + 0.04 * w, sr), 6, sr), t2, (0.3 + 0.3 * w) * S.lg / 0.3, sr);
  if (hs > 0) {
    const hn = c.seconds(hl, sr), x = c.noise(r, hn), lp = c.onepole(sr), hp = c.biquad("hp", 1300 - 250 * si, 0.7, sr);
    const tau = hl * 0.3; let fl = 1;
    for (let i = 0; i < hn; i++) {
      const t = i / sr, u = t / hl;
      if (i % 160 === 0) fl = 0.65 + 0.35 * r();
      const e = Math.min(1, t / 0.008) * Math.exp(-t / tau) * Math.min(1, (hl - t) / 0.02);
      x[i] = hp(lp(x[i], S.hf * (1.7 - 1.2 * u))) * e * fl;
    }
    c.mix(out, x, th0, 0.55 * hs, sr);
  }
  if (p.tail) {
    const rv = c.reverb(out, { size: 0.4 + 0.4 * S.rs, decay: 0.35 + 0.35 * res, mixAmt: 0.14 - 0.05 * res }, sr);
    if (rv instanceof Float32Array && rv.length === n) out = rv;
  }
  c.finish(out, 0.9, 1.15);
  c.fade(out, p.tail ? 40 : 25, sr);
  return { samples: out };
}
