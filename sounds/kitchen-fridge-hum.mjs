// Fridge hum: a seamless compressor bed: whole-cycle harmonic motor hum, a looped noise bed and fan hiss, a per-cycle jittered panel-buzz rattle, and coolant bubble clusters spread evenly and wrapped across the seam.
export const meta = {
  title: "Fridge Hum", kind: "ambience", format: "sound", duration: 3, price: 3, author: "stormfront", payout: "stormfront@creators.oasis.example", kit: "Kitchen", description: "A loopable refrigerator compressor bed. Knobs set an old or modern compressor, the hum pitch, the motor rattle, the coolant gurgle and the loop length, for kitchens, flats and late-night interiors.",
  tags: ["fridge", "hum", "compressor", "kitchen", "ambience", "loop", "appliance", "room-tone"],
};
export const params = { knobs: {
  type: { type: "choice", label: "Compressor", default: "old", options: ["old", "modern"] },
  pitch: { type: "range", label: "Hum pitch (Hz)", default: 50, min: 40, max: 120, step: 1 },
  rattle: { type: "range", label: "Motor rattle", default: 0.35, min: 0, max: 1, step: 0.01 },
  gurgle: { type: "range", label: "Coolant gurgle", default: 0.3, min: 0, max: 1, step: 0.01 },
  loop: { type: "range", label: "Loop length (s)", default: 3, min: 2, max: 4, step: 0.5 },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, old = p.type === "old", r = c.rng(p.seed * 613 + (old ? 29 : 3)), T = c.TAU;
  const n = Math.round(p.loop * sr), L = n / sr, out = new Float32Array(n);
  const q = (f) => Math.max(1, Math.round(f * L)) / L;
  const wrap = (buf, at, g) => { const s = Math.floor(at * sr); for (let j = 0; j < buf.length; j++) out[(s + j) % n] += buf[j] * g; };
  const loopNoise = (src, fn) => {
    const x = Math.round(0.25 * sr), b = c.filter(src(r, n + x), fn), o = new Float32Array(n);
    for (let i = 0; i < n; i++) { if (i < x) { const a = i / x * Math.PI / 2; o[i] = b[i] * Math.sin(a) + b[n + i] * Math.cos(a); } else o[i] = b[i]; }
    return o;
  };
  const f0 = q(p.pitch), cyc = Math.round(f0 * L);
  const harm = old ? [[1, 1], [2, 0.8], [3, 0.45], [4, 0.25], [5, 0.18], [6, 0.1], [7, 0.08]] : [[1, 0.55], [2, 0.5], [3, 0.2], [4, 0.1], [6, 0.04]];
  const fmK = 1 + Math.floor(r() * 2), fmPh = r() * T, beta = old ? 0.5 + r() * 0.4 : 0.06 + r() * 0.05;
  const amK = 1 + Math.floor(r() * 3), amPh = r() * T, amD = old ? 0.1 + r() * 0.06 : 0.04;
  const whineF = q(1600 + r() * 1100), whineK = 1 + Math.floor(r() * 2);
  const rotK = 1 + Math.floor(r() * 3), rotPh = r() * T;
  const cg = new Float32Array(cyc);
  for (let k = 0; k < cyc; k++) cg[k] = r() < 0.18 ? 0.15 * r() : 0.45 + 0.55 * r();
  const buzz = p.rattle > 0 ? loopNoise(c.noise, c.biquad("bp", (old ? 1500 : 2600) + r() * 2000, old ? 1.1 : 2, sr)) : null;
  const rattleG = 2 * p.rattle * (old ? 1 : 0.5), gp = old ? 6 : 10;
  for (let i = 0; i < n; i++) {
    const t = i / sr, ph = T * f0 * t + beta * Math.sin(T * fmK * t / L + fmPh);
    let s = 0;
    for (let h = 0; h < harm.length; h++) s += Math.sin(ph * harm[h][0]) * harm[h][1];
    s = old ? Math.tanh(1.6 * s) : s * 0.6;
    s *= 1 + amD * Math.sin(T * amK * t / L + amPh);
    if (!old) s += 0.09 * Math.sin(T * whineF * t) * (0.6 + 0.4 * Math.sin(T * whineK * t / L));
    if (buzz) {
      const k = ((Math.floor(ph / T) % cyc) + cyc) % cyc;
      const gate = Math.pow(Math.max(0, Math.sin(ph)), gp), sw = 0.5 + 0.5 * Math.sin(T * rotK * t / L + rotPh);
      s += buzz[i] * gate * cg[k] * (0.3 + 0.7 * sw * sw) * rattleG;
    }
    out[i] += s * 0.45;
  }
  const bed = loopNoise(c.pink, c.biquad("lp", old ? 260 : 700, 0.7, sr));
  for (let i = 0; i < n; i++) out[i] += bed[i] * (old ? 0.13 : 0.06);
  if (!old) {
    const fan = loopNoise(c.pink, c.biquad("bp", 1800 + r() * 800, 0.6, sr)), fk = 1 + Math.floor(r() * 3), fph = r() * T;
    for (let i = 0; i < n; i++) out[i] += fan[i] * 0.09 * (0.85 + 0.15 * Math.sin(T * fk * i / n + fph));
  }
  const ticks = Math.round(p.rattle * L * (old ? 16 : 8));
  for (let k = 0; k < ticks; k++) wrap(c.burst(r, 0.004 + r() * 0.008, "bp", 1800 + r() * 4500, 1 + r() * 2, 0.0004, 0.001 + r() * 0.003, sr), r() * L, (0.1 + 0.28 * r()) * p.rattle, sr);
  if (p.gurgle > 0) {
    const clusters = 1 + Math.floor(p.gurgle * 4), per = Math.round(3 + p.gurgle * 10), off = r();
    for (let k = 0; k < clusters; k++) {
      const at = ((k + off + 0.6 * r()) / clusters) * L, spread = 0.15 + r() * 0.3;
      for (let b = 0; b < per; b++) {
        const f = (old ? 240 : 380) + r() * 800, tau = 0.012 + r() * 0.03, rise = 0.4 + r() * 1.2;
        const m = c.seconds(tau * 6, sr), buf = new Float32Array(m), k2 = Math.exp(-1 / (tau * sr));
        let ph = 0, e = 1;
        for (let j = 0; j < m; j++) { const t = j / sr; ph += T * f * (1 + rise * t / (tau * 6)) / sr; buf[j] = Math.sin(ph) * e * Math.min(1, t / 0.0012); e *= k2; }
        wrap(buf, at + Math.pow(r(), 1.5) * spread, (0.06 + 0.14 * r()) * p.gurgle, sr);
      }
    }
    const trickle = loopNoise(c.noise, c.biquad("bp", 900 + r() * 500, 0.9, sr)), tk = 1 + Math.floor(r() * 2), tph = r() * T;
    for (let i = 0; i < n; i++) { const sw = 0.5 + 0.5 * Math.sin(T * tk * i / n + tph); out[i] += trickle[i] * sw * sw * 0.06 * p.gurgle; }
  }
  c.finish(out, 0.8);
  return { samples: out };
}
