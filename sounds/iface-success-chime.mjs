// Success chime: the "done!" of a completed task. jsfxr's coin pickup grown into a chime: a punchy note that jumps up
// a step partway through, each note a bright, slightly detuned pair, with a sparkle of high partials and a short tail.
// After jsfxr sfxr.js Params.prototype.pickupCoin (no attack, sustain frnd(0.1), decay 0.1-0.5, punch 0.3-0.6, an
// arpeggio jump of 1 - 0.9·arp_mod² on the period after arpeggioTime samples) with the jump set to a just fifth
// so it always resolves; the punch is the kit adsr's jsfxr punch.
// Hand-written by a Claude Code agent against the factory contract (not built by the factory).
export const meta = {
  title: "Success Chime", kind: "ui", format: "sound", duration: 0.45, price: 1, author: "quietmachine", payout: "quietmachine@creators.oasis.example", kit: "Interface",
  credit: "After jsfxr sfxr.js pickupCoin",
  description: "A bright success chime with style, pitch, length and sparkle as knobs, for completed tasks, achievements, payments and level-ups in apps.",
  tags: ["success", "done", "complete", "chime", "coin", "ui", "achievement", "interface"],
};
export const params = { knobs: {
  style: { type: "choice", label: "Style", default: "chime", options: ["chime", "coin", "soft"] },
  pitch: { type: "range", label: "Pitch", default: 0.5, min: 0, max: 1, step: 0.01 },
  length: { type: "range", label: "Length", default: 0.4, min: 0, max: 1, step: 0.01 },
  sparkle: { type: "range", label: "Sparkle", default: 0.5, min: 0, max: 1, step: 0.01 },
  jump: { type: "range", label: "Jump delay", default: 0.4, min: 0, max: 1, step: 0.01 },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 347 + 53);
  const f = 780 * Math.pow(2, 1.3 * p.pitch) * (0.98 + 0.04 * r()), ratio = 1.5;
  const at = 0.04 + 0.06 * p.jump, decay = 0.08 + 0.4 * p.length, n = c.seconds(at + 0.03 + decay + 0.02, sr), out = new Float32Array(n);
  const shape = { chime: "sine", coin: "square", soft: "tri" }[p.style], g = { chime: 1, coin: 0.35, soft: 1 }[p.style];
  const note = (hz, len, punch) => {
    const k = c.seconds(len, sr), a = c.osc(shape, hz, k, sr, { duty: 0.5, phase: r() }), b = c.osc(shape, hz * 1.004, k, sr, { duty: 0.5, phase: r() });
    for (let i = 0; i < k; i++) a[i] = (a[i] + b[i]) * 0.5;
    if (p.style === "chime") { const h = c.osc("sine", hz * 4.02, k, sr, { phase: r() }); for (let i = 0; i < k; i++) a[i] += h[i] * 0.25 * p.sparkle; }
    return c.multiply(a, c.adsr(k, { attack: 0.0015, sustain: Math.min(0.03, len * 0.2), decay: len * 0.8, punch }, sr));
  };
  c.mix(out, note(f, at + 0.01, 0.4), 0, 0.8 * g, sr);
  c.mix(out, note(f * ratio, decay + 0.03, 0.5), at, g, sr);
  const sp = Math.round(1 + 6 * p.sparkle);
  for (let j = 0; j < sp; j++) c.mix(out, c.ring([[f * ratio * (3 + 3 * r()), 1]], 0.06, 0.012, sr), at + 0.01 + r() * decay * 0.5, 0.15 * p.sparkle, sr);
  c.filter(out, c.biquad("hp", 300, 0.7, sr));
  c.fade(c.finish(out, 0.88), 1, sr);
  return { samples: out };
}
