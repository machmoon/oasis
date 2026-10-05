// EV ready-to-drive tone: a swelling chord pad (warm detuned triangles or futuristic FM glass) that settles on a held ready chord, a rising inverter whine with switching flutter, a relay-click onset, and an optional shimmering tail.
export const meta = {
  title: "EV Ready Swell", kind: "ui", format: "sound", duration: 2.6, price: 3, author: "quietmachine", payout: "quietmachine@creators.oasis.example", kit: "Car Interior", description: "An electric car ready-to-drive tone: a rising chord swell that settles on a held chord with a thin inverter whine on top, for dashboards, start-up screens and sci-fi consoles.",
  tags: ["electric", "car", "startup", "ready", "inverter", "whine", "swell", "dashboard"],
};
export const params = { knobs: {
  style: { type: "choice", label: "Tone style", default: "warm", options: ["warm", "futuristic"] },
  whine: { type: "range", label: "Whine amount", default: 0.5, min: 0, max: 1, step: 0.01 },
  swell: { type: "range", label: "Swell length", default: 0.5, min: 0, max: 1, step: 0.01 },
  pitch: { type: "range", label: "Pitch", default: 0.5, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Shimmer tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + (p.style === "warm" ? 3 : 11));
  const fut = p.style === "futuristic";
  const rise = 0.4 + 0.9 * p.swell, hold = 0.3, rel = p.tail ? 0.9 : 0.35;
  const total = 0.05 + rise + hold + rel, n = c.seconds(total, sr), out = new Float32Array(n);
  const root = 220 * Math.pow(2, p.pitch * 1.2 - 0.3);
  const ratios = fut ? [1, 1.5, 2, 3] : [1, 1.25, 1.5, 2];
  const relTau = p.tail ? 0.3 : 0.09, end = 0.05 + rise + hold;
  const body = new Float32Array(n);
  ratios.forEach((k, j) => {
    const f = root * k * (1 + (r() - 0.5) * 0.006);
    let v;
    if (!fut) {
      v = c.osc("tri", f, n, sr);
      const v2 = c.osc("sine", f * 1.006, n, sr);
      for (let i = 0; i < n; i++) v[i] = 0.6 * v[i] + 0.5 * v2[i];
    } else {
      v = new Float32Array(n);
      const ph = r() * 6;
      for (let i = 0; i < n; i++) { const t = i / sr; v[i] = Math.sin(c.TAU * f * t + (1.5 + 2.5 * Math.min(1, t / rise)) * Math.sin(c.TAU * f * 3.01 * t + ph)); }
    }
    const lag = j * 0.07 + r() * 0.02;
    for (let i = 0; i < n; i++) {
      const t = i / sr - 0.04 - lag;
      if (t < 0) continue;
      let e = t < rise ? t / rise : 1;
      e = e * e * (3 - 2 * e);
      if (i / sr > end) e *= Math.exp(-(i / sr - end) / relTau);
      body[i] += v[i] * e * (j === 3 ? 0.3 : 0.5);
    }
  });
  c.filter(body, c.biquad("lp", fut ? 6500 : 1800, 0.7, sr));
  c.mix(out, body, 0, 0.7, sr);
  if (p.whine > 0) {
    const w = new Float32Array(n), f0 = root * 9, ph = r() * 6, fl = 70 + r() * 40; let ph2 = 0;
    for (let i = 0; i < n; i++) {
      const t = i / sr, u = Math.min(1, t / (rise + hold));
      const f = f0 * (0.6 + 0.6 * u * (2 - u)) * (1 + 0.01 * Math.sin(c.TAU * 31 * t + ph));
      ph2 += c.TAU * f / sr;
      const flutter = 0.7 + 0.3 * Math.sin(c.TAU * fl * t);
      let e = Math.pow(Math.min(1, t / (rise * 0.9)), 1.3);
      if (t > end) e *= Math.exp(-(t - end) / (p.tail ? 0.2 : 0.05));
      w[i] = (Math.sin(ph2) + 0.4 * Math.sin(2 * ph2 + 0.5) + 0.2 * Math.sin(3 * ph2)) * e * flutter;
    }
    c.filter(w, c.biquad("hp", 1500, 0.7, sr));
    c.mix(out, w, 0.04, 0.08 + 0.5 * p.whine, sr);
  }
  c.mix(out, c.burst(r, 0.012, "bp", 2400, 2, 0.0005, 0.003, sr), 0.01, 0.3, sr);
  c.mix(out, c.ring([[root * 0.5, 1], [root * 1.5, 0.3]], 0.15, 0.03, sr), 0.01, 0.35, sr);
  if (p.tail) {
    const sh = new Float32Array(n);
    for (let k = 0; k < 6; k++) {
      const f = root * 4 * ratios[k % 4] * (1 + r() * 0.01), at = end - 0.1 + k * 0.08;
      c.mix(sh, c.ring([[f, 1], [f * 2.76, 0.25]], 0.8, 0.3, sr), at, 0.08, sr);
    }
    c.mix(out, sh, 0, 1, sr);
  }
  c.fade(c.finish(out, 0.85, 1.1), 12, sr);
  return { samples: out };
}
