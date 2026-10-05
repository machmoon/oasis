// Barrel drop: a cask landing upright on floorboards. Layers: a broadband strike crack, a damped stave body and a falling floor thump, plank modes and a board-noise wash, ringing iron hoops with irregular rattles, a liquid slosh with bubble chirps, and a short low-ceiling room tail.
export const meta = {
  title: "Barrel Drop", kind: "impact", format: "sound", duration: 0.9, price: 3, author: "hollowbody", payout: "hollowbody@creators.oasis.example", kit: "Wooden Tavern", description: "A wooden barrel dropped upright onto tavern planks: the thud of the cask, the rattle of its iron hoops and the slosh of what's inside. Size, height, fullness and rattle are knobs, and every seed is a different drop.",
  tags: ["barrel", "drop", "impact", "wood", "tavern", "hoop", "slosh", "foley"],
};
export const params = { knobs: {
  size: { type: "choice", label: "Barrel size", default: "hogshead", options: ["keg", "hogshead", "tun"] },
  height: { type: "range", label: "Drop height", default: 0.5, min: 0, max: 1, step: 0.01 },
  fullness: { type: "range", label: "Fullness slosh", default: 0.5, min: 0, max: 1, step: 0.01 },
  hoop: { type: "range", label: "Hoop rattle", default: 0.5, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Room tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, si = params.knobs.size.options.indexOf(p.size), r = c.rng(p.seed * 7919 + si * 211 + 3);
  const S = [{ f: 150, dec: 0.035, len: 0.42, hf: 2100 }, { f: 95, dec: 0.045, len: 0.5, hf: 1650 }, { f: 62, dec: 0.06, len: 0.62, hf: 1250 }][si];
  const h = p.height, full = p.fullness, hoop = p.hoop, hit = 0.006;
  const len = S.len + 0.2 * full + (p.tail ? 0.3 : 0);
  const out = new Float32Array(c.seconds(len, sr));
  const strike = 0.55 + 0.6 * h, mass = 0.6 + 0.5 * full;
  c.mix(out, c.burst(r, 0.02, "lp", (2200 + 6500 * h) * (1 - 0.18 * si), 0.7, 0.0006, 0.003 + 0.004 * h, sr), hit, 0.7 * strike, sr);
  c.mix(out, c.burst(r, 0.008, "hp", 2500 + 2500 * h, 0.8, 0.0004, 0.0015, sr), hit, 0.35 * strike, sr);
  const f = S.f * (0.97 + r() * 0.06), bd = S.dec * (1 - 0.45 * full) * (0.8 + 0.4 * h);
  c.mix(out, c.ring([[f, 1], [f * 1.58 * (0.98 + r() * 0.04), 0.5], [f * 2.31, 0.3], [f * 3.42, 0.15]], bd * 7, bd, sr), hit + 0.0005, 0.75 * strike, sr);
  const tn = c.seconds(0.25 + 0.1 * si, sr), td = 0.03 + 0.025 * si;
  const thump = c.osc("sine", (t) => f * 0.7 * (1 + 1.4 * Math.exp(-t / 0.012)), tn, sr);
  c.multiply(thump, c.env(tn, 0.0012, td, sr));
  c.mix(out, thump, hit, 0.9 * mass * strike, sr);
  const pk = 0.95 + r() * 0.1;
  c.mix(out, c.ring([[185 * pk, 1], [412 * pk, 0.6], [770 * pk, 0.3], [1290 * pk, 0.12]], 0.2, 0.028, sr), hit + 0.001, 0.4 * strike, sr);
  c.mix(out, c.burst(r, 0.07, "lp", 1100 + 600 * h, 0.8, 0.001, 0.018, sr), hit + 0.001, 0.45 * strike, sr);
  const wn = c.seconds(0.45, sr), wash = c.brown(r, wn), wl = c.biquad("lp", 900 - 180 * si + 500 * h, 0.7, sr), wtau = (0.05 + 0.03 * si + 0.03 * h) * (p.tail ? 1.4 : 1) * sr;
  let fl = 1;
  for (let i = 0; i < wn; i++) { if (i % 200 === 0) fl = 0.5 + 0.5 * r(); wash[i] = wl(wash[i]) * fl * Math.min(1, i / (0.002 * sr)) * Math.exp(-i / wtau); }
  c.mix(out, c.fade(wash, 5, sr), hit + 0.001, 0.55 * strike, sr);
  const hf = S.hf * (0.96 + r() * 0.08), hg = 0.04 + 0.55 * hoop;
  const hm = (a) => [[hf, a], [hf * 1.47, 0.4 * a], [hf * 2.76, 0.5 * a], [hf * 5.4, 0.22 * a]];
  c.mix(out, c.ring(hm(1), 0.5, 0.08 + 0.16 * hoop, sr), hit + 0.001, hg * (0.4 + 0.4 * h), sr);
  const rat = Math.round(2 + 12 * hoop * (0.5 + 0.5 * h)), span = 0.06 + 0.2 * hoop;
  for (let i = 0; i < rat; i++) {
    const u = Math.pow(r(), 1.4), t = hit + 0.012 + u * span, a = (0.3 + 0.7 * r()) * (1 - 0.7 * u);
    c.mix(out, c.ring(hm(1).map(([x, y]) => [x * (0.99 + r() * 0.02), y]), 0.12, 0.012 + 0.02 * r(), sr), t, hg * 0.35 * a, sr);
    c.mix(out, c.burst(r, 0.003, "hp", 3500, 0.8, 0.0003, 0.0008, sr), t, hg * 0.25 * a, sr);
  }
  if (full > 0) {
    c.mix(out, c.burst(r, 0.06, "lp", 260 + 80 * (2 - si), 0.9, 0.003, 0.02, sr), hit + 0.014, 0.5 * full * strike, sr);
    const sn = c.seconds(0.15 + 0.35 * full, sr), x = c.noise(r, sn), lp = c.onepole(sr), rise = 0.03 * sr, tau = (0.1 + 0.16 * full) * sr;
    let g = 0.5, tg = 0.5;
    for (let i = 0; i < sn; i++) {
      if (i % 256 === 0) tg = 0.25 + 0.75 * r();
      g += (tg - g) * 0.004;
      x[i] = lp(x[i], 350 + 900 * g) * g * Math.min(1, i / rise) * Math.exp(-i / tau);
    }
    c.fade(x, 6, sr);
    c.mix(out, x, hit + 0.012, 0.9 * full * (0.6 + 0.4 * h), sr);
    const nb = Math.round(6 + 34 * full * (0.5 + 0.5 * h)), bs = 1.25 - 0.18 * si;
    for (let i = 0; i < nb; i++) {
      const u = Math.pow(r(), 1.3), t = hit + 0.02 + u * (0.18 + 0.25 * full), d = 0.015 + 0.03 * r(), f0 = (280 + r() * 900) * bs, bn = c.seconds(d, sr);
      const b = c.osc("sine", (tt) => f0 * (1 + 2.5 * tt / d), bn, sr);
      c.multiply(b, c.env(bn, 0.002, d / 3, sr));
      c.mix(out, b, t, (0.12 + 0.22 * r()) * full * (1 - 0.5 * u), sr);
    }
  }
  let o = out;
  if (p.tail) o = c.reverb(out, { size: 0.25 + 0.1 * si, decay: 0.45 + 0.12 * si, mixAmt: 0.3 }, sr) || out;
  const N = o.length, tl = Math.floor(N * 0.12);
  for (let i = 0; i < tl; i++) o[N - tl + i] *= 0.5 + 0.5 * Math.cos(Math.PI * i / tl);
  c.fade(c.finish(o, 0.9, 1.1), 3, sr);
  c.gain(o, 0.62 + 0.33 * h);
  return { samples: o };
}
