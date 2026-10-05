// Car handbrake: a lever pull (a chatter of two-part pawl clicks accelerating over a rising cable-creak squeal, short metal stop clunk) or an electric parking brake (relay click, gear-ticked motor whine rising in load, clamp thunk), with an optional cabin tail.
export const meta = {
  title: "Handbrake Pull", kind: "foley", format: "sound", duration: 2, price: 2, author: "hollowbody", payout: "hollowbody@creators.oasis.example", kit: "Car Interior", description: "A car parking brake being set: a mechanical lever ratcheting up through its pawl teeth, or an electric actuator whirring and clamping; for car interior scenes and parking moments.",
  tags: ["handbrake", "parking brake", "ratchet", "car", "interior", "motor", "click", "metal"],
};
export const params = { knobs: {
  type: { type: "choice", label: "Brake type", default: "lever", options: ["lever", "electric"] },
  speed: { type: "range", label: "Ratchet speed", default: 0.5, min: 0, max: 1, step: 0.01 },
  density: { type: "range", label: "Click density", default: 0.5, min: 0, max: 1, step: 0.01 },
  whine: { type: "range", label: "Motor whine", default: 0.5, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Cabin tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + (p.type === "lever" ? 3 : 11));
  const lever = p.type === "lever";
  const dur = lever ? 0.6 + 0.9 * (1 - p.speed) : 0.9 + 0.6 * (1 - p.speed);
  const out = new Float32Array(c.seconds(dur + 0.45, sr));
  const n = c.seconds(dur, sr);
  if (lever) {
    const teeth = Math.round(10 + 30 * p.density), w = [];
    let sum = 0;
    for (let k = 0; k < teeth; k++) { const u = k / (teeth - 1); w.push((1.7 - 1.1 * u) * (0.85 + 0.3 * r())); sum += w[k]; }
    const sc = dur * 0.95 / sum;
    let t = 0.02;
    for (let k = 0; k < teeth; k++) {
      const u = k / (teeth - 1), lvl = (0.6 + 0.4 * u) * (0.8 + 0.4 * r());
      const f = 1800 + 1800 * u + r() * 600;
      c.mix(out, c.burst(r, 0.01, "bp", f, 3, 0.0004, 0.003, sr), t, lvl, sr);
      c.mix(out, c.ring([[f * 0.5, 1], [f * 1.37, 0.4], [f * 2.1, 0.2]], 0.04, 0.008, sr), t, 0.3 * lvl, sr);
      c.mix(out, c.ring([[220 + 60 * u, 1]], 0.04, 0.008, sr), t, 0.25 * lvl, sr);
      c.mix(out, c.burst(r, 0.006, "bp", f * 1.3, 4, 0.0003, 0.002, sr), t + 0.004 + 0.003 * r(), 0.45 * lvl, sr);
      t += w[k] * sc;
    }
    const s = new Float32Array(n), x = c.noise(r, n), bp = c.biquad("bp", 900, 5, sr);
    let ph = 0, ph2 = 0;
    for (let i = 0; i < n; i++) {
      const u = i / n, f = 450 + 850 * u * u + 150 * u, stick = 0.5 + 0.5 * Math.sin(i / sr * (50 + 160 * p.speed));
      ph += c.TAU * f / sr; ph2 += c.TAU * f * 2.01 / sr;
      s[i] = (Math.sin(ph) + 0.4 * Math.sin(ph2)) * stick * (0.2 + 0.8 * u) * Math.min(1, i / (0.05 * sr)) + bp(x[i]) * 0.5 * (0.2 + 0.5 * u) * stick;
    }
    c.mix(out, s, 0.02, 0.05 + 0.45 * p.whine, sr);
    const end = Math.min(t, dur) + 0.01;
    c.mix(out, c.ring([[140, 1], [310, 0.6], [870, 0.4], [2300, 0.2]], 0.2, 0.045, sr), end, 0.6, sr);
    c.mix(out, c.burst(r, 0.012, "hp", 2500, 0.8, 0.0005, 0.003, sr), end, 0.45, sr);
  } else {
    c.mix(out, c.burst(r, 0.012, "bp", 2600, 2, 0.0004, 0.003, sr), 0.01, 0.6, sr);
    c.mix(out, c.ring([[450, 1], [1100, 0.4]], 0.05, 0.01, sr), 0.01, 0.3, sr);
    const s = new Float32Array(n), m = new Float32Array(n);
    let ph = 0, ph2 = 0, ph3 = 0;
    const lp = c.biquad("lp", 5000, 0.7, sr), nz = c.noise(r, n);
    for (let i = 0; i < n; i++) {
      const u = i / n, f = 330 + 200 * u + 500 * u * u * p.speed;
      ph += c.TAU * f / sr; ph2 += c.TAU * f * 2.03 / sr; ph3 += c.TAU * f * 4.1 / sr;
      const e = Math.min(1, i / (0.06 * sr)) * Math.min(1, (n - i) / (0.03 * sr));
      const gear = 0.7 + 0.3 * Math.sin(i / sr * c.TAU * (28 + 20 * u));
      s[i] = (Math.sin(ph) + 0.5 * Math.sin(ph2) + 0.25 * Math.sin(ph3)) * e * gear * (0.5 + 0.5 * u);
      m[i] = lp(nz[i]) * e * 0.25 * (0.4 + u);
    }
    c.mix(out, s, 0.03, 0.15 + 0.6 * p.whine, sr);
    c.mix(out, m, 0.03, 0.4, sr);
    const rate = 14 + 20 * p.speed, ticks = Math.floor((dur - 0.1) * rate);
    for (let k = 0; k < ticks; k++) c.mix(out, c.burst(r, 0.004, "bp", 2000 + r() * 1500, 3, 0.0003, 0.0012, sr), 0.08 + k / rate + 0.004 * r(), (0.05 + 0.4 * p.density) * (0.7 + 0.3 * r()) * (0.6 + 0.6 * k / ticks), sr);
    const end = dur + 0.03;
    c.mix(out, c.ring([[95, 1], [210, 0.6], [640, 0.3]], 0.2, 0.05, sr), end, 0.8, sr);
    c.mix(out, c.burst(r, 0.012, "lp", 1800, 0.8, 0.0006, 0.004, sr), end, 0.5, sr);
  }
  if (p.tail) {
    const tl = c.reverb(out.slice(), { size: 0.3, decay: 0.35, mixAmt: 1 }, sr);
    for (let i = 0; i < out.length; i++) out[i] = out[i] * 0.8 + tl[i] * 0.5;
  }
  c.fade(out, 12, sr);
  c.finish(out, 0.85, 1.1);
  c.fade(out, 12, sr);
  return { samples: out };
}
