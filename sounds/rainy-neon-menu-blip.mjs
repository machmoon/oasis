// Neon menu blip: a pitched tone gated by a 120 Hz mains flicker, a bright hum-buzz band and a pop at each onset, with a short rising raindrop chirp on the pop and an optional wet-street slapback tail.
export const meta = {
  title: "Neon Drip Blip", kind: "ui", format: "sound", duration: 0.28, price: 1, author: "quietmachine", payout: "quietmachine@creators.oasis.example", kit: "Rainy City Street", description: "A short, bright menu blip that pops like a buzzing neon sign in the rain, with select, back and error gestures and a raindrop accent, for night-city game interfaces.",
  tags: ["ui", "blip", "neon", "buzz", "menu", "rain", "cyberpunk", "select"],
};
export const params = { knobs: {
  variant: { type: "choice", label: "Variant", default: "select", options: ["select", "back", "error"] },
  buzz: { type: "range", label: "Buzz", default: 0.5, min: 0, max: 1, step: 0.01 },
  brightness: { type: "range", label: "Brightness", default: 0.6, min: 0, max: 1, step: 0.01 },
  drip: { type: "range", label: "Drip accent", default: 0.5, min: 0, max: 1, step: 0.01 },
  pitch: { type: "range", label: "Pitch", default: 0.5, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Wet tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, TAU = c.TAU, r = c.rng(p.seed * 4513 + params.knobs.variant.options.indexOf(p.variant) * 97 + 3);
  const br = p.brightness, isErr = p.variant === "error", isBack = p.variant === "back";
  const b = isErr ? 0.35 + 0.65 * p.buzz : p.buzz;
  const base = 900 * Math.pow(2, p.pitch * 1.6) * (0.985 + r() * 0.03);
  const j = () => r() * 0.006;
  const notes = {
    select: [[0, 1, 0.03, 1.04, 0.0008], [0.042 + j(), 1.5, 0.05, 1.08, 0.0008]],
    back: [[0, 1.3, 0.11, 0.55, 0.004]],
    error: [[0, 0.5, 0.028, 1, 0.0006], [0.05 + j(), 0.5, 0.028, 1, 0.0006], [0.1 + j(), 0.47, 0.035, 0.97, 0.0006]],
  }[p.variant];
  const humHz = 120 * (0.985 + r() * 0.03);
  const last = notes[notes.length - 1], dryEnd = last[0] + last[2] + 0.04;
  const dur = dryEnd + (p.tail ? 0.15 : 0.012);
  const out = new Float32Array(c.seconds(dur, sr));
  const note = (at, mult, len, ratio, att) => {
    const f = base * mult, lg = Math.log(ratio), n = c.seconds(len + 0.035, sr), tone = new Float32Array(n), hum = new Float32Array(n), hz = c.noise(r, n);
    let ph = r() * TAU, ph2 = r() * TAU, sp = r(), hs = 0;
    for (let i = 0; i < n; i++) {
      const t = i / sr, a = Math.min(1, t / att);
      const e = a * Math.exp(-t / len * 1.2) * (t > len ? Math.exp(-(t - len) / 0.006) : 1);
      ph += TAU * f * Math.exp(lg * Math.min(t, len) / len) / sr;
      ph2 += TAU * humHz / sr;
      sp += humHz / sr; if (sp >= 1) sp -= 1;
      const s = Math.sin(ph);
      let v = isErr ? Math.tanh(3.5 * s) * 0.75 : s + (0.1 + 0.3 * br) * Math.sin(2 * ph) + (0.05 + 0.15 * br) * Math.sin(3 * ph);
      let g = 0.5 + 0.5 * Math.sin(ph2); g = g * g; g = g * g;
      tone[i] = v * (1 - 0.7 * b * (1 - g)) * e;
      hs += (hz[i] - hs) * 0.5;
      hum[i] = (hs * 0.35 + (sp * 2 - 1)) * g * e;
    }
    c.filter(hum, c.biquad("bp", 2200 + 3300 * br, 0.9, sr));
    c.mix(out, tone, at + 0.001, 0.6, sr);
    c.mix(out, hum, at + 0.001, 1.2 * b, sr);
    c.mix(out, c.burst(r, 0.006, "hp", 2500 + 5000 * br, 0.8, att * 0.6, 0.0014, sr), at, (isBack ? 0.05 : 0.1) + 0.15 * br, sr);
  };
  for (const [at, m, len, ra, att] of notes) note(at, m, len, ra, att);
  const drop = (at, f0, amp) => {
    const n = c.seconds(0.03, sr), x = new Float32Array(n); let ph = 0;
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      ph += TAU * f0 * (1 + t / 0.02) / sr;
      x[i] = Math.sin(ph) * Math.min(1, t / 0.0006) * Math.exp(-t / 0.007);
    }
    c.mix(out, x, at, amp, sr);
    c.mix(out, c.burst(r, 0.003, "bp", f0 * 2, 2, 0.0003, 0.0008, sr), at, amp * 0.25, sr);
  };
  if (p.drip > 0) {
    const f0 = (1900 + r() * 900) * (0.85 + 0.3 * p.pitch), at = (isBack ? 0.012 : last[0] + 0.006) + r() * 0.004;
    drop(at, f0, 0.55 * p.drip);
    if (p.drip > 0.6) drop(at + 0.012 + r() * 0.01, f0 * (1.2 + r() * 0.25), 0.3 * p.drip);
  }
  c.filter(out, c.biquad("lp", 3800 + 9000 * br, 0.7, sr));
  c.finish(out, 0.85);
  if (p.tail) {
    const echo = Float32Array.from(out);
    c.filter(echo, c.biquad("lp", 2200 + 2000 * br, 0.7, sr));
    let t = 0.025, g = 0.24;
    for (let k = 0; k < 5; k++) { c.mix(out, echo, t + r() * 0.008, g, sr); t += 0.018 + r() * 0.012; g *= 0.6; }
    c.mix(out, c.burst(r, 0.12, "bp", 3800 + 1500 * br, 1.2, 0.006, 0.035, sr), last[0] + 0.01, 0.05, sr);
    let pk = 0; for (let i = 0; i < out.length; i++) pk = Math.max(pk, Math.abs(out[i]));
    if (pk > 0.9) c.gain(out, 0.88 / pk);
  }
  c.fade(out, p.tail ? 20 : 4, sr);
  return { samples: out };
}
