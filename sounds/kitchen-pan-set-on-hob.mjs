// Pan set on hob: plate-mode pan body + hob contact (grate clank or glass tick/thock) + weight thump + scrape + kitchen tail.
export const meta = {
  title: "Pan On Hob", kind: "foley", format: "sound", duration: 1.2, price: 2, author: "foleyroom", payout: "foleyroom@creators.oasis.example", kit: "Kitchen", description: "A frying pan set down on a gas grate or ceramic glass hob, with material, size, force, a slide scrape and room tail as knobs, for cooking scenes and kitchen foley.",
  tags: ["pan", "kitchen", "stove", "hob", "cookware", "foley", "metal", "scrape"],
};
export const params = { knobs: {
  material: { type: "choice", label: "Pan material", default: "cast iron", options: ["cast iron", "steel", "nonstick"] },
  hob: { type: "choice", label: "Hob type", default: "gas grate", options: ["gas grate", "ceramic glass"] },
  size: { type: "range", label: "Pan size", default: 0.5, min: 0, max: 1, step: 0.01 },
  force: { type: "range", label: "Placement force", default: 0.5, min: 0, max: 1, step: 0.01 },
  scrape: { type: "range", label: "Scrape", default: 0.3, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Ring + room tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, K = params.knobs;
  const r = c.rng(p.seed * 7349 + K.material.options.indexOf(p.material) * 101 + K.hob.options.indexOf(p.hob) * 13 + 3);
  const F = p.force, S = p.scrape, z = p.size, grate = p.hob === "gas grate";
  const M = { "cast iron": { f: 300, dec: 0.07, hi: 0.3, thump: 1, sc: 0.75 }, steel: { f: 470, dec: 0.24, hi: 0.8, thump: 0.5, sc: 1.15 }, nonstick: { f: 410, dec: 0.12, hi: 0.5, thump: 0.65, sc: 0.95 } }[p.material];
  const dur = 0.5 + 0.6 * S + (p.tail ? 0.6 : 0.1);
  let out = new Float32Array(c.seconds(dur, sr));
  const soft = (b, ms) => { const a = Math.max(1, Math.round(ms * 0.001 * sr)); for (let i = 0; i < a && i < b.length; i++) b[i] *= i / a; return b; };
  const fs = 1.45 - 0.9 * z;
  const modes = [1, 1.59, 2.14, 2.3, 2.65, 2.92, 3.5, 4.15].map((k, j) => [M.f * fs * k * (0.97 + 0.06 * r()), Math.pow(M.hi, j * 0.6) * (0.6 + 0.4 * r()) * (j ? 0.45 + 0.55 * F : 1)]);
  const pd = M.dec * (0.7 + 0.6 * z) * (p.tail ? 1 : 0.35), pl = Math.min(dur, pd * 7 + 0.03);
  const pan = new Float32Array(c.seconds(pl, sr));
  modes.forEach(([f, a], j) => c.mix(pan, c.ring([[f, a]], pl, pd / (1 + 0.6 * j), sr), 0, 1, sr));
  soft(pan, 1.5);
  const t0 = 0.012, hits = [[t0, 1]];
  if (grate) {
    let t = t0, g = 1; const k = 1 + Math.floor(F * 2.2 + r() * 0.9);
    for (let h = 0; h < k; h++) { t += 0.005 + r() * 0.011 * (1 + h); g *= 0.25 + 0.3 * r(); hits.push([t, g]); }
  } else hits.push([t0 + 0.003 + r() * 0.006, 0.12 + 0.1 * r()]);
  const strike = 0.35 + 0.65 * F;
  for (const [t, g] of hits) {
    const s = strike * g, j = 0.92 + 0.16 * r();
    c.mix(out, pan, t, 0.55 * s, sr);
    if (grate) {
      c.mix(out, c.burst(r, 0.018, "bp", (2200 + 1800 * F) * j, 1.4, 0.0006, 0.004, sr), t, 0.7 * s, sr);
      c.mix(out, soft(c.ring([[1870 * j, 1], [3120 * j, 0.55], [4730 * j, 0.35], [6260 * j, 0.2]], 0.12, p.tail ? 0.026 : 0.014, sr), 0.6), t, 0.22 * s, sr);
    } else {
      c.mix(out, c.burst(r, 0.008, "hp", 2800 + 2500 * F, 0.7, 0.0004, 0.0016, sr), t, 0.55 * s, sr);
      c.mix(out, soft(c.ring([[2410 * j, 1], [4380 * j, 0.5], [7100 * j, 0.25]], 0.05, 0.007, sr), 0.4), t, 0.12 * s, sr);
      c.mix(out, c.burst(r, 0.06, "lp", 170 + 60 * F, 0.9, 0.0015, 0.018, sr), t, 0.75 * s, sr);
    }
  }
  c.mix(out, c.burst(r, 0.09, "lp", 70 + 90 * (1 - z), 0.8, 0.002, 0.015 + 0.02 * M.thump, sr), t0, (0.25 + 0.7 * F) * M.thump, sr);
  if (S > 0) {
    const ts = 0.06 + 0.04 * r(), len = 0.1 + 0.6 * S, sg = 0.25 + 0.6 * S;
    if (grate) {
      const g = Math.round(len * (120 + 160 * F));
      for (let i = 0; i < g; i++) {
        const u = r(), e = Math.sqrt(Math.sin(Math.PI * u));
        c.mix(out, c.burst(r, 0.006 + r() * 0.006, "bp", (1400 + r() * 3600) * M.sc, 1.5 + r() * 2, 0.0004, 0.002 + r() * 0.004, sr), ts + u * len, 0.35 * sg * e * (0.3 + 0.7 * r()), sr);
      }
      for (let t = ts + 0.02 + 0.05 * r(); t < ts + len - 0.03; t += 0.04 + r() * 0.09) c.mix(out, pan, t, 0.12 * sg * (0.5 + r()), sr);
    } else {
      const m = c.seconds(len, sr), x = c.noise(r, m);
      const bp = c.biquad("bp", 2600 * M.sc * (0.9 + 0.2 * r()), 0.8, sr), lo = c.biquad("bp", 750 * M.sc * (0.9 + 0.2 * r()), 1.1, sr);
      let g = 0.6, tg = 0.6, k = 0; const a = 0.015 * sr, rl = 0.05 * sr;
      for (let i = 0; i < m; i++) {
        if (--k <= 0) { tg = 0.3 + 0.7 * r(); k = 40 + ((r() * 220) | 0); }
        g += (tg - g) * 0.02;
        const e = Math.min(1, i / a, (m - i) / rl), v = x[i];
        x[i] = (bp(v) + 0.6 * lo(v)) * g * e;
      }
      c.mix(out, x, ts, 0.5 * sg, sr);
      c.mix(out, pan, ts + 0.01, 0.07 * sg, sr);
    }
  }
  if (p.tail) out = c.reverb(out, { size: 0.3, decay: 0.45 + 0.3 * z, mixAmt: 0.2 }, sr) || out;
  c.finish(out, 0.92, 1.1);
  let last = 0;
  for (let i = out.length - 1; i > 0; i--) if (Math.abs(out[i]) > 0.012) { last = i; break; }
  const n = Math.min(out.length, Math.max(c.seconds(0.22, sr), last + c.seconds(0.04, sr)));
  out = out.slice(0, n);
  const fo = c.seconds(0.035, sr);
  for (let i = 0; i < fo && i < n; i++) out[n - 1 - i] *= i / fo;
  c.gain(out, 0.6 + 0.4 * F);
  c.fade(out, 4, sr);
  return { samples: out };
}
