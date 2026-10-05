// Log drop: a dead log landing on soft forest floor. Layered as a muffled ground thump (brown-noise push + damped low modes),
// an inharmonic wood body per wood type, a hollow cavity bonk, a wood-specific contact, debris bounces and a leaf-litter settle.
export const meta = {
  title: "Fallen Log Drop", kind: "impact", format: "sound", duration: 0.95, price: 3, author: "stormfront", payout: "stormfront@creators.oasis.example", kit: "Forest at Night", description: "A dead log thudding onto soft leaf litter, with rotten, dry or wet wood, mass, hollowness, debris scatter and pitch as knobs; for night-forest scenes, falling branches and physics drops.",
  tags: ["log", "impact", "wood", "forest", "thud", "debris", "foley", "night"],
};
export const params = { knobs: {
  wood: { type: "choice", label: "Wood", default: "dry", options: ["rotten", "dry", "wet"] },
  mass: { type: "range", label: "Mass", default: 0.5, min: 0, max: 1, step: 0.01 },
  hollowness: { type: "range", label: "Hollowness", default: 0.35, min: 0, max: 1, step: 0.01 },
  debris: { type: "range", label: "Debris scatter", default: 0.4, min: 0, max: 1, step: 0.01 },
  pitch: { type: "range", label: "Pitch", default: 0.5, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Forest air", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, wi = params.knobs.wood.options.indexOf(p.wood), r = c.rng(p.seed * 7919 + wi * 313 + 11);
  const m = p.mass, h = p.hollowness, d = p.debris;
  const W = { rotten: { k: 0.65, dec: 0.02, rat: [1, 1.9, 3.1], amp: [1, 0.3, 0.1], chunk: 0.5 },
    dry: { k: 1.25, dec: 0.07, rat: [1, 2.76, 5.4, 8.9], amp: [1, 0.6, 0.4, 0.25], chunk: 1 },
    wet: { k: 0.75, dec: 0.03, rat: [1, 2.3, 4.1], amp: [1, 0.35, 0.1], chunk: 0.65 } }[p.wood];
  const dur = 0.32 + 0.12 * m + 0.25 * h + 0.5 * d + (p.tail ? 0.3 : 0), out = new Float32Array(c.seconds(dur, sr));
  const atk = (b, a) => c.multiply(b, c.env(b.length, a, 60, sr));
  const ringA = (modes, dec, a) => atk(c.ring(modes, dec * 6, dec, sr), a);
  const f0 = 210 * W.k * Math.pow(2, (p.pitch - 0.5) * 1.6) * (1 - 0.35 * m) * (0.97 + 0.06 * r());
  const tf = (55 + 30 * (1 - m)) * (0.95 + 0.1 * r()), td = 0.025 + 0.045 * m;
  c.mix(out, ringA([[tf, 1], [tf * 2.13, 0.35], [tf * 3.47, 0.15]], td, 0.005), 0.002, 0.45 + 0.5 * m, sr);
  const nb = c.seconds(0.05 + 0.12 * m, sr), br = c.brown(r, nb), lpb = c.biquad("lp", 180 + 160 * (1 - m), 0.7, sr), eb = c.env(nb, 0.005, 0.02 + 0.04 * m, sr);
  for (let i = 0; i < nb; i++) br[i] = lpb(br[i]) * eb[i];
  c.mix(out, br, 0, 1 + 0.8 * m, sr);
  const bd = W.dec * (1 + 1.5 * h) * (0.8 + 0.4 * m), modes = W.rat.map((q, j) => [f0 * q * (0.98 + 0.04 * r()), W.amp[j]]);
  c.mix(out, ringA(modes.slice(0, 2), bd, 0.002), 0.003, 0.55, sr);
  c.mix(out, ringA(modes.slice(2), bd * 0.4, 0.001), 0.003, 0.5, sr);
  if (h > 0.02) {
    const fh = f0 * 0.55, hd = 0.03 + 0.15 * h, nh = c.seconds(hd * 5, sr), ph = r() * 0.02;
    const a = c.osc("sine", (t) => fh * (1 + 0.09 * Math.exp(-(t + ph) / 0.04)), nh, sr), b = c.osc("sine", (t) => fh * 2.31 * (1 + 0.05 * Math.exp(-t / 0.03)), nh, sr);
    const e = c.env(nh, 0.004, hd, sr), e2 = c.env(nh, 0.004, hd * 0.5, sr);
    for (let i = 0; i < nh; i++) a[i] = a[i] * e[i] + 0.3 * b[i] * e2[i];
    c.mix(out, a, 0.004, 0.9 * h, sr);
    c.mix(out, c.burst(r, 0.1, "bp", fh * 1.5, 3, 0.004, 0.035 * (0.5 + h), sr), 0.004, 0.4 * h, sr);
  }
  if (p.wood === "dry") {
    c.mix(out, c.burst(r, 0.02, "hp", 2600 + 1500 * r(), 0.8, 0.0004, 0.004, sr), 0, 1, sr);
    c.mix(out, c.burst(r, 0.015, "bp", 3400 + 1400 * r(), 2, 0.0004, 0.003, sr), 0.01 + 0.02 * r(), 0.55, sr);
    c.mix(out, c.burst(r, 0.012, "bp", 2000 + 1500 * r(), 2.5, 0.0004, 0.002, sr), 0.035 + 0.03 * r(), 0.3, sr);
  } else if (p.wood === "rotten") {
    c.mix(out, c.burst(r, 0.035, "lp", 700, 0.7, 0.003, 0.012, sr), 0, 0.6, sr);
    const g = Math.round(25 + 40 * m);
    for (let i = 0; i < g; i++) c.mix(out, c.burst(r, 0.014, "bp", 250 + r() * 750, 1.2 + r(), 0.0015, 0.003 + r() * 0.007, sr), 0.004 + Math.pow(r(), 1.5) * 0.2, 0.15 + 0.3 * r(), sr);
  } else {
    c.mix(out, c.burst(r, 0.04, "lp", 600, 0.8, 0.003, 0.014, sr), 0, 0.7, sr);
    const nw = c.seconds(0.18, sr), x = c.noise(r, nw), e = c.env(nw, 0.004, 0.04, sr), lpw = c.biquad("lp", 1400, 0.7, sr); let ph = 0;
    for (let i = 0; i < nw; i++) { ph += c.TAU * (300 + 700 * Math.exp(-i / sr / 0.05)) / sr; x[i] = lpw(x[i]) * e[i] * Math.sin(ph); }
    c.mix(out, x, 0.006, 0.6, sr);
    c.mix(out, c.burst(r, 0.1, "bp", 450 + 200 * r(), 1.2, 0.006, 0.03, sr), 0.05 + 0.04 * r(), 0.3, sr);
  }
  const span = 0.22 + 0.42 * d, leaves = Math.round(d * (60 + 60 * m));
  for (let i = 0; i < leaves; i++) {
    const t = 0.01 + Math.pow(r(), 2) * span;
    c.mix(out, c.burst(r, 0.008, "bp", 2200 + r() * 4000, 1.2 + r(), 0.0004, 0.0012 + r() * 0.002, sr), t, (0.08 + 0.2 * r()) * (1 - 0.6 * t / span), sr);
  }
  const chunks = Math.round(d * 6);
  for (let k = 0; k < chunks; k++) {
    let t = 0.03 + r() * 0.1, gap = 0.07 + r() * 0.07, a = (0.2 + 0.25 * r()) * W.chunk;
    const f = (650 + r() * 900) * W.chunk, bounces = 2 + Math.floor(r() * 3);
    for (let b = 0; b < bounces; b++) {
      c.mix(out, ringA([[f * (0.97 + 0.06 * r()), 1], [f * 2.4 * (0.97 + 0.06 * r()), 0.4]], 0.006 + 0.006 * W.chunk, 0.0006), t, a, sr);
      c.mix(out, c.burst(r, 0.01, "lp", 1600 * W.chunk, 0.8, 0.0005, 0.002, sr), t, a * 0.6, sr);
      t += gap; gap *= 0.55 + 0.1 * r(); a *= 0.5 + 0.1 * r();
    }
  }
  const ns = c.seconds(0.15 + 0.3 * d + 0.1 * m, sr), s = c.pink(r, ns), bps = c.biquad("bp", 1200 + 800 * r(), 0.8, sr), es = c.env(ns, 0.02, 0.06 + 0.12 * d, sr); let fl = 1;
  for (let i = 0; i < ns; i++) { if (i % 220 === 0) fl = 0.4 + 0.6 * r(); s[i] = bps(s[i]) * es[i] * fl; }
  c.mix(out, s, 0.01, 0.12 + 0.2 * d + 0.08 * m, sr);
  if (p.tail) c.reverb(out, { size: 0.6, decay: 0.45, mixAmt: 0.22 }, sr);
  c.finish(out, 0.9, 1.1);
  c.gain(out, 0.6 + 0.35 * m);
  c.fade(out, 8, sr);
  return { samples: out };
}
