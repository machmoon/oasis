// Paper crumple: a sheet balled in the hand over several squeezes, then tossed. Each squeeze is a cluster of stick-slip cracks (tiny pitched resonant events) over a fibrous rustle of grains and a soft hand thump; the toss adds a short airtime, a light landing, a bounce and a settling crackle as the ball unfolds, with a room tail under the dry sound.
export const meta = {
  title: "Paper Crumple", kind: "foley", format: "sound", duration: 2.4, price: 2, author: "foleyroom", payout: "foleyroom@creators.oasis.example", kit: "Office", description: "A sheet of paper crushed into a ball and optionally tossed so it lands and settles; paper type, speed, crackle density, toss and tail are knobs, for office props and desk foley.",
  tags: ["paper", "crumple", "office", "foley", "crackle", "toss", "ball", "trash"],
};
export const params = { knobs: {
  paper: { type: "choice", label: "Paper", default: "printer", options: ["printer", "glossy", "tissue"] },
  speed: { type: "range", label: "Crumple speed", default: 1, min: 0.5, max: 2, step: 0.05 },
  density: { type: "range", label: "Crackle density", default: 0.5, min: 0, max: 1, step: 0.01 },
  toss: { type: "range", label: "Toss and land", default: 0.4, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Room tail", default: false },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + params.knobs.paper.options.indexOf(p.paper) * 97 + 11);
  const out = new Float32Array(c.seconds(2.4, sr));
  const m = { printer: [2900, 3, 0.010, 1, 3500, 0.35, 0.12, 0.12], glossy: [4800, 7, 0.016, 1.25, 6000, 0.7, 0.3, 0.2], tissue: [1700, 1.1, 0.006, 0.45, 2200, 0, 0, 0.03] }[p.paper];
  const closures = 6, len = 0.16 / p.speed + 0.08, gap = 0.05 / p.speed;
  let t0 = 0.02;
  for (let k = 0; k < closures; k++) {
    const L = len * (0.7 + 0.3 * r());
    c.mix(out, c.ring([[85 + 25 * r(), 1], [170, 0.35]], 0.1, 0.025, sr), t0, (0.1 + 0.12 * r()) * (p.paper === "tissue" ? 0.4 : 1), sr);
    const gr = Math.round((20 + 60 * p.density) * L / 0.1 + 4);
    for (let g = 0; g < gr; g++) {
      const u = r(), f = m[4] * (0.6 + 0.8 * r());
      c.mix(out, c.burst(r, 0.008 + 0.01 * r(), "bp", f, 1.2, 0.002, 0.004 + 0.004 * r(), sr), t0 + u * L, (0.05 + 0.1 * r()) * (0.6 + 0.8 * Math.sin(Math.PI * u)), sr);
    }
    const ev = Math.round((5 + 26 * p.density) * L / 0.1 + 2);
    for (let e = 0; e < ev; e++) {
      const t = t0 + Math.pow(r(), 0.85) * L, big = r() < m[7];
      const f = m[0] * (0.5 + 1.1 * r()) * (1 - 0.1 * k);
      const a = (0.2 + 0.5 * r()) * (big ? 1.7 : 1) * m[3] * (1 - 0.1 * k);
      c.mix(out, c.burst(r, m[2] * (0.5 + r()), "bp", f, m[1], 0.0004, 0.0015 + 0.004 * r(), sr), t, a, sr);
      if (r() < m[5]) c.mix(out, c.ring([[f * 0.7, 1], [f * 1.41, 0.5], [f * 2.3, 0.2]], 0.03, 0.005 + 0.006 * r(), sr), t, m[6] * a, sr);
    }
    t0 += L + gap * (0.6 + 0.8 * r());
  }
  const amt = 0.25 + 0.6 * p.toss;
  const land = t0 + 0.08 + 0.25 * p.toss;
  if (p.toss > 0.02) {
    c.mix(out, c.burst(r, 0.04, "lp", 500 + m[4] * 0.25, 0.8, 0.002, 0.012, sr), land, 0.55 * amt, sr);
    c.mix(out, c.ring([[100 + 30 * r(), 1], [210, 0.3]], 0.1, 0.02, sr), land, 0.25 * amt, sr);
    for (let k = 0; k < 8; k++) c.mix(out, c.burst(r, m[2], "bp", m[0] * (0.5 + r()), m[1], 0.0004, 0.002 + 0.003 * r(), sr), land + 0.002 + r() * 0.05, (0.25 + 0.4 * r()) * amt * m[3], sr);
    let bt = land, ba = 0.5 * amt;
    for (let b = 0; b < 3; b++) {
      bt += (0.08 + 0.06 * r()) * (1 - 0.15 * b); ba *= 0.5;
      c.mix(out, c.burst(r, 0.02, "lp", 600 + m[4] * 0.2, 0.8, 0.001, 0.008, sr), bt, ba * 0.7, sr);
      for (let k = 0; k < 4; k++) c.mix(out, c.burst(r, m[2], "bp", m[0] * (0.5 + r()), m[1], 0.0004, 0.002, sr), bt + r() * 0.03, ba * m[3], sr);
    }
    t0 = bt + 0.05;
  }
  // slow unfolding: the ball relaxing, sparse cracks and rustle fading out to the end
  const end = 2.25, rl = end - t0 - 0.05, cnt = Math.round((12 + 40 * p.density) * Math.max(rl, 0) / 0.5);
  for (let k = 0; k < cnt; k++) {
    const u = Math.pow(r(), 1.3), t = t0 + 0.05 + u * rl, fade = 1 - 0.85 * u;
    c.mix(out, c.burst(r, m[2] * (0.5 + r()), "bp", m[0] * (0.5 + r()), m[1], 0.0004, 0.002 + 0.004 * r(), sr), t, (0.12 + 0.3 * r()) * fade * m[3], sr);
    if (r() < 0.6) c.mix(out, c.burst(r, 0.015 + 0.02 * r(), "bp", m[4] * (0.6 + 0.8 * r()), 1.2, 0.002, 0.006, sr), t + 0.004, (0.04 + 0.08 * r()) * fade, sr);
  }
  c.filter(out, c.biquad("hp", 110, 0.7, sr));
  if (p.tail) {
    const dry = Float32Array.from(out), rv = c.reverb(Float32Array.from(out), { size: 0.35, decay: 0.5, mixAmt: 1 }, sr) || dry;
    for (let i = 0; i < out.length; i++) out[i] = dry[i] * 0.8 + (rv[i] || 0) * 0.35;
  }
  c.fade(out, 12, sr);
  c.finish(out, 0.85, 1.1);
  return { samples: out };
}
