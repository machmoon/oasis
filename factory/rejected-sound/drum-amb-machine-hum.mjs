// Idle drum machine hum: a mains-locked harmonic stack (40 lines, shaped per mains), a transformer buzz band pulsing at 2x mains, a fan flutter, faint sequencer clock ticks, hiss, and soft clustered dust crackle. All periodic parts use whole cycles per 3 s so the bed wraps, and a final normalise keeps every take at the same level.
export const meta = {
  title: "Machine Idle Hum", kind: "ambience", format: "sound", duration: 3, price: 3, author: "stormfront", payout: "stormfront@creators.oasis.example", kit: "Drum Machine", description: "The idle mains hum, transformer buzz, sequencer clock tick, faint hiss and soft crackle of a powered-on analogue drum machine, loopable for studio rooms and gear-shelf beds.",
  tags: ["hum", "mains", "transformer", "buzz", "analogue", "drum machine", "loop", "studio"],
};
export const params = { knobs: {
  mains: { type: "choice", label: "Mains", default: "50Hz", options: ["50Hz", "60Hz"] },
  hum: { type: "range", label: "Hum", default: 0.6, min: 0, max: 1, step: 0.01 },
  hiss: { type: "range", label: "Hiss", default: 0.4, min: 0, max: 1, step: 0.01 },
  crackle: { type: "range", label: "Crackle", default: 0.4, min: 0, max: 1, step: 0.01 },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + 29), dur = 3, n = c.seconds(dur, sr), out = new Float32Array(n);
  const is60 = p.mains === "60Hz", f0 = is60 ? 60 : 50, T = c.TAU, M = 512;
  const humT = new Float32Array(M), buzT = new Float32Array(M);
  for (let h = 1; h <= 40; h++) {
    const even = h % 2 === 0;
    let a = (is60 ? (even ? 0.55 : 0.9) : (even ? 1 : 0.45)) / Math.pow(h, is60 ? 0.7 : 0.9);
    if (h === (is60 ? 3 : 2)) a *= 1.8;
    a *= 0.6 + 0.8 * r();
    const ph = r() * T;
    for (let k = 0; k < M; k++) humT[k] += a * Math.sin(T * h * k / M + ph);
  }
  const ctr = is60 ? 11 : 15;
  for (let h = 5; h <= 44; h++) {
    const g = Math.exp(-((h - ctr) * (h - ctr)) / 90), a = g * (0.3 + 0.7 * r()), ph = r() * T;
    for (let k = 0; k < M; k++) buzT[k] += a * Math.sin(T * h * k / M + ph);
  }
  const fl = 1 + Math.floor(r() * 3), flp = r() * T, fan = 3 + Math.floor(r() * 3);
  const nz = c.noise(r, n), gb = c.biquad("bp", f0 * (is60 ? 13 : 17), 4, sr);
  const hum = new Float32Array(n), bz = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const ph = f0 * i / sr, fr = (ph - Math.floor(ph)) * M, k = Math.floor(fr), q = fr - k, k2 = k + 1 === M ? 0 : k + 1;
    const hv = humT[k] * (1 - q) + humT[k2] * q, bv = buzT[k] * (1 - q) + buzT[k2] * q;
    const pulse = 0.3 + 0.7 * Math.abs(Math.sin(T * ph)), wob = 0.7 + 0.3 * Math.sin(T * fl * i / n + flp);
    const fan_ = 1 + 0.12 * Math.sin(T * fan * i / n) * Math.sin(T * 2 * i / n + 1);
    hum[i] = hv * (1 + 0.05 * Math.sin(T * fl * i / n + flp)) * fan_;
    bz[i] = (bv * 0.8 + gb(nz[i]) * 1.4) * pulse * wob;
  }
  c.mix(out, hum, 0, 0.1 + 0.5 * p.hum, sr);
  c.mix(out, bz, 0, 0.03 + 0.2 * p.hum, sr);
  const ticks = 12;
  for (let k = 0; k < ticks; k++) {
    const t = (k + 0.02 * r()) * dur / ticks + 0.01, acc = k % 4 === 0 ? 1 : 0.55;
    c.mix(out, c.burst(r, 0.006, "bp", 2800 + 1200 * r(), 3, 0.0004, 0.0018, sr), t, 0.1 * acc, sr);
    c.mix(out, c.ring([[1100 + 40 * r(), 1]], 0.02, 0.004, sr), t, 0.03 * acc, sr);
  }
  const hs = c.pink(r, n), wh = c.noise(r, n), hp = c.biquad("hp", 3000, 0.7, sr), lp = c.biquad("lp", 12000, 0.7, sr), hp2 = c.biquad("hp", 6000, 0.7, sr);
  for (let i = 0; i < n; i++) hs[i] = lp(hp(hs[i])) + 0.5 * hp2(wh[i]);
  c.mix(out, hs, 0, 0.01 + 0.14 * p.hiss, sr);
  const pops = Math.round(p.crackle * 110);
  for (let d = 0; d < pops; d++) {
    const t0 = r() * (dur - 0.08), cl = 1 + (r() < 0.5 ? Math.floor(r() * 4) : 0), lvl = Math.pow(r(), 2);
    for (let k = 0; k < cl; k++) {
      const t = t0 + k * (0.001 + r() * 0.008), f = 1800 + r() * 5500;
      c.mix(out, c.burst(r, 0.002 + r() * 0.005, "bp", f, 1 + r() * 2.5, 0.0004, 0.001 + r() * 0.002, sr), t, (0.04 + 0.2 * lvl) * (0.5 + 0.5 * p.crackle) * (0.5 + 0.5 * r()), sr);
    }
    if (lvl > 0.7) c.mix(out, c.ring([[250 + r() * 300, 1]], 0.04, 0.01, sr), t0, 0.05 * p.crackle, sr);
  }
  c.fade(c.finish(out, 0.78, 1.15), 15, sr);
  return { samples: out };
}
