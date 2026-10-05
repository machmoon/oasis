// Retro power-up: a fast ascending chiptune arpeggio of pulse+triangle notes with 8-bit pitch blips landing on a held vibrato climax, plus an optional shimmer layer (ascending octave sparkles with their own echo and reverb) that keeps the arp itself crisp.
export const meta = {
  title: "Rising Power-Up",
  kind: "sfx",
  format: "sound",
  description: "A fast ascending 8-bit arpeggio that climbs to a held vibrato note; scale, pitch, brightness, length, arp rate and a sparkling shimmer tail are knobs, for power-ups, level-ups and item pickups.",
  tags: ["power-up", "arpeggio", "chiptune", "8-bit", "arcade", "retro", "level-up", "pickup"],
  price: 3,
  author: "quietmachine", payout: "quietmachine@creators.oasis.example", kit: "Retro Arcade",
  duration: 1.2,
};

export const params = {
  knobs: {
    scale: { type: "choice", label: "Scale", default: "major", options: ["major", "pentatonic", "whole-tone"] },
    pitch: { type: "range", label: "Pitch", default: 0.5, min: 0, max: 1, step: 0.01 },
    brightness: { type: "range", label: "Brightness", default: 0.6, min: 0, max: 1, step: 0.01 },
    length: { type: "range", label: "Length", default: 0.4, min: 0, max: 1, step: 0.01 },
    rate: { type: "range", label: "Arp rate (notes/s)", default: 22, min: 10, max: 40, step: 0.5 },
    shimmer: { type: "toggle", label: "Shimmer tail", default: true },
    seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
  },
};

export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 4513 + params.knobs.scale.options.indexOf(p.scale) * 97 + 3);
  const sc = { major: [0, 2, 4, 5, 7, 9, 11], pentatonic: [0, 2, 4, 7, 9], "whole-tone": [0, 2, 4, 6, 8, 10] }[p.scale];
  const L = sc.length, base = 170 * Math.pow(2, p.pitch * 1.6) * c.between(r, 0.985, 1.015);
  const start = Math.floor(r() * 3), land = [0, 4, 7][Math.floor(r() * 3)] % L;
  let count = Math.max(4, Math.round((1 + 1.5 * p.length) * L));
  while ((count - 1 + start) % L !== land && count < 40) count++;
  const step = 1 / (p.rate * c.between(r, 0.96, 1.04));
  const finalLen = 0.18 + 0.32 * p.length, tail = p.shimmer ? 0.8 : 0.06;
  const arpEnd = (count - 1) * step, n = c.seconds(arpEnd + finalLen + tail + 0.02, sr), out = new Float32Array(n);
  const duty0 = 0.5 - 0.33 * p.brightness, vRate = c.between(r, 5, 7), vDepth = c.between(r, 0.006, 0.014);
  const extra = p.scale === "pentatonic" ? 1 : p.scale === "whole-tone" ? 2 : 0;
  const voice = (f, len, last) => {
    const m = c.seconds(len + 0.012, sr), b = new Float32Array(m);
    const duty = c.clamp(duty0 + (r() - 0.5) * 0.06, 0.1, 0.5), k = Math.exp(-1 / ((last ? len * 0.5 : len * 0.9) * sr));
    let ph = 0, ph2 = r(), e = 1;
    for (let i = 0; i < m; i++) {
      const t = i / sr;
      let fi = f * (1 - 0.06 * Math.exp(-t / 0.004));
      if (last) fi *= 1 + vDepth * Math.min(1, t / 0.08) * Math.sin(c.TAU * vRate * t * (1 + 0.15 * t));
      ph = (ph + fi / sr) % 1;
      let s = (ph < duty ? 0.6 : -0.6) + 0.45 * (4 * Math.abs(ph - 0.5) - 1);
      if (extra === 1) { ph2 = (ph2 + 2 * fi / sr) % 1; s += ph2 < 0.5 ? 0.22 : -0.22; }
      else if (extra === 2) { ph2 = (ph2 + fi * 1.008 / sr) % 1; s += ph2 < duty ? 0.4 : -0.4; }
      e *= k;
      const rel = t > len ? Math.max(0, 1 - (t - len) / 0.01) : 1;
      b[i] = s * e * rel * Math.min(1, t / 0.0008);
    }
    return b;
  };
  let lastF = base;
  for (let j = 0; j < count; j++) {
    const d = j + start, semis = sc[d % L] + 12 * Math.floor(d / L);
    const f = base * Math.pow(2, semis / 12) * (1 + (r() - 0.5) * 0.008), last = j === count - 1;
    if (last) lastF = f;
    const at = j * step + (j && !last ? (r() - 0.5) * 0.06 * step : 0);
    c.mix(out, voice(f, last ? finalLen : step * 0.88, last), Math.max(0, at), last ? 0.95 : 0.55 + 0.2 * j / count, sr);
  }
  c.filter(out, c.biquad("hp", 45, 0.7, sr));
  c.filter(out, c.biquad("lp", 1800 + 8000 * p.brightness, 0.7, sr));
  if (p.shimmer) {
    const sh = new Float32Array(n), sStep = step * c.between(r, 0.6, 0.8), sparks = 5 + Math.floor(r() * 3);
    for (let s = 0; s < sparks; s++) {
      const semis = sc[(land + s) % L] - sc[land] + 12 * (1 + Math.floor((land + s) / L) - Math.floor(land / L));
      const f = Math.min(lastF * Math.pow(2, semis / 12) * c.between(r, 0.997, 1.003), sr * 0.42);
      c.mix(sh, c.ring([[f, 1], [f * 1.005, 0.5], [Math.min(f * 2, sr * 0.45), 0.2]], 0.45, c.between(r, 0.06, 0.12), sr), arpEnd + 0.02 + s * sStep, (0.22 - 0.02 * s) * c.between(r, 0.8, 1.1), sr);
    }
    const dry = sh.slice(), dl = c.between(r, 0.09, 0.12);
    c.mix(sh, dry, dl, 0.35, sr); c.mix(sh, dry, 2 * dl, 0.14, sr);
    const wet = c.reverb(sh, { size: 0.55, decay: 0.4, mixAmt: 0.45 }, sr);
    if (wet && wet !== sh) sh.set(wet.subarray(0, n));
    c.filter(sh, c.biquad("hp", 1200, 0.7, sr));
    c.mix(out, sh, 0, 0.9, sr);
  }
  const fl = c.seconds(p.shimmer ? 0.25 : 0.03, sr);
  for (let i = 0; i < fl; i++) out[n - fl + i] *= 0.5 + 0.5 * Math.cos(Math.PI * i / fl);
  c.finish(out, 0.9);
  c.fade(out, 6, sr);
  return { samples: out };
}
