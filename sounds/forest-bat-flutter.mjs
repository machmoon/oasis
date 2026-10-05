// Bat flitting past: per-bat fly-bys of leathery wing-stroke grains (resonant down-stroke whup, weak up-stroke, low thump, membrane snap) over a wing-air whoosh, plus faint squeaks; every layer is doppler-shifted and air-absorbed along its own path.
export const meta = {
  title: "Bat Flit", kind: "sfx", format: "sound", duration: 1.2, price: 2, author: "stormfront", payout: "stormfront@creators.oasis.example", kit: "Forest at Night", description: "A bat, a few bats or a swarm flitting past with leathery wing flutter, built for night-forest scenes, caves and spooky fly-bys. Speed, flutter rate, proximity and doppler are knobs, and every seed is a different pass.",
  tags: ["bat", "wings", "flutter", "flyby", "night", "forest", "creature", "swarm"],
};
export const params = { knobs: {
  count: { type: "choice", label: "Count", default: "one", options: ["one", "few", "swarm"] },
  speed: { type: "range", label: "Speed", default: 0.5, min: 0, max: 1, step: 0.01 },
  flutter: { type: "range", label: "Flutter rate (Hz)", default: 12, min: 6, max: 22, step: 0.5 },
  proximity: { type: "range", label: "Proximity", default: 0.6, min: 0, max: 1, step: 0.01 },
  doppler: { type: "range", label: "Doppler", default: 0.5, min: 0, max: 1, step: 0.01 },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const ci = params.knobs.count.options.indexOf(p.count);
  const sr = c.sr, r = c.rng(p.seed * 6151 + ci * 97 + 3);
  const nb = [1, 3, 7][ci], sp = p.speed, near = p.proximity;
  const passLen = 1.5 - 0.9 * sp, spread = [0, 0.5, 1.0][ci];
  const total = passLen + spread + 0.08, out = new Float32Array(c.seconds(total, sr));
  const vel = 4 + 10 * sp, minD = 0.25 + 2.2 * (1 - near), nyq = 0.42 * sr;
  for (let b = 0; b < nb; b++) {
    const lead = b === 0;
    const t0 = lead ? 0.005 : 0.005 + r() * spread;
    const g = lead ? 1 : (ci === 2 ? 0.3 + 0.35 * r() : 0.45 + 0.4 * r());
    const dB = minD * (lead ? 1 : 1.2 + r() * 1.5);
    const rate = p.flutter * (0.9 + 0.2 * r()), period = 1 / rate;
    const tc = (0.4 + 0.2 * r()) * passLen, pitch = 0.85 + 0.3 * r();
    const state = (t) => {
      const x = vel * (t - tc), d = Math.sqrt(dB * dB + x * x);
      const w = Math.sin(Math.PI * c.clamp(t / passLen, 0, 1));
      const fac = Math.pow(2, -p.doppler * 1.1 * (x / d) * (0.5 + 0.5 * sp));
      return { amp: (w * w) / (1 + 0.9 * d), fac, lp: 1200 + 9000 / (1 + 2.5 * d) };
    };
    for (let t = r() * period; t < passLen; t += period * (0.93 + 0.14 * r())) {
      const s = state(t), a = s.amp * g;
      if (a < 0.012) continue;
      const fc = Math.min((1000 + 300 * r()) * pitch * s.fac, s.lp);
      c.mix(out, c.burst(r, 0.03, "bp", fc, 2.4, 0.003, 0.011, sr), t0 + t, a * 1.1, sr);
      c.mix(out, c.burst(r, 0.03, "lp", 260 * pitch * s.fac, 0.8, 0.004, 0.012, sr), t0 + t + 0.001, a * (0.3 + 0.5 * near), sr);
      c.mix(out, c.burst(r, 0.005, "hp", Math.min(s.lp, 2800 * s.fac), 0.9, 0.0004, 0.0015, sr), t0 + t + 0.003 * r(), a * (0.15 + 0.35 * near), sr);
      const tu = t + period * (0.48 + 0.06 * r());
      if (tu < passLen) {
        const u = state(tu);
        c.mix(out, c.burst(r, 0.025, "bp", Math.min(fc * 1.4, u.lp), 1.8, 0.004, 0.009, sr), t0 + tu, u.amp * g * 0.32, sr);
        c.mix(out, c.burst(r, 0.004, "hp", Math.min(u.lp, 3600 * u.fac), 1, 0.0003, 0.0012, sr), t0 + tu - 0.004, u.amp * g * 0.18, sr);
      }
    }
    const nCh = lead ? 3 + Math.floor(r() * 3) : (r() < 0.6 ? 1 : 2);
    for (let k = 0; k < nCh; k++) {
      const tk = passLen * (0.1 + 0.8 * (k + r() * 0.8) / nCh), s = state(tk), a = s.amp * g;
      if (a < 0.02) continue;
      const cd = 0.012 + 0.012 * r(), n = c.seconds(cd, sr);
      const f0 = Math.min((3600 + 1800 * r()) * pitch * s.fac, nyq, s.lp * 1.6);
      const ch = c.osc("sine", (tt) => f0 * (1 - 0.3 * tt / cd), n, sr);
      c.multiply(ch, c.env(n, 0.002, cd * 0.35, sr));
      c.mix(out, c.fade(ch, 2, sr), t0 + tk, a * 0.35, sr);
    }
    const n = c.seconds(passLen, sr), air = c.pink(r, n), lp = c.onepole(sr), hp = c.biquad("hp", 120, 0.7, sr), ph = r();
    let s = state(0);
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      if (i % 32 === 0) s = state(t);
      const flap = 0.4 + 0.6 * Math.max(0, Math.sin(c.TAU * (rate * t + ph)));
      air[i] = hp(lp(air[i], Math.min(550 * s.fac * (0.7 + 0.6 * sp), s.lp))) * s.amp * flap;
    }
    c.mix(out, air, t0, g * (0.3 + 0.35 * sp), sr);
  }
  c.finish(out, 0.92);
  c.gain(out, 0.58 + 0.4 * near);
  c.fade(out, 6, sr);
  return { samples: out };
}
