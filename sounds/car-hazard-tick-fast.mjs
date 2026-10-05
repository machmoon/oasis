// Hazard tick: doubled-cadence relay ticking inside a car. Each tick is a relay click (mechanical: a hard contact transient, armature ring and a rebound knock; digital: a tight electronic tick) over a dashboard-plastic resonance, alternating tick and tock per beat, sitting on a quiet low cabin hum so the gaps read as a car interior, not dead air. Optional short cabin tail.
export const meta = {
  title: "Hazard Relay Ticks", kind: "sfx", format: "sound", duration: 2, price: 2, author: "hollowbody", payout: "hollowbody@creators.oasis.example", kit: "Car Interior", description: "Fast hazard-light relay ticking heard from inside a car, mechanical or digital, with a dashboard resonance and an optional cabin tail; for hazard warnings, breakdowns and tense driving scenes.",
  tags: ["hazard", "indicator", "tick", "relay", "car", "interior", "dashboard", "warning"],
};
export const params = { knobs: {
  relay: { type: "choice", label: "Relay type", default: "mechanical", options: ["mechanical", "digital"] },
  brightness: { type: "range", label: "Brightness", default: 0.5, min: 0, max: 1, step: 0.01 },
  dashboard: { type: "range", label: "Dashboard resonance", default: 0.4, min: 0.1, max: 1, step: 0.01 },
  rate: { type: "range", label: "Rate (ticks/s)", default: 6, min: 4, max: 10, step: 0.1 },
  tail: { type: "toggle", label: "Cabin tail", default: false },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + (p.relay === "digital" ? 91 : 13));
  const dur = 2, n = c.seconds(dur, sr), out = new Float32Array(n);
  const mech = p.relay === "mechanical", b = p.brightness, d = p.dashboard;
  const period = 1 / p.rate;
  const count = Math.floor((dur - 0.3) / period);
  const bed = c.pink(r, n), blp = c.biquad("lp", 450, 0.7, sr);
  let e = 0;
  for (let i = 0; i < n; i++) { bed[i] = blp(bed[i]); e += bed[i] * bed[i]; }
  c.gain(bed, 0.045 / (Math.sqrt(e / n) + 1e-9));
  c.mix(out, bed, 0, 1, sr);
  for (let k = 0; k < count; k++) {
    const t = 0.03 + k * period + (r() - 0.5) * 0.002;
    const tock = k % 2 === 1;
    const lvl = (tock ? 0.8 : 1) * (0.9 + 0.2 * r());
    const f0 = (tock ? 0.88 : 1) * (0.97 + 0.06 * r());
    const one = c.seconds(0.14, sr), x = new Float32Array(one);
    if (mech) {
      c.mix(x, c.burst(r, 0.008, "hp", 2200 + 4500 * b, 0.9, 0.0004, 0.002, sr), 0, 0.8, sr);
      c.mix(x, c.ring([[2300 * f0, 1], [3650 * f0, 0.6], [5400 * f0, 0.35]], 0.05, 0.008 + 0.006 * (1 - b), sr), 0.0006, 0.5, sr);
      c.mix(x, c.burst(r, 0.006, "bp", 1200 * f0, 2, 0.0008, 0.003, sr), 0.0085, 0.4, sr);
    } else {
      c.mix(x, c.burst(r, 0.004, "hp", 3000 + 4000 * b, 0.8, 0.0003, 0.0012, sr), 0, 0.6, sr);
      c.mix(x, c.ring([[2600 * f0 + 1500 * b, 1], [5200 * f0 + 2000 * b, 0.25]], 0.02, 0.0035, sr), 0.0004, 0.6, sr);
    }
    c.mix(x, c.ring([[420 * f0, 1], [780 * f0, 0.5], [1130 * f0, 0.25]], 0.13, 0.025 + 0.04 * d, sr), 0.001, 0.45 * d, sr);
    c.mix(out, x, t, lvl, sr);
  }
  c.filter(out, c.biquad("lp", 5000 + 9000 * b, 0.7, sr));
  if (p.tail) {
    const wet = c.reverb(out.slice(), { size: 0.3, decay: 0.12, mixAmt: 1 }, sr);
    c.filter(wet, c.biquad("lp", 3500, 0.7, sr));
    c.mix(out, wet, 0, 0.22, sr);
  }
  c.fade(out, 12, sr);
  c.finish(out, 0.85, 1.1);
  return { samples: out };
}
