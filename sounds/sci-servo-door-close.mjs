// Servo door close: a geared motor whine whose pitch arcs with an accelerate-then-brake travel profile, roller stick-slip grit and a track rumble, a pneumatic seal hiss, then the seal thunk (detuned body modes, a sub thump, latch bolts) and an optional bay reverb.
export const meta = {
  title: "Servo Door Close", kind: "sfx", format: "sound", duration: 1.2, price: 3, author: "quietmachine", payout: "quietmachine@creators.oasis.example", kit: "Sci-fi Console", description: "A starship sliding door running shut on its servo and sealing with a pneumatic hiss and a heavy thunk. It works for hatches, corridor doors and blast doors in sci-fi games and film.",
  tags: ["door", "sci-fi", "servo", "hiss", "seal", "starship", "mechanical", "close"],
};
export const params = { knobs: {
  size: { type: "choice", label: "Size", default: "door", options: ["hatch", "door", "blast-door"] },
  speed: { type: "range", label: "Speed", default: 1, min: 0.6, max: 1.8, step: 0.05 },
  hiss: { type: "range", label: "Hiss", default: 0.5, min: 0, max: 1, step: 0.01 },
  seal: { type: "range", label: "Seal weight", default: 0.5, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Bay tail", default: false },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, si = Math.max(0, params.knobs.size.options.indexOf(p.size)), r = c.rng(p.seed * 7717 + si * 101 + 3);
  const S = [
    { travel: 0.38, motor: 560, grit: 3600, rate: 1.3, rumble: 0.03, modes: [[190, 1], [430, 0.5], [960, 0.25]], dec: 0.04, room: 0.35, bolts: 1 },
    { travel: 0.62, motor: 320, grit: 2300, rate: 1, rumble: 0.06, modes: [[105, 1], [248, 0.55], [590, 0.25]], dec: 0.07, room: 0.55, bolts: 1 },
    { travel: 1.05, motor: 150, grit: 1200, rate: 0.75, rumble: 0.12, modes: [[52, 1], [118, 0.7], [275, 0.35], [640, 0.15]], dec: 0.14, room: 0.85, bolts: 3 },
  ][si];
  const sp = p.speed, w = p.seal, T = S.travel / sp, t0 = 0.015, tc = t0 + T;
  const post = 0.22 + 2.2 * S.dec * (0.6 + 0.8 * w) + 0.3 * p.hiss + (S.bolts - 1) * 0.08;
  const out = new Float32Array(c.seconds(tc + post + (p.tail ? 0.35 + 0.7 * S.room : 0), sr));
  const vel = (u) => (u <= 0 || u >= 1 ? 0 : Math.sin(Math.PI * (0.04 + 0.92 * Math.pow(u, 0.75))));
  {
    const n = c.seconds(T + 0.02, sr), m = new Float32Array(n), lp = c.onepole(sr);
    const wr = 5 + r() * 4, ph0 = r() * c.TAU, base = S.motor * (0.8 + 0.2 * sp) * (0.97 + r() * 0.06);
    let ph = 0, ph2 = 0;
    for (let i = 0; i < n; i++) {
      const t = i / sr, v = vel(Math.min(0.999, t / T));
      const f = base * (0.35 + 0.75 * v) * (1 + 0.012 * Math.sin(c.TAU * wr * t + ph0));
      ph = (ph + f / sr) % 1; ph2 = (ph2 + 2.01 * f / sr) % 1;
      const s = lp(2 * ph - 1, 900 + 2600 * v) + 0.3 * Math.sin(c.TAU * ph2);
      m[i] = s * (0.2 + 0.8 * v) * Math.min(1, t / 0.005) * Math.min(1, (n - i) / (0.01 * sr));
    }
    c.mix(out, m, t0, 0.13, sr);
  }
  {
    const n = c.seconds(T, sr), b = c.brown(r, n), lp = c.biquad("lp", 160 + 120 * sp, 0.8, sr);
    for (let i = 0; i < n; i++) b[i] = lp(b[i]) * vel(i / n) * 3;
    c.mix(out, b, t0, S.rumble, sr);
    let t = 0.005;
    while (t < T) {
      const v = vel(t / T), rate = (35 + 55 * sp) * S.rate * (0.25 + v);
      c.mix(out, c.burst(r, 0.003 + r() * 0.006, "bp", S.grit * (0.7 + 0.6 * r()), 3 + r() * 4, 0.0004, 0.0015, sr), t0 + t, (0.03 + 0.07 * r()) * (0.3 + v), sr);
      t += (0.4 + r() * 1.2) / rate;
    }
  }
  {
    const pre = Math.min(0.25, T * 0.4), tau = 0.06 + 0.35 * p.hiss, n = c.seconds(pre + tau * 5, sr);
    const x = c.noise(r, n), hi = c.onepole(sr), lo = c.onepole(sr), np = c.seconds(pre, sr);
    for (let i = 0; i < n; i++) {
      const after = (i - np) / sr;
      const e = after < 0 ? 0.3 * (i / np) : Math.min(1, after / 0.004) * (0.6 * Math.exp(-after / (tau * 0.3)) + 0.4 * Math.exp(-after / tau));
      const fc = after < 0 ? 6000 : 9500 - 6500 * Math.min(1, after / (tau * 3));
      const y = hi(x[i], fc);
      x[i] = (y - lo(y, 1200 + 600 * si)) * (after < 0 ? e : e * 2.4) * Math.min(1, (n - i) / (0.01 * sr));
    }
    c.mix(out, x, tc - pre, 0.03 + 0.75 * p.hiss, sr);
  }
  {
    const k = 1 - 0.15 * w, gw = 0.85 + 0.7 * w;
    c.mix(out, c.burst(r, 0.015, "lp", 2600 - 600 * si, 0.8, 0.0008, 0.004, sr), tc, 0.6 + 0.3 * w, sr);
    c.mix(out, c.ring(S.modes.map(([f, a]) => [f * k * (0.97 + r() * 0.06), a]), S.dec * 6, S.dec * (0.6 + 0.8 * w), sr), tc + 0.001, gw, sr);
    const n = c.seconds(0.08 + 0.25 * w + S.dec, sr), f0 = S.modes[0][0] * k, sub = new Float32Array(n), td = 0.05 + 0.12 * w;
    let ph = 0;
    for (let i = 0; i < n; i++) { const t = i / sr; ph += c.TAU * f0 * (0.8 + 0.8 * Math.exp(-t / 0.03)) / sr; sub[i] = Math.sin(ph) * Math.exp(-t / td) * Math.min(1, t / 0.002); }
    c.mix(out, sub, tc, 0.35 + 0.6 * w, sr);
    let tb = tc + 0.05 + r() * 0.02;
    for (let b = 0; b < S.bolts; b++) {
      const q = (0.9 + r() * 0.2) * (1 - 0.12 * si);
      c.mix(out, c.burst(r, 0.006, "hp", 3000, 0.8, 0.0004, 0.0012, sr), tb, 0.18, sr);
      c.mix(out, c.ring([[2300 * q, 1], [2306 * q, 0.8], [3850 * q, 0.5], [6100 * q, 0.25]], 0.12, 0.018 + 0.01 * r(), sr), tb + 0.0005, 0.16 + 0.06 * r(), sr);
      tb += 0.06 + r() * 0.035;
    }
  }
  if (p.tail) {
    const rv = c.reverb(out, { size: S.room, decay: 0.35 + 0.5 * S.room, mixAmt: 0.3 }, sr);
    if (rv && rv !== out) out.set(rv.length > out.length ? rv.subarray(0, out.length) : rv);
  }
  c.finish(out, 0.9, 1.1);
  c.gain(out, 0.65 + 0.35 * w);
  c.fade(out, 10, sr);
  return { samples: out };
}
