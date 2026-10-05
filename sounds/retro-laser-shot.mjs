// Retro laser shot: a naive 8-bit oscillator swept down on a decelerating seeded curve with vibrato, crushed by sample-hold and bit quantising, a bright contact click, and optional discrete darkening echo repeats.
export const meta = {
  title: "Pixel Zap Laser", kind: "sfx", format: "sound", duration: 0.45, price: 2, author: "quietmachine", payout: "quietmachine@creators.oasis.example", kit: "Retro Arcade", description: "A falling-pitch 8-bit zap for blasters, shots and space shooters; waveform, start pitch, sweep depth, grit, sweep rate and an echo tail are knobs, and every seed is a slightly different shot.",
  tags: ["laser", "zap", "retro", "8-bit", "arcade", "chiptune", "shoot", "blaster"],
};
export const params = { knobs: {
  waveform: { type: "choice", label: "Waveform", default: "square", options: ["square", "saw", "pulse12"] },
  pitch: { type: "range", label: "Start pitch (Hz)", default: 1400, min: 300, max: 3000, step: 10 },
  depth: { type: "range", label: "Sweep depth", default: 0.7, min: 0, max: 1, step: 0.01 },
  grit: { type: "range", label: "Grit", default: 0.2, min: 0, max: 1, step: 0.01 },
  rate: { type: "range", label: "Sweep rate", default: 1, min: 0.5, max: 3, step: 0.05 },
  echo: { type: "toggle", label: "Echo tail", default: false },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, wf = p.waveform, r = c.rng(p.seed * 6271 + params.knobs.waveform.options.indexOf(wf) * 101 + 3);
  const T = (0.34 / p.rate) * c.between(r, 0.9, 1.1), f0 = p.pitch * c.between(r, 0.96, 1.04);
  const oct = Math.min((0.9 + 4.1 * p.depth) * c.between(r, 0.92, 1.08), Math.log2(f0 / 40));
  const nT = c.seconds(T, sr), dry = new Float32Array(nT);
  const gd = Math.pow(c.between(r, 0.12, 0.4), 1 / nT), L = oct * Math.LN2;
  let g = L * (1 - gd) / (1 - Math.pow(gd, nT));
  const hold = 1 + Math.round(p.grit * 7 * sr / 22050), q = 3 + Math.round(60 * (1 - p.grit) * (1 - p.grit)), nz = 0.3 * p.grit;
  let vr = c.between(r, 22, 42), vd = 0.006 + 0.018 * r(), vph = r() * c.TAU;
  let f = f0, ph = r(), ph2 = 0, held = 0, hc = 0;
  const att = 0.0015 * sr, blip = wf === "saw" ? c.seconds(0.006, sr) : 0;
  for (let i = 0; i < nT; i++) {
    const lin = 1 - i / nT, e = Math.min(1, i / att) * lin * (0.35 + 0.65 * lin);
    if (i % 512 === 0) { vr = c.clamp(vr + (r() - 0.5) * 4, 15, 50); vd = c.clamp(vd + (r() - 0.5) * 0.004, 0.003, 0.03); }
    vph += c.TAU * vr / sr;
    const up = i < blip ? 1 + 0.25 * (i / blip) : 1;
    const fi = f * up * (1 + vd * Math.sin(vph));
    ph += fi / sr; ph -= Math.floor(ph);
    ph2 += fi * 0.5 / sr; ph2 -= Math.floor(ph2);
    let s;
    if (wf === "saw") s = 2 * ph - 1;
    else if (wf === "pulse12") s = ph < 0.125 + 0.12 * (i / nT) ? 1 : -1;
    else s = 0.75 * (ph < 0.5 ? 1 : -1) + 0.25 * (ph2 < 0.5 ? 1 : -1);
    f *= Math.exp(-g); g *= gd;
    if (hc-- <= 0) { hc = hold - 1; held = s + (r() * 2 - 1) * nz; }
    dry[i] = (Math.round(held * q) / q) * e;
  }
  const cut = { square: 7000, saw: 10500, pulse12: 4800 }[wf];
  c.filter(dry, c.biquad("lp", Math.min(cut, sr * 0.45), 0.8, sr));
  c.filter(dry, c.biquad("hp", 40, 0.7, sr));
  if (wf === "pulse12") c.gain(dry, 1.3);
  const reps = p.echo ? 3 : 0, d = Math.max(0.1, T * c.between(r, 0.5, 0.62));
  const out = new Float32Array(c.seconds(0.004 + T + reps * d * 1.03 + 0.04, sr));
  c.mix(out, dry, 0.002, 1, sr);
  c.mix(out, c.burst(r, 0.006, "hp", Math.min(2500 + 2500 * p.grit, sr * 0.4), 0.7, 0.0004, 0.0018, sr), 0, 0.25 + 0.3 * p.grit, sr);
  for (let j = 1; j <= reps; j++) {
    const cp = Float32Array.from(dry);
    c.filter(cp, c.biquad("lp", Math.min(4200 / j, sr * 0.45), 0.7, sr));
    c.mix(out, cp, 0.002 + j * d * c.between(r, 0.98, 1.03), 0.5 * Math.pow(0.5, j - 1), sr);
  }
  c.fade(c.finish(out, 0.9, 1.1), 8, sr);
  return { samples: out };
}
