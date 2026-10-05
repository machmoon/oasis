// Coin Purse: a leather pouch of coins jingled in the hand or set down on a tavern table. Layered as coin clinks (damped inharmonic disc modes behind a leather muffle), a leather body thump per stroke, stick-slip leather creak, and an optional tail of settling coins in a low wooden room.
export const meta = {
  title: "Coin Purse", kind: "foley", format: "sound", duration: 1, price: 2, author: "hollowbody", payout: "hollowbody@creators.oasis.example", kit: "Wooden Tavern", description: "A leather coin purse shaken so the coins chink inside, or dropped onto a wooden table, for loot pickups, merchants and tavern payments.",
  tags: ["coins", "purse", "jingle", "leather", "money", "loot", "tavern", "foley"],
};
export const params = { knobs: {
  size: { type: "choice", label: "Purse size", default: "medium", options: ["small", "medium", "fat"] },
  gesture: { type: "choice", label: "Gesture", default: "jingle", options: ["jingle", "set down"] },
  fullness: { type: "range", label: "Fullness", default: 0.6, min: 0, max: 1, step: 0.01 },
  energy: { type: "range", label: "Shake energy", default: 0.5, min: 0, max: 1, step: 0.01 },
  creak: { type: "range", label: "Leather creak", default: 0.4, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Settle + room tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, down = p.gesture === "set down";
  const r = c.rng(p.seed * 6151 + params.knobs.size.options.indexOf(p.size) * 97 + (down ? 41 : 0) + 3);
  const z = { small: { coins: 9, cut: 9000, th: 300, td: 0.025, body: 0.55, lea: 1150 },
    medium: { coins: 20, cut: 6200, th: 200, td: 0.045, body: 0.8, lea: 820 },
    fat: { coins: 42, cut: 4200, th: 130, td: 0.075, body: 1, lea: 580 } }[p.size];
  const full = p.fullness, e = p.energy, ringK = p.tail ? 1 : 0.6;
  const nCoins = Math.max(3, Math.round(z.coins * (0.25 + 0.75 * full)));
  const strokes = down ? 1 : 2 + Math.round(e * 4), period = 0.25 - 0.1 * e;
  const spread = 0.05 + 0.07 * full + 0.03 * (1 - e);
  const act = down ? 0.03 + 0.24 + 0.15 * e : 0.05 + (strokes - 1) * period * 1.08 + spread;
  const tailLen = p.tail ? 0.42 : 0.12, n = c.seconds(act + tailLen, sr);
  const out = new Float32Array(n), coins = new Float32Array(n), leather = new Float32Array(n);
  const dec = (0.012 + 0.03 * (1 - full)) * (p.size === "small" ? 1.2 : 1) * ringK;
  const clink = (t, amp, dk) => {
    const i0 = Math.round(t * sr); if (i0 >= n) return;
    const d = dec * (dk || 1), f0 = c.between(r, 2300, 4600) * (0.9 + 0.2 * e), len = Math.min(n - i0, Math.round(Math.min(0.2, d * 6) * sr));
    for (const [k, a] of [[1, 1], [1.59 + 0.04 * r(), 0.6], [2.31 + 0.06 * r(), 0.35]]) {
      const w = c.TAU * f0 * k / sr; if (w > 2.9) continue;
      const rr = Math.exp(-1 / (d / (0.6 + 0.4 * k) * sr)), cw = 2 * rr * Math.cos(w), r2 = rr * rr;
      let y1 = 0, y2 = 0;
      for (let j = 0; j < len; j++) { const y = j === 0 ? amp * a * Math.sin(w) : cw * y1 - r2 * y2; coins[i0 + j] += y; y2 = y1; y1 = y; }
    }
    const m = Math.min(n - i0, Math.round(0.0015 * sr)), at = 0.0003 * sr;
    for (let j = 0; j < m; j++) coins[i0 + j] += (r() * 2 - 1) * amp * 0.5 * Math.min(1, j / at) * (1 - j / m);
  };
  const creak = (t, len, amp) => {
    if (amp <= 0) return;
    const m = c.seconds(len, sr), x = new Float32Array(m), f0 = c.between(r, 90, 200) * (0.75 + 0.5 * e), bend = c.between(r, -0.35, 0.6);
    const b1 = c.biquad("bp", z.lea * (0.9 + 0.2 * r()), 6, sr), b2 = c.biquad("bp", z.lea * 2.1 + r() * 400, 8, sr);
    let ph = 0;
    for (let i = 0; i < m; i++) {
      const u = i / m; ph += f0 * (1 + bend * u) * (0.75 + 0.5 * r()) / sr;
      let imp = 0; if (ph >= 1) { ph -= 1; imp = (0.5 + 0.5 * r()) * (r() < 0.85 ? 1 : -1); }
      x[i] = (b1(imp) + 0.6 * b2(imp)) * Math.sin(Math.PI * u);
    }
    c.mix(leather, x, t, amp * 9, sr);
  };
  const thump = (t, amp, d) => c.mix(leather, c.burst(r, d * 4 + 0.02, "lp", z.th * (0.9 + 0.2 * r()), 1, 0.001, d, sr), t, amp, sr);
  if (!down) {
    creak(0, 0.08 + 0.05 * r(), p.creak * 0.8);
    for (let s = 0; s < strokes; s++) {
      const ts = 0.05 + s * period * (0.94 + 0.14 * r()), as = (0.45 + 0.55 * e) * (0.8 + 0.4 * r()) * (s % 2 ? 0.8 : 1);
      thump(ts, (0.3 + 0.5 * full) * z.body * as, z.td * (0.6 + 0.4 * full));
      const k = Math.round(nCoins * (0.6 + 0.6 * e) * (0.7 + 0.5 * r()));
      for (let q = 0; q < k; q++) { const o = Math.pow(r(), 1.8) * spread; clink(ts + 0.002 + o, as * (0.25 + 0.75 * r()) * (1 - 0.5 * o / spread)); }
      if (s < strokes - 1 && r() < 0.8) creak(ts + period * (0.3 + 0.2 * r()), Math.min(period * 0.5, 0.06 + 0.06 * r()), p.creak * as * 0.75);
    }
  } else {
    const t0 = 0.03, f = 0.4 + 0.6 * e;
    c.mix(leather, c.ring([[165 * (0.97 + 0.06 * r()), 1], [342, 0.5], [710, 0.22]], 0.18, 0.025 + 0.03 * z.body, sr), t0, 0.5 * f * z.body * (0.6 + 0.4 * full), sr);
    thump(t0, 0.9 * f * z.body, z.td * (0.8 + 0.5 * full));
    c.mix(leather, c.burst(r, 0.03, "bp", 1400, 0.8, 0.0006, 0.006, sr), t0, 0.35 * f, sr);
    const k = Math.round(nCoins * (1 + e)), span = act - t0 - 0.02;
    for (let q = 0; q < k; q++) { const o = Math.pow(r(), 2.5) * span; clink(t0 + 0.002 + o, f * (0.3 + 0.7 * r()) * (1 - 0.8 * o / span)); }
    creak(t0 + 0.03 + 0.03 * r(), 0.14 + 0.16 * full, p.creak * 0.75);
  }
  if (p.tail) {
    const k = 3 + Math.round(3 * full + 2 * r());
    for (let q = 0; q < k; q++) { const u = (q + r() * 0.8) / k; clink(act - 0.02 + u * 0.26, (0.35 - 0.25 * u) * (0.6 + 0.4 * r()), 1.6); }
  }
  c.filter(coins, c.biquad("lp", z.cut * (0.75 + 0.5 * e) * (1.2 - 0.3 * full), 0.7, sr));
  c.mix(out, coins, 0, 0.9, sr);
  c.mix(out, leather, 0, 1, sr);
  if (p.tail) c.reverb(out, { size: 0.4, decay: 0.5, mixAmt: 0.28 }, sr);
  c.finish(out, 0.9, 1.1);
  const rel = Math.round(0.07 * sr);
  for (let i = 0; i < rel; i++) { const g = i / rel; out[n - 1 - i] *= g * g; }
  c.fade(out, 3, sr);
  return { samples: out };
}
