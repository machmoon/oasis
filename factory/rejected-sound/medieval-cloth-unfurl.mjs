// Cloth unfurl: a merchant unrolls a bolt across a stall. Layers: a continuous friction bed (a lowpass that follows irregular pull gestures plus a fast fibre flicker), crinkle clusters of tiny bandpassed grains placed where the pull is strongest, a taut flap at the end (a downward-sweeping noise puff with decaying flutter and a faint air body), and an optional drape tail of soft folds.
export const meta = {
  title: "Cloth Unfurl", kind: "foley", format: "sound", duration: 2.4, price: 2, author: "hollowbody", payout: "hollowbody@creators.oasis.example", kit: "Medieval Market", description: "A merchant unrolls a bolt of linen, wool or silk across a stall, ending in a taut flap; used for market scenes and trading interactions.",
  tags: ["cloth", "fabric", "unroll", "market", "medieval", "foley", "flap", "merchant"],
};
export const params = { knobs: {
  fabric: { type: "choice", label: "Fabric", default: "linen", options: ["linen", "wool", "silk"] },
  length: { type: "range", label: "Length", default: 0.5, min: 0, max: 1, step: 0.01 },
  snap: { type: "range", label: "Snap force", default: 0.5, min: 0, max: 1, step: 0.01 },
  density: { type: "range", label: "Rustle density", default: 0.5, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Settle tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + params.knobs.fabric.options.indexOf(p.fabric) * 57 + 11);
  const roll = 0.8 + 1.0 * p.length, snapAt = roll + 0.08, out = new Float32Array(c.seconds(snapAt + 0.65, sr));
  const F = { linen: { lo: 1200, hi: 4200, bed: 0.55, gr: 3200, gq: 3, gn: 1.0, gl: 0.012, sf: 2600, sd: 0.05, sw: 2, hpf: 600 },
    wool: { lo: 300, hi: 1300, bed: 1.0, gr: 1000, gq: 1.2, gn: 0.45, gl: 0.025, sf: 1000, sd: 0.07, sw: 0, hpf: 120 },
    silk: { lo: 2500, hi: 7500, bed: 0.3, gr: 6000, gq: 5, gn: 1.2, gl: 0.006, sf: 5000, sd: 0.04, sw: 7, hpf: 1200 } }[p.fabric];
  const n = c.seconds(roll, sr), x = p.fabric === "wool" ? c.pink(r, n) : c.noise(r, n), lp = c.onepole(sr), hp = c.biquad("hp", F.hpf, 0.7, sr), ge = new Float32Array(n);
  let g = 0.5, gt = 0.6, gnx = 0, fl = 1, ft = 1, fnx = 0;
  for (let i = 0; i < n; i++) {
    if (i >= gnx) { gt = 0.4 + 0.6 * r(); gnx = i + c.seconds(0.08 + 0.2 * r(), sr); }
    if (i >= fnx) { ft = r() < 0.3 ? 0.3 + 0.2 * r() : 0.7 + 0.5 * r(); fnx = i + c.seconds(0.003 + 0.012 * r(), sr); }
    g += (gt - g) * 25 / sr; fl += (ft - fl) * 0.25;
    const t = i / n, sp = g * Math.min(1, i / (0.1 * sr)) * (0.85 + 0.2 * t);
    ge[i] = sp;
    x[i] = hp(lp(x[i], F.lo + (F.hi - F.lo) * sp * (0.5 + 0.5 * fl))) * (0.25 + 0.75 * sp) * (0.55 + 0.6 * fl);
  }
  c.mix(out, x, 0.04, F.bed * (0.7 + 0.8 * p.density), sr);
  const clusters = Math.round((10 + 45 * p.density) * roll * F.gn);
  for (let k = 0; k < clusters; k++) {
    let u = r(), tries = 0;
    while (r() > ge[Math.min(n - 1, Math.floor(u * n))] && tries++ < 6) u = r();
    const e = ge[Math.min(n - 1, Math.floor(u * n))], f0 = F.gr * (0.5 + r()), cnt = 2 + Math.floor(r() * 5);
    let t = 0.04 + u * (roll - 0.05);
    for (let j = 0; j < cnt; j++, t += 0.003 + 0.022 * r())
      c.mix(out, c.burst(r, F.gl * (0.4 + 1.6 * r()), "bp", f0 * (0.85 + 0.3 * r()), F.gq * (0.6 + 0.8 * r()), 0.0008, 0.002 + F.gl * r(), sr), t, (0.08 + 0.45 * r() * r()) * (0.3 + 0.9 * e), sr);
  }
  for (let k = 0; k < F.sw * roll; k++) {
    const u = r();
    c.mix(out, c.burst(r, 0.05 + 0.08 * r(), "bp", F.gr * (0.5 + 0.4 * r()), 0.8, 0.02, 0.04, sr), 0.05 + u * (roll - 0.1), 0.12 * (0.3 + ge[Math.floor(u * (n - 1))]), sr);
  }
  const s = p.snap, m = c.seconds(0.32, sr), fx = c.noise(r, m), fl2 = c.onepole(sr), fh = c.biquad("hp", F.hpf * 0.5, 0.7, sr), fr = 30 + 25 * r(), fph = r() * 6.28;
  for (let i = 0; i < m; i++) {
    const t = i / sr, mod = 0.65 + 0.35 * Math.sin(c.TAU * fr * t + fph);
    fx[i] = fh(fl2(fx[i], F.sf * (0.3 + 1.6 * Math.exp(-t / 0.045)))) * Math.exp(-t / (F.sd + 0.05 * s)) * Math.min(1, i / (0.0015 * sr)) * (t < 0.02 ? 1 : mod);
  }
  c.mix(out, fx, snapAt, 0.15 + 0.55 * s, sr);
  c.mix(out, c.burst(r, 0.005, "hp", F.sf * 1.2, 0.8, 0.0006, 0.002, sr), snapAt, 0.05 + 0.25 * s, sr);
  c.mix(out, c.burst(r, 0.06, "lp", 260 + 120 * s, 0.7, 0.005, 0.02, sr), snapAt + 0.004, (p.fabric === "silk" ? 0.04 : 0.1) * (0.3 + s), sr);
  if (p.tail) {
    const k = c.seconds(0.6, sr), w = c.noise(r, k), tb = c.biquad("bp", F.lo * 0.9, 0.9, sr);
    for (let i = 0; i < k; i++) w[i] = tb(w[i]) * Math.exp(-i / sr / 0.2) * Math.min(1, i / (0.03 * sr));
    c.mix(out, w, snapAt + 0.07, 0.5 * F.bed, sr);
    for (let j = 0; j < 8; j++) c.mix(out, c.burst(r, F.gl * 3, "bp", F.gr * (0.4 + 0.4 * r()), F.gq * 0.6, 0.002, 0.01, sr), snapAt + 0.1 + j * 0.05 + 0.03 * r(), 0.22 * Math.exp(-j * 0.3), sr);
  }
  c.fade(c.finish(out, 0.85, 1.1), 15, sr);
  return { samples: out };
}
