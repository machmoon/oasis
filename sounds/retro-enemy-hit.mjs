// Enemy Hit: an 8-bit "you got him" crunch. A stepped, narrowing-pulse tone dives in pitch at a 240 Hz frame rate
// (the body), a short clocked LFSR noise burst whose clock falls with each hit gives the crunch (the contact), boss
// enemies stutter through shrinking re-hits over a triangle sub, then a sample-and-hold bitcrusher and spaced echoes.
export const meta = {
  title: "Pixel Crunch", kind: "sfx", format: "sound", duration: 0.4, price: 2, author: "quietmachine", payout: "quietmachine@creators.oasis.example", kit: "Retro Arcade", description: "A crunchy noise-plus-tone 8-bit hit for striking an enemy, from a tiny chirp to a stuttering boss thump; every seed is a fresh hit for combos.",
  tags: ["hit", "enemy", "8-bit", "chiptune", "arcade", "retro", "damage", "crunch"],
};
export const params = { knobs: {
  size: { type: "choice", label: "Enemy size", default: "medium", options: ["small", "medium", "boss"] },
  crunch: { type: "range", label: "Crunch", default: 0.5, min: 0, max: 1, step: 0.01 },
  pitch: { type: "range", label: "Pitch", default: 0.5, min: 0, max: 1, step: 0.01 },
  bitcrush: { type: "range", label: "Bitcrush", default: 0.3, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Echo tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, si = params.knobs.size.options.indexOf(p.size), r = c.rng(p.seed * 613 + si * 97 + 11);
  const S = [{ f: 900, len: 0.16, hits: 1, sub: 0, drop: 0.42, chirp: 1 }, { f: 420, len: 0.24, hits: 2, sub: 0.35, drop: 0.38, chirp: 0 },
    { f: 160, len: 0.34, hits: 4, sub: 0.8, drop: 0.32, chirp: 0 }][si];
  const cr = p.crunch, pm = Math.pow(2, (p.pitch - 0.5) * 2) * (0.94 + 0.12 * r());
  const onsets = [0]; let gap = 0.065 * (0.8 + 0.4 * r());
  for (let h = 1; h < S.hits; h++) { onsets.push(onsets[h - 1] + gap); gap *= 0.68 + 0.14 * r(); }
  const hit = (h) => {
    const len = S.len * (1 - 0.15 * h) * (0.9 + 0.2 * r()), n = c.seconds(len, sr), x = new Float32Array(n);
    const f0 = S.f * pm * (1 - 0.1 * h) * (0.95 + 0.1 * r()), sweep = 0.14 + 0.2 * r(), frame = Math.round(sr / 240);
    const d0 = 0.5 - 0.25 * r(), clock = (2500 + 14000 * cr) * pm * (0.85 + 0.3 * r());
    let s = 1 + Math.floor(r() * 32766), ph = 0, sph = 0, nph = 0, f = f0 * 2, nz = 1;
    const short = cr > 0.7, nDec = len * (0.07 + 0.13 * cr), tDec = len * S.drop * (0.85 + 0.3 * r());
    const tk = Math.exp(-1 / (tDec * sr)), nk = Math.exp(-1 / (nDec * sr));
    let te = 1, ne = 1;
    for (let i = 0; i < n; i++) {
      const t = i / sr, k = i / n;
      if (i % frame === 0) {
        const fr = Math.floor(i / frame);
        f = (S.chirp && fr < 2 && h === 0) ? f0 * (2.6 + fr) : f0 * 2 * Math.pow(sweep, fr / 240 / len);
      }
      const duty = d0 - (d0 - 0.125) * k;
      ph += f / sr; ph -= Math.floor(ph);
      sph += f * 0.5 / sr; sph -= Math.floor(sph);
      const sq = ph < duty ? 1 : -1, tri = 1 - 4 * Math.abs(sph - 0.5);
      nph += clock * (1 - 0.65 * k) / sr;
      while (nph >= 1) { nph -= 1; const b = (s ^ (s >> 1)) & 1; s = (s >> 1) | (b << 14); if (short) s = (s & ~64) | (b << 6); nz = s & 1 ? 1 : -1; }
      const att = Math.min(1, t / 0.0008), lin = 1 - k;
      te *= tk; ne *= nk;
      const y = (sq * (0.75 - 0.25 * cr) + tri * S.sub) * te * att * lin + nz * ne * att * lin * (0.12 + 0.68 * cr);
      x[i] = Math.tanh(y * (1 + 3 * cr)) * Math.pow(0.78, h);
    }
    return x;
  };
  const coreLen = onsets[onsets.length - 1] + S.len * 1.1 + 0.01, core = new Float32Array(c.seconds(coreLen, sr));
  for (let h = 0; h < S.hits; h++) c.mix(core, hit(h), onsets[h] + 0.001, 1, sr);
  const hold = 1 + Math.round(p.bitcrush * 14 * sr / 22050), q = Math.pow(2, 15 - 12.5 * p.bitcrush);
  let held = 0;
  for (let i = 0; i < core.length; i++) { if (i % hold === 0) held = Math.round(core[i] * q) / q; core[i] = held; }
  const d = (si === 0 ? 0.12 : si === 1 ? 0.16 : 0.2) * (0.9 + 0.2 * r()), reps = p.tail ? 3 : 0;
  const out = new Float32Array(c.seconds(coreLen + reps * d + 0.02, sr));
  c.mix(out, core, 0, 1, sr);
  let echo = core;
  for (let e = 1; e <= reps; e++) {
    echo = c.filter(Float32Array.from(echo), c.biquad("lp", 4800 / e, 0.7, sr));
    c.mix(out, echo, e * d, 0.4 * Math.pow(0.45, e - 1), sr);
  }
  c.filter(out, c.biquad("hp", 35, 0.7, sr));
  c.fade(c.finish(out, 0.9, 1.1), 3, sr);
  return { samples: out };
}
