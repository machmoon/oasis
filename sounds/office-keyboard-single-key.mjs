// Single keystroke: press (bright plastic click + switch body + bottom-out thock) then a quieter release click, with stabilizer rattle and an optional small-room tail.
export const meta = {
  title: "Single Keystroke", kind: "foley", format: "sound", duration: 0.3, price: 1, author: "foleyroom", payout: "foleyroom@creators.oasis.example", kit: "Office", description: "One isolated key press and release on a membrane, mechanical or laptop board, with key size, force, rattle and pitch as knobs; each seed is a different finger.",
  tags: ["keyboard", "keystroke", "typing", "office", "key", "click", "foley", "desk"],
};
export const params = { knobs: {
  switchType: { type: "choice", label: "Switch type", default: "mechanical", options: ["membrane", "mechanical", "laptop"] },
  keySize: { type: "choice", label: "Key size", default: "letter", options: ["letter", "space", "enter"] },
  force: { type: "range", label: "Force", default: 0.5, min: 0, max: 1, step: 0.01 },
  rattle: { type: "range", label: "Rattle", default: 0.3, min: 0, max: 1, step: 0.01 },
  pitch: { type: "range", label: "Pitch", default: 0.5, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Room tail", default: false },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + params.knobs.switchType.options.indexOf(p.switchType) * 37 + params.knobs.keySize.options.indexOf(p.keySize) * 11 + 3);
  const f = p.force, ps = Math.pow(2, (p.pitch - 0.5) * 1.2) * (0.98 + r() * 0.04);
  const size = { letter: 1, space: 0.62, enter: 0.78 }[p.keySize];
  const sw = {
    membrane: { click: 2600, cq: 0.7, body: [[260, 1], [540, 0.4], [1400, 0.12]], bd: 0.022, ca: 0.6, gap: 0.08, rel: 0.4, lo: 0.8 },
    mechanical: { click: 5600, cq: 1.4, body: [[420, 0.8], [1250, 0.6], [2700, 0.45], [4300, 0.3]], bd: 0.03, ca: 1.1, gap: 0.095, rel: 0.75, lo: 0.6 },
    laptop: { click: 4600, cq: 0.9, body: [[800, 0.9], [1900, 0.6], [3100, 0.35]], bd: 0.012, ca: 0.8, gap: 0.055, rel: 0.45, lo: 0.5 },
  }[p.switchType];
  const t2 = 0.002 + sw.gap + r() * 0.03 + 0.04 * (1 - f);
  const out = new Float32Array(c.seconds(t2 + 0.13 + (p.tail ? 0.35 : 0), sr));
  const hit = (t, k, rel) => {
    const g = k * (0.5 + 0.7 * f);
    c.mix(out, c.burst(r, 0.008, "hp", sw.click * ps * (0.9 + r() * 0.2), sw.cq, 0.0004, 0.0025, sr), t, g * sw.ca * (rel ? 0.8 : 1), sr);
    const modes = sw.body.map(([hz, a]) => [hz * (0.6 + 0.4 * size) * ps * (0.99 + r() * 0.02), a]);
    c.mix(out, c.ring(modes, sw.bd * 6, sw.bd * (rel ? 0.6 : 1) * (1.3 - 0.4 * size), sr), t + 0.0008, g * 0.6, sr);
    if (!rel) {
      const lo = (170 + 70 * size) * ps * (p.switchType === "membrane" ? 0.8 : 1);
      c.mix(out, c.ring([[lo, 1], [lo * 1.9, 0.35]], 0.1, 0.02 + 0.02 * (1 - size), sr), t + 0.002, g * sw.lo * (0.2 + 0.35 * f), sr);
    }
  };
  hit(0.002, 1, false);
  hit(t2, sw.rel * 0.6, true);
  if (p.keySize !== "letter") {
    const n = Math.round(p.rattle * (p.keySize === "space" ? 14 : 8));
    for (let i = 0; i < n; i++) {
      const t = 0.008 + r() * 0.07 + (r() < 0.4 ? t2 : 0);
      c.mix(out, c.ring([[2400 + r() * 2600, 1], [4800 + r() * 2000, 0.4]], 0.02, 0.004, sr), t, (0.06 + 0.25 * r()) * p.rattle * (0.5 + f), sr);
    }
  } else {
    const n = Math.round(p.rattle * 6);
    for (let i = 0; i < n; i++) c.mix(out, c.burst(r, 0.004, "bp", 3500 + r() * 3000, 3, 0.0003, 0.001, sr), 0.01 + r() * 0.05, 0.12 * p.rattle * (0.5 + f), sr);
  }
  if (p.tail) {
    const dry = out.slice(), wet = c.reverb(dry, { size: 0.35, decay: 0.3, mixAmt: 1 }, sr);
    for (let i = 0; i < out.length; i++) out[i] = dry[i] * 0.8 + wet[i] * 0.35;
  }
  c.filter(out, c.biquad("hp", 140, 0.7, sr));
  c.finish(out, 0.85, 1.1);
  let pk = 0;
  for (let i = 0; i < out.length; i++) pk = Math.max(pk, Math.abs(out[i]));
  if (pk > 0) c.gain(out, 0.85 / pk);
  c.fade(out, 12, sr);
  return { samples: out };
}
