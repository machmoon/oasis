// Analogue snare: two tuned oscillators with a pitch drop (body), a snappy filtered-noise rattle, a stick click and an optional shell-ring and noise-wash tail; the circuit choice changes oscillator ratio, pitch drop, noise colour and envelope shapes.
export const meta = {
  title: "Analog Snare Blend", kind: "sfx", format: "sound", duration: 0.45, price: 2, author: "kickdrum", payout: "kickdrum@creators.oasis.example", kit: "Drum Machine", description: "An analogue drum-machine snare blending tuned oscillators with snappy noise in 808, 909 or Linn flavours, for beats, stingers and musical one-shots.",
  tags: ["snare", "drum machine", "808", "909", "linn", "analog", "percussion", "one-shot"],
};
export const params = { knobs: {
  circuit: { type: "choice", label: "Circuit", default: "909", options: ["808", "909", "linn"] },
  tone: { type: "range", label: "Tone mix", default: 0.5, min: 0, max: 1, step: 0.01 },
  snappy: { type: "range", label: "Snappy", default: 0.6, min: 0, max: 1, step: 0.01 },
  decay: { type: "range", label: "Decay", default: 0.4, min: 0, max: 1, step: 0.01 },
  pitch: { type: "range", label: "Pitch (Hz)", default: 200, min: 150, max: 300, step: 1 },
  tail: { type: "toggle", label: "Tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + params.knobs.circuit.options.indexOf(p.circuit) * 97 + 11);
  const cfg = {
    "808": { ratio: 1.85, drop: 1.2, nf: 2400, nq: 1.0, hp: 1800, bd: 1.0, nd: 1.0, shape: "sine", b2: 0.8 },
    "909": { ratio: 1.5, drop: 1.7, nf: 4200, nq: 0.7, hp: 3000, bd: 0.7, nd: 0.75, shape: "tri", b2: 0.5 },
    linn: { ratio: 2.3, drop: 1.35, nf: 1500, nq: 1.6, hp: 800, bd: 1.3, nd: 1.35, shape: "sine", b2: 0.65 },
  }[p.circuit];
  const tailX = p.tail ? 0.16 : 0.02;
  const dur = 0.17 + 0.17 * p.decay + tailX, n = c.seconds(dur, sr), out = new Float32Array(n);
  const f0 = p.pitch * (0.985 + r() * 0.03), bodyT = (0.035 + 0.075 * p.decay) * cfg.bd;
  const sweep = (f) => (t) => f * (1 + (cfg.drop - 1) * Math.exp(-t / 0.014));
  const o1 = c.osc(cfg.shape, sweep(f0), n, sr), o2 = c.osc("sine", sweep(f0 * cfg.ratio * (0.99 + r() * 0.02)), n, sr);
  const e = c.env(n, 0.0007, bodyT, sr), body = new Float32Array(n);
  for (let i = 0; i < n; i++) body[i] = (o1[i] + o2[i] * cfg.b2) * e[i];
  c.mix(out, body, 0, 0.3 + 0.8 * p.tone, sr);
  const nz = c.noise(r, n), hp = c.biquad("hp", cfg.hp, 0.7, sr), bp = c.biquad("bp", cfg.nf * (0.9 + 0.2 * p.snappy), cfg.nq, sr);
  const ne = c.env(n, 0.0005, (0.035 + 0.07 * p.decay) * cfg.nd * (0.6 + 0.6 * p.snappy), sr), rat = new Float32Array(n);
  for (let i = 0; i < n; i++) rat[i] = (hp(nz[i]) * 0.7 + bp(nz[i]) * 1.1) * ne[i];
  c.mix(out, rat, 0.0008, (0.1 + 0.8 * p.snappy) * (1.1 - 0.55 * p.tone), sr);
  c.mix(out, c.burst(r, 0.006, "hp", 2500, 0.8, 0.0003, 0.002, sr), 0, 0.3, sr);
  if (p.tail) {
    c.mix(out, c.ring([[f0 * 1.04, 0.6], [f0 * 2.31, 0.35], [f0 * 3.73, 0.2]], 0.3, 0.07 + 0.09 * p.decay, sr), 0.004, 0.3 * (0.3 + p.tone), sr);
    c.mix(out, c.burst(r, 0.2, "bp", cfg.nf * 0.7, 1, 0.003, 0.04 + 0.05 * p.decay, sr), 0.012, 0.22 * (0.2 + p.snappy), sr);
  }
  c.fade(out, p.tail ? 14 : 8, sr);
  c.finish(out, 0.88, 1.3);
  return { samples: out };
}
