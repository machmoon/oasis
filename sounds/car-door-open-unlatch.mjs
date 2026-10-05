// Car door open from inside: handle pull (plastic or chrome body + cable scrape), latch release clack with rebound, rubber seal peel in sticky ticks, hinge creak, and a cabin tail.
export const meta = {
  title: "Door Unlatch Pull", kind: "foley", format: "sound", duration: 1.3, price: 2, author: "hollowbody", payout: "hollowbody@creators.oasis.example", kit: "Car Interior",
  description: "An inner door handle pulled, the latch releasing and the rubber seal peeling away as the door swings open; for car interiors, drive scenes and character entrances.",
  tags: ["car", "door", "handle", "latch", "unlatch", "seal", "foley", "interior"],
};
export const params = { knobs: {
  handle: { type: "choice", label: "Handle material", default: "plastic", options: ["plastic", "chrome"] },
  speed: { type: "range", label: "Pull speed", default: 0.5, min: 0, max: 1, step: 0.01 },
  peel: { type: "range", label: "Seal peel", default: 0.5, min: 0, max: 1, step: 0.01 },
  creak: { type: "range", label: "Hinge creak", default: 0.3, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Cabin tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + (p.handle === "chrome" ? 91 : 13));
  const out = new Float32Array(c.seconds(1.3, sr));
  const chrome = p.handle === "chrome";
  const pull = 0.24 - 0.15 * p.speed;
  const tLatch = 0.04 + pull;
  const hm = chrome ? [[1900, 1], [2870, 0.6], [4630, 0.35], [6900, 0.15]] : [[420, 1], [910, 0.5], [1480, 0.2]];
  c.mix(out, c.ring(hm.map(([f, a]) => [f * (0.985 + r() * 0.03), a]), chrome ? 0.35 : 0.08, chrome ? 0.12 : 0.025, sr), 0.004, chrome ? 0.3 : 0.45, sr);
  const n = c.seconds(pull + 0.02, sr), t = c.noise(r, n), bp = c.biquad("bp", chrome ? 2600 : 1200, 1.5, sr);
  for (let i = 0; i < n; i++) { const u = i / n; t[i] = bp(t[i]) * u * u * Math.min(1, i / (0.004 * sr)) * (0.6 + 0.4 * r()); }
  c.mix(out, t, 0.03, 0.4, sr);
  c.mix(out, c.burst(r, 0.01, "hp", 2500, 0.8, 0.0004, 0.003, sr), tLatch, 0.8, sr);
  c.mix(out, c.ring([[780, 1], [1630, 0.6], [2450, 0.35], [3900, 0.15]].map(([f, a]) => [f * (0.99 + r() * 0.02), a]), 0.18, 0.03, sr), tLatch + 0.001, 0.6, sr);
  c.mix(out, c.ring([[310, 1], [640, 0.4]], 0.12, 0.02, sr), tLatch + 0.002, 0.5, sr);
  c.mix(out, c.ring([[1100, 0.6], [2100, 0.3]], 0.08, 0.015, sr), tLatch + 0.05 + r() * 0.02, 0.22, sr);
  const ts = tLatch + 0.07, pn = c.seconds(0.3 + 0.25 * p.peel, sr), s = c.noise(r, pn), sb = c.biquad("bp", 1800 + 1200 * r(), 0.9, sr);
  let g = 0;
  for (let i = 0; i < pn; i++) {
    if (i % 90 === 0) g = r() < 0.55 ? 0.3 + r() : 0.05;
    const u = i / pn;
    s[i] = sb(s[i]) * g * Math.sin(Math.PI * Math.pow(u, 0.6)) * Math.min(1, i / (0.006 * sr));
  }
  c.mix(out, s, ts, 0.15 + 0.75 * p.peel, sr);
  c.mix(out, c.burst(r, 0.05, "lp", 500, 0.8, 0.004, 0.02, sr), ts, 0.2 + 0.4 * p.peel, sr);
  {
    const cn = c.seconds(0.6, sr), cr = new Float32Array(cn); let ph = 0, a = 0;
    const f0 = 260 + 220 * r(), lp = c.onepole(sr);
    for (let i = 0; i < cn; i++) {
      if (i % 400 === 0) a = r() < 0.7 ? 0.4 + 0.6 * r() : 0.1;
      const u = i / cn, f = f0 * (1 + 0.6 * u + 0.08 * Math.sin(i / sr * 40));
      ph += c.TAU * f / sr;
      const v = Math.sin(ph) + 0.5 * Math.sin(2.01 * ph) + 0.3 * Math.sin(3.02 * ph);
      cr[i] = lp(v, 2500) * a * Math.sin(Math.PI * u);
    }
    c.mix(out, cr, ts + 0.1, 0.1 + 0.8 * p.creak, sr);
  }
  if (p.tail) {
    const tl = new Float32Array(out.length);
    c.mix(tl, out, 0, 1, sr);
    c.mix(out, c.reverb(tl, { size: 0.3, decay: 0.5, mixAmt: 1 }, sr), 0, 0.35, sr);
  }
  c.finish(out, 0.85, 1.1);
  c.fade(out, 25, sr);
  return { samples: out };
}
