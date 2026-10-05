// Horror stinger rise: a pitch-climbing harmonic cluster (bowed strings, filtered synth saws or a reversed-bell swell) over a brightening breath of noise and an accelerating heartbeat, ending in a hard cut; the cut is a dark hit with a short ring, or pure silence when the tail is off.
export const meta = {
  title: "Stinger Rise", kind: "sfx", format: "sound", duration: 3, price: 4, author: "hollowbody", payout: "hollowbody@creators.oasis.example", kit: "Horror House", description: "A rising tension swell of detuned harmonic tones, brightening breath and an accelerating pulse that ends in a hard cut and a dark hit, for jump scares and reveals in a haunted house.",
  tags: ["horror", "stinger", "riser", "tension", "swell", "suspense", "jumpscare", "cinematic"],
};
export const params = { knobs: {
  palette: { type: "choice", label: "Palette", default: "strings", options: ["strings", "synth", "reverse"] },
  length: { type: "range", label: "Length", default: 0.5, min: 0, max: 1, step: 0.01 },
  dissonance: { type: "range", label: "Dissonance", default: 0.5, min: 0, max: 1, step: 0.01 },
  startPitch: { type: "range", label: "Start pitch", default: 110, min: 55, max: 330, step: 1 },
  rise: { type: "range", label: "Pitch rise", default: 0.6, min: 0, max: 1, step: 0.01 },
  brightness: { type: "range", label: "Brightness", default: 0.6, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Hit after cut", default: false },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + params.knobs.palette.options.indexOf(p.palette) * 41 + 3);
  const dur = 1.6 + 1.4 * p.length, tailLen = p.tail ? 0.6 : 0.05;
  const n = c.seconds(dur, sr), out = new Float32Array(c.seconds(dur + tailLen, sr));
  const f0 = p.startPitch, d = p.dissonance, climb = 1 + 0.4 + 1.6 * p.rise;
  const pal = p.palette, nh = pal === "reverse" ? 4 : pal === "synth" ? 9 : 14;
  const body = new Float32Array(n);
  const voices = [1, 1.5, 2 + 0.12 * d, 2.5 + 0.5 * d, 3.02 + 0.3 * d * (r() < 0.5 ? 1 : -0.5)];
  voices.forEach((q, k) => {
    const det = 1 + (r() - 0.5) * 0.012 * (1 + 4 * d), vib = 4.5 + r() * 2, ph = r() * 6.28, amp = 1 / (1 + k * 0.5);
    let phase = r();
    for (let i = 0; i < n; i++) {
      const t = i / n, tt = i / sr;
      const f = f0 * q * det * (1 + (climb - 1) * t * t) * (1 + (0.004 + 0.01 * t) * Math.sin(c.TAU * vib * tt + ph));
      phase += f / sr; if (phase > 1e4) phase -= 1e4;
      let s = 0;
      const top = Math.max(2, Math.min(nh, Math.floor(sr * 0.45 / f)));
      for (let h = 1; h <= top; h++) {
        const hw = pal === "synth" ? (h % 2 ? 1 / h : 0.05 / h) : pal === "strings" ? 1 / h : (h === 1 ? 1 : 0.3 / (h * h));
        s += hw * Math.sin(c.TAU * phase * h * (pal === "reverse" ? 1 + 0.0007 * h * h : 1));
      }
      body[i] += s * amp;
    }
  });
  const lp = c.onepole(sr), lp2 = c.onepole(sr);
  const bright = 0.4 + 1.6 * p.brightness;
  for (let i = 0; i < n; i++) {
    const t = i / n;
    let e;
    if (pal === "reverse") e = 0.12 + 0.88 * Math.pow(t, 2);
    else if (pal === "strings") e = Math.min(1, t * 10) * (0.25 + 0.75 * t);
    else e = 0.3 + 0.7 * t;
    const cut = (pal === "synth" ? 600 + 5500 * t * t : 700 + 3500 * t) * bright;
    body[i] = lp2(lp(body[i], cut), cut * 1.5) * e;
  }
  c.mix(out, body, 0, 0.42, sr);
  const air = c.noise(r, n), bp = c.biquad("bp", 1200, 1.4, sr), sw = c.onepole(sr);
  for (let i = 0; i < n; i++) { const t = i / n; air[i] = sw(bp(air[i]), 1500 + 7000 * t * bright) * (0.1 + 0.9 * t * t) * (pal === "reverse" ? 1.5 : 1); }
  c.mix(out, air, 0, 0.3 * (0.4 + p.brightness), sr);
  let t = 0.15, gap = 0.5;
  while (t < dur - 0.12) {
    const a = t / dur;
    c.mix(out, c.ring([[46 + 14 * a, 1], [92 + 20 * a, 0.3]], 0.14, 0.035, sr), t, 0.2 + 0.45 * a, sr);
    c.mix(out, c.burst(r, 0.015, "lp", 500 + 300 * a, 0.8, 0.001, 0.005, sr), t, 0.2 * a, sr);
    gap = Math.max(0.17, gap * 0.88);
    t += gap * (0.94 + r() * 0.12);
  }
  const cutAt = n, rl = c.seconds(0.003, sr);
  for (let i = cutAt - rl; i < cutAt; i++) out[i] *= (cutAt - i) / rl;
  for (let i = cutAt; i < out.length; i++) out[i] = 0;
  if (p.tail) {
    const f = f0 * 0.5;
    c.mix(out, c.ring([[f, 1], [f * 1.5, 0.5], [f * (2.1 + 0.4 * d), 0.4], [f * 5.3, 0.15]], tailLen, 0.2, sr), dur, 0.5, sr);
    c.mix(out, c.burst(r, 0.06, "lp", 1500, 0.8, 0.0008, 0.02, sr), dur, 0.8, sr);
    c.mix(out, c.ring([[42, 1], [63, 0.4]], 0.4, 0.1, sr), dur, 0.8, sr);
  }
  c.finish(out, 0.9, 1.1);
  const fe = c.seconds(0.006, sr);
  for (let i = 0; i < fe; i++) out[i] *= i / fe;
  for (let i = out.length - fe; i < out.length; i++) out[i] *= (out.length - i) / fe;
  return { samples: out };
}
