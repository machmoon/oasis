// Office chair gas lift: lever click, then a pneumatic release built from discrete air puffs over a steady bandpassed hiss and a stick-slip piston squeak, ending in a stop clunk (drop) or a seat settle (rise).
export const meta = {
  title: "Chair Gas Lift", kind: "sfx", format: "sound", duration: 1.5, price: 2, author: "foleyroom", payout: "foleyroom@creators.oasis.example", kit: "Office", description: "An office chair's pneumatic height lever: a plastic click, a hissing release as the seat sinks or lifts, and a clunk when the cylinder bottoms out; for open-plan office foley.",
  tags: ["office", "chair", "pneumatic", "gas lift", "hiss", "lever", "foley", "furniture"],
};
export const params = { knobs: {
  direction: { type: "choice", label: "Direction", default: "drop", options: ["drop", "rise"] },
  cylinder: { type: "choice", label: "Cylinder size", default: "small", options: ["small", "large"] },
  hiss: { type: "range", label: "Hiss amount", default: 0.6, min: 0, max: 1, step: 0.01 },
  clunk: { type: "range", label: "Clunk at end", default: 0.6, min: 0, max: 1, step: 0.01 },
  rate: { type: "range", label: "Duration rate", default: 1, min: 0.5, max: 2, step: 0.05 },
  tail: { type: "toggle", label: "Room tail", default: false },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + (p.direction === "drop" ? 3 : 11) + (p.cylinder === "large" ? 101 : 0));
  const big = p.cylinder === "large", drop = p.direction === "drop";
  const move = (drop ? 0.7 : 0.9) * (big ? 1.25 : 1) / p.rate;
  const t0 = 0.08, te = t0 + move;
  const out = new Float32Array(c.seconds(te + 0.5 + (p.tail ? 0.6 : 0.02), sr));
  c.mix(out, c.ring([[1900, 1], [3300, 0.4]], 0.03, 0.006, sr), 0, 0.4, sr);
  c.mix(out, c.burst(r, 0.01, "hp", 2500, 0.8, 0.0005, 0.003, sr), 0, 0.45, sr);
  c.mix(out, c.ring([[260, 0.6], [610, 0.3]], 0.06, 0.012, sr), 0.012, 0.25, sr);
  const n = c.seconds(move, sr), hs = c.noise(r, n);
  const hp = c.biquad("hp", big ? 1200 : 2200, 0.7, sr), lo = c.biquad("lp", big ? 4500 : 7500, 0.7, sr), pk = c.biquad("bp", big ? 2600 : 4200, 1.6, sr);
  const op = c.onepole(sr);
  let puff = 1;
  for (let i = 0; i < n; i++) {
    const u = i / n;
    if (i % Math.round(sr * 0.012) === 0) puff = 0.55 + 0.45 * r();
    const shape = drop ? Math.min(1, u / 0.03) * (1 - 0.7 * u * u) : Math.sin(Math.PI * Math.pow(u, 0.7)) ;
    const x = hs[i];
    hs[i] = (lo(hp(x)) * 0.7 + pk(x) * 0.5) * shape * (0.6 + 0.4 * op(puff, 30));
  }
  c.fade(hs, 30, sr);
  c.mix(out, hs, t0, 0.15 + 0.85 * p.hiss, sr);
  const sq = c.osc("tri", (t) => { const u = t / move; return (drop ? 1100 - 500 * u : 650 + 450 * u) * (big ? 0.65 : 1) * (1 + 0.05 * Math.sin(t * 41)); }, n, sr);
  let g = 0, seg = 0;
  for (let i = 0; i < n; i++) {
    if (i >= seg) { seg = i + Math.round(sr * (0.03 + 0.05 * r())); g = r() < 0.6 ? 0.4 + 0.6 * r() : 0; }
    const u = i / n;
    sq[i] *= g * Math.min(1, u / 0.08) * (1 - u);
  }
  c.filter(sq, c.biquad("bp", 1300, 2, sr));
  c.fade(sq, 20, sr);
  c.mix(out, sq, t0, 0.22, sr);
  for (let k = 0; k < 18; k++) c.mix(out, c.burst(r, 0.005, "bp", 1500 + 2500 * r(), 3, 0.0005, 0.002, sr), t0 + r() * move, 0.1 + 0.15 * r(), sr);
  const f0 = (big ? 85 : 130) * (0.97 + 0.06 * r()), cl = drop ? p.clunk : p.clunk * 0.45;
  c.mix(out, c.ring([[f0, 1], [f0 * 2.3, 0.5], [f0 * 4.1, 0.25], [big ? 900 : 1300, 0.2]], 0.3, big ? 0.09 : 0.05, sr), te, 1.1 * cl, sr);
  c.mix(out, c.burst(r, 0.015, "lp", 1800, 0.8, 0.0008, 0.005, sr), te, 0.7 * cl, sr);
  if (!drop) c.mix(out, c.ring([[190, 0.6], [430, 0.3]], 0.2, 0.05, sr), te + 0.06, 0.3 * p.clunk, sr);
  if (p.tail) {
    const t = c.reverb(out.slice(), { size: big ? 0.5 : 0.35, decay: 0.5, mixAmt: 1 }, sr);
    for (let i = 0; i < out.length; i++) out[i] = out[i] * 0.8 + t[i] * 0.5;
  }
  c.fade(out, 20, sr);
  c.finish(out, 0.85, 1.1);
  return { samples: out };
}
