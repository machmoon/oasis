// Horror stinger: a jump-scare orchestral hit. Layers: a sub thump, a sharp noise-crash and click on the downbeat, a held dissonant chord (strings: bowed detuned saws with a rising shriek; brass: slow-opening blat through a formant; synth: gated detuned squares with a pitch dive) that sustains then releases, and an optional reverb tail.
export const meta = {
  title: "Orchestral Stinger", kind: "impact", format: "sound", duration: 2.4, price: 4, author: "hollowbody", payout: "hollowbody@creators.oasis.example", kit: "Horror House", description: "A jump-scare orchestral stab: a sharp crash, then a held dissonant strings, brass or synth chord with a shrieking top end, with dissonance, intensity, noise, pitch and a reverb tail as knobs, for the moment something lunges out of the dark.",
  tags: ["stinger", "jump-scare", "horror", "orchestral", "stab", "hit", "dissonant", "trailer"],
};
export const params = { knobs: {
  palette: { type: "choice", label: "Palette", default: "strings", options: ["strings", "brass", "synth"] },
  intensity: { type: "range", label: "Intensity", default: 0.7, min: 0, max: 1, step: 0.01 },
  dissonance: { type: "range", label: "Dissonance", default: 0.7, min: 0, max: 1, step: 0.01 },
  noise: { type: "range", label: "Noise layer", default: 0.5, min: 0, max: 1, step: 0.01 },
  pitch: { type: "range", label: "Pitch", default: 0.5, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Reverb tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, pal = p.palette, I = p.intensity, D = p.dissonance, r = c.rng(p.seed * 613 + params.knobs.palette.options.indexOf(pal) * 97 + 3);
  const n = c.seconds(p.tail ? 2.4 : 1.3, sr), out = new Float32Array(n);
  const root = 110 * Math.pow(2, p.pitch * 1.2) * (0.985 + r() * 0.03) * (pal === "brass" ? 0.75 : 1);
  const hold = { strings: 0.38, brass: 0.3, synth: 0.42 }[pal] * (0.85 + 0.3 * r()), rel = (p.tail ? 0.5 : 0.18) * { strings: 1.2, brass: 0.8, synth: 0.6 }[pal];
  const total = hold + rel * 2.2;
  c.mix(out, c.ring([[46 + 20 * p.pitch, 1], [92 + 40 * p.pitch, 0.25]], 0.5, 0.1 + 0.08 * I, sr), 0.001, 0.4 + 0.4 * I, sr);
  const cons = [1, 1.5, 2, 2.5, 3], dis = [1, 1.0595, 1.4142, 1.5874, 2.1189];
  const m = c.seconds(total, sr), stab = new Float32Array(m), shape = pal === "synth" ? "square" : "saw";
  for (let k = 0; k < 5; k++) {
    const q = cons[k] + (dis[k] - cons[k]) * D, f = root * q * (0.997 + r() * 0.006);
    const copies = pal === "brass" ? [1] : [0.994, 1.006];
    copies.forEach((det) => {
      const vib = (pal === "strings" ? 0.006 : 0.0012) + 0.002 * r(), ph = r() * 6, vr = 5 + r() * 2;
      const x = c.osc(shape, (t) => f * det * (1 + vib * Math.sin(ph + t * vr * 6.28) + (pal === "synth" ? 0.3 * Math.exp(-t * 12) : pal === "brass" ? -0.05 * Math.exp(-t * 30) : 0)), m, sr, { phase: r() });
      for (let i = 0; i < m; i++) stab[i] += x[i] * (k === 4 ? 0.6 : 1);
    });
  }
  const lp = c.onepole(sr), fm = c.biquad("bp", root * 6, 2, sr), att = { strings: 0.006, brass: 0.03, synth: 0.002 }[pal], harm = { strings: 4500, brass: 2400, synth: 3500 }[pal];
  for (let i = 0; i < m; i++) {
    const t = i / sr, open = pal === "brass" ? 1 - 0.75 * Math.exp(-t * 28) : 1;
    const cut = 300 + harm * (0.35 + 0.8 * I) * open * (0.55 + 0.45 * Math.exp(-t * 5));
    let e = Math.min(1, t / att) * (t < hold ? 1 - 0.25 * t / hold : 0.75 * Math.exp(-(t - hold) / rel));
    e *= Math.min(1, (total - t) / 0.05);
    let s = lp(stab[i], cut);
    if (pal === "brass") s = s * 0.5 + fm(s) * 1.5;
    stab[i] = s * e;
  }
  c.mix(out, stab, 0, 0.13 * (0.6 + 0.6 * I), sr);
  if (pal !== "brass") {
    const q = c.seconds(0.6, sr), sh = c.osc(pal === "strings" ? "saw" : "sine", pal === "strings" ? (t) => root * 18 * (1 + 0.5 * t) * (1 + 0.008 * Math.sin(t * 45)) : (t) => 4200 * Math.exp(-t * 3.5) + 500, q, sr), bp = c.biquad("bp", pal === "strings" ? root * 22 : 2500, 1.2, sr), e = c.env(q, 0.006, 0.25, sr);
    for (let i = 0; i < q; i++) sh[i] = (pal === "strings" ? bp(sh[i]) : sh[i]) * e[i];
    c.mix(out, sh, 0.01, 0.2 + 0.5 * I, sr);
  } else c.mix(out, c.burst(r, 0.25, "bp", 1500 + 1200 * I, 1.5, 0.01, 0.08, sr), 0.01, 0.3 + 0.4 * I, sr);
  const nn = c.seconds(0.6, sr), z = c.noise(r, nn), ob = c.onepole(sr), hh = c.biquad("hp", 250, 0.7, sr), ne = c.env(nn, 0.001, 0.05 + 0.12 * I, sr);
  for (let i = 0; i < nn; i++) z[i] = hh(ob(z[i], 800 + 9000 * (0.3 + 0.7 * p.noise) * Math.exp(-i / sr * 7))) * ne[i];
  c.mix(out, z, 0, 0.1 + 0.75 * p.noise, sr);
  c.mix(out, c.burst(r, 0.015, "hp", 3500, 0.8, 0.0003, 0.004, sr), 0, 0.5 + 0.5 * I, sr);
  if (p.tail) {
    const rv = c.reverb(out.slice(), { size: 0.9, decay: 0.8, mixAmt: 1 }, sr);
    for (let i = 0; i < n; i++) out[i] = out[i] * 0.85 + rv[i] * 0.4 * Math.exp(-i / sr / 0.8);
  }
  c.fade(out, p.tail ? 120 : 40, sr);
  c.finish(out, 0.9, 1.1 + I);
  return { samples: out };
}
