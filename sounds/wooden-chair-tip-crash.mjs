// Chair knocked over onto tavern boards: a sharp broadband strike with a floor thump, the frame's wooden modes and a
// backrest flam, then irregular leg bounces ringing the boards over a rocking settle buzz, splinter crackle, optional room wash.
export const meta = {
  title: "Tavern Chair Crash", kind: "impact", format: "sound", duration: 1.1, price: 3, author: "hollowbody", payout: "hollowbody@creators.oasis.example", kit: "Wooden Tavern", description: "A wooden stool, chair or bench knocked over onto floorboards in a scuffle, with fall force, bounce rattle, splintering and a room tail as knobs; every seed is a different topple.",
  tags: ["chair", "crash", "wood", "impact", "tavern", "fight", "furniture", "foley"],
};
export const params = { knobs: {
  type: { type: "choice", label: "Chair type", default: "chair", options: ["stool", "chair", "bench"] },
  force: { type: "range", label: "Fall force", default: 0.6, min: 0, max: 1, step: 0.01 },
  rattle: { type: "range", label: "Bounce rattle", default: 0.5, min: 0, max: 1, step: 0.01 },
  splinter: { type: "range", label: "Splinter", default: 0.25, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Room tail", default: false },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, ti = params.knobs.type.options.indexOf(p.type), r = c.rng(p.seed * 6113 + ti * 277 + 11);
  const T = [
    { m: [[430, 1], [1040, 0.55], [1760, 0.35], [2650, 0.2]], d: 0.034, th: 150, g: 0.65, gap: 1.15, flam: 0.018, shrink: 0.66 },
    { m: [[255, 1], [630, 0.6], [1170, 0.4], [1930, 0.22]], d: 0.045, th: 105, g: 0.85, gap: 1, flam: 0.032, shrink: 0.68 },
    { m: [[125, 1], [300, 0.7], [580, 0.45], [990, 0.25]], d: 0.065, th: 66, g: 1, gap: 0.95, flam: 0.045, shrink: 0.74 },
  ][ti];
  const f = p.force, R = p.rattle, s = p.splinter;
  const modes = T.m.map(([fr, a]) => [fr * (0.96 + r() * 0.08), a * (0.8 + r() * 0.4)]);
  const flam = T.flam * (0.8 + r() * 0.5);
  const events = [];
  if (R > 0) {
    const count = Math.round(1 + R * (ti === 2 ? 3.5 : 5) * (0.6 + 0.4 * f));
    let bt = flam + 0.02, gap = (0.07 + 0.08 * f) * T.gap * (0.85 + 0.3 * r()), amp = (0.22 + 0.2 * f) * (0.55 + 0.45 * R);
    for (let b = 0; b < count; b++) { bt += gap; events.push([bt, amp]); gap *= T.shrink + 0.15 * r(); amp *= 0.6 + 0.15 * r(); }
  }
  const last = events.length ? events[events.length - 1][0] : flam;
  const n = c.seconds(last + T.d * 4 + 0.07 + (p.tail ? 0.6 : 0), sr), out = new Float32Array(n);
  const t0 = 0.003;
  c.mix(out, c.burst(r, 0.008, "hp", 1200 + 3500 * f, 0.7, 0.0004, 0.0016, sr), t0, 0.75 * (0.45 + 0.55 * f), sr);
  const th = T.th * (1 - 0.15 * f);
  c.mix(out, c.ring([[th, 1], [th * 2.13, 0.3]], 0.12, 0.012 + 0.03 * f * T.g, sr), t0, (0.35 + 0.65 * f) * T.g, sr);
  c.mix(out, c.burst(r, 0.035, "lp", 260 + 200 * f, 0.9, 0.0006, 0.008 + 0.01 * T.g, sr), t0, 0.6 * (0.4 + 0.6 * f) * T.g, sr);
  c.mix(out, c.ring(modes, T.d * 6, T.d, sr), t0 + 0.0005, 0.7 * (0.5 + 0.5 * f), sr);
  const board = [[118 * (0.95 + r() * 0.1), 1], [263, 0.5], [541, 0.25]];
  c.mix(out, c.ring(board, 0.2, 0.05, sr), t0 + 0.001, 0.35 * (0.4 + 0.6 * f), sr);
  c.mix(out, c.burst(r, 0.006, "hp", 1800 + 2000 * f, 0.7, 0.0004, 0.0015, sr), flam, 0.3 * (0.5 + 0.5 * f), sr);
  c.mix(out, c.ring(modes.map(([fr, a]) => [fr * (1.08 + r() * 0.06), a]), T.d * 5, T.d * 0.8, sr), flam, 0.32 * (0.5 + 0.5 * f), sr);
  for (const [bt, amp] of events) {
    const leg = modes.map(([fr, a], k) => [fr * (1.6 + 0.6 * r()), a * (k ? 1 : 0.7)]);
    c.mix(out, c.ring(leg, T.d * 4, T.d * (0.4 + 0.2 * r()), sr), bt, amp, sr);
    c.mix(out, c.burst(r, 0.005, "bp", 2400 + 2200 * r(), 1.5, 0.0003, 0.0018, sr), bt, amp * 0.8, sr);
    c.mix(out, c.ring(board.map(([fr, a]) => [fr * (0.97 + 0.06 * r()), a]), 0.14, 0.035, sr), bt, amp * 0.45 * T.g, sr);
    const chat = Math.floor(r() * 3.5 * R);
    for (let k = 0; k < chat; k++) c.mix(out, c.burst(r, 0.004, "bp", 3000 + 3000 * r(), 2, 0.0003, 0.0012, sr), bt + 0.005 + r() * 0.025, amp * (0.2 + 0.25 * r()), sr);
  }
  {
    const span = last + T.d * 3 + 0.05, m = c.seconds(span, sr), x = c.noise(r, m);
    const bp = c.biquad("bp", modes[0][0] * 1.3, 2.5, sr), lo = c.biquad("bp", board[0][0], 3, sr);
    let flick = 1;
    for (let i = 0; i < m; i++) {
      if (i % 160 === 0) flick = 0.4 + 0.6 * r();
      const t = i / sr, e = Math.min(1, t / 0.004) * Math.exp(-t / (0.08 + 0.25 * R * span));
      x[i] = (bp(x[i]) + 0.8 * lo(x[i])) * flick * e;
    }
    c.mix(out, x, t0, (0.12 + 0.12 * R) * (0.5 + 0.5 * f), sr);
  }
  if (s > 0) {
    const snap = t0 + 0.002 + r() * 0.01;
    c.mix(out, c.burst(r, 0.012, "hp", 2600, 0.8, 0.0003, 0.0022, sr), snap, 0.7 * s, sr);
    c.mix(out, c.ring([[2200 + r() * 1500, 1], [3900 + r() * 1500, 0.5]], 0.05, 0.007, sr), snap, 0.3 * s, sr);
    const grains = Math.round(s * (50 + 70 * f));
    for (let g = 0; g < grains; g++) {
      const t = snap + 0.003 + Math.pow(r(), 2.2) * (0.1 + 0.12 * s);
      c.mix(out, c.burst(r, 0.003 + 0.004 * r(), "bp", 1800 + 5000 * r(), 3, 0.0003, 0.001, sr), t, (0.08 + 0.35 * r() * r()) * s, sr);
    }
  }
  if (p.tail) {
    const m = n - c.seconds(t0, sr), w = c.pink(r, m), lp = c.biquad("lp", 700 + 500 * f, 0.7, sr), hp = c.biquad("hp", 90, 0.7, sr);
    for (let i = 0; i < m; i++) { const t = i / sr; w[i] = hp(lp(w[i])) * Math.min(1, t / 0.012) * Math.exp(-t / 0.18); }
    c.mix(out, w, t0 + 0.004, 0.22 * (0.5 + 0.5 * f), sr);
    const wet = c.reverb(out, { size: 0.35, decay: 0.55, mixAmt: 0.3 }, sr);
    if (wet && wet !== out) out.set(wet.length > n ? wet.subarray(0, n) : wet);
  }
  c.finish(out, 0.95);
  c.gain(out, 0.74 + 0.26 * f);
  const rel = c.seconds(0.05, sr);
  for (let k = 0; k < rel; k++) out[n - 1 - k] *= k / rel;
  c.fade(out, 1, sr);
  return { samples: out };
}
