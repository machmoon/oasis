// Analogue rimshot: a pitched woody ping (detuned ring modes), a short low wood knock, a bright stick-click noise edge, and an optional room tail. The circuit choice reshapes mode ratios, envelope and click colour; render length follows the decay.
export const meta = {
  title: "Woody Rimshot", kind: "sfx", format: "sound", duration: 0.2, price: 1, author: "kickdrum", payout: "kickdrum@creators.oasis.example", kit: "Drum Machine",
  description: "A short woody analogue rimshot ping in 808, 909 or CR-78 flavour, with pitch, brightness, decay and an optional room tail; for drum kits, stingers and musical one-shots.",
  tags: ["rimshot", "drum machine", "808", "909", "cr78", "percussion", "click", "analog"],
};
export const params = { knobs: {
  circuit: { type: "choice", label: "Circuit", default: "808", options: ["808", "909", "cr78"] },
  brightness: { type: "range", label: "Brightness", default: 0.5, min: 0, max: 1, step: 0.01 },
  decay: { type: "range", label: "Decay", default: 0.4, min: 0, max: 1, step: 0.01 },
  pitch: { type: "range", label: "Pitch", default: 900, min: 400, max: 1800, step: 10 },
  tail: { type: "toggle", label: "Room tail", default: false },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + params.knobs.circuit.options.indexOf(p.circuit) * 41 + 3);
  const f = p.pitch * (0.99 + r() * 0.02), d = 0.008 + 0.035 * p.decay, b = p.brightness;
  const cfg = {
    "808": { modes: [[f, 1], [f * 1.68, 0.7], [f * 2.9, 0.25]], dm: 1, click: [3500, 0.8], ca: 0.45 },
    "909": { modes: [[f, 1], [f * 1.5, 0.6], [f * 2.4, 0.5], [f * 3.7, 0.25]], dm: 0.7, click: [5500, 1.2], ca: 0.7 },
    "cr78": { modes: [[f * 0.85, 1], [f * 1.97, 0.5], [f * 3.3, 0.15]], dm: 1.5, click: [2400, 0.7], ca: 0.35 },
  }[p.circuit];
  const body = d * cfg.dm, dry = body * 6 + 0.05;
  const n = c.seconds(dry + (p.tail ? 0.18 : 0), sr), out = new Float32Array(n);
  const modes = cfg.modes.map(([fr, a]) => [fr * (0.995 + r() * 0.01), a * (0.6 + 0.6 * b * (fr > f * 1.4 ? 1 : 0.6))]);
  c.mix(out, c.ring(modes, dry, body, sr), 0.0008, 0.75, sr);
  c.mix(out, c.ring([[f * 0.45 * (0.98 + r() * 0.04), 1], [f * 0.72, 0.4]], 0.04, 0.008, sr), 0.0005, 0.35, sr);
  c.mix(out, c.burst(r, 0.01, "hp", cfg.click[0] * (0.6 + 0.9 * b), cfg.click[1], 0.0003, 0.002 + 0.001 * p.decay, sr), 0, cfg.ca * (0.5 + 0.8 * b), sr);
  c.mix(out, c.burst(r, 0.02, "bp", f * 1.2, 3, 0.0005, 0.006, sr), 0.001, 0.25, sr);
  if (p.tail) {
    const rv = c.reverb(out.slice(), { size: 0.35, decay: 0.4, mixAmt: 0.5 }, sr);
    for (let i = 0; i < n; i++) out[i] = out[i] * 0.8 + rv[i] * 0.6;
  }
  c.filter(out, c.biquad("lp", 4000 + 9000 * b, 0.7, sr));
  c.finish(out, 0.88, 1.1);
  let pk = 0;
  for (let i = 0; i < n; i++) pk = Math.max(pk, Math.abs(out[i]));
  if (pk > 0) c.gain(out, 0.88 / pk);
  c.fade(out, 10, sr);
  return { samples: out };
}
