// Hearth Log: a log tossed onto a tavern hearth, built as staged layers: a woody knock (contact click, size-tuned wood modes, a thump into the grate),
// bounces or a stick clatter, then a rock-back rumble and charcoal clinks. Discrete spark pops follow on a decaying Poisson stream, a band-limited
// flame flare swells and dies on its own envelope, and an optional settle tail adds an ember bed, a sap hiss and sparse late crackles.
export const meta = {
  title: "Hearth Log", kind: "sfx", format: "sound", duration: 2.15, price: 3, author: "hollowbody", payout: "hollowbody@creators.oasis.example", kit: "Wooden Tavern", description: "A log thrown onto a hearth: a woody knock and bounce into the coals, a spray of crackling sparks and a flicker of flame, for tavern, camp and fireside scenes.",
  tags: ["fire", "log", "hearth", "embers", "crackle", "sparks", "tavern", "wood"],
};
export const params = { knobs: {
  size: { type: "choice", label: "Log size", default: "split", options: ["kindling", "split", "heavy"] },
  force: { type: "range", label: "Throw force", default: 0.6, min: 0, max: 1, step: 0.01 },
  crackle: { type: "range", label: "Spark crackle", default: 0.6, min: 0, max: 1, step: 0.01 },
  flare: { type: "range", label: "Flare intensity", default: 0.5, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Fire tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, si = Math.max(0, params.knobs.size.options.indexOf(p.size));
  const r = c.rng(p.seed * 7919 + si * 211 + 3), F = p.force, K = p.crackle, L = p.flare, T = p.tail;
  const S = [
    { m: [[700, 1], [1850, 0.55], [3400, 0.3]], dk: 0.012, th: 170, thd: 0.012, w: 0.25, clk: 6000, br: 1.25 },
    { m: [[240, 1], [640, 0.6], [1230, 0.3]], dk: 0.028, th: 85, thd: 0.03, w: 0.7, clk: 3300, br: 1 },
    { m: [[110, 1], [300, 0.7], [660, 0.3]], dk: 0.05, th: 50, thd: 0.07, w: 1.3, clk: 1800, br: 0.65 },
  ][si];
  const dur = (T ? 2.0 : 0.8) + 0.12 * si, n = c.seconds(dur, sr), out = new Float32Array(n), t0 = 0.004, a = 0.35 + 0.65 * F;
  const hit = (at, g, fm) => {
    c.mix(out, c.burst(r, 0.01, "bp", S.clk * (0.7 + 0.6 * F) * fm, 0.9, 0.0004, 0.0012 + 0.001 * si, sr), at, 0.55 * g, sr);
    c.mix(out, c.ring(S.m.map(([f, x]) => [f * fm * (0.97 + 0.06 * r()), x]), S.dk * 7, S.dk, sr), at + 0.0008, 0.75 * g, sr);
    c.mix(out, c.ring([[S.th * fm * (0.95 + 0.1 * r()), 1], [S.th * fm * 2.3, 0.25]], S.thd * 7, S.thd, sr), at + 0.001, S.w * g * (0.5 + 0.6 * F), sr);
  };
  hit(t0, a, 1);
  if (si === 0) {
    let at = t0;
    for (let k = 0; k < 4; k++) { at += 0.02 + 0.05 * r(); hit(at, a * (0.25 + 0.25 * r()), 1.1 + 0.5 * r()); }
  } else {
    let nb = si === 1 ? (F > 0.3 ? 1 : 0) + (F > 0.75 ? 1 : 0) : 1 + (F > 0.5 ? 1 : 0), gap = (0.05 + 0.07 * F) * (si === 2 ? 0.8 : 1), at = t0, g = a;
    for (let k = 0; k < nb; k++) { at += gap * (0.85 + 0.3 * r()); g *= 0.4; gap *= 0.6; hit(at, g, 1 + 0.03 * r()); }
    const rn = c.seconds(0.45, sr), rb = c.brown(r, rn), rl = c.biquad("lp", 110 + 60 * (2 - si), 0.8, sr), re = c.env(rn, 0.02, 0.1 + 0.05 * si, sr);
    for (let i = 0; i < rn; i++) rb[i] = rl(rb[i]) * re[i];
    c.mix(out, rb, t0 + 0.02, S.w * 1.6 * a, sr);
  }
  const clinks = Math.round(3 + 8 * F + 3 * si);
  for (let k = 0; k < clinks; k++) {
    const t = t0 + 0.008 + Math.pow(r(), 1.6) * 0.2, f = 2600 + r() * 3000;
    c.mix(out, c.ring([[f, 1], [f * (1.5 + 0.4 * r()), 0.4]], 0.04, 0.003 + 0.004 * r(), sr), t, (0.05 + 0.1 * r()) * a, sr);
  }
  const ta = 0.12 + 0.08 * (1 - F) + 0.05 * si, ts = t0 + 0.025, td = (T ? 0.45 : 0.15) * (0.85 + 0.2 * si), dec = Math.exp(-1 / (td * sr));
  const fl = new Float32Array(n), x = c.pink(r, n), b = c.brown(r, n), lp = c.onepole(sr), hp = c.onepole(sr), bl = c.onepole(sr), sm = 0.003 * 44100 / sr;
  let e = 0, g = 0.7, tg = 0.7, nextG = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr - ts;
    if (t > 0) { if (t < ta) { const u = t / ta; e = u * u * (3 - 2 * u); } else e *= dec; }
    if (i >= nextG) { tg = 0.35 + 0.65 * r(); nextG = i + Math.floor(sr * (0.015 + 0.035 * r())); }
    g += (tg - g) * sm;
    const y = lp(x[i], 200 + (400 + 1600 * L) * S.br * e);
    fl[i] = ((y - hp(y, 110)) + bl(b[i], 120 * S.br) * 0.5) * e * g;
  }
  c.mix(out, fl, 0, 0.15 + 0.65 * L, sr);
  const R0 = (30 + 170 * K) * (0.4 + 0.6 * F), tau = 0.12 + 0.06 * F, Rt = T ? 2 + 9 * K : 0, end = dur - 0.25, kg = 0.45 + 0.55 * K;
  let t = t0 + 0.03 + 0.02 * r();
  for (let guard = 0; guard < 400; guard++) {
    const rate = R0 * Math.exp(-(t - t0) / tau) + Rt + 0.01;
    t += -Math.log(1 - 0.999 * r()) / rate;
    if (t > end) break;
    const lvl = (t - t0 < 0.5 ? 1 : 0.65) * kg * (0.3 + 0.7 * r() * r());
    if (r() < 0.12) {
      c.mix(out, c.burst(r, 0.012, "lp", 1800 * S.br, 0.8, 0.0002, 0.0025, sr), t, 0.9 * lvl, sr);
      c.mix(out, c.ring([[(900 + 700 * r()) * S.br, 1], [(2400 + 900 * r()) * S.br, 0.5]], 0.03, 0.004, sr), t, 0.7 * lvl, sr);
    } else {
      c.mix(out, c.burst(r, 0.005, "bp", (2000 + r() * 5000) * S.br, 2 + 3 * r(), 0.0002, 0.0003 + 0.0008 * r(), sr), t, 1.1 * lvl, sr);
    }
  }
  if (T) {
    const bed = c.brown(r, n), bf = c.biquad("lp", 250 + 100 * S.br, 0.7, sr);
    for (let i = 0; i < n; i++) { const u = i / sr - 0.15, h = u <= 0 ? 0 : Math.min(1, u / 0.25) * Math.exp(-u / 0.8); bed[i] = bf(bed[i]) * h; }
    c.mix(out, bed, 0, 0.08 + 0.06 * L, sr);
    const hs = 1 + (r() < 0.5 ? 1 : 0);
    for (let k = 0; k < hs; k++) c.mix(out, c.burst(r, 0.18, "bp", 3200 + 1500 * r(), 4, 0.02, 0.06, sr), 0.6 + 0.8 * r(), 0.06 + 0.08 * K, sr);
  }
  c.finish(out, 0.9, 1.2);
  c.gain(out, 0.65 + 0.35 * F);
  const m = c.seconds(T ? 0.35 : 0.15, sr);
  for (let i = n - m; i < n; i++) { const u = (n - i) / m; out[i] *= u * u; }
  c.fade(out, 2, sr);
  return { samples: out };
}
