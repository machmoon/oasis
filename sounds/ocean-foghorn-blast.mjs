// Foghorn blast: a harmonic reed stack with a type-specific onset (diaphone grunt-drop, electric swell, whistle chiff), a growl AM layer, air breath, a distance lowpass and an optional harbour echo tail. The file is trimmed to the horn plus its tail, so no seconds of silence are left over.
export const meta = {
  title: "Harbour Foghorn", kind: "sfx", format: "sound", duration: 3, price: 3, author: "stormfront", payout: "stormfront@creators.oasis.example", kit: "Ocean Harbour", description: "A single lighthouse foghorn blast with diaphone, electric or ship-whistle voices; length, growl, distance, pitch and an echoing tail are knobs, for fog-bound harbour scenes.",
  tags: ["foghorn", "horn", "lighthouse", "harbour", "ship", "fog", "maritime", "blast"],
};
export const params = { knobs: {
  horn: { type: "choice", label: "Horn", default: "diaphone", options: ["diaphone", "electric", "ship-whistle"] },
  length: { type: "range", label: "Length", default: 0.5, min: 0, max: 1, step: 0.01 },
  growl: { type: "range", label: "Growl", default: 0.4, min: 0, max: 1, step: 0.01 },
  distance: { type: "range", label: "Distance", default: 0.3, min: 0, max: 1, step: 0.01 },
  pitch: { type: "range", label: "Pitch", default: 0.5, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Echo tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + params.knobs.horn.options.indexOf(p.horn) * 29 + 3), kind = p.horn;
  const hold = (kind === "ship-whistle" ? 0.6 : 0.7) + 1.2 * p.length;
  const att = { diaphone: 0.09, electric: 0.3, "ship-whistle": 0.05 }[kind], rel = kind === "diaphone" ? 0.5 : 0.3;
  const total = c.seconds(hold + rel + (p.tail ? 1.6 : 0.1), sr), out = new Float32Array(total), n = c.seconds(hold + rel, sr);
  const base = { diaphone: 62, electric: 110, "ship-whistle": 190 }[kind] * Math.pow(2, (p.pitch - 0.5) * 1.2) * (0.99 + r() * 0.02);
  const freq = (t) => {
    let f = base * (1 + 0.004 * Math.sin(c.TAU * 4.5 * t + 1));
    if (kind === "diaphone") f *= 1 + 0.35 * Math.exp(-t / 0.25) - 0.08 * Math.max(0, t - hold) / rel;
    else if (kind === "ship-whistle") f *= 1 + 0.04 * Math.exp(-t / 0.08);
    else f *= 1 - 0.03 * Math.max(0, t - hold) / rel;
    return f;
  };
  const amps = { diaphone: [1, 0.8, 0.65, 0.5, 0.4, 0.3, 0.22, 0.15], electric: [1, 0.15, 0.7, 0.1, 0.4, 0.08, 0.2, 0.05], "ship-whistle": [1, 0.55, 0.3, 0.35, 0.12, 0.1, 0.05, 0.03] }[kind];
  const ph = Array.from(amps, () => r() * 6.28), dt = 1 / sr, nz = c.noise(r, n);
  const gl = 28 + 50 * p.growl, gl2 = gl * (1.3 + 0.2 * r()), breath = c.biquad("bp", base * (kind === "ship-whistle" ? 6 : 3), 1.2, sr);
  const bAmt = 0.05 + 0.1 * p.growl + (kind === "ship-whistle" ? 0.1 : 0);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i * dt;
    phase += c.TAU * freq(t) * dt;
    let s = 0;
    for (let h = 0; h < amps.length; h++) s += amps[h] * Math.sin(phase * (h + 1) + ph[h]);
    if (kind === "ship-whistle") s += 0.6 * Math.sin(phase * 1.26 + 1) + 0.4 * Math.sin(phase * 1.503);
    const am = 1 - p.growl * (0.45 + 0.2 * Math.sin(c.TAU * gl2 * t)) * (0.5 + 0.5 * Math.sin(c.TAU * gl * t));
    const ev = Math.min(1, t / att) * (t < hold ? 1 : Math.max(0, 1 - (t - hold) / rel));
    out[i] = (s * am * 0.2 + breath(nz[i]) * bAmt) * ev;
  }
  if (kind === "diaphone") c.mix(out, c.burst(r, 0.12, "lp", 260, 0.8, 0.01, 0.05, sr), 0, 0.5, sr);
  if (kind === "ship-whistle") c.mix(out, c.burst(r, 0.06, "bp", base * 5, 2, 0.004, 0.02, sr), 0, 0.3, sr);
  c.filter(out, c.biquad("lp", 6000 - 5200 * p.distance, 0.7, sr));
  c.fade(out, 8, sr);
  c.finish(out, 0.8, 1.1);
  if (p.tail) {
    const echo = new Float32Array(total);
    for (let k = 1; k <= 3; k++) {
      const cp = Float32Array.from(out.subarray(0, n));
      c.filter(cp, c.biquad("lp", 1400 / k, 0.7, sr));
      c.mix(echo, cp, 0.3 * k + r() * 0.06, 0.5 * Math.pow(0.65, k - 1) * (0.7 + 0.6 * p.distance), sr);
    }
    const rv = c.reverb(echo, { size: 0.8, decay: 1.6, mixAmt: 0.6 }, sr);
    let q = 1e-6;
    for (let i = 0; i < total; i++) q = Math.max(q, Math.abs(rv[i] || 0));
    const g = (0.35 + 0.2 * p.distance) / q;
    for (let i = 0; i < total; i++) out[i] += echo[i] + (rv[i] || 0) * g;
  }
  c.fade(out, 12, sr);
  let pk = 1e-6;
  for (let i = 0; i < total; i++) pk = Math.max(pk, Math.abs(out[i]));
  const top = 0.92 - 0.2 * p.distance, tailN = Math.min(c.seconds(0.4, sr), total >> 2);
  for (let i = 0; i < total; i++) out[i] = Math.tanh(out[i] / pk * 1.1) / Math.tanh(1.1) * top;
  for (let i = 0; i < tailN; i++) out[total - 1 - i] *= i / tailN;
  return { samples: out };
}
