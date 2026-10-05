// Firefly select chime: two soft-attacked inharmonic notes (glass, bell or wood modes) with a gliding glow sine, a contact tick, high twinkling firefly pings and an optional shimmer and reverb tail.
export const meta = {
  title: "Firefly Chime", kind: "ui", format: "sound", duration: 0.8, price: 1, author: "quietmachine", payout: "quietmachine@creators.oasis.example", kit: "Forest at Night", description: "A soft, glowing two-note chime for menu select. Timbre, pitch, sparkle, brightness and a tail are knobs, and every seed is a slightly different firefly.",
  tags: ["ui", "chime", "menu", "select", "firefly", "glow", "forest", "night"],
};
export const params = { knobs: {
  timbre: { type: "choice", label: "Timbre", default: "glass", options: ["glass", "bell", "wood"] },
  pitch: { type: "range", label: "Pitch", default: 0.5, min: 0, max: 1, step: 0.01 },
  sparkle: { type: "range", label: "Sparkle", default: 0.5, min: 0, max: 1, step: 0.01 },
  brightness: { type: "range", label: "Brightness", default: 0.5, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, ti = params.knobs.timbre.options.indexOf(p.timbre), r = c.rng(p.seed * 613 + ti * 97 + 11);
  const T = {
    glass: { modes: [[1, 1, 1], [2.76, 0.45, 0.6], [5.4, 0.25, 0.4], [8.93, 0.12, 0.3]], att: 0.003, dec: [0.08, 0.15], click: 0.25, glow: 0.3 },
    bell: { modes: [[0.5, 0.3, 1.2], [1, 1, 1], [1.004, 0.6, 1], [1.19, 0.4, 0.8], [1.5, 0.3, 0.7], [2, 0.35, 0.6], [2.74, 0.2, 0.4]], att: 0.0015, dec: [0.1, 0.18], click: 0.4, glow: 0.18 },
    wood: { modes: [[1, 1, 1], [3.93, 0.4, 0.5], [9.2, 0.15, 0.3]], att: 0.0006, dec: [0.035, 0.05], click: 0.8, glow: 0.12 },
  };
  const tb = T[p.timbre], b = p.brightness, s = p.sparkle, ny = 0.45 * sr;
  const base = 520 * Math.pow(2, p.pitch * 1.6) * (p.timbre === "wood" ? 0.7 : 1) * (0.99 + r() * 0.02);
  const decay = tb.dec[p.tail ? 1 : 0], gap = 0.05 + r() * 0.03, iv = [1.5, 1.335, 1.99][Math.floor(r() * 3)];
  const total = c.clamp(gap + 5 * decay + (p.tail ? 0.35 : 0.08), 0.3, 1.4);
  let out = new Float32Array(c.seconds(total, sr));
  const note = (f0, at, amp) => {
    const start = c.seconds(at, sr), A = Math.max(1, tb.att * sr);
    for (const [ratio, a0, ds] of tb.modes) {
      const f = f0 * ratio * (0.996 + r() * 0.008);
      if (f > ny) continue;
      const a = a0 * amp * Math.pow(ratio, (b - 0.5) * 0.9), k = Math.exp(-1 / (decay * ds * sr)), w = c.TAU * f / sr;
      let d = 1;
      for (let i = 0; start + i < out.length && d > 1e-4; i++) {
        const x = i / A, e = i < A ? x * x * (3 - 2 * x) : 1;
        out[start + i] += a * e * d * Math.sin(w * i); d *= k;
      }
    }
    const tau = 0.05 + decay * 0.5, kg = Math.exp(-1 / (tau * sr)), GA = 0.015 * sr, gl = 0.04 * sr, trem = 5 + r() * 3;
    let ph = 0, d = 1;
    for (let i = 0; start + i < out.length && d > 1e-4; i++) {
      ph += c.TAU * f0 * (0.985 + 0.015 * Math.min(1, i / gl)) / sr;
      const e = i < GA ? (i / GA) * (i / GA) : 1;
      out[start + i] += tb.glow * amp * e * d * (0.85 + 0.15 * Math.sin(c.TAU * trem * i / sr)) * Math.sin(ph); d *= kg;
    }
    c.mix(out, c.burst(r, 0.01, "hp", 2500 + 6000 * b, 0.8, 0.0004, p.timbre === "wood" ? 0.004 : 0.0015, sr), at, tb.click * (0.15 + 0.5 * b) * amp, sr);
  };
  note(base, 0, 1);
  note(base * iv, gap, 0.8);
  const groups = Math.round(1 + 6 * s * (p.tail ? 1.3 : 1)), span = Math.max(0.1, total * 0.55);
  for (let g = 0; g < groups && s > 0.02; g++) {
    let t = gap * 0.5 + Math.pow(r(), 1.4) * span, f = Math.min(ny * 0.7, base * c.between(r, 3, 6) * (0.7 + 0.5 * b));
    const pings = 2 + Math.floor(r() * 4);
    for (let k = 0; k < pings; k++) {
      const modes = f * 2.01 < ny ? [[f, 1], [f * 2.01, 0.3 * b]] : [[f, 1]];
      c.mix(out, c.ring(modes, 0.06, 0.006 + r() * 0.014, sr), t, (0.07 + 0.1 * r()) * (0.4 + s), sr);
      t += 0.015 + r() * 0.035; f = Math.min(ny * 0.8, f * (1.03 + r() * 0.12));
    }
  }
  if (p.tail) {
    const n = c.seconds(total * 0.8, sr), x = c.noise(r, n), e = c.env(n, 0.04, 0.2, sr);
    const bp = c.biquad("bp", Math.min(base * 4, ny * 0.8), 6, sr);
    for (let i = 0; i < n; i++) x[i] = bp(x[i]) * e[i];
    c.mix(out, x, 0.02, 0.45 * (0.3 + s), sr);
    const rv = c.reverb(out, { size: 0.5, decay: 0.45, mixAmt: 0.3 }, sr);
    if (rv) out = rv;
  }
  c.filter(out, c.biquad("lp", Math.min(ny, 2200 + 12000 * b), 0.7, sr));
  const fl = Math.floor(out.length * 0.2);
  for (let i = 0; i < fl; i++) out[out.length - 1 - i] *= 0.5 - 0.5 * Math.cos(Math.PI * i / fl);
  c.finish(out, 0.85);
  c.fade(out, 3, sr);
  return { samples: out };
}
