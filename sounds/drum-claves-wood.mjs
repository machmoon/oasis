// Claves: a bright clave ping. A tuned ringing-filter pair (sine modes plus a noise-excited bandpass) is struck by a 1 ms click; a hollow wooden knock sits underneath; material sets mode ratios, damping and beating; tail adds a soft room wash.
export const meta = {
  title: "Resonant Claves", kind: "sfx", format: "sound", duration: 0.5, price: 1, author: "kickdrum", payout: "kickdrum@creators.oasis.example", kit: "Drum Machine", description: "A bright analogue clave ping from a resonant filter struck by a tiny click, in rosewood, plastic or metal; for drum machine patterns, stingers and musical one-shots.",
  tags: ["claves", "clave", "drum machine", "percussion", "ping", "analogue", "wood", "one-shot"],
};
export const params = { knobs: {
  material: { type: "choice", label: "Material", default: "rosewood", options: ["rosewood", "plastic", "metal"] },
  pitch: { type: "range", label: "Pitch", default: 0.5, min: 0, max: 1, step: 0.01 },
  decay: { type: "range", label: "Decay", default: 0.4, min: 0, max: 1, step: 0.01 },
  brightness: { type: "range", label: "Brightness", default: 0.5, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Room tail", default: false },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 211 + params.knobs.material.options.indexOf(p.material) * 37 + 3);
  const m = {
    rosewood: { base: 2100, ratios: [[1, 1], [2.45, 0.4], [4.1, 0.1]], dec: 0.032, knock: 0.7, click: 4000, noise: 0.5, beat: 0 },
    plastic: { base: 2700, ratios: [[1, 1], [1.74, 0.55], [3.3, 0.3]], dec: 0.02, knock: 0.15, click: 6500, noise: 0.9, beat: 0.004 },
    metal: { base: 2400, ratios: [[1, 1], [2.76, 0.6], [5.4, 0.35], [1.012, 0.7]], dec: 0.075, knock: 0, click: 8000, noise: 0.3, beat: 0.012 },
  }[p.material];
  const f0 = m.base * Math.pow(2, (p.pitch - 0.5) * 1.5) * (0.99 + r() * 0.02);
  const dec = m.dec * (0.5 + 1.5 * p.decay);
  const ring = Math.min(0.32, dec * 6);
  const n = c.seconds(Math.max(0.12, ring + 0.03), sr), out = new Float32Array(n);
  const modes = m.ratios.map(([k, a], i) => [f0 * k * (1 + (r() - 0.5) * 0.01 + (i > 0 ? m.beat * (i % 2 ? 1 : -1) : 0)), a * (i > 0 ? 0.5 + 0.5 * p.brightness : 1)]);
  c.mix(out, c.ring(modes, ring, dec, sr, 1), 0.0005, 0.75, sr);
  c.mix(out, c.burst(r, ring * 0.6, "bp", f0, 14, 0.0004, dec * 0.5, sr), 0, 1.1 * m.noise, sr);
  if (m.knock > 0) c.mix(out, c.ring([[f0 * 0.32, 1], [f0 * 0.55, 0.4]], 0.05, 0.011, sr), 0.0004, m.knock, sr);
  c.mix(out, c.burst(r, 0.006, "hp", m.click * (0.5 + p.brightness), 0.8, 0.0003, 0.0015, sr), 0, 0.2 + 0.5 * p.brightness, sr);
  c.filter(out, c.biquad("lp", 4500 + 9000 * p.brightness, 0.7, sr));
  c.finish(out, 0.85, 1.3);
  let res = out;
  if (p.tail) {
    const t = new Float32Array(n + c.seconds(0.2, sr));
    c.mix(t, out, 0, 1, sr);
    res = c.reverb(t, { size: 0.35, decay: 0.3, mixAmt: 0.3 }, sr) || t;
  }
  c.fade(res, 8, sr);
  c.finish(res, 0.85, 1.1);
  return { samples: res };
}
