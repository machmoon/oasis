// Retro jump: a band-limited 8-bit pulse/triangle whose pitch climbs in frame-stepped increments, with a wobbling duty,
// a tiny press tick and either a crisp chip cut or a 16-step hardware-style volume tail with a slight pitch droop.
export const meta = {
  title: "Pixel Hop", kind: "sfx", format: "sound", duration: 0.3, price: 2, author: "quietmachine", payout: "quietmachine@creators.oasis.example", kit: "Retro Arcade", description: "A classic rising 8-bit jump blip whose waveform, start pitch, sweep height, duty wobble, sweep speed and decay tail are knobs, for platformer jumps, hops and menu bounces.",
  tags: ["jump", "8-bit", "chiptune", "arcade", "retro", "blip", "platformer", "sweep"],
};
export const params = { knobs: {
  waveform: { type: "choice", label: "Waveform", default: "square", options: ["square", "pulse12", "triangle"] },
  pitch: { type: "range", label: "Start pitch (Hz)", default: 300, min: 120, max: 900, step: 1 },
  sweep: { type: "range", label: "Sweep amount", default: 0.5, min: 0, max: 1, step: 0.01 },
  wobble: { type: "range", label: "Duty wobble", default: 0.3, min: 0, max: 1, step: 0.01 },
  speed: { type: "range", label: "Sweep speed", default: 1, min: 0.5, max: 2, step: 0.05 },
  tail: { type: "toggle", label: "Decay tail", default: false },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, wave = p.waveform, idx = params.knobs.waveform.options.indexOf(wave);
  const r = c.rng(p.seed * 4513 + idx * 97 + 11);
  const f0 = p.pitch * (0.97 + 0.06 * r());
  const oct = Math.max(0.3, Math.min((0.4 + 2.1 * p.sweep) * (0.94 + 0.12 * r()), Math.log2(3600 / f0)));
  const curve = 1.6 + 1.2 * r();
  const sweepT = (0.17 / p.speed) * (0.92 + 0.16 * r());
  const tau = p.tail ? 0.065 * (0.9 + 0.2 * r()) : 0.012;
  const relT = tau * 6.5, atk = wave === "triangle" ? 0.004 : 0.0015;
  const n = c.seconds(atk + sweepT + relT + 0.01, sr), out = new Float32Array(n);
  const frame = Math.max(1, Math.round(sr / (180 + 60 * r())));
  const lfo1 = 12 + 16 * r(), lfo2 = lfo1 * (0.3 + 0.15 * r()) + r(), ph1 = r() * c.TAU, ph2 = r() * c.TAU;
  const w = p.wobble, LN2 = Math.LN2, lvl = wave === "triangle" ? 1 : wave === "square" ? 0.55 : 0.62;
  const blep = (t, dt) => t < dt ? (t /= dt, t + t - t * t - 1) : t > 1 - dt ? (t = (t - 1) / dt, t * t + t + t + 1) : 0;
  let ph = r(), f = f0, x = 0, vol = 1;
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    if (i % frame === 0) {
      x = Math.min(1, t / sweepT);
      const s = 1 - Math.pow(1 - x, curve);
      const droop = t > sweepT && p.tail ? -0.15 * Math.min(1, (t - sweepT) / relT) : 0;
      f = f0 * Math.exp(LN2 * (oct * s + droop));
      if (t < sweepT) vol = 1 - 0.3 * x;
      else { const e = 0.7 * Math.exp(-(t - sweepT) / tau); vol = p.tail ? Math.round(e * 15) / 15 : e; }
    }
    const dt = f / sr;
    ph += dt; ph -= Math.floor(ph);
    const wob = w * (0.75 * Math.sin(c.TAU * lfo1 * t + ph1) + 0.25 * Math.sin(c.TAU * lfo2 * t + ph2));
    let v;
    if (wave === "triangle") { const k = 0.5 + 0.42 * wob; v = ph < k ? 2 * ph / k - 1 : 1 - 2 * (ph - k) / (1 - k); }
    else {
      const d = wave === "square" ? 0.5 + 0.33 * wob : 0.125 + 0.09 * wob;
      v = (ph < d ? 1 : -1) + blep(ph, dt) - blep((ph - d + 1) % 1, dt);
    }
    out[i] = v * Math.min(1, t / atk) * vol * lvl;
  }
  c.filter(out, c.biquad("hp", 30, 0.7, sr));
  if (wave !== "triangle") c.filter(out, c.biquad("lp", Math.min(sr * 0.45, 9000), 0.7, sr));
  c.mix(out, c.burst(r, 0.004, "hp", 3500 + 1500 * r(), 0.7, 0.0003, 0.001, sr), 0, 0.12 + 0.05 * r(), sr);
  c.fade(c.finish(out, 0.85), 4, sr);
  return { samples: out };
}
