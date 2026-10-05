// Red alert bridge bed: a loopable 4 s hull-stress ambience. Reactor hum and sub rumble under a vent wash; stick-slip hull groans, spark crackles, power-sag buzzes and steam bursts on a circular timeline; a distant alarm cycling an integer number of times per loop through wrapped hall echoes.
export const meta = {
  title: "Red Alert Bridge", kind: "ambience", format: "sound", duration: 4, price: 5, author: "stormfront", payout: "stormfront@creators.oasis.example", kit: "Sci-fi Console", description: "A loopable starship bridge under red alert: distant cycling alarms, groaning hull, sparking consoles and a reactor rumble, for tense combat or damage scenes.",
  tags: ["sci-fi", "alarm", "red alert", "bridge", "starship", "ambience", "loop", "tension"],
};
export const params = { knobs: {
  alarm: { type: "choice", label: "Alarm style", default: "klaxon", options: ["klaxon", "whoop", "two-tone", "pulse"] },
  intensity: { type: "range", label: "Intensity", default: 0.5, min: 0, max: 1, step: 0.01 },
  alarmLevel: { type: "range", label: "Alarm level", default: 0.6, min: 0, max: 1, step: 0.01 },
  rumble: { type: "range", label: "Rumble", default: 0.5, min: 0, max: 1, step: 0.01 },
  rate: { type: "range", label: "Alarm rate (Hz)", default: 0.75, min: 0.25, max: 2, step: 0.05 },
  blips: { type: "toggle", label: "Console blips", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 4421 + params.knobs.alarm.options.indexOf(p.alarm) * 97 + 3);
  const L = 4, n = c.seconds(L, sr), out = new Float32Array(n), I = p.intensity, TAU = c.TAU;
  const circ = (src, fns) => { const y = new Float32Array(n); for (let pass = 0; pass < 2; pass++) for (let i = 0; i < n; i++) { let v = src[i]; for (const f of fns) v = f(v); if (pass) y[i] = v; } return y; };
  const wrap = (src, t, g) => { const s = Math.floor(((t % L + L) % L) * sr), m = Math.min(src.length, n); for (let j = 0; j < m; j++) out[(s + j) % n] += src[j] * g; };
  const q = (f) => Math.round(f * L) / L;
  const hum = q(c.between(r, 47, 61)), whine = q(c.between(r, 2900, 3400)), hg = 0.025 + 0.16 * p.rumble;
  for (let i = 0; i < n; i++) {
    const t = i / sr, wob = 1 + (0.1 + 0.3 * I) * Math.sin(TAU * 0.5 * t);
    out[i] += hg * wob * (Math.sin(TAU * hum * t) + 0.5 * Math.sin(TAU * (2 * hum + 0.25) * t) + 0.25 * I * Math.sin(TAU * 3 * hum * t));
    out[i] += 0.045 * I * Math.sin(TAU * whine * t + 2 * Math.sin(TAU * 1.5 * t));
  }
  const sub = circ(c.noise(r, n), [c.biquad("lp", 110, 0.8, sr), c.biquad("lp", 160, 0.7, sr)]);
  for (let i = 0; i < n; i++) out[i] += sub[i] * 3.2 * p.rumble;
  const vent = circ(c.noise(r, n), [c.biquad("hp", 180, 0.7, sr), c.biquad("lp", 600 + 3200 * I, 0.7, sr)]);
  for (let i = 0; i < n; i++) out[i] += vent[i] * (0.1 + 0.14 * I) * (1 + 0.25 * Math.sin(TAU * 0.25 * i / sr + 1));
  const groan = (dur, f0, f1) => {
    const m = c.seconds(dur, sr), x = new Float32Array(m), k = Math.pow(f1 / f0, 1 / m), dk = Math.exp(-1 / (0.0015 * sr));
    const b1 = c.biquad("bp", c.between(r, 170, 320), 8, sr), b2 = c.biquad("bp", c.between(r, 600, 1100), 6, sr);
    let f = f0, ph = 0, ex = 0;
    for (let i = 0; i < m; i++) {
      f *= k; ph += f * (0.97 + 0.06 * r()) / sr; ex *= dk;
      if (ph >= 1) { ph -= 1; ex = 0.6 + 0.4 * r(); }
      const e = Math.sin(Math.PI * i / m);
      x[i] = (b1(ex) + 0.6 * b2(ex)) * e * e;
    }
    return x;
  };
  const groans = 1 + Math.round(I * 4);
  for (let g = 0; g < groans; g++) { const f0 = c.between(r, 38, 95); wrap(groan(c.between(r, 0.8, 1.6), f0, f0 * c.between(r, 0.5, 0.75)), r() * L, (1.6 + 2 * I) * c.between(r, 0.6, 1)); }
  const clusters = Math.round(1 + I * 7);
  for (let k = 0; k < clusters; k++) {
    const t0 = r() * L, cnt = 3 + Math.floor(r() * (4 + 8 * I));
    for (let j = 0; j < cnt; j++) wrap(c.burst(r, 0.003 + r() * 0.006, "hp", 2500 + r() * 4000, 0.9, 0.0004, 0.001 + r() * 0.002, sr), t0 + j * c.between(r, 0.004, 0.03), (0.1 + 0.18 * I) * (0.4 + 0.6 * r()) * (1 - j / (cnt + 2)));
  }
  const sags = Math.round(0.4 + I * 3);
  for (let k = 0; k < sags; k++) {
    const d = c.between(r, 0.3, 0.7), m = c.seconds(d, sr), x = new Float32Array(m), bp = c.biquad("bp", c.between(r, 500, 900), 1.2, sr);
    const f0 = hum * (2 + Math.floor(r() * 2)), drop = c.between(r, 0.08, 0.2);
    let ph = 0, g = 1, gs = 0;
    for (let i = 0; i < m; i++) {
      const s = i / sr;
      if (i % 220 === 0) g = r() < 0.65 ? 0.5 + 0.5 * r() : 0.05;
      gs += (g - gs) * 0.02;
      ph += f0 * (1 - drop * s / d + 0.02 * Math.sin(TAU * 9 * s)) / sr; ph -= Math.floor(ph);
      x[i] = bp(2 * ph - 1) * gs * Math.min(1, s / 0.02, (d - s) / 0.08);
    }
    wrap(x, r() * L, 0.25 + 0.35 * I);
  }
  const vents = Math.round(I * 2.4);
  for (let k = 0; k < vents; k++) {
    const d = c.between(r, 0.3, 0.8), m = c.seconds(d, sr), x = c.noise(r, m), bp = c.biquad("bp", c.between(r, 2200, 3600), 1, sr);
    for (let i = 0; i < m; i++) { const s = i / sr; x[i] = bp(x[i]) * Math.min(1, s / 0.03, (d - s) / 0.15); }
    wrap(x, r() * L, 0.35 * I);
  }
  if (p.blips) {
    const nb = 3 + Math.floor(r() * 4);
    for (let k = 0; k < nb; k++) wrap(c.ring([[c.between(r, 1100, 2200), 1]], 0.08, 0.02, sr), r() * L, 0.09);
  }
  const kc = Math.max(1, Math.round(p.rate * L)), T = L / kc, af = c.between(r, 0.96, 1.04), A = new Float32Array(n);
  const seg = (s, len, a, rel) => Math.max(0, Math.min(1, s / a, (len - s) / rel));
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const s = ((i * kc / n) % 1) * T; let f = 400, e = 0, w;
    if (p.alarm === "klaxon") { const on = 0.55 * T; f = 380 * af * (1 - 0.04 * s / T); e = s < on ? seg(s, on, 0.008, 0.03) : 0; }
    else if (p.alarm === "whoop") { const len = 0.85 * T; f = 280 * af * (1 + 2.2 * Math.min(1, s / len)); e = s < len ? seg(s, len, 0.01, 0.08) : 0; }
    else if (p.alarm === "two-tone") { const h = T / 2, s2 = s < h ? s : s - h; f = (s < h ? 660 : 495) * af; e = seg(s2, h - 0.01, 0.006, 0.025); }
    else { const b = Math.floor(s / 0.16), s2 = s - b * 0.16; f = 920 * af; e = b < 3 && s2 < 0.09 ? seg(s2, 0.09, 0.004, 0.03) : 0; }
    ph += f / sr; ph -= Math.floor(ph);
    if (p.alarm === "klaxon") w = 2 * ph - 1;
    else if (p.alarm === "whoop") w = 1 - 4 * Math.abs(ph - 0.5);
    else if (p.alarm === "two-tone") w = Math.tanh(2.5 * Math.sin(TAU * ph));
    else w = Math.sin(TAU * ph) + 0.3 * Math.sin(3 * TAU * ph);
    A[i] = w * e;
  }
  const Af = circ(A, [c.biquad("lp", 2400, 0.7, sr), c.biquad("hp", 250, 0.7, sr)]), ag = 0.85 * p.alarmLevel, wet = 0.6 / (1 + p.rate);
  const taps = [[0.071, 0.5], [0.113, 0.42], [0.167, 0.33], [0.229, 0.26], [0.311, 0.19], [0.433, 0.13]];
  for (let i = 0; i < n; i++) out[i] += Af[i] * ag * 0.7;
  for (const [dt, g] of taps) { const d = Math.floor(dt * sr), gg = g * wet * ag; for (let i = 0; i < n; i++) out[i] += Af[(i - d + n) % n] * gg; }
  c.fade(c.finish(out, 0.8), 15, sr);
  return { samples: out };
}
