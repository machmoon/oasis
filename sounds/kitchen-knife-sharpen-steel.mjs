// Knife on steel: a blade drawn along a honing rod, ceramic rod or whetstone. Each stroke layers a contact tick, a narrow swept friction band tracking the contact point heel-to-tip, stick-slip grit grains and a short inharmonic blade "shing", with an optional kitchen tail.
export const meta = {
  title: "Edge on Steel", kind: "foley", format: "sound", duration: 1.5, price: 2, author: "foleyroom", payout: "foleyroom@creators.oasis.example", kit: "Kitchen", description: "A chef's knife drawn across a honing rod, ceramic rod or whetstone; speed, pressure, blade ring and stroke count are knobs, and every seed is a different set of strokes.",
  tags: ["knife", "sharpen", "honing", "steel", "kitchen", "scrape", "blade", "foley"],
};
export const params = { knobs: {
  steel: { type: "choice", label: "Steel type", default: "honing rod", options: ["honing rod", "ceramic", "whetstone"] },
  rate: { type: "range", label: "Stroke speed", default: 1, min: 0.5, max: 2, step: 0.05 },
  pressure: { type: "range", label: "Pressure", default: 0.5, min: 0, max: 1, step: 0.01 },
  ring: { type: "range", label: "Metallic ring", default: 0.5, min: 0, max: 1, step: 0.01 },
  strokes: { type: "range", label: "Stroke count", default: 3, min: 1, max: 6, step: 1 },
  tail: { type: "toggle", label: "Kitchen tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
const M = {
  "honing rod": { base: 0.3, gap: 0.12, f: [2400, 7000], grit: 140, gq: 5, grainG: 0.35, noiseG: 0.5, chat: 60, chatDepth: 0.3, ringF: 2300, ringAmp: 1, ringDec: 1, tick: 3500, wet: 0 },
  ceramic: { base: 0.36, gap: 0.12, f: [4200, 9500], grit: 220, gq: 1.5, grainG: 0.18, noiseG: 0.65, chat: 25, chatDepth: 0.15, ringF: 2700, ringAmp: 0.55, ringDec: 0.6, tick: 5000, wet: 0 },
  whetstone: { base: 0.55, gap: 0.04, f: [1500, 5000], grit: 320, gq: 1.2, grainG: 0.45, noiseG: 0.75, chat: 140, chatDepth: 0.7, ringF: 1900, ringAmp: 0.25, ringDec: 0.4, tick: 2200, wet: 1 },
};
export function build(p, c) {
  const sr = c.sr, idx = params.knobs.steel.options.indexOf(p.steel);
  const r = c.rng(p.seed * 7919 + idx * 131 + 3), m = M[p.steel] || M["honing rod"];
  const P = p.pressure, R = p.ring, rate = p.rate, ny = 0.45 * sr, N = Math.max(1, Math.round(p.strokes));
  const plan = []; let t = 0.01, end = 0;
  for (let s = 0; s < N; s++) { const d = m.base / rate * c.between(r, 0.85, 1.15); plan.push([t, d]); end = t + d; t += d + (m.gap + r() * m.gap) / rate; }
  const dec = 0.025 + 0.22 * R * m.ringDec;
  const out = new Float32Array(c.seconds(end + 0.05 + dec * 4 + (p.tail ? 0.35 : 0), sr));
  for (let s = 0; s < N; s++) {
    const [t0, d] = plan[s], k = 1 + (s % 2 ? 0.03 : -0.02) + (r() - 0.5) * 0.03;
    const len = c.seconds(d, sr), x = c.noise(r, len), a = c.onepole(sr), a2 = c.onepole(sr), b = c.onepole(sr);
    const tilt = (1.15 - 0.35 * P) * k;
    let f0 = m.f[0] * tilt, f1 = m.f[1] * tilt * (0.85 + 0.15 * rate);
    if (s % 2) { const q = f0; f0 = f1; f1 = q; }
    const step = Math.pow(f1 / f0, 1 / len), att = 0.012 * sr, rel = 0.006 * sr;
    let fc = f0, chatter = 1, cnt = 0;
    for (let i = 0; i < len; i++) {
      if (--cnt <= 0) { cnt = m.chat * (0.5 + r()); chatter = 1 - m.chatDepth * r(); }
      const e = Math.sin(Math.PI * i / len) * Math.min(1, i / att) * Math.min(1, (len - i) / rel);
      const fh = Math.min(fc * 1.3, ny), v = a2(a(x[i], fh), fh);
      x[i] = (v - b(v, fc * 0.75)) * e * chatter * 2.2; fc *= step;
    }
    c.mix(out, x, t0, m.noiseG * (0.5 + 0.7 * P), sr);
    const g = Math.round(m.grit * d * (0.4 + 1.2 * P));
    for (let j = 0; j < g; j++) {
      const u = r(), fg = Math.min(ny, f0 * Math.pow(f1 / f0, u) * c.between(r, 0.6, 1.7));
      c.mix(out, c.burst(r, 0.002 + r() * 0.004, "bp", fg, m.gq * c.between(r, 0.7, 1.3), 0.0003, 0.0008 + r() * 0.002, sr), t0 + u * d, Math.sin(Math.PI * u) * (0.2 + 0.6 * r()) * m.grainG, sr);
    }
    c.mix(out, c.burst(r, 0.012, "hp", m.tick * k, 0.8, 0.0006, 0.003, sr), t0, 0.4 * (0.5 + P), sr);
    if (m.wet) {
      const bl = c.seconds(d, sr), br = c.brown(r, bl), lp = c.biquad("lp", 250 + 250 * P, 0.7, sr);
      for (let i = 0; i < bl; i++) br[i] = lp(br[i]) * Math.sin(Math.PI * i / bl);
      c.mix(out, br, t0, 0.25 + 0.3 * P, sr);
    }
    const fb = m.ringF * k * c.between(r, 0.95, 1.05);
    const modes = [1, 2.756, 5.404, 8.933].map((mm, j) => [fb * mm * (1 + (r() - 0.5) * 0.02), [1, 0.55, 0.3, 0.15][j]]).filter((q) => q[0] < ny);
    const rg = m.ringAmp * (0.1 + 0.9 * R);
    c.mix(out, c.ring(modes, dec * 5 + 0.03, dec, sr), t0 + d * c.between(r, 0.88, 0.96), rg * 0.6, sr);
    const short = c.ring(modes, 0.06, 0.012 + 0.02 * R, sr), sing = 3 + Math.floor(r() * 4);
    for (let j = 0; j < sing; j++) { const u = r(); c.mix(out, short, t0 + u * d, rg * 0.2 * Math.sin(Math.PI * u) * (0.5 + r()), sr); }
  }
  if (p.tail) c.reverb(out, { size: 0.35, decay: 0.45, mixAmt: 0.25 }, sr);
  c.finish(out, 0.9, 1.1);
  c.gain(out, 0.62 + 0.35 * P);
  c.fade(out, 5, sr);
  return { samples: out };
}
