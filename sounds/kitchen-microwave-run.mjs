// Microwave running: a seamless loop of transformer hum (whole-cycle harmonics), a crossfaded fan/air bed, turntable rumble, wrapped plate rattle and steam pops.
export const meta = {
  title: "Microwave Running", kind: "ambience", format: "sound", duration: 3, price: 3, author: "stormfront", payout: "stormfront@creators.oasis.example", kit: "Kitchen", description: "A loopable microwave-running bed of transformer hum, fan air and turntable rumble, with plate rattle and food pops, for kitchen scenes and late-night reheats.",
  tags: ["microwave", "kitchen", "hum", "appliance", "loop", "ambience", "turntable", "domestic"],
};
export const params = { knobs: {
  age: { type: "choice", label: "Unit age", default: "new", options: ["new", "old"] },
  hum: { type: "range", label: "Hum pitch (Hz)", default: 120, min: 80, max: 140, step: 1 },
  rattle: { type: "range", label: "Turntable rattle", default: 0.3, min: 0, max: 1, step: 0.01 },
  pops: { type: "range", label: "Food pop density", default: 0.3, min: 0, max: 1, step: 0.01 },
  loop: { type: "range", label: "Loop length (s)", default: 3, min: 2, max: 4, step: 0.1 },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, old = p.age === "old", r = c.rng(p.seed * 613 + (old ? 71 : 3));
  const N = c.seconds(p.loop, sr), Lr = N / sr, X = c.seconds(0.25, sr), M = N + X, T = c.TAU;
  const tone = new Float32Array(N);
  const q = f => Math.max(1, Math.round(f * Lr)) / Lr;
  const wrap = (src, t, g) => { const s = Math.floor(t * sr); for (let j = 0; j < src.length; j++) tone[(s + j) % N] += src[j] * g; };
  const f0 = q(p.hum * (0.99 + 0.02 * r()));
  const amps = old ? [1, 0.6, 0.45, 0.32, 0.24, 0.16] : [1, 0.32, 0.12, 0.06, 0.03, 0.015];
  const ph = amps.map(() => r() * T), wph = r() * T, rot = r() * T, gear = q(old ? 31 : 37);
  const wd = old ? 0.14 : 0.04, humG = old ? 0.3 : 0.24, rum = 0.25 + 0.45 * p.rattle + (old ? 0.25 : 0);
  for (let i = 0; i < N; i++) {
    const t = i / sr; let s = 0;
    for (let k = 0; k < 6; k++) s += amps[k] * Math.sin(T * f0 * (k + 1) * t + ph[k]);
    if (old) s = Math.tanh(1.8 * s + 0.2) - Math.tanh(0.2);
    const wob = 1 + wd * Math.sin(T * 2 * i / N + wph);
    const rotA = 0.5 + 0.5 * Math.sin(T * i / N + rot);
    tone[i] = s * humG * wob + Math.sin(T * gear * t) * 0.05 * rum * (0.6 + 0.4 * rotA);
  }
  const nb = new Float32Array(M), pk = c.pink(r, M), wn = c.noise(r, M), rp = c.pink(r, M);
  const fan = c.biquad("bp", old ? 380 : 540, old ? 1.4 : 0.8, sr), fan2 = c.biquad("lp", old ? 1800 : 3200, 0.7, sr);
  const ah = c.biquad("hp", 2500, 0.7, sr), al = c.biquad("lp", old ? 5000 : 8000, 0.7, sr);
  const rl = c.biquad("lp", old ? 90 : 130, 0.8, sr), rh = c.biquad("hp", 35, 0.7, sr), bz = c.biquad("bp", old ? 2600 : 3400, 2, sr);
  const fanW = q(old ? 3 : 5), bzA = old ? 0.12 : 0.03;
  for (let i = 0; i < M; i++) {
    const j = i % N, t = j / sr;
    const fw = 1 + (old ? 0.18 : 0.05) * Math.sin(T * fanW * t);
    const b = 0.5 + 0.5 * Math.sin(T * 2 * f0 * t), buzz = b * b * b * b;
    const rumA = 1 + 0.3 * Math.sin(T * j / N + rot);
    nb[i] = fan2(fan(pk[i])) * 0.55 * fw + al(ah(wn[i])) * 0.05 + rh(rl(rp[i])) * rum * 1.4 * rumA + bz(wn[i]) * buzz * bzA;
  }
  const out = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    if (i < X) { const w = i / X; out[i] = nb[i] * Math.sqrt(w) + nb[N + i] * Math.sqrt(1 - w); } else out[i] = nb[i];
  }
  const rate = p.rattle * (old ? 70 : 35), cand = Math.round(rate * Lr), cyc = old ? 2 : 1;
  for (let e = 0; e < cand; e++) {
    const t = r() * Lr, d = Math.max(0, Math.sin(T * cyc * t / Lr + rot));
    if (r() > 0.2 + 0.8 * d * d) continue;
    wrap(c.burst(r, 0.004 + r() * 0.005, "bp", c.between(r, 1400, 4800) * (old ? 0.8 : 1), 5 + r() * 4, 0.0004, 0.001 + r() * 0.003, sr), t, (0.2 + 0.6 * r()) * (0.4 + 0.6 * p.rattle));
    if (r() < 0.15) { const f = c.between(r, 700, 1100); wrap(c.ring([[f, 1], [f * 2.37, 0.5], [f * 3.91, 0.25]], 0.04, 0.006, sr), t, 0.14); }
  }
  const np = Math.round(p.pops * Lr * (2.5 + r()));
  for (let e = 0; e < np; e++) {
    const t = r() * Lr, a = 0.6 + 0.4 * r();
    wrap(c.burst(r, 0.03, "bp", c.between(r, 1800, 4500), 1.2, 0.0004, 0.004 + r() * 0.008, sr), t, 1.4 * a);
    wrap(c.burst(r, 0.06, "lp", 250 + r() * 200, 0.9, 0.001, 0.015, sr), t, 0.9 * a);
    const k = 2 + Math.floor(r() * 5);
    for (let g = 0; g < k; g++) wrap(c.burst(r, 0.006, "hp", c.between(r, 2500, 6000), 0.8, 0.0003, 0.0015, sr), t + 0.005 + r() * 0.08, 0.4 * a * r());
  }
  for (let i = 0; i < N; i++) out[i] += tone[i];
  c.finish(out, 0.85, 1.1);
  return { samples: out };
}
