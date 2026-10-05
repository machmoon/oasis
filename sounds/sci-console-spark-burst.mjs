// Console spark burst: an overloading bridge console blows. The layers are a 0-ms broadband blast, a pitch-dropping low punch, a sagging discharge zap, a stuttering arc buzz with spitting spark clusters that thin over time, metal debris raining down as detuned struck modes, and an optional rumble and room tail.
export const meta = {
  title: "Console Spark Burst", kind: "impact", format: "sound", duration: 1.8, price: 4, author: "quietmachine", payout: "quietmachine@creators.oasis.example", kit: "Sci-fi Console", description: "A starship console overloading: a sharp blast with a low punch, a crackling electrical arc and shrapnel tinkling down, built for bridge damage, sabotage and combat hits.",
  tags: ["explosion", "sparks", "electrical", "sci-fi", "console", "debris", "impact", "overload"],
};
export const params = { knobs: {
  size: { type: "choice", label: "Size", default: "medium", options: ["small", "medium", "large"] },
  crackle: { type: "range", label: "Crackle", default: 0.6, min: 0, max: 1, step: 0.01 },
  debris: { type: "range", label: "Debris", default: 0.5, min: 0, max: 1, step: 0.01 },
  punch: { type: "range", label: "Low punch", default: 0.6, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, si = params.knobs.size.options.indexOf(p.size), r = c.rng(p.seed * 7907 + si * 101 + 3);
  const S = [
    { dur: 1.2, lp: 4200, dec: 0.06, f0: 150, f1: 62, deb: 22, rv: 0.35, sc: 0.55, bright: 1.3 },
    { dur: 1.8, lp: 2600, dec: 0.13, f0: 115, f1: 46, deb: 42, rv: 0.6, sc: 0.8, bright: 1 },
    { dur: 2.6, lp: 1500, dec: 0.26, f0: 85, f1: 32, deb: 70, rv: 0.85, sc: 1, bright: 0.75 },
  ][si];
  const span = p.tail ? S.dur : S.dur * 0.7, n = c.seconds(span, sr), cr = p.crackle;
  let out = new Float32Array(n);
  {
    const bn = c.seconds(S.dec * 6, sr), x = c.noise(r, bn), lp = c.onepole(sr), lp2 = c.onepole(sr), ph0 = r() * 6;
    for (let i = 0; i < bn; i++) {
      const t = i / sr, e = Math.min(1, t / 0.0006) * Math.exp(-t / S.dec);
      const fc = S.lp * (0.35 + 1.8 * Math.exp(-t / (S.dec * 0.5)));
      x[i] = lp2(lp(x[i], fc), fc) * e * (1 + 0.4 * Math.sin(t * 190 + ph0));
    }
    c.mix(out, x, 0, 1.1 * S.sc, sr);
    c.mix(out, c.burst(r, 0.02, "hp", 1800 * S.bright, 0.7, 0.0004, 0.004, sr), 0, 0.7, sr);
  }
  {
    const tn = c.seconds(0.12 + 0.35 * p.punch * S.sc, sr), dt = 0.03 + 0.03 * S.sc;
    const th = c.osc("sine", (t) => S.f1 + (S.f0 - S.f1) * Math.exp(-t / dt), tn, sr);
    c.multiply(th, c.env(tn, 0.001, 0.05 + 0.16 * p.punch * S.sc, sr));
    c.mix(out, th, 0, 0.15 + 1.1 * p.punch, sr);
  }
  {
    const zl = 0.18 + 0.2 * S.sc, zn = c.seconds(zl, sr), hi = (1500 + r() * 500) * S.bright, lo = 160 + r() * 60;
    const zap = c.osc("tri", (t) => lo + (hi - lo) * Math.exp(-t / (zl * 0.3)), zn, sr);
    c.multiply(zap, c.env(zn, 0.001, zl * 0.3, sr));
    c.mix(out, zap, 0.003, 0.05 + 0.3 * cr, sr);
  }
  {
    const arcLen = Math.min(span * 0.8, 0.22 + 0.6 * cr * S.sc), an = c.seconds(arcLen, sr), arc = new Float32Array(an);
    const hpA = c.biquad("hp", 300, 0.7, sr), lpA = c.biquad("lp", 6000, 0.8, sr), base = 95 + r() * 50;
    let ph = 0, g = 0, gt = 0, drift = 0;
    for (let i = 0; i < an; i++) {
      if (i % 256 === 0) { gt = r() < 0.55 + 0.2 * cr ? 0.3 + 0.7 * r() : 0; drift = c.clamp(drift + (r() - 0.5) * 0.16, -0.35, 0.35); }
      const sag = 1 - 0.45 * (i / an) * (i / an);
      g += (gt - g) * 0.03; ph += base * (1 + drift) * sag / sr; ph -= Math.floor(ph);
      const s = 2 * ph - 1 + 0.5 * (ph < 0.5 ? 1 : -1);
      arc[i] = lpA(hpA(s)) * g * Math.min(1, i / (0.004 * sr)) * Math.exp(-i / sr / (arcLen * 0.45));
    }
    c.mix(out, arc, 0.01, 0.08 + 0.5 * cr, sr);
    const clusters = Math.round((4 + 22 * cr) * (0.6 + 0.5 * S.sc));
    for (let k = 0; k < clusters; k++) {
      let t = 0.004 + Math.pow(r(), 1.9) * span * 0.68;
      const fall = Math.pow(1 - t / span, 1.5), clicks = 3 + Math.floor(r() * (4 + 6 * cr)), fc = (2500 + r() * 4500) * S.bright;
      for (let j = 0; j < clicks && t < span * 0.85; j++) {
        c.mix(out, c.burst(r, 0.002 + r() * 0.003, "hp", fc * (0.8 + 0.4 * r()), 0.7, 0.0002, 0.0006 + r() * 0.0012, sr),
          t, (0.2 + 0.6 * r()) * fall * (1 - j / (clicks + 1)) * (0.3 + 0.7 * cr), sr);
        t += 0.0015 + r() * 0.006;
      }
    }
  }
  {
    const pieces = Math.round(S.deb * (0.12 + p.debris));
    for (let k = 0; k < pieces; k++) {
      const t = 0.05 + Math.pow(r(), 1.7) * span * 0.72, fall = Math.pow(1 - t / span, 1.6);
      const heavy = r() < 0.15 * S.sc, f = heavy ? 250 + r() * 500 : (900 + r() * 3600) * S.bright;
      const tw = 1.003 + r() * 0.008, m = 2.6 + r() * 0.4;
      const modes = [[f, 1], [f * tw, 0.7], [f * m, 0.4], [f * m * tw, 0.25]];
      c.mix(out, c.ring(modes, heavy ? 0.18 : 0.09, heavy ? 0.04 : 0.008 + r() * 0.025, sr), t + 0.0005,
        (0.08 + 0.22 * r()) * fall * (0.3 + 0.7 * p.debris) * (heavy ? 1.4 : 1), sr);
      c.mix(out, c.burst(r, 0.004, "bp", f * 1.5, 1.5, 0.0003, 0.001, sr), t, 0.1 * fall * (0.3 + 0.7 * p.debris), sr);
    }
  }
  if (p.tail) {
    const rn = c.seconds(span * 0.8, sr), rum = c.brown(r, rn), lpR = c.biquad("lp", 110 + 60 * (1 - S.sc), 0.8, sr);
    for (let i = 0; i < rn; i++) { const t = i / sr; rum[i] = lpR(rum[i]) * Math.min(1, t / 0.02) * Math.exp(-t / (span * 0.16)); }
    c.mix(out, rum, 0.01, 2.2 * S.sc * (0.5 + 0.5 * p.punch), sr);
    const wet = c.reverb(out, { size: S.rv, decay: 0.3 + 0.5 * S.sc, mixAmt: 0.2 }, sr);
    if (wet && wet.length) out = wet.length === n ? wet : wet.slice(0, n);
  }
  c.finish(out, 0.9, 1.3);
  c.fade(out, p.tail ? 40 : 20, sr);
  for (let i = 0; i < 8 && i < out.length; i++) out[i] *= 0.4 + 0.075 * i;
  return { samples: out };
}
