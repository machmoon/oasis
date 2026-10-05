// Copier scan pass: a lid closing (hinge creak, plastic thump, seal puff), then the lamp carriage sweeping under the glass (stepper whine whose pitch follows an accelerate-cruise-brake speed profile, belt ticks locked to that speed, rail grit, lamp hiss) and a return whirr and bump; light mains hum under it, optional room tail.
export const meta = {
  title: "Copier Scan Pass", kind: "sfx", format: "sound", duration: 3, price: 3, author: "foleyroom", payout: "foleyroom@creators.oasis.example", kit: "Office", description: "A photocopier lid dropping shut followed by the scan bar sweeping across the glass with a light motor hum and a carriage return bump; for office scenes and UI-adjacent props.",
  tags: ["photocopier", "copier", "scanner", "office", "lid", "foley", "hum", "machine"],
};
export const params = { knobs: {
  size: { type: "choice", label: "Copier size", default: "full", options: ["compact", "full"] },
  rate: { type: "range", label: "Sweep speed", default: 1, min: 0.5, max: 2, step: 0.05 },
  slam: { type: "range", label: "Lid slam", default: 0.4, min: 0, max: 1, step: 0.01 },
  hum: { type: "range", label: "Motor hum", default: 0.5, min: 0, max: 1, step: 0.01 },
  ret: { type: "range", label: "Carriage return", default: 0.5, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Room tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + (p.size === "full" ? 41 : 7)), full = p.size === "full";
  const n = c.seconds(3, sr), out = new Float32Array(n), sc = full ? 1 : 1.35;
  const sweepT = 1.0 / p.rate, t0 = 0.5 + 0.1 * r(), sw = c.seconds(sweepT, sr);
  const cn = c.seconds(0.35, sr), cr = new Float32Array(cn), cl = c.biquad("bp", 900, 5, sr), cnz = c.noise(r, cn);
  let ph = 0, g = 0;
  for (let i = 0; i < cn; i++) {
    const u = i / cn; if (i % 120 === 0) g = 0.3 + r() * 0.7;
    ph += c.TAU * (500 * sc + 700 * u + 120 * g) / sr;
    cr[i] = (Math.sin(ph) * 0.4 + cl(cnz[i]) * 0.6) * g * Math.sin(Math.PI * u) * 0.25;
  }
  c.mix(out, cr, 0, 1, sr);
  const ht = 0.3 - 0.1 * p.slam, sl = 0.3 + 0.7 * p.slam;
  c.mix(out, c.ring([[full ? 85 : 130, 1], [(full ? 170 : 260) * 1.03, 0.4], [full ? 310 : 430, 0.2]], 0.3, 0.05 + 0.07 * (full ? 1 : 0.6), sr), ht, 0.25 + 0.7 * sl, sr);
  c.mix(out, c.burst(r, 0.02, "bp", 2200, 1, 0.0008, 0.006, sr), ht, 0.2 + 0.5 * sl, sr);
  c.mix(out, c.ring([[1500 * (0.9 + r() * 0.2), 0.5], [2300, 0.3]], 0.1, 0.015, sr), ht + 0.03 + 0.02 * r(), 0.12 * sl, sr);
  c.mix(out, c.burst(r, 0.12, "lp", 1400, 0.7, 0.01, 0.04, sr), ht + 0.02, 0.15 + 0.2 * p.slam, sr);
  const fLo = (full ? 330 : 520) * Math.sqrt(p.rate), fHi = fLo * 2.1;
  const whine = new Float32Array(sw), wn = c.noise(r, sw), gb = c.biquad("bp", 1800 + 800 * r(), 2, sr), rail = c.biquad("bp", 3500, 1.5, sr);
  const rn2 = c.noise(r, sw), acc = 0.16 + 0.1 * r(), tickRate = (full ? 55 : 75) * p.rate;
  let tp = 0, tg = 0; ph = 0;
  for (let i = 0; i < sw; i++) {
    const u = i / sw, v = Math.min(1, u / acc, (1 - u) / (acc * 1.3)), e = Math.min(1, u / 0.03) * Math.min(1, (1 - u) / 0.05);
    ph += c.TAU * (fLo + (fHi - fLo) * v + 6 * Math.sin(u * 90)) / sr;
    tp += (0.25 + v) * tickRate / sr; if (tp >= 1) { tp -= 1; tg = 0.6 + 0.4 * r(); } tg *= 0.9965;
    whine[i] = (Math.sin(ph) * 0.4 + Math.sin(ph * 2.01) * 0.18 + Math.sin(ph * 3.02) * 0.07 + gb(wn[i]) * tg * 0.9 + rail(rn2[i]) * 0.12 * (0.3 + v)) * e;
  }
  c.mix(out, whine, t0, 0.55, sr);
  const lamp = c.noise(r, sw), lb = c.biquad("hp", 5500, 0.7, sr);
  for (let i = 0; i < sw; i++) lamp[i] = lb(lamp[i]) * 0.12 * Math.sin(Math.PI * i / sw);
  c.mix(out, lamp, t0, 0.5, sr);
  const rt = t0 + sweepT + 0.05, rn = c.seconds(0.1 + 0.25 * p.ret, sr);
  if (p.ret > 0.02) {
    const rw = new Float32Array(rn); ph = 0;
    for (let i = 0; i < rn; i++) { const u = i / rn; ph += c.TAU * (fHi * (1.1 - 0.8 * u)) / sr; rw[i] = Math.sin(ph) * 0.35 * Math.min(1, u * 15) * (1 - u); }
    c.mix(out, rw, rt, 0.6 * p.ret, sr);
    const bt = rt + rn / sr * 0.95;
    c.mix(out, c.ring([[full ? 110 : 160, 1], [full ? 240 : 330, 0.4]], 0.15, 0.03, sr), bt, 0.7 * p.ret, sr);
    c.mix(out, c.burst(r, 0.01, "bp", 3000, 1.5, 0.0005, 0.003, sr), bt, 0.3 * p.ret, sr);
  }
  const hn = c.seconds(0.2 + t0 + sweepT + 0.5, sr), hm = new Float32Array(hn), fan = c.pink(r, hn), fl = c.biquad("lp", 900, 0.7, sr);
  for (let i = 0; i < hn; i++) {
    const t = i / sr, e = Math.min(1, t / 0.15) * Math.min(1, (hn - i) / sr / 0.25);
    hm[i] = (Math.sin(c.TAU * 100 * t) * 0.3 + Math.sin(c.TAU * 200 * t + 1) * 0.15 + Math.sin(c.TAU * 300 * t) * 0.05 + fl(fan[i]) * 0.4) * e;
  }
  c.mix(out, hm, 0.3, 0.03 + 0.25 * p.hum, sr);
  if (p.tail) {
    const tl2 = c.reverb(out.slice(), { size: 0.6, decay: 0.55, mixAmt: 1 }, sr);
    for (let i = 0; i < n; i++) out[i] = out[i] * 0.8 + tl2[i] * 0.5;
  }
  c.fade(c.finish(out, 0.85, 1.1), 20, sr);
  return { samples: out };
}
