// Clock tick then stop: pendulum escapement tick-tock (sharp brass click + wooden case ring + low tock), fine gear ticks between beats, then the mechanism seizes with a clunk and a short grind, followed by silence or a hollow case tail.
export const meta = {
  title: "Clock Stops Dead", kind: "sfx", format: "sound", duration: 3.2, price: 2, author: "hollowbody", payout: "hollowbody@creators.oasis.example", kit: "Horror House", description: "A grandfather or mantel clock ticking steadily, then the mechanism seizing with a final clunk and sudden silence; for haunted-house scares and tension cuts.",
  tags: ["clock", "tick", "grandfather", "horror", "haunted", "mechanism", "stop", "foley"],
};
export const params = { knobs: {
  clock: { type: "choice", label: "Clock", default: "grandfather", options: ["mantel", "grandfather"] },
  tick: { type: "range", label: "Tick level", default: 0.7, min: 0, max: 1, step: 0.01 },
  rattle: { type: "range", label: "Mechanism rattle", default: 0.4, min: 0, max: 1, step: 0.01 },
  rate: { type: "range", label: "Tick rate (Hz)", default: 1.2, min: 0.6, max: 2.5, step: 0.05 },
  tail: { type: "toggle", label: "Hollow tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + (p.clock === "mantel" ? 11 : 97));
  const g = p.clock === "grandfather", n = c.seconds(3.2, sr), out = new Float32Array(n);
  const half = 0.5 / p.rate, stopAt = Math.min(2.5, Math.max(1.5, half * 6 + 0.35 + r() * 0.15));
  const f0 = g ? 150 : 400, body = g ? 0.14 : 0.06, cf = g ? 2200 : 4300;
  const lv = 0.3 + 0.7 * p.tick;
  let k = 0;
  for (let t = 0.06; t < stopAt - half * 0.6; t += half * (1 + (r() - 0.5) * 0.04), k++) {
    const tock = k % 2, a = lv * (0.85 + 0.15 * r()) * (tock ? 0.78 : 1);
    const f = f0 * (tock ? 0.85 : 1) * (0.99 + r() * 0.02);
    c.mix(out, c.burst(r, 0.006, "bp", cf * (tock ? 0.75 : 1), 3, 0.0004, 0.0018, sr), t, 0.6 * a, sr);
    c.mix(out, c.ring([[f, 1], [f * 2.76, 0.45], [f * 5.4, 0.2], [f * 1.5, 0.15]], body * 3, body * (0.6 + 0.6 * p.tick), sr), t + 0.0008, 0.5 * a, sr);
    c.mix(out, c.ring([[cf * 0.9, 0.5], [cf * 1.7, 0.3]], 0.05, 0.01, sr), t, 0.2 * a, sr);
    const gears = Math.round(1 + 9 * p.rattle);
    for (let q = 0; q < gears; q++) c.mix(out, c.burst(r, 0.003, "bp", 3000 + r() * 4500, 5, 0.0002, 0.001, sr), t + 0.015 + r() * half * 0.8, (0.05 + 0.25 * r()) * (0.15 + 1.1 * p.rattle), sr);
  }
  const lastF = f0 * 0.7;
  const gn = c.seconds(0.22, sr), grind = c.noise(r, gn), gb = c.biquad("bp", 900, 2, sr);
  for (let i = 0; i < gn; i++) { const u = i / gn; grind[i] = gb(grind[i]) * (1 - u) * (0.5 + 0.5 * Math.sin(i / sr * 160)) * Math.min(1, i / (0.004 * sr)); }
  c.mix(out, grind, stopAt - 0.02, 0.35 + 0.4 * p.rattle, sr);
  c.mix(out, c.burst(r, 0.015, "bp", 1500, 1.5, 0.0004, 0.005, sr), stopAt, 0.9, sr);
  c.mix(out, c.ring([[lastF, 1], [lastF * 2.3, 0.6], [lastF * 3.9, 0.3], [lastF * 6.1, 0.15]], 0.5, g ? 0.2 : 0.1, sr), stopAt + 0.001, 0.9, sr);
  c.mix(out, c.burst(r, 0.03, "lp", 300, 0.8, 0.001, 0.01, sr), stopAt, 0.7, sr);
  if (p.tail) {
    c.mix(out, c.ring([[g ? 95 : 160, 1], [g ? 143 : 240, 0.6], [g ? 211 : 370, 0.35]], 0.9, g ? 0.35 : 0.2, sr), stopAt + 0.005, 0.5, sr);
    c.mix(out, c.reverb(c.ring([[lastF, 1], [lastF * 2.3, 0.5]], 0.3, 0.08, sr), { size: 0.7, decay: 0.8, mixAmt: 0.8 }, sr), stopAt, 0.4, sr);
  } else {
    const e = c.seconds(0.4, sr), s = Math.floor(stopAt * sr);
    for (let i = s + Math.floor(0.25 * sr); i < n; i++) out[i] *= Math.max(0, 1 - (i - s - 0.25 * sr) / (0.15 * sr));
  }
  c.finish(out, 0.88, 1.1);
  c.fade(out, 12, sr);
  return { samples: out };
}
