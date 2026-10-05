// Boots on a narrow wooden staircase: a boot contact per step (toe scuff then tread going up and away; heel crack then toe slap coming down and closer), damped tread modes whose pitch walks with the climb, a short hollow under-stair thump, and stick-slip groans through a gliding resonator. An optional room tail adds a settling creak and a comb-reverb decay.
export const meta = {
  title: "Tavern Stair Boots", kind: "foley", format: "sound", duration: 2.8, price: 3, author: "hollowbody", payout: "hollowbody@creators.oasis.example", kit: "Wooden Tavern", description: "Five booted steps climbing away or descending toward you on a narrow, groaning wooden staircase, with weight, pace and creak as knobs, for taverns, inns and old houses.",
  tags: ["footsteps", "stairs", "wood", "boots", "creak", "tavern", "foley", "climb"],
};
export const params = { knobs: {
  direction: { type: "choice", label: "Direction", default: "up", options: ["up", "down"] },
  pace: { type: "range", label: "Pace (steps/s)", default: 2, min: 1.5, max: 3.2, step: 0.05 },
  weight: { type: "range", label: "Weight", default: 0.5, min: 0, max: 1, step: 0.01 },
  groan: { type: "range", label: "Stair groan", default: 0.5, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Room tail", default: false },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, down = p.direction === "down", w = p.weight, g = p.groan, r = c.rng(p.seed * 7919 + (down ? 503 : 29));
  const steps = 5, iv = (down ? 0.84 : 1) / p.pace, times = [];
  let t = 0.08;
  for (let k = 0; k < steps; k++) { times.push(t); t += iv * (0.9 + r() * 0.2); }
  const last = times[steps - 1], n = c.seconds(last + 0.6 + (p.tail ? 0.8 : 0), sr), out = new Float32Array(n);
  const norm = (b) => { let m = 1e-9; for (let i = 0; i < b.length; i++) m = Math.max(m, Math.abs(b[i])); for (let i = 0; i < b.length; i++) b[i] /= m; return b; };
  const add = (b, at, gn) => c.mix(out, norm(b), Math.max(0, at), gn, sr);
  const creak = (dur, f0, f1, res0, res1) => {
    const m = c.seconds(dur, sr), b = new Float32Array(m), wob = 2 + r() * 4, wph = r() * 6;
    let ph = 0, j = 1, l1 = 0, b1 = 0, l2 = 0, b2 = 0;
    for (let i = 0; i < m; i++) {
      const u = i / m, sh = Math.pow(u, 0.7);
      ph += (f0 + (f1 - f0) * sh) * (1 + 0.12 * Math.sin(c.TAU * wob * u + wph)) * j / sr; let x = 0;
      if (ph >= 1) { ph -= 1; j = 0.75 + r() * 0.5; x = r() < 0.08 ? 0.15 : 0.4 + r() * 0.6; }
      const fc = res0 + (res1 - res0) * sh, q1 = 2 * Math.sin(Math.PI * fc / sr), q2 = 2 * Math.sin(Math.PI * fc * 2.3 / sr);
      l1 += q1 * b1; b1 += q1 * (x - l1 - 0.3 * b1);
      l2 += q2 * b2; b2 += q2 * (x - l2 - 0.4 * b2);
      b[i] = (b1 + 0.5 * b2) * Math.sin(Math.PI * Math.min(1, u * 1.1)) * (1 - 0.4 * u);
    }
    return b;
  };
  const thump = (at, lv, f) => {
    const m = c.seconds(0.22, sr), b = c.brown(r, m), lp = c.biquad("lp", 300 + 200 * (1 - w), 0.7, sr), bp = c.biquad("bp", f * 1.3, 1.4, sr), tau = 0.03 + 0.035 * w;
    for (let i = 0; i < m; i++) { const s = i / sr; b[i] = (lp(b[i]) + 0.3 * bp(b[i])) * Math.exp(-s / tau) * Math.min(1, s / 0.002); }
    add(b, at + 0.002, (0.25 + 0.3 * w) * lv);
  };
  const tread = (at, f, lv, bright, decay, heel) => {
    add(c.ring([[f, 1], [f * 2.31, 0.55], [f * 3.87, 0.3 * bright], [f * 5.4, 0.15 * bright]].map(([h, a]) => [h * (0.98 + r() * 0.04), a]), 0.16, decay, sr), at + 0.002, 0.45 * lv);
    add(c.burst(r, 0.06, "bp", f * 2.3, 1.6, 0.001, decay * 0.6, sr), at, 0.3 * lv);
    add(c.burst(r, 0.1, "lp", 100 + 60 * (1 - w), 0.9, 0.0015, 0.022 + 0.03 * w, sr), at + 0.001, (0.4 + 0.65 * w) * lv);
    add(c.burst(r, 0.014, "hp", heel ? 3600 : 1500 + 1500 * bright, 0.8, 0.0004, heel ? 0.003 : 0.0016, sr), at, (heel ? 0.75 : 0.28 * bright) * lv);
    thump(at, lv, f);
  };
  const must = Math.floor(r() * steps), base0 = 185 * (1 - 0.3 * w);
  for (let k = 0; k < steps; k++) {
    const prog = k / (steps - 1), near = down ? 0.5 + 0.5 * prog : 1 - 0.5 * prog, lv = 0.55 + 0.45 * near, at = times[k];
    const f = base0 * (down ? 1.22 - 0.3 * prog : 0.92 + 0.3 * prog) * (0.95 + r() * 0.1), decay = (down ? 0.018 : 0.026) + 0.028 * w;
    if (down) {
      tread(at, f, lv, near, decay * 0.8, true);
      const slap = at + 0.06 + r() * 0.03;
      add(c.burst(r, 0.03, "lp", 1600, 0.8, 0.0008, 0.006, sr), slap, 0.45 * lv);
      add(c.ring([[f * 1.12, 1], [f * 2.5, 0.4]], 0.08, decay * 0.7, sr), slap + 0.001, 0.35 * lv);
    } else {
      add(c.burst(r, 0.06, "bp", 1500 + 1000 * near, 0.9, 0.008, 0.016, sr), at - 0.06 - r() * 0.02, 0.22 * lv);
      tread(at, f, lv, near, decay, false);
    }
    if (k === must || r() < 0.25 + 0.6 * g) {
      const f0 = 35 + r() * 30 - 10 * w, rise = r() < 0.5, dur = Math.min(0.75 * iv, 0.2 + r() * (0.15 + 0.2 * w));
      const res = 450 + r() * 400;
      add(creak(dur, rise ? f0 : f0 * 2.6, rise ? f0 * 2.6 : f0, rise ? res : res * 1.5, rise ? res * 1.5 : res), at + 0.04 + r() * 0.04, (0.12 + 0.55 * g) * (0.6 + 0.4 * w) * lv);
    }
  }
  if (p.tail) {
    const f0 = 30 + r() * 20;
    add(creak(0.5, f0 * 2, f0, 600 + r() * 200, 380), last + 0.35 + r() * 0.08, 0.12 + 0.25 * g);
    const y = new Float32Array(n);
    for (const d of [0.0297, 0.0371, 0.0411, 0.0437, 0.0533]) {
      const L = Math.round(d * sr), line = new Float32Array(L), fb = Math.pow(0.001, d / 0.75);
      let idx = 0, s = 0;
      for (let i = 0; i < n; i++) { const v = line[idx]; s += 0.4 * (v - s); line[idx] = out[i] + fb * s; y[i] += v * 0.2; idx = idx + 1 === L ? 0 : idx + 1; }
    }
    for (let i = 0; i < n; i++) out[i] += 0.45 * y[i];
  }
  const rel = c.seconds(0.2, sr);
  for (let i = 0; i < rel; i++) out[n - 1 - i] *= i / rel;
  c.finish(out, 0.9);
  c.fade(out, 15, sr);
  return { samples: out };
}
