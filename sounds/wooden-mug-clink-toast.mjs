// Mug toast: two mugs clink with a slight flam. Each body is a set of damped modes the hit drives (material sets ratios and damping, the two mugs are detuned), over a material-coloured contact edge, a liquid layer (slosh mass, a weaker slosh-back and rising bubble chirps) and an optional low wooden room.
export const meta = {
  title: "Tavern Toast", kind: "foley", format: "sound", duration: 0.7, price: 2, author: "hollowbody", payout: "hollowbody@creators.oasis.example", kit: "Wooden Tavern", description: "Two mugs clinking in a toast, with material, force, liquid slosh, pitch and a low-ceilinged room tail as knobs; every seed is a different pair of mugs meeting.",
  tags: ["mug", "toast", "clink", "tavern", "cheers", "pewter", "drink", "foley"],
};
export const params = { knobs: {
  material: { type: "choice", label: "Material", default: "pewter", options: ["pewter", "ceramic", "wood"] },
  force: { type: "range", label: "Force", default: 0.55, min: 0, max: 1, step: 0.01 },
  slosh: { type: "range", label: "Liquid slosh", default: 0.45, min: 0, max: 1, step: 0.01 },
  pitch: { type: "range", label: "Pitch", default: 0.5, min: 0, max: 1, step: 0.01 },
  room: { type: "toggle", label: "Room tail", default: false },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
const M = {
  pewter: { f: 1150, r: [1, 2.32, 4.25, 6.63, 9.38], a: [1, 0.6, 0.45, 0.3, 0.18], d: 0.085, g: 1, c: ["hp", 2600, 0.9, 0.006, 0.0015, 0.5] },
  ceramic: { f: 1850, r: [1, 2.71, 5.12, 8.3], a: [1, 0.55, 0.35, 0.2], d: 0.06, g: 1, c: ["bp", 6200, 1.3, 0.004, 0.0008, 0.7] },
  wood: { f: 540, r: [1, 1.58, 2.43, 3.9], a: [1, 0.5, 0.3, 0.15], d: 0.024, g: 1.9, c: ["lp", 1900, 0.8, 0.02, 0.005, 1.3] },
};
export function build(p, c) {
  const sr = c.sr, m = M[p.material], f = p.force, s = p.slosh, sl = s * (0.55 + 0.45 * f);
  const r = c.rng(p.seed * 4513 + params.knobs.material.options.indexOf(p.material) * 97 + 3);
  const t0 = 0.01, body = m.d * 6.5, liq = s > 0.001 ? 0.3 + 0.3 * s : 0;
  const n = c.seconds(t0 + 0.012 + Math.max(body, liq) + (p.room ? 0.35 : 0.02), sr);
  let out = new Float32Array(n);
  const base = m.f * Math.pow(2, (p.pitch - 0.5) * 1.4), bright = 0.35 + 0.65 * f;
  const mug = (b, amp, at) => {
    amp *= m.g;
    for (let k = 0; k < m.r.length; k++) {
      const fr = b * m.r[k] * (0.993 + r() * 0.014), dec = m.d * (0.85 + 0.3 * r()) / (1 + 0.5 * k);
      c.mix(out, c.ring([[fr, m.a[k] * Math.pow(bright, k)]], dec * 6.5, dec, sr), at + 0.0004, amp * 0.6, sr);
    }
    const cc = m.c;
    c.mix(out, c.burst(r, cc[3], cc[0], cc[1] * (0.7 + 0.6 * f), cc[2], 0.0004, cc[4], sr), at, amp * cc[5] * (0.4 + 0.8 * f), sr);
    if (p.material === "wood") c.mix(out, c.ring([[b * 0.34 * (0.97 + 0.06 * r()), 1], [b * 0.75, 0.35]], 0.06, 0.011, sr), at + 0.0006, amp * 0.55, sr);
  };
  const ratio = 1 + c.between(r, 0.04, 0.12) * (r() < 0.5 ? -1 : 1), flam = 0.0015 + r() * 0.007 * (1 - 0.5 * f);
  mug(base, 1, t0);
  mug(base * ratio, 0.65 + 0.15 * r(), t0 + flam);
  if (s > 0.001) {
    const mass = (at, dur, g) => {
      const k = c.seconds(dur, sr), x = c.noise(r, k), bp = c.biquad("bp", 450 + 350 * r(), 1.2, sr), e = c.env(k, 0.015, dur * 0.25, sr);
      for (let i = 0; i < k; i++) x[i] = bp(x[i]) * e[i];
      c.mix(out, x, at, g, sr);
    };
    mass(t0 + 0.006, 0.15 + 0.15 * s, 0.7 * sl);
    mass(t0 + 0.12 + 0.06 * r(), 0.12 + 0.12 * s, 0.3 * sl);
    const bubbles = Math.round(5 + 30 * s), span = 0.08 + 0.25 * s;
    for (let j = 0; j < bubbles; j++) {
      const at = t0 + 0.01 + Math.pow(r(), 1.5) * span, d = 0.012 + r() * 0.03, f0 = c.between(r, 500, 2000) * (1.15 - 0.3 * s), rise = 0.5 + r() * 1.3;
      const k = c.seconds(d, sr), b = new Float32Array(k), dk = Math.exp(-1 / (sr * d * 0.3)), att = 0.001 * sr;
      let ph = 0, g = 1;
      for (let i = 0; i < k; i++) { ph += c.TAU * f0 * (1 + rise * i / k) / sr; b[i] = Math.sin(ph) * g * Math.min(1, i / att); g *= dk; }
      c.mix(out, b, at, (0.1 + 0.18 * r()) * (0.4 + sl), sr);
    }
    for (let j = 0; j < Math.round(3 + 10 * sl); j++) c.mix(out, c.burst(r, 0.006, "hp", 3500 + r() * 3000, 0.8, 0.0005, 0.002, sr), t0 + 0.01 + Math.pow(r(), 1.4) * 0.1, 0.1 * sl, sr);
  }
  if (p.room) {
    const dry = Float32Array.from(out);
    c.filter(dry, c.biquad("lp", 2600, 0.7, sr));
    [[0.0047, 0.3], [0.0083, 0.2], [0.0128, 0.14], [0.019, 0.09]].forEach(([d, g]) => c.mix(out, dry, d, g, sr));
    const w = c.reverb(out, { size: 0.25, decay: 0.35, mixAmt: 0.25 }, sr);
    if (w && w.length) out = w;
  }
  c.finish(out, 0.92);
  c.gain(out, 0.72 + 0.23 * f);
  c.fade(out, 8, sr);
  return { samples: out };
}
