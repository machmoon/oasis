// Distant siren: a police wail, ambulance hi-lo or rotary fire whine, filtered by air and city distance, swayed by slow wind drift, smeared by building slap echoes and a street reverb, half-buried under band-limited rain, receding with an optional Doppler fade.
export const meta = {
  title: "Skyline Siren", kind: "sfx", format: "sound", duration: 3.5, price: 3, author: "foleyroom", payout: "foleyroom@creators.oasis.example", kit: "Rainy City Street", description: "An emergency siren drifting across a wet night skyline: siren type, distance, building reflections, rain masking and wail rate are knobs, ideal for city establishing shots and background tension.",
  tags: ["siren", "police", "ambulance", "fire", "distant", "city", "rain", "night"],
};
export const params = { knobs: {
  type: { type: "choice", label: "Siren type", default: "police", options: ["police", "ambulance", "fire"] },
  distance: { type: "range", label: "Distance", default: 0.6, min: 0, max: 1, step: 0.01 },
  reflections: { type: "range", label: "Building reflections", default: 0.5, min: 0, max: 1, step: 0.01 },
  rain: { type: "range", label: "Rain masking", default: 0.3, min: 0, max: 1, step: 0.01 },
  rate: { type: "range", label: "Wail rate", default: 1, min: 0.5, max: 2, step: 0.05 },
  tail: { type: "toggle", label: "Fade tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 6113 + params.knobs.type.options.indexOf(p.type) * 197 + 29);
  const dur = 3.5, n = c.seconds(dur, sr), dist = p.distance, refl = p.reflections, mask = p.rain, rate = p.rate;
  const det = 0.97 + r() * 0.06, ph0 = r(), tailT = p.tail ? 1.8 : 0, tailStart = dur - tailT;
  const harm = { police: [0.4, 0.28], ambulance: [0.22, 0.12], fire: [0.5, 0.42] }[p.type];
  const k = 1 - Math.exp(-1 / ((p.type === "ambulance" ? 0.014 : p.type === "fire" ? 0.03 : 0.004) * sr));
  const depth = 0.08 + 0.42 * dist, gust = [0, 1, 2].map(j => [c.TAU * (0.25 + r() * 0.6) * (j + 1) / sr, r() * c.TAU]);
  const sir = new Float32Array(n);
  let ph = 0, fs = -1, walk = 0, walkT = 0, fl = 0, flT = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    let f, u;
    if (p.type === "police") {
      u = (t * 0.45 * rate + ph0) % 1;
      const w = u < 0.45 ? u / 0.45 : 1 - (u - 0.45) / 0.55;
      f = 700 + 820 * (0.5 - 0.5 * Math.cos(Math.PI * w));
    } else if (p.type === "ambulance") {
      u = (t * 0.8 * rate + ph0) % 1;
      f = u < 0.5 ? 960 : 770;
    } else {
      u = (t * 0.22 * rate + ph0) % 1;
      f = 380 + 800 * (u < 0.6 ? Math.sin(u / 0.6 * Math.PI / 2) : 1 - (u - 0.6) / 0.4);
    }
    if (fs < 0) fs = f;
    fs += (f - fs) * k;
    if (i % 2048 === 0) { walkT = r(); flT = (r() - 0.5) * 0.006 * dist; }
    walk += (walkT - walk) * 0.0002; fl += (flT - fl) * 0.0004;
    const g = (Math.sin(gust[0][0] * i + gust[0][1]) + 0.6 * Math.sin(gust[1][0] * i + gust[1][1]) + 0.3 * Math.sin(gust[2][0] * i + gust[2][1])) / 1.9;
    const amp = 1 - depth * (0.5 + 0.3 * g + 0.2 * walk);
    let dop = 1, e = 1;
    if (p.tail && t > tailStart) { const x = (t - tailStart) / tailT; dop = 1 - 0.04 * x; e = (1 - x) * (1 - x); }
    ph += c.TAU * fs * det * dop * (1 + fl) / sr;
    if (ph > c.TAU) ph -= c.TAU;
    const s = Math.sin(ph), co = Math.cos(ph);
    sir[i] = (s + harm[0] * 2 * s * co + harm[1] * s * (3 - 4 * s * s)) * amp * e * Math.min(1, t / 0.04);
  }
  const cut = (6500 - 5600 * dist) * (1 - 0.35 * mask);
  c.filter(sir, c.biquad("lp", cut, 0.7, sr));
  c.filter(sir, c.biquad("lp", cut * 1.2, 0.6, sr));
  c.filter(sir, c.biquad("hp", 250 + 200 * dist, 0.7, sr));
  const out = new Float32Array(n);
  c.mix(out, sir, 0, 1, sr);
  for (let j = 0; j < 4; j++) {
    const d = 0.06 + r() * 0.12 + j * (0.1 + r() * 0.15), g = refl * 0.55 * Math.pow(0.62, j);
    if (g <= 0) continue;
    const cp = Float32Array.from(sir);
    c.filter(cp, c.biquad("lp", Math.max(500, 3600 - 2000 * dist - j * 450), 0.7, sr));
    c.mix(out, cp, d, g, sr);
  }
  const rv = c.reverb(out, { size: 0.35 + 0.5 * refl, decay: 0.3 + 0.4 * refl + (p.tail ? 0.2 : 0), mixAmt: 0.06 + 0.3 * refl + 0.1 * dist }, sr);
  const body = new Float32Array(n);
  c.mix(body, rv || out, 0, 1, sr);
  c.finish(body, 0.9);
  c.gain(body, (1 - 0.45 * dist) * (1 - 0.35 * mask));
  if (mask > 0) {
    const hiss = c.pink(r, n), hp = c.biquad("hp", 900, 0.7, sr), lp = c.biquad("lp", 4800, 0.7, sr), wob = r() * 6;
    for (let i = 0; i < n; i++) hiss[i] = lp(hp(hiss[i])) * (0.88 + 0.12 * Math.sin(i / sr * 1.3 + wob));
    c.mix(body, hiss, 0, 0.32 * mask, sr);
    const drops = Math.round(420 * mask);
    for (let d = 0; d < drops; d++)
      c.mix(body, c.burst(r, 0.004 + r() * 0.008, "bp", 1800 + r() * 3200, 3, 0.0004, 0.0015 + r() * 0.003, sr), r() * (dur - 0.02), (0.05 + 0.15 * r()) * mask, sr);
  }
  c.fade(c.finish(body, 0.85), 15, sr);
  return { samples: body };
}
