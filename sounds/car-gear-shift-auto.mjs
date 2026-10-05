// Auto gear selector: a hand walks the lever through up to four detents. Each is a short travel rub, a crisp latch click (lever-specific ring modes + contact tick), and a lower, quieter transmission thump that decays fully before the next. Timing and weight follow a hesitant human gesture.
export const meta = {
  title: "Auto Gear Selector", kind: "foley", format: "sound", duration: 2.2, price: 2, author: "hollowbody", payout: "hollowbody@creators.oasis.example", kit: "Car Interior", description: "An automatic selector moved through P-R-N-D detents with latch click, travel rub and transmission thump; for car interiors, driving games and film cockpit inserts.",
  tags: ["car", "gear", "shift", "selector", "detent", "automatic", "interior", "foley"],
};
export const params = { knobs: {
  lever: { type: "choice", label: "Lever type", default: "console", options: ["stalk", "console", "rotary"] },
  detent: { type: "range", label: "Detent click", default: 0.6, min: 0, max: 1, step: 0.01 },
  smooth: { type: "range", label: "Travel smoothness", default: 0.5, min: 0, max: 1, step: 0.01 },
  clunk: { type: "range", label: "Transmission clunk", default: 0.4, min: 0, max: 1, step: 0.01 },
  gears: { type: "range", label: "Detents passed", default: 4, min: 1, max: 4, step: 1 },
  tail: { type: "toggle", label: "Cabin tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + params.knobs.lever.options.indexOf(p.lever) * 97 + 11);
  const L = {
    stalk: { m: [[2900, 1], [4300, 0.6], [6100, 0.3]], d: 0.006, hp: 4500, cf: 95, cg: 0.5, rub: 3600, rg: 0.5, micro: 0, pace: 0.36 },
    console: { m: [[950, 1], [1900, 0.6], [3300, 0.3]], d: 0.014, hp: 2400, cf: 62, cg: 1, rub: 1700, rg: 1, micro: 0, pace: 0.46 },
    rotary: { m: [[3700, 1], [5300, 0.5]], d: 0.004, hp: 5500, cf: 115, cg: 0.35, rub: 5200, rg: 0.25, micro: 4, pace: 0.28 },
  }[p.lever];
  const N = Math.round(p.gears), times = [], wts = [];
  let t = 0.06;
  for (let k = 0; k < N; k++) {
    times.push(t); wts.push(0.75 + 0.35 * r() + (k === N - 1 ? 0.15 : 0));
    t += L.pace * (0.8 + 0.6 * r()) + (r() < 0.3 ? 0.14 * r() + 0.06 : 0);
  }
  const out = new Float32Array(c.seconds(times[N - 1] + (p.tail ? 0.85 : 0.5), sr));
  const sm = p.smooth, a = 0.3 + 0.7 * p.detent;
  for (let k = 0; k < N; k++) {
    const T = times[k], w = wts[k], tr = 0.04 + 0.07 * sm;
    const n = c.seconds(tr, sr), x = c.noise(r, n), bp = c.biquad("bp", L.rub * (0.8 + 0.3 * sm), 1.1, sr);
    let g = 1;
    for (let i = 0; i < n; i++) {
      if (i % 40 === 0) g = 1 - (1 - sm) * 0.85 * r();
      const u = i / n;
      x[i] = bp(x[i]) * g * Math.pow(u, 1.5) * Math.min(1, i / (0.008 * sr));
    }
    c.mix(out, x, T - tr, (0.1 + 0.12 * sm) * L.rg * w, sr);
    for (let j = 0; j < L.micro; j++) c.mix(out, c.burst(r, 0.004, "hp", 5000, 0.8, 0.0003, 0.0015, sr), T - tr * (j + 1) / (L.micro + 1), 0.3 * w * (0.7 + 0.5 * r()), sr);
    const modes = L.m.map(([f, am]) => [f * (0.985 + r() * 0.03), am]);
    c.mix(out, c.ring(modes, L.d * 6, L.d * (0.7 + 0.6 * p.detent), sr), T, 0.7 * a * w, sr);
    c.mix(out, c.burst(r, 0.005, "hp", L.hp * (0.8 + 0.5 * p.detent), 0.8, 0.0004, 0.0018, sr), T - 0.0005, 0.8 * a * w * (0.85 + 0.3 * r()), sr);
    const f = L.cf * (0.9 + 0.2 * r()), Tc = T + 0.06 + 0.03 * r(), cl = p.clunk * L.cg * w;
    const m = c.seconds(0.16, sr), th = c.osc("sine", (s) => f * (1 + 0.5 * Math.exp(-s * 50)), m, sr), e = c.env(m, 0.003, 0.04, sr);
    for (let i = 0; i < m; i++) th[i] *= e[i];
    c.mix(out, th, Tc, 0.55 * cl, sr);
    c.mix(out, c.burst(r, 0.03, "lp", 400, 0.8, 0.002, 0.01, sr), Tc, 0.3 * cl, sr);
  }
  if (p.tail) {
    const wet = c.reverb(out.slice(), { size: 0.25, decay: 0.3, mixAmt: 1 }, sr);
    for (let i = 0; i < out.length; i++) out[i] += wet[i] * 0.35;
  }
  c.fade(out, 20, sr);
  c.finish(out, 0.85, 1.1);
  c.fade(out, 20, sr);
  return { samples: out };
}
