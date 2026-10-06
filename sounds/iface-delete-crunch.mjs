// Delete crunch: something crumpled and thrown away. A burst of irregular crackle grains (paper fibres, digital
// bit-crush or glass shards by material) that thins out over the gesture, under a short falling noise "poof" that
// carries the downward motion into the bin.
// The poof is jsfxr sfxr.js hitHurt with its NOISE wave (noise resampled at a falling rate, p_freq_ramp -0.3 to -0.7);
// the crackle is a stream of short filtered grains, the way the kit's notes on Farnell's Designing Sound build crackle
// (a book, not code). The sample-and-hold crush is sfxr's noise at a low period.
// Hand-written by a Claude Code agent against the factory contract (not built by the factory).
export const meta = {
  title: "Delete Crunch", kind: "ui", format: "sound", duration: 0.3, price: 1, author: "quietmachine", payout: "quietmachine@creators.oasis.example", kit: "Interface",
  credit: "Poof after jsfxr sfxr.js hitHurt (noise wave)",
  description: "A crumple-and-toss delete sound with material, length, crunch and pitch as knobs, for deleting files, clearing items, emptying trash and dismissing drafts.",
  tags: ["delete", "trash", "crumple", "crunch", "remove", "ui", "discard", "interface"],
};
export const params = { knobs: {
  material: { type: "choice", label: "Material", default: "paper", options: ["paper", "digital", "glass"] },
  length: { type: "range", label: "Length", default: 0.4, min: 0, max: 1, step: 0.01 },
  crunch: { type: "range", label: "Crunch", default: 0.5, min: 0, max: 1, step: 0.01 },
  pitch: { type: "range", label: "Pitch", default: 0.5, min: 0, max: 1, step: 0.01 },
  poof: { type: "range", label: "Poof", default: 0.5, min: 0, max: 1, step: 0.01 },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 409 + 67), pm = Math.pow(2, 1.4 * (p.pitch - 0.5));
  const dur = 0.14 + 0.3 * p.length, n = c.seconds(dur + 0.05, sr), out = new Float32Array(n);
  const M = { paper: { f: 2600, q: 1.2, d: 0.004, ring: 0 }, digital: { f: 1800, q: 0.8, d: 0.003, ring: 0 }, glass: { f: 4200, q: 6, d: 0.012, ring: 1 } }[p.material];
  const count = Math.round(10 + 50 * p.crunch * (0.5 + p.length));
  for (let k = 0; k < count; k++) {
    const t = dur * Math.pow(r(), 1.7), amp = (0.3 + 0.7 * r()) * (1 - 0.6 * t / dur), fc = M.f * pm * (0.5 + r());
    if (M.ring) c.mix(out, c.ring([[fc, 1], [fc * 1.53, 0.5]], 0.05, M.d * (0.5 + r()), sr), t, amp * 0.5, sr);
    else c.mix(out, c.burst(r, M.d * 4, "bp", fc, M.q, 0.0002, M.d * (0.4 + r()), sr), t, amp, sr);
  }
  if (p.material === "digital") {
    // sample-and-hold the crackle down to a few levels: the bit-crushed tear
    const hold = Math.max(1, Math.round(sr / (1200 + 3000 * (1 - p.crunch)))), lv = Math.round(12 - 9 * p.crunch);
    let h = 0; for (let i = 0; i < n; i++) { if (i % hold === 0) h = Math.round(out[i] * lv * 4) / (lv * 4); out[i] = h; }
  }
  // poof: noise read at a falling rate (sfxr's NOISE oscillator with a downward slide), lowpassed
  const pn = c.seconds(dur * 0.8, sr), pf = new Float32Array(pn), nz = c.noise(r, 64);
  let ph = 0, rate = (1800 + 1500 * p.pitch) / sr;
  for (let i = 0; i < pn; i++) { ph += rate; rate *= 0.99985; pf[i] = nz[Math.floor(ph) & 63] * (1 - i / pn) * Math.min(1, i / (0.004 * sr)); }
  c.filter(pf, c.biquad("lp", 900 + 1500 * p.pitch, 0.7, sr));
  c.mix(out, pf, 0.01, 0.1 + 1.2 * p.poof, sr);
  c.filter(out, c.biquad("hp", 140, 0.7, sr));
  const tl = c.seconds(0.03, sr);
  for (let i = 0; i < tl; i++) out[n - 1 - i] *= i / tl;
  c.fade(c.finish(out, 0.88, 1.2), 0.5, sr);
  return { samples: out };
}
