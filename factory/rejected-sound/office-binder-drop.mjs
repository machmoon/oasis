// Binder drop: a flat object landing on a desk. Layers: air-slap crack on contact, a short damped body thud, a tight hollow desk knock, object-specific detail (cover clack, air puff, paper flutter), and an optional room tail. Final level follows drop height and weight.
export const meta = {
  title: "Binder Drop", kind: "impact", format: "sound", duration: 1, price: 2, author: "foleyroom", payout: "foleyroom@creators.oasis.example", kit: "Office", description: "A heavy binder, ream or folder stack dropped flat on a desk: slap, thump, desk knock and paper settle, for office scenes, thrown-down files and dramatic paperwork.",
  tags: ["binder", "drop", "desk", "paper", "office", "slap", "thud", "foley"],
};
export const params = { knobs: {
  object: { type: "choice", label: "Object", default: "binder", options: ["binder", "ream", "folder stack"] },
  size: { type: "choice", label: "Weight size", default: "heavy", options: ["light", "heavy"] },
  height: { type: "range", label: "Drop height", default: 0.5, min: 0, max: 1, step: 0.01 },
  brightness: { type: "range", label: "Slap brightness", default: 0.5, min: 0, max: 1, step: 0.01 },
  boom: { type: "range", label: "Desk boom", default: 0.5, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Room tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + params.knobs.object.options.indexOf(p.object) * 71 + (p.size === "heavy" ? 5 : 1));
  const out = new Float32Array(c.seconds(p.tail ? 1 : 0.6, sr));
  const heavy = p.size === "heavy" ? 1 : 0, h = p.height, vel = 0.4 + 0.6 * h, b = p.brightness;
  const m = (0.6 + 0.4 * heavy) * (0.9 + 0.2 * r());
  const o = { binder: { f: 150, sl: 2600, sd: 0.012, body: 0.03 }, ream: { f: 100, sl: 1700, sd: 0.02, body: 0.025 }, "folder stack": { f: 125, sl: 3400, sd: 0.03, body: 0.02 } }[p.object];
  const f0 = o.f * (1.3 - 0.45 * heavy) * (0.97 + 0.06 * r());
  const sd = o.sd * (0.8 + 0.5 * heavy);
  c.mix(out, c.burst(r, sd * 3, "bp", o.sl + 3000 * b, 0.5 + 0.8 * b, 0.0006, sd, sr), 0, (0.7 + 0.8 * b) * vel, sr);
  c.mix(out, c.burst(r, 0.008, "hp", 2500 + 5000 * b, 0.7, 0.0004, 0.0025, sr), 0, (0.2 + 0.7 * b) * vel, sr);
  const thump = c.ring([[f0, 1], [f0 * 1.9 * (0.98 + 0.04 * r()), 0.45], [f0 * 3.1, 0.25]], 0.2, o.body * (0.8 + 0.8 * heavy), sr);
  c.mix(out, thump, 0.0015, (0.5 + 0.5 * heavy) * vel, sr);
  const sw = c.osc("sine", (t) => f0 * 0.8 * (1 + 0.9 * Math.exp(-t * 70)), c.seconds(0.1, sr), sr);
  c.multiply(sw, c.env(sw.length, 0.001, 0.025 + 0.02 * heavy, sr));
  c.mix(out, sw, 0.001, 0.45 * vel * m, sr);
  const df = 64 + 26 * (1 - heavy) + 10 * r();
  const bm = c.ring([[df, 1], [df * 1.8, 0.5], [df * 2.7 * (0.97 + 0.06 * r()), 0.3], [235 + 40 * r(), 0.2]], 0.3, 0.025 + 0.07 * p.boom + 0.02 * heavy, sr);
  c.mix(out, bm, 0.003, (0.08 + 0.9 * p.boom) * vel * m, sr);
  const settle = (cnt, span, lo, hi, q, lvl) => { for (let g = 0; g < cnt; g++) { const t = 0.03 + Math.pow(r(), 1.5) * span; c.mix(out, c.burst(r, 0.01 + r() * 0.02, "bp", lo + r() * hi, q, 0.002, 0.005 + r() * 0.01, sr), t, (0.5 + r()) * lvl * vel * (1 - t / (span + 0.1)), sr); } };
  if (p.object === "binder") {
    c.mix(out, c.ring([[1300 + 300 * r(), 0.6], [2900, 0.35], [4300, 0.15]], 0.06, 0.012, sr), 0.004, 0.3 * vel, sr);
    c.mix(out, c.ring([[1900 + 200 * r(), 0.5], [3400, 0.3]], 0.05, 0.01, sr), 0.045 + 0.03 * r(), 0.14 * vel, sr);
    settle(8, 0.2, 2500, 3000, 1.5, 0.08);
  } else if (p.object === "ream") {
    const n = c.seconds(0.12, sr), pf = c.noise(r, n), lp = c.biquad("lp", 900 + 1500 * b, 0.7, sr), e = c.env(n, 0.004, 0.035, sr);
    for (let i = 0; i < n; i++) pf[i] = lp(pf[i]) * e[i];
    c.mix(out, pf, 0.002, 0.7 * vel, sr);
    settle(8, 0.15, 3000, 3000, 1.2, 0.06);
  } else settle(26, 0.35, 1800, 4500, 1.2, 0.11);
  if (p.tail) {
    const wet = c.reverb(Float32Array.from(out), { size: 0.5 + 0.3 * heavy, decay: 0.5, mixAmt: 1 }, sr);
    for (let i = 0; i < out.length; i++) out[i] = out[i] * 0.85 + wet[i] * 0.4;
  }
  const N = out.length, fo = c.seconds(0.04, sr), fi = c.seconds(0.0005, sr) + 1;
  for (let i = 0; i < fo; i++) out[N - 1 - i] *= i / fo;
  for (let i = 0; i < fi; i++) out[i] *= i / fi;
  c.finish(out, 0.95, 1.3);
  let pk = 0;
  for (let i = 0; i < N; i++) { const a = Math.abs(out[i]); if (a > pk) pk = a; }
  const level = (0.62 + 0.38 * h) * (0.88 + 0.12 * heavy);
  const g = pk > 0 ? 0.95 * level / pk : 1;
  for (let i = 0; i < N; i++) out[i] *= g;
  return { samples: out };
}
