// Parchment Open: a notice unrolled on the quest board. A stick-slip friction swish rises with unroll progress, seam
// ticks quicken as the roll shrinks, crinkle grains crackle across it, and a damped paper flap settles onto wood.
export const meta = {
  title: "Parchment Unfurl", kind: "ui", format: "sound", duration: 0.5, price: 1, author: "quietmachine", payout: "quietmachine@creators.oasis.example", kit: "Wooden Tavern", description: "A parchment notice snapping open with a rising paper swish, accelerating roll ticks and a soft flap; for quest boards, journals and menu opens.",
  tags: ["parchment", "paper", "unroll", "scroll", "menu", "quest", "ui", "tavern"],
};
export const params = { knobs: {
  paper: { type: "choice", label: "Paper weight", default: "thin", options: ["thin", "vellum"] },
  speed: { type: "range", label: "Unroll speed", default: 0.6, min: 0, max: 1, step: 0.01 },
  crinkle: { type: "range", label: "Crinkle", default: 0.5, min: 0, max: 1, step: 0.01 },
  pitch: { type: "range", label: "Pitch", default: 0.5, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Room tail", default: false },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const vel = p.paper === "vellum", sr = c.sr, r = c.rng(p.seed * 613 + (vel ? 71 : 0) + 11);
  const k = Math.pow(2, (p.pitch - 0.5) * 1.2), cr = p.crinkle;
  const T = (0.5 - 0.28 * p.speed) * c.between(r, 0.93, 1.07);
  const n = c.seconds(T + (p.tail ? 0.5 : 0.1) + 0.02, sr), out = new Float32Array(n);
  const band = vel ? [1200, 3000] : [2800, 7200], Q = vel ? 1.6 : 3.2;
  const gd = vel ? [0.004, 0.008] : [0.0018, 0.0038];
  const steps = Math.max(2, Math.round(T * 1000)), skew = c.between(r, 0.6, 0.9);
  const vs = new Float32Array(steps + 1), ang = new Float32Array(steps + 1), prog = new Float32Array(steps + 1);
  let sum = 0;
  for (let s = 0; s <= steps; s++) { vs[s] = Math.sin(Math.PI * Math.pow(s / steps, skew)); sum += vs[s]; }
  const turns = (vel ? 4.5 : 6.5) * c.between(r, 0.85, 1.15) / 1.6;
  let pos = 0, a = 0, lastTick = 0;
  for (let s = 0; s <= steps; s++) {
    const dp = vs[s] / sum, rad = 0.3 + 0.7 * Math.sqrt(Math.max(0, 1 - pos));
    pos += dp; a += dp / rad * turns; ang[s] = a; prog[s] = Math.min(1, pos);
    const t = s / 1000 + 0.004, v = vs[s];
    if (Math.floor(a) > lastTick) {
      lastTick = Math.floor(a);
      c.mix(out, c.burst(r, gd[1] * 1.6, "bp", k * band[0] * c.between(r, 1.1, 1.7) * (1 + 0.4 * pos), Q, 0.0004, 0.002, sr), t, 0.45 + 0.4 * v, sr);
    }
    let pr = cr * (vel ? 0.35 : 0.7) * v;
    while (r() < pr) {
      pr -= 1;
      c.mix(out, c.burst(r, c.between(r, gd[0], gd[1]), "bp", k * c.between(r, band[0], band[1]), Q, 0.0003, 0.0012, sr),
        t + r() * 0.001, c.between(r, 0.1, 0.45) * (0.4 + 0.6 * cr), sr);
    }
    if (r() < cr * 0.025 * v) {
      const m = 3 + Math.floor(r() * 5); let tt = t;
      for (let g = 0; g < m; g++) { tt += c.between(r, 0.001, 0.003); c.mix(out, c.burst(r, gd[0], "bp", k * c.between(r, band[0], band[1]), Q, 0.0003, 0.001, sr), tt, c.between(r, 0.25, 0.55), sr); }
    }
  }
  const sw = c.noise(r, n), lpA = c.onepole(sr), lpB = c.onepole(sr), flut = 0.08 + 0.2 * cr;
  const stick = 0.4 + 0.45 * cr, dm = Math.exp(-1 / (sr * (vel ? 0.006 : 0.0035))), wob = c.between(r, 0, 6);
  let g = 0, cnt = 0;
  for (let i = 0; i < n; i++) {
    const cs = i / sr * 1000 - 4, s0 = Math.max(0, Math.floor(cs));
    if (s0 >= steps) { sw[i] = 0; continue; }
    const fr = Math.max(0, cs - s0), vv = cs < 0 ? 0 : vs[s0] + (vs[s0 + 1] - vs[s0]) * fr;
    const an = ang[s0] + (ang[s0 + 1] - ang[s0]) * fr, pg = prog[s0];
    if (--cnt <= 0) { g = c.between(r, 0.3, 1); cnt = sr / (50 + 320 * vv) * c.between(r, 0.4, 1.6); }
    g *= dm;
    const fc = k * band[0] * (0.4 + 0.7 * vv + 0.7 * pg);
    const y = lpA(sw[i], fc * 1.7) - lpB(sw[i], fc * 0.45);
    const fl = 1 - flut + flut * Math.cos(c.TAU * an + Math.sin(an * 2.3 + wob));
    sw[i] = y * vv * fl * (1 - stick + stick * 1.8 * g);
  }
  c.mix(out, sw, 0, vel ? 1 : 0.85, sr);
  c.mix(out, c.burst(r, 0.006, "hp", k * band[0] * 1.3, 0.8, 0.0005, 0.0015, sr), 0.002, 0.45, sr);
  const ft = T + 0.004;
  c.mix(out, c.burst(r, 0.03, "lp", k * (vel ? 900 : 1700), 0.8, 0.0008, vel ? 0.012 : 0.007, sr), ft, 0.85, sr);
  c.mix(out, c.burst(r, 0.02, "bp", k * (vel ? 2200 : 4200), 1.2, 0.0005, 0.004, sr), ft + 0.001, 0.4, sr);
  const md = vel ? [[180, 1], [430, 0.5], [960, 0.25]] : [[320, 1], [720, 0.45], [1500, 0.25]];
  c.mix(out, c.ring(md.map(([f, a2]) => [f * k * c.between(r, 0.93, 1.07), a2]), 0.05, vel ? 0.011 : 0.007, sr), ft + 0.001, 0.4, sr);
  let res = out;
  if (p.tail) { const rv = c.reverb(out, { size: 0.35, decay: 0.55, mixAmt: 0.32 }, sr); if (rv && rv.length) res = rv; }
  c.finish(res, 0.85);
  c.fade(res, 3, sr);
  return { samples: res };
}
