// Puddle Step: one footstep into a shallow city puddle. A short shoe-specific sole contact (damped noise thump plus click) leads; then the water: a slap, an irregular spray sheet, a high cavity plop, a dense cluster of chirping bubble droplets, wet grit, and an optional drip-back tail in a small wet space.
export const meta = {
  title: "Puddle Step", kind: "foley", format: "sound", duration: 0.5, price: 1, author: "foleyroom", payout: "foleyroom@creators.oasis.example", kit: "Rainy City Street", description: "A single footstep landing in a shallow street puddle, with shoe type, splash depth, weight, grit, pitch and a drip-back tail as knobs, for rainy night city scenes.",
  tags: ["footstep", "puddle", "splash", "rain", "wet", "foley", "street", "shoe"],
};
export const params = { knobs: {
  shoe: { type: "choice", label: "Shoe", default: "boot", options: ["sneaker", "boot", "heel", "leather"] },
  depth: { type: "range", label: "Splash depth", default: 0.5, min: 0, max: 1, step: 0.01 },
  weight: { type: "range", label: "Weight", default: 0.5, min: 0, max: 1, step: 0.01 },
  grit: { type: "range", label: "Grit", default: 0.3, min: 0, max: 1, step: 0.01 },
  pitch: { type: "range", label: "Pitch", default: 1, min: 0.6, max: 1.6, step: 0.01 },
  tail: { type: "toggle", label: "Drip-back tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, si = params.knobs.shoe.options.indexOf(p.shoe), r = c.rng(p.seed * 7919 + si * 131 + 29);
  const w = p.weight, d = p.depth, g = p.grit, pk = p.pitch, ny = sr * 0.45, hs = sr / 22050;
  const S = {
    sneaker: { steps: [[0, 1]], body: 95, bdec: 0.012, thump: 0.8, slap: ["lp", 900, 0.8, 0.004, 0.014, 1], wet: [600, 1.3, 0.8, 1.2, 1.25], gap: 0.012 },
    boot: { steps: [[0, 1], [0.04, 0.7]], body: 70, bdec: 0.018, thump: 1, slap: ["bp", 1700, 1, 0.0012, 0.006, 0.8], wet: [750, 1.2, 0.9, 1.1, 1.3], gap: 0.008 },
    heel: { steps: [[0, 1], [0.085, 0.6]], body: 190, bdec: 0.006, thump: 0.3, slap: ["bp", 5200, 3, 0.0003, 0.0012, 1], ring: [[3300, 1], [6200, 0.5], [8900, 0.25]], wet: [1600, 0.5, 1.5, 0.5, 0.6], gap: 0.004 },
    leather: { steps: [[0, 1], [0.05, 0.8]], body: 120, bdec: 0.01, thump: 0.55, slap: ["bp", 2600, 1.1, 0.0006, 0.004, 0.9], wet: [1000, 0.9, 1.1, 0.9, 1.0], gap: 0.007 },
  }[p.shoe];
  const W = S.wet, N = c.seconds(0.3 + 0.35 * d + (p.tail ? 0.35 : 0), sr);
  const dry = new Float32Array(N), wat = new Float32Array(N);
  const drop = (buf, t, f, dd, rise, a) => {
    const i0 = Math.round(t * sr), n = Math.max(8, Math.round(dd * sr)), k = Math.pow(rise, 1 / n), dec = Math.exp(-6 / n), at = 0.0008 * sr;
    let ph = 0, e = a, fq = Math.min(f, ny);
    for (let i = 0; i < n && i0 + i < buf.length; i++) { ph += c.TAU * fq / sr; fq = Math.min(fq * k, ny); buf[i0 + i] += Math.sin(ph) * e * Math.min(1, i / at); e *= dec; }
  };
  const flick = (buf, lo, hi) => { let f = 1, ft = 1, nx = 0; for (let i = 0; i < buf.length; i++) { if (i >= nx) { ft = lo + r() * (1 - lo); nx = i + Math.round((hi * 0.15 + r() * hi) * hs); } f += (ft - f) * 0.05; buf[i] *= f; } };
  const t0 = 0.004, sl = S.slap;
  S.steps.forEach(([st, amp], idx) => {
    const t = t0 + st * (1.1 - 0.3 * w) * (0.9 + 0.2 * r());
    const f = S.body * (1.25 - 0.55 * w) * Math.sqrt(pk) * (0.96 + 0.08 * r()), dk = S.bdec * (0.5 + 0.8 * w), n = c.seconds(dk * 6 + 0.004, sr);
    const th = c.osc("sine", (tt) => f * (1 + 0.8 * Math.exp(-tt / 0.006)), n, sr);
    c.multiply(th, c.env(n, 0.0015, dk, sr));
    c.mix(dry, th, t + 0.001, amp * S.thump * (0.2 + 0.5 * w), sr);
    c.mix(dry, c.burst(r, 0.03, "lp", 220 + 180 * (1 - w), 0.7, 0.0015, 0.005 + 0.01 * w, sr), t, amp * S.thump * (0.3 + 0.5 * w), sr);
    c.mix(dry, c.burst(r, 0.04, sl[0], sl[1] * pk, sl[2], sl[3], sl[4] * (0.8 + 0.4 * w), sr), t, amp * sl[5], sr);
    if (S.ring) c.mix(dry, c.ring(S.ring.map(([h, a]) => [h * pk * (0.98 + 0.04 * r()), a]), 0.03, 0.005, sr), t, amp * 0.55, sr);
    if (p.shoe === "sneaker" && idx === 0) {
      const tq = t + 0.05 + 0.03 * r(), fq = (1000 + 300 * r()) * pk;
      drop(dry, tq, fq, 0.05, 1.25, 0.18 + 0.12 * w); drop(dry, tq, fq * 2.03, 0.05, 1.25, 0.08 + 0.05 * w);
    }
  });
  const ng = Math.round(120 * g * (0.5 + 0.7 * w));
  for (let k = 0; k < ng; k++) c.mix(dry, c.burst(r, 0.003 + r() * 0.004, "bp", 2500 + r() * 5000, 4, 0.0003, 0.001, sr), t0 + 0.002 + Math.pow(r(), 1.4) * (0.05 + 0.06 * w), (0.1 + 0.25 * r()) * 0.6, sr);
  if (g > 0) c.mix(dry, c.burst(r, 0.08, "bp", 3800 * pk, 1.4, 0.004, 0.03, sr), t0 + 0.012, 0.3 * g, sr);
  const tw = t0 + S.gap, mass = (0.6 + 0.6 * w) * W[4];
  c.mix(wat, c.burst(r, 0.03 + 0.06 * d, "bp", W[0] * pk * (1 - 0.25 * d), 0.8, 0.002, (0.006 + 0.02 * d) * mass, sr), tw, 0.3 + 0.6 * d, sr);
  const sn = c.seconds((0.06 + 0.26 * d) * mass, sr), sp = c.noise(r, sn), hp = c.biquad("hp", 1200, 0.7, sr), lp = c.onepole(sr), se = c.env(sn, 0.006 + 0.012 * d, (0.02 + 0.07 * d) * mass, sr);
  for (let i = 0; i < sn; i++) sp[i] = lp(hp(sp[i]), Math.min(ny, (2000 + 5000 * Math.exp(-i / sr / 0.05)) * pk * W[2])) * se[i];
  flick(sp, 0.25, 220);
  c.mix(wat, sp, tw + 0.003, W[1] * (0.3 + 0.7 * d), sr);
  if (d > 0.08) drop(wat, tw + 0.015 + 0.02 * r(), (380 + 160 * r()) * pk * W[2] * (1.15 - 0.3 * w), 0.025 + 0.03 * d, 2, 0.45 * (d - 0.04) * Math.min(1, W[1]));
  const cw = (0.04 + 0.13 * d) * (0.8 + 0.4 * w) * W[4], nd = Math.round((16 + 70 * d * (0.5 + 0.6 * w)) * W[3]);
  for (let k = 0; k < nd; k++) {
    const t = tw + 0.01 + Math.pow(r(), 1.3) * cw * 1.5 + r() * 0.004;
    drop(wat, t, (1000 + r() * 3200) * pk * W[2] * (1.15 - 0.3 * d), 0.006 + r() * 0.016, 1.5 + r(), (0.2 + 0.35 * r()) * (0.5 + 0.5 * d));
    if (r() < 0.4) c.mix(wat, c.burst(r, 0.004, "hp", 2500, 0.7, 0.0003, 0.0008, sr), t, 0.05 + 0.05 * r(), sr);
  }
  const bn = c.seconds(0.06 + 0.2 * d, sr), bed = c.noise(r, bn), bbp = c.biquad("bp", 3200 * pk, 0.8, sr), be = c.env(bn, 0.008, 0.025 + 0.06 * d, sr);
  for (let i = 0; i < bn; i++) bed[i] = bbp(bed[i]) * be[i];
  flick(bed, 0.2, 160);
  c.mix(wat, bed, tw + 0.02, 0.1 + 0.18 * d, sr);
  if (p.tail) {
    const nf = Math.round((8 + 18 * d) * Math.max(0.6, W[3])), tt = tw + 0.05 + cw, span = 0.12 + 0.1 * d;
    for (let k = 0; k < nf; k++) {
      const u = Math.pow(r(), 1.5);
      drop(wat, tt + u * span, (1400 + r() * 2800) * pk, 0.006 + r() * 0.012, 1.4 + 0.6 * r(), (0.1 + 0.15 * r()) * (0.5 + 0.5 * d) * (1 - 0.6 * u));
    }
  }
  c.filter(wat, c.biquad("hp", 260, 0.7, sr));
  let wv = wat;
  if (p.tail) { const rv = c.reverb(wat, { size: 0.3, decay: 0.3, mixAmt: 0.22 }, sr); if (rv) wv = rv; }
  const pkOf = (b) => { let m = 1e-9; for (let i = 0; i < b.length; i++) m = Math.max(m, Math.abs(b[i])); return m; };
  const pd = pkOf(dry), pw = pkOf(wv), wl = (0.45 + 0.7 * d) * (0.8 + 0.3 * w) * (p.shoe === "heel" ? 0.7 : 1);
  let out = new Float32Array(N);
  for (let i = 0; i < N; i++) out[i] = dry[i] / pd * 0.85 + (i < wv.length ? wv[i] : 0) / pw * wl;
  c.finish(out, 0.95);
  const thr = pkOf(out) * 0.012, B = 256;
  let last = 0;
  for (let b = Math.floor((N - 1) / B) * B; b >= 0; b -= B) { let m = 0; for (let i = b; i < Math.min(N, b + B); i++) m = Math.max(m, Math.abs(out[i])); if (m > thr) { last = Math.min(N, b + B); break; } }
  const fl2 = c.seconds(0.02, sr), end = Math.min(N, last + c.seconds(0.01, sr));
  out = out.slice(0, end);
  for (let i = 0; i < fl2 && i < end; i++) out[end - 1 - i] *= (i / fl2) * (i / fl2);
  c.fade(out, 2, sr);
  c.gain(out, 0.62 + 0.36 * w);
  return { samples: out };
}
