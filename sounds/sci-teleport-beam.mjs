// Transporter beam: chorused harmonic pad with a pitch glide, resonant noise sweep, harmonic sparkle grains, and an optional soft lock-in chime with a room tail.
export const meta = {
  title: "Transporter Shimmer", kind: "sfx", format: "sound", duration: 2.4, price: 4, author: "quietmachine", payout: "quietmachine@creators.oasis.example", kit: "Sci-fi Console", description: "A transporter beam that materialises or dissolves in a gliding sweep of chorused harmonics and glittering sparkle, for sci-fi teleports, warps and beam-ins.",
  tags: ["teleport", "transporter", "beam", "shimmer", "sci-fi", "sparkle", "magic", "warp"],
};
export const params = { knobs: {
  direction: { type: "choice", label: "Direction", default: "in", options: ["in", "out"] },
  duration: { type: "range", label: "Duration", default: 2.2, min: 1, max: 3.2, step: 0.05 },
  sparkle: { type: "range", label: "Sparkle", default: 0.6, min: 0, max: 1, step: 0.01 },
  swell: { type: "range", label: "Harmonic swell", default: 0.5, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, inn = p.direction === "in", r = c.rng(p.seed * 6271 + (inn ? 3 : 11));
  const D = p.duration, nd = c.seconds(D, sr), n = c.seconds(D + (p.tail ? 0.65 : 0.04), sr), out = new Float32Array(n);
  const N = 4096, tab = new Float32Array(N + 1);
  for (let i = 0; i <= N; i++) tab[i] = Math.sin(c.TAU * i / N);
  const shape = (u) => {
    if (inn) { const a = Math.min(1, u / 0.8); return a * Math.sqrt(a) * Math.min(1, (1 - u) / 0.12); }
    const v = u < 0.22 ? 1 : 1 - (u - 0.22) / 0.78; return Math.min(1, u / 0.04) * v * Math.sqrt(v);
  };
  const e = new Float32Array(nd), b = new Float32Array(nd), gl = new Float32Array(nd), sc = new Float32Array(nd);
  for (let i = 0; i < nd; i++) {
    const u = i / nd; e[i] = shape(u); b[i] = Math.sin(Math.PI * u); sc[i] = inn ? 1 - u : u;
    gl[i] = inn ? 1 + (1 - u) * (1 - u) : 1 + 0.9 * u * u;
  }
  const base = 196 * Math.pow(2, (r() - 0.5) * 0.3), sw = 0.05 + 0.95 * p.swell;
  for (const [h, a] of [[1, 1], [2, 0.6], [3, 0.45], [4, 0.3], [5, 0.3], [8, 0.2]]) for (let v = 0; v < 2; v++) {
    const det = 1 + (v ? 1 : -1) * (0.002 + r() * 0.004), vr = (0.3 + r()) / sr, vd = 0.002 + 0.003 * r(), tr = (6 + 9 * r()) / sr;
    const f0 = base * h * det / sr, amp = a * (h === 1 ? 1 : sw) * 0.2, td = 0.6 * p.sparkle;
    let ph = r(), vp = r(), tp = r();
    for (let i = 0; i < nd; i++) {
      vp += vr; if (vp >= 1) vp -= 1;
      tp += tr; if (tp >= 1) tp -= 1;
      ph += f0 * gl[i] * (1 + vd * (1 + 5 * sc[i]) * tab[(vp * N) | 0]); if (ph >= 1) ph -= 1;
      const bloom = h === 1 ? 1 : 0.2 + 0.8 * b[i] * (0.2 + 0.8 * p.swell);
      out[i] += amp * bloom * e[i] * tab[(ph * N) | 0] * (1 - td * (0.5 + 0.5 * tab[(tp * N) | 0]));
    }
  }
  const x = c.noise(r, nd), fa = inn ? 6000 : 800, fb = inn ? 800 : 6000, k = Math.pow(fb / fa, 1 / nd), q = 0.15;
  let f = fa, lo = 0, bd = 0;
  for (let i = 0; i < nd; i++) {
    const F = 2 * Math.sin(Math.PI * Math.min(f, sr * 0.22) / sr), hi = x[i] - lo - q * bd;
    bd += F * hi; lo += F * bd; f *= k;
    out[i] += bd * e[i] * (0.035 + 0.045 * p.sparkle);
  }
  const G = Math.round((40 + 260 * p.sparkle) * D), top = sr * 0.42;
  for (let g = 0; g < G; g++) {
    let t = r() * D, tries = 0;
    while (r() > shape(t / D) + 0.03 && tries++ < 10) t = r() * D;
    const s0 = Math.floor(t * sr), gi = Math.min(nd - 1, s0);
    const fq = Math.min(top, base * (12 + Math.floor(r() * 28)) * gl[gi] * (0.997 + r() * 0.006));
    const tau = 0.008 + r() * 0.022, len = Math.floor(tau * 3.5 * sr), att = Math.max(1, Math.floor((0.0005 + r() * 0.0015) * sr));
    const w = c.TAU * fq / sr, cw = 2 * Math.cos(w), dk = Math.exp(-1 / (tau * sr));
    let y1 = 0, y2 = -Math.sin(w), a = (0.1 + 0.16 * r()) * (0.4 + 0.6 * p.sparkle) * (0.3 + 0.7 * e[gi]);
    for (let j = 0; j < len && s0 + j < n; j++) {
      const y = cw * y1 - y2; y2 = y1; y1 = y;
      out[s0 + j] += y * a * (j < att ? j / att : 1); a *= dk;
    }
  }
  let res = out;
  if (p.tail) {
    const cm = [4, 6, 9].flatMap((m, i) => [[base * m, 1 / (i + 1)], [base * m * (1.002 + r() * 0.003), 0.7 / (i + 1)]]);
    const ch = c.ring(cm, 0.6, inn ? 0.18 : 0.1, sr), ca = Math.floor(0.006 * sr);
    for (let i = 0; i < ca && i < ch.length; i++) ch[i] *= i / ca;
    c.mix(out, ch, inn ? Math.max(0, D - 0.18 * D) : 0.03, inn ? 0.1 : 0.05, sr);
    res = c.reverb(out, { size: 0.7, decay: 0.5, mixAmt: 0.18 }, sr) || out;
  }
  c.finish(res, 0.9);
  c.fade(res, 20, sr);
  return { samples: res };
}
