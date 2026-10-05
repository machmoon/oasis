// Analogue crash cymbal: a stick crack, a dense bank of high inharmonic square partials (3-12 kHz) with a fast splash drop into a long decay, a crash-shaped noise wash, a faint bell body, and an optional shimmer tail of modulated noise bands; every layer decays to silence before the end.
export const meta = {
  title: "Analogue Crash", kind: "sfx", format: "sound", duration: 3, price: 2, author: "kickdrum", payout: "kickdrum@creators.oasis.example", kit: "Drum Machine", description: "A synthesized analogue crash cymbal whose metal, decay, spread and tone are knobs, with an optional shimmering tail; a stinger or accent for drum machine patterns and trailers.",
  tags: ["cymbal", "crash", "drum machine", "analogue", "metal", "stinger", "percussion", "synth"],
};
export const params = { knobs: {
  metal: { type: "choice", label: "Metal", default: "bronze", options: ["bronze", "brass", "thin"] },
  decay: { type: "range", label: "Decay", default: 0.5, min: 0, max: 1, step: 0.01 },
  spread: { type: "range", label: "Spread", default: 0.5, min: 0, max: 1, step: 0.01 },
  tone: { type: "range", label: "Tone", default: 0.5, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Shimmer tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + params.knobs.metal.options.indexOf(p.metal) * 41 + 3);
  const M = {
    bronze: { f: 1500, d: 1, q: 0.8, n: 0.9, bell: 0.12, hp: 2600, lp: 11000, sp: 1 },
    brass: { f: 2300, d: 0.55, q: 3.2, n: 0.55, bell: 0.2, hp: 3600, lp: 9000, sp: 0.5 },
    thin: { f: 3100, d: 0.4, q: 0.6, n: 1, bell: 0.04, hp: 4800, lp: 14000, sp: 1.6 },
  }[p.metal];
  const dur = 3, n = c.seconds(dur, sr), out = new Float32Array(n);
  const dec = (0.45 + 1.0 * p.decay) * M.d, tone = 0.7 + 0.6 * p.tone;
  const ratios = [1, 1.3483, 1.6171, 1.9265, 2.2502, 2.6637, 3.1, 3.53, 4.07, 4.6, 5.2, 5.9];
  const m = c.seconds(Math.min(dur - 0.5, dec * 2.4 + 0.3), sr), bank = new Float32Array(m);
  const K = ratios.length, inc = [], ph = [], g1 = [], g2 = [], e1 = [], e2 = [], am = [], att = [];
  for (let k = 0; k < K; k++) {
    const f = Math.min(sr * 0.45, M.f * tone * ratios[k] * (1 + (r() - 0.5) * (0.02 + 0.12 * p.spread * M.sp)) * (1 + 0.3 * p.spread * k / K));
    inc.push(f / sr); ph.push(r()); e1.push(1); e2.push(1); am.push(0.4 + 0.6 * r());
    g1.push(Math.exp(-1 / (sr * 0.05 * (0.6 + 0.8 * r())))); g2.push(Math.exp(-1 / (sr * dec * (0.35 + 0.5 * r()) * (1 - 0.03 * k)))); att.push(sr * (0.0005 + 0.0015 * r()));
  }
  for (let i = 0; i < m; i++) {
    let s = 0;
    for (let k = 0; k < K; k++) {
      ph[k] += inc[k]; if (ph[k] >= 1) ph[k] -= 1;
      e1[k] *= g1[k]; e2[k] *= g2[k];
      s += (ph[k] < 0.5 ? 1 : -1) * (0.7 * e1[k] + 0.3 * e2[k]) * am[k] * (i < att[k] ? i / att[k] : 1);
    }
    bank[i] = s * 0.25;
  }
  const bp = c.biquad("bp", 4000 + 4000 * p.tone, M.q, sr), hp = c.biquad("hp", M.hp * 0.7, 0.7, sr);
  for (let i = 0; i < m; i++) bank[i] = hp(bp(bank[i])) * 1.3 + bank[i] * 0.15;
  c.mix(out, bank, 0, 0.5, sr);
  const w = c.seconds(Math.min(dur - 0.5, dec * 2 + 0.3), sr), wash = c.noise(r, w), wh = c.biquad("hp", M.hp * (0.7 + 0.5 * p.tone), 0.8, sr), wl = c.biquad("lp", Math.min(sr * 0.45, M.lp * (0.7 + 0.5 * p.tone)), 0.7, sr);
  const wg = Math.exp(-1 / (sr * dec * 0.8)), fg = Math.exp(-1 / (sr * 0.05));
  let ex = 1, fx = 1;
  for (let i = 0; i < w; i++) {
    ex *= wg; fx *= fg;
    wash[i] = wl(wh(wash[i])) * Math.min(1, i / (0.0008 * sr)) * (0.25 + 0.75 * fx) * ex;
  }
  c.mix(out, wash, 0, M.n * 1.2, sr);
  c.mix(out, c.burst(r, 0.02, "hp", 4000 + 3000 * p.tone, 0.8, 0.0004, 0.005, sr), 0, 1, sr);
  c.mix(out, c.burst(r, 0.06, "bp", 1800 * tone, 1, 0.0006, 0.02, sr), 0, 0.3, sr);
  c.mix(out, c.ring([[620, 0.5], [960 * tone, 0.5], [1630, 0.3]].map(([f, a]) => [f * (0.98 + r() * 0.04), a]), 0.4, 0.07 + 0.1 * dec, sr), 0.001, M.bell, sr);
  let end = dec * 2.4 + 0.4;
  if (p.tail) {
    const L = c.seconds(1.8, sr), t0 = new Float32Array(L), td = 0.5 + 0.7 * dec;
    for (let k = 0; k < 7; k++) {
      const f = Math.min(sr * 0.42, (4000 + 5000 * r()) * (0.8 + 0.4 * p.tone)), a = 0.4 + 0.6 * r(), s1 = 4 + 6 * r(), s2 = 9 + 8 * r(), p1 = r() * 6.28, p2 = r() * 6.28;
      const nz = c.noise(r, L), f1 = c.biquad("bp", f, 6, sr);
      let sw = 1;
      for (let i = 0; i < L; i++) {
        const t = i / sr;
        if (i % 32 === 0) sw = 0.5 + 0.5 * Math.sin(t * s1 + p1) * Math.sin(t * s2 + p2);
        t0[i] += f1(nz[i]) * 1.5 * a * sw * Math.min(1, t / 0.08) * Math.exp(-t / td);
      }
    }
    c.mix(out, t0, 0.04, 0.55, sr);
    end += 0.9;
  } else end -= 0.2;
  const L2 = Math.min(n, c.seconds(end, sr)), res = out.slice(0, L2);
  c.fade(res, Math.min(300, end * 150), sr);
  c.finish(res, 0.9, 1.1);
  return { samples: res };
}
