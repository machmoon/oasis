// Coins on a wooden table: each strike is a bright click, short damped metal modes and a wooden table knock. Bounces shrink with each metal's restitution. One to three coins then spin out on their own accelerating chatter curves, which tighten to a buzz and stop with a flat clack. Table damping sets how fast the metal dies.
export const meta = {
  title: "Tavern Coin Toss", kind: "foley", format: "sound", duration: 1.6, price: 2, author: "hollowbody", payout: "hollowbody@creators.oasis.example", kit: "Wooden Tavern", description: "A handful of copper, silver or gold coins tossed onto a wooden tavern table. They bounce, wobble faster and faster, then clack flat. Use it for shops, gambling, payment and loot pickups.",
  tags: ["coins", "money", "table", "wood", "metal", "tavern", "loot", "foley"],
};
export const params = { knobs: {
  metal: { type: "choice", label: "Metal", default: "silver", options: ["copper", "silver", "gold"] },
  count: { type: "range", label: "Coin count", default: 0.4, min: 0, max: 1, step: 0.01 },
  force: { type: "range", label: "Toss force", default: 0.5, min: 0, max: 1, step: 0.01 },
  spin: { type: "range", label: "Spin-out length", default: 0.5, min: 0, max: 1, step: 0.01 },
  damping: { type: "range", label: "Table damping", default: 0.5, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Ring & room tail", default: false },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 7349 + params.knobs.metal.options.indexOf(p.metal) * 97 + 11);
  const M = {
    copper: { f: 3100, m2: 1.52, d: 0.03, u: 0.008, hp: 2500, atk: 0.0006, th: 0.9, e: 0.5, sc: 2600, ns: 1.0, dt: 0.07, sm: 0.8 },
    silver: { f: 4700, m2: 1.47, d: 0.07, u: 0.025, hp: 4000, atk: 0.0003, th: 0.6, e: 0.62, sc: 4200, ns: 0.6, dt: 0.055, sm: 1.0 },
    gold: { f: 3600, m2: 1.39, d: 0.045, u: 0.012, hp: 3000, atk: 0.0009, th: 0.8, e: 0.42, sc: 3000, ns: 0.8, dt: 0.085, sm: 0.9 },
  }[p.metal];
  const F = p.force, D = p.damping, dm = 1.6 - 1.3 * D, tf = p.tail ? 2.2 : 1, coins = 1 + Math.round(p.count * 9);
  const ny = sr * 0.45, cut = m => m.filter(x => x[0] < ny);
  const tm = [[118 * (0.93 + 0.14 * r()), 1], [262 * (0.94 + 0.12 * r()), 0.6], [455 * (0.95 + 0.1 * r()), 0.4], [790, 0.2]];
  const ev = [], coinF = [], coinLast = [];
  for (let k = 0; k < coins; k++) {
    coinF.push(M.f * (0.85 + 0.3 * r()));
    let t = 0.006 + Math.pow(r(), 1.4) * (0.03 + 0.06 * (coins / 10) + 0.06 * F);
    let a = 0.6 + 0.4 * r(), gap = (0.03 + 0.11 * F) * (M.e + 0.4) * (0.7 + 0.6 * r()), lt = t;
    const b = 1 + Math.round(F * 5 * M.e + r() * 1.5);
    for (let j = 0; j < b; j++) { ev.push([t, k, a]); lt = t; t += gap; gap *= M.e * (0.85 + 0.3 * r()); a *= M.e * (0.8 + 0.3 * r()); }
    coinLast.push(lt);
  }
  const order = coinLast.map((t, k) => k).sort((a, b) => coinLast[b] - coinLast[a]);
  const ns = Math.min(coins, 1 + Math.round(p.count * 2)), L = (0.25 + 1.4 * p.spin) * M.sm, sp = [];
  let end = 0;
  for (let j = 0; j < ns; j++) {
    const k = order[j], ts = coinLast[k] + 0.015 + 0.04 * r(), Ls = L * (j === 0 ? 1 : 0.45 + 0.4 * r());
    sp.push({ k, ts, Ls, dt0: M.dt * (0.8 + 0.4 * r()), kx: 0.9 + 0.5 * r(), g: j === 0 ? 1 : 0.6 + 0.2 * r() });
    end = Math.max(end, ts + Ls);
  }
  const total = end + 0.04 + M.d * dm * tf * 0.7 * 5 + (p.tail ? 0.35 : 0.02), out = new Float32Array(c.seconds(total, sr));
  const hit = (t, f, a, br, rl) => {
    const d = M.d * dm * rl, u = M.u * dm * rl;
    c.mix(out, c.ring(cut([[f, 1], [f * M.m2 * (0.99 + 0.02 * r()), 0.6]]), d * 5 + 0.01, d, sr), t + 0.0005, 0.3 * a, sr);
    c.mix(out, c.ring(cut([[f * 2.09, 0.5], [f * 2.61 * (0.99 + 0.02 * r()), 0.4], [f * 3.4, 0.25]]), u * 6 + 0.01, u, sr), t + 0.0003, 0.3 * a, sr);
    c.mix(out, c.burst(r, 0.005, "hp", M.hp + 3500 * br, 0.7, M.atk, 0.001, sr), t, 0.55 * a, sr);
    c.mix(out, c.ring(tm.map(([f0, g]) => [f0 * (0.98 + 0.04 * r()), g]), 0.1, 0.018 + 0.012 * (1 - D), sr), t + 0.0008, (0.4 + 0.3 * F) * a * M.th, sr);
    c.mix(out, c.burst(r, 0.03, "lp", 600 + 900 * br * (1 - 0.5 * D), 0.8, 0.0008, 0.006, sr), t, 0.35 * a * M.th, sr);
  };
  for (const [t, k, a] of ev) hit(t, coinF[k], a * (0.45 + 0.55 * F), F * (0.4 + 0.6 * a), 1);
  const cl = Math.min(M.d * dm, 0.04) * 0.35 + 0.002;
  for (const s of sp) {
    const fs = coinF[s.k], nL = c.seconds(s.Ls, sr), wh = c.noise(r, nL), bpf = c.biquad("bp", M.sc * (0.9 + 0.2 * r()), 1.2, sr);
    for (let i = 0; i < nL; i++) { const u = i / nL; wh[i] = bpf(wh[i]) * u * u * Math.min(1, (nL - i) / (0.004 * sr), i / (0.01 * sr)) * 0.1 * s.g * M.ns; }
    c.mix(out, wh, s.ts, 1, sr);
    let t = 0;
    while (t < s.Ls) {
      const u = t / s.Ls, a = s.g * (0.35 + 0.5 * u) * (0.8 + 0.4 * r()), f = fs * (0.99 + 0.02 * r()) * (1 + 0.02 * u);
      c.mix(out, c.ring(cut([[f, 1], [f * M.m2, 0.4], [f * 2.61, 0.25]]), cl * 5, cl, sr), s.ts + t + 0.0004, 0.16 * a, sr);
      c.mix(out, c.burst(r, 0.004, "hp", M.hp + 1500 * u + 1500 * r(), 0.7, M.atk, 0.0008, sr), s.ts + t, 0.2 * a, sr);
      c.mix(out, c.ring([[tm[0][0] * (0.97 + 0.06 * r()), 1], [tm[2][0], 0.5]], 0.04, 0.008, sr), s.ts + t + 0.0006, 0.15 * a * M.th, sr);
      t += Math.max(0.006, s.dt0 * Math.pow(Math.max(0.03, 1 - u), s.kx) * (0.88 + 0.24 * r()));
    }
    const te = s.ts + s.Ls + 0.003;
    hit(te, fs, 0.4 * s.g, 0.35, tf * 0.6);
    if (r() < 0.5) hit(te + 0.01 + 0.01 * r(), fs * 1.003, 0.1 * s.g, 0.1, 0.4);
  }
  let o = out;
  if (p.tail) o = c.reverb(out, { size: 0.35, decay: 0.55, mixAmt: 0.16 }, sr) || out;
  c.finish(o, 0.9, 1.1);
  c.fade(o, 8, sr);
  return { samples: o };
}
