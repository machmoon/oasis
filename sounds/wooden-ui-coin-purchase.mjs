// Coin purchase: 1-3 coins clinking for a buy/confirm cue. Each strike is a pair of detuned inharmonic disc-mode
// rings (two coins touching) over a sub-ms metallic contact tick and a shimmer partial, stepping up for a "yes".
// The metal sets mode ratios, pitch and ring time; an optional wooden counter tap with settle ticks lays them down.
export const meta = {
  title: "Tavern Coin Clink", kind: "ui", format: "sound", duration: 0.35, price: 1, author: "quietmachine", payout: "quietmachine@creators.oasis.example", kit: "Wooden Tavern", description: "A short bright coin clink confirm for buying a drink or a room: metal, coin count, brightness and pitch are knobs, with an optional tap of coins set down on a wooden counter.",
  tags: ["coin", "ui", "purchase", "confirm", "clink", "tavern", "shop", "gold"],
};
export const params = { knobs: {
  metal: { type: "choice", label: "Metal", default: "silver", options: ["copper", "silver", "gold"] },
  coins: { type: "range", label: "Coin count", default: 2, min: 1, max: 3, step: 1 },
  brightness: { type: "range", label: "Brightness", default: 0.65, min: 0, max: 1, step: 0.01 },
  pitch: { type: "range", label: "Pitch", default: 0.5, min: 0, max: 1, step: 0.01 },
  woodTap: { type: "toggle", label: "Wood tap tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 4093 + params.knobs.metal.options.indexOf(p.metal) * 59 + 11);
  const M = {
    copper: { f: 2000, d: 0.028, tick: 0.0012, modes: [[1, 1], [1.52, 0.45], [2.14, 0.25], [2.71, 0.1]] },
    silver: { f: 3300, d: 0.07, tick: 0.0005, modes: [[1, 1], [1.47, 0.7], [2.09, 0.5], [2.56, 0.35], [3.18, 0.2]] },
    gold: { f: 2600, d: 0.05, tick: 0.0008, modes: [[1, 1], [1.41, 0.6], [1.98, 0.35], [2.47, 0.18]] },
  }[p.metal];
  const b = p.brightness, pk = Math.pow(2, (p.pitch - 0.5) * 1.2), ny = sr * 0.45;
  const count = Math.round(c.clamp(p.coins, 1, 3)), times = [];
  let t = 0.002;
  for (let k = 0; k < count; k++) { times.push(t); t += 0.04 + r() * 0.045; }
  const last = times[times.length - 1], ringDur = M.d * 4.5;
  const tapAt = last + 0.05 + r() * 0.02;
  const total = Math.max(last + ringDur, p.woodTap ? tapAt + 0.09 : 0) + 0.008;
  const out = new Float32Array(c.seconds(total, sr));
  const keep = (ms) => ms.filter(([f]) => f < ny);
  times.forEach((at, k) => {
    const base = M.f * pk * (1 + 0.045 * k) * (0.98 + r() * 0.04), amp = k === 0 ? 1 : 0.6 + 0.3 * r();
    const detune = 1.025 + r() * 0.05;
    const a = keep(M.modes.map(([q, g]) => [base * q * (0.995 + r() * 0.01), g]));
    const bm = keep(M.modes.map(([q, g]) => [base * detune * q * (0.995 + r() * 0.01), g * 0.7]));
    c.mix(out, c.ring(a, ringDur, M.d * (0.8 + 0.4 * r()), sr), at + 0.0004, 0.6 * amp, sr);
    c.mix(out, c.ring(bm, ringDur, M.d * (0.7 + 0.4 * r()), sr), at + 0.0006, 0.45 * amp, sr);
    const sh = keep([[base * 4.1, 1], [base * 5.3, 0.6]]);
    if (sh.length) c.mix(out, c.ring(sh, M.d * 2, M.d * 0.25, sr), at + 0.0004, (0.1 + 0.35 * b) * amp, sr);
    c.mix(out, c.burst(r, 0.005, "hp", Math.min(ny, 2200 + 5500 * b), 0.8, 0.0003, M.tick, sr), at, (0.25 + 0.45 * b) * amp, sr);
  });
  if (p.woodTap) {
    const k = 0.95 + r() * 0.1;
    c.mix(out, c.ring([[220 * k, 1], [480 * k * 1.02, 0.55], [840 * k, 0.3], [1380 * k, 0.15]], 0.08, 0.013, sr), tapAt + 0.001, 0.42, sr);
    c.mix(out, c.burst(r, 0.02, "lp", 1500 + 1200 * b, 0.8, 0.0006, 0.005, sr), tapAt, 0.4, sr);
    let st = tapAt + 0.008;
    for (let s = 0; s < count + 1; s++) {
      const f = M.f * pk * (1.1 + r() * 0.5);
      if (f < ny) c.mix(out, c.ring([[f, 1], [f * 1.5, 0.4]], 0.03, 0.005 + M.d * 0.06, sr), st, (0.22 - 0.04 * s) * (0.6 + 0.4 * r()), sr);
      st += 0.009 + r() * 0.012;
    }
  }
  c.filter(out, c.biquad("lp", Math.min(ny, (3500 + 12000 * b) * Math.max(1, pk)), 0.7, sr));
  c.fade(c.finish(out, 0.85), 3, sr);
  return { samples: out };
}
