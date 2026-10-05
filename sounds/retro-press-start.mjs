// Press start: an 8-bit fanfare blip. A fast rising chip arpeggio of bright, punchy notes (square, 12% pulse or saw, level-matched) lands on a short accented final note with a pitch-snap and a quick decay, then a flash of rising sparkle glints; the tail knob is a short/long echo choice, off by default.
export const meta = {
  title: "Press Start Blip", kind: "ui", format: "sound", duration: 0.6, price: 2, author: "quietmachine", payout: "quietmachine@creators.oasis.example", kit: "Retro Arcade", description: "A bright arcade start-button fanfare: a quick rising chip arpeggio landing on a punchy accent with a flash of sparkle, for title screens, menu confirms and game starts.",
  tags: ["arcade", "start", "fanfare", "8-bit", "chiptune", "ui", "blip", "retro"],
};
export const params = { knobs: {
  waveform: { type: "choice", label: "Waveform", default: "square", options: ["square", "pulse12", "saw"] },
  tail: { type: "choice", label: "Echo tail", default: "off", options: ["off", "short", "long"] },
  pitch: { type: "range", label: "Pitch", default: 0.5, min: 0, max: 1, step: 0.01 },
  flourish: { type: "range", label: "Flourish", default: 0.5, min: 0, max: 1, step: 0.01 },
  sparkle: { type: "range", label: "Sparkle", default: 0.5, min: 0, max: 1, step: 0.01 },
  tempo: { type: "range", label: "Tempo", default: 1.2, min: 0.8, max: 2, step: 0.05 },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + 29);
  const root = 380 * Math.pow(2, p.pitch * 1.4) * (0.99 + r() * 0.02);
  const step = 0.05 / p.tempo * (0.94 + r() * 0.12);
  const semis = [0, 4, 7, 12];
  if (p.flourish > 0.3) semis.push(16);
  if (p.flourish > 0.6) semis.push(19);
  if (p.flourish > 0.85) semis.push(24);
  const lastLen = 0.2 + 0.06 * p.flourish;
  const t0 = step * (semis.length - 1);
  const tl = { off: 0.03, short: 0.16, long: 0.34 }[p.tail];
  const out = new Float32Array(c.seconds(t0 + lastLen + tl + 0.05, sr));
  const shape = p.waveform === "saw" ? "saw" : "square";
  const duty = p.waveform === "pulse12" ? 0.12 : 0.5;
  const wg = { square: 1, pulse12: 1.9, saw: 0.8 }[p.waveform];
  const dry = new Float32Array(out.length);
  semis.forEach((s, k) => {
    const last = k === semis.length - 1;
    const len = last ? lastLen : step * 1.3;
    const n = c.seconds(len, sr);
    const f0 = root * Math.pow(2, s / 12) * (1 + (r() - 0.5) * 0.004);
    const vr = 6 + r() * 2.5, vd = 0.003 + r() * 0.004, ph = r() * 6.28;
    const snap = last ? 1.4 : 1.0;
    const x = c.osc(shape, (t) => f0 * (1 + (snap - 1) * Math.exp(-t * 70)) * (1 + (last ? vd * Math.min(1, t * 8) * Math.sin(c.TAU * vr * t + ph) : 0)), n, sr, { duty });
    const hp = c.biquad("hp", 200, 0.7, sr);
    const e = c.env(n, 0.0012, len * (last ? 0.3 : 0.5), sr);
    const rel = Math.floor(0.02 * sr), att = 0.0012 * sr;
    for (let i = 0; i < n; i++) x[i] = hp(x[i]) * e[i] * Math.min(1, i / att, (n - i) / rel) * (last ? 1 + 0.8 * Math.exp(-i / sr / 0.012) : 1);
    c.mix(dry, x, k * step, wg * (last ? 0.6 : 0.5) * (0.92 + 0.08 * r()), sr);
  });
  c.mix(dry, c.burst(r, 0.01, "hp", 3500, 0.8, 0.0004, 0.003, sr), 0, 0.2, sr);
  c.mix(dry, c.burst(r, 0.025, "hp", 4500, 0.8, 0.0004, 0.008, sr), t0, 0.3, sr);
  const sp = Math.round(4 + p.sparkle * 14);
  for (let g = 0; g < sp; g++) {
    const t = t0 + r() * (lastLen * 0.8);
    const f = Math.min(root * 6 * Math.pow(2, semis[Math.floor(r() * semis.length)] / 12) * (0.6 + r() * 0.3), sr * 0.4);
    const n = c.seconds(0.06, sr), gl = 0.03 + r() * 0.025;
    const x = c.osc(g % 2 ? "sine" : "tri", (tt) => f * (1 + 0.35 * Math.min(1, tt / gl)), n, sr), e = c.env(n, 0.0008, 0.01 + r() * 0.012, sr);
    for (let i = 0; i < n; i++) x[i] *= e[i];
    c.mix(dry, x, t, (0.12 + 0.2 * r()) * (0.2 + 0.9 * p.sparkle), sr);
  }
  c.mix(out, dry, 0, 1, sr);
  if (p.tail !== "off") {
    const d = (p.tail === "long" ? 0.1 : 0.07) / Math.sqrt(p.tempo), lp = c.biquad("lp", 3500, 0.7, sr), echo = c.filter(Float32Array.from(dry), lp);
    const reps = p.tail === "long" ? 3 : 2;
    for (let k = 1; k <= reps; k++) c.mix(out, echo, d * k, Math.pow(0.45, k), sr);
  }
  c.filter(out, c.biquad("lp", 9000, 0.7, sr));
  c.fade(c.finish(out, 0.85, 1.1), p.tail === "off" ? 20 : 40, sr);
  return { samples: out };
}
