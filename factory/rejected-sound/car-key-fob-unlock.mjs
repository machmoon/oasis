// Key fob unlock: a bright 2-4 kHz chirp (one or two flat-topped beeps), a pause, then two central-lock actuator clunks (motor whirr, body thunk, plastic latch tick), through a distance filter with an optional cabin reverb tail.
export const meta = {
  title: "Fob Unlock Chirp", kind: "ui", format: "sound", duration: 0.8, price: 2, author: "quietmachine", payout: "quietmachine@creators.oasis.example", kit: "Car Interior", description: "A remote unlock beep followed by the central-lock actuators whirring and clunking inside the car; chirp style, actuator weight, distance, pitch and cabin tail are knobs, for car UI, vehicle entry and sci-fi console cues.",
  tags: ["car", "key fob", "unlock", "chirp", "central lock", "beep", "vehicle", "interface"],
};
export const params = { knobs: {
  style: { type: "choice", label: "Chirp style", default: "beep", options: ["beep", "double-beep", "none"] },
  thump: { type: "range", label: "Actuator thump", default: 0.5, min: 0, max: 1, step: 0.01 },
  distance: { type: "range", label: "Distance", default: 0.2, min: 0, max: 1, step: 0.01 },
  pitch: { type: "range", label: "Pitch", default: 0.5, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Cabin tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + 29), N = c.seconds(0.8, sr), out = new Float32Array(N);
  const f0 = 2600 * Math.pow(2, (p.pitch - 0.5) * 1.2) * (0.99 + r() * 0.02);
  const near = 1 - 0.4 * p.distance, th = 0.15 + 0.85 * p.thump;
  const beep = (f, dur) => {
    const n = c.seconds(dur, sr), a = c.osc("square", (t) => f * (1 + 0.06 * Math.exp(-t * 200)), n, sr);
    const b = c.osc("sine", (t) => f * (1 + 0.06 * Math.exp(-t * 200)), n, sr), lp = c.biquad("lp", f * 2.2, 0.7, sr);
    const o = new Float32Array(n), at = 0.002 * sr, rl = 0.012 * sr;
    for (let i = 0; i < n; i++) {
      const e = Math.max(0, Math.min(1, i / at, (n - i) / rl));
      o[i] = (lp(a[i]) * 0.35 + b[i] * 0.65) * e;
    }
    return o;
  };
  if (p.style !== "none") {
    c.mix(out, beep(f0, 0.09), 0.02, 0.9 * near * (0.95 + r() * 0.05), sr);
    if (p.style === "double-beep") c.mix(out, beep(f0, 0.09), 0.14 + r() * 0.008, 0.85 * near * (0.95 + r() * 0.05), sr);
  }
  const lock = (t, g, fm) => {
    const w = c.seconds(0.07, sr), m = c.osc("saw", (x) => fm * (1 + 0.5 * x / 0.07), w, sr), bp = c.biquad("bp", 520, 1.8, sr);
    const at = 0.01 * sr, rl = 0.015 * sr;
    for (let i = 0; i < w; i++) { const e = Math.max(0, Math.min(1, i / at, (w - i) / rl)); m[i] = bp(m[i]) * e * (0.7 + 0.3 * Math.sin(i / sr * c.TAU * 80)); }
    c.mix(out, m, t, 0.5 * g * (0.4 + 0.6 * th), sr);
    const tt = t + 0.07;
    c.mix(out, c.ring([[85 + r() * 20, 1], [190 + r() * 40, 0.5], [560 + r() * 90, 0.25]], 0.16, 0.02 + 0.04 * p.thump, sr), tt, (0.1 + 0.8 * th) * g * (1 - 0.3 * p.distance), sr);
    c.mix(out, c.burst(r, 0.012, "bp", 2000 + r() * 700, 2, 0.0004, 0.003, sr), tt + 0.004, 0.3 * g, sr);
  };
  lock(0.3, 1, 140 + r() * 25);
  lock(0.42 + r() * 0.02, 0.7, 165 + r() * 30);
  if (p.tail) {
    const tl = new Float32Array(N);
    tl.set(out);
    const rv = c.reverb(tl, { size: 0.3, decay: 0.45, mixAmt: 1 }, sr);
    if (rv) { const m = Math.min(N, rv.length); for (let i = 0; i < m; i++) { const v = rv[i]; if (v === v) out[i] += v * 0.5; } }
  }
  c.filter(out, c.biquad("lp", 14000 - 9000 * p.distance, 0.7, sr));
  c.finish(out, 0.85, 1.1);
  c.fade(out, 25, sr);
  return { samples: out };
}
