// Access hatch: a crisp two-stage latch release, a pitched hinge creak that glides through the swing, then a damped stop and rattle settling, with an optional bay tail.
export const meta = {
  title: "Hatch Access", kind: "foley", format: "sound", duration: 1.1, price: 2, author: "quietmachine", payout: "quietmachine@creators.oasis.example", kit: "Sci-fi Console", description: "A starship maintenance panel clicking off its latch, creaking open on its hinge and settling against its stop; material, size, latch snap, rattle and a bay tail are knobs, and every seed is a different hatch.",
  tags: ["hatch", "panel", "latch", "hinge", "creak", "scifi", "maintenance", "foley"],
};
export const params = { knobs: {
  material: { type: "choice", label: "Material", default: "thin-metal", options: ["thin-metal", "heavy-alloy"] },
  size: { type: "choice", label: "Size", default: "small", options: ["small", "large"] },
  latch: { type: "range", label: "Latch snap", default: 0.6, min: 0, max: 1, step: 0.01 },
  rattle: { type: "range", label: "Rattle", default: 0.4, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Bay tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, thin = p.material === "thin-metal", big = p.size === "large", l = p.latch, rt = p.rattle;
  const r = c.rng(p.seed * 7919 + (thin ? 0 : 131) + (big ? 17 : 0) + 3);
  const f0 = (thin ? 520 : 290) * (big ? 0.7 : 1) * (0.95 + 0.1 * r());
  const ringT = (thin ? 0.045 : 0.065) * (big ? 1.4 : 1) * (p.tail ? 1.6 : 1);
  const tSnap = 0.008 + 0.008 * r(), tBolt = tSnap + 0.03 + 0.02 * r(), tC = tBolt + 0.02;
  const swing = (big ? 0.6 : 0.42) * (thin ? 1 : 1.15) * (0.88 + 0.24 * r()), tS = tC + swing;
  const sched = [];
  let t = tS + 0.035 + 0.03 * r(), gap = (0.05 + 0.02 * r()) * (big ? 1.3 : 1), a = 0.12 + 0.25 * rt;
  for (let k = 0; k < Math.round(rt * (thin ? 9 : 6)); k++) { sched.push([t, a]); t += gap * (0.75 + 0.5 * r()); gap *= 0.75 + 0.06 * r(); a *= 0.75 + 0.08 * r(); }
  const tEnd = Math.max(sched.length ? t + 0.04 : 0, tS + ringT * 5);
  let out = new Float32Array(c.seconds(tEnd + (p.tail ? 0.35 : 0.02), sr));
  const rg = (m, dec) => c.fade(c.ring(m, dec * 5, dec, sr), 3, sr);
  const click = (dur, type, f, Q, att, dec) => c.burst(r, dur, type, f, Q, att, dec, sr);
  // latch: pawl lift tick, spring snap with a steel ping (brighter and sharper with the knob), bolt clearing the keeper
  const sf = (thin ? 3800 : 2900) * (0.94 + 0.12 * r());
  c.mix(out, click(0.005, "hp", 3000 + 2500 * l, 0.8, 0.0003, 0.0009), 0, 0.3 + 0.3 * l, sr);
  c.mix(out, click(0.02, "hp", 1500 + 4000 * l, 0.9, 0.0003, 0.006 - 0.004 * l), tSnap, 0.3 + 0.6 * l, sr);
  c.mix(out, rg([[sf, 1], [sf * 1.005, 0.6], [sf * 1.63, 0.5], [sf * 2.37, 0.3]], 0.008 + 0.035 * l), tSnap + 0.0004, 0.06 + 0.3 * l, sr);
  c.mix(out, click(0.025, "lp", 900, 0.8, 0.0008, 0.006), tSnap, 0.3 * (1 - l) + 0.08, sr);
  c.mix(out, click(0.006, "bp", 2400 * (0.9 + 0.2 * r()), 2.5, 0.0004, 0.0015), tBolt, 0.15 + 0.25 * l, sr);
  // hinge creak: stick-slip relaxation pulses at a pitch that rises then sags through the swing
  const hn = c.seconds(swing, sr), h = new Float32Array(hn), ph1 = r() * c.TAU;
  const bp = c.biquad("bp", f0 * (thin ? 4 : 3), 1.2, sr), hp = c.biquad("hp", 180, 0.7, sr);
  let ph = 0, amp = 1, grip = 0.8, gs = 0.8, jit = 1;
  for (let i = 0; i < hn; i++) {
    const u = i / hn, s = Math.sin(Math.PI * Math.min(1, u * 1.1));
    if (i % 512 === 0) grip = c.clamp(grip + (r() - 0.5) * 0.6, 0.25, 1);
    gs += (grip - gs) * 0.002;
    ph += f0 * (0.7 + 0.7 * s - 0.2 * u) * (1 + 0.03 * Math.sin(c.TAU * 5 * u + ph1)) * jit / sr;
    if (ph >= 1) { ph -= 1; jit = 0.96 + 0.08 * r(); amp = r() < 0.12 * (1 - gs) ? 0.2 : 0.7 + 0.3 * r(); }
    const e = Math.min(1, u / 0.08) * Math.min(1, (1 - u) / 0.12) * gs;
    const y = amp * (Math.exp(-ph * 6) - 0.166) * e;
    h[i] = hp(y * 0.6 + bp(y) * 1.4);
  }
  c.mix(out, c.fade(h, 8, sr), tC, 0.45, sr);
  for (let k = 0; k < Math.round(rt * 8); k++) c.mix(out, click(0.005, "bp", (thin ? 3300 : 1900) * (0.7 + 0.6 * r()), 2.5, 0.0003, 0.0012), tC + 0.04 + r() * swing * 0.85, 0.08 + 0.18 * rt * r(), sr);
  // stop: damped contact against the hinge stop, short plate ring
  const modes = [1, 1.59, 2.14, 2.65, 3.6].map((k, j) => [f0 * 0.8 * k * (0.98 + 0.04 * r()), [1, 0.6, 0.45, 0.3, 0.2][j]]);
  if (thin) c.mix(out, click(0.015, "hp", 1600, 0.7, 0.0008, 0.003), tS, 0.45, sr);
  else { c.mix(out, click(0.025, "lp", 1200, 0.8, 0.0015, 0.007), tS, 0.55, sr); c.mix(out, rg([[f0 * 0.4, 1], [f0 * 0.8, 0.3]], 0.04), tS + 0.001, 0.4, sr); }
  c.mix(out, rg(modes, ringT), tS + 0.001, 0.35, sr);
  for (const [tt, aa] of sched) {
    c.mix(out, click(0.007, "bp", (thin ? 3400 : 1800) * (0.7 + 0.6 * r()), 2, 0.0004 + 0.0008 * r(), 0.0015 + 0.002 * r()), tt, aa, sr);
    c.mix(out, rg(modes.map(([f, m]) => [f * (1.1 + 0.3 * r()), m]), ringT * 0.35), tt + 0.0008, aa * 0.5, sr);
  }
  if (p.tail) out = c.reverb(out, { size: big ? 0.6 : 0.45, decay: thin ? 0.5 : 0.42, mixAmt: 0.18 }, sr) || out;
  c.finish(out, 0.9, 1.1);
  c.fade(out, p.tail ? 60 : 25, sr);
  for (let i = 0; i < 6 && i < out.length; i++) out[i] *= i / 6;
  return { samples: out };
}
