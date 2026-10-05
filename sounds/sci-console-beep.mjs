// Console beep: a starship-bridge confirm tone. The body is an additive band-limited voice (pure sine, clean odd-harmonic square or struck glass modes with per-mode decay); a faint hp tick marks the key, and an optional soft slap plus room wash forms the tail. The render is trimmed to the audible event.
export const meta = {
  title: "Bridge Beep", kind: "sfx", format: "sound", duration: 0.6, price: 1, author: "quietmachine", payout: "quietmachine@creators.oasis.example", kit: "Sci-fi Console", description: "A short, clean sci-fi console beep with knobs for tone, pitch, brightness, decay and a bridge room tail; every seed is a slightly different key press for starship UIs and terminals.",
  tags: ["beep", "console", "sci-fi", "ui", "computer", "starship", "terminal", "blip"],
};
export const params = { knobs: {
  tone: { type: "choice", label: "Tone", default: "sine", options: ["sine", "square", "glass"] },
  pitch: { type: "range", label: "Pitch (Hz)", default: 1200, min: 300, max: 2400, step: 10 },
  brightness: { type: "range", label: "Brightness", default: 0.5, min: 0, max: 1, step: 0.01 },
  decay: { type: "range", label: "Decay", default: 0.35, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Bridge tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, tones = params.knobs.tone.options;
  const r = c.rng(p.seed * 613 + tones.indexOf(p.tone) * 97 + 3);
  const b = p.brightness, d = p.decay, f = p.pitch * (0.995 + r() * 0.01), ny = Math.min(sr * 0.45, 9500);
  const glass = p.tone === "glass";
  const hold = 0.04 + 0.16 * d, rel = 0.015 + 0.12 * d, tau = 0.06 + 0.45 * d;
  const beepDur = glass ? tau * 5 + 0.01 : hold + rel * 6 + 0.01, nb = c.seconds(beepDur, sr);
  let parts = [];
  if (p.tone === "sine") {
    parts = [[1, 1, 0], [2, 0.06 + 0.3 * b, 0], [3, 0.18 * b * b, 0]];
  } else if (p.tone === "square") {
    const duty = 0.47 + r() * 0.03, fc = f * (2 + 8 * b);
    for (let k = 1; k <= 25; k++) parts.push([k, Math.sin(Math.PI * k * duty) / k / (1 + (k * f / fc) * (k * f / fc)), 0]);
  } else {
    const tw = 1.0006 + r() * 0.0006;
    parts = [[1, 1, tau], [tw, 0.4, tau * 0.9], [2.76, 0.12 + 0.4 * b, tau * 0.55], [2.76 * tw, 0.08 + 0.2 * b, tau * 0.5],
      [5.4, 0.28 * b, tau * 0.35], [8.93, 0.14 * b, tau * 0.22]];
  }
  parts = parts.filter(([q, a]) => q * f < ny && Math.abs(a) > 0.004);
  const R = parts.map((x) => x[0]), G = parts.map((x) => x[1]);
  const D = parts.map((x) => (x[2] ? Math.exp(-1 / (x[2] * sr)) : 1));
  const O = parts.map(() => (glass ? r() * c.TAU : 0)), np = parts.length;
  const body = new Float32Array(nb), hs = c.seconds(hold, sr), kr = Math.exp(-1 / (rel * sr));
  const atkN = Math.max(1, (0.001 + r() * 0.0015) * sr), ks = Math.exp(-1 / (0.006 * sr));
  let sc = 0.012 + r() * 0.025, ph = 0, e = 1;
  const w0 = c.TAU * f / sr;
  for (let i = 0; i < nb; i++) {
    ph += w0 * (1 + sc); sc *= ks;
    let s = 0;
    for (let j = 0; j < np; j++) { s += G[j] * Math.sin(R[j] * ph + O[j]); G[j] *= D[j]; }
    if (!glass && i > hs) e *= kr;
    body[i] = s * e * Math.min(1, i / atkN);
  }
  c.mix(body, c.burst(r, 0.004, "hp", 2500 + 5000 * b, 0.8, 0.0004, 0.0012, sr), 0, (glass ? 0.18 : 0.05) + 0.12 * b, sr);
  const n = nb + (p.tail ? c.seconds(0.9 + 0.6 * d, sr) : c.seconds(0.03, sr));
  let out = new Float32Array(n);
  c.mix(out, body, 0, 1, sr);
  if (p.tail) {
    const echo = Float32Array.from(body);
    c.filter(echo, c.biquad("lp", 1800 + 2500 * b, 0.7, sr));
    c.mix(out, echo, 0.09 + r() * 0.04, 0.2, sr);
    const wet = c.reverb(out, { size: 0.5, decay: 0.3 + 0.35 * d, mixAmt: 0.22 }, sr);
    if (wet && wet.length) out = wet.length === n ? wet : Float32Array.from({ length: n }, (_, i) => wet[i] || 0);
  }
  c.filter(out, c.biquad("hp", 60, 0.7, sr));
  c.finish(out, 0.9);
  let last = out.length - 1;
  while (last > 0 && Math.abs(out[last]) < 0.003) last--;
  const m = Math.min(out.length, last + c.seconds(0.012, sr)), res = out.slice(0, m), fl = Math.min(m, c.seconds(0.012, sr));
  for (let j = 0; j < fl; j++) res[m - 1 - j] *= j / fl;
  return { samples: res };
}
