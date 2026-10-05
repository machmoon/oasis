// Car door slam: a latch crack and glass-bright metal skin hit over a pitched cabin thump with a falling sweep, panel rattle grains tied to the envelope, and an optional booming tail; the render is trimmed to the audible decay.
export const meta = {
  title: "Hard Door Slam", kind: "impact", format: "sound", duration: 1.1, price: 3, author: "hollowbody", payout: "hollowbody@creators.oasis.example", kit: "Car Interior", description: "An aggressive car door slam that shakes the cabin, with door size, force, panel rattle, low-end weight, pitch and a boom tail as knobs; for driver exits, angry cutscenes and heavy game interactions.",
  tags: ["car", "door", "slam", "impact", "cabin", "metal", "vehicle", "boom"],
};
export const params = { knobs: {
  size: { type: "choice", label: "Door size", default: "sedan", options: ["compact", "sedan", "SUV"] },
  force: { type: "range", label: "Force", default: 0.8, min: 0, max: 1, step: 0.01 },
  rattle: { type: "range", label: "Panel rattle", default: 0.5, min: 0, max: 1, step: 0.01 },
  weight: { type: "range", label: "Low-end weight", default: 0.6, min: 0, max: 1, step: 0.01 },
  pitch: { type: "range", label: "Pitch", default: 0.5, min: 0, max: 1, step: 0.01 },
  boom: { type: "toggle", label: "Boom tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, si = params.knobs.size.options.indexOf(p.size), r = c.rng(p.seed * 613 + si * 97 + 3);
  const sc = [1.3, 1, 0.72][si], pm = Math.pow(2, (p.pitch - 0.5) * 1.2), f = p.force, w = p.weight;
  const out = new Float32Array(c.seconds(1.1, sr));
  const base = 68 * sc * pm * (0.96 + r() * 0.08);
  const dn = c.seconds(0.45 + 0.15 * si, sr);
  const th = c.osc("sine", (t) => base * (1 + 1.1 * Math.exp(-t * 26)), dn, sr);
  const te = c.env(dn, 0.003, 0.1 + 0.15 * w + 0.05 * si, sr);
  for (let i = 0; i < dn; i++) th[i] *= te[i];
  c.mix(out, th, 0.004, 0.45 + 0.6 * w, sr);
  const body = [[base * 1.9, 0.8], [base * 2.9 * (1 + r() * 0.05), 0.5], [base * 4.6, 0.3], [base * 7.3, 0.18]];
  c.mix(out, c.ring(body, 0.4, 0.08 + 0.04 * si, sr), 0.003, 0.5 * (0.4 + 0.6 * f), sr);
  const skin = [[420 * sc * pm, 1], [780 * sc * pm * (1 + r() * 0.04), 0.7], [1330 * sc * pm, 0.5], [2150 * pm, 0.3]];
  c.mix(out, c.ring(skin, 0.3, 0.05 + 0.025 * si, sr), 0.002, 0.3 + 0.4 * f, sr);
  c.mix(out, c.burst(r, 0.03, "bp", 2400 + 1500 * f, 1.2, 0.0006, 0.007, sr), 0, 0.5 + 0.5 * f, sr);
  const lt = 0.045 + 0.012 * r();
  c.mix(out, c.burst(r, 0.015, "hp", 3500, 0.9, 0.0004, 0.003, sr), lt, 0.4 + 0.4 * f, sr);
  c.mix(out, c.ring([[2900 * pm, 1], [4700 * pm, 0.5], [6900, 0.25]], 0.1, 0.012, sr), lt, 0.2 + 0.2 * f, sr);
  const grains = Math.round(8 + 28 * p.rattle);
  for (let g = 0; g < grains; g++) {
    const t = 0.03 + Math.pow(r(), 1.5) * 0.45, a = Math.exp(-t / 0.18);
    c.mix(out, c.burst(r, 0.01 + r() * 0.015, "bp", 700 + r() * 3200, 5, 0.0005, 0.004 + r() * 0.006, sr), t, (0.12 + 0.3 * r()) * a * (0.15 + 0.95 * p.rattle) * (0.5 + 0.5 * f), sr);
  }
  if (p.boom) {
    const n = c.seconds(0.85, sr), x = c.brown(r, n), lp = c.biquad("lp", 140 * pm, 0.9, sr), e = c.env(n, 0.01, 0.26, sr);
    for (let i = 0; i < n; i++) x[i] = lp(x[i]) * e[i];
    c.mix(out, x, 0.005, 3 + 3 * w, sr);
    const tail = c.reverb(c.burst(r, 0.05, "lp", 900, 0.8, 0.002, 0.02, sr), { size: 0.5 + 0.15 * si, decay: 0.5, mixAmt: 1 }, sr);
    c.mix(out, tail, 0.01, 0.3 + 0.2 * f, sr);
  }
  c.filter(out, c.biquad("lp", 9000, 0.7, sr));
  c.finish(out, 0.9, 1.3);
  const keep = c.seconds(p.boom ? 1.0 : 0.75 + 0.05 * si, sr), res = out.slice(0, keep);
  c.fade(res, 40, sr);
  return { samples: res };
}
