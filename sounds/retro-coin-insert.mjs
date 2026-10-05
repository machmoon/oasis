// Coin insert: a metal coin clinks off the slot lip, rattles down a hollow chute in shrinking bounces, lands, spins down to rest and trips the acceptor lever. Each hit is a contact click plus bright disc partials over a quiet chute knock; a light cabinet thump and an optional room tail sit underneath.
export const meta = {
  title: "Coin Slot Drop", kind: "foley", format: "sound", duration: 1.2, price: 3, author: "quietmachine", payout: "quietmachine@creators.oasis.example", kit: "Retro Arcade", description: "A metal coin dropped into an arcade cabinet slot, rattling down the chute and tripping the coin mech. Coin size, rattle, chute depth and click are knobs, so every credit sounds like a new take.",
  tags: ["coin", "arcade", "insert", "slot", "metal", "rattle", "credit", "cabinet"],
};
export const params = { knobs: {
  size: { type: "choice", label: "Coin size", default: "medium", options: ["small", "medium", "large"] },
  rattle: { type: "range", label: "Rattle", default: 0.5, min: 0, max: 1, step: 0.01 },
  depth: { type: "range", label: "Chute depth", default: 0.5, min: 0, max: 1, step: 0.01 },
  click: { type: "range", label: "Mech click", default: 0.6, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Reverb tail", default: false },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, si = params.knobs.size.options.indexOf(p.size), r = c.rng(p.seed * 7907 + si * 211 + 13);
  const S = [{ f: 4900, d: 0.032, br: 8500, kn: 0.07 }, { f: 3200, d: 0.055, br: 6000, kn: 0.1 }, { f: 2100, d: 0.085, br: 4000, kn: 0.14 }][si];
  const ratios = [1, 1.47, 2.09, 2.56, 3.18, 3.9], nyq = 0.45 * sr, chuteF = (620 - 260 * p.depth) * (0.96 + 0.08 * r());
  const t0 = 0.002 + 0.002 * r(), travel = (0.2 + 0.5 * p.depth) * (0.9 + 0.2 * r()), tl = t0 + 0.03 + travel;
  const n = Math.round(1 + 14 * p.rattle), gaps = [];
  let gs = 0;
  for (let k = 0; k < n; k++) { const g = Math.pow(0.86, k) * (0.6 + 0.8 * r()); gaps.push(g); gs += g; }
  const sn = Math.round(3 + 8 * p.rattle), settle = [];
  let st = tl, sg = 0.04 + 0.015 * r();
  for (let k = 0; k < sn; k++) { st += sg; settle.push(st); sg *= 0.74 + 0.08 * r(); }
  const tc = tl + 0.07 + 0.03 * r(), tr = tc + 0.05 + 0.025 * r(), ringLen = S.d * 6 + 0.1;
  const end = Math.max(tl + ringLen, st + 0.1, p.click > 0 ? tr + 0.08 : 0) + 0.1;
  const out = new Float32Array(c.seconds(end + (p.tail ? 0.6 + 0.3 * p.depth : 0), sr));
  const hit = (t, lv, len, dec, dark) => {
    const edge = r() < 0.5;
    c.mix(out, c.burst(r, 0.004, "hp", S.br * (1 - 0.35 * dark) * (0.85 + 0.3 * r()), 0.8, 0.0003, 0.0007 + 0.0006 * r(), sr), t, (edge ? 0.6 : 0.4) * lv, sr);
    const m = ratios.map((q, j) => [S.f * q * (0.97 + 0.06 * r()), j ? (0.3 + 0.5 * r()) * (1 - 0.5 * dark) * (edge ? 1.3 : 0.8) / (1 + 0.35 * j) : 1]).filter(([f]) => f < nyq);
    const b = c.ring(m, len, dec * (0.8 + 0.4 * r()), sr), a = Math.max(1, Math.round(0.0006 * sr));
    for (let i = 0; i < a && i < b.length; i++) b[i] *= i / a;
    c.mix(out, b, t + 0.0004, 0.6 * lv, sr);
    c.mix(out, c.ring([[chuteF * (0.95 + 0.1 * r()), 1], [chuteF * 2.27, 0.4]], 0.06, 0.008 + 0.014 * p.depth, sr), t, S.kn * lv, sr);
  };
  hit(t0, 1, 0.25, S.d * 1.2, 0);
  hit(t0 + 0.011 + 0.008 * r(), 0.45 + 0.2 * r(), 0.12, S.d * 0.6, 0.05);
  let t = t0 + 0.03;
  for (let k = 0; k < n; k++) {
    t += gaps[k] / gs * travel * 0.92;
    hit(t, (0.35 + 0.45 * p.rattle) * (0.55 + 0.45 * r()) * (1 - 0.3 * k / n), 0.1, S.d * 0.5, p.depth * (t - t0) / travel);
  }
  hit(tl, 0.85, ringLen, S.d * 0.9, 0.5 * p.depth);
  c.mix(out, c.ring([[(110 + 70 * (1 - p.depth)) * (0.95 + 0.1 * r()), 1], [240 - 60 * p.depth, 0.4]], 0.2, 0.025 + 0.04 * p.depth, sr), tl + 0.001, 0.14 + 0.14 * p.depth, sr);
  settle.forEach((s, k) => hit(s, (0.14 + 0.3 * p.rattle) * (1 - 0.8 * k / sn), 0.06, S.d * 0.35, 0.4 * p.depth));
  if (p.click > 0) {
    const k = p.click;
    c.mix(out, c.burst(r, 0.006, "hp", 3000 + 1500 * r(), 0.9, 0.0003, 0.0014, sr), tc, 0.85 * k, sr);
    c.mix(out, c.ring([[2700 * (0.97 + 0.06 * r()), 1], [5600 * (0.97 + 0.06 * r()), 0.5]].filter(([f]) => f < nyq), 0.04, 0.005, sr), tc + 0.0003, 0.4 * k, sr);
    c.mix(out, c.burst(r, 0.02, "lp", 420, 0.9, 0.0015, 0.006, sr), tc + 0.001, 0.3 * k, sr);
    c.mix(out, c.burst(r, 0.005, "hp", 3600 + 1200 * r(), 0.9, 0.0003, 0.0011, sr), tr, 0.55 * k, sr);
    c.mix(out, c.ring([[3300 * (0.97 + 0.06 * r()), 1]], 0.03, 0.004, sr), tr + 0.0003, 0.25 * k, sr);
  }
  let res = out;
  if (p.tail) res = c.reverb(out, { size: 0.45 + 0.35 * p.depth, decay: 0.45 + 0.25 * p.depth, mixAmt: 0.3 }, sr) || out;
  c.finish(res, 0.9);
  const fl = Math.min(res.length, c.seconds(0.08, sr));
  for (let i = 0; i < fl; i++) res[res.length - 1 - i] *= i / fl;
  c.fade(res, 3, sr);
  return { samples: res };
}
