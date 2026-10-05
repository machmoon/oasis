// Analogue handclap: a row of short, separate bandpassed noise snaps (the hands), a longer final snap that carries the body, and an optional room tail; circuit changes filter, snap shape, grit and room colour.
export const meta = {
  title: "Multi-Burst Clap", kind: "sfx", format: "sound", duration: 0.7, price: 2, author: "kickdrum", payout: "kickdrum@creators.oasis.example", kit: "Drum Machine", description: "An analogue handclap built from staggered noise bursts and a room tail, with 808, 909 and Drumulator voicings, for drum machine patterns, stingers and one-shots.",
  tags: ["clap", "handclap", "drum machine", "808", "909", "drumulator", "percussion", "one-shot"],
};
export const params = { knobs: {
  circuit: { type: "choice", label: "Circuit", default: "808", options: ["808", "909", "drumulator"] },
  spread: { type: "range", label: "Spread", default: 0.5, min: 0, max: 1, step: 0.01 },
  bursts: { type: "range", label: "Burst count", default: 4, min: 2, max: 6, step: 1 },
  tailLength: { type: "range", label: "Tail length", default: 0.5, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Reverb tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, ci = params.knobs.circuit.options.indexOf(p.circuit);
  const r = c.rng(p.seed * 613 + ci * 101 + 9);
  const cfg = [
    { f: 1050, q: 2.4, snap: 0.005, last: 0.07, body: 0.22, hp: 450, tailF: 2600, lp: 6500 },
    { f: 1800, q: 1.5, snap: 0.0035, last: 0.055, body: 0.1, hp: 800, tailF: 4800, lp: 11000 },
    { f: 850, q: 3.4, snap: 0.007, last: 0.1, body: 0.4, hp: 300, tailF: 1800, lp: 4200 },
  ][ci];
  const n = c.seconds(0.7, sr), dry = new Float32Array(n);
  const count = Math.round(c.clamp(p.bursts, 2, 6));
  const gap = 0.007 + 0.026 * p.spread;
  let t = 0.001;
  for (let k = 0; k < count - 1; k++) {
    const amp = (0.55 + 0.45 * r()) * (0.75 + 0.25 * k / count);
    const f = cfg.f * (0.8 + 0.45 * r());
    const dec = cfg.snap * (0.7 + 0.7 * r());
    c.mix(dry, c.burst(r, dec * 6 + 0.006, "bp", f, cfg.q, 0.0004 + 0.0005 * r(), dec, sr), t, amp, sr);
    c.mix(dry, c.burst(r, 0.006, "hp", cfg.hp * 4, 0.8, 0.0003, 0.0012, sr), t, 0.2 * amp, sr);
    t += gap * (0.55 + 0.9 * r());
  }
  const lastT = t;
  c.mix(dry, c.burst(r, cfg.last * 5, "bp", cfg.f * (0.9 + 0.2 * r()), cfg.q * 0.8, 0.001, cfg.last, sr), lastT, 1, sr);
  c.mix(dry, c.burst(r, 0.012, "hp", cfg.hp * 4, 0.8, 0.0003, 0.003, sr), lastT, 0.25, sr);
  c.mix(dry, c.ring([[cfg.f * 0.5, 1], [cfg.f * 1.25, 0.4]], 0.1, 0.02, sr), lastT, cfg.body, sr);
  c.filter(dry, c.biquad("hp", cfg.hp, 0.7, sr));
  if (ci === 2) {
    let h = 0;
    for (let i = 0; i < n; i++) { if (i % 2 === 0) h = Math.round(dry[i] * 20) / 20; dry[i] = h; }
  }
  const out = new Float32Array(n);
  c.mix(out, dry, 0, 1, sr);
  if (p.tail) {
    const tl = 0.12 + 0.5 * p.tailLength, m = c.seconds(tl, sr), w = c.noise(r, m);
    const e = c.env(m, 0.015, tl * 0.3, sr), bp = c.biquad("bp", cfg.tailF * 0.5, 0.6, sr);
    for (let i = 0; i < m; i++) w[i] = bp(w[i]) * e[i];
    c.mix(out, w, lastT + 0.015, 0.2 + 0.3 * p.tailLength, sr);
    const rv = c.reverb(dry, { size: 0.3 + 0.6 * p.tailLength, decay: 0.3 + 0.6 * p.tailLength, mixAmt: 0.6 }, sr);
    c.mix(out, rv, 0, 0.55, sr);
  }
  c.filter(out, c.biquad("lp", cfg.lp, 0.7, sr));
  c.fade(c.finish(out, 0.88, 1.3), 10, sr);
  return { samples: out };
}
