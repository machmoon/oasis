// Seatbelt buckle: a short tongue slide with ratchet ticks, then a two-part latch (hard click plus a secondary clack snap), a damped body thunk, cloth rustle as separate fabric flutters, and an optional short cabin tail. Click is fixed in time.
export const meta = {
  title: "Buckle Click", kind: "foley", format: "sound", duration: 0.6, price: 2, author: "hollowbody", payout: "hollowbody@creators.oasis.example", kit: "Car Interior", description: "A seatbelt tongue sliding into its buckle and latching with a two-part click, in plastic or metal, for car interiors, driver cutscenes and vehicle UI feedback.",
  tags: ["seatbelt", "buckle", "car", "click", "latch", "foley", "vehicle", "interior"],
};
export const params = { knobs: {
  material: { type: "choice", label: "Buckle material", default: "plastic", options: ["plastic", "metal"] },
  speed: { type: "range", label: "Insertion speed", default: 0.5, min: 0, max: 1, step: 0.01 },
  brightness: { type: "range", label: "Click brightness", default: 0.5, min: 0, max: 1, step: 0.01 },
  rustle: { type: "range", label: "Webbing rustle", default: 0.4, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Cabin tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + (p.material === "metal" ? 97 : 11));
  const metal = p.material === "metal";
  const tClick = 0.2, slide = 0.14 - 0.08 * p.speed, s0 = tClick - slide;
  const total = 0.62, out = new Float32Array(c.seconds(total, sr));
  const amp = 0.75 + 0.25 * p.speed;

  const flut = 3 + Math.round(6 * p.rustle);
  for (let k = 0; k < flut && p.rustle > 0; k++) {
    const t = Math.max(0, s0 - 0.03 - r() * 0.07 + (k % 3) * 0.02);
    c.mix(out, c.burst(r, 0.02 + r() * 0.03, "bp", 900 + r() * 1300, 0.9, 0.006, 0.014, sr), t, 0.12 + 0.35 * p.rustle * (0.5 + 0.5 * r()), sr);
  }
  c.mix(out, c.burst(r, 0.07, "lp", 1800, 0.6, 0.01, 0.03, sr), tClick + 0.04, 0.35 * p.rustle * p.rustle, sr);

  const teeth = 5 + Math.round(4 * (1 - p.speed));
  for (let k = 0; k < teeth; k++) {
    const u = (k + 0.5) / teeth, t = s0 + slide * Math.pow(u, 0.8) + (r() - 0.5) * 0.003;
    c.mix(out, c.burst(r, 0.004, "bp", (metal ? 4600 : 3200) * (0.85 + 0.3 * r()), 3, 0.0003, 0.0012, sr), t, (0.14 + 0.25 * u) * (0.6 + 0.4 * r()) * amp, sr);
  }
  const sc = c.burst(r, slide, "bp", 3500 + 2000 * p.speed + (metal ? 1500 : 0), 1.5, slide * 0.5, slide * 0.4, sr);
  c.mix(out, sc, s0, 0.2, sr);

  const f0 = (metal ? 2300 : 1500) * (0.96 + r() * 0.08);
  const modes = metal
    ? [[f0, 1], [f0 * 1.47, 0.7], [f0 * 2.13, 0.5], [f0 * 3.2, 0.3], [f0 * 4.4, 0.2]].map(([f, a]) => [f * (0.98 + r() * 0.04), a])
    : [[f0, 1], [f0 * 1.63, 0.6], [f0 * 2.7, 0.35]];
  const dec = metal ? 0.03 : 0.009;
  c.mix(out, c.ring(modes, dec * 6, dec, sr), tClick, 0.5 * amp, sr);
  c.mix(out, c.burst(r, 0.01, "hp", 2000 + 6000 * p.brightness, 0.8, 0.0003, 0.002, sr), tClick, (0.3 + 0.7 * p.brightness) * amp, sr);
  c.mix(out, c.ring([[metal ? 380 : 260, 1], [metal ? 690 : 470, 0.4]], 0.08, 0.016, sr), tClick, 0.5 * amp, sr);
  c.mix(out, c.burst(r, 0.015, "lp", 600, 0.8, 0.001, 0.005, sr), tClick, 0.45 * amp, sr);

  const t2 = tClick + 0.028 + 0.012 * r();
  c.mix(out, c.burst(r, 0.006, "hp", 3500 + 4000 * p.brightness, 1.2, 0.0003, 0.0015, sr), t2, 0.35 + 0.3 * p.brightness, sr);
  c.mix(out, c.ring([[f0 * 0.55, 1], [f0 * 1.2, 0.5]], 0.05, metal ? 0.02 : 0.008, sr), t2, 0.3, sr);

  c.filter(out, c.biquad("lp", 5000 + 9000 * p.brightness, 0.7, sr));
  let res = out;
  if (p.tail) {
    const tl = c.reverb(out, { size: 0.3, decay: 0.35, mixAmt: 0.25 }, sr);
    if (tl && tl.length) res = tl;
  }
  res = res.slice(0, Math.min(res.length, c.seconds(tClick + (p.tail ? 0.34 : 0.22), sr)));
  c.fade(res, p.tail ? 90 : 60, sr);
  c.finish(res, 0.85, 1.1);
  return { samples: res };
}
