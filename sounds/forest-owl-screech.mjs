// Barn owl screech: a rasping, rising-then-sagging scream. A driven harmonic core carries the pitch arc, pitch-synchronous breath noise through two formants adds the rasp, a hiss layer scales with harshness, and the tail adds tree echoes plus a little room.
export const meta = {
  title: "Barn Owl Screech", kind: "sfx", format: "sound", duration: 1.5, price: 2, author: "stormfront", payout: "stormfront@creators.oasis.example", kit: "Forest at Night", description: "A rasping barn owl screech whose bird size, harshness, length, distance and pitch are knobs, for night forests, barns and horror cues; every seed is a different call.",
  tags: ["owl", "screech", "barn owl", "bird", "night", "forest", "creature", "horror"],
};
export const params = { knobs: {
  size: { type: "choice", label: "Size", default: "medium", options: ["small", "medium", "large"] },
  harshness: { type: "range", label: "Harshness", default: 0.5, min: 0, max: 1, step: 0.01 },
  duration: { type: "range", label: "Duration", default: 0.5, min: 0, max: 1, step: 0.01 },
  distance: { type: "range", label: "Distance", default: 0.3, min: 0, max: 1, step: 0.01 },
  pitch: { type: "range", label: "Pitch", default: 1, min: 0.75, max: 1.3, step: 0.01 },
  tail: { type: "toggle", label: "Forest tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, si = Math.max(0, params.knobs.size.options.indexOf(p.size)), r = c.rng(p.seed * 6151 + si * 97 + 3);
  const sz = [{ f: 2300, fm: [3900, 6900], len: 0.8, rs: 0.45 }, { f: 1850, fm: [3200, 5700], len: 1, rs: 0.6 }, { f: 1450, fm: [2600, 4700], len: 1.2, rs: 0.75 }][si];
  const h = p.harshness, far = p.distance, TAU = c.TAU, nyq = sr * 0.45;
  const len = (0.45 + 1.1 * p.duration) * sz.len * c.between(r, 0.93, 1.07);
  const tailLen = p.tail ? 0.32 + 0.35 * far : 0;
  const m = c.seconds(len, sr), n = c.seconds(len + tailLen + 0.03, sr), out = new Float32Array(n);
  const f0 = sz.f * p.pitch * c.between(r, 0.96, 1.04);
  const peakU = c.between(r, 0.18, 0.32), sag = c.between(r, 0.2, 0.3), rise = c.between(r, 0.16, 0.24);
  const amBase = c.between(r, 55, 90) * (1 + 0.5 * h), wob = c.between(r, 4, 7), ph0 = r() * TAU;
  const atk = 0.018 + 0.01 * si, rel = Math.min(0.28, len * 0.35);
  const brk = r() < 0.55, tb = len * c.between(r, 0.4, 0.7), bw = c.between(r, 0.015, 0.03);
  const dry = new Float32Array(m), air = c.noise(r, m);
  const bp1 = c.biquad("bp", Math.min(nyq, sz.fm[0] * p.pitch * c.between(r, 0.95, 1.05)), 2.2, sr);
  const bp2 = c.biquad("bp", Math.min(nyq, sz.fm[1] * p.pitch * c.between(r, 0.95, 1.05)), 2.8, sr);
  const hp = c.biquad("hp", 2500, 0.7, sr);
  const drive = 1 + 3 * h, dn = Math.tanh(drive), hk = [1, 0.55, 0.32, 0.18, 0.1];
  const tg = 0.8 - 0.25 * h, ag = 0.4 + 0.6 * h;
  let ph = 0, amPh = 0, amRate = amBase;
  for (let i = 0; i < m; i++) {
    const t = i / sr, u = t / len;
    const a = Math.min(1, t / atk), x = Math.min(1, Math.max(0, (len - t) / rel));
    let e = a * a * (3 - 2 * a) * x * x * (0.85 + 0.15 * Math.sin(TAU * wob * t + ph0));
    if (brk) { const d = (t - tb) / bw; e *= 1 - 0.75 * Math.exp(-d * d); }
    let f = f0 * (1 - rise + rise * Math.min(1, u / peakU));
    if (u > peakU) { const v = (u - peakU) / (1 - peakU); f *= 1 - sag * v * v; }
    f *= 1 + 0.018 * Math.sin(TAU * wob * 1.7 * t + 2 * ph0);
    ph += TAU * f / sr;
    if (i % 256 === 0) amRate = amBase * (0.85 + 0.3 * r());
    amPh += TAU * amRate / sr;
    const am = 1 - (0.2 + 0.5 * h) * (0.5 + 0.5 * Math.sin(amPh));
    let s = 0;
    for (let k = 0; k < 5 && (k + 1) * f < nyq; k++) s += hk[k] * Math.sin((k + 1) * ph);
    const tone = Math.tanh(s * 0.6 * drive) / dn;
    const vo = 0.5 + 0.5 * Math.sin(ph), w = air[i];
    const breath = (bp1(w) + 0.7 * bp2(w)) * (0.3 + 0.7 * vo * vo) + (0.08 + 0.5 * h) * hp(w);
    dry[i] = (tg * tone + ag * breath * (0.55 + 0.45 * am)) * e * am;
  }
  c.mix(out, dry, 0, 1, sr);
  if (p.tail) {
    const lpE = c.biquad("lp", 3800 - 1800 * far, 0.7, sr), echo = c.filter(Float32Array.from(dry), lpE);
    for (let k = 0; k < 3; k++) c.mix(out, echo, 0.08 + 0.07 * k + r() * 0.03, (0.14 + 0.18 * far) * Math.pow(0.55, k), sr);
  }
  c.filter(out, c.biquad("lp", Math.min(nyq, 14000 - 10000 * far), 0.7, sr));
  if (far > 0.4) c.filter(out, c.biquad("hp", 200 + 500 * far, 0.7, sr));
  if (p.tail) c.reverb(out, { size: sz.rs + 0.15 * far, decay: 0.4 + 0.4 * far, mixAmt: 0.08 + 0.17 * far }, sr);
  c.finish(out, 0.9, 1.1);
  c.fade(out, 30, sr);
  c.gain(out, 1 - 0.35 * far);
  return { samples: out };
}
