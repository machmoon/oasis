// Stapler slam: one punch. Layers in order: palm slam and desk thump, arm-on-base metal strike, staple punch crack with a short crunch of fibre snaps, a bright anvil clinch click, then one continuous decaying metal ring (no separate blips). Optional room tail is a smooth reverb.
export const meta = {
  title: "Stapler Slam", kind: "impact", format: "sound", duration: 0.35, price: 2, author: "foleyroom", payout: "foleyroom@creators.oasis.example", kit: "Office", description: "A desk stapler punched hard through a paper stack: one sharp punch crunch, an anvil clack and a short metal ring; for office scenes, frustrated deadlines and tactile UI.",
  tags: ["stapler", "office", "impact", "paper", "punch", "foley", "metal", "desk"],
};
export const params = { knobs: {
  size: { type: "choice", label: "Stapler size", default: "desk", options: ["mini", "desk", "heavy-duty"] },
  force: { type: "range", label: "Force", default: 0.7, min: 0, max: 1, step: 0.01 },
  paper: { type: "range", label: "Paper thickness", default: 0.5, min: 0, max: 1, step: 0.01 },
  ring: { type: "range", label: "Metal ring", default: 0.5, min: 0, max: 1, step: 0.01 },
  thump: { type: "toggle", label: "Desk thump", default: true },
  room: { type: "toggle", label: "Room tail", default: false },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + params.knobs.size.options.indexOf(p.size) * 97 + 11);
  const sz = { mini: [1.7, 0.5, 0.6, 0.012], desk: [1, 1, 1, 0.022], "heavy-duty": [0.6, 1.6, 1.5, 0.04] }[p.size];
  const f = p.force, pt = p.paper, k = sz[0] * (0.98 + r() * 0.04), jit = () => 0.98 + r() * 0.04;
  const total = p.room ? 0.7 : 0.4, out = new Float32Array(c.seconds(total, sr));
  const t0 = 0.002, t1 = t0 + 0.006 + 0.004 * sz[1];
  const tearDur = 0.008 + 0.012 * pt + sz[3], ts = t1 + 0.001, tc = ts + tearDur + 0.004;
  if (p.thump) c.mix(out, c.ring([[85 / sz[1] * jit(), 1], [160 / sz[1] * jit(), 0.4], [290 / sz[1], 0.12]], 0.16, 0.02 + 0.025 * sz[1], sr), t0, (0.25 + 0.5 * f) * sz[1], sr);
  c.mix(out, c.burst(r, 0.02, "lp", 800 + 600 * f, 0.8, 0.0012, 0.006, sr), t0, 0.3 + 0.3 * f, sr);
  const rd = 0.02 + 0.1 * p.ring * sz[2];
  const modes = [[1350, 1], [2310, 0.7], [3720, 0.5], [5480, 0.3], [7900, 0.15]].map(([h, a]) => [h * k * jit(), a * (0.7 + 0.6 * r())]);
  c.mix(out, c.ring(modes, 0.3, rd, sr), t1, (0.1 + 0.5 * p.ring) * (0.5 + 0.5 * f), sr);
  c.mix(out, c.ring([[480 * k * jit(), 1], [905 * k * jit(), 0.6]], 0.1, 0.014 + 0.01 * sz[1], sr), t1, 0.35 * (0.5 + f), sr);
  c.mix(out, c.burst(r, 0.006, "hp", 2500 + 2500 * f, 0.8, 0.0004, 0.0018, sr), t1, 0.8 * (0.5 + 0.5 * f), sr);
  const snaps = Math.round(14 + 26 * pt);
  for (let g = 0; g < snaps; g++) {
    const t = ts + Math.pow(r(), 1.2) * tearDur, fc = 1500 + r() * 3500 * (1 - 0.3 * pt);
    c.mix(out, c.burst(r, 0.002 + r() * 0.003, "bp", fc, 2 + r() * 3, 0.0003, 0.0008 + r() * 0.0015, sr), t, (0.2 + 0.5 * r()) * (0.4 + 0.6 * pt) * (0.6 + 0.4 * f), sr);
  }
  c.mix(out, c.burst(r, 0.02 + 0.02 * pt, "lp", 1100 - 400 * pt, 0.8, 0.002, 0.008 + 0.01 * pt, sr), ts, 0.3 * (0.3 + pt) * (0.4 + f), sr);
  c.mix(out, c.ring([[3900 * k * jit(), 1], [6100 * k * jit(), 0.5], [8800 * k, 0.2]], 0.1, 0.012 + 0.04 * p.ring, sr), tc, 0.7 * (0.5 + 0.5 * f), sr);
  c.mix(out, c.burst(r, 0.005, "bp", 4500, 1.5, 0.0003, 0.0016, sr), tc, 0.6, sr);
  if (p.size === "heavy-duty") c.mix(out, c.ring([[210 * jit(), 1], [420, 0.4]], 0.1, 0.025, sr), tc, 0.4 * f, sr);
  let res = out;
  if (p.room) {
    const wet = c.reverb(out, { size: 0.45, decay: 0.4, mixAmt: 0.3 }, sr);
    res = new Float32Array(out.length);
    for (let i = 0; i < res.length; i++) res[i] = wet[i] || 0;
  }
  c.fade(res, 40, sr);
  c.finish(res, 0.9, 1.3);
  c.gain(res, 0.6 + 0.4 * f);
  return { samples: res };
}
