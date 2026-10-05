// Umbrella open: catch click, runner slide under swelling fabric rustle, the canopy snap (air whomp + taut-fabric crack + rib clicks), wrist flicks that fling pitched droplets, optional rim drips in a street reverb.
export const meta = {
  title: "Umbrella Snap Open", kind: "foley", format: "sound", duration: 1.2, price: 2, author: "foleyroom", payout: "foleyroom@creators.oasis.example", kit: "Rainy City Street", description: "A wet umbrella popping open and shaken off: canopy type, snap force, fabric rustle and droplet shake are knobs, for rainy street scenes, characters stepping out of doorways and cutscene foley.",
  tags: ["umbrella", "rain", "foley", "fabric", "snap", "droplets", "wet", "street"],
};
export const params = { knobs: {
  type: { type: "choice", label: "Umbrella type", default: "compact", options: ["compact", "golf", "clear dome"] },
  force: { type: "range", label: "Snap force", default: 0.6, min: 0, max: 1, step: 0.01 },
  rustle: { type: "range", label: "Fabric rustle", default: 0.5, min: 0, max: 1, step: 0.01 },
  shake: { type: "range", label: "Droplet shake", default: 0.6, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Drip tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, ti = params.knobs.type.options.indexOf(p.type), r = c.rng(p.seed * 4721 + ti * 97 + 3);
  const T = [
    { slide: 0.07, thump: 150, fab: 3600, q: 1.4, drops: 0.7, df: [2600, 5200], metal: 1, size: 0.25, click: [2300, 0.4], crinkle: false },
    { slide: 0.26, thump: 80, fab: 2100, q: 1.1, drops: 1.5, df: [1200, 3000], metal: 0.5, size: 0.6, click: [1500, 0.22], crinkle: false },
    { slide: 0.18, thump: 118, fab: 5200, q: 0.8, drops: 1.0, df: [1900, 4200], metal: 0.6, size: 0.4, click: [1800, 0.25], crinkle: true },
  ][ti];
  const f = p.force, ru = p.rustle, sh = p.shake;
  const slide = T.slide * (1.35 - 0.7 * f) * (0.92 + 0.16 * r()), t0 = 0.012, tSnap = t0 + 0.004 + slide;
  const flicks = sh > 0.02 ? 1 + Math.round(2 * sh) : 0, gap = 0.16 + 0.05 * ti;
  const shakeEnd = tSnap + 0.13 + flicks * gap + 0.4, end = shakeEnd + (p.tail ? 0.75 : 0.1);
  const out = new Float32Array(c.seconds(end, sr));
  const ramp = (b, ms) => { const m = Math.min(b.length, Math.max(1, Math.round(ms * 0.001 * sr))); for (let i = 0; i < m; i++) b[i] *= i / m; return b; };
  const drop = (fr, d, rise, amp, at, atk) => {
    const n = c.seconds(d, sr), b = new Float32Array(n), k = Math.exp(-5 / n), a = (atk || 0.0008) * sr; let ph = 0, g = 1;
    for (let i = 0; i < n; i++) { ph += c.TAU * fr * (1 + rise * i / n) / sr; b[i] = Math.sin(ph) * g * Math.min(1, i / a); g *= k; }
    c.mix(out, b, at, amp, sr);
  };
  c.mix(out, ramp(c.ring([[T.click[0], 1], [T.click[0] * 1.63, 0.5], [T.click[0] * 2.6, 0.25]], 0.05, 0.006, sr), 0.4), t0, T.click[1], sr);
  c.mix(out, c.burst(r, 0.01, "hp", 2500, 0.8, 0.0005, 0.002, sr), t0, T.click[1] * 0.6, sr);
  {
    const n = c.seconds(slide + 0.08, sr), x = c.noise(r, n), hp = c.biquad("hp", 500, 0.7, sr), op = c.onepole(sr);
    const sc = c.biquad("bp", 2900, 3.5, sr), xs = c.noise(r, n), sn = slide * sr, grain = Math.round((0.004 + 0.012 * (1 - ru)) * sr);
    const sm = T.crinkle ? 0.08 : 0.03; let g = 0, tg = 0.5;
    for (let i = 0; i < n; i++) {
      if (i % grain === 0) tg = T.crinkle ? (r() < 0.35 ? 0.6 + 0.4 * r() : 0.12) : 0.3 + 0.7 * r();
      g += (tg - g) * sm;
      const u = Math.min(1, i / sn), e = i < sn ? Math.pow(u, 1.5) : Math.exp(-(i - sn) / (0.025 * sr));
      const y = op(hp(x[i]), T.fab * (0.4 + 1.0 * u));
      x[i] = (y * g * (0.05 + 0.9 * ru) * 1.6 + sc(xs[i]) * 0.06 * (1 - 0.5 * u)) * e * Math.min(1, i / (0.003 * sr));
    }
    c.mix(out, x, t0 + 0.004, 1, sr);
  }
  const th = T.thump * (0.97 + 0.06 * r()), att = 3 - 2.5 * f;
  c.mix(out, ramp(c.ring([[th, 1], [th * 1.58, 0.45], [th * 2.7, T.crinkle ? 0.3 : 0.15]], 0.4, (0.03 + 0.06 * T.size) * (0.7 + 0.6 * f) * (T.crinkle ? 1.15 : 1), sr), att), tSnap, 0.25 + 0.75 * f, sr);
  c.mix(out, c.burst(r, 0.12, "lp", 200 + 300 * f, 0.7, 0.002, 0.02 + 0.04 * T.size, sr), tSnap - 0.003, 0.4 + 0.6 * f, sr);
  c.mix(out, c.burst(r, 0.035, "bp", T.fab * (0.6 + 0.6 * f), T.q, 0.0005, 0.004 + 0.006 * (1 - f), sr), tSnap, 0.15 + 0.6 * f, sr);
  if (T.crinkle) for (let k = 0; k < 10; k++) c.mix(out, c.burst(r, 0.006, "hp", 3000 + r() * 3000, 0.8, 0.0005, 0.0015, sr), tSnap + 0.004 + r() * 0.08, (0.08 + 0.12 * r()) * (0.4 + 0.6 * f), sr);
  for (let k = 0; k < 3; k++) {
    const m = 0.94 + 0.12 * r();
    c.mix(out, ramp(c.ring([[3100 * m, 1], [4700 * m, 0.5], [7300 * m, 0.3]], 0.05, 0.004 + 0.008 * T.metal, sr), 0.3), tSnap + 0.002 + k * (0.003 + 0.004 * r()), (0.1 + 0.25 * f) * T.metal, sr);
  }
  if (ti === 0) for (let k = 0; k < 4; k++) c.mix(out, ramp(c.ring([[2400 + r() * 900, 1], [5200 + r() * 800, 0.4]], 0.03, 0.004, sr), 0.3), tSnap + 0.02 + r() * 0.07, 0.06 + 0.08 * f, sr);
  c.mix(out, c.burst(r, 0.08, "bp", T.fab * 0.8, 1, 0.004, 0.02, sr), tSnap + 0.03, 0.3 * ru, sr);
  if (sh > 0.02) {
    c.mix(out, c.burst(r, 0.06, "bp", 4500, 0.8, 0.003, 0.02, sr), tSnap + 0.002, 0.2 * sh, sr);
    for (let d = 0, nd = Math.round(sh * 14 * T.drops); d < nd; d++) drop(c.between(r, T.df[0], T.df[1]), 0.006 + 0.01 * r(), 0.4 + 0.8 * r(), (0.07 + 0.15 * r()) * sh, tSnap + r() * 0.05);
  }
  for (let k = 0; k < flicks; k++) {
    const tf = tSnap + 0.1 + k * gap + r() * 0.03, nd = Math.round((6 + 34 * sh) * T.drops);
    c.mix(out, ramp(c.ring([[th * 1.1, 1], [th * 1.9, 0.3]], 0.15, 0.03, sr), 2), tf, 0.18 * (0.5 + 0.5 * sh), sr);
    c.mix(out, c.burst(r, 0.05, "bp", T.fab, 1, 0.003, 0.015, sr), tf, 0.1 + 0.35 * ru, sr);
    c.mix(out, c.burst(r, 0.06, "bp", 4500, 0.8, 0.003, 0.02, sr), tf + 0.005, 0.12 * sh, sr);
    for (let d = 0; d < nd; d++) drop(c.between(r, T.df[0], T.df[1]), 0.006 + 0.01 * r(), 0.4 + 0.8 * r(), (0.1 + 0.2 * r()) * (0.6 + 0.4 * sh), tf + Math.pow(r(), 1.4) * 0.09);
    for (let d = 0; d < nd / 2; d++) c.mix(out, c.burst(r, 0.01, "bp", c.between(r, 2500, 5500), 2, 0.001, 0.0025, sr), tf + 0.18 + r() * 0.2, 0.04 + 0.08 * r(), sr);
  }
  let o = out;
  if (p.tail) {
    let t = shakeEnd - 0.38;
    for (let d = 0, nd = 7 + Math.round(6 * sh * T.drops); d < nd && t < end - 0.12; d++) {
      drop(c.between(r, 700, 1600), 0.02 + 0.015 * r(), 1.2 + 0.6 * r(), (0.11 + 0.07 * r()) * (1 - d / nd * 0.6), t, 0.0018);
      c.mix(out, c.burst(r, 0.014, "lp", c.between(r, 1800, 3000), 0.8, 0.0015, 0.004, sr), t, 0.035, sr);
      t += 0.03 + 0.05 * r() * (1 + 0.25 * d);
    }
    o = c.reverb(out, { size: 0.35 + 0.3 * T.size, decay: 0.5, mixAmt: 0.22 }, sr) || out;
  }
  c.finish(o, 0.9, 1.1);
  c.gain(o, 0.68 + 0.32 * f);
  let last = o.length - 1;
  while (last > 0 && Math.abs(o[last]) < 0.001) last--;
  const s = o.slice(0, Math.min(o.length, last + c.seconds(0.02, sr)));
  c.fade(s, 5, sr);
  return { samples: s };
}
