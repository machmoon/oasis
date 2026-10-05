// Net haul: a wet net dragged over a gunwale. Each hand pull is its own event with a gunwale thump, a gliding wood creak and a friction grain stream (nylon: fine bright mesh hiss with dense knot ticks; rope: coarse low stick-slip rasp with fibre creak), with quiet gaps between pulls. Over them: loud pitched water plinks, runoff splashes, fish flops (thud, wet slap, flap cluster) and an optional dockside drip tail.
export const meta = {
  title: "Net Haul", kind: "foley", format: "sound", duration: 3.4, price: 2, author: "stormfront", payout: "stormfront@creators.oasis.example", kit: "Ocean Harbour", description: "A fishing net hauled dripping over a boat's gunwale in irregular hand-over-hand pulls, with knot ticks, plinking water drips and fish flopping on the deck; for harbour scenes and fishing-boat foley.",
  tags: ["net", "fishing", "harbour", "haul", "drip", "boat", "foley", "fish"],
};
export const params = { knobs: {
  net: { type: "choice", label: "Net", default: "nylon", options: ["nylon", "rope"] },
  weight: { type: "range", label: "Weight", default: 0.5, min: 0, max: 1, step: 0.01 },
  drip: { type: "range", label: "Drip", default: 0.5, min: 0, max: 1, step: 0.01 },
  flop: { type: "range", label: "Catch flop", default: 0.4, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + (p.net === "rope" ? 71 : 13));
  const rope = p.net === "rope", w = p.weight, dr = p.drip, fl = p.flop;
  const dur = 2.7, tl = p.tail ? 0.7 : 0.35, total = dur + tl, n = c.seconds(total, sr), out = new Float32Array(n);
  const pulls = []; let tp = 0.08 + r() * 0.1;
  while (tp < dur - 0.5) { const len = 0.38 + 0.25 * r() + 0.15 * w; pulls.push([tp, len, 0.6 + 0.4 * r()]); tp += len + 0.1 + 0.2 * r(); }
  const blip = (t, f, a) => {
    const dn = c.seconds(0.11, sr), d = c.osc("sine", (tt) => f * (1 + 7 * tt), dn, sr);
    c.multiply(d, c.env(dn, 0.0005, 0.03, sr)); c.mix(out, d, t, a, sr);
    c.mix(out, c.burst(r, 0.012, "hp", 5000, 1, 0.0003, 0.004, sr), t, a * 0.4, sr);
  };
  for (const [t0, len, a] of pulls) {
    const m = c.seconds(len, sr), x = c.noise(r, m), y = c.noise(r, m);
    const bp = c.biquad("bp", rope ? 650 + 250 * r() : 3200 + 800 * r(), rope ? 1.1 : 1.5, sr);
    const hs = c.biquad("hp", rope ? 2200 : 6500, 0.7, sr), lo = c.biquad("lp", 180 + 160 * w, 0.8, sr);
    const seg = Math.round(sr * (rope ? 0.011 : 0.0012)); let g = 1;
    for (let i = 0; i < m; i++) {
      if (i % seg === 0) g = rope ? (r() < 0.35 ? 0.05 : 0.3 + 1.2 * r()) : 0.6 + 0.4 * r();
      const u = i / m, sh = Math.pow(Math.sin(Math.PI * Math.pow(u, 0.6)), 1.4) * (0.7 + 0.3 * Math.sin(u * 40 + a * 5));
      x[i] = (bp(x[i]) * g * (rope ? 1.7 : 0.9) + hs(y[i]) * (rope ? 0.1 : 0.9) * (0.6 + 0.4 * g) + lo(x[i] * 0.6) * (0.2 + 1.3 * w)) * sh;
    }
    c.mix(out, x, t0, 0.45 * a, sr);
    c.mix(out, c.ring([[75 + 25 * r(), 1], [150 + 20 * r(), 0.5], [310, 0.2]], 0.25, 0.05 + 0.04 * w, sr), t0, (0.3 + 0.6 * w) * a, sr);
    c.mix(out, c.burst(r, 0.03, "bp", 1500, 1, 0.001, 0.008, sr), t0, 0.5 * a, sr);
    const cn = c.seconds(len * 0.9, sr), cf = (rope ? 110 : 260) + 70 * r(), ph = r() * 6;
    const cr = c.osc(rope ? "square" : "tri", (t) => cf * (1 + 0.3 * Math.sin(t * 7 + ph) + 0.4 * t + 0.08 * Math.sin(t * 53)), cn, sr);
    c.filter(cr, c.biquad("lp", rope ? 800 : 2200, 3, sr));
    c.multiply(cr, c.adsr(cn, { attack: 0.12, sustain: 0.5, decay: 0.3 }, sr));
    c.mix(out, cr, t0 + 0.03, (rope ? 0.12 : 0.1) + 0.06 * w, sr);
    const knots = rope ? 4 + Math.round(3 * r()) : 14 + Math.round(8 * r());
    for (let j = 0; j < knots; j++) c.mix(out, c.burst(r, 0.008, "bp", rope ? 800 + 500 * r() : 4500 + 2500 * r(), 4, 0.0004, rope ? 0.006 : 0.0015, sr), t0 + r() * len, (0.35 + 0.5 * r()) * a, sr);
    const nd = 2 + Math.round(5 * dr * r() + 2 * dr);
    for (let d = 0; d < nd; d++) blip(t0 + len * (0.3 + 0.9 * r()), 1300 + r() * 2200, (0.4 + 0.6 * r()) * (0.4 + 0.6 * dr));
  }
  const drops = Math.round(6 + 26 * dr);
  for (let d = 0; d < drops; d++) blip(0.1 + Math.pow(r(), 1.2) * (total - 0.4), 1100 + r() * 2400, (0.4 + 0.6 * r()) * (0.4 + 0.6 * dr));
  for (let q = 0; q < 5; q++) {
    const t = pulls[Math.floor(r() * pulls.length)][0] + 0.2 + r() * 0.4, tn = c.seconds(0.3, sr), tr = c.noise(r, tn), tb = c.biquad("bp", 3800, 1.5, sr); let tg = 0;
    for (let i = 0; i < tn; i++) { if (i % 60 === 0) tg = r() < 0.5 ? r() : 0; tr[i] = tb(tr[i]) * tg * Math.exp(-i / sr / 0.12); }
    c.mix(out, tr, t, 0.3 * (0.2 + dr), sr);
  }
  const flops = Math.round(3 + 4 * fl), f0 = 0.9 + 0.6 * r();
  for (let f = 0; f < flops; f++) {
    const t = Math.min(f0 + f * (0.15 + 0.3 * r()), total - 0.4), a = (0.6 + 0.4 * r()) * (0.3 + 0.7 * fl);
    const fr = 85 + 40 * r();
    c.mix(out, c.osc("sine", (tt) => fr * (1.6 - 6 * tt), c.seconds(0.12, sr), sr).map((v, i, arr) => v * Math.exp(-i / sr / 0.03)), t, 1.3 * a, sr);
    c.mix(out, c.ring([[190 + 50 * r(), 1], [340, 0.3]], 0.12, 0.03, sr), t, 0.8 * a, sr);
    c.mix(out, c.burst(r, 0.06, "bp", 900 + 500 * r(), 1.5, 0.001, 0.02, sr), t, 1.0 * a, sr);
    c.mix(out, c.burst(r, 0.04, "hp", 2800, 0.8, 0.001, 0.014, sr), t + 0.01, 0.55 * a, sr);
    for (let q = 1; q <= 2; q++) c.mix(out, c.burst(r, 0.03, "bp", 1600, 1, 0.001, 0.01, sr), t + q * (0.05 + 0.03 * r()), 0.4 * a / q, sr);
  }
  if (p.tail) {
    for (let d = 0; d < 3 + Math.round(5 * dr); d++) blip(dur + 0.05 + d * (0.08 + 0.05 * d) * (0.7 + 0.6 * r()), 1000 + r() * 1400, (0.5 + 0.3 * r()) * (0.4 + 0.6 * dr) * Math.exp(-d * 0.15));
    const rv = c.reverb(out, { size: 0.35, decay: 0.45, mixAmt: 0.2 }, sr);
    if (rv && rv.length >= n) for (let i = 0; i < n; i++) out[i] = rv[i];
  }
  c.fade(out, 12, sr);
  c.finish(out, 0.85, 1.1);
  c.fade(out, 30, sr);
  return { samples: out };
}
