// Retro Land: an 8-bit landing thud. An LFSR noise-channel burst with a stepped 4-bit volume envelope and a falling
// clock sits over a short triangle thump that pitch-drops. Each surface sets the grain, colour and decay (crunch, rustle,
// or short-mode buzz plus a square clang), and an optional echo tail adds darker repeats.
export const meta = {
  title: "Pixel Landing", kind: "foley", format: "sound", duration: 0.35, price: 1, author: "quietmachine", payout: "quietmachine@creators.oasis.example", kit: "Retro Arcade", description: "A chiptune landing thud built from noise-channel crunch over a dropping triangle body, for platformer jumps landing on brick, grass or metal.",
  tags: ["landing", "thud", "8-bit", "chiptune", "retro", "platformer", "arcade", "jump"],
};
export const params = { knobs: {
  surface: { type: "choice", label: "Surface", default: "brick", options: ["brick", "grass", "metal"] },
  weight: { type: "range", label: "Weight", default: 0.5, min: 0, max: 1, step: 0.01 },
  color: { type: "range", label: "Noise colour", default: 0.5, min: 0, max: 1, step: 0.01 },
  drop: { type: "range", label: "Pitch drop", default: 0.5, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Echo tail", default: false },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, si = params.knobs.surface.options.indexOf(p.surface), r = c.rng(p.seed * 6151 + si * 97 + 3);
  const S = [
    { clk: 7000, nd: 0.05, bf: 1, bd: 0.05, lp: 6000, tap: 1, chunk: 0.004, ring: 0 },
    { clk: 2000, nd: 0.075, bf: 0.75, bd: 0.035, lp: 2400, tap: 1, chunk: 0.009, ring: 0 },
    { clk: 9500, nd: 0.08, bf: 1.6, bd: 0.035, lp: 11000, tap: 6, chunk: 0.02, ring: 1 },
  ][si];
  const w = p.weight;
  const nd = S.nd * (0.7 + 0.8 * w) * (0.88 + 0.24 * r()), bd = S.bd * (0.7 + 0.6 * w) * (0.85 + 0.3 * r());
  const hitLen = Math.max(nd * 3.6, bd * 5) + 0.02, nh = c.seconds(hitLen, sr), h = new Float32Array(nh);
  const clk0 = S.clk * Math.pow(2, (p.color - 0.5) * 3) * (0.95 + 0.1 * r()), dropT = (0.05 + 0.07 * w) * (0.85 + 0.3 * r());
  let reg = 1 + Math.floor(r() * 32766), ph = 0, e = 1, gate = 1;
  const dec = Math.exp(-1 / (nd * sr)), chunkN = Math.max(1, Math.round(S.chunk * sr * (0.8 + 0.4 * r())));
  for (let i = 0; i < nh; i++) {
    const t = i / sr, k = 1 - 0.8 * p.drop * Math.min(1, t / dropT);
    ph += clk0 * k / sr;
    while (ph >= 1) { ph -= 1; const b = (reg ^ (reg >> S.tap)) & 1; reg = (reg >> 1) | (b << 14); }
    if (i % chunkN === 0) gate = si === 0 ? (r() < 0.3 ? 1.35 : 0.75) : si === 1 ? 0.3 + 0.7 * r() : 0.9 + 0.1 * r();
    const a = Math.min(1, t / 0.0012) * e; e *= dec;
    const q = Math.round(a * gate * 15) / 15;
    h[i] = ((reg & 1) ? 1 : -1) * q * 0.55;
  }
  c.filter(h, c.biquad("lp", S.lp * (0.4 + 1.2 * p.color), 0.7, sr));
  const f0 = (150 - 80 * w) * S.bf * (0.96 + 0.08 * r());
  const body = c.osc("tri", (t) => f0 * (1 - 0.65 * p.drop * Math.min(1, t / dropT)), nh, sr);
  c.multiply(body, c.env(nh, 0.002, bd, sr));
  c.mix(h, body, 0.001, 0.5 + 0.5 * w, sr);
  if (S.ring) {
    const rf = 720 * (0.97 + 0.06 * r()) * (1.1 - 0.2 * w), rn = c.seconds(0.25, sr), rd = 0.045 * (0.8 + 0.5 * w);
    const sq = c.osc("square", (t) => rf * (1 - 0.15 * p.drop * Math.min(1, t / 0.08)), rn, sr, { duty: 0.25 });
    const sq2 = c.osc("square", rf * 1.51, rn, sr, { duty: 0.5 });
    for (let i = 0; i < rn; i++) sq[i] += 0.5 * sq2[i];
    c.multiply(sq, c.env(rn, 0.001, rd, sr));
    c.mix(h, sq, 0.002, 0.18, sr);
  }
  c.mix(h, c.burst(r, 0.004, "hp", 1800 + 4500 * p.color, 0.7, 0.0004, 0.0012, sr), 0, 0.35 + 0.2 * (si === 2 ? 1 : 0), sr);
  const reps = p.tail ? 3 : 0, gap = 0.085 + 0.012 * r();
  const out = new Float32Array(nh + c.seconds(reps * gap + 0.02, sr));
  c.mix(out, h, 0, 1, sr);
  if (reps) {
    const dark = Float32Array.from(h);
    c.filter(dark, c.biquad("lp", 1800 + 1500 * p.color, 0.7, sr));
    for (let k = 1; k <= reps; k++) c.mix(out, dark, k * gap, Math.pow(0.42, k), sr);
  }
  c.fade(c.finish(out, 0.92), 4, sr);
  c.gain(out, 0.85 + 0.15 * w);
  return { samples: out };
}
