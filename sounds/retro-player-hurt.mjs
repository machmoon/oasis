// Player hurt: a descending 8-bit damage sting. A frame-stepped square or triangle voice falls in seed-chosen stairs
// or a smooth glide under a wobbling vibrato, chopped by a hurt-blink gate. An LFSR-style crunch marks the hit, and an
// optional low-passed echo trail follows.
export const meta = {
  title: "Hurt Sting", kind: "sfx", format: "sound", duration: 0.6, price: 2, author: "quietmachine", payout: "quietmachine@creators.oasis.example", kit: "Retro Arcade", description: "A wobbly, falling chiptune damage sting for when the player takes a hit, with knobs for waveform, pitch, wobble depth and rate, severity and an echo tail.",
  tags: ["hurt", "damage", "retro", "8-bit", "chiptune", "arcade", "player", "hit"],
};
export const params = { knobs: {
  waveform: { type: "choice", label: "Waveform", default: "square", options: ["square", "triangle"] },
  pitch: { type: "range", label: "Pitch", default: 660, min: 200, max: 1400, step: 10 },
  wobble: { type: "range", label: "Wobble", default: 0.5, min: 0, max: 1, step: 0.01 },
  severity: { type: "range", label: "Severity", default: 0.5, min: 0, max: 1, step: 0.01 },
  rate: { type: "range", label: "Wobble rate", default: 12, min: 4, max: 28, step: 0.5 },
  tail: { type: "toggle", label: "Echo tail", default: false },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, sq = p.waveform === "square", r = c.rng(p.seed * 6151 + (sq ? 3 : 11));
  const sev = p.severity, L = (0.3 + 0.4 * sev) * c.between(r, 0.92, 1.08);
  const m = c.seconds(L + 0.01, sr), dry = new Float32Array(m);
  const base = p.pitch * c.between(r, 0.96, 1.04);
  const drop = 12 + 18 * sev + c.between(r, -2, 2), curve = c.between(r, 0.6, 0.95);
  const qs = [0, 1, 2, 3][Math.floor(r() * 4)];
  const rate = p.rate * c.between(r, 0.88, 1.12), depth = 0.02 + 0.16 * p.wobble, rateSag = c.between(r, 0.15, 0.45);
  const blinkRate = c.between(r, 18, 30), frame = Math.max(1, Math.round(sr / 120));
  let ph = 0, ph2 = 0, lph = r(), f = base;
  for (let i = 0; i < m; i++) {
    const t = i / sr, x = Math.min(1, t / L);
    lph += rate * (1 - rateSag * x) * (1 + 0.08 * Math.sin(c.TAU * 1.7 * t + lph * 0.1)) / sr;
    if (i % frame === 0) {
      let semis = drop * Math.pow(x, curve);
      if (qs) semis = Math.round(semis / qs) * qs;
      f = base * Math.exp(-semis * Math.LN2 / 12) * (1 + depth * (0.6 + 0.4 * x) * Math.sin(c.TAU * lph));
    }
    ph += f / sr; ph -= Math.floor(ph);
    ph2 += 0.5 * f / sr; ph2 -= Math.floor(ph2);
    const duty = 0.5 - 0.3 * sev * x;
    const s = sq ? (ph < duty ? 0.7 : -0.7) : 4 * Math.abs(ph - 0.5) - 1;
    const sub = (4 * Math.abs(ph2 - 0.5) - 1) * 0.45 * sev;
    const amp = Math.min(1, t / 0.002) * (1 - 0.45 * x) * (1 - x * x * x);
    const blink = x > 0.15 ? 1 - sev * 0.6 * (0.5 - 0.5 * Math.sin(c.TAU * blinkRate * t)) : 1;
    dry[i] = (s + sub) * amp * blink * 0.6;
  }
  const nn = c.seconds(0.04 + 0.1 * sev, sr), crunch = new Float32Array(nn), sc = sr / 22050;
  let hv = 0, cnt = 0;
  for (let i = 0; i < nn; i++) {
    const x = i / nn;
    if (cnt <= 0) { hv = r() < 0.5 ? -1 : 1; cnt = Math.round((2 + x * 14 + r() * 2) * sc); }
    cnt--;
    crunch[i] = hv * Math.min(1, i / (0.001 * sr)) * Math.exp(-x * 4) * (1 - x);
  }
  c.mix(dry, crunch, 0, 0.1 + 0.3 * sev, sr);
  const off = c.between(r, 0, 0.003), tailT = p.tail ? 0.62 : 0.03;
  const out = new Float32Array(c.seconds(L + tailT + 0.02, sr));
  c.mix(out, dry, off, 1, sr);
  if (p.tail) {
    const d = c.between(r, 0.1, 0.14), gains = [0.45, 0.22, 0.1];
    for (let j = 0; j < 3; j++) {
      const echo = Float32Array.from(dry);
      c.filter(echo, c.biquad("lp", 4200 / (j + 1), 0.7, sr));
      c.mix(out, echo, off + (j + 1) * d, gains[j], sr);
    }
  }
  c.filter(out, c.biquad("hp", 35, 0.7, sr));
  c.fade(c.finish(out, 0.9), 3, sr);
  return { samples: out };
}
