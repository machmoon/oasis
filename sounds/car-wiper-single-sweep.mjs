// Car wiper: one out-and-back pass on a windscreen. Layers: a motor whine with gear harmonics that follows blade velocity, rubber-on-glass friction from discrete grains (crisp dry ticks vs soft wet swish plus a velocity-swept hiss), worn-blade stick-slip chatter, direction-dependent squeak glides, and the rubber flip at the top reversal and thunks at the park stops.
export const meta = {
  title: "Wiper Sweep", kind: "sfx", format: "sound", duration: 1.8, price: 3, author: "hollowbody", payout: "hollowbody@creators.oasis.example", kit: "Car Interior", description: "A single windscreen wiper pass, up and back, with motor whir, rubber-on-glass friction, blade flip and squeaks; use it for car interiors, rain driving scenes and dashboard foley.",
  tags: ["wiper", "car", "windscreen", "rubber", "squeak", "motor", "interior", "glass"],
};
export const params = { knobs: {
  blade: { type: "choice", label: "Blade condition", default: "new", options: ["new", "worn"] },
  wetness: { type: "range", label: "Glass wetness", default: 0.5, min: 0, max: 1, step: 0.01 },
  squeak: { type: "range", label: "Squeak amount", default: 0.4, min: 0, max: 1, step: 0.01 },
  whine: { type: "range", label: "Motor whine", default: 0.5, min: 0, max: 1, step: 0.01 },
  speed: { type: "range", label: "Sweep speed", default: 1, min: 0.6, max: 1.8, step: 0.05 },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + (p.blade === "worn" ? 91 : 7));
  const dur = 1.8 / p.speed, t0 = 0.1, sweep = dur - 0.25, mid = t0 + sweep / 2;
  const n = c.seconds(dur, sr), out = new Float32Array(n);
  const worn = p.blade === "worn" ? 1 : 0, wet = p.wetness, sq = p.squeak;
  const vel = (t) => { const u = (t - t0) / sweep; if (u <= 0 || u >= 1) return 0; const s = (u * 2) % 1; return Math.pow(Math.sin(Math.PI * s), 0.7); };
  const m = new Float32Array(n), base = 130 * (0.8 + 0.4 * p.speed);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr, v = vel(t), a = Math.min(1, Math.max(0, (t - 0.02) / 0.06)) * Math.min(1, Math.max(0, (dur - 0.04 - t) / 0.1));
    ph += c.TAU * base * (0.8 + 0.5 * v) / sr;
    m[i] = (Math.sin(ph) + 0.5 * Math.sin(2 * ph + 0.4) + 0.35 * Math.sin(3 * ph) + 0.2 * Math.sin(6 * ph) + 0.12 * Math.sin(9 * ph)) * a * (0.3 + 0.7 * v);
  }
  c.filter(m, c.biquad("bp", 700, 0.5, sr));
  c.mix(out, m, 0, 0.26 * p.whine, sr);
  const grains = Math.round((200 + 260 * worn) * (1 - 0.35 * wet) * (sweep / 1.4));
  for (let g = 0; g < grains; g++) {
    const t = t0 + r() * sweep, v = vel(t);
    if (v < 0.06) continue;
    const f = wet > 0.5 ? 1300 + r() * 2200 : 2600 + r() * 4500;
    c.mix(out, c.burst(r, 0.003 + r() * (0.004 + 0.012 * wet), "bp", f, 1.5 + 4 * (1 - wet), 0.0004, 0.0012 + 0.004 * wet * r(), sr), t, (0.1 + 0.3 * r()) * v * (0.5 + 0.5 * (1 - wet) + 0.4 * worn), sr);
  }
  const sw = c.pink(r, n), lp = c.onepole(sr), hp = c.biquad("hp", 700, 0.7, sr);
  for (let i = 0; i < n; i++) { const v = vel(i / sr); sw[i] = hp(lp(sw[i], 1000 + 3200 * v * (1 - 0.4 * wet))) * v * v; }
  c.mix(out, sw, 0, 0.1 + 0.6 * wet, sr);
  if (worn) {
    const cn = Math.round(sweep * 55 * p.speed);
    for (let k = 0; k < cn; k++) {
      const t = t0 + (k + r() * 0.6) / cn * sweep, v = vel(t);
      if (v < 0.1) continue;
      c.mix(out, c.ring([[800 + r() * 500, 1], [1900 + r() * 700, 0.5]], 0.02, 0.006 + 0.004 * r(), sr), t, (0.18 + 0.2 * r()) * v * (1 - 0.5 * wet), sr);
    }
  }
  const cnt = Math.round(sq * (3 + 7 * worn) * (1.2 - 0.6 * wet)) + (sq > 0.1 ? 1 : 0);
  for (let k = 0; k < cnt; k++) {
    const t = t0 + (0.06 + 0.88 * r()) * sweep, len = 0.05 + r() * 0.1, f0 = (worn ? 2000 : 2800) + r() * 1800, dir = t < mid ? 1 : -1, gl = dir * (0.15 + r() * 0.35);
    const x = c.osc("saw", (tt) => f0 * (1 + gl * tt / len) * (1 + 0.02 * Math.sin(tt * 190)), c.seconds(len, sr), sr), e = c.env(x.length, 0.004, len * 0.5, sr);
    c.filter(x, c.biquad("bp", f0 * 1.1, 5, sr));
    for (let i = 0; i < x.length; i++) x[i] *= e[i] * (0.6 + 0.4 * Math.sin(i / sr * 400));
    c.mix(out, x, t, sq * 0.9 * (0.6 + 0.4 * r()) * (1 - 0.4 * wet), sr);
  }
  c.mix(out, c.ring([[140, 1], [330, 0.5], [900, 0.2]], 0.1, 0.025, sr), mid - 0.01, 0.2, sr);
  c.mix(out, c.burst(r, 0.025, "bp", 1800 + 800 * worn, 2, 0.002, 0.01, sr), mid - 0.015, 0.3, sr);
  for (const t of [t0 - 0.01, t0 + sweep]) c.mix(out, c.ring([[95, 1], [210, 0.4]], 0.1, 0.025, sr), Math.max(0, t), 0.14, sr);
  c.fade(c.finish(out, 0.85, 1.1), 12, sr);
  return { samples: out };
}
