// Data-entry beep run: a fast chain of chirped square/sine console tones walking a scale, each with a key-contact tick, resolving on a held tonic confirm, with an optional darkening feedback echo.
export const meta = {
  title: "Data Entry Run", kind: "sfx", format: "sound", duration: 1.1, price: 2, author: "quietmachine", payout: "quietmachine@creators.oasis.example", kit: "Sci-fi Console", description: "A rapid run of starship console beeps as data is keyed in, resolving on a confirm tone, with scale, speed, length, wildness and echo as knobs; every seed is a new entry sequence for bridge terminals and HUDs.",
  tags: ["beep", "sci-fi", "console", "computer", "data", "interface", "terminal", "arpeggio"],
};
export const params = { knobs: {
  scale: { type: "choice", label: "Scale", default: "major", options: ["major", "minor", "random"] },
  rate: { type: "range", label: "Note rate (per s)", default: 12, min: 5, max: 24, step: 0.5 },
  count: { type: "range", label: "Note count", default: 8, min: 3, max: 16, step: 1 },
  randomness: { type: "range", label: "Randomness", default: 0.3, min: 0, max: 1, step: 0.01 },
  echo: { type: "range", label: "Echo", default: 0.25, min: 0, max: 1, step: 0.01 },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + params.knobs.scale.options.indexOf(p.scale) * 97 + 11);
  const count = Math.round(p.count), per = 1 / p.rate, rnd = p.randomness;
  let deg;
  if (p.scale === "major") deg = [0, 2, 4, 5, 7, 9, 11];
  else if (p.scale === "minor") deg = [0, 2, 3, 5, 7, 8, 10];
  else {
    const pool = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = pool[i]; pool[i] = pool[j]; pool[j] = t; }
    deg = [0].concat(pool.slice(0, 6)).sort((a, b) => a - b);
  }
  const base = c.between(r, 620, 940);
  const notes = [], colour = 2 + Math.floor(r() * (count - 2));
  let t = 0.002, idx = Math.floor(r() * 4);
  for (let k = 0; k < count; k++) {
    const last = k === count - 1;
    if (last) idx = idx >= 4 ? 7 : 0;
    else if (k === colour) idx = 7 * Math.floor(idx / 7) + 2 + (r() < 0.5 ? 0 : 3);
    const len = last ? Math.min(0.22, per * 1.8) : Math.min(per * (0.62 + 0.15 * r()), 0.09);
    const f = base * Math.pow(2, (Math.floor(idx / 7) * 12 + deg[idx % 7]) / 12) * (1 + (r() - 0.5) * 0.01 * rnd);
    notes.push({ t, len, f, a: (last ? 1 : 0.8) * (1 - 0.25 * rnd * r()) });
    t += per * (1 + (r() - 0.5) * 0.6 * rnd);
    if (r() < rnd) idx += Math.round((r() * 2 - 1) * (2 + 5 * rnd));
    else idx += r() < 0.72 ? 1 : -1;
    idx = Math.max(0, Math.min(13, idx));
  }
  const lastN = notes[notes.length - 1], dryEnd = lastN.t + lastN.len;
  const d = Math.max(1, Math.round(sr * Math.min(0.16, per * 1.5)));
  const fb = 0.2 + 0.4 * p.echo;
  const reps = p.echo > 0.005 ? Math.min(7, Math.log(0.01) / Math.log(fb)) : 0;
  const n = c.seconds(Math.min(2, dryEnd + reps * d / sr + 0.02), sr), dry = new Float32Array(n);
  for (const nt of notes) {
    const m = c.seconds(nt.len, sr), buf = new Float32Array(m);
    const att = Math.max(1, Math.round(0.0015 * sr)), rel = Math.max(1, Math.round(Math.min(0.012, nt.len * 0.3) * sr));
    const chirpK = 1 / (0.004 * sr), step = c.TAU / sr;
    let ph = 0;
    for (let i = 0; i < m; i++) {
      ph += step * nt.f * (1 + 0.05 * Math.exp(-i * chirpK));
      const s = Math.sin(ph);
      const tone = 0.55 * Math.tanh(4 * s) + 0.35 * s + 0.1 * Math.sin(2 * ph);
      const e = Math.min(1, i / att) * (i > m - rel ? (m - i) / rel : 1) * (1 - 0.5 * i / m);
      buf[i] = tone * e;
    }
    c.mix(dry, buf, nt.t, 0.5 * nt.a, sr);
    c.mix(dry, c.burst(r, 0.003, "hp", 4500, 0.7, 0.0003, 0.001, sr), nt.t, 0.12 + 0.08 * r(), sr);
  }
  c.filter(dry, c.biquad("lp", 7500, 0.7, sr));
  const out = new Float32Array(n), e = new Float32Array(n), lp = c.onepole(sr);
  const wet = 0.7 * p.echo;
  for (let i = 0; i < n; i++) {
    const back = lp(i >= d ? e[i - d] : 0, 2600);
    e[i] = dry[i] + fb * back;
    out[i] = dry[i] + wet * back;
  }
  c.fade(c.finish(out, 0.85), 4, sr);
  return { samples: out };
}
