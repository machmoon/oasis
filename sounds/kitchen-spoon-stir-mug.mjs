// Spoon in a mug: a continuous swirling liquid bed (moving resonant noise plus a stream of tiny bubble/slosh chirps), spoon-on-floor micro-ticks, inharmonic short mug-wall clinks on random revolutions, and an optional rim tap where the mug rings.
export const meta = {
  title: "Mug Stir Clink", kind: "foley", format: "sound", duration: 2.85, price: 1, author: "foleyroom", payout: "foleyroom@creators.oasis.example", kit: "Kitchen", description: "A spoon stirring liquid in a ceramic, glass or enamel mug, knocking the wall as it circles, then tapping the rim; for kitchen, cafe and morning-routine scenes.",
  tags: ["spoon", "stir", "mug", "clink", "tea", "coffee", "kitchen", "foley"],
};
export const params = { knobs: {
  material: { type: "choice", label: "Mug material", default: "ceramic", options: ["ceramic", "glass", "enamel"] },
  rate: { type: "range", label: "Stir rate (rev/s)", default: 2.2, min: 1, max: 4, step: 0.1 },
  clink: { type: "range", label: "Clink intensity", default: 0.5, min: 0, max: 1, step: 0.01 },
  level: { type: "range", label: "Liquid level", default: 0.6, min: 0, max: 1, step: 0.01 },
  tap: { type: "toggle", label: "Final tap", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, mi = params.knobs.material.options.indexOf(p.material), r = c.rng(p.seed * 6151 + mi * 97 + 3);
  const dur = p.tap ? 2.85 : 2.1, n = c.seconds(dur, sr), out = new Float32Array(n);
  const M = {
    ceramic: { m: [[1150, 1], [2730, 0.5], [4480, 0.28], [6350, 0.1]], d: 0.05, click: 4000, q: 0.9 },
    glass: { m: [[1780, 1], [4170, 0.6], [7050, 0.35], [9700, 0.16]], d: 0.12, click: 7800, q: 1.4 },
    enamel: { m: [[870, 1], [2140, 0.75], [3690, 0.55], [5430, 0.38], [7620, 0.22]], d: 0.085, click: 5600, q: 2.2 },
  }[p.material];
  const lv = p.level, ci = p.clink, take = 0.97 + r() * 0.06, sink = 1 - 0.28 * lv, damp = 1 - 0.45 * lv;
  const clink = (t, a, dk) => {
    const modes = M.m.map(([f, g]) => [f * take * sink * (0.993 + r() * 0.014), g * (0.6 + 0.8 * r())]).filter(([f]) => f < sr * 0.45);
    const d = M.d * damp * dk * (0.85 + 0.3 * r()), len = Math.min(d * 5, 0.55), b = c.ring(modes, len, d, sr), L = b.length, f0 = Math.floor(L * 0.7);
    for (let i = f0; i < L; i++) b[i] *= (L - i) / (L - f0);
    c.mix(out, b, t + 0.0008, 0.6 * a, sr);
    c.mix(out, c.burst(r, 0.005, "hp", M.click * (0.75 + 0.5 * r()) * (0.8 + 0.4 * ci), M.q, 0.0004, 0.0012, sr), t, 0.45 * a, sr);
  };
  const bubble = (t, a) => {
    const m = c.seconds(0.03, sr), x = new Float32Array(m), f = (550 + r() * 1100) * (1.2 - 0.35 * lv), up = 0.3 + 0.9 * r(), tau = 0.004 + 0.006 * r(); let ph = 0;
    for (let k = 0; k < m; k++) { ph += c.TAU * f * (1 + up * k / m) / sr; x[k] = Math.sin(ph) * Math.exp(-k / sr / tau) * Math.min(1, k / (0.0006 * sr)); }
    c.mix(out, x, t, a, sr);
  };
  const stirEnd = 1.75, noise = c.noise(r, n), w0 = r() * c.TAU, wf = 0.6 + r() * 0.9, wp = r() * c.TAU;
  let ph = r(), lastRev = Math.floor(ph), lo = 0, bp = 0, fc = 500, g = 0;
  const swirlGain = 0.06 + 0.4 * lv, prob = 0.25 + 0.65 * ci, cg = 0.12 + 0.88 * ci;
  for (let i = 0; i < n; i++) {
    const t = i / sr; if (t > stirEnd + 0.05) break;
    const slow = t < 1.2 ? 0 : Math.min(1, (t - 1.2) / 0.55);
    const rate = p.rate * (1 - 0.35 * slow * slow * (3 - 2 * slow)) * (1 + 0.07 * Math.sin(c.TAU * wf * t + wp));
    ph += rate / sr;
    const senv = Math.min(1, t / 0.1) * (t < 1.5 ? 1 : Math.max(0, 1 - (t - 1.5) / 0.3));
    const s = Math.sin(c.TAU * ph + w0);
    if (i % 32 === 0) { fc = (380 + 300 * lv) * (1 + 0.3 * s) * (0.8 + 0.08 * rate); g = 2 * Math.sin(Math.PI * fc / sr); }
    const hi = noise[i] - lo - 0.3 * bp; bp += g * hi; lo += g * bp;
    out[i] += senv * bp * swirlGain * 0.5 * (0.75 + 0.25 * Math.sin(c.TAU * ph + 0.8 + w0));
    if (r() < (8 + 22 * lv) * rate / 2.2 / sr * senv) bubble(t, (0.04 + 0.1 * r()) * (0.3 + 0.7 * lv));
    const rev = Math.floor(ph);
    if (rev !== lastRev && senv > 0.2) {
      lastRev = rev; const per = 1 / rate;
      if (r() < prob) clink(Math.min(t + r() * per * 0.8, stirEnd - 0.05), cg * senv * (0.5 + 0.5 * r()), 0.6);
      if (r() < 0.3 * ci) clink(Math.min(t + per * (0.3 + 0.5 * r()), stirEnd - 0.03), cg * 0.4 * senv, 0.5);
      const ng = Math.round((2 + 7 * (1 - lv)) * (0.6 + 0.8 * r()));
      for (let k = 0; k < ng; k++) c.mix(out, c.burst(r, 0.004, "bp", M.click * (0.5 + 0.9 * r()), 3, 0.0003, 0.0008 + r() * 0.001, sr), Math.min(t + per * (0.1 + 0.5 * r()), stirEnd), (0.04 + 0.08 * r()) * (1.25 - lv) * senv, sr);
      const nb = Math.round(lv * (1 + 3 * r()));
      for (let b = 0; b < nb; b++) bubble(Math.min(t + r() * per, stirEnd), (0.08 + 0.12 * r()) * senv * lv);
    }
  }
  if (p.tap) {
    const t0 = 1.86 + r() * 0.03, t1 = t0 + 0.15 + r() * 0.03;
    clink(t0, 1, 1.3); clink(t1, 0.8, 1.3);
    if (r() < 0.5) clink(t1 + 0.13 + r() * 0.03, 0.5, 1.3);
  }
  c.finish(out, 0.9);
  c.fade(out, 15, sr);
  return { samples: out };
}
