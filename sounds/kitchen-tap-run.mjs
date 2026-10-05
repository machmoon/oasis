// Kitchen tap: a valve ramp opens into a stream built from rising bubble chirps and gurgles, which ring the sink's shell modes and drum body, with plate splash-offs, dish clinks and pitched drips after shut-off.
export const meta = {
  title: "Tap Into Sink", kind: "sfx", format: "sound", duration: 2.5, price: 2, author: "foleyroom", payout: "foleyroom@creators.oasis.example", kit: "Kitchen", description: "A kitchen tap opened, running into a steel, ceramic or granite sink and shut off, with flow, splash and dishes as knobs; for kitchen scenes, washing up and household foley.",
  tags: ["tap", "faucet", "sink", "water", "kitchen", "running", "splash", "foley"],
};
export const params = { knobs: {
  material: { type: "choice", label: "Sink material", default: "steel", options: ["steel", "ceramic", "granite"] },
  flow: { type: "range", label: "Flow", default: 0.5, min: 0, max: 1, step: 0.01 },
  splash: { type: "range", label: "Splash", default: 0.4, min: 0, max: 1, step: 0.01 },
  dishes: { type: "range", label: "Dishes in sink", default: 0, min: 0, max: 1, step: 0.01 },
  duration: { type: "range", label: "Duration", default: 2.2, min: 0.8, max: 2.7, step: 0.1 },
  tail: { type: "toggle", label: "Shut-off drips", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, mi = params.knobs.material.options.indexOf(p.material), r = c.rng(p.seed * 6151 + mi * 97 + 3);
  const f = p.flow, sp = p.splash, dsh = p.dishes, offT = 0.28 + 0.1 * f, tailT = p.tail ? 1.25 : offT + 0.12;
  const D = Math.min(p.duration, 3.92 - tailT), n = c.seconds(D + tailT, sr);
  const out = new Float32Array(n), wet = new Float32Array(n);
  const M = { steel: { modes: [[412, 1], [1090, 0.8], [2230, 0.6], [3610, 0.5], [5200, 0.3]], q: 40, rg: 3, drum: [165, 6, 2.2], lp: 11000, bd: 1.15, pitch: 1.1 },
    ceramic: { modes: [[640, 1], [1520, 0.6], [2950, 0.35]], q: 10, rg: 1.4, drum: [300, 2.5, 0.6], lp: 5500, bd: 0.85, pitch: 1 },
    granite: { modes: [], q: 1, rg: 0, drum: [110, 0.8, 0.35], lp: 2000, bd: 0.6, pitch: 0.8 } }[p.material];
  const ramp = new Float32Array(n), fl = new Float32Array(n), on = c.seconds(0.35 + 0.25 * (1 - f), sr), offAt = c.seconds(D, sr), offN = c.seconds(offT, sr), k = 180 / sr;
  let g = 0.8, tg = 1, cnt = 0;
  for (let i = 0; i < n; i++) {
    const u = i < on ? i / on : 1; let a = u * u * (3 - 2 * u);
    if (i > offAt) { const v = Math.max(0, 1 - (i - offAt) / offN); a *= v * v; }
    ramp[i] = a;
    if (--cnt <= 0) { const sput = 1 - a; tg = 0.5 + 0.7 * r() - 0.4 * sput * r(); cnt = Math.floor(sr * (0.008 + 0.05 * r())); }
    g += (tg - g) * k; fl[i] = Math.max(0.05, g);
  }
  const at = (t) => Math.min(n - 1, Math.max(0, Math.floor(t * sr)));
  const nx = (rate) => -Math.log(1 - r() * 0.999) / rate;
  const hs = c.noise(r, n), body = c.pink(r, n), lp = c.onepole(sr), hp = c.biquad("hp", 500, 0.6, sr), bb = c.biquad("bp", 300 + 250 * f, 1, sr);
  for (let i = 0; i < n; i++) {
    const e = ramp[i] * fl[i];
    wet[i] += hp(lp(hs[i], 700 + (1200 + 2500 * f + 1200 * sp) * ramp[i])) * e * (0.025 + 0.05 * f);
    body[i] = bb(body[i]) * e * (0.1 + 0.2 * f);
  }
  const bubble = (t0, f0, d, amp, rise) => {
    const s = Math.floor(t0 * sr), m = Math.max(8, Math.floor(d * sr)), att = Math.max(2, Math.floor(0.0008 * sr)), dec = Math.exp(-5 / m);
    let ph = 0, a = amp;
    for (let j = 0; j < m && s + j < n; j++) { ph += c.TAU * f0 * (1 + rise * j / m) / sr; wet[s + j] += Math.sin(ph) * a * (j < att ? j / att : 1); a *= dec; }
  };
  const rate = 120 + 450 * f + 120 * sp;
  for (let t = 0.01; t < D + offT; t += nx(rate)) {
    const i = at(t), e = ramp[i] * fl[i];
    if (r() > ramp[i] + 0.05 || e < 0.02) continue;
    const f0 = c.between(r, 400, 2200) * M.pitch * (1.3 - 0.3 * ramp[i]) * (1 - 0.3 * dsh);
    bubble(t, f0, c.between(r, 0.006, 0.025) * M.bd, e * c.between(r, 0.15, 0.45), c.between(r, 0.5, 2));
  }
  for (let t = 0.05; t < D + offT * 0.6; t += nx((6 + 25 * f) * (1 + dsh))) {
    const e = ramp[at(t)] * fl[at(t)];
    bubble(t, c.between(r, 140, 420) * M.pitch, c.between(r, 0.03, 0.08), e * c.between(r, 0.2, 0.4), c.between(r, 0.3, 0.9));
  }
  const srate = sp * (30 + 200 * f);
  for (let t = 0.05; srate > 0 && t < D; t += nx(srate)) {
    const e = ramp[at(t)] * fl[at(t)];
    c.mix(wet, c.burst(r, 0.006 + r() * 0.01, "bp", 1800 + r() * 3500, 1.2, 0.0004, 0.002 + r() * 0.003, sr), t, e * sp * c.between(r, 0.15, 0.45), sr);
  }
  if (p.tail) {
    let t = D + offT + 0.05 + r() * 0.05, gap = 0.08 + r() * 0.04, amp = 0.35 + 0.2 * f;
    while (t < D + tailT - 0.2) {
      bubble(t, c.between(r, 900, 2000) * M.pitch, c.between(r, 0.03, 0.05) * M.bd, amp, c.between(r, 1.2, 2.5));
      t += gap * (0.8 + 0.4 * r()); gap *= 1.4; amp *= 0.78;
    }
    for (let q = 0; q < 8 + 10 * f; q++) bubble(D + offT * 0.5 + r() * 0.55, c.between(r, 180, 480), c.between(r, 0.02, 0.05), 0.12 * (0.5 + f), c.between(r, 0.5, 1.5));
  }
  const sum = new Float32Array(n);
  for (const [m, a] of M.modes) {
    const bp = c.biquad("bp", m * (0.97 + 0.06 * r()), M.q, sr), ga = a * M.rg * (1 - 0.6 * dsh);
    for (let i = 0; i < n; i++) sum[i] += bp(wet[i]) * ga;
  }
  const dr = c.biquad("bp", M.drum[0] * (0.95 + 0.1 * r()), M.drum[1], sr), pl = c.biquad("bp", 850 * (0.9 + 0.2 * r()), 6, sr), tone = c.biquad("lp", M.lp, 0.7, sr);
  for (let i = 0; i < n; i++) sum[i] = tone(sum[i] + wet[i] + body[i] * (1 - 0.4 * dsh) + dr(wet[i] + body[i]) * M.drum[2] * (1 - 0.5 * dsh) + pl(wet[i]) * dsh * 1.5);
  c.mix(out, sum, 0, 1, sr);
  c.mix(out, c.burst(r, 0.02, "lp", 900, 0.8, 0.0008, 0.005, sr), 0.002, 0.12, sr);
  c.mix(out, c.ring([[1700 * (0.95 + 0.1 * r()), 1], [4300, 0.4]], 0.04, 0.006, sr), D, 0.08, sr);
  const prate = dsh * (6 + 14 * f);
  for (let t = 0.3 + r() * 0.1; prate > 0 && t < D - 0.05; t += nx(prate)) {
    c.mix(out, c.burst(r, 0.03 + 0.03 * r(), "bp", c.between(r, 3000, 6500), 1.5, 0.001, c.between(r, 0.01, 0.02), sr), t, dsh * 0.6 * ramp[at(t)], sr);
  }
  const crate = dsh * (3 + 8 * f);
  for (let t = 0.25 + r() * 0.2; crate > 0 && t < D - 0.05; t += nx(crate)) {
    const f1 = c.between(r, 900, 2600), ga = dsh * c.between(r, 0.6, 1);
    const cl = c.ring([[f1, 1], [f1 * c.between(r, 2.1, 2.7), 0.5], [f1 * c.between(r, 3.8, 4.6), 0.3]], 0.2, c.between(r, 0.04, 0.1), sr);
    c.mix(out, cl, t + 0.001, ga, sr);
    c.mix(out, c.burst(r, 0.004, "hp", 3500, 0.7, 0.0003, 0.0012, sr), t, dsh * 0.5, sr);
    if (r() < 0.5) c.mix(out, cl, t + 0.02 + 0.03 * r(), ga * 0.45, sr);
  }
  c.fade(c.finish(out, 0.9, 1.1), 15, sr);
  c.gain(out, 0.62 + 0.38 * f);
  return { samples: out };
}
