// Mooring line creak: a run of discrete stick-slip groans, each a jittered slip-pulse train on a gliding pitch, shaped by resonant bands, with fibre grit grains between; hemp rasps, nylon squeals, wire snaps and rings; the tail adds a bollard knock and a slack settle.
export const meta = {
  title: "Mooring Creak", kind: "foley", format: "sound", duration: 3, price: 2, author: "stormfront", payout: "stormfront@creators.oasis.example", kit: "Ocean Harbour", description: "A mooring line groaning and squealing in separate stick-slip creaks as the boat surges; rope material, tension, stretch, grit and pitch are knobs, for harbour scenes, ship interiors and horror ambience.",
  tags: ["rope", "creak", "mooring", "harbour", "boat", "strain", "foley", "squeal"],
};
export const params = { knobs: {
  rope: { type: "choice", label: "Rope", default: "hemp", options: ["hemp", "nylon", "wire"] },
  tension: { type: "range", label: "Tension", default: 0.5, min: 0, max: 1, step: 0.01 },
  stretch: { type: "range", label: "Stretch", default: 0.5, min: 0, max: 1, step: 0.01 },
  grit: { type: "range", label: "Grit", default: 0.5, min: 0, max: 1, step: 0.01 },
  pitch: { type: "range", label: "Pitch", default: 0.5, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Bollard tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + params.knobs.rope.options.indexOf(p.rope) * 97 + 11);
  const out = new Float32Array(c.seconds(p.tail ? 3 : 2.5, sr));
  const M = {
    hemp: { f: 170, jit: 0.45, k: 1.1, q: 2.5, len: [0.14, 0.4], noise: 0.55, gl: 0.5 },
    nylon: { f: 520, jit: 0.04, k: 3, q: 9, len: [0.25, 0.65], noise: 0.08, gl: 1 },
    wire: { f: 330, jit: 0.15, k: 1.6, q: 6, len: [0.07, 0.25], noise: 0.2, gl: 0.3 },
  }[p.rope];
  const base = M.f * Math.pow(2, (p.pitch - 0.5) * 1.8);
  const ev = (t0, dur, f0, ratio, amp) => {
    const n = c.seconds(dur, sr), x = new Float32Array(n);
    let ph = 0, per = 1;
    const wob = 6 + r() * 14, wp = r() * 6;
    for (let i = 0; i < n; i++) {
      const u = i / n, f = f0 * (1 + (ratio - 1) * Math.pow(u, 0.8)) * (1 + 0.03 * Math.sin(wob * u * 6 + wp));
      ph += f * per / sr;
      if (ph >= 1) { ph -= 1; per = 1 + M.jit * (r() - 0.5) * 2; }
      const e = Math.min(1, i / (0.004 * sr)) * Math.pow(1 - u, 0.7) * (0.75 + 0.25 * Math.sin(wob * u + wp));
      x[i] = (Math.pow(1 - ph, M.k) - 0.4 + 0.25 * Math.sin(c.TAU * ph)) * e;
    }
    const b1 = c.biquad("bp", f0 * (2.2 + ratio), M.q, sr), b2 = c.biquad("bp", f0 * 4.1, M.q * 0.7, sr);
    for (let i = 0; i < n; i++) x[i] = x[i] * 0.35 + b1(x[i]) * 0.9 + b2(x[i]) * 0.4;
    c.mix(out, c.fade(x, 4, sr), t0, amp, sr);
    c.mix(out, c.burst(r, 0.008, "bp", 2500 + r() * 2000, 1.5, 0.0005, 0.003, sr), t0, 0.35 * amp, sr);
    if (p.rope === "wire") c.mix(out, c.ring([[f0 * 1.5, 1], [f0 * 4.1, 0.5], [f0 * 7.3, 0.3]], 0.35, 0.18, sr), t0, 0.25 * amp, sr);
    if (p.rope === "hemp") c.mix(out, c.ring([[80 + r() * 20, 1]], 0.15, 0.05, sr), t0, 0.3 * amp, sr);
    const gn = Math.round(2 + 24 * p.grit * (0.4 + M.noise));
    for (let g = 0; g < gn; g++) c.mix(out, c.burst(r, 0.004 + r() * 0.005, "bp", 2000 + r() * 4500, 3, 0.0003, 0.0015, sr), t0 + r() * dur, (0.1 + 0.3 * r()) * amp * (0.3 + p.grit), sr);
  };
  let t = 0.06 + r() * 0.1, last = 0, k = 0;
  while (t < 2.0 && k < 14) {
    const dur = (M.len[0] + r() * (M.len[1] - M.len[0])) * (0.7 + 0.8 * p.stretch);
    const ratio = 1 + (0.15 + 0.7 * p.stretch) * M.gl * (r() < 0.8 ? 1 : -0.5) * (0.6 + 0.8 * r());
    const amp = (0.35 + 0.65 * r()) * (0.5 + 0.5 * p.tension);
    ev(t, dur, base * (0.85 + 0.35 * r()) * (1 + 0.3 * p.tension), ratio, amp);
    last = t + dur;
    t = last + (0.03 + r() * 0.28) * (1.5 - p.tension) * (r() < 0.25 ? 2.2 : 1);
    k++;
  }
  for (let g = 0; g < 10 + 30 * p.grit; g++) c.mix(out, c.burst(r, 0.004, "bp", 1800 + r() * 3500, 3, 0.0003, 0.0012, sr), r() * 2.1, 0.08 + 0.12 * r(), sr);
  if (p.tail) {
    const at = Math.min(last + 0.1, 2.15);
    c.mix(out, c.ring([[110 + 40 * p.pitch, 1], [250, 0.5], [410 + 100 * p.pitch, 0.25]], 0.55, 0.1, sr), at, 0.7, sr);
    c.mix(out, c.burst(r, 0.02, "lp", 900, 0.8, 0.003, 0.008, sr), at, 0.4, sr);
    const gl = c.osc("sine", (tt) => 140 - 50 * tt / 0.4, c.seconds(0.4, sr), sr), ge = c.env(gl.length, 0.03, 0.12, sr);
    c.mix(out, c.multiply(gl, ge), at + 0.12, 0.25, sr);
  }
  c.fade(c.finish(out, 0.85, 1.1), 30, sr);
  return { samples: out };
}
