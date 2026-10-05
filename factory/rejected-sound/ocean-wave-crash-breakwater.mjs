// Wave crash on a breakwater: a building swell roar (rising, brightening), a stone-impact crack and thump, a foam burst that darkens, a second smaller slap, spray sizzle, a drain-off of hissing backwash with trickles, sub rumble, and a tail wash that is a real decaying layer.
export const meta = {
  title: "Breakwater Crash", kind: "sfx", format: "sound", duration: 3.5, price: 3, author: "stormfront", payout: "stormfront@creators.oasis.example", kit: "Ocean Harbour", description: "A larger swell rising, bursting over a stone breakwater and draining back in foam; for harbour storms, coastal cutscenes and seaside game moments.",
  tags: ["wave", "ocean", "crash", "breakwater", "harbour", "surf", "storm", "water"],
};
export const params = { knobs: {
  size: { type: "choice", label: "Swell size", default: "medium", options: ["small", "medium", "storm"] },
  impact: { type: "range", label: "Impact", default: 0.6, min: 0, max: 1, step: 0.01 },
  foam: { type: "range", label: "Foam hiss", default: 0.6, min: 0, max: 1, step: 0.01 },
  rumble: { type: "range", label: "Rumble", default: 0.5, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + params.knobs.size.options.indexOf(p.size) * 97 + 11);
  const sz = { small: 0, medium: 1, storm: 2 }[p.size], big = 1 + 0.7 * sz;
  const dur = [2.3, 2.9, 3.4][sz] + (p.tail ? 0.5 : 0), n = c.seconds(dur, sr), out = new Float32Array(n);
  const rise = 0.5 + 0.2 * sz + 0.08 * r(), hit = rise;
  const m = c.seconds(rise + 0.02, sr), sw = c.noise(r, m), lp = c.onepole(sr), a1 = 1 / (0.012 * sr);
  let gm = 1;
  for (let i = 0; i < m; i++) { const t = i / m; if (i % 400 === 0) gm = 0.75 + 0.25 * r(); sw[i] = lp(sw[i], 250 + (1200 + 1500 * sz) * t * t) * Math.pow(t, 1.8) * gm * Math.min(1, (m - i) * a1); }
  c.mix(out, sw, 0, 0.9 + 0.3 * sz, sr);
  const f0 = 90 - 33 * sz;
  c.mix(out, c.ring([[f0, 1], [f0 * 1.9, 0.5], [f0 * 2.7, 0.25]], 0.5 + 0.4 * sz, 0.09 + 0.09 * sz, sr), hit, (0.2 + 0.9 * p.impact) * (0.6 + 0.35 * sz), sr);
  c.mix(out, c.burst(r, 0.1, "lp", 1400 + 1200 * p.impact - 700 * sz, 0.8, 0.003, 0.03 + 0.03 * sz, sr), hit, 0.2 + 1.0 * p.impact, sr);
  c.mix(out, c.burst(r, 0.02, "bp", 3000, 1, 0.0006, 0.006, sr), hit, 0.7 * p.impact, sr);
  if (sz > 0) c.mix(out, c.ring([[f0 * 1.3, 1], [f0 * 2.4, 0.4]], 0.4, 0.07, sr), hit + 0.22 + 0.1 * r(), (0.1 + 0.4 * p.impact) * (0.5 * sz), sr);
  const slaps = Math.round(4 + 16 * p.impact * big);
  for (let g = 0; g < slaps; g++) { const t = Math.pow(r(), 1.8) * 0.5; c.mix(out, c.burst(r, 0.02 + r() * 0.03, "bp", 400 + r() * 2200, 1.5, 0.001, 0.008 + r() * 0.01, sr), hit + 0.01 + t, (0.2 + 0.4 * r()) * p.impact * (1 - t), sr); }
  const fl = 0.9 + 0.6 * sz + (p.tail ? 0.5 : 0), fn = c.seconds(fl, sr), fo = c.noise(r, fn);
  const hp = c.biquad("hp", 1500, 0.7, sr), fl2 = c.onepole(sr), fk = Math.exp(-1 / (sr * (0.25 + 0.2 * sz))), fa = 1 / (0.012 * sr); let fe = 1;
  for (let i = 0; i < fn; i++) { fo[i] = fl2(hp(fo[i]), 8000 * fe + 1200) * Math.min(1, i * fa) * fe * (0.8 + 0.2 * (((i >> 5) * 7) % 11) / 11); fe *= fk; }
  c.mix(out, fo, hit, 1.2 * p.foam, sr);
  const fz = Math.round(50 * p.foam * big);
  for (let g = 0; g < fz; g++) { const t = Math.pow(r(), 1.4) * (0.6 + 0.5 * sz); c.mix(out, c.burst(r, 0.006, "bp", 4000 + r() * 4000, 5, 0.0003, 0.002, sr), hit + 0.04 + t, 0.4 * p.foam * Math.exp(-t * 2), sr); }
  const bn = c.seconds(1.4 + 0.6 * sz + (p.tail ? 0.4 : 0), sr), bw = c.noise(r, bn), lb = c.onepole(sr);
  const bk = Math.exp(-1 / (sr * (0.5 + 0.25 * sz))), ba = 1 / (0.25 * sr); let be = 1;
  for (let i = 0; i < bn; i++) { const rs = Math.min(1, i * ba); bw[i] = lb(bw[i], 400 + 1500 * be) * rs * be * (0.7 + 0.3 * Math.sin(i / sr * 7 + 1)); be *= bk; }
  c.mix(out, bw, hit + 0.3, 0.9 * (0.5 + 0.5 * p.foam), sr);
  for (let g = 0; g < 8 + 6 * sz; g++) { const t = 0.4 + r() * (0.9 + 0.4 * sz); c.mix(out, c.ring([[900 + r() * 1400, 1]], 0.05, 0.012, sr), hit + t, (0.05 + 0.05 * r()) * Math.exp(-t), sr); }
  const rn = c.seconds(1.4 + 0.8 * sz, sr), rb = c.brown(r, rn), lr = c.biquad("lp", 120 - 25 * sz, 0.8, sr);
  const rk = Math.exp(-1 / (sr * (0.4 + 0.3 * sz))), ra = 1 / (0.03 * sr); let re = 1;
  for (let i = 0; i < rn; i++) { rb[i] = lr(rb[i]) * Math.min(1, i * ra) * re; re *= rk; }
  c.mix(out, rb, hit - 0.02, 3.5 * p.rumble * big, sr);
  let res = out;
  if (p.tail) {
    const w = c.reverb(out, { size: 0.8, decay: 0.55, mixAmt: 1 }, sr);
    res = new Float32Array(n);
    for (let i = 0; i < n; i++) res[i] = out[i] * 0.8 + w[i] * 0.45;
  }
  c.fade(c.finish(res, 0.88, 1.1), 60, sr);
  return { samples: res };
}
