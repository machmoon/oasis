// Rain: a loopable bed built the way Farnell's "Rain" practical does it, as a stream of tiny bandpassed drop bursts
// over a hiss, with a surface knob that picks what the drops land on and an optional distant rumble under it.
export const meta = {
  title: "Rain Bed", kind: "ambience", format: "sound", duration: 3, price: 4, author: "stormfront", payout: "stormfront@creators.oasis.example",
  description: "A loopable rain bed: intensity, the surface the drops hit, how far the storm is and a thunder rumble are knobs; each seed is a different three seconds of the same rain.",
  tags: ["rain", "ambience", "weather", "storm", "loop", "drops", "wet", "night"],
};
export const params = { knobs: {
  surface: { type: "choice", label: "Falls on", default: "street", options: ["street", "leaves", "tin roof", "window"] },
  intensity: { type: "range", label: "Intensity", default: 0.5, min: 0, max: 1, step: 0.01 },
  distance: { type: "range", label: "Distance", default: 0.3, min: 0, max: 1, step: 0.01 },
  rumble: { type: "toggle", label: "Thunder rumble", default: false },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 977 + 5), dur = 3, n = c.seconds(dur, sr), out = new Float32Array(n);
  const far = p.distance;
  // the hiss: pink noise bandpassed, the sum of all the drops too far to hear one by one
  const hiss = c.pink(r, n), hp = c.biquad("hp", 900 - 600 * far, 0.7, sr), lp = c.biquad("lp", 9000 - 6000 * far, 0.7, sr);
  for (let i = 0; i < n; i++) hiss[i] = lp(hp(hiss[i])) * (0.9 + 0.1 * Math.sin(i / sr * 0.9 + r()));
  c.mix(out, hiss, 0, 0.18 + 0.4 * p.intensity, sr);
  // the drops: short grains, their colour from the surface
  const colour = { street: [2500, 2.5], leaves: [1400, 1.5], "tin roof": [3800, 6], window: [5200, 4] }[p.surface];
  const drops = Math.round((120 + 900 * p.intensity) * dur * (1 - 0.6 * far));
  for (let d = 0; d < drops; d++) {
    const f = colour[0] * (0.6 + r() * 0.9);
    c.mix(out, c.burst(r, 0.004 + r() * 0.01, "bp", f, colour[1], 0.0003, 0.0015 + r() * 0.003, sr), r() * dur, (0.15 + 0.5 * r()) * (1 - 0.7 * far), sr);
  }
  if (p.surface === "tin roof") for (let d = 0; d < drops / 6; d++) c.mix(out, c.ring([[300 + r() * 500, 1], [1200 + r() * 800, 0.3]], 0.05, 0.012, sr), r() * dur, 0.08 * (1 - 0.6 * far), sr);
  if (p.rumble) {
    const low = c.brown(r, n), lp2 = c.biquad("lp", 90, 0.9, sr); let g = 0;
    for (let i = 0; i < n; i++) { if (i % 2048 === 0) g += (r() - 0.5) * 0.3; g = c.clamp(g, 0.2, 1); low[i] = lp2(low[i]) * g; }
    c.mix(out, low, 0, 0.9, sr);
  }
  c.fade(c.finish(out, 0.8), 15, sr);
  return { samples: out };
}
