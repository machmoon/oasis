// Door-ajar chime: a repeating dashboard ding. Each ding is a struck body (inharmonic partials per chime type, or a gated tone for the beep) plus a hard strike tick and a soft mallet thump; dings are capped to their gap so the pattern stays countable, and the last one rings out into an optional cabin tail.
export const meta = {
  title: "Door Ajar Chime", kind: "sfx", format: "sound", duration: 2.6, price: 2, author: "hollowbody", payout: "hollowbody@creators.oasis.example", kit: "Car Interior", description: "A classic dashboard warning chime pattern of gong, beep or bell dings, with repeat count, brightness, rate and a cabin decay tail as knobs; for door-ajar, seatbelt and reminder alerts in car scenes.",
  tags: ["chime", "car", "dashboard", "warning", "ding", "alert", "bell", "door ajar"],
};
export const params = { knobs: {
  type: { type: "choice", label: "Chime type", default: "bell", options: ["gong", "beep", "bell"] },
  repeat: { type: "range", label: "Repeat count", default: 0.5, min: 0, max: 1, step: 0.01 },
  brightness: { type: "range", label: "Brightness", default: 0.5, min: 0, max: 1, step: 0.01 },
  rate: { type: "range", label: "Rate", default: 2, min: 1, max: 4, step: 0.05 },
  tail: { type: "toggle", label: "Decay tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + params.knobs.type.options.indexOf(p.type) * 29 + 3);
  const count = 1 + Math.round(p.repeat * 3), gap = 1 / p.rate, b = p.brightness;
  const base = { gong: 330, beep: 1320, bell: 880 }[p.type] * (0.98 + r() * 0.04);
  const full = { gong: 0.5, beep: 0.07, bell: 0.34 }[p.type];
  const lastDec = p.tail ? full : full * 0.5;
  const total = 0.05 + gap * (count - 1) + (p.tail ? lastDec * 4.5 + 0.3 : lastDec * 3 + 0.15);
  const out = new Float32Array(c.seconds(Math.min(total, 3.9), sr));
  const ding = (last) => {
    const dec = last ? lastDec : Math.min(full * 0.7, gap * 0.4);
    const mk = (ratios) => ratios.map((q, j) => [base * q * (0.997 + r() * 0.006), (1 / (1 + j * (1.3 - 0.9 * b))) * (j ? 0.5 + 0.5 * b : 1)]);
    const modes = { gong: mk([1, 1.51, 2.02, 2.78, 3.9]), beep: mk([1, 2.01]), bell: mk([1, 2.76, 5.4, 8.9]) }[p.type];
    const n = c.seconds(dec * 5 + 0.1, sr), d = new Float32Array(n);
    if (p.type === "beep") {
      const hold = 0.075 + r() * 0.008, s = c.osc("sine", base, n, sr), q = c.osc("square", base, n, sr);
      for (let i = 0; i < n; i++) { const t = i / sr; s[i] = (s[i] * (1 - 0.5 * b) + q[i] * 0.45 * b) * Math.min(1, t / 0.003) * (t < hold ? 1 : Math.exp(-(t - hold) / 0.012)); }
      c.filter(s, c.biquad("lp", 2500 + 5000 * b, 0.7, sr));
      c.mix(d, s, 0, 0.6, sr);
      c.mix(d, c.ring(modes, dec * 5, dec, sr), 0.001, 0.25, sr);
    } else {
      c.mix(d, c.ring(modes, dec * 5, dec, sr), 0.001, 0.8, sr);
    }
    c.mix(d, c.burst(r, 0.008, "hp", 2000 + 5000 * b, 0.8, 0.0004, 0.002, sr), 0, 0.3 + 0.3 * b, sr);
    c.mix(d, c.burst(r, 0.03, "lp", 500, 0.9, 0.001, 0.008, sr), 0, p.type === "gong" ? 0.5 : 0.2, sr);
    return d;
  };
  for (let k = 0; k < count; k++) c.mix(out, ding(k === count - 1), 0.02 + k * gap + (r() - 0.5) * 0.006, (1 - 0.05 * k) * (0.92 + 0.16 * r()), sr);
  c.filter(out, c.biquad("lp", 3500 + 9000 * b, 0.7, sr));
  const wet = c.reverb(out, { size: 0.3, decay: p.tail ? 0.5 : 0.15, mixAmt: p.tail ? 0.3 : 0.1 }, sr);
  const res = wet && wet.length ? wet : out;
  c.finish(res, 0.85, 1.1);
  c.fade(res, 25, sr);
  return { samples: res };
}
