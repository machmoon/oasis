// Kettle pour: hot water into a mug, glass or teapot. A dominant rising cavity resonance tracks the fill, over a Poisson Minnaert bubble field and low-mid splash grains. The pour opens on a bottom splash and tilts back into dribbles; above it sits a separate high steam hiss, with an optional fizz-and-drip settle tail.
export const meta = {
  title: "Kettle Pour", kind: "foley", format: "sound", duration: 2.5, price: 2, author: "foleyroom", payout: "foleyroom@creators.oasis.example", kit: "Kitchen", description: "Hot water poured from a kettle into a mug, glass or teapot: first splash, bubbling stream, the rising fill pitch, a tapering tilt-back and curling steam, for kitchen scenes and cosy cutaways.",
  tags: ["pour", "kettle", "water", "mug", "tea", "steam", "kitchen", "foley"],
};
export const params = { knobs: {
  vessel: { type: "choice", label: "Vessel", default: "ceramic mug", options: ["ceramic mug", "glass", "teapot"] },
  rate: { type: "range", label: "Pour rate", default: 0.5, min: 0, max: 1, step: 0.01 },
  fill: { type: "range", label: "Fill progress", default: 0.3, min: 0, max: 1, step: 0.01 },
  steam: { type: "range", label: "Steam", default: 0.4, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Drip tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const vi = Math.max(0, params.knobs.vessel.options.indexOf(p.vessel)), sr = c.sr, r = c.rng(p.seed * 4801 + vi * 211 + 3);
  const V = [
    { h: 0.095, q: 24, sin: 0.35, h3: 0.16, body: [[1150, 1], [2730, 0.4]], bd: 0.012, ring: 0.35, knock: 0.04, bub: 1, spl: 1100, glug: 0 },
    { h: 0.11, q: 45, sin: 0.5, h3: 0.3, body: [[2100, 1], [5300, 0.6], [8900, 0.35]], bd: 0.12, ring: 0.3, knock: 0.18, bub: 1.35, spl: 1800, glug: 0 },
    { h: 0.15, q: 14, sin: 0.3, h3: 0.1, body: [[430, 1], [1150, 0.5], [2500, 0.2]], bd: 0.035, ring: 0.4, knock: 0.06, bub: 0.65, spl: 650, glug: 10 },
  ][vi];
  const pourEnd = c.between(r, 1.6, 1.75), tap = 0.5, tailLen = p.tail ? 0.85 : 0.4, total = pourEnd + tailLen;
  const n = c.seconds(total, sr), out = new Float32Array(n), att = c.between(r, 0.012, 0.025);
  const sm = u => u * u * (3 - 2 * u), tp = t => sm(c.clamp((pourEnd - t) / tap, 0, 1));
  const flow = t => sm(c.clamp(t / att, 0, 1)) * (0.7 + 0.3 * sm(c.clamp(t / 0.3, 0, 1))) * tp(t);
  const f0 = 0.75 * p.fill, f1 = Math.min(0.93, f0 + 0.15 + 0.42 * p.rate);
  const resAt = t => Math.min(sr * 0.17, 343 / (4 * (V.h * (1 - (f0 + (f1 - f0) * Math.min(1, t / (pourEnd - 0.2)))) + 0.012)));
  const bubble = (f, d, rise) => {
    const m = c.seconds(d * 6, sr), x = new Float32Array(m), k = Math.exp(-1 / (d * sr)); let ph = 0, a = 1;
    for (let i = 0; i < m; i++) { const t = i / sr, fi = f * (1 + rise * t); if (fi > sr * 0.42) break; ph += c.TAU * fi / sr; x[i] = Math.sin(ph) * a * Math.min(1, t / 0.0006); a *= k; }
    return x;
  };
  const det = () => V.body.filter(([f]) => f < sr * 0.42).map(([f, a]) => [f * c.between(r, 0.97, 1.03), a]);
  const nz = c.noise(r, n), op1 = c.onepole(sr), op2 = c.onepole(sr), k8 = 1 - Math.exp(-1 / (0.008 * sr)), k60 = 1 - Math.exp(-1 / (0.06 * sr));
  let ph = 0, lo = 0, bd = 0, g = 0.8, gt = 0.8, cnt = 0, fw = 1, fwt = 1, fc = 0, ff = 0, rn = 0, f = 500;
  const np = Math.min(n, c.seconds(pourEnd + 0.01, sr));
  for (let i = 0; i < np; i++) {
    const t = i / sr, fl = flow(t);
    if (--cnt <= 0) { cnt = Math.round(sr * c.between(r, 0.006, 0.03)); gt = 1 - (0.3 + 0.5 * (1 - tp(t))) * r(); }
    if (--fc <= 0) { fc = Math.round(sr * c.between(r, 0.03, 0.12)); fwt = 1 + c.between(r, -0.012, 0.012); }
    g += (gt - g) * k8; fw += (fwt - fw) * k60;
    if ((i & 31) === 0) { f = resAt(t) * fw; ff = 2 * Math.sin(Math.PI * f / sr); rn = 0.7 / Math.sqrt(V.q * Math.PI * f / sr); }
    const x = nz[i];
    lo += ff * bd; bd += ff * (x - lo - bd / V.q);
    ph += c.TAU * f / sr;
    let tone = Math.sin(ph) * V.sin + bd * rn * (1 - V.sin);
    if (3 * f < sr * 0.42) tone += V.h3 * Math.sin(3 * ph);
    const s = op2(op1(x, V.spl), V.spl);
    out[i] = fl * g * (tone * 0.6 + s * 0.5 * (0.5 + p.rate));
  }
  let t = 0.004;
  while (t < pourEnd) {
    const fl = flow(t); t += -Math.log(1 - 0.999 * r()) / Math.max(30, (180 + 700 * p.rate) * fl);
    if (fl < 0.03 || t >= pourEnd) continue;
    let bf = V.bub * c.between(r, 500, 3200) * (1.25 - 0.5 * p.rate) * (1 + 0.6 * (1 - tp(t))), a = fl * (0.06 + 0.35 * r() * r());
    if (r() < 0.06) { bf *= 0.45; a *= 1.8; }
    c.mix(out, bubble(bf, c.between(r, 0.5, 1.5) * 0.0045 * Math.sqrt(2000 / bf), c.between(r, 5, 25)), t, a, sr);
  }
  t = 0.01;
  while (t < pourEnd) {
    const fl = flow(t); t += -Math.log(1 - 0.999 * r()) / Math.max(8, (25 + 50 * p.rate) * fl);
    if (fl < 0.05 || t >= pourEnd) continue;
    c.mix(out, c.burst(r, c.between(r, 0.008, 0.025), "bp", V.spl * c.between(r, 0.6, 1.8), 1.2, 0.0008, c.between(r, 0.003, 0.01), sr), t, fl * c.between(r, 0.12, 0.35), sr);
    if (r() < V.knock * 4) c.mix(out, c.ring(det(), V.bd * 5 + 0.02, V.bd * c.between(r, 0.7, 1.1), sr), t, fl * c.between(r, 0.03, 0.09) * V.ring * 3, sr);
  }
  for (let b = 0; b < V.glug * (0.5 + p.rate); b++) { const tg = c.between(r, 0.15, pourEnd - 0.3); c.mix(out, bubble(c.between(r, 240, 480), c.between(r, 0.012, 0.022), c.between(r, 2, 6)), tg, flow(tg) * c.between(r, 0.25, 0.5), sr); }
  const empty = 1 - 0.6 * p.fill;
  c.mix(out, c.burst(r, 0.005, "hp", 2000, 0.7, 0.0004, 0.0015, sr), 0.002, 0.5 * empty, sr);
  c.mix(out, c.burst(r, 0.04, "bp", V.spl * 1.6, 0.9, 0.0012, 0.01, sr), 0.003, 0.8 * empty, sr);
  c.mix(out, c.ring(det(), V.bd * 6 + 0.03, V.bd * 1.2, sr), 0.004, V.ring * 1.4 * empty, sr);
  for (let b = 0; b < 14; b++) { const bf = V.bub * c.between(r, 700, 3000); c.mix(out, bubble(bf, 0.0045 * Math.sqrt(2000 / bf), c.between(r, 8, 25)), c.between(r, 0.005, 0.07), c.between(r, 0.15, 0.4), sr); }
  let td = pourEnd - 0.08; const fe = resAt(pourEnd), dr = (p.tail ? 4 : 2) + Math.floor(r() * 2);
  for (let d = 0; d < dr && td < total - 0.15; d++) {
    td += c.between(r, 0.04, 0.08) * (1 + 0.5 * d);
    c.mix(out, bubble(V.bub * c.between(r, 900, 2200), c.between(r, 0.005, 0.01), c.between(r, 8, 25)), td, c.between(r, 0.2, 0.35) * (1 - 0.15 * d), sr);
    c.mix(out, c.ring([[fe * c.between(r, 0.98, 1.02), 1]], 0.08, 0.02, sr), td, 0.12 * (1 - 0.15 * d), sr);
  }
  if (p.tail) {
    let tf = pourEnd;
    while (tf < total - 0.2) {
      const lam = 45 * Math.exp(-(tf - pourEnd) / 0.3); tf += -Math.log(1 - 0.999 * r()) / Math.max(4, lam);
      if (tf >= total - 0.2) break;
      const bf = Math.min(sr * 0.4, V.bub * c.between(r, 2800, 5500));
      c.mix(out, bubble(bf, 0.0045 * Math.sqrt(2000 / bf), c.between(r, 10, 30)), tf, c.between(r, 0.04, 0.12) * Math.exp(-(tf - pourEnd) / 0.5), sr);
    }
  }
  if (p.steam > 0) {
    const sn = c.noise(r, n), h1 = c.biquad("hp", Math.min(6000, sr * 0.27), 0.7, sr), h2 = c.biquad("hp", Math.min(6000, sr * 0.27), 0.7, sr), sl = c.biquad("lp", sr * 0.45, 0.7, sr);
    const rel = Math.min(0.6, tailLen * 0.8), end = total - 0.02, ks = 1 - Math.exp(-1 / (0.05 * sr));
    let w = 0.6, wt = 0.6, k = 0;
    for (let i = 0; i < n; i++) {
      const ti = i / sr; if (--k <= 0) { k = Math.round(sr * c.between(r, 0.05, 0.25)); wt = 0.25 + 0.75 * r(); }
      w += (wt - w) * ks;
      const env = sm(c.clamp((ti - 0.15) / 0.6, 0, 1)) * (1 + 0.5 * sm(c.clamp((ti - pourEnd + 0.3) / 0.4, 0, 1))) * c.clamp((end - ti) / rel, 0, 1);
      out[i] += sl(h2(h1(sn[i]))) * env * w * 0.3 * p.steam;
    }
  }
  c.finish(out, 0.9);
  c.gain(out, 0.62 + 0.38 * p.rate);
  c.fade(out, 8, sr);
  return { samples: out };
}
