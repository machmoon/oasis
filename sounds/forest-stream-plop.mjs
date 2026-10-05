// Stream plop: a pebble, stone or fish breaking a forest stream's surface. Layers are a wet contact slap, a rising Minnaert cavity tone, a bottom knock or deep thump set by depth, droplet re-entry grains, and a decaying stream of tiny rising bubbles.
export const meta = {
  title: "Stream Plop", kind: "sfx", format: "sound", duration: 0.7, price: 2, author: "stormfront", payout: "stormfront@creators.oasis.example", kit: "Forest at Night", description: "A small object or fish breaking the surface of a night stream, with knobs for size, splash, water depth, bubble tail and pitch; useful for riverbank foley, fishing and stones skipped in the dark.",
  tags: ["water", "plop", "splash", "stream", "pebble", "fish", "bubbles", "forest"],
};
export const params = { knobs: {
  size: { type: "choice", label: "Object", default: "pebble", options: ["pebble", "stone", "fish"] },
  splash: { type: "range", label: "Splash", default: 0.5, min: 0, max: 1, step: 0.01 },
  depth: { type: "range", label: "Water depth", default: 0.5, min: 0, max: 1, step: 0.01 },
  bubbles: { type: "range", label: "Bubble tail", default: 0.4, min: 0, max: 1, step: 0.01 },
  pitch: { type: "range", label: "Pitch", default: 1, min: 0.5, max: 2, step: 0.01 },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, si = params.knobs.size.options.indexOf(p.size), r = c.rng(p.seed * 4421 + si * 97 + 3);
  const S = [
    { f: 900, d: 0.03, rise: 1.6, drops: 24, slap: 0.45, body: 0.2 },
    { f: 360, d: 0.06, rise: 1.0, drops: 60, slap: 0.8, body: 1 },
    { f: 620, d: 0.035, rise: 1.3, drops: 80, slap: 1, body: 0.4 },
  ][si];
  const pm = p.pitch, dp = p.depth, sp = p.splash, n = c.seconds(1.3, sr);
  let out = new Float32Array(n);
  const plop = (f, decay, rise, at, amp) => {
    const m = c.seconds(decay * 7 + 0.004, sr), x = new Float32Array(m), k = Math.exp(-1 / (decay * sr)), a = Math.max(1, c.seconds(0.0012, sr));
    let g = 1, ph = 0;
    for (let i = 0; i < m; i++) {
      const t = i / sr, fr = f * (1 + rise * Math.min(1, t / (decay * 3)));
      ph += c.TAU * fr / sr; x[i] = Math.sin(ph) * g * Math.min(1, i / a); g *= k;
    }
    c.mix(out, x, at, amp, sr);
  };
  const slap = (at, g) => {
    c.mix(out, c.burst(r, 0.02, "bp", (1800 + 1400 * sp) * pm * (0.9 + 0.2 * r()), 0.8, 0.0005, 0.004 + 0.004 * S.body, sr), at, g * (0.35 + 0.65 * sp), sr);
    c.mix(out, c.burst(r, 0.03, "lp", 700 * pm, 0.9, 0.001, 0.008, sr), at, g * 0.5 * S.body, sr);
  };
  const cav = S.f * pm * (1.3 - 0.55 * dp) * (0.93 + 0.14 * r()), cd = S.d * (0.7 + 0.8 * dp);
  let last = 0;
  if (p.size === "fish") {
    const hits = 2 + Math.floor(r() * 2); let t = 0;
    for (let h = 0; h < hits; h++) {
      slap(t, S.slap * (1 - 0.25 * h));
      plop(cav * (1 + 0.15 * h) * (0.95 + 0.1 * r()), cd * (1 - 0.2 * h), S.rise, t + 0.006 + 0.006 * r(), (0.5 - 0.1 * h) * (0.5 + 0.5 * dp));
      last = t; t += 0.07 + r() * 0.08;
    }
    const m = c.seconds(0.2, sr), w = c.noise(r, m), bp = c.biquad("bp", 1300 * pm, 1.4, sr), rate = 18 + r() * 8;
    for (let i = 0; i < m; i++) { const u = i / m; w[i] = bp(w[i]) * (0.5 + 0.5 * Math.sin(c.TAU * rate * i / sr)) * Math.sin(Math.PI * u); }
    c.mix(out, w, 0.02, 0.35 * (0.4 + 0.6 * sp), sr);
  } else {
    slap(0, S.slap);
    plop(cav, cd, S.rise, 0.008 + 0.01 * r() * S.body, 0.75 * (0.5 + 0.5 * dp));
  }
  c.mix(out, c.ring([[1100 * pm * (0.9 + 0.2 * r()), 1], [2600 * pm, 0.4]], 0.05, 0.006, sr), 0.02 + 0.04 * dp, 0.5 * (1 - dp) * (0.4 + 0.6 * S.body), sr);
  c.mix(out, c.burst(r, 0.18, "lp", 160 * pm, 0.8, 0.003, 0.05, sr), 0.004, 0.7 * dp * S.body, sr);
  const span = 0.15 + 0.2 * sp, drops = Math.round(S.drops * (0.1 + sp));
  for (let d = 0; d < drops; d++) {
    const t = 0.012 + last + Math.pow(r(), 1.5) * span;
    c.mix(out, c.burst(r, 0.006, "bp", (2200 + r() * 4800) * pm, 3, 0.0003, 0.0012 + r() * 0.002, sr), t, (0.08 + 0.2 * r()) * (0.3 + 0.7 * sp), sr);
    if (r() < 0.25) plop((1500 + r() * 2200) * pm, 0.005 + r() * 0.005, 0.8, t + 0.002, (0.05 + 0.1 * r()) * sp);
  }
  const bub = Math.round(p.bubbles * (6 + 16 * dp) * (0.7 + 0.3 * S.body));
  const tail = 0.12 + 0.4 * p.bubbles * (0.6 + 0.4 * dp);
  for (let b = 0; b < bub; b++) {
    const u = Math.pow(r(), 1.7), t = 0.03 + last + u * tail;
    plop((1100 + r() * 2000 + 900 * u) * pm * (1.1 - 0.3 * dp), 0.007 + r() * 0.012 * (1 - 0.5 * u), 0.5 + r() * 0.8, t, (0.07 + 0.16 * r()) * (1 - 0.6 * u));
  }
  c.finish(out, 0.9);
  let end = n;
  while (end > 1 && Math.abs(out[end - 1]) < 0.006) end--;
  end = Math.min(n, end + c.seconds(0.03, sr));
  out = out.slice(0, Math.max(end, c.seconds(0.15, sr)));
  const len = out.length, fl = c.seconds(0.025, sr);
  for (let i = 0; i < fl && i < len; i++) out[len - 1 - i] *= i / fl;
  return { samples: out };
}
