// Fiddle sting: a seeded tavern flourish of bowed notes. Saw Helmholtz motion with scooped attacks, delayed vibrato, bow scratch and hiss runs through a violin body; grace notes and a trill are ornaments, a low wooden room is the tail.
export const meta = {
  title: "Tavern Fiddle Flourish", kind: "music-loop", format: "sound", duration: 2, price: 4, author: "kickdrum", payout: "kickdrum@creators.oasis.example", kit: "Wooden Tavern", description: "A short bowed fiddle flourish for walking into a tavern: a cheerful run up to the octave or a wistful fall home, with grace notes, a closing trill and a low wooden room tail.",
  tags: ["fiddle", "violin", "tavern", "sting", "flourish", "folk", "medieval", "one-shot"],
};
export const params = { knobs: {
  mood: { type: "choice", label: "Mood", default: "cheerful", options: ["cheerful", "wistful"] },
  length: { type: "range", label: "Length", default: 0.5, min: 0, max: 1, step: 0.01 },
  ornament: { type: "range", label: "Ornament density", default: 0.5, min: 0, max: 1, step: 0.01 },
  pitch: { type: "range", label: "Pitch (semitones)", default: 0, min: -7, max: 7, step: 1 },
  tail: { type: "toggle", label: "Room tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, happy = p.mood === "cheerful", r = c.rng(p.seed * 6151 + (happy ? 3 : 97));
  const root = 293.66 * Math.pow(2, p.pitch / 12), scale = happy ? [0, 2, 4, 5, 7, 9, 11] : [0, 2, 3, 5, 7, 8, 10];
  const deg = k => { const o = Math.floor(k / 7), s = ((k % 7) + 7) % 7; return root * Math.pow(2, o + scale[s] / 12); };
  const count = Math.round(4 + 6 * p.length), beat = happy ? 0.11 : 0.19;
  const s0 = happy ? (r() < 0.5 ? -3 : 0) : (r() < 0.5 ? 7 : 4), e0 = happy ? 7 : (r() < 0.6 ? 0 : 2);
  const degs = [];
  for (let k = 0; k < count; k++) degs.push(k === count - 1 ? e0 : k === 0 ? s0 : Math.round(s0 + (e0 - s0) * k / (count - 1) + (r() - 0.5) * 2.2));
  const segs = []; let t = 0.012;
  for (let k = 0; k < count; k++) {
    const last = k === count - 1, d0 = degs[k], lvl = (k % 2 === 0 ? 1 : 0.85) * c.between(r, 0.9, 1);
    let d = last ? 0.45 + 0.55 * p.length + (happy ? 0 : 0.25) : beat * (r() < 0.22 ? 2 : 1) * c.between(r, 0.92, 1.08);
    if (k === 0 && happy && !last) d *= 0.6;
    if (!last && r() < p.ornament * 0.85) {
      const g = 0.03 + 0.015 * r();
      segs.push({ t, d: g, deg: d0 + 1, art: true, lvl, floor: 0.7 });
      segs.push({ t: t + g, d: d - g, deg: d0, art: false, lvl, floor: 0.18 });
    } else if (last && p.ornament > 0.3) {
      const m = 2 * Math.round(1 + p.ornament * 3), tr = 0.048;
      for (let q = 0; q < m; q++) segs.push({ t: t + q * tr, d: tr, deg: q % 2 ? d0 : d0 + 1, art: q === 0, lvl, floor: 0.75 });
      segs.push({ t: t + m * tr, d, deg: d0, art: false, lvl, fin: true, floor: 0 });
      d += m * tr;
    } else segs.push({ t, d, deg: d0, art: true, lvl, fin: last, floor: last ? 0 : 0.18 });
    t += d;
  }
  const n = c.seconds(t + (p.tail ? 0.7 : 0.04), sr), fq = new Float32Array(n), am = new Float32Array(n);
  for (const s of segs) {
    const i0 = c.seconds(s.t, sr), i1 = Math.min(n, c.seconds(s.t + s.d, sr)), f = deg(s.deg);
    const vr = c.TAU * (5.4 + r() * 1.2) / sr, vd = happy ? 0.005 : 0.009, rel = s.fin ? (p.tail ? 0.2 : 0.12) : 0.03;
    for (let i = i0; i < i1; i++) {
      const lt = (i - i0) / sr, left = (i1 - i) / sr;
      const vib = vd * Math.min(1, Math.max(0, (lt - 0.1) / 0.2)) * Math.sin(vr * (i - i0));
      fq[i] = f * (1 + vib - (s.art ? 0.03 * Math.exp(-lt / 0.02) : 0));
      let a = s.art ? Math.min(1, 0.15 + lt / 0.012) * (1 + 0.5 * Math.exp(-lt / 0.03)) : 0.6 + 0.4 * Math.min(1, lt / 0.01);
      if (s.fin) a *= 0.85 + 0.25 * Math.sin(Math.PI * Math.min(1, lt / s.d));
      a *= s.floor + (1 - s.floor) * Math.min(1, left / rel);
      am[i] = a * s.lvl;
    }
  }
  const x = new Float32Array(n), hiss = c.biquad("hp", 1800, 0.7, sr);
  const kf = 1 - Math.exp(-1 / (0.003 * sr)), ka = 1 - Math.exp(-1 / (0.0015 * sr)), kj = 1 - Math.exp(-1 / (0.02 * sr));
  let ph = 0, sf = fq[0] || deg(s0), sa = 0, j = 1, jt = 1;
  for (let i = 0; i < n; i++) {
    sf += ((fq[i] || sf) - sf) * kf; sa += (am[i] - sa) * ka;
    if (i % 64 === 0) jt = 1 + 0.08 * (r() - 0.5); j += (jt - j) * kj;
    ph += sf / sr; if (ph >= 1) ph -= 1;
    x[i] = sa * j * ((2 * ph - 1) * 0.8 + hiss(r() * 2 - 1) * (ph < 0.5 ? 0.14 : 0.07));
  }
  for (const s of segs) if (s.art) c.mix(x, c.burst(r, 0.018, "bp", 2600 + 1600 * r(), 1.2, 0.0008, 0.006, sr), s.t, 0.12 * s.lvl, sr);
  const b1 = c.biquad("bp", 290, 2.5, sr), b2 = c.biquad("bp", 500, 3, sr), b3 = c.biquad("bp", 1150, 2, sr), b4 = c.biquad("bp", 2900, 1.4, sr);
  const lp = c.biquad("lp", happy ? 7500 : 5500, 0.7, sr), hp = c.biquad("hp", 180, 0.7, sr);
  let out = new Float32Array(n);
  for (let i = 0; i < n; i++) { const v = x[i]; out[i] = lp(hp(0.9 * b1(v) + 0.7 * b2(v) + 0.5 * b3(v) + 0.9 * b4(v) + 0.25 * v)); }
  if (p.tail) {
    const e1 = Math.round(0.007 * sr), e2 = Math.round(0.012 * sr), dry = out.slice();
    for (let i = 0; i < n; i++) out[i] = dry[i] + 0.2 * (i >= e1 ? dry[i - e1] : 0) + 0.13 * (i >= e2 ? dry[i - e2] : 0);
    out = c.reverb(out, { size: 0.45, decay: 1.0, mixAmt: 0.3 }, sr) || out;
  }
  c.finish(out, 0.85);
  c.fade(out, 15, sr);
  return { samples: out };
}
