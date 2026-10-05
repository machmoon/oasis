// Quiet Hearth: an empty wooden tavern as a seamless circular loop. Ember hiss, roar, crackle clusters and snaps; stick-slip beam groans; walled-off gusts with a shutter whistle; an early-reflection and comb/allpass room per size.
export const meta = {
  title: "Quiet Hearth", kind: "ambience", format: "sound", duration: 3, price: 4, author: "stormfront", payout: "stormfront@creators.oasis.example", kit: "Wooden Tavern", description: "A loopable bed of an empty wooden tavern after hours, with a crackling hearth, groaning beams and wind gusting outside. Use it for inns, taverns and cosy interiors.",
  tags: ["tavern", "fire", "crackle", "ambience", "loop", "wooden", "interior", "medieval"],
};
export const params = { knobs: {
  room: { type: "choice", label: "Room size", default: "snug", options: ["snug", "hall"] },
  fire: { type: "range", label: "Fire intensity", default: 0.5, min: 0, max: 1, step: 0.01 },
  creaks: { type: "range", label: "Beam creaks", default: 0.4, min: 0, max: 1, step: 0.01 },
  wind: { type: "range", label: "Wind outside", default: 0.3, min: 0, max: 1, step: 0.01 },
  length: { type: "range", label: "Loop length", default: 3, min: 2, max: 4, step: 0.1 },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const hall = p.room === "hall", sr = c.sr, r = c.rng(p.seed * 4271 + (hall ? 911 : 3)), TAU = c.TAU;
  const dur = p.length, n = c.seconds(dur, sr), X = c.seconds(0.25, sr), N = n + X, fi = p.fire, wd = p.wind;
  const w = new Float32Array(N), out = new Float32Array(n);
  const put = (src, t, g) => { const s0 = Math.floor(t * sr); for (let i = 0; i < src.length; i++) out[(s0 + i) % n] += src[i] * g; };
  const per = (k, a, i) => Math.sin(TAU * k * i / n + a);
  const tone = c.brown(r, N), dc = c.biquad("hp", 35, 0.7, sr), tl = c.biquad("lp", hall ? 110 : 200, 0.8, sr), tb = c.biquad("bp", hall ? 70 : 165, 4, sr);
  for (let i = 0; i < N; i++) { const x = dc(tone[i]); tone[i] = tl(x) + 0.6 * tb(x); }
  c.mix(w, tone, 0, 0.1, sr);
  const roar = c.brown(r, N), hiss = c.noise(r, N), rd = c.biquad("hp", 50, 0.7, sr), rl = c.onepole(sr), hh = c.biquad("hp", 3000, 0.7, sr), b1 = r() * TAU;
  let fl = 0.6, ft = 0.6;
  for (let i = 0; i < N; i++) {
    if (i % 900 === 0) ft = 0.4 + 0.6 * r();
    fl += (ft - fl) * 0.003;
    const e = fl * (0.8 + 0.2 * per(2, b1, i));
    roar[i] = rl(rd(roar[i]), 220 + 700 * fi * e) * e * (0.15 + 0.45 * fi) + hh(hiss[i]) * e * (0.025 + 0.05 * fi);
  }
  c.mix(w, roar, 0, 1, sr);
  if (wd > 0) {
    const G = 1 + Math.floor(r() * 2) + (wd > 0.6 ? 1 : 0), gc = [], gw = [], ga = [];
    for (let g = 0; g < G; g++) { gc.push(dur * (0.3 + 0.4 * (G === 1 ? r() : (g + r()) / G))); gw.push(dur * (0.14 + 0.12 * r())); ga.push(0.6 + 0.4 * r()); }
    const env = new Float32Array(N), a3 = r() * TAU;
    for (let i = 0; i < N; i++) {
      const t = (i % n) / sr; let s = 0.12;
      for (let g = 0; g < G; g++) { let d = Math.abs(t - gc[g]); d = Math.min(d, dur - d); if (d < gw[g]) s += ga[g] * (0.5 + 0.5 * Math.cos(Math.PI * d / gw[g])); }
      env[i] = Math.min(1, s) * (0.88 + 0.12 * per(5, a3, i));
    }
    const pn = c.pink(r, N), wn = c.noise(r, N), lp = c.onepole(sr), lp2 = c.onepole(sr), hp = c.biquad("hp", 60, 0.7, sr), wf = 520 + r() * 260;
    let y1 = 0, y2 = 0;
    for (let i = 0; i < N; i++) {
      const g = env[i], fc = (hall ? 150 : 190) + 480 * g, rr = 0.988, cw = 2 * Math.cos(TAU * wf * (0.85 + 0.3 * g) / sr);
      const y = wn[i] * 0.024 + cw * rr * y1 - rr * rr * y2; y2 = y1; y1 = y;
      pn[i] = lp2(lp(hp(pn[i]), fc), fc) * g * 1.6 + y * g * g * g * 0.35;
    }
    c.mix(w, pn, 0, 0.55 * wd, sr);
  }
  for (let i = 0; i < n; i++) {
    if (i < X) { const a = Math.PI / 2 * i / X; out[i] = w[i] * Math.sin(a) + w[n + i] * Math.cos(a); } else out[i] = w[i];
  }
  const cf = hall ? 0.85 : 1, fg = 0.55 + 0.45 * fi, micro = Math.round((45 + 120 * fi) * dur);
  for (let k = 0; k < micro; k++) put(c.burst(r, 0.0015 + r() * 0.002, "bp", 3000 + r() * 5000, 1.2, 0.0003, 0.0005 + r() * 0.0008, sr), r() * dur, (0.06 + 0.14 * r()) * fg);
  const clusters = Math.round((6 + 28 * fi) * dur);
  for (let k = 0; k < clusters; k++) {
    let t = r() * dur, sp = 0.004 + r() * 0.02; const m = 2 + Math.floor(r() * 5), gg = (0.25 + 0.5 * r() * r()) * fg, f = (1300 + r() * 3500) * cf;
    for (let j = 0; j < m; j++) { put(c.burst(r, 0.002 + r() * 0.005, "bp", f * (0.8 + 0.4 * r()), 1.8, 0.0003, 0.0006 + r() * 0.0018, sr), t, gg * (0.6 + 0.4 * r()) * (1 - 0.1 * j)); t += sp; sp *= 0.7 + 0.5 * r(); }
  }
  const snaps = Math.max(1, Math.round((0.6 + 2.6 * fi) * dur));
  for (let k = 0; k < snaps; k++) {
    const t = r() * dur, f = (600 + r() * 900) * cf;
    put(c.ring([[f, 1], [f * 2.63 * (0.98 + 0.04 * r()), 0.4], [f * 4.1, 0.15]], 0.06, 0.005 + 0.004 * r(), sr), t, 0.55 * fg);
    put(c.burst(r, 0.008, "hp", 2000, 0.8, 0.0003, 0.002, sr), t, 0.85 * fg);
    for (let j = 0; j < 3 + r() * 5; j++) put(c.burst(r, 0.002, "bp", 4000 + r() * 3000, 1.5, 0.0003, 0.0007, sr), t + 0.01 + r() * 0.12, 0.2 * fg);
  }
  const nc = p.creaks > 0 ? Math.max(1, Math.round(p.creaks * (1 + dur))) : 0;
  for (let k = 0; k < nc; k++) {
    const T = 0.5 + 0.6 * r(), m = c.seconds(T, sr), buf = new Float32Array(m);
    const f0 = (hall ? 95 : 140) * (0.8 + 0.4 * r()), gl = (r() < 0.5 ? -1 : 1) * (0.15 + 0.25 * r());
    const m1 = c.biquad("bp", (hall ? 420 : 560) * (0.9 + 0.2 * r()), 6, sr), m2 = c.biquad("bp", (hall ? 980 : 1300) * (0.9 + 0.2 * r()), 7, sr), m3 = c.biquad("bp", 2100 + 400 * r(), 8, sr);
    const ph = r() * TAU, hump = 0.3 + 0.3 * r();
    let phase = 0, pk = 1e-9;
    for (let i = 0; i < m; i++) {
      const u = i / m, v = Math.pow(Math.sin(Math.PI * Math.pow(u, hump * 1.6)), 0.7) * (0.8 + 0.2 * Math.sin(TAU * 3 * u + ph));
      phase += f0 * (1 + gl * (u - 0.5)) * (0.75 + 0.4 * v) / sr;
      let imp = 0;
      if (phase >= 1) { phase -= 1 + (r() - 0.5) * 0.04; imp = (0.75 + 0.25 * r()) * v; }
      buf[i] = (m1(imp) + 0.8 * m2(imp) + 0.35 * m3(imp)) * Math.min(1, u * 10) * Math.min(1, (1 - u) * 6);
      pk = Math.max(pk, Math.abs(buf[i]));
    }
    put(c.gain(buf, 1 / pk), r() * dur, (0.35 + 0.45 * p.creaks) * (0.75 + 0.25 * r()));
  }
  const taps = hall ? [[0.023, 0.5], [0.041, 0.42], [0.067, 0.34], [0.093, 0.26], [0.131, 0.2], [0.17, 0.14]] : [[0.003, 0.3], [0.007, 0.2], [0.011, 0.12]];
  const dry = Float32Array.from(out);
  for (const [d, g] of taps) { const ds = Math.round(d * sr); for (let i = 0; i < n; i++) out[i] += dry[(i - ds + n) % n] * g; }
  const rt = hall ? 2.6 : 0.3, sc = (hall ? 1.9 : 0.6) * sr / 44100, damp = hall ? 0.5 : 0.2;
  const dl = [1116, 1188, 1277, 1356].map((d) => Math.max(8, Math.round(d * sc))), cb = dl.map((d) => new Float32Array(d));
  const gs = dl.map((d) => Math.pow(10, -3 * d / sr / rt)), ix = [0, 0, 0, 0], ls = [0, 0, 0, 0];
  const al = Math.max(4, Math.round(225 * sc)), ab = new Float32Array(al), rv = new Float32Array(n);
  let ai = 0, rp = 1e-9, dp = 1e-9;
  for (let k = 0; k < 2 * n; k++) {
    const x = out[k % n] * 0.25; let s = 0;
    for (let j = 0; j < 4; j++) {
      const b = cb[j], y = b[ix[j]];
      ls[j] = y * (1 - damp) + ls[j] * damp;
      b[ix[j]] = x + ls[j] * gs[j]; ix[j] = (ix[j] + 1) % dl[j]; s += y;
    }
    const d = ab[ai], v = s + 0.5 * d; ab[ai] = v; ai = (ai + 1) % al;
    if (k >= n) { rv[k - n] = d - 0.5 * v; rp += rv[k - n] * rv[k - n]; dp += out[k - n] * out[k - n]; }
  }
  const rn = Math.sqrt(dp / rp), dG = hall ? 0.5 : 0.95, wG = hall ? 0.85 : 0.14, air = c.onepole(sr), fc = hall ? 4500 : 12000;
  for (let i = n - 2000; i < n; i++) air(out[i] * dG + rv[i] * rn * wG, fc);
  for (let i = 0; i < n; i++) out[i] = air(out[i] * dG + rv[i] * rn * wG, fc);
  c.fade(c.finish(out, 0.8), 15, sr);
  c.gain(out, 0.66 + 0.3 * Math.max(fi, 0.85 * wd));
  return { samples: out };
}
