// Motorboat pass-by: irregular exhaust-pulse train (hull-specific diesel throb) with a Doppler glide, a prop whine line, cavitation hiss and bow/wake wash with slaps; speed sets pass time and file length, distance lowpasses the whole mix.
export const meta = {
  title: "Harbour Boat Pass", kind: "sfx", format: "sound", duration: 4, price: 3, author: "stormfront", payout: "stormfront@creators.oasis.example", kit: "Ocean Harbour", description: "A motorboat crossing the harbour mouth with a Doppler engine, prop cavitation and a wake that slaps the stones; hull size, speed, splash, distance and a lapping tail are knobs.",
  tags: ["boat", "motorboat", "harbour", "engine", "pass-by", "doppler", "wake", "water"],
};
export const params = { knobs: {
  hull: { type: "choice", label: "Hull size", default: "trawler", options: ["dinghy", "trawler", "ferry"] },
  speed: { type: "range", label: "Speed", default: 0.5, min: 0, max: 1, step: 0.01 },
  splash: { type: "range", label: "Wake splash", default: 0.5, min: 0, max: 1, step: 0.01 },
  distance: { type: "range", label: "Distance", default: 0.3, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Lapping tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + params.knobs.hull.options.indexOf(p.hull) * 37 + 11);
  const far = p.distance, sp = p.speed, level = 1 - 0.65 * far;
  const H = { dinghy: { rate: 36, size: 0.6, base: 150, dec: 0.018, whine: 820, cav: 1 }, trawler: { rate: 13, size: 1.2, base: 70, dec: 0.05, whine: 380, cav: 0.6 }, ferry: { rate: 6.5, size: 2, base: 36, dec: 0.12, whine: 190, cav: 0.35 } }[p.hull];
  const tc = 1.3 - 0.5 * sp + r() * 0.1, span = 0.9 - 0.65 * sp + 0.25 * far, vm = 0.1 + 0.25 * sp;
  const tailLen = p.tail ? 1.6 + 0.8 * H.size : 0.5 + 0.2 * H.size;
  const dur = Math.min(4, tc + 2.2 * span + tailLen + 0.3), n = c.seconds(dur, sr), out = new Float32Array(n);
  const geo = (t) => { const x = (t - tc) / (t < tc ? span : span * 1.5); return [1 / (1 + x * x * 3), x / Math.sqrt(1 + x * x)]; };
  let t = 0.02 + r() * 0.03;
  while (t < dur - 0.1) {
    const [e, cs] = geo(t), dop = 1 / (1 + vm * cs), rate = H.rate * (0.8 + 0.6 * sp) * dop;
    const g = (0.1 + 0.9 * e) * level * (0.6 + 0.4 * r()) * (r() < 0.08 ? 0.3 : 1), b = H.base * dop * (0.97 + 0.06 * r()), br = 0.3 + 0.7 * e;
    c.mix(out, c.ring([[b, 1], [b * 2.01, 0.7], [b * 3.4, 0.5 * br], [b * 6.2, 0.35 * br], [1100 * dop * (0.8 + 0.4 * r()), 0.2 * br]], H.dec * 5, H.dec * (0.7 + 0.6 * r()), sr), t, g * 0.9, sr);
    c.mix(out, c.burst(r, 0.012, "bp", (1800 + 1800 * r()) * dop, 0.9, 0.0006, 0.004, sr), t, g * 0.45 * br, sr);
    t += (1 / rate) * (1 + (r() - 0.5) * 0.2);
  }
  const wash = c.pink(r, n), hp = c.biquad("hp", 600, 0.7, sr), lpw = c.onepole(sr);
  for (let i = 0; i < n; i++) {
    const s = i / sr - tc - 0.1, w = s < 0 ? Math.exp(-s * s / (span * span) * 1.5) * 0.3 : Math.exp(-s / (0.7 * H.size + span)) * (1 - Math.exp(-(s + 0.1) * 5));
    wash[i] = lpw(hp(wash[i]), 3500 + 3500 * p.splash) * w * (0.03 + 0.8 * p.splash) * (0.5 + 0.5 * sp) * (0.6 + 0.4 * H.size) * level;
  }
  c.mix(out, wash, 0, 1, sr);
  const slaps = Math.round((6 + 45 * p.splash) * H.size);
  for (let k = 0; k < slaps; k++) {
    const st = tc + 0.1 + Math.pow(r(), 1.4) * (0.6 + 1.2 * H.size) * (1.5 - sp * 0.5), f = 600 + r() * 4500;
    if (st > dur - 0.2) continue;
    const g = (0.25 + 0.6 * r()) * (0.1 + 0.9 * p.splash) * level * Math.exp(-(st - tc) * 0.5);
    c.mix(out, c.burst(r, 0.03 + r() * 0.05, "bp", f, 1.2 + r() * 2, 0.002, 0.01 + r() * 0.03, sr), st, g * 1.3, sr);
    if (r() < 0.5) c.mix(out, c.ring([[110 + r() * 120, 1], [250 + r() * 120, 0.3]], 0.2, 0.05 + 0.03 * H.size, sr), st, 0.5 * g, sr);
  }
  if (p.tail) {
    const m = c.seconds(Math.min(tailLen, dur - tc - 0.3), sr), w = c.noise(r, m), bp = c.biquad("bp", 450 + 150 * p.splash, 0.9, sr); let g = 0.5, gs = 0.5;
    for (let i = 0; i < m; i++) { if (i % 2500 === 0) g = 0.1 + r() * 0.9; gs += (g - gs) * 0.001; w[i] = bp(w[i]) * gs * Math.min(1, i / (0.4 * sr)) * Math.exp(-i / sr / (0.5 + 0.4 * H.size)); }
    c.mix(out, w, tc + 0.3, 1.6 * (0.3 + 0.7 * p.splash) * (0.5 + 0.5 * H.size), sr);
  }
  const cav = c.noise(r, n), cb = c.biquad("bp", 2600 + 1200 * sp, 0.7, sr), lp = c.onepole(sr);
  let ph = 0, gt = 1, gs = 1;
  for (let i = 0; i < n; i++) {
    const [e, cs] = geo(i / sr), dop = 1 / (1 + vm * cs);
    if (i % 500 === 0) gt = 0.2 + 0.8 * r();
    gs += (gt - gs) * 0.03;
    ph += H.whine * (0.85 + 0.3 * sp) * dop / sr;
    const whine = (Math.sin(c.TAU * ph) + 0.4 * Math.sin(c.TAU * ph * 2)) * 0.06 * e * level;
    const cv = cb(cav[i]) * gs * Math.pow(e, 1.5) * (0.15 + 0.7 * sp) * H.cav * level;
    out[i] = lp(out[i] + whine + cv, Math.min(0.45 * sr, (3000 + 9000 * e) * (1 - 0.85 * far) + 400));
  }
  c.fade(c.finish(out, 0.85, 1.1), 40, sr);
  return { samples: out };
}
