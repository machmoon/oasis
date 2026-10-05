// Block Break: an 8-bit brick shatter. A sample-and-hold crunch and a square-wave thump drop make the hit; fragments then bounce as quantised chiptune blips under a restitution rule, with an optional scatter tail of late, far fragments.
export const meta = {
  title: "Block Break", kind: "impact", format: "sound", duration: 0.6, price: 2, author: "quietmachine", payout: "quietmachine@creators.oasis.example", kit: "Retro Arcade", description: "An 8-bit block shattering into bouncing debris blips, with brick, ice or stone material, debris count, crunch and pitch as knobs, for platformer brick smashes and breakable walls.",
  tags: ["brick", "break", "8bit", "chiptune", "arcade", "shatter", "debris", "retro"],
};
export const params = { knobs: {
  material: { type: "choice", label: "Material", default: "brick", options: ["brick", "ice", "stone"] },
  debris: { type: "range", label: "Debris count", default: 0.5, min: 0, max: 1, step: 0.01 },
  crunch: { type: "range", label: "Crunch", default: 0.5, min: 0, max: 1, step: 0.01 },
  pitch: { type: "range", label: "Pitch", default: 0.5, min: 0, max: 1, step: 0.01 },
  scatter: { type: "toggle", label: "Scatter tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, mi = params.knobs.material.options.indexOf(p.material), r = c.rng(p.seed * 613 + mi * 97 + 11);
  const M = [
    { f: 520, duty: 0.5, tri: false, sh: 3200, dec: 0.018, lp: 3800, body: 1, spread: 1.4, drop: 0.3 },
    { f: 1400, duty: 0.125, tri: true, sh: 9000, dec: 0.026, lp: 9000, body: 0.4, spread: 2.0, drop: -0.08 },
    { f: 230, duty: 0.25, tri: false, sh: 1300, dec: 0.011, lp: 1900, body: 1.3, spread: 0.9, drop: 0.45 },
  ][mi];
  const pm = Math.pow(2, (p.pitch - 0.5) * 2) * (0.96 + r() * 0.08), base = M.f * pm;
  const q = (f) => 440 * Math.pow(2, Math.round(12 * Math.log2(f / 440)) / 12);
  const ev = [], blip = (t, f, len, amp, drop) => ev.push([t, q(f), len, amp, drop]);
  const count = Math.round(2 + 9 * p.debris), restit = 0.5 + 0.15 * r();
  for (let k = 0; k < count; k++) {
    let t = 0.03 + (k / Math.max(1, count)) * 0.12 + r() * 0.035, dt = 0.06 + r() * 0.07, a = 0.55 + 0.4 * r();
    const f = base * (0.7 + r() * M.spread), bounces = 2 + Math.floor(r() * 3);
    for (let b = 0; b < bounces; b++) {
      blip(t, f * (1 - 0.05 * b), M.dec * (0.8 + 0.6 * r()), a, M.drop * (0.6 + 0.8 * r()));
      t += dt; dt *= restit * (0.85 + 0.3 * r()); a *= 0.5 + 0.2 * r();
    }
  }
  if (p.scatter) {
    const late = Math.round(2 + 5 * p.debris);
    for (let k = 0; k < late; k++) {
      let t = 0.22 + r() * 0.2, a = 0.22 + 0.15 * r(), dt = 0.035 + r() * 0.03;
      const f = base * (0.55 + r() * M.spread * 0.8);
      for (let b = 0; b < 3; b++) { blip(t, f, M.dec * (0.7 + 0.5 * r()), a, M.drop); t += dt; dt *= restit; a *= 0.5; }
    }
    if (mi === 1) for (let k = 0; k < 4; k++) blip(0.05 + r() * 0.3, base * (2.5 + r() * 1.5), 0.012, 0.18, -0.05);
  }
  let end = 0.12 + 0.12 * p.crunch;
  for (const e of ev) end = Math.max(end, e[0] + e[2] * 4.5);
  const out = new Float32Array(c.seconds(end + 0.03, sr));
  for (const [t, f, len, amp, drop] of ev) {
    const s0 = Math.floor(t * sr), m = Math.min(Math.floor(len * 4.5 * sr), out.length - s0);
    const k = Math.exp(-1 / (len * sr)), at = 0.0008 * sr, sweep = len * 3 * sr;
    let ph = r(), e = 1;
    for (let i = 0; i < m; i++) {
      ph += f * (1 - drop * Math.min(1, i / sweep)) / sr; ph -= Math.floor(ph);
      const s = M.tri ? 4 * Math.abs(ph - 0.5) - 1 : (ph < M.duty ? 1 : -1);
      out[s0 + i] += s * amp * e * Math.min(1, i / at) * 0.5; e *= k;
    }
  }
  const cn = c.seconds(0.06 + 0.12 * p.crunch, sr), cr = new Float32Array(cn), lp = c.onepole(sr);
  const hold = Math.max(1, Math.floor(sr / (M.sh * (0.7 + 0.6 * r())))), lv = Math.round(10 - 7 * p.crunch);
  const cdec = Math.exp(-1 / ((0.015 + 0.04 * p.crunch) * sr));
  let hv = 0, ce = 1;
  for (let i = 0; i < cn; i++) {
    if (i % hold === 0) hv = Math.round((r() * 2 - 1) * lv) / lv;
    cr[i] = lp(hv, M.lp * (0.7 + 0.6 * p.crunch)) * ce * Math.min(1, i / (0.0012 * sr)); ce *= cdec;
  }
  c.mix(out, cr, 0.001, 0.3 + 0.6 * p.crunch, sr);
  const bn = c.seconds(0.12, sr), b0 = base * 0.45 * (0.94 + 0.12 * r()), b1 = Math.max(70, base * 0.15);
  const body = c.osc("square", (t) => b1 + (b0 - b1) * Math.exp(-t / (0.02 + 0.015 * r())), bn, sr, { duty: 0.5 });
  c.multiply(body, c.env(bn, 0.002, 0.025 + 0.015 * M.body, sr));
  c.mix(out, body, 0.002, 0.35 * M.body, sr);
  if (p.scatter) {
    const wet = c.reverb(out, { size: 0.2, decay: 0.15, mixAmt: 0.1 }, sr);
    if (wet && wet !== out && wet.length) for (let i = 0; i < out.length; i++) out[i] = wet[i] || 0;
  }
  c.filter(out, c.biquad("hp", 50, 0.7, sr));
  const tl = c.seconds(0.03, sr);
  for (let i = 0; i < tl; i++) out[out.length - 1 - i] *= i / tl;
  c.fade(c.finish(out, 0.88, 1.1), 2, sr);
  return { samples: out };
}
