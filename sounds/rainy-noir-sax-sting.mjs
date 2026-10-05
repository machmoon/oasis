// Noir sax sting: a harmonic reed voice (tanh-driven buzz through two body formants) with tongued breath, scoops, vibrato and growl, in a wet alley room (early reflections plus a reverb wash), over a rain-on-pavement bed kept under the horn.
export const meta = {
  title: "Rainlit Sax Sting", kind: "music-loop", format: "sound", duration: 3, price: 4, author: "kickdrum", payout: "kickdrum@creators.oasis.example", kit: "Rainy City Street", description: "A short noir saxophone phrase echoing off a wet night street, with rain under it, for scene transitions, title cards and detective-game stingers.",
  tags: ["saxophone", "noir", "sting", "jazz", "rain", "night", "detective", "reverb"],
};
export const params = { knobs: {
  mood: { type: "choice", label: "Mood", default: "melancholy", options: ["melancholy", "tense", "smoky"] },
  phrase: { type: "range", label: "Phrase length", default: 0.5, min: 0, max: 1, step: 0.01 },
  breath: { type: "range", label: "Breathiness", default: 0.35, min: 0, max: 1, step: 0.01 },
  rain: { type: "range", label: "Rain bed", default: 0.35, min: 0, max: 1, step: 0.01 },
  key: { type: "range", label: "Key pitch", default: 0, min: -7, max: 7, step: 1 },
  tail: { type: "toggle", label: "Reverb tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, mi = params.knobs.mood.options.indexOf(p.mood), r = c.rng(p.seed * 7703 + mi * 211 + 3);
  const M = [
    { sc: [0, 2, 3, 5, 7, 8, 10, 12], d: [0.3, 0.52], leg: 0.92, gapA: 0.35, glide: 0.035, rel: 0.06, vib: [4.6, 0.011], scoop: 0.5, growl: 0, start: 6, fin: 0, fall: 0 },
    { sc: [0, 1, 3, 6, 7, 10, 11, 12], d: [0.11, 0.22], leg: 0.5, gapA: 0, glide: 0.008, rel: 0.012, vib: [6.5, 0.004], scoop: 0, growl: 0.5, start: 3, fin: 3, fall: 0 },
    { sc: [0, 3, 5, 6, 7, 10, 12], d: [0.2, 0.42], leg: 0.82, gapA: 0.2, glide: 0.02, rel: 0.05, vib: [4.0, 0.02], scoop: 1.6, growl: 0.12, start: 2, fin: 0, fall: 5 },
  ][mi];
  const root = 233.08 * Math.pow(2, p.key / 12), br = p.breath;
  const notes = [], span = 0.6 + 1.0 * p.phrase;
  let t = 0.03, idx = M.start, k = 0;
  while (t < span - 0.08) {
    let d = c.between(r, M.d[0], M.d[1]);
    if (mi === 2) d *= k % 2 ? 0.7 : 1.3;
    if (mi === 1 && r() < 0.35) d *= 0.6;
    d = Math.min(d, span - t);
    notes.push({ t, d, f: root * Math.pow(2, M.sc[idx] / 12), a: 0.65 + 0.35 * r(), sc: r() < 0.6 ? M.scoop : M.scoop * 0.3 });
    t += d; k++;
    const s = mi === 0 ? (r() < 0.72 ? -1 : 1) * (r() < 0.2 ? 2 : 1) : mi === 1 ? Math.round(c.between(r, -2.4, 2.4)) : (r() < 0.5 ? -1 : 1) * (r() < 0.25 ? 2 : 1);
    idx = c.clamp(idx + s, 0, M.sc.length - 1);
  }
  const lastD = 0.45 + 0.25 * r() + 0.15 * p.phrase;
  notes.push({ t, d: lastD, f: root * Math.pow(2, M.sc[M.fin] / 12), a: 0.9, sc: M.scoop });
  const T = t + lastD, n = Math.min(c.seconds(T + 0.2 + (p.tail ? 1.1 : 0.35), sr), c.seconds(3.9, sr)), N = notes.length;
  const sax = new Float32Array(n), nz = c.noise(r, n);
  const f1 = c.biquad("bp", 520, 1.1, sr), f2 = c.biquad("bp", 1650, 2.2, sr), lp = c.biquad("lp", 3200, 0.7, sr);
  const bb = c.biquad("bp", 2300, 0.8, sr), bh = c.biquad("hp", 700, 0.7, sr);
  const gc = 1 - Math.exp(-1 / (M.glide * sr)), ac = 1 - Math.exp(-1 / (0.012 * sr)), rc = 1 - Math.exp(-1 / (M.rel * sr)), ec = 1 - Math.exp(-1 / (0.1 * sr));
  const vr = M.vib[0] * (0.93 + 0.14 * r()), vp = r() * 6, gp = r() * 6, scm = (s) => Math.pow(2, -s / 12);
  const bg = 0.08 + 0.6 * br;
  let f = notes[0].f * scm(1.5), a = 0, ph = 0; k = 0;
  for (let i = 0; i < n; i++) {
    const tt = i / sr;
    while (k < N - 1 && tt >= notes[k + 1].t) k++;
    const nt = notes[k], tn = tt - nt.t;
    let tf = tn < 0.06 && nt.sc > 0 ? nt.f * scm(nt.sc) : nt.f;
    if (k === N - 1 && M.fall && tn > nt.d - 0.35) tf *= Math.exp(-0.0578 * M.fall * Math.min(1, (tn - nt.d + 0.35) / 0.35));
    const ta = tt >= T ? 0 : tn < nt.d * M.leg ? nt.a : k < N - 1 ? M.gapA * nt.a : nt.a;
    f += (tf - f) * gc;
    a += (ta - a) * (tt >= T ? ec : ta > a ? ac : rc);
    const ff = f * (1 + M.vib[1] * Math.min(1, tn / 0.3) * Math.sin(c.TAU * vr * tt + vp));
    ph += c.TAU * ff / sr; if (ph > c.TAU) ph -= c.TAU;
    const drive = 0.8 + 3.5 * a * (1 - 0.35 * br);
    let reed = Math.tanh(drive * (Math.sin(ph) + 0.5 * Math.sin(2 * ph + 0.4) + 0.2 * Math.sin(3 * ph + 1.1))) * a;
    if (M.growl) reed *= 1 - M.growl * a * (0.5 + 0.5 * Math.sin(c.TAU * 31 * tt + gp));
    const y = f1(reed) * 1.0 + f2(reed) * 0.8 * (1 - 0.3 * br) + lp(reed) * 0.6;
    const chiff = Math.min(1, tn / 0.004) * Math.exp(-tn / 0.02) * nt.a * 0.45 * Math.min(1, 0.3 + 2 * a);
    sax[i] = y + bb(bh(nz[i])) * (a * 0.6 + chiff) * bg;
  }
  c.fade(sax, 10, sr);
  const dry = sax.slice(), dark = c.onepole(sr);
  for (let i = 0; i < n; i++) dry[i] = dark(dry[i], 3200);
  for (let j = 0; j < 5; j++) {
    const d = c.seconds(0.019 + j * 0.031 + r() * 0.012, sr), g = 0.42 * Math.pow(0.68, j);
    for (let i = n - 1; i >= d; i--) sax[i] += dry[i - d] * g;
  }
  const wet = c.reverb(sax, p.tail ? { size: 0.9, decay: 0.8, mixAmt: 0.42 + 0.08 * (mi === 2) } : { size: 0.35, decay: 0.3, mixAmt: 0.16 }, sr) || sax;
  const out = new Float32Array(n);
  c.mix(out, c.finish(wet, 0.8), 0, 1, sr);
  if (p.rain > 0) {
    const bed = c.pink(r, n), hp = c.biquad("hp", 1300, 0.7, sr), lp2 = c.biquad("lp", 6800, 0.7, sr), up = c.seconds(0.04, sr);
    for (let i = 0; i < n; i++) bed[i] = lp2(hp(bed[i])) * Math.min(1, i / up);
    c.mix(out, bed, 0, 0.14 * p.rain, sr);
    const drops = Math.round((15 + 45 * p.rain) * n / sr);
    for (let d = 0; d < drops; d++) {
      const at = 0.02 + r() * (n / sr - 0.55);
      c.mix(out, c.burst(r, 0.006 + r() * 0.01, "bp", 1800 + r() * 4200, 3, 0.0005, 0.002 + r() * 0.003, sr), at, (0.015 + 0.04 * r()) * p.rain, sr);
    }
  }
  const fl = Math.min(n, c.seconds(p.tail ? 0.5 : 0.25, sr));
  for (let i = 0; i < fl; i++) { const g = i / fl; out[n - 1 - i] *= g * g; }
  c.finish(out, 0.9);
  c.fade(out, 15, sr);
  return { samples: out };
}
