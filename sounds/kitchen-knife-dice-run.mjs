// Knife dice run: chained chops, each a pre-contact ingredient crunch or squelch, a steel click, a damped wood or plastic board knock, a short blade ring and diced pieces tipping over; hand-lift swishes fill the gaps, with an optional set-down and room tail.
export const meta = {
  title: "Dicing Run", kind: "foley", format: "sound", duration: 2, price: 3, author: "foleyroom", payout: "foleyroom@creators.oasis.example", kit: "Kitchen", description: "A rapid run of knife strikes dicing on a cutting board. Board, chop rate, looseness, ingredient wetness and run length are knobs, and every seed is a new take for kitchen scenes and cooking games.",
  tags: ["knife", "chop", "dice", "kitchen", "cutting-board", "foley", "cooking", "vegetables"],
};
export const params = { knobs: {
  board: { type: "choice", label: "Board", default: "wood", options: ["wood", "plastic"] },
  rate: { type: "range", label: "Chop rate (Hz)", default: 6, min: 2, max: 10, step: 0.1 },
  looseness: { type: "range", label: "Timing looseness", default: 0.3, min: 0, max: 1, step: 0.01 },
  wetness: { type: "range", label: "Ingredient wetness", default: 0.3, min: 0, max: 1, step: 0.01 },
  length: { type: "range", label: "Run length (s)", default: 1.6, min: 0.5, max: 3.1, step: 0.1 },
  tail: { type: "toggle", label: "Set-down + room", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, wood = p.board === "wood", r = c.rng(p.seed * 6151 + (wood ? 13 : 97));
  const wet = p.wetness, loose = p.looseness, period = 1 / p.rate, heavy = (10 - p.rate) / 8;
  const N = Math.max(3, Math.round(Math.min(3.1, p.length) * p.rate)), times = []; let t = 0.04;
  for (let k = 0; k < N && t <= 3.1; k++) {
    times.push(t);
    let iv = period * (1 + (r() - 0.5) * (0.08 + 0.8 * loose));
    if (r() < 0.12 * loose) iv *= 1.4 + 0.5 * r();
    t += Math.max(period * 0.55, iv);
  }
  const last = times[times.length - 1], td = last + 0.12 + 0.05 * r();
  const n = c.seconds(Math.min(3.85, last + 0.25 + (p.tail ? 0.45 : 0)), sr), out = new Float32Array(n);
  const strike = (ts, a, soft) => {
    const pre = 0.012 + 0.02 * r(), grains = Math.round(3 + 9 * (1 - wet));
    for (let g = 0; g < grains; g++) {
      const x = r();
      c.mix(out, c.burst(r, 0.004 + 0.004 * r(), "bp", 1600 + r() * 4800, 1.4 + r() * 1.5, 0.0004, 0.0012 + r() * 0.0015, sr), Math.max(0, ts - pre * (1 - x)), a * (0.12 + 0.3 * x) * (1 - 0.7 * wet), sr);
    }
    if (wet > 0.02) {
      c.mix(out, c.burst(r, 0.04, "bp", 500 + r() * 800, 1.1 + r(), 0.003, 0.012 + 0.01 * r(), sr), Math.max(0, ts - 0.014), a * 0.55 * wet, sr);
      for (let g = 0; g < 3; g++) c.mix(out, c.burst(r, 0.006, "bp", 2500 + r() * 3500, 3, 0.0005, 0.002, sr), ts + 0.003 + r() * 0.03, a * 0.15 * wet * r(), sr);
    }
    c.mix(out, c.burst(r, 0.006, "hp", wood ? 2400 + r() * 800 : 4200 + r() * 1200, 0.7, 0.0004, wood ? 0.0018 : 0.001, sr), ts, a * (wood ? 0.7 : 0.85) * (1 - 0.4 * wet) * soft, sr);
    const f = wood ? (150 + r() * 70) * (1 - 0.15 * heavy) : (500 + r() * 160) * (1 - 0.1 * heavy);
    const modes = wood ? [[f, 1], [f * (2.2 + 0.2 * r()), 0.5], [f * (3.7 + 0.4 * r()), 0.25], [f * (5.4 + 0.5 * r()), 0.12]]
      : [[f, 1], [f * (1.68 + 0.1 * r()), 0.65], [f * (2.85 + 0.2 * r()), 0.4], [f * (4.3 + 0.3 * r()), 0.22]];
    const dec = (wood ? 0.022 : 0.011) * (1 - 0.5 * wet) * (1 + 0.6 * heavy);
    c.mix(out, c.ring(modes, dec * 7, dec, sr), ts + 0.0008, a * (wood ? 0.55 : 0.45) * (0.8 + 0.4 * heavy) * soft, sr);
    c.mix(out, c.burst(r, 0.02, "lp", wood ? 320 : 950, 0.8, 0.0008, wood ? 0.007 : 0.004, sr), ts, a * (wood ? 0.45 : 0.3) * (0.7 + 0.5 * heavy), sr);
    c.mix(out, c.ring([[3000 + r() * 900, 1], [6800 + r() * 1400, 0.4]], 0.025, 0.003 + 0.002 * r(), sr), ts + 0.0005, a * 0.06 * soft, sr);
    const bits = Math.round((2 + 4 * r()) * (1 - 0.6 * wet) * (0.6 + 0.6 * heavy)), lim = Math.min(0.2, period * 0.8);
    for (let b = 0; b < bits; b++) {
      const bt = Math.min(lim, 0.015 - Math.log(1 - r() * 0.95) * 0.03 * (0.5 + heavy));
      c.mix(out, c.burst(r, 0.005, "bp", (wood ? 1200 : 2000) + r() * 4000, 2 + 2 * r(), 0.0004, 0.001 + 0.0015 * r(), sr), ts + bt, a * 0.13 * (0.4 + 0.6 * r()) * (1 - 0.5 * wet), sr);
    }
  };
  for (let k = 0; k < times.length; k++) {
    const accent = k === 0 ? 1 : 0.7 + 0.3 * r(), soft = r() < 0.15 ? 0.6 : 1;
    strike(times[k], accent * soft, soft);
  }
  const mv = c.pink(r, n), op = c.onepole(sr), hp = c.biquad("hp", 150, 0.7, sr), ev = new Float32Array(n), cut = new Float32Array(n);
  for (let k = 0; k < times.length; k++) {
    const endT = k + 1 < times.length ? times[k + 1] : (p.tail ? td : -1);
    if (endT < 0) break;
    const s = c.seconds(times[k] + 0.015, sr), e = Math.min(n, c.seconds(endT - 0.005, sr)), h = 0.6 + 0.4 * r();
    for (let i = s; i < e; i++) { const x = Math.sin(Math.PI * (i - s) / (e - s)); ev[i] = x * x * h; cut[i] = 300 + 1500 * x; }
  }
  for (let i = 0; i < n; i++) mv[i] = hp(op(mv[i], cut[i] || 300)) * ev[i];
  c.mix(out, mv, 0, 0.05 + 0.07 * heavy, sr);
  if (p.tail) {
    c.mix(out, c.burst(r, 0.006, "hp", 3500, 0.7, 0.0005, 0.0012, sr), td, 0.4, sr);
    c.mix(out, c.ring([[2300 + r() * 400, 1], [5200 + r() * 600, 0.5], [8100 + r() * 700, 0.25]], 0.15, 0.022, sr), td + 0.001, 0.22, sr);
    c.mix(out, c.ring(wood ? [[190, 1], [440, 0.4]] : [[580, 1], [990, 0.5]], 0.1, wood ? 0.02 : 0.011, sr), td + 0.001, 0.35, sr);
    c.mix(out, c.burst(r, 0.006, "hp", 3800, 0.7, 0.0005, 0.001, sr), td + 0.035 + 0.02 * r(), 0.18, sr);
    c.reverb(out, { size: 0.35, decay: 0.45, mixAmt: 0.22 }, sr);
  }
  const res = out.length > n ? out.subarray(0, n) : out;
  c.finish(res, 0.9, 1.1);
  c.fade(res, 8, sr);
  return { samples: res };
}
