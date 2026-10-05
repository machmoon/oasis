// Storm drain: runoff swallowed by a curbside grate. A gated, surging rush and roar with slot trickle, punctuated by
// discrete gulps (the flow chokes, an air-pocket thump, rising-pitch glug clusters through a pipe comb) and slap echoes.
export const meta = {
  title: "Storm Drain Gulp", kind: "sfx", format: "sound", duration: 2.4, price: 2, author: "foleyroom", payout: "foleyroom@creators.oasis.example", kit: "Rainy City Street", description: "Rainwater pouring into a curbside storm drain that chokes and gulps down a hollow sewer pipe, for wet night streets, gutters and alley scenes.",
  tags: ["storm drain", "gurgle", "water", "gutter", "rain", "sewer", "street", "runoff"],
};
export const params = { knobs: {
  grate: { type: "choice", label: "Grate size", default: "medium", options: ["small", "medium", "large"] },
  flow: { type: "range", label: "Flow", default: 0.6, min: 0, max: 1, step: 0.01 },
  gurgle: { type: "range", label: "Gurgle", default: 0.6, min: 0, max: 1, step: 0.01 },
  echo: { type: "range", label: "Sewer echo", default: 0.4, min: 0, max: 1, step: 0.01 },
  gulpRate: { type: "range", label: "Gulp rate (per s)", default: 2, min: 0.5, max: 6, step: 0.1 },
  tail: { type: "toggle", label: "Drip tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 6151 + params.knobs.grate.options.indexOf(p.grate) * 97 + 3);
  const G = {
    small: { len: 1.4, hp: 1100, roar: 0.2, b0: 900, b1: 1300, bd: 0.035, cn: [3, 7], gm: 1.5, slot: 1, th: 180, thump: 0.25, w: 0.07, amb: 70, d: 0.0035, taps: [0.06, 0.11, 0.17] },
    medium: { len: 1.8, hp: 450, roar: 0.55, b0: 480, b1: 700, bd: 0.06, cn: [2, 5], gm: 1, slot: 0.45, th: 100, thump: 0.6, w: 0.12, amb: 40, d: 0.008, taps: [0.1, 0.19, 0.29] },
    large: { len: 2.3, hp: 170, roar: 1, b0: 240, b1: 380, bd: 0.1, cn: [1, 4], gm: 0.65, slot: 0, th: 60, thump: 1, w: 0.2, amb: 22, d: 0.015, taps: [0.15, 0.28, 0.43] },
  }[p.grate];
  const fl = p.flow, gu = p.gurgle, ec = p.echo, fEnd = G.len * (0.85 + 0.3 * r()), rate = p.gulpRate * G.gm;
  const dur = fEnd + (p.tail ? 1.15 : 0.12) + 0.55 * ec, n = c.seconds(dur, sr), out = new Float32Array(n), gl = new Float32Array(n);
  const gulps = [];
  for (let t = 0.08 + r() * 0.4 / rate; t < fEnd - 0.08; t += (0.35 + 1.3 * r()) / rate) {
    gulps.push(t);
    if (r() < 0.25 && t + 1.4 * G.w < fEnd - 0.08) gulps.push(t + 1.4 * G.w);
  }
  const duck = new Float32Array(n).fill(1), W = c.seconds(G.w, sr);
  for (const t of gulps) {
    const s0 = Math.round(t * sr);
    for (let i = 0; i < 2 * W && s0 + i < n; i++) { const x = i / W; duck[s0 + i] *= x < 1 ? 1 - 0.8 * Math.sin(Math.PI * x) : 1 + 0.35 * Math.sin(Math.PI * (x - 1)); }
  }
  const pts = [0, 1, 2, 3, 4].map(() => 0.35 + 0.65 * r());
  const fe = new Float32Array(n), kw = 1 - Math.exp(-1 / ((0.02 + 0.12 * fl) * sr)), relT = p.tail ? 0.3 : 0.05;
  let wander = 1, wt = 1;
  for (let i = 0; i < n; i++) {
    const t = i / sr, u = Math.min(3.999, 4 * t / fEnd), k = Math.floor(u), f = 0.5 - 0.5 * Math.cos(Math.PI * (u - k));
    if (i % 512 === 0) wt = r() < 0.3 + 0.7 * fl ? 0.7 + 0.5 * r() : 0.06 + 0.1 * r();
    wander += (wt - wander) * kw;
    fe[i] = Math.min(1, t / 0.06) * (t < fEnd ? 1 : Math.exp(-(t - fEnd) / relT)) * (pts[k] + (pts[k + 1] - pts[k]) * f) * wander * Math.max(0.12, duck[i]);
  }
  const rush = c.pink(r, n), hp = c.biquad("hp", G.hp, 0.7, sr), lp = c.biquad("lp", 1400 + 6000 * fl, 0.7, sr);
  for (let i = 0; i < n; i++) rush[i] = lp(hp(rush[i])) * fe[i];
  c.mix(out, rush, 0, 0.05 + 0.3 * fl, sr);
  const roar = c.brown(r, n), lr = c.biquad("lp", 90 + G.th + 150 * fl, 0.7, sr);
  for (let i = 0; i < n; i++) roar[i] = lr(roar[i]) * fe[i];
  c.mix(out, roar, 0, G.roar * (0.05 + 0.35 * fl), sr);
  const splashes = Math.round((40 + 700 * fl) * fEnd);
  for (let k = 0; k < splashes; k++) {
    const t = 0.03 + r() * fEnd;
    c.mix(out, c.burst(r, 0.003 + 0.006 * r(), "bp", (1800 + 2800 * G.slot) * (0.6 + 0.8 * r()), 2.5, 0.0004, 0.0015, sr), t, (0.08 + 0.2 * r()) * (0.1 + 0.9 * fl) * fe[Math.round(t * sr)], sr);
  }
  const bubble = (dst, t, f, d, rise, a) => {
    const m = c.seconds(d, sr), b = new Float32Array(m), k = Math.exp(-5 / m), at = 0.002 * sr;
    let ph = 0, e = 1;
    for (let i = 0; i < m; i++) { const x = i / m; ph += c.TAU * f * (1 + rise * x * x) / sr; b[i] = Math.sin(ph) * e * Math.min(1, i / at); e *= k; }
    c.mix(dst, c.fade(b, 3, sr), t, a, sr);
  };
  const trickle = Math.round((30 + 150 * G.slot) * fEnd * (0.4 + 0.6 * fl));
  for (let k = 0; k < trickle; k++) {
    const t = 0.05 + r() * (fEnd - 0.05);
    bubble(out, t, 1100 + 2400 * r(), 0.012 + 0.02 * r(), 0.8 + r(), (0.06 + 0.1 * r()) * (1 - 0.4 * fl) * Math.max(0.3, fe[Math.round(t * sr)]));
  }
  const amb = Math.round(gu * G.amb * fEnd);
  for (let k = 0; k < amb; k++) {
    const t = 0.05 + r() * (fEnd - 0.05);
    bubble(out, t, G.b0 * (1.2 + 2.5 * r()), G.bd * (0.4 + 0.5 * r()), 0.4 + 1.2 * r(), gu * (0.15 + 0.25 * r()) * (0.4 + 0.6 * fe[Math.round(t * sr)]));
  }
  for (const t of gulps) {
    const a = 0.6 + 0.4 * r(), cnt = gu > 0 ? Math.max(1, Math.round(gu * (G.cn[0] + (G.cn[1] - G.cn[0]) * r()))) : 0;
    bubble(gl, t + 0.2 * G.w, G.th * (0.9 + 0.2 * r()), 0.08 + 0.1 * G.thump, -0.4, (0.2 + 0.5 * G.thump) * (0.5 + 0.5 * fl) * a);
    c.mix(gl, c.burst(r, 0.08, "lp", G.b0 * 2, 0.8, 0.004, 0.025, sr), t + 0.3 * G.w, (0.1 + 0.25 * gu) * a, sr);
    for (let b = 0, tb = t + 0.4 * G.w; b < cnt; b++, tb += G.bd * (0.4 + 0.5 * r()))
      bubble(gl, tb, (G.b0 + G.b1 * r()) * (1 + 0.08 * b) * (1.1 - 0.2 * fl), G.bd * (0.8 + 0.6 * r()), 0.4 + 1.3 * r(), 0.7 * a * (0.35 + 0.65 * gu) * (1 - 0.1 * b));
  }
  if (p.tail) {
    const dl = 0.3 + 0.7 * fl;
    bubble(gl, fEnd + 0.05, G.b0 * 0.8, G.bd * 2.5, 1.4, (0.2 + 0.5 * gu) * dl);
    const drips = 6 + Math.round(6 * r());
    for (let k = 0; k < drips; k++) bubble(out, fEnd + 0.2 + Math.pow(r(), 1.3) * 0.8, 900 + 1600 * r(), 0.03 + 0.03 * r(), 2, (0.1 + 0.12 * r()) * dl);
  }
  const D = Math.max(2, Math.round(G.d * sr)), buf = new Float32Array(D), fb = 0.25 + 0.45 * ec, lpf = c.onepole(sr), cut = 900 + 2 * G.b0;
  for (let i = 0, j = 0; i < n; i++) { const d = lpf(buf[j], cut); buf[j] = gl[i] + fb * d; out[i] += gl[i] + 0.7 * ec * d; j = (j + 1) % D; }
  if (ec > 0) {
    const x = out.slice(), Ds = G.taps.map((s) => Math.round(s * sr)), lps = G.taps.map(() => c.onepole(sr)), tg = [0.55, 0.33, 0.2].map((g) => g * ec);
    for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) out[i] += tg[k] * lps[k](i >= Ds[k] ? x[i - Ds[k]] : 0, 2600 - 700 * k);
  }
  c.reverb(out, { size: 0.3 + 0.6 * ec, decay: p.tail ? 1.8 : 0.8, mixAmt: 0.04 + 0.22 * ec }, sr);
  let ss = 0;
  for (let i = 0; i < n; i++) ss += out[i] * out[i];
  const L = 3 * Math.sqrt(ss / n) + 1e-9;
  for (let i = 0; i < n; i++) out[i] = L * Math.tanh(out[i] / L);
  c.finish(out, 0.55 + 0.37 * fl, 1.05);
  let end = n - 1;
  while (end > 0 && Math.abs(out[end]) < 0.001) end--;
  const trimmed = out.slice(0, Math.min(n, end + c.seconds(0.03, sr)));
  c.fade(trimmed, 15, sr);
  return { samples: trimmed };
}
