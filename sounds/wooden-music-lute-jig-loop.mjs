// Lute jig loop: a seeded 6/8 jig on an additive plucked lute (bridge pluck, scoop, grace cuts, breaths) over strummed chords and a bodhrán-style hand drum, in a damped low-ceiling room whose tail folds back so the loop wraps seamlessly.
export const meta = {
  title: "Corner Lute Jig", kind: "music-loop", format: "sound", duration: 1.94, price: 5, author: "kickdrum", payout: "kickdrum@creators.oasis.example", kit: "Wooden Tavern", description: "A loopable lute and hand-drum jig played in a tavern corner; mode, tempo, drum presence, room distance and loop length are knobs, and every seed is a new tune.",
  tags: ["lute", "jig", "tavern", "medieval", "folk", "loop", "hand-drum", "music"],
};
export const params = { knobs: {
  mode: { type: "choice", label: "Mode", default: "major", options: ["major", "dorian"] },
  bars: { type: "choice", label: "Loop bars", default: "2", options: ["2", "4"] },
  tempo: { type: "range", label: "Tempo (dotted-quarter BPM)", default: 124, min: 121, max: 140, step: 1 },
  drums: { type: "range", label: "Drum presence", default: 0.6, min: 0, max: 1, step: 0.01 },
  distance: { type: "range", label: "Room distance", default: 0.35, min: 0, max: 1, step: 0.01 },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 7919 + 3), bars = p.bars === "4" ? 4 : 2, dor = p.mode === "dorian", dist = p.distance;
  const bpm = c.clamp(p.tempo, 121, 140), beat = 60 / bpm, e8 = beat / 3, L = Math.min(c.seconds(bars * 2 * beat, sr), Math.floor(3.98 * sr)), pre = 0.045;
  const rt = 0.35 + 0.8 * dist, N = L + c.seconds(rt + 0.35, sr), out = new Float32Array(N), lute = new Float32Array(N);
  const sc = dor ? [0, 2, 3, 5, 7, 9, 10] : [0, 2, 4, 5, 7, 9, 11];
  const hz = (d) => { const o = Math.floor(d / 7); return 146.83 * Math.pow(2, o + sc[d - o * 7] / 12); };
  const LT = [0, 1.07, 2.03];
  const T = (b, idx) => pre + b * 2 * beat + Math.floor(idx / 3) * beat + LT[idx % 3] * e8;
  const pluck = (buf, f, t, len, amp) => {
    const i0 = Math.round(t * sr), n = Math.min(c.seconds(len, sr), N - i0);
    const rel = c.seconds(0.014, sr), att = c.seconds(0.002, sr), scN = c.seconds(0.018, sr);
    for (let k = 1; k <= 8 && k * f < sr * 0.42; k++) {
      const a = amp * Math.abs(Math.sin(k * 0.55)) / Math.pow(k, 0.75), w = c.TAU * f * k * (1 + 0.0003 * k * k) / sr;
      const rr = Math.exp(-1 / (sr * 0.9 / (1 + 0.45 * k))), rr2 = rr * rr;
      let y1 = 0, y2 = -Math.sin(w) / rr, cw = 2 * rr * Math.cos(w);
      for (let i = 0; i < n; i++) {
        if (i < scN) cw = 2 * rr * Math.cos(w * (1 - 0.015 * (1 - i / scN)));
        const y = cw * y1 - rr2 * y2; y2 = y1; y1 = y;
        const g = i < att ? i / att : i > n - rel ? (n - i) / rel : 1;
        buf[i0 + i] += a * y * g;
      }
    }
    c.mix(buf, c.burst(r, 0.008, "bp", 2400 + f * 2, 1.2, 0.0004, 0.002, sr), t, amp * 0.35, sr);
  };
  const roots = bars === 4 ? (dor ? [0, -1, 0, 3] : [0, 3, 0, 4]) : (dor ? [0, -1] : [0, 4]);
  let d = 9 + Math.floor(r() * 3);
  for (let b = 0; b < bars; b++) {
    const ch = [roots[b], roots[b] + 2, roots[b] + 4], cands = [];
    for (const x of ch) for (const o of [7, 14]) if (x + o >= 7 && x + o <= 16) cands.push(x + o);
    for (let h = 0; h < 2; h++) {
      const last = b === bars - 1 && h === 1, q = r();
      const pat = last ? [3] : q < 0.55 ? [1, 1, 1] : q < 0.9 ? [2, 1] : [1, 2];
      let e = 0;
      for (const len of pat) {
        if (e === 0) {
          const aim = last ? 9 : d + (r() - 0.5) * 4;
          d = cands.slice().sort((u, v) => Math.abs(u - aim) - Math.abs(v - aim))[0];
        } else d = c.clamp(d + [-2, -1, -1, 1, 1, 2][Math.floor(r() * 6)], 7, 16);
        const idx = h * 3 + e, t0 = T(b, idx), span = T(b, idx + len) - t0;
        if (e === 0 && !last && r() < 0.3) pluck(lute, hz(d + 1), t0 - 0.035, 0.03, 0.25);
        const gap = last ? 0.06 : 0.018 + r() * 0.012;
        pluck(lute, hz(d), t0, span - gap, e === 0 ? 0.55 : 0.42 * (0.9 + 0.2 * r()));
        e += len;
      }
    }
  }
  for (let b = 0; b < bars; b++) for (let h = 0; h < 2; h++) {
    const t = T(b, h * 3), x = roots[b], notes = [h === 0 ? x - 7 : x, x, x + 2, x + 4];
    notes.forEach((nd, s) => pluck(lute, hz(nd), t + s * 0.011 * (0.8 + 0.4 * r()), beat - 0.08, (s === 0 ? 0.3 : 0.16) * (h === 0 ? 1 : 0.75)));
  }
  const bp = c.biquad("bp", 240, 1.8, sr), lp = c.biquad("lp", 5200, 0.7, sr);
  for (let i = 0; i < N; i++) lute[i] = lp(lute[i] + 0.7 * bp(lute[i]));
  c.mix(out, lute, 0, 0.8, sr);
  const dr = p.drums;
  if (dr > 0) for (let b = 0; b < bars; b++) for (let e = 0; e < 6; e++) {
    const low = e === 0 || e === 3, lvl = e === 0 ? 1 : e === 3 ? 0.72 : (r() < 0.2 + 0.6 * dr ? 0.22 + 0.18 * r() : 0);
    if (!lvl) continue;
    const t = T(b, e) + (r() - 0.5) * 0.012, g = lvl * (0.85 + 0.3 * r()) * dr;
    const f0 = low ? 78 + r() * 8 : 150 + r() * 30, n = c.seconds(low ? 0.3 : 0.14, sr);
    const x = c.osc("sine", (tt) => f0 * (1 + 0.6 * Math.exp(-tt / 0.015)), n, sr);
    c.multiply(x, c.env(n, 0.0008, low ? 0.11 : 0.045, sr));
    c.mix(out, x, t, g * 0.9, sr);
    c.mix(out, c.burst(r, 0.03, "bp", 1600 + r() * 900, 0.9, 0.0005, low ? 0.006 : 0.01, sr), t, g * (low ? 0.35 : 0.5), sr);
  }
  const hp = c.biquad("hp", 50 + 120 * dist, 0.7, sr), lp2 = c.biquad("lp", Math.min(sr * 0.45, 13000 - 9500 * dist), 0.7, sr);
  for (let i = 0; i < N; i++) out[i] = lp2(hp(out[i]));
  const wet = new Float32Array(N), sz = 0.6 + 0.6 * dist, damp = 0.25 + 0.45 * dist;
  for (const cd of [0.0297, 0.0371, 0.0411, 0.0437]) {
    const D = Math.max(1, Math.round(cd * sz * sr)), g = Math.pow(10, -3 * cd * sz / rt), z = new Float32Array(D);
    let k = 0, s = 0;
    for (let i = 0; i < N; i++) { const v = z[k]; s = v * (1 - damp) + s * damp; z[k] = out[i] + g * s; wet[i] += v * 0.25; if (++k >= D) k = 0; }
  }
  for (const ad of [0.005, 0.0017]) {
    const D = Math.max(1, Math.round(ad * sr)), z = new Float32Array(D);
    let k = 0;
    for (let i = 0; i < N; i++) { const x = wet[i], y = z[k] - 0.6 * x; z[k] = x + 0.6 * y; wet[i] = y; if (++k >= D) k = 0; }
  }
  const dry = 1 - 0.45 * dist, wg = 0.12 + 0.5 * dist, res = new Float32Array(L);
  for (let i = 0; i < N; i++) res[i % L] += dry * out[i] + wg * wet[i];
  c.finish(res, 0.85);
  c.fade(res, 12, sr);
  return { samples: res };
}
