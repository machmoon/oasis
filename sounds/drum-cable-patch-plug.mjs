// Jack patch: a 1/4-inch plug going into or out of a socket. Insert = tip/sleeve scrape, then the barrel seats (click-ring, hand thump, mains hum pop, stuttering contact buzz). Pull = the grip releases first (click, thump, pop, buzz), then the plug slides out and fades.
export const meta = {
  title: "Jack Patch Plug", kind: "foley", format: "sound", duration: 0.5, price: 1, author: "kickdrum", payout: "kickdrum@creators.oasis.example", kit: "Drum Machine",
  description: "A 1/4-inch jack plugged into or pulled from a socket, with a hum pop and contact buzz; use it for studio rigs, patch-bay moments and drum machine boot-ups.",
  tags: ["jack", "cable", "plug", "patch", "hum", "pop", "studio", "foley"],
};
export const params = { knobs: {
  action: { type: "choice", label: "Action", default: "insert", options: ["insert", "pull"] },
  force: { type: "range", label: "Force", default: 0.5, min: 0, max: 1, step: 0.01 },
  hum: { type: "range", label: "Hum pop", default: 0.5, min: 0, max: 1, step: 0.01 },
  buzz: { type: "range", label: "Buzz", default: 0.4, min: 0, max: 1, step: 0.01 },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + (p.action === "pull" ? 97 : 11)), out = new Float32Array(c.seconds(0.5, sr));
  const ins = p.action === "insert", f = p.force;
  const slide = 0.06 + 0.04 * (1 - f);
  const scr = c.seconds(slide, sr), s = c.noise(r, scr), bp = c.biquad("bp", 3200 + 1500 * r(), 2.5, sr);
  let g = 1;
  for (let i = 0; i < scr; i++) {
    if (i % 90 === 0) g = 0.3 + 0.7 * r();
    const u = i / scr, shape = ins ? 0.4 + 0.6 * u : 0.8 * (1 - u) * (1 - u);
    s[i] = bp(s[i]) * g * shape * Math.min(1, i / (0.004 * sr)) * (r() < 0.85 ? 1 : 0.2);
  }
  const tc = ins ? 0.005 + slide : 0.012;
  c.mix(out, s, ins ? 0.005 : tc + 0.006, ins ? 0.45 : 0.4, sr);
  const k = 1 + 0.03 * (r() - 0.5);
  c.mix(out, c.ring([[2350 * k, 1], [3870 * k, 0.55], [6100 * k, 0.3], [930 * k, 0.4]], 0.16, ins ? 0.03 : 0.045, sr), tc, 0.3 + 0.4 * f, sr);
  c.mix(out, c.burst(r, 0.006, "hp", 2500, 0.8, 0.0004, 0.002, sr), tc, 0.5 + 0.4 * f, sr);
  c.mix(out, c.ring([[ins ? 120 - 30 * f : 150, 1], [ins ? 230 : 290, 0.3]], 0.15, 0.03 + 0.03 * f, sr), tc, 0.35 + 0.5 * f, sr);
  const hn = c.seconds(0.3, sr), h = new Float32Array(hn), hf = 50 + (r() < 0.5 ? 0 : 10);
  for (let i = 0; i < hn; i++) {
    const t = i / sr, e = Math.exp(-t / 0.07) * Math.min(1, t / 0.0015);
    h[i] = e * (Math.sin(c.TAU * hf * t) + 0.5 * Math.sin(c.TAU * hf * 2 * t + 1) + 0.3 * Math.sin(c.TAU * hf * 3 * t + 2) + 0.15 * Math.sin(c.TAU * hf * 5 * t));
  }
  c.mix(out, h, tc, 0.9 * p.hum, sr);
  const bn = c.seconds(0.2, sr), b = new Float32Array(bn), hz = c.biquad("hp", 700, 0.7, sr), step = Math.round(sr * 0.009);
  let gate = 0;
  for (let i = 0; i < bn; i++) {
    const t = i / sr;
    if (i % step === 0) gate = r() < 0.8 * Math.exp(-t / 0.1) + 0.05 ? 1 : 0;
    const x = Math.sin(c.TAU * 100 * t) > 0 ? 1 : -1;
    b[i] = hz(x * 0.6 + (r() * 2 - 1) * 0.5) * gate * Math.exp(-t / 0.09) * Math.min(1, t / 0.001);
  }
  c.mix(out, b, tc + 0.002, 0.6 * p.buzz, sr);
  c.fade(c.finish(out, 0.85, 1.1), 8, sr);
  return { samples: out };
}
