// Glovebox: latch pop, damped door drop and hinge stop, clustered contents shuffle, then the close slap and a separate latch catch. Layered as latch click + panel body modes + rattle clusters + optional cabin tail.
export const meta = {
  title: "Glovebox Open Close", kind: "foley", format: "sound", duration: 2.6, price: 2, author: "hollowbody", payout: "hollowbody@creators.oasis.example", kit: "Car Interior", description: "A car glovebox: the latch pops, the door drops on its damper, loose contents shuffle, then it swings shut with a latch catch; for car interior foley.",
  tags: ["glovebox", "car", "latch", "interior", "door", "rattle", "foley", "vehicle"],
};
export const params = { knobs: {
  latch: { type: "choice", label: "Latch material", default: "plastic", options: ["plastic", "soft-touch"] },
  damping: { type: "range", label: "Damping", default: 0.5, min: 0, max: 1, step: 0.01 },
  rattle: { type: "range", label: "Contents rattle", default: 0.5, min: 0, max: 1, step: 0.01 },
  force: { type: "range", label: "Close force", default: 0.5, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Cabin tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + (p.latch === "plastic" ? 3 : 91));
  const soft = p.latch === "soft-touch", d = p.damping, f = p.force, ra = p.rattle;
  const out = new Float32Array(c.seconds(2.6, sr));
  const latch = (t, g, k) => {
    if (soft) {
      c.mix(out, c.burst(r, 0.016, "lp", 900 * k, 0.7, 0.002, 0.008, sr), t, g * 0.9, sr);
      c.mix(out, c.ring([[420 * k, 1], [780 * k, 0.3]], 0.06, 0.014, sr), t + 0.002, g * 0.45, sr);
      c.mix(out, c.ring([[150, 1], [300, 0.4]], 0.12, 0.035, sr), t, g * 0.6, sr);
    } else {
      c.mix(out, c.burst(r, 0.008, "bp", 3400 * k, 3.5, 0.0004, 0.0025, sr), t, g, sr);
      c.mix(out, c.ring([[1500 * k, 1], [3300 * k, 0.55], [5400 * k, 0.3]], 0.1, 0.03, sr), t + 0.001, g * 0.5, sr);
      c.mix(out, c.burst(r, 0.006, "bp", 4600, 4, 0.0004, 0.002, sr), t + 0.014 + 0.006 * r(), g * 0.45, sr);
      c.mix(out, c.ring([[190, 1], [380, 0.4]], 0.1, 0.022, sr), t, g * 0.35, sr);
    }
  };
  latch(0.02, 0.85, 1);
  c.mix(out, c.burst(r, 0.05, "bp", 700, 1.5, 0.002, 0.015, sr), 0.07, 0.2, sr);
  const dropT = 0.16 + 0.25 * d;
  const sw = c.seconds(dropT, sr), sl = c.noise(r, sw), sf = c.biquad("bp", 450, 1.2, sr);
  for (let i = 0; i < sw; i++) sl[i] = sf(sl[i]) * Math.sin(Math.PI * i / sw) * 0.25;
  c.mix(out, sl, 0.08, 0.45, sr);
  const hit = 0.08 + dropT;
  c.mix(out, c.ring([[95, 1], [190, 0.5], [310, 0.3]], 0.3, 0.05 + 0.05 * (1 - d), sr), hit, 0.7 - 0.35 * d, sr);
  c.mix(out, c.burst(r, 0.02, "lp", 1800 - 900 * d, 0.8, 0.001, 0.007, sr), hit, 0.45 - 0.25 * d, sr);
  const rt = hit + 0.04, ct = rt + 0.95 + r() * 0.05;
  const nc = 4 + Math.round(2 * ra);
  let t = rt + 0.02;
  for (let k = 0; k < nc; k++) {
    const kg = Math.pow(0.8, k) * (0.5 + 0.5 * r()), gr = 5 + Math.round(14 * ra);
    c.mix(out, c.burst(r, 0.07, "bp", 1400 + r() * 1200, 0.9, 0.004, 0.025, sr), t, (0.1 + 0.3 * ra) * kg, sr);
    for (let g = 0; g < gr; g++) {
      const gt = t + Math.pow(r(), 1.5) * 0.07, a = (0.25 + 0.75 * r()) * (0.2 + 0.8 * ra) * kg;
      if (r() < 0.4) c.mix(out, c.ring([[600 + r() * 2400, 1], [1500 + r() * 3000, 0.4]], 0.05, 0.008 + 0.012 * r(), sr), gt, a * 0.4, sr);
      else c.mix(out, c.burst(r, 0.006 + r() * 0.01, "bp", 1200 + r() * 3500, 2.5, 0.0004, 0.003, sr), gt, a * 0.6, sr);
    }
    t += 0.07 + r() * 0.12;
  }
  const sg = 0.2 + 0.1 * (1 - f), cw = c.seconds(sg, sr), cs = c.noise(r, cw), cf = c.biquad("lp", 700, 0.9, sr);
  for (let i = 0; i < cw; i++) cs[i] = cf(cs[i]) * Math.pow(i / cw, 1.5);
  c.mix(out, cs, ct - sg, 0.3 + 0.3 * f, sr);
  c.mix(out, c.ring([[85 + 20 * f, 1], [170, 0.6], [330, 0.35], [520, 0.2]], 0.4, 0.05 + 0.06 * f, sr), ct, 0.5 + 0.5 * f, sr);
  c.mix(out, c.burst(r, 0.03, "lp", 2200, 0.8, 0.0008, 0.01, sr), ct, 0.4 + 0.4 * f, sr);
  for (let g = 0; g < 6 + 12 * ra; g++) c.mix(out, c.burst(r, 0.008, "bp", 1500 + r() * 3000, 2.5, 0.0004, 0.003, sr), ct + 0.01 + r() * 0.2, 0.12 * r() * (0.3 + f) * (0.3 + ra), sr);
  latch(ct + 0.075 + 0.03 * (1 - f), 0.55 + 0.3 * f, 0.9);
  if (p.tail) {
    const rv = c.reverb(out.slice(), { size: 0.4, decay: 0.55, mixAmt: 1 }, sr);
    c.mix(out, rv, 0, 0.3, sr);
  }
  c.fade(out, 25, sr);
  c.finish(out, 0.85, 1.1);
  return { samples: out };
}
