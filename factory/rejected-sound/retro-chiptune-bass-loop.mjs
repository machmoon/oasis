// Chiptune bass loop: 2 bars of legato pulse-wave bass (octave-bounce, walking or arp) with a pitch-blip attack, duty sweep, tri sub, a kick thump on the beats, offbeat noise ticks and swing; the tail is a circular dotted-eighth echo, so the 2-bar render wraps seamlessly.
export const meta = {
  title: "Driving Chiptune Bass", kind: "music-loop", format: "sound", duration: 3.2, price: 5, author: "oasis-factory", kit: "Retro Arcade",
  description: "A looping two-bar 8-bit bassline in octave-bounce, walking or arpeggio patterns, for arcade levels, menus and chase scenes.",
  tags: ["chiptune", "bass", "loop", "8-bit", "arcade", "retro", "music", "driving"],
};
export const params = { knobs: {
  pattern: { type: "choice", label: "Pattern", default: "octave-bounce", options: ["octave-bounce", "walking", "arp"] },
  key: { type: "range", label: "Key pitch (semitones)", default: 0, min: -7, max: 7, step: 1 },
  tempo: { type: "range", label: "Tempo rate", default: 1, min: 0.85, max: 1.4, step: 0.01 },
  duty: { type: "range", label: "Duty sweep", default: 0.5, min: 0, max: 1, step: 0.01 },
  swing: { type: "range", label: "Swing", default: 0.2, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Loop-seam tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + 29);
  const bpm = 150 * p.tempo, step = 60 / bpm / 2, steps = 16;
  const total = steps * step, n = Math.round(total * sr), out = new Float32Array(n);
  const root = 41.2 * Math.pow(2, p.key / 12);
  const prog = [0, 0, 5, 7];
  const walk = [0, 3, 5, 7, 5, 3, 7, 10];
  const arp = [0, 7, 12, 7, 3, 7, 12, 15];
  const sw = p.swing * 0.35 * step;
  const ph = r() * 6, vibRate = 5 + r() * 2;
  const arpMode = p.pattern === "arp";
  const eDec = Math.exp(-1 / (0.07 * sr)), bDec = Math.exp(-1 / (0.012 * sr));
  for (let s = 0; s < steps; s++) {
    const bar = Math.floor(s / 8), beat = s % 8, chord = prog[(bar * 2 + (beat >> 2)) % 4];
    let semi;
    if (p.pattern === "octave-bounce") semi = chord + (beat % 2 ? 12 : 0);
    else if (p.pattern === "walking") semi = chord + walk[beat];
    else semi = chord + arp[beat];
    if (r() < 0.1 && beat % 4 === 3) semi += 12;
    const t0 = Math.max(0, s * step + (s % 2 ? sw : 0) + (r() - 0.5) * 0.004);
    const len = Math.min(step * (arpMode ? 0.9 : 1.0), total - t0 - 0.002);
    const f = root * Math.pow(2, semi / 12) * (arpMode ? 2 : 1);
    const m = Math.max(1, Math.round(len * sr)), buf = new Float32Array(m);
    const accent = beat % 4 === 0 ? 1 : 0.75 + 0.15 * r();
    const sweep = 0.5 + 0.5 * Math.sin(ph + s * 0.5 + (t0 / total) * c.TAU * 2);
    const relN = 0.008 * sr;
    let phase = 0, sub = 0, dec = 1, blip = 1, d = 0.5;
    for (let i = 0; i < m; i++) {
      if ((i & 31) === 0) d = 0.5 - 0.38 * p.duty * (0.3 + 0.7 * sweep) + 0.03 * p.duty * Math.sin(c.TAU * vibRate * i / sr);
      const a = Math.min(1, i / (0.002 * sr)), rel = Math.min(1, (m - i) / relN);
      const e = a * rel * (0.45 + 0.55 * dec);
      dec *= eDec; blip *= bDec;
      const fi = f * (1 + 0.06 * blip) / sr;
      phase += fi; phase -= Math.floor(phase);
      sub += fi * 0.5; sub -= Math.floor(sub);
      const sq = (phase < d ? 1 : -1) - (2 * d - 1), tri = 4 * Math.abs(sub - 0.5) - 1;
      buf[i] = (sq * 0.45 + tri * 0.5) * e * accent;
    }
    c.mix(out, buf, t0, 0.8, sr);
    if (beat % 4 === 0) {
      const k = Math.round(0.07 * sr), th = c.osc("sine", (t) => 48 + 90 * Math.exp(-t / 0.02), k, sr);
      c.mix(out, c.multiply(th, c.env(k, 0.002, 0.03, sr)), t0, 0.3, sr);
    }
    if (s % 2 === 1) c.mix(out, c.burst(r, 0.02, "hp", 6000, 0.8, 0.0005, 0.005, sr), t0, 0.1 + 0.05 * r(), sr);
  }
  c.filter(out, c.biquad("hp", 35, 0.7, sr));
  if (p.tail) {
    const D = Math.round(step * 1.5 * sr);
    for (let i = 0; i < 2 * n; i++) { const k = i % n; out[k] += 0.4 * out[(k - D + n * 4) % n]; }
  }
  c.finish(out, 0.85, 1.3);
  c.fade(out, 10, sr);
  return { samples: out };
}
