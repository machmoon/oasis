// Downspout overflow: water slugs glug through a gutter pipe and splat on pavement, with bubble chirps, spray and a stream hiss. Every splat and wall strike drives the pipe's resonant modes. Tail on gives an onset, a stop and a dribble; tail off gives a seamless loop.
export const meta = {
  title: "Downspout Overflow", kind: "sfx", format: "sound", duration: 3, price: 2, author: "foleyroom", payout: "foleyroom@creators.oasis.example", kit: "Rainy City Street", description: "A rain gutter downspout gushing onto pavement in glugging slugs over a steady stream: pipe material, pour volume, splash spread, metallic ring and length are knobs; with the tail off it loops seamlessly for a whole storm scene.",
  tags: ["downspout", "gutter", "water", "pour", "splash", "rain", "pipe", "loop"],
};
export const params = { knobs: {
  material: { type: "choice", label: "Pipe material", default: "tin", options: ["tin", "plastic", "iron"] },
  volume: { type: "range", label: "Pour volume", default: 0.6, min: 0, max: 1, step: 0.01 },
  spread: { type: "range", label: "Splash spread", default: 0.5, min: 0, max: 1, step: 0.01 },
  ring: { type: "range", label: "Metallic ring", default: 0.5, min: 0, max: 1, step: 0.01 },
  length: { type: "range", label: "Length (s)", default: 3, min: 2.2, max: 3.8, step: 0.1 },
  tail: { type: "toggle", label: "Dribble tail (off = loop)", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, mi = params.knobs.material.options.indexOf(p.material), r = c.rng(p.seed * 7907 + mi * 313 + 29);
  const M = [
    { rate: 7, glug: [330, 720], splat: [750, 1.4], bf: 1.3, lp: 14000, modes: [[620, 1], [1490, 0.8], [2870, 0.6], [4300, 0.45], [5900, 0.3]], tau: 0.12, rattle: 1, rk: 1 },
    { rate: 4.5, glug: [200, 430], splat: [420, 1], bf: 0.85, lp: 2400, modes: [[250, 1], [580, 0.45]], tau: 0.012, rattle: 0, rk: 1.2 },
    { rate: 3.2, glug: [130, 300], splat: [300, 0.9], bf: 0.7, lp: 7000, modes: [[165, 1], [440, 0.8], [1090, 0.55], [2210, 0.35], [3400, 0.2]], tau: 0.3, rattle: 0, rk: 0.9 },
  ][mi];
  const v = p.volume, s = p.spread, k = p.ring, T = p.length, loop = !p.tail, A = 0.25, nyq = sr * 0.45;
  const P = loop ? T : T - 1.4, N = c.seconds(T, sr), X = c.seconds(0.2, sr), n = loop ? N + X : N, E = loop ? n / sr : P + 0.3;
  const rms = (b) => { let q = 0; for (let i = 0; i < b.length; i++) q += b[i] * b[i]; return Math.sqrt(q / b.length) + 1e-9; };
  const nrm = (b, g) => { const q = rms(b); for (let i = 0; i < b.length; i++) b[i] *= g / q; return b; };
  const flow = new Float32Array(n), kg = 1 - Math.exp(-1 / (0.12 * sr)), ks = 1 - Math.exp(-1 / (0.03 * sr));
  let g = 1, gt = 1, sp = 1, st = 1;
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    if (i % 512 === 0) gt = 0.8 + 0.4 * r();
    if (i % 1100 === 0) st = r() < 0.22 * (1.2 - 0.6 * v) ? 0.5 : 1;
    g += (gt - g) * kg; sp += (st - sp) * ks;
    const on = loop ? 1 : t < A ? (0.5 - 0.5 * Math.cos(Math.PI * t / A)) * 1.3 : 1 + 0.3 * Math.exp(-(t - A) / 0.3);
    const off = loop || t < P ? 1 : Math.exp(-(t - P) / 0.25);
    flow[i] = on * off * g * sp;
  }
  const flowAt = (t) => flow[Math.min(n - 1, Math.max(0, Math.floor(t * sr)))];
  const bub = (buf, at, f0, dur, amp, rise, att) => {
    if (at < 0) return;
    const i0 = Math.floor(at * sr), len = Math.floor(dur * sr), d = Math.exp(-4 / len); let ph = 0, e = 1;
    for (let j = 0; j < len && i0 + j < buf.length; j++) {
      ph += c.TAU * Math.min(nyq, f0 * (1 + rise * j / len)) / sr; e *= d;
      buf[i0 + j] += amp * Math.sin(ph) * Math.min(1, j / (att * sr)) * e * (1 - j / len);
    }
  };
  const hit = new Float32Array(n), bubl = new Float32Array(n), drop = new Float32Array(n), ex = new Float32Array(n);
  const strike = (at, a) => {
    at = Math.max(0, at);
    c.mix(ex, c.burst(r, 0.004, "hp", 1500 + 2000 * r(), 0.7, 0.0003, 0.0012, sr), at, a, sr);
    if (M.rattle) for (let j = 0; j < 5; j++) c.mix(ex, c.burst(r, 0.003, "bp", 3500 + r() * 2500, 5, 0.0003, 0.001, sr), at + j * (0.011 + 0.006 * r()), a * 0.6 * (1 - j / 5), sr);
  };
  let t = 0.03;
  while (t < E) {
    const fl = flowAt(t);
    if (fl > 0.04) {
      const a = fl * (0.7 + 0.3 * r());
      c.mix(hit, c.burst(r, 0.05 + 0.05 * v, "bp", M.splat[0] * (0.8 + 0.4 * r()), M.splat[1], 0.002, 0.012 + 0.02 * v, sr), t, a, sr);
      c.mix(hit, c.burst(r, 0.07, "lp", 130 + 70 * r(), 0.9, 0.003, 0.02 + 0.03 * v, sr), t, a * 2.5 * v, sr);
      bub(hit, t - 0.03, M.glug[0] * (0.9 + 0.2 * r()), 0.05 + 0.04 * r(), a * 0.35, M.glug[1] / M.glug[0] - 1, 0.008);
      const nb = 2 + Math.floor(r() * (3 + 5 * v));
      for (let j = 0; j < nb; j++) bub(bubl, t + 0.005 + r() * 0.12, M.bf * (1.3 - 0.6 * v) * 450 * Math.pow(2, r() * 2), 0.015 + 0.03 * r(), a * (0.4 + 0.6 * r()), 0.6 + 0.8 * r(), 0.001);
      const nd = Math.round(3 + 20 * s);
      for (let j = 0; j < nd; j++) {
        const f = Math.min(nyq, 1600 * Math.pow(2, (r() * 2 - 1) * (0.3 + 1.5 * s)));
        c.mix(drop, c.burst(r, 0.004 + 0.01 * r(), "bp", f, 3 - 1.8 * s, 0.0004, 0.0015 + 0.003 * r(), sr), t + 0.004 + Math.pow(r(), 1.6) * (0.03 + 0.3 * s), a * (0.3 + 0.7 * r()), sr);
      }
      strike(t - 0.012, a);
    }
    t += (0.6 + 0.8 * r()) / (M.rate * (0.3 + 1.1 * v));
  }
  const nw = Math.round(14 * E);
  for (let j = 0; j < nw; j++) { const tw = r() * E; strike(tw, 0.4 * flowAt(tw) * r()); }
  const nbg = Math.round((100 + 250 * v) * E);
  for (let j = 0; j < nbg; j++) { const tb = r() * E; bub(bubl, tb, M.bf * (1.4 - 0.6 * v) * 500 * Math.pow(2, r() * 2), 0.012 + 0.025 * r(), 0.4 * flowAt(tb) * r(), 0.8, 0.001); }
  if (!loop) {
    let td = P + 0.12, iv = 0.06;
    while (td < P + 0.95) {
      const a = Math.exp(-(td - P) / 0.7);
      bub(bubl, td, (700 + r() * 900) * M.bf, 0.03 + 0.02 * r(), a * 0.8, 1.2, 0.001);
      c.mix(drop, c.burst(r, 0.006, "bp", 2500 + r() * 2500, 2, 0.0004, 0.002, sr), td, a * 0.8, sr);
      c.mix(hit, c.burst(r, 0.03, "bp", M.splat[0] * 1.5, 1.5, 0.001, 0.008, sr), td, a * 0.25, sr);
      strike(td - 0.01, a * 0.5);
      td += iv * (0.6 + 0.8 * r()); iv *= 1.25;
    }
  }
  const stream = c.pink(r, n), bedL = c.brown(r, n), bedM = c.pink(r, n), o1 = c.onepole(sr), o2 = c.onepole(sr), cut = Math.min(M.lp, nyq);
  const h1 = c.biquad("hp", 1100, 0.7, sr), l1 = c.biquad("lp", Math.min(nyq, 2500 + 4500 * v), 0.7, sr), lb = c.biquad("lp", 220 + 150 * v, 0.8, sr), bb = c.biquad("bp", M.splat[0], 0.9, sr);
  let fk = 1, fkt = 1;
  for (let i = 0; i < n; i++) {
    if (i % 96 === 0) fkt = 0.4 + 0.6 * r();
    fk += (fkt - fk) * 0.05;
    stream[i] = o1(l1(h1(stream[i])), cut) * flow[i] * fk; bedL[i] = lb(bedL[i]) * flow[i]; bedM[i] = bb(bedM[i]) * flow[i] * fk; bubl[i] = o2(bubl[i], cut);
  }
  nrm(hit, 0.35 + 0.65 * v); nrm(bubl, 0.75); nrm(drop, (0.15 + 0.75 * s) * (0.6 + 0.4 * v)); nrm(stream, 0.3 + 0.15 * v); nrm(bedL, 0.5 * v); nrm(bedM, 0.2 + 0.15 * v); nrm(ex, 0.6);
  for (let i = 0; i < n; i++) ex[i] += hit[i] + 0.4 * drop[i] + 0.3 * bubl[i] + 0.05 * stream[i];
  const res = new Float32Array(n);
  for (const [f, a] of M.modes) { const bq = c.biquad("bp", f * (0.99 + 0.02 * r()), Math.PI * f * M.tau, sr); for (let i = 0; i < n; i++) res[i] += bq(ex[i]) * a; }
  nrm(res, k * M.rk);
  let out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = hit[i] + bubl[i] + drop[i] + stream[i] + bedL[i] + bedM[i] + res[i];
  if (loop) {
    const o = out.slice(0, N);
    for (let i = 0; i < X; i++) { const a = i / X * Math.PI / 2; o[i] = out[i] * Math.sin(a) + out[N + i] * Math.cos(a); }
    out = o; c.finish(out, 0.9, 1.3);
  } else {
    const dry = out.slice(), t1 = Math.round(0.11 * sr), t2 = Math.round(0.19 * sr), elp = c.biquad("lp", 2500, 0.7, sr);
    for (let i = 0; i < n; i++) out[i] += elp((i >= t1 ? 0.25 * dry[i - t1] : 0) + (i >= t2 ? 0.14 * dry[i - t2] : 0));
    c.fade(c.finish(out, 0.9, 1.3), 60, sr);
  }
  return { samples: out };
}
