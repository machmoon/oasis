// Retro menu move: a two-frame chip blip (pitch jump into a stepped 4-bit volume decay) with a bright noise-tick contact and optional console echo taps.
export const meta = {
  title: "Cursor Blip", kind: "ui", format: "sound", duration: 0.1, price: 1, author: "quietmachine", payout: "quietmachine@creators.oasis.example", kit: "Retro Arcade", description: "A tiny 8-bit cursor tick for menu navigation: waveform, pitch, click, length and an echo tail are knobs, and every seed is a slightly different blip.",
  tags: ["menu", "cursor", "ui", "8-bit", "chiptune", "blip", "arcade", "navigation"],
};
export const params = { knobs: {
  waveform: { type: "choice", label: "Waveform", default: "square", options: ["square", "pulse12", "triangle"] },
  pitch: { type: "range", label: "Pitch", default: 0.5, min: 0, max: 1, step: 0.01 },
  click: { type: "range", label: "Click", default: 0.4, min: 0, max: 1, step: 0.01 },
  length: { type: "range", label: "Length", default: 0.3, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Echo tail", default: false },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 7349 + params.knobs.waveform.options.indexOf(p.waveform) * 53 + 11);
  const base = 440 * Math.pow(2, 1 + p.pitch * 2.2) * c.between(r, 0.98, 1.02);
  const L = (0.018 + 0.1 * p.length) * c.between(r, 0.92, 1.08);
  const jump = [4 / 3, 3 / 2, 2][Math.floor(r() * 3)], stepT = Math.min(0.4 * L, c.between(r, 0.006, 0.011));
  const tri = p.waveform === "triangle", duty = p.waveform === "pulse12" ? 0.125 : 0.5;
  const voice = (len, f0, g) => {
    const n = c.seconds(len, sr), x = c.osc(tri ? "tri" : "square", (t) => (t < stepT ? f0 * jump : f0), n, sr, { duty });
    const hp = c.biquad("hp", 120, 0.7, sr), sm = c.onepole(sr), frame = Math.max(1, Math.round(sr * 0.002));
    const tau = len / 3, rel = 0.004 * sr;
    let v = 1;
    for (let i = 0; i < n; i++) {
      if (i % frame === 0) v = Math.round(15 * Math.exp(-i / sr / tau)) / 15;
      let s = x[i];
      if (tri) s = Math.round(s * 7.5) / 7.5;
      x[i] = hp(s) * sm(v, 400) * Math.min(1, (n - i) / rel) * g;
    }
    return x;
  };
  const d = L * 1.1 + c.between(r, 0.004, 0.012);
  const total = L + (p.tail ? 2 * d : 0) + 0.012, out = new Float32Array(c.seconds(total, sr));
  const onset = c.between(r, 0, 0.0015);
  c.mix(out, voice(L, base, 1), onset, 1, sr);
  const ck = c.burst(r, 0.004, "hp", 3000 + 5000 * p.click, 0.8, 0.0003, 0.0006 + 0.0006 * p.click, sr);
  c.mix(out, ck, 0, (0.06 + 0.9 * p.click) * c.between(r, 0.8, 1.1), sr);
  if (p.click > 0.5) c.mix(out, c.burst(r, 0.002, "bp", 6500, 2, 0.0002, 0.0004, sr), onset + 0.0005, (p.click - 0.5) * 0.8, sr);
  if (p.tail) {
    for (let k = 1; k <= 2; k++) {
      const e = voice(L, base * c.between(r, 0.997, 1.003), 1);
      c.filter(e, c.biquad("lp", 4200 / k, 0.7, sr));
      c.mix(out, e, onset + k * d + c.between(r, -0.002, 0.002), k === 1 ? 0.38 : 0.15, sr);
    }
  }
  c.filter(out, c.biquad("lp", Math.min(0.45 * sr, 12000), 0.7, sr));
  c.fade(c.finish(out, 0.85), 1, sr);
  return { samples: out };
}
