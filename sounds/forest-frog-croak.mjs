// Frog croak: a streamside call (peeper whistle, green-frog twang, bullfrog jug-o-rum) built as a glottal source pulsed at a
// throat rate through vocal-sac formants, a mouth click and breath layer, wet bubbles and lapping at the bank, and a night-air tail.
export const meta = {
  title: "Streamside Croak", kind: "sfx", format: "sound", duration: 1.2, price: 2, author: "stormfront", payout: "stormfront@creators.oasis.example", kit: "Forest at Night", description: "A frog calling from the water's edge: species size, pitch, call repeats, throaty rasp and wet bubbling are knobs, and every seed is a different frog's take.",
  tags: ["frog", "croak", "bullfrog", "peeper", "night", "stream", "forest", "wildlife"],
};
export const params = { knobs: {
  size: { type: "choice", label: "Frog size", default: "green", options: ["peeper", "green", "bullfrog"] },
  pitch: { type: "range", label: "Pitch", default: 0.5, min: 0, max: 1, step: 0.01 },
  repeats: { type: "range", label: "Croak repeats", default: 2, min: 1, max: 4, step: 1 },
  throatiness: { type: "range", label: "Throatiness", default: 0.5, min: 0, max: 1, step: 0.01 },
  wetness: { type: "range", label: "Wetness", default: 0.4, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Night-air tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const si = params.knobs.size.options.indexOf(p.size), sr = c.sr, r = c.rng(p.seed * 6151 + si * 97 + 3);
  const S = [
    { lo: 2500, hi: 3500, len: 0.13, gap: 0.22, k: 0.5, sweep: 0.12, form: [0, 0], pr: 42, saw: 0.12, click: 0.05 },
    { lo: 120, hi: 260, len: 0.13, gap: 0.3, k: 1.4, sweep: -0.12, form: [560, 1450], pr: 70, saw: 0.6, click: 0.12 },
    { lo: 68, hi: 140, len: 0.42, gap: 0.28, k: 0.7, sweep: -0.08, form: [320, 950], pr: 26, saw: 0.75, click: 0.08 },
  ][si];
  const th = p.throatiness, wet = p.wetness, reps = Math.round(p.repeats);
  const base = S.lo * Math.pow(S.hi / S.lo, p.pitch);
  const calls = []; let t = 0;
  for (let k = 0; k < reps; k++) {
    const len = S.len * (0.85 + 0.3 * r()) * (1 + 0.2 * th);
    calls.push([t, len]); t += len + S.gap * (0.8 + 0.4 * r());
  }
  const last = calls[calls.length - 1], end = last[0] + last[1];
  const out = new Float32Array(c.seconds(end + 0.12 * wet + (p.tail ? 0.55 : 0.06), sr));
  const sawAmt = S.saw * (0.4 + 0.6 * th), fScale = 1 - 0.2 * th;
  for (const [on, len] of calls) {
    const n = c.seconds(len, sr), buf = new Float32Array(n);
    const bp1 = c.biquad("bp", Math.max(200, S.form[0] * fScale * (0.95 + 0.1 * r())), 3 + 4 * th, sr);
    const bp2 = c.biquad("bp", Math.max(400, S.form[1] * fScale * (0.95 + 0.1 * r())), 4, sr);
    const fj = base * (0.97 + 0.06 * r()), apr = S.pr * (0.9 + 0.2 * r()), amPh = r(), vib = 4 + 4 * r();
    const amD = th * (0.5 + 0.25 * r()), atk = 0.004 * sr, rel = 0.008 * sr;
    let ph = 0, ph2 = 0, pk = 0;
    for (let i = 0; i < n; i++) {
      const x = i / n, f = fj * (1 + S.sweep * x) * (1 + 0.01 * Math.sin(c.TAU * vib * i / sr));
      ph += f / sr; if (ph >= 1) ph -= 1;
      ph2 += f / (2 * sr); if (ph2 >= 1) ph2 -= 1;
      const s = (1 - sawAmt) * Math.sin(c.TAU * ph) + sawAmt * (1 - 2 * ph) + 0.35 * th * Math.sin(c.TAU * ph2);
      const am = 1 - amD * (0.5 + 0.5 * Math.sin(c.TAU * (amPh + apr * i / sr)));
      const e = Math.min(1, i / atk) * Math.min(1, (n - i) / rel) * Math.pow(1 - x, S.k);
      const y = si === 0 ? s : bp1(s) * 1.2 + bp2(s) * 0.6 + s * 0.35;
      buf[i] = y * am * e;
      const a = Math.abs(buf[i]); if (a > pk) pk = a;
    }
    if (pk > 0) c.gain(buf, 1 / pk);
    c.mix(out, buf, on, 0.85, sr);
    c.mix(out, c.burst(r, 0.008, "bp", 1200 + 800 * r(), 1, 0.0005, 0.002, sr), on, S.click, sr);
    c.mix(out, c.burst(r, len, "bp", si === 0 ? base : S.form[0] * fScale, 1.5, 0.004, len * 0.4, sr), on, 0.04 + 0.06 * th, sr);
    if (wet > 0) {
      const nb = Math.round(1 + wet * 4);
      for (let b = 0; b < nb; b++) {
        const d = 0.02 + 0.03 * r(), f0 = 300 + 600 * r(), m = c.seconds(d, sr);
        const bub = c.multiply(c.osc("sine", (tt) => f0 * (1 + 1.5 * tt / d), m, sr), c.env(m, 0.001, d * 0.3, sr));
        c.mix(out, bub, on + 0.02 + (len + 0.08) * r(), 0.16 * wet * (0.5 + 0.5 * r()), sr);
      }
      c.mix(out, c.burst(r, 0.06, "bp", 1500 + 700 * r(), 1.2, 0.003, 0.03, sr), on + len * (0.4 + 0.3 * r()), 0.1 * wet, sr);
    }
  }
  if (wet > 0) {
    const m = out.length, bed = c.pink(r, m), bp = c.biquad("bp", 1100, 0.7, sr), fe = 0.05 * sr;
    for (let i = 0; i < m; i++) bed[i] = bp(bed[i]) * Math.min(1, i / fe, (m - i) / fe);
    c.mix(out, bed, 0, 0.04 * wet, sr);
  }
  let res = out;
  if (p.tail) { const v = c.reverb(out, { size: 0.6, decay: 0.5, mixAmt: 0.14 + 0.06 * wet }, sr); if (v instanceof Float32Array) res = v; }
  let pk = 0;
  for (let i = 0; i < res.length; i++) { const a = Math.abs(res[i]); if (a > pk) pk = a; }
  if (pk > 0) c.gain(res, 0.9 / pk);
  c.finish(res, 0.9, 1.1);
  c.fade(res, p.tail ? 40 : 25, sr);
  return { samples: res };
}
