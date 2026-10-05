// Gated Tom Slam: three stacked pitch-dropping toms (sweep body, skin modes, stick click) and a layered snare crack land together at t=0, the sum feeds a room reverb, and a noise gate slams that room shut.
export const meta = {
  title: "Gated Tom Slam", kind: "impact", format: "sound", duration: 0.9, price: 3, author: "kickdrum", payout: "kickdrum@creators.oasis.example", kit: "Drum Machine", description: "Stacked toms and a snare crack slam in together and a big room snaps shut on a noise gate; a drum-machine stinger for trailers, title hits and fills.",
  tags: ["tom", "gated", "snare", "slam", "impact", "drums", "stinger", "80s"],
};
export const params = { knobs: {
  size: { type: "choice", label: "Room size", default: "hall", options: ["studio", "hall", "stadium"] },
  punch: { type: "range", label: "Punch", default: 0.6, min: 0, max: 1, step: 0.01 },
  gate: { type: "range", label: "Gate tightness", default: 0.5, min: 0, max: 1, step: 0.01 },
  layering: { type: "range", label: "Layering", default: 0.6, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Ring-out", default: false },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + 29), n = c.seconds(0.9, sr);
  const sz = { studio: 0, hall: 1, stadium: 2 }[p.size];
  const dry = new Float32Array(n);
  const drop = 2 + 1.4 * p.punch, tau = 0.03 + 0.02 * (1 - p.punch);
  const tom = (f0, t, g, len) => {
    const m = c.seconds(len, sr), x = new Float32Array(m);
    let ph = 0;
    for (let i = 0; i < m; i++) {
      const tt = i / sr, f = f0 * (1 + (drop - 1) * Math.exp(-tt / tau));
      ph += c.TAU * f / sr;
      x[i] = Math.sin(ph) * Math.exp(-tt / (len * 0.3)) * Math.min(1, i / (0.0012 * sr));
    }
    c.mix(x, c.ring([[f0 * (1.5 + 0.06 * r()), 0.3], [f0 * (2.2 + 0.1 * r()), 0.18], [f0 * 3.1, 0.08]], len * 0.6, 0.06, sr), 0, 0.3, sr);
    c.mix(x, c.burst(r, 0.008, "bp", 2200 + 2500 * p.punch, 1.4, 0.0004, 0.003, sr), 0, 0.3 + 0.6 * p.punch, sr);
    c.mix(dry, x, t, g, sr);
  };
  const base = 72 * (0.96 + r() * 0.08);
  tom(base * 2, 0.014 + 0.004 * r(), 0.7, 0.34);
  tom(base * 1.45, 0.007 + 0.004 * r(), 0.85, 0.4);
  tom(base, 0, 1, 0.5);
  if (p.layering > 0.3) tom(base * 0.5, 0, 0.9 * p.layering, 0.55);
  if (p.layering > 0.6) tom(base * 2.7, 0.02, 0.5 * p.layering, 0.25);
  const sn = c.seconds(0.25, sr), s = c.noise(r, sn), bp = c.biquad("bp", 2000 + 1500 * p.punch, 0.8, sr);
  for (let i = 0; i < sn; i++) s[i] = bp(s[i]) * Math.exp(-i / sr / (0.045 + 0.04 * p.layering)) * Math.min(1, i / (0.0008 * sr));
  c.mix(dry, s, 0.003, 0.7 + 0.4 * p.layering, sr);
  c.mix(dry, c.ring([[185 * (0.98 + 0.04 * r()), 1], [330, 0.5]], 0.15, 0.05, sr), 0.003, 0.4, sr);
  c.mix(dry, c.burst(r, 0.008, "hp", 4500, 0.7, 0.0004, 0.002, sr), 0.003, 0.3 + 0.5 * p.punch, sr);
  const wet = c.reverb(dry, { size: 0.3 + 0.3 * sz, decay: 0.45 + 0.2 * sz, mixAmt: 1 }, sr);
  const hold = (0.6 - 0.25 * p.gate) * (0.7 + 0.3 * sz), rel = p.tail ? 0.22 : 0.006 + 0.02 * (1 - p.gate);
  const out = new Float32Array(n), wg = 0.8 + 0.3 * sz;
  for (let i = 0; i < n; i++) {
    const t = i / sr, g = t < hold ? 1 : Math.exp(-(t - hold) / rel);
    out[i] = dry[i] * 0.8 + wet[i] * g * wg;
  }
  c.fade(c.finish(out, 0.9, 1.3), 10, sr);
  return { samples: out };
}
