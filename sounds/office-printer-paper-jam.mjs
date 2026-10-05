// Printer paper jam: a motor whirr (harmonic stack with roller ticks) that judders, grinds and drops in pitch to a stall, a crumple of crushed paper, then error beeps; the tail toggle adds a room wash.
export const meta = {
  title: "Printer Paper Jam", kind: "sfx", format: "sound", duration: 3.5, price: 3, author: "foleyroom", payout: "foleyroom@creators.oasis.example", kit: "Office", description: "An office printer feeding, grinding and stalling on a paper jam, followed by error beeps; size, grind, crumple and beep pitch are knobs, for office comedy beats and workplace scenes.",
  tags: ["printer", "paper jam", "office", "error", "beep", "grind", "motor", "foley"],
};
export const params = { knobs: {
  size: { type: "choice", label: "Printer size", default: "desktop", options: ["desktop", "workgroup"] },
  grind: { type: "range", label: "Grind severity", default: 0.6, min: 0, max: 1, step: 0.01 },
  crumple: { type: "range", label: "Crumple amount", default: 0.5, min: 0, max: 1, step: 0.01 },
  beeps: { type: "range", label: "Beep count rate", default: 0.5, min: 0, max: 1, step: 0.01 },
  pitch: { type: "range", label: "Beep pitch", default: 0.5, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Room tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + (p.size === "desktop" ? 3 : 91)), big = p.size === "workgroup";
  const dur = 3.5, n = c.seconds(dur, sr), out = new Float32Array(n);
  const run = 0.7 + 0.4 * p.grind + (big ? 0.25 : 0), stop = run + 0.45 + 0.25 * p.grind + (big ? 0.2 : 0);
  const f0 = big ? 70 : 135, m = c.seconds(stop, sr), mot = new Float32Array(m);
  let ph = 0, last = 0, tk = 0, jit = 1;
  const lp = c.biquad("lp", big ? 2200 : 3600, 0.8, sr);
  for (let i = 0; i < m; i++) {
    const t = i / sr;
    const up = Math.min(1, t / 0.25);
    const down = t < run ? 1 : Math.max(0, 1 - (t - run) / (stop - run));
    const sp = up * (0.08 + 0.92 * down * Math.sqrt(down));
    if (i % 900 === 0) jit = 1 + (r() - 0.5) * 0.12 * p.grind;
    const stall = t > run ? 1 : 0;
    const f = f0 * (0.25 + 0.75 * sp) * jit * (1 + stall * 0.1 * p.grind * Math.sin(t * 31));
    ph += c.TAU * f / sr;
    const s1 = Math.sin(ph), c1 = Math.cos(ph);
    let sk = s1, ck = c1, s = 0;
    for (let k = 1; k <= 6; k++) {
      s += sk / (k * 0.8);
      const ns = sk * c1 + ck * s1;
      ck = ck * c1 - sk * s1; sk = ns;
    }
    const cyc = Math.floor(ph * 3 / c.TAU);
    if (cyc !== last) { last = cyc; tk = 0.6 + r() * 0.8; }
    s += tk * (r() - 0.5) * (1.5 + 3 * p.grind * (t > run * 0.5 ? 1 : 0.3));
    tk *= 0.93;
    const jud = 1 + stall * p.grind * 0.6 * Math.sin(t * 27 + r() * 0.3);
    mot[i] = s * Math.sqrt(sp) * jud * (stall ? 1 + 0.5 * p.grind : 1);
  }
  c.filter(mot, lp);
  c.mix(out, mot, 0.02, 0.3, sr);
  const hiss = c.noise(r, m), hb = c.biquad("bp", 3500, 0.8, sr);
  for (let i = 0; i < m; i++) hiss[i] = hb(hiss[i]) * (i / sr < run ? 0.25 : 0.1 * Math.max(0, 1 - (i / sr - run) / 0.4)) * Math.min(1, i / (0.1 * sr));
  c.mix(out, hiss, 0.02, 0.2, sr);
  const ticks = Math.round(8 + 30 * p.grind);
  for (let k = 0; k < ticks; k++) c.mix(out, c.ring([[(big ? 500 : 800) + r() * 600, 1], [2300, 0.3]], 0.04, 0.008, sr), run * 0.5 + r() * (stop - run * 0.5), (0.1 + 0.3 * r()) * (0.4 + p.grind), sr);
  c.mix(out, c.ring([[big ? 70 : 110, 1], [big ? 150 : 230, 0.4]], 0.3, big ? 0.1 : 0.06, sr), run + 0.02, 0.4 + 0.3 * p.grind, sr);
  const cr = Math.round(10 + 70 * p.crumple);
  for (let k = 0; k < cr; k++) {
    const t = run - 0.1 + Math.pow(r(), 1.3) * (0.6 + 0.4 * p.crumple);
    c.mix(out, c.burst(r, 0.006 + r() * 0.02, "bp", 2000 + r() * 4500, 1.5, 0.0004, 0.002 + r() * 0.006, sr), t, (0.2 + 0.6 * r()) * (0.3 + 0.7 * p.crumple), sr);
  }
  const nb = 2 + Math.round(p.beeps * 4), f = 900 + 1500 * p.pitch;
  const blen = 0.14 + 0.03 * (1 - p.beeps), bs = stop + 0.15;
  const step = Math.min(0.46 - 0.15 * p.beeps + 0.0, (dur - 0.15 - bs - blen) / Math.max(1, nb - 1));
  for (let k = 0; k < nb; k++) {
    const len = c.seconds(blen, sr), ff = f * (1 + 0.012 * (r() - 0.5));
    const b = c.osc("square", ff, len, sr), b2 = c.osc("sine", ff * 2, len, sr), e = c.adsr(len, { attack: 0.004, sustain: 0.8, decay: 0.02 }, sr), bp = c.biquad("lp", 5000, 0.7, sr);
    for (let i = 0; i < len; i++) b[i] = bp(b[i] * 0.5 + b2[i] * 0.4) * e[i];
    c.mix(out, b, bs + k * Math.max(step, blen + 0.04), 0.75, sr);
  }
  if (p.tail) {
    const w = c.reverb(out.slice(), { size: big ? 0.7 : 0.45, decay: big ? 0.6 : 0.4, mixAmt: 1 }, sr);
    for (let i = 0; i < n; i++) out[i] = out[i] * 0.85 + w[i] * 0.3;
  }
  c.fade(out, 25, sr);
  c.finish(out, 0.85, 1.1);
  return { samples: out };
}
