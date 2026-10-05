// Kitchen Groove: a whole-bar percussive loop played on kitchen hits. Pan-bottom or board kick, pan-lid or cleaver snare, spoon or knife-tip hats and rim ghosts, over a pulsing pan-sizzle or board-brush shaker bed; everything wraps across the seam.
export const meta = {
  title: "Kitchen Groove", kind: "music-loop", format: "sound", duration: 3, price: 4, author: "kickdrum", payout: "kickdrum@creators.oasis.example", kit: "Kitchen", description: "A seamless one- or two-bar groove played on pans, knives, boards and spoons over a sizzling shaker bed, with kit, tempo, swing, density and pitch as knobs, for cooking scenes, menus and playful stingers.",
  tags: ["kitchen", "groove", "loop", "percussion", "pans", "knives", "cooking", "beat"],
};
export const params = { knobs: {
  kit: { type: "choice", label: "Kit", default: "mixed", options: ["metal", "wood", "mixed"] },
  tempo: { type: "range", label: "Tempo (BPM)", default: 105, min: 80, max: 140, step: 1 },
  swing: { type: "range", label: "Swing", default: 0.3, min: 0, max: 1, step: 0.01 },
  density: { type: "range", label: "Density", default: 0.5, min: 0, max: 1, step: 0.01 },
  pitch: { type: "range", label: "Pitch (semitones)", default: 0, min: -6, max: 6, step: 1 },
  tail: { type: "toggle", label: "Room tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 4241 + params.knobs.kit.options.indexOf(p.kit) * 97 + 3);
  const stepLen = 60 / p.tempo / 4, bars = 16 * stepLen < 2 ? 2 : 1, steps = 16 * bars, sw = p.swing * 0.33 * stepLen;
  const n = Math.round(steps * stepLen * sr), ext = new Float32Array(n + c.seconds(1.4, sr)), loop = n / sr;
  const pm = Math.pow(2, p.pitch / 12), det = [0, 1, 2, 3].map(() => 1 + (r() - 0.5) * 0.06);
  const kit = p.kit === "mixed" ? { k: "wood", s: "metal", h: "metal", g: "wood" } : { k: p.kit, s: p.kit, h: p.kit, g: p.kit };
  const M = (m, d) => m.map(([f, a]) => [f * pm * d * (1 + (r() - 0.5) * 0.012), a]).filter(([f]) => f < sr * 0.45);
  const R = (m, dur, dec, d, t, g) => c.mix(ext, c.ring(M(m, d), dur, dec * (0.9 + r() * 0.2), sr), t, g, sr);
  const B = (dur, type, f, Q, a, dec, t, g) => c.mix(ext, c.burst(r, dur, type, Math.min(f * pm, sr * 0.45), Q, a, dec, sr), t, g, sr);
  const hit = (v, t, g) => {
    if (v === "k") {
      if (kit.k === "metal") { R([[150, 1], [232, 0.7], [371, 0.55], [608, 0.4], [910, 0.3], [1460, 0.2]], 0.45, 0.085, det[0], t + 0.001, 0.55 * g); R([[62, 1]], 0.2, 0.035, det[0], t + 0.001, 0.4 * g); B(0.012, "bp", 2400, 1, 0.0005, 0.003, t, 0.55 * g); }
      else { R([[95, 1], [240, 0.45], [530, 0.15]], 0.3, 0.06, det[0], t + 0.001, 0.85 * g); B(0.04, "lp", 700, 0.8, 0.0008, 0.012, t, 0.9 * g); B(0.006, "bp", 2200, 1.2, 0.0003, 0.0015, t, 0.4 * g); }
    } else if (v === "s") {
      if (kit.s === "metal") { B(0.12, "bp", 2600, 0.9, 0.0006, 0.035, t, 0.7 * g); R([[430, 1], [1090, 0.75], [1840, 0.6], [2970, 0.45], [4210, 0.3]], 0.5, 0.085, det[1], t + 0.0005, 0.45 * g); B(0.09, "hp", 5500, 0.7, 0.0005, 0.022, t, 0.35 * g); B(0.006, "hp", 4000, 0.7, 0.0003, 0.0015, t, 0.4 * g); }
      else { B(0.008, "hp", 2500, 0.8, 0.0003, 0.002, t, 1.0 * g); R([[330, 1], [790, 0.55], [1520, 0.35]], 0.2, 0.035, det[1], t + 0.0005, 0.8 * g); B(0.05, "bp", 1100, 1.4, 0.001, 0.018, t, 0.7 * g); B(0.03, "lp", 450, 0.8, 0.0008, 0.01, t, 0.6 * g); }
    } else if (v === "h") {
      if (kit.h === "metal") { R([[3150, 1], [4720, 0.6], [6930, 0.45], [8400, 0.3]], 0.3, 0.04, det[2], t + 0.0003, 0.55 * g); B(0.004, "hp", 6500, 0.7, 0.0003, 0.001, t, 0.5 * g); }
      else { B(0.01, "bp", 3600, 2.2, 0.0003, 0.003, t, 1.0 * g); R([[1850, 1], [2780, 0.5]], 0.08, 0.012, det[2], t, 0.6 * g); B(0.004, "hp", 6000, 0.7, 0.0003, 0.001, t, 0.45 * g); }
    } else {
      if (kit.g === "metal") for (let j = 0; j < 2; j++) { const tj = t + j * (0.012 + r() * 0.01); R([[1240, 1], [2610, 0.5], [3900, 0.3]], 0.15, 0.02, det[3], tj, 0.35 * g * (1 - 0.4 * j)); B(0.004, "hp", 5000, 0.7, 0.0003, 0.001, tj, 0.25 * g); }
      else { B(0.006, "hp", 3000, 0.8, 0.0003, 0.0015, t, 0.85 * g); R([[520, 1], [1240, 0.45]], 0.06, 0.012, det[3], t, 0.55 * g); }
    }
  };
  const thr = 0.25 + 0.75 * p.density;
  let prio = Array.from({ length: 16 }, () => r());
  for (let s = 0; s < steps; s++) {
    const k = s % 16;
    if (s === 16) for (let j = 11; j < 16; j++) prio[j] = r();
    const t = s * stepLen + (k % 2 ? sw : 0) + (s > 0 ? (r() - 0.5) * 0.004 : 0), vj = 0.88 + r() * 0.24;
    if (k === 0 || k === 10 || ((k === 7 || k === 14) && prio[k] < p.density - 0.3)) hit("k", t, (k === 0 ? 1 : 0.8) * vj);
    if (k === 4 || k === 12) hit("s", t, 0.9 * vj);
    if (k % 2 === 0) hit("h", t, (k % 4 === 2 ? 0.6 : 0.38) * vj);
    else if (prio[k] * 0.9 + 0.1 < thr) hit(prio[k] < 0.5 ? "g" : "h", t, (prio[k] < 0.5 ? 0.45 : 0.28) * vj);
  }
  const metalBed = p.kit !== "wood", crackles = Math.round(loop * (40 + 80 * p.density));
  let buf = ext;
  if (p.tail) buf = c.reverb(ext, { size: 0.55, decay: 0.6, mixAmt: 0.28 }, sr) || ext;
  const out = new Float32Array(n);
  for (let i = 0; i < buf.length; i++) out[i % n] += buf[i];
  let pk = 1e-6;
  for (let i = 0; i < n; i++) pk = Math.max(pk, Math.abs(out[i]));
  const xf = c.seconds(0.05, sr), bed = c.pink(r, n + xf);
  const hp = c.biquad("hp", metalBed ? 3800 : 1500, 0.7, sr), lp = c.biquad("lp", metalBed ? 11000 : 4200, 0.7, sr);
  let bp = 1e-6;
  for (let i = 0; i < bed.length; i++) { bed[i] = lp(hp(bed[i])); bp = Math.max(bp, Math.abs(bed[i])); }
  const floor = 0.45 + 0.15 * (1 - p.density), dk = metalBed ? 0.045 : 0.06;
  const envAt = (i) => {
    const tt = (i / sr) % loop; let s = Math.floor(tt / stepLen), on = s * stepLen + (s % 2 ? sw : 0);
    if (tt < on) { s -= 1; on = s * stepLen + (s % 2 ? sw : 0); }
    const ph = Math.max(0, tt - on), acc = s % 2 ? 1 : 0.6;
    return floor + (1 - floor) * acc * Math.exp(-ph / dk) * Math.min(1, ph / 0.002);
  };
  const g = pk * (0.14 + 0.08 * p.density) / bp;
  for (let i = 0; i < n; i++) {
    let v = bed[i];
    if (i < xf) { const a = (i / xf) * Math.PI / 2; v = bed[i] * Math.sin(a) + bed[n + i] * Math.cos(a); }
    out[i] += v * envAt(i) * g;
  }
  const cr = new Float32Array(n + c.seconds(0.1, sr)), ext2 = ext;
  for (let j = 0; j < crackles; j++) {
    const f = metalBed ? 4500 + r() * 4500 : 2000 + r() * 2500;
    c.mix(cr, c.burst(r, 0.004, "bp", Math.min(f, sr * 0.45), 3, 0.0003, 0.001, sr), r() * loop, pk * (0.08 + 0.12 * r()), sr);
  }
  for (let i = 0; i < cr.length; i++) out[i % n] += cr[i];
  c.finish(out, 0.9);
  return { samples: out };
}
