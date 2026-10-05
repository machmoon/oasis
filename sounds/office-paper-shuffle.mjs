// Paper shuffle: a stack riffled and squared on a desk. Layers: individual sheet flicks (a click plus a fluttering flap whose pitch, flutter rate and weight depend on the stack's stiffness), a stick-slip slide rustle under them, then uneven edge taps (soft knock, paper slap, settling sheet ticks) and a room tail that is on by default.
export const meta = {
  title: "Paper Stack Shuffle", kind: "foley", format: "sound", duration: 2.2, price: 2, author: "foleyroom", payout: "foleyroom@creators.oasis.example", kit: "Office", description: "A stack of paper riffled, slid and tapped square on a desk; stack size, handling energy, squaring taps and crispness are knobs, for office scenes and desk foley.",
  tags: ["paper", "shuffle", "office", "desk", "foley", "sheets", "stack", "tap"],
};
export const params = { knobs: {
  stack: { type: "choice", label: "Stack size", default: "sheaf", options: ["few sheets", "sheaf", "ream"] },
  energy: { type: "range", label: "Handling energy", default: 0.5, min: 0, max: 1, step: 0.01 },
  square: { type: "range", label: "Tap to square", default: 0.5, min: 0, max: 1, step: 0.01 },
  crisp: { type: "range", label: "Crispness", default: 0.5, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Room tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + 29), n = c.seconds(2.2, sr), out = new Float32Array(n);
  const si = params.knobs.stack.options.indexOf(p.stack), size = [0.1, 0.55, 1][si], stiff = 1 - size;
  const e = p.energy, cr = p.crisp, len = 0.6 + 0.3 * (1 - e) + 0.25 * size;
  const flick = (f, q, dur, fm, dec) => {
    const m = c.seconds(dur, sr), x = c.noise(r, m), bp = c.biquad("bp", f, q, sr), ph = r() * 6.28;
    for (let i = 0; i < m; i++) { const s = i / sr; x[i] = bp(x[i]) * Math.exp(-s / dec) * (0.55 + 0.45 * Math.sin(c.TAU * fm * s + ph)) * Math.min(1, s / 0.0015); }
    return x;
  };
  let t = 0.04, k = 0, phrase = 5 + Math.round(r() * 5);
  while (t < len) {
    const u = t / len, arch = 0.35 + 0.65 * Math.sin(Math.PI * Math.min(1, u)), lvl = (0.35 + 0.65 * r()) * arch;
    const f = (2000 + 3500 * cr + 1500 * stiff) * (0.7 + 0.6 * r()) * (1.1 - 0.4 * size);
    c.mix(out, c.burst(r, 0.003 + 0.004 * r(), "bp", f, 1.5 + 2 * cr, 0.0004, 0.0012 + 0.002 * (1 - cr), sr), t, lvl * (0.25 + 0.35 * e), sr);
    c.mix(out, flick(900 + 1500 * stiff + 900 * r() + 800 * cr, 1 + stiff, 0.05 + 0.05 * stiff, 55 + 70 * stiff + 30 * r(), 0.012 + 0.018 * (0.4 + stiff)), t + 0.001, lvl * (0.2 + 0.35 * e) * (0.6 + 0.5 * stiff), sr);
    if (size > 0.4) c.mix(out, c.ring([[130 + 40 * r(), 1]], 0.04, 0.008 + 0.01 * size, sr), t, 0.05 * lvl * size, sr);
    k++;
    let gap = (0.06 - 0.04 * e) * (0.55 + 0.9 * r()) * (0.8 + 0.5 * size);
    if (k % phrase === 0) { gap += 0.05 + 0.1 * r(); phrase = 5 + Math.round(r() * 5); }
    t += gap;
  }
  const sl = c.pink(r, n), sb = c.biquad("bp", 1300 + 1800 * cr + 600 * stiff, 0.8, sr); let g = 0.5;
  for (let i = 0; i < n; i++) {
    const s = i / sr; if (i % 160 === 0) g = c.clamp(g + (r() - 0.5) * 0.9, 0.05, 1);
    const a = s < len ? Math.sin(Math.PI * s / len) : 0;
    sl[i] = sb(sl[i]) * g * g * a * (0.18 + 0.3 * e);
  }
  c.mix(out, sl, 0, 0.5, sr);
  const taps = 2 + Math.round(3 * p.square);
  let t0 = len + 0.14 + 0.1 * r();
  for (let q = 0; q < taps; q++) {
    const lvl = (0.8 + 0.2 * r()) * (1 - 0.12 * q) * (q % 2 ? 0.8 : 1), f0 = (300 - 150 * size) * (q % 2 ? 1.2 : 1) * (0.9 + 0.2 * r());
    c.mix(out, c.ring([[f0, 1], [f0 * 2.3 + 30 * r(), 0.45]], 0.06, 0.008 + 0.012 * size, sr), t0, (0.1 + 0.2 * size) * lvl, sr);
    c.mix(out, c.burst(r, 0.02, "bp", 1400 + 2200 * cr + 800 * stiff, 0.9, 0.0008, 0.005 + 0.004 * (1 - cr), sr), t0, 0.4 * lvl, sr);
    c.mix(out, flick(1100 + 1400 * stiff, 1, 0.07, 60 + 60 * stiff, 0.018 + 0.015 * size), t0 + 0.003, 0.3 * lvl, sr);
    const m = 7 + Math.round(8 * size + 4 * r());
    for (let j = 0; j < m; j++) c.mix(out, c.burst(r, 0.004, "bp", 2200 + 3500 * r() * (0.3 + cr), 2, 0.0003, 0.0015, sr), t0 + 0.006 + Math.pow(r(), 1.5) * 0.06, 0.2 * lvl * r(), sr);
    t0 += (0.17 + 0.16 * r()) * (1 - 0.25 * p.square);
  }
  c.filter(out, c.biquad("hp", 140, 0.7, sr));
  const dry = out.slice(), rv = c.reverb(out.slice(), { size: p.tail ? 0.45 : 0.15, decay: p.tail ? 0.6 : 0.25, mixAmt: p.tail ? 0.5 : 0.25 }, sr);
  const w = rv && rv.length === n ? rv : out;
  for (let i = 0; i < n; i++) out[i] = dry[i] * 0.8 + w[i] * (p.tail ? 0.55 : 0.3);
  c.finish(out, 0.85, 1.1);
  c.fade(out, 25, sr);
  return { samples: out };
}
