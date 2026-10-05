// Power switch on: switch snap (rocker = one rounded rock, toggle = lever throw plus spring detent), relay thunk with contact chatter, speaker pop, then a buzzy mains hum that swells and dies; length follows the hum-rise knob, and the tail adds a real room decay.
export const meta = {
  title: "Power Switch On", kind: "foley", format: "sound", duration: 0.8, price: 2, author: "kickdrum", payout: "kickdrum@creators.oasis.example", kit: "Drum Machine", description: "A rocker or toggle power switch thrown on: crisp switch snap, relay thunk with chatter, speaker pop and a hum that swells in and fades; for powering up a drum machine or rack.",
  tags: ["power", "switch", "relay", "pop", "hum", "foley", "studio", "drum machine"],
};
export const params = { knobs: {
  switch: { type: "choice", label: "Switch", default: "rocker", options: ["rocker", "toggle"] },
  pop: { type: "range", label: "Speaker pop", default: 0.5, min: 0, max: 1, step: 0.01 },
  hum: { type: "range", label: "Hum rise", default: 0.5, min: 0, max: 1, step: 0.01 },
  relay: { type: "range", label: "Relay", default: 0.6, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Room tail", default: false },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + (p.switch === "toggle" ? 91 : 13));
  const rock = p.switch === "rocker", rl = p.relay, hm = p.hum;
  const t1 = (rock ? 0.075 : 0.065) + r() * 0.015, t2 = t1 + 0.065, t3 = t2 + 0.015;
  const rise = 0.05 + 0.3 * hm, humLen = rise + 0.15 + 0.25 * hm;
  const body = t3 + humLen + 0.05, pad = p.tail ? 0.7 : 0;
  const n = c.seconds(body + pad, sr), out = new Float32Array(n);
  const f0 = (rock ? 650 : 1250) * (0.97 + r() * 0.06);
  c.mix(out, c.burst(r, 0.01, "bp", (rock ? 2600 : 4200) * (0.95 + r() * 0.1), 1.2, 0.0004, rock ? 0.004 : 0.0025, sr), 0, 1, sr);
  c.mix(out, c.burst(r, 0.004, "hp", 6000, 0.7, 0.0003, 0.001, sr), 0, 0.6, sr);
  c.mix(out, c.ring([[f0, 1], [f0 * 2.35, 0.45], [f0 * 4.4, 0.25]], 0.07, rock ? 0.018 : 0.01, sr), 0.0005, 0.6, sr);
  if (rock) {
    c.mix(out, c.burst(r, 0.014, "lp", 1100, 0.8, 0.001, 0.006, sr), 0.001, 0.5, sr);
    c.mix(out, c.burst(r, 0.006, "hp", 4500, 0.8, 0.0003, 0.0015, sr), 0.03, 0.3, sr);
  } else {
    c.mix(out, c.ring([[2100, 0.6], [3300, 0.4], [5400, 0.2]], 0.04, 0.007, sr), 0.02, 0.5, sr);
    c.mix(out, c.burst(r, 0.008, "bp", 5600, 2, 0.0003, 0.002, sr), 0.02, 0.6, sr);
    c.mix(out, c.burst(r, 0.006, "hp", 7000, 0.8, 0.0003, 0.0012, sr), 0.034, 0.35, sr);
  }
  c.mix(out, c.ring([[150 + 30 * r(), 1], [310, 0.5], [920, 0.3 * rl]], 0.12, 0.025, sr), t1, 0.1 + 0.6 * rl, sr);
  c.mix(out, c.ring([[2300 + 300 * r(), 0.5], [3700, 0.35], [5200, 0.2]], 0.04, 0.008, sr), t1, 0.15 + 0.7 * rl, sr);
  c.mix(out, c.burst(r, 0.012, "bp", 2200, 1.5, 0.0004, 0.004, sr), t1, 0.25 + 0.7 * rl, sr);
  const chat = 1 + Math.round(3 * rl);
  for (let k = 0; k < chat; k++) c.mix(out, c.burst(r, 0.005, "hp", 3500 + 2500 * r(), 1, 0.0003, 0.0014, sr), t1 + 0.012 + k * 0.008 + 0.005 * r(), (0.15 + 0.5 * rl) * (1 - 0.15 * k), sr);
  const pn = c.seconds(0.14, sr), po = c.osc("sine", (t) => 55 + 60 * Math.exp(-t * 40), pn, sr), pe = c.env(pn, 0.002, 0.035, sr);
  for (let i = 0; i < pn; i++) po[i] *= pe[i];
  c.mix(out, po, t2, 0.1 + 0.7 * p.pop, sr);
  c.mix(out, c.burst(r, 0.025, "bp", 1600, 0.7, 0.0008, 0.007, sr), t2, 0.6 * p.pop, sr);
  c.mix(out, c.burst(r, 0.012, "hp", 3200, 0.7, 0.0005, 0.003, sr), t2, 0.4 * p.pop, sr);
  const hn = c.seconds(humLen, sr), hum = new Float32Array(hn), h0 = r() < 0.5 ? 100 : 120;
  const hl = c.biquad("bp", 1400, 0.8, sr), nz = c.pink(r, hn), tw = c.TAU * h0 / sr, tau = 0.08 + 0.15 * hm;
  for (let i = 0; i < hn; i++) {
    const t = i / sr, u = Math.min(1, t / rise), a = u * u * (3 - 2 * u) * Math.exp(-Math.max(0, t - rise) / tau) * Math.min(1, (humLen - t) / 0.06);
    let s = 0;
    for (let h = 1; h <= 8; h++) s += Math.sin(tw * h * i + h) / h;
    hum[i] = (s * 0.7 + hl(nz[i]) * 0.5) * a * (1 + 0.08 * Math.sin(t * 23));
  }
  c.mix(out, hum, t3, 0.08 + 0.5 * hm, sr);
  c.filter(out, c.biquad("hp", 70, 0.7, sr));
  let w = out;
  if (p.tail) {
    c.finish(out, 0.9, 1);
    w = c.reverb(out, { size: 0.45, decay: 0.5, mixAmt: 0.4 }, sr);
  }
  const f = c.seconds(p.tail ? 0.25 : 0.04, sr);
  for (let i = 0; i < f; i++) w[n - f + i] *= 1 - i / f;
  c.fade(w, 4, sr);
  c.finish(w, 0.85, 1.1);
  return { samples: w };
}
