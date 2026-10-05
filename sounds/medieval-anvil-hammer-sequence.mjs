// Anvil hammer run: rhythmic blacksmith blows on hot iron. Each blow layers a hammer-on-iron thump (low body), a bright contact tick, the anvil's inharmonic ring (a few modal partials, upper ones dying faster, per-hit strength and detune) and a dull workpiece clank; the tail toggle adds a short smithy-room reverb.
export const meta = {
  title: "Anvil Hammer Run", kind: "sfx", format: "sound", duration: 3, price: 4, author: "hollowbody", payout: "hollowbody@creators.oasis.example", kit: "Medieval Market", description: "A rhythmic run of blacksmith hammer blows on hot iron, with hammer weight, tempo, force, irregularity, anvil ring and a smithy tail as knobs; for forge scenes and market backdrops.",
  tags: ["blacksmith", "anvil", "hammer", "forge", "medieval", "metal", "impact", "market"],
};
export const params = { knobs: {
  weight: { type: "choice", label: "Hammer", default: "light", options: ["light", "heavy"] },
  tempo: { type: "range", label: "Tempo", default: 2.5, min: 1, max: 5, step: 0.05 },
  force: { type: "range", label: "Force", default: 0.6, min: 0, max: 1, step: 0.01 },
  irregularity: { type: "range", label: "Irregularity", default: 0.25, min: 0, max: 1, step: 0.01 },
  ring: { type: "range", label: "Metal ring", default: 0.6, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Smithy tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + 29), heavy = p.weight === "heavy";
  const total = 3, out = new Float32Array(c.seconds(total, sr));
  const pitch = heavy ? 0.6 : 1, base = 900 * pitch * (0.97 + r() * 0.06);
  const partials = [1, 2.32, 3.87, 5.41, 7.13];
  const size = heavy ? 1.35 : 1;
  const tau = (0.025 + 0.075 * p.ring) * size;
  const interval = 1 / p.tempo;
  let t = 0.03, k = 0, accent = 1;
  while (t < total - 0.4 && k < 16) {
    const f = Math.max(0.15, p.force * (0.75 + 0.25 * r())) * accent;
    const g = 0.4 + 0.6 * f;
    c.mix(out, c.ring([[(heavy ? 62 : 105) * (0.95 + r() * 0.1), 1], [(heavy ? 130 : 230), 0.4]], 0.16, heavy ? 0.05 : 0.025, sr), t, 0.75 * g, sr);
    c.mix(out, c.burst(r, 0.006, "hp", 2800 + 3500 * f, 0.8, 0.0004, 0.0018, sr), t, 0.55 * g, sr);
    c.mix(out, c.burst(r, 0.025, "lp", heavy ? 500 : 900, 0.9, 0.0008, 0.007, sr), t, 0.35 * g, sr);
    for (let i = 0; i < partials.length; i++) {
      const fr = base * partials[i] * (0.994 + r() * 0.012);
      const a = (i === 0 ? 1 : 0.5 + 0.5 * r()) / (1 + i * 0.45);
      const d = tau * (0.8 + 0.4 * r()) / (1 + i * 0.5);
      c.mix(out, c.ring([[fr, 1]], d * 7, d, sr), t + 0.0005, (0.1 + 0.6 * p.ring) * (0.35 + 0.65 * f) * a, sr);
    }
    c.mix(out, c.ring([[base * 0.43, 0.6], [base * 0.91, 0.4]], 0.07, 0.016, sr), t + 0.002, 0.3 * g * (1 - 0.5 * p.ring), sr);
    c.mix(out, c.burst(r, 0.03, "bp", 1100 * pitch, 2, 0.001, 0.008, sr), t + 0.001, 0.2 * g, sr);
    const jitter = 1 + (r() - 0.5) * 1.1 * p.irregularity;
    t += interval * jitter * (r() < 0.15 * p.irregularity ? 1.6 : 1);
    accent = r() < 0.25 * p.irregularity ? 0.55 : 1;
    k++;
  }
  let res = out;
  if (p.tail) {
    const wet = c.reverb(out, { size: 0.4, decay: 0.4, mixAmt: 0.18 }, sr);
    res = wet && wet.length ? wet : out;
  }
  const buf = new Float32Array(out.length);
  for (let i = 0; i < buf.length; i++) buf[i] = res[i] || 0;
  c.filter(buf, c.biquad("hp", 50, 0.7, sr));
  const endFade = c.seconds(p.tail ? 0.3 : 0.08, sr);
  for (let i = 0; i < endFade; i++) buf[buf.length - 1 - i] *= i / endFade;
  c.finish(buf, 0.88, 1.1);
  c.fade(buf, 3, sr);
  return { samples: buf };
}
