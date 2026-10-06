// Toggle: a switch flipping on or off. Two contact ticks (the lever leaving one detent and landing in the other)
// with a short pitched pip between them that slides up for "on" and down for "off", so the two states are heard apart.
// The pip is jsfxr sfxr.js blipSelect (square or sine blip, no attack, short sustain and decay, a highpass) with
// its p_freq_ramp period slide giving the direction; the ticks are noise grains over two damped modes.
// Hand-written by a Claude Code agent against the factory contract (not built by the factory).
export const meta = {
  title: "Switch Toggle", kind: "ui", format: "sound", duration: 0.12, price: 1, author: "quietmachine", payout: "quietmachine@creators.oasis.example", kit: "Interface",
  credit: "Pip after jsfxr sfxr.js blipSelect with p_freq_ramp",
  description: "A switch toggle with on and off states that slide up or down, plus material, pitch and lever travel as knobs, for settings toggles, checkboxes and mode switches.",
  tags: ["toggle", "switch", "on", "off", "checkbox", "ui", "settings", "interface"],
};
export const params = { knobs: {
  state: { type: "choice", label: "State", default: "on", options: ["on", "off"] },
  material: { type: "choice", label: "Material", default: "plastic", options: ["plastic", "digital", "glass"] },
  pitch: { type: "range", label: "Pitch", default: 0.5, min: 0, max: 1, step: 0.01 },
  travel: { type: "range", label: "Lever travel", default: 0.4, min: 0, max: 1, step: 0.01 },
  pip: { type: "range", label: "Pip level", default: 0.5, min: 0, max: 1, step: 0.01 },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 131 + 7), on = p.state === "on";
  const mat = { plastic: { k: [1, 2.4], d: 0.006, sq: false, nz: 1 }, digital: { k: [1, 2], d: 0.004, sq: true, nz: 0.35 }, glass: { k: [1.7, 4.3], d: 0.014, sq: false, nz: 0.5 } }[p.material];
  const f = 700 * Math.pow(2, 1.6 * p.pitch) * (0.97 + 0.06 * r()), gap = 0.02 + 0.06 * p.travel + 0.01 * r();
  const n = c.seconds(gap + 0.07, sr), out = new Float32Array(n);
  const tick = (at, fm, g) => {
    c.mix(out, c.ring(mat.k.map((k, i) => [f * fm * k * (0.99 + 0.02 * r()), i ? 0.4 : 1]), mat.d * 6, mat.d, sr), at + 0.0004, 0.7 * g, sr);
    c.mix(out, c.burst(r, 0.004, "hp", 3000, 0.7, 0.0002, 0.0007, sr), at, 0.5 * mat.nz * g, sr);
  };
  tick(0, on ? 0.8 : 1.25, on ? 0.7 : 1);
  tick(gap, on ? 1.25 : 0.8, on ? 1 : 0.7);
  // the pip: a blip whose pitch slides toward the new state
  const pn = c.seconds(gap + 0.03, sr), f0 = f * (on ? 1.2 : 2.4), f1 = f * (on ? 2.4 : 1.2);
  const pipw = c.osc(mat.sq ? "square" : "sine", (t) => f0 + (f1 - f0) * Math.min(1, t / (gap + 0.01)), pn, sr, { duty: 0.35, phase: r() });
  c.multiply(pipw, c.adsr(pn, { attack: 0.002, sustain: gap * 0.6, decay: 0.03, punch: 0.3 }, sr));
  c.mix(out, pipw, 0.003, (0.05 + 0.5 * p.pip) * (mat.sq ? 0.5 : 1), sr);
  c.filter(out, c.biquad("hp", 250, 0.7, sr));
  c.fade(c.finish(out, 0.88), 0.6, sr);
  return { samples: out };
}
