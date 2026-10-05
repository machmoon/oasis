// Distant thunder roll: a seeded chain of rolling pressure pulses over brown-noise rumble (sub, body and a mid band for small speakers), an opening crack and decaying crackle grains, discrete hill echoes of the strike and an optional reverb wash.
export const meta = {
  title: "Distant Thunder Roll", kind: "sfx", format: "sound", duration: 3.5, price: 3, author: "stormfront", payout: "stormfront@creators.oasis.example", kit: "Forest at Night", description: "A long thunder roll over a night forest whose distance, length, rumble depth, crackle and terrain echo are knobs; every seed is a different strike rolling across the hills.",
  tags: ["thunder", "storm", "rumble", "weather", "distant", "roll", "forest", "night"],
};
export const params = { knobs: {
  distance: { type: "choice", label: "Distance", default: "mid", options: ["near", "mid", "far"] },
  length: { type: "range", label: "Length", default: 0.5, min: 0, max: 1, step: 0.01 },
  depth: { type: "range", label: "Rumble depth", default: 0.5, min: 0, max: 1, step: 0.01 },
  crackle: { type: "range", label: "Crackle", default: 0.4, min: 0, max: 1, step: 0.01 },
  echo: { type: "range", label: "Terrain echo", default: 0.4, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, di = params.knobs.distance.options.indexOf(p.distance), r = c.rng(p.seed * 4241 + di * 97 + 3);
  const D = [{ cut: 2400, crack: 1, cf: [2500, 6000], g: 0.97, amb: 0.12 }, { cut: 1100, crack: 0.45, cf: [1500, 3500], g: 0.9, amb: 0.17 }, { cut: 480, crack: 0.14, cf: [900, 2000], g: 0.84, amb: 0.24 }][di];
  const L = p.length, dp = p.depth, rollDur = 1.4 + 1.4 * L, echoSpan = 0.25 + 0.6 * p.echo, tailS = p.tail ? 0.6 : 0.12;
  const n = c.seconds(rollDur + 0.3 + tailS, sr), dry = new Float32Array(n);
  const H = 64, m = Math.ceil(n / H) + 2, ev = new Float32Array(m), tilt = new Float32Array(m), K = Math.round(5 + 7 * L + r() * 3);
  for (let k = 0; k < K; k++) {
    const t0 = k === 0 ? 0 : Math.pow(r(), 0.8) * rollDur * 0.75, a = k === 0 ? 0.004 + 0.02 * di : c.between(r, 0.03, 0.18);
    const d = c.between(r, 0.18, 0.5) * (p.tail ? 1.3 : 1) * (0.7 + 0.6 * L), amp = k === 0 ? 1 : (0.4 + 0.6 * r()) * Math.exp(-t0 / (rollDur * 0.5)), col = c.between(r, 0.7, 1.3);
    for (let j = Math.floor(t0 * sr / H); j < m; j++) {
      const x = j * H / sr - t0; if (x < 0) continue; if (x > a + d * 7) break;
      const v = amp * (x < a ? x / a : Math.exp(-(x - a) / d));
      ev[j] += v; tilt[j] += v * col;
    }
  }
  for (let j = 0; j < m; j++) { const e = ev[j]; tilt[j] = e > 1e-4 ? tilt[j] / e : 1; ev[j] = e * (0.45 + 0.55 * Math.min(1, e)); }
  const br = c.brown(r, n), pk = c.pink(r, n), lpm = c.onepole(sr), subLp = c.biquad("lp", 65, 0.8, sr), midBp = c.biquad("bp", 230, 0.8, sr);
  const cut = D.cut * (1 - 0.45 * dp);
  for (let i = 0; i < n; i++) {
    const j = Math.floor(i / H), f = (i % H) / H, e = ev[j] + (ev[j + 1] - ev[j]) * f;
    const body = lpm(br[i], cut * tilt[j] * (0.4 + 0.6 * Math.min(1, e))), sub = subLp(br[i]), mid = midBp(pk[i]);
    dry[i] = (body * (1 - 0.4 * dp) + sub * (0.4 + 2.2 * dp) + mid * 1.4) * e;
  }
  c.mix(dry, c.burst(r, 0.3, "bp", D.cf[0] * 0.8, 0.7, 0.002, 0.05 + 0.04 * di, sr), 0, 0.9 * D.crack, sr);
  c.mix(dry, c.ring([[52 + r() * 10, 1], [94 + r() * 14, 0.5], [210, 0.25]], 0.6, 0.12 + 0.08 * dp, sr), 0.002, 0.5 + 0.3 * dp, sr);
  const grains = Math.round(p.crackle * (60 + 340 * (1 - 0.35 * di)) * (0.7 + 0.5 * L));
  for (let g = 0; g < grains; g++) {
    const t = Math.pow(r(), 2.2) * rollDur * 0.7, j = Math.min(m - 1, Math.floor(t * sr / H));
    c.mix(dry, c.burst(r, 0.006 + r() * 0.02, "bp", c.between(r, D.cf[0], D.cf[1]), 1.5 + r() * 2, 0.0005, 0.002 + r() * 0.008, sr), t, (0.2 + 0.5 * r()) * (0.3 + 0.7 * Math.min(1, ev[j])) * (1 - 0.4 * di), sr);
  }
  let out = new Float32Array(n); c.mix(out, dry, 0, 1, sr);
  const wN = c.seconds(0.45, sr), ec = new Float32Array(wN);
  for (let i = 0; i < wN; i++) ec[i] = dry[i] * (0.5 + 0.5 * Math.cos(Math.PI * i / wN));
  c.filter(ec, c.biquad("lp", 900 - 300 * di, 0.7, sr));
  for (let k = 0; k < 3; k++) c.mix(out, ec, echoSpan * (0.4 + 0.3 * k) * (0.85 + 0.3 * r()), p.echo * 0.75 * Math.pow(0.6, k), sr);
  if (p.tail) out = c.reverb(out, { size: 0.85, decay: 0.75, mixAmt: D.amb }, sr) || out;
  const N = out.length, w = Math.min(N - 1, c.seconds(p.tail ? 0.45 : 0.07, sr));
  for (let i = 0; i < w; i++) out[N - w + i] *= 0.5 + 0.5 * Math.cos(Math.PI * i / w);
  c.finish(out, 0.9);
  c.fade(out, 3, sr);
  c.gain(out, D.g);
  return { samples: out };
}
