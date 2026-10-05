// Rain on an umbrella heard from under it: seeded drop impulses drive canopy membrane modes, plus a contact tick layer, a muffled street-rain bed and pitched rim drips landing in puddles.
export const meta = {
  title: "Umbrella Patter", kind: "foley", format: "sound", duration: 3.8, price: 2, author: "foleyroom", payout: "foleyroom@creators.oasis.example", kit: "Rainy City Street", description: "Rain drumming on an umbrella canopy right above your ear. Canopy material, rain density, drop size and drip-off from the rim are knobs, and it either loops seamlessly or lets the shower stop and drip out.",
  tags: ["rain", "umbrella", "foley", "patter", "drops", "city", "night", "loop"],
};
export const params = { knobs: {
  canopy: { type: "choice", label: "Canopy", default: "nylon", options: ["nylon", "vinyl", "paper"] },
  density: { type: "range", label: "Rain density", default: 0.5, min: 0, max: 1, step: 0.01 },
  size: { type: "range", label: "Drop size", default: 0.4, min: 0, max: 1, step: 0.01 },
  edge: { type: "range", label: "Drip-off edge", default: 0.4, min: 0, max: 1, step: 0.01 },
  length: { type: "range", label: "Length (s)", default: 3.8, min: 2, max: 3.8, step: 0.1 },
  tail: { type: "toggle", label: "Rain stops (tail)", default: false },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, ci = params.knobs.canopy.options.indexOf(p.canopy), r = c.rng(p.seed * 7919 + ci * 131 + 3);
  const loop = !p.tail, total = Math.min(3.8, p.length), dur = loop ? total : total * 0.55, N = c.seconds(total, sr), W = c.seconds(0.4, sr);
  const den = p.density, sz = p.size, edge = p.edge, ny = sr * 0.45;
  const put = (b, i, v) => { if (loop) i %= N; else if (i >= N) return; b[i] += v; };
  const gk = 1 + Math.floor(r() * 3), gp = r() * c.TAU;
  const rateAt = t => (1 + 0.3 * Math.sin(c.TAU * gk * t / dur + gp)) * (t > dur ? Math.max(0, 1 - (t - dur) / 0.7) : 1);
  const run = (src, dst, fn, g) => { if (loop) for (let i = N - W; i < N; i++) fn(src[i]); for (let i = 0; i < N; i++) dst[i] += g * fn(src[i]); };
  const peakOf = b => { let m = 0; for (let i = 0; i < b.length; i++) { const a = Math.abs(b[i]); if (a > m) m = a; } return m; };
  const rmsOf = b => { let s = 0; for (let i = 0; i < b.length; i++) s += b[i] * b[i]; return Math.sqrt(s / b.length); };
  const cfg = {
    nylon: { modes: [[540, 14, 0.7], [1180, 18, 1], [1960, 14, 0.6], [3300, 8, 0.3]], hp: 2800, lp: 8000, ct: 0.35, tk: 0.0006 },
    vinyl: { modes: [[190, 16, 1.2], [410, 18, 1], [760, 12, 0.5], [1350, 8, 0.2]], hp: 1400, lp: 4200, ct: 0.22, tk: 0.0012 },
    paper: { modes: [[380, 4, 0.35], [1700, 2.5, 0.5], [3100, 2.5, 0.6], [5000, 2, 0.45]], hp: 3200, lp: 10000, ct: 0.6, tk: 0.0005 },
  }[p.canopy];
  const e = new Float32Array(N), x2 = new Float32Array(N), base = 32 + 200 * Math.pow(den, 1.3), T = loop ? dur : Math.min(total, dur + 0.7);
  for (let t = 0; ;) {
    t += -Math.log(1 - r() * 0.999999) / (base * 1.3);
    if (t >= T) break;
    if (r() * 1.3 > rateAt(t)) continue;
    const s0 = Math.round(t * sr), d = c.clamp(sz * (0.6 + 0.8 * r()) + 0.05 * r(), 0, 1);
    const a = (0.35 + 0.65 * r()) * (0.5 + 0.9 * d) * (r() < 0.1 ? 1.25 : 1) * (r() < 0.3 ? 0.5 : 1);
    const L = Math.max(3, Math.round((cfg.tk + 0.0026 * d) * sr));
    for (let j = 0; j < L; j++) put(e, s0 + j, a * Math.sin(Math.PI * j / L));
    const M = Math.round((0.003 + 0.008 * d) * sr), k = Math.exp(-1 / ((0.0008 + 0.002 * d) * sr)), A = Math.max(2, Math.round(0.0004 * sr));
    let g = a * 0.5;
    for (let j = 0; j < M; j++) { put(x2, s0 + j, g * (r() * 2 - 1) * (j < A ? j / A : 1)); g *= k; }
    if (p.canopy === "paper") for (let q = 0, Q = 3 + Math.floor(r() * 3); q < Q; q++) {
      const o = s0 + Math.round((0.001 + 0.012 * r()) * sr), b = a * (0.2 + 0.3 * r());
      for (let j = 0; j < 4; j++) { put(e, o + j, b * Math.sin(Math.PI * (j + 0.5) / 4) * 0.6); put(x2, o + j, b * (r() * 2 - 1)); }
    }
    if (d > 0.55) for (let q = 0, Q = Math.floor((d - 0.5) * 12); q < Q; q++) {
      const o = s0 + Math.round((0.006 + 0.025 * r()) * sr), m = Math.round(0.002 * sr), kk = Math.exp(-4 / m);
      let h = a * 0.15 * r();
      for (let j = 0; j < m; j++) { put(x2, o + j, h * (r() * 2 - 1) * (j < 4 ? j / 4 : 1)); h *= kk; }
    }
  }
  const out = new Float32Array(N);
  for (const [f, Q, g] of cfg.modes) run(e, out, c.biquad("bp", Math.min(ny, f * (0.97 + 0.06 * r())), Q, sr), g);
  const con = new Float32Array(N);
  for (let i = 0; i < N; i++) con[i] = x2[i] + 0.2 * e[i];
  const chp = c.biquad("hp", cfg.hp, 0.7, sr), clp = c.biquad("lp", Math.min(ny, cfg.lp), 0.7, sr);
  run(con, out, x => clp(chp(x)), cfg.ct);
  const canRms = rmsOf(out), canPk = peakOf(out);
  const pn = c.pink(r, N), bed = new Float32Array(N), bh = c.biquad("hp", 1500, 0.7, sr), bl = c.biquad("lp", Math.min(ny, 6500), 0.7, sr);
  run(pn, bed, x => bl(bh(x)), 1);
  for (let i = 0; i < N; i++) bed[i] *= rateAt(i / sr);
  const bs = canRms * (0.32 + 0.18 * den) / (rmsOf(bed) || 1);
  for (let i = 0; i < N; i++) out[i] += bed[i] * bs;
  if (edge > 0) {
    const drp = new Float32Array(N), K = Math.round(1 + 7 * edge), Tend = total;
    for (let q = 0; q < K; q++) {
      const f0 = (1000 + 1600 * r()) * (1.15 - 0.45 * sz), P = (0.35 + 0.9 * r()) / (0.3 + 0.9 * den);
      for (let t = r() * P; t < Tend;) {
        const late = Math.max(0, t - dur), amp = (0.5 + 0.5 * r()) * Math.exp(-late / 0.9), f1 = f0 * (0.95 + 0.1 * r());
        const s0 = Math.round(t * sr), L = Math.round((0.025 + 0.02 * r()) * sr), att = Math.round(0.001 * sr), kk = Math.exp(-1 / ((0.008 + 0.01 * r()) * sr)), sp = Math.round(0.003 * sr);
        let ph = 0, env = amp;
        for (let j = 0; j < L; j++) { ph += c.TAU * f1 * (1 + 0.7 * j / L) / sr; put(drp, s0 + j, Math.sin(ph) * env * (j < att ? j / att : 1) * Math.min(1, (L - j) / att)); env *= kk; }
        for (let j = 0; j < sp; j++) put(drp, s0 + j, amp * 0.3 * (r() * 2 - 1) * Math.min(j / 4, 1) * (1 - j / sp));
        t += P * (0.75 + 0.5 * r()) * (1 + late * 1.5);
      }
    }
    const df = new Float32Array(N), dl = c.biquad("lp", Math.min(ny, 5000), 0.7, sr);
    run(drp, df, dl, 1);
    const dpk = peakOf(df), ds = dpk > 0 ? canPk / dpk * (0.3 + 0.35 * edge) : 0;
    for (let i = 0; i < N; i++) out[i] += df[i] * ds;
  }
  c.finish(out, 0.85, 1.7);
  let res = out;
  if (!loop) {
    let last = N - 1;
    while (last > 0 && Math.abs(out[last]) < 0.001) last--;
    res = out.slice(0, Math.min(N, last + c.seconds(0.03, sr)));
  }
  c.fade(res, loop ? 2 : 12, sr);
  return { samples: res };
}
