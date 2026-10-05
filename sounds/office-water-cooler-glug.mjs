// Water cooler dispense: tap click, a thinner pouring stream that rises in pitch as the cup fills, bottle-top glugs (air gulping up the inverted bottle, each with a sag in the stream) or a plumbed pump hum, rising bubble pops, and a closing drip tail.
export const meta = {
  title: "Cooler Glug Pour", kind: "sfx", format: "sound", duration: 2.7, price: 2, author: "foleyroom", payout: "foleyroom@creators.oasis.example", kit: "Office", description: "A water cooler dispensing into a cup, with bottle glugs or a plumbed hum, bubbles and a cup that rises in pitch as it fills; for office scenes and break-room foley.",
  tags: ["water", "cooler", "office", "glug", "pour", "bubbles", "dispense", "foley"],
};
export const params = { knobs: {
  type: { type: "choice", label: "Cooler type", default: "bottle top", options: ["bottle top", "plumbed"] },
  rate: { type: "range", label: "Pour duration rate", default: 1, min: 0.5, max: 2, step: 0.05 },
  glug: { type: "range", label: "Glug intensity", default: 0.6, min: 0, max: 1, step: 0.01 },
  fill: { type: "range", label: "Cup fill pitch", default: 0.5, min: 0, max: 1, step: 0.01 },
  bubbles: { type: "range", label: "Bubble density", default: 0.5, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Drip tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + (p.type === "plumbed" ? 91 : 13));
  const t0 = 0.12, tailLen = p.tail ? 0.7 : 0.25;
  const pour = Math.min(1.9 / p.rate, 3.8 - t0 - tailLen), total = t0 + pour + tailLen;
  const out = new Float32Array(c.seconds(total, sr));
  const bottle = p.type === "bottle top";
  const gt = [];
  if (bottle) {
    const cnt = Math.round(3 + 7 * p.glug + pour * 2);
    let t = t0 + 0.1;
    for (let k = 0; k < cnt && t < t0 + pour - 0.15; k++) { gt.push([t, 0.09 + 0.06 * r()]); t += 0.2 + r() * (0.35 - 0.15 * p.glug); }
  }
  c.mix(out, c.burst(r, 0.012, "hp", 2500, 0.8, 0.0004, 0.003, sr), 0.02, 0.5, sr);
  c.mix(out, c.ring([[180, 1], [410, 0.4]], 0.08, 0.02, sr), 0.025, 0.35, sr);
  const n = c.seconds(pour, sr), s = c.noise(r, n), bp = c.biquad("bp", 1500, 1.5, sr), lp = c.onepole(sr);
  const f0 = 700 + 700 * p.fill, f1 = f0 * (1.5 + 1.2 * p.fill);
  let fl = 1, gi = 0;
  for (let i = 0; i < n; i++) {
    if (i % 90 === 0) fl = 0.6 + 0.4 * r();
    const u = i / n, tt = i / sr;
    while (gi < gt.length - 1 && tt > gt[gi][0] - t0 + gt[gi][1]) gi++;
    let sag = 1;
    if (gt.length) { const g0 = gt[gi], x = (tt - (g0[0] - t0)) / g0[1]; if (x > 0 && x < 1) sag = 1 - 0.65 * p.glug * Math.sin(Math.PI * x); }
    const g = Math.min(1, u * 40) * Math.min(1, (1 - u) * 25) * (0.8 + 0.2 * u);
    s[i] = lp(bp(s[i]), f0 + (f1 - f0) * u) * fl * g * sag;
  }
  c.mix(out, s, t0, bottle ? 1.0 : 1.1, sr);
  const rn = c.seconds(pour, sr);
  const res = c.osc("sine", (t) => (260 + 320 * p.fill) * (1 + 1.6 * (t / pour)), rn, sr);
  for (let i = 0; i < rn; i++) { const u = i / rn; res[i] *= 0.1 * Math.min(1, u * 30) * Math.min(1, (1 - u) * 20) * (0.6 + 0.4 * Math.sin(i / sr * 37)); }
  c.mix(out, res, t0, 1, sr);
  if (bottle) {
    for (const [t, d] of gt) {
      const f = 130 + 110 * r() + 90 * p.fill;
      const gl = c.osc("sine", (x) => f * (0.6 + 1.3 * Math.min(1, x / d)), c.seconds(d, sr), sr);
      const gl2 = c.osc("sine", (x) => 2.1 * f * (0.6 + 1.3 * Math.min(1, x / d)), c.seconds(d, sr), sr);
      const e = c.env(gl.length, 0.01, d * 0.45, sr);
      for (let i = 0; i < gl.length; i++) gl[i] = (gl[i] + 0.3 * gl2[i]) * e[i];
      c.mix(out, gl, t, 0.3 + 0.9 * p.glug, sr);
      c.mix(out, c.burst(r, 0.05, "bp", 500 + 300 * r(), 2, 0.004, 0.02, sr), t, 0.3 * p.glug, sr);
    }
  } else {
    const hn = c.seconds(pour + 0.1, sr), h = c.osc("saw", 96 + 4 * r(), hn, sr), hl = c.biquad("lp", 380, 1, sr);
    for (let i = 0; i < hn; i++) h[i] = hl(h[i]) * 0.25 * (1 + 0.2 * Math.sin(i / sr * 11)) * Math.min(1, i / (0.05 * sr)) * Math.min(1, (hn - i) / (0.05 * sr));
    c.mix(out, h, t0 - 0.05, 0.4 + 0.3 * p.glug, sr);
    for (let k = 0; k < 2 + 4 * p.glug; k++) c.mix(out, c.burst(r, 0.08, "bp", 250 + 200 * r(), 2, 0.01, 0.03, sr), t0 + r() * pour, 0.2, sr);
  }
  const nb = Math.round(10 + 70 * p.bubbles);
  for (let b = 0; b < nb; b++) {
    const u = Math.pow(r(), 0.8), f = 500 + 1800 * r() + 1200 * u * p.fill, d = 0.015 + 0.02 * r();
    const bb = c.osc("sine", (x) => f * (1 + 2.5 * x / d), c.seconds(d, sr), sr), e = c.env(bb.length, 0.001, d * 0.4, sr);
    for (let i = 0; i < bb.length; i++) bb[i] *= e[i];
    c.mix(out, bb, t0 + 0.05 + u * (pour - 0.1), 0.15 + 0.4 * r(), sr);
  }
  c.mix(out, c.burst(r, 0.01, "hp", 2200, 0.8, 0.0004, 0.003, sr), t0 + pour, 0.35, sr);
  if (p.tail) for (let d = 0; d < 3; d++) {
    const f = 900 + 500 * r() + 400 * p.fill, dd = 0.05, dr = c.osc("sine", (x) => f * (1 + 1.5 * x / dd), c.seconds(dd, sr), sr), e = c.env(dr.length, 0.001, 0.015, sr);
    for (let i = 0; i < dr.length; i++) dr[i] *= e[i];
    c.mix(out, dr, t0 + pour + 0.12 + d * (0.14 + 0.1 * r()), 0.4 - d * 0.08, sr);
  }
  c.fade(c.finish(out, 0.85, 1.1), 12, sr);
  return { samples: out };
}
