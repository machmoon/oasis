// Power Down: a chiptune "lost your power-up" cue. A pulse voice (duty widening as it drains) over a sub-triangle steps down falling triads with frame-stepped droop, slows, then deflates in a vibrato glide; the optional tail echoes only the last fall.
export const meta = {
  title: "Power Drain", kind: "sfx", format: "sound", duration: 1.5, price: 2, author: "quietmachine", payout: "quietmachine@creators.oasis.example", kit: "Retro Arcade", description: "An 8-bit descending, deflating arpeggio for losing a power-up or shrinking back down; scale, pitch, droop, length and arp rate are knobs, and each seed is a different take.",
  tags: ["power-down", "arcade", "8-bit", "chiptune", "arpeggio", "retro", "lose", "game"],
};
export const params = { knobs: {
  scale: { type: "choice", label: "Scale", default: "minor", options: ["minor", "chromatic", "major"] },
  pitch: { type: "range", label: "Pitch", default: 0.5, min: 0, max: 1, step: 0.01 },
  droop: { type: "range", label: "Droop", default: 0.5, min: 0, max: 1, step: 0.01 },
  length: { type: "range", label: "Length", default: 0.4, min: 0, max: 1, step: 0.01 },
  rate: { type: "range", label: "Arp rate", default: 16, min: 8, max: 32, step: 0.5 },
  tail: { type: "toggle", label: "Echo tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 6151 + params.knobs.scale.options.indexOf(p.scale) * 97 + 3);
  const chrom = p.scale === "chromatic";
  const sc = { minor: [0, 2, 3, 5, 7, 8, 10], chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], major: [0, 2, 4, 5, 7, 9, 11] }[p.scale];
  const semi = (d) => { const L = sc.length; return Math.floor(d / L) * 12 + sc[((d % L) + L) % L]; };
  const voicings = chrom ? [[2, 1, 0], [3, 1, 0], [2, 0, 1]] : [[4, 2, 0], [4, 0, 2], [7, 4, 0]];
  const pat = voicings[Math.floor(r() * 3)], drop = chrom ? 3 : 1, hi = Math.max(...pat);
  const groups = Math.round(2 + 4 * p.length), N = groups * 3, step = 1 / p.rate;
  const top = 330 * Math.pow(2, p.pitch * 1.6 + (r() - 0.5) * 0.08);
  const root = top / Math.pow(2, semi((groups - 1) * drop + hi) / 12);
  const d0 = r() < 0.5 ? 0.125 : 0.25;
  const notes = []; let t = 0.002 + r() * 0.002, k = 0, lastGroup = 0;
  for (let g = 0; g < groups; g++) {
    const d = (groups - 1 - g) * drop;
    if (g === groups - 1) lastGroup = t;
    for (let j = 0; j < 3; j++) {
      const sag = Math.pow(2, -p.droop * 0.6 * k / N), f = root * Math.pow(2, semi(d + pat[j]) / 12) * sag;
      const dur = step * (1 + p.droop * 1.2 * k / N) * (0.94 + r() * 0.12);
      const duty = Math.round((d0 + (0.5 - d0) * k / N) * 8) / 8;
      notes.push([t, dur, f, f * Math.pow(2, -(p.droop * 1.5 + 0.05) / 12), (1 - 0.35 * k / N) * (0.88 + 0.12 * r()), 0.78 + r() * 0.08, false, duty]);
      t += dur; k++;
    }
  }
  const rf = root * Math.pow(2, -p.droop * 0.6), fd = 0.22 + 0.4 * p.length + 0.2 * p.droop;
  notes.push([t, fd, rf, rf * Math.pow(2, -(4 + 16 * p.droop) / 12), 0.85, 1, true, 0.5]);
  const core = t + fd + 0.01, delay = step * (1.3 + 0.5 * r());
  const dry = new Float32Array(c.seconds(core, sr));
  const vr = 7 + r() * 6, vd = 0.012 + 0.03 * p.droop, vph = r() * 6, frame = Math.max(1, Math.round(sr / 60));
  let ph = 0, ph2 = 0;
  for (const [t0, dur, f0, f1, amp, gate, fin, duty] of notes) {
    const s = c.seconds(t0, sr), n = Math.max(2, c.seconds(dur, sr)), gn = Math.floor(n * gate);
    const a = c.seconds(0.0015, sr), rel = c.seconds(0.006, sr);
    let f = f0, vp = 0;
    for (let i = 0; i < n && s + i < dry.length; i++) {
      const x = i / n;
      if (i % frame === 0) f = f0 * Math.pow(f1 / f0, x);
      let vib = 1;
      if (fin) { vp += c.TAU * vr * (1 + 0.15 * Math.sin(x * 7 + vph)) / sr; vib = 1 + vd * x * Math.sin(vp); }
      ph += f * vib / sr; ph -= Math.floor(ph);
      ph2 += f * vib / (2 * sr); ph2 -= Math.floor(ph2);
      let e = i < a ? i / a : (i < gn ? 1 - 0.3 * (i - a) / gn : Math.max(0, 0.7 - 0.7 * (i - gn) / rel));
      if (fin) { const q = 1 - x; e *= q * q; }
      dry[s + i] += ((ph < duty ? 0.7 : -0.7) + 0.35 * (4 * Math.abs(ph2 - 0.5) - 1)) * e * amp;
    }
  }
  c.filter(dry, c.biquad("hp", 45, 0.7, sr));
  c.filter(dry, c.biquad("lp", Math.min(9000, sr * 0.42), 0.7, sr));
  const out = new Float32Array(c.seconds(core + (p.tail ? 3 * delay + 0.04 : 0.02), sr));
  c.mix(out, dry, 0, 1, sr);
  if (p.tail) {
    const tailSrc = dry.slice(c.seconds(lastGroup, sr));
    for (let e = 1; e <= 3; e++) {
      const cp = Float32Array.from(tailSrc);
      c.filter(cp, c.biquad("lp", 3400 / e, 0.7, sr));
      c.mix(out, cp, lastGroup + delay * e, 0.45 * Math.pow(0.5, e - 1), sr);
    }
  }
  c.fade(c.finish(out, 0.9), 10, sr);
  return { samples: out };
}
