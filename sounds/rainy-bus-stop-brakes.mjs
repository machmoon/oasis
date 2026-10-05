// Bus pull-in: a harmonic engine comb revving down over wet tyre hiss, then pad grind with a stick-slip squeal, puddle sheets with droplet chirps, a body rock and a pneumatic air dump, and an optional kneel hiss with street reflections.
export const meta = {
  title: "Wet Bus Arrival", kind: "sfx", format: "sound", duration: 3.5, price: 3, author: "foleyroom", payout: "foleyroom@creators.oasis.example", kit: "Rainy City Street", description: "A city bus slowing to a stop on a rain-soaked street, with wet brakes, puddle splashes and a pneumatic air dump, for downtown night scenes and bus stops.",
  tags: ["bus", "brakes", "air-brake", "squeal", "rain", "street", "vehicle", "splash"],
};
export const params = { knobs: {
  size: { type: "choice", label: "Bus size", default: "standard", options: ["mini", "standard", "articulated"] },
  squeal: { type: "range", label: "Brake squeal", default: 0.5, min: 0, max: 1, step: 0.01 },
  air: { type: "range", label: "Air release", default: 0.6, min: 0, max: 1, step: 0.01 },
  splash: { type: "range", label: "Splash", default: 0.5, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Kneel + street tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, TAU = c.TAU, r = c.rng(p.seed * 6271 + params.knobs.size.options.indexOf(p.size) * 97 + 3);
  const S = {
    mini: { f0: 74, T: 1.2, ax: [0, 0.3], sq: 3300, air: 0.6, lo: 0.5, br: 1.2, rock: [[420, 1], [1150, 0.4]] },
    standard: { f0: 50, T: 1.5, ax: [0, 0.5], sq: 2500, air: 0.8, lo: 0.8, br: 1, rock: [[95, 1], [215, 0.45]] },
    articulated: { f0: 40, T: 1.8, ax: [0, 0.45, 1.0], sq: 1900, air: 1, lo: 1, br: 0.8, rock: [[140, 1], [330, 0.5], [870, 0.25]] },
  }[p.size];
  const ss = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
  const sq = p.squeal, air = p.air, spl = p.splash, T = S.T * (0.95 + 0.1 * r());
  const ta = T + 0.12 + 0.06 * r(), L = (0.3 + 0.7 * air) * S.air;
  const total = Math.min(3.85, ta + L + (p.tail ? 0.75 : 0.25)), n = c.seconds(total, sr), out = new Float32Array(n);
  const vAt = (t) => Math.max(0, 1 - t / T);
  const eng = new Float32Array(n), tyre = c.noise(r, n), nz = c.noise(r, n);
  const rough = c.onepole(sr), elp = c.onepole(sr), tlp = c.onepole(sr), thp = c.biquad("hp", 220, 0.7, sr);
  const engEnd = p.tail ? total - 0.1 : ta + 0.25;
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr, v = vAt(t);
    ph = (ph + TAU * S.f0 * (0.6 + 0.8 * v) / sr) % TAU;
    const fire = 0.75 + 0.5 * c.clamp(rough(nz[i], 40) * 6, -1, 1);
    const amp = ss(t / 0.5) * (0.45 + 0.55 * v) * ss((engEnd - t) / 0.2) * (p.tail && t > ta ? Math.exp(-(t - ta) / 0.6) : 1);
    const s = Math.sin(ph) + 0.6 * Math.sin(2 * ph) + 0.45 * Math.sin(3 * ph) + 0.25 * Math.sin(4 * ph) + 0.12 * Math.sin(6 * ph);
    eng[i] = elp(s * fire, 250 + 500 * v) * amp;
    tyre[i] = tlp(thp(tyre[i]), 600 + 3800 * v * S.br) * ss(t / 0.5) * Math.sqrt(v);
  }
  c.mix(out, eng, 0, 0.5 * S.lo, sr);
  c.mix(out, tyre, 0, 0.28, sr);
  const t0 = T * (0.62 - 0.3 * sq), fric = c.biquad("bp", 1100, 1.6, sr), nb = c.noise(r, n);
  const wr = 3 + 4 * r(), wp = r() * TAU, fs0 = S.sq * (0.94 + 0.12 * r()), sqa = 0.5 * Math.sqrt(sq);
  let sph = 0, cph = 0;
  for (let i = Math.floor(t0 * sr); i < Math.min(n, Math.floor((T + 0.3) * sr)); i++) {
    const t = i / sr, v = vAt(t), g = ss((t - t0) / (T - t0)) * (t < T ? 1 : Math.exp(-(t - T) / 0.05));
    out[i] += fric(nb[i]) * g * 0.35 * (0.5 + 0.5 * S.lo);
    sph = (sph + TAU * fs0 * (1 + 0.025 * Math.sin(TAU * wr * t + wp) + 0.06 * (1 - v)) / sr) % TAU;
    cph = (cph + TAU * (10 + 28 * v) / sr) % TAU;
    const am = 1 - 0.85 * (1 - v) * (0.5 + 0.5 * Math.sin(cph));
    out[i] += (Math.sin(sph) + 0.4 * sq * Math.sin(2 * sph) + 0.2 * sq * Math.sin(3 * sph)) * g * am * sqa;
  }
  const drop = (at) => {
    const f0 = 700 + r() * 2600, m = c.seconds(0.012 + r() * 0.03, sr), b = new Float32Array(m), k = 1 + 0.8 * r();
    let q = 0;
    for (let i = 0; i < m; i++) { const x = i / m; q += TAU * f0 * (1 + k * x) / sr; b[i] = Math.sin(q) * Math.min(1, i / (0.001 * sr)) * (1 - x) * Math.exp(-4 * x); }
    c.mix(out, b, at, (0.05 + 0.12 * r()) * spl, sr);
  };
  if (spl > 0) {
    const tp = T * (0.3 + 0.1 * r());
    for (const a of S.ax) {
      const ts = tp + a * (0.9 + 0.2 * r()), vs = vAt(ts);
      c.mix(out, c.burst(r, 0.3 + 0.2 * spl, "bp", 900 + 1100 * vs, 0.8, 0.01, 0.06 + 0.08 * spl, sr), ts, 0.7 * spl * (0.4 + 0.8 * vs), sr);
      c.mix(out, c.burst(r, 0.2, "lp", 500, 0.8, 0.006, 0.05, sr), ts, 0.4 * spl * S.lo, sr);
      const k = Math.round((12 + 40 * spl) * (0.5 + vs));
      for (let j = 0; j < k; j++) drop(ts + 0.01 + Math.pow(r(), 1.4) * (0.2 + 0.25 * spl));
    }
  }
  c.mix(out, c.ring(S.rock.map(([f, a]) => [f * (0.97 + 0.06 * r()), a]), 0.35, 0.07, sr), T + 0.02, 0.3, sr);
  c.mix(out, c.burst(r, 0.008, "hp", 2500, 0.7, 0.0005, 0.002, sr), ta - 0.01, 0.25 + 0.3 * air, sr);
  const hiss = (at, len, f, g) => {
    const m = c.seconds(len, sr), h = c.noise(r, m), hp = c.biquad("hp", f, 0.7, sr), pk = c.biquad("bp", f * 2, 1.2, sr), lp = c.onepole(sr);
    for (let i = 0; i < m; i++) { const x = i / m, y = hp(h[i]); h[i] = (lp(y, 9000 - 5500 * x) + 0.6 * pk(y)) * Math.min(1, i / (0.004 * sr)) * (0.55 * Math.exp(-i / sr / 0.07) + 0.45) * (1 - x) * (1 - x); }
    c.mix(out, h, at, g, sr);
  };
  if (air > 0) hiss(ta, L, 1200 / S.air, 1.1 * air);
  if (p.tail) {
    hiss(ta + L + 0.05, 0.45, 700, 0.3 + 0.25 * air);
    const dry = Float32Array.from(out);
    for (const [d, g] of [[0.11, 0.3], [0.23, 0.17]]) { const o = c.seconds(d, sr); for (let i = o; i < n; i++) out[i] += dry[i - o] * g; }
    const wet = new Float32Array(n);
    for (const d of [0.0297, 0.0371, 0.0411, 0.0437]) {
      const D = c.seconds(d * (0.97 + 0.06 * r()), sr), buf = new Float32Array(D); let k = 0, lp = 0;
      for (let i = 0; i < n; i++) { const y = buf[k]; lp += 0.35 * (y - lp); buf[k] = out[i] + lp * 0.72; k = (k + 1) % D; wet[i] += y * 0.25; }
    }
    for (let i = 0; i < n; i++) out[i] += wet[i] * 0.4;
    const fo = c.seconds(0.3, sr);
    for (let i = n - fo; i < n; i++) out[i] *= ss((n - i) / fo);
  }
  c.finish(out, 0.9);
  let pk = 0, last = 0;
  for (let i = 0; i < n; i++) pk = Math.max(pk, Math.abs(out[i]));
  for (let i = n - 1; i >= 0; i--) if (Math.abs(out[i]) > pk * 0.001) { last = i; break; }
  const trimmed = out.slice(0, Math.min(n, last + c.seconds(0.05, sr), c.seconds(3.9, sr)));
  c.fade(trimmed, 15, sr);
  return { samples: trimmed };
}
