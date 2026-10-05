// Analogue mid tom: a pitch-swept sine body (the signature drop), a stick-click transient, a skin-noise layer, circuit-specific partials and an optional shell-resonance tail.
export const meta = {
  title: "Analog Mid Tom", kind: "sfx", format: "sound", duration: 0.7, price: 2, author: "kickdrum", payout: "kickdrum@creators.oasis.example", kit: "Drum Machine", description: "A mid analogue drum-machine tom in 808, 909 or Simmons flavour, with sweep, decay, noise and tune knobs; a musical one-shot for beats and stingers.",
  tags: ["tom", "drum machine", "808", "909", "simmons", "analog", "drums", "one-shot"],
};
export const params = { knobs: {
  circuit: { type: "choice", label: "Circuit", default: "808", options: ["808", "909", "simmons"] },
  decay: { type: "range", label: "Decay", default: 0.5, min: 0, max: 1, step: 0.01 },
  sweep: { type: "range", label: "Sweep", default: 0.5, min: 0, max: 1, step: 0.01 },
  noise: { type: "range", label: "Noise", default: 0.4, min: 0, max: 1, step: 0.01 },
  tune: { type: "range", label: "Tune (Hz)", default: 160, min: 120, max: 220, step: 1 },
  tail: { type: "toggle", label: "Tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + params.knobs.circuit.options.indexOf(p.circuit) * 97 + 11);
  const cfg = {
    "808": { ratio: 2.4, sweepT: 0.05, dec: 1.0, tri: 0, clickF: 1800, clickG: 0.3, noiseF: 1200, noiseQ: 0.8, drive: 1.1, harm: 0.05, nDec: 1 },
    "909": { ratio: 3.0, sweepT: 0.028, dec: 0.7, tri: 0.5, clickF: 4500, clickG: 0.6, noiseF: 3400, noiseQ: 1.2, drive: 1.8, harm: 0.3, nDec: 0.6 },
    simmons: { ratio: 4.5, sweepT: 0.085, dec: 1.25, tri: 0, clickF: 900, clickG: 0.35, noiseF: 700, noiseQ: 3, drive: 1.3, harm: 0.12, nDec: 1.4 },
  }[p.circuit];
  const f0 = p.tune * (0.995 + r() * 0.01);
  const body = (0.05 + 0.14 * p.decay) * cfg.dec;
  const tailT = p.tail ? 0.18 + body * 1.2 : 0;
  const dur = 0.04 + body * 5 + tailT;
  const n = c.seconds(dur, sr), out = new Float32Array(n);
  const sw = 0.15 + 1.6 * p.sweep, st = cfg.sweepT * (0.7 + 0.6 * p.sweep);
  let ph = 0;
  const bodyBuf = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / sr, f = f0 * (1 + (cfg.ratio - 1) * sw * Math.exp(-t / st));
    ph += f / sr;
    const s = Math.sin(c.TAU * ph);
    const tri = 2 * Math.abs(2 * (ph - Math.floor(ph + 0.5))) - 1;
    const v = (1 - cfg.tri * 0.4) * s + cfg.tri * 0.5 * tri;
    bodyBuf[i] = Math.tanh(v * cfg.drive) * Math.exp(-t / body) * Math.min(1, t / 0.0015);
  }
  c.mix(out, bodyBuf, 0, 0.8, sr);
  const m = c.ring([[f0 * 1.5, 0.4 * cfg.harm], [f0 * 2.3, 0.3 * cfg.harm], [f0 * 3.1, 0.2 * cfg.harm]], body * 1.2, body * 0.5, sr);
  c.mix(out, m, 0.002, 0.6, sr);
  c.mix(out, c.burst(r, 0.012, "hp", cfg.clickF, 0.8, 0.0004, 0.003, sr), 0, cfg.clickG + 0.25 * p.noise, sr);
  const nn = c.seconds(0.05 + (0.1 + 0.2 * p.noise) * cfg.nDec, sr), x = c.noise(r, nn), bp = c.biquad("bp", cfg.noiseF * (1 + 0.3 * p.sweep), cfg.noiseQ, sr);
  const ne = c.env(nn, 0.001, (0.02 + 0.06 * p.noise) * cfg.nDec, sr);
  for (let i = 0; i < nn; i++) x[i] = bp(x[i]) * ne[i];
  c.mix(out, x, 0.0005, 1.0 * p.noise, sr);
  if (p.tail) {
    const tl = c.seconds(tailT + body, sr);
    const sh = c.ring([[f0 * 1.19, 0.5], [f0 * 1.63, 0.35], [f0 * 2.07, 0.2]], tl / sr, body * 1.3, sr);
    c.mix(out, sh, 0.01, 0.18, sr);
    c.mix(out, c.reverb(c.burst(r, 0.02, "bp", f0 * 3, 1, 0.001, 0.008, sr), { size: 0.3, decay: 0.4, mixAmt: 0.6 }, sr), 0.004, 0.3, sr);
  }
  const fl = Math.min(n, c.seconds(0.06, sr));
  for (let i = 0; i < fl; i++) { const g = i / fl; out[n - 1 - i] *= g * g * (3 - 2 * g); }
  c.finish(out, 0.9, 1.1);
  return { samples: out };
}
