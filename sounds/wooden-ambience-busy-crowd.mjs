// Busy tavern: a loopable crowd bed of gated, formant-filtered voiced streams (far babble) under near talkers' syllables, tankard set-downs and toasts, laugh bursts, folded through a short low wooden room.
export const meta = {
  title: "Crowded Tavern Murmur", kind: "ambience", format: "sound", duration: 3, price: 5, author: "stormfront", payout: "stormfront@creators.oasis.example", kit: "Wooden Tavern", description: "A loopable bed of a busy low-ceilinged tavern: talking voices, mugs clinking and thumping on tables, and bursts of laughter, for inn interiors in games and period film.",
  tags: ["tavern", "crowd", "murmur", "walla", "inn", "mugs", "ambience", "loop"],
};
export const params = { knobs: {
  crowd: { type: "choice", label: "Crowd size", default: "full", options: ["few", "full", "packed"] },
  chatter: { type: "range", label: "Chatter density", default: 0.5, min: 0, max: 1, step: 0.01 },
  clatter: { type: "range", label: "Mug clatter", default: 0.5, min: 0, max: 1, step: 0.01 },
  laughter: { type: "range", label: "Laughter", default: 0.4, min: 0, max: 1, step: 0.01 },
  length: { type: "range", label: "Loop length (s)", default: 3, min: 2, max: 4, step: 0.5 },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, ci = params.knobs.crowd.options.indexOf(p.crowd), r = c.rng(p.seed * 7919 + ci * 131 + 3);
  const L = p.length, n = c.seconds(L, sr), out = new Float32Array(n), crowd = [0.5, 1, 1.7][ci];
  const put = (src, t, g) => { const o = Math.floor(t * sr); for (let i = 0; i < src.length; i++) out[(o + i) % n] += src[i] * g; };
  const VOW = [[730, 1090, 2440], [530, 1840, 2480], [300, 2200, 2950], [570, 840, 2410], [440, 1020, 2240], [660, 1700, 2400]];
  const syl = (t, dur, f0, f1, v, amp, breath, cut) => {
    const m = c.seconds(dur, sr), s = new Float32Array(m), lp = c.onepole(sr);
    const b1 = c.biquad("bp", v[0], 3, sr), b2 = c.biquad("bp", v[1], 5, sr), b3 = c.biquad("bp", v[2] || 2500, 6, sr);
    const a = Math.min(m * 0.3, 0.012 * sr), rl = 0.35 * m; let ph = 0;
    // Source first (same r() order: the filters draw nothing), then the formant bank as blocks over doubles.
    const X = new Float64Array(m);
    for (let i = 0; i < m; i++) {
      const u = i / m; ph += (f0 + (f1 - f0) * u) / sr; ph -= Math.floor(ph);
      let x = 2 * ph - 1; if (breath > 0 && u < 0.5) x += breath * (1 - 2 * u) * (r() * 2 - 1);
      X[i] = x;
    }
    const X1 = b1.process(X.slice()), X2 = b2.process(X.slice()), X3 = b3.process(X);
    for (let i = 0; i < m; i++) X3[i] = 2.5 * (X1[i] + 0.6 * X2[i] + 0.25 * X3[i]);
    lp.process(X3, cut);
    for (let i = 0; i < m; i++) { const e = Math.min(1, i / a) * Math.min(1, (m - i) / rl); s[i] = X3[i] * e * e; }
    put(s, t, amp);
  };
  const K = [4, 9, 16][ci], hop = Math.max(1, Math.round(0.01 * sr)), F = Math.ceil(n / hop), streams = [];
  for (let k = 0; k < K; k++) {
    const G = new Float32Array(F); let fi = Math.floor(r() * F), left = F;
    while (left > 0) {
      const on = 6 + Math.floor(r() * 10), off = r() < 0.12 + 0.2 * (1 - p.chatter) ? 25 + Math.floor(r() * 50) : 2 + Math.floor(r() * 5);
      const lv = c.between(r, 0.5, 1);
      for (let j = 0; j < on && left > 0; j++, left--) G[(fi++) % F] = lv;
      fi += off; left -= off;
    }
    for (let pass = 0; pass < 2; pass++) { const H = G.slice(); for (let j = 0; j < F; j++) G[j] = (H[(j + F - 1) % F] + H[j] + H[(j + 1) % F]) / 3; }
    streams.push({ G, f: r() < 0.55 ? c.between(r, 95, 135) : c.between(r, 175, 235), k: 1 + Math.floor(r() * 3 * L), q: r() * c.TAU, ph: r() });
  }
  const bed = c.pink(r, n), fA = c.biquad("bp", 520, 1.4, sr), fB = c.biquad("bp", 1450, 2, sr), fC = c.biquad("bp", 2500, 3, sr), lpB = c.biquad("lp", 1600 + 800 * ci, 0.7, sr);
  // Loop interchange: each stream runs over the whole buffer with its state in locals, adding into a double
  // accumulator in the same stream order as before, then each formant filter runs as a block over double buffers
  // (the kit's biquad .process, Chromium Biquad::Process style). Same expressions, same order: bit-identical.
  const TAU = c.TAU, sin = Math.sin, floor = Math.floor, X = new Float64Array(n), FI = new Int32Array(n), FR = new Float64Array(n), F2 = new Int32Array(n);
  for (let i = 0; i < n; i++) { const fi = floor(i / hop); FI[i] = fi; FR[i] = i / hop - fi; F2[i] = (fi + 1) % F; }
  for (const st of streams) {
    const G = st.G, f = st.f, tk = TAU * st.k, q = st.q; let ph = st.ph;
    for (let i = 0; i < n; i++) {
      ph += f * (1 + 0.1 * sin(tk * i / n + q)) / sr; ph -= floor(ph);
      const fi = FI[i], g0 = G[fi];
      X[i] += (2 * ph - 1) * (g0 + (G[F2[i]] - g0) * FR[i]);
    }
  }
  const sK = Math.sqrt(K);
  for (let i = 0; i < n; i++) X[i] = X[i] / sK + 0.15 * bed[i];
  const XA = fA.process(X.slice()), XB = fB.process(X.slice()), XC = fC.process(X);
  for (let i = 0; i < n; i++) XC[i] = XA[i] + 0.7 * XB[i] + 0.3 * XC[i];
  lpB.process(XC);
  for (let i = 0; i < n; i++) bed[i] = XC[i];
  c.mix(out, bed, 0, (0.35 + 0.45 * p.chatter) * [0.6, 1, 1.4][ci], sr);
  const nv = 1 + Math.round((1 + 5 * p.chatter) * crowd), talk = 0.35 + 0.55 * p.chatter;
  for (let v = 0; v < nv; v++) {
    const near = r(), base = r() < 0.55 ? c.between(r, 95, 140) : c.between(r, 170, 240);
    const amp = 0.18 + 0.35 * near * near, cut = 1200 + 2800 * near;
    let t = r() * L; const end = t + L;
    while (t < end) {
      const words = 2 + Math.floor(r() * 6); let into = c.between(r, 1, 1.2);
      for (let w = 0; w < words && t < end; w++) {
        const d = c.between(r, 0.07, 0.2), f = base * into * c.between(r, 0.95, 1.12); into *= 0.97;
        syl(t, d, f, f * c.between(r, 0.85, 1.08), VOW[Math.floor(r() * VOW.length)], amp * c.between(r, 0.6, 1), 0.1, cut);
        t += d + c.between(r, 0.015, 0.08);
      }
      t += c.between(r, 0.15, 0.9) * (1.4 - talk);
    }
  }
  const nl = Math.round(p.laughter * (0.6 + 1.6 * crowd) * L / 3 + (p.laughter > 0.15 ? 0.5 : 0));
  for (let l = 0; l < nl; l++) {
    let t = r() * L, f = r() < 0.5 ? c.between(r, 170, 240) : c.between(r, 260, 380), a = c.between(r, 0.4, 0.6);
    const pulses = 4 + Math.floor(r() * 5), cut = c.between(r, 2600, 4000);
    for (let k = 0; k < pulses; k++) {
      const d = c.between(r, 0.07, 0.11);
      syl(t, d, f * 1.06, f * 0.9, [c.between(r, 700, 850), c.between(r, 1150, 1400), 2600], a, 0.6, cut);
      t += d + c.between(r, 0.03, 0.07); f *= c.between(r, 0.92, 0.97); a *= 0.9;
    }
  }
  const clink = (t, gl) => {
    const b = c.between(r, 1300, 2400), d = 0.98 + r() * 0.04;
    put(c.ring([[b, 1], [b * 2.31 * d, 0.6], [b * 3.98, 0.35], [b * 6.2 * d, 0.15]], 0.3, c.between(r, 0.04, 0.09), sr), t + 0.001, gl);
    put(c.burst(r, 0.005, "hp", 3000, 0.7, 0.0003, 0.0012, sr), t, gl * 0.6);
  };
  const nc = Math.round(p.clatter * 3.5 * crowd * L);
  for (let k = 0; k < nc; k++) {
    const t = r() * L, gl = c.between(r, 0.2, 0.55);
    if (r() < 0.35) { clink(t, gl); clink(t + c.between(r, 0.004, 0.03), gl * 0.8); if (r() < 0.4) clink(t + c.between(r, 0.03, 0.06), gl * 0.6); }
    else {
      const f = c.between(r, 140, 210);
      put(c.ring([[f, 1], [f * 2.7, 0.35]], 0.12, 0.025, sr), t + 0.001, gl * 1.3);
      put(c.burst(r, 0.02, "lp", 900, 0.8, 0.001, 0.008, sr), t, gl * 0.8);
      if (r() < 0.5) clink(t + c.between(r, 0.002, 0.012), gl * 0.4);
    }
  }
  const big = new Float32Array(n + c.seconds(0.6, sr)); big.set(out);
  const w = c.reverb(big, { size: 0.3 + 0.1 * ci, decay: 0.35 + 0.15 * ci, mixAmt: 0.18 + 0.08 * ci }, sr) || big;
  for (let i = 0; i < n; i++) out[i] = w[i];
  for (let j = n; j < w.length; j++) out[j % n] += w[j];
  c.fade(c.finish(out, 0.8), 15, sr);
  return { samples: out };
}
