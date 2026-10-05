// Closed hi-hat: six detuned square oscillators at metallic ratios, bandpassed and highpassed, shaped by a sharp spike plus a short body envelope, with a stick-tick noise edge and an optional separate ring-out tail layer. The buffer is sized to the envelope so no render is mostly silence.
export const meta = {
  title: "Closed Hat Tick", kind: "sfx", format: "sound", duration: 0.2, price: 1, author: "kickdrum", payout: "kickdrum@creators.oasis.example", kit: "Drum Machine", description: "An analogue closed hi-hat built from six square oscillators through a bandpass, with metal colour, decay, tone, accent and a short tail as knobs; for drum machine patterns, stingers and rhythmic ticks.",
  tags: ["hihat", "hat", "closed", "drum-machine", "analogue", "percussion", "808", "tick"],
};
export const params = { knobs: {
  metal: { type: "choice", label: "Metal", default: "bright", options: ["thin", "bright", "dark"] },
  decay: { type: "range", label: "Decay", default: 0.3, min: 0, max: 1, step: 0.01 },
  tone: { type: "range", label: "Tone", default: 0.5, min: 0, max: 1, step: 0.01 },
  accent: { type: "range", label: "Accent", default: 0.5, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Tail", default: false },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 211 + params.knobs.metal.options.indexOf(p.metal) * 37 + 3);
  const bodyK = { thin: 0.7, bright: 1, dark: 1.5 }[p.metal];
  const spikeTau = 0.004 + 0.012 * p.decay, bodyTau = (0.012 + 0.05 * p.decay) * bodyK, ringTau = 0.05 + 0.06 * p.decay;
  const longest = Math.max(spikeTau, bodyTau, p.tail ? ringTau : 0);
  const total = 3.2 * longest + 0.02;
  const n = c.seconds(total, sr), out = new Float32Array(n);
  const base = { thin: 600, bright: 420, dark: 250 }[p.metal];
  const ratios = [2, 3, 4.16, 5.43, 6.79, 8.21];
  const bpF = { thin: 10000, bright: 7500, dark: 4000 }[p.metal] * (0.7 + 0.6 * p.tone);
  const hpF = { thin: 7500, bright: 5000, dark: 2400 }[p.metal] * (0.7 + 0.6 * p.tone);
  const q = { thin: 1.5, bright: 1.0, dark: 0.7 }[p.metal];
  const m = new Float32Array(n);
  ratios.forEach((k, j) => {
    const o = c.osc("square", base * k * (0.98 + r() * 0.04), n, sr, { phase: r() });
    const a = (0.6 + 0.8 * r()) / 6 * (j % 2 ? 1 : 1.2);
    for (let i = 0; i < n; i++) m[i] += o[i] * a;
  });
  const bp = c.biquad("bp", bpF, q, sr), hp = c.biquad("hp", hpF, 0.8, sr), hp2 = c.biquad("hp", hpF, 0.8, sr);
  for (let i = 0; i < n; i++) m[i] = hp2(hp(bp(m[i]))) * 2.5;
  const spike = c.env(n, 0.0005, spikeTau, sr);
  const body = c.env(n, 0.0007, bodyTau, sr);
  const ring = c.env(n, 0.002, ringTau, sr);
  const e = new Float32Array(n), tl = p.tail ? 0.4 : 0;
  for (let i = 0; i < n; i++) e[i] = spike[i] * 0.9 + body[i] * 0.6 + ring[i] * tl;
  c.multiply(m, e);
  c.mix(out, m, 0, 0.8, sr);
  c.mix(out, c.burst(r, 0.008, "hp", 6500 + 3000 * p.tone, 0.8, 0.0003, 0.002, sr), 0, 0.25 + 0.6 * p.accent, sr);
  c.mix(out, c.burst(r, 0.015, "bp", 3200 + 1500 * p.tone, 1.5, 0.0005, 0.004, sr), 0, 0.15 + 0.15 * p.accent, sr);
  c.fade(out, 12, sr);
  c.finish(out, 0.9, 1.1);
  c.gain(out, 0.6 + 0.4 * p.accent);
  return { samples: out };
}
