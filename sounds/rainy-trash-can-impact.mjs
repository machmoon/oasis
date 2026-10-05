// Wet trash can knocked over: material-tuned shell modes per bounce, pavement thump and contact grit, a spinning lid and debris rattle, water slosh, then optional street echoes into a damped alley reverb.
export const meta = {
  title: "Toppled Trash Can", kind: "impact", format: "sound", duration: 1.6, price: 3, author: "foleyroom", payout: "foleyroom@creators.oasis.example", kit: "Rainy City Street", description: "A rain-soaked trash can knocked onto wet pavement. It bounces, its lid spins out, junk rattles and water sloshes, with street echoes behind it, for alley scenes and night-city foley.",
  tags: ["trash can", "impact", "metal", "clatter", "alley", "rain", "foley", "street"],
};
export const params = { knobs: {
  material: { type: "choice", label: "Can material", default: "steel", options: ["steel", "plastic", "dumpster lid"] },
  force: { type: "range", label: "Force", default: 0.6, min: 0, max: 1, step: 0.01 },
  rattle: { type: "range", label: "Rattle", default: 0.5, min: 0, max: 1, step: 0.01 },
  slosh: { type: "range", label: "Water slosh", default: 0.4, min: 0, max: 1, step: 0.01 },
  pitch: { type: "range", label: "Pitch", default: 1, min: 0.6, max: 1.6, step: 0.01 },
  tail: { type: "toggle", label: "Street reverb", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, mi = params.knobs.material.options.indexOf(p.material), r = c.rng(p.seed * 7919 + mi * 271 + 3);
  const f = p.force, pt = p.pitch, s = p.slosh, rt = p.rattle;
  const out = new Float32Array(c.seconds(4, sr));
  const M = [
    { base: 420, rat: [1, 1.47, 2.09, 2.56, 3.39, 4.12, 5.31], dec: 0.12, click: ["bp", 4200, 1.2], thump: 75, n: 3 + Math.round(5 * f), gap: 0.12 + 0.16 * f, roll: 0.25 + 0.6 * f, tick: 1.9, td: 0.025 },
    { base: 170, rat: [1, 1.83, 2.71, 3.9, 5.2], dec: 0.035, click: ["lp", 1600, 0.8], thump: 95, n: 3 + Math.round(4 * f), gap: 0.14 + 0.2 * f, roll: 0.15 + 0.35 * f, tick: 2.6, td: 0.008 },
    { base: 92, rat: [1, 1.58, 2.31, 2.94, 3.62, 4.73, 5.9, 7.24], dec: 0.32, click: ["lp", 6000, 0.7], thump: 55, n: 2 + Math.round(3 * f), gap: 0.07 + 0.08 * f, roll: 0, tick: 3.1, td: 0.035 },
  ][mi];
  const ramp = (x, ms) => { const a = c.seconds(ms / 1000, sr); for (let i = 0; i < a && i < x.length; i++) x[i] *= i / a; return x; };
  const bubble = (t, f0, d, a) => {
    const n = c.seconds(d, sr), x = new Float32Array(n); let ph = 0;
    for (let i = 0; i < n; i++) { const u = i / n; ph += c.TAU * f0 * (1 + 2.2 * u * u) / sr; x[i] = Math.sin(ph) * Math.min(1, i / (0.002 * sr)) * Math.exp(-5 * u); }
    c.mix(out, x, t, a, sr);
  };
  const water = (t, a) => {
    c.mix(out, c.burst(r, 0.08 + 0.14 * s, "bp", 800 + 500 * r(), 0.9, 0.003, 0.04 + 0.06 * s, sr), t + 0.004, 0.55 * a * s, sr);
    for (let k = 0, nb = Math.round(3 + 14 * s * a); k < nb; k++) bubble(t + 0.01 + Math.pow(r(), 2) * 0.18, 300 + r() * 1400, 0.012 + r() * 0.03, (0.08 + 0.12 * r()) * a * s);
    for (let k = 0, nd = Math.round(30 * s * a); k < nd; k++) c.mix(out, c.burst(r, 0.003 + r() * 0.004, "bp", 2800 + r() * 3500, 3, 0.0003, 0.0015, sr), t + Math.pow(r(), 1.8) * 0.2, (0.06 + 0.12 * r()) * s * a, sr);
  };
  const hit = (t, a, b, dm) => {
    const modes = M.rat.map((q, k) => [M.base * pt * q * (0.985 + r() * 0.03), Math.pow(0.45 + 0.5 * b, k) / (1 + 0.3 * k)]);
    const d = M.dec * dm;
    c.mix(out, ramp(c.ring(modes, Math.min(1.6, d * 5), d, sr, 1), 1.5), t, 0.5 * a, sr);
    c.mix(out, c.burst(r, 0.015 + 0.02 * b, M.click[0], M.click[1] * (0.6 + 0.6 * b), M.click[2], 0.0008, 0.004 + 0.006 * b, sr), t, 0.6 * a, sr);
    c.mix(out, ramp(c.ring([[M.thump * (0.9 + 0.2 * r()), 1], [M.thump * 2.3, 0.3]], 0.18, 0.025 + 0.04 * f, sr), 1), t, 0.55 * a * (0.4 + 0.6 * f), sr);
    if (s > 0) water(t, a);
  };
  const t0 = 0.012;
  hit(t0, 1, 0.3 + 0.7 * f, 1);
  let t = t0, g = M.gap, a = 0.7;
  for (let k = 0; k < M.n; k++) { t += g * (0.85 + 0.3 * r()); hit(t, a, (0.3 + 0.7 * f) * a, 0.45 + 0.5 * a); a *= 0.5 + 0.15 * r(); g *= 0.6 + 0.12 * r(); }
  if (M.roll > 0) {
    const n = c.seconds(M.roll, sr), x = c.noise(r, n), bp = c.biquad("bp", M.base * pt * 2.1, 1.4, sr), hp = c.biquad("hp", 300, 0.7, sr); let ph = r() * c.TAU, wob = 1;
    for (let i = 0; i < n; i++) { if (i % 512 === 0) wob = 0.8 + 0.4 * r(); const u = i / n; ph += c.TAU * (9 - 6 * u) * wob / sr; x[i] = bp(hp(x[i])) * (0.55 + 0.45 * Math.sin(ph)) * Math.min(1, i / (0.02 * sr)) * (1 - u) * (1 - u); }
    c.mix(out, x, t0 + 0.05, 0.6 * f, sr);
  }
  if (rt > 0) {
    const nt = Math.round(5 + 28 * rt); let tt = t0 + 0.09 + r() * 0.06, gg = 0.12;
    for (let k = 0; k < nt; k++) {
      const u = k / nt, lf = M.base * pt * M.tick * (0.92 + 0.16 * r()), am = (0.25 + 0.35 * rt) * Math.sin(Math.PI * Math.min(1, 0.15 + u)) * (0.55 + 0.45 * r());
      c.mix(out, ramp(c.ring([[lf, 1], [lf * 1.52, 0.5], [lf * 2.41, 0.25]], M.td * 5, M.td, sr, 1), 0.5), tt, 0.35 * am, sr);
      c.mix(out, c.burst(r, 0.006, "bp", 2500 + 2500 * r(), 1.5, 0.0003, 0.0015, sr), tt, 0.3 * am, sr);
      tt += gg * (0.4 + 1.2 * r()); gg = Math.max(0.014, gg * (mi === 2 ? 0.93 : 0.88));
    }
    for (let k = 0, nd = Math.round(45 * rt * (0.4 + 0.6 * f)); k < nd; k++) c.mix(out, c.burst(r, 0.004 + r() * 0.006, "bp", 1500 + r() * 3500, 3, 0.0004, 0.002, sr), t0 + Math.pow(r(), 1.7) * (0.3 + 0.5 * f), (0.1 + 0.2 * r()) * rt, sr);
  }
  if (s > 0) {
    const pd = 0.3 + 0.9 * s, n = c.seconds(pd, sr), x = c.noise(r, n), lp = c.biquad("lp", 900, 0.7, sr), hp = c.biquad("hp", 160, 0.7, sr); let gv = 0.5, gt = 0.5;
    for (let i = 0; i < n; i++) { if (i % 256 === 0) gt = 0.2 + 0.8 * r(); gv += (gt - gv) * 0.01; const u = i / n; x[i] = lp(hp(x[i])) * gv * Math.min(1, i / (0.02 * sr)) * (1 - u); }
    c.mix(out, x, t0 + 0.03, 0.35 * s * (0.5 + 0.5 * f), sr);
    for (let k = 0, nb = Math.round(35 * s); k < nb; k++) bubble(t0 + 0.04 + r() * pd * 0.9, 250 + r() * 900, 0.015 + r() * 0.035, (0.06 + 0.1 * r()) * s);
  }
  if (p.tail) {
    const dry = out.slice(), n = out.length;
    for (const [d, gn] of [[0.07 + 0.05 * r(), 0.32], [0.15 + 0.08 * r(), 0.2], [0.27 + 0.1 * r(), 0.12]]) { const y = dry.slice(); c.filter(y, c.biquad("lp", 3200, 0.7, sr)); c.mix(out, y, d, gn, sr); }
    const y = new Float32Array(n), T = 1.3;
    for (const ms of [29.7, 37.1, 41.1, 43.7]) {
      const D = c.seconds(ms * (0.97 + 0.06 * r()) / 1000, sr), cb = new Float32Array(D), fb = Math.pow(10, -3 * D / sr / T); let idx = 0, lo = 0;
      for (let i = 0; i < n; i++) { const o = cb[idx]; lo += (o - lo) * 0.4; cb[idx] = out[i] + lo * fb; y[i] += o * 0.25; idx = idx + 1 === D ? 0 : idx + 1; }
    }
    for (const ms of [5, 1.7]) {
      const D = c.seconds(ms / 1000, sr), ab = new Float32Array(D); let idx = 0;
      for (let i = 0; i < n; i++) { const bo = ab[idx], v = y[i], o = -0.5 * v + bo; ab[idx] = v + 0.5 * o; y[i] = o; idx = idx + 1 === D ? 0 : idx + 1; }
    }
    for (let i = 0; i < n; i++) out[i] += 0.4 * y[i];
  }
  c.finish(out, 0.9, 1.1);
  c.gain(out, 0.7 + 0.3 * f);
  let end = out.length - 1;
  while (end > 0 && Math.abs(out[end]) < 0.001) end--;
  const res = out.slice(0, Math.min(out.length, end + c.seconds(0.03, sr))), fl = Math.min(res.length, c.seconds(0.06, sr));
  for (let i = 0; i < fl; i++) res[res.length - 1 - i] *= i / fl;
  return { samples: res };
}
