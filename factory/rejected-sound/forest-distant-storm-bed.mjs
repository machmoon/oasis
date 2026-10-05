// Distant storm bed: a seamless 4 s night storm. Thunder rolls (pulse trains with widening gaps, a sinking cutoff, near-only cracks, optional hill-echo tails) sit on a circular murmur, a resonant gusting wind band with leaf ticks, and a soft rain hiss; distance is air absorption with only a small level change.
export const meta = {
  title: "Distant Storm Bed", kind: "ambience", format: "sound", duration: 4, price: 5, author: "stormfront", payout: "stormfront@creators.oasis.example", kit: "Forest at Night", description: "A seamless four-second storm rolling over distant hills: thunder that rumbles in swells under light gusting wind in the leaves and a soft rain hiss, with distance, rumble, rain, flicker rate (thunder rolls per loop) and a rolling-tail toggle as knobs; each seed is a new four seconds of the same night.",
  tags: ["storm", "thunder", "ambience", "loop", "wind", "rain", "forest", "night"],
};
export const params = { knobs: {
  distance: { type: "choice", label: "Distance", default: "far", options: ["near", "mid", "far"] },
  rumble: { type: "range", label: "Rumble", default: 0.5, min: 0, max: 1, step: 0.01 },
  rain: { type: "range", label: "Rain hiss", default: 0.25, min: 0, max: 1, step: 0.01 },
  flicker: { type: "range", label: "Flicker rate (thunder rolls per loop)", default: 2, min: 1, max: 5, step: 1 },
  tail: { type: "toggle", label: "Rolling tail (echoes carry across the seam)", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, di = params.knobs.distance.options.indexOf(p.distance), r = c.rng(p.seed * 6271 + di * 97 + 3);
  const L = 4, n = c.seconds(L, sr), m = c.seconds(0.3, sr), N = n + m, out = new Float32Array(n), ru = p.rumble;
  const D = [{ air: 4500, peak: 0.82, roll: 1, crack: 1, wind: 1, hiss: 4200, atk: 0.02, cut: 1.3, pk: 0.8 },
    { air: 2400, peak: 0.76, roll: 0.9, crack: 0.4, wind: 0.85, hiss: 2800, atk: 0.05, cut: 1, pk: 1 },
    { air: 1200, peak: 0.68, roll: 0.8, crack: 0, wind: 0.7, hiss: 1700, atk: 0.1, cut: 0.7, pk: 1.3 }][di];
  const P = 256;
  const lfo = (ks) => {
    const a = new Float32Array(P + 1), ph = ks.map(() => r() * c.TAU), w = ks.map(() => 0.5 + r()), tw = w.reduce((s, v) => s + v, 0);
    for (let j = 0; j <= P; j++) { let s = 0; for (let q = 0; q < ks.length; q++) s += w[q] * Math.sin(c.TAU * ks[q] * j / P + ph[q]); a[j] = s / tw; }
    return a;
  };
  const at = (a, i) => { const x = (i % n) / n * P, j = x | 0; return a[j] + (a[j + 1] - a[j]) * (x - j); };
  const norm = (b) => { let s = 0; for (let i = 0; i < b.length; i++) s += b[i] * b[i]; const g = 1 / (Math.sqrt(s / b.length) + 1e-9); for (let i = 0; i < b.length; i++) b[i] *= g; return b; };
  const bed = new Float32Array(N), gust = lfo([1, 2]), murm = lfo([1, 2, 3]), rainL = lfo([1, 3]);
  const wn = c.noise(r, N);
  let lo = 0, bd = 0;
  for (let i = 0; i < N; i++) {
    const g = 0.5 + 0.5 * at(gust, i), f = 2 * Math.sin(Math.PI * (330 + 650 * g * D.wind) / sr);
    lo += f * bd; const hi = wn[i] - lo - 0.4 * bd; bd += f * hi;
    wn[i] = bd * (0.12 + 0.88 * g * g);
  }
  norm(wn); for (let i = 0; i < N; i++) bed[i] += wn[i] * 0.05 * D.wind;
  const mb = c.brown(r, N), mlp = c.biquad("lp", (150 + 250 * ru) * D.cut, 0.7, sr), mhp = c.biquad("hp", 28, 0.7, sr);
  for (let i = 0; i < N; i++) mb[i] = mhp(mlp(mb[i])) * (0.35 + 0.65 * (0.5 + 0.5 * at(murm, i)));
  norm(mb); for (let i = 0; i < N; i++) bed[i] += mb[i] * 0.06 * (0.3 + 0.7 * ru);
  if (p.rain > 0) {
    const h = c.pink(r, N), hhp = c.biquad("hp", 600, 0.7, sr), hlp = c.biquad("lp", D.hiss, 0.7, sr);
    for (let i = 0; i < N; i++) h[i] = hlp(hhp(h[i])) * (0.88 + 0.12 * at(rainL, i));
    norm(h); for (let i = 0; i < N; i++) bed[i] += h[i] * 0.06 * p.rain;
  }
  for (let i = 0; i < n; i++) out[i] = i < m ? bed[i] * Math.sqrt(i / m) + bed[n + i] * Math.sqrt(1 - i / m) : bed[i];
  const ev = new Float32Array(n + c.seconds(5, sr));
  for (let k = 0; k < 140; k++) {
    const t = r() * L, g = 0.5 + 0.5 * at(gust, Math.floor(t * sr));
    if (r() < g * g * g) c.mix(ev, c.burst(r, 0.008, "bp", 1100 + r() * 1600, 2.5, 0.0005, 0.002 + r() * 0.003, sr), t, (0.025 + 0.035 * r()) * D.wind, sr);
  }
  const cnt = Math.round(p.flicker), span = L - 1.25, slot = span / cnt, damp = 1 / (1 + 0.2 * cnt);
  for (let k = 0; k < cnt; k++) {
    const t0 = 0.15 + (k + 0.15 + 0.6 * r()) * slot;
    const len = (p.tail ? 1.6 + 0.8 * r() : 0.6 + 0.3 * r()) + 0.3 * slot, rl = c.seconds(len, sr);
    const x = c.brown(r, rl), cut = (170 + 480 * ru) * D.cut * (0.85 + 0.3 * r()), op = c.onepole(sr), hp = c.biquad("hp", 30, 0.7, sr);
    const pt = [], pa = [], pk = [];
    let tt = 0;
    for (let q = 0; q < 8 && tt < 0.6; q++) {
      pt.push(Math.floor(tt * rl)); pa.push((q === 0 ? 1 : 0.5 + 0.5 * r()) * Math.exp(-q * 0.22));
      pk.push(Math.exp(-1 / ((0.06 + 0.12 * r()) * D.pk * Math.min(1.5, len) * sr))); tt += (0.05 + 0.07 * r()) * (1 + q * 0.5);
    }
    const lv = new Float32Array(pt.length), ar = 1 / (D.atk * sr), fe = c.seconds(0.12, sr);
    let mx = 1e-9;
    for (let i = 0; i < rl; i++) {
      let e = 0;
      for (let q = 0; q < pt.length; q++) if (i >= pt[q]) { lv[q] = i === pt[q] ? 1 : lv[q] * pk[q]; e += pa[q] * Math.min(1, (i - pt[q]) * ar) * lv[q]; }
      x[i] = hp(op(x[i], cut * (1 - 0.5 * i / rl))) * e * Math.min(1, (rl - i) / fe); mx = Math.max(mx, Math.abs(x[i]));
    }
    const g = 0.06 * (4 + 5 * ru) * D.roll * (0.8 + 0.4 * r()) / mx;
    c.mix(ev, x, t0, g, sr);
    if (D.crack > 0) for (let q = 0; q < 5 + Math.floor(r() * 4); q++)
      c.mix(ev, c.burst(r, 0.03, "lp", 500 + r() * 900 * D.crack, 0.9, 0.002, 0.01 + r() * 0.012, sr), t0 + r() * 0.12, 0.25 * D.crack * (0.4 + 0.6 * r()) * g * mx, sr);
    if (p.tail) {
      const y = Float32Array.from(x); c.filter(y, c.biquad("lp", cut * 0.5, 0.7, sr));
      c.mix(ev, y, t0 + 0.35 + 0.3 * r(), 0.6 * damp * g, sr);
      c.mix(ev, y, t0 + 0.9 + 0.4 * r(), 0.35 * damp * g, sr);
    }
  }
  for (let i = 0; i < ev.length; i++) out[i % n] += ev[i];
  const a1 = c.onepole(sr), a2 = c.onepole(sr);
  for (let pass = 0; pass < 2; pass++) for (let i = 0; i < n; i++) { const y = a2(a1(out[i], D.air), D.air); if (pass) out[i] = y; }
  c.finish(out, D.peak, 1.05);
  return { samples: out };
}
