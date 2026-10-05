// Neon flicker-out: a failing sign tube. The core is an additive mains-buzz harmonic comb, gated by a seeded schedule.
// That schedule runs strike-up blips, an unsteady opening, weakening restrikes and a death flutter, then a few ghost restrikes.
// Every ignition carries a bright zap, a chirp and a glass ping. Pulse-synced arc fizz, crackle grains and a pop sit on top, with an optional room.
export const meta = {
  title: "Neon Flicker Out", kind: "sfx", format: "sound", duration: 1.4, price: 2, author: "foleyroom", payout: "foleyroom@creators.oasis.example", kit: "Rainy City Street", description: "A neon sign tube buzzing unsteadily, sputtering with ever weaker zapping restrikes and dying with a crackle and pop; for a rain-soaked street at night, a failing motel sign or a power cut.",
  tags: ["neon", "flicker", "buzz", "electric", "crackle", "sign", "city", "night"],
};
export const params = { knobs: {
  size: { type: "choice", label: "Tube size", default: "medium", options: ["small", "medium", "large"] },
  crackle: { type: "range", label: "Crackle", default: 0.5, min: 0, max: 1, step: 0.01 },
  stutter: { type: "range", label: "Stutter count", default: 0.5, min: 0, max: 1, step: 0.01 },
  bright: { type: "range", label: "Zap brightness", default: 0.5, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Decay tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 6151 + params.knobs.size.options.indexOf(p.size) * 97 + 3);
  const S = { small: { f: 200, H: 20, tilt: 0.75, ev: 0.55, on: 0.14, gap: 0.7, m: [3100, 7200], pop: 320, g: 0.8, fl: 24 },
    medium: { f: 120, H: 28, tilt: 1, ev: 0.85, on: 0.22, gap: 1, m: [1900, 4500], pop: 190, g: 1, fl: 16 },
    large: { f: 60, H: 36, tilt: 1.2, ev: 1.15, on: 0.3, gap: 1.4, m: [1150, 2800], pop: 105, g: 1.15, fl: 10 } }[p.size];
  const cr = p.crackle, br = p.bright, k = 3 + Math.round(p.stutter * 7), iv = [];
  let t = 0;
  const pre = Math.floor(r() * 3.5);
  for (let j = 0; j < pre; j++) { const len = 0.01 + 0.015 * r(); iv.push([t, t + len, 0.45 + 0.35 * r(), 0.1]); t += len + 0.015 + 0.03 * r(); }
  const open = S.on + r() * 0.1; iv.push([t, t + open, 1, 0]); t += open;
  const clus = r() < 0.5;
  for (let j = 0; j < k; j++) {
    const fr = (j + 1) / (k + 1);
    t += (clus && j % 3 ? 0.012 + 0.02 * r() : 0.04 + 0.08 * r()) * S.gap * (1 + 0.5 * fr);
    const len = (0.02 + r() * 0.07) * (0.7 + 0.3 * S.gap) + (j === k - 1 ? 0.1 + 0.05 * S.gap : 0);
    iv.push([t, t + len, (0.95 - 0.55 * fr) * (0.8 + 0.3 * r()), fr]);
    t += len;
  }
  const T = t, D = iv.length - 1;
  if (p.tail) {
    const gh = 2 + Math.round(2 * cr + 2 * r()); let u = T + 0.06;
    for (let j = 0; j < gh; j++) { u += (0.05 + 0.1 * r()) * (1 + 0.4 * j); const len = 0.008 + 0.025 * r(); iv.push([u, u + len, Math.max(0.06, 0.3 - 0.05 * j) * (0.6 + 0.5 * r()), 1]); u += len; }
    t = u;
  }
  const n = c.seconds(t + 0.25 + (p.tail ? 0.35 : 0), sr), out = new Float32Array(n);
  const tgt = new Float32Array(n), sag = new Float32Array(n), wf = 6 + 7 * r();
  for (let q = 0; q < iv.length; q++) {
    const [s0, s1, lv, fr] = iv[q], a = Math.floor(s0 * sr), b = Math.min(n, Math.floor(s1 * sr));
    const pd = 0.2 + 0.35 * p.stutter + 0.3 * fr; let left = 0, dv = 1, fp = 0;
    for (let i = a; i < b; i++) {
      const u = (i - a) / (b - a);
      if (--left <= 0) { dv = r() < pd ? 0.12 + 0.5 * r() : 0.85 + 0.15 * r(); left = c.seconds(0.005 + 0.025 * r(), sr); }
      let v = lv * dv * (1 - 0.15 * (0.5 + 0.5 * Math.sin(c.TAU * wf * i / sr)));
      if (q === D) { fp += S.fl * (1 + 3 * u * u) / sr; v *= (1 - 0.5 * u) * ((fp % 1) < 0.55 ? 1 : 1 - 0.95 * u); }
      tgt[i] = v; sag[i] = fr;
    }
  }
  for (let i = 1; i < n; i++) if (tgt[i] === 0) sag[i] = sag[i - 1];
  const H = Math.min(40, Math.round(S.H * (0.7 + 0.6 * br))), amp = new Float32Array(H + 1), fc = S.f * (6 + 10 * r()), ex = S.tilt * (1.2 - 0.7 * br);
  let sum = 0;
  for (let h = 1; h <= H; h++) { const d = (S.f * h - fc) / (fc * 0.4); amp[h] = Math.pow(h, -ex) * (0.7 + 0.6 * r()) * (1 + 1.2 * Math.exp(-d * d)) * (h % 2 ? 1 : S.ev); sum += amp[h]; }
  for (let h = 1; h <= H; h++) amp[h] /= sum;
  const aOn = 1 - Math.exp(-1 / (0.0015 * sr)), aOff = 1 - Math.exp(-1 / (0.005 * sr));
  const zbp = c.biquad("bp", 3500 + 4000 * br, 1.1, sr), hiss = c.noise(r, n), drive = 1.5 + 2 * br;
  let g = 0, ph = 0;
  for (let i = 0; i < n; i++) {
    g += (tgt[i] - g) * (tgt[i] > g ? aOn : aOff);
    const z = zbp(hiss[i]);
    if (g < 1e-4) continue;
    ph += S.f * (1 - 0.035 * sag[i] - 0.015 * (1 - g)) / sr; if (ph > 1) ph -= 1;
    const th = c.TAU * ph, c1 = Math.cos(th), s1 = Math.sin(th);
    let ch = c1, sh = s1, x = 0;
    for (let h = 1; h <= H; h++) { x += amp[h] * sh; const nc = ch * c1 - sh * s1; sh = sh * c1 + ch * s1; ch = nc; }
    let pq = 0.5 + 0.5 * c1; pq *= pq; pq *= pq; pq *= pq;
    out[i] = (Math.tanh(drive * x) * 0.6 * S.g + z * pq * (0.03 + 0.3 * cr) * (0.6 + sag[i])) * g;
  }
  const modes = (d) => [[S.m[0] * d, 1], [S.m[1] * d, 0.4]];
  for (let q = 0; q < iv.length; q++) {
    const [s0, s1, lv] = iv[q], zl = Math.sqrt(lv), m = c.seconds(0.016, sr), f0 = (4000 + 6000 * br) * (0.8 + 0.4 * r());
    const chirp = c.osc("sine", (tt) => 1500 + f0 * Math.exp(-tt * 300), m, sr);
    c.multiply(chirp, c.env(m, 0.0004, 0.004, sr));
    c.mix(out, chirp, s0, (0.15 + 0.3 * br) * zl, sr);
    c.mix(out, c.burst(r, 0.008, "hp", 3500 + 5000 * br, 0.7, 0.0003, 0.0008 + 0.0015 * cr, sr), s0, (0.25 + 0.3 * br) * zl, sr);
    c.mix(out, c.ring(modes(0.97 + 0.06 * r()), 0.08, 0.01 + 0.01 * br, sr), s0 + 0.001, (0.05 + 0.1 * br) * zl, sr);
    c.mix(out, c.burst(r, 0.006, "bp", 3000 + 4000 * br, 2, 0.0003, 0.0012, sr), s1, (0.06 + 0.2 * cr) * zl, sr);
  }
  const grains = Math.round(cr * (40 + 18 * k));
  for (let q = 0; q < grains; q++) {
    const s = iv[Math.floor(r() * iv.length)], at = r() < 0.6 ? s[0] + Math.pow(r(), 2) * 0.05 : s[0] + r() * (s[1] - s[0]);
    c.mix(out, c.burst(r, 0.002 + 0.003 * r(), "hp", 2500 + 5000 * r() * (0.5 + br), 0.7, 0.0003, 0.0008, sr), at, (0.08 + 0.25 * r()) * (0.5 + 0.5 * s[2]), sr);
  }
  const death = Math.round(4 + 50 * cr);
  for (let q = 0; q < death; q++) c.mix(out, c.burst(r, 0.002 + 0.004 * r(), "bp", (2000 + 5000 * br) * (0.6 + 0.8 * r()), 2, 0.0003, 0.001, sr), T - 0.09 + Math.pow(r(), 1.5) * 0.14, (0.15 + 0.35 * r()) * (0.4 + 0.6 * cr), sr);
  c.mix(out, c.ring([[S.pop, 1], [S.pop * 2.3, 0.3]], 0.15, 0.03, sr), T, 0.35 * S.g, sr);
  c.mix(out, c.burst(r, 0.03, "lp", 800 + 1200 * br, 0.8, 0.001, 0.008, sr), T, 0.3, sr);
  c.mix(out, c.ring(modes(0.97 + 0.06 * r()), 0.2, 0.04, sr), T + 0.002, 0.1, sr);
  if (p.tail) {
    const late = Math.round(3 + 25 * cr), span = t - T + 0.15;
    for (let q = 0; q < late; q++) c.mix(out, c.burst(r, 0.003, "hp", 3000 + 4000 * br, 0.7, 0.0003, 0.0007, sr), T + 0.03 + Math.pow(r(), 1.5) * span, 0.06 + 0.14 * r(), sr);
    const ticks = 2 + Math.floor(r() * 3);
    for (let q = 0; q < ticks; q++) c.mix(out, c.ring(modes(1.1 + 0.4 * r()), 0.05, 0.006 + 0.006 * r(), sr), T + 0.08 + r() * span, 0.04 + 0.05 * r(), sr);
    c.reverb(out, { size: 0.55, decay: 0.6, mixAmt: 0.25 }, sr);
  }
  c.finish(out, 0.9, 1.1);
  let e = n - 1;
  while (e > 0 && Math.abs(out[e]) < 0.001) e--;
  const res = out.slice(0, Math.min(n, e + c.seconds(0.012, sr)));
  c.fade(res, 8, sr);
  return { samples: res };
}
