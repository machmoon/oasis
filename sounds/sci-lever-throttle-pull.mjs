// Helm throttle: a lever shoved through ratcheting detents. A gliding stick-slip friction voice runs under per-detent ball clicks (pre-tick, drop, detuned modes, thump) and a hard end stop, with an optional servo-settle and bridge tail.
export const meta = {
  title: "Helm Throttle Push", kind: "foley", format: "sound", duration: 1.1, price: 2, author: "quietmachine", payout: "quietmachine@creators.oasis.example", kit: "Sci-fi Console", description: "A starship helm throttle lever pushed through ratcheting detents to a hard stop, with knobs for material, detent count, weight, friction and a servo tail, for bridge scenes and cockpit UI.",
  tags: ["lever", "throttle", "detent", "ratchet", "helm", "cockpit", "scifi", "mechanical"],
};
export const params = { knobs: {
  material: { type: "choice", label: "Material", default: "alloy", options: ["alloy", "composite"] },
  detents: { type: "range", label: "Detent count", default: 5, min: 2, max: 12, step: 1 },
  weight: { type: "range", label: "Weight", default: 0.5, min: 0, max: 1, step: 0.01 },
  friction: { type: "range", label: "Friction", default: 0.5, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Servo tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, alloy = p.material === "alloy", r = c.rng(p.seed * 6151 + (alloy ? 0 : 97) + 13);
  const w = p.weight, fr = p.friction, N = Math.round(p.detents);
  const start = 0.03, T = (0.42 + 0.38 * w + 0.02 * N) * (0.93 + 0.14 * r()), tailLen = p.tail ? 0.6 : 0.2;
  let out = new Float32Array(c.seconds(start + T + 0.05 + tailLen, sr));
  const norm = (b, g) => { let m = 1e-9; for (let i = 0; i < b.length; i++) m = Math.max(m, Math.abs(b[i])); for (let i = 0; i < b.length; i++) b[i] *= g / m; return b; };
  const n = c.seconds(T + 0.03, sr), slide = new Float32Array(n), hiss = c.noise(r, n), R = alloy ? 0.994 : 0.985;
  let ph = 0, g = 0, gt = 0, y1 = 0, y2 = 0;
  const base = (alloy ? 95 : 78) * (1 - 0.3 * w), res = (alloy ? 1500 : 980) * (1 - 0.3 * w);
  for (let i = 0; i < n; i++) {
    const t = i / sr, u = Math.min(1, t / T), speed = Math.sin(Math.PI * u);
    if (i % 256 === 0) gt = c.clamp(gt + (r() - 0.5) * 0.6, -1, 1);
    g += (gt - g) * 0.004;
    ph += (base * (0.5 + 0.9 * speed) * (1 + 0.3 * g) + 18) / sr;
    let x = hiss[i] * (alloy ? 0.06 : 0.08);
    if (ph >= 1) { ph -= 1; x += 0.6 + 0.4 * r(); }
    const f = res * (0.8 + 0.35 * speed + 0.12 * g), y = 2 * R * Math.cos(c.TAU * f / sr) * y1 - R * R * y2 + x;
    y2 = y1; y1 = y;
    slide[i] = y * (0.25 + 0.75 * speed) * Math.min(1, t / 0.015) * Math.min(1, (n - i) / (0.02 * sr));
  }
  c.mix(out, norm(slide, (0.07 + 0.3 * fr) * (alloy ? 1 : 0.75)), start, 1, sr);
  const detent = (t, amp, big) => {
    const f0 = (alloy ? 2100 : 1400) * (1 - 0.3 * w) * (0.92 + 0.16 * r()) * (big ? 0.7 : 1);
    c.mix(out, c.burst(r, 0.006, "bp", f0 * 1.8, 2, 0.0004, 0.0015, sr), t - 0.005 - 0.004 * r(), 0.22 * amp * (0.6 + 0.6 * fr), sr);
    c.mix(out, c.burst(r, 0.02, "bp", f0 * (alloy ? 2.2 : 2.4), alloy ? 1.2 : 1.5, 0.0005 + 0.0006 * r(), alloy ? 0.004 : 0.0025, sr), t, amp, sr);
    const d = 1 + (r() - 0.5) * 0.02;
    const modes = alloy
      ? [[f0, 1], [f0 * 1.007 * d, 0.7], [f0 * 2.76, 0.5 * r() + 0.2], [f0 * 2.79 * d, 0.35], [f0 * 5.1, 0.2]]
      : [[f0 * 0.8, 1], [f0 * 1.9 * d, 0.45], [f0 * 3.1, 0.12 * r() + 0.08]];
    c.mix(out, c.ring(modes, 0.18, alloy ? 0.025 + (big ? 0.05 : 0) : 0.009 + (big ? 0.012 : 0), sr), t + 0.0005, (alloy ? 0.45 : 0.4) * amp, sr);
    c.mix(out, c.ring([[(70 + 45 * (1 - w)) * d, 1], [(150 + 60 * (1 - w)), 0.3]], 0.15, 0.02 + 0.035 * w + (big ? 0.03 : 0), sr), t + 0.001, (0.15 + 0.55 * w) * amp * (alloy ? 1 : 0.65), sr);
  };
  for (let k = 0; k < N; k++) {
    const u = c.clamp((k + 0.5 + (r() - 0.5) * 0.35) / N, 0.02, 0.97);
    detent(start + T * Math.acos(1 - 2 * u) / Math.PI, 0.65 + 0.35 * r(), false);
  }
  const stop = start + T + 0.012;
  detent(stop, 1.5, true);
  if (p.tail) {
    const m = c.seconds(0.5, sr), f1 = (alloy ? 180 : 140) * (1 - 0.25 * w);
    const hum = c.osc("saw", (t) => f1 * (1.12 - 0.12 * Math.min(1, t / 0.25)), m, sr), lp = c.biquad("lp", alloy ? 900 : 700, 0.8, sr);
    const e = c.adsr(m, { attack: 0.02, sustain: 0.1, decay: 0.3, punch: 0.4 }, sr);
    for (let i = 0; i < m; i++) hum[i] = lp(hum[i]) * e[i] * (1 + 0.15 * Math.sin(c.TAU * 9 * i / sr));
    c.mix(out, norm(hum, 0.12), stop + 0.03, 1, sr);
    c.mix(out, c.burst(r, 0.05, "hp", 3000, 0.7, 0.003, 0.02, sr), stop + 0.05, 0.08, sr);
    const wet = c.reverb(out, { size: 0.45, decay: alloy ? 0.7 : 0.5, mixAmt: 0.18 }, sr);
    if (wet && wet.length) out = wet;
  }
  c.fade(c.finish(out, 0.9, 1.1), 12, sr);
  return { samples: out };
}
