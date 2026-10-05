// Steady pan sizzle: a circular, seam-crossfaded hiss bed with a shallow heat-driven flicker, a wrapped stream of micro-tick bubbles, fat-specific foreground events (butter foam blubs, oil needle spits, bacon crackle clusters) and heavy-tailed pops with a contact click, body and spatter, all placed modulo the loop length.
export const meta = {
  title: "Steady Pan Sizzle", kind: "ambience", format: "sound", duration: 3, price: 4, author: "stormfront", payout: "stormfront@creators.oasis.example", kit: "Kitchen", description: "A seamless loop of fat sizzling in a hot pan, with knobs for butter, oil or bacon, heat, pop density and crackle brightness; use it for kitchen scenes, cooking games and diner backgrounds.",
  tags: ["sizzle", "frying", "pan", "kitchen", "cooking", "bacon", "loop", "ambience"],
};
export const params = { knobs: {
  fat: { type: "choice", label: "Fat type", default: "oil", options: ["butter", "oil", "bacon"] },
  intensity: { type: "range", label: "Intensity", default: 0.6, min: 0, max: 1, step: 0.01 },
  pops: { type: "range", label: "Pop density", default: 0.4, min: 0, max: 1, step: 0.01 },
  brightness: { type: "range", label: "Crackle brightness", default: 0.5, min: 0, max: 1, step: 0.01 },
  length: { type: "range", label: "Loop length (s)", default: 3, min: 2, max: 4, step: 0.1 },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const fi = params.knobs.fat.options.indexOf(p.fat), sr = c.sr, r = c.rng(p.seed * 7703 + fi * 211 + 3);
  const L = p.length, n = c.seconds(L, sr), out = new Float32Array(n), I = p.intensity;
  const br = 0.6 + 0.9 * p.brightness, heat = 0.85 + 0.3 * I, ny = 0.45 * sr, fq = (f) => Math.min(ny, f);
  const P = [
    { hp: 900, lp: 5000, fl: 0.28, ch: [0.004, 0.02], bed: 0.3, rate: 260, f: [1200, 3800], Q: 1.2, att: 0.0015, dec: [0.003, 0.008], tg: 0.3, pr: 3, pf: 900, pa: 0.002 },
    { hp: 2800, lp: 11000, fl: 0.18, ch: [0.001, 0.004], bed: 0.34, rate: 380, f: [3500, 9000], Q: 0.9, att: 0.0003, dec: [0.0008, 0.002], tg: 0.36, pr: 6, pf: 2500, pa: 0.0003 },
    { hp: 1600, lp: 8000, fl: 0.25, ch: [0.002, 0.01], bed: 0.26, rate: 160, f: [2000, 7000], Q: 1, att: 0.0004, dec: [0.001, 0.004], tg: 0.32, pr: 8, pf: 1600, pa: 0.0005 },
  ][fi];
  const add = (src, t0, g) => { let j = Math.floor(t0 * sr) % n; for (let i = 0; i < src.length; i++) { out[j] += src[i] * g; if (++j >= n) j = 0; } };
  const x = c.seconds(0.06, sr), pre = c.seconds(0.05, sr), m = n + x + pre, raw = c.noise(r, m);
  const hp = c.biquad("hp", fq(P.hp * br * heat), 0.7, sr), lp = c.biquad("lp", fq(P.lp * br * heat), 0.6, sr), sm = c.onepole(sr);
  const depth = P.fl * (0.6 + 0.7 * I);
  let tgt = 1, cnt = 0;
  for (let i = 0; i < m; i++) {
    if (--cnt <= 0) { tgt = 1 - depth * r(); cnt = Math.max(1, Math.round(c.between(r, P.ch[0], P.ch[1]) * sr)); }
    raw[i] = lp(hp(raw[i])) * sm(tgt, 120);
  }
  const bedG = P.bed * (0.35 + 0.65 * I);
  for (let i = 0; i < n; i++) {
    let v = raw[pre + i];
    if (i < x) { const w = i / x; v = v * Math.sqrt(w) + raw[pre + n + i] * Math.sqrt(1 - w); }
    out[i] = v * bedG;
  }
  const ticks = Math.round(P.rate * (0.3 + 0.9 * I) * L);
  for (let k = 0; k < ticks; k++) {
    const d = c.between(r, P.dec[0], P.dec[1]);
    add(c.burst(r, d * 4 + P.att, "bp", fq(c.between(r, P.f[0], P.f[1]) * br), P.Q * (0.7 + 0.6 * r()), P.att * (0.6 + 0.8 * r()), d, sr), r() * L, P.tg * (0.15 + 0.85 * r() * r()));
  }
  if (fi === 0) {
    const nb = Math.round((30 + 80 * I) * L), bl = c.seconds(0.03, sr);
    for (let k = 0; k < nb; k++) {
      const b = new Float32Array(bl), f0 = c.between(r, 350, 1000), rise = 1.15 + 0.3 * r(), dk = c.between(r, 0.004, 0.009);
      let ph = 0;
      for (let i = 0; i < bl; i++) { const t = i / sr; ph += c.TAU * f0 * (1 + (rise - 1) * Math.min(1, t / 0.015)) / sr; b[i] = Math.sin(ph) * Math.min(1, t / 0.001) * Math.exp(-t / dk); }
      add(b, r() * L, 0.06 + 0.3 * r() * r());
    }
  }
  if (fi === 2) {
    const nc = Math.round((3 + 8 * I) * L);
    for (let k = 0; k < nc; k++) {
      const t = r() * L, kk = 2 + Math.floor(r() * r() * 14), sp = c.between(r, 0.015, 0.12), g = 0.3 + 0.9 * r() * r();
      for (let j = 0; j < kk; j++) add(c.burst(r, 0.01, "bp", fq(c.between(r, 1500, 6000) * br), 0.7, 0.0003, 0.0008 + 0.002 * r(), sr), (t + Math.pow(r(), 1.5) * sp) % L, g * (0.3 + 0.6 * r()));
    }
  }
  const np = Math.round(P.pr * (0.2 + 1.8 * p.pops) * L);
  for (let k = 0; k < np; k++) {
    const t = r() * L, size = 0.25 + 1.2 * r() * r(), f = fq(P.pf * br * (0.7 + 0.6 * r()) / (0.7 + 0.3 * size)), g = 0.9 * size;
    add(c.burst(r, 0.004, "hp", fq(4000 * br), 0.7, 0.0003, 0.0007, sr), t, 0.8 * g);
    add(c.burst(r, 0.035 + 0.02 * size, "bp", f, 1.1, P.pa * (0.7 + 0.6 * r()), 0.003 + 0.008 * size * r() + 0.002, sr), t, 1.3 * g);
    if (fi === 2) { const f1 = 160 + r() * 140; add(c.ring([[f1, 1], [f1 * 2.37, 0.3]], 0.06, 0.006 + 0.008 * r(), sr), t, 0.35 * g); }
    const spn = 2 + Math.floor(r() * 5 * size + 2), spr = 0.02 + 0.06 * size;
    for (let j = 0; j < spn; j++) add(c.burst(r, 0.006, "hp", fq(c.between(r, 3000, 7000) * br), 0.8, 0.0003, 0.0008 + 0.0015 * r(), sr), (t + 0.004 + Math.pow(r(), 1.4) * spr) % L, g * (0.15 + 0.4 * r()));
  }
  c.finish(out, 0.9, 1.15);
  c.gain(out, 0.6 + 0.35 * I);
  return { samples: out };
}
