// Hull impact: a weapon hit shuddering through a starship hull. A bright crack at sample zero, a sagging sine boom and
// brown-noise shudder under a decelerating hull tremolo, detuned-twin hull modes, a gliding stick-slip groan, debris rattle, a tail.
export const meta = {
  title: "Hull Breach Hit", kind: "impact", format: "sound", duration: 1.85, price: 4, author: "quietmachine", payout: "quietmachine@creators.oasis.example", kit: "Sci-fi Console", description: "A weapon strike shuddering through a starship hull, from a glancing graze to a heavy blow. Boom, metal groan, rattle and tail are knobs, and every seed is a different hit.",
  tags: ["impact", "hull", "sci-fi", "weapon", "explosion", "metal", "starship", "hit"],
};
export const params = { knobs: {
  size: { type: "choice", label: "Size", default: "hit", options: ["graze", "hit", "heavy"] },
  boom: { type: "range", label: "Low boom", default: 0.6, min: 0, max: 1, step: 0.01 },
  groan: { type: "range", label: "Metal groan", default: 0.5, min: 0, max: 1, step: 0.01 },
  rattle: { type: "range", label: "Rattle", default: 0.5, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, si = params.knobs.size.options.indexOf(p.size), r = c.rng(p.seed * 6151 + si * 97 + 3);
  const S = [
    { dur: 0.8, tl: 0.3, bf: [120, 62], bd: 0.08, bg: 0.45, body: 520, bdec: 0.12, bodyG: 0.55, crack: 5600, crackG: 1.0, gf: [210, 140], gG: 0.6, rn: 26, rt: 0.2, verb: 0.35, scrape: 1, sh: [20, 12] },
    { dur: 1.4, tl: 0.45, bf: [88, 42], bd: 0.22, bg: 0.85, body: 205, bdec: 0.34, bodyG: 0.7, crack: 3300, crackG: 0.8, gf: [150, 85], gG: 0.85, rn: 60, rt: 0.4, verb: 0.6, scrape: 0.15, sh: [16, 8] },
    { dur: 2.1, tl: 0.6, bf: [66, 29], bd: 0.45, bg: 1.1, body: 108, bdec: 0.65, bodyG: 0.85, crack: 2100, crackG: 0.7, gf: [110, 58], gG: 1.0, rn: 110, rt: 0.7, verb: 0.85, scrape: 0, sh: [13, 6] },
  ][si];
  const dur = S.dur, total = dur + (p.tail ? S.tl : 0), N = c.seconds(total, sr);
  let out = new Float32Array(N);
  const hull = new Float32Array(c.seconds(dur, sr));
  c.mix(out, c.burst(r, 0.035, "bp", S.crack * (0.9 + 0.2 * r()), 0.8, 0.0008, 0.007, sr), 0, S.crackG, sr);
  c.mix(out, c.burst(r, 0.012, "hp", 3000, 0.7, 0.0004, 0.003, sr), 0, 0.5 * S.crackG, sr);
  if (S.scrape > 0) {
    const n = c.seconds(0.28, sr), x = c.noise(r, n), lp = c.onepole(sr), hp = c.biquad("hp", 700, 0.7, sr), e = c.env(n, 0.002, 0.08, sr);
    for (let i = 0; i < n; i++) x[i] = hp(lp(x[i], 1500 + 5500 * Math.exp(-i / sr / 0.07))) * e[i];
    c.mix(out, x, 0.002, 0.7 * S.scrape, sr);
  }
  const bn = c.seconds(Math.min(dur, S.bd * 5 + 0.05), sr), f0 = S.bf[0] * (0.95 + 0.1 * r()), f1 = S.bf[1];
  const bm = c.multiply(c.osc("sine", (t) => f1 + (f0 - f1) * Math.exp(-t / 0.06), bn, sr), c.env(bn, 0.003, S.bd, sr));
  c.mix(hull, bm, 0, (0.05 + 0.95 * p.boom) * S.bg, sr);
  const sn = c.seconds(Math.min(dur * 0.8, S.bd * 4 + 0.2), sr), sh = c.brown(r, sn), slp = c.biquad("lp", 140, 0.8, sr);
  for (let i = 0; i < sn; i++) sh[i] = slp(sh[i]) * Math.exp(-i / sr / (S.bd * 1.4)) * Math.min(1, i / (0.004 * sr));
  c.mix(hull, sh, 0, 2.5 * p.boom * S.bg, sr);
  const ratios = [1, 1.47, 2.09, 2.56, 3.37, 4.11, 5.2], modes = [];
  for (let k = 0; k < ratios.length; k++) {
    const f = S.body * ratios[k] * (0.985 + 0.03 * r()), a = (0.4 + 0.6 * r()) / (1 + 0.5 * k);
    modes.push([f, a], [f * (1.002 + 0.005 * r()), a * (0.5 + 0.4 * r())]);
  }
  c.mix(hull, c.ring(modes, Math.min(dur, S.bdec * 5), S.bdec, sr), 0.001, 0.6 * S.bodyG, sr);
  {
    const fa = S.sh[0] * (0.9 + 0.2 * r()), fb = S.sh[1] * (0.9 + 0.2 * r()), tau = dur * 0.3;
    let ph = r();
    for (let i = 0; i < hull.length; i++) {
      const t = i / sr;
      ph += (fb + (fa - fb) * Math.exp(-t / tau)) / sr;
      const d = 0.65 * Math.min(1, t / 0.02) * Math.exp(-t / (dur * 0.6));
      hull[i] *= 1 - d * (0.5 + 0.5 * Math.sin(c.TAU * ph));
    }
  }
  c.mix(out, hull, 0, 1, sr);
  if (p.groan > 0) {
    const gs = 0.03 + 0.04 * r(), gd = dur * 0.8 - gs, gn = c.seconds(gd, sr), g = new Float32Array(gn);
    const dc = c.biquad("hp", 50, 0.7, sr), res = c.biquad("bp", S.body * (2.2 + 0.6 * r()), 4, sr), lp = c.biquad("lp", 2200, 0.7, sr);
    let ph = 0, amp = 1, w = 0, wt = 0, gf0 = S.gf[0] * (0.92 + 0.16 * r()), gf1 = S.gf[1] * (0.9 + 0.2 * r()), att = 0.06 + 0.08 * r();
    for (let i = 0; i < gn; i++) {
      if (i % 256 === 0) wt = c.clamp(wt + (r() - 0.5) * 0.35, -1, 1);
      w += (wt - w) * 0.002;
      const u = i / gn, t = i / sr;
      ph += (gf0 + (gf1 - gf0) * u * (2 - u)) * (1 + 0.08 * w) / sr;
      if (ph >= 1) { ph -= 1; amp = r() < 0.08 ? 0.2 : 0.6 + 0.4 * r(); }
      const pulse = dc(amp * Math.exp(-ph * 9));
      const e = Math.min(1, (t / att) * (t / att)) * Math.exp(-t / (gd * 0.4)) * Math.min(1, (gn - i) / (0.03 * sr));
      g[i] = (0.8 * lp(pulse) + 1.2 * res(pulse)) * e;
    }
    c.mix(out, g, gs, 0.9 * p.groan * S.gG, sr);
  }
  const rc = Math.round(S.rn * p.rattle * 1.4);
  for (let k = 0; k < rc; k++) {
    const t = Math.min(dur * 0.75, 0.015 + -Math.log(1 - 0.98 * r()) * S.rt * 0.5);
    const a = (0.3 + 0.7 * r()) * Math.exp(-t / S.rt) * (0.25 + 0.2 * p.rattle), f = 900 + 3200 * r();
    c.mix(out, c.ring([[f, 1], [f * (1.5 + 0.9 * r()), 0.5]], 0.07, 0.008 + 0.015 * r(), sr), t, a, sr);
    if (r() < 0.5) c.mix(out, c.burst(r, 0.006, "bp", 2500 + 3000 * r(), 3, 0.0003, 0.0015, sr), t, a * 0.6, sr);
  }
  if (p.tail) out = c.reverb(out, { size: 0.45 + 0.4 * S.verb, decay: 0.35 + 0.35 * S.verb, mixAmt: 0.16 + 0.08 * S.verb }, sr);
  const L = out.length, fz = Math.round(L * 0.18);
  for (let i = 0; i < fz; i++) out[L - fz + i] *= 0.5 + 0.5 * Math.cos(Math.PI * i / fz);
  c.finish(out, 0.9, 1.3);
  c.fade(out, 30, sr);
  out[0] = 0;
  return { samples: out };
}
