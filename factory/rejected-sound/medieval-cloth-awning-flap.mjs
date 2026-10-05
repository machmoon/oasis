// Canvas awning flap: a gust envelope schedules snaps; each flap is a sharp cloth crack (sometimes doubled), a soft noise thump and a front-loaded rustle of fabric grains over a faint wind bed, with rope creaks that fire as the rope jerks.
export const meta = {
  title: "Canvas Awning Flap", kind: "foley", format: "sound", duration: 3, price: 2, author: "hollowbody", payout: "hollowbody@creators.oasis.example", kit: "Medieval Market", description: "A canvas stall awning snapping and fluttering in a breeze, with rope strain creaks; for market stalls, tents and windy medieval streets.",
  tags: ["canvas", "awning", "flap", "wind", "cloth", "rope", "market", "tent"],
};
export const params = { knobs: {
  canvas: { type: "choice", label: "Canvas weight", default: "light", options: ["light", "heavy"] },
  wind: { type: "range", label: "Wind strength", default: 0.5, min: 0, max: 1, step: 0.01 },
  rate: { type: "range", label: "Flap rate", default: 0.5, min: 0, max: 1, step: 0.01 },
  strain: { type: "range", label: "Rope strain", default: 0.4, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Settling tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + (p.canvas === "heavy" ? 91 : 13));
  const heavy = p.canvas === "heavy", w = p.wind, s = p.strain;
  const dur = 3, n = c.seconds(dur, sr), out = new Float32Array(n);
  const a1 = r() * 6.28, a2 = r() * 6.28;
  const gustAt = (t) => c.clamp(0.55 + 0.3 * Math.sin(c.TAU * 0.4 * t + a1) + 0.2 * Math.sin(c.TAU * 0.95 * t + a2), 0.25, 1);
  const tailEnv = (t) => p.tail ? c.clamp((2.5 - t) / 1.1, 0, 1) : (t < 2.75 ? 1 : 0);
  const bed = c.pink(r, n), bl = c.biquad("bp", heavy ? 450 : 900, 0.5, sr);
  let bg = 0.3, tg = 0.3;
  for (let i = 0; i < n; i++) { if (i % 256 === 0) { const t = i / sr; tg = gustAt(t) * (0.3 + 0.7 * tailEnv(t)); } bg += (tg - bg) * 0.004; bed[i] = bl(bed[i]) * bg; }
  c.mix(out, bed, 0, 0.03 + 0.1 * w, sr);
  const crack = (t, L, k) => {
    const fc = (heavy ? 1400 : 2600) * (1 + 0.5 * s) * (0.8 + 0.4 * r());
    c.mix(out, c.burst(r, 0.035, "hp", fc, 0.7, 0.0008, heavy ? 0.012 : 0.006, sr), t, 0.9 * L * k, sr);
  };
  const flap = (t, L, gust) => {
    crack(t, L, 1);
    if (r() < 0.4) crack(t + 0.04 + r() * 0.05, L, 0.5);
    c.mix(out, c.burst(r, 0.07, "lp", (heavy ? 110 : 190) * (0.8 + 0.4 * r()), 0.7, 0.002, 0.03, sr), t, (heavy ? 0.45 : 0.18) * L, sr);
    const rl = 0.05 + 0.1 * (1 - p.rate) + (heavy ? 0.04 : 0), gr = Math.round(12 + 20 * gust);
    for (let g = 0; g < gr; g++) c.mix(out, c.burst(r, 0.008 + r() * 0.01, "bp", (heavy ? 600 : 1300) + r() * (heavy ? 2400 : 3800), 1.5, 0.001, 0.004 + r() * 0.005, sr), t + 0.012 + Math.pow(r(), 1.4) * rl, (0.1 + 0.25 * r()) * L, sr);
  };
  let lastCreak = -1;
  const creak = (t, L) => {
    const m = c.seconds(0.35 + 0.15 * r(), sr), x = new Float32Array(m), f0 = (380 + r() * 400) * (1 + 0.4 * s), sl = 55 + r() * 40;
    let ph = 0, ph2 = 0;
    for (let i = 0; i < m; i++) {
      const q = i / m; ph += c.TAU * f0 * (1 + 0.15 * q) / sr; ph2 += c.TAU * sl / sr;
      const stick = Math.pow(0.5 + 0.5 * Math.sin(ph2), 1.5);
      x[i] = (Math.sin(ph) + 0.6 * Math.sin(2 * ph) + 0.35 * Math.sin(3 * ph)) * stick * Math.min(1, i / (0.02 * sr)) * Math.exp(-q * 3.5);
    }
    c.mix(out, x, t, 0.14 + 0.3 * s, sr);
  };
  const baseGap = 0.42 - 0.3 * p.rate;
  let t = 0.1 + r() * 0.1;
  while (t < 2.9) {
    const te = tailEnv(t), gust = gustAt(t);
    if (te < 0.08) break;
    const L = (0.3 + 0.7 * w) * (0.5 + 0.5 * gust) * (0.25 + 0.75 * te) * (0.75 + 0.25 * r());
    flap(t, L, gust);
    if (s > 0.02 && r() < s * 0.9 && L > 0.25 && t - lastCreak > 0.4) { creak(t + 0.03, L); lastCreak = t; }
    t += baseGap * (0.7 + 0.6 * r()) / (0.6 + 0.8 * gust) / (0.3 + 0.7 * te);
  }
  c.filter(out, c.biquad("hp", 40, 0.7, sr));
  c.fade(c.finish(out, 0.85, 1.1), 20, sr);
  return { samples: out };
}
