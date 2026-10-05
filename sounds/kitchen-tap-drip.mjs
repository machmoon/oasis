// Tap drip: slow drops from a kitchen tap. Each drop is a contact tick, a target body (damped steel-basin modes, a ceramic dish ping with splatter, or a water plop + Minnaert chirp + jet fall-back plip) over a faint kitchen room tone, with a short or long sink-room tail.
export const meta = {
  title: "Leaky Tap", kind: "sfx", format: "sound", duration: 3, price: 1, author: "foleyroom", payout: "foleyroom@creators.oasis.example", kit: "Kitchen", description: "Slow drips from a kitchen tap landing in a steel sink, standing water or a dish. Rate, drop size, irregularity and room tail are knobs, and every seed is a different run of drops.",
  tags: ["drip", "tap", "water", "sink", "kitchen", "drop", "faucet", "foley"],
};
export const params = { knobs: {
  target: { type: "choice", label: "Lands in", default: "standing water", options: ["steel sink", "standing water", "dish"] },
  rate: { type: "range", label: "Drip rate (per s)", default: 1.6, min: 0.8, max: 3, step: 0.05 },
  size: { type: "range", label: "Drop size", default: 0.5, min: 0, max: 1, step: 0.01 },
  irregularity: { type: "range", label: "Irregularity", default: 0.3, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Sink room tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 7907 + params.knobs.target.options.indexOf(p.target) * 211 + 3);
  const irr = p.irregularity, base = 1 / p.rate;
  const count = Math.max(3, Math.min(8, Math.round(p.rate * 2.4)));
  const onsets = [];
  let t = 0.006;
  for (let k = 0; k < count; k++) {
    onsets.push(t);
    const reg = 0.9 + 0.2 * r(), poi = 0.45 + 0.8 * -Math.log(1 - 0.85 * r());
    t += Math.max(0.35 * base, base * ((1 - irr) * reg + irr * poi));
  }
  const last = onsets[onsets.length - 1], n = c.seconds(last + (p.tail ? 0.95 : 0.4), sr);
  let out = new Float32Array(n);
  const bubble = (f0, tau, amp, at) => {
    const m = c.seconds(tau * 7, sr), b = new Float32Array(m), k = Math.exp(-1 / (tau * sr)), kr = Math.exp(-1 / (tau * 1.4 * sr));
    let ph = 0, e = 1, rise = 1;
    for (let i = 0; i < m; i++) {
      rise *= kr; e *= k;
      ph += c.TAU * f0 * (1.9 - 0.9 * rise) / sr;
      b[i] = Math.sin(ph) * e * Math.min(1, i / (0.0006 * sr));
    }
    c.mix(out, b, at, amp, sr);
  };
  for (const on of onsets) {
    const sz = c.clamp(p.size + (r() - 0.5) * (0.12 + 0.35 * irr), 0, 1);
    const a = (0.45 + 0.55 * sz) * (1 - 0.35 * irr * r());
    if (p.target === "standing water") {
      c.mix(out, c.burst(r, 0.006, "bp", 2200 + 2200 * r(), 1.5, 0.0003, 0.0018, sr), on, 0.22 * a, sr);
      c.mix(out, c.burst(r, 0.035 + 0.03 * sz, "lp", 300 + 320 * (1 - sz) + 80 * r(), 0.8, 0.001, 0.01 + 0.012 * sz, sr), on, 0.5 * a, sr);
      const f0 = (2700 - 1700 * sz) * (0.82 + 0.36 * r());
      bubble(f0, 0.01 + 0.018 * sz, 0.9 * a, on + 0.002 + 0.004 * r());
      if (r() < 0.7) bubble(f0 * (1.4 + 0.5 * r()), 0.005 + 0.006 * sz, 0.32 * a * (0.4 + sz), on + 0.06 + 0.08 * r());
      c.mix(out, c.burst(r, 0.025, "bp", 900 + 500 * r(), 1.2, 0.002, 0.012, sr), on + 0.01, 0.12 * a, sr);
    } else if (p.target === "steel sink") {
      c.mix(out, c.burst(r, 0.005, "hp", 3400 + 2600 * r(), 0.7, 0.0003, 0.0014, sr), on, 0.85 * a, sr);
      const f = (760 - 280 * sz) * (0.88 + 0.24 * r()), j = () => 0.97 + 0.06 * r();
      c.mix(out, c.ring([[f, 1], [f * 2.37 * j(), 0.6], [f * 4.11 * j(), 0.42], [f * 6.83 * j(), 0.25]], 0.4, 0.045 + 0.05 * sz, sr), on + 0.0004, 0.32 * a, sr);
      c.mix(out, c.ring([[170 + 50 * r(), 1], [395 + 40 * r(), 0.35]], 0.35, 0.05 + 0.035 * sz, sr), on + 0.001, 0.22 * a * (0.3 + sz), sr);
      c.mix(out, c.burst(r, 0.02, "bp", 4200 + 2500 * r(), 1, 0.001, 0.006, sr), on + 0.002, 0.25 * a, sr);
      if (r() < 0.35) bubble((3800 - 1200 * sz) * (0.85 + 0.3 * r()), 0.007, 0.28 * a, on + 0.004);
    } else {
      c.mix(out, c.burst(r, 0.003, "hp", 5000 + 2500 * r(), 0.8, 0.0002, 0.0008, sr), on, 0.95 * a, sr);
      const f = (2000 - 600 * sz) * (0.9 + 0.2 * r());
      c.mix(out, c.ring([[f, 1], [f * (2.05 + 0.1 * r()), 0.5], [f * (3.45 + 0.15 * r()), 0.35]], 0.18, 0.016 + 0.016 * sz, sr), on + 0.0003, 0.38 * a, sr);
      const sp = 3 + Math.round(5 * sz * r() + 2 * r());
      for (let g = 0; g < sp; g++) c.mix(out, c.burst(r, 0.003 + 0.003 * r(), "bp", 3000 + 5000 * r(), 2 + 2 * r(), 0.0003, 0.001, sr), on + 0.003 + Math.pow(r(), 1.5) * 0.05, (0.08 + 0.18 * r()) * a, sr);
      if (r() < 0.5) bubble((2600 - 1100 * sz) * (0.85 + 0.3 * r()), 0.009 + 0.008 * sz, 0.35 * a, on + 0.003);
    }
  }
  out = c.reverb(out, p.tail ? { size: 0.45, decay: 0.55, mixAmt: 0.28 } : { size: 0.12, decay: 0.18, mixAmt: 0.16 }, sr);
  const bed = c.pink(r, n), blp = c.biquad("lp", 900, 0.7, sr), bhp = c.biquad("hp", 120, 0.7, sr);
  for (let i = 0; i < n; i++) bed[i] = blp(bhp(bed[i]));
  c.mix(out, c.fade(bed, 30, sr), 0, 0.02, sr);
  c.filter(out, c.biquad("hp", 60, 0.7, sr));
  c.fade(c.finish(out, 0.9), 15, sr);
  return { samples: out };
}
