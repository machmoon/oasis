// Pipe Groan: old plumbing in a wall. A stick-slip groan (a bowed harmonic stack with a gliding fundamental and sawtooth slip pulses, formant-swept so the vowel of the pipe moves), a thin pressure hiss, hard pipe knocks (bright struck ring, wall thud, click), and a reverb tail that rings out.
export const meta = {
  title: "Pipe Groan", kind: "sfx", format: "sound", duration: 3, price: 3, author: "hollowbody", payout: "hollowbody@creators.oasis.example", kit: "Horror House", description: "Old plumbing groaning and knocking inside a wall, with copper or iron resonance, water pressure, knock amount and pitch as knobs; for haunted-house and abandoned-building scenes.",
  tags: ["pipe", "plumbing", "groan", "knock", "horror", "house", "metal", "creepy"],
};
export const params = { knobs: {
  pipe: { type: "choice", label: "Pipe", default: "copper", options: ["copper", "iron"] },
  pressure: { type: "range", label: "Pressure", default: 0.5, min: 0, max: 1, step: 0.01 },
  knock: { type: "range", label: "Knock amount", default: 0.5, min: 0, max: 1, step: 0.01 },
  pitch: { type: "range", label: "Pitch", default: 0.5, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Room tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + (p.pipe === "iron" ? 71 : 13)), dur = 3, n = c.seconds(dur, sr), out = new Float32Array(n);
  const iron = p.pipe === "iron", pr = p.pressure, base = (iron ? 70 : 150) * Math.pow(2, p.pitch * 1.5) * (0.97 + r() * 0.06);
  const harm = iron ? [1, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3] : [0.5, 1, 0.3, 0.8, 0.15, 0.5, 0.1, 0.3];
  const tone = new Float32Array(n), hiss = c.pink(r, n), bp = c.biquad("bp", 2200 + 2000 * pr, 1.5, sr);
  const gs = 0.2 + 0.6 * r(), ge = gs + (r() < 0.5 ? -1 : 1) * (0.25 + 0.2 * r()), gdur = 1.6 + 0.8 * r();
  const g0 = 0.15 + 0.5 * r(), B = 32, hn = harm.length;
  let rate = 8, sp = 0, dr = 0, ph = 0, f = base, gain = 0, fc = 3;
  for (let i = 0; i < n; i++) {
    if (i % B === 0) {
      const t = i / sr, b = i / B, u = c.clamp((t - g0) / gdur, 0, 1), s = u * u * (3 - 2 * u);
      if (b % 8 === 0) rate = (5 + 14 * pr) * (0.5 + r());
      if (b % 40 === 0) dr += (r() - 0.5) * 0.02;
      sp = (sp + B / sr * rate) % 1;
      f = base * (1 + gs + (ge - gs) * s - 0.25 + dr) * (1 - 0.05 * (1 - sp) * (1 - sp));
      const on = Math.min(1, (t - g0) * 12) * Math.min(1, Math.max(0, (g0 + gdur + 0.35 - t) / 0.5));
      gain = Math.max(0, on) * (0.15 + 0.85 * Math.pow(sp, 0.7)) * (0.5 + 0.5 * pr);
      fc = (iron ? 2.5 : 4) + 3 * s + 2 * sp;
    }
    ph += c.TAU * f / sr;
    const s1 = Math.sin(ph), c2 = 2 * Math.cos(ph);
    let a = 0, b = s1, s = 0, w;
    for (let h = 0; h < hn; h++) {
      if (h) { const nx = c2 * b - a; a = b; b = nx; }
      const d = (h + 1 - fc) / 1.6;
      w = harm[h] * (0.25 + Math.exp(-d * d));
      s += b * w;
    }
    tone[i] = s * gain;
    hiss[i] = bp(hiss[i]) * gain * (0.04 + 0.25 * pr);
  }
  c.mix(out, tone, 0, iron ? 0.38 : 0.34, sr);
  c.mix(out, hiss, 0, 1, sr);
  const knocks = 1 + Math.round(p.knock * 6), kb = iron ? [[base * 2.3, 1], [base * 3.9, 0.6], [base * 6.1, 0.4]] : [[base * 3.1, 1], [base * 5.4, 0.8], [base * 8.7, 0.6], [base * 13, 0.3]];
  let t0 = g0 + gdur * (0.3 + 0.3 * r()) + 0.35 * (1 - p.knock);
  for (let k = 0; k < knocks; k++) {
    const a = (k === 0 ? 1 : 0.5 + 0.4 * r()) * (0.6 + 0.4 * p.knock), det = 0.99 + r() * 0.02;
    c.mix(out, c.ring(kb.map(([fr, m]) => [fr * det, m]), 0.7, iron ? 0.14 : 0.3, sr), t0, 0.8 * a, sr);
    c.mix(out, c.ring([[65 + r() * 40, 1], [150 + r() * 60, 0.5]], 0.2, 0.05, sr), t0, 0.9 * a, sr);
    c.mix(out, c.burst(r, 0.008, "bp", iron ? 1800 : 3200, 1, 0.0004, 0.002, sr), t0, 0.7 * a, sr);
    t0 += r() < 0.4 ? 0.08 + r() * 0.06 : 0.3 + r() * 0.35;
    if (t0 > dur - 1) break;
  }
  let res = out;
  if (p.tail) res = c.reverb(out, { size: 0.65, decay: 0.6, mixAmt: 0.45 }, sr);
  const o = new Float32Array(n); o.set(res.subarray(0, n));
  c.fade(o, 30, sr);
  c.finish(o, 0.85, 1.1);
  c.fade(o, p.tail ? 120 : 60, sr);
  return { samples: o };
}
