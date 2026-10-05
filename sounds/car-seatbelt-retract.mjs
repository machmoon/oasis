// Seatbelt retract: buckle release click, then webbing whirring back into the spool (ratchet pawl ticks over a pitched spring-spool whine and a friction rasp that speeds up then slows), ending in a metal end-stop thud and a small plastic rattle.
export const meta = {
  title: "Seatbelt Retract", kind: "foley", format: "sound", duration: 1.6, price: 2, author: "hollowbody", payout: "hollowbody@creators.oasis.example", kit: "Car Interior",
  description: "A seatbelt buckle release followed by the webbing whirring back into its spool and ending in a metal end-stop thud; for car interiors, driver cut-ins and vehicle foley.",
  tags: ["seatbelt", "car", "buckle", "retract", "spool", "webbing", "foley", "interior"],
};
export const params = { knobs: {
  speed: { type: "range", label: "Retract speed", default: 0.5, min: 0, max: 1, step: 0.01 },
  friction: { type: "range", label: "Webbing friction", default: 0.5, min: 0, max: 1, step: 0.01 },
  thud: { type: "range", label: "End-stop thud", default: 0.6, min: 0, max: 1, step: 0.01 },
  pitch: { type: "range", label: "Pitch", default: 0.5, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Cabin tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + 29), TAU = c.TAU;
  const total = c.seconds(1.6, sr), out = new Float32Array(total);
  const rd = (0.9 - 0.45 * p.speed) * (0.92 + 0.16 * r()), t0 = 0.09, tEnd = t0 + rd;
  const pm = Math.pow(2, (p.pitch - 0.5) * 1.6);
  c.mix(out, c.burst(r, 0.012, "hp", 2200, 0.8, 0.0005, 0.004, sr), 0, 0.7, sr);
  c.mix(out, c.ring([[1850 * pm * (0.97 + 0.06 * r()), 1], [3300 * pm, 0.4], [620 * pm, 0.5]], 0.12, 0.025, sr), 0.001, 0.4, sr);
  c.mix(out, c.burst(r, 0.02, "bp", 900, 2, 0.001, 0.007, sr), 0.045, 0.35, sr);
  const n = c.seconds(rd, sr), whine = new Float32Array(n), rasp = c.noise(r, n);
  const bp = c.biquad("bp", 1800 * pm, 1.4, sr), lp = c.onepole(sr);
  let ph = 0, ph2 = 0;
  const base = 260 * pm * (0.94 + 0.12 * r());
  for (let i = 0; i < n; i++) {
    const u = i / n, shape = Math.sin(Math.PI * Math.min(1, u * 1.15)) * (1 - 0.35 * u);
    const f = base * (0.5 + 1.3 * Math.pow(shape, 0.8) * (0.6 + 0.8 * p.speed));
    ph += TAU * f / sr; ph2 += TAU * f * 2.01 / sr;
    const a = Math.min(1, i / (0.02 * sr)) * Math.min(1, (n - i) / (0.03 * sr));
    whine[i] = (Math.sin(ph) * 0.5 + Math.sin(ph2) * 0.22 + Math.sin(ph * 3) * 0.08) * a * (0.3 + 0.7 * shape);
    const stick = 0.55 + 0.45 * Math.sin(i / sr * (90 + 160 * shape) * TAU * 0.5 + r() * 0.2);
    rasp[i] = lp(bp(rasp[i]), 900 + 3500 * shape) * a * (0.3 + 0.7 * shape) * stick * (0.3 + 1.3 * p.friction);
  }
  c.mix(out, whine, t0, 0.32 * (1 - 0.4 * p.friction), sr);
  c.mix(out, rasp, t0, 0.8, sr);
  let t = 0;
  while (t < rd) {
    const u = t / rd, sh = Math.sin(Math.PI * u), rate = 28 + 70 * sh * (0.5 + p.speed);
    c.mix(out, c.burst(r, 0.006, "bp", 2600 * pm * (0.8 + 0.4 * r()), 3, 0.0003, 0.0016, sr), t0 + t, (0.15 + 0.3 * r()) * (0.4 + 0.6 * sh), sr);
    t += (1 / rate) * (0.8 + 0.4 * r());
  }
  const th = p.thud;
  c.mix(out, c.ring([[95 * pm, 1], [190 * pm, 0.35], [310 * pm, 0.2]], 0.22, 0.03 + 0.06 * th, sr), tEnd, 0.12 + 0.6 * th, sr);
  c.mix(out, c.burst(r, 0.015, "lp", 1400, 0.8, 0.0008, 0.005, sr), tEnd, 0.2 + 0.4 * th, sr);
  c.mix(out, c.ring([[1150 * pm, 0.6], [2400 * pm, 0.3], [3700 * pm, 0.15]], 0.15, 0.03, sr), tEnd + 0.002, 0.15 + 0.3 * th, sr);
  for (let k = 0; k < 3; k++) c.mix(out, c.burst(r, 0.008, "bp", 1500 + r() * 1500, 4, 0.0004, 0.002, sr), tEnd + 0.05 + k * (0.035 + r() * 0.03), (0.2 + 0.3 * th) * (1 - 0.3 * k), sr);
  if (p.tail) {
    const tl = c.seconds(0.55, sr), tb = new Float32Array(tl);
    c.mix(tb, c.burst(r, 0.12, "bp", 500, 0.8, 0.002, 0.04, sr), 0, 0.5, sr);
    c.mix(tb, c.ring([[95 * pm, 1], [310 * pm, 0.3]], 0.3, 0.1, sr), 0, 0.5, sr);
    c.reverb(tb, { size: 0.3, decay: 0.35, mixAmt: 0.9 }, sr);
    c.mix(out, tb, tEnd, 0.4, sr);
  }
  const end = Math.min(total, c.seconds(tEnd + (p.tail ? 0.6 : 0.35), sr));
  const res = out.subarray(0, end);
  c.finish(res, 0.85, 1.5);
  c.fade(res, 25, sr);
  return { samples: res.slice() };
}
