// Kettle switch: an electric kettle's rocker going on or snapping off. Lever-travel scuff, a bimetal snap click,
// short inharmonic plastic lever modes, a damped noise-led housing thunk, a spring rebound on switch-off, and an
// optional tail (element heating wash and ticks when on, steam sigh and cooling ticks when off).
export const meta = {
  title: "Kettle Switch", kind: "ui", format: "sound", duration: 0.15, price: 1, author: "quietmachine", payout: "quietmachine@creators.oasis.example", kit: "Kitchen", description: "An electric kettle switching on or clacking off: click sharpness, plastic body thunk and pitch are knobs, with an optional settle tail; ideal for kitchen scenes or a tactile console confirm.",
  tags: ["kettle", "switch", "click", "kitchen", "plastic", "toggle", "appliance", "ui"],
};
export const params = { knobs: {
  state: { type: "choice", label: "State", default: "on", options: ["on", "off"] },
  sharpness: { type: "range", label: "Click sharpness", default: 0.6, min: 0, max: 1, step: 0.01 },
  thunk: { type: "range", label: "Body thunk", default: 0.5, min: 0, max: 1, step: 0.01 },
  pitch: { type: "range", label: "Pitch", default: 0.5, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Settle tail", default: false },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, on = p.state === "on", s = p.sharpness, k = p.thunk;
  const r = c.rng(p.seed * 613 + (on ? 11 : 97));
  const base = 1100 * Math.pow(2, p.pitch * 1.4 - 0.7) * (0.97 + r() * 0.06);
  const low = 150 * Math.pow(2, p.pitch - 0.5) * (0.95 + r() * 0.1);
  const dry = on ? 0.1 + 0.06 * k + 0.02 * (1 - s) : 0.085 + 0.045 * k + 0.02 * (1 - s);
  const len = dry + (p.tail ? (on ? 0.34 : 0.24) : 0), out = new Float32Array(c.seconds(len, sr));
  const ring = (modes, decay, at, g) => c.mix(out, c.ring(modes.map(([f, a]) => [f * (0.985 + r() * 0.03), a]), Math.max(0.005, Math.min(decay * 6, len - at - 0.002)), decay, sr), at, g, sr);
  const t0 = on ? 0.011 + r() * 0.007 : 0.002;
  if (on) {
    c.mix(out, c.burst(r, 0.014, "bp", 1500 + r() * 600, 1.1, 0.004, 0.004, sr), 0, 0.1 + 0.05 * r(), sr);
    c.mix(out, c.burst(r, 0.004, "bp", 3000 + r() * 1500, 1.5, 0.0005, 0.0012, sr), t0 * 0.4, 0.08, sr);
  }
  const ca = on ? 0.75 : 1;
  c.mix(out, c.burst(r, 0.007, "hp", 3000 + 5000 * s, 0.7 + 1.2 * s, 0.0003, 0.0006 + 0.0024 * (1 - s), sr), t0, ca * (0.65 + 0.35 * s) * (0.9 + 0.2 * r()), sr);
  c.mix(out, c.burst(r, 0.003, "bp", 5500 + 3500 * s, 2, 0.0003, 0.0005, sr), t0 + 0.0004, 0.25 + 0.35 * s, sr);
  const pm = on ? [[base, 1], [base * 2.27, 0.5], [base * 3.91, 0.22]] : [[base * 1.3, 1], [base * 2.93, 0.55], [base * 4.62, 0.3]];
  ring(pm, (on ? 0.006 : 0.004) + 0.005 * (1 - s), t0 + 0.0005, 0.4);
  const td = on ? 0.008 + 0.016 * k : 0.006 + 0.01 * k, tg = on ? 0.12 + 0.45 * k : 0.08 + 0.3 * k;
  ring([[low, 1], [low * 1.58, 0.5], [low * 2.71, 0.25]], td, t0 + 0.001, tg);
  c.mix(out, c.burst(r, 0.04, "lp", 500 + 700 * k, 0.6, 0.0012, 0.004 + 0.009 * k, sr), t0, (on ? 0.2 : 0.12) + 0.6 * k, sr);
  c.mix(out, c.burst(r, 0.02, "bp", 900 + 500 * k + r() * 300, 0.8, 0.001, 0.005, sr), t0 + 0.0008, 0.1 + 0.2 * k, sr);
  if (!on) {
    const tr = t0 + 0.015 + r() * 0.009;
    c.mix(out, c.burst(r, 0.004, "hp", 3000 + 4000 * s, 1, 0.0003, 0.0008, sr), tr, 0.3 + 0.1 * r(), sr);
    ring([[3200 * (0.9 + 0.2 * r()), 0.6], [4730 * (0.9 + 0.2 * r()), 0.35], [6900, 0.15]], 0.008, tr, 0.2);
    ring([[low * 1.2, 1], [low * 2.1, 0.3]], 0.006 + 0.008 * k, tr, 0.2 * k);
    c.mix(out, c.burst(r, 0.025, "lp", 700 + 400 * k, 0.6, 0.001, 0.005, sr), tr, 0.08 + 0.2 * k, sr);
  }
  if (p.tail) {
    const tl = len - dry;
    if (on) {
      c.mix(out, c.burst(r, tl + 0.05, "bp", 600 + r() * 250, 0.6, 0.07, 0.16, sr), dry - 0.06, 0.09, sr);
      c.mix(out, c.burst(r, tl, "lp", 260 + r() * 80, 0.6, 0.09, 0.14, sr), dry - 0.03, 0.08, sr);
    } else {
      c.mix(out, c.burst(r, tl + 0.03, "hp", 2200 + r() * 1200, 0.6, 0.012, 0.07, sr), dry - 0.05, 0.08, sr);
      ring([[base * 0.42, 1], [base * 0.73, 0.5], [base * 1.17, 0.25]], 0.025, t0 + 0.002, 0.12);
    }
    const g = on ? 9 + Math.floor(r() * 6) : 7 + Math.floor(r() * 5);
    for (let i = 0; i < g; i++) {
      const u = r(), t = on ? dry - 0.04 + Math.pow(u, 0.8) * (tl - 0.02) : t0 + 0.035 + Math.pow(u, 1.6) * (len - 0.07);
      const amp = on ? (0.03 + 0.07 * r()) * (0.5 + 0.5 * u) : (0.04 + 0.09 * r()) * (1 - u * 0.75);
      c.mix(out, c.burst(r, 0.005, "bp", (on ? 1800 : 2600) + r() * 3500, 0.8 + r() * 1.5, 0.0004, 0.0006 + r() * 0.0015, sr), t, amp, sr);
    }
  }
  c.fade(c.finish(out, 0.85), 3, sr);
  return { samples: out };
}
