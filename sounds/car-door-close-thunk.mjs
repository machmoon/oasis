// Car door close: a panel thump with a sub weight, a latch click pair, a seal suction puff and a cabin tail, all scaled by door size.
export const meta = {
  title: "Door Seal Thunk", kind: "foley", format: "sound", duration: 0.8, price: 3, author: "hollowbody", payout: "hollowbody@creators.oasis.example", kit: "Car Interior",
  description: "A driver door shutting with a solid seal thunk: door size, force, seal suction, latch click and a cabin tail are knobs; every seed is a different slam.",
  tags: ["car", "door", "thunk", "latch", "interior", "vehicle", "foley", "close"],
};
export const params = { knobs: {
  size: { type: "choice", label: "Door size", default: "sedan", options: ["compact", "sedan", "SUV"] },
  force: { type: "range", label: "Force", default: 0.5, min: 0, max: 1, step: 0.01 },
  suction: { type: "range", label: "Seal suction", default: 0.5, min: 0, max: 1, step: 0.01 },
  latch: { type: "range", label: "Latch click", default: 0.5, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Cabin tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, i = params.knobs.size.options.indexOf(p.size), r = c.rng(p.seed * 613 + i * 97 + 11);
  const m = [1.3, 1, 0.72][i], len = [0.25, 0.38, 0.55][i], f = p.force, k = 0.35 + 0.65 * f;
  const total = len + (p.tail ? 0.4 : 0.12), out = new Float32Array(c.seconds(total + 0.1, sr));
  const base = 76 * m * (0.97 + r() * 0.06), dk = 0.04 + 0.05 * (1.3 - m) * 2 + 0.03 * f;
  c.mix(out, c.ring([[base, 1], [base * 1.9, 0.5], [base * 3.1, 0.3], [base * 4.7, 0.15]].map(([h, a]) => [h * (0.99 + r() * 0.02), a]), len, dk, sr), 0.004, 0.9 * k, sr);
  const sub = c.osc("sine", (t) => base * 0.62 * (1 + 0.5 * Math.exp(-t / 0.03)), c.seconds(len, sr), sr), se = c.env(sub.length, 0.004, dk * 1.3, sr);
  c.mix(out, c.multiply(sub, se), 0.003, (0.35 + 0.5 * (1.3 - m)) * k, sr);
  c.mix(out, c.burst(r, 0.05, "lp", 260 * m + 200 * f, 0.8, 0.002, 0.015, sr), 0.002, 0.6 * k, sr);
  const panel = [[480 * m, 0.5], [850 * m, 0.35], [1400 * m, 0.2]].map(([h, a]) => [h * (0.98 + r() * 0.04), a]);
  c.mix(out, c.ring(panel, 0.1 + 0.1 * (1.3 - m), 0.018 + 0.015 * i, sr), 0.003, 0.22 * k, sr);
  const lt = 0.014 + r() * 0.004, lf = 0.85 + 0.15 * m;
  c.mix(out, c.ring([[2100 * lf, 1], [3400 * lf, 0.6], [5200 * lf, 0.3]], 0.05, 0.007, sr), lt, 0.7 * p.latch, sr);
  c.mix(out, c.burst(r, 0.008, "hp", 2500, 0.9, 0.0003, 0.002, sr), lt, 0.5 * p.latch, sr);
  c.mix(out, c.ring([[1500 * lf, 0.8], [2800 * lf, 0.4]], 0.04, 0.008, sr), lt + 0.035 + r() * 0.01, 0.3 * p.latch, sr);
  const sn = c.seconds(0.12 + 0.1 * p.suction, sr), s = c.noise(r, sn), lp = c.biquad("lp", (450 + 500 * p.suction) * m, 0.8, sr);
  for (let j = 0; j < sn; j++) { const t = j / sr; s[j] = lp(s[j]) * Math.min(1, t / 0.006) * Math.exp(-t / (0.03 + 0.04 * p.suction)); }
  c.mix(out, s, 0.006, 1.1 * p.suction * (0.5 + 0.5 * f), sr);
  const hn = c.seconds(0.1, sr), h = c.noise(r, hn), bp = c.biquad("bp", 1000 * m, 1.2, sr);
  for (let j = 0; j < hn; j++) h[j] = bp(h[j]) * Math.min(1, j / (0.004 * sr)) * Math.exp(-j / sr / 0.025);
  c.mix(out, h, 0.03, 0.35 * p.suction, sr);
  let res = out;
  if (p.tail) {
    const tn = c.seconds(0.4, sr), t = c.noise(r, tn), tl = c.biquad("lp", 800 * m, 0.7, sr);
    for (let j = 0; j < tn; j++) t[j] = tl(t[j]) * Math.min(1, j / (0.01 * sr)) * Math.exp(-j / sr / 0.12);
    c.mix(out, t, 0.01, 0.2 * k, sr);
    const rv = c.reverb(out.slice(), { size: 0.25, decay: 0.3, mixAmt: 0.5 }, sr);
    res = new Float32Array(out.length);
    for (let j = 0; j < res.length; j++) res[j] = rv[j] || 0;
  }
  res = res.slice(0, c.seconds(total, sr));
  c.finish(res, 0.9, 1.2);
  c.gain(res, 0.75 + 0.25 * f);
  c.fade(res, 30, sr);
  return { samples: res };
}
