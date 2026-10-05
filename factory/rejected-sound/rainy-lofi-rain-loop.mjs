// Rainy lo-fi keys: a 4-chord progression on tine electric piano (decaying sine partials, bark harmonic, tine bell), one chord
// per beat, through wow/flutter tape and saturation, over a rain bed (hiss, drops, drip plinks) and vinyl crackle, with an optional seamless wrap.
export const meta = {
  title: "Neon Rain Keys", kind: "music-loop", format: "sound", duration: 3.1, price: 5, author: "kickdrum", payout: "kickdrum@creators.oasis.example", kit: "Rainy City Street", description: "A seamless lo-fi electric piano loop under city rain at night. It moves through a full 4-chord progression, one chord per beat at 66-90 BPM. Chord colour, tape wobble, vinyl crackle, rain mix and tempo are knobs, and every seed is a new take with different voicings and pickups.",
  tags: ["lofi", "electric piano", "rain", "loop", "chill", "vinyl", "tape", "night"],
};
export const params = { knobs: {
  color: { type: "choice", label: "Chord color", default: "minor", options: ["minor", "major7", "sus"] },
  wobble: { type: "range", label: "Tape wobble", default: 0.35, min: 0, max: 1, step: 0.01 },
  crackle: { type: "range", label: "Vinyl crackle", default: 0.4, min: 0, max: 1, step: 0.01 },
  rain: { type: "range", label: "Rain mix", default: 0.5, min: 0, max: 1, step: 0.01 },
  tempo: { type: "range", label: "Tempo (BPM, chord per beat)", default: 78, min: 66, max: 90, step: 1 },
  crossfade: { type: "toggle", label: "Seamless loop wrap", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, ci = params.knobs.color.options.indexOf(p.color), r = c.rng(p.seed * 4111 + ci * 97 + 3), xfOn = p.crossfade;
  const beat = 60 / p.tempo, loopS = 4 * beat, n = c.seconds(loopS, sr), L = n + c.seconds(0.9, sr), xf = c.seconds(0.25, sr);
  const keys = new Float32Array(L), bed = new Float32Array(L);
  const note = (m, t0, gate, vel, tine) => {
    const f = 440 * Math.pow(2, (m - 69) / 12) * (1 + (r() - 0.5) * 0.003), s0 = Math.round(Math.max(0, t0) * sr);
    const len = Math.min(L - s0, c.seconds(gate + 0.35, sr)), g = c.seconds(gate, sr), a = Math.max(1, c.seconds(0.002, sr));
    const P = [[f, 1, Math.max(0.5, 1.8 - f / 500)], [2 * f, 0.45 * vel, Math.max(0.2, 0.7 - f / 1500)], [3 * f, 0.2 * vel, Math.max(0.1, 0.35 - f / 2000)],
      [7.1 * f, 0.55 * vel * tine, 0.025]].filter(q => q[0] < sr * 0.45 && q[1] > 0);
    const K = P.length, CS = P.map(q => Math.cos(c.TAU * q[0] / sr)), SN = P.map(q => Math.sin(c.TAU * q[0] / sr));
    const X = P.map(() => 1), Y = P.map(() => 0), E = P.map(q => q[1]), D = P.map(q => Math.exp(-1 / (q[2] * sr)));
    const rd = Math.exp(-1 / (0.08 * sr)); let rel = 1;
    for (let i = 0; i < len; i++) {
      let v = 0;
      for (let k = 0; k < K; k++) { const x = X[k] * CS[k] - Y[k] * SN[k]; Y[k] = X[k] * SN[k] + Y[k] * CS[k]; X[k] = x; v += Y[k] * E[k]; E[k] *= D[k]; }
      if (i > g) rel *= rd;
      keys[s0 + i] += v * rel * Math.min(1, i / a) * 0.17 * vel;
    }
  };
  const PROG = [
    [[38, 53, 57, 60, 64], [43, 58, 62, 65, 69], [46, 57, 60, 62, 65], [45, 55, 61, 64, 67]],
    [[41, 57, 60, 64, 67], [40, 55, 59, 62, 64], [38, 53, 57, 60, 64], [36, 52, 55, 59, 62]],
    [[36, 55, 60, 62, 67], [34, 53, 58, 60, 65], [39, 55, 58, 63, 65], [43, 55, 60, 62, 67]],
  ][ci];
  const hum = () => (r() - 0.5) * 0.014, sw = 0.04 * beat;
  for (let b = 0; b < 4; b++) {
    const ch = PROG[b].slice(), t = b * beat + 0.01, v = 0.85 + 0.15 * r();
    if (r() < 0.35) ch[4] += 12;
    note(ch[0], t, 0.95 * beat, 0.6 * v, 0.2);
    if (ci === 0) {
      for (let k = 1; k <= 4; k++) note(ch[k], t + k * 0.013 + hum() * 0.3, 0.9 * beat, v * (0.85 + 0.15 * r()), 1);
      if (r() < 0.5) for (let k = 3; k <= 4; k++) note(ch[k], t + 0.75 * beat + sw + hum(), 0.22 * beat, 0.35 * v, 1);
    } else if (ci === 1) {
      for (let k = 1; k <= 4; k++) note(ch[k], t + k * 0.004, 0.45 * beat, v * (0.9 + 0.1 * r()), 1);
      const st = t + 0.5 * beat + sw + hum();
      for (let k = 1; k <= 4; k++) if (k === 4 || r() > 0.3) note(ch[k], st + k * 0.004, 0.4 * beat, 0.55 * v, 1);
    } else {
      const ord = r() < 0.5 ? [1, 3, 2, 4] : [1, 2, 4, 3];
      for (let e = 0; e < 4; e++) note(ch[ord[e]], t + e * 0.25 * beat + (e % 2 ? sw : 0) + hum(), 0.6 * beat, (0.7 + 0.3 * r()) * v * (e % 2 ? 0.65 : 1), 1);
    }
    if (r() < 0.6) note(ch[1 + Math.floor(r() * 4)] + 12, t + (r() < 0.5 ? 0.5 : 0.75) * beat + sw + hum(), 0.3 * beat, 0.5 * v, 1);
  }
  const wowC = Math.max(1, Math.round(0.6 * loopS)), flC = Math.round(5.5 * loopS), ph1 = r() * c.TAU, ph2 = r() * c.TAU;
  const dep = p.wobble * 0.0045 * sr, fdep = p.wobble * 0.00012 * sr, drive = 1 + 1.5 * p.wobble;
  const tape = new Float32Array(L), lp = c.biquad("lp", 7000 - 4000 * p.wobble, 0.6, sr), hk = c.biquad("hp", 60, 0.7, sr);
  for (let i = 0; i < L; i++) {
    const ph = i / n * c.TAU, d = 0.0012 * sr + dep * (1 + Math.sin(wowC * ph + ph1)) + fdep * (1 + Math.sin(flC * ph + ph2));
    const j = i - d, k = Math.floor(j), fr = j - k;
    const s = k >= 0 ? keys[k] * (1 - fr) + (k + 1 < L ? keys[k + 1] : 0) * fr : 0;
    tape[i] = Math.tanh(hk(lp(s)) * drive) / drive;
  }
  const rmsOf = (b) => { let s = 0; for (let i = 0; i < b.length; i++) s += b[i] * b[i]; return Math.sqrt(s / b.length) || 1; };
  const span = loopS + 0.3, cr = p.crackle, rm = p.rain;
  if (rm > 0) {
    const rb = c.pink(r, L), hp = c.biquad("hp", 700, 0.7, sr), lp2 = c.biquad("lp", 6500, 0.7, sr);
    for (let i = 0; i < L; i++) rb[i] = lp2(hp(rb[i]));
    c.gain(rb, 0.3 / rmsOf(rb));
    for (let k = 0, m = Math.round(loopS * (60 + 120 * rm)); k < m; k++) c.mix(rb, c.burst(r, 0.004 + r() * 0.008, "bp", 1800 + r() * 3200, 3, 0.0003, 0.0015 + r() * 0.003, sr), r() * span, 0.3 + 0.9 * r(), sr);
    for (let k = 0, m = Math.round(loopS * (3 + 4 * rm)); k < m; k++) {
      const f0 = 900 + r() * 1400, ln = c.seconds(0.04, sr), x = c.osc("sine", (tt) => f0 * (1 + tt / 0.03 * 0.9), ln, sr);
      c.multiply(x, c.env(ln, 0.001, 0.012, sr)); c.mix(rb, x, r() * span, 0.5 + 0.6 * r(), sr);
    }
    c.gain(rb, (0.03 + 0.12 * rm) / rmsOf(rb)); c.mix(bed, rb, 0, 1, sr);
  }
  if (cr > 0) {
    const cb = c.noise(r, L), hh = c.biquad("hp", 3000, 0.7, sr);
    for (let i = 0; i < L; i++) cb[i] = hh(cb[i]) * 0.05;
    for (let k = 0, m = Math.round(loopS * (15 + 50 * cr)); k < m; k++) { const q = r(); c.mix(cb, c.burst(r, 0.002 + r() * 0.003, "hp", 1500 + r() * 5000, 0.7, 0.0003, 0.0006 + r() * 0.001, sr), r() * span, 0.2 + q * q * q, sr); }
    for (let k = 0, m = Math.round(loopS * (1 + 2 * cr)); k < m; k++) c.mix(cb, c.burst(r, 0.008, "lp", 800 + r() * 700, 0.8, 0.0004, 0.002, sr), r() * span, 0.9, sr);
    let pk = 1e-9; for (let i = 0; i < L; i++) pk = Math.max(pk, Math.abs(cb[i]));
    c.gain(cb, (0.15 + 0.45 * cr) / pk); c.mix(bed, cb, 0, 1, sr);
  }
  const kl = new Float32Array(n);
  let kp = 1e-9;
  for (let i = 0; i < n; i++) { kl[i] = tape[i] + (xfOn && i < L - n ? tape[n + i] : 0); kp = Math.max(kp, Math.abs(kl[i])); }
  const ks = 0.7 / kp, out = new Float32Array(n), fo = c.seconds(0.35, sr), f0 = n - fo;
  for (let i = 0; i < n; i++) {
    let b = bed[i];
    if (xfOn && i < xf) { const a = i / xf * Math.PI / 2; b = b * Math.sin(a) + bed[n + i] * Math.cos(a); }
    out[i] = kl[i] * ks + b;
    if (!xfOn && i >= f0) out[i] *= Math.cos((i - f0) / fo * Math.PI / 2);
  }
  c.fade(c.finish(out, 0.85, 1.05), xfOn ? 10 : 20, sr);
  return { samples: out };
}
