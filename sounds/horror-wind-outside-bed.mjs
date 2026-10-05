// Wind around a house exterior: a gust-driven low bed, gliding sine whistles through cracks, and rain ticks on cladding; the loop is period-locked and crossfaded. Modulators run at control rate to keep rendering cheap.
export const meta = {
  title: "Haunted Wind Outside", kind: "ambience", format: "sound", duration: 4, price: 4, author: "stormfront", payout: "stormfront@creators.oasis.example", kit: "Horror House",
  description: "A loopable four seconds of wind moaning around an abandoned house, with swelling gusts, thin gliding whistles through cracks and optional rain; for exterior beds in horror scenes.",
  tags: ["wind", "ambience", "horror", "house", "exterior", "whistle", "rain", "loop"],
};
export const params = { knobs: {
  exposure: { type: "choice", label: "Exposure", default: "open", options: ["sheltered", "open"] },
  gust: { type: "range", label: "Gust strength", default: 0.6, min: 0, max: 1, step: 0.01 },
  whistle: { type: "range", label: "Whistle", default: 0.5, min: 0, max: 1, step: 0.01 },
  rain: { type: "range", label: "Rain", default: 0.2, min: 0, max: 1, step: 0.01 },
  loop: { type: "toggle", label: "Seamless loop", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + 11), dur = 4, n = c.seconds(dur, sr), x = c.seconds(0.4, sr), m = n + x;
  const out = new Float32Array(m), open = p.exposure === "open", T = c.TAU, K = 64;
  const ph1 = r() * T, ph2 = r() * T, ph3 = r() * T;
  const np = Math.ceil(m / K) + 2, pts = new Float32Array(np);
  for (let j = 0; j < np; j++) {
    const t = j * K / sr, a = 0.5 + 0.5 * Math.sin(T * t / dur + ph1), b = 0.5 + 0.5 * Math.sin(2 * T * t / dur + ph2), d = 0.5 + 0.5 * Math.sin(3 * T * t / dur + ph3);
    pts[j] = 0.12 + p.gust * (open ? 1.15 : 0.55) * (0.5 * a * a + 0.3 * b + 0.2 * d * d);
  }
  const env = new Float32Array(m);
  for (let i = 0; i < m; i++) { const j = (i / K) | 0, f = i / K - j; env[i] = pts[j] * (1 - f) + pts[j + 1] * f; }
  const bed = c.pink(r, m), l1 = c.onepole(sr), l2 = c.onepole(sr);
  for (let i = 0; i < m; i++) { const e = env[i], cut = (open ? 240 : 120) + e * (open ? 900 : 360); bed[i] = l2(l1(bed[i], cut), cut * 1.3) * e * (open ? 2.6 : 2.2); }
  c.mix(out, bed, 0, 0.8, sr);
  const hiss = c.noise(r, m), hb = c.biquad("bp", open ? 2600 : 1300, 0.8, sr);
  for (let i = 0; i < m; i++) hiss[i] = hb(hiss[i]) * env[i] * env[i] * (open ? 0.5 : 0.18);
  c.mix(out, hiss, 0, 0.5, sr);
  if (p.whistle > 0.02) {
    const base = open ? [760, 1210, 1830] : [430, 690, 1010], amp = [0.5, 0.36, 0.22];
    base.forEach((f0, k) => {
      const w = new Float32Array(m), br = c.noise(r, m), bf = c.biquad("bp", f0 * 1.5, 14, sr), vp = r() * T, thr = 0.28 + 0.14 * k;
      let ph = r() * T, inc = T * f0 / sr;
      for (let i = 0; i < m; i++) {
        const g = env[i];
        if (i % K === 0) { const t = i / sr; inc = T * f0 * (1 + 0.22 * (g - 0.4) + 0.025 * Math.sin(T * (k + 2) * t / dur + vp)) * (1 + 0.006 * Math.sin(T * 5.5 * t)) / sr; }
        ph += inc;
        const s = Math.max(0, g - thr), gate = Math.min(1, s * 3);
        w[i] = (Math.sin(ph) + 0.5 * bf(br[i])) * gate * gate * amp[k];
      }
      c.mix(out, w, 0, p.whistle * (open ? 0.9 : 0.55), sr);
    });
  }
  if (p.rain > 0.02) {
    const drops = Math.round((50 + 420 * p.rain) * m / n);
    for (let d = 0; d < drops; d++)
      c.mix(out, c.burst(r, 0.004 + r() * 0.006, "bp", 2200 + r() * 3500, 3, 0.0003, 0.001 + r() * 0.002, sr), r() * (dur + 0.37), (0.1 + 0.4 * r()) * (0.3 + 0.7 * p.rain), sr);
    const sh = c.noise(r, m), hp = c.biquad("hp", 3500, 0.7, sr);
    for (let i = 0; i < m; i++) sh[i] = hp(sh[i]);
    c.mix(out, sh, 0, 0.05 * p.rain, sr);
  }
  const res = new Float32Array(n);
  if (p.loop) {
    for (let i = 0; i < n; i++) {
      if (i < x) { const a = Math.PI / 2 * i / x; res[i] = out[i] * Math.sin(a) + out[n + i] * Math.cos(a); } else res[i] = out[i];
    }
    c.finish(res, 0.8, 1.1);
    c.fade(res, 12, sr);
  } else {
    for (let i = 0; i < n; i++) { const t = i / sr; res[i] = out[i] * Math.min(1, t / 0.35) * Math.min(1, (dur - t) / 0.6); }
    c.finish(res, 0.8, 1.1);
    c.fade(res, 15, sr);
  }
  return { samples: res };
}
