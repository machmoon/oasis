// Hologram materialize: a rising cluster of beating sine partials (the light field) swells under a climbing glint while seeded granular sparkle thickens toward the lock, an air wash opens, glitch dropouts, sample-hold crush and pitch jumps scatter the build, a bright twin-detuned ping seals it, and an optional size-scaled tail lets it bloom.
export const meta = {
  title: "Hologram Materialize", kind: "sfx", format: "sound", duration: 2, price: 3, author: "quietmachine", payout: "quietmachine@creators.oasis.example", kit: "Sci-fi Console", description: "A shimmering hologram build-up with granular sparkle and a crystalline lock-in ping; size, build time, shimmer, glitch and tail are knobs for bridge displays, projections and teleport-style reveals.",
  tags: ["hologram", "sci-fi", "materialize", "shimmer", "sparkle", "glitch", "console", "projection"],
};
export const params = { knobs: {
  size: { type: "choice", label: "Size", default: "medium", options: ["small", "medium", "room"] },
  duration: { type: "range", label: "Build time (s)", default: 1.5, min: 0.6, max: 2.2, step: 0.05 },
  shimmer: { type: "range", label: "Shimmer", default: 0.6, min: 0, max: 1, step: 0.01 },
  glitch: { type: "range", label: "Glitch", default: 0.25, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 4241 + params.knobs.size.options.indexOf(p.size) * 97 + 3);
  const S = { small: { f: 740, v: 3, sp: 0.004, rev: 0.3, rel: 0.3, sk: 1150, pf: 3300 }, medium: { f: 370, v: 5, sp: 0.007, rev: 0.55, rel: 0.5, sk: 900, pf: 2200 }, room: { f: 185, v: 6, sp: 0.011, rev: 0.9, rel: 0.7, sk: 700, pf: 1480 } }[p.size];
  const D = p.duration, sh = p.shimmer, gl = p.glitch, tailT = p.tail ? 0.3 + 0.6 * S.rev : 0;
  const nb = c.seconds(D + S.rel, sr), out = new Float32Array(c.seconds(Math.min(3.85, D + S.rel + tailT + 0.05), sr));
  const gT = new Float32Array(nb).fill(1), pj = new Float32Array(nb).fill(1), hold = new Uint8Array(nb).fill(1);
  for (let t = 0.05; t < D;) {
    const len = c.between(r, 0.012, 0.06);
    if (r() < gl * 0.7) {
      const a = c.seconds(t, sr), b = Math.min(nb, c.seconds(t + len, sr)), k = r(), h = 4 + Math.floor(r() * 12);
      for (let i = a; i < b; i++) { if (k < 0.4) gT[i] = 0.04; else if (k < 0.7) pj[i] = k < 0.55 ? 0.707 : 1.414; else hold[i] = h; }
    }
    t += len + c.between(r, 0.005, 0.12 * (1.2 - gl));
  }
  const ratios = [1, 1.5, 2, 3, 4, 5], v = S.v, base = [], amp = [], det = [], tr = [], trR = [], ph1 = [], ph2 = [];
  let asum = 0;
  for (let j = 0; j < v; j++) { base.push(S.f * ratios[j] * (0.997 + r() * 0.006)); amp.push(1 / (1 + j * 0.6)); asum += amp[j]; det.push(1 + S.sp * (0.5 + r())); tr.push(r() * c.TAU); trR.push(5 + r() * 9); ph1.push(r() * c.TAU); ph2.push(r() * c.TAU); }
  const kd = Math.exp(-1 / (S.rel * 0.22 * sr)), sw0 = S.sk * 2 * (0.97 + r() * 0.06), swA = 0.08 * (0.4 + 0.6 * sh);
  let dec = 1, phs = 0, trs = r() * c.TAU;
  for (let i = 0; i < nb; i++) {
    const t = i / sr, x = Math.min(1, t / D), rise = x * x * (3 - 2 * x);
    let e; if (t < D) e = x * x; else { e = dec; dec *= kd; }
    const fm = (0.5 + 0.5 * rise) * pj[i];
    let s = 0;
    for (let j = 0; j < v; j++) {
      const w = c.TAU * base[j] * fm / sr;
      ph1[j] += w; ph2[j] += w * det[j]; tr[j] += c.TAU * trR[j] * (0.5 + rise) / sr;
      s += amp[j] * (1 - sh * 0.45 * (0.5 + 0.5 * Math.sin(tr[j]))) * (Math.sin(ph1[j]) + Math.sin(ph2[j])) * 0.5;
    }
    phs += c.TAU * sw0 * (1 + 2 * x) * pj[i] / sr; trs += c.TAU * (9 + 14 * x) / sr;
    out[i] += 0.55 * e * s / asum + swA * e * (1 - 0.6 * sh * (0.5 + 0.5 * Math.sin(trs))) * Math.sin(phs);
  }
  const air = c.pink(r, nb), hp = c.biquad("hp", 250, 0.7, sr), lp = c.onepole(sr), kn = Math.exp(-1 / (0.08 * sr));
  let dn = 1;
  for (let i = 0; i < nb; i++) {
    const t = i / sr, x = Math.min(1, t / D), rise = x * x * (3 - 2 * x);
    let e; if (t < D) e = x * x * x; else { e = dn; dn *= kn; }
    out[i] += 0.26 * e * lp(hp(air[i]), 300 + (1500 + 7000 * sh) * rise);
  }
  const harm = [2, 2.5, 3, 4, 5, 6, 8], grains = Math.min(1300, Math.round((60 + 500 * sh) * D));
  for (let g = 0; g < grains; g++) {
    const late = r() < 0.15, t = late ? D + r() * S.rel * 0.6 : D * Math.sqrt(r()), tp = Math.min(1, t / D);
    const f = Math.min(sr * 0.42, S.sk * harm[Math.floor(r() * harm.length)] * (0.5 + 0.5 * tp) * (0.99 + r() * 0.02) * (0.75 + 0.5 * sh));
    const len = c.seconds(0.008 + r() * 0.025, sr), a0 = c.seconds(t, sr), A = (0.07 + 0.11 * r()) * (0.4 + 0.6 * tp) * (late ? 0.6 : 1);
    const w = c.TAU * f / sr, wl = c.TAU / len;
    for (let k = 0; k < len && a0 + k < out.length; k++) out[a0 + k] += A * (0.5 - 0.5 * Math.cos(wl * k)) * Math.sin(w * k);
  }
  for (let b = 0, nbl = Math.round(gl * 18); b < nbl; b++) {
    const m = c.seconds(0.008 + r() * 0.017, sr), sq = c.osc("square", 1000 + r() * 3000, m, sr);
    c.mix(out, c.multiply(sq, c.env(m, 0.001, 0.006, sr)), r() * D, 0.12, sr);
  }
  let g = 1, held = 0;
  const ga = 1 - Math.exp(-1 / (0.0015 * sr));
  for (let i = 0; i < nb && i < out.length; i++) {
    g += (gT[i] - g) * ga;
    if (hold[i] > 1) { if (i % hold[i] === 0) held = out[i]; out[i] = held * g; } else out[i] *= g;
  }
  const pf = S.pf * (0.99 + r() * 0.02), pd = S.rel * 0.5;
  const ping = c.ring([[pf, 1], [pf * 1.006, 0.8], [pf * 2.01, 0.35], [pf * 3.003, 0.2], [S.f * 2, 0.5]], pd * 4, pd, sr);
  for (let i = 0, ra = c.seconds(0.002, sr); i < ra; i++) ping[i] *= i / ra;
  c.mix(out, ping, D, 0.42, sr);
  c.mix(out, c.burst(r, 0.03, "hp", 4000, 0.8, 0.001, 0.008, sr), D, 0.3, sr);
  let o = p.tail ? c.reverb(out, { size: S.rev, decay: 0.5 + 0.4 * S.rev, mixAmt: (0.18 + 0.15 * S.rev) * (1 - 0.3 * gl) }, sr) : out;
  const cap = c.seconds(3.9, sr);
  if (o.length > cap) o = o.slice(0, cap);
  c.fade(c.finish(o, 0.9), 12, sr);
  return { samples: o };
}
