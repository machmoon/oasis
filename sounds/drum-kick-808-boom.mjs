// Analogue kick: a pitch-swept sine body (circuit sets sweep shape, decay, drive and register), a beater click (noise burst plus a fast chirp) on the attack, and an optional sub tail that rings on under the body. Length follows the real decay.
export const meta = {
  title: "808 Boom Kick", kind: "sfx", format: "sound", duration: 1.2, price: 2, author: "kickdrum", payout: "kickdrum@creators.oasis.example", kit: "Drum Machine",
  description: "An analogue bass-drum one-shot in 808, 909 or 606 flavour, with decay, pitch sweep, beater click, tuning and a sub tail as knobs; each seed is a slightly different hit.",
  tags: ["kick", "bass drum", "808", "909", "606", "drum machine", "one-shot", "sub"],
};
export const params = { knobs: {
  circuit: { type: "choice", label: "Circuit", default: "808", options: ["808", "909", "606"] },
  decay: { type: "range", label: "Decay", default: 0.5, min: 0, max: 1, step: 0.01 },
  sweep: { type: "range", label: "Pitch sweep", default: 0.5, min: 0, max: 1, step: 0.01 },
  click: { type: "range", label: "Click", default: 0.4, min: 0, max: 1, step: 0.01 },
  tune: { type: "range", label: "Tune (Hz)", default: 48, min: 30, max: 80, step: 1 },
  tail: { type: "toggle", label: "Sub tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + params.knobs.circuit.options.indexOf(p.circuit) * 29 + 3);
  const cfg = { "808": { body: 0.22, sweepT: 0.05, ratio: 2.0, drive: 1.2, clickF: 2200, tailLen: 0.45, reg: 1, clickG: 0.8 },
    "909": { body: 0.11, sweepT: 0.02, ratio: 4.5, drive: 3.5, clickF: 4800, tailLen: 0.16, reg: 1.1, clickG: 1.1 },
    "606": { body: 0.07, sweepT: 0.014, ratio: 1.6, drive: 1.0, clickF: 3200, tailLen: 0.1, reg: 1.45, clickG: 0.9 } }[p.circuit];
  const f0 = p.tune * cfg.reg * (0.99 + r() * 0.02);
  const bodyDec = cfg.body * (0.3 + 1.2 * p.decay);
  const td = cfg.tailLen * (0.3 + 0.7 * p.decay);
  const dur = Math.min(Math.max(bodyDec * 5, p.tail ? td * 4.5 : 0) + 0.06, 1.8);
  const n = c.seconds(dur, sr), out = new Float32Array(n);
  const sweepAmt = cfg.ratio * (0.4 + 1.6 * p.sweep), st = cfg.sweepT * (0.7 + 0.8 * p.sweep);
  const att = 0.0045 - 0.0033 * p.click;
  let ph = 0;
  const body = new Float32Array(n), dn = Math.tanh(cfg.drive);
  for (let i = 0; i < n; i++) {
    const t = i / sr, f = f0 * (1 + sweepAmt * Math.exp(-t / st));
    ph += c.TAU * f / sr;
    let s = Math.sin(ph);
    if (p.circuit === "606") s += 0.35 * Math.sin(ph * 1.6) * Math.exp(-t / 0.02);
    body[i] = Math.tanh(s * cfg.drive * Math.min(1, t / att) * Math.exp(-t / bodyDec)) / dn;
  }
  c.mix(out, body, 0, 0.9, sr);
  if (p.tail) {
    const tl = new Float32Array(n);
    let tp = 0;
    for (let i = 0; i < n; i++) {
      const t = i / sr; tp += c.TAU * f0 * (1 + 0.12 * Math.exp(-t / 0.06)) / sr;
      tl[i] = Math.sin(tp) * Math.min(1, t / 0.006) * Math.exp(-t / td);
    }
    c.mix(out, tl, 0, 0.5, sr);
  }
  if (p.click > 0) {
    const cl = p.click, g = cfg.clickG;
    c.mix(out, c.burst(r, 0.016, "bp", cfg.clickF * (0.9 + r() * 0.2), 0.8, 0.0004, 0.003 + 0.004 * cl, sr), 0, (0.1 + 1.5 * cl) * g, sr);
    const cn = c.seconds(0.012, sr), top = cfg.clickF * 1.3, chirp = c.osc("sine", (t) => 400 + top * Math.exp(-t / 0.003), cn, sr);
    for (let i = 0; i < cn; i++) chirp[i] *= Math.min(1, i / (0.0004 * sr)) * Math.exp(-i / sr / 0.003);
    c.mix(out, chirp, 0, 0.9 * cl * g, sr);
    if (p.circuit === "909") c.mix(out, c.burst(r, 0.005, "hp", 6000, 0.7, 0.0003, 0.0012, sr), 0, 0.6 * cl, sr);
    if (p.circuit === "606") c.mix(out, c.ring([[620, 1], [980, 0.5]], 0.03, 0.007, sr), 0, 0.5 * cl, sr);
  }
  const rel = c.seconds(0.05, sr);
  for (let i = 0; i < rel; i++) out[n - 1 - i] *= i / rel;
  c.finish(out, 0.9, 1.1);
  return { samples: out };
}
