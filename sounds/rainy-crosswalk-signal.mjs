// Crosswalk signal: a repeating pedestrian chirp, locator tick or walk beep on a wet street; voiced by a swept harmonic tone
// or a struck knock body, set over a rain wash of hiss, drop grains and puddle bubbles, with optional building slapback echoes.
export const meta = {
  title: "Crosswalk Chirp", kind: "ui", format: "sound", duration: 2, price: 1, author: "quietmachine", payout: "quietmachine@creators.oasis.example", kit: "Rainy City Street", description: "A pedestrian crossing signal that chirps, ticks or beeps at any pitch and rate over a rain-soaked street, for city scenes, menus and walk prompts.",
  tags: ["crosswalk", "signal", "chirp", "beep", "tick", "pedestrian", "city", "rain"],
};
export const params = { knobs: {
  tone: { type: "choice", label: "Tone", default: "chirp", options: ["chirp", "tick", "beep"] },
  pitch: { type: "range", label: "Pitch", default: 0.5, min: 0, max: 1, step: 0.01 },
  rate: { type: "range", label: "Rate (per s)", default: 2, min: 0.75, max: 8, step: 0.05 },
  brightness: { type: "range", label: "Brightness", default: 0.5, min: 0, max: 1, step: 0.01 },
  rain: { type: "range", label: "Rain wash", default: 0.35, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Street echo", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + params.knobs.tone.options.indexOf(p.tone) * 37 + 3);
  const b = p.brightness, w = p.rain, per = 1 / p.rate, TAU = c.TAU;
  const base = 700 * Math.pow(2, p.pitch * 2) * (0.985 + r() * 0.03);
  const N = Math.max(3, Math.min(14, Math.round(1.6 * p.rate) + 1));
  const len = Math.min({ chirp: 0.075, tick: 0.065, beep: 0.17 }[p.tone], 0.75 * per);
  const body = (N - 1) * per + len + 0.1, total = body + (p.tail ? 0.85 : 0.06);
  const n = c.seconds(total, sr), sig = new Float32Array(n);
  const voice = (d) => {
    const m = c.seconds(len, sr), x = new Float32Array(m);
    if (p.tone === "tick") {
      c.mix(x, c.ring([[base * 0.22 * d, 0.7], [base * 0.5 * d, 1], [base * 1.37 * d, 0.45], [base * 2.9 * d, 0.3 * b]], len, 0.012 + 0.008 * (1 - b), sr), 0.0008, 1, sr);
      c.mix(x, c.burst(r, 0.007, "bp", 1800 + 4000 * b, 1.2, 0.0004, 0.0018, sr), 0, 0.7 + 0.5 * b, sr);
      for (let i = 0; i < m; i++) x[i] *= Math.min(1, (m - i) / (0.006 * sr));
      return x;
    }
    const att = 0.002 * sr, rel = 0.006 * sr, norm = 1 / (1 + 0.9 * b);
    let ph = r() * TAU;
    for (let i = 0; i < m; i++) {
      const u = i / m;
      const f = p.tone === "chirp" ? base * d * (0.85 + 1.0 * Math.exp(-u * 4)) : base * 0.8 * d * (1 + 0.004 * Math.sin(i / sr * TAU * 7));
      ph += TAU * f / sr;
      const s = Math.sin(ph) + b * (0.35 * Math.sin(2 * ph) + 0.4 * Math.sin(3 * ph) + 0.15 * Math.sin(5 * ph));
      const e = Math.min(1, i / att) * Math.min(1, (m - i) / rel) * (p.tone === "chirp" ? Math.exp(-u * 1.4) : 1);
      x[i] = s * e * norm;
    }
    return x;
  };
  for (let k = 0; k < N; k++) {
    const t0 = 0.02 + k * per + (r() - 0.5) * 0.004;
    c.mix(sig, voice(1 + (r() - 0.5) * 0.006), t0, 0.88 + 0.12 * r(), sr);
  }
  c.filter(sig, c.biquad("lp", Math.min(2200 + 12000 * b, sr * 0.45), 0.7, sr));
  if (p.tail) {
    const dry = Float32Array.from(sig), crowd = Math.min(1, 2.5 / p.rate);
    c.filter(dry, c.biquad("lp", 2800 + 2000 * b, 0.7, sr));
    const taps = [0.13 + 0.04 * r(), 0.29 + 0.05 * r(), 0.48 + 0.06 * r()], gains = [0.38, 0.22, 0.12];
    for (let e = 0; e < 3; e++) {
      c.mix(sig, dry, taps[e], gains[e] * (0.5 + 0.5 * crowd) * (0.9 + 0.2 * r()), sr);
      c.filter(dry, c.biquad("lp", 2600 - 500 * e, 0.6, sr));
    }
    const wash = c.reverb(Float32Array.from(dry), { size: 0.75, decay: 0.55, mixAmt: 0.9 }, sr);
    c.mix(sig, wash, 0.02, 0.22 * (0.5 + 0.5 * crowd), sr);
  }
  const out = new Float32Array(n), hiss = c.pink(r, n);
  const hp = c.biquad("hp", 1200, 0.7, sr), lp = c.biquad("lp", Math.min(7000, sr * 0.45), 0.7, sr), ph0 = r() * TAU;
  for (let i = 0; i < n; i++) hiss[i] = lp(hp(hiss[i])) * (0.9 + 0.1 * Math.sin(i / sr * 1.3 + ph0));
  c.mix(out, hiss, 0, 0.03 + 0.17 * w, sr);
  const drops = Math.round(650 * w * total);
  for (let d = 0; d < drops; d++)
    c.mix(out, c.burst(r, 0.004 + r() * 0.008, "bp", 1800 + r() * 4200, 3, 0.0003, 0.0015 + r() * 0.003, sr), r() * total, (0.04 + 0.12 * r()) * (0.4 + 0.6 * w), sr);
  const bubbles = Math.round(22 * w * total);
  for (let k = 0; k < bubbles; k++) {
    const m = c.seconds(0.02 + r() * 0.025, sr), x = new Float32Array(m), f0 = 800 + r() * 1700;
    let ph = 0;
    for (let i = 0; i < m; i++) { const u = i / m; ph += TAU * f0 * (1 + 0.7 * u) / sr; x[i] = Math.sin(ph) * Math.min(1, i / (0.001 * sr)) * Math.exp(-u * 5); }
    c.mix(out, x, r() * total, 0.05 + 0.08 * r(), sr);
  }
  c.mix(out, sig, 0, 1, sr);
  c.fade(c.finish(out, 0.85), 25, sr);
  return { samples: out };
}
