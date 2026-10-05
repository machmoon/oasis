// Bench scrape: a wooden bench dragged back over tavern boards. Stick-slip chatter impulses drive damped bench-body modes
// to make the groan, a friction hiss and floor-grit grains form the contact layer, and a lift bump opens the drag. The
// tail toggle adds the set-down knock, the rock-back and the low room.
export const meta = {
  title: "Bench Scrape", kind: "foley", format: "sound", duration: 1.2, price: 2, author: "hollowbody", payout: "hollowbody@creators.oasis.example", kit: "Wooden Tavern", description: "A wooden bench or stool dragged back from a tavern table, groaning and chattering over gritty boards; for chairs pushed back, patrons standing and busy inn scenes.",
  tags: ["bench", "scrape", "drag", "chair", "wood", "furniture", "tavern", "foley"],
};
export const params = { knobs: {
  bench: { type: "choice", label: "Bench length", default: "short", options: ["stool", "short", "long"] },
  speed: { type: "range", label: "Drag speed", default: 0.5, min: 0, max: 1, step: 0.01 },
  grit: { type: "range", label: "Floor grit", default: 0.4, min: 0, max: 1, step: 0.01 },
  weight: { type: "range", label: "Weight", default: 0.5, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Set-down tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, li = params.knobs.bench.options.indexOf(p.bench), r = c.rng(p.seed * 6151 + li * 389 + 3);
  const B = {
    stool: { len: 0.45, modes: [[430, 1], [990, 0.6], [1870, 0.3]], streams: [1], rate: 1.35, q: 8 },
    short: { len: 0.75, modes: [[250, 1], [590, 0.6], [1210, 0.35]], streams: [1, 0.96], rate: 1, q: 10 },
    long: { len: 1.1, modes: [[140, 1], [330, 0.7], [720, 0.4], [1450, 0.2]], streams: [1, 0.87], rate: 0.78, q: 12 },
  }[p.bench];
  const sp = p.speed, w = p.weight, g = p.grit;
  const T = B.len * (1.5 - 0.9 * sp) * (0.9 + 0.2 * r());
  const nd = c.seconds(T, sr), n = c.seconds(T + (p.tail ? 0.75 : 0.1), sr);
  const modes = B.modes.map(([f, a]) => [f * (1 - 0.1 * w) * (0.97 + 0.06 * r()), a]);
  const sm = (x) => x * x * (3 - 2 * x);
  const vAt = (u) => sm(Math.min(1, u / 0.15)) * sm(Math.max(0, Math.min(1, (1 - u) / 0.3)));
  const imp = new Float32Array(n), fric = new Float32Array(n), gh = new Float32Array(n);
  const fr = c.noise(r, nd), fr2 = c.noise(r, nd), lpF = c.biquad("lp", 1200 + 4000 * sp, 0.7, sr), hpG = c.biquad("hp", 2600, 0.7, sr);
  const ph = B.streams.map(() => r()), skip = 0.06 + 0.25 * g, jit = 0.35 + 0.45 * g + 0.2 * (1 - sp);
  let wv = 1, wt = 1, flick = 1, drift = 1, dt = 1;
  for (let i = 0; i < nd; i++) {
    if (i % 512 === 0) { wt = 0.7 + 0.5 * r(); dt = 0.75 + 0.5 * r(); }
    if (i % (60 + ((i * 7) % 140)) === 0) flick = r() < 0.7 ? 0.3 + 0.7 * r() : 0.1;
    wv += (wt - wv) * 0.002; drift += (dt - drift) * 0.0015;
    const v = vAt(i / nd) * wv;
    const rate = (28 + 120 * sp) * (1 - 0.45 * w) * B.rate * (0.55 + 0.45 * v) * drift;
    for (let k = 0; k < ph.length; k++) {
      ph[k] += rate * B.streams[k] / sr;
      if (ph[k] >= 1) {
        ph[k] -= 1 + (r() - 0.5) * jit;
        if (r() > skip) { const a = v * (0.35 + 0.65 * r()) * (k ? 0.7 : 1) * (1 + 0.5 * w); imp[i] += a; if (r() < 0.2 && i + 40 < nd) imp[i + 15 + Math.floor(r() * 60)] += a * 0.5; }
      }
    }
    fric[i] = lpF(fr[i]) * v * (0.25 + 0.2 * sp);
    gh[i] = hpG(fr2[i]) * v * flick * g * 0.35;
  }
  const out = new Float32Array(n);
  for (const [f, a] of modes) {
    const bp = c.biquad("bp", f, B.q, sr), alpha = Math.sin(c.TAU * f / sr) / (2 * B.q), k = a * 0.5 / alpha;
    for (let i = 0; i < n; i++) out[i] += bp(imp[i] + 0.1 * fric[i]) * k;
  }
  const hpC = c.biquad("hp", 900 + 1500 * sp, 0.7, sr);
  for (let i = 0; i < n; i++) out[i] = out[i] * 0.5 + hpC(imp[i]) * 0.2 + fric[i] * 0.38 + gh[i];
  const grains = Math.round(T * (12 + 200 * g));
  for (let k = 0; k < grains; k++) {
    let t = r() * T; for (let a = 0; a < 4 && r() > vAt(t / T); a++) t = r() * T;
    c.mix(out, c.burst(r, 0.003 + r() * 0.006, "bp", 1800 + r() * 4500, 3, 0.0003, 0.0012 + r() * 0.002, sr), t, (0.15 + 0.35 * r()) * (0.4 + 0.6 * g), sr);
  }
  const f0 = modes[0][0];
  c.mix(out, c.ring([[f0 * 0.6, 1], [f0 * 1.35, 0.35]], 0.12, 0.02 + 0.03 * w, sr), 0.003, 0.35 + 0.5 * w, sr);
  c.mix(out, c.burst(r, 0.02, "lp", 900, 0.8, 0.001, 0.006, sr), 0.002, 0.3 + 0.3 * sp, sr);
  if (p.bench === "long") for (let k = 0, m = 1 + (r() < 0.5 ? 1 : 0); k < m; k++)
    c.mix(out, c.ring(modes.map(([f, a]) => [f * 0.8, a]), 0.08, 0.018, sr), T * (0.3 + 0.4 * r()), 0.25 + 0.2 * w, sr);
  let pk = 1e-6;
  for (let i = 0; i < n; i++) { const a = Math.abs(out[i]); if (a > pk) pk = a; }
  let res = out;
  if (p.tail) {
    const ts = T + 0.01;
    c.mix(out, c.ring(modes.map(([f, a]) => [f * 0.7, a]), 0.15, 0.03 + 0.03 * w, sr), ts, (0.6 + 0.4 * w) * pk, sr);
    c.mix(out, c.burst(r, 0.03, "lp", 700, 0.8, 0.001, 0.008, sr), ts, (0.5 + 0.3 * w) * pk, sr);
    c.mix(out, c.ring(modes.map(([f, a]) => [f * 0.75, a]), 0.1, 0.02, sr), ts + 0.05 + 0.06 * r(), 0.3 * pk, sr);
    for (let k = 0; k < 6; k++) c.mix(out, c.burst(r, 0.004, "bp", 2000 + r() * 3000, 3, 0.0003, 0.0012, sr), ts + r() * 0.12, 0.12 * (0.3 + g) * pk, sr);
    res = c.reverb(out, { size: 0.35, decay: 0.45, mixAmt: 0.28 }, sr) || out;
  }
  const gn = 0.72 / pk;
  for (let i = 0; i < res.length; i++) {
    const y = res[i] * gn, a = Math.abs(y);
    res[i] = a > 0.8 ? Math.sign(y) * (0.8 + 0.15 * Math.tanh((a - 0.8) / 0.15)) : y;
  }
  const fl = Math.min(res.length, c.seconds(0.06, sr));
  for (let i = 0; i < fl; i++) res[res.length - 1 - i] *= i / fl;
  c.fade(res, 4, sr);
  return { samples: res };
}
