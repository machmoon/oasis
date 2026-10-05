// Low analogue tom: a pitch-swept body (circuit-specific wave, sweep depth and decay), a stick-click transient, a noise layer for skin or snap, and an optional detuned shell-resonance tail.
export const meta = {
  title: "Low Analogue Tom", kind: "sfx", format: "sound", duration: 0.8, price: 2, author: "kickdrum", payout: "kickdrum@creators.oasis.example", kit: "Drum Machine", description: "A low analogue drum-machine tom with a falling pitch glide; 808 booms, 909 punches and Simmons zaps, for beats, stingers and electronic one-shots.",
  tags: ["tom", "drum machine", "analogue", "808", "909", "simmons", "low", "percussion"],
};
export const params = { knobs: {
  circuit: { type: "choice", label: "Circuit", default: "808", options: ["808", "909", "simmons"] },
  decay: { type: "range", label: "Decay", default: 0.5, min: 0, max: 1, step: 0.01 },
  sweep: { type: "range", label: "Sweep", default: 0.5, min: 0, max: 1, step: 0.01 },
  noise: { type: "range", label: "Noise", default: 0.3, min: 0, max: 1, step: 0.01 },
  tune: { type: "range", label: "Tune", default: 90, min: 60, max: 140, step: 1 },
  tail: { type: "toggle", label: "Resonant tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + params.knobs.circuit.options.indexOf(p.circuit) * 97 + 11);
  const cfg = { "808": { ratio: 1.9, glide: 0.06, dec: 0.22, click: 1800, nz: 600, nq: 0.8, lp: 4500 },
    "909": { ratio: 2.8, glide: 0.03, dec: 0.14, click: 4200, nz: 2400, nq: 1.2, lp: 9000 },
    simmons: { ratio: 4.5, glide: 0.075, dec: 0.11, click: 3000, nz: 3500, nq: 2, lp: 8000 } }[p.circuit];
  const f0 = p.tune * (0.98 + r() * 0.04), dec = cfg.dec * (0.4 + 1.2 * p.decay);
  const ratio = 1 + (cfg.ratio - 1) * (0.15 + 1.7 * p.sweep) * (0.92 + r() * 0.16);
  const glide = cfg.glide * (0.7 + 0.6 * p.sweep) * (0.9 + r() * 0.2);
  const n = c.seconds(dec * 3.2 + 0.12, sr), out = new Float32Array(n);
  const body = new Float32Array(n), e = c.env(n, 0.002, dec, sr);
  const wob = r() * 6.28, wd = 0.004 * r();
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr, f = f0 * (1 + (ratio - 1) * Math.exp(-t / glide)) * (1 + wd * Math.sin(wob + t * 40));
    ph += f / sr;
    const x = ph - Math.floor(ph);
    let s = p.circuit === "909" ? (x < 0.5 ? 4 * x - 1 : 3 - 4 * x) * 0.75 + Math.sin(c.TAU * ph) * 0.35 : Math.sin(c.TAU * ph);
    if (p.circuit === "simmons") s = Math.tanh(s * 1.8);
    body[i] = s * e[i];
  }
  c.mix(out, body, 0, 0.9, sr);
  c.mix(out, c.burst(r, 0.008, "bp", cfg.click * (0.8 + r() * 0.4), 1, 0.0004, 0.002, sr), 0, 0.3 + 0.3 * p.noise, sr);
  const nl = c.seconds(0.04 + dec * 0.6, sr), nz = c.noise(r, nl), bp = c.biquad("bp", cfg.nz * (0.75 + r() * 0.5), cfg.nq, sr), ne = c.env(nl, 0.001, 0.015 + dec * 0.15, sr);
  for (let i = 0; i < nl; i++) nz[i] = bp(nz[i]) * ne[i];
  c.mix(out, nz, 0.001, 2 * p.noise, sr);
  if (p.tail) {
    const d = (k) => 1 + (r() - 0.5) * 0.06;
    c.mix(out, c.ring([[f0 * 1.01 * d(), 1], [f0 * 1.52 * d(), 0.45], [f0 * 2.31 * d(), 0.25], [f0 * 3.4 * d(), 0.1]], dec * 2.6 + 0.1, dec * 1.1 + 0.05, sr), 0.012, 0.4, sr);
  }
  c.filter(out, c.biquad("lp", cfg.lp, 0.7, sr));
  c.fade(c.finish(out, 0.9, 1.3), 15, sr);
  return { samples: out };
}
