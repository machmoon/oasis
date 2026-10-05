// Boat diesel idling at the quay: a phase-driven cycle table gives each engine a countable firing rhythm with strong low harmonics, with per-firing knock, puff and exhaust bubbles on top. A hull resonance and wall echo place it at the quay, water laps on the stone throughout, and the tail spools the engine down smoothly while the water carries on.
export const meta = {
  title: "Quay Diesel Idle", kind: "sfx", format: "sound", duration: 3, price: 3, author: "stormfront", payout: "stormfront@creators.oasis.example", kit: "Ocean Harbour", description: "A small boat engine idling beside a harbour wall, with engine type, rpm, roughness and exhaust burble as knobs; use it under dock scenes or as a boat arriving and waiting.",
  tags: ["boat", "engine", "diesel", "idle", "harbour", "outboard", "motor", "marine"],
};
export const params = { knobs: {
  engine: { type: "choice", label: "Engine", default: "inboard-diesel", options: ["outboard", "inboard-diesel", "old-two-stroke"] },
  rpm: { type: "range", label: "RPM", default: 0.35, min: 0, max: 1, step: 0.01 },
  roughness: { type: "range", label: "Roughness", default: 0.4, min: 0, max: 1, step: 0.01 },
  burble: { type: "range", label: "Exhaust burble", default: 0.4, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Shut-off tail", default: false },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + params.knobs.engine.options.indexOf(p.engine) * 97 + 3), TAU = c.TAU;
  const dur = 3, n = c.seconds(dur, sr), eng = new Float32Array(n), out = new Float32Array(n);
  const rg = p.roughness, bu = p.burble, cut = 1.0, stopT = 2.1, a = r() * 6;
  const E = { outboard: { cyc: 2, f0: 13, f1: 14, m: 3, dec: 0.5, knock: 1900, kn: 0.25, th: 0.7, skip: 0.03, bub: 0.7, hiss: 1 },
    "inboard-diesel": { cyc: 3, f0: 8, f1: 9, m: 4, dec: 0.9, knock: 1300, kn: 1, th: 1.3, skip: 0.01, bub: 0.5, hiss: 0.2 },
    "old-two-stroke": { cyc: 1, f0: 6, f1: 8, m: 3, dec: 0.7, knock: 800, kn: 0.6, th: 1, skip: 0.3, bub: 1, hiss: 0.5 } }[p.engine];
  const spool = (t) => (!p.tail || t < cut ? 1 : t >= stopT ? 0 : 0.5 + 0.5 * Math.cos(Math.PI * (t - cut) / (stopT - cut)));
  const TL = 2048, tab = new Float32Array(TL), cl = [];
  for (let j = 0; j < E.cyc; j++) {
    const lj = j === 0 ? 1 : 0.75 + 0.25 * r(); cl.push(lj);
    for (let i = 0; i < TL; i++) {
      let x = (i / TL - j / E.cyc) * E.cyc; if (x < 0) x += E.cyc;
      const v = Math.exp(-x / E.dec) * (1 - Math.exp(-x / 0.03)) * (Math.sin(TAU * E.m * x) + 0.4 * Math.sin(TAU * E.m * 1.9 * x + 1) + 0.2 * Math.sin(TAU * E.m * 3.1 * x));
      tab[i] += lj * v;
    }
  }
  const base = E.f0 + E.f1 * p.rpm, op = c.onepole(sr), ca = Math.min(1, 250 / sr);
  let ph = 0, last = -1, aS = 0.5, am = 1, boost = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr, sp = spool(t);
    const fr = base * (1 + 0.03 * Math.sin(TAU * 0.27 * t + a) + op(r() - 0.5, 6) * 6 * (0.4 + 1.6 * rg)) * (0.3 + 0.7 * sp);
    ph += fr / E.cyc / sr; if (ph >= 1) ph -= 1;
    const fi = Math.floor(ph * E.cyc);
    if (fi !== last) {
      last = fi;
      const miss = r() < E.skip * (0.5 + 1.5 * rg);
      am = cl[fi] * (miss ? 0.15 : 1 + boost) * (0.8 + 0.4 * r() * (0.5 + rg)) * (1 - 0.3 * rg * r());
      boost = miss ? 0.4 : 0;
      if (sp > 0.05) {
        if (!miss) c.mix(eng, c.burst(r, 0.025, "bp", E.knock * (0.85 + 0.3 * r()), 1.6, 0.001, 0.007, sr), t + 0.002, (0.06 + 0.3 * E.kn) * am * sp, sr);
        c.mix(eng, c.burst(r, 0.07, "lp", 350 + 250 * r(), 1, 0.006, 0.025, sr), t + 0.004, 0.25 * am * sp, sr);
        if (miss && p.engine === "old-two-stroke") c.mix(eng, c.burst(r, 0.07, "bp", 700 + 300 * r(), 1.5, 0.002, 0.02, sr), t + 0.01, 0.3 * sp, sr);
        if (r() < bu * E.bub) {
          const f0 = 250 + 400 * r(), len = 0.03 + 0.04 * r(), m = c.seconds(len, sr), x = c.osc("sine", (tt) => f0 * (1 + 2.2 * tt / len), m, sr), ev = c.env(m, 0.003, len * 0.4, sr);
          for (let q = 0; q < m; q++) x[q] *= ev[q];
          c.mix(eng, x, t + 0.012, 0.25 * bu * sp, sr);
        }
      }
    }
    aS += (am - aS) * ca;
    const fx = ph * TL, i0 = Math.floor(fx) % TL, fq = fx - Math.floor(fx);
    eng[i] += (tab[i0] * (1 - fq) + tab[(i0 + 1) % TL] * fq) * aS * E.th * 0.5 * sp;
  }
  const nz = c.noise(r, n), hh = c.biquad("hp", 2500, 0.7, sr), bb = c.biquad("bp", 380, 2.5, sr), bn = c.noise(r, n);
  let g = 0, gt = 0;
  for (let i = 0; i < n; i++) {
    if (i % Math.floor(sr / 45) === 0) gt = r() * r() * 2;
    g += (gt - g) * 0.15;
    const sp = spool(i / sr);
    eng[i] += E.hiss * 0.03 * hh(nz[i]) * sp + (0.12 + 0.5 * bu * E.bub + 0.1 * bu) * bb(bn[i]) * g * (0.3 + 0.7 * sp);
  }
  const hb = c.biquad("bp", 140, 4, sr), wl = c.onepole(sr), d1 = c.seconds(0.021, sr), d2 = c.seconds(0.043, sr);
  for (let i = 0; i < n; i++) out[i] = eng[i] + 0.5 * hb(eng[i]);
  for (let i = n - 1; i >= d2; i--) out[i] += wl(0.3 * eng[i - d1] + 0.18 * eng[i - d2], 900);
  const lap = new Float32Array(n);
  let lt = 0.1 + 0.3 * r();
  while (lt < dur - 0.5) {
    const s0 = Math.floor(lt * sr), A = 0.6 + 0.4 * r(), L = Math.floor(0.9 * sr);
    for (let i = 0; i < L && s0 + i < n; i++) { const x = i / L, y = x < 0.25 ? x / 0.25 : (1 - x) / 0.75; lap[s0 + i] += A * (x < 0.25 ? y : y * y); }
    c.mix(out, c.ring([[170 + 30 * r(), 1], [290, 0.5], [510, 0.2]], 0.25, 0.06, sr), lt + 0.2, 0.12 * A, sr);
    c.mix(out, c.burst(r, 0.05, "bp", 1500 + 1000 * r(), 1.5, 0.004, 0.015, sr), lt + 0.22, 0.12 * A, sr);
    lt += 0.7 + 0.5 * r();
  }
  const pk = c.pink(r, n), lo = c.onepole(sr), hs = c.biquad("hp", 1800, 0.7, sr);
  for (let i = 0; i < n; i++) out[i] += 0.4 * lo(pk[i], 250 + 1800 * Math.min(1, lap[i])) * (0.35 + lap[i]) + 0.03 * hs(pk[i]) * (0.3 + lap[i]);
  c.finish(out, 0.85, 1.1);
  c.fade(out, 20, sr);
  return { samples: out };
}
