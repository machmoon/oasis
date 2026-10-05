// Rainy Night: a loopable tavern bed with three layers. Rain on the shutters is a type-shaped hiss, a wash and drop grains.
// Gusts rattle each shutter as a run of knocks on wooden panel modes with a metal latch tick, and inside a hearth glows as a low roar with popping crackles.
export const meta = {
  title: "Rainy Night", kind: "ambience", format: "sound", duration: 3, price: 4, author: "stormfront", payout: "stormfront@creators.oasis.example", kit: "Wooden Tavern", description: "A loopable bed of rain beating on tavern shutters, with a low hearth crackling inside. Rain type, intensity, shutter rattle, fire level and loop length are knobs, and each seed is a different night.",
  tags: ["rain", "ambience", "tavern", "shutters", "fireplace", "loop", "night", "interior"],
};
export const params = { knobs: {
  rain: { type: "choice", label: "Rain type", default: "steady", options: ["drizzle", "steady", "storm"] },
  intensity: { type: "range", label: "Rain intensity", default: 0.5, min: 0, max: 1, step: 0.01 },
  rattle: { type: "range", label: "Shutter rattle", default: 0.5, min: 0, max: 1, step: 0.01 },
  fire: { type: "range", label: "Fire level", default: 0.5, min: 0, max: 1, step: 0.01 },
  length: { type: "range", label: "Loop length (s)", default: 3, min: 2, max: 4, step: 0.1 },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, ti = params.knobs.rain.options.indexOf(p.rain), r = c.rng(p.seed * 977 + ti * 53 + 11);
  const dur = p.length, n = c.seconds(dur, sr), pad = c.seconds(0.4, sr), out = new Float32Array(n + pad), I = p.intensity, F = p.fire;
  const ph = [r() * c.TAU, r() * c.TAU, r() * c.TAU, r() * c.TAU];
  const depth = [0.04, 0.08, 0.16][ti];
  const gust = (t) => 1 - 2 * depth + depth * (Math.sin(c.TAU * 3 * t / dur + ph[0]) + Math.sin(c.TAU * 7 * t / dur + ph[1]));
  const cfg = [
    { hp: 1500, lp: 6000, hiss: 0.07, wash: 0, rate: [10, 30], band: [2200, 5200], dg: 0.5, tap: 0.05, rms: 0.07 },
    { hp: 500, lp: 3200, hiss: 0.35, wash: 0.15, rate: [90, 200], band: [900, 3200], dg: 0.25, tap: 0.12, rms: 0.11 },
    { hp: 150, lp: 1100, hiss: 0.6, wash: 0.75, rate: [260, 420], band: [450, 2000], dg: 0.22, tap: 0.25, rms: 0.16 },
  ][ti];
  const h = c.pink(r, n), hp = c.biquad("hp", cfg.hp, 0.7, sr), lp1 = c.onepole(sr), lc = cfg.lp * (0.75 + 0.5 * I);
  for (let i = 0; i < n; i++) { const g = gust(i / sr); h[i] = lp1(hp(h[i]), lc * g) * g; }
  c.mix(out, h, 0, cfg.hiss * (0.6 + 0.6 * I), sr);
  if (cfg.wash > 0) {
    const w = c.pink(r, n), bp = c.biquad("bp", 520, 0.6, sr);
    for (let i = 0; i < n; i++) { const g = gust(i / sr); w[i] = bp(w[i]) * g * g; }
    c.mix(out, w, 0, cfg.wash * (0.6 + 0.5 * I), sr);
  }
  const drops = Math.round((cfg.rate[0] + cfg.rate[1] * I) * dur);
  for (let d = 0; d < drops; d++) {
    const t = r() * dur, a = (0.3 + 0.7 * r()) * cfg.dg * gust(t);
    c.mix(out, c.burst(r, 0.004 + r() * 0.006, "bp", cfg.band[0] + r() * (cfg.band[1] - cfg.band[0]), 1.8, 0.0004, 0.001 + r() * 0.002, sr), t, a, sr);
    if (r() < cfg.tap) c.mix(out, c.ring([[340 + r() * 200, 1], [880 + r() * 300, 0.35]], 0.04, 0.006 + r() * 0.005, sr), t + 0.0005, a * 0.6, sr);
  }
  if (ti === 0) {
    let t = r() * 0.3; const per = (0.35 + r() * 0.15) * (1.2 - 0.5 * I), f0 = 850 + r() * 500;
    while (t < dur) {
      const m = c.seconds(0.045, sr), f = f0 * (0.85 + r() * 0.3), b = c.osc("sine", (u) => f * (1 + 16 * u), m, sr);
      c.multiply(b, c.env(m, 0.0006, 0.011 + r() * 0.006, sr));
      c.mix(out, b, t, 0.3 * (0.6 + 0.4 * r()), sr);
      t += per * (0.7 + r() * 0.6);
    }
  }
  const pf = 170 + r() * 60, amp = 0.35 + 0.65 * p.rattle;
  const clusters = p.rattle > 0.02 ? 1 + Math.round(p.rattle * (1.5 + ti) * dur / 3) : 0;
  for (let k = 0; k < clusters; k++) {
    let t = (k + 0.15 + 0.7 * r()) * dur / clusters;
    const rate = 11 + r() * 8, knocks = 5 + Math.round(r() * 4 + 8 * p.rattle), g = gust(t);
    c.mix(out, c.ring([[90 + r() * 20, 1], [185, 0.3]], 0.12, 0.03, sr), t % dur + 0.001, amp * 0.6 * g, sr);
    for (let j = 0; j < knocks; j++) {
      const at = t % dur, a = Math.pow(Math.sin(Math.PI * (j + 0.5) / knocks), 0.7) * (0.6 + 0.4 * r()) * amp * g;
      c.mix(out, c.ring([[pf * (0.96 + r() * 0.08), 1], [pf * 2.13, 0.55], [pf * 3.4, 0.3], [pf * 5.1, 0.15]], 0.07, 0.014 + r() * 0.008, sr), at + 0.0008, a * 0.9, sr);
      c.mix(out, c.burst(r, 0.004, "bp", 1800 + r() * 900, 1.2, 0.0004, 0.001, sr), at, a * 0.4, sr);
      if (r() < 0.6) c.mix(out, c.ring([[2900 + r() * 400, 1], [4300 + r() * 300, 0.4]], 0.04, 0.006, sr), at + 0.002, a * 0.35, sr);
      t += (1 / rate) * (0.75 + r() * 0.5);
    }
  }
  if (F > 0.01) {
    const fl = c.brown(r, n), lpf = c.biquad("lp", 110 + 70 * F, 0.8, sr), gl = c.pink(r, n), bpg = c.biquad("bp", 300, 0.8, sr);
    for (let i = 0; i < n; i++) {
      const t = i / sr, fk = 0.75 + 0.15 * Math.sin(c.TAU * 4 * t / dur + ph[2]) + 0.1 * Math.sin(c.TAU * 9 * t / dur + ph[3]);
      fl[i] = lpf(fl[i]) * fk; gl[i] = bpg(gl[i]) * fk;
    }
    c.mix(out, fl, 0, 1.1 * F, sr);
    c.mix(out, gl, 0, 0.22 * F, sr);
    const crack = Math.round((6 + 30 * F) * dur);
    for (let k = 0; k < crack; k++) {
      let t = r() * dur; const m = r() < 0.35 ? 2 + Math.floor(r() * 3) : 1;
      for (let j = 0; j < m; j++) {
        const a = (0.2 + 0.6 * r() * r()) * (0.5 + 0.5 * F);
        c.mix(out, c.burst(r, 0.002 + r() * 0.004, "hp", 1500 + r() * 3500, 0.9, 0.0003, 0.0006 + r() * 0.0015, sr), t, a, sr);
        if (r() < 0.4) c.mix(out, c.ring([[150 + r() * 250, 1]], 0.04, 0.008, sr), t, a * 0.7, sr);
        t += 0.005 + r() * 0.02;
      }
    }
  }
  for (let i = 0; i < pad; i++) out[i] += out[n + i];
  const res = out.slice(0, n);
  let s = 0, pk = 0;
  for (let i = 0; i < n; i++) { s += res[i] * res[i]; pk = Math.max(pk, Math.abs(res[i])); }
  let g = cfg.rms * (0.85 + 0.3 * I) * (1 + 0.25 * F) / Math.max(1e-9, Math.sqrt(s / n));
  if (pk * g < 0.6) g = 0.6 / pk;
  for (let i = 0; i < n; i++) res[i] = 0.95 * Math.tanh(res[i] * g / 0.95);
  c.fade(res, 15, sr);
  return { samples: res };
}
