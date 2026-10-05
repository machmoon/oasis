// Knocks in the walls: three knocks, each a contact thump, a surface-coloured resonant body, a low wall boom and a faint rattle. Distance darkens and softens them; an optional room tail trails behind the dry knocks without smearing them.
export const meta = {
  title: "Knocks In The Walls", kind: "foley", format: "sound", duration: 2.2, price: 2, author: "hollowbody", payout: "hollowbody@creators.oasis.example", kit: "Horror House", description: "Three muffled knocks from somewhere inside the walls, on wood, plaster or metal; force, distance, rate and a room tail are knobs. For haunted house scares and slow-burn tension.",
  tags: ["knock", "wall", "haunted", "horror", "foley", "door", "distant", "creepy"],
};
export const params = { knobs: {
  surface: { type: "choice", label: "Surface", default: "wood", options: ["wood", "plaster", "metal"] },
  force: { type: "range", label: "Force", default: 0.5, min: 0, max: 1, step: 0.01 },
  distance: { type: "range", label: "Distance", default: 0.5, min: 0, max: 1, step: 0.01 },
  rate: { type: "range", label: "Knock rate", default: 1, min: 0.6, max: 1.8, step: 0.05 },
  tail: { type: "toggle", label: "Room tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + params.knobs.surface.options.indexOf(p.surface) * 71 + 3);
  const F = p.force, D = p.distance;
  const base = { wood: 150, plaster: 95, metal: 330 }[p.surface] * (0.93 + r() * 0.14);
  const modes = { wood: [[1, 1], [1.9, 0.5], [3.1, 0.25]], plaster: [[1, 1], [1.5, 0.3], [2.2, 0.12]], metal: [[1, 1], [2.76, 0.6], [5.4, 0.45], [8.9, 0.25]] }[p.surface];
  const dec = { wood: 0.07, plaster: 0.045, metal: 0.18 }[p.surface] * (0.8 + 0.5 * F);
  const clickF = { wood: 1800, plaster: 700, metal: 3500 }[p.surface];
  const gap = 0.42 / p.rate;
  const times = [], amps = [];
  let t = 0.15;
  for (let i = 0; i < 3; i++) {
    times.push(t);
    amps.push((0.45 + 0.55 * F) * (i === 0 ? 1 : 0.8 + r() * 0.25));
    t += gap * (i === 0 ? 1 : 0.85 + r() * 0.3) * (i === 1 ? 1.15 : 1);
  }
  const total = times[2] + 0.7 + (p.tail ? 0.7 : 0);
  const out = new Float32Array(c.seconds(total, sr));
  const knock = (amp) => {
    const k = new Float32Array(c.seconds(0.7, sr));
    const det = modes.map(([m, a]) => [base * m * (0.985 + r() * 0.03), a]);
    c.mix(k, c.ring(det, 0.6, dec, sr), 0.002, 0.7, sr);
    c.mix(k, c.burst(r, 0.015, "lp", clickF * (0.6 + 0.6 * F), 0.8, 0.0008, 0.004, sr), 0, 0.5 + 0.4 * F, sr);
    c.mix(k, c.ring([[base * 0.45, 1], [base * 0.7, 0.4]], 0.4, 0.07 + 0.07 * F, sr), 0.001, 0.55, sr);
    if (p.surface !== "plaster") for (let g = 0; g < 4; g++) c.mix(k, c.burst(r, 0.01, "bp", 800 + r() * 2000, 3, 0.0005, 0.003, sr), 0.02 + r() * 0.12, 0.08 * r(), sr);
    return c.gain(k, amp);
  };
  for (let i = 0; i < 3; i++) c.mix(out, knock(amps[i]), times[i], 1, sr);
  c.filter(out, c.biquad("lp", 5000 - 4100 * D, 0.7, sr));
  c.filter(out, c.biquad("hp", 50, 0.7, sr));
  if (p.tail) {
    const wet = c.reverb(out.slice(), { size: 0.5 + 0.4 * D, decay: 0.8, mixAmt: 1 }, sr);
    const w = 0.2 + 0.3 * D;
    for (let i = 0; i < out.length; i++) out[i] = out[i] + wet[i] * w;
  }
  c.finish(out, 0.9, 1.1);
  c.gain(out, 1 - 0.3 * D);
  c.fade(out, 40, sr);
  return { samples: out };
}
