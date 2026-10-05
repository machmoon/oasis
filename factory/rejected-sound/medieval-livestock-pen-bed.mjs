// Livestock pen: a faint barn-air floor under clearly separate events: formant-filtered bleats, meh calls or grunts and squeals by species, nasal snorts, hoof-shuffle groups and straw crackle clusters; events wrap round the loop point (crossfade on) or are cut with the buffer (off).
export const meta = {
  title: "Livestock Pen Bed", kind: "ambience", format: "sound", duration: 3, price: 4, author: "stormfront", payout: "stormfront@creators.oasis.example", kit: "Medieval Market", description: "A loopable livestock pen: sheep, pigs or goats call, snort and shuffle in straw; herd size, restlessness and straw rustle are knobs for medieval market and farm scenes.",
  tags: ["livestock", "farm", "sheep", "pigs", "goats", "straw", "ambience", "medieval"],
};
export const params = { knobs: {
  animals: { type: "choice", label: "Animal mix", default: "sheep", options: ["sheep", "pigs", "goats"] },
  herd: { type: "range", label: "Herd size", default: 0.5, min: 0, max: 1, step: 0.01 },
  restless: { type: "range", label: "Restlessness", default: 0.5, min: 0, max: 1, step: 0.01 },
  straw: { type: "range", label: "Straw rustle", default: 0.5, min: 0, max: 1, step: 0.01 },
  crossfade: { type: "toggle", label: "Loop crossfade", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + params.knobs.animals.options.indexOf(p.animals) * 97 + 3), dur = 3;
  const n = c.seconds(dur, sr), out = new Float32Array(n), wrap = p.crossfade, A = p.animals;
  const put = (src, t, g) => {
    const o = Math.floor((((t % dur) + dur) % dur) * sr);
    for (let i = 0; i < src.length; i++) { const k = o + i; if (wrap) out[k % n] += src[i] * g; else if (k < n) out[k] += src[i] * g; }
  };
  const slot = (k, N) => ((k + 0.15 + 0.7 * r()) / N) * dur;
  const voice = (f0, len, o) => {
    const m = c.seconds(len, sr), x = new Float32Array(m);
    const b1 = c.biquad("bp", o.f[0], o.q, sr), b2 = c.biquad("bp", o.f[1], o.q, sr), b3 = c.biquad("bp", o.f[2], o.q, sr);
    let ph = 0, jit = 1, pk = 1e-6;
    for (let i = 0; i < m; i++) {
      const t = i / sr, u = t / len;
      if (i % 48 === 0) jit = 1 + (r() - 0.5) * o.jit;
      ph += f0 * jit * (1 + o.glide * (u - 0.3)) * (1 + o.vib * Math.sin(c.TAU * 6 * t)) / sr;
      const f = ph % 1, s = o.pulse ? Math.max(0, 1 - f * 5) * 2 - 0.3 : f * 2 - 1;
      const am = 1 - o.trem * (0.5 + 0.5 * Math.sin(c.TAU * o.tr * t));
      const v = (s * (1 - o.rough) + (r() * 2 - 1) * o.rough) * am;
      const e = Math.min(1, t / o.att) * Math.min(1, (len - t) / (len * 0.4));
      x[i] = (b1(v) + 0.8 * b2(v) + 0.5 * b3(v)) * e * e; pk = Math.max(pk, Math.abs(x[i]));
    }
    for (let i = 0; i < m; i++) x[i] /= pk;
    return x;
  };
  const calls = Math.max(3, Math.round((3 + 6 * p.herd) * (0.7 + 0.6 * p.restless)));
  for (let k = 0; k < calls; k++) {
    const t = slot(k, calls), j = 0.85 + r() * (0.2 + 0.3 * p.herd), g = 0.6 + 0.4 * r();
    if (A === "sheep") put(voice(330 * j, 0.55 + r() * 0.4, { att: 0.05, f: [800 * j, 1500, 2700], q: 8, jit: 0.08, glide: -0.25, vib: 0.03, pulse: 0, trem: 0.6, tr: 24 + r() * 6, rough: 0.08 }), t, g);
    else if (A === "goats") put(voice(480 * j, 0.25 + r() * 0.25, { att: 0.015, f: [1100, 2300 * j, 3600], q: 7, jit: 0.35, glide: r() < 0.5 ? 0.3 : -0.45, vib: 0.05, pulse: 0, trem: 0.4, tr: 38, rough: 0.25 }), t, g);
    else if (r() < 0.7) { const reps = 1 + Math.floor(r() * 3); for (let h = 0; h < reps; h++) put(voice(90 * j * (1 - 0.08 * h), 0.13 + r() * 0.1, { att: 0.012, f: [380, 1000, 1700], q: 4, jit: 0.35, glide: -0.3, vib: 0.01, pulse: 1, trem: 0, tr: 1, rough: 0.2 }), t + h * 0.2, g); }
    else put(voice(800 * j, 0.35 + r() * 0.25, { att: 0.04, f: [1800, 3200, 4800], q: 9, jit: 0.05, glide: 0.7, vib: 0.02, pulse: 0, trem: 0.1, tr: 18, rough: 0.05 }), t, g * 0.7);
  }
  const pig = A === "pigs", snorts = Math.round((2 + 4 * p.herd + 3 * p.restless) * (pig ? 1.5 : 1));
  for (let k = 0; k < snorts; k++) {
    const t = slot(k, snorts), f = (pig ? 600 : 1000) + r() * 1200, g = 0.5 + 0.4 * r();
    put(c.burst(r, pig ? 0.18 : 0.12, "bp", f, 1.6, 0.006, 0.05, sr), t, g);
    put(c.burst(r, 0.05, "lp", 500, 0.8, 0.004, 0.02, sr), t, g * 0.5);
    if (r() < 0.6) put(c.burst(r, 0.09, "bp", f * 1.15, 1.6, 0.006, 0.03, sr), t + 0.14 + r() * 0.06, g * 0.7);
  }
  const groups = Math.round(3 + 6 * p.restless + 2 * p.herd);
  for (let k = 0; k < groups; k++) {
    const t0 = slot(k, groups), nn = 2 + Math.floor(r() * 3);
    for (let s = 0; s < nn; s++) {
      const t = t0 + s * (0.1 + r() * 0.12), w = 0.4 + 0.6 * r();
      put(c.ring([[100 + r() * 60, 1], [220 + r() * 80, 0.4]], 0.1, 0.025, sr), t, 0.5 * w);
      put(c.burst(r, 0.05, "bp", 1300 + r() * 700, 1, 0.002, 0.016, sr), t, 0.35 * w);
      if (A === "goats") put(c.burst(r, 0.012, "bp", 2800 + r() * 800, 3, 0.0004, 0.004, sr), t, 0.4 * w);
    }
  }
  const clusters = Math.round(6 + 10 * p.straw);
  for (let k = 0; k < clusters; k++) {
    const t0 = slot(k, clusters), gn = 5 + Math.floor(r() * 8), sp = 0.05 + r() * 0.12;
    for (let s = 0; s < gn; s++) put(c.burst(r, 0.005 + r() * 0.008, "bp", 3500 + r() * 4500, 2.5, 0.0003, 0.001 + r() * 0.003, sr), t0 + r() * sp, (0.12 + 0.3 * r()) * (0.2 + 1.2 * p.straw));
  }
  const air = c.pink(r, n), lpa = c.biquad("lp", 1500, 0.7, sr), ph0 = r() * 6;
  for (let i = 0; i < n; i++) out[i] += lpa(air[i]) * 0.12 * (0.8 + 0.2 * Math.sin(c.TAU * i / n * 3 + ph0));
  c.filter(out, c.biquad("lp", 9000, 0.7, sr));
  c.finish(out, 0.9, 1.1);
  c.gain(out, 0.62 + 0.38 * (0.5 * p.herd + 0.5 * p.restless));
  c.fade(out, 10, sr);
  return { samples: out };
}
