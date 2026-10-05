// Office chair recline: soft latch clunk, then sustained stick-slip creak phrases (pitch-wobbling harmonic squeals with sharp slip onsets and friction grit, rising with the tilt), spring twang and a quiet settle; the tail toggle adds a late rebound creak and a second settle.
export const meta = {
  title: "Chair Recline Creak", kind: "foley", format: "sound", duration: 2.5, price: 2, author: "foleyroom", payout: "foleyroom@creators.oasis.example", kit: "Office", description: "An office chair tilting back under a sitter's weight, with sustained stick-slip creaks, a spring twang and a gentle settle; for open-plan office scenes and character foley.",
  tags: ["chair", "creak", "office", "recline", "spring", "foley", "squeak", "furniture"],
};
export const params = { knobs: {
  build: { type: "choice", label: "Chair build", default: "leather", options: ["mesh", "leather", "cheap plastic"] },
  recline: { type: "range", label: "Recline depth", default: 0.6, min: 0, max: 1, step: 0.01 },
  creak: { type: "range", label: "Creak density", default: 0.5, min: 0, max: 1, step: 0.01 },
  twang: { type: "range", label: "Spring twang", default: 0.5, min: 0, max: 1, step: 0.01 },
  pitch: { type: "range", label: "Pitch", default: 0.5, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Settling tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + params.knobs.build.options.indexOf(p.build) * 97 + 11);
  const B = { mesh: { f: 900, h: 4, rust: 5200, body: 0.7, wob: 9, gl: 0.25 }, leather: { f: 620, h: 9, rust: 2600, body: 0.6, wob: 5, gl: 0.45 }, "cheap plastic": { f: 1250, h: 6, rust: 4200, body: 0.4, wob: 14, gl: 0.7 } }[p.build];
  const pm = Math.pow(2, (p.pitch - 0.5) * 1.4), rec = p.recline;
  const tilt = 0.5 + 1.1 * rec, t0 = 0.1, te = t0 + tilt + 0.08;
  const out = new Float32Array(c.seconds(te + (p.tail ? 1.0 : 0.35), sr));
  c.mix(out, c.ring([[150 * pm, 1], [310 * pm * (1 + r() * 0.03), 0.4]], 0.12, 0.03, sr), t0, 0.22 * B.body, sr);
  c.mix(out, c.burst(r, 0.01, "bp", 2800, 1.5, 0.0008, 0.003, sr), t0, 0.25, sr);
  const phrase = (t, dur, f0, gl, amp, wob) => {
    const n = c.seconds(dur, sr), x = new Float32Array(n), g = c.noise(r, n);
    const lpg = c.biquad("bp", f0 * 2, 1.5, sr), wr = r() * 6; let ph = 0, jit = 0, stick = 1;
    for (let i = 0; i < n; i++) {
      const u = i / n, tt = i / sr; jit += (r() - 0.5) * 0.006; jit *= 0.995;
      if (i % 90 === 0) stick = 0.55 + 0.45 * r();
      ph += c.TAU * f0 * (1 + gl * (u - 0.4) + jit + 0.025 * Math.sin(c.TAU * wob * tt + wr)) / sr;
      let s = 0; for (let h = 1; h <= B.h; h++) s += Math.sin(ph * h) / (h * (0.6 + 0.4 * h));
      const a = Math.min(1, i / (0.002 * sr)) * (0.45 + 0.55 * Math.sin(Math.PI * Math.pow(u, 0.7))) * stick;
      x[i] = (s + 0.5 * lpg(g[i])) * a;
    }
    c.mix(out, x, t, amp, sr);
  };
  const ph = Math.round(2 + 4 * p.creak + 1.5 * rec), slot = tilt / ph;
  for (let k = 0; k < ph; k++) {
    const prog = k / ph, t = t0 + 0.06 + k * slot + r() * slot * 0.25;
    const dur = Math.min(0.14 + r() * 0.2 + 0.1 * (1 - p.creak), slot * 1.3);
    const f0 = B.f * pm * (0.8 + 0.5 * prog) * (0.9 + r() * 0.2) * (r() < 0.5 ? 1 : 1.19);
    phrase(t, dur, f0, (r() < 0.5 ? 1 : -1) * B.gl * (0.5 + r()), 0.18 + 0.2 * r() + 0.1 * p.creak, B.wob * (0.7 + 0.6 * r()));
    c.mix(out, c.burst(r, 0.005, "bp", B.rust, 3, 0.0004, 0.002, sr), t, 0.1, sr);
  }
  const grains = Math.round(10 + 30 * p.creak);
  for (let g = 0; g < grains; g++) c.mix(out, c.burst(r, 0.003 + r() * 0.006, "bp", B.rust * (0.7 + r() * 0.6), 3, 0.0004, 0.0015, sr), t0 + r() * tilt, 0.03 + 0.07 * r(), sr);
  if (p.twang > 0.02) {
    const nt = 1 + Math.round(p.twang * 2);
    for (let k = 0; k < nt; k++) {
      const f = (190 + r() * 200) * pm * (1 + k * 0.21), at = t0 + 0.05 + r() * tilt * 0.9;
      const n = c.seconds(0.35 + 0.35 * p.twang, sr), x = c.osc("sine", (tt) => f * (1 + 0.08 * Math.exp(-tt * 30)) * (1 + 0.01 * Math.sin(tt * 45)), n, sr), e = c.env(n, 0.001, 0.1 + 0.12 * p.twang, sr);
      for (let i = 0; i < n; i++) x[i] = (x[i] + 0.45 * Math.sin(c.TAU * f * 2.76 * i / sr) + 0.2 * Math.sin(c.TAU * f * 5.4 * i / sr)) * e[i];
      c.mix(out, x, at, 0.2 * p.twang, sr);
    }
  }
  c.mix(out, c.ring([[135 * pm, 1], [270 * pm, 0.3]], 0.15, 0.04, sr), te, 0.3 * B.body, sr);
  c.mix(out, c.burst(r, 0.012, "lp", 2200, 0.8, 0.001, 0.004, sr), te, 0.2, sr);
  if (p.tail) {
    phrase(te + 0.15, 0.22 + r() * 0.1, B.f * pm * 0.8, -B.gl, 0.2, B.wob);
    phrase(te + 0.5 + r() * 0.1, 0.16, B.f * pm * 0.95, B.gl, 0.12, B.wob);
    c.mix(out, c.ring([[190 * pm, 0.5], [415 * pm, 0.3]], 0.7, 0.25, sr, 0.4), te + 0.02, 0.06 + 0.1 * p.twang, sr);
  }
  c.filter(out, c.biquad("hp", 140, 0.7, sr));
  c.fade(c.finish(out, 0.85, 1.1), 40, sr);
  return { samples: out };
}
