// Confirm: a short two-note rising "yes". A blip that jumps up by a musical interval partway through, with a tiny
// contact tick at the start; the style sets the waveform and how much the notes ring.
// After jsfxr sfxr.js: blipSelect (square at duty frnd(0.6) or saw, no attack, sustain 0.1-0.2, a highpass) with the
// pickupCoin arpeggio (period × arpeggioMultiplier after arpeggioTime samples, a jump up); the interval is a just
// ratio here rather than sfxr's 1 - 0.9·arp_mod² so the two notes are always in tune with each other.
// Hand-written by a Claude Code agent against the factory contract (not built by the factory).
export const meta = {
  title: "Confirm Blip", kind: "ui", format: "sound", duration: 0.22, price: 1, author: "quietmachine", payout: "quietmachine@creators.oasis.example", kit: "Interface",
  credit: "After jsfxr sfxr.js blipSelect + pickupCoin arpeggio",
  description: "A two-note rising confirmation blip with style, interval, pitch, length and brightness as knobs, for OK buttons, saved states and accepted actions.",
  tags: ["confirm", "ok", "accept", "yes", "blip", "ui", "success", "interface"],
};
export const params = { knobs: {
  style: { type: "choice", label: "Style", default: "soft", options: ["soft", "digital", "bell"] },
  interval: { type: "choice", label: "Interval", default: "fifth", options: ["fifth", "fourth", "octave", "major third"] },
  pitch: { type: "range", label: "Pitch", default: 0.5, min: 0, max: 1, step: 0.01 },
  length: { type: "range", label: "Length", default: 0.4, min: 0, max: 1, step: 0.01 },
  brightness: { type: "range", label: "Brightness", default: 0.5, min: 0, max: 1, step: 0.01 },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 307 + 11), TAU = 6.283185307179586;
  const ratio = { fifth: 1.5, fourth: 4 / 3, octave: 2, "major third": 1.25 }[p.interval];
  const f = 520 * Math.pow(2, 1.5 * p.pitch) * (0.98 + 0.04 * r()), step = 0.045 + 0.05 * p.length + 0.01 * r();
  const tail = { soft: 0.05, digital: 0.025, bell: 0.16 }[p.style] * (0.5 + p.length);
  const n = c.seconds(step * 2 + tail * 3, sr), out = new Float32Array(n), b = 0.15 + 0.85 * p.brightness;
  let ph = r(), ph2 = r();
  const s1 = c.seconds(step, sr), a = c.seconds(0.003, sr), k = Math.exp(-1 / (tail * sr)), k1 = Math.exp(-1 / (Math.max(tail, step) * sr));
  let e1 = 1, e2 = 1;
  for (let i = 0; i < n; i++) {
    const hz = i < s1 ? f : f * ratio;
    ph += hz / sr; ph -= Math.floor(ph); ph2 += hz * 3.01 / sr; ph2 -= Math.floor(ph2);
    // note one: 3 ms attack, a slow decay, a 3 ms cut into note two; note two: 3 ms attack, then the tail
    let e;
    if (i < s1) { e = Math.min(1, i / a) * e1 * Math.min(1, (s1 - i) / a); e1 *= k1; }
    else { e = Math.min(1, (i - s1) / a) * e2; e2 *= k; }
    let v;
    if (p.style === "digital") v = (ph < 0.5 - 0.25 * b ? 1 : -1) * 0.5;
    else if (p.style === "bell") v = Math.sin(TAU * ph + 1.2 * b * Math.sin(TAU * ph2) * e);
    else v = Math.sin(TAU * ph) + 0.3 * b * Math.sin(2 * TAU * ph);
    out[i] = v * e * (i < s1 ? 0.8 : 1);
  }
  c.mix(out, c.burst(r, 0.004, "hp", 2500 + 4000 * p.brightness, 0.7, 0.0002, 0.0008, sr), 0, 0.15 + 0.2 * p.brightness, sr);
  c.filter(out, c.biquad("lp", 2000 + 10000 * p.brightness, 0.7, sr));
  c.filter(out, c.biquad("hp", 200, 0.7, sr));
  const tl = c.seconds(0.02, sr);
  for (let i = 0; i < tl; i++) out[n - 1 - i] *= i / tl;
  c.fade(c.finish(out, 0.88), 0.5, sr);
  return { samples: out };
}
