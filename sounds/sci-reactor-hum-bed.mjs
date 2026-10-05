// Reactor hum: a loopable core drone. Body is a bank of loop-locked harmonics with detuned twins that beat, a sub, and coil-whine partials; a throb pulls the upper partials hardest. Under it a size-tuned rumble, with grit as band noise and crackle grains. Noise is wrapped across the seam.
export const meta = {
  title: "Reactor Core Hum", kind: "ambience", format: "sound", duration: 4, price: 4, author: "stormfront", payout: "stormfront@creators.oasis.example", kit: "Sci-fi Console", description: "A deep, loopable starship reactor drone: hull size, pitch, throb rate, harmonic richness and grit are knobs; each seed is a different core humming the same way.",
  tags: ["reactor", "hum", "drone", "sci-fi", "engine", "starship", "loop", "ambience"],
};
export const params = { knobs: {
  size: { type: "choice", label: "Size", default: "ship", options: ["small", "ship", "capital"] },
  pitch: { type: "range", label: "Pitch", default: 0.4, min: 0, max: 1, step: 0.01 },
  throb: { type: "range", label: "Throb rate (Hz)", default: 1, min: 0.25, max: 4, step: 0.25 },
  richness: { type: "range", label: "Harmonic richness", default: 0.5, min: 0, max: 1, step: 0.01 },
  grit: { type: "range", label: "Grit", default: 0.3, min: 0, max: 1, step: 0.01 },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const S = {
    small: { lo: 62, H: 9, tilt: 1.5, sub: 0.25, depth: 0.6, lp: 420, rum: 0.1, band: 3200, whine: 2400, gr: 1.2 },
    ship: { lo: 38, H: 8, tilt: 1.7, sub: 0.55, depth: 0.7, lp: 220, rum: 0.18, band: 1700, whine: 1500, gr: 1 },
    capital: { lo: 22, H: 7, tilt: 1.9, sub: 0.9, depth: 0.8, lp: 110, rum: 0.28, band: 900, whine: 800, gr: 0.7 },
  }[p.size];
  const sr = c.sr, r = c.rng(p.seed * 613 + params.knobs.size.options.indexOf(p.size) * 97 + 11);
  const n = c.seconds(4, sr), X = c.seconds(0.3, sr), out = new Float32Array(n);
  const rich = p.richness, grit = p.grit, k = Math.max(1, Math.round(p.throb * 4));
  const f0 = Math.max(4, Math.round(S.lo * Math.pow(2, p.pitch) * (1 + (r() - 0.5) * 0.06) * 2) / 2);
  const H = Math.max(3, Math.round(S.H * (0.5 + 1.6 * rich)));
  const fr = [], am = [], mw = [];
  const add = (f, a, w) => { if (f > 1 && f < sr * 0.45) { fr.push(f); am.push(a); mw.push(Math.min(1, w)); } };
  add(f0 / 2, S.sub, 0.25 * S.depth);
  for (let h = 1; h <= H; h++) {
    const a = Math.pow(h, -(S.tilt - 1.1 * rich)) * (h % 2 ? 1 : 0.5 + 0.5 * rich) * (0.75 + 0.5 * r());
    add(h * f0, a, S.depth * (0.4 + 0.6 * h / H));
    if (h <= 4) add(h * f0 + (1 + Math.floor(r() * 3)) * 0.25 * (r() < 0.5 ? -1 : 1), a * (0.25 + 0.5 * rich), S.depth);
  }
  const wh = Math.round(S.whine * (0.8 + 0.4 * r()) / f0);
  add(wh * f0, 0.03 + 0.09 * rich, 1);
  add((wh + 2 + Math.floor(r() * 3)) * f0, 0.015 + 0.06 * rich, 1);
  const m = fr.length, cr = new Float64Array(m), ci = new Float64Array(m), x = new Float64Array(m), y = new Float64Array(m);
  for (let j = 0; j < m; j++) { const ph = r() * c.TAU, d = c.TAU * fr[j] / sr; cr[j] = Math.cos(d); ci[j] = Math.sin(d); x[j] = Math.cos(ph); y[j] = Math.sin(ph); }
  const lph = r() * c.TAU, sph = r() * c.TAU, sw = 0.1 + 0.15 * r();
  const lfoAt = (i) => { const l = 0.5 - 0.5 * Math.cos(c.TAU * k * i / n + lph); return l * l * (3 - 2 * l); };
  const tone = new Float32Array(n);
  let pk = 1e-9;
  for (let i = 0; i < n; i++) {
    const l = lfoAt(i), swell = 1 - sw * (0.5 + 0.5 * Math.sin(c.TAU * i / n + sph));
    let s = 0;
    for (let j = 0; j < m; j++) {
      s += x[j] * am[j] * (1 - mw[j] * l);
      const nx = x[j] * cr[j] - y[j] * ci[j]; y[j] = x[j] * ci[j] + y[j] * cr[j]; x[j] = nx;
    }
    s *= swell; tone[i] = s; if (Math.abs(s) > pk) pk = Math.abs(s);
  }
  const drv = 0.8 + 1.4 * grit, dn = Math.tanh(drv);
  for (let i = 0; i < n; i++) out[i] = Math.tanh(tone[i] / pk * drv) / dn * 0.7;
  const L = n + X, norm = (b) => { let q = 1e-9; for (let i = 0; i < b.length; i++) q = Math.max(q, Math.abs(b[i])); for (let i = 0; i < b.length; i++) b[i] /= q; return b; };
  const bed = new Float32Array(L);
  const rum = c.brown(r, L), lp = c.biquad("lp", S.lp, 0.8, sr), lp2 = c.biquad("lp", S.lp * 1.3, 0.7, sr);
  for (let i = 0; i < L; i++) rum[i] = lp2(lp(rum[i])) * (0.6 + 0.4 * lfoAt(i));
  c.mix(bed, norm(rum), 0, S.rum * (0.8 + 0.4 * (1 - rich)), sr);
  if (grit > 0) {
    const g = c.noise(r, L), bp = c.biquad("bp", S.band, 1.3, sr), hp = c.biquad("hp", S.band * 0.4, 0.7, sr);
    let walk = 0.5;
    for (let i = 0; i < L; i++) { if (i % 512 === 0) walk = c.clamp(walk + (r() - 0.5) * 0.4, 0.15, 1); g[i] = bp(hp(g[i])) * walk * (0.3 + 0.7 * lfoAt(i)); }
    c.mix(bed, norm(g), 0, 0.2 * grit, sr);
    const grains = Math.round(grit * (60 + 320 * grit) * S.gr);
    for (let q = 0; q < grains; q++) {
      const t = r() * (n / sr);
      c.mix(bed, c.burst(r, 0.003 + r() * 0.006, "bp", S.band * (0.8 + r() * 2.2), 3, 0.0004, 0.0012 + r() * 0.002, sr), t, (0.08 + 0.16 * r()) * (0.4 + 0.6 * grit) * (0.5 + 0.5 * lfoAt(Math.floor(t * sr))), sr);
    }
  }
  for (let i = 0; i < n; i++) {
    let v = bed[i];
    if (i < X) { const w = i / X; v = bed[i] * Math.sqrt(w) + bed[n + i] * Math.sqrt(1 - w); }
    out[i] += v;
  }
  c.fade(c.finish(out, 0.85), 10, sr);
  return { samples: out };
}
