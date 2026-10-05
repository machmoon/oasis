// System power-down: a starship console dying. A spinning-down turbine whine (stacked voices on a seeded spin-down
// curve) leads, over a buzzy mains hum that sags in pitch, closes its filter and fades; sputter dropouts flicker
// pitch and crackle, relays clunk at the cut and the final drop, and a restrained room tail sizes panel to bridge.
export const meta = {
  title: "Systems Power Down", kind: "sfx", format: "sound", duration: 2.6, price: 3, author: "quietmachine", payout: "quietmachine@creators.oasis.example", kit: "Sci-fi Console", description: "Ship systems shutting off with a falling turbine whine and a dying, sagging hum; the size, length, pitch drop, sputter and tail are knobs for consoles, stations and whole bridges going dark.",
  tags: ["power-down", "shutdown", "sci-fi", "whine", "hum", "console", "starship", "blackout"],
};
export const params = { knobs: {
  size: { type: "choice", label: "Size", default: "station", options: ["panel", "station", "bridge"] },
  duration: { type: "range", label: "Duration", default: 1.8, min: 0.8, max: 2.5, step: 0.05 },
  drop: { type: "range", label: "Pitch drop", default: 0.6, min: 0, max: 1, step: 0.01 },
  sputter: { type: "range", label: "Sputter", default: 0.35, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, si = Math.max(0, params.knobs.size.options.indexOf(p.size)), r = c.rng(p.seed * 6151 + si * 389 + 11);
  const S = [
    { w: 3400, h: 118, voices: 1, rv: 0.3, tl: 0.45, sub: 0, clunk: 0.3, lp: 3600, wet: 0.12 },
    { w: 1900, h: 62, voices: 2, rv: 0.5, tl: 0.8, sub: 0.25, clunk: 0.45, lp: 3000, wet: 0.15 },
    { w: 1250, h: 46, voices: 3, rv: 0.65, tl: 1.2, sub: 0.4, clunk: 0.6, lp: 2400, wet: 0.17 },
  ][si];
  const tailLen = p.tail ? S.tl : 0.04, D = Math.min(p.duration, 3.85 - tailLen);
  const n = c.seconds(D + tailLen, sr), nd = Math.min(n, c.seconds(D, sr));
  let out = new Float32Array(n);
  const gate = new Float32Array(n).fill(1), bend = new Float32Array(n).fill(1);
  const events = Math.round(p.sputter * (5 + 9 * D));
  for (let e = 0; e < events; e++) {
    const t = D * (0.06 + 0.86 * Math.sqrt(r())), L = c.seconds(0.01 + r() * 0.05 * (0.5 + p.sputter), sr);
    const depth = (0.45 + 0.5 * r()) * (0.5 + 0.5 * p.sputter), pd = (0.03 + 0.09 * r()) * p.sputter, i0 = c.seconds(t, sr);
    for (let k = 0; k < L && i0 + k < nd; k++) {
      const w = 0.5 - 0.5 * Math.cos(c.TAU * k / L);
      gate[i0 + k] *= 1 - depth * w; bend[i0 + k] *= 1 - pd * w;
    }
    c.mix(out, c.burst(r, 0.006 + r() * 0.01, "bp", 2200 + r() * 4500, 2.5, 0.0004, 0.002 + r() * 0.003, sr), t, (0.12 + 0.2 * r()) * p.sputter, sr);
  }
  const octs = 0.5 + 3 * p.drop, a = 0.35 + 1.3 * r(), fr = new Float32Array(nd), shp = new Float32Array(nd);
  for (let i = 0; i < nd; i++) {
    const x = i / nd; shp[i] = x * (a + (1 - a) * x);
    fr[i] = Math.exp(-Math.LN2 * octs * shp[i]) * bend[i];
  }
  const whine = new Float32Array(n), ratios = [1, 1.5 + 0.02 * r(), 0.74 + 0.02 * r()], vg = [1, 0.35, 0.25], att = 0.004 * sr;
  for (let v = 0; v < S.voices; v++) {
    const f0 = S.w * ratios[v] * (0.95 + 0.1 * r()), wr = c.TAU * (3 + 4 * r()) / sr, wp = r() * c.TAU, h2 = 0.15 + 0.2 * r();
    let ph = 0;
    for (let i = 0; i < nd; i++) {
      const x = i / nd, f = f0 * fr[i] * (1 + 0.004 * Math.sin(wp + wr * i));
      ph += c.TAU * f / sr;
      const env = Math.min(1, i / att) * (1 - x * x) * (1 - 0.45 * x) * gate[i];
      whine[i] += vg[v] * env * (Math.sin(ph) + h2 * Math.sin(2 * ph) + 0.08 * Math.sin(3 * ph));
    }
  }
  c.mix(out, whine, 0, 0.5, sr);
  const hum = new Float32Array(n), hf0 = S.h * (0.98 + 0.04 * r()), hs = 0.15 + 0.5 * p.drop, lp = c.onepole(sr);
  const ha = [1, 0.5 + 0.3 * r(), 0.45 + 0.3 * r(), 0.3 + 0.25 * r(), 0.25 + 0.2 * r(), 0.15 + 0.2 * r(), 0.1 + 0.15 * r()];
  const wobR = c.TAU * (0.8 + 2 * r()) / sr, wobP = r() * c.TAU;
  let hp = 0;
  for (let i = 0; i < nd; i++) {
    const x = i / nd, f = hf0 * (1 - hs * shp[i]) * bend[i] * (1 + 0.006 * Math.sin(wobP + wobR * i));
    hp += c.TAU * f / sr;
    let s = S.sub * Math.sin(0.5 * hp);
    for (let m = 0; m < 7; m++) s += ha[m] * Math.sin((m + 1) * hp);
    const g = 1 - (1 - gate[i]) * 0.75, env = Math.min(1, i / (0.008 * sr)) * (1 - x * x * x) * (1 - 0.5 * x) * g;
    hum[i] = lp(s * env, S.lp - (S.lp - 200) * Math.sqrt(x));
  }
  c.mix(out, hum, 0, 0.26, sr);
  c.mix(out, c.burst(r, 0.014, "lp", 1800 + 800 * r(), 0.8, 0.0008, 0.004, sr), 0, S.clunk, sr);
  c.mix(out, c.ring([[170 * (0.95 + 0.1 * r()), 1], [420 * (0.95 + 0.1 * r()), 0.4], [1130 * (0.97 + 0.06 * r()), 0.15]], 0.06, 0.012, sr), 0.001, S.clunk * 0.6, sr);
  if (p.tail) {
    const te = Math.max(0, D - 0.03);
    c.mix(out, c.burst(r, 0.02, "bp", 1200 + 600 * r(), 1.2, 0.001, 0.006, sr), te, S.clunk * 0.9, sr);
    c.mix(out, c.ring([[(52 + 20 * (2 - si)) * (0.95 + 0.1 * r()), 1], [118, 0.3]], 0.25, 0.05 + 0.04 * si, sr), te + 0.002, 0.3 + 0.2 * si, sr);
    c.mix(out, c.burst(r, 0.12, "hp", 3500, 0.7, 0.002, 0.04, sr), te + 0.01, 0.08, sr);
    out = c.reverb(out, { size: S.rv, decay: 0.35 + 0.45 * S.rv, mixAmt: S.wet }, sr) || out;
    if (out.length > n) out = out.slice(0, n);
  }
  c.finish(out, 0.9);
  c.fade(out, p.tail ? 20 : 30, sr);
  return { samples: out };
}
