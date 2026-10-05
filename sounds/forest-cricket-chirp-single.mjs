// Cricket chirp: one stridulation phrase of tooth-modulated resonant pulses with glide, harmonics and scrape noise, with a short distance-scaled air tail that decays to silence.
export const meta = {
  title: "Lone Cricket Chirp", kind: "sfx", format: "sound", duration: 0.25, price: 1, author: "stormfront", payout: "stormfront@creators.oasis.example", kit: "Forest at Night", description: "A single isolated cricket chirp for spot placement in night forests and fields; species, pitch, pulse count, wing roughness and distance are knobs, and every seed is a different insect.",
  tags: ["cricket", "chirp", "insect", "night", "forest", "nature", "summer", "spot"],
};
export const params = { knobs: {
  species: { type: "choice", label: "Species", default: "field", options: ["field", "tree", "mole"] },
  pitch: { type: "range", label: "Pitch", default: 0.5, min: 0, max: 1, step: 0.01 },
  pulses: { type: "range", label: "Pulse count", default: 4, min: 1, max: 12, step: 1 },
  roughness: { type: "range", label: "Roughness", default: 0.3, min: 0, max: 1, step: 0.01 },
  distance: { type: "range", label: "Distance", default: 0.2, min: 0, max: 1, step: 0.01 },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, si = params.knobs.species.options.indexOf(p.species);
  const r = c.rng(p.seed * 4219 + si * 97 + 11);
  const sp = {
    field: { f: 4600, pulse: 0.022, period: 0.032, harm: 0.18, tooth: 1 / 10, glide: 0.04 },
    tree: { f: 2900, pulse: 0.016, period: 0.021, harm: 0.06, tooth: 1 / 14, glide: 0.02 },
    mole: { f: 2300, pulse: 0.011, period: 0.0145, harm: 0.25, tooth: 1 / 6, glide: 0.015 },
  }[p.species];
  const rough = p.roughness, dist = p.distance, count = Math.max(1, Math.round(p.pulses));
  const f = sp.f * Math.pow(2, (p.pitch - 0.5) * 0.6) * (0.95 + r() * 0.1);
  const period = sp.period * (0.88 + r() * 0.24), drift = (r() - 0.5) * 0.03;
  const contour = Math.floor(r() * 3), glide = sp.glide * (0.6 + r() * 0.8), h = sp.harm * (0.5 + 1.2 * rough);
  const stretch = 1 + 0.8 / count, on = [], len = [];
  let t = 0;
  for (let k = 0; k < count; k++) { on.push(t); len.push(sp.pulse * stretch * (0.9 + 0.2 * r())); t += period * stretch * (0.92 + 0.16 * r()); }
  const chirpEnd = on[count - 1] + len[count - 1], tau = 0.008 + 0.035 * dist;
  const out = new Float32Array(c.seconds(chirpEnd + 3 * tau + 0.006, sr));
  for (let k = 0; k < count; k++) {
    const u0 = count > 1 ? k / (count - 1) : 0.5;
    const shape = contour === 0 ? 0.7 + 0.3 * u0 : contour === 1 ? 1 - 0.3 * u0 : 0.75 + 0.25 * Math.sin(Math.PI * u0);
    const a = shape * (0.85 + 0.3 * r()), T = len[k], m = c.seconds(T, sr), x = new Float32Array(m);
    const fp = f * (1 + drift * u0 + (r() - 0.5) * 0.015);
    let ph = 0, th = r() * c.TAU;
    for (let i = 0; i < m; i++) {
      const u = i / m, ti = i / sr;
      const fi = fp * (1 + glide * (1 - u)) * (1 + rough * 0.012 * (r() - 0.5));
      ph += c.TAU * fi / sr; th += c.TAU * fi * sp.tooth / sr;
      const tm = 1 - rough * 0.85 * (0.5 + 0.5 * Math.cos(th));
      const e = Math.min(1, ti / 0.0008) * (1 - 0.45 * u) * Math.sqrt(1 - u);
      x[i] = (Math.sin(ph) + h * Math.sin(2 * ph) + 0.4 * h * Math.sin(3 * ph)) * tm * e;
    }
    c.mix(out, x, on[k], a, sr);
    c.mix(out, c.burst(r, T, "bp", fp * (1 + 0.5 * rough), 2 + 3 * (1 - rough), 0.0005, T * 0.4, sr), on[k], (0.04 + 0.4 * rough) * a, sr);
  }
  if (p.species === "mole") {
    const res = Float32Array.from(out); c.filter(res, c.biquad("bp", f * 0.98, 3, sr));
    c.mix(out, res, 0, 0.6, sr);
  }
  c.filter(out, c.biquad("lp", 16000 - 10500 * dist, 0.7, sr));
  c.filter(out, c.biquad("hp", 600 + 600 * dist, 0.7, sr));
  const rv = c.reverb(out, { size: 0.25 + 0.5 * dist, decay: 0.15 + 0.4 * dist, mixAmt: 0.05 + 0.15 * dist }, sr);
  const o = rv instanceof Float32Array && rv.length >= out.length ? Float32Array.from(rv.subarray(0, out.length)) : out;
  const s0 = c.seconds(chirpEnd, sr), fl = c.seconds(0.006, sr), N = o.length;
  for (let i = s0; i < N; i++) o[i] *= Math.exp(-(i - s0) / sr / tau);
  for (let i = 0; i < fl; i++) o[N - 1 - i] *= i / fl;
  c.finish(o, 0.9, 1.1);
  c.gain(o, 1 - 0.3 * dist);
  return { samples: o };
}
