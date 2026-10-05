// Hover tick: a tiny, high focus tick for sci-fi menus. The body is a seeded, damped modal blip: ringing glass, dull plastic or a gated digital square.
// A sub-5 ms filtered noise edge is the contact. Shimmer adds detuned beating twins, a wobble and a sparkle overtone. The render is trimmed to the tick.
export const meta = {
  title: "Hover Tick", kind: "ui", format: "sound", duration: 0.08, price: 1, author: "quietmachine", payout: "quietmachine@creators.oasis.example", kit: "Sci-fi Console", description: "A tiny high selection tick for menu focus and hover states on a starship console; material, pitch, click sharpness and shimmer are knobs, and every seed is a slightly different tick.",
  tags: ["ui", "tick", "hover", "menu", "focus", "sci-fi", "console", "blip"],
};
export const params = { knobs: {
  material: { type: "choice", label: "Material", default: "glass", options: ["glass", "plastic", "digital"] },
  pitch: { type: "range", label: "Pitch (Hz)", default: 2600, min: 1200, max: 5000, step: 10 },
  sharpness: { type: "range", label: "Click sharpness", default: 0.6, min: 0, max: 1, step: 0.01 },
  shimmer: { type: "range", label: "Shimmer", default: 0.3, min: 0, max: 1, step: 0.01 },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, mi = params.knobs.material.options.indexOf(p.material), r = c.rng(p.seed * 4241 + mi * 97 + 3);
  const sh = p.sharpness, sm = p.shimmer, f0 = p.pitch * (0.985 + r() * 0.03), ny = 0.45 * sr, digital = mi === 2;
  const M = {
    glass: { modes: [[1, 1], [2.32, 0.45], [4.25, 0.25], [6.63, 0.12]], dec: 0.016 + 0.026 * sm, sparkle: 3.01 },
    plastic: { modes: [[0.75, 1], [1.93, 0.4], [3.1, 0.15]], dec: 0.006 + 0.006 * sm, sparkle: 2.1 },
    digital: { modes: [[1, 1]], dec: 0, sparkle: 2.0 },
  }[p.material];
  const att = 0.0045 - 0.0042 * sh, attN = Math.max(1, Math.round(att * sr));
  const gateT = 0.01 + 0.025 * sm, relT = 0.003;
  const len = digital ? att + gateT + relT * 6 : att + M.dec * (mi === 0 ? 4.5 : 5) + 0.003;
  const n = c.seconds(len, sr), out = new Float32Array(n), parts = [];
  M.modes.forEach(([ratio, amp], k) => {
    const f = f0 * ratio * (1 + (r() - 0.5) * 0.012), d = M.dec / (1 + 0.6 * k);
    if (f < ny) parts.push({ f, a: amp, d, ph: r() * c.TAU });
    const det = (0.003 + 0.012 * sm) * (0.5 + r());
    if (sm > 0 && f * (1 + det) < ny) parts.push({ f: f * (1 + det), a: amp * 0.7 * sm, d: d * 1.1, ph: r() * c.TAU });
  });
  const fs = f0 * M.sparkle * (1 + (r() - 0.5) * 0.01);
  if (fs < ny) parts.push({ f: fs, a: 0.4 * sm, d: M.dec * 0.6, ph: r() * c.TAU });
  for (const q of parts) { q.inc = c.TAU * q.f / sr; q.g = q.a; q.mul = digital ? 1 : Math.exp(-1 / (q.d * sr)); }
  const wobF = 14 + r() * 12, wobP = r() * c.TAU, drop = 0.3 + 0.4 * sh, ts = Math.floor(n * 0.65);
  for (let i = 0; i < n; i++) {
    const t = i / sr, a = i < attN ? 0.5 - 0.5 * Math.cos(Math.PI * i / attN) : 1;
    const wob = 1 + 0.35 * sm * Math.sin(c.TAU * wobF * t + wobP);
    const taper = i > ts ? 0.5 + 0.5 * Math.cos(Math.PI * (i - ts) / (n - ts)) : 1;
    let s = 0;
    if (digital) {
      for (const q of parts) { q.ph += q.inc * (1 + drop * Math.exp(-t / 0.003)); s += (Math.sin(q.ph) >= 0 ? 0.6 : -0.6) * q.g; }
      s = Math.round(s * 4) / 4;
      s *= t < att + gateT ? 1 : Math.exp(-(t - att - gateT) / relT);
    } else {
      for (const q of parts) { q.ph += q.inc; s += Math.sin(q.ph) * q.g; q.g *= q.mul; }
    }
    out[i] = s * a * wob * taper;
  }
  const clickF = Math.min(ny, [2500 + 9000 * sh, f0 * 1.2, 4000 + 9000 * sh][mi]);
  const click = c.burst(r, 0.005, mi === 1 ? "bp" : "hp", clickF, mi === 1 ? 1.5 : 0.8, 0.0003, 0.0008 + 0.002 * (1 - sh), sr);
  c.mix(out, click, 0, (0.08 + 0.55 * sh) * (mi === 1 ? 1.3 : 1), sr);
  c.filter(out, c.biquad("lp", Math.min(ny, (digital ? 3000 : 4000) + (digital ? 9000 : 14000) * sh), 0.7, sr));
  c.fade(c.finish(out, 0.85), 1, sr);
  return { samples: out };
}
