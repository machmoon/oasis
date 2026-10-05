// Wooden door: the latch click, the hinge creak (a slow sawtooth whose pitch wobbles through resonant modes), and
// the slam, a low thump with a frame rattle; "open", "close" and "slam" pick which of the three the take contains.
export const meta = {
  title: "Wooden Door", kind: "sfx", format: "sound", duration: 1.2, price: 3, author: "foleyroom", payout: "foleyroom@creators.oasis.example",
  description: "A wooden door opening, closing or slamming: size, how old the hinge is, how hard it moves and a room tail are knobs; seeds change the creak and the rattle.",
  tags: ["door", "wood", "creak", "slam", "hinge", "latch", "house", "foley"],
};
export const params = { knobs: {
  action: { type: "choice", label: "Action", default: "close", options: ["open", "close", "slam"] },
  size: { type: "range", label: "Size", default: 0.5, min: 0, max: 1, step: 0.01 },
  age: { type: "range", label: "Hinge age", default: 0.5, min: 0, max: 1, step: 0.01 },
  force: { type: "range", label: "Force", default: 0.5, min: 0, max: 1, step: 0.01 },
  room: { type: "toggle", label: "Room tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + 11);
  const n = c.seconds(1.2, sr), out = new Float32Array(n), big = 0.7 + 0.6 * p.size;
  const creak = (at, dur, gainAmt) => {
    const m = c.seconds(dur, sr), f0 = (140 - 60 * p.size) * (0.9 + r() * 0.2);
    const saw = c.osc("saw", (t) => f0 * (1 + 0.25 * Math.sin(t * 7 + r() * 6) * p.age + 0.1 * Math.sin(t * 31)), m, sr);
    const bp = c.biquad("bp", 900 + 700 * p.age, 3, sr), e = c.env(m, dur * 0.3, dur * 0.4, sr);
    for (let i = 0; i < m; i++) saw[i] = bp(saw[i]) * e[i] * (0.6 + 0.4 * Math.sin(i / sr * 23 + r()));
    c.mix(out, saw, at, gainAmt * p.age, sr);
  };
  const latch = (at, g) => { c.mix(out, c.ring([[1800 * (1 - 0.3 * p.size), 1], [3400, 0.4]], 0.05, 0.008, sr), at, g, sr); c.mix(out, c.burst(r, 0.01, "hp", 2000, 0.8, 0.0005, 0.003, sr), at, g, sr); };
  const thump = (at, g) => { c.mix(out, c.ring([[70 / big, 1], [140 / big, 0.4], [310 / big, 0.15]], 0.35, 0.05 + 0.06 * p.size, sr), at, g, sr); c.mix(out, c.burst(r, 0.04, "lp", 500, 0.8, 0.001, 0.015, sr), at, g * 0.8, sr); };
  const rattle = (at, g) => { for (let i = 0; i < 6 + Math.round(10 * p.force); i++) c.mix(out, c.burst(r, 0.006, "bp", 700 + r() * 1200, 3, 0.0003, 0.002, sr), at + r() * 0.12 * big, g * (0.3 + 0.7 * r()), sr); };
  if (p.action === "open") { latch(0.02, 0.5); creak(0.08, 0.5 + 0.4 * (1 - p.force), 0.5); }
  else if (p.action === "close") { creak(0.02, 0.35, 0.3); thump(0.42, 0.4 + 0.4 * p.force); latch(0.47, 0.6); rattle(0.44, 0.2 * p.force); }
  else { thump(0.05, 0.9 + 0.3 * p.force); rattle(0.05, 0.5 + 0.5 * p.force); latch(0.09, 0.5); c.mix(out, c.burst(r, 0.08, "bp", 1500, 1, 0.001, 0.03, sr), 0.05, 0.4 * p.force, sr); }
  const mixed = p.room ? c.reverb(out, { size: 0.3 + 0.5 * p.size, decay: 0.4, mixAmt: 0.18 }, sr) : out;
  c.fade(c.finish(mixed, 0.9, 1 + p.force), 10, sr);
  return { samples: mixed };
}
