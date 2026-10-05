// Awning shelter: rain drumming on a canvas, vinyl or metal awning (pulse-excited modal membrane plus a material tick), a pouring runoff band with bubbles, a muffled street rumble with tyre passes, and a thin rain hiss beyond.
export const meta = {
  title: "Awning Shelter", kind: "ambience", format: "sound", duration: 3, price: 4, author: "stormfront", payout: "stormfront@creators.oasis.example", kit: "Rainy City Street", description: "A loopable bed heard from under a shop awning at night, with rain drumming on canvas, vinyl or metal overhead, runoff pouring off the edge and the street hushed beyond; use it for a sheltered doorway in a rainy downtown scene.",
  tags: ["rain", "awning", "ambience", "loop", "city", "night", "shelter", "runoff"],
};
export const params = { knobs: {
  material: { type: "choice", label: "Awning material", default: "canvas", options: ["canvas", "vinyl", "metal"] },
  intensity: { type: "range", label: "Drum intensity", default: 0.5, min: 0, max: 1, step: 0.01 },
  runoff: { type: "range", label: "Runoff stream", default: 0.4, min: 0, max: 1, step: 0.01 },
  street: { type: "range", label: "Muffled street", default: 0.35, min: 0, max: 1, step: 0.01 },
  loop: { type: "toggle", label: "Loop crossfade", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, ny = sr * 0.45, mats = params.knobs.material.options;
  const r = c.rng(p.seed * 977 + Math.max(0, mats.indexOf(p.material)) * 131 + 11);
  const dur = 3, xf = p.loop ? 0.4 : 0, T = dur + xf, N = c.seconds(T, sr), n = c.seconds(dur, sr);
  const I = p.intensity, buf = new Float32Array(N), exc = new Float32Array(N), tk = new Float32Array(N);
  const rnorm = (b) => { let s = 0; for (let i = 0; i < b.length; i++) s += b[i] * b[i]; const g = 1 / Math.sqrt(s / b.length + 1e-12); for (let i = 0; i < b.length; i++) b[i] *= g; return b; };
  const canvas = { pw: 0.0016, type: "lp", f: 1100, q: 0.7, tick: 0.22, td: 0.003, body: 1.1, modes: [[118, 0.05, 1], [196, 0.035, 0.55], [318, 0.022, 0.3]] };
  const mat = {
    canvas,
    vinyl: { pw: 0.0006, type: "bp", f: 3000, q: 1.4, tick: 0.9, td: 0.0015, body: 0.8, modes: [[340, 0.02, 1], [720, 0.014, 0.7], [1250, 0.01, 0.45]] },
    metal: { pw: 0.00025, type: "hp", f: 4500, q: 0.8, tick: 0.3, td: 0.002, body: 0.55, modes: [[780, 0.13, 0.6], [1640, 0.11, 1], [2710, 0.09, 0.8], [3900, 0.07, 0.5], [5300, 0.05, 0.3]] },
  }[p.material] || canvas;
  const keep = (t) => p.loop || t < dur - 0.8 || r() < (dur - t) / 0.8;
  const drop = (t, h) => {
    const L = Math.max(2, Math.round(mat.pw * (0.7 + 0.6 * r()) * sr)), at = Math.floor(t * sr);
    for (let i = 0; i < L && at + i < N; i++) exc[at + i] += h * (1 - Math.cos(c.TAU * i / L)) / L;
    c.mix(tk, c.burst(r, 0.004 + 0.004 * r(), mat.type, Math.min(ny, mat.f * (0.8 + 0.4 * r())), mat.q, 0.0004, mat.td, sr), t, h * mat.tick, sr);
  };
  const big = Math.round((4 + 26 * I) * T), small = Math.round(260 * I * I * T);
  for (let d = 0; d < big; d++) { const t = r() * (T - 0.02); if (keep(t)) drop(t, 0.5 + 0.5 * r() * r()); }
  for (let d = 0; d < small; d++) { const t = r() * (T - 0.02); if (keep(t)) drop(t, 0.08 + 0.18 * r()); }
  const modes = mat.modes.filter((m) => m[0] * 1.1 < ny).map(([f, tau, a]) => {
    const w = c.TAU * f * (0.96 + 0.08 * r()) / sr, R = Math.exp(-1 / (tau * sr));
    return { c1: 2 * R * Math.cos(w), c2: -R * R, g: Math.sin(w) * a, y1: 0, y2: 0 };
  });
  for (let i = 0; i < N; i++) {
    const e = exc[i]; let b = 0;
    for (let k = 0; k < modes.length; k++) { const m = modes[k], y = m.c1 * m.y1 + m.c2 * m.y2 + m.g * e; m.y2 = m.y1; m.y1 = y; b += y; }
    buf[i] = b * mat.body + tk[i];
  }
  const hiss = c.pink(r, N), hp = c.biquad("hp", 1500, 0.7, sr), lp = c.biquad("lp", Math.min(ny, 7000), 0.7, sr);
  for (let i = 0; i < N; i++) hiss[i] = lp(hp(hiss[i]));
  c.mix(buf, rnorm(hiss), 0, 0.025 + 0.09 * I * I, sr);
  if (p.runoff > 0) {
    const m = p.runoff, s = c.noise(r, N), bp = c.biquad("bp", 600 + 300 * m, 2.5, sr), sp = c.noise(r, N), bp2 = c.biquad("bp", 2400, 3, sr);
    for (let i = 0; i < N; i++) { s[i] = bp(s[i]); sp[i] = bp2(sp[i]); }
    rnorm(s); rnorm(sp);
    const sm = 1 - Math.exp(-1 / (0.006 * sr)); let fl = 0.7, tgt = 0.7;
    for (let i = 0; i < N; i++) { if (i % 256 === 0) tgt = 0.45 + 0.55 * r(); fl += (tgt - fl) * sm; buf[i] += (s[i] * 0.2 + sp[i] * 0.05) * fl * m; }
    for (let b = 0, nb = Math.round((10 + 110 * m) * T); b < nb; b++) {
      const f0 = 420 + r() * 1100, rise = 10 + r() * 30, len = c.seconds(0.03 + r() * 0.04, sr), at = Math.floor(r() * (N - len - 1));
      const dk = Math.exp(-1 / ((0.006 + r() * 0.012) * sr)), amp = (0.06 + 0.12 * r()) * m, att = 0.0015 * sr;
      let ph = 0, ev = 1;
      for (let i = 0; i < len; i++) { ph += c.TAU * Math.min(ny, f0 * (1 + rise * i / sr)) / sr; ev *= dk; buf[at + i] += Math.sin(ph) * ev * Math.min(1, i / att) * amp; }
    }
  }
  if (p.street > 0) {
    const s = p.street, low = c.brown(r, N), l1 = c.biquad("lp", 170, 0.8, sr), h1 = c.biquad("hp", 30, 0.7, sr);
    for (let i = 0; i < N; i++) low[i] = l1(h1(low[i]));
    rnorm(low);
    const w = c.pink(r, N), op = c.onepole(sr), passes = [];
    for (let k = 0, np = 1 + Math.floor(r() * 3); k < np; k++) passes.push([r() * T, 0.35 + r() * 0.6, 0.6 + 0.6 * r()]);
    const tyre = new Float32Array(N); let e = 0;
    for (let i = 0; i < N; i++) {
      if (i % 64 === 0) { e = 0.15; for (let k = 0; k < passes.length; k++) { const z = (i / sr - passes[k][0]) / passes[k][1]; e += passes[k][2] * Math.exp(-z * z); } }
      tyre[i] = op(w[i], 300 + 700 * e) * e;
    }
    rnorm(tyre);
    for (let i = 0; i < N; i++) buf[i] += low[i] * 0.3 * s + tyre[i] * 0.16 * s;
  }
  for (let i = 0; i < N; i++) if (!isFinite(buf[i])) buf[i] = 0;
  const out = new Float32Array(n), x = c.seconds(xf, sr);
  for (let i = 0; i < n; i++) {
    if (i < x && n + i < N) { const u = Math.PI / 2 * i / x; out[i] = buf[i] * Math.sin(u) + buf[n + i] * Math.cos(u); }
    else out[i] = buf[i];
    if (!p.loop) { const t = i / sr; let g = Math.min(1, t / 0.05); if (t > dur - 0.6) g *= 0.5 + 0.5 * Math.cos(Math.PI * (t - dur + 0.6) / 0.6); out[i] *= g; }
  }
  c.finish(out, 0.55 + 0.3 * I + 0.05 * p.runoff, 1.4);
  c.fade(out, p.loop ? 10 : 20, sr);
  for (let i = 0; i < n; i++) if (!isFinite(out[i])) out[i] = 0;
  return { samples: out };
}
