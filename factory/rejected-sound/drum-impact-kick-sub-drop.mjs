// Sub kick drop: a stepped-sweep sine body from a high thump down to a sub floor, a post-drive clean sub that rings long, a beater click and mid knock, plus a boomy low-passed reverb tail whose scale comes from size.
export const meta = {
  title: "Sub Kick Drop", kind: "impact", format: "sound", duration: 3, price: 3, author: "kickdrum", payout: "kickdrum@creators.oasis.example", kit: "Drum Machine", description: "A huge analogue sub kick for trailer hits: a plunging sine body from a punchy start pitch to a deep floor, a beater click, a long sub boom and a room, arena or cinematic tail.",
  tags: ["kick", "sub", "drop", "trailer", "impact", "drum machine", "cinematic", "boom"],
};
export const params = { knobs: {
  size: { type: "choice", label: "Size", default: "arena", options: ["room", "arena", "cinematic"] },
  sub: { type: "range", label: "Sub", default: 0.7, min: 0, max: 1, step: 0.01 },
  distortion: { type: "range", label: "Distortion", default: 0.35, min: 0, max: 1, step: 0.01 },
  sweep: { type: "range", label: "Sweep", default: 0.6, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + 29), n = c.seconds(3, sr);
  const si = p.size === "room" ? 0 : p.size === "arena" ? 1 : 2;
  const decay = [0.45, 0.9, 1.5][si], floor = 28 + 10 * (1 - p.sub) + r() * 2;
  const top = floor * (1.5 + 5 * p.sweep) * (0.97 + r() * 0.06), sweepT = 0.03 + 0.12 * p.sweep + 0.03 * si;
  const len = Math.min(n, c.seconds(decay * 3.2 + 0.2, sr));
  const body = new Float32Array(n), sub = new Float32Array(n);
  let ph = 0, ph2 = 0;
  for (let i = 0; i < len; i++) {
    const t = i / sr, f = floor + (top - floor) * Math.exp(-t / sweepT);
    ph += c.TAU * f / sr;
    ph2 += c.TAU * (floor * 0.95 + 8 * Math.exp(-t / 0.25)) / sr;
    body[i] = Math.sin(ph) * Math.min(1, t / 0.0015) * (0.6 * Math.exp(-t / 0.09) + 0.4 * Math.exp(-t / (decay * 0.5)));
    sub[i] = Math.sin(ph2) * Math.min(1, t / 0.006) * Math.exp(-t / decay);
  }
  const drive = 1 + 6 * p.distortion, dn = Math.tanh(drive);
  for (let i = 0; i < len; i++) body[i] = Math.tanh(body[i] * drive) / dn;
  const out = new Float32Array(n);
  c.mix(out, body, 0, 0.7, sr);
  c.mix(out, sub, 0, 0.2 + 0.9 * p.sub, sr);
  c.mix(out, c.ring([[140 + r() * 30, 1], [330 + r() * 40, 0.35]], 0.14, 0.035, sr), 0.001, 0.35, sr);
  c.mix(out, c.burst(r, 0.012, "hp", 2200 + r() * 1400, 0.8, 0.0004, 0.003, sr), 0, 0.5, sr);
  c.mix(out, c.burst(r, 0.07, "lp", 300, 0.9, 0.001, 0.025, sr), 0, 0.6, sr);
  c.filter(out, c.biquad("lp", 5000 + 7000 * p.distortion, 0.7, sr));
  if (p.tail) {
    const src = out.slice(0, c.seconds(1.5, sr));
    c.filter(src, c.biquad("lp", 400, 0.7, sr));
    const wet = c.reverb(src, { size: 0.5 + 0.22 * si, decay: 0.6 + 0.2 * si, mixAmt: 1 }, sr), lp = c.biquad("lp", 700 + 400 * si, 0.7, sr);
    for (let i = 0; i < n; i++) out[i] += lp(wet[i] || 0) * (0.5 + 0.4 * si);
  }
  c.fade(out, 80, sr);
  c.finish(out, 0.9, 1.1);
  return { samples: out };
}
