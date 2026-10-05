// Microwave keypad: a press layer (rubbery membrane squish or snapping tactile dome) leading a ringing piezo square beep, with an optional diffuse kitchen-reflection tail.
export const meta = {
  title: "Keypad Beep", kind: "ui", format: "sound", duration: 0.3, price: 1, author: "quietmachine", payout: "quietmachine@creators.oasis.example", kit: "Kitchen", description: "A microwave keypad press and piezo beep: button feel, beep pitch, length, click amount and room tail are knobs; every seed is a slightly different press.",
  tags: ["microwave", "beep", "keypad", "button", "ui", "kitchen", "appliance", "piezo"],
};
export const params = { knobs: {
  button: { type: "choice", label: "Button type", default: "membrane", options: ["membrane", "tactile"] },
  pitch: { type: "range", label: "Beep pitch", default: 2700, min: 1500, max: 4500, step: 10 },
  length: { type: "range", label: "Beep length", default: 0.35, min: 0, max: 1, step: 0.01 },
  click: { type: "range", label: "Click amount", default: 0.5, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Room tail", default: false },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, tact = p.button === "tactile", r = c.rng(p.seed * 613 + (tact ? 97 : 11));
  const j = (a) => 1 - a + 2 * a * r();
  const f = p.pitch * j(0.006), blen = (0.04 + 0.32 * p.length) * j(0.04), k = 0.06 + 0.94 * p.click;
  const delay = tact ? 0.006 + r() * 0.004 : 0.016 + r() * 0.009;
  const relTick = tact ? delay + blen + 0.008 + r() * 0.012 : 0;
  const tailLen = p.tail ? 0.45 : 0.05;
  const total = Math.max(delay + blen + 0.035, relTick + 0.02) + tailLen;
  const out = new Float32Array(c.seconds(total, sr));
  if (tact) {
    c.mix(out, c.burst(r, 0.006, "hp", 3200 + r() * 1600, 0.9, 0.0003, 0.0011, sr), 0.001, 1.3 * k * j(0.1), sr);
    c.mix(out, c.ring([[4300 * j(0.04), 1], [6900 * j(0.04), 0.45], [2350 * j(0.05), 0.4]], 0.03, 0.0035 * j(0.2), sr), 0.0015, 0.85 * k, sr);
    c.mix(out, c.burst(r, 0.005, "hp", 2600 + r() * 1200, 0.8, 0.0004, 0.001, sr), relTick, (0.5 + 0.25 * r()) * k, sr);
  } else {
    c.mix(out, c.burst(r, 0.03, "lp", 850 + r() * 350, 0.8, 0.002, 0.007 * j(0.2), sr), 0.001, 1.4 * k * j(0.1), sr);
    c.mix(out, c.ring([[255 * j(0.05), 1], [620 * j(0.05), 0.4]], 0.05, 0.007, sr), 0.002, 0.8 * k, sr);
    c.mix(out, c.burst(r, 0.02, "bp", 1400 + r() * 500, 1.2, 0.003, 0.008, sr), 0.004, 0.5 * k, sr);
  }
  const n = c.seconds(blen + 0.03, sr), beep = new Float32Array(n);
  const harm = [], roll = tact ? 1 : 1.9;
  for (let h = 1; h <= 9; h += 2) if (f * h < sr * 0.45) harm.push([h, 1 / Math.pow(h, roll)]);
  const wr = 4 + r() * 5, wp = r() * c.TAU, wd = 0.0015 + r() * 0.002, att = 0.001 + r() * 0.001;
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    ph += c.TAU * f * (1 + wd * Math.sin(c.TAU * wr * t + wp)) / sr;
    let s = 0;
    for (let q = 0; q < harm.length; q++) s += Math.sin(ph * harm[q][0]) * harm[q][1];
    const a = Math.min(1, t / att), rel = t < blen ? 1 - 0.12 * t / blen : 0.88 * Math.exp(-(t - blen) / 0.0025);
    beep[i] = s * a * rel;
  }
  const res = c.biquad("bp", f, 7, sr);
  for (let i = 0; i < n; i++) beep[i] = 0.75 * beep[i] + 0.35 * res(beep[i]);
  c.mix(out, beep, delay, (tact ? 0.55 : 0.5) * j(0.05), sr);
  if (p.tail) {
    const N = out.length, wet = new Float32Array(N), lp = c.onepole(sr);
    for (let q = 0; q < 26; q++) {
      const d = 0.005 + Math.pow(r(), 1.4) * 0.26, g = Math.exp(-d / 0.075) * (0.4 + 0.6 * r()) * (r() < 0.5 ? -1 : 1);
      const o = Math.floor(d * sr);
      for (let i = 0; i + o < N; i++) wet[i + o] += out[i] * g;
    }
    for (let i = 0; i < N; i++) out[i] += 0.32 * lp(wet[i], 4500);
  }
  c.finish(out, 0.85);
  const m = Math.min(out.length, c.seconds(p.tail ? 0.08 : 0.012, sr));
  for (let i = 0; i < m; i++) out[out.length - 1 - i] *= i / m;
  return { samples: out };
}
