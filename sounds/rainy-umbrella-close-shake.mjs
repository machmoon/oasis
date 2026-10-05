// Umbrella close & shake: collapse (nylon swish, rib ticks, latch), shakes (air whoosh, canopy thwap, flung droplet chirps), strap rip and snap, optional awning drips over rain beyond the shelter.
export const meta = {
  title: "Umbrella Shake-Out", kind: "foley", format: "sound", duration: 2, price: 2, author: "foleyroom", payout: "foleyroom@creators.oasis.example", kit: "Rainy City Street", description: "A wet umbrella collapsed, shaken out under shelter and strapped shut; type, shakes, spray and strap are knobs, and every seed is a different person doing it.",
  tags: ["umbrella", "rain", "shake", "foley", "wet", "cloth", "drips", "city"],
};
export const params = { knobs: {
  type: { type: "choice", label: "Umbrella", default: "compact", options: ["compact", "golf", "clear dome"] },
  shakes: { type: "range", label: "Shake count", default: 0.5, min: 0, max: 1, step: 0.01 },
  spray: { type: "range", label: "Spray", default: 0.6, min: 0, max: 1, step: 0.01 },
  strap: { type: "range", label: "Strap click", default: 0.5, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Drips & shelter", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, T = params.knobs.type.options.indexOf(p.type), r = c.rng(p.seed * 6151 + T * 197 + 29);
  const U = [
    { cd: 0.22, ribs: 8, rf: 3400, cv: 150, per: 0.15, wh: [600, 2400], tele: 2, sz: 0.7, max: 5 },
    { cd: 0.42, ribs: 16, rf: 2300, cv: 82, per: 0.27, wh: [260, 1400], tele: 0, sz: 1.4, max: 3 },
    { cd: 0.32, ribs: 10, rf: 2900, cv: 230, per: 0.2, wh: [900, 3800], tele: 0, sz: 1, max: 4 }][T];
  const dome = T === 2, spray = p.spray, s = p.strap, nS = 1 + Math.round(p.shakes * U.max);
  const tS = 0.02 + U.cd + 0.12 + U.tele * 0.06, tStrap = tS + nS * U.per * 1.1 + 0.2;
  const strapLen = 0.1 + 0.25 * s, total = tStrap + strapLen + (p.tail ? 1.4 : 0.3);
  let out = new Float32Array(c.seconds(total, sr));
  const N = out.length, fMax = sr * 0.18;
  const band = (t0, dur, f0, f1, a, shape, crink, q) => {
    const n = c.seconds(dur, sr), s0 = Math.floor(t0 * sr), damp = 1 / (q || 1.4);
    const k = Math.max(1, c.seconds(crink ? 0.003 : 0.012, sr)); let fl = 1, fs = 1, lo = 0, bp = 0, fc = 0.1;
    for (let i = 0; i < n && s0 + i < N; i++) {
      const x = i / n;
      if (i % 32 === 0) fc = 2 * Math.sin(Math.PI * Math.min(fMax, f0 + (f1 - f0) * x) / sr);
      if (i % k === 0) fl = crink ? (r() < 0.35 ? 0.4 + r() : 0.12) : 0.6 + 0.4 * r();
      fs += (fl - fs) * (crink ? 0.3 : 0.05);
      const hp = (r() * 2 - 1) - lo - damp * bp; bp += fc * hp; lo += fc * bp;
      out[s0 + i] += a * fs * shape(x) * bp;
    }
  };
  const drop = (t, a, f, dec) => {
    const s0 = Math.floor(t * sr), n = c.seconds(0.04, sr), d = dec || 0.005; let ph = 0;
    for (let i = 0; i < n && s0 + i < N; i++) {
      const tt = i / sr; ph += c.TAU * f * (1 + 40 * tt) / sr;
      out[s0 + i] += a * Math.sin(ph) * Math.exp(-tt / d) * Math.min(1, tt / 0.0006);
    }
    c.mix(out, c.burst(r, 0.005, "bp", 1800 + r() * 2000, 2, 0.0005, 0.0012, sr), t, a * 0.25, sr);
  };
  const t0 = 0.015;
  band(t0, U.cd, 700, 2400, 1.1, x => Math.sin(Math.PI * x) * (0.5 + 0.5 * x), false, 1.2);
  band(t0, U.cd + 0.08, dome ? 3000 : 500, dome ? 5500 : 1600, dome ? 1.0 : 0.7, x => Math.sin(Math.PI * x), dome, dome ? 3 : 1.5);
  for (let k = 0; k < U.ribs; k++) {
    const t = t0 + U.cd * (0.12 + 0.8 * k / U.ribs + 0.04 * r());
    c.mix(out, c.ring([[U.rf * (0.9 + r() * 0.2), 1], [U.rf * 2.3 * (0.95 + 0.1 * r()), 0.4]], 0.02, 0.003, sr), t, 0.12 + 0.1 * r(), sr);
  }
  const lk = U.rf / 2900, tl = t0 + U.cd;
  c.mix(out, c.ring([[1900 * lk, 1], [4700 * lk, 0.5], [7300 * lk, 0.25]], 0.05, 0.008, sr), tl, 0.45, sr);
  c.mix(out, c.burst(r, 0.006, "bp", 3000, 1.5, 0.0005, 0.0015, sr), tl, 0.25, sr);
  for (let k = 0; k < U.tele; k++) {
    const t = tl + 0.05 + 0.06 * k;
    band(t - 0.035, 0.04, 1200, 2200, 0.6, x => x, false, 2);
    c.mix(out, c.ring([[900 + r() * 100, 1], [2350, 0.4]], 0.04, 0.006, sr), t, 0.3, sr);
  }
  for (let k = 0; k < nS; k++) {
    const t = tS + k * U.per * (1.05 + 0.15 * (r() - 0.5)), amp = 1 - 0.35 * k / Math.max(1, nS), L = U.per * 0.75, snap = t + L;
    band(t, L + 0.015, U.wh[0] * (1 - 0.3 * spray), U.wh[1] * (1 - 0.25 * spray), 1.3 * amp, x => x * x * (x < 0.92 ? 1 : (1 - x) / 0.08), dome, 1.1);
    const cv = U.cv * (0.95 + 0.1 * r());
    c.mix(out, c.ring([[cv, 1], [cv * 1.62, 0.6], [cv * 2.71, 0.35], [cv * 4.1, 0.2]], 0.12 * U.sz, 0.025 * U.sz * (1 + 0.6 * spray), sr), snap, 0.85 * amp, sr);
    c.mix(out, c.burst(r, 0.012, "bp", dome ? 4200 : 2200, 1.2, 0.0008, 0.005, sr), snap, 0.5 * amp, sr);
    if (spray > 0) {
      c.mix(out, c.burst(r, 0.04, "lp", 1100, 0.8, 0.001, 0.012, sr), snap, 0.5 * spray * amp, sr);
      c.mix(out, c.burst(r, 0.1, "bp", 3800, 1.2, 0.003, 0.03, sr), snap + 0.005, 0.3 * spray * amp, sr);
      const nd = Math.round(spray * 30 * U.sz * amp);
      for (let d = 0; d < nd; d++) drop(snap + 0.04 + r() * r() * 0.32, (0.09 + 0.15 * r()) * amp, 1400 + r() * 2600);
    }
  }
  band(tStrap - 0.13, 0.15, 300, 1200, 0.45, x => Math.sin(Math.PI * x), false, 1.5);
  const vn = c.seconds(0.04 + 0.22 * s, sr), v0 = Math.floor(tStrap * sr), bp = c.biquad("bp", 2400 + 1200 * s, 1.2, sr), gk = Math.max(1, c.seconds(0.0015, sr));
  let g = 0, gs = 0;
  for (let i = 0; i < vn && v0 + i < N; i++) {
    if (i % gk === 0) g = r() < 0.55 ? 0.4 + r() : 0.05;
    gs += (g - gs) * 0.08;
    out[v0 + i] += (0.3 + 0.7 * s) * gs * bp(r() * 2 - 1) * Math.min(1, i / (0.003 * sr), (vn - i) / (0.01 * sr));
  }
  const tb = tStrap + vn / sr + 0.03;
  c.mix(out, c.ring([[2600, 1], [5900, 0.45]], 0.04, 0.006, sr), tb, 0.15 + 0.55 * s, sr);
  c.mix(out, c.burst(r, 0.005, "bp", 3200, 1.5, 0.0004, 0.0012, sr), tb, 0.1 + 0.3 * s, sr);
  if (p.tail) {
    let t = tb + 0.08;
    while (t < total - 0.35) { drop(t, 0.14 + 0.12 * r(), 700 + r() * 1200, 0.009); t += 0.1 + r() * 0.2 * (1 + (t - tb)); }
    const bed = c.pink(r, N), h = c.biquad("hp", 450, 0.7, sr), l = c.biquad("lp", 2600, 0.7, sr), fi = 0.3 * sr, ph = r() * 6;
    for (let i = 0; i < N; i++) out[i] += 0.07 * l(h(bed[i])) * Math.min(1, i / fi, (N - i) / (0.4 * sr)) * (0.85 + 0.15 * Math.sin(i / sr * 1.3 + ph));
    const d = c.seconds(0.021, sr);
    for (let i = N - 1; i >= d; i--) out[i] += 0.3 * out[i - d];
    const res = c.reverb(out, { size: 0.35, decay: 0.6, mixAmt: 0.2 }, sr);
    if (res instanceof Float32Array) out = res;
  }
  c.finish(out, 0.9);
  let e = out.length - 1;
  while (e > 0 && Math.abs(out[e]) < 0.001) e--;
  const fin = out.slice(0, Math.min(out.length, e + c.seconds(0.02, sr)));
  c.fade(fin, 8, sr);
  return { samples: fin };
}
