// Leaf-litter footstep: a shoe-specific landing body (boot heel knock and pitched thump, bare-foot flesh press, four-pad
// paw patter with claw ticks) bridged into one roll by a compressing rustle wash, then bright clustered leaf fractures,
// a crisp fizz and settling ticks that follow dryness and crunch. Wet leaves trade snaps for one dull squish.
export const meta = {
  title: "Leaf Litter Step", kind: "foley", format: "sound", duration: 0.4, price: 1, author: "stormfront", payout: "stormfront@creators.oasis.example", kit: "Forest at Night", description: "One footstep on forest-floor leaf litter: boot heel, bare foot or animal paw, with weight, leaf dryness, crunch depth and heel-to-toe roll as knobs; every seed is a different step for night-walk foley.",
  tags: ["footstep", "leaves", "forest", "foley", "crunch", "walk", "night", "paw"],
};
export const params = { knobs: {
  shoe: { type: "choice", label: "Shoe", default: "boot", options: ["bare", "boot", "paw"] },
  weight: { type: "range", label: "Weight", default: 0.5, min: 0, max: 1, step: 0.01 },
  dryness: { type: "range", label: "Leaf dryness", default: 0.7, min: 0, max: 1, step: 0.01 },
  crunch: { type: "range", label: "Crunch depth", default: 0.5, min: 0, max: 1, step: 0.01 },
  roll: { type: "range", label: "Heel-to-toe roll", default: 0.4, min: 0, max: 1, step: 0.01 },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, si = params.knobs.shoe.options.indexOf(p.shoe), r = c.rng(p.seed * 6151 + si * 389 + 11);
  const w = p.weight, dry = p.dryness, cr = p.crunch, nyq = 0.43 * sr, tail = 0.012 * sr;
  const fk = 1.15 - 0.4 * w, dk = 0.7 + 0.8 * w, ak = 0.45 + 0.65 * w;
  const lvl = { boot: 1, bare: 0.82, paw: 0.75 }[p.shoe], gs = { boot: 1, bare: 0.65, paw: 0.45 }[p.shoe];
  const cts = [];
  if (p.shoe === "paw") { let t = 0; for (let k = 0; k < 4; k++) { cts.push([t, 1 - 0.12 * k]); t += (0.01 + 0.022 * p.roll) * (0.6 + 0.8 * r()); } }
  else { const rt = (p.shoe === "boot" ? 0.03 + 0.09 * p.roll : 0.04 + 0.1 * p.roll) * (0.85 + 0.3 * r()); cts.push([0, 1], [rt, p.shoe === "boot" ? 0.55 : 0.7]); }
  const rollT = cts[cts.length - 1][0], spread = (0.04 + 0.12 * cr) * (0.7 + 0.6 * w) * (p.shoe === "paw" ? 0.6 : 1);
  const out = new Float32Array(c.seconds(rollT + spread + 0.11, sr));
  const thump = (t0, f, att, dec, a) => {
    const n = c.seconds(att + dec * 6, sr), s = c.osc("sine", (t) => f * (1 + 0.9 * Math.exp(-t / 0.01)), n, sr);
    const s2 = c.osc("sine", (t) => f * 2.6 * (1 + 0.5 * Math.exp(-t / 0.008)), n, sr), e = c.env(n, att, dec, sr), e2 = c.env(n, att, dec * 0.5, sr);
    for (let i = 0; i < n; i++) s[i] = s[i] * e[i] + 0.35 * s2[i] * e2[i];
    c.mix(out, s, t0, a, sr);
  };
  for (let k = 0; k < cts.length; k++) {
    const [t, a] = cts[k], j = 0.94 + 0.12 * r();
    if (p.shoe === "boot") {
      thump(t, (k ? 92 : 70) * fk * j, k ? 0.003 : 0.0012, (k ? 0.03 : 0.05) * dk, (k ? 0.5 : 0.95) * ak);
      c.mix(out, c.burst(r, 0.008, "hp", 2400 + 1200 * r(), 0.8, 0.0004, 0.0018, sr), t, (k ? 0.25 : 0.6) * a, sr);
      c.mix(out, c.ring([[170 * j, 1], [415 * j, 0.5], [760 * j, 0.25]], 0.05, 0.007, sr), t + 0.0005, 0.35 * a * ak, sr);
    } else if (p.shoe === "bare") {
      thump(t, (k ? 105 : 88) * fk * j, 0.006, 0.035 * dk, 0.75 * a * ak);
      c.mix(out, c.burst(r, 0.06, "lp", 350 + 100 * r(), 0.8, 0.005, 0.025 * dk, sr), t, 0.5 * a * ak, sr);
      c.mix(out, c.burst(r, 0.02, "bp", 1000 + 300 * r(), 0.7, 0.002, 0.006, sr), t + 0.002, 0.18 * a, sr);
    } else {
      thump(t, (155 + 50 * r()) * fk, 0.0025, 0.016 * dk, 0.55 * a * ak);
      c.mix(out, c.burst(r, 0.025, "lp", 600, 0.8, 0.002, 0.008, sr), t, 0.3 * a, sr);
      if (r() < 0.75) c.mix(out, c.burst(r, 0.003, "hp", 5500 + 2000 * r(), 1, 0.0002, 0.0006, sr), t + 0.002 + 0.004 * r(), 0.25 * a, sr);
    }
  }
  const rn = c.seconds(rollT + spread + 0.06, sr), x = c.pink(r, rn), bp = c.biquad("bp", Math.min(nyq, 1200 + 4200 * dry), 0.7, sr);
  const tau = rollT + 0.03 + 0.07 * cr;
  let fl = 1, nx = 0;
  for (let i = 0; i < rn; i++) {
    if (i >= nx) { fl = 0.3 + 0.7 * r(); nx = i + Math.round(sr * (0.0015 + 0.005 * r())); }
    x[i] = bp(x[i]) * Math.min(1, i / (0.003 * sr)) * Math.exp(-i / sr / tau) * Math.min(1, (rn - i) / tail) * fl;
  }
  c.mix(out, x, 0.001, (0.12 + 0.25 * cr) * (0.4 + 0.6 * dry) * Math.sqrt(gs), sr);
  const lo = Math.min(nyq * 0.5, 700 + 3300 * dry), span = Math.min(nyq - lo, 1500 + 5000 * dry);
  const count = Math.round((16 + 80 * cr) * (0.45 + 0.75 * dry) * (0.7 + 0.5 * w) * gs);
  for (let g = 0; g < count; g++) {
    const [ct, ca] = cts[Math.floor(r() * cts.length)], t0 = ct + Math.pow(r(), 1.8) * spread;
    const lf = lo + r() * span, la = (0.15 + 0.5 * r()) * (0.4 + 0.6 * dry) * ca, snaps = 1 + Math.floor(r() * (1 + 3 * dry));
    for (let s = 0, t = t0; s < snaps; s++) {
      const gd = 0.0015 + 0.008 * (1 - dry) + r() * 0.002, dec = 0.0005 + 0.004 * (1 - dry) + r() * 0.0008;
      c.mix(out, c.burst(r, gd, "bp", Math.min(nyq, lf * (0.75 + 0.5 * r())), 0.9 + 0.6 * r(), 0.0003, dec, sr), t, la * (1 - 0.18 * s), sr);
      t += 0.0008 + r() * r() * 0.008 * (1.3 - dry);
    }
  }
  if (dry > 0.2) {
    const fn = c.seconds(rollT + spread * 0.8 + 0.02, sr), f = c.noise(r, fn), hp = c.biquad("hp", Math.min(nyq, 3500 + 2500 * dry), 0.7, sr);
    let gt = 0, gx = 0;
    for (let i = 0; i < fn; i++) {
      if (i >= gx) { gt = r() < 0.35 ? r() : 0; gx = i + Math.round(sr * (0.001 + 0.004 * r())); }
      f[i] = hp(f[i]) * gt * Math.min(1, i / (0.002 * sr)) * Math.exp(-i / sr / (rollT + 0.05)) * Math.min(1, (fn - i) / tail);
    }
    c.mix(out, f, 0.001, 0.3 * (dry - 0.2) * (0.3 + 0.7 * cr) * Math.sqrt(gs), sr);
  }
  if (dry < 0.6) {
    const wet = (0.6 - dry) / 0.6;
    c.mix(out, c.burst(r, rollT + 0.09, "lp", 450 + 250 * w, 1, 0.004, rollT * 0.6 + 0.03, sr), 0.001, 0.45 * wet * ak, sr);
  }
  const settle = 2 + Math.round(8 * dry * cr * gs);
  for (let g = 0; g < settle; g++) {
    const t = rollT + spread * (0.4 + 0.6 * r()) + r() * 0.04;
    c.mix(out, c.burst(r, 0.003 + r() * 0.004, "bp", Math.min(nyq, lo + r() * span), 1.1, 0.0003, 0.0008 + 0.002 * (1 - dry), sr), t, (0.06 + 0.14 * r()) * (0.4 + 0.6 * dry), sr);
  }
  c.filter(out, c.biquad("hp", 35, 0.7, sr));
  c.finish(out, 0.95, 1.1);
  c.gain(out, lvl * (0.78 + 0.22 * w));
  c.fade(out, 4, sr);
  return { samples: out };
}
