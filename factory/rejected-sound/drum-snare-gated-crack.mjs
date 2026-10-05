// Gated crack snare: a saturated dry hit (pitch-dropping shell, 2-4 ms crack click, fast-decaying wire noise) plus an unsaturated noise-wash room that holds level then is chopped to silence by a hard gate.
export const meta = {
  title: "Gated Crack Snare", kind: "sfx", format: "sound", duration: 0.6, price: 2, author: "kickdrum", payout: "kickdrum@creators.oasis.example", kit: "Drum Machine", description: "A bright cracking analogue snare with a gated noise tail, for 80s-style drum hits, stingers and musical one-shots; size, crack, gate length and saturation are knobs.",
  tags: ["snare", "gated", "crack", "drum machine", "80s", "hit", "percussion", "one-shot"],
};
export const params = { knobs: {
  size: { type: "choice", label: "Size", default: "room", options: ["tight", "room", "hall"] },
  crack: { type: "range", label: "Crack", default: 0.6, min: 0, max: 1, step: 0.01 },
  gate: { type: "range", label: "Gate length", default: 0.5, min: 0, max: 1, step: 0.01 },
  saturation: { type: "range", label: "Saturation", default: 0.35, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Gated tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const si = params.knobs.size.options.indexOf(p.size);
  const sr = c.sr, r = c.rng(p.seed * 613 + si * 29 + 3);
  const fund = [235, 200, 170][si] * (0.92 + r() * 0.16);
  const gateLen = (0.12 + 0.2 * p.gate) * [0.7, 1, 1.6][si] * (0.94 + r() * 0.12);
  const total = p.tail ? gateLen + 0.07 : 0.26 + 0.05 * si;
  const n = c.seconds(total, sr), out = new Float32Array(n), dry = new Float32Array(n);
  const bn = Math.min(n, c.seconds(0.2, sr));
  const drop = 1 + 1.2 * p.crack;
  const body = c.osc("tri", (t) => fund * (1 + drop * Math.exp(-t / 0.014)), bn, sr);
  c.multiply(body, c.env(bn, 0.0008, 0.03 + 0.02 * si, sr));
  c.mix(dry, body, 0, 0.9, sr);
  const dt = 0.97 + r() * 0.06;
  c.mix(dry, c.ring([[fund * 1.5 * dt, 0.5], [fund * 2.3, 0.3], [fund * 3.4 * dt, 0.15]], 0.12, 0.025 + 0.008 * si, sr), 0.001, 0.3, sr);
  c.mix(dry, c.burst(r, 0.01, "hp", 3500 + 5500 * p.crack, 0.8, 0.0003, 0.003, sr), 0, 0.4 + 1.3 * p.crack, sr);
  c.mix(dry, c.burst(r, 0.005, "bp", 6000 + 2500 * r(), 2, 0.0003, 0.0015, sr), 0.0004 + 0.0008 * r(), 0.1 + 0.8 * p.crack, sr);
  const wl = Math.min(n, c.seconds(0.3, sr)), wire = c.noise(r, wl), wd = [0.04, 0.06, 0.08][si] * (0.85 + r() * 0.3);
  const hp = c.biquad("hp", 1800 + 1500 * p.crack, 0.7, sr), bp = c.biquad("bp", 4500 + 2000 * p.crack, 0.6, sr);
  for (let i = 0; i < wl; i++) wire[i] = (hp(wire[i]) * 0.6 + bp(wire[i]) * 0.8) * Math.min(1, i / (0.001 * sr)) * Math.exp(-i / sr / wd);
  c.mix(dry, wire, 0.001, 0.5, sr);
  const drive = 1 + 4 * p.saturation, nd = 1 / Math.tanh(drive);
  for (let i = 0; i < n; i++) out[i] = Math.tanh(dry[i] * drive) * nd;
  if (p.tail) {
    const pre = [0.002, 0.008, 0.018][si], att = [0.004, 0.012, 0.025][si];
    const wn = c.seconds(gateLen, sr), w = c.noise(r, wn);
    const h = c.biquad("hp", [2500, 1500, 800][si], 0.7, sr), l = c.biquad("lp", [8000, 6500, 4500][si], 0.7, sr);
    const seg = Math.round(0.008 * sr), cut = 0.003 * sr; let fl = 1;
    for (let i = 0; i < wn; i++) {
      if (i % seg === 0) fl = 0.7 + 0.3 * r();
      const t = i / sr, g = Math.min(1, t / att) * (1 - 0.45 * t / gateLen) * fl;
      const rel = i > wn - cut ? Math.max(0, (wn - i) / cut) : 1;
      w[i] = l(h(w[i])) * g * rel;
    }
    c.mix(out, w, pre, 0.45 + 0.1 * si, sr);
  }
  c.fade(out, 4, sr);
  c.finish(out, 0.9, 1.02);
  return { samples: out };
}
