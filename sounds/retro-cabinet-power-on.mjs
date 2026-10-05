// CRT power-on: relay clack, mains-rate degauss coil with shadow-mask magnetostriction buzz, cabinet thump and damped mask clang, flyback whine gliding to pitch, mains hum and HV static settle.
export const meta = {
  title: "Cabinet Power-On", kind: "foley", format: "sound", duration: 2.2, price: 3, author: "quietmachine", payout: "quietmachine@creators.oasis.example", kit: "Retro Arcade", description: "An arcade CRT booting: relay clack, degauss thunk, a flyback tube whine settling to pitch and mains hum, for cabinet start-ups, attract modes and retro boot screens.",
  tags: ["crt", "degauss", "power-on", "arcade", "monitor", "whine", "hum", "boot"],
};
export const params = { knobs: {
  size: { type: "choice", label: "Monitor size", default: "standard", options: ["small", "standard", "deluxe"] },
  thunk: { type: "range", label: "Thunk", default: 0.7, min: 0, max: 1, step: 0.01 },
  whine: { type: "range", label: "Whine pitch (Hz)", default: 7000, min: 3000, max: 10000, step: 50 },
  hum: { type: "range", label: "Hum", default: 0.4, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Settle tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, si = params.knobs.size.options.indexOf(p.size), r = c.rng(p.seed * 613 + si * 97 + 11);
  const S = [
    { f: 120, tau: 0.3, lp: 1900, mb: 1100, ring: [[430, 1], [1150, 0.5], [2350, 0.3]], rv: 0.25 },
    { f: 82, tau: 0.48, lp: 1400, mb: 760, ring: [[265, 1], [720, 0.5], [1480, 0.3]], rv: 0.45 },
    { f: 56, tau: 0.68, lp: 1050, mb: 480, ring: [[165, 1], [460, 0.55], [980, 0.3]], rv: 0.7 },
  ][si];
  const dur = p.tail ? 2.2 : 1.3, n = c.seconds(dur, sr), out = new Float32Array(n);
  const th = 0.4 + 0.6 * p.thunk, mains = r() < 0.5 ? 50 : 60, t0 = 0.012 + r() * 0.01;
  const fw = Math.min(p.whine * (0.985 + r() * 0.03), 0.45 * sr), tw = t0 + 0.1 + r() * 0.08;
  const wAmp = 0.24 * (0.55 + 0.45 * c.clamp((fw - 3000) / 7000, 0, 1));
  c.mix(out, c.burst(r, 0.004, "hp", 3200 + r() * 1500, 0.8, 0.0004, 0.0012, sr), t0 - 0.006, 0.7, sr);
  c.mix(out, c.burst(r, 0.003, "hp", 2600 + r() * 1200, 0.8, 0.0003, 0.001, sr), t0 - 0.002 + r() * 0.002, 0.4, sr);
  c.mix(out, c.ring([[S.f * (0.97 + r() * 0.06), 1], [S.f * 1.62, 0.4], [S.f * 2.7, 0.15]], 0.5, 0.05 + 0.05 * p.thunk, sr), t0 + 0.001, 0.8 * th, sr);
  c.mix(out, c.burst(r, 0.05, "lp", 260 + 120 * (2 - si), 0.8, 0.002, 0.018, sr), t0, 0.6 * th, sr);
  c.mix(out, c.ring(S.ring.map(([f, a]) => [f * (0.98 + r() * 0.04), a]), 0.3, 0.035 + 0.02 * si, sr), t0 + 0.002, 0.3 * th, sr);
  const lpB = c.biquad("lp", S.lp, 0.8, sr), bpM = c.biquad("bp", S.mb * (0.95 + r() * 0.1), 1.3, sr), tau = S.tau * (0.65 + 0.55 * p.thunk);
  let bph = r() * c.TAU, wph = 0, hph = r() * c.TAU, vr = 4 + r() * 3, vd = 0.002, wob = 1, wobT = 1, grit = 1;
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    if (i % 512 === 0) { vr = c.clamp(vr + (r() - 0.5) * 0.8, 2.5, 8); vd = c.clamp(vd + (r() - 0.5) * 0.0008, 0.0008, 0.004); wobT = 0.85 + r() * 0.3; }
    if (i % 96 === 0) grit = 0.7 + r() * 0.6;
    wob += (wobT - wob) * 0.0004;
    let s = 0;
    if (t > t0) {
      const u = t - t0, e = (1 - Math.exp(-u / 0.004)) * Math.exp(-u / tau);
      bph += c.TAU * mains * (0.96 + 0.04 * e) / sr;
      const sn = Math.sin(bph);
      s += lpB((Math.tanh(2.6 * sn) + 0.35 * Math.sin(2 * bph)) * e) * 0.75 * th;
      s += bpM(Math.tanh(5 * Math.sin(2 * bph)) * e * e * grit) * 1.1 * th;
      hph += c.TAU * mains / sr;
      const hr = Math.min(1, u / 0.03) * wob;
      s += (Math.sin(hph) + 0.5 * Math.sin(2 * hph) + 0.22 * Math.sin(3 * hph)) * 0.26 * p.hum * hr;
    }
    if (t > tw) {
      const u = t - tw, f = fw * (0.78 + 0.22 * (1 - Math.exp(-u / 0.28))) * (1 + vd * Math.sin(c.TAU * vr * t));
      wph += c.TAU * f / sr;
      s += Math.sin(wph) * wAmp * Math.min(1, u / 0.09) * (p.tail ? Math.exp(-u / 2.2) : 1) * wob;
    }
    out[i] += s;
  }
  if (p.tail) {
    const ticks = 30 + Math.round(r() * 25);
    for (let k = 0; k < ticks; k++) {
      const t = tw + Math.pow(r(), 1.4) * (dur - tw - 0.4), lvl = Math.exp(-(t - tw) / 0.7);
      c.mix(out, c.burst(r, 0.003 + r() * 0.004, "hp", 3000 + r() * 4000, 0.9, 0.0003, 0.0012, sr), t, (0.08 + 0.25 * r()) * lvl, sr);
    }
    c.mix(out, c.burst(r, 0.4, "bp", 2400, 0.7, 0.03, 0.15, sr), tw, 0.05, sr);
  }
  let res = c.reverb(out, { size: S.rv, decay: p.tail ? 0.5 + 0.3 * S.rv : 0.25, mixAmt: p.tail ? 0.22 : 0.08 }, sr) || out;
  const L = res.length, fN = c.seconds(p.tail ? 0.6 : 0.35, sr);
  for (let i = Math.max(0, L - fN); i < L; i++) res[i] *= 0.5 + 0.5 * Math.cos(Math.PI * (i - (L - fN)) / fN);
  c.fade(c.finish(res, 0.9), 5, sr);
  return { samples: res };
}
