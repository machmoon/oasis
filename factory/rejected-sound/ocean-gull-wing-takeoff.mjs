// Gull wing takeoff: a foot push off the post (knock + claw scratches), then wing beats that start with a few slow hard flaps and accelerate as the bird climbs before thinning out. Each beat is a band-limited swish (airy mid band, not full-range), a wing-clap snap, a soft low thump, a feather flutter and a separate rustle bed that runs between flaps; large birds get a lower body, slower flaps and a deeper swish, not just a darker filter.
export const meta = {
  title: "Gull Wing Takeoff", kind: "foley", format: "sound", duration: 2, price: 1, author: "stormfront", payout: "stormfront@creators.oasis.example", kit: "Ocean Harbour", description: "A gull pushes off a harbour post and flaps away, a few slow hard wingbeats speeding up as it climbs and fading as it leaves; for dock scenes, harbour ambiences and wildlife cutaways.",
  tags: ["gull", "wing", "flap", "takeoff", "feathers", "harbour", "bird", "foley"],
};
export const params = { knobs: {
  size: { type: "choice", label: "Size", default: "small", options: ["small", "large"] },
  strength: { type: "range", label: "Flap strength", default: 0.6, min: 0, max: 1, step: 0.01 },
  rustle: { type: "range", label: "Feather rustle", default: 0.5, min: 0, max: 1, step: 0.01 },
  rate: { type: "range", label: "Rate (beats/s)", default: 7, min: 4, max: 11, step: 0.1 },
  tail: { type: "toggle", label: "Distant beats tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + (p.size === "large" ? 97 : 11)), big = p.size === "large" ? 1 : 0, S = p.strength;
  const M = c.seconds(2.4, sr), out = new Float32Array(M), bed = new Float32Array(M);
  const f0 = big ? 70 : 120, cf = big ? 1100 : 1900, base = p.rate * (big ? 0.7 : 1);
  c.mix(out, c.ring([[185 - 50 * big, 1], [420 - 90 * big, 0.45], [870, 0.2]], 0.1, 0.03, sr), 0.008, 0.4 + 0.25 * S, sr);
  for (let k = 0; k < 6; k++) c.mix(out, c.burst(r, 0.012, "bp", 3500 + 2500 * r(), 3, 0.0006, 0.004, sr), 0.004 + k * 0.016 + r() * 0.012, 0.14 + 0.1 * r(), sr);
  const beat = (t, amp, dark, len) => {
    const nb = c.seconds(len, sr), b = c.noise(r, nb), bp = c.biquad("bp", cf * dark, 0.9, sr), bp2 = c.biquad("bp", cf * dark * 2.2, 1.2, sr), op = c.onepole(sr);
    const e = c.env(nb, len * 0.3, len * 0.22, sr);
    for (let j = 0; j < nb; j++) { const x = j / nb, y = bp(b[j]); b[j] = (op(y, 1200 * dark * (1.4 - x)) + 0.4 * bp2(y)) * e[j]; }
    c.mix(out, b, t + 0.01, 1.6 * amp, sr);
    c.mix(out, c.burst(r, 0.012, "bp", 1700 * dark * (1 - 0.3 * big), 1.5, 0.0008, 0.004, sr), t, (0.2 + 0.8 * S) * amp * 0.9, sr);
    c.mix(out, c.ring([[f0 * (0.9 + 0.2 * r()), 1], [f0 * 2.05, 0.25]], 0.12, 0.04 + 0.04 * big, sr), t + 0.02, 0.35 * amp * (0.5 + 0.7 * big) * (0.3 + S), sr);
    c.mix(out, c.burst(r, len * 0.7, "bp", cf * 1.2 * dark, 0.8, len * 0.3, len * 0.25, sr), t + len * 0.55, 0.3 * amp, sr);
    const gr = Math.round(2 + 16 * p.rustle);
    for (let g = 0; g < gr; g++) c.mix(out, c.burst(r, 0.004 + r() * 0.006, "bp", (3500 + 3500 * r()) * (0.6 + 0.4 * dark), 3, 0.0004, 0.0015, sr), t + r() * len * 1.3, (0.08 + 0.2 * r()) * amp * (0.3 + p.rustle), sr);
    c.mix(bed, c.env(c.seconds(0.5, sr), 0.03, 0.14, sr), t, amp, sr);
  };
  const times = [];
  let t = 0.1, i = 0;
  while (t < 1.2 && i < 24) {
    const prog = Math.min(1, i / 7), rt = Math.min(13, base * (0.45 + 1.0 * prog)), iv = 1 / rt;
    const amp = (0.4 + 0.6 * S) * (i < 3 ? 1.2 : 1 - 0.5 * Math.max(0, (t - 0.5) / 0.7)) * (0.7 + 0.5 * r());
    beat(t, amp, 1 - 0.15 * prog, Math.min(0.17, iv * 0.95));
    times.push(t); t += iv * (1 + (r() - 0.5) * 0.4) + (r() < 0.2 ? r() * 0.03 : 0); i++;
  }
  let end = t + 0.3;
  if (p.tail) {
    let q = 0;
    while (t < 2.0 && q < 8) {
      const iv = 1 / Math.min(13, base * 1.4);
      beat(t, (0.3 + 0.25 * S) * Math.exp(-q * 0.28) * (0.7 + 0.5 * r()), 0.6, Math.min(0.13, iv * 0.9));
      t += iv * (1.15 + q * 0.12) * (1 + (r() - 0.5) * 0.4); q++;
    }
    end = Math.min(2.38, t + 0.2);
  }
  const N = c.seconds(end, sr), ru = c.pink(r, M), hp = c.biquad("hp", 2800 - 700 * big, 0.7, sr), lim = Math.min(M, c.seconds(end, sr));
  let jit = 1;
  for (let j = 0; j < lim; j++) { if (j % 48 === 0) jit = 0.4 + 0.6 * r(); ru[j] = hp(ru[j]) * (0.15 + 0.85 * Math.min(1, bed[j])) * jit * (j / sr < 0.1 ? 0.5 : 1); }
  c.mix(out, ru.subarray(0, lim), 0, 0.04 + 0.35 * p.rustle, sr);
  const res = out.slice(0, N);
  c.fade(c.finish(res, 0.85, 1.1), 60, sr);
  return { samples: res };
}
