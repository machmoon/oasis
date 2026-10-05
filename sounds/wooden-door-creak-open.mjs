// Tavern door creak: an iron thumb-latch lifts and clacks, then a stick-slip pulse train follows the door's swing. Its rate glides with angular speed, stalls and breaks at low speed, and period-doubles into a groan on heavy doors. The pulses excite a pitch-tracking iron hinge squeal, wooden panel formants and a low mass resonance, under moving air and an optional room tail.
export const meta = {
  title: "Tavern Door Creak", kind: "sfx", format: "sound", duration: 2.8, price: 3, author: "hollowbody", payout: "hollowbody@creators.oasis.example", kit: "Wooden Tavern", description: "An old wooden door creaking open on iron hinges, with weight, swing speed, hinge rust and pitch as knobs; for taverns, cellars and haunted inns.",
  tags: ["door", "creak", "hinge", "tavern", "wood", "open", "medieval", "foley"],
};
export const params = { knobs: {
  weight: { type: "choice", label: "Door weight", default: "heavy", options: ["light", "heavy", "oak slab"] },
  speed: { type: "range", label: "Open speed", default: 0.5, min: 0, max: 1, step: 0.01 },
  rust: { type: "range", label: "Hinge rust", default: 0.5, min: 0, max: 1, step: 0.01 },
  pitch: { type: "range", label: "Pitch", default: 0.5, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Room tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, k = sr / 22050, wi = params.knobs.weight.options.indexOf(p.weight), r = c.rng(p.seed * 7919 + wi * 131 + 3);
  const W = [
    { modes: [[430, 1], [910, 0.6], [1700, 0.35]], rate: 240, len: 0.8, N: 11, mass: 0.6, sub: 0, air: 0.5, low: 320 },
    { modes: [[240, 1], [560, 0.7], [1150, 0.4]], rate: 170, len: 1, N: 9, mass: 2.5, sub: 0.25, air: 0.8, low: 220 },
    { modes: [[140, 1], [330, 0.8], [760, 0.5]], rate: 112, len: 1.35, N: 7, mass: 5.5, sub: 0.55, air: 1.2, low: 140 },
  ][wi];
  const rust = p.rust, sp = p.speed, T = (0.9 + 1.5 * (1 - sp)) * W.len, t0 = 0.1, tail = p.tail ? 1.0 : 0.15;
  const n = c.seconds(t0 + T + tail, sr), ex = new Float32Array(n), vel = new Float32Array(n), fh = new Float32Array(n), out = new Float32Array(n);
  const sw = [], pd = [], nw = [], stalls = [];
  for (let j = 0; j < 11; j++) { sw.push(0.7 + 0.6 * r()); pd.push(0.8 + 0.4 * r()); nw.push(r()); }
  const ns = 1 + Math.round(3 * (1 - sp) + 2 * rust * r());
  for (let j = 0; j < ns; j++) stalls.push([0.2 + 0.65 * r(), 0.015 + 0.03 * r(), (0.35 + 0.5 * (1 - sp)) * (0.6 + 0.4 * r())]);
  const lerp = (a, x) => { const j = Math.min(9, Math.floor(x)), f = x - j; return a[j] + (a[j + 1] - a[j]) * f; };
  const f0 = W.rate * Math.pow(2, (p.pitch - 0.5) * 2) * (1 - 0.2 * rust), sScale = 0.6 + 0.6 * sp;
  const s0 = c.seconds(t0, sr), m = Math.min(c.seconds(T, sr), n - s0);
  fh.fill(Math.min(f0 * 0.25 * sScale * W.N, sr * 0.45));
  let ph = 0, thr = 1, chat = 1, cnt = 0, lastF = fh[0];
  for (let i = 0; i < m; i++) {
    const u = i / m, x = u * 10;
    const rise = Math.min(1, u / 0.15), fall = u > 0.55 ? Math.pow(1 - (u - 0.55) / 0.45, 1.5) : 1;
    let st = 1;
    for (let j = 0; j < ns; j++) { const d = (u - stalls[j][0]) / stalls[j][1]; if (d > -3 && d < 3) st -= stalls[j][2] * Math.exp(-d * d); }
    const v = rise * rise * (3 - 2 * rise) * fall * Math.sin(Math.PI * (0.15 + 0.7 * u)) * lerp(sw, x) * Math.max(0.05, st);
    vel[s0 + i] = v;
    const rate = f0 * (0.22 + 0.95 * v) * sScale * lerp(pd, x);
    lastF = Math.min(rate * W.N * (0.86 + 0.28 * lerp(nw, x)), sr * 0.45);
    fh[s0 + i] = lastF;
    if (i % 400 === 0) chat = 1 - rust * 0.6 * r();
    ph += rate / sr;
    if (ph >= thr) {
      ph -= thr; cnt++;
      thr = 1 + rust * (r() - 0.5) * 0.9;
      if (r() > (rust * 0.3 + (1 - sp) * 0.3) * (1 - v)) ex[s0 + i] += Math.pow(v, 0.7) * chat * (0.6 + 0.4 * r()) * (cnt % 2 ? 1 - W.sub : 1);
    }
    ex[s0 + i] += (r() * 2 - 1) * 0.04 * v * (0.3 + rust);
  }
  for (let i = s0 + m; i < n; i++) fh[i] = lastF;
  const res = (tau) => { const R = Math.exp(-1 / (tau * sr)); let y1 = 0, y2 = 0; return (x, f) => { const w = c.TAU * f / sr, y = x * Math.sin(w) + 2 * R * Math.cos(w) * y1 - R * R * y2; y2 = y1; y1 = y; return y; }; };
  const h1 = res(0.022 - 0.012 * rust), h2 = res(0.01), hg = 0.45 + 0.7 * rust;
  const bodies = W.modes.map(([f, a]) => [c.biquad("bp", f * (0.95 + 0.1 * r()), 2.5, sr), a]);
  const massLp = c.biquad("lp", W.low, 1.4, sr), rasp = c.biquad("lp", 2500 + 2500 * rust, 0.7, sr), airLp = c.biquad("lp", 180 + 80 * (2 - wi), 0.7, sr);
  for (let i = 0; i < n; i++) {
    const e = ex[i], f = fh[i];
    let s = hg * (h1(e, f) + 0.45 * h2(e, Math.min(f * 2.03, sr * 0.45))) + 0.3 * k * rasp(e) + 1.2 * W.mass * k * massLp(e);
    for (let b = 0; b < bodies.length; b++) s += 9 * k * bodies[b][1] * bodies[b][0](e);
    out[i] = s + airLp(r() * 2 - 1) * vel[i] * 0.3 * W.air;
  }
  let pk = 0;
  for (let i = 0; i < n; i++) pk = Math.max(pk, Math.abs(out[i]));
  if (pk > 0) c.gain(out, 0.8 / pk);
  const tl = 0.015 + 0.01 * r(), tc = 0.055 + 0.015 * r(), iron = 1500 * (0.94 + 0.12 * r());
  c.mix(out, c.burst(r, 0.01, "hp", 3200, 0.8, 0.001, 0.003, sr), tl, 0.22, sr);
  c.mix(out, c.ring([[iron * 1.6, 1], [iron * 3.3, 0.3]], 0.03, 0.006, sr), tl + 0.001, 0.12, sr);
  c.mix(out, c.ring([[iron, 1], [iron * 2.47, 0.45], [iron * 4.1, 0.15]], 0.09, 0.016, sr), tc, 0.28, sr);
  c.mix(out, c.burst(r, 0.03, "lp", 700 - 150 * wi, 0.8, 0.0015, 0.008, sr), tc, 0.25 + 0.1 * wi, sr);
  if (p.tail) c.reverb(out, { size: 0.7, decay: 0.85, mixAmt: 0.4 }, sr);
  c.finish(out, 0.9, 1.1);
  const rl = c.seconds(0.08, sr);
  for (let i = 0; i < rl; i++) { const g = i / rl; out[n - 1 - i] *= g * g; }
  c.fade(out, 4, sr);
  return { samples: out };
}
