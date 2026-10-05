// Open-plan office bed: quiet HVAC rumble and 60 Hz hum under syllabic vowel-formant voices, sharp keystroke clusters with a low thock, and two-tone phone trills; everything is mixed into a circular buffer so events wrap the loop point.
export const meta = {
  title: "Open Plan Murmur", kind: "ambience", format: "sound", duration: 4, price: 5, author: "stormfront", payout: "stormfront@creators.oasis.example", kit: "Office", description: "A loopable busy open-plan office bed with distant typing, voice murmur, an air-conditioner under-bed and the occasional phone, for workplace scenes and game offices.",
  tags: ["office", "ambience", "typing", "murmur", "phone", "hvac", "loop", "workplace"],
};
export const params = { knobs: {
  occupancy: { type: "choice", label: "Occupancy", default: "busy", options: ["quiet", "busy", "crunch"] },
  chatter: { type: "range", label: "Chatter", default: 0.5, min: 0, max: 1, step: 0.01 },
  keyboards: { type: "range", label: "Keyboard density", default: 0.5, min: 0, max: 1, step: 0.01 },
  phones: { type: "range", label: "Phone ring chance", default: 0.4, min: 0, max: 1, step: 0.01 },
  hvac: { type: "range", label: "HVAC", default: 0.4, min: 0, max: 1, step: 0.01 },
  crossfade: { type: "toggle", label: "Loop crossfade", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + 29), dur = 4, n = c.seconds(dur, sr), out = new Float32Array(n), wrap = p.crossfade;
  const oi = params.knobs.occupancy.options.indexOf(p.occupancy);
  const voices = [2, 5, 11][oi], clusters = [1, 4, 10][oi], babble = [0.05, 0.3, 1][oi], phoneMul = [0.6, 1, 1.6][oi];
  const norm = (x) => { let m = 1e-9; for (let i = 0; i < x.length; i++) m = Math.max(m, Math.abs(x[i])); for (let i = 0; i < x.length; i++) x[i] /= m; return x; };
  const add = (x, t, g) => { const s = Math.floor(t * sr); for (let i = 0; i < x.length; i++) { let j = s + i; if (j >= n) { if (!wrap) break; j -= n; } out[j] += x[i] * g; } };
  const xf = c.seconds(0.5, sr), m0 = n + xf, raw = c.pink(r, m0), lp = c.biquad("lp", 250 + 450 * p.hvac, 0.7, sr), hs = c.noise(r, m0), hh = c.biquad("hp", 3500, 0.7, sr);
  const bed = new Float32Array(m0), air = new Float32Array(m0);
  for (let i = 0; i < m0; i++) { bed[i] = lp(raw[i]); air[i] = hh(hs[i]); }
  norm(bed); norm(air);
  const hv = new Float32Array(n), h1 = c.osc("sine", 60, n, sr), h2 = c.osc("sine", 120, n, sr);
  for (let i = 0; i < n; i++) {
    let b = bed[i], a = air[i];
    if (wrap && i < xf) { const q = 0.5 * Math.PI * i / xf; b = b * Math.sin(q) + bed[n + i] * Math.cos(q); a = a * Math.sin(q) + air[n + i] * Math.cos(q); }
    hv[i] = b + a * 0.35 * p.hvac + (h1[i] + 0.4 * h2[i]) * 0.25 * (0.3 + p.hvac);
  }
  add(norm(hv), 0, 0.05 + 0.2 * p.hvac);
  const wash = c.noise(r, n), b1 = c.biquad("bp", 600, 0.8, sr), b2 = c.biquad("lp", 2600, 0.7, sr);
  for (let i = 0; i < n; i++) { const t = i / n * Math.PI * 2; wash[i] = b2(b1(wash[i])) * (0.55 + 0.25 * Math.sin(t * 13) + 0.2 * Math.sin(t * 29 + 1)); }
  add(norm(wash), 0, 0.2 * babble * (0.3 + p.chatter));
  const vowels = [[700, 1100], [450, 1800], [300, 2200], [550, 900], [400, 1000]];
  const phrases = Math.max(1, Math.round(voices * (0.4 + 1.2 * p.chatter)));
  for (let v = 0; v < phrases; v++) {
    let t = r() * dur; const f0 = 90 + r() * 140, syl = 3 + Math.floor(r() * 6), lv = 0.5 + 0.5 * r();
    for (let s = 0; s < syl; s++) {
      const len = 0.08 + r() * 0.14, m = c.seconds(len, sr), vw = vowels[Math.floor(r() * 5)], fe = f0 * (1 + 0.15 * (r() - 0.5));
      const x = c.osc("saw", (u) => fe * (1.1 - 0.2 * u / len), m, sr), a1 = c.biquad("bp", vw[0], 4, sr), a2 = c.biquad("bp", vw[1], 5, sr);
      for (let i = 0; i < m; i++) { const w = Math.sin(Math.PI * i / m); x[i] = (a1(x[i]) + 0.5 * a2(x[i])) * w * w; }
      add(norm(x), t, (0.12 + 0.3 * p.chatter) * lv);
      t += len + (r() < 0.25 ? 0.15 + r() * 0.3 : 0.015 + r() * 0.05);
    }
  }
  const nc = Math.max(1, Math.round(clusters * (0.3 + 1.4 * p.keyboards)));
  for (let b = 0; b < nc; b++) {
    let t = r() * dur; const keys = 6 + Math.floor(r() * 16), base = 2200 + r() * 2500, lvl = 0.35 + 0.65 * r();
    for (let k = 0; k < keys; k++) {
      t += 0.05 + r() * 0.09 * (r() < 0.2 ? 3.5 : 1);
      const g = lvl * (0.5 + 0.5 * r()) * (0.35 + 0.65 * p.keyboards);
      add(norm(c.burst(r, 0.012, "bp", base * (0.8 + 0.5 * r()), 1.5, 0.0003, 0.003, sr)), t, 0.6 * g);
      add(norm(c.ring([[160 + r() * 90, 1], [380 + r() * 120, 0.3]], 0.05, 0.012, sr)), t, 0.35 * g);
    }
  }
  const rings = p.phones < 0.05 ? 0 : Math.max(1, Math.round(p.phones * 2.2 * phoneMul + r() * 0.5 - 0.1));
  for (let q = 0; q < rings; q++) {
    const t0 = r() * dur, fa = 900 + r() * 400, m = c.seconds(0.9, sr);
    const x = c.osc("sine", (t) => (Math.floor(t * 16) % 2 ? fa : fa * 1.26), m, sr), x2 = c.osc("sine", (t) => 2.01 * (Math.floor(t * 16) % 2 ? fa : fa * 1.26), m, sr);
    for (let i = 0; i < m; i++) { const u = i / sr, ph = u % 0.45, on = u < 0.4 || u > 0.45 ? (ph < 0.38 ? Math.min(1, ph / 0.006, (0.38 - ph) / 0.01) : 0) : 0; x[i] = (x[i] + 0.2 * x2[i]) * on; }
    add(norm(c.reverb(x, { size: 0.5, decay: 0.4, mixAmt: 0.3 }, sr)), t0, 0.3 + 0.3 * p.phones);
  }
  c.finish(out, 0.85, 1.1);
  c.fade(out, 15, sr);
  return { samples: out };
}
