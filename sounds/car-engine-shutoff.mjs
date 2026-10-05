// Engine shut-off: firing pulses with real cylinder-count spacing winding down in pitch and slowing in rate, a valve-clatter layer, a final cough and torque shudder rocking at the stop, a fan run-on (whoosh plus gliding blade whine), then pitched metal cooling ticks that slow and drop in pitch as the manifold cools.
export const meta = {
  title: "Engine Shut-Off", kind: "sfx", format: "sound", duration: 4, price: 3, author: "hollowbody", payout: "hollowbody@creators.oasis.example", kit: "Car Interior", description: "A car engine cutting off: the idle winds down with a shudder and a last cough, the cooling fan runs on, and pitched metal cooling ticks fade into the quiet; for ignition-off moments in driving games and film.",
  tags: ["car", "engine", "shutoff", "ignition", "cooling", "ticks", "vehicle", "interior"],
};
export const params = { knobs: {
  engine: { type: "choice", label: "Engine", default: "V6", options: ["4cyl", "V6", "V8"] },
  shudder: { type: "range", label: "Shudder", default: 0.5, min: 0, max: 1, step: 0.01 },
  ticks: { type: "range", label: "Tick density", default: 0.5, min: 0, max: 1, step: 0.01 },
  fan: { type: "range", label: "Fan run-on", default: 0.4, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Ticking tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, ei = params.knobs.engine.options.indexOf(p.engine), r = c.rng(p.seed * 613 + ei * 37 + 11);
  const cyl = [4, 6, 8][ei], rpm0 = [880, 760, 640][ei] * (0.97 + r() * 0.06);
  const stop = [0.7, 0.85, 1.05][ei] + 0.12 * r();
  const sh = p.shudder, fd = 0.9 + 1.7 * p.fan;
  const dur = p.tail ? 4 : Math.min(4, Math.max(stop + 1.1, stop * 0.6 + fd + 0.3));
  const n = c.seconds(dur, sr), out = new Float32Array(n), end = stop + 0.3;
  const eng = new Float32Array(n), body = [[1100, 700, 0.7], [650, 450, 1.1], [420, 330, 1.4]][ei];
  const lp = c.biquad("lp", body[0], 0.9, sr), lp2 = c.biquad("bp", body[1], 1.5, sr);
  let ph = 0, wob = 0, cg = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    if (t > end) break;
    const u = Math.min(1, t / stop), k = 1 - Math.pow(u, 1.5);
    const f = rpm0 / 60 * cyl / 2 * (0.12 + 0.88 * k);
    const rock = sh * Math.sin(c.TAU * (4 + 5 * u) * t);
    if (i % 600 === 0) wob = (r() - 0.5) * sh;
    ph += f * (1 + 0.1 * rock) / sr + wob * 0.0004;
    const x = ph % 1, pulse = Math.exp(-x * (6 + 6 * (1 - k))) * (1 - Math.exp(-x * 90));
    const lump = 1 - 0.5 * sh * (0.5 + 0.5 * Math.sin(c.TAU * ph / cyl * 2));
    const a = Math.min(1, t / 0.01) * Math.pow(k, 0.4) * lump * (1 - 0.3 * Math.max(0, rock)) * Math.min(1, (end - t) / 0.15);
    const clat = (r() < 0.05 + 0.1 * k ? (r() - 0.5) : 0), tone = Math.sin(c.TAU * ph * 3) * 0.2;
    cg = cg * 0.5 + clat * 0.5;
    eng[i] = (pulse * 1.5 - 0.4 + 0.3 * Math.sin(c.TAU * ph * 2) + tone) * a + cg * 0.5 * k;
  }
  const e2 = eng.slice();
  c.filter(eng, lp);
  c.filter(e2, lp2);
  for (let i = 0; i < n; i++) eng[i] += e2[i] * 0.8;
  c.mix(out, eng, 0, 0.75, sr);
  c.mix(out, c.ring([[46, 1], [92, 0.4]], 0.4, 0.12, sr), stop - 0.02, 0.25 + 0.5 * sh, sr);
  c.mix(out, c.burst(r, 0.12, "bp", 280 + 80 * r(), 1.2, 0.01, 0.05, sr), stop - 0.05, 0.5, sr);
  c.mix(out, c.burst(r, 0.03, "bp", 2400, 1.2, 0.002, 0.01, sr), 0.02, 0.12, sr);
  for (let s = 0; s < 2 + Math.round(5 * sh); s++) {
    const f = 60 + r() * 40, tt = stop + 0.08 + s * (0.08 + r() * 0.05) * (1 + s * 0.15);
    c.mix(out, c.ring([[f, 1], [f * 2.3, 0.35], [f * 4.1, 0.1]], 0.2, 0.06, sr), tt, (0.12 + 0.3 * sh) * (1 - s * 0.12), sr);
    c.mix(out, c.burst(r, 0.01, "bp", 900 + 600 * r(), 2, 0.001, 0.004, sr), tt, 0.12 + 0.2 * sh, sr);
  }
  if (p.fan > 0.02) {
    const fn = c.seconds(fd, sr), fx = c.pink(r, fn), fl = c.biquad("bp", 500, 0.8, sr), fo = c.onepole(sr);
    let wp = 0;
    for (let i = 0; i < fn; i++) {
      const t = i / sr, u = t / fd, spin = 1 - 0.55 * u;
      wp += (300 + 420 * spin) / sr;
      const env = Math.min(1, u * 8) * Math.pow(1 - u, 1.2);
      fx[i] = (fo(fl(fx[i]), 700 + 1500 * spin) * (0.75 + 0.25 * Math.sin(c.TAU * 24 * spin * t)) * 1.6 + 0.22 * Math.sin(c.TAU * wp) + 0.1 * Math.sin(c.TAU * wp * 2.01)) * env;
    }
    c.mix(out, fx, stop * 0.5, 0.4 * p.fan + 0.12, sr);
  }
  if (p.tail) {
    const base = 0.28 - 0.17 * p.ticks, f0 = 900 + 500 * r();
    const mf = [f0, f0 * 1.51, f0 * 2.12, f0 * 2.9];
    let t = stop + 0.5 + r() * 0.15, k = 0;
    while (t < dur - 0.4) {
      const u = (t - stop) / (dur - stop), g = (0.45 + 0.55 * r()) * (1 - 0.65 * u);
      const m = (r() * 4) | 0, f = mf[m] * (1.02 - 0.12 * u) * (0.97 + 0.06 * r());
      c.mix(out, c.ring([[f, 1], [f * 2.43, 0.5], [f * 4.1, 0.25], [f * 6.3, 0.1]], 0.22, 0.04 + 0.04 * r(), sr), t, g * 0.5, sr);
      c.mix(out, c.burst(r, 0.003, "bp", 3800, 1.2, 0.0005, 0.0015, sr), t, g * 0.2, sr);
      if (r() < 0.2 + 0.4 * p.ticks) c.mix(out, c.ring([[f * 1.33, 1], [f * 3.2, 0.3]], 0.15, 0.03, sr), t + 0.05 + 0.06 * r(), g * 0.3, sr);
      t += base * (0.5 + 1.5 * r()) * (1 + 2.6 * u * u) + 0.05;
    }
  }
  c.fade(out, 25, sr);
  c.finish(out, 0.85, 1.1);
  return { samples: out };
}
