// Fridge door close: an air swing, a padded cabinet thump with a gasket puff and magnet snap, jars clinking in the shelves, and an optional kitchen room tail.
export const meta = {
  title: "Fridge Door Shut", kind: "impact", format: "sound", duration: 0.8, price: 2, author: "foleyroom", payout: "foleyroom@creators.oasis.example", kit: "Kitchen", description: "A fridge door swinging shut onto its gasket, with a padded thump, a magnetic seal puff and jars clinking in the door; size, force, contents and seal are knobs.",
  tags: ["fridge", "door", "kitchen", "close", "gasket", "clink", "jar", "foley"],
};
export const params = { knobs: {
  size: { type: "choice", label: "Fridge size", default: "standard", options: ["bar", "standard", "american"] },
  force: { type: "range", label: "Slam force", default: 0.5, min: 0, max: 1, step: 0.01 },
  clink: { type: "range", label: "Contents clink", default: 0.5, min: 0, max: 1, step: 0.01 },
  seal: { type: "range", label: "Magnet seal", default: 0.6, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Room tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, si = params.knobs.size.options.indexOf(p.size), r = c.rng(p.seed * 7907 + si * 263 + 11);
  const f = p.force, s = p.seal, k = p.clink;
  const S = [{ base: 190, dec: 0.03, low: 150, sw: 0.05, lt: 0.018 }, { base: 120, dec: 0.042, low: 105, sw: 0.07, lt: 0.03 }, { base: 78, dec: 0.058, low: 72, sw: 0.09, lt: 0.045 }][si];
  let out = new Float32Array(c.seconds(p.tail ? 0.95 : 0.58, sr));
  const T0 = 0.14;
  const sw = S.sw * (1.4 - 0.6 * f), wn = c.seconds(sw, sr), air = c.pink(r, wn), alp = c.biquad("lp", 250 + 600 * f, 0.7, sr);
  for (let i = 0; i < wn; i++) { const e = i / wn; air[i] = alp(air[i]) * e * e; }
  c.mix(out, air, T0 - sw, 0.25 + 0.2 * f, sr);
  c.mix(out, c.burst(r, 0.035, "lp", 500 + 2800 * f, 0.7, 0.0015 + 0.002 * (1 - f), 0.004 + 0.008 * (1 - f), sr), T0, 0.55 + 0.4 * f, sr);
  c.mix(out, c.burst(r, 0.14, "lp", S.low * (0.9 + 0.2 * r()), 0.7, 0.002, S.lt + 0.02 * f, sr), T0, 1.15, sr);
  const dk = S.dec * (1 - 0.5 * s) * (0.75 + 0.4 * f);
  const modes = [[1, 1], [1.73, 0.5], [2.61, 0.28], [3.92, 0.15], [5.4, 0.08]].map(([m, a]) => [S.base * m * (0.95 + 0.1 * r()), a * (0.6 + 0.8 * r())]);
  c.mix(out, c.ring(modes, dk * 5, dk, sr), T0 + 0.001, 0.42 * (0.35 + 0.65 * f) * (1 - 0.4 * s), sr);
  c.mix(out, c.burst(r, 0.004, "hp", 2400 + 1500 * r(), 0.8, 0.0004, 0.0015, sr), T0 + 0.002 + 0.002 * r(), 0.35 * s, sr);
  c.mix(out, c.burst(r, 0.07, "bp", 160 + 80 * r() + 40 * (2 - si), 0.8, 0.004, 0.022 + 0.015 * s, sr), T0 + 0.008 + 0.008 * r(), 0.7 * s, sr);
  const rat = Math.round((1 - s) * (3 + 5 * f));
  for (let i = 0; i < rat; i++) c.mix(out, c.burst(r, 0.006, "bp", 1200 + 2200 * r(), 1.2, 0.0004, 0.0012 + 0.002 * r(), sr), T0 + 0.012 + 0.05 * r(), (0.1 + 0.15 * r()) * (1 - s), sr);
  const jars = Math.round(k * (2 + 8 * f) + (k > 0 ? r() * 2 : 0));
  for (let j = 0; j < jars; j++) {
    const fr = 1700 + 3000 * r(), d = 0.01 + 0.025 * r();
    const jm = [[fr, 1], [fr * (2.2 + 0.3 * r()), 0.5], [fr * (3.8 + 0.6 * r()), 0.22]];
    const t = T0 + 0.008 + Math.pow(r(), 1.4) * (0.05 + 0.12 * f), g = (0.12 + 0.3 * r()) * k * (0.5 + 0.5 * f);
    c.mix(out, c.burst(r, 0.003, "hp", 3000, 0.7, 0.0003, 0.0008, sr), t, g * 0.6, sr);
    c.mix(out, c.ring(jm, d * 4.5, d, sr), t + 0.0003, g, sr);
    if (r() < 0.55) c.mix(out, c.ring(jm.map(([q, a]) => [q * (0.99 + 0.02 * r()), a]), d * 4, d * 0.7, sr), t + 0.02 + 0.04 * r(), g * (0.3 + 0.3 * r()), sr);
  }
  const bot = Math.round(k * (1 + 3 * f));
  for (let b = 0; b < bot; b++) { const fb = 550 + 600 * r(), db = 0.012 + 0.01 * r(); c.mix(out, c.ring([[fb, 1], [fb * (1.55 + 0.2 * r()), 0.4]], db * 5, db, sr), T0 + 0.006 + 0.07 * r(), (0.15 + 0.15 * r()) * k, sr); }
  if (p.tail) {
    const res = c.reverb(out, { size: 0.3 + 0.15 * si, decay: 0.25 + 0.08 * si, mixAmt: 0.2 }, sr);
    if (res && res.length) out = res.length === out.length ? res : res.slice(0, out.length);
  }
  c.fade(c.finish(out, 0.9, 1.1), 15, sr);
  c.gain(out, 0.62 + 0.38 * f);
  return { samples: out };
}
