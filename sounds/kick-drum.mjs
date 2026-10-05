// Kick: a sine whose pitch falls from a click into the fundamental (the jsfxr "freq ramp" idea over a sine), a
// beater click of filtered noise, and a soft saturation stage; the drum one-shot every kit starts from.
export const meta = {
  title: "Kick Drum", kind: "music-loop", format: "sound", duration: 0.6, price: 2, author: "kickdrum", payout: "kickdrum@creators.oasis.example",
  description: "A kick drum one-shot: tuning, the pitch drop, the beater click, length and drive are knobs; the seed moves the click so a pattern breathes.",
  tags: ["kick", "drum", "one-shot", "808", "beat", "bass", "music", "percussion"],
};
export const params = { knobs: {
  character: { type: "choice", label: "Character", default: "punchy", options: ["punchy", "deep", "boxy", "808"] },
  tune: { type: "range", label: "Tune (Hz)", default: 52, min: 35, max: 90, step: 1 },
  drop: { type: "range", label: "Pitch drop", default: 0.5, min: 0, max: 1, step: 0.01 },
  length: { type: "range", label: "Length", default: 0.4, min: 0.1, max: 1, step: 0.01 },
  drive: { type: "range", label: "Drive", default: 0.3, min: 0, max: 1, step: 0.01 },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 211 + 3);
  const tail = { punchy: 0.25, deep: 0.5, boxy: 0.14, 808: 0.9 }[p.character] * (0.4 + p.length * 1.2);
  const n = c.seconds(tail * 3 + 0.05, sr), out = new Float32Array(n);
  const start = p.tune * (2 + 6 * p.drop), fall = 0.02 + 0.06 * p.drop;
  const body = c.osc("sine", (t) => p.tune + (start - p.tune) * Math.exp(-t / fall), n, sr, { phase: r() * 0.1 });
  c.multiply(body, c.env(n, 0.001, tail, sr));
  c.mix(out, body, 0, 1, sr);
  const clickF = { punchy: 2500, deep: 900, boxy: 1800, 808: 600 }[p.character];
  c.mix(out, c.burst(r, 0.012, "bp", clickF * (0.9 + r() * 0.2), 1.2, 0.0005, 0.003, sr), 0.0005 + r() * 0.001, 0.5 + 0.3 * p.drop, sr);
  if (p.character === "boxy") c.mix(out, c.ring([[p.tune * 3.1, 0.4], [p.tune * 5.3, 0.2]], 0.12, 0.03, sr), 0.002, 0.5, sr);
  c.finish(out, 0.92, 1 + 3 * p.drive);
  c.fade(out, 4, sr);
  return { samples: out };
}
