// Retro explosion: an NES-style noise channel pop. A 15-bit LFSR whose clock falls over the decay (the pitch drop), stepped 4-bit volume at 240 Hz frames, a quantized triangle-channel thump for punch, seeded debris re-pops that track the falling clock, and an optional low roar tail.
export const meta = {
  title: "Pixel Blast", kind: "impact", format: "sound", duration: 0.5, price: 2, author: "quietmachine", payout: "quietmachine@creators.oasis.example", kit: "Retro Arcade", description: "A short 8-bit noise-channel explosion pop whose size, noise colour, punch, pitch drop and rumble tail are knobs, for enemy kills, bombs and breakable blocks in retro games.",
  tags: ["explosion", "8-bit", "chiptune", "arcade", "retro", "noise", "pop", "game"],
};
export const params = { knobs: {
  size: { type: "choice", label: "Size", default: "small", options: ["tiny", "small", "medium"] },
  color: { type: "range", label: "Noise colour", default: 0.5, min: 0, max: 1, step: 0.01 },
  punch: { type: "range", label: "Punch", default: 0.6, min: 0, max: 1, step: 0.01 },
  drop: { type: "range", label: "Pitch drop", default: 0.5, min: 0, max: 1, step: 0.01 },
  rumble: { type: "toggle", label: "Rumble tail", default: false },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, si = params.knobs.size.options.indexOf(p.size), r = c.rng(p.seed * 6151 + si * 97 + 3);
  const S = [{ dec: 0.045, rate: 9000, th: 190, pops: 1 }, { dec: 0.09, rate: 5000, th: 125, pops: 2 }, { dec: 0.17, rate: 2800, th: 80, pops: 4 }][si];
  const dec = S.dec * (0.88 + 0.24 * r()), rate0 = S.rate * Math.pow(2, (p.color - 0.5) * 3) * (0.94 + 0.12 * r());
  const oct = 0.4 + 3.6 * p.drop, punch = p.punch, tdec = dec * 1.6 + 0.07, sweep = dec * 4;
  const rateAt = (t) => rate0 * Math.pow(2, -oct * Math.min(1, t / sweep));
  const mainEnd = 0.002 + dec * 5.5, rumEnd = p.rumble ? dec * 0.4 + tdec * 4.5 : 0;
  const pops = [];
  for (let k = 0; k < S.pops + Math.floor(r() * 2); k++) pops.push({ t: dec * (0.5 + r() * 2.5), d: 0.01 + r() * 0.012, f: 1.2 + r() * 0.8, a: 0.2 + 0.3 * r() });
  const popEnd = pops.reduce((m, q) => Math.max(m, q.t + q.d * 6), 0);
  const n = c.seconds(Math.max(mainEnd, rumEnd, popEnd) + 0.03, sr), out = new Float32Array(n), fr = Math.max(1, Math.round(sr / 240));
  const slew = 1 - Math.exp(-1 / (0.0015 * sr));
  const chan = (buf, start, len, rate, oc, sw, d, att, pk, amp) => {
    let s = 1 + Math.floor(r() * 32766), ph = 0, q = 0, v = 0;
    const m = Math.pow(2, -oc / (sw * sr)), swN = sw * sr, attN = Math.max(1, att * sr);
    for (let i = 0; i < len; i++) {
      const j = start + i; if (j >= buf.length) break;
      if (i % fr === 0) { const t = i / sr; q = Math.round(Math.exp(-t / d) * (1 + pk * 2 * Math.exp(-t / 0.012)) / (1 + pk * 2) * 15) / 15; }
      v += (q - v) * slew;
      ph += rate / sr;
      while (ph >= 1) { ph -= 1; const b = (s ^ (s >> 1)) & 1; s = (s >> 1) | (b << 14); }
      if (i < swN) rate *= m;
      buf[j] += amp * v * Math.min(1, i / attN) * ((s & 1) ? 1 : -1);
    }
  };
  chan(out, 0, c.seconds(mainEnd, sr), rate0, oct, sweep, dec, 0.001, punch, 1);
  for (const q of pops) chan(out, c.seconds(q.t, sr), c.seconds(q.d * 6, sr), rateAt(q.t) * q.f, 0.8, 0.03, q.d, 0.0008, 0, q.a * (0.6 + 0.4 * si / 2));
  const tn = c.seconds(0.04 + 0.03 * si, sr), th = S.th * (0.95 + 0.1 * r());
  const tri = c.osc("tri", (t) => th * (2 - 1.5 * Math.min(1, t / 0.06)), tn, sr), te = c.env(tn, 0.0015, 0.018 + 0.01 * si, sr);
  for (let i = 0; i < tn; i++) tri[i] = Math.round(tri[i] * 7.5) / 7.5 * te[i];
  c.mix(out, tri, 0, 0.15 + 0.85 * punch, sr);
  if (p.rumble) {
    const rb = new Float32Array(n), rs = Math.max(400, rate0 * (0.22 + 0.06 * r()));
    chan(rb, c.seconds(dec * 0.4, sr), c.seconds(tdec * 4.5, sr), rs, 0.8 + oct * 0.3, tdec * 3, tdec, 0.025, 0, 0.7);
    c.filter(rb, c.biquad("lp", 380 + 300 * p.color, 0.8, sr));
    c.filter(rb, c.biquad("lp", 520 + 300 * p.color, 0.7, sr));
    c.mix(out, rb, 0, 1.4, sr);
  }
  c.filter(out, c.biquad("lp", Math.min(sr * 0.45, 1500 + 11000 * p.color * p.color), 0.7, sr));
  c.filter(out, c.biquad("hp", 35, 0.7, sr));
  c.fade(c.finish(out, 0.9, 1.3), 6, sr);
  return { samples: out };
}
