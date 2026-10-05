// Back-alley drips: a loopable night bed of a leak dripping into a bucket, dumpster lid or downpipe, puddle plinks and a gurgling gutter trickle (pitched bubbles over running water), discrete alley-wall echoes on the drips, and a far city wash with a distant siren.
export const meta = {
  title: "Back-Alley Drips", kind: "ambience", format: "sound", kit: "Rainy City Street", duration: 2, price: 3, author: "oasis-factory",
  description: "A quiet, loopable back-alley bed after the rain: drips plinking into a bucket, tinking on a dumpster lid or bonking down a pipe over a gurgling gutter and a far-off city, for night street scenes and wet urban levels.",
  tags: ["drips", "alley", "rain", "gutter", "ambience", "loop", "night", "city"],
};
export const params = { knobs: {
  container: { type: "choice", label: "Drips into", default: "bucket", options: ["bucket", "dumpster", "pipe"] },
  density: { type: "range", label: "Drip density", default: 0.45, min: 0, max: 1, step: 0.01 },
  echo: { type: "range", label: "Echo amount", default: 0.4, min: 0, max: 1, step: 0.01 },
  city: { type: "range", label: "Distant city", default: 0.35, min: 0, max: 1, step: 0.01 },
  rate: { type: "range", label: "Drip rate (per s)", default: 1.5, min: 0.5, max: 4, step: 0.05 },
  length: { type: "range", label: "Length (s)", default: 2, min: 2, max: 4, step: 0.5 },
  loop: { type: "toggle", label: "Loop crossfade", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 6151 + params.knobs.container.options.indexOf(p.container) * 389 + 11);
  const L = Math.min(4, p.length), n = c.seconds(L, sr), X = p.loop ? c.seconds(0.3, sr) : 0, N = n + X, T = N / sr;
  const drips = new Float32Array(N), out = new Float32Array(N), B = (lo, hi) => c.between(r, lo, hi);
  const tEnd = p.loop ? T - 0.05 : L - 1.0;
  const norm = (b, target) => { let s = 0; for (let i = 0; i < b.length; i++) s += b[i] * b[i]; const g = target / Math.sqrt(s / b.length + 1e-12); for (let i = 0; i < b.length; i++) b[i] *= g; return b; };
  const bubble = (buf, at, f0, rise, dur, amp) => {
    const s0 = Math.floor(at * sr), m = Math.max(8, Math.floor(dur * sr)), dk = Math.exp(-6.9 / m), atk = Math.max(1, Math.floor(0.0006 * sr));
    let ph = 0, e = amp;
    for (let k = 0; k < m; k++) { const i = s0 + k; if (i >= buf.length) break; ph += c.TAU * f0 * (1 + rise * k / m) / sr; buf[i] += Math.sin(ph) * e * Math.min(1, k / atk); e *= dk; }
  };
  const fa = B(0.3, 0.6), fb = B(0.8, 1.6), pa = B(0, 6.28), pb = B(0, 6.28);
  const gate = t => 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(c.TAU * fa * t + pa)) * (0.6 + 0.4 * Math.sin(c.TAU * fb * t + pb));
  const mass = c.noise(r, N), bp = c.biquad("bp", 450, 0.7, sr), lp = c.biquad("lp", 1600, 0.7, sr); let gv = 1;
  for (let i = 0; i < N; i++) { if ((i & 63) === 0) gv = gate(i / sr); mass[i] = lp(bp(mass[i])) * gv; }
  norm(mass, 0.02 + 0.03 * p.density);
  for (let i = 0; i < N; i++) out[i] += mass[i];
  const trate = 25 + 140 * p.density;
  for (let t = 0; ;) {
    const g = gate(t); t += -Math.log(1 - r() * 0.999) / (trate * g); if (t >= T - 0.05) break;
    const low = r() < 0.12;
    bubble(out, t, low ? B(250, 520) : B(800, 2600), B(0.3, 1.1), low ? B(0.02, 0.04) : B(0.004, 0.013), (low ? 0.1 : 0.04 + 0.06 * r()) * (0.6 + 0.4 * g));
  }
  const plinks = Math.round((0.6 + 6 * p.density) * Math.max(0.5, tEnd));
  for (let d = 0; d < plinks; d++) {
    const t = 0.02 + r() * Math.max(0.1, tEnd - 0.08);
    bubble(drips, t + 0.001, B(1100, 3400), B(0.5, 1.4), B(0.02, 0.05), B(0.12, 0.35));
    c.mix(drips, c.burst(r, 0.003, "hp", 3500, 0.7, 0.0003, 0.0008, sr), t, 0.08, sr);
  }
  const kb = 0.92 + 0.16 * r(), pf = B(300, 430);
  const drop = t => {
    const k = kb * (0.985 + 0.03 * r()), v = 0.75 + 0.25 * r();
    if (p.container === "bucket") {
      c.mix(drips, c.burst(r, 0.006, "hp", 2800, 0.7, 0.0004, 0.0015, sr), t, 0.3 * v, sr);
      bubble(drips, t + 0.002, B(480, 820) * k, B(0.8, 1.6), B(0.03, 0.06), 0.75 * v);
      c.mix(drips, c.ring([[210 * k, 1], [480 * k, 0.5], [890 * k, 0.25]], 0.07, 0.012, sr), t + 0.001, 0.3 * v, sr);
      if (r() < 0.3) bubble(drips, t + B(0.04, 0.09), B(900, 1500), 1, 0.02, 0.25 * v);
    } else if (p.container === "dumpster") {
      c.mix(drips, c.burst(r, 0.004, "hp", 4500, 0.8, 0.0003, 0.001, sr), t, 0.45 * v, sr);
      c.mix(drips, c.ring([[1170 * k, 1], [2650 * k, 0.7], [4210 * k, 0.45], [5830 * k, 0.25]], 0.4, 0.08, sr), t + 0.0005, 0.6 * v, sr);
      c.mix(drips, c.ring([[92 * k, 1], [151 * k, 0.6]], 0.2, 0.035, sr), t + 0.001, 0.35 * v, sr);
    } else {
      const body = c.ring([1, 0.6, 0.4, 0.22, 0.12].map((a, j) => [pf * k * (j + 1) * (1 + 0.004 * j * r()), a]), 0.3, 0.05, sr);
      c.mix(drips, c.burst(r, 0.005, "bp", 1600, 2, 0.0004, 0.0015, sr), t, 0.3 * v, sr);
      c.mix(drips, body, t + 0.0005, 0.5 * v, sr);
      c.mix(drips, body, t + 0.017, 0.28 * v, sr);
      c.mix(drips, body, t + 0.034, 0.13 * v, sr);
      bubble(drips, t + 0.05, B(260, 360), 0.8, 0.03, 0.2 * v);
    }
  };
  for (let t = 0.05 + r() * 0.4 / p.rate; t < tEnd; t += (0.8 + 0.4 * r()) / p.rate) drop(t);
  let pk = 1e-9; for (let i = 0; i < N; i++) pk = Math.max(pk, Math.abs(drips[i]));
  const th = Math.tanh(1.4); for (let i = 0; i < N; i++) drips[i] = Math.tanh(1.4 * drips[i] / pk) / th;
  if (p.echo > 0) {
    const dark = new Float32Array(N), f = c.onepole(sr), cut = 3600 - 1800 * p.echo;
    for (let i = 0; i < N; i++) dark[i] = f(drips[i], cut);
    const taps = [[0.083, 0.55], [0.131, 0.42], [0.197, 0.32], [0.29, 0.22], [0.41, 0.14]];
    for (const [d, g] of taps) c.mix(out, dark, d * (0.9 + 0.2 * p.echo), g * 0.75 * p.echo, sr);
  }
  c.mix(out, drips, 0, 0.55, sr);
  if (p.city > 0) {
    const rum = c.brown(r, N), rl = c.biquad("lp", 150, 0.7, sr), hiss = c.pink(r, N), hb = c.biquad("bp", 650, 0.5, sr), sw = B(0.3, 0.6), sp = B(0, 6.28);
    for (let i = 0; i < N; i++) { rum[i] = rl(rum[i]); hiss[i] = hb(hiss[i]) * (0.55 + 0.45 * Math.sin(c.TAU * sw * i / sr + sp)); }
    norm(rum, 0.05 * p.city); norm(hiss, 0.03 * p.city);
    const wr = B(0.5, 0.9), wp = B(0, 6.28), sf = B(650, 800);
    const sir = c.osc("tri", t => sf + 170 * Math.sin(c.TAU * wr * t + wp), N, sr), sl = c.biquad("lp", 1300, 0.7, sr);
    for (let i = 0; i < N; i++) { const s = Math.sin(Math.PI * i / N); sir[i] = sl(sir[i]) * s * s; }
    norm(sir, 0.018 * p.city);
    for (let i = 0; i < N; i++) out[i] += rum[i] + hiss[i] + sir[i];
  }
  const res = new Float32Array(n);
  for (let i = 0; i < n; i++) res[i] = out[i];
  if (p.loop) {
    for (let i = 0; i < X; i++) { const a = (i / X) * Math.PI / 2; res[i] = out[i] * Math.sin(a) + out[n + i] * Math.cos(a); }
    c.finish(res, 0.6);
    c.fade(res, 12, sr);
  } else {
    const rel = c.seconds(Math.min(0.5, L * 0.2), sr);
    for (let i = 0; i < rel; i++) { const g = Math.cos((i / rel) * Math.PI / 2); res[n - rel + i] *= g * g; }
    c.finish(res, 0.6);
    c.fade(res, 15, sr);
  }
  return { samples: res };
}
