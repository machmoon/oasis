// Sizzle drop-in: food landing in hot oil. Contact layer (thump, short pan ring, staggered veg pieces), a steam burst that thins as moisture cooks off, Poisson crackle grains, low-mid droplet pops, an oil-wash body sized by the pan, spits and egg bubbling, all dying away.
export const meta = {
  title: "Hot Oil Drop", kind: "sfx", format: "sound", duration: 2.4, price: 3, author: "foleyroom", payout: "foleyroom@creators.oasis.example", kit: "Kitchen", description: "Food hitting a hot pan: a wet thump, a roaring burst of crackle and spits, then a sizzle that thins and dies away. Use it for cooking scenes, kitchen beats and food prep cutaways.",
  tags: ["sizzle", "frying", "oil", "pan", "kitchen", "cooking", "crackle", "foley"],
};
export const params = { knobs: {
  food: { type: "choice", label: "Food", default: "meat", options: ["meat", "veg", "egg"] },
  pan: { type: "choice", label: "Pan size", default: "medium", options: ["small", "medium", "large"] },
  heat: { type: "range", label: "Oil heat", default: 0.7, min: 0, max: 1, step: 0.01 },
  moisture: { type: "range", label: "Moisture", default: 0.5, min: 0, max: 1, step: 0.01 },
  settle: { type: "range", label: "Settle length", default: 1, min: 0.3, max: 2.5, step: 0.05 },
  tail: { type: "toggle", label: "Sizzle tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, fi = params.knobs.food.options.indexOf(p.food), pi = params.knobs.pan.options.indexOf(p.pan);
  const r = c.rng(p.seed * 7919 + fi * 131 + pi * 17 + 3), h = p.heat, m = p.moisture, st = p.settle, ny = 0.45 * sr;
  const F = [
    { thump: [150, 0.8, 0.002, 0.05], pieces: 1, pop: [1000, 4500, 2.5], fizz: 1600, att: 0.004, tauK: 1, sus: 0.42, spit: 1.4, bub: 0, wash: 1.5, lowp: 1.4 },
    { thump: [300, 0.5, 0.0008, 0.025], pieces: 4 + Math.floor(r() * 3), pop: [2000, 7500, 3.5], fizz: 2800, att: 0.003, tauK: 0.45, sus: 0.25, spit: 1, bub: 0, wash: 0.9, lowp: 1 },
    { thump: [200, 0.35, 0.008, 0.04], pieces: 1, pop: [3000, 9000, 4.5], fizz: 4000, att: 0.07, tauK: 0.8, sus: 0.32, spit: 0.4, bub: 1, wash: 0.6, lowp: 0.6 },
  ][fi];
  const dens = [0.75, 1, 1.35][pi], sizeK = [1.25, 1, 0.8][pi], fizzK = [1.25, 1, 0.8][pi];
  const t0 = 0.012 + r() * 0.01, endS = t0 + 0.1 + st, endL = p.tail ? 1.2 : 0.25;
  const dur = Math.min(4, endS + endL + 0.06), n = c.seconds(dur, sr), out = new Float32Array(n);
  const tau = 0.06 + st * 0.35 * F.tauK, tS = 0.25 + 0.5 * st, sus = F.sus * (0.7 + 0.3 * h), peak = 0.9 + 0.6 * m;
  const on = [], gk = [];
  let tc = t0;
  for (let k = 0; k < F.pieces; k++) { on.push(tc); gk.push(k === 0 ? 1 : 0.35 + 0.45 * r()); tc += 0.03 + r() * 0.09; }
  const act = (t) => {
    if (t < t0) return 0;
    let b = 0;
    for (let k = 0; k < on.length; k++) if (t >= on[k]) { const d = t - on[k]; b += gk[k] * Math.min(1, d / F.att) * Math.exp(-d / tau); }
    const dt = t - t0, s = sus * (0.35 + 0.65 * Math.exp(-dt / tS)) * Math.min(1, dt / F.att);
    let rel = 1;
    if (t > endS) { const u = Math.max(0, 1 - (t - endS) / endL); rel = u * u; }
    return (peak * b + s) * rel;
  };
  const pb = [880, 600, 410][pi], pd = [0.02, 0.03, 0.045][pi];
  for (let k = 0; k < on.length; k++) {
    const g = gk[k], tf = F.thump[0] * sizeK * (0.88 + 0.24 * r());
    c.mix(out, c.burst(r, F.thump[3] * 4, "lp", tf, 0.8, F.thump[2], F.thump[3], sr), on[k], F.thump[1] * g, sr);
    c.mix(out, c.ring([[tf * 0.75, 1]], 0.09, 0.014, sr), on[k] + 0.001, 0.3 * F.thump[1] * g, sr);
    const modes = [1, 2.32, 3.87, 5.1].map((q, j) => [pb * q * (0.97 + 0.06 * r()), [1, 0.55, 0.3, 0.15][j]]);
    c.mix(out, c.ring(modes, pd * 5, pd * (fi === 2 ? 0.5 : 1), sr), on[k] + 0.0015, 0.16 * g * F.thump[1], sr);
  }
  const R0 = (550 + 800 * h) * (0.6 + 0.8 * m) * dens;
  let t = t0, grains = 0;
  while (t < dur && grains < 2400) {
    t += -Math.log(1 - r() * 0.999) / Math.max(15, R0 * act(t));
    if (t >= endS + endL) break;
    const f = Math.min(ny, (F.pop[0] + (F.pop[1] - F.pop[0]) * r()) * (0.7 + 0.5 * h) * fizzK);
    c.mix(out, c.burst(r, 0.002 + r() * 0.004, "bp", f, F.pop[2] * (0.6 + 0.8 * r()), 0.0003, 0.0006 + r() * 0.0015, sr), t, (0.08 + 0.6 * r() * r()) * act(t), sr);
    grains++;
  }
  const LR = (40 + 110 * m) * (0.5 + h) * F.lowp * dens;
  t = t0; grains = 0;
  while (t < dur && grains < 600) {
    t += -Math.log(1 - r() * 0.999) / Math.max(4, LR * act(t) / peak);
    if (t >= endS + endL) break;
    const f = (260 + 1200 * r()) * fizzK;
    c.mix(out, c.burst(r, 0.008 + r() * 0.014, "bp", f, 1.2 + r() * 1.5, 0.0006 + r() * 0.0008, 0.002 + r() * 0.005, sr), t, (0.2 + 0.6 * r()) * act(t) * 0.8, sr);
    grains++;
  }
  const spits = Math.round((3 + 14 * m) * F.spit * (0.5 + h));
  for (let k = 0; k < spits; k++) {
    const ts = on[Math.floor(r() * on.length)] + 0.005 + Math.pow(r(), 2.2) * (tau * 2 + 0.1);
    if (ts > endS) continue;
    c.mix(out, c.burst(r, 0.012 + r() * 0.01, "bp", Math.min(ny, 900 + r() * 1800 * (0.7 + 0.6 * h)), 1.2, 0.0005, 0.003 + r() * 0.003, sr), ts, (0.4 + 0.6 * r()) * act(ts) / peak, sr);
  }
  if (F.bub) {
    const nb = Math.round((10 + 20 * h) * (st + (p.tail ? 1 : 0.2)));
    for (let k = 0; k < nb; k++) {
      const tb = t0 + 0.05 + r() * (endS + endL - t0 - 0.15), fb = (420 + r() * 700) * sizeK;
      c.mix(out, c.ring([[fb, 1], [fb * (1.6 + 0.3 * r()), 0.3]], 0.04, 0.004 + 0.004 * r(), sr), tb, (0.06 + 0.1 * r()) * act(tb), sr);
    }
  }
  const nz = c.noise(r, n), pk = c.pink(r, n), fz = new Float32Array(n);
  const hp = c.biquad("hp", F.fizz * (0.8 + 0.4 * h) * fizzK, 0.7, sr), lp = c.biquad("lp", Math.min(ny, 4000 + 8000 * h), 0.6, sr);
  const wb = c.biquad("bp", [950, 680, 470][pi] * (0.9 + 0.2 * r()), 0.8, sr), wl = (0.16 + 0.14 * m) * F.wash * [0.6, 1, 1.5][pi];
  const fr = (900 + 2600 * h) * (0.6 + 0.7 * m) * dens, hiss = (0.12 + 0.12 * m) * (0.7 + 0.3 * h);
  for (let i = 0; i < n; i++) {
    const a = act(i / sr);
    let x = nz[i] * hiss * a;
    if (r() < fr * a / sr) x += (r() < 0.5 ? -1 : 1) * (0.2 + 0.8 * r() * r());
    fz[i] = lp(hp(x)) + wb(pk[i]) * wl * a;
  }
  c.mix(out, fz, 0, 0.4, sr);
  c.finish(out, 0.9, 1.1);
  c.gain(out, 0.78 + 0.17 * h);
  c.fade(out, 8, sr);
  return { samples: out };
}
