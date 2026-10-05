// Wall Scratch: a fingernail dragged behind a wall as a dense stream of 1-4 ms friction grains grouped into press-drag-lift strokes that stutter into each other, a surface-specific grain pattern, a faint gliding squeal, a muffled wall resonance and an optional hollow cavity tail.
export const meta = {
  title: "Wall Scratch", kind: "foley", format: "sound", duration: 3, price: 3, author: "hollowbody", payout: "hollowbody@creators.oasis.example", kit: "Horror House", description: "A fingernail scratching behind plaster, wood or wallpaper, heard through the wall; for haunted-house dread, a presence in the walls or a creeping jump-scare build.",
  tags: ["scratch", "fingernail", "wall", "horror", "haunted", "plaster", "creepy", "foley"],
};
export const params = { knobs: {
  surface: { type: "choice", label: "Surface", default: "plaster", options: ["plaster", "wood", "wallpaper"] },
  pressure: { type: "range", label: "Pressure", default: 0.5, min: 0, max: 1, step: 0.01 },
  length: { type: "range", label: "Length", default: 0.5, min: 0, max: 1, step: 0.01 },
  speed: { type: "range", label: "Speed", default: 1, min: 0.5, max: 2, step: 0.05 },
  grit: { type: "range", label: "Grit", default: 0.5, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Hollow tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + params.knobs.surface.options.indexOf(p.surface) * 97 + 3);
  const S = { plaster: { g: 3600, q: 1.6, res: [[240, 1], [410, 0.5]], sq: 2300, k: 1, cut: 8000 },
    wood: { g: 2300, q: 3, res: [[170, 1], [340, 0.7], [690, 0.35]], sq: 1500, k: 0.45, cut: 5000 },
    wallpaper: { g: 5600, q: 0.9, res: [[300, 0.6]], sq: 3400, k: 1.1, cut: 10500 } }[p.surface];
  const total = 3, n = c.seconds(total, sr), out = new Float32Array(n), body = new Float32Array(n);
  const pr = p.pressure, sp = Math.sqrt(p.speed), end = 0.1 + 1.5 + 1.2 * p.length;
  const rate = (300 + 800 * p.grit) * (0.7 + 0.6 * pr) * sp * S.k;
  const env = (u) => Math.min(1, u / 0.15) * (1 - 0.6 * u) * Math.min(1, (1 - u) / 0.12);
  let t0 = 0.1;
  while (t0 < end - 0.1) {
    const d = Math.min(end - t0, (0.25 + 0.35 * r()) / (0.6 + 0.4 * p.speed)), sa = 0.6 + 0.4 * r();
    const drift = 0.85 + 0.3 * r(), fs = (0.8 + 0.25 * p.speed) * (0.85 + 0.5 * pr);
    let t = t0;
    while (t < t0 + d) {
      const u = (t - t0) / d, e = env(u) * sa, wob = 0.7 + 0.3 * Math.sin(t * 37 + p.seed);
      const slip = r() < 0.04 + 0.1 * pr ? 2.2 : 1;
      const f = S.g * fs * drift * (0.6 + 0.3 * u) * (0.6 + r() * 0.9);
      const a = (0.1 + 0.4 * pr) * e * wob * (0.25 + 0.75 * r()) * slip;
      c.mix(out, c.burst(r, 0.0015 + r() * 0.003, "bp", f, S.q, 0.0003, 0.0008 + r() * 0.0014, sr), t, a, sr);
      if (p.surface === "plaster" && r() < 0.02 + 0.03 * pr) c.mix(out, c.burst(r, 0.012, "bp", 1500 + r() * 900, 1.2, 0.001, 0.004, sr), t, 0.45 * e, sr);
      if (p.surface === "wallpaper" && r() < 0.01) c.mix(out, c.burst(r, 0.025, "hp", 4500, 0.7, 0.002, 0.008, sr), t, 0.2 * e, sr);
      if (p.surface === "wood" && r() < 0.03) c.mix(body, c.ring(S.res.map(([fr, am]) => [fr * (0.97 + r() * 0.06), am]), 0.06, 0.015, sr), t, 0.3 * e, sr);
      if (r() < 0.012) c.mix(body, c.ring(S.res.map(([fr, am]) => [fr * (0.97 + r() * 0.06), am]), 0.05, 0.012, sr), t, 0.25 * e, sr);
      const base = 1 / rate;
      t += p.surface === "wood" ? base * (0.8 + 0.4 * r()) : -Math.log(1 - r() * 0.98) * base;
    }
    if (r() < 0.6) {
      const sqn = c.seconds(d, sr), sq = new Float32Array(sqn), sqf = S.sq * (0.85 + 0.3 * r());
      let ph = 0, gate = 0, tgt = 1;
      for (let i = 0; i < sqn; i++) {
        if (i % 300 === 0) tgt = r() < 0.6 ? 0.3 + 0.7 * r() : 0;
        gate += (tgt - gate) * 0.02;
        const uu = i / sqn;
        ph += c.TAU * sqf * (1 + 0.2 * uu + 0.02 * Math.sin(uu * 55)) / sr;
        sq[i] = Math.sin(ph) * gate * env(uu);
      }
      c.mix(out, sq, t0, 0.025 + 0.07 * pr * pr, sr);
    }
    t0 += d + 0.02 + r() * 0.08;
  }
  c.filter(body, c.biquad("lp", 800 + 600 * (1 - pr), 0.8, sr));
  c.mix(out, body, 0, 0.8, sr);
  c.filter(out, c.biquad("lp", S.cut, 0.7, sr));
  if (p.tail) {
    const cav = c.reverb(out.slice(), { size: 0.8, decay: 0.85, mixAmt: 1 }, sr), hl = c.biquad("bp", 300, 1.5, sr);
    for (let i = 0; i < n; i++) out[i] += 0.6 * hl(cav[i]) + 0.4 * cav[i];
  }
  c.fade(out, 20, sr);
  c.finish(out, 0.85, 1.1);
  c.fade(out, 15, sr);
  return { samples: out };
}
