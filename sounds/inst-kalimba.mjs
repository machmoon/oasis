// Kalimba: a thumb-plucked metal tine on a wooden box. The tine is three damped modes at the clamped-free bar ratios
// (1, 6.27, 17.55; the upper two die fast), struck by a thumb whose hardness sets the upper-mode level and contact
// noise; a short box resonance under it; an optional buzz (a rattle that chatters while the tine swings wide).
// Mode layout follows STK src/ModalBar.cpp (ratio, decay and gain per mode, summed with a direct strike). The tine
// ratios themselves are cantilever-beam theory (no open-source kalimba model was found to copy them from).
// Hand-written by a Claude Code agent against the factory contract (not built by the factory).
export const meta = {
  title: "Kalimba Tine", kind: "sfx", format: "sound", duration: 1.25, price: 2, author: "kickdrum", payout: "kickdrum@creators.oasis.example", kit: "Instrument",
  credit: "Modal layout after STK ModalBar.cpp",
  description: "A plucked kalimba tine note with note, thumb hardness, ring time, box resonance and buzz as knobs, for music boxes, cozy games, lullabies and puzzle chimes.",
  tags: ["kalimba", "mbira", "thumb piano", "tine", "pluck", "cozy", "instrument", "note"],
};
export const params = { knobs: {
  note: { type: "choice", label: "Note", default: "C5", options: ["C5", "E5", "G5", "A4", "D5", "C4", "C6"] },
  hardness: { type: "range", label: "Thumb hardness", default: 0.4, min: 0, max: 1, step: 0.01 },
  ring: { type: "range", label: "Ring time (s)", default: 1.2, min: 0.3, max: 2.5, step: 0.05 },
  body: { type: "range", label: "Box resonance", default: 0.4, min: 0, max: 1, step: 0.01 },
  buzz: { type: "range", label: "Buzz", default: 0, min: 0, max: 1, step: 0.01 },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 443 + 61);
  const m = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[p.note[0]] + 12 * (+p.note.slice(-1) + 1);
  const f = 440 * Math.pow(2, (m - 69) / 12) * Math.pow(2, (r() - 0.5) * 0.006);
  const n = c.seconds(p.ring + 0.05, sr), out = new Float32Array(n), t0 = 0.003 * r();
  const tau = p.ring / 5;
  const modes = [[1, 1, tau], [6.27, 0.08 + 0.4 * p.hardness, tau * 0.12], [17.55, 0.02 + 0.2 * p.hardness, tau * 0.04]];
  for (const [ratio, amp, d] of modes) {
    const fr = f * ratio * (1 + (r() - 0.5) * 0.01);
    if (fr > sr * 0.45) continue;
    c.mix(out, c.ring([[fr, amp]], Math.min(p.ring, d * 8), d, sr), t0 + 0.0015, 1, sr);
  }
  // thumb: a soft flesh contact, brighter with hardness
  c.mix(out, c.burst(r, 0.02, "bp", 800 + 3000 * p.hardness, 0.7, 0.001, 0.003, sr), t0, 0.1 + 0.3 * p.hardness, sr);
  // box: two low wooden modes driven by the attack
  const bf = 260 + 80 * r();
  c.mix(out, c.ring([[bf, 1], [bf * 2.3, 0.4]], 0.4, 0.05 + 0.08 * p.body, sr), t0 + 0.002, 0.6 * p.body, sr);
  if (p.buzz > 0) {
    // rattle: when the tine swings past a threshold, a clipped, bright copy chatters
    const th = 0.6 - 0.4 * p.buzz, rat = new Float32Array(n), hp = c.biquad("hp", 2500, 0.7, sr);
    let pk = 0; for (let i = 0; i < n; i++) pk = Math.max(pk, Math.abs(out[i]));
    for (let i = 0; i < n; i++) { const v = out[i] / pk, a = Math.abs(v) - th; rat[i] = a > 0 ? (v > 0 ? a : -a) * (1 + 0.5 * (r() - 0.5)) : 0; }
    c.filter(rat, hp); c.mix(out, rat, 0, 2.5 * p.buzz * pk, sr);
  }
  const tl = c.seconds(0.08, sr);
  for (let i = 0; i < tl; i++) out[n - 1 - i] *= i / tl;
  c.fade(c.finish(out, 0.88), 0.5, sr);
  return { samples: out };
}
