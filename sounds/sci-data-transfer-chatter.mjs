// Data chatter: burbling computer transmission. Body is a stream of tones (FSK modem packets, quantised bleeps or tiny gliding grains), over a gated band-noise data hiss, through a seeded resonant band sweep that tracks the pitch.
export const meta = {
  title: "Data Chatter", kind: "sfx", format: "sound", duration: 1.5, price: 2, author: "quietmachine", payout: "quietmachine@creators.oasis.example", kit: "Sci-fi Console", description: "Burbling computer data-stream chatter (modem packets, bleep bursts or granular babble) for starship consoles, uplinks, hacking and file transfers.",
  tags: ["data", "computer", "sci-fi", "modem", "bleeps", "transfer", "console", "chatter"],
};
export const params = { knobs: {
  style: { type: "choice", label: "Style", default: "bleeps", options: ["modem", "bleeps", "granular"] },
  density: { type: "range", label: "Density", default: 0.5, min: 0, max: 1, step: 0.01 },
  pitch: { type: "range", label: "Pitch", default: 0.5, min: 0, max: 1, step: 0.01 },
  sweep: { type: "range", label: "Filter sweep", default: 0.5, min: 0, max: 1, step: 0.01 },
  duration: { type: "range", label: "Duration", default: 1.5, min: 0.4, max: 3, step: 0.1 },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, si = params.knobs.style.options.indexOf(p.style), r = c.rng(p.seed * 4271 + si * 613 + 29);
  const d = p.duration, n = c.seconds(d + 0.05, sr), out = new Float32Array(n);
  const base = 380 * Math.pow(2, p.pitch * 2.6), dens = p.density, ny = sr * 0.42;
  const tone = (t0, len, f0, f1, g, h, tau) => {
    const i0 = Math.floor(t0 * sr), m = Math.min(c.seconds(len, sr), n - i0), a = Math.max(1, 0.0012 * sr), rel = Math.max(1, 0.003 * sr);
    const k = tau ? Math.exp(-1 / (tau * sr)) : 1;
    let ph = r() * c.TAU, e = 1;
    for (let i = 0; i < m; i++) {
      const f = Math.min(ny, f0 + (f1 - f0) * i / m); ph += c.TAU * f / sr; e *= k;
      out[i0 + i] += g * e * Math.min(1, i / a, (m - i) / rel) * (Math.sin(ph) + h * Math.sin(3 * ph));
    }
  };
  if (p.style === "modem") {
    const tones = [1, 1.27, 1.59, 2.02].map(k => Math.min(ny, base * k * (0.98 + 0.04 * r())));
    let t = 0.004 + r() * 0.02;
    while (t < d - 0.06) {
      const pre = 0.012 + r() * 0.02, hi = base * (2.3 + 0.3 * r());
      tone(t, pre, hi, hi * 0.92, 0.3, 0, 0);
      t += pre;
      const len = Math.min(d - 0.01 - t, (0.08 + r() * 0.4) * (0.5 + dens)), baud = (35 + 180 * dens) * (0.85 + 0.3 * r());
      const i0 = Math.floor(t * sr), m = c.seconds(Math.max(0, len), sr), per = sr / baud, a = 0.003 * sr;
      let ph = 0, f = tones[0], next = 0, fs = f, av = 1, as = 1;
      for (let i = 0; i < m && i0 + i < n; i++) {
        if (i >= next) { f = tones[Math.floor(r() * 4)]; av = 0.55 + 0.45 * r(); next += per * (0.88 + 0.24 * r()); }
        fs += (f - fs) * 0.08; as += (av - as) * 0.002; ph += c.TAU * fs / sr;
        out[i0 + i] += 0.5 * as * Math.min(1, i / a, (m - i) / a) * (Math.sin(ph) + 0.3 * Math.sin(3 * ph));
      }
      t += Math.max(0, len) + (0.015 + r() * 0.2) * (1.3 - dens);
    }
  } else if (p.style === "bleeps") {
    const scale = [1, 9 / 8, 5 / 4, 3 / 2, 5 / 3, 2, 9 / 4, 3], rate = 10 + 32 * dens;
    let t = 0.004;
    while (t < d - 0.03) {
      const f = base * scale[Math.floor(r() * scale.length)] * (0.995 + 0.01 * r());
      const len = (0.02 + 0.06 * r()) * (1.2 - 0.6 * dens), gl = r() < 0.25 ? 1 + (r() - 0.4) * 0.8 : 1, h = r() * 0.45;
      const reps = r() < 0.2 ? 2 + Math.floor(r() * 2) : 1, g = 0.3 + 0.3 * r();
      for (let k = 0; k < reps; k++) if (t + k * len * 1.3 + len < d + 0.03) tone(t + k * len * 1.3, len, f, f * gl, g, h, len * 0.6);
      t += (1 / rate) * (0.3 + 1.4 * r()) + (reps - 1) * len * 1.3;
    }
  } else {
    const cnt = Math.round(d * (90 + 500 * dens)), ph0 = r() * c.TAU, wob = 2 + r() * 5;
    for (let g = 0; g < cnt; g++) {
      const t = r() * (d - 0.015);
      if (r() > 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(ph0 + c.TAU * wob * t))) continue;
      const len = 0.003 + 0.01 * r(), f = base * (0.5 + 2.5 * Math.pow(r(), 1.5));
      tone(t, len, f, f * (0.75 + 0.6 * r()), 0.15 + 0.35 * r(), 0.2 * r(), len * 0.5);
      if (g % 5 === 0) c.mix(out, c.burst(r, 0.006, "bp", Math.min(base * 3, ny), 3, 0.0004, 0.002, sr), t, 0.15, sr);
    }
  }
  const bn = c.noise(r, n), bp = c.biquad("bp", Math.min(base * 2.5, ny), 1.5, sr);
  let gv = 0, gs = 0, nxt = 0;
  for (let i = 0; i < n; i++) {
    if (i >= nxt) { gv = r() < 0.3 + 0.5 * dens ? 0.3 + 0.7 * r() : 0.1; nxt = i + (0.015 + 0.05 * r()) * sr; }
    gs += (gv - gs) * 0.005; bn[i] = bp(bn[i]) * gs;
  }
  c.mix(out, bn, 0, p.style === "modem" ? 0.14 : 0.06, sr);
  const s = p.sweep, hiF = Math.min(sr / 7, base * 7), loF = Math.min(Math.max(150, base * 0.6), hiF / 2.5);
  const cyc = 0.6 + r() * 1.4, sph = r() * c.TAU, sph2 = r() * c.TAU, damp = 1.4 - 1.15 * s;
  let lo = 0, bd = 0, fco = 0.5;
  for (let i = 0; i < n; i++) {
    if ((i & 31) === 0) {
      const a = c.TAU * cyc * i / n + sph;
      const ct = c.clamp(0.5 - 0.35 * Math.cos(a) - 0.15 * Math.cos(2.7 * a + sph2), 0, 1);
      fco = 2 * Math.sin(Math.PI * loF * Math.pow(hiF / loF, ct) / sr);
    }
    const x = out[i], hp = x - lo - damp * bd; bd += fco * hp; lo += fco * bd;
    out[i] = (1 - 0.5 * s) * x + s * (0.5 * lo + 1.1 * bd);
  }
  c.fade(c.finish(out, 0.9, 1.1), 25, sr);
  return { samples: out };
}
