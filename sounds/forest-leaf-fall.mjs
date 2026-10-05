// Leaf fall: dry leaves tumbling down and landing. Each leaf has a fluttering air rustle that swells as it nears the ground, then a crinkle cluster coloured by leaf and dryness, a surface contact (tick or muffled pat), and a tiny settle; proximity sets level, air absorption and a subordinate forest-air tail.
export const meta = {
  title: "Drifting Leaves", kind: "sfx", format: "sound", duration: 1.9, price: 1, author: "stormfront", payout: "stormfront@creators.oasis.example", kit: "Forest at Night", description: "A few dry leaves fluttering down and crinkling onto the forest floor; leaf type, count, dryness, ground softness and proximity are knobs, and every seed is a different fall.",
  tags: ["leaves", "leaf", "autumn", "forest", "foley", "rustle", "crinkle", "night"],
};
export const params = { knobs: {
  leaf: { type: "choice", label: "Leaf type", default: "oak", options: ["oak", "maple", "birch"] },
  count: { type: "range", label: "Count", default: 3, min: 1, max: 8, step: 1 },
  dryness: { type: "range", label: "Dryness", default: 0.7, min: 0, max: 1, step: 0.01 },
  softness: { type: "range", label: "Surface softness", default: 0.4, min: 0, max: 1, step: 0.01 },
  proximity: { type: "range", label: "Proximity", default: 0.6, min: 0, max: 1, step: 0.01 },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, ti = params.knobs.leaf.options.indexOf(p.leaf);
  const r = c.rng(p.seed * 4513 + ti * 211 + 29);
  const count = Math.round(p.count), span = 0.3 + 0.22 * count, start = 0.5, dur = start + span + 0.42;
  let out = new Float32Array(c.seconds(dur, sr));
  const L = [
    { f: 2600, q: 3, size: 1.25, drift: 0.9, flut: 4.5 },
    { f: 3600, q: 2.5, size: 1, drift: 0.75, flut: 7 },
    { f: 5200, q: 3.5, size: 0.6, drift: 0.5, flut: 11 },
  ][ti];
  const dry = p.dryness, soft = p.softness, prox = p.proximity;
  for (let k = 0; k < count; k++) {
    const tl = start + ((k + 0.15 + 0.7 * r()) / count) * span;
    const lv = 0.7 + 0.3 * r();
    const dSec = Math.min(tl - 0.01, L.drift * (0.7 + 0.5 * r())), dn = c.seconds(dSec, sr);
    const x = c.noise(r, dn), bp = c.biquad("bp", L.f * 0.45 * (0.8 + 0.4 * r()), 1.3, sr);
    const ph = r() * c.TAU, fl = L.flut * (0.8 + 0.4 * r()), wob = 0.6 + r();
    for (let i = 0; i < dn; i++) {
      const t = i / dn, s = i / sr;
      const f = 0.5 + 0.5 * Math.sin(c.TAU * fl * s + ph + 1.5 * Math.sin(c.TAU * wob * s));
      const sw = Math.min(1, i / (0.04 * sr)) * (0.2 + 0.8 * t * t);
      x[i] = bp(x[i]) * sw * (0.15 + f * f) * (0.5 + 0.5 * dry) * (t > 0.97 ? (1 - t) / 0.03 : 1);
    }
    c.mix(out, x, tl - dSec, 0.24 * lv, sr);
    const grains = Math.round((5 + 28 * dry) * L.size * (1 - 0.4 * soft));
    for (let g = 0; g < grains; g++) {
      const t = tl + Math.pow(r(), 1.8) * (0.03 + 0.09 * L.size);
      const f = L.f * (0.55 + r() * 0.9) * (0.55 + 0.45 * dry) * (1 - 0.45 * soft);
      c.mix(out, c.burst(r, 0.003 + r() * 0.005, "bp", f, L.q, 0.0004, 0.0008 + 0.002 * r() * (1.2 - dry), sr), t, (0.2 + 0.5 * r()) * (0.4 + 0.6 * dry) * lv, sr);
    }
    const hard = 1 - soft;
    c.mix(out, c.burst(r, 0.008, "bp", 1800 * (1 - 0.5 * soft), 1.5, 0.0005, 0.002, sr), tl, 0.45 * hard * lv, sr);
    c.mix(out, c.ring([[220 + r() * 80, 1], [540 + r() * 120, 0.35]], 0.06, 0.01, sr), tl + 0.001, 0.2 * hard * L.size * lv, sr);
    c.mix(out, c.burst(r, 0.05, "lp", 450 + 400 * hard, 0.8, 0.003, 0.014, sr), tl, 0.4 * soft * L.size * lv, sr);
    c.mix(out, c.burst(r, 0.035, "lp", 900 + 600 * hard, 0.7, 0.002, 0.012, sr), tl, 0.5 * (1 - dry) * lv, sr);
    const settle = 1 + Math.floor(r() * 3);
    for (let s = 0; s < settle; s++) {
      const t = tl + 0.1 + r() * 0.16, f = L.f * (0.7 + 0.6 * r()) * (0.6 + 0.4 * dry) * (1 - 0.4 * soft);
      c.mix(out, c.burst(r, 0.004 + r() * 0.004, "bp", f, L.q, 0.0004, 0.0012, sr), t, (0.05 + 0.15 * dry) * lv, sr);
    }
  }
  const op = c.onepole(sr), fc = 1800 + 10000 * prox, hp = c.biquad("hp", 140, 0.7, sr);
  c.filter(out, (v) => hp(op(v, fc)));
  const rv = c.reverb(out, { size: 0.5, decay: 0.6, mixAmt: 0.08 + 0.22 * (1 - prox) }, sr);
  if (rv && rv.length) out = rv;
  c.finish(out, 0.95);
  c.gain(out, 0.75 + 0.25 * prox);
  c.fade(out, 20, sr);
  return { samples: out };
}
