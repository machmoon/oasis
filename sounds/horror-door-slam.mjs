// Horror door slam: unseen force. Layers: an air-suck whoosh, a wooden panel boom with a sub thump and latch crack, a rebound bump off the latch, frame/hinge rattle, falling debris, and an optional dark room tail whose length and colour follow the door size.
export const meta = {
  title: "Unseen Door Slam", kind: "impact", format: "sound", duration: 2.2, price: 3, author: "hollowbody", payout: "hollowbody@creators.oasis.example", kit: "Horror House", description: "An interior door slammed hard by nothing visible: air rush, panel boom, latch crack, rebound, rattling frame and falling debris, for haunted-house scares and jump cuts.",
  tags: ["door", "slam", "horror", "haunted", "wood", "impact", "rattle", "scare"],
};
export const params = { knobs: {
  size: { type: "choice", label: "Door size", default: "room", options: ["closet", "room", "front"] },
  force: { type: "range", label: "Force", default: 0.7, min: 0, max: 1, step: 0.01 },
  rattle: { type: "range", label: "Frame rattle", default: 0.5, min: 0, max: 1, step: 0.01 },
  debris: { type: "range", label: "Debris", default: 0.4, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Room tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + params.knobs.size.options.indexOf(p.size) * 97 + 3);
  const z = { closet: { s: 1.6, tau: 0.22, lp: 380, rev: 0.45 }, room: { s: 1, tau: 0.4, lp: 220, rev: 0.7 }, front: { s: 0.6, tau: 0.65, lp: 120, rev: 0.9 } }[p.size];
  const s = z.s, f = p.force, out = new Float32Array(c.seconds(p.tail ? 2.4 : 1.4, sr));
  const T = 0.2 - 0.09 * f, t0 = T, base = 95 * s;
  const wn = c.seconds(T + 0.02, sr), w = c.noise(r, wn), lpw = c.onepole(sr);
  for (let i = 0; i < wn; i++) { const t = Math.min(1, i / (T * sr)); const e = t * t * t; w[i] = lpw(w[i], 250 + 2600 * e * (0.4 + f)) * e * (i < T * sr ? 1 : 0); }
  c.mix(out, w, 0, 0.5 + 0.4 * f, sr);
  const modes = [[base, 1], [base * 1.9, 0.6], [base * 3.1, 0.4], [base * 4.7, 0.25], [base * 7.3, 0.12]].map(([a, b]) => [a * (0.97 + r() * 0.06), b]);
  c.mix(out, c.ring(modes, 0.8, 0.06 + 0.07 / s + 0.08 * f, sr), t0, 0.5 + 0.5 * f, sr);
  const thump = c.osc("sine", (t) => base * 0.5 * (1 + 1.4 * Math.exp(-t * 35)), c.seconds(0.5, sr), sr);
  c.multiply(thump, c.env(thump.length, 0.002, 0.08 + 0.09 / s, sr));
  c.mix(out, thump, t0, 0.9 * (0.4 + 0.6 * f), sr);
  c.mix(out, c.burst(r, 0.03, "bp", 900 + 700 / s, 1.2, 0.0008, 0.012, sr), t0, 0.8 * (0.4 + 0.6 * f), sr);
  c.mix(out, c.burst(r, 0.014, "hp", 2500, 0.8, 0.0004, 0.005, sr), t0 + 0.004, 0.55 * f + 0.25, sr);
  c.mix(out, c.ring([[2100 * (0.9 + r() * 0.2), 1], [3300, 0.5]], 0.08, 0.015, sr), t0 + 0.003, 0.3, sr);
  const tb = t0 + 0.1 + r() * 0.06;
  c.mix(out, c.ring(modes.map(([a, b]) => [a * 1.03, b]), 0.4, 0.04 + 0.04 / s, sr), tb, 0.3 * (0.4 + 0.6 * f), sr);
  c.mix(out, c.burst(r, 0.015, "bp", 1500, 1.5, 0.0006, 0.006, sr), tb, 0.3 * f + 0.1, sr);
  const hits = Math.round(4 + 22 * p.rattle), lim = p.tail ? 1.9 : 1.1;
  let tt = t0 + 0.02;
  for (let k = 0; k < hits; k++) {
    tt += 0.012 + r() * 0.05 * (1 + k / hits);
    if (tt > lim) break;
    const a = (0.2 + 0.6 * r()) * (0.25 + 0.75 * p.rattle) * Math.exp(-(tt - t0) / 0.55);
    c.mix(out, c.ring([[(400 + r() * 700) / Math.sqrt(s), 1], [1500 + r() * 1800, 0.4]], 0.05, 0.008 + r() * 0.012, sr), tt, a, sr);
    c.mix(out, c.burst(r, 0.006, "bp", 1800 + r() * 2500, 3, 0.0004, 0.002, sr), tt, a * 0.7, sr);
  }
  const n = Math.round(p.debris * 30);
  for (let k = 0; k < n; k++) {
    const t = t0 + 0.08 + Math.pow(r(), 1.5) * (lim - 0.4), a = (0.15 + 0.4 * r()) * (0.4 + 0.6 * p.debris);
    if (r() < 0.4) c.mix(out, c.ring([[1200 + r() * 3000, 1], [2900 + r() * 3000, 0.4]], 0.07, 0.01 + r() * 0.015, sr), t, a * 0.6, sr);
    else c.mix(out, c.burst(r, 0.02 + r() * 0.02, "bp", 500 + r() * 1200, 1.5, 0.001, 0.008, sr), t, a, sr);
  }
  if (p.tail) {
    const m = c.seconds(2, sr), d = c.brown(r, m), lp = c.biquad("lp", z.lp, 0.8, sr);
    for (let i = 0; i < m; i++) d[i] = lp(d[i]) * Math.exp(-i / sr / z.tau) * Math.min(1, i / (0.02 * sr));
    c.mix(out, d, t0, 2.2 * (0.3 + 0.7 * f), sr);
    const rv = c.reverb(out.slice(), { size: z.rev, decay: 0.7, mixAmt: 1 }, sr);
    for (let i = 0; i < out.length; i++) out[i] = out[i] * 0.85 + rv[i] * 0.4;
  }
  c.fade(c.finish(out, 0.9, 1.1), 40, sr);
  return { samples: out };
}
