// Distant red fox: a voiced harmonic stack with call-specific pitch contour, moving formants, period-doubling hoarseness and pulse-gated rasp, then air absorption, forest reflections and an optional wet tail.
export const meta = {
  title: "Vixen in the Dark", kind: "sfx", format: "sound", duration: 2, price: 2, author: "stormfront", payout: "stormfront@creators.oasis.example", kit: "Forest at Night", description: "A red fox barking, screaming or yipping somewhere in a night forest; call type, pitch, repetitions, distance and rasp are knobs, so every seed is a different animal answering across the trees.",
  tags: ["fox", "bark", "scream", "animal", "night", "forest", "distant", "creature"],
};
export const params = { knobs: {
  call: { type: "choice", label: "Call type", default: "bark", options: ["bark", "scream", "yip"] },
  pitch: { type: "range", label: "Pitch", default: 0.5, min: 0, max: 1, step: 0.01 },
  repetitions: { type: "range", label: "Repetitions", default: 3, min: 1, max: 4, step: 1 },
  distance: { type: "range", label: "Distance", default: 0.45, min: 0, max: 1, step: 0.01 },
  raspiness: { type: "range", label: "Raspiness", default: 0.4, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Forest tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 4219 + params.knobs.call.options.indexOf(p.call) * 97 + 3);
  const far = p.distance, reps = Math.round(p.repetitions), TAU = c.TAU, kind = p.call, PI = Math.PI;
  const V = {
    bark: { d: [0.13, 0.22], f: 560, gap: [0.35, 0.7], F1: 900, F2: 2100, a: 0.012, rel: 0.45, rough: 0.25, tilt: 0.75 },
    scream: { d: [1.0, 1.4], f: 900, gap: [0.4, 0.7], F1: 1400, F2: 3000, a: 0.05, rel: 0.25, rough: 0.5, tilt: 0.5 },
    yip: { d: [0.05, 0.09], f: 1150, gap: [0.09, 0.2], F1: 1700, F2: 3400, a: 0.006, rel: 0.5, rough: 0.05, tilt: 0.95 },
  }[kind];
  const R = c.clamp(V.rough + 0.75 * p.raspiness, 0, 1);
  const base = V.f * Math.pow(2, p.pitch - 0.5) * c.between(r, 0.92, 1.08), fs = c.between(r, 0.9, 1.1);
  const tilt = []; for (let k = 1; k <= 14; k++) tilt[k] = 1 / Math.pow(k, V.tilt);
  const fg = (hz, F1, F2) => { const a = (hz - F1) / 350, b = (hz - F2) / 600; return 0.2 + 1 / (1 + a * a) + 0.6 / (1 + b * b); };
  const contour = (u) => {
    if (kind === "bark") return u < 0.18 ? 0.86 + 0.22 * (u / 0.18) : 1.08 - 0.33 * Math.pow((u - 0.18) / 0.82, 0.9);
    if (kind === "yip") return 0.68 + 0.47 * Math.sin(PI / 2 * Math.min(1, u / 0.65)) - (u > 0.8 ? 0.25 * (u - 0.8) / 0.2 : 0);
    return u < 0.12 ? 0.72 + 0.38 * u / 0.12 : u < 0.78 ? 1.1 - 0.05 * (u - 0.12) / 0.66 : 1.05 - 0.25 * Math.pow((u - 0.78) / 0.22, 1.2);
  };
  const note = (dur, f0, dep, F1, F2, sub0, wph, vr) => {
    const n = c.seconds(dur, sr), x = new Float32Array(n), nz = c.noise(r, n), bp = c.biquad("bp", F2 * 1.1, 0.9, sr);
    const K = Math.max(4, Math.min(14, Math.floor(0.45 * sr / (f0 * 1.2)))), a = V.a * (1 + 2.5 * far), rel = dur * V.rel;
    let norm = 0; for (let k = 1; k <= K; k++) norm += tilt[k] * fg(k * f0, F1, F2); norm = 1.4 / norm;
    let ph = 0, jit = 0, amp = 1, wob = 0, sub = sub0;
    for (let i = 0; i < n; i++) {
      const t = i / sr, u = i / n;
      let cf = contour(u); if (kind === "scream") cf *= 1 + 0.03 * Math.sin(TAU * vr * t + wph) + wob;
      const fm = f0 * (1 + (cf - 1) * dep) * (1 + jit), was = ph >= TAU;
      ph += TAU * fm / sr; if (ph >= 2 * TAU) ph -= 2 * TAU;
      if ((ph >= TAU) !== was) {
        jit = (r() - 0.5) * 0.05 * R; amp = 1 + (r() - 0.5) * 0.4 * R;
        if (kind === "scream") { wob = wob * 0.98 + (r() - 0.5) * 0.01; sub = c.clamp(sub + (r() - 0.5) * 0.25 * R, 0, 0.1 + 0.7 * R); }
      }
      const F1t = kind === "bark" ? F1 * (0.6 + 0.4 * Math.sin(PI * Math.min(1, u * 1.25))) : kind === "yip" ? F1 * (0.7 + 0.3 * Math.min(1, u * 2)) : F1 * (0.9 + 0.1 * Math.sin(PI * u));
      const s1 = Math.sin(ph), cs = Math.cos(ph);
      let sk1 = s1, sk2 = 0, h = s1 * tilt[1] * fg(fm, F1t, F2);
      for (let k = 2; k <= K; k++) { const sk = 2 * cs * sk1 - sk2; sk2 = sk1; sk1 = sk; h += sk * tilt[k] * fg(k * fm, F1t, F2); }
      const g2 = (1 + cs) * (1 + cs) * 0.25, rasp = (bp(nz[i]) * g2 * g2 * 1.6 + nz[i] * 0.03) * R;
      let e = t < a ? Math.pow(Math.sin(PI / 2 * t / a), 2) : 1;
      e *= kind === "bark" ? 1 - 0.35 * u : kind === "yip" ? 1 - 0.2 * u : (0.8 + 0.2 * Math.sin(PI * Math.min(1, u * 1.4))) * (1 + 0.08 * Math.sin(TAU * vr * t));
      const left = dur - t; if (left < rel) e *= 0.5 - 0.5 * Math.cos(PI * left / rel);
      x[i] = (h * norm * amp * (1 + sub * Math.cos(ph / 2)) + rasp) * e;
    }
    return x;
  };
  const rt = 0.6 + 1.0 * far, tailSec = p.tail ? Math.min(1.4, rt * 0.8 + 0.15) : 0.15, avail = 3.85 - tailSec;
  const count = kind === "scream" ? (reps >= 3 ? 2 : 1) : kind === "yip" ? reps * 2 : reps;
  const ds = [], gs = [];
  for (let k = 0; k < count; k++) {
    let d = c.between(r, V.d[0], V.d[1]);
    if (kind === "scream") d += count === 1 ? 0.25 * (reps - 1) : -0.1;
    ds.push(d);
    if (k < count - 1) gs.push(c.between(r, V.gap[0], V.gap[1]) * (r() < 0.25 ? 1.5 : 1));
  }
  const sumD = ds.reduce((s, v) => s + v, 0), sumG = gs.reduce((s, v) => s + v, 0);
  let sd = 1, sg = 1;
  if (sumD + sumG > avail) {
    if (sumG > 0) sg = Math.max(0.15, (avail - sumD) / sumG);
    if (sumD + sumG * sg > avail) sd = (avail - sumG * sg) / sumD;
  }
  const notes = []; let t0 = 0;
  for (let k = 0; k < count; k++) {
    const d = ds[k] * sd;
    notes.push([t0, d, base * (1 - 0.025 * k) * c.between(r, 0.93, 1.07), c.between(r, 0.7, 1.3), V.F1 * fs * c.between(r, 0.93, 1.07), V.F2 * fs * c.between(r, 0.93, 1.07), c.between(r, 0.2, 0.8) * R, r() * TAU, c.between(r, 4.5, 7)]);
    if (k < count - 1) t0 += d + gs[k] * sg;
  }
  const last = notes[notes.length - 1];
  const out = new Float32Array(c.seconds(Math.min(3.95, last[0] + last[1] + tailSec), sr)), N = out.length;
  for (const [on, d, f0, dp, F1, F2, sb, wph, vr] of notes) c.mix(out, note(d, f0, dp, F1, F2, sb, wph, vr), on, c.between(r, 0.75, 1), sr);
  const cut = Math.min(0.45 * sr, 9000 - 7500 * far);
  c.filter(out, c.biquad("lp", cut, 0.7, sr)); c.filter(out, c.biquad("lp", cut * 1.3, 0.6, sr));
  c.filter(out, c.biquad("hp", 200, 0.7, sr));
  c.finish(out, 0.9);
  const cp = out.slice(), op = c.onepole(sr), rf = 3200 - 2000 * far, er = 0.12 + 0.55 * far;
  for (let i = 0; i < N; i++) cp[i] = op(cp[i], rf);
  for (const [d, g] of [[c.between(r, 0.012, 0.025), 0.55], [c.between(r, 0.03, 0.05), 0.4], [c.between(r, 0.055, 0.085), 0.3], [c.between(r, 0.09, 0.14), 0.22]]) {
    const L = Math.round(d * sr); for (let i = L; i < N; i++) out[i] += cp[i - L] * g * er;
  }
  if (p.tail) {
    const y = new Float32Array(N), sz = c.between(r, 0.9, 1.15), damp = 1 - Math.exp(-TAU * (2600 - 1700 * far) / sr);
    for (const d of [0.0297, 0.0371, 0.0411, 0.0437, 0.0503]) {
      const L = Math.max(1, Math.round(d * sz * sr)), buf = new Float32Array(L), g = Math.pow(10, -3 * d * sz / rt);
      let lp = 0, idx = 0;
      for (let i = 0; i < N; i++) { const o = buf[idx]; lp += damp * (o - lp); buf[idx] = out[i] + lp * g; idx = (idx + 1) % L; y[i] += o; }
    }
    for (const d of [0.0051, 0.0017]) {
      const L = Math.round(d * sr), buf = new Float32Array(L); let idx = 0;
      for (let i = 0; i < N; i++) { const b = buf[idx], v = y[i] + 0.6 * b; buf[idx] = v; y[i] = b - 0.6 * v; idx = (idx + 1) % L; }
    }
    const w = (0.08 + 0.5 * far) / 5;
    for (let i = 0; i < N; i++) out[i] += y[i] * w;
  }
  const bed = c.pink(r, N), bh = c.biquad("hp", 300, 0.7, sr), bl = c.biquad("lp", 2400 - 1200 * far, 0.7, sr);
  for (let i = 0; i < N; i++) bed[i] = bl(bh(bed[i]));
  c.mix(out, bed, 0, 0.015 + 0.01 * far, sr);
  const fl = Math.min(N, c.seconds(p.tail ? 0.2 : 0.06, sr));
  for (let i = 0; i < fl; i++) { const g = i / fl; out[N - fl + i] *= (1 - g) * (1 - g); }
  c.finish(out, 0.9, 1.1);
  c.gain(out, 1 - 0.42 * far);
  c.fade(out, 10, sr);
  return { samples: out };
}
