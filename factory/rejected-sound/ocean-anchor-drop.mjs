// Anchor drop: winch clack and a few accelerating clinks as it falls, a hard splash entry (crack, pitch-dropping thump, crown hiss, bubble chirps), then the chain running out as discrete link clanks that speed up and stop on a hard clunk, a sink bloom and lapping harbour water.
export const meta = {
  title: "Anchor Drop", kind: "impact", format: "sound", duration: 3, price: 3, author: "stormfront", payout: "stormfront@creators.oasis.example", kit: "Ocean Harbour", description: "An anchor released, hitting harbour water with a distinct splash, then its chain clanking out over the gunwale until it snubs and the anchor sinks; size, chain length, splash and clank are knobs, for boat scenes and docks.",
  tags: ["anchor", "chain", "splash", "harbour", "boat", "clank", "metal", "nautical"],
};
export const params = { knobs: {
  size: { type: "choice", label: "Anchor size", default: "medium", options: ["small", "medium", "heavy"] },
  chain: { type: "range", label: "Chain length", default: 0.5, min: 0, max: 1, step: 0.01 },
  splash: { type: "range", label: "Splash", default: 0.6, min: 0, max: 1, step: 0.01 },
  clank: { type: "range", label: "Clank", default: 0.5, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Water tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + 29);
  const sz = { small: 0, medium: 0.5, heavy: 1 }[p.size], f0 = 1 / (1 + 1.4 * sz);
  const ts = 0.45, rattleLen = 0.3 + 1.0 * p.chain, cl = p.clank;
  const out = new Float32Array(c.seconds(p.tail ? 3 : 2.3, sr));
  const link = (t, a) => {
    const base = (1900 - 1100 * sz) * (0.7 + 0.6 * r());
    c.mix(out, c.burst(r, 0.014, "bp", (4200 - 2200 * sz) * (0.5 + r()), 0.9, 0.0004, 0.003 + 0.004 * sz, sr), t, a * (0.35 + 0.65 * cl), sr);
    c.mix(out, c.ring([[base, 1], [base * 1.58, 0.6], [base * 2.31, 0.5], [base * 3.7, 0.3]], 0.07, 0.006 + 0.016 * cl + 0.01 * sz, sr), t, a * (0.1 + 0.4 * cl), sr);
    c.mix(out, c.ring([[(110 + 70 * r()) * (0.6 + 0.4 * f0), 1], [260 + 90 * r(), 0.4]], 0.1, 0.02 + 0.03 * sz, sr), t, a * (0.12 + 0.5 * sz), sr);
  };
  c.mix(out, c.ring([[190 * f0, 1], [520 * f0, 0.5], [1300 * f0, 0.3]], 0.12, 0.025, sr), 0.03, 0.45, sr);
  c.mix(out, c.burst(r, 0.01, "hp", 2500, 0.8, 0.0005, 0.003, sr), 0.03, 0.4, sr);
  for (let k = 0, t = 0.12; k < 6; k++) { link(t, 0.18 + 0.06 * k); t += (0.09 - 0.012 * k) * (0.8 + 0.4 * r()); }
  const cn = c.seconds(0.08, sr), ck = c.noise(r, cn), cb = c.biquad("bp", 2400, 0.5, sr);
  for (let i = 0; i < cn; i++) ck[i] = cb(ck[i]) * Math.min(1, i / (0.0012 * sr)) * Math.exp(-i / sr / 0.018);
  c.mix(out, ck, ts, 0.7 + 0.5 * p.splash, sr);
  const dn = c.seconds(0.5 + 0.6 * sz, sr);
  c.mix(out, c.osc("sine", (tt) => (210 * f0 + 40) * Math.exp(-tt * (10 - 4 * sz)) + 32 + 10 * f0, dn, sr), ts, 0.6 + 0.5 * sz, sr);
  const sn = c.seconds(0.4 + 0.5 * sz, sr), low = c.noise(r, sn), lp = c.biquad("lp", 450 + 700 * f0 + 500 * p.splash, 0.8, sr);
  for (let i = 0; i < sn; i++) low[i] = lp(low[i]) * Math.min(1, i / (0.003 * sr)) * Math.exp(-i / sr / (0.07 + 0.1 * sz));
  c.mix(out, low, ts, 0.6 + 0.5 * sz, sr);
  const hn = c.seconds(0.5, sr), hi = c.noise(r, hn), hp = c.biquad("hp", 2000 + 700 * (1 - sz), 0.7, sr);
  for (let i = 0; i < hn; i++) hi[i] = hp(hi[i]) * Math.min(1, i / (0.002 * sr)) * Math.exp(-i / sr / (0.05 + 0.1 * p.splash));
  c.mix(out, hi, ts, 0.2 + 0.8 * p.splash, sr);
  for (let d = 0, nb = 5 + Math.round(12 * p.splash); d < nb; d++) {
    const f = (500 + 1400 * r()) * (0.6 + 0.4 * f0), bl = c.seconds(0.06, sr), bw = c.osc("sine", (tt) => f * (1 + 4 * tt), bl, sr), be = c.env(bl, 0.004, 0.025, sr);
    for (let i = 0; i < bl; i++) bw[i] *= be[i];
    c.mix(out, bw, ts + 0.08 + r() * 0.8, 0.05 + 0.18 * p.splash * r(), sr);
  }
  const st = ts + 0.14, end = st + rattleLen;
  for (let t = st; t < end;) {
    const u = (t - st) / rattleLen;
    link(t, (0.4 + 0.6 * r()) * (0.6 + 0.6 * u) * (0.7 + 0.4 * sz));
    t += (0.11 - 0.075 * u) * (0.7 + 0.6 * r());
  }
  c.mix(out, c.ring([[85 * f0 + 30, 1], [230 * f0, 0.5], [610 * f0, 0.35]], 0.3, 0.05 + 0.05 * sz, sr), end, 0.45 + 0.35 * sz, sr);
  c.mix(out, c.burst(r, 0.02, "bp", 1800, 0.8, 0.0006, 0.006, sr), end, 0.3 + 0.3 * cl, sr);
  const kn = c.seconds(1.0 + 0.5 * sz, sr), sk = c.noise(r, kn), sl = c.biquad("lp", 320, 0.8, sr);
  for (let i = 0; i < kn; i++) { const u = i / kn; sk[i] = sl(sk[i]) * Math.min(1, i / (0.02 * sr)) * (1 - u) * (1 - u); }
  c.mix(out, sk, ts + 0.05, 0.45 + 0.3 * sz, sr);
  if (p.tail) {
    for (let k = 0; k < 5; k++) {
      const ln = c.seconds(0.55, sr), lw = c.noise(r, ln), lf = c.biquad("bp", 700 + 500 * r(), 0.7, sr);
      for (let i = 0; i < ln; i++) lw[i] = lf(lw[i]) * Math.sin(Math.PI * i / ln);
      c.mix(out, lw, ts + 0.5 + k * 0.42 + 0.1 * r(), 0.4 * Math.exp(-0.25 * k) * (0.5 + 0.5 * p.splash), sr);
    }
    for (let d = 0; d < 12; d++) c.mix(out, c.burst(r, 0.02, "bp", 900 + 1800 * r(), 4, 0.001, 0.006, sr), ts + 0.6 + r() * 1.8, 0.06 + 0.08 * r(), sr);
    c.reverb(out, { size: 0.6, decay: 0.55, mixAmt: 0.3 }, sr);
  }
  c.finish(out, 0.9, 1.1);
  c.fade(out, 30, sr);
  return { samples: out };
}
