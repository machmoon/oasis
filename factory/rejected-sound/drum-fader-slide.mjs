// Drum fader slide: a fader cap dragged along its slot. A stick-slip impulse train (rate tied to a hand-shaped velocity curve) rings a bank of panel/rail resonators (hollow plastic vs high-Q metal zing), over a rubbing hiss, a velocity-tracking squeal and a low cap rumble; no end-stop knock, the cap just lifts off and the resonators decay.
export const meta = {
  title: "Fader Slide", kind: "foley", format: "sound", duration: 1, price: 1, author: "kickdrum", payout: "kickdrum@creators.oasis.example", kit: "Drum Machine", description: "A small level fader slid along a drum machine panel, with plastic or metal cap, travel distance, speed and friction as knobs; for UI-adjacent foley, hardware tweaks and music-tech scenes.",
  tags: ["fader", "slide", "drum machine", "hardware", "panel", "foley", "mixer", "slider"],
};
export const params = { knobs: {
  fader: { type: "choice", label: "Fader", default: "plastic", options: ["plastic", "metal"] },
  distance: { type: "range", label: "Distance", default: 0.6, min: 0, max: 1, step: 0.01 },
  speed: { type: "range", label: "Speed", default: 0.5, min: 0, max: 1, step: 0.01 },
  friction: { type: "range", label: "Friction", default: 0.4, min: 0, max: 1, step: 0.01 },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + (p.fader === "metal" ? 97 : 11));
  const metal = p.fader === "metal", f = p.friction, sp = p.speed;
  const slide = 0.3 + 0.9 * p.distance * (1.1 - 0.4 * sp) + 0.1 * (1 - sp);
  const n = c.seconds(slide, sr), tail = c.seconds(0.25, sr), N = n + tail, t0 = 0.015;
  const pts = []; for (let k = 0; k < 8; k++) pts.push(0.6 + 0.4 * r());
  const V = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const u = i / n, x = u * 7, k = Math.floor(x), fr = x - k, b = pts[k] * (1 - fr) + pts[Math.min(7, k + 1)] * fr;
    const t = i / sr, end = Math.min(1, (1 - u) / 0.18);
    V[i] = b * Math.min(1, t / 0.025) * (1 + 0.45 * Math.exp(-t / 0.05)) * Math.sin(Math.PI / 2 * Math.max(0, end));
  }
  const rate = (500 + 1000 * sp) * (1 - 0.55 * f), exc = new Float32Array(N), hiss = c.noise(r, N);
  let ph = r(), ps = r();
  for (let i = 0; i < n; i++) {
    const v = V[i];
    ps += (30 + 90 * v) / sr; ps -= Math.floor(ps);
    const m = 1 - f * 0.75 * ps;
    ph += rate * v / sr;
    if (ph >= 1) { ph -= 1; exc[i] += Math.pow(0.25 + 0.75 * r(), 1 + 2 * f) * (r() < 0.5 ? 1 : -1) * v * m * 2.5; }
    exc[i] += hiss[i] * v * m * (0.05 + 0.05 * sp);
  }
  const modes = metal ? [[2900, 16, 1], [5100, 20, 0.7], [7400, 12, 0.35]] : [[850, 3, 1], [2300, 4, 0.8], [4300, 2.5, 0.4]];
  const sig = new Float32Array(N), fl = modes.map(([fq, q, a]) => [c.biquad("bp", fq * (0.95 + 0.1 * r()), q, sr), a]);
  const hp = c.biquad("hp", metal ? 1500 : 500, 0.7, sr);
  for (let i = 0; i < N; i++) {
    let s = 0;
    for (const [fn, a] of fl) s += fn(exc[i]) * a;
    sig[i] = s * (metal ? 0.9 : 1.2) + hp(exc[i]) * 0.25;
  }
  const fq = metal ? 3300 : 1900, g0 = 6 + 8 * r(), g1 = r() * 6.28, sq = c.osc("sine", (t, i) => fq * (0.75 + 0.5 * V[Math.min(n - 1, i)]), n, sr);
  const low = c.brown(r, n), lp = c.biquad("lp", 260, 0.8, sr);
  for (let i = 0; i < n; i++) {
    const gate = Math.pow(Math.max(0, Math.sin(i / sr * g0 + g1)), 2);
    sig[i] += sq[i] * V[i] * gate * (0.03 + 0.2 * f * f) * (metal ? 1.3 : 0.7) * (0.5 + sp);
    sig[i] += lp(low[i]) * V[i] * (metal ? 0.5 : 2.2) * (0.4 + f);
  }
  const out = new Float32Array(c.seconds(t0, sr) + N);
  c.mix(out, sig, t0, 1, sr);
  c.finish(out, 0.85, 1.05);
  c.fade(out, 15, sr);
  return { samples: out };
}
