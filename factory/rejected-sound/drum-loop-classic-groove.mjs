// Classic groove: one bar of 16 steps from synthesized analogue voices (pitch-swept kick, tone+noise snare, metallic square-stack hats, clap bursts, toms, cowbell), circuit picks tuning, a quiet 16th ghost-hat shuffle, room tails and circuit hiss keep the bar continuous, and tails wrap round the bar for a seamless seam.
export const meta = {
  title: "Classic Groove", kind: "music-loop", format: "sound", duration: 2.4, price: 5, author: "kickdrum", payout: "kickdrum@creators.oasis.example", kit: "Drum Machine",
  description: "A one-bar analogue drum machine loop on 808, 909 or CR-78 voices with tempo, swing, density, accent and a tom fill into the turnaround, for game menus, montages and beat-driven scenes.",
  tags: ["drum machine", "beat", "loop", "808", "909", "cr78", "groove", "analog"],
};
export const params = { knobs: {
  circuit: { type: "choice", label: "Circuit", default: "808", options: ["808", "909", "cr78"] },
  tempo: { type: "range", label: "Tempo", default: 100, min: 80, max: 140, step: 1 },
  swing: { type: "range", label: "Swing", default: 0.3, min: 0, max: 1, step: 0.01 },
  density: { type: "range", label: "Density", default: 0.5, min: 0, max: 1, step: 0.01 },
  accent: { type: "range", label: "Accent", default: 0.5, min: 0, max: 1, step: 0.01 },
  fill: { type: "toggle", label: "Fill", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + 11), ci = params.knobs.circuit.options.indexOf(p.circuit), dn = p.density;
  const step = 60 / p.tempo / 4, nBar = c.seconds(step * 16, sr), ext = new Float32Array(nBar + c.seconds(0.6, sr));
  const kick = (v) => {
    const dur = [0.45, 0.3, 0.2][ci], n = c.seconds(dur, sr), f0 = [140, 200, 130][ci], f1 = [46, 52, 75][ci];
    const x = c.osc("sine", (t) => f1 + (f0 - f1) * Math.exp(-t * 30), n, sr), e = c.env(n, 0.001, dur * 0.45, sr);
    for (let i = 0; i < n; i++) x[i] *= e[i];
    c.mix(x, c.burst(r, 0.008, "hp", 2500, 0.8, 0.0003, 0.002, sr), 0, ci === 1 ? 0.45 : 0.15, sr);
    return c.gain(x, v * 0.85);
  };
  const snare = (v) => {
    const x = new Float32Array(c.seconds(0.25, sr));
    c.mix(x, c.ring([[[185, 200, 330][ci], 0.8], [[330, 340, 520][ci], 0.4]], 0.14, 0.04, sr), 0, 0.6, sr);
    c.mix(x, c.burst(r, 0.22, "bp", [3000, 4200, 2200][ci], 0.8, 0.001, [0.08, 0.1, 0.06][ci], sr), 0, 0.8, sr);
    return c.gain(x, v);
  };
  const hat = (v, dur) => {
    const n = c.seconds(dur + 0.02, sr), x = new Float32Array(n), hp = c.biquad("hp", [7000, 6000, 4500][ci], 0.8, sr);
    for (const m of [2, 3, 4.16, 5.43, 6.79, 8.21]) { const o = c.osc(ci === 2 ? "tri" : "square", 205 * m * (ci === 1 ? 1.1 : 1), n, sr); for (let i = 0; i < n; i++) x[i] += o[i] * 0.2; }
    const e = c.env(n, 0.0005, dur * 0.3, sr);
    for (let i = 0; i < n; i++) x[i] = hp(x[i]) * e[i];
    c.mix(x, c.burst(r, dur, "hp", 8000, 0.7, 0.0004, dur * 0.25, sr), 0, 0.3, sr);
    return c.gain(x, v);
  };
  const clap = (v) => {
    const x = new Float32Array(c.seconds(0.2, sr));
    for (let k = 0; k < 3; k++) c.mix(x, c.burst(r, 0.015, "bp", 1200 + r() * 300, 1.5, 0.0005, 0.006, sr), k * 0.011, 0.6, sr);
    c.mix(x, c.burst(r, 0.18, "bp", 1300, 1.2, 0.002, 0.06, sr), 0.033, 0.7, sr);
    return c.gain(x, v);
  };
  const tom = (v, f) => {
    const n = c.seconds(0.26, sr), x = c.osc("sine", (t) => f * [1, 1.25, 1.6][ci] * (1 + 0.5 * Math.exp(-t * 25)), n, sr), e = c.env(n, 0.001, 0.09, sr);
    for (let i = 0; i < n; i++) x[i] *= e[i];
    c.mix(x, c.burst(r, 0.006, "bp", 1800, 1, 0.0003, 0.002, sr), 0, 0.2, sr);
    return c.gain(x, v);
  };
  const cow = (v) => c.gain(c.ring([[[560, 540, 800][ci], 1], [[845, 800, 1190][ci], 0.8]], 0.25, 0.07, sr), v);
  const rim = (v) => { const x = c.ring([[1700, 1], [480, 0.6]], 0.05, 0.01, sr); c.mix(x, c.burst(r, 0.01, "hp", 3000, 0.8, 0.0003, 0.002, sr), 0, 0.5, sr); return c.gain(x, v); };
  const K = new Set([0, 10]);
  [6, 8, 3, 14, 7, 15, 11].forEach((s, j) => { if (r() < dn * 0.95 - j * 0.07) K.add(s); });
  const ghost = dn > 0.6 && r() < 0.8, fillOn = p.fill, put = (x, t, g) => c.mix(ext, x, t, g, sr);
  for (let s = 0; s < 16; s++) {
    const w = [1, 0.45, 0.7, 0.45][s % 4], lvl = (1 - p.accent * (1 - w)) * (0.94 + 0.06 * r());
    const t = s * step + (s % 2 ? step * 0.34 * p.swing : 0) + (s ? (r() - 0.5) * 0.003 : 0);
    const inFill = fillOn && s >= 12, open = s === 10 || (s === 14 && !fillOn);
    if (K.has(s) && !(fillOn && s >= 14)) put(kick(0.35 + 0.65 * lvl), t, 1);
    if (s === 4 || s === 12) { put(snare(0.4 + 0.6 * lvl), t, 1); if (dn > 0.4) put(clap(0.3 + 0.2 * lvl), t, 1); }
    if (s === 9 && ghost) put(snare(0.2), t, 1);
    if (open) put(hat(0.3 + 0.25 * lvl, Math.min(0.3, step * 2)), t, 1);
    else if (!inFill && !(s > 0 && (s - 1 === 10 || (s - 1 === 14 && !fillOn))) && (s % 2 === 0 || r() < dn * 0.7)) put(hat((s % 4 === 2 ? 0.6 : 0.35) * (0.3 + 0.7 * lvl), 0.04), t, 1);
    else if (!(s > 0 && (s - 1 === 10 || (s - 1 === 14 && !fillOn)))) put(hat(0.1 + 0.05 * r(), 0.03), t, 1);
    if (dn > 0.5 && (s === 7 || (s === 15 && !fillOn))) put(rim(0.2 + 0.25 * lvl), t, 1);
    if (dn > 0.7 && (s === 3 || s === 11)) put(cow(0.1 + 0.25 * lvl), t, 1);
    if (inFill && s > 12) put(tom(0.7 + 0.3 * lvl, [0, 220, 165, 120][s - 12]), t, 1);
    if (fillOn && s === 15) put(snare(0.6), t + step * 0.5, 1);
  }
  const hn = ext.length, hiss = c.pink(r, hn), lp = c.biquad("lp", 6000, 0.7, sr);
  for (let i = 0; i < hn; i++) hiss[i] = lp(hiss[i]);
  c.mix(ext, hiss, 0, 0.05, sr);
  const rv = c.reverb(ext, { size: 0.35, decay: 0.45, mixAmt: 0.3 }, sr) || ext;
  const out = new Float32Array(nBar);
  for (let i = 0; i < rv.length; i++) out[i % nBar] += rv[i];
  c.fade(c.finish(out, 0.88, 1.3), 1, sr);
  return { samples: out };
}
