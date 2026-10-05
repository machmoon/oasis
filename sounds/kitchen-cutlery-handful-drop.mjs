// Cutlery handful drop: a fistful of forks, spoons and knives landing on stone, a steel sink or a wooden counter. Each piece is a bright inharmonic free-bar ring with its own contact click and shrinking bounces, mid-air clinks for scatter, a short surface body excited by every hit, and an optional accelerating settle rattle with a room tail.
export const meta = {
  title: "Cutlery Spill", kind: "impact", format: "sound", duration: 1.2, price: 2, author: "foleyroom", payout: "foleyroom@creators.oasis.example", kit: "Kitchen", description: "A handful of cutlery dropped onto a stone counter, into a steel sink or onto a wooden board. Surface, piece count, drop height and scatter are knobs, and every seed is a different spill.",
  tags: ["cutlery", "drop", "kitchen", "sink", "metal", "clatter", "foley", "spill"],
};
export const params = { knobs: {
  surface: { type: "choice", label: "Surface", default: "stone", options: ["stone", "steel sink", "wood"] },
  count: { type: "range", label: "Piece count", default: 0.5, min: 0, max: 1, step: 0.01 },
  height: { type: "range", label: "Drop height", default: 0.5, min: 0, max: 1, step: 0.01 },
  scatter: { type: "range", label: "Scatter", default: 0.4, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Settle tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, si = params.knobs.surface.options.indexOf(p.surface), r = c.rng(p.seed * 7907 + si * 101 + 3);
  const h = p.height, sc = p.scatter;
  const S = [
    { click: ["hp", 4800, 0.7, 0.0015], pDec: 0.05, pG: 1, ratio: 0.66, body: [[118, 0.006, 1], [260, 0.004, 0.4]], bG: 0.3 },
    { click: ["bp", 3400, 1.3, 0.0025], pDec: 0.08, pG: 1, ratio: 0.6, body: [[236, 0.11, 1], [540, 0.08, 0.6], [960, 0.06, 0.45], [1480, 0.045, 0.3]], bG: 0.22 },
    { click: ["lp", 1800, 0.8, 0.004], pDec: 0.026, pG: 0.8, ratio: 0.5, body: [[176, 0.02, 1], [412, 0.011, 0.5]], bG: 0.45 },
  ][si];
  const RAT = [1, 2.756, 5.404, 8.933], hits = [], clinks = [], nP = Math.round(3 + 11 * p.count), spread = 0.01 + 0.24 * sc;
  let lastT = 0;
  for (let k = 0; k < nP; k++) {
    const kind = r(), f = kind < 0.3 ? 1000 + 500 * r() : kind < 0.65 ? 1500 + 800 * r() : 2000 + 1300 * r();
    let t = k === 0 ? 0.003 : 0.003 + Math.pow(r(), 1.5) * spread;
    let e = (0.5 + 0.5 * r()) * (0.4 + 0.6 * h) * (1 - 0.5 * sc * r());
    let g = (0.03 + 0.11 * h) * (0.8 + 0.4 * r());
    const ratio = S.ratio + 0.12 * r(), nB = 2 + Math.round(4 * h * (0.6 + 0.4 * r()));
    for (let b = 0; b < nB; b++) {
      hits.push({ t, e, f, b });
      lastT = Math.max(lastT, t);
      t += g * (1 + sc * (r() - 0.5) * 0.6); g *= ratio; e *= 0.45 + 0.15 * r();
    }
  }
  const nC = Math.round(sc * nP * 0.8);
  for (let k = 0; k < nC; k++) clinks.push({ t: 0.004 + r() * spread * 0.9, f: 2600 + 3200 * r(), e: 0.15 + 0.25 * r() });
  const settle = [];
  if (p.tail) {
    let t = lastT + 0.03 + 0.03 * r(), gap = 0.035 + 0.02 * r(), a = 0.14 * (0.6 + 0.4 * h);
    const f = 1600 + 1200 * r(), m = 7 + Math.floor(5 * r());
    for (let k = 0; k < m; k++) { settle.push({ t, a, f }); lastT = Math.max(lastT, t); t += gap; gap *= 0.76 + 0.06 * r(); a *= 0.82; }
  }
  const bodyTau = Math.max(...S.body.map(m => m[1]));
  const n = c.seconds(lastT + Math.max(S.pDec * 5.5, bodyTau * 5) + (p.tail ? 0.3 : 0.04), sr);
  const out = new Float32Array(n), exc = new Float32Array(n), ny = 0.45 * sr;
  const piece = (f, dec, amp, many) => {
    const modes = [];
    for (let j = 0; j < (many ? 4 : 3); j++) { const fr = f * RAT[j] * (1 + (r() - 0.5) * 0.02); if (fr < ny) modes.push([fr, (j === 0 ? 1 : 0.4 + 0.6 * r()) / (1 + j * 0.45)]); }
    return modes.length ? c.ring(modes, dec * 5, dec * (0.8 + 0.4 * r()), sr, amp) : null;
  };
  const [ct, cf, cq, cd] = S.click;
  for (const hit of hits) {
    c.mix(out, c.burst(r, 0.005, ct, cf * (0.8 + 0.4 * r()) * (0.75 + 0.5 * h), cq, 0.0004, cd, sr), hit.t, 0.5 * hit.e, sr);
    const pr = piece(hit.f, S.pDec * (hit.b === 0 ? 1 : 0.7), 1, hit.b === 0);
    if (pr) c.mix(out, pr, hit.t + 0.0003, 0.34 * hit.e * S.pG, sr);
    const N = Math.max(2, Math.round((0.0004 + 0.0008 * r()) * sr)), i0 = Math.round(hit.t * sr);
    for (let k = 0; k < N && i0 + k < n; k++) exc[i0 + k] += hit.e * (1 - Math.cos(c.TAU * (k + 0.5) / N)) / N;
  }
  for (const cl of clinks) {
    c.mix(out, c.burst(r, 0.003, "hp", 5500, 0.7, 0.0003, 0.0008, sr), cl.t, 0.25 * cl.e, sr);
    const pr = piece(cl.f, 0.03, 1, false);
    if (pr) c.mix(out, pr, cl.t, 0.24 * cl.e, sr);
  }
  for (const s of settle) {
    c.mix(out, c.burst(r, 0.003, ct, cf * 1.1, cq, 0.0003, cd * 0.6, sr), s.t, 0.5 * s.a, sr);
    const pr = piece(s.f * (1 + (r() - 0.5) * 0.01), Math.min(S.pDec, 0.022), 1, false);
    if (pr) c.mix(out, pr, s.t, 0.38 * s.a * S.pG, sr);
  }
  for (const [f0, tau, a] of S.body) {
    const f = f0 * (0.97 + 0.06 * r()), R = Math.exp(-1 / (tau * sr)), w = c.TAU * f / sr;
    const a1 = 2 * R * Math.cos(w), a2 = R * R, b = Math.sin(w), gn = S.bG * a;
    let y1 = 0, y2 = 0;
    for (let i = 0; i < n; i++) { const y = b * exc[i] + a1 * y1 - a2 * y2; y2 = y1; y1 = y; out[i] += y * gn; }
  }
  if (p.tail) {
    const rv = c.reverb(out, { size: si === 1 ? 0.45 : 0.3, decay: 0.35, mixAmt: si === 1 ? 0.25 : 0.18 }, sr) || out;
    if (rv !== out) out.set(rv.subarray(0, n));
  }
  c.finish(out, 0.9);
  c.fade(out, 2, sr);
  const tl = Math.min(n, c.seconds(0.12, sr));
  for (let k = 0; k < tl; k++) { const i = n - tl + k, x = k / tl; out[i] *= 0.5 + 0.5 * Math.cos(Math.PI * x); }
  return { samples: out };
}
