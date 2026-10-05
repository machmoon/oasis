// Wooden menu tap: a soft knuckle on a tavern tabletop. Heavily damped, detuned plank modes plus noisy mode-tuned knocks are the body, a low knuckle thump and fibre click are the contact, and an optional table-cavity bloom with a short room wash is the tail.
export const meta = {
  title: "Tavern Knuckle Tap", kind: "ui", format: "sound", duration: 0.09, price: 1, author: "quietmachine", payout: "quietmachine@creators.oasis.example", kit: "Wooden Tavern", description: "A soft knuckle tap on a wooden board for menu select and hover; wood type, knuckle hardness, pitch, click variance and a room tail are knobs, and every seed is a slightly different tap.",
  tags: ["ui", "menu", "tap", "wood", "knuckle", "hover", "select", "tavern"],
};
export const params = { knobs: {
  wood: { type: "choice", label: "Wood type", default: "pine", options: ["pine", "oak"] },
  hardness: { type: "range", label: "Hardness", default: 0.6, min: 0, max: 1, step: 0.01 },
  pitch: { type: "range", label: "Pitch", default: 0.5, min: 0, max: 1, step: 0.01 },
  variance: { type: "range", label: "Click variance", default: 0.3, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Room tail", default: false },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + (p.wood === "oak" ? 71 : 3));
  const W = {
    pine: { f: 380, ratios: [1, 2.41, 3.93, 5.8], amps: [1, 0.45, 0.2, 0.08], dec: 0.013, thump: 240, click: 0.8, q: 2.2 },
    oak: { f: 560, ratios: [1, 2.67, 4.4, 6.9], amps: [1, 0.65, 0.4, 0.22], dec: 0.008, thump: 360, click: 1.25, q: 3.2 },
  }[p.wood];
  const h = p.hardness, v = p.variance;
  const base = W.f * Math.pow(2, (p.pitch - 0.5) * 1.6) * (1 + (r() - 0.5) * 0.12 * v);
  const dur = p.tail ? 0.45 : 0.09, n = c.seconds(dur, sr), out = new Float32Array(n);
  const decay = W.dec * (1.25 - 0.45 * h);
  W.ratios.forEach((k, j) => {
    const f = base * k * (1 + (r() - 0.5) * 0.05 * (1 + v) * (j + 1)), a = W.amps[j] * (j ? 0.35 + 0.9 * h : 1);
    c.mix(out, c.ring([[f, a]], 0.06, decay / (1 + 0.7 * j), sr), 0.0009, 0.5, sr);
  });
  c.mix(out, c.burst(r, 0.04, "bp", base * (1 + (r() - 0.5) * 0.04), W.q, 0.0008, decay * 1.1, sr), 0.0004, 0.9, sr);
  c.mix(out, c.burst(r, 0.03, "bp", base * W.ratios[1], W.q * 1.3, 0.0006, decay * 0.7, sr), 0.0004, 0.35 + 0.4 * h, sr);
  c.mix(out, c.burst(r, 0.025, "lp", W.thump * (1 + 0.6 * h), 0.8, 0.0022 - 0.0012 * h, 0.006 + 0.006 * (1 - h), sr), 0, 0.75 - 0.35 * h, sr);
  const cf = (1800 + 5200 * h) * W.click * (1 + (r() - 0.5) * 0.6 * v);
  c.mix(out, c.burst(r, 0.007, "bp", cf, 1.1, 0.0016 - 0.0012 * h, 0.0008 + 0.0016 * (1 - h), sr), 0, 0.2 + 0.6 * h, sr);
  const grains = 3 + Math.round(5 * h + 4 * v * r());
  for (let g = 0; g < grains; g++) {
    const t = 0.0005 + r() * (0.006 + 0.008 * v);
    c.mix(out, c.burst(r, 0.003, "bp", (2500 + 4000 * r()) * W.click, 3, 0.0003, 0.0007, sr), t, (0.05 + 0.12 * r()) * (0.4 + h), sr);
  }
  if (v > 0) {
    const t = 0.005 + (0.006 + 0.01 * r()) * v, f2 = base * (1.03 + 0.08 * (r() - 0.5) * v);
    c.mix(out, c.burst(r, 0.005, "bp", cf * (0.8 + 0.4 * r()), 1.2, 0.0005, 0.0012, sr), t, 0.45 * v * (0.3 + 0.6 * h), sr);
    c.mix(out, c.burst(r, 0.025, "bp", f2, W.q, 0.0005, decay * 0.8, sr), t + 0.0004, 0.5 * v, sr);
    c.mix(out, c.ring([[f2, 1], [f2 * W.ratios[1], 0.4]], 0.04, decay * 0.6, sr), t + 0.0006, 0.25 * v, sr);
  }
  if (p.tail) {
    const cav = base * 0.42;
    c.mix(out, c.ring([[cav, 1], [cav * 1.53, 0.4], [cav * 2.2, 0.15]], 0.25, 0.05, sr), 0.0015, 0.3, sr);
    const wn = c.seconds(0.38, sr), wash = c.pink(r, wn), lp = c.biquad("lp", 900 + 900 * h, 0.7, sr), hp = c.biquad("hp", 140, 0.7, sr);
    for (let i = 0; i < wn; i++) { const t = i / sr; wash[i] = lp(hp(wash[i])) * Math.min(1, t / 0.012) * Math.exp(-t / 0.08); }
    c.mix(out, wash, 0.008, 0.25, sr);
    const rv = c.reverb(out, { size: 0.35, decay: 0.3, mixAmt: 0.32 }, sr);
    if (rv && rv !== out) out.set(rv.subarray(0, n));
  }
  c.filter(out, c.biquad("lp", 3500 + 9000 * h, 0.7, sr));
  c.finish(out, 0.85);
  const rel = c.seconds(p.tail ? 0.12 : 0.025, sr);
  for (let i = 0; i < rel; i++) { const k = 1 - i / rel; out[n - 1 - i] *= k * k; }
  c.fade(out, 1, sr);
  return { samples: out };
}
