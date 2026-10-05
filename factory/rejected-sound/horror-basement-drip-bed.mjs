// Damp basement: a low room-tone bed (brown rumble + pink air), a pipe hum with a slow beat, and scattered drips (a sine plink with a pitch rise plus a wet click) that feed a reverb for the echo knob. Periodic modulation makes the bed loop by design.
export const meta = {
  title: "Damp Basement Drip", kind: "ambience", format: "sound", duration: 3, price: 4, author: "oasis-factory", kit: "Horror House",
  description: "A loopable damp basement bed with scattered echoing drips, a low pipe hum and a cold room tone; use it under cellar exploration or a slow horror scene.",
  tags: ["basement", "drip", "water", "horror", "cellar", "ambience", "loop", "pipe"],
};
export const params = { knobs: {
  space: { type: "choice", label: "Space", default: "cellar", options: ["cellar", "crawlspace"] },
  drips: { type: "range", label: "Drip density", default: 0.4, min: 0, max: 1, step: 0.01 },
  echo: { type: "range", label: "Echo", default: 0.5, min: 0, max: 1, step: 0.01 },
  hum: { type: "range", label: "Pipe hum", default: 0.4, min: 0, max: 1, step: 0.01 },
  loop: { type: "toggle", label: "Seamless loop", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + 29), dur = 3, n = c.seconds(dur, sr);
  const small = p.space === "crawlspace";
  const out = new Float32Array(n), bed = new Float32Array(n);
  const low = c.brown(r, n), pk = c.pink(r, n);
  const lp = c.biquad("lp", small ? 260 : 150, 0.8, sr), hp = c.biquad("bp", small ? 1400 : 700, 0.8, sr);
  for (let i = 0; i < n; i++) bed[i] = lp(low[i]) * 2.2 + hp(pk[i]) * (small ? 0.12 : 0.05);
  const w = c.TAU / dur;
  for (let i = 0; i < n; i++) bed[i] *= 0.8 + 0.2 * Math.sin(w * i / sr * dur + p.seed);
  c.mix(out, bed, 0, 0.5, sr);
  const f0 = small ? 120 : 60, hum = new Float32Array(n);
  const k1 = Math.round(f0 * dur), k2 = k1 + 3;
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    hum[i] = Math.sin(c.TAU * k1 / dur * t) + 0.5 * Math.sin(c.TAU * k2 / dur * t) + 0.3 * Math.sin(c.TAU * 2 * k1 / dur * t + 1);
  }
  c.mix(out, hum, 0, 0.04 + 0.22 * p.hum, sr);
  const wet = new Float32Array(n);
  const count = Math.round(2 + 14 * p.drips);
  for (let d = 0; d < count; d++) {
    const t = 0.1 + r() * (dur - 0.6), f = (small ? 1500 : 900) * (0.7 + r() * 0.9), len = c.seconds(0.18, sr);
    const x = new Float32Array(len), e = c.env(len, 0.001, 0.035 + r() * 0.03, sr);
    let ph = 0;
    for (let i = 0; i < len; i++) { const tt = i / sr; ph += c.TAU * f * (1 + 1.2 * Math.min(1, tt / 0.03)) / sr; x[i] = Math.sin(ph) * e[i]; }
    const g = 0.35 + 0.45 * r();
    c.mix(out, x, t, g, sr);
    c.mix(out, c.burst(r, 0.006, "bp", 3500, 1.5, 0.0003, 0.002, sr), t, g * 0.5, sr);
    c.mix(wet, x, t, g, sr);
  }
  const rv = c.reverb(wet, { size: small ? 0.25 : 0.8, decay: small ? 0.8 : 2, mixAmt: 1 }, sr);
  c.mix(out, rv, 0, 1.6 * p.echo, sr);
  if (p.loop) {
    const m = c.seconds(0.08, sr);
    for (let i = 0; i < m; i++) { const a = i / m; const j = n - m + i; const tmp = out[j]; out[j] = tmp * (1 - a) + out[i] * a; }
    for (let i = 0; i < m; i++) out[i] = out[n - m + i];
  }
  c.fade(c.finish(out, 0.8, 1.1), p.loop ? 12 : 40, sr);
  return { samples: out };
}
