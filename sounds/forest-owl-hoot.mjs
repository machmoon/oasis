// Owl hoot: a species-shaped phrase. Each hoot is a sine body with 2nd-4th harmonics on its own pitch contour (droop,
// tawny quaver, barred "-all" fall) under a swell-and-fade envelope; a longer, softer breath puff wraps it; distance and a room tail sit under.
export const meta = {
  title: "Night Owl Hoot", kind: "sfx", format: "sound", duration: 3, price: 2, author: "stormfront", payout: "stormfront@creators.oasis.example", kit: "Forest at Night", description: "A hooting owl phrase (great horned, tawny or barred) with pitch, call length, distance, breathiness and a forest tail as knobs, for night scenes in games and film.",
  tags: ["owl", "hoot", "night", "forest", "bird", "wildlife", "nocturnal", "call"],
};
export const params = { knobs: {
  species: { type: "choice", label: "Species", default: "great-horned", options: ["great-horned", "tawny", "barred"] },
  pitch: { type: "range", label: "Pitch", default: 0.5, min: 0, max: 1, step: 0.01 },
  length: { type: "range", label: "Call length", default: 0.6, min: 0, max: 1, step: 0.01 },
  distance: { type: "range", label: "Distance", default: 0.3, min: 0, max: 1, step: 0.01 },
  breathiness: { type: "range", label: "Breathiness", default: 0.35, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Reverb tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, si = params.knobs.species.options.indexOf(p.species), r = c.rng(p.seed * 733 + si * 97 + 3);
  // [gap, dur, rel pitch, arc, glide, quaver, priority, stress, peak position]
  const S = {
    "great-horned": { f: 300, h: [0.32, 0.12, 0.04], n: [[0, 0.32, 1, 0.04, -0.07, 0, 1, 0.68, 0.35], [0.13, 0.1, 1.07, 0.02, -0.03, 0, 3, 0.42, 0.45], [0.03, 0.38, 1.05, 0.05, -0.09, 0, 1, 1, 0.28], [0.2, 0.4, 1, 0.03, -0.11, 0, 2, 0.74, 0.3], [0.18, 0.44, 0.96, 0.03, -0.13, 0, 2, 0.58, 0.3]] },
    tawny: { f: 520, h: [0.26, 0.14, 0.05], n: [[0, 0.75, 1, 0.07, -0.12, 0, 1, 0.85, 0.22], [0.7, 0.12, 0.93, 0.02, 0.04, 0, 3, 0.4, 0.45], [0.1, 0.11, 0.98, 0.02, 0.03, 0, 2, 0.52, 0.45], [0.1, 1.0, 1.03, 0.03, -0.1, 1, 1, 1, 0.2]] },
    barred: { f: 380, h: [0.4, 0.16, 0.06], n: [[0, 0.2, 1, 0.03, 0.06, 0, 1, 0.7, 0.4], [0.08, 0.16, 1.06, 0.02, 0, 0, 2, 0.6, 0.4], [0.06, 0.14, 1.04, 0.01, -0.02, 0, 3, 0.55, 0.4], [0.08, 0.42, 1.1, 0.05, -0.25, 0, 1, 0.95, 0.25], [0.35, 0.18, 1, 0.02, 0.06, 0, 2, 0.65, 0.4], [0.08, 0.16, 1.06, 0.02, 0, 0, 3, 0.55, 0.4], [0.06, 0.14, 1.04, 0, -0.02, 0, 3, 0.5, 0.4], [0.08, 0.85, 1.12, 0.05, -0.45, 0, 1, 1, 0.18]] },
  }[p.species];
  const base = S.f * Math.pow(2, (p.pitch - 0.5) * 0.6) * (0.94 + 0.12 * r());
  const stretch = (0.8 + 0.25 * p.length) * (0.9 + 0.2 * r()), thr = 1 + 2 * p.length, b = p.breathiness, d = p.distance;
  const plan = []; let t = 0.004;
  for (const [g, du, rel, arc, gl, vib, pr, st, pk] of S.n) {
    if (pr > thr) continue;
    if (plan.length) t += g * stretch * (0.8 + 0.45 * r());
    const D = du * stretch * (0.88 + 0.24 * r());
    plan.push([t, D, rel * (0.975 + 0.05 * r()), arc * (0.6 + 0.8 * r()), gl * (0.8 + 0.4 * r()), vib, st * (0.85 + 0.15 * r()), pk * (0.8 + 0.4 * r())]);
    t += D;
  }
  const relS = 0.09 + 0.1 * b, tailS = p.tail ? 0.5 + 0.5 * d : relS + 0.06;
  let out = new Float32Array(c.seconds(t + tailS, sr));
  const shape = (k, N, pkN) => {
    if (k < pkN) return 0.5 - 0.5 * Math.cos(Math.PI * k / pkN);
    const v = (k - pkN) / (N - pkN);
    return (0.5 + 0.5 * Math.cos(Math.PI * v)) * (1 - 0.3 * v);
  };
  const [h2, h3, h4] = S.h.map((h) => h * (1 - 0.35 * b)), bg = 0.05 + 1.0 * b, tone = 1 - 0.25 * b;
  for (const [t0, D, rel, arc, gl, vib, st, pk] of plan) {
    const ns = c.seconds(D, sr), L = ns + c.seconds(relS, sr), i0 = Math.round(t0 * sr), f0 = base * rel;
    const pkN = Math.max(pk * ns, 0.035 * sr), bpkN = Math.max(0.6 * pkN, 0.02 * sr);
    const vr = 7 + 3 * r(), vp = r() * c.TAU;
    const nz = c.noise(r, L), bp = c.biquad("bp", f0 * 1.3, 2.2, sr), lp = c.biquad("lp", f0 * 2.6, 0.7, sr);
    let ph = 0;
    for (let k = 0; k < L && i0 + k < out.length; k++) {
      let y = 0;
      if (k < ns) {
        const u = k / ns;
        let f = f0 * (1 + arc * Math.sin(Math.PI * u) + gl * u * u), trem = 1;
        if (vib) { const w = Math.sin(c.TAU * vr * k / sr + vp), q = Math.min(1, u * 2.5); f *= 1 + 0.05 * w * q; trem = 1 - 0.45 * q * (0.5 + 0.5 * w); }
        ph += c.TAU * f / sr;
        const s = Math.sin(ph) + h2 * Math.sin(2 * ph) + h3 * Math.sin(3 * ph) + h4 * Math.sin(4 * ph);
        y = s * tone * shape(k, ns, pkN) * trem;
      }
      const eb = shape(k, L, bpkN);
      y += lp(bp(nz[k])) * bg * eb * eb;
      out[i0 + k] += y * st;
    }
  }
  c.filter(out, c.biquad("lp", 4500 - 3700 * d, 0.7, sr));
  if (p.tail) {
    const res = c.reverb(out, { size: 0.55 + 0.35 * d, decay: 0.4 + 0.35 * d, mixAmt: 0.07 + 0.18 * d }, sr);
    if (res && res.length) out = res;
  }
  c.finish(out, 0.9);
  c.gain(out, 1 - 0.2 * d);
  c.fade(out, p.tail ? 40 : 20, sr);
  return { samples: out };
}
