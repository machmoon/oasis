// Empty rocking chair: a rocker thump and scuff at every reversal, a stick-slip joint creak on each swing (oak: low swept groan; wicker: thin fast crackle), and an optional comb-built room tail. The chair slowly loses energy.
export const meta = {
  title: "Empty Rocking Chair", kind: "foley", format: "sound", duration: 3, price: 2, author: "hollowbody", payout: "hollowbody@creators.oasis.example", kit: "Horror House", description: "An empty rocking chair creaking slowly back and forth on bare boards, for haunted rooms and abandoned-house scenes; wood, creak, floor contact and rate are knobs.",
  tags: ["rocking chair", "creak", "horror", "foley", "wood", "haunted", "floorboard", "abandoned"],
};
export const params = { knobs: {
  wood: { type: "choice", label: "Wood", default: "oak", options: ["oak", "wicker"] },
  creak: { type: "range", label: "Creak amount", default: 0.6, min: 0, max: 1, step: 0.01 },
  floor: { type: "range", label: "Floor contact", default: 0.5, min: 0, max: 1, step: 0.01 },
  rate: { type: "range", label: "Rock rate", default: 0.8, min: 0.4, max: 1.4, step: 0.01 },
  tail: { type: "toggle", label: "Room tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + (p.wood === "oak" ? 3 : 29)), dur = 3, n = c.seconds(dur, sr), out = new Float32Array(n);
  const oak = p.wood === "oak", half = 0.36 / p.rate;
  let t = 0.1, dir = 0, amp = 1, slow = 1;
  while (t < dur - 0.7) {
    const a = amp * (0.75 + 0.25 * r()) * (dir ? 0.8 : 1);
    const f0 = (oak ? 90 : 135) * (0.92 + r() * 0.16);
    c.mix(out, c.ring([[f0, 1], [f0 * 2.1, 0.4], [f0 * 3.3, 0.15]], 0.25, oak ? 0.07 : 0.035, sr), t, (0.1 + 0.5 * p.floor) * a, sr);
    c.mix(out, c.burst(r, 0.03, "bp", oak ? 700 + 500 * r() : 1800 + 800 * r(), 1.2, 0.001, 0.01, sr), t, (0.04 + 0.4 * p.floor) * a, sr);
    const sl = c.seconds(0.12, sr), scuff = c.noise(r, sl), lp = c.biquad("lp", 1200 + 800 * p.floor, 0.7, sr);
    for (let i = 0; i < sl; i++) scuff[i] = lp(scuff[i]) * Math.sin(Math.PI * i / sl) * (r() < 0.7 ? 1 : 0.3);
    c.mix(out, scuff, t + 0.02, 0.1 * p.floor * a, sr);
    if (p.creak > 0.02) {
      const cn = c.seconds(half * (0.6 + 0.15 * r()), sr), x = new Float32Array(cn);
      const base = (oak ? 520 : 1250) * (0.8 + r() * 0.5) * (dir ? 1.12 : 1), sw = (r() - 0.5) * 0.4 + (dir ? -0.3 : 0.35);
      const ratios = oak ? [1, 1.53, 2.37] : [1, 1.31, 2.9], ga = [1, 0.5, 0.25], ph = [0, 0, 0];
      const bp = c.biquad("bp", base * 1.4, oak ? 3 : 5, sr);
      let sp = 0, fs = (oak ? 38 : 110) * (0.8 + r() * 0.5), g = 0, tgt = 1;
      for (let i = 0; i < cn; i++) {
        const u = i / cn;
        if (i % 400 === 0) { fs = (oak ? 38 : 110) * (0.7 + r() * 0.7); tgt = r() < 0.25 ? 0.15 : 0.6 + 0.4 * r(); }
        g += (tgt - g) * 0.01;
        sp += fs / sr; if (sp >= 1) sp -= 1;
        const gate = (1 - sp) * (1 - sp), f = base * (1 + sw * u) * (1 + 0.025 * Math.sin(i * 0.011));
        let s = 0;
        for (let k = 0; k < 3; k++) { ph[k] += c.TAU * f * ratios[k] / sr; s += Math.sin(ph[k]) * ga[k]; }
        const e = Math.sin(Math.PI * u);
        const tick = oak ? 0 : (r() < 0.02 ? (r() - 0.5) * 3 : 0);
        x[i] = (s * 0.5 * gate + bp(r() * 2 - 1) * 1.2 * gate + tick) * g * e;
      }
      c.mix(out, x, t + 0.04, 0.45 * p.creak * a, sr);
    }
    dir ^= 1; amp *= 0.9; slow *= 1.06; t += half * slow * (0.93 + 0.14 * r());
  }
  if (p.tail) {
    const src = out.slice(), lpf = c.onepole(sr);
    for (const [d, gn] of [[0.029, 0.55], [0.041, 0.5], [0.053, 0.45], [0.067, 0.4]]) {
      const dl = c.seconds(d, sr), buf = new Float32Array(n); let st = 0;
      for (let i = 0; i < n; i++) {
        const fb = i >= dl ? buf[i - dl] : 0;
        st = lpf(fb, 1800);
        buf[i] = src[i] + st * Math.min(0.9, gn + 0.3);
      }
      for (let i = 0; i < n; i++) out[i] += buf[i] * 0.07;
    }
  }
  c.fade(out, 30, sr);
  c.finish(out, 0.85, 1.1);
  c.fade(out, 60, sr);
  return { samples: out };
}
