// Wooden mug set down: a felt-to-crack contact click, a damped noise-excited wood knock (mug staves plus a hollow cavity tock that the ale fills and deadens), short table-plank modes, a seeded edge-first flam and rim-rocking wobble, and a swirling ale slosh that starts at impact.
export const meta = {
  title: "Mug On Oak", kind: "foley", format: "sound", duration: 0.45, price: 2, author: "hollowbody", payout: "hollowbody@creators.oasis.example", kit: "Wooden Tavern", description: "A wooden tankard set down on a tavern table, from a hollow empty tock to a heavy full-of-ale thud, eased down or slammed; every seed lands and rocks the mug a different way.",
  tags: ["mug", "tankard", "tavern", "wood", "table", "ale", "foley", "set-down"],
};
export const params = { knobs: {
  fullness: { type: "choice", label: "Fullness", default: "half", options: ["empty", "half", "full"] },
  force: { type: "range", label: "Landing force", default: 0.5, min: 0, max: 1, step: 0.01 },
  thickness: { type: "range", label: "Table thickness", default: 0.5, min: 0, max: 1, step: 0.01 },
  slosh: { type: "toggle", label: "Slosh", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const fi = params.knobs.fullness.options.indexOf(p.fullness), fill = fi / 2;
  const sr = c.sr, r = c.rng(p.seed * 6151 + fi * 97 + 3), F = p.force, T = p.thickness;
  const n = c.seconds(0.45, sr), out = new Float32Array(n), body = new Float32Array(n);
  const base = (940 - 460 * fill) * (0.96 + 0.08 * r()), mDec = 0.02 - 0.012 * fill, bright = 0.25 + 0.75 * F;
  const side = [1, 0.93 + 0.12 * r()];
  const mug = (amp, at, s, soft) => {
    const f = base * side[s];
    c.mix(body, c.ring([[f, 1], [f * 1.58 * (0.99 + 0.02 * r()), 0.55 * bright], [f * 2.37, 0.35 * bright * (1 - 0.5 * fill)], [f * 3.62, 0.25 * bright * (1 - 0.6 * fill)]], 0.12, mDec, sr), at, amp * 0.6, sr);
    c.mix(body, c.burst(r, 0.05, "bp", f * (0.98 + 0.04 * r()), 2.5, soft, mDec * 1.2, sr), at, amp, sr);
    if (fill < 1) c.mix(body, c.burst(r, 0.07, "bp", (1250 - 300 * fill) * side[s], 7, soft, 0.004 + 0.022 * (1 - fill), sr), at, amp * 0.9 * (1 - fill), sr);
  };
  const tf = (230 - 130 * T) * (0.97 + 0.06 * r()), tDec = 0.032 - 0.02 * T;
  const table = (amp, at, soft) => {
    c.mix(body, c.ring([[tf, 1], [tf * 2.21, 0.45], [tf * 3.9, 0.2 * (1 - T)]], 0.15, tDec, sr), at, amp * 0.7, sr);
    c.mix(body, c.burst(r, 0.06, "bp", tf * 1.4, 1.2, soft, tDec, sr), at, amp * 0.8, sr);
  };
  const click = (amp, at, soft) => c.mix(body, c.burst(r, 0.006, "hp", 900 + 2600 * F, 0.7, soft * 0.5, 0.0012 + 0.002 * (1 - F), sr), at, amp, sr);
  const att = 0.0004 + 0.004 * (1 - F) * (1 - F), flam = (0.002 + 0.012 * r()) * (1 - 0.6 * F), edge = 0.25 + 0.35 * r();
  click((0.3 + 0.9 * F) * edge, 0, att);
  mug((0.4 + 0.6 * F) * edge, 0, 1, att);
  click(0.35 + 1.1 * F, flam, att);
  mug(0.5 + 0.7 * F, flam, 0, att);
  table((0.35 + 0.8 * F) * (0.7 + 0.6 * fill), flam + 0.001, att * 1.5);
  c.mix(body, c.burst(r, 0.06, "lp", 120 + 160 * (1 - T), 0.8, att * 2, 0.014 + 0.016 * fill, sr), flam, (0.25 + 0.6 * F) * (0.4 + 0.9 * fill), sr);
  const taps = 1 + Math.floor(r() * 3 + F * 3.5 * (1 - 0.5 * fill));
  let t = flam + 0.03 + 0.035 * r(), gap = (0.03 + 0.04 * r()) * (1 - 0.3 * fill), a = (0.3 + 0.35 * F) * (1 - 0.45 * fill) * (0.7 + 0.5 * r()), s = 1;
  for (let k = 0; k < taps && t < 0.32; k++) {
    const at2 = 0.0008 + 0.002 * r();
    click(a * 0.7, t, at2); mug(a, t, s, at2); table(a * 0.35, t + 0.0008, at2);
    s = 1 - s; t += gap; gap *= 0.55 + 0.25 * r(); a *= 0.45 + 0.3 * r();
  }
  c.filter(body, c.biquad("lp", Math.min(0.45 * sr, (1400 + 9000 * F) * (1 - 0.35 * fill)), 0.7, sr));
  c.mix(out, body, 0, 1, sr);
  if (p.slosh) {
    const vol = 0.08 + 0.92 * fill, m = c.seconds(0.38, sr), x = c.noise(r, m);
    const rate = (6.5 - 2.5 * fill) * (0.85 + 0.3 * r()), ph = r() * c.TAU, w = c.TAU * rate / sr;
    const tau = (0.06 + 0.16 * fill) * (0.8 + 0.4 * r()), k = Math.exp(-1 / (sr * tau));
    const c0 = 2000 - 1650 * fill, span = 2200 - 1500 * fill;
    let e = 1, lo = 0, bd = 0;
    for (let i = 0; i < m; i++) {
      const sw = 0.5 + 0.5 * Math.sin(w * i + ph), g = sw * sw, f = 2 * Math.sin(Math.PI * (c0 + span * g) / sr);
      const hi = x[i] - lo - 0.7 * bd; bd += f * hi; lo += f * bd;
      x[i] = bd * (0.25 + 0.75 * g) * e * Math.min(1, i / (0.006 * sr)); e *= k;
    }
    c.mix(out, x, flam + 0.002, (0.5 + 1.0 * F) * vol * 1.6, sr);
    const grains = Math.round(8 + 50 * fill * (0.5 + F));
    for (let j = 0; j < grains; j++) {
      const dt = -Math.log(1 - r() * 0.95) * tau, sw = 0.5 + 0.5 * Math.sin(c.TAU * rate * dt + ph);
      c.mix(out, c.burst(r, 0.012 + 0.012 * r(), "bp", c0 + span * r(), 4, 0.002, 0.005 + 0.006 * fill, sr), flam + 0.004 + dt, (0.1 + 0.2 * r()) * sw * sw * vol * (0.5 + F), sr);
    }
  }
  const wet = c.reverb(out, { size: 0.22, decay: 0.3, mixAmt: 0.1 }, sr) || out;
  c.finish(wet, 0.92, 1.1);
  c.gain(wet, 0.56 + 0.38 * F);
  c.fade(wet, 6, sr);
  return { samples: wet };
}
