// Typing tick: one keystroke for on-screen keyboards and text fields. A short contact grain, a key-cap body of two
// damped modes, and for space and enter a longer, lower stabiliser rattle; the key choice sets size and pitch.
// Built like jsfxr sfxr.js Params.prototype.click (a very short highpassed hit with a fast decay, p_hpf_freq near 1)
// with the body as kit modes; the per-key sizes are a judgement call, not taken from a source.
// Hand-written by a Claude Code agent against the factory contract (not built by the factory).
export const meta = {
  title: "Typing Tick", kind: "ui", format: "sound", duration: 0.05, price: 1, author: "quietmachine", payout: "quietmachine@creators.oasis.example", kit: "Interface",
  credit: "After jsfxr sfxr.js click preset",
  description: "A tiny keystroke tick with key, material, pitch and brightness as knobs, for on-screen keyboards, chat input, terminals and typewriter text reveals.",
  tags: ["typing", "keystroke", "key", "keyboard", "tick", "ui", "text", "interface"],
};
export const params = { knobs: {
  key: { type: "choice", label: "Key", default: "letter", options: ["letter", "space", "enter"] },
  material: { type: "choice", label: "Material", default: "glass", options: ["glass", "plastic", "mechanical"] },
  pitch: { type: "range", label: "Pitch", default: 0.5, min: 0, max: 1, step: 0.01 },
  brightness: { type: "range", label: "Brightness", default: 0.5, min: 0, max: 1, step: 0.01 },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 83 + 37);
  const K = { letter: { f: 1, d: 1, rat: 0 }, space: { f: 0.55, d: 1.8, rat: 0.6 }, enter: { f: 0.7, d: 1.5, rat: 0.4 } }[p.key];
  const M = { glass: { k: [1, 2.7], d: 0.004, nz: 0.4, hp: 4000 }, plastic: { k: [1, 2.2], d: 0.005, nz: 0.8, hp: 2200 }, mechanical: { k: [1, 1.6, 3.9], d: 0.007, nz: 1, hp: 1500 } }[p.material];
  const f = 1500 * Math.pow(2, 1.5 * p.pitch) * K.f * (0.93 + 0.14 * r()), dec = M.d * K.d;
  const n = c.seconds(dec * 7 + (K.rat ? 0.03 : 0.008), sr), out = new Float32Array(n);
  c.mix(out, c.ring(M.k.map((k, i) => [f * k * (0.98 + 0.04 * r()), i ? 0.5 : 1]), dec * 7, dec, sr), 0.0003, 0.7, sr);
  c.mix(out, c.burst(r, 0.003, "hp", M.hp + 3000 * p.brightness, 0.7, 0.0002, 0.0006, sr), 0, (0.3 + 0.6 * p.brightness) * M.nz, sr);
  if (K.rat) for (let j = 0; j < 3; j++) c.mix(out, c.burst(r, 0.006, "bp", 900 + 600 * r(), 2, 0.0003, 0.0015, sr), 0.004 + j * 0.006 + 0.003 * r(), K.rat * (0.5 - j * 0.12), sr);
  c.filter(out, c.biquad("lp", 3000 + 9000 * p.brightness, 0.7, sr));
  c.filter(out, c.biquad("hp", 200, 0.7, sr));
  c.fade(c.finish(out, 0.88), 0.4, sr);
  return { samples: out };
}
