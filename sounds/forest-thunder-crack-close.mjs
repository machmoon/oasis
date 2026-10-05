// Close lightning: a torn bright crack (N-wave edge plus sub-cracks), a ripping crackle, a noise-born sub boom with a mid-band body, then an irregular roll of low claps whose level and brightness move together, with an optional long reverberant tail.
export const meta = {
  title: "Overhead Strike", kind: "impact", format: "sound", duration: 3.6, price: 4, author: "stormfront", payout: "stormfront@creators.oasis.example", kit: "Forest at Night", description: "A sharp close lightning strike that tears open with a bright crack and crackle, drops a sub boom and rolls off into the forest; proximity, crack, boom, crackle, pitch and the long tail are knobs.",
  tags: ["thunder", "lightning", "strike", "crack", "storm", "impact", "weather", "boom"],
};
export const params = { knobs: {
  proximity: { type: "choice", label: "Proximity", default: "overhead", options: ["overhead", "near", "mid"] },
  crack: { type: "range", label: "Crack intensity", default: 0.7, min: 0, max: 1, step: 0.01 },
  boom: { type: "range", label: "Sub boom", default: 0.6, min: 0, max: 1, step: 0.01 },
  crackle: { type: "range", label: "Crackle", default: 0.5, min: 0, max: 1, step: 0.01 },
  pitch: { type: "range", label: "Pitch", default: 0.5, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Long roll tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, pi = params.knobs.proximity.options.indexOf(p.proximity);
  const r = c.rng(p.seed * 6151 + pi * 97 + 3);
  const P = [{ d: 0, lp: 15000, ck: 1, sp: 0.015, roll: 0.8, lvl: 1 }, { d: 0.025, lp: 8000, ck: 0.75, sp: 0.035, roll: 0.95, lvl: 0.82 },
    { d: 0.09, lp: 3600, ck: 0.5, sp: 0.07, roll: 1.1, lvl: 0.62 }][pi];
  const k = Math.pow(2, (p.pitch - 0.5) * 1.4), d = P.d;
  const dur = p.tail ? 3.6 : 1.5, n = c.seconds(dur, sr), out = new Float32Array(n);
  const norm = (b) => { let m = 1e-9; for (let i = 0; i < b.length; i++) m = Math.max(m, Math.abs(b[i])); for (let i = 0; i < b.length; i++) b[i] /= m; return b; };
  const endFade = (b, s) => { const f = Math.min(b.length, c.seconds(s, sr)); for (let i = 0; i < f; i++) b[b.length - 1 - i] *= 0.5 - 0.5 * Math.cos(Math.PI * i / f); return b; };
  const cg = (0.25 + 1.0 * p.crack) * P.ck;
  c.mix(out, c.burst(r, 0.07, "hp", 700 * k, 0.7, 0.0004, 0.01 + 0.012 * p.crack, sr), d, cg, sr);
  c.mix(out, c.burst(r, 0.05, "lp", 380 * k, 0.8, 0.0008, 0.015, sr), d + 0.001, 0.8 * cg, sr);
  const subs = 2 + Math.round(6 * p.crack);
  for (let s = 0; s < subs; s++) {
    const t = d + 0.002 + r() * (0.02 + P.sp);
    c.mix(out, c.burst(r, 0.03, "bp", (1800 + r() * 5200) * k, 0.7 + r() * 0.6, 0.0003 + r() * 0.0008, 0.003 + r() * 0.01, sr), t, cg * (0.35 + 0.6 * r()), sr);
  }
  const grains = Math.round(25 + 520 * p.crackle), span = p.tail ? 0.9 : 0.6;
  for (let g = 0; g < grains; g++) {
    const u = Math.pow(r(), 1.8), t = d + 0.01 + u * span;
    c.mix(out, c.burst(r, 0.01, "bp", (1400 + r() * 7600) * k, 1.2 + r() * 2.5, 0.0002 + r() * 0.0006, 0.0012 + r() * 0.004, sr), t,
      (0.08 + 0.45 * p.crackle) * (0.3 + 0.7 * r()) * (1 - 0.8 * u) * (0.6 + 0.4 * P.ck), sr);
  }
  const bdec = 0.16 + 0.34 * p.boom, room = n - c.seconds(d + 0.01, sr) - 1;
  const bn = Math.min(room, c.seconds(bdec * 7 + 0.05, sr));
  const thump = c.osc("sine", (t) => (42 + 58 * Math.exp(-t * 12)) * k, bn, sr), te = c.env(bn, 0.006, 0.08 + 0.08 * p.boom, sr);
  const rumb = c.brown(r, bn), blp = c.biquad("lp", 85 * k, 0.8, sr), bhp = c.biquad("hp", 22, 0.7, sr), be = c.env(bn, 0.015, bdec, sr);
  for (let i = 0; i < bn; i++) rumb[i] = bhp(blp(rumb[i])) * be[i];
  norm(rumb);
  for (let i = 0; i < bn; i++) rumb[i] = 0.75 * rumb[i] + 0.6 * thump[i] * te[i];
  c.mix(out, endFade(rumb, 0.08), d + 0.004, 0.25 + 0.7 * p.boom, sr);
  const body = c.pink(r, bn), bbp = c.biquad("bp", (220 + r() * 80) * k, 0.9, sr), be2 = c.env(bn, 0.01, 0.1 + 0.12 * p.boom, sr);
  for (let i = 0; i < bn; i++) body[i] = bbp(body[i]) * be2[i];
  c.mix(out, endFade(norm(body), 0.06), d + 0.006, 0.18 + 0.22 * p.boom, sr);
  const rs = d + 0.05, rn = n - c.seconds(rs, sr), rdec = p.tail ? 1.5 : 0.45;
  const ge = new Float32Array(rn), bumps = 4 + Math.floor(r() * 5);
  c.mix(ge, c.env(c.seconds(1.2, sr), 0.03, 0.35, sr), 0, 1, sr);
  for (let b = 0; b < bumps; b++) {
    const tb = 0.08 + Math.pow(r(), 1.2) * (rn / sr) * 0.75, m = c.seconds(Math.min(1.6, rn / sr - tb), sr);
    if (m < 8) continue;
    const a = (0.45 + 0.55 * r()) * Math.exp(-tb / (rdec * 1.8));
    c.mix(ge, c.env(m, 0.05 + r() * 0.2, 0.2 + r() * 0.5, sr), tb, a, sr);
    if (rs + tb < dur - 0.3) c.mix(out, c.burst(r, 0.7, "bp", (170 + r() * 380) * k, 0.9 + r(), 0.008 + r() * 0.03, 0.05 + r() * 0.08, sr), rs + tb, 0.35 * a * P.roll, sr);
  }
  const rl = c.pink(r, rn), l1 = c.onepole(sr), l2 = c.onepole(sr), h1 = c.biquad("hp", 28, 0.7, sr), mb = c.biquad("bp", 300 * k, 0.8, sr);
  const base = (P.lp > 5000 ? 620 : 440) * k;
  for (let i = 0; i < rn; i++) {
    const e = ge[i], f = base * (0.35 + 1.2 * Math.min(1, e)), x = rl[i];
    rl[i] = (h1(l2(l1(x, f), f)) + 0.8 * mb(x)) * e * Math.exp(-i / sr / (rdec * 2.2));
  }
  c.mix(out, endFade(norm(rl), 0.1), rs, 0.6 * P.roll * (0.75 + 0.25 * p.boom), sr);
  if (p.tail) c.reverb(out, { size: 0.85, decay: 0.75, mixAmt: 0.28 }, sr);
  c.filter(out, c.biquad("lp", P.lp, 0.7, sr));
  c.finish(out, 0.9, 1.3);
  c.gain(out, P.lvl);
  endFade(out, p.tail ? 0.15 : 0.08);
  const sn = Math.max(2, Math.round(0.0004 * sr));
  for (let i = 0; i < sn; i++) out[i] *= i / sn;
  return { samples: out };
}
