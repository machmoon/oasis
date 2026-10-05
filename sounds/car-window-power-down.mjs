// Power window down: relay click, a clean harmonic motor whine that spins up, steadies, sags and lugs to a stop, a gliding stick-slip seal squeal, a wind rush that opens as the glass drops, a spin-down, and an optional end-stop thunk. File length follows the travel.
export const meta = {
  title: "Power Window Down", kind: "foley", format: "sound", duration: 2, price: 3, author: "hollowbody", payout: "hollowbody@creators.oasis.example", kit: "Car Interior", description: "A car power window lowering: relay click, motor whine under strain, squealing rubber seal on glass and wind rushing in as the gap opens, ending in an optional end-stop thunk for car-interior games and films.",
  tags: ["car", "window", "power window", "motor", "squeal", "wind", "interior", "foley"],
};
export const params = { knobs: {
  strain: { type: "range", label: "Motor strain", default: 0.4, min: 0, max: 1, step: 0.01 },
  squeal: { type: "range", label: "Seal squeal", default: 0.5, min: 0, max: 1, step: 0.01 },
  wind: { type: "range", label: "Outside wind", default: 0.4, min: 0, max: 1, step: 0.01 },
  speed: { type: "range", label: "Travel speed", default: 1, min: 0.6, max: 1.6, step: 0.05 },
  thunk: { type: "toggle", label: "End-stop thunk", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + 29), t0 = 0.06, travel = 1.7 / p.speed, tn = c.seconds(travel, sr);
  const spinD = 0.3, tail = p.thunk ? 0.5 : 0.1;
  const out = new Float32Array(c.seconds(t0 + travel + spinD + tail, sr));
  const env = (i, a, d) => Math.max(0, Math.min(1, i / (a * sr), (tn - i) / (d * sr)));
  const f0 = (190 + 70 * p.speed) * c.between(r, 0.93, 1.07), d1 = r() * 6, d2 = r() * 6;
  const mn = tn + c.seconds(spinD, sr), motor = new Float32Array(mn);
  let ph = 0, ph2 = 0;
  for (let i = 0; i < mn; i++) {
    const ts = i / sr, t = Math.min(1, i / tn), after = Math.max(0, (i - tn) / (spinD * sr));
    const spin = Math.min(1, ts / 0.1), spinF = 0.4 + 0.6 * (1 - (1 - spin) * (1 - spin));
    const lug = Math.max(0, (t - 0.9) / 0.1);
    const f = f0 * spinF * (1 - 0.15 * p.strain * Math.sin(Math.PI * t) - 0.1 * p.strain * t - (0.1 + 0.25 * p.strain) * lug) * (1 + 0.01 * Math.sin(ts * 5 + d1) + 0.006 * Math.sin(ts * 13 + d2)) * (1 - 0.7 * after * after);
    ph += c.TAU * f / sr; ph2 += c.TAU * 16 * p.speed / sr;
    const tone = Math.sin(ph) + 0.55 * Math.sin(2 * ph) + 0.4 * Math.sin(3 * ph) + 0.25 * Math.sin(4 * ph) + (0.1 + 0.6 * p.strain) * Math.sin(6 * ph) + 0.5 * p.strain * Math.sin(9 * ph);
    const a = i < tn ? Math.min(1, ts / 0.025) : 1 - after;
    motor[i] = tone * (0.85 + 0.15 * Math.sin(ph2)) * (1 + 0.3 * p.strain * lug) * a * (i < tn ? 1 : 1 - after);
  }
  c.filter(motor, c.biquad("lp", 3200 + 2500 * p.strain, 0.9, sr));
  c.mix(out, motor, t0, 0.3 + 0.12 * p.strain, sr);
  const rum = c.brown(r, tn), rl = c.biquad("lp", 130, 0.8, sr);
  for (let i = 0; i < tn; i++) rum[i] = rl(rum[i]) * env(i, 0.03, 0.05);
  c.mix(out, rum, t0, 0.8, sr);
  c.mix(out, c.burst(r, 0.015, "bp", 2200, 1.5, 0.0005, 0.004, sr), 0, 0.7, sr);
  c.mix(out, c.ring([[310, 1], [820, 0.5]], 0.05, 0.012, sr), 0.001, 0.4, sr);
  const sq = new Float32Array(tn), sp = 2300 + 900 * r();
  let sph = 0, g = 0, tgt = 0, hold = 0, fm = sp, ft = sp;
  for (let i = 0; i < tn; i++) {
    const ts = i / sr;
    if (hold-- <= 0) { hold = c.seconds(0.1 + r() * 0.25, sr); tgt = r() < 0.8 ? 0.6 + 0.4 * r() : 0.15; ft = sp * (0.8 + 0.5 * r() - 0.15 * i / tn); }
    g += (tgt - g) * 0.002; fm += (ft - fm) * 0.0012;
    sph += c.TAU * fm * (1 + 0.02 * Math.sin(ts * 38)) / sr;
    const stick = 0.5 + 0.5 * Math.sin(ts * 60 * p.speed + 2 * Math.sin(ts * 7));
    sq[i] = (Math.sin(sph) + 0.4 * Math.sin(2.01 * sph + 1) + 0.15 * Math.sin(3.02 * sph)) * g * (0.5 + 0.5 * stick) * env(i, 0.05, 0.08);
  }
  c.mix(out, sq, t0, 1.4 * p.squeal * p.squeal + 0.7 * p.squeal, sr);
  const wn = c.pink(r, tn), hp = c.biquad("hp", 400, 0.7, sr), lpf = c.onepole(sr), g1 = r() * 6, g2 = r() * 6;
  for (let i = 0; i < tn; i++) {
    const t = i / tn, ts = i / sr, open = 0.25 + 0.75 * t;
    const gust = 0.7 + 0.3 * Math.sin(ts * 4.1 + g1) * Math.sin(ts * 1.7 + g2);
    wn[i] = lpf(hp(wn[i]), 700 + 2800 * open * (0.3 + 0.7 * p.wind)) * open * gust * env(i, 0.06, 0.1);
  }
  c.mix(out, wn, t0, 1.8 * p.wind, sr);
  if (p.thunk) {
    const te = t0 + travel - 0.02;
    c.mix(out, c.ring([[58, 1], [116, 0.55], [205, 0.3]], 0.45, 0.13, sr), te, 1.6, sr);
    c.mix(out, c.burst(r, 0.025, "lp", 1600, 0.8, 0.001, 0.008, sr), te, 0.7, sr);
    c.mix(out, c.ring([[420 * (0.95 + 0.1 * r()), 0.6], [910, 0.3], [1350, 0.15]], 0.25, 0.05, sr), te + 0.004, 0.4, sr);
  }
  c.reverb(out, { size: 0.12, decay: 0.15, mixAmt: 0.08 }, sr);
  c.fade(out, 25, sr);
  c.finish(out, 0.85, 1.1);
  return { samples: out };
}
