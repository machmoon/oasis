// Babbling brook: a loopable stream bed after Farnell's "Running Water": rising resonant bubbles over pebble chatter, a water wash and an optional rumble, all wrapped on a circular 4 s timeline.
export const meta = {
  title: "Night Brook", kind: "ambience", format: "sound", duration: 4, price: 4, author: "stormfront", payout: "stormfront@creators.oasis.example", kit: "Forest at Night", description: "A seamless four-second babbling brook whose stream size, flow, pebble chatter, width and low rumble are knobs, for forest, camp and night-walk scenes.",
  tags: ["stream", "brook", "water", "ambience", "loop", "forest", "creek", "night"],
};
export const params = { knobs: {
  size: { type: "choice", label: "Stream size", default: "creek", options: ["trickle", "creek", "brook"] },
  flow: { type: "range", label: "Flow", default: 0.5, min: 0, max: 1, step: 0.01 },
  chatter: { type: "range", label: "Pebble chatter", default: 0.4, min: 0, max: 1, step: 0.01 },
  width: { type: "range", label: "Stereo width", default: 0.5, min: 0, max: 1, step: 0.01 },
  rumble: { type: "range", label: "Low-end rumble", default: 0.3, min: 0, max: 1, step: 0.01 },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, si = params.knobs.size.options.indexOf(p.size), r = c.rng(p.seed * 6113 + si * 271 + 3);
  const dur = 4, N = c.seconds(dur, sr), X = c.seconds(0.12, sr), pad = c.seconds(0.16, sr), L = N + X;
  const S = [{ lo: 1100, hi: 3600, rate: 0.6, bed: 2600, q: 1.1, dec: 0.006 }, { lo: 600, hi: 2600, rate: 1, bed: 1500, q: 0.9, dec: 0.01 }, { lo: 280, hi: 1700, rate: 1.4, bed: 850, q: 0.7, dec: 0.016 }][si];
  const w = p.width, fl = p.flow, ev = new Float32Array(N + pad);
  const nb = Math.round((60 + 260 * fl) * S.rate * dur), tight = 1 - 0.4 * fl;
  for (let b = 0; b < nb; b++) {
    const far = r() * w, f = S.lo * Math.pow(S.hi / S.lo, r()) * (1 - 0.25 * far);
    const d = S.dec * (0.5 + r()) * (1 + 0.5 * far) * tight, rise = 0.3 + 0.9 * fl * r();
    const big = r(), g = (0.2 + 0.8 * big * big) * (1 - 0.6 * far) * 0.7, i0 = Math.floor(r() * N);
    const len = Math.min(pad - 1, Math.floor(4 * d * sr)), dk = Math.exp(-1 / (d * sr)), atk = 0.0008 * sr, sweep = 2 * d * sr;
    let ph = r() * c.TAU, e = 1;
    for (let k = 0; k < len; k++) {
      ph += c.TAU * f * (1 + rise * Math.min(1, k / sweep)) / sr;
      ev[i0 + k] += Math.sin(ph) * e * g * Math.min(1, k / atk);
      e *= dk;
    }
  }
  const nc = Math.round(p.chatter * (6 + 10 * fl) * dur * (1.2 - 0.2 * si));
  for (let k = 0; k < nc; k++) {
    let t = r() * dur; const hits = 2 + Math.floor(r() * 5);
    for (let h = 0; h < hits; h++) {
      t += 0.004 + r() * 0.02;
      const gg = p.chatter * (0.3 + 0.5 * r());
      c.mix(ev, c.burst(r, 0.006, "bp", (2500 + r() * 4500) * (1 - 0.25 * si), 3, 0.0003, 0.0015, sr), t, gg * 0.6, sr);
      c.mix(ev, c.ring([[1800 + r() * 2500, 1], [4200 + r() * 3000, 0.4]], 0.03, 0.004 + r() * 0.004, sr), t + 0.0005, gg * 0.25, sr);
    }
  }
  for (let i = N; i < ev.length; i++) ev[i - N] += ev[i];
  const cont = new Float32Array(L), x = c.pink(r, L), y = c.pink(r, L);
  const bp = c.biquad("bp", S.bed, S.q * (1 - 0.4 * w), sr), lp = c.biquad("lp", S.bed * 0.45, 0.8, sr), hp = c.biquad("hp", 4500, 0.7, sr);
  const p1 = r() * c.TAU, p2 = r() * c.TAU, p3 = r() * c.TAU, p4 = r() * c.TAU, bedG = (0.09 + 0.22 * fl) * (0.7 + 0.3 * si);
  for (let i = 0; i < L; i++) {
    const u = c.TAU * i / N;
    const m = 1 + 0.25 * Math.sin(3 * u + p1) + 0.15 * Math.sin(7 * u + p2) + 0.2 * fl * Math.sin(13 * u + p3);
    const gurgle = 0.65 + 0.35 * Math.sin(11 * u + p4) * Math.sin(17 * u + p1);
    cont[i] = (bp(x[i]) * m + lp(y[i]) * gurgle * (0.5 + 0.5 * fl) * 0.7 + hp(x[i]) * 0.15 * (0.3 + w)) * bedG;
  }
  if (p.rumble > 0) {
    const low = c.brown(r, L), lp2 = c.biquad("lp", 70 + 40 * si, 0.8, sr), q1 = r() * c.TAU, rg = p.rumble * (0.6 + 0.3 * si) * 1.6;
    for (let i = 0; i < L; i++) cont[i] += lp2(low[i]) * rg * (0.75 + 0.25 * Math.sin(c.TAU * 2 * i / N + q1));
  }
  for (let i = 0; i < X; i++) { const a = i / X; cont[i] = cont[i] * Math.sqrt(a) + cont[N + i] * Math.sqrt(1 - a); }
  const dry = new Float32Array(N);
  for (let i = 0; i < N; i++) dry[i] = cont[i] + ev[i];
  const out = new Float32Array(N), D1 = Math.round(0.011 * sr), D2 = Math.round(0.019 * sr);
  for (let i = 0; i < N; i++) out[i] = dry[i] + w * (0.45 * dry[(i - D1 + N) % N] - 0.3 * dry[(i - D2 + N) % N]);
  c.fade(c.finish(out, 0.85), 10, sr);
  return { samples: out };
}
