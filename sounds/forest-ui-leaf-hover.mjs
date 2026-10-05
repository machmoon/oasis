// Leaf hover tick: a tiny forest-leaf rustle for UI hover. Layered as a damped stem flick (body), a front-loaded
// cluster of randomised bandpassed crackle grains (contact), a soft swept swish (air), and a decorrelated twin cluster for width.
export const meta = {
  title: "Leaf Hover Tick", kind: "ui", format: "sound", duration: 0.12, price: 1, author: "quietmachine", payout: "quietmachine@creators.oasis.example", kit: "Forest at Night", description: "A tiny leaf rustle tick for menu hovers and focus changes, dry or fresh, with length, crispness, pitch and width knobs; every seed is a different flutter of leaf.",
  tags: ["ui", "hover", "leaf", "rustle", "tick", "forest", "menu", "nature"],
};
export const params = { knobs: {
  leaf: { type: "choice", label: "Leaf", default: "dry", options: ["dry", "fresh"] },
  length: { type: "range", label: "Length", default: 0.35, min: 0, max: 1, step: 0.01 },
  crispness: { type: "range", label: "Crispness", default: 0.55, min: 0, max: 1, step: 0.01 },
  pitch: { type: "range", label: "Pitch", default: 0.5, min: 0, max: 1, step: 0.01 },
  stereo: { type: "range", label: "Stereo width", default: 0.3, min: 0, max: 1, step: 0.01 },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, dry = p.leaf === "dry", r = c.rng(p.seed * 613 + (dry ? 0 : 41) + 3);
  const pm = Math.pow(2, (p.pitch - 0.5) * 2), cr = p.crispness;
  const span = 0.02 + 0.12 * p.length, spread = 0.003 + 0.012 * p.stereo;
  const out = new Float32Array(c.seconds(span + spread + 0.025, sr));
  const n = c.seconds(span + 0.015, sr), sw = c.noise(r, n);
  const bp = c.biquad("bp", (dry ? 3600 : 1700) * pm * (0.85 + 0.3 * r()), dry ? 0.9 : 0.6, sr);
  const peak = 0.12 + 0.2 * r(), att = Math.max(0.003 * sr, 1);
  for (let i = 0; i < n; i++) {
    const u = i / n, e = u < peak ? u / peak : Math.exp(-(u - peak) * (dry ? 6 : 4));
    sw[i] = bp(sw[i]) * e * Math.min(1, i / att) * (1 - u) * (1 - u);
  }
  c.mix(out, sw, 0.002, (dry ? 0.22 : 0.5) * (1.1 - 0.6 * cr), sr);
  const k = dry ? 2.8 : 2.2, kk = 1 - Math.exp(-k);
  const grains = (offset, count, g, fs) => {
    for (let j = 0; j < count; j++) {
      const x = -Math.log(1 - r() * kk) / k, t = offset + 0.002 + x * span;
      const f = (dry ? 4300 : 2100) * pm * fs * (0.55 + r() * 1.0) * (0.75 + 0.55 * cr);
      const d = dry ? 0.003 + r() * 0.004 : 0.006 + r() * 0.009;
      const dec = (dry ? 0.0012 : 0.003) * (1.3 - 0.8 * cr) * (0.6 + 0.8 * r());
      const amp = (0.25 + 0.75 * r()) * (dry ? 0.4 + 0.6 * cr : 0.35 + 0.35 * cr) * Math.exp(-2.2 * x);
      c.mix(out, c.burst(r, d, "bp", f, (dry ? 1.4 : 0.8) * (0.7 + 0.6 * r()), 0.0003 + (dry ? 0 : 0.001), dec, sr), t, amp * g, sr);
    }
  };
  const count = Math.round(((dry ? 6 : 9) + (dry ? 22 : 15) * p.length) * (0.7 + 0.6 * cr));
  grains(0, count, 1, 1);
  if (p.stereo > 0) grains(spread, Math.max(2, Math.round(count * (0.3 + 0.5 * p.stereo))), 0.35 + 0.45 * p.stereo, 0.8 + 0.4 * r());
  const sf = (dry ? 950 : 600) * pm * (0.95 + 0.1 * r());
  c.mix(out, c.ring([[sf, 1], [sf * 2.73, 0.3], [sf * 4.1, 0.12]], 0.025, dry ? 0.003 : 0.006, sr), 0.0025, dry ? 0.16 : 0.22, sr);
  c.mix(out, c.burst(r, 0.004, "hp", (2500 + 4000 * cr) * pm, 0.7, 0.0005, 0.0012, sr), 0.0015, 0.15 + 0.35 * cr, sr);
  c.filter(out, c.biquad("lp", Math.min(0.45 * sr, (dry ? 6000 : 4000) + 9000 * cr), 0.7, sr));
  c.filter(out, c.biquad("hp", 250 * pm, 0.7, sr));
  c.fade(c.finish(out, 0.85), 3, sr);
  return { samples: out };
}
