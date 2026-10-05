// High tom: analogue tom/conga ping. Layers: bright stick click, a swept sine body with an audible fast pitch fall (808 round long glide, 909 punchy with noise snap, simmons hard zap with FM-like dive), a skin overtone, and a distinct inharmonic shell-ring tail that lengthens the hit when on.
export const meta = {
  title: "High Tom Ping", kind: "sfx", format: "sound", duration: 0.5, price: 2, author: "kickdrum", payout: "kickdrum@creators.oasis.example", kit: "Drum Machine", description: "An analogue high tom or conga-like ping with a clearly falling pitch body; circuit, decay, sweep, skin and tune are knobs, for drum machine fills and musical one-shots.",
  tags: ["tom", "conga", "drum machine", "analogue", "808", "909", "simmons", "percussion"],
};
export const params = { knobs: {
  circuit: { type: "choice", label: "Circuit", default: "808", options: ["808", "909", "simmons"] },
  decay: { type: "range", label: "Decay", default: 0.5, min: 0, max: 1, step: 0.01 },
  sweep: { type: "range", label: "Sweep", default: 0.5, min: 0, max: 1, step: 0.01 },
  skin: { type: "range", label: "Skin", default: 0.4, min: 0, max: 1, step: 0.01 },
  tune: { type: "range", label: "Tune (Hz)", default: 300, min: 200, max: 400, step: 1 },
  tail: { type: "toggle", label: "Shell tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + params.knobs.circuit.options.indexOf(p.circuit) * 37 + 11);
  const cfg = { "808": { d: 0.1, sw: 1.8, tau: 0.04, click: 3000, noise: 0.15, ov: 1.5, a: 0.002, drv: 1, bp: 1.6 }, "909": { d: 0.065, sw: 2.4, tau: 0.02, click: 6000, noise: 0.5, ov: 1.72, a: 0.0006, drv: 1.6, bp: 2.8 }, simmons: { d: 0.13, sw: 4.0, tau: 0.012, click: 2200, noise: 0.05, ov: 2.3, a: 0.001, drv: 2.6, bp: 1.2 } }[p.circuit];
  const dec = cfg.d * (0.4 + 1.6 * p.decay), tune = p.tune * (1.2 + r() * 0.02);
  const n = c.seconds(0.5, sr), out = new Float32Array(n);
  const ratio = 1 + cfg.sw * (0.25 + 1.0 * p.sweep), tau = cfg.tau * (0.6 + 0.9 * p.sweep);
  const body = new Float32Array(n), ov = new Float32Array(n), e = c.env(n, cfg.a, dec, sr), e2 = c.env(n, 0.001, dec * 0.4, sr);
  let ph = 0, ph2 = 0;
  const norm = 1 / Math.tanh(cfg.drv);
  for (let i = 0; i < n; i++) {
    const g = Math.exp(-i / sr / tau), f = tune * (1 + (ratio - 1) * g);
    ph += c.TAU * f / sr;
    ph2 += c.TAU * f * cfg.ov / sr;
    body[i] = Math.tanh(cfg.drv * Math.sin(ph)) * norm * e[i];
    ov[i] = Math.sin(ph2) * e2[i];
  }
  c.mix(out, body, 0, 0.8, sr);
  c.mix(out, ov, 0, 0.1 + 0.4 * p.skin, sr);
  c.mix(out, c.burst(r, 0.05, "bp", tune * 3 + 1800 * p.skin, 2 + 4 * p.skin * cfg.bp, 0.0006, 0.01 + 0.02 * p.skin, sr), 0, 0.12 + 0.5 * p.skin + cfg.noise, sr);
  c.mix(out, c.burst(r, 0.01, "hp", cfg.click, 0.8, 0.0003, 0.002, sr), 0, 0.5 + 0.3 * cfg.noise, sr);
  if (p.tail) {
    const ring = c.ring([[tune * 1.18, 1], [tune * 1.83, 0.6], [tune * 2.7, 0.4], [tune * 3.4, 0.2]].map(([f, a]) => [f * (0.99 + r() * 0.02), a]), 0.4, 0.07 + 0.12 * p.decay, sr);
    c.mix(out, ring, 0.006, 0.2, sr);
  }
  c.fade(out, 30, sr);
  c.finish(out, 0.9, 1.1);
  return { samples: out };
}
