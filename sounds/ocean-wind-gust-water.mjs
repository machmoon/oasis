// Wind gust over water: one gust skimming the surface. Layers: a low rush body, a mid air band whose cutoff follows a build-then-ragged-decay gust envelope, a narrow gliding whistle with harmonics, a water layer of wave-chop gurgles, a bright spray hiss with droplet ticks, and an optional tail of wave slaps and reverb.
export const meta = {
  title: "Water Skim Gust", kind: "sfx", format: "sound", duration: 3, price: 2, author: "stormfront", payout: "stormfront@creators.oasis.example", kit: "Ocean Harbour", description: "A single gust of wind skimming across the harbour water, with a rising whistle, chop and flicked spray; for sailing scenes, exposed docks and storm approaches.",
  tags: ["wind", "gust", "water", "ocean", "harbour", "spray", "whistle", "weather"],
};
export const params = { knobs: {
  strength: { type: "choice", label: "Strength", default: "gust", options: ["breeze", "gust", "gale"] },
  whistle: { type: "range", label: "Whistle", default: 0.5, min: 0, max: 1, step: 0.01 },
  spray: { type: "range", label: "Spray", default: 0.5, min: 0, max: 1, step: 0.01 },
  rate: { type: "range", label: "Rate", default: 1, min: 0.75, max: 1.5, step: 0.05 },
  tail: { type: "toggle", label: "Wave tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + 29);
  const k = { breeze: [0.3, 500, 0.45, 0.15, 1.7, 1400], gust: [0.65, 1400, 0.3, 0.3, 1.5, 1900], gale: [1, 3200, 0.18, 0.45, 2.0, 2600] }[p.strength];
  const amt = k[0], body = k[4] / Math.sqrt(p.rate), total = body + (p.tail ? 0.8 : 0.15);
  const n = c.seconds(total, sr), out = new Float32Array(n), nb = c.seconds(body, sr);
  const pk = k[2] + 0.03 * r(), g1 = r() * 6, g2 = r() * 6, g3 = r() * 6;
  const gn = c.noise(r, nb), gl5 = c.biquad("lp", 5 * p.rate, 0.7, sr), e = new Float32Array(nb);
  for (let i = 0; i < nb; i++) {
    const x = i / nb, gm = c.clamp(1 + 22 * k[3] * gl5(gn[i]), 0.25, 1.9);
    e[i] = x < pk ? Math.pow(x / pk, 1.5) * (0.8 + 0.2 * gm) : Math.pow((1 - x) / (1 - pk), 1.1) * gm;
  }
  const low = c.brown(r, nb), lpl = c.biquad("lp", 110 + 160 * amt, 0.7, sr);
  const air = c.pink(r, nb), op = c.onepole(sr), hpA = c.biquad("hp", 350, 0.7, sr);
  const flut = c.noise(r, nb), lpf = c.biquad("lp", 7, 0.7, sr);
  for (let i = 0; i < nb; i++) {
    const m = Math.max(0.35, 1 + 20 * lpf(flut[i]));
    low[i] = lpl(low[i]) * 2.5 * e[i] * amt * amt;
    air[i] = op(hpA(air[i]), k[1] * (0.3 + 1.2 * Math.min(1.3, e[i]))) * e[i] * m * 2;
  }
  c.mix(out, low, 0, 0.5, sr);
  c.mix(out, air, 0, 0.5 + 0.7 * amt, sr);
  if (p.whistle > 0) {
    const w = new Float32Array(nb), base = k[5] * (0.92 + 0.16 * r());
    let ph = 0;
    for (let i = 0; i < nb; i++) {
      const t = i / sr, ee = Math.min(1.2, e[i]);
      const f = base * (0.8 + 0.35 * ee) * (1 + 0.012 * Math.sin(t * 6 * p.rate + g2) + 0.008 * Math.sin(t * 13 * p.rate + g3));
      ph += c.TAU * f / sr;
      w[i] = (Math.sin(ph) + 0.4 * Math.sin(2 * ph) + 0.2 * Math.sin(3 * ph)) * Math.pow(e[i], 1.5) * (0.6 + 0.4 * Math.sin(t * 4 * p.rate + g3));
    }
    c.mix(out, w, 0, 0.8 * p.whistle * (0.4 + 0.6 * amt), sr);
  }
  const wat = c.noise(r, nb), wb = c.biquad("bp", 600, 2.5, sr);
  let gl = 0;
  for (let i = 0; i < nb; i++) {
    if (i % Math.round(0.012 * sr) === 0) gl = r() < 0.65 ? r() : 0;
    wat[i] = wb(wat[i]) * gl * e[i];
  }
  c.mix(out, wat, 0, 1.1 * (0.3 + 0.7 * amt), sr);
  const chops = Math.round(25 + 50 * amt);
  for (let d = 0; d < chops; d++) {
    const t = c.clamp((pk * 0.6 + r() * 0.9) * body, 0.02, body - 0.1), f0 = 250 + r() * 500;
    const g = c.osc("sine", (u) => f0 * (1 + 2.5 * u), c.seconds(0.05, sr), sr);
    c.multiply(g, c.env(g.length, 0.004, 0.015, sr));
    c.mix(out, g, t, 0.18 * (0.3 + e[Math.floor(t * sr)]) * amt, sr);
  }
  const hs = c.noise(r, nb), hh = c.biquad("hp", 5500, 0.7, sr), hl = c.biquad("lp", 13000, 0.7, sr);
  let sg = 1;
  for (let i = 0; i < nb; i++) { if (i % 70 === 0) sg = 0.3 + 0.7 * r(); hs[i] = hl(hh(hs[i])) * Math.pow(e[i], 1.5) * sg; }
  c.mix(out, hs, 0, 1.6 * p.spray * (0.25 + 0.75 * amt), sr);
  const drops = Math.round((30 + 300 * p.spray) * (0.4 + amt));
  for (let d = 0; d < drops; d++) {
    const t = c.clamp((pk * 0.5 + r() * r() * 0.9) * body, 0.02, body - 0.05), ee = e[Math.floor(t * sr)];
    c.mix(out, c.burst(r, 0.003 + r() * 0.005, "bp", 5000 + r() * 5000, 3, 0.0003, 0.001 + r() * 0.002, sr), t, (0.2 + 0.6 * r()) * (0.3 + ee) * p.spray * 1.1, sr);
  }
  if (p.tail) {
    for (let j = 0; j < 7; j++) {
      const t = body * 0.55 + r() * (body * 0.45 + 0.4), a = (0.12 + 0.2 * r()) * (0.4 + amt) * Math.exp(-(t - body * 0.5) * 1.2);
      c.mix(out, c.burst(r, 0.14, "bp", 180 + r() * 350, 1.2, 0.012, 0.05, sr), t, a, sr);
    }
    const rv = c.reverb(out, { size: 0.6, decay: 0.5, mixAmt: 0.3 }, sr);
    if (rv && rv.length >= n) for (let i = 0; i < n; i++) out[i] = rv[i];
  }
  c.fade(out, 30, sr);
  c.finish(out, 0.5 + 0.4 * amt, 1.1);
  c.fade(out, 30, sr);
  return { samples: out };
}
