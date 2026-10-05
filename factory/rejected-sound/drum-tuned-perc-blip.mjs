// Tuned perc blip: a drum-machine zap/marimba one-shot. A tuned body with a visible pitch chirp, a woody mallet click, bar-style inharmonic partials (1 : 4 : 9.9) that give the bright strike, seed-varied detune and strike; an optional room tail made from the dry hit; length follows decay.
export const meta = {
  title: "Tuned Perc Blip", kind: "sfx", format: "sound", duration: 0.7, price: 2, author: "kickdrum", payout: "kickdrum@creators.oasis.example", kit: "Drum Machine", description: "A tuned analogue percussion one-shot between a laser zap and a marimba tap, with wave, pitch, decay, pitch-sweep, resonance and room tail as knobs, for drum-machine patterns and musical stingers.",
  tags: ["perc", "tuned", "zap", "marimba", "drum-machine", "blip", "one-shot", "analogue"],
};
export const params = { knobs: {
  wave: { type: "choice", label: "Wave", default: "sine", options: ["sine", "triangle", "fm"] },
  pitch: { type: "range", label: "Pitch", default: 0.5, min: 0, max: 1, step: 0.01 },
  decay: { type: "range", label: "Decay", default: 0.4, min: 0, max: 1, step: 0.01 },
  pitchEnv: { type: "range", label: "Pitch env", default: 0.5, min: 0, max: 1, step: 0.01 },
  resonance: { type: "range", label: "Resonance", default: 0.5, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Room tail", default: false },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + params.knobs.wave.options.indexOf(p.wave) * 29 + 3);
  const semis = Math.round(p.pitch * 24) + (r() - 0.5) * 0.5;
  const base = 330 * Math.pow(2, (semis - 5) / 12);
  const dec = 0.05 + 0.2 * p.decay;
  const bodyDur = dec * 3 + 0.06, tailLen = p.tail ? 0.3 : 0.02;
  const n = c.seconds(bodyDur + tailLen, sr), out = new Float32Array(n);
  const sweep = 0.15 + 2.2 * p.pitchEnv, sweepT = 0.012 + 0.03 * p.pitchEnv;
  const f = (t) => base * (1 + sweep * Math.exp(-t / sweepT));
  const bodyN = c.seconds(bodyDur, sr);
  let body = new Float32Array(bodyN);
  const ratio = 2.0 + r() * 1.5;
  if (p.wave === "fm") {
    let ph = 0, pm = 0;
    for (let i = 0; i < bodyN; i++) {
      const t = i / sr, fr = f(t);
      ph += c.TAU * fr / sr; pm += c.TAU * base * Math.round(ratio) / sr;
      const idx = (0.4 + 1.2 * p.resonance) * Math.exp(-t / (dec * 0.25));
      body[i] = Math.sin(ph + idx * Math.sin(pm));
    }
  } else {
    body = c.osc(p.wave === "triangle" ? "tri" : "sine", f, bodyN, sr);
    if (p.wave === "triangle") c.filter(body, c.biquad("lp", base * 5, 0.8, sr));
  }
  const e = c.env(bodyN, 0.001, dec, sr);
  for (let i = 0; i < bodyN; i++) body[i] *= e[i];
  c.mix(out, body, 0, 0.7, sr);
  const rg = 0.3 + 0.7 * p.resonance;
  const modes = [[base * 4 * (0.99 + r() * 0.02), 1 * rg], [base * 9.9 * (0.99 + r() * 0.02), 0.7 * rg], [base * 15.6 * (0.99 + r() * 0.02), 0.35 * rg]];
  c.mix(out, c.ring(modes, dec * 1.2, dec * (0.15 + 0.3 * p.resonance), sr), 0.0005, 0.6, sr);
  c.mix(out, c.burst(r, 0.01, "bp", 2500 + r() * 2500 + base * 2, 1.0, 0.0003, 0.003, sr), 0, 0.5, sr);
  c.mix(out, c.burst(r, 0.006, "hp", 4000, 0.8, 0.0003, 0.0015, sr), 0, 0.3, sr);
  const dry = out.slice();
  c.filter(out, c.biquad("lp", 10000, 0.7, sr));
  if (p.tail) {
    const wet = c.reverb(dry, { size: 0.4, decay: 0.35, mixAmt: 1 }, sr);
    c.filter(wet, c.biquad("hp", 250, 0.7, sr));
    for (let i = 0; i < n; i++) out[i] += wet[i] * 0.3;
  }
  c.fade(out, 14, sr);
  c.finish(out, 0.88, 1.05);
  c.fade(out, 8, sr);
  return { samples: out };
}
