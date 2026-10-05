// Medieval crowd walla: a very quiet murmur floor under individual talkers (saw glottal source through three sharp formants, phrase pitch contours, haggling call-and-response gaps), rising shouts and bright breathy "ha-ha" laughter runs. Events wrap round the loop point, and the mix is RMS-normalised so every seed sits at the same level.
export const meta = {
  title: "Market Crowd Walla", kind: "ambience", format: "sound", duration: 3, price: 5, author: "stormfront", payout: "stormfront@creators.oasis.example", kit: "Medieval Market", description: "A loopable medieval market crowd bed of murmur, haggling phrases and bursts of laughter, with crowd size, excitement, distance and laughter density as knobs; for square, bazaar and tavern-yard scenes.",
  tags: ["crowd", "walla", "market", "medieval", "haggling", "murmur", "laughter", "loop"],
};
export const params = { knobs: {
  size: { type: "choice", label: "Crowd size", default: "busy", options: ["sparse", "busy", "packed"] },
  excitement: { type: "range", label: "Excitement", default: 0.4, min: 0, max: 1, step: 0.01 },
  distance: { type: "range", label: "Distance", default: 0.3, min: 0, max: 1, step: 0.01 },
  laughter: { type: "range", label: "Laughter density", default: 0.3, min: 0, max: 1, step: 0.01 },
  crossfade: { type: "toggle", label: "Loop crossfade", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + 29), dur = 3, n = c.seconds(dur, sr);
  const far = p.distance, ex = p.excitement, si = params.knobs.size.options.indexOf(p.size), wrap = p.crossfade;
  const talkers = [2, 6, 14][si], vox = new Float32Array(n);
  const vowels = [[700, 1200, 2500], [450, 1800, 2600], [320, 800, 2400], [550, 950, 2500], [400, 2200, 3000], [800, 1300, 2600]];
  const add = (x, at, g) => {
    const s = Math.floor(at * sr);
    for (let i = 0; i < x.length; i++) { const j = s + i; if (wrap) vox[j % n] += x[i] * g; else if (j < n) vox[j] += x[i] * g; }
  };
  const voice = (f0, len, v, fall, breath) => {
    const m = c.seconds(len, sr), vib = 25 + r() * 15, ph = r() * 6;
    const x = c.osc("saw", (t) => f0 * (1 + 0.012 * Math.sin(t * vib + ph)) * (1 + fall * (0.5 - t / len)), m, sr);
    const nz = c.noise(r, m), fs = [c.biquad("bp", v[0], 10, sr), c.biquad("bp", v[1], 12, sr), c.biquad("bp", v[2], 14, sr)];
    const att = Math.max(1, Math.floor(0.015 * sr));
    for (let i = 0; i < m; i++) {
      const s = x[i] + breath * nz[i], e = Math.pow(Math.sin(Math.PI * i / m), 0.6) * Math.min(1, i / att);
      x[i] = (fs[0](s) * 1.2 + fs[1](s) * 1.4 + fs[2](s) * 1.6) * e;
    }
    return x;
  };
  for (let t = 0; t < talkers; t++) {
    const male = r() < 0.6, f0 = (male ? 105 + r() * 35 : 195 + r() * 55) * (1 + 0.25 * ex), sc = (male ? 1 : 1.15) * (0.95 + 0.2 * ex);
    const tg = 0.6 + 0.4 * r(), pace = 1 - 0.3 * ex;
    let at = r() * 0.8;
    while (at < dur - 0.1) {
      const phrase = 3 + Math.floor(r() * 4), contour = r() < 0.25 + 0.4 * ex ? 0.5 : -0.5 - 0.3 * r();
      for (let s = 0; s < phrase; s++) {
        const len = (0.1 + r() * 0.14) * pace, v = vowels[Math.floor(r() * 6)];
        add(voice(f0 * (0.92 + 0.2 * r()), len, [v[0] * sc, v[1] * sc, v[2] * sc], contour * (s / phrase + 0.2), 0.05), at, tg * (0.6 + 0.4 * r()));
        at += len + (0.02 + r() * 0.05) * pace;
      }
      at += (0.25 + r() * 0.7 * (3 - si) / 2) * (1.2 - 0.5 * ex);
    }
  }
  const shouts = Math.round(ex * ex * 4 * (0.6 + 0.4 * si));
  for (let s = 0; s < shouts; s++) {
    const v = vowels[[0, 5, 3][Math.floor(r() * 3)]];
    add(voice((170 + r() * 90) * 1.6, 0.3 + r() * 0.2, [v[0] * 1.2, v[1] * 1.15, v[2]], 0.7, 0.1), r() * dur, 1.8);
  }
  const laughs = p.laughter > 0.03 ? Math.round(p.laughter * 3 * (0.6 + 0.4 * si)) + 1 : 0;
  for (let l = 0; l < laughs; l++) {
    let at = r() * dur;
    const f0 = 270 + r() * 150, hs = 4 + Math.floor(r() * 4), gap = 0.11 + r() * 0.03;
    for (let h = 0; h < hs; h++) {
      add(voice(f0 * (1 - 0.05 * h) * (h === 0 ? 1.15 : 1), 0.075, [900, 1600, 3000], -0.6, 0.5), at, 2 * (1 - h / (hs + 2)));
      at += gap * (1 + 0.07 * h);
    }
  }
  c.filter(vox, c.biquad("lp", 6500 - 5200 * far, 0.7, sr));
  c.filter(vox, c.biquad("hp", 90 + 120 * far, 0.7, sr));
  const xf = c.seconds(0.35, sr), bn = n + (wrap ? xf : 0), raw = c.pink(r, bn);
  const b1 = c.biquad("bp", 500 + 200 * ex, 0.9, sr), bl = c.biquad("lp", 3500 - 2500 * far, 0.7, sr);
  for (let i = 0; i < bn; i++) raw[i] = bl(b1(raw[i]));
  const bed = raw.slice(0, n);
  if (wrap) for (let i = 0; i < xf; i++) { const a = 0.5 * Math.PI * i / xf; bed[i] = raw[i] * Math.sin(a) + raw[n + i] * Math.cos(a); }
  let vs = 1e-9, bs = 1e-9;
  for (let i = 0; i < n; i++) { vs += vox[i] * vox[i]; bs += bed[i] * bed[i]; }
  const vg = 0.2 * (1 - 0.55 * far) / Math.sqrt(vs / n), bg = (0.025 + 0.05 * far) / Math.sqrt(bs / n);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = vox[i] * vg + bed[i] * bg;
  if (!wrap) c.fade(out, 40, sr);
  c.fade(c.finish(out, 0.8, 1.1), wrap ? 4 : 15, sr);
  return { samples: out };
}
