// Owl wingbeat: near-silent flaps passing overhead. Each flap is a fringed-feather whoosh (low-passed noise, downstroke then a weaker upstroke) over a soft rounded air-pressure pulse and faint feather-rustle grains; a pass envelope swells level and brightness toward the overhead moment and darkens as the owl recedes, with a light forest air tail.
export const meta = {
  title: "Owl Wingbeat", kind: "foley", format: "sound", duration: 1.6, price: 2, author: "stormfront", payout: "stormfront@creators.oasis.example", kit: "Forest at Night", description: "Near-silent owl wing flaps sweeping overhead and away; wingspan, flap count, softness, pass depth and proximity are knobs, and every seed is a different flight.",
  tags: ["owl", "wings", "flap", "flyby", "bird", "night", "forest", "whoosh"],
};
export const params = { knobs: {
  wingspan: { type: "choice", label: "Wingspan", default: "large", options: ["small", "large"] },
  flaps: { type: "range", label: "Flap count", default: 4, min: 2, max: 8, step: 1 },
  softness: { type: "range", label: "Softness", default: 0.6, min: 0, max: 1, step: 0.01 },
  sweep: { type: "range", label: "Pan sweep", default: 0.6, min: 0, max: 1, step: 0.01 },
  proximity: { type: "range", label: "Proximity", default: 0.6, min: 0, max: 1, step: 0.01 },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const big = p.wingspan === "large", sr = c.sr, r = c.rng(p.seed * 613 + (big ? 71 : 3));
  const soft = p.softness, prox = p.proximity, depth = 0.15 + 0.85 * p.sweep, F = Math.round(p.flaps);
  const iv = big ? 0.34 : 0.22, times = [];
  let t = 0.01;
  for (let k = 0; k < F; k++) { times.push(t); t += iv * (0.88 + 0.24 * r()); }
  const span = t, n = c.seconds(span + 0.45, sr);
  let out = new Float32Array(n);
  const tc = span * (0.42 + 0.14 * r()), w = span * 0.3 + 0.08;
  const base = (big ? 900 : 1400) * (1 - 0.5 * soft) * (0.45 + 0.55 * prox);
  const stroke = (len, fc, hpf) => {
    const m = c.seconds(len, sr), x = c.noise(r, m), a = c.onepole(sr), b = c.onepole(sr), h = c.onepole(sr);
    const skew = 0.5 + 0.2 * r(), flut = 18 + 14 * r(), fl = 0.3 * (1 - soft);
    for (let i = 0; i < m; i++) {
      const u = i / m, s = Math.sin(Math.PI * Math.pow(u, skew)), e = s * s, f = fc * (0.5 + 0.7 * e);
      const y = b(a(x[i], f), f * 1.3);
      x[i] = (y - h(y, hpf)) * e * (1 - fl * (0.5 + 0.5 * Math.sin(c.TAU * flut * u)));
    }
    return x;
  };
  const pulse = (f, dec, att) => {
    const m = c.seconds(dec * 6, sr), x = new Float32Array(m), A = Math.max(1, att * sr), k = Math.exp(-1 / (dec * sr));
    let ph = 0, g = 1;
    for (let i = 0; i < m; i++) {
      const e = (i < A ? 0.5 - 0.5 * Math.cos(Math.PI * i / A) : 1) * g; g *= k;
      ph += c.TAU * f * (1 - 0.18 * i / m) / sr;
      x[i] = (Math.sin(ph) + 0.2 * Math.sin(2.1 * ph)) * e;
    }
    return x;
  };
  for (const t0 of times) {
    const d = (t0 - tc) / w, g = Math.exp(-d * d), s = Math.tanh(-d);
    const level = ((1 - depth) + depth * g) * (0.85 + 0.3 * r());
    const fc = base * (1 + depth * (1.2 * g + 0.4 * s)) * (0.93 + 0.14 * r());
    const down = iv * 0.55, hpf = big ? 110 : 190;
    c.mix(out, stroke(down, fc, hpf), t0, level, sr);
    c.mix(out, stroke(iv * 0.36, fc * 0.75, hpf), t0 + down * (0.95 + 0.1 * r()), 0.32 * level, sr);
    const tf = (big ? 70 : 115) * (0.95 + 0.1 * r());
    c.mix(out, pulse(tf, big ? 0.04 : 0.028, 0.012 + 0.008 * soft), t0 + down * (0.3 + 0.1 * r()),
      0.16 * level * (0.25 + 0.75 * prox) * (1 - 0.4 * soft), sr);
    const grains = Math.round(1 + (1 - soft) * 6);
    for (let k = 0; k < grains; k++) {
      c.mix(out, c.burst(r, 0.008 + r() * 0.01, "bp", (2200 + r() * 3000) * (0.6 + 0.4 * prox), 2.5, 0.0015, 0.003, sr),
        t0 + 0.2 * down + r() * 0.7 * down, (0.06 + 0.1 * r()) * level * (0.3 + 0.7 * prox) * (1.1 - soft), sr);
    }
  }
  out = c.reverb(out, { size: 0.5 + 0.3 * (1 - prox), decay: 0.5, mixAmt: 0.05 + 0.18 * (1 - prox) }, sr) || out;
  c.filter(out, c.biquad("lp", 2500 + 6000 * prox * (1 - 0.5 * soft), 0.7, sr));
  c.finish(out, 0.85);
  c.gain(out, 0.6 + 0.35 * prox);
  c.fade(out, 20, sr);
  return { samples: out };
}
