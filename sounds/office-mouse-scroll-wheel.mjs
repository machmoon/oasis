// Mouse scroll wheel: notched = decelerating detent ticks (click body + plastic edge + spring buzz + finger flick); free-spin = falling-pitch bearing whirr with faint rim ticks; optional small room tail.
export const meta = {
  title: "Scroll Wheel Spin", kind: "foley", format: "sound", duration: 1.6, price: 1, author: "foleyroom", payout: "foleyroom@creators.oasis.example", kit: "Office", description: "A mouse scroll wheel flicked and spinning down, either notched with crisp detent ticks or free-spinning with a bearing whirr; for office desks, UI-adjacent foley and close-up hand props.",
  tags: ["mouse", "scroll", "wheel", "office", "detent", "click", "foley", "desk"],
};
export const params = { knobs: {
  wheel: { type: "choice", label: "Wheel type", default: "notched", options: ["notched", "free-spin"] },
  rate: { type: "range", label: "Scroll rate", default: 0.5, min: 0, max: 1, step: 0.01 },
  clarity: { type: "range", label: "Detent clarity", default: 0.6, min: 0, max: 1, step: 0.01 },
  length: { type: "range", label: "Spin length", default: 0.5, min: 0, max: 1, step: 0.01 },
  pitch: { type: "range", label: "Pitch", default: 0.5, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Room tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + (p.wheel === "notched" ? 3 : 29));
  const spin = 0.4 + 1.0 * p.length;
  const out = new Float32Array(c.seconds(spin + 0.45, sr));
  const pf = Math.pow(2, (p.pitch - 0.5) * 1.6), cl = 0.3 + 0.7 * p.clarity;
  if (p.wheel === "notched") {
    const r0 = 30 + 55 * p.rate;
    c.mix(out, c.burst(r, 0.03, "bp", 2200 * pf, 0.8, 0.003, 0.012, sr), 0, 0.2, sr);
    let t = 0.008, k = 0;
    while (t < spin) {
      const prog = t / spin, rate = r0 * Math.pow(1 - prog, 0.7) + 5;
      const a = (0.5 + 0.5 * (1 - prog * 0.5)) * (0.7 + 0.3 * r()) * (k % 2 ? 0.85 : 1);
      const f = (1500 + 500 * r()) * pf;
      c.mix(out, c.ring([[f, 1], [f * 2.3, 0.4 * cl], [f * 3.7, 0.2 * cl]], 0.03, 0.004 + 0.006 * p.clarity, sr), t, 0.5 * a, sr);
      c.mix(out, c.burst(r, 0.005, "hp", (3000 + 3000 * p.clarity) * pf, 0.8, 0.0003, 0.0015, sr), t, 0.5 * cl * a, sr);
      c.mix(out, c.ring([[280 * pf * (0.95 + 0.1 * r()), 1]], 0.04, 0.01, sr), t, 0.25 * a, sr);
      const gap = 1 / rate;
      for (let s = 1; s < 3; s++) c.mix(out, c.burst(r, 0.003, "bp", (4500 + 2000 * r()) * pf, 3, 0.0002, 0.001, sr), t + gap * s * 0.25, 0.12 * a * (1 - 0.5 * p.clarity), sr);
      t += gap * (0.92 + 0.16 * r());
      k++;
    }
  } else {
    const n = c.seconds(spin + 0.15, sr), x = c.noise(r, n), bp = c.biquad("bp", 2200 * pf, 3, sr);
    const hiss = c.biquad("hp", 4000, 0.7, sr);
    const f0 = (300 + 450 * p.rate) * pf;
    let ph = 0, ph2 = 0, ph3 = 0;
    for (let i = 0; i < n; i++) {
      const tt = i / sr, prog = tt / spin, e = prog < 1 ? Math.pow(1 - prog, 1.2) : 0;
      const att = Math.min(1, tt / 0.012), f = f0 * (0.3 + 0.7 * e);
      ph += c.TAU * f / sr; ph2 += c.TAU * f * 2.01 / sr; ph3 += c.TAU * f * 3.02 / sr;
      const rough = 0.75 + 0.25 * Math.sin(ph * 0.5 + 1);
      const w = (Math.sin(ph) * 0.6 + Math.sin(ph2) * 0.3 + Math.sin(ph3) * 0.12 * (0.3 + p.clarity)) * rough;
      x[i] = (w * 0.65 + bp(x[i]) * 0.25 + hiss(x[i]) * 0.06) * e * att;
    }
    c.mix(out, x, 0.003, 0.9, sr);
    const ticks = Math.round(6 + 14 * p.clarity);
    for (let g = 0; g < ticks; g++) {
      const t = r() * spin * 0.8;
      c.mix(out, c.burst(r, 0.004, "bp", (2500 + 2500 * r()) * pf, 3, 0.0003, 0.0012, sr), t, 0.2 * (1 - t / spin), sr);
    }
    c.mix(out, c.burst(r, 0.02, "lp", 1200 * pf, 0.8, 0.001, 0.006, sr), 0, 0.5, sr);
  }
  let res = out;
  if (p.tail) {
    const w = c.reverb(out.slice(), { size: 0.25, decay: 0.3, mixAmt: 1 }, sr);
    res = new Float32Array(out.length);
    for (let i = 0; i < out.length; i++) res[i] = out[i] + 0.25 * w[i];
  }
  c.fade(res, 25, sr);
  c.finish(res, 0.85, 1.1);
  return { samples: res };
}
