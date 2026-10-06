// Click: a dry button press for apps and menus. A sub-millisecond highpassed noise edge is the contact, two or three
// damped modes are the key's material, and a faint release click follows the press when the key comes back up.
// Shaped after jsfxr sfxr.js Params.prototype.click (a very short, high, highpassed hit with a fast decay, built on
// its hitHurt base), rebuilt here from modes and a noise grain instead of sfxr's single oscillator.
// Hand-written by a Claude Code agent against the factory contract (not built by the factory).
export const meta = {
  title: "Button Click", kind: "ui", format: "sound", duration: 0.15, price: 1, author: "quietmachine", payout: "quietmachine@creators.oasis.example", kit: "Interface",
  credit: "After jsfxr sfxr.js click / hitHurt presets",
  description: "A short, dry button click with material, pitch, brightness and length as knobs, for app buttons, menu selections and form controls.",
  tags: ["click", "button", "ui", "tap", "press", "interface", "app", "menu"],
};
export const params = { knobs: {
  material: { type: "choice", label: "Material", default: "plastic", options: ["plastic", "glass", "metal", "soft"] },
  pitch: { type: "range", label: "Pitch", default: 0.5, min: 0, max: 1, step: 0.01 },
  brightness: { type: "range", label: "Brightness", default: 0.5, min: 0, max: 1, step: 0.01 },
  length: { type: "range", label: "Length", default: 0.3, min: 0, max: 1, step: 0.01 },
  release: { type: "toggle", label: "Release click", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 101 + 3);
  const M = {
    plastic: { modes: [[1, 1], [2.3, 0.4]], dec: 1, nz: 1 },
    glass: { modes: [[1.6, 1], [4.1, 0.5], [6.9, 0.25]], dec: 2.2, nz: 0.6 },
    metal: { modes: [[1.3, 1], [2.92, 0.7], [5.4, 0.45]], dec: 3, nz: 0.8 },
    soft: { modes: [[0.45, 1], [1.1, 0.3]], dec: 0.7, nz: 0.3 },
  }[p.material];
  const f = 900 * Math.pow(2, 2 * p.pitch) * (0.97 + 0.06 * r()), dec = (0.004 + 0.022 * p.length) * M.dec;
  const one = (g, fm) => {
    const n = c.seconds(dec * 6 + 0.012, sr), o = new Float32Array(n);
    c.mix(o, c.ring(M.modes.map(([k, a]) => [f * fm * k * (0.99 + 0.02 * r()), a]), dec * 6, dec, sr), 0.0004, 0.8 * g, sr);
    c.mix(o, c.burst(r, 0.004, "hp", 1500 + 7000 * p.brightness, 0.7, 0.0002, 0.0008, sr), 0, (0.3 + 0.7 * p.brightness) * M.nz * g, sr);
    return o;
  };
  const gap = 0.035 + 0.025 * r() + 0.04 * p.length, first = one(1, 1);
  const out = new Float32Array(first.length + (p.release ? c.seconds(gap, sr) : 0) + 8);
  c.mix(out, first, 0, 1, sr);
  if (p.release) c.mix(out, one(0.4, 1.25), gap, 1, sr);
  c.filter(out, c.biquad("lp", 2500 + 12000 * p.brightness, 0.7, sr));
  c.filter(out, c.biquad("hp", 120, 0.7, sr));
  c.fade(c.finish(out, 0.88), 0.6, sr);
  return { samples: out };
}
