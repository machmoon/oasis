// Rainy crosswalk button: a plunger strike (contact grain plus damped metal or plastic modes over a housing thump), the
// spring-back click, an alias-free two-note confirm beep, rain-wet bubble chirps and squish, and a street echo/reverb tail.
export const meta = {
  title: "Rainy Crosswalk Button", kind: "ui", format: "sound", duration: 0.95, price: 1, author: "quietmachine", payout: "quietmachine@creators.oasis.example", kit: "Rainy City Street", description: "A wet crosswalk push-button press and its beeping confirm tone, with metal or plastic housing, click weight, rain wetness and a street-echo tail; for city UI, menus and night-street scenes.",
  tags: ["crosswalk", "button", "beep", "ui", "confirm", "rain", "street", "city"],
};
export const params = { knobs: {
  button: { type: "choice", label: "Button", default: "metal", options: ["metal", "plastic"] },
  weight: { type: "range", label: "Click weight", default: 0.5, min: 0, max: 1, step: 0.01 },
  tone: { type: "range", label: "Confirm tone", default: 0.6, min: 0, max: 1, step: 0.01 },
  wetness: { type: "range", label: "Wetness", default: 0.4, min: 0, max: 1, step: 0.01 },
  pitch: { type: "range", label: "Pitch (Hz)", default: 880, min: 440, max: 1760, step: 10 },
  tail: { type: "toggle", label: "Street echo tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, metal = p.button === "metal", r = c.rng(p.seed * 613 + (metal ? 0 : 97) + 3);
  const w = p.weight, wet = p.wetness, out = new Float32Array(c.seconds(p.tail ? 0.95 : 0.42, sr));
  const press = (at, g, k) => {
    const d = k * (0.97 + r() * 0.06), damp = 1 - 0.4 * wet;
    if (metal) {
      c.mix(out, c.burst(r, 0.006, "hp", 3500 + r() * 800, 0.8, 0.0004, 0.0012, sr), at, 0.8 * g, sr);
      c.mix(out, c.ring([[2350 * d, 1], [3870 * d, 0.6], [6120 * d, 0.35]], 0.12, 0.02 * damp, sr), at + 0.0005, 0.45 * g, sr);
    } else {
      c.mix(out, c.burst(r, 0.014, "lp", 1500 + r() * 400, 0.9, 0.002, 0.005, sr), at, 0.6 * g, sr);
      c.mix(out, c.ring([[560 * d, 1], [1350 * d, 0.35]], 0.05, 0.005 * damp, sr), at + 0.001, 0.4 * g, sr);
      c.mix(out, c.burst(r, 0.025, "bp", 850, 1.5, 0.003, 0.009, sr), at, 0.22 * g, sr);
    }
    c.mix(out, c.ring([[140 - 55 * w, 1], [260 - 80 * w, 0.3]], 0.08, 0.01 + 0.03 * w, sr), at + 0.001, (0.15 + 0.7 * w) * g, sr);
  };
  press(0.004, 0.5 + 0.5 * w, 1);
  const rel = 0.09 + 0.04 * w + r() * 0.02;
  press(rel, 0.35 + 0.15 * w, 1.15);
  const f = p.pitch * (0.99 + r() * 0.02), t0 = 0.05 + r() * 0.01;
  const harm = metal ? [[1, 1], [3, 0.33], [5, 0.2], [7, 0.12]] : [[1, 1], [2, 0.22], [3, 0.07]];
  const note = (fr, len, at, g) => {
    const n = c.seconds(len, sr), x = new Float32Array(n), a = c.seconds(0.004, sr), rl = c.seconds(0.025, sr);
    const hs = harm.filter(([h]) => h * fr < sr * 0.45).map(([h, am]) => [h, am * Math.exp(-wet * 0.6 * (h - 1))]);
    let ph = 0; const dp = c.TAU * fr / sr;
    for (let i = 0; i < n; i++) {
      ph += dp; let v = 0;
      for (let k = 0; k < hs.length; k++) v += hs[k][1] * Math.sin(hs[k][0] * ph);
      const e = i < a ? 0.5 - 0.5 * Math.cos(Math.PI * i / a) : i > n - rl ? 0.5 - 0.5 * Math.cos(Math.PI * (n - i) / rl) : 1;
      x[i] = v * e * (0.75 + 0.25 * Math.exp(-i / sr / 0.03));
    }
    c.mix(out, x, at, g, sr);
  };
  if (p.tone > 0) { note(f, 0.085, t0, 0.6 * p.tone); note(f * 1.5, 0.11, t0 + 0.105, 0.55 * p.tone); }
  if (wet > 0) {
    c.mix(out, c.burst(r, 0.05, "bp", 800 + r() * 400, 1.6, 0.003, 0.014, sr), 0.006, 0.45 * wet, sr);
    c.mix(out, c.burst(r, 0.04, "hp", 4000, 0.7, 0.002, 0.01, sr), rel, 0.3 * wet, sr);
    const drops = Math.round(3 + 14 * wet);
    for (let d = 0; d < drops; d++) {
      const len = 0.01 + r() * 0.025, n = c.seconds(len, sr), x = new Float32Array(n), f0 = 1100 + r() * 2600, rise = 0.4 + r() * 0.8;
      const tau = len * 0.35, a = c.seconds(0.001, sr); let ph = 0;
      for (let i = 0; i < n; i++) { ph += c.TAU * f0 * (1 + rise * i / n) / sr; x[i] = Math.sin(ph) * Math.exp(-i / sr / tau) * Math.min(1, i / a); }
      const at = (r() < 0.65 ? 0.005 : rel) + Math.pow(r(), 1.8) * 0.09;
      c.mix(out, x, at, (0.12 + 0.25 * r()) * (0.4 + 0.6 * wet), sr);
    }
  }
  let res = out;
  if (p.tail) {
    const echo = Float32Array.from(out); c.filter(echo, c.biquad("lp", 2000, 0.7, sr)); c.filter(echo, c.biquad("hp", 300, 0.7, sr));
    c.mix(out, echo, 0.17 + r() * 0.02, 0.34, sr);
    c.mix(out, echo, 0.36 + r() * 0.03, 0.16, sr);
    res = c.reverb(out, { size: 0.6, decay: 0.45, mixAmt: 0.22 }, sr) || out;
  }
  c.finish(res, 0.85);
  let m = 0; for (let i = 0; i < res.length; i++) { const v = Math.abs(res[i]); if (v > m) m = v; }
  if (m > 0) c.gain(res, 0.85 / m);
  c.fade(res, 10, sr);
  return { samples: res };
}
