// Canopy wind loop: an irregular circular gust envelope drives level, cutoff and rustle density together over a low
// whoosh body and a gust-pitched sough; foliage picks the texture: oak leaf flaps, birch flutter chatter or pine needle hiss.
export const meta = {
  title: "Canopy Wind", kind: "ambience", format: "sound", duration: 3, price: 4, author: "stormfront", payout: "stormfront@creators.oasis.example", kit: "Forest at Night", description: "A loopable bed of night wind moving through oak, birch or pine canopy, with knobs for strength, gustiness, rustle brightness and gust rate; each seed is a different three seconds of the same forest.",
  tags: ["wind", "leaves", "forest", "rustle", "ambience", "loop", "night", "trees"],
};
export const params = { knobs: {
  foliage: { type: "choice", label: "Foliage", default: "oak", options: ["oak", "birch", "pine"] },
  strength: { type: "range", label: "Wind strength", default: 0.5, min: 0, max: 1, step: 0.01 },
  gustiness: { type: "range", label: "Gustiness", default: 0.5, min: 0, max: 1, step: 0.01 },
  brightness: { type: "range", label: "Rustle brightness", default: 0.5, min: 0, max: 1, step: 0.01 },
  rate: { type: "range", label: "Gust rate (Hz)", default: 0.6, min: 0.3, max: 2, step: 0.05 },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const fi = params.knobs.foliage.options.indexOf(p.foliage);
  const sr = c.sr, r = c.rng(p.seed * 6151 + fi * 97 + 3), dur = 3, n = c.seconds(dur, sr);
  const x = c.seconds(0.25, sr), L = n + x, s = p.strength, ge = 0.3 + 0.7 * p.gustiness, br = p.brightness;
  const k = Math.max(1, Math.round(p.rate * dur)), gusts = [];
  for (let j = 0; j < k; j++) gusts.push([(j + 0.5 + (r() - 0.5) * 0.8) / k * dur, (0.5 + 0.6 * r()) * dur / k, 0.4 + 0.6 * r()]);
  const ph = r() * c.TAU, ph2 = r() * c.TAU, step = 64, m = Math.ceil(L / step) + 2, Gc = new Float32Array(m), G = new Float32Array(L);
  for (let j = 0; j < m; j++) {
    const t = ((j * step) % n) / sr; let sum = 0;
    for (let q = 0; q < k; q++) {
      let d = Math.abs(t - gusts[q][0]); d = Math.min(d, dur - d);
      if (d < gusts[q][1]) sum += gusts[q][2] * 0.5 * (1 + Math.cos(Math.PI * d / gusts[q][1]));
    }
    const drift = 0.08 * Math.sin(c.TAU * t / dur + ph) + 0.06 * Math.sin(c.TAU * 3 * t / dur + ph2);
    Gc[j] = c.clamp((1 - 0.65 * ge) + ge * 1.2 * sum + drift, 0.3, 1.7);
  }
  for (let i = 0; i < L; i++) { const j = Math.floor(i / step), f = (i - j * step) / step; G[i] = Gc[j] + (Gc[j + 1] - Gc[j]) * f; }
  const F = [
    { b: [500, 900, 1500, 2400], q: 1.3, d: [0.008, 0.02], ev: 90, fl: [2, 4], per: [0.04, 0.08], amp: 1.6, wash: 0.05, wf: 1800, body: 1.1, sf: 360, sd: 0.4, sg: 0.45 },
    { b: [1800, 2800, 4000, 5600], q: 3, d: [0.0015, 0.004], ev: 110, fl: [4, 9], per: [0.01, 0.02], amp: 1.3, wash: 0.08, wf: 3500, body: 0.9, sf: 480, sd: 0.3, sg: 0.5 },
    { b: [4500, 6000, 7500, 9000], q: 4, d: [0.0008, 0.002], ev: 60, fl: [1, 2], per: [0.004, 0.01], amp: 0.6, wash: 0.45, wf: 5000, body: 0.85, sf: 620, sd: 0.08, sg: 2.2 },
  ][fi];
  const cont = new Float32Array(L), ev = new Float32Array(n + c.seconds(0.5, sr));
  const bn = c.pink(r, L), lpA = c.onepole(sr), lpB = c.onepole(sr), bg = 0.9 * F.body;
  for (let i = 0; i < L; i++) { const g = G[i]; cont[i] = (lpA(bn[i], 120 + 300 * s * g + 120 * g) - lpB(bn[i], 35 + 20 * g)) * bg * g; }
  const sn = c.noise(r, L), sf0 = F.sf * (0.9 + 0.25 * s), sgain = F.sg * F.sd * (0.4 + 0.6 * s);
  let lowS = 0, bandS = 0;
  for (let i = 0; i < L; i++) {
    const g = G[i], fc = Math.min(sf0 * (0.65 + 0.5 * g), 0.2 * sr), f = 2 * Math.sin(Math.PI * fc / sr);
    lowS += f * bandS; const hiS = sn[i] - lowS - F.sd * bandS; bandS += f * hiS;
    cont[i] += bandS * sgain * g * g;
  }
  const wn = c.noise(r, L), wl = c.onepole(sr), wh = c.onepole(sr), wb = F.wf * (0.6 + 0.8 * br) * (0.85 + 0.3 * s);
  for (let i = 0; i < L; i++) {
    const g = G[i], wc = Math.min(wb * (0.5 + 0.55 * g), 0.18 * sr);
    cont[i] += (wh(wn[i], Math.min(wc * 2.2, 0.45 * sr)) - wl(wn[i], wc * 0.5)) * F.wash * (0.4 + 0.6 * s) * g * g;
  }
  const fm = 0.6 + 0.9 * br;
  const bands = F.b.map((f) => {
    const b = c.filter(c.noise(r, L), c.biquad("bp", Math.min(f * fm, 0.42 * sr), F.q, sr)); let e = 0;
    for (let i = 0; i < L; i += 4) e += b[i] * b[i];
    return c.gain(b, 0.3 / Math.sqrt(e / (L / 4) + 1e-9));
  });
  const count = Math.round(F.ev * dur * (0.4 + 0.8 * s));
  let placed = 0;
  for (let a = 0; a < count * 6 && placed < count; a++) {
    const t = r() * dur, g = G[Math.floor(t * sr)];
    if (r() * 1.6 > g * g) continue;
    placed++;
    const b = bands[c.clamp(Math.floor((g - 0.5) * 2 + r() * 2.2), 0, 3)];
    const flaps = F.fl[0] + Math.floor(r() * (F.fl[1] - F.fl[0] + 1)), per = c.between(r, F.per[0], F.per[1]);
    let amp = (0.4 + 0.6 * r()) * F.amp * g, tt = t;
    for (let q = 0; q < flaps; q++) {
      const d = c.between(r, F.d[0], F.d[1]), att = Math.max(1, Math.floor((0.0005 + r() * 0.0012) * sr));
      const len = att + Math.ceil(d * 3.5 * sr), start = Math.floor(tt * sr), off = Math.floor(r() * (L - len - 1)), kd = Math.exp(-1 / (d * sr));
      let e = 1;
      for (let i = 0; i < len; i++) { const w = i < att ? i / att : (e *= kd); ev[start + i] += b[off + i] * w * amp; }
      amp *= 0.65 + 0.2 * r(); tt += per * (0.85 + 0.3 * r());
    }
  }
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = cont[i] + ev[i];
  for (let i = 0; i < x; i++) {
    const a = (i / x) * Math.PI / 2;
    out[i] = cont[i] * Math.sin(a) + cont[n + i] * Math.cos(a) + ev[i];
  }
  for (let i = n; i < ev.length; i++) out[i - n] += ev[i];
  c.finish(out, 0.92);
  c.gain(out, 0.58 + 0.42 * s);
  c.fade(out, 10, sr);
  return { samples: out };
}
