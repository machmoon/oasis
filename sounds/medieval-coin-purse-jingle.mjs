// Coin purse jingle: irregular shake gestures each spray a spread of coin-on-coin clinks (inharmonic ring with a faster-dying upper stage, plus a tick) over a dull leather thump and rustle; an optional tail of accelerating settling clinks.
export const meta = {
  title: "Purse Jingle", kind: "foley", format: "sound", duration: 1.6, price: 2, author: "hollowbody", payout: "hollowbody@creators.oasis.example", kit: "Medieval Market", description: "A leather purse of coins shaken in the hand: clustered metallic clinks over a dull leather thud, for merchants, thieves and loot pickups in a medieval market.",
  tags: ["coins", "purse", "jingle", "leather", "medieval", "market", "money", "foley"],
};
export const params = { knobs: {
  size: { type: "choice", label: "Purse size", default: "medium", options: ["small", "medium", "fat"] },
  coins: { type: "range", label: "Coin count", default: 0.5, min: 0, max: 1, step: 0.01 },
  shake: { type: "range", label: "Shake intensity", default: 0.5, min: 0, max: 1, step: 0.01 },
  muffle: { type: "range", label: "Leather muffle", default: 0.4, min: 0, max: 1, step: 0.01 },
  rate: { type: "range", label: "Rate", default: 1, min: 0.5, max: 2, step: 0.05 },
  tail: { type: "toggle", label: "Settling tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + 29), dur = 1.6, out = new Float32Array(c.seconds(dur, sr));
  const si = p.size === "small" ? 0 : p.size === "fat" ? 2 : 1;
  const pitch = [1.3, 1, 0.78][si], bodyF = [170, 120, 85][si], mu = p.muffle;
  const clink = (t, a) => {
    const f = (2300 + r() * 2600) * pitch * (1 - 0.3 * mu);
    const d = (0.014 + r() * 0.03) * (1 - 0.5 * mu);
    const lo = [[f, 1], [f * (1.5 + r() * 0.2), 0.4], [f * (2.3 + r() * 0.3), 0.5]];
    const hi = [[f * (3.9 + r() * 0.5), 0.35], [f * (5.7 + r() * 0.6), 0.2], [f * (7.4 + r() * 0.8), 0.1]];
    c.mix(out, c.ring(lo, d * 6, d, sr), t, a * 0.35, sr);
    c.mix(out, c.ring(hi, d * 3, d * 0.3, sr), t, a * 0.3 * (1 - 0.8 * mu), sr);
    c.mix(out, c.burst(r, 0.003, "hp", 4500, 0.8, 0.0004, 0.0012, sr), t, a * 0.3 * (1 - 0.8 * mu), sr);
  };
  const shakes = 3 + Math.round(5 * p.shake);
  const period = Math.max(0.085, 0.2 / p.rate * (1.2 - 0.4 * p.shake));
  let t0 = 0.04;
  for (let s = 0; s < shakes && t0 < 1.0; s++) {
    const accent = s % 2 === 0 ? 1 : 0.7;
    const amp = (0.4 + 0.6 * p.shake) * (0.6 + 0.4 * r()) * accent;
    c.mix(out, c.ring([[bodyF * (0.95 + r() * 0.1), 1]], 0.08, 0.015 + 0.01 * si, sr), t0, 0.22 * amp, sr);
    c.mix(out, c.burst(r, 0.09, "lp", 380 + 500 * (1 - mu), 1, 0.008, 0.03, sr), t0, (0.12 + 0.3 * mu) * amp, sr);
    c.mix(out, c.burst(r, 0.05, "bp", 1100 + 700 * r(), 1.5, 0.004, 0.015, sr), t0 + 0.01 * r(), 0.07 * amp, sr);
    const n = Math.min(14, Math.round((2 + 12 * p.coins) * (0.6 + 0.6 * p.shake) * (0.85 + 0.15 * si)));
    const span = Math.min(period * 0.8, 0.05 + 0.07 * p.shake);
    for (let k = 0; k < n; k++) clink(t0 + 0.004 + (k + r()) / n * span * (0.6 + 0.4 * r()), amp * (0.35 + 0.65 * r()));
    t0 += period * (0.8 + 0.4 * r());
  }
  if (p.tail) {
    const m = Math.round(3 + 8 * p.coins), W = Math.min(0.5, dur - 0.2 - t0);
    let t = t0 - period * 0.4;
    for (let k = 0; k < m; k++) {
      const u = k / m;
      t += W * 0.3 * (1 - 0.85 * u) * (0.6 + 0.8 * r()) / (1 + m / 10);
      if (t < dur - 0.2) clink(t, 0.4 * (1 - u * 0.8) * (0.5 + 0.5 * r()));
    }
    c.mix(out, c.burst(r, 0.06, "lp", 450, 1, 0.005, 0.02, sr), t0 + 0.05, 0.08 * (0.3 + mu), sr);
  }
  c.filter(out, c.biquad("lp", 13000 - 9000 * mu, 0.7, sr));
  c.fade(c.finish(out, 0.85, 1.1), 8, sr);
  return { samples: out };
}
