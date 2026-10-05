// Ghost whisper: an unintelligible breathy phrase of syllable grains (noise through moving formant bandpasses, with a faint breathy voiced hum), partly time-reversed, with a slow tremolo "pan motion" and a dark comb-feedback tail.
export const meta = {
  title: "Ghost Whisper", kind: "sfx", format: "sound", duration: 3.2, price: 4, author: "hollowbody", payout: "hollowbody@creators.oasis.example", kit: "Horror House", description: "An unintelligible whispered phrase drifting past in the dark; for haunted-house scares, spectral presences and creeping dread in games and film.",
  tags: ["whisper", "ghost", "horror", "voice", "haunted", "creepy", "breath", "spectral"],
};
export const params = { knobs: {
  voice: { type: "choice", label: "Voice", default: "child", options: ["child", "adult", "choir"] },
  intensity: { type: "range", label: "Intensity", default: 0.5, min: 0, max: 1, step: 0.01 },
  reverse: { type: "range", label: "Reverse amount", default: 0.3, min: 0, max: 1, step: 0.01 },
  pan: { type: "range", label: "Pan motion", default: 0.5, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + params.knobs.voice.options.indexOf(p.voice) * 71 + 3);
  const dur = 3.2, n = c.seconds(dur, sr), body = new Float32Array(n);
  const v = { child: [1.35, 260], adult: [1, 120], choir: [0.9, 180] }[p.voice];
  const syl = Math.round(7 + 6 * p.intensity);
  let t = 0.15;
  for (let s = 0; s < syl && t < 2.2; s++) {
    const len = 0.07 + r() * 0.13, f1 = (350 + r() * 500) * v[0], f2 = (1200 + r() * 1500) * v[0], f3 = 2800 * v[0] + r() * 1500;
    const m = c.seconds(len, sr), x = c.noise(r, m);
    const b1 = c.biquad("bp", f1, 5, sr), b2 = c.biquad("bp", f2, 6, sr), b3 = c.biquad("bp", f3, 4, sr);
    const hum = p.voice === "choir" ? 0.5 : 0.18, ph = r() * 6, f0 = v[1] * (0.9 + r() * 0.2);
    const e = c.adsr(m, { attack: 0.25 * len, sustain: 0.5, decay: 0.45 * len, punch: 0 }, sr);
    for (let i = 0; i < m; i++) {
      const tt = i / sr, a = x[i];
      const voiced = Math.sin(c.TAU * f0 * tt + ph) + 0.5 * Math.sin(c.TAU * 2 * f0 * tt + ph);
      const src = a * (1 - hum) + a * voiced * hum * 2;
      x[i] = (b1(src) * 1.2 + b2(src) * 0.9 + b3(src) * 0.5) * e[i];
    }
    c.mix(body, x, t, (0.5 + 0.5 * r()) * (0.5 + 0.5 * p.intensity), sr);
    if (r() < 0.5) c.mix(body, c.burst(r, 0.04, "hp", 5500, 1, 0.004, 0.015, sr), Math.max(0, t - 0.01), 0.12 + 0.2 * p.intensity, sr);
    t += len + 0.02 + r() * (r() < 0.2 ? 0.3 : 0.08);
  }
  const rl = Math.min(n, c.seconds(Math.min(2.4, t + 0.1), sr));
  const phrase = body.slice(0, rl);
  const a0 = Math.floor(rl * 0.15), rlen = Math.floor(rl * 0.7 * p.reverse);
  for (let i = 0; i < rlen; i++) phrase[a0 + i] = body[a0 + rlen - 1 - i];
  const air = c.pink(r, n), hpf = c.biquad("hp", 1500, 0.7, sr);
  for (let i = 0; i < n; i++) air[i] = hpf(air[i]) * 0.03 * (0.5 + 0.5 * Math.sin(i / sr * 1.7));
  const out = new Float32Array(n);
  c.mix(out, phrase, 0.1, 1, sr);
  c.mix(out, air, 0, 0.5 + p.intensity, sr);
  const rate = 0.6 + 1.4 * r(), ph0 = r() * 6;
  for (let i = 0; i < n; i++) out[i] *= 1 - p.pan * (0.5 + 0.5 * Math.sin(c.TAU * rate * i / sr + ph0)) * 0.85;
  const rt = p.tail ? 1.4 : 0.25, wetG = p.tail ? 0.7 : 0.25, sz = p.tail ? 1.3 : 0.7;
  const wet = new Float32Array(n);
  [0.0297, 0.0371, 0.0411, 0.0437].forEach((d0) => {
    const d = Math.max(8, Math.round(d0 * sz * sr)), g = Math.pow(0.001, d0 * sz / rt), buf = new Float32Array(d);
    let k = 0, lpv = 0;
    for (let i = 0; i < n; i++) {
      lpv += 0.45 * (buf[k] - lpv);
      const y = out[i] + g * lpv;
      wet[i] += buf[k] * 0.25;
      buf[k] = y;
      if (++k >= d) k = 0;
    }
  });
  for (let i = 0; i < n; i++) out[i] += wet[i] * wetG;
  c.filter(out, c.biquad("lp", p.voice === "adult" ? 4000 : 6500, 0.7, sr));
  c.fade(out, p.tail ? 150 : 40, sr);
  c.finish(out, 0.8, 1);
  return { samples: out };
}
