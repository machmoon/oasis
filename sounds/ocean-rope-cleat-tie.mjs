// Rope on a cleat: hauled turns round a cleat, each a distinct pull stroke (grainy fibre-friction bed plus a gliding stick-slip creak with a slack gap between), a cinch tick at each turn, then a snap-tight hit whose ring depends on the cleat material.
export const meta = {
  title: "Cleat Cinch", kind: "foley", format: "sound", duration: 2.2, price: 2, author: "stormfront", payout: "stormfront@creators.oasis.example", kit: "Ocean Harbour",
  description: "A mooring rope hauled round a cleat in figure-eight turns and cinched tight; cleat material, friction, speed, snap and turn count are knobs, for harbour foley and boat scenes.",
  tags: ["rope", "cleat", "harbour", "boat", "knot", "creak", "foley", "mooring"],
};
export const params = { knobs: {
  cleat: { type: "choice", label: "Cleat", default: "iron", options: ["iron", "wood", "nylon"] },
  friction: { type: "range", label: "Friction", default: 0.5, min: 0, max: 1, step: 0.01 },
  speed: { type: "range", label: "Speed", default: 0.5, min: 0, max: 1, step: 0.01 },
  snap: { type: "range", label: "Snap", default: 0.6, min: 0, max: 1, step: 0.01 },
  rate: { type: "range", label: "Turns", default: 3, min: 2, max: 6, step: 1 },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + params.knobs.cleat.options.indexOf(p.cleat) * 97 + 11);
  const mat = { iron: { fib: 2600, q: 1.6, ring: [[520, 1], [1370, 0.55], [2910, 0.3], [4600, 0.12]], rd: 0.13, cr: 4200, cf: 380 },
    wood: { fib: 1500, q: 1.1, ring: [[240, 1], [610, 0.5], [1130, 0.2]], rd: 0.07, cr: 2200, cf: 190 },
    nylon: { fib: 3400, q: 0.8, ring: [[900, 0.5], [2100, 0.2]], rd: 0.035, cr: 3000, cf: 520 } }[p.cleat];
  const turns = p.rate, f = p.friction, sn = p.snap;
  const L = 0.46 - 0.28 * p.speed, t0 = 0.06, span = turns * L, ts = t0 + span + 0.04;
  const out = new Float32Array(c.seconds(ts + mat.rd * 5 + 0.2, sr));
  const nn = c.seconds(span, sr), bed = c.noise(r, nn), bp = c.biquad("bp", mat.fib, mat.q, sr), lp = c.biquad("lp", 5500, 0.7, sr);
  const cr = new Float32Array(nn);
  let g = 0.3, step = 0, tgt = 0.3, ph = 0, sp = 0, fq = mat.cf;
  for (let i = 0; i < nn; i++) {
    const u = ((i / sr) % L) / L, pull = u < 0.82 ? Math.pow(Math.sin(Math.PI * u / 0.82), 1.2) : 0;
    const env = (0.1 + 0.9 * pull) * Math.min(1, i / (0.02 * sr)) * Math.min(1, (nn - i) / (0.03 * sr));
    if (step-- <= 0) { step = Math.round(sr * (0.002 + r() * 0.012)); tgt = r() < 0.35 ? 0.05 + r() * 0.2 : 0.4 + r() * 0.6; }
    g += (tgt - g) * 0.3;
    bed[i] = lp(bp(bed[i])) * g * env;
    sp += (22 + 50 * p.speed + 25 * r()) / sr; if (sp > 1) sp -= 1;
    fq += (mat.cf * (1 + 1.1 * u) * (0.9 + 0.2 * f) - fq) * 0.002;
    ph += c.TAU * fq / sr;
    const slip = Math.pow(1 - sp, 2);
    cr[i] = (Math.sin(ph) + 0.55 * Math.sin(2 * ph + 0.4) + 0.35 * Math.sin(3 * ph) + 0.2 * Math.sin(5 * ph)) * slip * pull * Math.min(1, i / (0.03 * sr)) * Math.min(1, (nn - i) / (0.04 * sr));
  }
  c.mix(out, bed, t0, 1.5 * (0.25 + 0.75 * f), sr);
  c.mix(out, cr, t0, 0.1 + 0.4 * f * f, sr);
  for (let k = 0; k < turns; k++) {
    const tk = t0 + k * L + L * 0.84 + r() * 0.01;
    c.mix(out, c.burst(r, 0.025, "bp", mat.cr * (0.7 + 0.6 * r()), 2.5, 0.001, 0.008, sr), tk, 0.3 + 0.25 * r(), sr);
    c.mix(out, c.ring(mat.ring.map(([hz, a]) => [hz * (0.98 + 0.04 * r()), a]), mat.rd * 2, mat.rd * 0.5, sr), tk, 0.08 + 0.12 * f, sr);
  }
  c.mix(out, c.burst(r, 0.012, "hp", 1500 + 2500 * sn, 0.8, 0.0005, 0.003, sr), ts, 0.25 + 0.6 * sn, sr);
  c.mix(out, c.ring(mat.ring.map(([hz, a]) => [hz * (0.99 + 0.02 * r()), a]), mat.rd * 5, mat.rd, sr), ts + 0.001, 0.2 + 0.7 * sn, sr);
  c.mix(out, c.ring([[mat.cf * 0.4, 1]], 0.2, 0.05, sr), ts, 0.2 + 0.4 * sn, sr);
  const tn = c.seconds(0.2, sr), tail = c.noise(r, tn), tl = c.biquad("bp", mat.fib * 0.7, 1.2, sr);
  for (let i = 0; i < tn; i++) tail[i] = tl(tail[i]) * (r() < 0.04 ? 1 : 0.15) * Math.exp(-i / sr / 0.05);
  c.mix(out, tail, ts + 0.03, 0.3 * f + 0.1, sr);
  c.fade(c.finish(out, 0.85, 1.1), 8, sr);
  return { samples: out };
}
