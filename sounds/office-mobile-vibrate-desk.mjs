// Phone vibrating on a desk: an eccentric-motor stack (spin-up, spin-down) gated into buzz pulses, a per-revolution contact tick train excited into a surface resonator (dull wood, snappy laminate, ringing metal), random rattle grains, a stick-slip drift scrape, and an optional room tail. The render is sized to its content.
export const meta = {
  title: "Desk Phone Buzz", kind: "sfx", format: "sound", duration: 2.2, price: 2, author: "foleyroom", payout: "foleyroom@creators.oasis.example", kit: "Office", description: "A smartphone vibrating against a desk in pulsed buzzes; surface, pattern rate, rattle, sideways drift and pitch are knobs. Use it for office ambience, a missed call or a tense meeting scene.",
  tags: ["phone", "vibrate", "buzz", "desk", "mobile", "office", "notification", "rattle"],
};
export const params = { knobs: {
  surface: { type: "choice", label: "Surface", default: "wood", options: ["wood", "laminate", "metal"] },
  rate: { type: "range", label: "Buzz pattern rate", default: 0.5, min: 0, max: 1, step: 0.01 },
  rattle: { type: "range", label: "Rattle", default: 0.5, min: 0, max: 1, step: 0.01 },
  drift: { type: "range", label: "Drift slide", default: 0.3, min: 0, max: 1, step: 0.01 },
  pitch: { type: "range", label: "Pitch", default: 0.5, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Room tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + params.knobs.surface.options.indexOf(p.surface) * 97 + 3);
  const S = { wood: { body: [[170, 1], [330, 0.5], [600, 0.25]], dec: 0.05, f: 500, q: 1.5, g: 1.6, hi: 2200 },
    laminate: { body: [[260, 1], [530, 0.6], [1150, 0.4]], dec: 0.035, f: 1500, q: 3, g: 1.2, hi: 4200 },
    metal: { body: [[420, 1], [980, 0.8], [1770, 0.6], [2900, 0.4]], dec: 0.14, f: 2700, q: 14, g: 0.8, hi: 6000 } }[p.surface];
  const f0 = 170 * Math.pow(2, (p.pitch - 0.5) * 1.2);
  const period = 0.55 - 0.35 * p.rate, on = period * 0.62;
  const pulses = Math.max(3, Math.min(6, Math.floor(1.7 / period)));
  const end = 0.1 + pulses * period + 0.1, total = end + (p.tail ? 0.7 : 0.15);
  const n = c.seconds(total, sr), out = new Float32Array(n);
  let t0 = 0.1;
  for (let k = 0; k < pulses; k++) {
    const len = on * (0.92 + r() * 0.16), m = c.seconds(len + 0.2, sr), x = new Float32Array(m), imp = new Float32Array(m);
    const fl = f0 * (0.97 + r() * 0.06); let ph = 0, ph2 = 0, pc = 0;
    for (let i = 0; i < m; i++) {
      const t = i / sr, spin = Math.min(1, t / 0.04), a = Math.min(1, t / 0.01) * (t < len ? 1 : Math.exp(-(t - len) / 0.035));
      const f = fl * (0.65 + 0.35 * spin) * (t > len ? Math.max(0.55, 1 - (t - len) * 3) : 1);
      ph += c.TAU * f / sr; ph2 += c.TAU * f * 2.01 / sr; pc += c.TAU * f / sr;
      x[i] = (Math.sin(ph) + 0.55 * Math.sin(ph2) + 0.35 * Math.sin(ph * 3.02) + 0.2 * Math.sin(ph * 4.97)) * a * (0.85 + 0.15 * Math.sin(t * c.TAU * 29)) * 0.35;
      if (pc >= c.TAU) { pc -= c.TAU; if (r() > p.rattle * 0.2) imp[i] = a * (0.5 + r() * (0.5 + p.rattle)); }
    }
    const bp = c.biquad("bp", S.f * (0.97 + r() * 0.06), S.q, sr), hp = c.biquad("hp", 700, 0.7, sr);
    for (let i = 0; i < m; i++) x[i] += (bp(imp[i]) * 1.2 + hp(imp[i]) * 0.5) * S.g * (0.6 + 0.4 * (p.pitch + 0.5));
    c.mix(out, x, t0, 0.6 * (k === 0 ? 1 : 0.85 + r() * 0.2), sr);
    c.mix(out, c.ring(S.body.map(([f, a]) => [f * (0.99 + r() * 0.02), a]), 0.3, S.dec, sr), t0, 0.35, sr);
    c.mix(out, c.burst(r, 0.01, "bp", S.hi, 2, 0.0004, 0.003, sr), t0, 0.35, sr);
    const rc = Math.round((4 + 40 * p.rattle) * len / 0.3);
    for (let g = 0; g < rc; g++) c.mix(out, c.burst(r, 0.005 + r() * 0.006, "bp", 2800 + r() * 4200, 5, 0.0003, 0.0015 + r() * 0.002, sr), t0 + r() * len, (0.1 + 0.4 * r()) * p.rattle * (0.4 + 0.6 * r()), sr);
    if (p.rattle > 0.3) c.mix(out, c.ring([[1500 + r() * 800, 1], [3300, 0.4]], 0.06, 0.012, sr), t0 + r() * len, 0.25 * p.rattle, sr);
    if (p.drift > 0.02) {
      const dl = c.seconds(len * 0.9, sr), d = c.noise(r, dl), op = c.onepole(sr), hp2 = c.biquad("hp", 300, 0.7, sr); let g = 0;
      for (let i = 0; i < dl; i++) { if (i % 240 === 0) g = r() < 0.3 ? 0.1 : 0.4 + r() * 0.6; d[i] = hp2(op(d[i], 900 + 1800 * (i / dl))) * g * Math.min(1, i / (0.02 * sr)) * Math.min(1, (dl - i) / (0.03 * sr)); }
      c.mix(out, d, t0 + 0.02, 1.8 * p.drift, sr);
    }
    t0 += period * (0.97 + r() * 0.06);
  }
  let res = out;
  if (p.tail) { const rv = c.reverb(out.slice(), { size: 0.4, decay: 0.7, mixAmt: 0.5 }, sr); res = new Float32Array(n); for (let i = 0; i < n; i++) res[i] = out[i] * 0.8 + rv[i] * 0.45; }
  c.filter(res, c.biquad("hp", 60, 0.7, sr));
  c.finish(res, 0.85, 1.1);
  c.fade(res, 30, sr);
  return { samples: res };
}
