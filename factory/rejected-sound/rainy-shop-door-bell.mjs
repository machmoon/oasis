// Café door: a muffled rain bed outside, latch click, push thump and hinge creak, a strap of small bells clattering on the swing, rain swelling bright through the open gap, then the close thump muffles it again; warmth sets the room.
export const meta = {
  title: "Café Door Bell", kind: "foley", format: "sound", duration: 2.9, price: 2, author: "foleyroom", payout: "foleyroom@creators.oasis.example", kit: "Rainy City Street", description: "A café door opening onto a rainy night: the latch clicks, the shop bells jingle, street rain swells in through the gap and is muffled again when the door thumps shut, for entering or leaving a warm interior.",
  tags: ["door", "bell", "cafe", "shop", "rain", "foley", "entrance", "jingle"],
};
export const params = { knobs: {
  bell: { type: "choice", label: "Bell", default: "brass", options: ["brass", "tin", "chime"] },
  force: { type: "range", label: "Door force", default: 0.5, min: 0, max: 1, step: 0.01 },
  swell: { type: "range", label: "Rain swell", default: 0.6, min: 0, max: 1, step: 0.01 },
  warmth: { type: "range", label: "Interior warmth", default: 0.5, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Room tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 6151 + params.knobs.bell.options.indexOf(p.bell) * 97 + 3);
  const f = p.force, sw = p.swell, w = p.warmth;
  const tL = 0.02, swing = 0.36 - 0.14 * f + r() * 0.05, hold = 0.65 + r() * 0.15, shut = 0.28 - 0.08 * f;
  const tS = tL + swing + hold, tC = tS + shut, rise = 0.45 + 0.25 * (1 - f);
  const len = tC + (p.tail ? 1.4 : 0.7), n = c.seconds(len, sr), out = new Float32Array(n), room = new Float32Array(n);
  const ss = x => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
  const norm = (b, target, peak) => { let s = 0, m = 0; for (let i = 0; i < b.length; i++) { s += b[i] * b[i]; m = Math.max(m, Math.abs(b[i])); } const g = peak ? target / (m || 1) : target / (Math.sqrt(s / b.length) || 1); for (let i = 0; i < b.length; i++) b[i] *= g; };
  const rain = c.pink(r, n), hp = c.biquad("hp", 300, 0.7, sr);
  for (let i = 0; i < n; i++) rain[i] = hp(rain[i]);
  norm(rain, 1);
  for (let d = 0; d < Math.round(500 * len); d++) c.mix(rain, c.burst(r, 0.004 + r() * 0.008, "bp", 1600 + r() * 4500, 2 + r() * 3, 0.0003, 0.0015 + r() * 0.003, sr), r() * len, 0.8 + 1.6 * r(), sr);
  norm(rain, 1);
  const lpA = c.onepole(sr), lpB = c.onepole(sr), mufCut = 900 - 550 * w, openCut = 3000 + 7000 * sw;
  const bed = 0.09 - 0.03 * w, top = 0.07 + 0.2 * sw;
  for (let i = 0; i < n; i++) {
    const t = i / sr, o = ss((t - tL - 0.04) / rise) * (1 - ss((t - tS) / shut)), cut = mufCut + (openCut - mufCut) * o * o;
    out[i] = lpB(lpA(rain[i], cut), cut) * (bed * (1 - o) + top * o);
  }
  const brush = (at, d, amp) => {
    const m = c.seconds(d, sr), x = c.noise(r, m), bp = c.biquad("bp", 700 + 1100 * f, 0.8, sr);
    let g = 1, nx = 0;
    for (let i = 0; i < m; i++) { if (i >= nx) { g = 0.5 + 0.5 * r(); nx = i + 60 + Math.floor(r() * 300); } x[i] = bp(x[i]) * Math.sin(Math.PI * i / m) * g; }
    c.mix(room, x, at, amp, sr);
  };
  const creak = (at, d, amp) => {
    const m = c.seconds(d, sr), x = new Float32Array(m), bp = c.biquad("bp", 1000 + r() * 700, 3, sr), f0 = 150 + r() * 120;
    let ph = 0, jit = 1;
    for (let i = 0; i < m; i++) {
      ph += f0 * jit * (1 + 0.35 * Math.sin(Math.PI * i / m)) / sr; let imp = 0;
      if (ph >= 1) { ph -= 1; imp = 0.4 + 0.6 * r(); jit = 0.85 + 0.3 * r(); }
      x[i] = bp(imp) * Math.sin(Math.PI * i / m);
    }
    c.mix(room, x, at, amp, sr);
  };
  const latch = (at, amp) => {
    c.mix(room, c.burst(r, 0.014, "bp", 3400, 2, 0.0006, 0.003, sr), at, amp, sr);
    c.mix(room, c.ring([[2200 * (0.97 + r() * 0.06), 1], [4900, 0.4]], 0.05, 0.006, sr), at + 0.002, amp * 0.6, sr);
  };
  latch(tL, 0.45 + 0.35 * f);
  c.mix(room, c.ring([[75 + 25 * f, 1], [160, 0.35]], 0.15, 0.03, sr), tL + 0.015, 0.35 + 0.35 * f, sr);
  c.mix(room, c.burst(r, 0.05, "lp", 500, 0.8, 0.002, 0.015, sr), tL + 0.015, 0.35 + 0.3 * f, sr);
  creak(tL + 0.03, swing * 0.85, 0.6 + 0.8 * (1 - f));
  brush(tL + 0.02, swing, 0.08 + 0.15 * f);
  brush(tS, shut, 0.1);
  const k = 1 - 0.2 * w;
  c.mix(room, c.ring([[88 * k, 1], [200 * k, 0.4], [420 * k, 0.15]], 0.22, 0.03 + 0.025 * w, sr), tC, 0.8 + 0.2 * f, sr);
  c.mix(room, c.burst(r, 0.05, "lp", 1100 + 1200 * (1 - w), 0.8, 0.0015, 0.012, sr), tC, 0.7 + 0.2 * f, sr);
  latch(tC + 0.006, 0.4);
  const B = {
    brass: { base: 1750, spread: [1, 1.07, 1.15], ratios: [1, 2.32, 4.25], amps: [1, 0.45, 0.2], dec: 0.1, gap: 0.03 },
    tin: { base: 3000, spread: [1, 1.05, 1.12, 1.19, 1.26], ratios: [1, 1.59, 2.71, 3.93], amps: [1, 0.7, 0.5, 0.3], dec: 0.035, gap: 0.022 },
    chime: { base: 1100, spread: [1, 1.125, 1.25, 1.5, 1.667], ratios: [1, 2.76, 5.4], amps: [1, 0.35, 0.12], dec: 0.28, gap: 0.05 },
  }[p.bell];
  const bells = B.spread.map(s => B.base * s * (0.97 + r() * 0.06)), ramp = c.seconds(0.0008, sr), bellBuf = new Float32Array(n);
  const strike = (t, a) => {
    const fb = bells[Math.floor(r() * bells.length)];
    const x = c.ring(B.ratios.map((q, j) => [fb * q * (0.997 + r() * 0.006), B.amps[j] * (0.6 + 0.8 * r())]), B.dec * 5, B.dec * (p.tail ? 1 : 0.7), sr, 1);
    for (let i = 0; i < Math.min(x.length, ramp); i++) x[i] *= i / ramp;
    c.mix(bellBuf, x, t, a, sr);
    c.mix(bellBuf, c.burst(r, 0.006, "bp", Math.min(9000, fb * 2.6), 2.5, 0.0003, 0.0012, sr), t, a * 0.7, sr);
    if (p.bell === "tin") c.mix(bellBuf, c.burst(r, 0.02, "bp", 6000, 2, 0.0008, 0.006, sr), t, a * 0.4, sr);
  };
  const jingle = (at, dur, amp) => {
    let t = at;
    while (t < at + dur) {
      const e = 0.35 + 0.65 * Math.exp(-(t - at) / (dur * 0.5)), a = amp * e * (0.35 + 0.65 * r());
      strike(t, a);
      if (r() < 0.35) strike(t + 0.003 + r() * 0.006, a * (0.4 + 0.4 * r()));
      t += B.gap * (0.5 + 1.5 * r()) * (1 + 0.8 * (t - at) / dur);
    }
  };
  jingle(tL + 0.035 + 0.03 * (1 - f), 0.5 + 0.5 * f, 0.6 + 0.4 * f);
  jingle(tC + 0.004, 0.35 + 0.35 * f, 0.5 + 0.3 * f);
  c.filter(bellBuf, c.biquad("lp", 14000 - 6000 * w, 0.7, sr));
  c.mix(room, bellBuf, 0, 1, sr);
  norm(room, 0.75, true);
  c.mix(out, room, 0, 1, sr);
  if (p.tail) {
    const sz = 0.7 + 0.7 * w, fbk = 0.62 + 0.18 * w, damp = 0.2 + 0.5 * w, wet = 0.18 + 0.32 * w;
    const combs = [0.0297, 0.0371, 0.0411, 0.0437].map(d => ({ b: new Float32Array(Math.max(2, Math.round(d * sz * sr))), i: 0, s: 0 }));
    const aps = [0.005, 0.0017].map(d => ({ b: new Float32Array(Math.max(2, Math.round(d * sr))), i: 0 }));
    for (let i = 0; i < n; i++) {
      const x = room[i] * 0.25; let y = 0;
      for (const cb of combs) { const v = cb.b[cb.i]; cb.s = v * (1 - damp) + cb.s * damp; cb.b[cb.i] = x + cb.s * fbk; cb.i = (cb.i + 1) % cb.b.length; y += v; }
      for (const ap of aps) { const v = ap.b[ap.i], u = y + v * 0.5; ap.b[ap.i] = u; ap.i = (ap.i + 1) % ap.b.length; y = v - u * 0.5; }
      out[i] += y * wet;
    }
  }
  c.finish(out, 0.9, 1.1);
  const fl = c.seconds(p.tail ? 0.45 : 0.3, sr), fs = n - fl;
  for (let i = 0; i < fl; i++) out[fs + i] *= 0.5 + 0.5 * Math.cos(Math.PI * i / fl);
  c.fade(out, 10, sr);
  return { samples: out };
}
