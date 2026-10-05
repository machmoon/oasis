// Office chair roll: a steady caster roll built from five wheels, each turning at its own rate and thumping once per revolution (flat spot), over a floor-specific bed and rumble; seam clacks from front and rear casters, rattle ticks, a stick-slip seat creak, and an optional coasting stop where the wheel rate falls and the chair settles.
export const meta = {
  title: "Office Chair Roll", kind: "foley", format: "sound", duration: 3, price: 2, author: "foleyroom", payout: "foleyroom@creators.oasis.example", kit: "Office", description: "An office chair rolling steadily across carpet, hard floor or a chair mat, with per-wheel bumps, seam clacks, rattle, a stick-slip seat creak and an optional coasting stop; for open-plan office scenes and cutscenes.",
  tags: ["office", "chair", "roll", "casters", "wheels", "creak", "foley", "furniture"],
};
export const params = { knobs: {
  floor: { type: "choice", label: "Floor", default: "hard floor", options: ["carpet", "hard floor", "chair mat"] },
  speed: { type: "range", label: "Roll speed", default: 1, min: 0.5, max: 2, step: 0.05 },
  rattle: { type: "range", label: "Caster rattle", default: 0.5, min: 0, max: 1, step: 0.01 },
  creak: { type: "range", label: "Creak", default: 0.5, min: 0, max: 1, step: 0.01 },
  distance: { type: "range", label: "Distance", default: 0.2, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Coasting tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, fi = params.knobs.floor.options.indexOf(p.floor), r = c.rng(p.seed * 613 + fi * 71 + 3);
  const dur = 3, n = c.seconds(dur, sr), out = new Float32Array(n), sp = p.speed;
  const roll = p.tail ? 1.7 : 2.65;
  const amp = new Float32Array(n), fac = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / sr; let a = Math.min(1, t / 0.15), f = 1;
    if (p.tail) { if (t > roll) { const u = Math.min(1, (t - roll) / 1.2); f = 1 - 0.85 * u * (2 - u); a *= Math.pow(f, 1.3); } }
    else if (t > roll) a *= Math.max(0, 1 - (t - roll) / 0.3);
    a *= Math.min(1, (dur - t) / 0.2);
    amp[i] = a * (0.93 + 0.07 * Math.sin(t * 3.1 + p.seed)); fac[i] = f;
  }
  const bed = c.pink(r, n), wh = c.noise(r, n), rum = c.brown(r, n);
  const cfg = [[700, 3800, 0.9, 0.5, 0.5], [1600, 8000, 0.55, 1, 1], [500, 3800, 0.8, 0.8, 0.8]][fi];
  const hp = c.biquad("hp", cfg[0], 0.7, sr), lp = c.biquad("lp", cfg[1], 0.7, sr), lr = c.biquad("lp", 140, 0.8, sr);
  const wf = [900, 2900, 1500][fi] * (0.8 + 0.4 * sp), wb = c.biquad("bp", wf, fi === 1 ? 5 : 2, sr);
  const lvl = 0.6 + 0.4 * Math.min(1, sp / 1.3), rate = [], ph = [], ca = [];
  for (let j = 0; j < 5; j++) { rate.push((2.6 + j * 0.37 + r() * 0.3) * sp); ph.push(r()); ca.push(0.55 + 0.45 * r()); }
  const wg = [0.25, 0.9, 0.5][fi];
  for (let i = 0; i < n; i++) {
    const t = i / sr, f = fac[i], m = 0.75 + 0.25 * Math.sin(c.TAU * ph[0]);
    bed[i] = hp(lp(bed[i])) * amp[i] * lvl * cfg[2];
    wh[i] = wb(wh[i]) * amp[i] * lvl * wg * (0.6 + 0.4 * Math.sin(c.TAU * ph[1]));
    rum[i] = lr(rum[i]) * amp[i] * lvl * m;
    for (let j = 0; j < 5; j++) {
      ph[j] += rate[j] * f / sr;
      if (ph[j] >= 1) {
        ph[j] -= 1;
        const a = ca[j] * amp[i] * (0.5 + 0.5 * p.rattle) * (0.7 + 0.3 * r());
        if (a < 0.03) continue;
        if (fi === 0) c.mix(out, c.burst(r, 0.03, "lp", 160 + r() * 80, 0.8, 0.004, 0.012, sr), t, a * 0.7, sr);
        else if (fi === 1) { c.mix(out, c.burst(r, 0.012, "bp", 2400 + r() * 1800, 2, 0.0008, 0.004, sr), t, a * 0.7, sr); c.mix(out, c.burst(r, 0.03, "lp", 200, 0.8, 0.002, 0.01, sr), t, a * 0.5, sr); }
        else c.mix(out, c.ring([[320 + r() * 30, 1], [760 + r() * 60, 0.5], [1300 + r() * 100, 0.3]], 0.08, 0.02, sr), t, a * 0.55, sr);
      }
    }
  }
  c.mix(out, bed, 0, 1.2, sr);
  c.mix(out, wh, 0, 1.6, sr);
  c.mix(out, rum, 0, 1.3 * cfg[3], sr);
  const ticks = Math.round((8 + 70 * p.rattle) * sp * roll * cfg[4]);
  for (let k = 0; k < ticks; k++) {
    const t = 0.15 + r() * (roll - 0.15), a = (0.15 + 0.45 * r()) * (0.25 + 0.75 * p.rattle) * (0.4 + 0.6 * cfg[4]);
    c.mix(out, c.burst(r, 0.005 + r() * 0.008, "bp", (1500 + r() * 3000) * (0.6 + 0.6 * fi), 3, 0.0004, 0.002 + r() * 0.003, sr), t, a, sr);
  }
  const gap = 0.55 / sp;
  for (let t = 0.3 + r() * 0.2; t < roll - 0.1; t += gap * (0.85 + 0.3 * r())) {
    for (let d = 0; d < 2; d++) {
      const tt = t + d * 0.1 / sp, g = d ? 0.7 : 1;
      if (fi === 0) c.mix(out, c.burst(r, 0.05, "lp", 170, 0.8, 0.006, 0.02, sr), tt, 0.4 * g, sr);
      else if (fi === 1) { c.mix(out, c.ring([[95 + r() * 20, 1], [260 + r() * 40, 0.5]], 0.12, 0.025, sr), tt, 0.7 * g, sr); c.mix(out, c.burst(r, 0.01, "bp", 3200, 1, 0.0006, 0.003, sr), tt, 0.7 * g, sr); }
      else c.mix(out, c.ring([[400 + r() * 40, 1], [980, 0.5], [1650, 0.25]], 0.14, 0.035, sr), tt, 0.65 * g, sr);
    }
  }
  const nc = p.creak > 0.02 ? 1 + Math.round(p.creak * 3) : 0;
  for (let k = 0; k < nc; k++) {
    const len = 0.4 + r() * 0.4, m = c.seconds(len, sr), x = new Float32Array(m);
    const t0 = 0.2 + (k + r() * 0.5) * (roll - 0.2 - len) / Math.max(1, nc);
    const f0 = 380 + r() * 350, f1 = f0 * (r() < 0.5 ? 0.62 : 1.6), sf = 14 + r() * 14;
    let phs = 0, sl = 0;
    for (let i = 0; i < m; i++) {
      const u = i / m; sl += sf * (1 + 0.3 * Math.sin(u * 9)) / sr; sl -= Math.floor(sl);
      phs += c.TAU * (f0 + (f1 - f0) * u) * (1 + 0.04 * Math.exp(-8 * sl)) / sr;
      let s = 0;
      for (let h = 1; h <= 8; h++) s += Math.sin(h * phs + h) / (h * 0.8);
      x[i] = s * (0.2 + 0.8 * Math.exp(-6 * sl)) * Math.sin(Math.PI * u);
    }
    c.mix(out, x, t0, 0.9 * p.creak * (0.7 + 0.3 * r()), sr);
  }
  if (p.tail) {
    const base = roll + 1.15;
    for (let k = 0; k < 5; k++) c.mix(out, c.burst(r, 0.01, "bp", (2000 + r() * 1500) * (0.6 + 0.5 * fi), 3, 0.0004, 0.003, sr), base + k * 0.08 * (1 + k * 0.5), 0.3 * Math.exp(-k * 0.4) * (0.4 + p.rattle), sr);
    c.mix(out, c.ring([[130, 1], [330, 0.4]], 0.15, 0.04, sr), base + 0.05, 0.25, sr);
  } else c.mix(out, c.ring([[120, 1], [310, 0.4]], 0.12, 0.03, sr), roll + 0.1, 0.3, sr);
  const far = p.distance;
  c.filter(out, c.biquad("lp", 12000 - 9000 * far, 0.7, sr));
  c.gain(out, 1 - 0.6 * far);
  let res = out;
  if (far > 0.05) res = c.reverb(out, { size: 0.3 + 0.4 * far, decay: 0.3, mixAmt: 0.35 * far }, sr);
  c.fade(res, 20, sr);
  c.finish(res, 0.8, 1.1);
  return { samples: res };
}
