// Cleaver strike in two readable events: blade bite and flesh squish open into a bright, irregular bone fracture, then the edge lands
// in the block (dull damped fibrous thump for end-grain, bright hollow ringing slap for plastic); the tail adds blade quiver and room.
export const meta = {
  title: "Cleaver Through Bone", kind: "impact", format: "sound", duration: 0.3, price: 3, author: "foleyroom", payout: "foleyroom@creators.oasis.example", kit: "Kitchen", description: "A heavy cleaver chopping through flesh and bone into a thick end-grain or plastic block, for cooking scenes, butcher foley and brutal game hits.",
  tags: ["cleaver", "chop", "bone", "kitchen", "butcher", "impact", "crunch", "foley"],
};
export const params = { knobs: {
  block: { type: "choice", label: "Block", default: "end-grain wood", options: ["end-grain wood", "plastic"] },
  force: { type: "range", label: "Force", default: 0.7, min: 0, max: 1, step: 0.01 },
  crack: { type: "range", label: "Bone crack", default: 0.6, min: 0, max: 1, step: 0.01 },
  thud: { type: "range", label: "Low thud", default: 0.6, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Ring-out tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const wood = p.block === "end-grain wood", sr = c.sr, r = c.rng(p.seed * 6271 + (wood ? 0 : 911) + 3);
  const f = p.force, k = p.crack, th = p.thud;
  const tBone = 0.006 + 0.006 * r();
  const tBlock = tBone + (0.018 + 0.032 * k) * (1.25 - 0.5 * f) * (0.8 + 0.4 * r());
  const tau = wood ? 0.018 + 0.03 * th : 0.035 + 0.045 * th;
  const dry = tBlock + 4.2 * tau + 0.012;
  const out = new Float32Array(c.seconds(dry + (p.tail ? 0.2 : 0), sr));
  c.mix(out, c.burst(r, 0.006, "hp", 2600 + 2400 * f, 0.7, 0.0005, 0.0015 + 0.001 * f, sr), 0.002, 0.25 + 0.4 * f, sr);
  const j = 0.93 + 0.14 * r();
  c.mix(out, c.ring([[2370 * j, 1], [4110 * j * (0.96 + 0.08 * r()), 0.5], [6630 * j, 0.3]], 0.02, 0.0018 + 0.0015 * r(), sr), 0.0025, 0.05 + 0.05 * f, sr);
  {
    const n = c.seconds(tBlock + 0.01, sr), x = c.noise(r, n), lp = c.onepole(sr), hp = c.biquad("hp", 300, 0.7, sr);
    const a = c.seconds(0.0015, sr), dk = Math.exp(-1 / ((0.008 + 0.01 * f) * sr)), cut = Math.exp(-1 / (0.012 * sr));
    let e = 1, fc = 2600 + 900 * r(), g = 1, hold = 0;
    for (let i = 0; i < n; i++) {
      if (--hold <= 0) { hold = Math.round(sr * (0.001 + 0.004 * r())); g = 0.2 + 0.8 * r(); }
      fc = 500 + (fc - 500) * cut; e *= dk;
      x[i] = hp(lp(x[i], fc)) * g * e * Math.min(1, i / a);
    }
    c.mix(out, x, 0.002, 0.35 + 0.25 * f, sr);
  }
  if (k > 0.01) {
    c.mix(out, c.burst(r, 0.01, "hp", 1100 + 600 * r(), 0.7, 0.0004, 0.0018 + 0.0015 * k, sr), tBone, 0.5 + 0.6 * k, sr);
    const clusters = 2 + Math.floor(r() * 3) + Math.round(2 * k * f), span = tBlock - tBone;
    for (let q = 0; q < clusters; q++) {
      const t0 = tBone + (q === 0 ? 0 : r() * span * 0.95), cg = q === 0 ? 1 : 0.35 + 0.65 * r();
      const grains = Math.round((3 + 13 * k) * (0.6 + 0.8 * r()) * (0.5 + 0.5 * f));
      for (let g = 0; g < grains; g++) {
        const t = t0 + Math.pow(r(), 2) * (0.003 + 0.008 * k);
        c.mix(out, c.burst(r, 0.002 + r() * 0.004, "bp", 1400 + r() * 5600, 0.6 + r(), 0.0003, 0.0004 + r() * 0.0014, sr), t, cg * (0.25 + 0.75 * r()) * (0.3 + 0.7 * k), sr);
      }
      const sm = 1200 + r() * 2200;
      c.mix(out, c.ring([[sm, 1], [sm * (2.3 + r()), 0.5], [sm * (3.9 + 1.4 * r()), 0.25]], 0.015, 0.0015 + 0.0015 * r(), sr), t0, cg * 0.25 * k, sr);
    }
    const spl = Math.round(2 + 10 * k * (0.5 + r()));
    for (let s = 0; s < spl; s++) {
      const u = r();
      c.mix(out, c.burst(r, 0.003 + r() * 0.003, "bp", 1800 + r() * 4500, 0.8 + r(), 0.0003, 0.0007 + r() * 0.001, sr), tBlock + 0.003 + u * u * 0.05, (1 - u) * (0.1 + 0.25 * r()) * k, sr);
    }
  }
  const sz = (1 - 0.1 * f) * (0.94 + 0.12 * r()), tg = (0.25 + 0.75 * th) * (0.4 + 0.7 * f), m = () => 0.92 + 0.16 * r();
  {
    const n = c.seconds(4.5 * tau + 0.01, sr), x = c.noise(r, n), lp = c.onepole(sr), lp2 = c.onepole(sr), bp = c.biquad("bp", 430 * sz * m(), 3, sr);
    const a = c.seconds(0.0015, sr), dk = Math.exp(-1 / (tau * sr)), cut = Math.exp(-1 / ((wood ? 0.008 : 0.02) * sr));
    const lo = wood ? 90 : 300; let e = 1, fc = (wood ? 800 : 2600) * (0.6 + 0.4 * f);
    for (let i = 0; i < n; i++) {
      fc = lo + (fc - lo) * cut; e *= dk;
      const s = lp2(lp(x[i], fc), fc * 1.5);
      x[i] = (wood ? s : 0.5 * s + 1.6 * bp(x[i])) * e * Math.min(1, i / a);
    }
    c.mix(out, x, tBlock, (wood ? 2.4 : 1.6) * tg, sr);
  }
  if (wood) {
    c.mix(out, c.ring([[92 * sz * m(), 1], [163 * sz * m(), 0.6], [297 * sz * m(), 0.35], [511 * sz * m(), 0.2]], 0.05, 0.004 + 0.004 * th, sr), tBlock + 0.0008, 0.45 * tg, sr);
    const fib = Math.round(5 + 9 * f);
    for (let g = 0; g < fib; g++) c.mix(out, c.burst(r, 0.004 + r() * 0.004, "bp", 450 + r() * 1100, 0.8, 0.0006, 0.0015 + r() * 0.002, sr), tBlock + r() * r() * 0.018, (0.2 + 0.3 * r()) * (0.5 + 0.5 * f), sr);
    c.mix(out, c.burst(r, 0.12, "lp", 130, 0.7, 0.002, 0.02 + 0.03 * th, sr), tBlock, 1.4 * th * (0.5 + 0.5 * f), sr);
  } else {
    c.mix(out, c.ring([[262 * sz * m(), 1], [693 * sz * m(), 0.8], [1490 * sz * m(), 0.55], [2910 * sz * m(), 0.3]], 4 * tau, 0.45 * tau, sr), tBlock + 0.0005, 0.6 * tg, sr);
    c.mix(out, c.burst(r, 0.008, "bp", 3200 + 1200 * r(), 1.2, 0.0003, 0.0013, sr), tBlock, 0.7 + 0.4 * f, sr);
    c.mix(out, c.burst(r, 0.08, "lp", 230, 0.7, 0.002, 0.012 + 0.015 * th, sr), tBlock, 0.6 * th * (0.5 + 0.5 * f), sr);
  }
  if (p.tail) {
    const q = 0.95 + 0.1 * r();
    c.mix(out, c.ring([[610 * q, 1], [1430 * q * m(), 0.6], [2380 * q * m(), 0.35], [3720 * q * m(), 0.2]], 0.25, 0.045 + 0.02 * f, sr), tBlock + 0.002, 0.05 + 0.07 * f, sr);
    c.mix(out, c.burst(r, 0.26, "lp", wood ? 450 : 700, 0.7, 0.008, 0.06, sr), tBlock + 0.006, 0.07 + 0.06 * f, sr);
    c.reverb(out, { size: 0.35, decay: 0.5, mixAmt: 0.32 }, sr);
  }
  c.filter(out, c.biquad("lp", 5000 + 10000 * f, 0.7, sr));
  c.finish(out, 0.9, 1.3);
  c.gain(out, 0.6 + 0.4 * f);
  c.fade(out, 4, sr);
  return { samples: out };
}
