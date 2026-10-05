// Laser Charge: a rising chip-oscillator hum (stepped square, DC-corrected PWM or 4-bit triangle) with sub and fifth layers, quickening vibrato and sparkle grains, then a square zap or a soft power-down.
export const meta = {
  title: "Laser Charge", kind: "sfx", format: "sound", duration: 1.6, price: 3, author: "quietmachine", payout: "quietmachine@creators.oasis.example", kit: "Retro Arcade", description: "An 8-bit charge-up hum that climbs in pitch and urgency before a big shot, with an optional release zap; for arcade weapons, boss attacks and power moves.",
  tags: ["laser", "charge", "8-bit", "chiptune", "arcade", "powerup", "retro", "sci-fi"],
};
export const params = { knobs: {
  waveform: { type: "choice", label: "Waveform", default: "pulse", options: ["pulse", "square", "triangle"] },
  charge: { type: "range", label: "Charge length (s)", default: 1.2, min: 0.4, max: 2.5, step: 0.05 },
  intensity: { type: "range", label: "Intensity", default: 0.5, min: 0, max: 1, step: 0.01 },
  vibrato: { type: "range", label: "Vibrato", default: 0.5, min: 0, max: 1, step: 0.01 },
  zap: { type: "toggle", label: "Release zap", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, W = p.waveform, I = p.intensity, V = p.vibrato, T = p.charge;
  const r = c.rng(p.seed * 4241 + params.knobs.waveform.options.indexOf(W) * 97 + 3);
  const cfg = {
    pulse: { lo: 120, hi: 900, curve: 1.6, sub: 0.25, step: false, lp: 1 },
    square: { lo: 95, hi: 760, curve: 1.15, sub: 0.35, step: true, lp: 0.8 },
    triangle: { lo: 70, hi: 560, curve: 2.2, sub: 0.6, step: false, lp: 0.45 },
  }[W];
  const tail = p.zap ? 0.5 : 0.6, n = c.seconds(T + tail, sr), nc = c.seconds(T, sr), out = new Float32Array(n);
  const lo = cfg.lo * (0.93 + 0.14 * r()), hi = cfg.hi * (1 + 1.1 * I) * (0.95 + 0.1 * r());
  const curve = cfg.curve * (0.85 + 0.3 * r()), vdep = V * 0.05, relT = p.zap ? 0.004 : 0.1, droop = p.zap ? 0 : 2.5 + r();
  const att = 0.004 * sr;
  let f = lo, ph = 0, ph2 = 0, ph3 = 0, vph = r() * c.TAU, vr = 0.9 + 0.2 * r(), trem = r() * c.TAU;
  for (let i = 0; i < n; i++) {
    const x = i < nc ? i / nc : 1;
    if (i % 32 === 0) {
      f = lo * Math.pow(hi / lo, Math.pow(x, curve));
      if (cfg.step) f = lo * Math.pow(2, Math.round(12 * Math.log2(f / lo)) / 12);
      if (i >= nc) f *= Math.exp(-droop * (i - nc) / sr);
      vr = c.clamp(vr + (r() - 0.5) * 0.08, 0.7, 1.3);
    }
    vph += (4 + 14 * x) * vr * c.TAU / sr;
    trem += (6 + 10 * x) * vr * c.TAU / sr;
    const fm = 1 + vdep * (0.4 + 0.6 * x) * Math.sin(vph);
    ph += f * fm / sr; ph -= Math.floor(ph);
    ph2 += f * fm * 0.5 / sr; ph2 -= Math.floor(ph2);
    ph3 += f * fm * 1.503 / sr; ph3 -= Math.floor(ph3);
    let s;
    if (W === "pulse") { const d = 0.3 - 0.22 * x * (0.5 + 0.5 * I); s = (ph < d ? 1 : -1) - (2 * d - 1); }
    else if (W === "square") s = ph < 0.5 ? 1 : -1;
    else s = Math.round((4 * Math.abs(ph - 0.5) - 1) * 7.5) / 7.5;
    const sub = 4 * Math.abs(ph2 - 0.5) - 1, fifth = ph3 < 0.5 ? 0.6 : -0.6;
    let a = Math.min(1, i / att) * (0.22 + 0.78 * Math.pow(x, 1.3)) * (1 - 0.35 * V * x * (0.5 + 0.5 * Math.sin(trem)));
    if (i >= nc) a *= Math.exp(-(i - nc) / sr / relT);
    out[i] = a * (0.5 * s + 0.6 * cfg.sub * sub + 0.3 * I * x * fifth);
  }
  const grains = Math.round((10 + 110 * I) * T);
  for (let g = 0; g < grains; g++) {
    const t = T * Math.sqrt(r()), k = t / T;
    c.mix(out, c.burst(r, 0.006 + 0.004 * r(), "bp", 1800 + 6000 * k * (0.6 + 0.4 * r()), 6, 0.0004, 0.0015, sr), t, (0.06 + 0.2 * I) * k * (0.5 + 0.5 * r()), sr);
  }
  if (p.zap) {
    const m = c.seconds(0.42, sr), z = new Float32Array(m), top = hi * (1.6 + 0.4 * r()), k = 9 + 4 * r();
    let zp = 0;
    for (let i = 0; i < m; i++) {
      const t = i / sr, fz = 70 + top * Math.exp(-k * t);
      zp += fz / sr; zp -= Math.floor(zp);
      const duty = 0.25 + 0.25 * Math.min(1, t * 6);
      const zs = W === "triangle" ? 4 * Math.abs(zp - 0.5) - 1 : (zp < duty ? 1 : -1) - (2 * duty - 1);
      z[i] = zs * Math.min(1, t / 0.002) * Math.exp(-t / (0.07 + 0.04 * I));
    }
    c.mix(out, z, T, 0.9, sr);
    c.mix(out, c.burst(r, 0.12, "hp", 1800 + 2000 * I, 0.7, 0.001, 0.025 + 0.02 * I, sr), T, 0.25 + 0.35 * I, sr);
  }
  c.filter(out, c.biquad("hp", 35, 0.7, sr));
  c.filter(out, c.biquad("lp", (3000 + 9000 * I) * cfg.lp + 1200, 0.7, sr));
  c.fade(c.finish(out, 0.9, 1.1), 20, sr);
  return { samples: out };
}
