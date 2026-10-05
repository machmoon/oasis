// Car through a deep puddle: tyre hiss that sweeps past, a noise plunge, then a swelling pink water sheet over a brown-noise mass, with churn grains, fizz and droplet scatter, a curb slap and a runoff-and-drip tail.
export const meta = {
  title: "Puddle Sheet Splash", kind: "sfx", format: "sound", duration: 1.7, price: 3, author: "foleyroom", payout: "foleyroom@creators.oasis.example", kit: "Rainy City Street", description: "A passing car tyre ploughs through a street puddle and throws a sustained sheet of water. Puddle size, speed, curb slap and spray scatter are knobs, for night-city drive-bys and splash gags.",
  tags: ["puddle", "splash", "car", "tire", "water", "street", "rain", "drive-by"],
};
export const params = { knobs: {
  puddle: { type: "choice", label: "Puddle size", default: "medium", options: ["small", "medium", "large"] },
  speed: { type: "range", label: "Speed", default: 0.6, min: 0, max: 1, step: 0.01 },
  curb: { type: "range", label: "Curb slap", default: 0.4, min: 0, max: 1, step: 0.01 },
  scatter: { type: "range", label: "Spray scatter", default: 0.5, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Drip tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, idx = params.knobs.puddle.options.indexOf(p.puddle), r = c.rng(p.seed * 6151 + idx * 97 + 3);
  const size = [0.15, 0.55, 1][idx], sp = p.speed, sc = p.scatter, cu = p.curb;
  const tIn = 0.22 - 0.08 * sp, T = (0.16 + 0.5 * size) * (1.35 - 0.6 * sp), R = 0.18 + 0.32 * size, tp = tIn + T * 0.5;
  const total = tIn + T + R + (p.tail ? 0.35 + 0.55 * size : 0.12) + 0.1, N = c.seconds(total, sr), out = new Float32Array(N);
  const fHi = 2600 + 3800 * sp, fLo = fHi * (0.4 - 0.1 * sp), slope = 4 + 10 * sp;
  const cut = (t) => fLo + (fHi - fLo) * 0.5 * (1 - Math.tanh((t - tp) * slope));
  const sheetE = (t) => {
    const u = t - tIn, a = 0.025 + 0.05 * size;
    if (u <= 0) return 0;
    if (u < a) { const v = u / a; return v * v * (3 - 2 * v); }
    if (u < T) return 1 - 0.3 * (u - a) / (T - a);
    return u < T + R ? 0.35 * (1 + Math.cos(Math.PI * (u - T) / R)) : 0;
  };
  const hs = c.pink(r, N), sh = c.pink(r, N), ms = c.brown(r, N), fz = c.noise(r, N), ro = p.tail ? c.pink(r, N) : null;
  const hLp = c.onepole(sr), hHp = c.biquad("hp", 450, 0.7, sr), sLp = c.onepole(sr), sHp = c.biquad("hp", 160 + 160 * (1 - size), 0.7, sr);
  const mLp = c.biquad("lp", 150 + 220 * (1 - size) + 120 * sp, 0.7, sr), mHp = c.biquad("hp", 38, 0.7, sr), fHp = c.biquad("hp", 2800, 0.7, sr), fLp = c.onepole(sr);
  const rLp = c.biquad("lp", 450 + 350 * size, 0.7, sr), rHp = c.biquad("hp", 110, 0.7, sr);
  const hDk = 0.06 + 0.08 * sp, tR = tIn + T * 0.75, rEnd = total - 0.1;
  let g = 1, gt = 1, mg = 1, mgt = 1, rg = 0.5, rgt = 0.5;
  for (let i = 0; i < N; i++) {
    const t = i / sr, f = cut(t), se = sheetE(t), u = t - tIn;
    if (i % 64 === 0) gt = 0.45 + 0.55 * r();
    if (i % 512 === 0) mgt = 0.6 + 0.4 * r();
    if (i % 400 === 0) rgt = 0.2 + 0.8 * r();
    g += (gt - g) * 0.02; mg += (mgt - mg) * 0.004; rg += (rgt - rg) * 0.004;
    const he = Math.min(1, (t / tIn) * (t / tIn)) * (u < T ? 1 : Math.exp(-(u - T) / hDk));
    let y = hHp(hLp(hs[i], f)) * he * (0.15 + 0.25 * sp);
    y += sHp(sLp(sh[i], 600 + f * 1.1)) * se * g * (0.6 + 0.4 * sp);
    y += mHp(mLp(ms[i])) * se * mg * (1 - 0.4 * Math.min(1, u / (T + R))) * (0.5 + 1.5 * size) * (0.6 + 0.4 * sp);
    y += fHp(fLp(fz[i], 9000)) * sheetE(t - 0.04 - 0.08 * sc) * g * (0.04 + 0.3 * sc);
    if (ro && t > tR && t < rEnd) { const v = t - tR; y += rHp(rLp(ro[i])) * rg * Math.min(1, v / 0.1) * Math.exp(-v / (0.12 + 0.25 * size)) * Math.min(1, (rEnd - t) / 0.08) * (0.15 + 0.25 * size); }
    out[i] = y;
  }
  c.mix(out, c.burst(r, 0.08 + 0.1 * size, "lp", 180 + 150 * sp, 0.7, 0.004, 0.02 + 0.04 * size, sr), tIn, 0.5 + 0.8 * size, sr);
  const churn = Math.round((40 + 200 * size) * (0.6 + 0.6 * sp));
  for (let k = 0; k < churn; k++) {
    const t = tIn + r() * T * 1.05;
    c.mix(out, c.burst(r, 0.01 + 0.02 * r(), "bp", 300 + 1700 * r() * (1 - 0.4 * size), 0.9, 0.001, 0.004 + 0.006 * r(), sr), t, (0.1 + 0.2 * r()) * sheetE(t), sr);
  }
  const drops = Math.round((20 + 380 * sc) * (0.4 + 0.6 * size));
  for (let d = 0; d < drops; d++) {
    const t = tIn + 0.02 + Math.pow(r(), 1.2 - 0.5 * sc) * (T + R * (0.5 + 0.8 * sc));
    c.mix(out, c.burst(r, 0.004 + 0.008 * r(), "bp", 1800 + r() * (3000 + 4000 * sc), 1.5, 0.0004, 0.002 + 0.003 * r(), sr), t, (0.05 + 0.15 * r()) * (0.4 + 0.6 * sc), sr);
  }
  if (cu > 0) {
    const tc = tIn + T * 0.4 + 0.05 + 0.08 * (1 - sp) + 0.02 * r(), cg = cu * (0.5 + 0.5 * size) * (0.7 + 0.3 * sp), k = 0.92 + 0.16 * r();
    c.mix(out, c.burst(r, 0.03, "bp", 1200 * k, 0.6, 0.0008, 0.007, sr), tc, 2.2 * cg, sr);
    c.mix(out, c.burst(r, 0.06, "lp", 260 * k, 0.7, 0.002, 0.018, sr), tc, 1.4 * cg, sr);
    c.mix(out, c.burst(r, 0.2, "lp", 3000, 0.6, 0.003, 0.05, sr), tc + 0.005, 0.6 * cg, sr);
    for (let d = 0; d < 10 + 30 * cu; d++) c.mix(out, c.burst(r, 0.006, "bp", 2000 + 3000 * r(), 1.5, 0.0004, 0.0025, sr), tc + 0.015 + 0.25 * Math.pow(r(), 1.5), (0.1 + 0.2 * r()) * cg, sr);
  }
  if (p.tail) {
    const t1 = tIn + T + 0.05, span = rEnd - 0.05 - t1, drips = Math.round(15 + 60 * size);
    for (let d = 0; d < drips; d++) {
      const t = t1 + Math.pow(r(), 1.7) * span, fall = Math.exp(-(t - t1) / (0.2 + 0.4 * size));
      c.mix(out, c.burst(r, 0.008 + 0.012 * r(), "bp", 900 + 2600 * r(), 1.5, 0.0006, 0.003 + 0.003 * r(), sr), t, (0.05 + 0.12 * r()) * (0.3 + 0.7 * fall), sr);
    }
  }
  c.finish(out, 0.55 + 0.22 * size + 0.15 * sp, 1.1);
  let last = out.length - 1;
  while (last > 0 && Math.abs(out[last]) < 0.001) last--;
  const trimmed = out.slice(0, Math.min(out.length, last + c.seconds(0.03, sr)));
  c.fade(trimmed, 12, sr);
  return { samples: trimmed };
}
