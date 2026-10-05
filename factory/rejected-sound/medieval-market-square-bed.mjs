// Medieval market square bed: a continuous hush under many overlapping formant-syllable crowd voices, an irregular blacksmith rhythm on a ringing anvil, cart passes with cobble clicks and axle creak, time-weighted animal calls (rooster, dog, donkey, hens, birds) and a tolling bell. Every event wraps round the loop point and the reverb is rendered on a tiled copy, so the bed loops seamlessly.
export const meta = {
  title: "Market Square Bed", kind: "ambience", format: "sound", duration: 3, price: 5, author: "stormfront", payout: "stormfront@creators.oasis.example", kit: "Medieval Market", description: "A loopable medieval market square: crowd chatter, distant anvil hammering, carts on cobbles, animals and a far bell; dawn brings roosters, birds and a few early carts, noon the full crowd and busy smithy, dusk dogs and the tolling bell.",
  tags: ["market", "medieval", "crowd", "ambience", "anvil", "cart", "animals", "loop"],
};
export const params = { knobs: {
  time: { type: "choice", label: "Time of day", default: "noon", options: ["dawn", "noon", "dusk"] },
  activity: { type: "range", label: "Activity", default: 0.5, min: 0, max: 1, step: 0.01 },
  animals: { type: "range", label: "Animals", default: 0.4, min: 0, max: 1, step: 0.01 },
  reverb: { type: "range", label: "Reverb", default: 0.3, min: 0, max: 1, step: 0.01 },
  crossfade: { type: "toggle", label: "Seamless loop wrap", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + 29), dur = 3, n = c.seconds(dur, sr), out = new Float32Array(n);
  const ti = params.knobs.time.options.indexOf(p.time), a = p.activity, wrap = p.crossfade;
  const T = [
    { crowd: 0.45, hg: 0.6, per: 0.6, carts: 1, bright: 0.7, bell: 0.2, w: [3, 0.3, 0.5, 1.5, 3] },
    { crowd: 1, hg: 1, per: 0.38, carts: 3, bright: 1, bell: 0.4, w: [0.3, 1.5, 1.5, 2, 0.8] },
    { crowd: 0.7, hg: 0.7, per: 0.5, carts: 1, bright: 0.6, bell: 1, w: [0, 2.5, 0.8, 0.5, 0.3] }][ti];
  const put = (x, t, g) => { const s = Math.round(t * sr); for (let i = 0; i < x.length; i++) { let k = s + i; if (k >= n) { if (!wrap) break; k %= n; } out[k] += x[i] * g; } };
  const tone = (fn, m, fc, q, gn) => {
    const x = c.osc("saw", fn, m, sr), b = c.biquad("bp", fc, q, sr);
    for (let i = 0; i < m; i++) { const e = Math.sin(Math.PI * i / m); x[i] = b(x[i]) * e * Math.sqrt(e) * gn; }
    return x;
  };
  const L = c.seconds(0.3, sr), hush = c.pink(r, n + L), hp = c.biquad("hp", 200, 0.7, sr), lp = c.biquad("lp", 1300 * T.bright + 500, 0.7, sr);
  for (let i = 0; i < n + L; i++) hush[i] = lp(hp(hush[i]));
  for (let i = 0; i < L; i++) { const q = Math.PI / 2 * i / L; hush[i] = hush[i] * Math.sin(q) + hush[n + i] * Math.cos(q); }
  for (let i = 0; i < n; i++) out[i] = hush[i] * (0.14 + 0.1 * a * T.crowd) * (1 + 0.1 * Math.sin(c.TAU * 2 * i / n));
  const V = [[700, 1200], [500, 1800], [350, 2200], [450, 900], [800, 1500], [300, 800]];
  const voices = Math.round((30 + 90 * a) * T.crowd);
  for (let v = 0; v < voices; v++) {
    let t = r() * dur; const f0 = 95 + r() * 130 + (r() < 0.3 ? 110 : 0), syl = 2 + Math.floor(r() * 4), lvl = 0.12 + 0.3 * r() * r();
    for (let s = 0; s < syl; s++) {
      const d = 0.07 + r() * 0.12, m = c.seconds(d, sr), vw = V[Math.floor(r() * V.length)], fa = f0 * (0.9 + 0.3 * r());
      const w = c.osc("saw", (u) => fa * (1 + 0.05 * Math.sin(u * 30 + v)) * (1 - 0.12 * u / d), m, sr);
      const b1 = c.biquad("bp", vw[0] * (0.9 + 0.2 * r()), 5, sr), b2 = c.biquad("bp", vw[1] * (0.9 + 0.2 * r()), 6, sr), x = new Float32Array(m);
      for (let i = 0; i < m; i++) { const e = Math.sin(Math.PI * i / m); x[i] = (b1(w[i]) + 0.6 * b2(w[i])) * e * e * 2.2; }
      put(x, t, lvl); t += d + 0.02 + r() * 0.08;
    }
  }
  for (let v = 0, nv = 1 + Math.round(3 * a * T.crowd); v < nv; v++) {
    const f = 200 + r() * 120, m = c.seconds(0.55, sr);
    put(tone((u) => f * (1 + 0.5 * Math.min(u / 0.25, 1)) * (1 - 0.25 * Math.max(0, u - 0.35)), m, 900 + 300 * r(), 4, 3), r() * dur, 0.5);
  }
  const per = T.per * (0.9 + 0.2 * r()), pat = [1, 0.65, 0.8, 1];
  let th = r() * 0.3, hi = 0;
  while (th < dur) {
    const g = pat[hi % 4] * (0.75 + 0.25 * r()) * 0.4 * T.hg, f = 1350 + r() * 140;
    put(c.ring([[f, 1], [f * 2.76, 0.5], [f * 5.4, 0.28], [f * 8.9, 0.1]], 0.7, 0.2 + 0.08 * r(), sr), th, g);
    put(c.ring([[180, 1], [360, 0.35]], 0.12, 0.025, sr), th, g * 1.3);
    put(c.burst(r, 0.006, "hp", 3200, 0.8, 0.0004, 0.002, sr), th, g * 0.7);
    if (r() < 0.5) put(c.ring([[f * 1.01, 0.6], [f * 2.7, 0.3]], 0.2, 0.05, sr), th + 0.05 + 0.02 * r(), g * 0.3);
    hi++; th += per * (0.8 + 0.4 * r()) + (hi % 4 === 0 ? 0.25 + 0.4 * r() : 0);
  }
  const carts = Math.max(1, Math.round(T.carts * (0.5 + a) * 0.7));
  for (let k = 0; k < carts; k++) {
    const m = c.seconds(1.4, sr), tc = 0.5 + r() * 0.4, x = c.brown(r, m), lw = c.biquad("lp", 240, 0.8, sr), e = new Float32Array(m), rate = 0.04 + 0.025 * r();
    for (let i = 0; i < m; i++) { const u = (i / sr - tc) / 0.3; e[i] = Math.exp(-u * u); x[i] = lw(x[i]) * e[i] * 4; }
    for (let t = 0.1; t < 1.3; t += rate * (0.6 + 0.8 * r())) {
      const i = Math.round(t * sr), cl = c.burst(r, 0.007, "bp", 500 + r() * 1200, 3, 0.0004, 0.002, sr);
      for (let j = 0; j < cl.length && i + j < m; j++) x[i + j] += cl[j] * e[i] * (0.3 + 0.9 * r());
    }
    const cr = tone((u) => 380 + 140 * u + 30 * Math.sin(u * 25), m, 850, 6, 0.5);
    for (let i = 0; i < m; i++) x[i] += cr[i] * e[i] * (Math.sin(i / sr * 11 + k) > 0.3 ? 1 : 0.2);
    put(x, r() * dur, 0.22 + 0.2 * a);
  }
  const calls = Math.round(p.animals * 7), W = T.w, tot = W.reduce((s, v) => s + v, 0);
  for (let k = 0; k < calls; k++) {
    let q = r() * tot, kind = 0; while (kind < 4 && q > W[kind]) { q -= W[kind]; kind++; }
    const t = r() * dur, g = 0.4 + 0.4 * p.animals;
    if (kind === 0) put(tone((u) => (u < 0.2 ? 500 + 2500 * u : u < 0.55 ? 1000 + 120 * Math.sin(u * 40) : 1000 - 1400 * (u - 0.55)), c.seconds(0.9, sr), 1500, 3, 2.2), t, g);
    else if (kind === 1) for (let b = 0, nb = 2 + Math.floor(r() * 2), f = 380 + 80 * r(); b < nb; b++) put(tone((u) => f - 500 * u, c.seconds(0.13, sr), 750, 2.5, 2.5), t + b * (0.26 + 0.05 * r()), g * (1 - 0.15 * b));
    else if (kind === 2) { put(tone((u) => 330 + 650 * u * (u < 0.5 ? 1 : 0.4) * (1 + 0.04 * Math.sin(u * 60)), c.seconds(0.55, sr), 800, 2, 2.2), t, g); put(tone((u) => 520 - 300 * u + 25 * Math.sin(u * 70), c.seconds(0.6, sr), 650, 2, 2.2), t + 0.55, g * 0.9); }
    else if (kind === 3) for (let b = 0, nb = 3 + Math.floor(r() * 3); b < nb; b++) put(tone((u) => 420 + 4000 * u, c.seconds(0.06, sr), 1000, 4, 2.4), t + b * (0.1 + 0.03 * r()), g * 0.8);
    else for (let b = 0, nb = 3 + Math.floor(r() * 4), f = 3000 + 1200 * r(); b < nb; b++) { const sn = c.osc("sine", (u) => f + 2200 * u, c.seconds(0.05, sr), sr); for (let i = 0; i < sn.length; i++) sn[i] *= Math.sin(Math.PI * i / sn.length); put(sn, t + b * (0.075 + 0.02 * r()), 0.2 * g); }
  }
  const bf = 620 * (0.9 + 0.2 * r()), bt = r() * dur, bg = 0.06 + 0.2 * T.bell;
  for (let s = 0; s < 2; s++) put(c.ring([[bf, 1], [bf * 2.01, 0.5], [bf * 2.76, 0.4], [bf * 4.2, 0.2]], 1.6, 0.6, sr), bt + s * 1.3, bg * (1 - 0.3 * s));
  let res = out;
  if (p.reverb > 0) {
    const big = new Float32Array(n * 3);
    for (let k = 0; k < 3; k++) big.set(out, k * n);
    const w = c.reverb(big, { size: 0.4 + 0.5 * p.reverb, decay: 0.3 + 0.5 * p.reverb, mixAmt: 0.55 * p.reverb }, sr) || big;
    res = w.length >= n * 3 ? w.subarray(wrap ? n : 0, wrap ? 2 * n : n) : out;
  }
  const fin = new Float32Array(res);
  c.fade(c.finish(fin, 0.85, 1.1), wrap ? 6 : 120, sr);
  return { samples: fin };
}
