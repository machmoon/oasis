// Drawer slam: in order, the runner roll, a broadband crack with a short body knock as the box hits its frame, a material-coloured panel clang, a small rebound, a bright latch click and clustered rattling contents. Length follows the rattle spread; the room only adds a reverb wash under the same dry event.
export const meta = {
  title: "Drawer Slam", kind: "impact", format: "sound", duration: 0.8, price: 3, author: "foleyroom", payout: "foleyroom@creators.oasis.example", kit: "Office", description: "A filing cabinet or desk drawer slammed shut: a runner roll, a sharp bang, a short material-coloured clang, a latch click and rattling contents; material, size, force, rattle and latch are knobs and every seed is a different slam.",
  tags: ["drawer", "filing cabinet", "slam", "office", "impact", "metal", "desk", "foley"],
};
export const params = { knobs: {
  material: { type: "choice", label: "Material", default: "steel cabinet", options: ["steel cabinet", "wood desk", "plastic pedestal"] },
  size: { type: "choice", label: "Drawer size", default: "file", options: ["small", "file"] },
  force: { type: "range", label: "Force", default: 0.7, min: 0, max: 1, step: 0.01 },
  rattle: { type: "range", label: "Contents rattle", default: 0.5, min: 0, max: 1, step: 0.01 },
  latch: { type: "range", label: "Latch click", default: 0.5, min: 0, max: 1, step: 0.01 },
  room: { type: "toggle", label: "Room tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + params.knobs.material.options.indexOf(p.material) * 97 + 11);
  const big = p.size === "file", f = p.force, sz = big ? 1 : 1.6, dk = big ? 1 : 0.6;
  const M = { "steel cabinet": { modes: [[640, 1], [1130, 0.8], [1870, 0.7], [2900, 0.5], [4300, 0.35]], rd: 0.11, rg: 0.55, body: [900, 1.5], crack: 5500, run: 2600, rl: 2500, rh: 7000, th: 85, tg: 0.4 },
    "wood desk": { modes: [[210, 1], [340, 0.6], [560, 0.3]], rd: 0.03, rg: 0.5, body: [380, 1], crack: 1500, run: 500, rl: 400, rh: 1700, th: 105, tg: 0.8 },
    "plastic pedestal": { modes: [[780, 1], [1650, 0.6], [2500, 0.3]], rd: 0.02, rg: 0.5, body: [1500, 1.2], crack: 3300, run: 1500, rl: 1300, rh: 3800, th: 150, tg: 0.5 } }[p.material];
  const t0 = 0.12 - 0.04 * f, span = 0.12 + 0.3 * p.rattle;
  const out = new Float32Array(c.seconds(t0 + span + (p.room ? 0.4 : 0.2), sr));
  const rn = c.seconds(t0, sr), run = c.noise(r, rn), rb = c.biquad("bp", M.run * (big ? 1 : 1.3), 1.5, sr);
  for (let i = 0; i < rn; i++) { const u = i / rn; run[i] = rb(run[i]) * (0.25 + 0.75 * u) * (0.6 + 0.4 * Math.sin(i / sr * 300 + r())); }
  c.mix(out, run, 0, 0.35 + 0.25 * f, sr);
  const tf = M.th * sz * (1 - 0.15 * f);
  const thump = c.osc("sine", (t) => tf * (1 + 0.6 * Math.exp(-t * 50)), c.seconds(0.1, sr), sr);
  c.multiply(thump, c.env(thump.length, 0.0012, 0.02 + 0.015 * big + 0.015 * f, sr));
  c.mix(out, thump, t0, (0.2 + 0.4 * f) * M.tg * (big ? 1 : 0.6), sr);
  c.mix(out, c.burst(r, 0.012, "hp", M.crack * (0.85 + 0.3 * f), 0.8, 0.0003, 0.003, sr), t0, 0.5 + 0.5 * f, sr);
  c.mix(out, c.burst(r, 0.08, "bp", M.body[0] * sz * (0.85 + 0.3 * r()), M.body[1], 0.0008, 0.012 * dk + 0.008, sr), t0, 0.55 + 0.4 * f, sr);
  const modes = M.modes.map(([hz, a]) => [hz * (big ? 1 : 1.35) * (0.97 + r() * 0.06), a]);
  const rdv = M.rd * dk * (0.7 + 0.3 * f);
  c.mix(out, c.ring(modes, rdv * 6, rdv, sr), t0 + 0.0005, M.rg * (0.4 + 0.6 * f), sr);
  const bt = t0 + 0.065 + 0.03 * r();
  c.mix(out, c.burst(r, 0.01, "hp", M.crack * 0.7, 0.8, 0.0004, 0.0025, sr), bt, 0.25 + 0.2 * f, sr);
  c.mix(out, c.burst(r, 0.05, "bp", M.body[0] * sz, M.body[1], 0.0008, 0.008, sr), bt, 0.25 + 0.2 * f, sr);
  c.mix(out, c.ring(modes.slice(0, 2), rdv * 3, rdv * 0.5, sr), bt, 0.15 * M.rg * (0.4 + f), sr);
  const items = Math.round(p.rattle * (14 + 22 * f) * (big ? 1.2 : 0.7));
  const cl = [0.05 + 0.1 * r(), 0.3 + 0.2 * r(), 0.65 + 0.3 * r()];
  for (let i = 0; i < items; i++) {
    const u = c.clamp(cl[i % 3] + (r() - 0.5) * 0.25, 0, 1), t = t0 + 0.025 + u * span;
    const a = (0.25 + 0.5 * r()) * Math.sqrt(p.rattle) * (1 - 0.7 * u) * (0.45 + 0.55 * f), fq = M.rl + r() * (M.rh - M.rl);
    c.mix(out, c.ring([[fq, 1], [fq * (1.5 + r() * 0.9), 0.4]], 0.06, 0.005 + r() * 0.012, sr), t, a * 0.6, sr);
    c.mix(out, c.burst(r, 0.008, "bp", fq * 0.8, 2, 0.0004, 0.002, sr), t, a * 0.5, sr);
  }
  const lt = t0 + 0.035 + 0.015 * r();
  c.mix(out, c.burst(r, 0.006, "hp", 4500, 1.2, 0.0003, 0.0015, sr), lt, 0.85 * p.latch, sr);
  c.mix(out, c.ring([[3300 + r() * 800, 1], [5600 + r() * 600, 0.6]], 0.05, 0.008, sr), lt, 0.6 * p.latch, sr);
  c.mix(out, c.burst(r, 0.005, "hp", 3200, 1.2, 0.0003, 0.0012, sr), lt + 0.035 + 0.01 * r(), 0.5 * p.latch, sr);
  let res = out;
  if (p.room) {
    const wash = c.reverb(out.slice(), { size: 0.35, decay: 0.5, mixAmt: 1 }, sr);
    res = new Float32Array(out.length);
    for (let i = 0; i < res.length; i++) res[i] = out[i] + wash[i] * 0.3;
  }
  c.fade(res, 30, sr);
  c.finish(res, 0.9, 1.1);
  c.gain(res, 0.6 + 0.4 * f);
  return { samples: res };
}
