// Coin Drop: a coin lands on wood or stone, bounces in shrinking gaps, then spins down as separate clinks whose spacing collapses (an accelerating rattle) into a buzz and one last small clink. Each event is a click, an optional wooden thud and a short inharmonic metal ring whose partials and decay depend on the metal.
export const meta = {
  title: "Coin Spin", kind: "foley", format: "sound", duration: 2.2, price: 1, author: "hollowbody", payout: "hollowbody@creators.oasis.example", kit: "Medieval Market", description: "A single coin dropped onto wood or stone that bounces, spins in an accelerating rattle and buzzes to rest; for market stalls, loot pickups and tavern tables.",
  tags: ["coin", "drop", "spin", "metal", "medieval", "market", "foley", "loot"],
};
export const params = { knobs: {
  metal: { type: "choice", label: "Coin metal", default: "silver", options: ["copper", "silver", "gold"] },
  surface: { type: "choice", label: "Surface", default: "wood", options: ["wood", "stone"] },
  height: { type: "range", label: "Drop height", default: 0.5, min: 0, max: 1, step: 0.01 },
  spin: { type: "range", label: "Spin length", default: 0.5, min: 0, max: 1, step: 0.01 },
  pitch: { type: "range", label: "Pitch", default: 0.5, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Room tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + params.knobs.metal.options.indexOf(p.metal) * 37 + (p.surface === "wood" ? 5 : 11));
  const out = new Float32Array(c.seconds(4.5, sr));
  const m = p.metal, stone = p.surface === "stone", h = p.height;
  const base = { copper: 1100, silver: 2000, gold: 1450 }[m] * Math.pow(2, (p.pitch - 0.5) * 1.2);
  const ratios = { copper: [1, 2.32, 3.7], silver: [1, 2.76, 5.4, 8.9], gold: [1, 1.004, 2.0, 3.01, 4.2] }[m];
  const tilt = { copper: 1.6, silver: 0.5, gold: 0.9 }[m], ringT = { copper: 0.04, silver: 0.2, gold: 0.1 }[m] * (stone ? 0.7 : 1);
  const coin = (t, a, f, d, thud, cap) => {
    const modes = ratios.map((q, i) => [base * f * q * (0.995 + r() * 0.01), 1 / (1 + i * tilt)]);
    const dec = Math.min(ringT * d, cap);
    c.mix(out, c.ring(modes, dec * 4, dec, sr), t, 0.5 * a, sr);
    c.mix(out, c.burst(r, 0.005, "hp", (stone ? 5000 : 2500) * (m === "copper" ? 0.7 : 1), 0.8, 0.0004, 0.002, sr), t, (stone ? 0.6 : 0.4) * a, sr);
    if (!thud) return;
    if (stone) c.mix(out, c.burst(r, 0.008, "bp", 3200, 2, 0.0005, 0.002, sr), t + 0.0005, 0.3 * a, sr);
    else c.mix(out, c.ring([[200 * (0.9 + r() * 0.2), 1], [520 * (0.95 + r() * 0.1), 0.4]], 0.08, 0.022, sr), t, 0.55 * a, sr);
  };
  let t = 0.01, a = 0.75 + 0.25 * h, gap = 0.07 + 0.1 * h;
  const bounces = 2 + Math.round(h * 3);
  for (let b = 0; b < bounces; b++) {
    coin(t, a, 1 + 0.006 * b, b === 0 ? 1 : 0.7, true, 1); t += gap * (0.9 + 0.2 * r()); gap *= 0.6; a *= 0.5;
  }
  t += 0.06;
  const q = 0.8 + 0.12 * p.spin;
  const total = Math.round(Math.log(0.005 / 0.085) / Math.log(q));
  let g = 0.085, k = 0;
  while (g > 0.005) {
    const u = k / total;
    coin(t, (0.14 + 0.3 * u) * (0.9 + 0.2 * r()), 0.94 + 0.12 * u, 0.5, k % 2 === 0, g * 1.3);
    t += g * (0.92 + 0.16 * r()); g *= q; k++;
  }
  for (let j = 0; j < 16; j++) {
    const f = 1 - j / 18;
    c.mix(out, c.burst(r, 0.003, "bp", 3500 + r() * 3500, 3, 0.0003, 0.001, sr), t, 0.28 * f * (0.6 + 0.4 * r()), sr);
    coin(t, 0.1 * f, 1.06, 0.3, false, 0.006);
    t += 0.0045;
  }
  t += 0.03; coin(t, 0.28, 1.0, 0.8, true, 1);
  const len = Math.min(out.length, c.seconds(t + (p.tail ? 1.1 : 0.25), sr));
  const res = out.slice(0, len);
  if (p.tail) {
    const rv = c.reverb(res.slice(), { size: stone ? 0.8 : 0.45, decay: stone ? 0.75 : 0.4, mixAmt: 1 }, sr);
    for (let i = 0; i < len; i++) res[i] = res[i] * 0.7 + rv[i] * 0.8;
  }
  c.finish(res, 0.85, 1.0);
  let pk = 0; for (let i = 0; i < len; i++) pk = Math.max(pk, Math.abs(res[i]));
  if (pk > 0) for (let i = 0; i < len; i++) res[i] *= 0.85 / pk;
  c.fade(res, 60, sr);
  return { samples: res };
}
