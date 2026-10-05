// Kitchen tap turn: a handle stroke (lever swing or twist-and-regrip) with sweeping friction, stick-slip squeal and a stop click; water gushing in or choking off; a water-hammer knock and clip rattle in the pipe.
export const meta = {
  title: "Tap Turn Knock", kind: "foley", format: "sound", duration: 0.75, price: 1, author: "foleyroom", payout: "foleyroom@creators.oasis.example", kit: "Kitchen", description: "A kitchen tap handle turned on or off, with a squeaky valve and a water-hammer thunk in the pipe; for kitchen scenes, sinks and domestic foley.",
  tags: ["tap", "faucet", "kitchen", "pipe", "squeak", "valve", "water", "foley"],
};
export const params = { knobs: {
  handle: { type: "choice", label: "Handle", default: "lever", options: ["lever", "twist"] },
  direction: { type: "choice", label: "Direction", default: "on", options: ["on", "off"] },
  squeak: { type: "range", label: "Squeak", default: 0.5, min: 0, max: 1, step: 0.01 },
  thunk: { type: "range", label: "Pipe thunk", default: 0.6, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Pipe ring tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const lever = p.handle === "lever", on = p.direction === "on", sr = c.sr, PI = Math.PI;
  const r = c.rng(p.seed * 6151 + (lever ? 0 : 37) + (on ? 0 : 911) + 3), B = (lo, hi) => c.between(r, lo, hi);
  const strokes = lever ? [[0.003, B(0.11, 0.16)]] : (() => { const a = B(0.12, 0.17), g = B(0.05, 0.09); return [[0.003, a], [0.003 + a + g, B(0.1, 0.15)]]; })();
  const last = strokes[strokes.length - 1], mot = last[0] + last[1];
  const dur = mot + (on ? 0.42 : 0.32) + (p.tail ? 0.22 : 0.08), n = c.seconds(dur, sr), out = new Float32Array(n);
  const svf = (buf, fcFn, q, envFn) => {
    let lo = 0, bd = 0;
    for (let i = 0; i < buf.length; i++) {
      const f = 2 * Math.sin(PI * Math.min(fcFn(i), sr * 0.2) / sr), hi = buf[i] - lo - q * bd;
      bd += f * hi; lo += f * bd; buf[i] = bd * envFn(i);
    }
    return buf;
  };
  const fA = lever ? 2800 : 1100, fB = lever ? 4600 : 2000;
  strokes.forEach(([t0, len], k) => {
    const fn = c.seconds(len, sr); let chat = 1, tgt = 1;
    const fr = svf(c.noise(r, fn), (i) => { const x = i / fn; return on ? fA + (fB - fA) * x : fB + (fA - fB) * x; }, lever ? 0.45 : 0.25, (i) => {
      if (r() < (lever ? 70 : 160) / sr) tgt = 0.2 + r() * 0.8;
      chat += (tgt - chat) * 0.012; const x = i / fn;
      return chat * Math.min(1, i / (0.01 * sr)) * (x < 0.75 ? 1 : Math.max(0, (1 - x) / 0.25));
    });
    c.mix(out, fr, t0, lever ? 0.2 : 0.34, sr);
    const grains = Math.round(len * (lever ? B(40, 70) : B(150, 220)));
    for (let g = 0; g < grains; g++) c.mix(out, c.burst(r, 0.006, "bp", (lever ? 2000 : 900) + r() * 3000, 2 + r() * 4, 0.0003, 0.001 + r() * 0.002, sr), t0 + r() * len, (0.08 + 0.2 * r()) * (lever ? 0.6 : 1.1), sr);
    c.mix(out, c.burst(r, 0.01, "hp", lever ? 3800 : 2000, 0.8, 0.0004, 0.0018, sr), t0, k ? 0.25 : 0.4, sr);
    if (p.squeak > 0) {
      const sn = c.seconds(len * B(0.55, 0.8), sr), sq = new Float32Array(sn), f0 = lever ? B(1000, 1400) : B(520, 780);
      const a0 = on ? 1 : 1.3, a1 = on ? 1.35 : 0.95;
      let ph = 0, w = 0, am = 1, at = 1;
      for (let i = 0; i < sn; i++) {
        const x = i / sn; w = c.clamp(w + (r() - 0.5) * 0.004, -0.04, 0.04);
        if (r() < 110 / sr) at = 0.25 + r() * 0.75; am += (at - am) * 0.004;
        ph += c.TAU * f0 * (a0 + (a1 - a0) * x) * (1 + w) / sr;
        const s = Math.sin(ph) + 0.55 * Math.sin(2 * ph) + 0.35 * Math.sin(3 * ph) + 0.2 * Math.sin(4 * ph) + 0.1 * Math.sin(5 * ph);
        const e = Math.min(1, i / (0.01 * sr)) * (x < 0.7 ? 1 : ((1 - x) / 0.3) * ((1 - x) / 0.3));
        sq[i] = (s + (r() - 0.5) * 0.5 * p.squeak) * am * e;
      }
      c.mix(out, sq, t0 + len * B(0.1, 0.25), (0.25 + 0.3 * p.squeak) * p.squeak, sr);
    }
  });
  if (lever) {
    const j = B(0.94, 1.06);
    c.mix(out, c.ring([[2150 * j, 1], [3480 * j * B(0.98, 1.02), 0.6], [5310 * j, 0.35]], 0.05, 0.007, sr), mot, 0.4, sr);
    c.mix(out, c.burst(r, 0.008, "hp", 4000, 0.8, 0.0003, 0.0015, sr), mot, 0.55, sr);
  } else {
    c.mix(out, c.burst(r, 0.04, "lp", on ? 1400 : 600, 0.8, 0.001, 0.012, sr), mot, on ? 0.4 : 0.7, sr);
    c.mix(out, c.ring([[B(320, 380), 1], [B(870, 950), 0.3]], 0.03, 0.005, sr), mot, 0.35, sr);
  }
  const ws = on ? mot * 0.6 : 0, hold = mot + 0.12, wEnd = mot + 0.01;
  const wat = svf(c.pink(r, n), (i) => { const t = i / sr; return on ? 800 + 1800 * Math.min(1, Math.max(0, t - ws) / 0.15) : 2600 - 1900 * Math.min(1, t / wEnd); }, 0.65, (i) => {
    const t = i / sr;
    if (on) { if (t < ws) return 0; return Math.min(1, (t - ws) / 0.08) * (t < hold ? 1 : Math.exp(-(t - hold) / 0.08)); }
    const u = Math.max(0, 1 - Math.max(0, t - mot * 0.4) / (wEnd - mot * 0.4)); return Math.min(1, t / 0.005) * u * u;
  });
  c.mix(out, wat, 0, 0.35, sr);
  const dropSpan = on ? hold + 0.1 - ws : mot;
  for (let g = 0; g < 30; g++) c.mix(out, c.burst(r, 0.006, "bp", 1500 + r() * 3500, 3 + r() * 4, 0.0003, 0.0015, sr), ws + r() * dropSpan, 0.04 + 0.08 * r(), sr);
  if (p.thunk > 0) {
    const tk = on ? ws + B(0.03, 0.06) : mot + B(0.005, 0.02), s = p.thunk * (on ? 0.6 : 1), f0 = B(210, 300), pd = p.tail ? 0.045 : 0.018;
    const modes = [[1, 1], [2.31, 0.6], [3.87, 0.35], [6.12, 0.2]].map(([k, a]) => [f0 * k * B(0.96, 1.04), a]);
    c.mix(out, c.ring(modes, pd * 6, pd, sr), tk + 0.001, 0.55 * s, sr);
    c.mix(out, c.burst(r, 0.015, "lp", 2400, 0.7, 0.0005, 0.004, sr), tk, 0.6 * s, sr);
    c.mix(out, c.burst(r, 0.07, "lp", 220, 0.9, 0.002, 0.018, sr), tk, 1.1 * s, sr);
    let t = tk, gap = B(0.04, 0.07), a = 0.55; const k = 2 + Math.floor(r() * 2);
    for (let q = 0; q < k; q++) {
      t += gap; gap *= B(0.5, 0.7); a *= B(0.45, 0.65); const fc = B(700, 1200);
      c.mix(out, c.ring([[fc, 1], [fc * B(2.5, 2.9), 0.4]], 0.04, 0.006, sr), t, a * s * 0.6, sr);
      c.mix(out, c.burst(r, 0.006, "hp", 2500, 0.8, 0.0003, 0.0015, sr), t, a * s, sr);
    }
  }
  const res = p.tail ? c.reverb(out, { size: 0.3, decay: 0.35, mixAmt: 0.2 }, sr) : out;
  c.finish(res, 0.9);
  const tl = c.seconds(0.1, sr), L = res.length;
  for (let i = 0; i < tl; i++) { const g = i / tl; res[L - 1 - i] *= g * g; }
  c.fade(res, 3, sr);
  return { samples: res };
}
