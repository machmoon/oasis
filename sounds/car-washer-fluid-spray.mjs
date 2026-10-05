// Washer fluid spray: a pump that spins up fast with a rising whine (harmonics at 500-3000 Hz) and cuts off sharply, a spritz of pressurised fluid made of dense short nozzle bursts with a sizzle, droplet impacts on glass (ringing ticks plus wet slaps), and a drip-off tail of separated drops with settling runs.
export const meta = {
  title: "Washer Fluid Spritz", kind: "sfx", format: "sound", duration: 1.2, price: 2, author: "hollowbody", payout: "hollowbody@creators.oasis.example", kit: "Car Interior", description: "A windscreen washer pump whining up, a sharp fluid spritz and droplets splattering on glass, for car interior scenes and wiper moments.",
  tags: ["car", "washer", "windscreen", "pump", "spray", "water", "glass", "interior"],
};
export const params = { knobs: {
  pump: { type: "range", label: "Pump strength", default: 0.6, min: 0, max: 1, step: 0.01 },
  hiss: { type: "range", label: "Spray hiss", default: 0.6, min: 0, max: 1, step: 0.01 },
  splatter: { type: "range", label: "Glass splatter", default: 0.6, min: 0, max: 1, step: 0.01 },
  pitch: { type: "range", label: "Pitch", default: 0.5, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Drip tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + 29), dur = 1.2, n = c.seconds(dur, sr), out = new Float32Array(n);
  const on = 0.02, ramp = 0.09, spray = 0.4 + 0.12 * p.pump + 0.04 * r();
  const base = 520 * Math.pow(2, p.pitch * 1.4) * (0.97 + 0.06 * r());
  const m = c.seconds(spray + 0.2, sr), pump = new Float32Array(m);
  let ph = 0, ph2 = 0;
  for (let i = 0; i < m; i++) {
    const t = i / sr;
    const s = t < spray ? 1 - Math.exp(-t / 0.025) : Math.exp(-(t - spray) / 0.04);
    const sw = t < spray ? 0.35 + 0.65 * (1 - Math.exp(-t / ramp)) : 1 - 0.5 * (1 - Math.exp(-(t - spray) / 0.05));
    const f = base * sw * (1 + 0.02 * Math.sin(t * 55 + 1));
    ph += c.TAU * f / sr; ph2 += c.TAU * f * 0.5 / sr;
    const rip = 1 + 0.2 * Math.sin(ph2 * 3);
    pump[i] = (Math.sin(ph) * 0.6 + Math.sin(2 * ph + 0.5) * 0.45 + Math.sin(3 * ph) * 0.3 + Math.sin(5 * ph) * 0.12) * rip * s * Math.min(1, t / 0.003);
  }
  c.mix(out, pump, on, 0.3 + 0.5 * p.pump, sr);
  const sn = c.seconds(spray - 0.06, sr), h = c.noise(r, sn), hp = c.biquad("hp", 3200, 0.7, sr), bp = c.biquad("bp", 6000 + 1500 * p.pitch, 1.1, sr);
  let puff = 1, seg = 0;
  for (let i = 0; i < sn; i++) {
    if (i >= seg) { puff = 0.3 + 0.7 * r(); seg = i + Math.round(sr * (0.003 + 0.006 * r())); }
    const t = i / sr, e = Math.min(1, t / 0.006) * Math.exp(-Math.max(0, t - (spray - 0.14)) / 0.03) * puff * (1.1 - 0.35 * t / spray);
    h[i] = (hp(h[i]) * 0.5 + bp(h[i]) * 0.8) * e;
  }
  c.mix(out, h, on + 0.05, 0.03 + 0.17 * p.hiss * (0.6 + 0.4 * p.pump), sr);
  const drops = Math.round(80 + 260 * p.splatter);
  for (let d = 0; d < drops; d++) {
    const t = on + 0.06 + (r() < 0.75 ? r() * spray : spray + r() * 0.12), a = (0.2 + 0.8 * r() * r()) * (0.35 + 0.65 * p.splatter);
    const f = 2200 + r() * 3600;
    c.mix(out, c.ring([[f, 1], [f * 2.3, 0.35]], 0.03, 0.004 + 0.006 * r(), sr), t, a * 0.5, sr);
    c.mix(out, c.burst(r, 0.01, "bp", 900 + r() * 1800, 1.5, 0.0004, 0.003 + 0.005 * r(), sr), t, a * 0.5, sr);
  }
  if (p.tail) {
    const t0 = on + spray + 0.04;
    for (let d = 0; d < 14; d++) {
      const u = (d + r() * 0.8) / 14, t = t0 + 0.05 + u * u * 0.5, f = 1500 + r() * 2000, a = (1 - 0.7 * u) * (0.4 + 0.6 * p.splatter);
      c.mix(out, c.ring([[f, 1], [f * 1.9, 0.3]], 0.08, 0.012 + 0.012 * r(), sr), t, 0.7 * a, sr);
      c.mix(out, c.burst(r, 0.015, "bp", 700 + r() * 900, 1.5, 0.001, 0.006, sr), t, 0.5 * a, sr);
      if (r() < 0.4) c.mix(out, c.ring([[f * 0.8, 1]], 0.05, 0.01, sr), t + 0.02 + 0.03 * r(), 0.3 * a, sr);
    }
  }
  c.fade(c.finish(out, 0.85, 1.1), 12, sr);
  return { samples: out };
}
