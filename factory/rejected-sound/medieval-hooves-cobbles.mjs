// Hooves on cobbles: each hoof is a heel click on stone, a low thud, a ringing iron shoe, then a toe slap with a hollow cobble tock. Four hoof identities (hind and front, left and right) differ per seed. Gait changes the pattern: an even four-beat walk, a paired two-beat trot with suspension, a three-beat canter with a gap. Wetness adds slap and splash. The tail is a wall slapback plus a light street reverb.
export const meta = {
  title: "Cobble Hooves", kind: "foley", format: "sound", duration: 3, price: 3, author: "hollowbody", payout: "hollowbody@creators.oasis.example", kit: "Medieval Market", description: "A horse walking, trotting or cantering over cobblestones, with ringing iron shoes and wet-street slap, for market streets and cart arrivals.",
  tags: ["horse", "hooves", "cobbles", "medieval", "walk", "trot", "canter", "foley"],
};
export const params = { knobs: {
  gait: { type: "choice", label: "Gait", default: "walk", options: ["walk", "trot", "canter"] },
  rate: { type: "range", label: "Rate", default: 1, min: 0.7, max: 1.5, step: 0.05 },
  ring: { type: "range", label: "Horseshoe ring", default: 0.5, min: 0, max: 1, step: 0.01 },
  weight: { type: "range", label: "Weight", default: 0.5, min: 0, max: 1, step: 0.01 },
  wetness: { type: "range", label: "Surface wetness", default: 0, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Street tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + params.knobs.gait.options.indexOf(p.gait) * 53 + 11);
  const dur = 3, n = c.seconds(dur, sr), out = new Float32Array(n), w = p.weight, wet = p.wetness;
  const pats = {
    walk: { cycle: 1.2, hits: [[0, 0.85, 0], [0.3, 0.7, 1], [0.6, 1, 2], [0.9, 0.75, 3]] },
    trot: { cycle: 0.7, hits: [[0, 1, 0], [0.012, 0.8, 3], [0.35, 1, 2], [0.362, 0.8, 1]] },
    canter: { cycle: 0.85, hits: [[0, 0.8, 0], [0.22, 0.95, 2], [0.24, 0.8, 1], [0.46, 1, 3]] },
  }[p.gait];
  const hv = [0, 1, 2, 3].map((i) => ({ f0: (i & 1 ? 165 : 125) * (0.92 + r() * 0.16), sf: (i & 1 ? 2500 : 2000) * (0.9 + r() * 0.2), cob: 700 + r() * 600 }));
  const hoof = (amp, idx) => {
    const m = c.seconds(0.4, sr), h = new Float32Array(m), v = hv[idx], front = idx & 1;
    const f0 = v.f0 - 55 * w, rg = p.ring * (1 - 0.35 * wet), d = (front ? 0.03 : 0.02) + r() * 0.01;
    c.mix(h, c.burst(r, 0.008, "hp", 4000 + r() * 1500, 0.8, 0.0003, 0.0018, sr), 0, 0.7, sr);
    c.mix(h, c.ring([[f0, 1], [f0 * 1.9, 0.3]], 0.2, 0.03 + 0.05 * w, sr), 0.002, 0.55 + 0.45 * w, sr);
    c.mix(h, c.ring([[v.sf, 1], [v.sf * 2.32, 0.5], [v.sf * 3.9, 0.25]], 0.3, 0.02 + 0.09 * p.ring, sr), 0.001, 0.06 + 0.5 * rg, sr);
    c.mix(h, c.burst(r, 0.012, "bp", 2800, 1.5, 0.0005, 0.004, sr), d, 0.55, sr);
    c.mix(h, c.ring([[v.cob, 1], [v.cob * 1.7, 0.4]], 0.09, 0.03, sr), d, 0.4, sr);
    c.mix(h, c.ring([[f0 * 0.8, 1]], 0.1, 0.025, sr), d + 0.002, 0.35 + 0.3 * w, sr);
    const k = 3 + Math.floor(r() * 3 + 3 * w);
    for (let g = 0; g < k; g++) c.mix(h, c.burst(r, 0.005, "bp", 2500 + r() * 4000, 4, 0.0003, 0.0012, sr), 0.03 + r() * 0.1, 0.1 + 0.2 * r(), sr);
    if (wet > 0) {
      c.mix(h, c.burst(r, 0.06, "bp", 1000 + r() * 500, 1.2, 0.002, 0.02, sr), 0.004, 0.55 * wet, sr);
      for (let g = 0; g < 4; g++) c.mix(h, c.burst(r, 0.015, "bp", 3500 + r() * 2500, 3, 0.001, 0.005, sr), 0.02 + r() * 0.1, 0.3 * wet, sr);
      c.filter(h, c.biquad("lp", 11000 - 4000 * wet, 0.7, sr));
    }
    for (let i = 0; i < m; i++) h[i] *= amp;
    return h;
  };
  let t = 0.1, cyc = 0;
  const tempo = 0.97 + r() * 0.06;
  while (t < dur - 0.7 && cyc < 12) {
    for (const [off, a, idx] of pats.hits) {
      const at = t + off / p.rate + (r() - 0.5) * 0.02;
      if (at < dur - 0.6) c.mix(out, hoof(a * (0.8 + 0.4 * r()), idx), at, 0.8, sr);
    }
    t += pats.cycle / p.rate * tempo * (0.96 + 0.08 * r()); cyc++;
  }
  if (p.tail) {
    const s = out.slice();
    c.filter(s, c.biquad("lp", 3500, 0.7, sr));
    c.mix(out, s, 0.09 + r() * 0.04, 0.28, sr);
    const tl = c.reverb(out.slice(), { size: 0.6, decay: 0.4, mixAmt: 1 }, sr);
    for (let i = 0; i < n; i++) out[i] = out[i] * 0.88 + tl[i] * (0.15 + 0.1 * wet);
  }
  c.fade(out, 20, sr);
  c.finish(out, 0.85, 1.1);
  c.fade(out, 20, sr);
  return { samples: out };
}
