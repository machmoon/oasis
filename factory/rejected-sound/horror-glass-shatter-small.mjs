// Glass shatter: a frame or pane falls and cracks. Layers: a short fall (hook scrape and a dull knock), a sharp broadband crack of micro-clicks, a brief dry glass ping, then dozens of discrete bright shard tinkles with randomised timing, pitch and ring whose density follows scatter, plus a few low skittering bounces. The tail toggle adds a quiet room echo of the tinkles only.
export const meta = {
  title: "Falling Mirror", kind: "impact", format: "sound", duration: 2, price: 3, author: "hollowbody", payout: "hollowbody@creators.oasis.example", kit: "Horror House", description: "A picture frame, mirror or window pane falling and shattering: a hook scrape, a sharp crack, then scattering tinkling shards that thin out, with an optional room tail; for haunted house jump scares.",
  tags: ["glass", "shatter", "mirror", "crack", "impact", "horror", "break", "shards"],
};
export const params = { knobs: {
  size: { type: "choice", label: "Glass size", default: "mirror", options: ["small", "mirror", "window"] },
  force: { type: "range", label: "Force", default: 0.6, min: 0, max: 1, step: 0.01 },
  scatter: { type: "range", label: "Shard scatter", default: 0.5, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Room tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + params.knobs.size.options.indexOf(p.size) * 53 + 11);
  const z = { small: [1.6, 0.9, 0.5], mirror: [1, 1.5, 0.8], window: [0.65, 2.4, 1.2] }[p.size];
  const s = z[0], cnt = z[1], len = z[2], f = p.force, sc = p.scatter;
  const t0 = 0.14, span = (0.25 + 0.7 * sc) * len;
  const out = new Float32Array(c.seconds(t0 + span + 0.45 + (p.tail ? 0.5 : 0), sr));
  const sn = c.seconds(0.09, sr), sx = c.noise(r, sn), lp = c.onepole(sr);
  for (let i = 0; i < sn; i++) { const u = i / sn; sx[i] = lp(sx[i], 1200 + 2500 * u) * Math.sin(Math.PI * u) * (0.6 + 0.4 * Math.sin(i * 0.17)); }
  c.mix(out, sx, 0.01, 0.1, sr);
  c.mix(out, c.ring([[130 / Math.sqrt(s), 1], [310 * s, 0.4]], 0.1, 0.02 + 0.015 / s, sr), t0, 0.12 + 0.2 * f, sr);
  c.mix(out, c.burst(r, 0.02, "hp", 3000, 0.7, 0.0003, 0.005, sr), t0, 0.9, sr);
  c.mix(out, c.burst(r, 0.05, "bp", 6000 * Math.sqrt(s), 0.6, 0.0004, 0.012, sr), t0, 0.5 + 0.4 * f, sr);
  const cl = 12 + Math.round(18 * f);
  for (let k = 0; k < cl; k++) c.mix(out, c.burst(r, 0.003, "bp", 3000 + r() * 7000, 3, 0.0002, 0.0008, sr), t0 + 0.001 + Math.pow(r(), 1.4) * 0.07, 0.35 + 0.5 * r(), sr);
  const modes = [];
  for (let k = 0; k < 6; k++) modes.push([(2200 + k * 1500 * (0.6 + r() * 0.9)) * s * (0.92 + r() * 0.16), 0.9 - k * 0.1]);
  c.mix(out, c.ring(modes, 0.25, 0.03 + 0.03 * len, sr), t0 + 0.002, 0.18 + 0.15 * f, sr);
  const shards = Math.round((40 + 140 * sc) * (0.6 + 0.6 * f) * cnt);
  for (let q = 0; q < shards; q++) {
    const t = t0 + 0.012 + Math.pow(r(), 1.7) * span;
    const fr = (3000 + r() * 7500) * (0.65 + 0.4 * s);
    const lvl = (0.3 + 0.6 * r()) * (1 - 0.6 * ((t - t0) / (span + 0.05)));
    c.mix(out, c.burst(r, 0.003, "bp", fr, 4, 0.0002, 0.001, sr), t, lvl * 0.8, sr);
    if (r() < 0.6) c.mix(out, c.ring([[fr, 1], [fr * (1.4 + r() * 0.8), 0.4]], 0.05, 0.008 + r() * 0.02, sr), t + 0.0005, lvl * 0.35, sr);
  }
  let t = t0 + 0.07 + 0.05 * r();
  for (let b = 0; b < 3 + Math.round(5 * sc); b++) {
    const fb = 700 + r() * 1200 * s;
    c.mix(out, c.burst(r, 0.008, "bp", fb, 2, 0.0005, 0.003, sr), t, 0.25 * (1 - b * 0.1), sr);
    t += (0.04 + 0.12 * sc) * (0.5 + r()) * len;
  }
  if (p.tail) {
    const tl = new Float32Array(out.length);
    c.mix(tl, out.subarray(0, c.seconds(t0 + span, sr)), 0, 1, sr);
    c.filter(tl, c.biquad("hp", 1500, 0.7, sr));
    c.mix(out, c.reverb(tl, { size: 0.55, decay: 0.5, mixAmt: 1 }, sr), 0.01, 0.35, sr);
  }
  c.filter(out, c.biquad("hp", 120, 0.7, sr));
  c.finish(out, 0.9, 1.1);
  c.fade(out, 30, sr);
  return { samples: out };
}
