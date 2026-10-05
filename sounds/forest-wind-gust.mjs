// Forest wind gust: one swell of air through the trees. A low pink roar is the body, and a foliage layer (rustling leaf grains, needle fizz or bare-branch knocks) brightens with the gust. Aeolian whistles rise in pitch with wind speed, and a passing sweep (flanging comb plus a brightness arc) carries the motion past the listener.
export const meta = {
  title: "Through the Pines", kind: "sfx", format: "sound", duration: 2.5, price: 2, author: "stormfront", payout: "stormfront@creators.oasis.example", kit: "Forest at Night", description: "A single wind gust that swells through a stand of trees and dies away, with knobs for foliage, strength, length, branch whistle and passing motion, for night-forest scenes, transitions and weather beats.",
  tags: ["wind", "gust", "forest", "trees", "leaves", "whistle", "night", "weather"],
};
export const params = { knobs: {
  foliage: { type: "choice", label: "Foliage", default: "leafy", options: ["bare", "leafy", "conifer"] },
  strength: { type: "range", label: "Strength", default: 0.5, min: 0, max: 1, step: 0.01 },
  duration: { type: "range", label: "Duration", default: 0.5, min: 0, max: 1, step: 0.01 },
  whistle: { type: "range", label: "Whistle", default: 0.4, min: 0, max: 1, step: 0.01 },
  pan: { type: "range", label: "Pan motion", default: 0.5, min: 0, max: 1, step: 0.01 },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, fi = params.knobs.foliage.options.indexOf(p.foliage), r = c.rng(p.seed * 6113 + fi * 97 + 3);
  const s = p.strength, dur = 1.2 + 2.6 * p.duration, n = c.seconds(dur, sr), out = new Float32Array(n);
  const pk = c.between(r, 0.25, 0.42), x2 = c.between(r, 0.2, 0.75), bw = c.between(r, 0.08, 0.16), bh = c.between(r, 0.15, 0.4);
  const ph = [r(), r(), r()].map(v => v * c.TAU), fr = [c.between(r, 0.6, 1.1), c.between(r, 1.7, 2.6), c.between(r, 3.8, 5.5)];
  const depth = 0.15 + 0.3 * s, E = new Float32Array(n), sm = v => v * v * (3 - 2 * v);
  for (let i = 0; i < n; i++) {
    const x = i / n, t = i / sr, d = (x - x2) / bw;
    let b = x < pk ? sm(x / pk) : sm((1 - x) / (1 - pk)); if (x >= pk) b *= Math.sqrt(b);
    const f = 1 + depth * (0.55 * Math.sin(c.TAU * fr[0] * t + ph[0]) + 0.3 * Math.sin(c.TAU * fr[1] * t + ph[1]) + 0.15 * Math.sin(c.TAU * fr[2] * t + ph[2]));
    E[i] = Math.min(1.15, b + bh * Math.exp(-d * d) * 4 * x * (1 - x)) * Math.max(0.3, f);
  }
  const body = c.pink(r, n), lp1 = c.onepole(sr), lp2 = c.onepole(sr);
  for (let i = 0; i < n; i++) { const fc = 160 + (250 + 800 * s) * E[i]; body[i] = lp2(lp1(body[i], fc), fc) * E[i]; }
  c.mix(out, body, 0, 1.4, sr);
  const tex = c.noise(r, n);
  if (fi === 0) {
    const bp = c.biquad("bp", 520 + 300 * s, 1.2, sr);
    for (let i = 0; i < n; i++) tex[i] = bp(tex[i]) * E[i] * E[i];
    c.mix(out, tex, 0, 0.8, sr);
    const knocks = Math.round(4 + 10 * s);
    for (let k = 0; k < knocks; k++) {
      const t = c.between(r, 0.1, 0.85) * dur, e = E[Math.floor(t * sr)], f = c.between(r, 280, 900);
      c.mix(out, c.ring([[f, 1], [f * 2.76, 0.45], [f * 5.4, 0.15]], 0.12, 0.012 + 0.02 * r(), sr), t, 0.25 * (0.3 + e), sr);
    }
  } else if (fi === 1) {
    const hp = c.onepole(sr), lp = c.onepole(sr); let fl = 1, hold = 1;
    for (let i = 0; i < n; i++) {
      if (--hold <= 0) { fl = 0.2 + 0.8 * r(); hold = 80 + Math.floor(r() * 400); }
      const e = E[i], v = tex[i] - hp(tex[i], 1200); tex[i] = lp(v, 2500 + 4500 * e) * e * e * fl;
    }
    c.mix(out, tex, 0, 0.3 + 0.2 * s, sr);
    const tries = Math.round((250 + 700 * s) * dur);
    for (let k = 0; k < tries; k++) {
      const t = r() * dur * 0.95, e = E[Math.floor(t * sr)];
      if (r() > e * e) continue;
      c.mix(out, c.burst(r, 0.004 + 0.008 * r(), "bp", c.between(r, 1800, 6500) * (0.7 + 0.4 * e), 2.5, 0.0004, 0.002 + 0.003 * r(), sr), t, (0.2 + 0.4 * r()) * e, sr);
    }
  } else {
    const hp = c.biquad("hp", 3000, 0.7, sr), lp = c.onepole(sr), sigh = c.noise(r, n), bp2 = c.biquad("bp", 1000 + 300 * s, 2, sr);
    for (let i = 0; i < n; i++) { const e = E[i]; tex[i] = lp(hp(tex[i]), 4500 + 5000 * e) * e * Math.sqrt(e); sigh[i] = bp2(sigh[i]) * e * e; }
    c.mix(out, tex, 0, 0.8 + 0.4 * s, sr);
    c.mix(out, sigh, 0, 0.9, sr);
  }
  if (p.whistle > 0) {
    const wa = p.whistle * (fi === 0 ? 1.2 : fi === 2 ? 1 : 0.8), w = new Float32Array(n), jn = c.noise(r, n), js = c.onepole(sr), as = c.onepole(sr);
    const base = c.between(r, 600, 900) * (1 + 0.35 * s), ratio = c.between(r, 1.38, 1.62), thr = c.between(r, 0.25, 0.4);
    let a1 = r() * c.TAU, a2 = r() * c.TAU;
    for (let i = 0; i < n; i++) {
      const e = Math.min(1, E[i]), j = js(jn[i], 6) * 0.25, g = Math.max(0, (e - thr) / (1 - thr)), fl = 0.6 + 0.4 * Math.max(-1, Math.min(1, as(jn[n - 1 - i], 3) * 8));
      const f = base * (0.7 + 0.6 * e + j);
      a1 += c.TAU * f / sr; a2 += c.TAU * f * ratio * (1 - 0.6 * j) / sr;
      w[i] = (Math.sin(a1) + 0.45 * Math.sin(a2)) * g * g * fl;
    }
    c.mix(out, w, 0, 0.35 * wa, sr);
  }
  const pm = p.pan, dry = out.slice(), lp = c.onepole(sr), span = Math.max(pk, 1 - pk), top = 0.45 * sr;
  for (let i = 0; i < n; i++) {
    const a = Math.min(1, Math.abs(i / n - pk) / span), j = i - (0.0005 + 0.009 * a) * sr, j0 = Math.floor(j), fj = j - j0;
    const del = j0 >= 1 ? dry[j0] * (1 - fj) + dry[j0 + 1] * fj : 0;
    out[i] = lp(dry[i] + 0.9 * pm * del, Math.min(top, 14000 - 12000 * pm * a)) * (1 - 0.35 * pm * a);
  }
  c.finish(out, 0.9);
  c.fade(out, 20, sr);
  c.gain(out, 0.6 + 0.4 * s);
  return { samples: out };
}
