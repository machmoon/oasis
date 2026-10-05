// Boat engine start: 1-3 starter cranking attempts (a whine that dips and thumps on every compression stroke, with silent gaps between attempts), a sputtering run-up of misfires, a starter-drop clunk, a fixed-time catch with a rev flare and smoke cough, then a steady idle to the end. Outboard is a fast, bright two-stroke buzz; diesel is a slow, heavy knock with metallic clack.
export const meta = {
  title: "Harbour Engine Start", kind: "sfx", format: "sound", duration: 4, price: 3, author: "stormfront", payout: "stormfront@creators.oasis.example", kit: "Ocean Harbour", description: "A small boat engine cranking, sputtering and catching into a steady idle, outboard or diesel; for harbour scenes, boat departures and film foley.",
  tags: ["engine", "boat", "outboard", "diesel", "start", "crank", "harbour", "motor"],
};
export const params = { knobs: {
  engine: { type: "choice", label: "Engine", default: "outboard", options: ["outboard", "diesel"] },
  crank: { type: "range", label: "Crank attempts", default: 0.5, min: 0, max: 1, step: 0.01 },
  choke: { type: "range", label: "Choke sputter", default: 0.5, min: 0, max: 1, step: 0.01 },
  smoke: { type: "range", label: "Smoke cough", default: 0.4, min: 0, max: 1, step: 0.01 },
  pitch: { type: "range", label: "Pitch", default: 0.5, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Exhaust tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + (p.engine === "diesel" ? 91 : 7));
  const T = 4, n = c.seconds(T, sr), out = new Float32Array(n), dz = p.engine === "diesel";
  const pm = Math.pow(2, (p.pitch - 0.5) * 1.2);
  const catchT = 1.85, idle = (dz ? 7 : 15) * pm, comp = (dz ? 4.5 : 7) * pm;
  const A = 1 + Math.round(2 * p.crank), gap = 0.22, seg = (1.65 - gap * (A - 1)) / A;
  const pop = (t, amp) => {
    const f = (dz ? 55 : 130) * pm * (0.93 + 0.14 * r());
    c.mix(out, c.ring(dz ? [[f, 1], [f * 1.9, 0.5], [f * 3.1, 0.3]] : [[f, 0.8], [f * 2, 0.6], [f * 3, 0.5], [f * 4.02, 0.35], [f * 6, 0.2]], dz ? 0.16 : 0.07, dz ? 0.07 : 0.02, sr), t, amp * (0.7 + 0.3 * r()), sr);
    if (dz) {
      c.mix(out, c.ring([[3000 + 700 * r(), 0.6], [4700 + 500 * r(), 0.3], [1900, 0.3]], 0.04, 0.008, sr), t, amp * 0.5, sr);
      c.mix(out, c.burst(r, 0.015, "bp", 2800, 3, 0.0005, 0.003, sr), t, amp * 0.5 * (0.6 + 0.4 * r()), sr);
    } else {
      c.mix(out, c.burst(r, 0.025, "bp", 2200 + 600 * r(), 1.2, 0.0006, 0.007, sr), t, amp * 0.6 * (0.5 + 0.5 * r()), sr);
      c.mix(out, c.burst(r, 0.012, "hp", 3500, 0.8, 0.0004, 0.003, sr), t, amp * 0.35 * r(), sr);
    }
  };
  const starts = [];
  for (let a = 0; a < A; a++) starts.push(0.1 + a * (seg + gap));
  starts.forEach((t0, a) => {
    const last = a === A - 1, m = c.seconds(seg, sr), w = new Float32Array(m), nz = c.noise(r, m), lp = c.biquad("lp", 4200, 0.8, sr);
    let ph = 0, cph = r() * 6;
    for (let i = 0; i < m; i++) {
      const t = i / sr, k = t / seg, up = last ? Math.max(0, k - 0.6) / 0.4 : 0;
      cph += c.TAU * comp * (1 - 0.25 * k + 0.9 * up) / sr;
      const dip = 0.5 + 0.5 * Math.sin(cph);
      const spin = Math.min(1, t * 8) * (1 - 0.3 * k) * (1 - 0.45 * dip) * (1 + 0.8 * up);
      ph += c.TAU * (dz ? 240 : 380) * pm * spin / sr;
      const g = Math.min(1, t / 0.03) * (0.2 + 0.8 * (1 - dip)) * Math.min(1, (seg - t) / 0.06);
      w[i] = lp(Math.sin(ph) * 0.4 + Math.sin(ph * 2) * 0.28 + Math.sin(ph * 3) * 0.2 + Math.sin(ph * 4.01) * 0.12 + nz[i] * 0.06) * g;
    }
    c.mix(out, w, t0, 0.38, sr);
    for (let t = t0 + 0.03, q = 0; t < t0 + seg - 0.05; q++) {
      const k = (t - t0) / seg, up = last ? Math.max(0, k - 0.6) / 0.4 : 0;
      c.mix(out, c.ring([[48 * pm, 1], [96 * pm, 0.5], [190 * pm, 0.2]], 0.14, dz ? 0.07 : 0.05, sr), t, (dz ? 0.95 : 0.65) * (0.75 + 0.25 * r()), sr);
      c.mix(out, c.burst(r, 0.012, "bp", 1400, 1.5, 0.0005, 0.004, sr), t, 0.3 * (0.5 + r()), sr);
      t += (1 / comp) * (1 + 0.25 * k - 0.4 * up) * (0.94 + 0.12 * r());
    }
    if (!last) c.mix(out, c.ring([[65 * pm, 1], [150 * pm, 0.3]], 0.2, 0.07, sr), t0 + seg, 0.25, sr);
  });
  const lastEnd = starts[A - 1] + seg;
  c.mix(out, c.ring([[900, 1], [1450, 0.5], [2300, 0.25]], 0.08, 0.014, sr), lastEnd, 0.35, sr);
  const sp0 = starts[A - 1] + seg * 0.4;
  for (let t = sp0; t < catchT - 0.04;) {
    const k = (t - sp0) / (catchT - sp0), prob = 0.2 + 0.55 * p.choke + 0.2 * k;
    if (r() < prob) pop(t, (0.25 + 0.5 * p.choke) * (0.5 + 0.6 * k) * (r() < 0.25 ? 0.4 : 1));
    t += (0.09 + 0.2 * r()) * (1 - 0.4 * k) * (1.5 - p.choke * 0.7);
  }
  for (let t = catchT, q = 0; t < T - 0.05; q++) {
    const s = t - catchT, rate = idle * (1 + 1.4 * Math.exp(-s / 0.3));
    const odd = dz && q % 2 ? 0.7 : 1, miss = r() < 0.03 * Math.exp(-s / 1.2) + (s < 0.6 ? 0.12 : 0);
    pop(t, (0.65 + 0.8 * Math.exp(-s / 0.25)) * odd * (miss ? 0.3 : 1));
    t += (1 / rate) * (0.92 + 0.16 * r());
  }
  const bn = c.seconds(T - 0.05 - catchT, sr), body = c.brown(r, bn), blp = c.biquad("lp", dz ? 240 : 380, 0.9, sr);
  for (let i = 0; i < bn; i++) body[i] = blp(body[i]) * Math.min(1, i / (0.05 * sr)) * (0.7 + 0.3 * Math.sin(i / sr * c.TAU * idle));
  c.mix(out, body, catchT, 0.25, sr);
  if (p.smoke > 0.02) {
    const cn = c.seconds(0.45, sr), x = c.noise(r, cn), cl = c.biquad("bp", 700 + 400 * r(), 0.7, sr), e = c.env(cn, 0.004, 0.1, sr);
    for (let i = 0; i < cn; i++) x[i] = cl(x[i]) * e[i] * (0.7 + 0.5 * r());
    c.mix(out, x, catchT + 0.03, 2.4 * p.smoke, sr);
    c.mix(out, c.ring([[42 * pm, 1], [84 * pm, 0.5]], 0.35, 0.13, sr), catchT, 1.2 * p.smoke, sr);
    for (let k = 0; k < 3; k++) pop(catchT + 0.12 + 0.3 * (k + r()) * 0.6, 0.9 * p.smoke);
  }
  let res = out;
  if (p.tail) {
    const wet = c.reverb(Float32Array.from(out), { size: 0.8, decay: 0.75, mixAmt: 1 }, sr);
    res = new Float32Array(n);
    for (let i = 0; i < n; i++) res[i] = out[i] * 0.8 + 0.5 * (wet[i] || 0);
  }
  c.fade(res, 30, sr);
  c.finish(res, 0.88, 1.1);
  return { samples: res };
}
