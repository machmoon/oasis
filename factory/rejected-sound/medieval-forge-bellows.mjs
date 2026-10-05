// Forge bellows: each pump is a valve-flap slap and sharp air blast that falls away, a flap and slow suction on the inhale, stick-slip leather creak, a fire bed that kicks after every blast, ember crackle, one big ember flare, and an optional room tail.
export const meta = {
  title: "Forge Bellows", kind: "sfx", format: "sound", duration: 3.4, price: 3, author: "hollowbody", payout: "hollowbody@creators.oasis.example", kit: "Medieval Market", description: "Leather bellows pumping air into a forge, with valve flaps, a creaking hide and an ember flare flaring up on the second blast; for blacksmith scenes and medieval workshops.",
  tags: ["bellows", "forge", "blacksmith", "fire", "leather", "medieval", "ember", "workshop"],
};
export const params = { knobs: {
  size: { type: "choice", label: "Bellows size", default: "small", options: ["small", "large"] },
  rate: { type: "range", label: "Pump rate", default: 1, min: 0.5, max: 2, step: 0.05 },
  airflow: { type: "range", label: "Airflow", default: 0.6, min: 0, max: 1, step: 0.01 },
  creak: { type: "range", label: "Leather creak", default: 0.5, min: 0, max: 1, step: 0.01 },
  roar: { type: "range", label: "Fire roar", default: 0.5, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Room tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, big = p.size === "large", r = c.rng(p.seed * 613 + (big ? 97 : 11)), dur = 3, N = c.seconds(dur + 0.8, sr), out = new Float32Array(N);
  const period = (big ? 1.3 : 0.72) / p.rate, air = 0.4 + 0.6 * p.airflow, bodyHz = big ? 240 : 480, roar = p.roar;
  const blastLen = period * 0.5, inLen = period * 0.34, imp = new Float32Array(N), onsets = [];
  let t0 = 0.15 + r() * 0.04;
  while (t0 < dur - period * 0.9) {
    const amp = 0.85 + 0.3 * r(); onsets.push(t0); imp[c.seconds(t0, sr)] = amp;
    c.mix(out, c.ring([[big ? 62 : 95, 1], [big ? 118 : 190, 0.4]], 0.14, big ? 0.06 : 0.035, sr), t0, 0.55 * amp * (big ? 1.2 : 0.8), sr);
    c.mix(out, c.burst(r, 0.012, "bp", big ? 900 : 1500, 2, 0.0005, 0.004, sr), t0, 0.5 * amp, sr);
    const m = c.seconds(blastLen, sr), x = c.pink(r, m), op = c.onepole(sr), nz = c.biquad("bp", bodyHz * (2 + 1.5 * air), 2.2, sr), tau = blastLen * (big ? 0.38 : 0.28);
    for (let i = 0; i < m; i++) { const u = i / m, e = Math.exp(-i / sr / tau) * Math.min(1, i / (0.008 * sr)) * (u > 0.85 ? (1 - u) / 0.15 : 1); x[i] = (op(x[i], bodyHz * (1.5 + 4 * air) * (1 - 0.7 * u)) * 2.2 + nz(x[i]) * 1.5) * e; }
    c.mix(out, x, t0 + 0.004, (0.5 + 0.6 * air) * amp, sr);
    const ti = t0 + blastLen + period * 0.08;
    c.mix(out, c.burst(r, 0.02, "hp", 2200, 0.8, 0.0008, 0.006, sr), ti, 0.22 * amp, sr);
    c.mix(out, c.ring([[big ? 150 : 260, 1], [big ? 340 : 590, 0.3]], 0.06, 0.012, sr), ti, 0.16, sr);
    const k = c.seconds(inLen, sr), y = c.noise(r, k), ib = c.biquad("bp", bodyHz * 3.2, 1.4, sr);
    for (let i = 0; i < k; i++) { const u = i / k; y[i] = ib(y[i]) * Math.pow(Math.sin(Math.PI * Math.pow(u, 0.6)), 2); }
    c.mix(out, y, ti + 0.03, 0.28 * air, sr);
    if (p.creak > 0) {
      const cn = c.seconds(inLen * 1.1, sr), cr = new Float32Array(cn), g1 = c.noise(r, cn), g2 = c.noise(r, cn), l1 = c.biquad("lp", 30, 0.7, sr), l2 = c.biquad("lp", 18, 0.7, sr);
      const f0 = (big ? 85 : 130) * (0.9 + 0.2 * r()), res = c.biquad("bp", (big ? 650 : 1000) * (0.9 + 0.2 * r()), 4, sr); let ph = 0;
      for (let i = 0; i < cn; i++) {
        const u = i / cn, f = f0 * (1 + 0.5 * u) * (1 + 0.2 * c.clamp(25 * l2(g2[i]), -1, 1)); ph += f / sr; ph -= Math.floor(ph);
        const s = 2 * ph - 1, g = c.clamp(0.05 + 25 * l1(g1[i]), 0, 1);
        cr[i] = (res(s) * 2.5 + s * 0.25) * g * Math.sin(Math.PI * u);
      }
      c.mix(out, cr, ti + 0.02, 0.5 * p.creak, sr);
    }
    const nc = Math.round(2 + 6 * roar);
    for (let d = 0; d < nc; d++) c.mix(out, c.burst(r, 0.005 + r() * 0.008, "bp", 2000 + r() * 4500, 5, 0.0004, 0.002 + r() * 0.003, sr), t0 + 0.04 + r() * blastLen, (0.15 + 0.35 * r()) * (0.4 + roar), sr);
    t0 += period * (0.97 + 0.06 * r());
  }
  const bed = c.brown(r, N), fl = c.pink(r, N), b1 = c.biquad("bp", 170 + 110 * roar, 0.7, sr), b2 = c.biquad("hp", 800, 0.7, sr);
  const dk = Math.exp(-1 / (sr * 0.3)), sm = 1 - Math.exp(-1 / (0.03 * sr)), endF = c.seconds(dur - 0.3, sr); let e = 0, s = 0;
  for (let i = 0; i < N; i++) {
    e = e * dk + imp[i]; s += (Math.min(1, e) - s) * sm;
    const gate = i < endF ? 1 : Math.max(0, 1 - (i - endF) / (0.3 * sr));
    out[i] += (b1(bed[i]) * 4 + b2(fl[i]) * 0.35) * (0.25 + 0.75 * roar) * (0.2 + 0.5 * s) * 0.5 * gate;
  }
  if (onsets.length > 1) {
    const tf = onsets[1] + 0.05, fn = c.seconds(0.8, sr), em = c.noise(r, fn), op = c.onepole(sr), hp = c.biquad("hp", 2200, 0.8, sr), lv = 0.5 + 0.5 * roar;
    for (let i = 0; i < fn; i++) { const t = i / sr, e2 = Math.min(1, t / 0.1) * Math.exp(-Math.max(0, t - 0.1) / 0.22); em[i] = hp(op(em[i], 2500 + 6000 * Math.min(1, t / 0.3))) * 3 * e2 * (0.7 + 0.3 * Math.sin(t * 70 + 1)); }
    c.mix(out, em, tf, 0.3 * lv, sr);
    c.mix(out, c.ring([[58, 1], [116, 0.4]], 0.3, 0.1, sr), tf, 0.5 * lv, sr);
    for (let d = 0; d < 10 + 14 * roar; d++) { const q = Math.pow(r(), 1.5) * 0.7; c.mix(out, c.burst(r, 0.005 + r() * 0.008, "bp", 2500 + r() * 4500, 6, 0.0003, 0.002 + r() * 0.004, sr), tf + 0.04 + q, (0.25 + 0.5 * r()) * lv * Math.exp(-q / 0.4), sr); }
  }
  let res = out;
  if (p.tail) res = c.reverb(out, { size: big ? 0.8 : 0.6, decay: 0.75, mixAmt: 0.38 }, sr);
  const len = p.tail ? N : c.seconds(dur + 0.05, sr), o2 = new Float32Array(len);
  o2.set(res.subarray(0, len));
  c.fade(o2, 30, sr);
  c.finish(o2, 0.85, 1.1);
  c.fade(o2, 40, sr);
  return { samples: o2 };
}
