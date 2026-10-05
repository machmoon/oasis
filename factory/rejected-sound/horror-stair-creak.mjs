// Groaning stair tread: a stick-slip friction groan (irregular slip pulses whose rate glides and sags as weight settles, excited into wood formants), a soft late thump of the weight arriving, nail squeals and rattle ticks gated by the groan, and a comb-based stairwell tail.
export const meta = {
  title: "Stair Tread Groan", kind: "foley", format: "sound", duration: 2.2, price: 2, author: "hollowbody", payout: "hollowbody@creators.oasis.example", kit: "Horror House",
  description: "An old stair tread groaning as weight settles onto it, with stick-slip wood friction, nail squeal and rattle; for haunted houses, thrillers and creeping-dread moments.",
  tags: ["stair", "creak", "wood", "horror", "haunted", "groan", "foley", "house"],
};
export const params = { knobs: {
  size: { type: "choice", label: "Stair size", default: "narrow", options: ["narrow", "wide"] },
  weight: { type: "range", label: "Weight", default: 0.5, min: 0, max: 1, step: 0.01 },
  squeal: { type: "range", label: "Squeal", default: 0.5, min: 0, max: 1, step: 0.01 },
  rattle: { type: "range", label: "Nail rattle", default: 0.4, min: 0, max: 1, step: 0.01 },
  pitch: { type: "range", label: "Pitch", default: 0.5, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Stairwell tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + (p.size === "wide" ? 71 : 3));
  const wide = p.size === "wide", w = p.weight, pf = Math.pow(2, (p.pitch - 0.5) * 1.2);
  const dur = (wide ? 1.5 : 1.0) + 0.4 * w, n = c.seconds(dur + 0.5, sr), gn = c.seconds(dur, sr), out = new Float32Array(n);
  const rise = 0.18 + 0.15 * w + r() * 0.12, rel = 0.3, w1 = r() * 6;
  const sw = (t) => { const x = Math.min(1, t / rise), s = x * x * (3 - 2 * x), u = t / dur; return s * (1 + 0.12 * Math.sin(w1 + 9 * u)) * (t > dur - rel ? Math.exp(-(t - (dur - rel)) * 9) : 1); };
  const base = (wide ? 62 : 125) * pf * (0.86 + r() * 0.28) * (1 - 0.25 * w);
  const train = new Float32Array(gn + 2);
  let ph = 0, segEnd = 0, stick = false, segStart = 0, segLen = 0.1, jit = 0, wob = r() * 6;
  for (let i = 0; i < gn; i++) {
    const t = i / sr;
    if (t >= segEnd) {
      stick = !stick && r() < 0.6;
      segStart = t; segLen = stick ? 0.02 + 0.05 * r() : 0.08 + 0.22 * r(); segEnd = t + segLen;
    }
    const fr = (t - segStart) / segLen, m = stick ? 0.6 : 0.8 + 0.45 * fr;
    const rate = base * m * (1.3 - 0.4 * Math.min(1, t / dur * 1.3)) * (1 + jit) * (1 + 0.05 * Math.sin(wob + 11 * t));
    ph += rate / sr;
    if (ph >= 1) {
      ph -= 1; jit = (r() - 0.5) * 0.14;
      const a = sw(t) * (stick ? 0.2 : 0.5 + 0.5 * r());
      train[i] += a; train[i + 1] -= 0.6 * a;
    }
    train[i] += (r() - 0.5) * 0.04 * sw(t);
  }
  const F = wide ? [380, 850, 1500] : [700, 1500, 2600];
  const f1 = c.biquad("bp", F[0] * pf, 6, sr), f2 = c.biquad("bp", F[1] * pf, 8, sr), f3 = c.biquad("bp", F[2] * pf, 10, sr), lo = c.biquad("lp", 500, 0.7, sr);
  const body = new Float32Array(gn);
  for (let i = 0; i < gn; i++) { const x = train[i]; body[i] = f1(x) * 1.6 + f2(x) * 1.1 + f3(x) * (wide ? 0.5 : 0.9) + lo(x) * 0.5; }
  c.mix(out, body, 0.0, 1, sr);
  const th = c.ring([[58 - 18 * w + (wide ? -8 : 10), 1], [125 - 30 * w, 0.4]], 0.4, 0.07 + 0.1 * w + (wide ? 0.05 : 0), sr);
  for (let i = 0; i < th.length; i++) th[i] *= Math.min(1, i / (0.02 * sr));
  c.mix(out, th, 0.1 + rise * 0.5, 0.12 + 0.35 * w, sr);
  const ns = Math.round(1 + 4 * p.squeal);
  for (let k = 0; k < ns && p.squeal > 0.02; k++) {
    const t0 = rise * 0.6 + r() * dur * 0.55, sl = 0.15 + r() * 0.3, m = c.seconds(sl, sr);
    const f0 = (1700 + r() * 1700) * (wide ? 0.75 : 1) * (0.8 + 0.4 * p.pitch), dir = r() < 0.5 ? -1 : 1;
    const s = c.osc("sine", (t) => f0 * (1 + dir * 0.25 * t / sl + 0.015 * Math.sin(t * 60)), m, sr), e = c.adsr(m, { attack: 0.3, sustain: 0.5, decay: 0.5 }, sr);
    for (let i = 0; i < m; i++) s[i] *= e[i] * (0.7 + 0.3 * Math.sin(i / sr * 70 + k));
    c.mix(out, s, t0, 0.2 * p.squeal * (0.3 + 0.7 * sw(t0)), sr);
  }
  const nt = Math.round(3 + 12 * p.rattle);
  for (let k = 0; p.rattle > 0.02 && k < nt; k++) {
    const t0 = 0.05 + r() * dur * 0.8;
    c.mix(out, c.ring([[2400 + r() * 1800, 1], [4100 + r() * 1500, 0.4]], 0.05, 0.008 + 0.01 * r(), sr), t0, 0.25 * p.rattle * (0.2 + 0.8 * sw(t0)) * (0.4 + 0.6 * r()), sr);
  }
  if (p.tail) {
    const sz = wide ? 1.3 : 0.8, dry = new Float32Array(out), wet = new Float32Array(n);
    for (const d of [0.037, 0.053, 0.071, 0.089]) {
      const L = Math.max(2, Math.round(d * sz * sr)), buf = new Float32Array(L);
      let j = 0, lp = 0;
      for (let i = 0; i < n; i++) {
        const y = buf[j]; lp += (y - lp) * 0.45;
        buf[j] = dry[i] + lp * 0.8;
        wet[i] += y * 0.3;
        if (++j >= L) j = 0;
      }
    }
    for (let i = 0; i < n; i++) out[i] += wet[i] * 0.5;
  }
  c.fade(out, 40, sr);
  c.finish(out, 0.85, 1.1);
  return { samples: out };
}
