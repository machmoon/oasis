// Fire Poker Stir: an iron poker driven into hearth coals and raked through them. Each stroke is a damped iron-rod clank over a coal knock and clatter; the drag is velocity-driven stick-slip grinding; each stir breathes a fire flare with clustered ember pops; the tail lets the coals settle.
export const meta = {
  title: "Hearth Poker Stir", kind: "foley", format: "sound", duration: 2.7, price: 2, author: "hollowbody", payout: "hollowbody@creators.oasis.example", kit: "Wooden Tavern", description: "An iron poker clanking into hearth coals and raking them about, with grinding rod, shifting coal chunks, a breath of flame and popping embers; for tavern fires, camp hearths and forge scenes.",
  tags: ["fire", "poker", "hearth", "coals", "embers", "iron", "scrape", "tavern"],
};
export const params = { knobs: {
  poker: { type: "choice", label: "Poker type", default: "heavy", options: ["light", "heavy"] },
  rate: { type: "range", label: "Stir rate", default: 1.2, min: 0.5, max: 2.5, step: 0.05 },
  crackle: { type: "range", label: "Ember crackle", default: 0.5, min: 0, max: 1, step: 0.01 },
  scrape: { type: "range", label: "Metal scrape", default: 0.5, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Settle tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, heavy = p.poker === "heavy", r = c.rng(p.seed * 4513 + (heavy ? 71 : 3));
  const G = 1.8, total = G + (p.tail ? 0.9 : 0.3), n = c.seconds(total, sr), out = new Float32Array(n);
  const f1 = (heavy ? 380 : 690) * (0.97 + 0.06 * r());
  const modes = [[f1, 1], [f1 * 2.756, 0.6], [f1 * 5.404, 0.35], [f1 * 8.933, 0.18]];
  const ringT = (heavy ? 0.13 : 0.08) * (p.tail ? 1 : 0.6);
  const clatter = (tg, a) => {
    if (tg > total - 0.05 || tg < 0) return;
    if (r() < 0.35) { const f = 1400 + r() * 3000; c.mix(out, c.ring([[f, 1], [f * 1.63, 0.4]], 0.03, 0.004 + 0.006 * r(), sr), tg, a * 0.35, sr); }
    else c.mix(out, c.burst(r, 0.004 + r() * 0.006, "bp", (heavy ? 900 : 1300) + r() * 3000, 2.5, 0.0003, 0.0012 + r() * 0.002, sr), tg, a, sr);
  };
  const strokes = [], iv = 0.75 / p.rate; let t = 0.02;
  while (t < G - 0.25) { strokes.push(t); t += iv * (0.85 + 0.3 * r()); }
  const vel = new Float32Array(n), fl = new Float32Array(n);
  strokes.forEach((tk, k) => {
    const next = k + 1 < strokes.length ? strokes[k + 1] : G;
    const a = tk + 0.03, L = Math.max(0.12, next - a - 0.04), i0 = c.seconds(a, sr), m = c.seconds(L, sr), pk = 0.7 + 0.3 * r();
    for (let i = 0; i < m && i0 + i < n; i++) { const s = Math.sin(Math.PI * i / m); vel[i0 + i] = Math.max(vel[i0 + i], pk * s * Math.sqrt(s)); }
    const j0 = c.seconds(tk, sr), fm = c.seconds(0.9, sr), fa = 0.6 + 0.4 * r();
    for (let i = 0; i < fm && j0 + i < n; i++) { const tt = i / sr; fl[j0 + i] += fa * (1 - Math.exp(-tt / 0.08)) * Math.exp(-tt / 0.35); }
    const hit = (k === 0 ? 1 : 0.6 + 0.3 * r()) * (heavy ? 1 : 0.8);
    const md = modes.map(([f, am]) => [f * (0.99 + 0.02 * r()), am * (0.7 + 0.6 * r())]);
    c.mix(out, c.ring(md, ringT * 6, ringT, sr), tk + 0.0006, 0.35 * hit, sr);
    c.mix(out, c.burst(r, 0.006, "hp", 1800, 0.7, 0.0004, 0.0015, sr), tk, 0.7 * hit, sr);
    c.mix(out, c.burst(r, 0.05, "lp", heavy ? 220 : 420, 0.9, 0.0008, heavy ? 0.022 : 0.012, sr), tk, (heavy ? 0.9 : 0.45) * hit, sr);
    const cf = 600 + r() * 500; c.mix(out, c.ring([[cf, 1], [cf * 2.3, 0.5]], 0.05, 0.008, sr), tk + 0.002, 0.3 * hit, sr);
    const g = Math.round((heavy ? 22 : 12) * hit);
    for (let j = 0; j < g; j++) clatter(tk + 0.002 + Math.pow(r(), 1.8) * 0.09, (0.3 + 0.6 * r()) * hit);
  });
  const ex = new Float32Array(n), dragT = [], blk = Math.max(1, c.seconds(0.004, sr)); let ph = 0;
  for (let i = 0; i < n; i++) {
    const v = vel[i];
    if (v > 0.02) {
      ph += (40 + 260 * v) * (heavy ? 0.8 : 1.1) / sr;
      if (ph >= 1) { ph -= 1 + (r() - 0.5) * 0.7; ex[i] = v * (0.4 + 0.6 * r()); }
      ex[i] += v * (r() - 0.5) * 0.1;
    }
    if (i % blk === 0 && v > 0.02 && r() < v * (heavy ? 0.4 : 0.3)) dragT.push(i / sr);
  }
  if (p.scrape > 0) {
    const bps = modes.map(([f]) => c.biquad("bp", f * 1.01, 10, sr)), sc = new Float32Array(n);
    const g1 = c.biquad("bp", (heavy ? 2700 : 3900) * (0.95 + 0.1 * r()), 4, sr), g2 = c.biquad("bp", (heavy ? 4800 : 6400) * (0.95 + 0.1 * r()), 3, sr);
    for (let i = 0; i < n; i++) { const x = ex[i]; let y = 0; for (let q = 0; q < 4; q++) y += bps[q](x) * modes[q][1]; sc[i] = y * 0.9 + g1(x) * 2.2 + g2(x) * 1.4; }
    c.mix(out, sc, 0, 1.1 * p.scrape, sr);
  }
  dragT.forEach((tg) => clatter(tg, 0.15 + 0.3 * r()));
  const pops = Math.round(p.crackle * 70);
  for (let j = 0; j < pops; j++) {
    let tp = r() < 0.65 ? strokes[Math.floor(r() * strokes.length)] + 0.04 - Math.log(1 - r() * 0.95) * 0.25 : 0.05 + r() * (G - 0.1);
    const k = 1 + (r() < 0.3 ? Math.floor(r() * 3) : 0), a = (0.25 + 0.75 * r()) * (0.4 + 0.6 * p.crackle) * Math.min(1, Math.exp((G + 0.2 - tp) / 0.3));
    for (let q = 0; q < k && tp < total - 0.05; q++) {
      c.mix(out, c.burst(r, 0.003 + r() * 0.004, r() < 0.5 ? "hp" : "bp", 1500 + r() * 6000, 0.8 + r(), 0.0002, 0.0006 + r() * 0.0015, sr), tp, a * (q ? 0.5 : 1), sr);
      tp += 0.006 + r() * 0.03;
    }
  }
  const hs = c.pink(r, n), hbp = c.biquad("bp", 1800, 0.5, sr), flp = c.onepole(sr), rel = c.seconds(p.tail ? 0.8 : 0.25, sr);
  for (let i = 0; i < n; i++) { const dn = i > n - rel ? (n - i) / rel : 1, e = fl[i]; hs[i] = flp(hbp(hs[i]), 900 + 3000 * Math.min(1, e)) * (0.15 + 1.4 * e) * dn * dn; }
  c.mix(out, hs, 0, 0.06 + 0.16 * p.crackle, sr);
  if (p.tail) {
    for (let j = 0; j < (heavy ? 80 : 60); j++) { const d = -Math.log(1 - r() * 0.98) * 0.18; clatter(G - 0.1 + d, 0.3 * Math.exp(-d / 0.25) * (0.5 + r())); }
    const m = c.seconds(0.7, sr), w = c.pink(r, m), wb = c.biquad("bp", heavy ? 700 : 1000, 0.8, sr);
    for (let i = 0; i < m; i++) { const tt = i / sr; w[i] = wb(w[i]) * Math.min(1, tt / 0.03) * Math.exp(-tt / 0.18); }
    c.mix(out, w, G - 0.1, 0.3, sr);
  }
  let res = out;
  if (p.tail) { const rv = c.reverb(out, { size: 0.25, decay: 0.5, mixAmt: 0.12 }, sr); if (rv && rv.length) res = rv; }
  c.finish(res, 0.9);
  const rl = c.seconds(0.1, sr), N = res.length;
  for (let i = 0; i < rl; i++) { const g = i / rl; res[N - 1 - i] *= g * g; }
  c.fade(res, 15, sr);
  return { samples: res };
}
