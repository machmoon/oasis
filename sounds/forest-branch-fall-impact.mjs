// Branch Fall: a heavy branch tears loose and hits the forest floor. The layers in order: a stick-slip creak (pulse train
// ringing wood-body resonances), a splintering crack (dense bright fibre grains under a sharp snap), a leafy swish while it
// falls, then a low ground thud with a wooden knock and a bounce, twig rattles with decaying bounce spacing, settling leaves,
// and an optional night-air tail.
export const meta = {
  title: "Falling Bough", kind: "impact", format: "sound", duration: 2.4, price: 3, author: "stormfront", payout: "stormfront@creators.oasis.example", kit: "Forest at Night", description: "A heavy branch creaks, splinters, swishes down through the leaves and slams into the forest floor; size, crack, thud weight, leaf debris and tail are knobs, and every seed is a different break.",
  tags: ["branch", "tree", "crack", "impact", "forest", "wood", "debris", "night"],
};
export const params = { knobs: {
  size: { type: "choice", label: "Branch size", default: "bough", options: ["limb", "bough", "trunk-section"] },
  crack: { type: "range", label: "Crack", default: 0.6, min: 0, max: 1, step: 0.01 },
  thud: { type: "range", label: "Thud weight", default: 0.6, min: 0, max: 1, step: 0.01 },
  debris: { type: "range", label: "Leaf debris", default: 0.5, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Air tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, idx = Math.max(0, params.knobs.size.options.indexOf(p.size)), r = c.rng(p.seed * 7919 + idx * 131 + 3);
  const S = [{ k: 1, fall: 0.42, f: 118 }, { k: 1.6, fall: 0.58, f: 78 }, { k: 2.4, fall: 0.78, f: 50 }][idx], sk = Math.sqrt(S.k);
  const groanDur = (0.16 + 0.15 * S.k) * (0.8 + 0.4 * r()), tSnap = groanDur, tImpact = tSnap + S.fall * (0.9 + 0.2 * r());
  const total = tImpact + 0.95 + (p.tail ? 0.55 : 0), out = new Float32Array(c.seconds(total, sr));
  const cr = p.crack, th = p.thud, db = p.debris;
  // creak: irregular accelerating stick-slip pulses ringing two wood-body resonances, pitch rising as fibres give
  {
    const n = c.seconds(groanDur, sr), x = new Float32Array(n), f1 = (430 + 80 * r()) / sk, f2 = (1150 + 250 * r()) / sk;
    const b1 = c.biquad("bp", f1, 9, sr), b2 = c.biquad("bp", f2, 7, sr), b3 = c.biquad("bp", f1 * 0.5, 5, sr);
    let next = 0, amp = 0, pk = 1e-9;
    for (let i = 0; i < n; i++) {
      const u = i / n; let e = 0;
      if (i >= next) { amp = 0.5 + r(); e = amp; next = i + Math.max(2, Math.round(sr / ((35 + 110 * u * u) / sk) * (0.6 + 0.8 * r()))); }
      const v = 1.2 * b1(e) + 0.7 * b2(e) + 0.8 * b3(e);
      x[i] = v * (0.15 + 0.85 * u * u) * Math.min(1, (n - i) / (0.004 * sr), i / (0.02 * sr));
      if (Math.abs(x[i]) > pk) pk = Math.abs(x[i]);
    }
    c.mix(out, x, 0.01, (0.18 + 0.4 * cr) / pk, sr);
  }
  // crack: dense splinter grains clustered after the snap, bright and irregular
  const grains = Math.round(20 + 240 * cr * sk);
  for (let g = 0; g < grains; g++) {
    const gt = tSnap - 0.005 + Math.pow(r(), 1.8) * 0.14 * sk;
    c.mix(out, c.burst(r, 0.003 + r() * 0.005, r() < 0.5 ? "hp" : "bp", 1800 + r() * 6500, 1.5 + r() * 3, 0.0003, 0.001 + r() * 0.002, sr), gt, (0.12 + 0.4 * r()) * (0.25 + 0.75 * cr), sr);
  }
  c.mix(out, c.burst(r, 0.02, "hp", 2200 + 2000 * cr, 0.8, 0.0004, 0.004, sr), tSnap, 0.35 + 0.75 * cr, sr);
  const wm = [[1100, 1], [2650, 0.5], [4300, 0.3]].map(([f, a]) => [f * (0.85 + 0.3 * r()) / Math.pow(S.k, 0.3), a]);
  c.mix(out, c.ring(wm, 0.12, 0.014, sr), tSnap + 0.001, 0.2 + 0.4 * cr, sr);
  c.mix(out, c.ring([[340 / sk * (0.9 + 0.2 * r()), 1], [610 / sk, 0.4]], 0.2, 0.03, sr), tSnap + 0.002, 0.15 + 0.25 * cr, sr);
  // fall: leafy swish swelling and brightening through the canopy, cut by the impact
  {
    const n = c.seconds(tImpact - tSnap, sr), x = c.pink(r, n), lp = c.onepole(sr), hp = c.biquad("hp", 400, 0.7, sr), edge = c.seconds(0.02, sr);
    let fl = 1, ft = 1;
    for (let i = 0; i < n; i++) {
      const u = i / n, e = u * u * (3 - 2 * u) * Math.min(1, (n - i) / edge);
      if (i % 200 === 0) ft = 0.45 + 0.55 * r();
      fl += (ft - fl) * 0.01;
      x[i] = hp(lp(x[i], 900 + 5200 * u)) * e * fl;
    }
    c.mix(out, x, tSnap, 0.3 + 0.9 * db, sr);
  }
  // impact: ground thud, wooden knock, one bounce
  const thudDecay = (0.07 + 0.22 * th) * sk;
  const body = c.ring([[S.f, 1], [S.f * 1.47, 0.55], [S.f * 2.3, 0.3], [S.f * 3.9, 0.15]].map(([f, a]) => [f * (0.94 + 0.12 * r()), a]), thudDecay * 7, thudDecay, sr);
  const atk = c.seconds(0.003, sr);
  for (let i = 0; i < atk && i < body.length; i++) body[i] *= i / atk;
  c.mix(out, body, tImpact, 0.45 + 0.85 * th, sr);
  c.mix(out, c.burst(r, 0.12 + 0.1 * th, "lp", 260 + 200 / S.k, 0.8, 0.002, 0.03 + 0.04 * th, sr), tImpact, 0.4 + 0.6 * th, sr);
  c.mix(out, c.ring([[260 / Math.pow(S.k, 0.4) * (0.9 + 0.2 * r()), 1], [590 / Math.pow(S.k, 0.4), 0.5], [1300, 0.2]], 0.25, 0.035, sr), tImpact + 0.001, 0.4, sr);
  c.mix(out, c.burst(r, 0.03, "bp", 1500, 0.9, 0.0008, 0.008, sr), tImpact, 0.35, sr);
  const tB = tImpact + 0.1 + 0.06 * r() * S.k;
  c.mix(out, c.ring([[S.f * 1.05, 1], [S.f * 1.6, 0.4], [300, 0.3]], thudDecay * 5, thudDecay * 0.6, sr), tB, 0.15 + 0.35 * th, sr);
  c.mix(out, c.burst(r, 0.04, "lp", 900, 0.8, 0.001, 0.01, sr), tB, 0.2, sr);
  // twigs: sparse knocks with shrinking bounce gaps
  let tw = tImpact + 0.03, gap = 0.08 + 0.05 * r();
  const twigs = Math.round(3 + 18 * db);
  for (let k = 0; k < twigs && tw < tImpact + 0.85; k++) {
    const f = 800 + r() * 1800;
    c.mix(out, c.ring([[f, 1], [f * (2.3 + 0.4 * r()), 0.4]], 0.06, 0.006 + 0.006 * r(), sr), tw, (0.08 + 0.18 * r()) * (0.4 + 0.6 * db), sr);
    c.mix(out, c.burst(r, 0.006, "bp", 2500 + r() * 2500, 2, 0.0004, 0.0015, sr), tw, 0.1 * (0.5 + r()), sr);
    tw += gap * (0.6 + 0.8 * r()); gap *= 0.82;
  }
  // leaves: soft rustle grains settling, density decaying after the hit
  const leaves = Math.round(15 + 260 * db);
  for (let k = 0; k < leaves; k++) {
    const lt = tImpact + Math.pow(r(), 2.2) * 0.85;
    c.mix(out, c.burst(r, 0.015 + r() * 0.03, "bp", 2200 + r() * 5000, 1 + r(), 0.002 + r() * 0.004, 0.006 + r() * 0.015, sr), lt, (0.03 + 0.08 * r()) * (0.3 + 0.7 * db), sr);
  }
  if (p.tail) c.reverb(out, { size: 0.75, decay: 0.6, mixAmt: 0.3 }, sr);
  c.finish(out, 0.9, 1.15);
  c.fade(out, p.tail ? 120 : 60, sr);
  return { samples: out };
}
