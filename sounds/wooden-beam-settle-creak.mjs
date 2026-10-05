// Beam Settle: a low tavern beam groaning under load. Stick-slip ramps run through wooden beam modes and tick in slowly, then merge into a gliding, wavering groan; cracks, a dust trickle and late settling ticks sit on top.
export const meta = {
  title: "Beam Settle", kind: "sfx", format: "sound", duration: 2, price: 2, author: "hollowbody", payout: "hollowbody@creators.oasis.example", kit: "Wooden Tavern", description: "A low ceiling beam groaning as an old wooden building settles: slow ticks swell into a bending timber groan with grit trickling down. Use it for tavern interiors, ship holds and creaky attics.",
  tags: ["creak", "beam", "groan", "wood", "settle", "tavern", "dust", "building"],
};
export const params = { knobs: {
  size: { type: "choice", label: "Beam size", default: "main beam", options: ["joist", "main beam"] },
  length: { type: "range", label: "Creak length", default: 1.8, min: 0.6, max: 3.2, step: 0.05 },
  stress: { type: "range", label: "Stress", default: 0.5, min: 0, max: 1, step: 0.01 },
  pitch: { type: "range", label: "Pitch", default: 0.5, min: 0, max: 1, step: 0.01 },
  dust: { type: "range", label: "Dust trickle", default: 0.35, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Settling tail", default: false },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, big = p.size === "main beam", r = c.rng(p.seed * 4793 + (big ? 211 : 37));
  const L = p.length, s = p.stress, tailT = p.tail ? 0.85 : 0.15;
  const n = c.seconds(L + tailT, sr), out = new Float32Array(n), ex = new Float32Array(n);
  const pf = Math.pow(2, (p.pitch - 0.5) * 1.2), f0 = (big ? 72 : 150) * pf * (0.9 + 0.2 * r()) * (1 + 0.2 * s);
  const modes = (big ? [[120, 1, 10], [290, 0.8, 12], [560, 0.55, 12], [980, 0.35, 10]] : [[260, 1, 9], [610, 0.8, 10], [1180, 0.55, 10], [2100, 0.35, 9]])
    .map(([f, a, q]) => [c.biquad("bp", f * pf * (0.95 + 0.1 * r()), q, sr), a]);
  const sm = (x) => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
  let ns = Math.min(5, 1 + Math.round(L * 0.7 + r() * 1.3), Math.max(1, Math.floor(L / 0.35)));
  const ws = [], gaps = []; let sw = 0, sg = 0;
  for (let k = 0; k < ns; k++) { ws.push(0.6 + r()); sw += ws[k]; if (k) { gaps.push(0.04 + 0.12 * r()); sg += gaps[k - 1]; } }
  const avail = L - 0.03 - sg, segs = []; let t = 0.03;
  for (let k = 0; k < ns; k++) {
    const len = avail * ws[k] / sw;
    segs.push({ t0: t, len, gl: Math.pow(2, (r() - 0.5) * 0.9) - 1, amp: 0.6 + 0.4 * r(), atk: (k ? 0.25 : 0.4) + 0.2 * r(), rel: 0.2 + 0.2 * r(),
      fs: f0 * (0.85 + 0.3 * r()), fl: 4 + 3 * r(), amf: 7 + 5 * r(), fp: r() * 6 });
    t += len + (gaps[k] || 0);
  }
  let ph = 0, wv = 0, wsm = 0;
  for (const g of segs) {
    const a0 = Math.round(g.t0 * sr), m = Math.round(g.len * sr);
    for (let j = 0; j < m && a0 + j < n; j++) {
      const u = j / m, rise = sm(u / g.atk), e = rise * sm((1 - u) / g.rel), tt = j / sr;
      if (j % 128 === 0) wv = wv * 0.985 + (r() - 0.5) * 0.05;
      wsm += (wv - wsm) * 0.002;
      const fl = 1 + (0.01 + 0.04 * s) * Math.sin(c.TAU * g.fl * tt + g.fp);
      ph += g.fs * (1 + g.gl * u) * (0.2 + 0.8 * rise) * (1 + wsm) * fl / sr;
      if (ph >= 1) { ph -= 1; g.ca = (0.85 + 0.3 * r()) * (r() < 0.02 + 0.1 * s ? 0.15 : 1); }
      const am = 1 - 0.55 * s * (0.5 + 0.5 * Math.sin(c.TAU * g.amf * tt));
      const x = (ph < 0.88 ? ph / 0.88 : (1 - ph) / 0.12) - 0.5;
      ex[a0 + j] += x * (g.ca || 1) * e * g.amp * am;
    }
  }
  const ticks = [];
  if (p.tail) {
    let tk = L + 0.05, gap = 0.06 + 0.04 * r(), a = 1.4;
    while (tk < L + tailT - 0.15) {
      const pos = Math.round(tk * sr), pw = Math.round(sr * 0.0012);
      for (let j = 0; j < pw && pos + j < n; j++) ex[pos + j] += a * (1 - j / pw);
      ticks.push([tk, a]); tk += gap; gap *= 1.3 + 0.3 * r(); a *= 0.78 + 0.1 * r();
    }
  }
  const creak = new Float32Array(n), hp = c.biquad("hp", 45, 0.7, sr), dir = c.biquad("lp", 320 * pf, 0.8, sr), bright = c.biquad("lp", 1500 + 3500 * s, 0.7, sr);
  let pk = 1e-6;
  for (let i = 0; i < n; i++) {
    const x = hp(ex[i]); let y = 0.6 * dir(x);
    for (const [f, a] of modes) y += a * f(x);
    y = bright(y); creak[i] = y; if (Math.abs(y) > pk) pk = Math.abs(y);
  }
  c.mix(out, c.gain(creak, 1 / pk), 0, 1, sr);
  const crack = (tc, a) => {
    const f = (big ? 520 : 1100) * pf * (0.85 + 0.3 * r());
    c.mix(out, c.burst(r, 0.01, "hp", 1800, 0.8, 0.0004, 0.002, sr), tc, 0.35 * a, sr);
    c.mix(out, c.ring([[f, 1], [f * 2.3, 0.5], [f * 3.9, 0.25]], 0.08, big ? 0.022 : 0.014, sr), tc + 0.0005, 0.4 * a, sr);
  };
  for (const g of segs) if (r() < 0.3 + 0.6 * s) crack(g.t0 + g.len * (0.15 + 0.5 * r()), 0.7 + 0.5 * s);
  for (const [tk, a] of ticks) crack(tk, 0.5 * a);
  if (p.dust > 0) {
    const t0 = segs[0].t0 + segs[0].len * 0.5, span = L + tailT * 0.6 - t0, grains = Math.round(p.dust * (50 + 45 * L));
    for (let g = 0; g < grains; g++) {
      const tg = t0 + span * Math.pow(r(), 1.4);
      c.mix(out, c.burst(r, 0.002 + r() * 0.004, "bp", 2500 + r() * 5500, 1.5, 0.0003, 0.001, sr), tg, (0.08 + 0.2 * r()) * (0.4 + 0.6 * p.dust), sr);
    }
    const m = c.seconds(span, sr), h = c.pink(r, m), hph = c.biquad("hp", 3000, 0.7, sr);
    for (let i = 0; i < m; i++) { const u = i / m; h[i] = hph(h[i]) * Math.min(1, u / 0.2) * (1 - u) * (1 - u); }
    c.mix(out, h, t0, 0.06 * p.dust, sr);
  }
  if (p.tail) c.reverb(out, { size: 0.35, decay: 0.6, mixAmt: 0.25 }, sr);
  c.finish(out, 0.9);
  c.gain(out, 0.62 + 0.38 * s);
  c.fade(out, 10, sr);
  return { samples: out };
}
