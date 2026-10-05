// Scanner ping: a sonar contact pulse; a chirped sine body with a contact tick, delayed returns that darken and smear with distance, and a clamped medium-coloured reverb tail.
export const meta = {
  title: "Contact Ping", kind: "sfx", format: "sound", duration: 2, price: 2, author: "quietmachine", payout: "quietmachine@creators.oasis.example", kit: "Sci-fi Console", description: "A sonar-style contact ping whose echoes return through space, a metal hull or deep fluid; pitch, return count, range and the tail are knobs for scanners, radar locks and submarine bridges.",
  tags: ["sonar", "ping", "scanner", "sci-fi", "radar", "echo", "console", "contact"],
};
export const params = { knobs: {
  medium: { type: "choice", label: "Medium", default: "fluid", options: ["space", "hull", "fluid"] },
  pitch: { type: "range", label: "Pitch (Hz)", default: 1100, min: 400, max: 2400, step: 10 },
  returns: { type: "range", label: "Return count", default: 3, min: 1, max: 6, step: 1 },
  distance: { type: "range", label: "Distance", default: 0.4, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, mi = params.knobs.medium.options.indexOf(p.medium), r = c.rng(p.seed * 7121 + mi * 313 + 11);
  const M = {
    space: { dec: 0.13, bright: 0.55, glide: 0.04, gap: 1, subs: 1, smear: 0.0015, dop: 0.012, lp: 9000, rv: [0.5, 0.5, 0.14], flut: 0 },
    hull: { dec: 0.07, bright: 0.25, glide: 0.015, gap: 0.55, subs: 2, smear: 0.006, dop: 0.002, lp: 6000, rv: [0.3, 0.4, 0.16], flut: 0 },
    fluid: { dec: 0.17, bright: 0.1, glide: 0.025, gap: 1.2, subs: 2, smear: 0.012, dop: 0.005, lp: 2600, rv: [0.8, 0.6, 0.2], flut: 0.18 },
  }[p.medium];
  const d = p.distance, f = p.pitch * (0.99 + 0.02 * r()), R = Math.round(p.returns);
  const ping = (fr, dec, bright, glide) => {
    const n = c.seconds(dec * 6 + 0.01, sr), sw = t => fr * (1 + glide * Math.exp(-t / 0.015));
    const tone = c.osc("sine", sw, n, sr), h = c.osc("sine", t => 2 * sw(t), n, sr), e = c.env(n, 0.002, dec, sr);
    for (let i = 0; i < n; i++) tone[i] = (tone[i] + bright * 0.35 * h[i]) * e[i];
    if (p.medium === "hull") c.mix(tone, c.ring([[fr * 2.76, 0.35], [fr * 2.76 * 1.006, 0.3], [fr * 5.41, 0.18], [fr * 5.41 * 0.996, 0.15]], dec * 5, dec * 1.4, sr), 0.001, 0.5, sr);
    return tone;
  };
  const gap0 = (0.07 + 0.26 * d) * M.gap, rdec = Math.max(0.03, Math.min(M.dec * (1 + 0.8 * d), gap0 * 0.45)), onsets = [];
  let t = 0.004 + M.dec * 0.6;
  for (let k = 0; k < R; k++) { t += gap0 * (0.75 + 0.5 * r()); onsets.push(t); }
  const len = Math.min(3.95, t + rdec * 6 + (p.tail ? 1.2 : 0.05));
  let out = new Float32Array(c.seconds(len, sr));
  c.mix(out, ping(f, M.dec, M.bright, M.glide), 0.004, 0.9, sr);
  c.mix(out, c.burst(r, 0.006, "hp", 3000 + f, 0.8, 0.0004, 0.0015, sr), 0.003, 0.25 + 0.2 * M.bright, sr);
  for (let k = 0; k < R; k++) {
    const fr = f * (1 + (r() - 0.5) * 2 * M.dop), buf = ping(fr, rdec, M.bright * (1 - 0.6 * d), M.glide * 0.5);
    c.filter(buf, c.biquad("lp", Math.max(300, M.lp * (1 - 0.7 * d) * Math.pow(0.82, k)), 0.7, sr));
    if (M.flut > 0) {
      const ph = r() * c.TAU, rate = 3 + 3 * r();
      for (let i = 0; i < buf.length; i++) buf[i] *= 1 + M.flut * Math.sin(c.TAU * rate * i / sr + ph);
    }
    const g = (0.6 - 0.3 * d) * Math.pow(0.72, k) * (0.8 + 0.4 * r());
    for (let s = 0; s < M.subs; s++) {
      const off = s === 0 ? 0 : M.smear * (0.4 + r()) * (1 + d);
      c.mix(out, buf, onsets[k] + off, g * (s === 0 ? 1 : 0.25 + 0.2 * r()), sr);
    }
  }
  if (p.tail) {
    const dens = 1 - 0.07 * (R - 1);
    const wet = c.reverb(out, { size: M.rv[0], decay: Math.min(0.75, (M.rv[1] + 0.15 * d) * dens), mixAmt: M.rv[2] * dens }, sr);
    if (wet) out = wet;
  }
  c.finish(out, 0.85);
  let end = out.length - 1;
  while (end > 0 && Math.abs(out[end]) < 0.004) end--;
  const keep = Math.min(out.length, end + c.seconds(0.03, sr));
  if (keep < out.length) out = out.slice(0, keep);
  const fl = Math.min(out.length >> 2, c.seconds(0.06, sr));
  for (let i = 0; i < fl; i++) out[out.length - 1 - i] *= i / fl;
  c.fade(out, 2, sr);
  return { samples: out };
}
