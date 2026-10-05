// Knife block: a blade drawn from or pushed into a wooden slot. A stick-slip wood scrape (a swept noise band under hand-pressure wobble plus discrete friction grains), a faint steel sing, slot ticks and an end event: a short damped "shing" as the blade clears the block, or a wooden thunk as the bolster seats.
export const meta = {
  title: "Knife Block Draw", kind: "foley", format: "sound", duration: 0.6, price: 2, author: "foleyroom", payout: "foleyroom@creators.oasis.example", kit: "Kitchen", description: "A kitchen knife drawn from or slid into a wooden block, with blade size, friction, speed and a room tail as knobs; every seed is a different pull.",
  tags: ["knife", "kitchen", "blade", "wood", "scrape", "draw", "foley", "steel"],
};
export const params = { knobs: {
  direction: { type: "choice", label: "Direction", default: "draw", options: ["draw", "insert"] },
  blade: { type: "choice", label: "Blade size", default: "chef", options: ["paring", "chef", "cleaver"] },
  friction: { type: "range", label: "Friction", default: 0.45, min: 0, max: 1, step: 0.01 },
  speed: { type: "range", label: "Speed", default: 0.5, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Room tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, ins = p.direction === "insert", ny = sr * 0.45;
  const r = c.rng(p.seed * 4241 + (ins ? 59 : 3) + params.knobs.blade.options.indexOf(p.blade) * 211);
  const B = {
    paring: { len: 0.09, modes: [[3300, 1], [7400, 0.45], [9800, 0.2]], dec: 0.018, scr: 3400, mass: 0.5, wood: 1.25 },
    chef: { len: 0.2, modes: [[2150, 1], [5050, 0.5], [8400, 0.25]], dec: 0.032, scr: 2500, mass: 0.8, wood: 1 },
    cleaver: { len: 0.17, modes: [[880, 1], [2350, 0.6], [4600, 0.35], [7100, 0.15]], dec: 0.055, scr: 1600, mass: 1.25, wood: 0.8 },
  }[p.blade];
  const fr = p.friction, sp = p.speed;
  const modes = B.modes.map(([f, a]) => [Math.min(ny, f * c.between(r, 0.97, 1.03)), a * c.between(r, 0.7, 1)]);
  const slide = B.len / (0.4 + 2.2 * sp) * c.between(r, 0.88, 1.12);
  const ringDec = B.dec * (1.25 - 0.5 * fr), t0 = 0.004;
  const out = new Float32Array(c.seconds(t0 + slide + ringDec * 6 + (p.tail ? 0.35 : 0.05), sr));
  const ns = c.seconds(slide, sr), x = c.noise(r, ns);
  const l1 = c.onepole(sr), l2 = c.onepole(sr), h1 = c.onepole(sr), h2 = c.onepole(sr), sm = c.onepole(sr), pr = c.onepole(sr);
  const fc = B.scr * (1 - 0.25 * fr) * (0.75 + 0.45 * sp), bend = c.between(r, 0.25, 0.55);
  let rough = 1, next = 0, press = 1, nextP = 0;
  for (let i = 0; i < ns; i++) {
    const t = i / ns;
    if (i >= next) { rough = 1 - fr * 0.8 * r(); next = i + Math.round(sr * c.between(r, 0.0012, 0.006)); }
    if (i >= nextP) { press = c.between(r, 0.5, 1); nextP = i + Math.round(sr * c.between(r, 0.008, 0.03)); }
    const f = Math.min(ny * 0.8, fc * (ins ? 1 + bend * (1 - t) : 1 + bend * t));
    const l = l2(l1(x[i], Math.min(ny, f * 1.5)), Math.min(ny, f * 1.5));
    const a1 = l - h1(l, f * 0.55), band = a1 - h2(a1, f * 0.55);
    const a = Math.min(1, i / (0.004 * sr)) * Math.min(1, (ns - i) / (0.004 * sr)) * (ins ? 0.45 + 0.55 * t : 1 - 0.4 * t);
    x[i] = band * a * sm(rough, 300) * pr(press, 45);
  }
  c.mix(out, x, t0, 1.1 + 0.9 * fr + 0.5 * sp, sr);
  const sheen = new Float32Array(ns);
  modes.slice(0, 2).forEach(([f, a]) => { const bp = c.biquad("bp", f, 10, sr); for (let i = 0; i < ns; i++) sheen[i] += bp(x[i]) * a; });
  c.mix(out, sheen, t0, 0.5 + 0.9 * (1 - fr), sr);
  const grains = Math.min(320, Math.round((6 + 150 * fr) * (0.4 + slide / 0.15)));
  for (let g = 0; g < grains; g++) {
    const t = t0 + Math.pow(r(), ins ? 0.8 : 1.25) * slide;
    c.mix(out, c.burst(r, 0.003 + r() * 0.006, "bp", Math.min(ny, fc * c.between(r, 0.5, 1.8)), 1.5 + r() * 2, 0.0004, 0.001 + r() * 0.0015, sr), t, (0.15 + 0.5 * r()) * fr, sr);
  }
  const woodModes = [[260 * B.wood, 1], [610 * B.wood * c.between(r, 0.95, 1.05), 0.45], [1340 * B.wood * c.between(r, 0.94, 1.06), 0.2]];
  const tEnd = t0 + slide, hit = 0.5 + 0.7 * sp;
  if (!ins) {
    c.mix(out, c.burst(r, 0.008, "lp", 1900, 0.8, 0.0006, 0.002, sr), 0, 0.45 * (0.5 + fr), sr);
    c.mix(out, c.ring(woodModes, 0.08, 0.012, sr), 0.001, 0.2 * B.mass, sr);
    c.mix(out, c.burst(r, 0.006, "hp", 4000, 0.8, 0.0004, 0.0012, sr), tEnd - 0.002, 0.3 * hit, sr);
    c.mix(out, c.ring(modes, ringDec * 6, ringDec, sr), tEnd, 0.22 * hit * (0.6 + 0.5 * (1 - fr)), sr);
  } else {
    c.mix(out, c.burst(r, 0.006, "hp", 3500, 0.8, 0.0004, 0.0012, sr), 0, 0.3 * hit, sr);
    c.mix(out, c.ring(modes, 0.04, 0.006, sr), 0.001, 0.07, sr);
    const wm = woodModes.map(([f, a]) => [f * (0.75 - 0.1 * B.mass), a]);
    c.mix(out, c.ring(wm, 0.2, 0.018 + 0.025 * B.mass, sr), tEnd + 0.0008, 0.75 * B.mass * hit, sr);
    c.mix(out, c.burst(r, 0.03, "lp", 700 + 300 * sp, 0.8, 0.001, 0.007, sr), tEnd, 0.8 * B.mass * hit, sr);
    c.mix(out, c.ring(modes, ringDec * 4, ringDec * 0.5, sr), tEnd + 0.001, 0.1 * hit, sr);
  }
  c.filter(out, c.biquad("lp", Math.min(ny, 10500), 0.7, sr));
  c.filter(out, c.biquad("hp", 70, 0.7, sr));
  let res = out;
  if (p.tail) res = c.reverb(out, { size: 0.3, decay: 0.55, mixAmt: 0.2 }, sr) || out;
  c.finish(res, 0.9, 1.1);
  c.fade(res, 5, sr);
  return { samples: res };
}
