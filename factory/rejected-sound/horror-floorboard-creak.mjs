// Floorboard creak: a footstep thump and heel click, then a stick-slip groan built as discrete slip pulses (each a damped resonant ring) at an irregular, gliding rate through wood formants, plus a nail squeak, rotten-board crackle and an optional room tail.
export const meta = {
  title: "Floorboard Creak", kind: "foley", format: "sound", duration: 1.6, price: 2, author: "hollowbody", payout: "hollowbody@creators.oasis.example", kit: "Horror House", description: "A single old floorboard groaning under a footstep, with wood type, stress, groan length, pitch and a room tail as knobs; for haunted-house corridors and slow-creep scenes.",
  tags: ["creak", "floorboard", "wood", "horror", "footstep", "haunted", "house", "foley"],
};
export const params = { knobs: {
  wood: { type: "choice", label: "Wood", default: "oak", options: ["pine", "oak", "rotten"] },
  stress: { type: "range", label: "Stress", default: 0.5, min: 0, max: 1, step: 0.01 },
  groan: { type: "range", label: "Groan length", default: 0.5, min: 0, max: 1, step: 0.01 },
  pitch: { type: "range", label: "Pitch", default: 0.5, min: 0, max: 1, step: 0.01 },
  room: { type: "toggle", label: "Room tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + params.knobs.wood.options.indexOf(p.wood) * 97 + 3), st = p.stress;
  const W = { pine: { f: 1.3, q: 14, jit: 0.2, gap: 0.05, th: 150, dec: 0.05, rate: 55, ring: 0.022, noise: 0.05, sq: 1 }, oak: { f: 1, q: 9, jit: 0.45, gap: 0.14, th: 95, dec: 0.08, rate: 32, ring: 0.014, noise: 0.12, sq: 0.7 }, rotten: { f: 0.7, q: 4, jit: 0.9, gap: 0.3, th: 65, dec: 0.13, rate: 18, ring: 0.008, noise: 0.4, sq: 0 } }[p.wood];
  const gl = 0.4 + 1.3 * p.groan, start = 0.05, tail = p.room ? 0.6 : 0.3;
  const out = new Float32Array(c.seconds(start + gl + tail, sr));
  const n = c.seconds(gl, sr), ex = new Float32Array(n);
  const dir = r() < 0.5 ? 1 : -1, glide = dir * (0.25 + 0.4 * st), base = (160 + 420 * p.pitch) * W.f;
  let pos = 0, wob = 0, slipPh = r() * 6;
  while (pos < n) {
    const t = pos / n, env = Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.15)), 0.4) * (t < 0.04 ? t / 0.04 : 1) * (0.55 + 0.45 * (1 - t));
    wob += (r() - 0.5) * 0.12; wob *= 0.95; slipPh += 0.5;
    const f = base * (1 + glide * (t - 0.5) + wob + 0.1 * Math.sin(slipPh));
    const rate = W.rate * (0.7 + 0.8 * st) * (1 + 0.5 * Math.sin(Math.PI * t) + 0.3 * wob);
    const mute = r() < W.gap * (1.3 - 0.6 * st);
    const a = (mute ? 0.08 : 0.3 + 0.7 * r()) * env * (r() < 0.2 ? 1.6 : 1);
    const len = Math.min(c.seconds(W.ring * 3, sr), n - (pos | 0)), k0 = pos | 0, fr = f * (0.97 + 0.06 * r());
    for (let j = 0; j < len; j++) { const tt = j / sr; ex[k0 + j] += a * Math.sin(c.TAU * fr * tt) * Math.exp(-tt / W.ring) * Math.min(1, j / (0.0008 * sr)); }
    pos += sr / rate * (1 + (r() - 0.5) * W.jit * 2);
  }
  const fc = W.f * (0.8 + 0.6 * p.pitch + 0.3 * st);
  const b1 = c.biquad("bp", 600 * fc, W.q * 0.4, sr), b2 = c.biquad("bp", 1400 * fc, W.q * 0.4, sr), b3 = c.biquad("bp", 2700 * fc, W.q * 0.3, sr), lp = c.biquad("lp", 5000, 0.7, sr);
  const g = new Float32Array(n);
  for (let i = 0; i < n; i++) { const x = ex[i] + (r() - 0.5) * W.noise * Math.abs(ex[i]) * 3; g[i] = lp(x * 0.6 + b1(x) * 1.2 + b2(x) * 0.9 + b3(x) * 0.5); }
  if (p.wood === "rotten") for (let k = 0; k < 10 + 14 * st; k++) { const at = r() * gl * 0.9; c.mix(g, c.burst(r, 0.006, "bp", 1200 + r() * 2000, 2, 0.0004, 0.0025, sr), at, 0.25 * (0.3 + r()), sr); }
  c.fade(g, 40, sr);
  c.mix(out, g, start, 0.9 + 0.3 * st, sr);
  c.mix(out, c.ring([[W.th, 1], [W.th * 2.1, 0.3]], 0.2, W.dec, sr), 0.004, 0.6, sr);
  c.mix(out, c.burst(r, 0.012, "lp", 1300, 0.8, 0.002, 0.006, sr), 0.003, 0.35, sr);
  c.mix(out, c.burst(r, 0.01, "bp", 2200, 1.5, 0.0005, 0.003, sr), 0.012, 0.2, sr);
  if (W.sq > 0) {
    const sq = c.seconds(0.2, sr), f0 = (2000 + 1500 * p.pitch) * W.f * (0.95 + 0.1 * r());
    const s = c.osc("sine", (t) => f0 * (1 + 0.5 * t - 1.2 * t * t), sq, sr), se = c.env(sq, 0.015, 0.06, sr);
    for (let i = 0; i < sq; i++) s[i] *= se[i];
    c.mix(out, s, start + gl * (0.3 + 0.4 * r()), (0.04 + 0.12 * st) * W.sq, sr);
  }
  const res = p.room ? c.reverb(out, { size: 0.55, decay: 0.45, mixAmt: 0.28 }, sr) : out;
  const fin = new Float32Array(out.length);
  for (let i = 0; i < fin.length; i++) fin[i] = res[i] || 0;
  c.fade(fin, 60, sr);
  c.finish(fin, 0.85, 1.1);
  return { samples: fin };
}
