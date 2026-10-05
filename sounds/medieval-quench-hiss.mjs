// Quench Hiss: hot iron plunged into a trough. Layers: a splash impact (water grains + low thump), a steam hiss with gusts whose colour darkens as it cools, sizzle crackles, rising-pitch bubble chirps, a ringing iron body, and an optional long steam tail.
export const meta = {
  title: "Quench Hiss", kind: "sfx", format: "sound", duration: 3, price: 2, author: "hollowbody", payout: "hollowbody@creators.oasis.example", kit: "Medieval Market", description: "Red-hot iron plunged into a water trough: a splash, a violent steam hiss with sizzle and bubble chirps, for blacksmith scenes in games and film.",
  tags: ["quench", "blacksmith", "steam", "hiss", "water", "forge", "medieval", "iron"],
};
export const params = { knobs: {
  blade: { type: "choice", label: "Blade", default: "sword", options: ["dagger", "sword", "horseshoe"] },
  heat: { type: "range", label: "Heat", default: 0.7, min: 0.15, max: 1, step: 0.01 },
  bubbles: { type: "range", label: "Bubbles", default: 0.5, min: 0, max: 1, step: 0.01 },
  splash: { type: "range", label: "Splash", default: 0.5, min: 0.1, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Steam tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + params.knobs.blade.options.indexOf(p.blade) * 53 + 11);
  const B = { dagger: [0.6, 1.4, 900, 0.5], sword: [1, 1, 520, 1], horseshoe: [0.85, 0.7, 330, 0.8] }[p.blade];
  const mass = B[0], heat = p.heat;
  const tau = (p.tail ? 0.6 : 0.16) * (0.6 + 0.8 * heat) * (0.7 + 0.3 * mass);
  const hissDur = Math.min(2.7, tau * 4.2 + 0.15);
  const n = c.seconds(Math.min(3, hissDur + 0.3), sr), out = new Float32Array(n);
  const hn = c.seconds(hissDur, sr), h = c.noise(r, hn);
  const lp = c.onepole(sr), hp = c.biquad("hp", 1800 + 1800 * heat, 0.7, sr), hp2 = c.biquad("hp", 1200, 0.7, sr);
  const rel = c.seconds(0.06, sr);
  let g = 1, tg = 1;
  for (let i = 0; i < hn; i++) {
    const t = i / sr;
    if (i % 600 === 0) tg = 0.55 + r() * 0.6;
    g += (tg - g) * 0.004;
    const cut = 3500 + (9000 - 3500) * Math.exp(-t / (tau * 1.2)) * (0.5 + 0.5 * heat);
    const a = Math.min(1, t / 0.006) * (0.25 * Math.exp(-t / (tau * 0.25)) + 0.75 * Math.exp(-t / tau)) * g;
    h[i] = hp2(hp(lp(h[i], cut))) * a * Math.min(1, (hn - i) / rel);
  }
  c.mix(out, h, 0.004, 0.55 + 0.6 * heat, sr);
  const m = c.seconds(0.4, sr), th = c.noise(r, m), tb = c.biquad("bp", 900 + 400 * B[3], 0.8, sr);
  for (let i = 0; i < m; i++) th[i] = tb(th[i]) * Math.exp(-i / sr / 0.1) * Math.min(1, i / (0.003 * sr));
  c.mix(out, th, 0, 0.3 + 0.3 * p.splash, sr);
  c.mix(out, c.ring([[70 * B[1] + 30, 1], [140 * B[1] + 60, 0.3]], 0.3, 0.06 + 0.04 * mass, sr), 0.002, 0.3 + 0.6 * p.splash, sr);
  const sg = Math.round(15 + 160 * p.splash);
  for (let k = 0; k < sg; k++) {
    const t = 0.003 + Math.pow(r(), 1.8) * (0.08 + 0.25 * p.splash);
    c.mix(out, c.burst(r, 0.006 + r() * 0.01, "bp", 1200 + r() * 3500, 3, 0.0005, 0.003 + r() * 0.004, sr), t, (0.15 + 0.4 * r()) * (0.3 + 0.7 * p.splash), sr);
  }
  const ns = Math.round((40 + 120 * heat) * hissDur);
  for (let k = 0; k < ns; k++) {
    const t = 0.02 + Math.pow(r(), 1.4) * hissDur * 0.85;
    c.mix(out, c.burst(r, 0.002 + r() * 0.003, "hp", 4000 + r() * 4000, 1, 0.0002, 0.0008, sr), t, 0.45 * (0.3 + 0.7 * r()) * Math.exp(-t / tau), sr);
  }
  const nb = Math.round(p.bubbles * 36);
  for (let b = 0; b < nb; b++) {
    const t = 0.06 + Math.pow(r(), 1.3) * hissDur * 0.7, d = 0.03 + r() * 0.05;
    const f0 = (B[2] * 0.7 + r() * 700) * (1.2 - 0.3 * mass), bn = c.seconds(d, sr);
    const x = c.osc("sine", (tt) => f0 * (1 + 2.2 * tt / d), bn, sr), e = c.env(bn, 0.002, d * 0.35, sr);
    for (let i = 0; i < bn; i++) x[i] *= e[i];
    c.mix(out, x, t, (0.2 + 0.3 * r()) * (0.35 + 0.65 * Math.exp(-t / (hissDur * 0.6))) * (0.4 + p.bubbles), sr);
  }
  c.mix(out, c.ring([[B[2] * 3.1, 1], [B[2] * 5.4, 0.5], [B[2] * 8.2, 0.25]], 0.3, 0.07 * B[3] + 0.03, sr), 0.004, 0.12 + 0.12 * heat, sr);
  c.fade(out, 30, sr);
  c.finish(out, 0.85, 1.1);
  return { samples: out };
}
