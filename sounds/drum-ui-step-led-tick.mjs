// LED step tick: an analogue-drum-machine voice for menu navigation. Hat = six detuned square oscillators (808 metal) through a highpass with a fast two-stage decay; rim = two inharmonic triangle knocks with a crack and a damped ring; blip = a sine/square beep with a fast pitch chirp. Every voice has a ~0.5 ms attack and a click edge. The buffer length follows the decay so short settings stay dense, and the result is normalised to a fixed peak.
export const meta = {
  title: "LED Step Tick", kind: "ui", format: "sound", duration: 0.12, price: 1, author: "quietmachine", payout: "quietmachine@creators.oasis.example", kit: "Drum Machine", description: "A short sequencer step tick for menu navigation, voiced as a metallic hat, a rimshot knock or a synthetic blip; pitch, brightness and length are knobs and every seed is a slightly different step.",
  tags: ["ui", "tick", "step", "sequencer", "menu", "drum-machine", "led", "arcade"],
};
export const params = { knobs: {
  tone: { type: "choice", label: "Tone", default: "hat", options: ["hat", "rim", "blip"] },
  pitch: { type: "range", label: "Pitch", default: 0.5, min: 0, max: 1, step: 0.01 },
  brightness: { type: "range", label: "Brightness", default: 0.5, min: 0, max: 1, step: 0.01 },
  length: { type: "range", label: "Length", default: 0.4, min: 0, max: 1, step: 0.01 },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 53 + params.knobs.tone.options.indexOf(p.tone) * 977 + 11);
  const L = p.length, B = p.brightness, jit = 0.985 + r() * 0.03;
  const pf = Math.pow(2, p.pitch * 1.6 - 0.8) * jit;
  const dec = p.tone === "hat" ? 0.008 + 0.03 * L : p.tone === "rim" ? 0.008 + 0.022 * L : 0.012 + 0.05 * L;
  const n = c.seconds(dec * 6 + 0.02, sr), out = new Float32Array(n);
  if (p.tone === "hat") {
    const base = [205.3, 304.4, 369.6, 522.7, 540, 800].map((f) => f * pf * 1.6);
    const x = new Float32Array(n);
    base.forEach((f) => {
      const o = c.osc("square", f * (0.99 + r() * 0.02), n, sr, { phase: r() });
      for (let i = 0; i < n; i++) x[i] += o[i] / 6;
    });
    const hp = c.biquad("hp", 4500 + 3500 * B, 0.9, sr), e1 = c.env(n, 0.0005, dec, sr), e2 = c.env(n, 0.0005, dec * 2.5, sr);
    for (let i = 0; i < n; i++) x[i] = hp(x[i]) * (0.75 * e1[i] + 0.25 * e2[i] * L);
    c.mix(out, x, 0, 1, sr);
    c.mix(out, c.burst(r, 0.004, "hp", 7000 + 3000 * B, 0.8, 0.0003, 0.0012, sr), 0, 0.5, sr);
  } else if (p.tone === "rim") {
    const f = 480 * pf;
    const t = c.osc("tri", (tt) => f * (1 + 0.4 * Math.exp(-tt * 250)), n, sr), e = c.env(n, 0.0005, dec, sr);
    const t2 = c.osc("tri", (tt) => f * 2.72 * (1 + 0.2 * Math.exp(-tt * 250)), n, sr), e2 = c.env(n, 0.0004, dec * 0.7, sr);
    for (let i = 0; i < n; i++) t[i] = t[i] * e[i] * 0.7 + t2[i] * e2[i] * (0.3 + 0.4 * B);
    c.mix(out, t, 0, 0.8, sr);
    c.mix(out, c.ring([[f * 3.4, 0.6], [f * 5.2 * (0.98 + r() * 0.04), 0.3 + 0.4 * B]], dec * 5, dec * 0.8, sr), 0.0005, 0.35, sr);
    c.mix(out, c.burst(r, 0.007, "bp", 2200 + 4500 * B, 1.2, 0.0003, 0.002, sr), 0, 0.8, sr);
  } else {
    const f = 900 * pf * (1 + 0.5 * p.pitch);
    const a = c.osc(B > 0.5 ? "square" : "sine", (tt) => f * (1 + 0.25 * Math.exp(-tt * 150)), n, sr), e = c.env(n, 0.0007, dec, sr);
    const b = c.osc("sine", (tt) => f * 2 * (1 + 0.25 * Math.exp(-tt * 150)), n, sr);
    for (let i = 0; i < n; i++) a[i] = (a[i] * (0.4 + 0.3 * B) + b[i] * 0.3 * B) * e[i];
    c.filter(a, c.biquad("lp", 2500 + 8000 * B, 0.8, sr));
    c.mix(out, a, 0, 0.9, sr);
    c.mix(out, c.burst(r, 0.003, "hp", 3000 + 3000 * B, 0.8, 0.0003, 0.001, sr), 0, 0.3, sr);
  }
  c.finish(out, 0.85, 1.1);
  c.fade(out, 6, sr);
  let pk = 0;
  for (let i = 0; i < n; i++) pk = Math.max(pk, Math.abs(out[i]));
  if (pk > 0) { const g = 0.85 / pk; for (let i = 0; i < n; i++) out[i] *= g; }
  return { samples: out };
}
