// Two-tone cowbell: two detuned square oscillators with a two-stage envelope (hard knock, then a ringing tail), voiced per circuit (808 round pair, TR-606 thin narrow-pulse pair, CR-78 slow-attack metallic pair with inharmonic ring) through a bandpass plus a stick-click.
export const meta = {
  title: "Two-Tone Cowbell", kind: "sfx", format: "sound", duration: 0.6, price: 2, author: "kickdrum", payout: "kickdrum@creators.oasis.example", kit: "Drum Machine", description: "An analogue drum machine cowbell built from two square oscillators; circuit, detune, decay, bandpass, pitch and tail are knobs for one-shot hits and stingers.",
  tags: ["cowbell", "drum machine", "808", "606", "cr-78", "percussion", "analogue", "one-shot"],
};
export const params = { knobs: {
  circuit: { type: "choice", label: "Circuit", default: "808", options: ["808", "tr606", "cr78"] },
  detune: { type: "range", label: "Detune", default: 0.5, min: 0, max: 1, step: 0.01 },
  decay: { type: "range", label: "Decay", default: 0.4, min: 0, max: 1, step: 0.01 },
  bandpass: { type: "range", label: "Bandpass", default: 0.5, min: 0, max: 1, step: 0.01 },
  pitch: { type: "range", label: "Pitch", default: 540, min: 500, max: 900, step: 1 },
  tail: { type: "toggle", label: "Tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 211 + params.knobs.circuit.options.indexOf(p.circuit) * 37 + 3);
  const cfg = {
    "808": { ratio: 1.4815, duty: 0.5, body: 0.03, lvl: 0.35, bp: 1, ring: 0, att: 0.001, tailK: 1 },
    tr606: { ratio: 1.5, duty: 0.28, body: 0.02, lvl: 0.2, bp: 1.45, ring: 0, att: 0.0008, tailK: 0.55 },
    cr78: { ratio: 1.34, duty: 0.5, body: 0.05, lvl: 0.5, bp: 0.7, ring: 0.6, att: 0.003, tailK: 1.5 },
  }[p.circuit];
  const f1 = p.pitch * (0.995 + r() * 0.01), spread = 1 + (p.detune - 0.5) * 0.14;
  const f2 = f1 * cfg.ratio * spread;
  const dur = p.tail ? 0.6 : 0.36, n = c.seconds(dur, sr), out = new Float32Array(n);
  const bodyT = cfg.body * (0.5 + 1.6 * p.decay);
  const tailT = (0.05 + 0.2 * p.decay) * cfg.tailK * (p.tail ? 1 : 0.4);
  const lvl = cfg.lvl * (p.tail ? 1 : 0.5);
  const a = c.osc("square", f1, n, sr, { duty: cfg.duty }), b = c.osc("square", f2, n, sr, { duty: cfg.duty });
  const hi = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / sr, up = Math.min(1, t / cfg.att);
    const e = up * (0.85 * Math.exp(-t / bodyT) + lvl * Math.exp(-t / tailT));
    hi[i] = (a[i] + b[i] * 0.9) * 0.5 * e;
  }
  const bpf = c.biquad("bp", (900 + 2200 * p.bandpass) * cfg.bp + f1 * 0.5, 0.7 + 1.6 * p.bandpass, sr);
  const lpf = c.biquad("lp", 4500 + 3500 * p.bandpass, 0.7, sr);
  for (let i = 0; i < n; i++) { const x = hi[i]; hi[i] = bpf(x) * (0.7 + 1.0 * p.bandpass) + 0.35 * lpf(x) * (1 - 0.6 * p.bandpass); }
  c.mix(out, hi, 0, 1, sr);
  c.mix(out, c.burst(r, 0.006, "hp", 3500 + 2500 * r(), 0.8, 0.0004, 0.0018, sr), 0, 0.35, sr);
  if (cfg.ring > 0) c.mix(out, c.ring([[f1 * 2.02, 1], [f2 * 1.97, 0.7], [f1 * 3.1, 0.4], [f2 * 2.71, 0.3]], 0.4, (0.05 + 0.15 * p.decay) * (p.tail ? 1 : 0.5), sr), 0.001, cfg.ring * 0.22, sr);
  if (p.tail) c.mix(out, c.burst(r, 0.25, "bp", f2 * 1.5, 3, 0.004, tailT * 0.8, sr), 0.004, 0.14, sr);
  c.fade(out, 25, sr);
  c.finish(out, 0.85, 1.1);
  return { samples: out };
}
