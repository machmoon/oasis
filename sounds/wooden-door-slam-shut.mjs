// Tavern door slam: swing-air swell, broadband strike, damped wooden panel modes, bouncing iron latch, frame knocks and an optional low-ceiling room wash.
export const meta = {
  title: "Tavern Door Slam", kind: "impact", format: "sound", duration: 1.0, price: 3, author: "hollowbody", payout: "hollowbody@creators.oasis.example", kit: "Wooden Tavern", description: "A wooden tavern door slammed shut while its iron latch clacks and bounces in the keeper and the frame knocks. Door weight, force, latch, frame and room tail are knobs.",
  tags: ["door", "slam", "latch", "wood", "tavern", "impact", "rattle", "medieval"],
};
export const params = { knobs: {
  door: { type: "choice", label: "Door weight", default: "heavy", options: ["light", "heavy", "oak slab"] },
  force: { type: "range", label: "Force", default: 0.7, min: 0, max: 1, step: 0.01 },
  latch: { type: "range", label: "Latch rattle", default: 0.6, min: 0, max: 1, step: 0.01 },
  frame: { type: "range", label: "Frame rattle", default: 0.4, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Room tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, di = params.knobs.door.options.indexOf(p.door);
  const r = c.rng(p.seed * 6113 + di * 97 + 29);
  const D = [
    { f: 210, d: 0.022, click: 5600, q: 1.4, cd: 0.0025, lo: 0.6, wash: 1400 },
    { f: 118, d: 0.045, click: 3400, q: 0.9, cd: 0.005, lo: 1.0, wash: 900 },
    { f: 68, d: 0.075, click: 1900, q: 0.7, cd: 0.009, lo: 1.35, wash: 600 },
  ][di];
  const F = p.force, t0 = 0.05;
  const len = 0.42 + 0.22 * p.latch + 0.1 * di + (p.tail ? 0.45 : 0);
  const out = new Float32Array(c.seconds(len, sr));
  const na = c.seconds(t0 + 0.003, sr), air = c.pink(r, na), alp = c.biquad("lp", 400 + 800 * F, 0.7, sr);
  for (let i = 0; i < na; i++) { const x = i / na; air[i] = alp(air[i]) * x * x * x; }
  c.mix(out, air, 0, 0.06 + 0.14 * F, sr);
  c.mix(out, c.burst(r, 0.03, "lp", D.click * (0.5 + 0.7 * F), D.q, 0.0004, D.cd, sr), t0, 0.9, sr);
  c.mix(out, c.burst(r, 0.012, "hp", 2200 + 2500 * F, 0.8, 0.0003, 0.0012 + 0.001 * di, sr), t0, (0.25 + 0.45 * F) * (1.2 - 0.3 * di), sr);
  const dec = D.d * (p.tail ? 1 : 0.65) * (0.8 + 0.4 * F);
  const modes = [[1, 1], [1.58, 0.6], [2.37, 0.4], [3.6, 0.25], [5.1, 0.12]].map(([k, a]) => [D.f * k * (0.97 + 0.06 * r()), a]);
  c.mix(out, c.ring(modes, dec * 6, dec, sr), t0 + 0.0008, (0.55 + 0.35 * F) * D.lo, sr);
  c.mix(out, c.burst(r, dec * 5, "lp", D.f * 4, 0.8, 0.001, dec * 0.8, sr), t0, 0.8 * D.lo, sr);
  const lf = 2500 * (0.9 + 0.2 * r()) * (1.1 - 0.1 * di);
  const metal = (m, amp, t) => {
    c.mix(out, c.ring([[lf * m, 1], [lf * 2.76 * m, 0.5], [lf * 5.4 * m, 0.25]], 0.06, 0.006 + 0.012 * r(), sr), t, amp, sr);
    c.mix(out, c.burst(r, 0.004, "bp", lf * 1.6 * m, 2, 0.0003, 0.0008, sr), t, amp * 0.6, sr);
  };
  let t = t0 + 0.006 + 0.006 * r();
  metal(1, 0.4 + 0.2 * F, t);
  const hits = Math.round(p.latch * (5 + 12 * (0.4 + 0.6 * F)));
  let gap = (0.03 + 0.05 * p.latch) * (0.6 + 0.6 * F) * (0.85 + 0.3 * r()), amp = 0.35 + 0.35 * p.latch;
  const stop = out.length / sr - (p.tail ? 0.4 : 0.08);
  for (let h = 0; h < hits; h++) {
    t += gap * (0.7 + 0.6 * r());
    if (t > stop) break;
    metal(0.96 + 0.08 * r(), amp * (0.5 + 0.5 * F), t);
    if (r() < 0.35) metal(0.98 + 0.05 * r(), amp * 0.3, t + 0.003 + 0.005 * r());
    gap *= 0.74 + 0.14 * r(); if (gap < 0.008) gap = 0.008 + 0.014 * r();
    amp *= 0.82 + 0.1 * r();
  }
  const fr = Math.round(p.frame * (8 + 18 * F)), span = 0.14 + 0.18 * p.frame;
  for (let k = 0; k < fr; k++) {
    const dt = 0.004 + Math.pow(r(), 1.5) * span, a = (1 - dt / (span + 0.02)) * (0.3 + 0.4 * r()) * (0.5 + 0.5 * F);
    c.mix(out, c.burst(r, 0.006 + 0.008 * r(), "bp", 380 + 700 * r(), 3, 0.0005, 0.002 + 0.003 * r(), sr), t0 + dt, a * 0.7, sr);
    c.mix(out, c.ring([[220 + 180 * r(), 1], [600 + 400 * r(), 0.4]], 0.03, 0.006, sr), t0 + dt, a * 0.3, sr);
  }
  if (p.tail) {
    const nb = out.length - c.seconds(t0, sr), b = c.brown(r, nb), blp = c.biquad("lp", 140, 0.8, sr), e = c.env(nb, 0.004, 0.16 + 0.06 * di, sr);
    for (let i = 0; i < nb; i++) b[i] = blp(b[i]) * e[i];
    c.mix(out, b, t0, 0.3 * D.lo * (0.5 + 0.5 * F), sr);
    const w = c.pink(r, nb), wlp = c.biquad("lp", D.wash, 0.7, sr), whp = c.biquad("hp", 150, 0.7, sr), we = c.env(nb, 0.012, 0.2 + 0.05 * di, sr);
    for (let i = 0; i < nb; i++) w[i] = wlp(whp(w[i])) * we[i];
    c.mix(out, w, t0, 0.1 + 0.08 * F, sr);
    const res = c.reverb(out, { size: 0.5, decay: 0.65, mixAmt: 0.3 }, sr);
    if (res && res !== out) for (let i = 0; i < out.length && i < res.length; i++) out[i] = res[i];
  } else {
    const nb = c.seconds(0.2, sr), w = c.pink(r, nb), wlp = c.biquad("lp", D.wash, 0.7, sr), we = c.env(nb, 0.003, 0.05, sr);
    for (let i = 0; i < nb; i++) w[i] = wlp(w[i]) * we[i];
    c.mix(out, w, t0, 0.08 + 0.06 * F, sr);
  }
  c.fade(c.finish(out, 0.9), 20, sr);
  c.gain(out, 0.75 + 0.25 * F);
  return { samples: out };
}
