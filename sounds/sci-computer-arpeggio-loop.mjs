// Retro computer arpeggio: a seeded 16/32-step motif on a circular timeline, voiced as sine, filtered square or FM bleeps, over a downbeat bass pulse, a loop-locked console drone bed and dotted-eighth echoes wrapped around the loop.
export const meta = {
  title: "Bridge Arpeggio", kind: "music-loop", format: "sound", duration: 2, price: 3, author: "kickdrum", payout: "kickdrum@creators.oasis.example", kit: "Sci-fi Console", description: "A loopable retro computer arpeggio of crisp bleeping notes whose scale, tempo, waveform, brightness and echo are knobs, for starship bridges, terminals and sci-fi menus.",
  tags: ["arpeggio", "retro", "computer", "loop", "sci-fi", "bleep", "chiptune", "console"],
};
export const params = { knobs: {
  scale: { type: "choice", label: "Scale", default: "minor", options: ["major", "minor", "whole-tone"] },
  wave: { type: "choice", label: "Wave", default: "square", options: ["sine", "square", "fm"] },
  tempo: { type: "range", label: "Tempo (BPM)", default: 120, min: 80, max: 160, step: 1 },
  brightness: { type: "range", label: "Brightness", default: 0.5, min: 0, max: 1, step: 0.01 },
  echo: { type: "range", label: "Echo", default: 0.35, min: 0, max: 1, step: 0.01 },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 4513 + params.knobs.scale.options.indexOf(p.scale) * 97 + 3);
  const step = 60 / p.tempo / 4, steps = 16 * step < 1.95 ? 32 : 16;
  const N = Math.round(steps * step * sr), out = new Float32Array(N);
  const stepN = N / steps, off = Math.round(0.012 * sr), b = p.brightness;
  const scale = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], "whole-tone": [0, 2, 4, 6, 8, 10] }[p.scale];
  const L = scale.length, root = 57 + Math.floor(r() * 6);
  const shapes = [[0, 2, 4, 6, 7, 6, 4, 2], [0, 2, 4, 7, 4, 2, 0, 4], [0, 4, 2, 6, 4, 7, 6, 2], [0, 2, 4, 2, 7, 4, 6, 4]];
  const shape = shapes[Math.floor(r() * shapes.length)], shift = [3, 5, 4, -2][Math.floor(r() * 4)];
  const shift2 = [-1, 1, 2, -3][Math.floor(r() * 4)], prog = [0, shift, 0, shift2];
  const midi = (d) => { const o = Math.floor(d / L), k = ((d % L) + L) % L; return root + 12 * o + scale[k]; };
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const addWrap = (buf, at, g) => { for (let i = 0; i < buf.length; i++) out[(at + i) % N] += buf[i] * g; };
  const taper = (x, ms) => { const m = Math.min(x.length, Math.round(ms * 0.001 * sr)); for (let i = 0; i < m; i++) x[x.length - 1 - i] *= i / m; return x; };
  const voice = (f, n) => {
    const x = new Float32Array(n), e = c.env(n, 0.0015, step * (0.4 + 0.15 * b), sr), w = c.TAU * f / sr;
    if (p.wave === "sine") {
      let ph = 0;
      for (let i = 0; i < n; i++) { ph += w * (1 + 0.5 * Math.exp(-i / (0.004 * sr))); x[i] = (Math.sin(ph) + 0.35 * b * Math.sin(3 * ph) + 0.15 * b * Math.sin(5 * ph)) * e[i]; }
    } else if (p.wave === "square") {
      const s = c.osc("square", f, n, sr), lp = c.biquad("lp", Math.min(f * (2.5 + 14 * b), sr * 0.45), 0.8, sr);
      for (let i = 0; i < n; i++) x[i] = lp(s[i]) * e[i] * 0.55;
    } else {
      const idx = 0.5 + 5 * b;
      for (let i = 0; i < n; i++) { const ph = w * i; x[i] = Math.sin(ph + idx * e[i] * Math.sin(2 * ph)) * e[i] * 0.8; }
    }
    return taper(x, 4);
  };
  const notes = [];
  for (let s = 0; s < steps; s++) {
    const d = shape[s % 8] + prog[Math.floor(s / 8) % (steps / 8)];
    const m = midi(d) + (s % 4 !== 0 && r() < 0.18 ? 12 : 0);
    const vel = s % 4 === 0 ? 1 : 0.7 + 0.25 * r();
    const at = off + Math.round(s * stepN + (r() - 0.5) * 0.0015 * sr);
    const x = voice(hz(m), Math.round(stepN * (s === steps - 1 ? 0.92 : 0.98)));
    addWrap(x, at, vel);
    notes.push([x, at, vel]);
  }
  for (let s = 0; s < steps; s += 8) {
    const n = Math.round(stepN * 2.6), f = hz(midi(prog[s / 8]) - 12), x = c.osc("tri", f, n, sr), e = c.env(n, 0.003, step * 0.9, sr);
    for (let i = 0; i < n; i++) x[i] *= e[i];
    addWrap(taper(x, 8), off + Math.round(s * stepN), 0.34);
  }
  const loopHz = (f) => Math.max(1, Math.round(f * N / sr)) * sr / N;
  const f1 = loopHz(hz(root - 12)), f2 = loopHz(hz(root - 5)), bars = steps / 16, wob = 0.3 + 0.4 * r();
  for (let i = 0; i < N; i++) {
    const t = i / N, sw = 0.75 + 0.25 * Math.cos(c.TAU * (t * bars * 2 + wob));
    const a = c.TAU * f1 * i / sr, d = c.TAU * f2 * i / sr;
    out[i] += (Math.sin(a) + 0.25 * b * Math.sin(2 * a) + 0.5 * Math.sin(d)) * 0.075 * sw;
  }
  if (p.echo > 0) {
    const fast = (p.tempo - 80) / 80, fb = (0.38 + 0.2 * p.echo) * (1 - 0.3 * fast);
    const wet = p.echo * 0.55 * (1 - 0.35 * fast), delay = Math.round(3 * stepN);
    for (const [x, at, vel] of notes) {
      const lp = c.onepole(sr), y = new Float32Array(x.length);
      for (let i = 0; i < x.length; i++) y[i] = lp(x[i], 1500 + 2500 * b);
      let g = wet * vel;
      for (let k = 1; k <= 3; k++, g *= fb) addWrap(y, at + k * delay, g);
    }
  }
  c.finish(out, 0.85);
  c.fade(out, 10, sr);
  return { samples: out };
}
