// Horror drone bed: a loopable 4 s sub drone. Layers: a clean beating sub pair, a tone body per choice (organ drawbars, buzzy sweeping saws, bowed saws with bow scrape), a dissonant partial that grows with beating, a breathing dark air bed and an optional crossfaded seam.
export const meta = {
  title: "Hollow House Drone", kind: "ambience", format: "sound", duration: 4, price: 5, author: "stormfront", payout: "stormfront@creators.oasis.example", kit: "Horror House", description: "A loopable sub drone that fills an abandoned house, with organ, synth or bowed tone, beating partials and a slow breathing swell; for horror exploration beds and tension under a scene.",
  tags: ["drone", "horror", "sub", "ambience", "loop", "dark", "tension", "haunted"],
};
export const params = { knobs: {
  tone: { type: "choice", label: "Tone", default: "organ", options: ["organ", "synth", "bowed"] },
  depth: { type: "range", label: "Depth", default: 0.6, min: 0, max: 1, step: 0.01 },
  beating: { type: "range", label: "Beating", default: 0.5, min: 0, max: 1, step: 0.01 },
  pitch: { type: "range", label: "Pitch", default: 55, min: 30, max: 110, step: 1 },
  crossfade: { type: "toggle", label: "Loop crossfade", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, dur = 4, n = c.seconds(dur, sr), r = c.rng(p.seed * 389 + params.knobs.tone.options.indexOf(p.tone) * 53 + 3);
  const L = n + c.seconds(0.5, sr), body = new Float32Array(L), f0 = p.pitch, T = c.TAU;
  const spec = {
    organ: [["sine", 1, 1], ["sine", 2, 0.7], ["sine", 3, 0.55], ["sine", 4, 0.4], ["sine", 6, 0.3], ["sine", 8, 0.18]],
    synth: [["saw", 1, 0.8], ["saw", 1.006, 0.7], ["square", 2, 0.5], ["saw", 3.01, 0.35]],
    bowed: [["saw", 1, 0.8], ["saw", 1.004, 0.6], ["tri", 2, 0.5], ["saw", 3, 0.3], ["saw", 5, 0.15]],
  }[p.tone];
  const bow = p.tone === "bowed";
  for (const [shape, h, a] of spec) {
    const det = 1 + (r() - 0.5) * 0.004, wob = 0.25 + r() * 0.4, wph = r() * 6;
    const o = c.osc(shape, (t) => f0 * h * det * (1 + (bow ? 0.006 * Math.sin(T * 4.5 * t + wph) : 0) + 0.002 * Math.sin(T * wob * t + wph)), L, sr, { phase: r() });
    c.mix(body, o, 0, a * 0.3, sr);
  }
  const beat = 0.2 + 3.3 * p.beating;
  const bd = c.osc("sine", f0 * 2.0 * 1.0595 + beat, L, sr);
  for (let i = 0; i < L; i++) body[i] += bd[i] * 0.22 * p.beating * (0.5 + 0.5 * Math.sin(T * i / sr / dur * 2 + 1));
  const base = { organ: 380, synth: 2200, bowed: 1100 }[p.tone], c1 = c.onepole(sr), c2 = c.onepole(sr);
  const ph = r() * 6, out = new Float32Array(L);
  for (let i = 0; i < L; i++) {
    const t = i / sr, sw = 0.55 + 0.45 * Math.sin(T * t / dur + ph);
    const fc = (120 + base * (1 - 0.7 * p.depth)) * sw;
    out[i] = c2(c1(body[i], fc), fc * 1.3);
  }
  const sub = c.osc("sine", f0 * 0.5, L, sr), sub2 = c.osc("sine", f0 * 0.5 + beat * 0.4, L, sr), subG = 0.15 + 0.5 * p.depth;
  for (let i = 0; i < L; i++) out[i] += (sub[i] + sub2[i]) * 0.5 * subG;
  const air = c.pink(r, L), alp = c.biquad("lp", 420, 0.7, sr), ahp = c.biquad("hp", 60, 0.7, sr);
  for (let i = 0; i < L; i++) out[i] += ahp(alp(air[i])) * (bow ? 0.55 : 0.3) * (0.55 + 0.45 * Math.sin(T * 2 * i / sr / dur + 2));
  if (bow) {
    const sc = c.noise(r, L), bp = c.biquad("bp", f0 * 7, 2.5, sr), bp2 = c.biquad("bp", f0 * 13, 3, sr);
    for (let i = 0; i < L; i++) { const t = i / sr; out[i] += (bp(sc[i]) * 0.35 + bp2(sc[i]) * 0.2) * (0.35 + 0.65 * Math.max(0, Math.sin(T * 3 * t / dur + 1))); }
  }
  const res = new Float32Array(n), xf = p.crossfade ? c.seconds(0.5, sr) : 0;
  for (let i = 0; i < n; i++) res[i] = out[i];
  for (let i = 0; i < xf; i++) { const w = i / xf; res[i] = out[i] * w + out[n + i] * (1 - w); }
  c.fade(res, 10, sr);
  c.finish(res, 0.85, 1.1);
  return { samples: res };
}
