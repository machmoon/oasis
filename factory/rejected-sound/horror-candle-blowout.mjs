// Candle blowout: a short soft breath "fff" (bandpassed noise, 4-15 ms onset, band rising with strength), a dull wick-extinguish pop, then separate layers: dense-to-sparse sizzle ticks and spits, and a faint thin smoke hiss. Length follows the layers; the tail adds a small room bloom.
export const meta = {
  title: "Candle Snuff", kind: "foley", format: "sound", duration: 1.2, price: 1, author: "hollowbody", payout: "hollowbody@creators.oasis.example", kit: "Horror House", description: "A candle flame is snuffed by a sudden breath and dies into a sizzling wick and a thread of smoke; for haunted-house cues, ritual scenes and lights-out beats.",
  tags: ["candle", "blowout", "breath", "sizzle", "smoke", "horror", "foley", "flame"],
};
export const params = { knobs: {
  candle: { type: "choice", label: "Candle size", default: "taper", options: ["taper", "pillar"] },
  breath: { type: "range", label: "Breath strength", default: 0.6, min: 0, max: 1, step: 0.01 },
  sizzle: { type: "range", label: "Sizzle", default: 0.5, min: 0, max: 1, step: 0.01 },
  smoke: { type: "range", label: "Smoke hiss", default: 0.5, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Room tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + (p.candle === "pillar" ? 91 : 13)), n = c.seconds(1.2, sr), out = new Float32Array(n);
  const pil = p.candle === "pillar", b = p.breath;
  const bl = 0.09 + 0.12 * b + (pil ? 0.04 : 0), t0 = 0.03, end = t0 + bl;
  // breath: soft low "fff" for a weak blow, a bright hard "pff" for a strong one; amplitude gusts shape it
  const nb = c.seconds(bl + 0.1, sr), w = c.noise(r, nb), a = c.biquad("bp", 700 + 900 * b, 0.6, sr), a2 = c.biquad("hp", 2200 + 1800 * b, 0.7, sr), a3 = c.biquad("hp", 250, 0.7, sr);
  let gu = 1, tg = 1;
  for (let i = 0; i < nb; i++) {
    const t = i / sr;
    if (i % 200 === 0) tg = 0.6 + 0.4 * r();
    gu += (tg - gu) * 0.1;
    const att = Math.min(1, t / (0.015 - 0.01 * b)), e = att * (t < bl ? 1 - 0.5 * t / bl : 0.5 * Math.exp(-(t - bl) / 0.025));
    w[i] = a3(a(w[i]) * 1.2 + a2(w[i]) * (0.15 + 1.4 * b)) * e * gu;
  }
  c.mix(out, w, t0, 0.3 + 0.9 * b, sr);
  // flame flicker under the breath: a few small crackle ticks only inside the puff
  for (let k = 0; k < 6; k++) c.mix(out, c.burst(r, 0.003, "bp", 2500 + r() * 3000, 3, 0.0003, 0.001, sr), t0 + r() * bl, 0.05 + 0.15 * r(), sr);
  // extinguish: a dull wet pop, pitched lower for the pillar
  c.mix(out, c.burst(r, 0.02, "bp", pil ? 600 : 1100, 1.5, 0.001, 0.007, sr), end, 0.3 + 0.2 * b, sr);
  c.mix(out, c.ring([[pil ? 85 : 130, 1], [pil ? 190 : 280, 0.3]], 0.1, pil ? 0.04 : 0.025, sr), end - 0.005, 0.12 + 0.12 * b, sr);
  // wick sizzle: discrete ticks and spits, dense then sparse, pillar spits lower and bigger
  const sl = 0.35 + 0.35 * p.sizzle, ns = c.seconds(sl, sr), sz = new Float32Array(ns), ticks = Math.round(8 + 80 * p.sizzle);
  for (let k = 0; k < ticks; k++) {
    const t = Math.pow(r(), 2) * (sl - 0.05), d = 1 - 0.8 * t / sl;
    c.mix(sz, c.burst(r, 0.003 + r() * 0.003, "bp", (pil ? 3000 : 4500) + r() * 4000, 6, 0.0002, 0.0007 + r() * 0.0012, sr), t, (0.25 + 0.7 * r() * r()) * d, sr);
  }
  for (let k = 0; k < (pil ? 4 : 2) * (0.3 + p.sizzle); k++) c.mix(sz, c.ring([[(pil ? 700 : 1000) + r() * 700, 1], [2000 + r() * 1500, 0.35]], 0.04, 0.007, sr), r() * sl * 0.5, 0.2 * (0.5 + r()), sr);
  c.mix(out, sz, end + 0.01, 0.05 + 0.95 * p.sizzle, sr);
  // smoke: a faint thin high hiss rising softly then thinning, shorter than the file
  const nh = c.seconds(0.8, sr), h = c.noise(r, nh), hp = c.biquad("hp", 6500, 0.7, sr), hl = c.biquad("lp", 11000, 0.7, sr), ph = r() * 6;
  for (let i = 0; i < nh; i++) { const u = i / nh; h[i] = hl(hp(h[i])) * Math.min(1, u / 0.12) * Math.pow(1 - u, 2) * (0.7 + 0.3 * Math.sin(u * 12 + ph)); }
  c.mix(out, h, end + 0.02, 0.03 + 0.3 * p.smoke, sr);
  let res = out;
  if (p.tail) {
    const src = new Float32Array(n), k = c.seconds(end + 0.05, sr);
    for (let i = 0; i < k; i++) src[i] = out[i];
    const tl = c.reverb(src, { size: pil ? 0.8 : 0.5, decay: 0.5, mixAmt: 1 }, sr);
    res = new Float32Array(n);
    for (let i = 0; i < n; i++) res[i] = out[i] + 0.4 * (tl[i] - src[i]);
  }
  c.finish(res, 0.85, 1.1);
  c.fade(res, 60, sr);
  return { samples: res };
}
