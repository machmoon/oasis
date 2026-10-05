// Pinecone drop: a woody cone grazes needles on the way down, hits the forest floor and bounces to rest. Each impact is a floor thump, inharmonic wood modes, a contact tick, rattling scale clicks, a litter crunch and settling needles; it ends in a rolling rustle.
export const meta = {
  title: "Pinecone Drop", kind: "foley", format: "sound", duration: 1, price: 1, author: "stormfront", payout: "stormfront@creators.oasis.example", kit: "Forest at Night", description: "A pinecone falling through needles onto the forest floor and bouncing to rest, with cone size, drop height, bounce count, floor softness and pitch as knobs; every seed tumbles differently.",
  tags: ["pinecone", "drop", "bounce", "forest", "foley", "wood", "night", "impact"],
};
export const params = { knobs: {
  size: { type: "choice", label: "Cone size", default: "small", options: ["small", "large"] },
  height: { type: "range", label: "Drop height", default: 0.5, min: 0, max: 1, step: 0.01 },
  bounces: { type: "range", label: "Bounce count", default: 3, min: 0, max: 6, step: 1 },
  softness: { type: "range", label: "Floor softness", default: 0.4, min: 0, max: 1, step: 0.01 },
  pitch: { type: "range", label: "Pitch", default: 0.5, min: 0, max: 1, step: 0.01 },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const big = p.size === "large", sr = c.sr, r = c.rng(p.seed * 6151 + (big ? 97 : 13) + 3);
  const soft = p.softness, h = p.height, pf = Math.pow(2, (p.pitch - 0.5) * 1.4) * (0.96 + 0.08 * r());
  const e = (big ? 0.5 : 0.6) - 0.32 * soft, pre = 0.05 + 0.13 * h;
  const hits = [[pre, 1, 0.5 + 0.5 * h]];
  let t = pre, dt = (0.14 + 0.26 * h) * (big ? 0.9 : 1), a = 1, v = 0.5 + 0.5 * h;
  for (let k = 0; k < p.bounces; k++) {
    t += Math.max(0.035, dt * (0.8 + 0.4 * r()));
    a *= Math.min(0.92, (e + 0.2) * (0.8 + 0.35 * r()));
    v *= 0.75 + 0.15 * r();
    hits.push([t, a, v]);
    dt *= (e + 0.15) * (0.8 + 0.4 * r());
  }
  const rollAt = t + 0.02 + 0.02 * r(), rollDur = (0.12 + 0.18 * (1 - soft)) * (big ? 1.25 : 1) * (0.8 + 0.4 * r());
  const dur = Math.max(rollAt + rollDur, t + 0.12 + 0.12 * soft) + 0.07, n = c.seconds(dur, sr), out = new Float32Array(n);
  const gn = c.seconds(pre, sr), g = c.noise(r, gn), gbp = c.biquad("bp", (3000 - 1200 * soft) * (0.8 + 0.4 * r()), 0.8, sr); let fl = 1;
  for (let i = 0; i < gn; i++) { if (i % 90 === 0) fl = 0.3 + 0.7 * r(); const x = i / gn; g[i] = gbp(g[i]) * fl * x * x * (1 - Math.pow(x, 8)); }
  c.mix(out, g, 0, 0.05 + 0.12 * h, sr);
  for (let s = 0; s < 6 + 14 * h; s++) c.mix(out, c.burst(r, 0.003, "hp", 3500 + 3000 * r(), 0.8, 0.0003, 0.0008, sr), pre * Math.sqrt(r()) * 0.95, 0.1 * r(), sr);
  const hit = (at, amp, vel) => {
    const f0 = (big ? 95 : 150) * pf * (1 - 0.25 * soft);
    c.mix(out, c.ring([[f0, 1], [f0 * 2.3, 0.3]], 0.14, (big ? 0.035 : 0.022) * (1 - 0.3 * soft), sr), at, amp * (0.35 + 0.35 * h) * (big ? 1 : 0.6) * (0.7 + 0.4 * soft), sr);
    const b = (big ? 520 : 980) * pf, j = () => 0.95 + 0.1 * r();
    c.mix(out, c.ring([[b * j(), 1], [b * 2.17 * j(), 0.6], [b * 3.6 * j(), 0.35], [b * 5.3 * j(), 0.2]], 0.1, (0.01 + 0.018 * (1 - soft)) * (big ? 1.2 : 1), sr), at, amp * 0.5 * (1 - 0.55 * soft), sr);
    c.mix(out, c.burst(r, 0.006, "bp", (2500 + 3500 * (1 - soft)) * pf * (0.7 + 0.5 * vel), 0.9, 0.0004, 0.0015, sr), at, amp * (0.4 + 0.4 * vel) * (1 - 0.5 * soft), sr);
    const m = (big ? 8 : 4) + Math.floor(r() * 5);
    for (let s = 0; s < m; s++) c.mix(out, c.burst(r, 0.003, "bp", (2200 + 4300 * r()) * pf, 5, 0.0003, 0.0008, sr), at + 0.001 + Math.pow(r(), 1.5) * 0.022 * (big ? 1.3 : 1), amp * 0.25 * (0.4 + 0.6 * r()) * (1 - 0.4 * soft), sr);
    c.mix(out, c.burst(r, 0.05 + 0.08 * soft, "bp", 900 + 1400 * r(), 1.2, 0.002, 0.015 + 0.03 * soft, sr), at + 0.001, amp * (0.12 + 0.45 * soft), sr);
    c.mix(out, c.burst(r, 0.12 + 0.1 * soft, "lp", 700 + 500 * r(), 0.7, 0.004, 0.035 + 0.04 * soft, sr), at + 0.003, amp * (0.12 + 0.12 * soft), sr);
    const nc = Math.round(4 + 12 * (0.3 + soft) * amp), spread = 0.06 + 0.08 * soft;
    for (let s = 0; s < nc; s++) c.mix(out, c.burst(r, 0.003, "bp", (3800 - 1600 * soft) * (0.7 + 0.6 * r()), 1.5, 0.0003, 0.0008, sr), at + 0.006 + Math.pow(r(), 1.4) * spread, amp * 0.13 * (0.3 + 0.7 * r()), sr);
  };
  for (const [at, amp, vel] of hits) hit(at, amp, vel);
  const rn = c.seconds(rollDur, sr), rx = c.noise(r, rn), rbp = c.biquad("bp", (1500 + 900 * r()) * pf * (1 - 0.3 * soft), 1.4, sr); let rg = 1, seg = 0;
  for (let i = 0; i < rn; i++) { if (--seg <= 0) { seg = Math.round(sr * (0.004 + 0.012 * r())); rg = 0.25 + 0.75 * r(); } const x = i / rn; rx[i] = rbp(rx[i]) * rg * Math.min(1, x * 12) * (1 - x) * (1 - x); }
  c.mix(out, rx, rollAt, a * (0.35 + 0.2 * soft), sr);
  let ct = rollAt + 0.004;
  for (let i = 0; ct < rollAt + rollDur * 0.85; i++) { c.mix(out, c.burst(r, 0.004, "bp", (1800 + 2200 * r()) * pf, 3, 0.0004, 0.001, sr), ct, a * 0.3 * Math.exp(-i * 0.3) * (0.5 + 0.8 * r()) * (1 - 0.5 * soft), sr); ct += (0.01 + 0.025 * r()) * (1 + i * 0.25); }
  c.filter(out, c.biquad("lp", Math.min(0.45 * sr, 12000 - 7500 * soft), 0.7, sr));
  c.finish(out, 0.95);
  const L = Math.min(n, c.seconds(0.04, sr));
  for (let i = 0; i < L; i++) out[n - 1 - i] *= i / L;
  c.fade(out, 1, sr);
  c.gain(out, 0.76 + 0.24 * h);
  return { samples: out };
}
