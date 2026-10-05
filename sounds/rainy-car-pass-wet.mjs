// Wet car pass: approach, pass and recede on a soaked street. Mono with distance cues: (d0/r)^1.5 swell, air absorption, Doppler on the engine harmonics, tread whine and spray; per-axle tyre roar, wet hiss and seam thumps; then a wake mist with drips, a puddle slap, and an optional canyon slapback plus reverb.
export const meta = {
  title: "Wet Car Pass", kind: "sfx", format: "sound", duration: 3.5, price: 3, author: "foleyroom", payout: "foleyroom@creators.oasis.example", kit: "Rainy City Street", description: "A compact, sedan, truck or bus hissing past on a rain-soaked night street: a long swell in, a Doppler drop at the pass, axle thumps, then the mist of its wake. Speed, spray, engine and Doppler are knobs, and every seed is a different pass. Mono; pan it left-to-right at the call site.",
  tags: ["car", "pass", "wet", "road", "traffic", "doppler", "rain", "street"],
};
export const params = { knobs: {
  vehicle: { type: "choice", label: "Vehicle", default: "sedan", options: ["compact", "sedan", "truck", "bus"] },
  speed: { type: "range", label: "Speed", default: 0.5, min: 0, max: 1, step: 0.01 },
  spray: { type: "range", label: "Spray amount", default: 0.6, min: 0, max: 1, step: 0.01 },
  engine: { type: "range", label: "Engine presence", default: 0.5, min: 0, max: 1, step: 0.01 },
  doppler: { type: "range", label: "Doppler pitch", default: 0.5, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Street tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, vi = params.knobs.vehicle.options.indexOf(p.vehicle), r = c.rng(p.seed * 7919 + vi * 131 + 3);
  const V = {
    compact: { f0: 105, sharp: 1, form: 1100, roar: 240, body: 0.6, hf: 1.25, tp: 0.027, axles: [0, 2.4], vf: 1, eg: 0.8, thump: 95 },
    sedan: { f0: 82, sharp: 0, form: 520, roar: 170, body: 0.9, hf: 1, tp: 0.032, axles: [0, 2.8], vf: 1, eg: 0.9, thump: 75 },
    truck: { f0: 48, sharp: 1, form: 320, roar: 95, body: 1.8, hf: 0.75, tp: 0.046, axles: [0, 4, 5.4], vf: 0.82, eg: 1.2, thump: 46, clat: 1 },
    bus: { f0: 40, sharp: 0, form: 260, roar: 85, body: 1.6, hf: 0.8, tp: 0.043, axles: [0, 6.5], vf: 0.8, eg: 1.05, thump: 55, turbo: 1 },
  }[p.vehicle];
  const S = p.speed, NA = V.axles.length, last = V.axles[NA - 1], sm = (x) => { x = c.clamp(x, 0, 1); return x * x * (3 - 2 * x); };
  const v = (10 + 20 * S) * V.vf * c.between(r, 0.94, 1.06), d0 = c.between(r, 3, 5);
  const lead = 1.9 - 0.6 * S, tc = lead + c.between(r, -0.06, 0.06), tw = tc + last / v, post = 1.1 - 0.3 * S + (p.tail ? 0.7 : 0);
  const dur = tw + post, n = c.seconds(dur, sr), out = new Float32Array(n);
  const m = (0.6 + 3.4 * p.doppler) / 343 * v, rpm = (1 + 0.5 * S) * c.between(r, 0.94, 1.06), wTau = 0.25 + 0.35 * p.spray;
  const dopAt = (t) => { const x = v * (t - tc) + 1; return 1 / (1 + m * x / Math.sqrt(x * x + d0 * d0)); };
  const svf = () => { let lo = 0, bd = 0; return (x, fc, q) => { const f = 2 * Math.sin(Math.PI * Math.min(fc, sr * 0.15) / sr), hi = x - lo - q * bd; bd += f * hi; lo += f * bd; return bd; }; };
  const wn2 = c.noise(r, n), wn3 = c.noise(r, n), bn = c.brown(r, n);
  const lpR = c.onepole(sr), lpA = c.onepole(sr), lpE = c.onepole(sr), lpW = c.onepole(sr), lpAir = c.onepole(sr), bpF = svf();
  const hpH = c.biquad("hp", 1500, 0.7, sr), hpW = c.biquad("hp", 2500, 0.7, sr), hpE = c.biquad("hp", 35, 0.7, sr), bpC = c.biquad("bp", 2800, 1.5, sr);
  const cd = Math.exp(-1 / (0.004 * sr)), inT = 0.35 * lead, outT = post * 0.7;
  let ph = 0, rough = 1, clat = 0, tph = 0, tbph = 0, fl = 0.6, ft = 0.6;
  for (let i = 0; i < n; i++) {
    const t = i / sr, win = sm(t / inT) * sm((dur - 0.15 - t) / outT);
    let aR = 0, aS = 0;
    for (let k = 0; k < NA; k++) {
      const x = v * (t - tc) - V.axles[k], rr = Math.sqrt(x * x + d0 * d0), a = d0 / rr, cs = -x / rr, w = k ? 0.85 : 1;
      aR += a * Math.sqrt(a) * (0.75 + 0.25 * cs) * w; aS += a * a * (0.6 + 0.4 * cs) * w;
    }
    const x0 = v * (t - tc) + 1, r0 = Math.sqrt(x0 * x0 + d0 * d0), cs0 = -x0 / r0, d = 1 / (1 - m * cs0);
    const a0 = d0 / r0, ae = a0 * Math.sqrt(a0) * (0.55 + 0.45 * cs0) * d;
    aR *= d; aS *= d;
    if (i % 300 === 0) ft = 0.35 + 0.65 * r();
    fl += (ft - fl) * 0.003;
    const roar = lpR(bn[i], V.roar * d * (0.8 + 0.5 * S)) * aR * V.body * (0.4 + 0.6 * S) * 0.4;
    tph += v / V.tp * d / sr; if (tph >= 1) tph -= 1;
    const tread = (Math.sin(c.TAU * tph) + 0.45 * Math.sin(2 * c.TAU * tph) + 0.2 * Math.sin(3 * c.TAU * tph)) * aR * (0.25 + 0.75 * S) * 0.1;
    const lc = Math.min(0.45 * sr, (2000 + 6000 * Math.min(1, aS)) * d * V.hf * (0.7 + 0.6 * p.spray));
    const hiss = lpA(hpH(wn2[i]), lc) * Math.min(1.5, aS) * fl * (0.35 + 0.65 * p.spray) * (0.4 + 0.6 * S) * 1.2;
    let eng = 0;
    if (p.engine > 0) {
      ph += V.f0 * rpm * d / sr;
      if (ph >= 1) { ph -= 1; rough = 0.8 + 0.4 * r(); clat = 1; }
      const q = 1 - ph, q2 = q * q, q4 = q2 * q2, e = hpE((V.sharp ? q4 * q4 : q4) * rough);
      eng = (lpE(e, 600 + 3500 * Math.min(1, ae)) * 0.8 + bpF(e, V.form * d, 0.25) * 0.6) * ae * p.engine * V.eg * 1.8;
      if (V.clat) { clat *= cd; eng += bpC(wn3[i]) * clat * ae * p.engine * 0.35; }
      if (V.turbo) { tbph += 2300 * (0.85 + 0.3 * S) * d / sr; if (tbph >= 1) tbph -= 1; eng += Math.sin(c.TAU * tbph) * 0.07 * ae * p.engine; }
    }
    const tw2 = t - tw + 0.05, wk = tw2 < 0 ? 0 : Math.min(1, tw2 / 0.06) * Math.exp(-tw2 / wTau);
    const wake = lpW(hpW(wn3[i]), 6500) * wk * (0.15 + 0.85 * p.spray) * (0.3 + 0.7 * S) * Math.sqrt(V.body) * 0.7 * fl;
    out[i] = (lpAir(roar + tread + hiss + eng, 2500 + 15000 * Math.min(1, aR)) + wake) * win;
  }
  for (let k = 0; k < NA; k++) {
    const t = tc + V.axles[k] / v + c.between(r, -0.02, 0.02), g = V.body * (0.5 + 0.5 * S) * (k ? 0.85 : 1);
    c.mix(out, c.ring([[V.thump * c.between(r, 0.95, 1.05), 1], [V.thump * 2.3, 0.35]], 0.18, 0.03 + 0.02 * V.body, sr), t, 0.22 * g, sr);
    c.mix(out, c.burst(r, 0.02, "lp", 900, 0.8, 0.002, 0.008, sr), t, 0.12 * g, sr);
  }
  const grains = Math.round(p.spray * (60 + 240 * S) * NA / 2), wd = d0 / v * 1.4;
  for (let g = 0; g < grains; g++) {
    const t = tc + V.axles[g % NA] / v + (r() + r() + r() - 1.5) * wd;
    if (t < 0.05 || t > tw + 0.4) continue;
    c.mix(out, c.burst(r, 0.006 + r() * 0.01, "bp", Math.min(0.42 * sr, (1800 + r() * 3800) * dopAt(t)), 3, 0.0004, 0.002 + r() * 0.004, sr), t, (0.04 + 0.1 * r()) * p.spray, sr);
  }
  for (let g = 0; g < Math.round(30 * p.spray); g++) c.mix(out, c.burst(r, 0.01, "bp", 1500 + r() * 3500, 3, 0.0005, 0.003, sr), tw + Math.pow(r(), 1.5) * wTau * 2, (0.02 + 0.05 * r()) * p.spray, sr);
  if (p.spray > 0.05) {
    const tp = tc + V.axles[Math.floor(r() * NA)] / v + c.between(r, -0.04, 0.04), ga = p.spray * (0.5 + 0.5 * S);
    c.mix(out, c.burst(r, 0.16, "lp", 700 + 400 * r(), 0.8, 0.003, 0.05, sr), tp, 0.4 * ga, sr);
    for (let g = 0; g < 30; g++) c.mix(out, c.burst(r, 0.008, "bp", 1100 + r() * 2600, 2.5, 0.0005, 0.003, sr), tp + 0.004 + Math.pow(r(), 1.5) * 0.16, (0.05 + 0.09 * r()) * ga, sr);
  }
  let o = out;
  if (p.tail) {
    const e1 = Math.round(c.between(r, 0.07, 0.1) * sr), e2 = Math.round(c.between(r, 0.15, 0.2) * sr), l1 = c.onepole(sr), l2 = c.onepole(sr);
    o = new Float32Array(n);
    for (let i = 0; i < n; i++) o[i] = out[i] + 0.4 * l1(i >= e1 ? out[i - e1] : 0, 2500) + 0.25 * l2(i >= e2 ? out[i - e2] : 0, 1600);
    o = c.reverb(o, { size: 0.9, decay: 0.75, mixAmt: 0.4 }, sr) || o;
  }
  const L = o.length, fo = Math.round(0.25 * sr);
  for (let i = Math.max(0, L - fo); i < L; i++) o[i] *= sm((L - 1 - i) / fo);
  o = c.finish(o, 0.9, 1.1) || o;
  let end = o.length - 1;
  while (end > 0 && Math.abs(o[end]) < 0.001) end--;
  o = o.slice(0, Math.min(o.length, end + Math.round(0.02 * sr)));
  c.fade(o, 20, sr);
  return { samples: o };
}
