// Car indicator: one turn-signal relay tick-tock pair. Mechanical = a bright plastic relay click plus a small metal-can resonance, then a lower, woodier "tock" of the armature returning on a ringing dash body; digital = a clean synthetic tick and a softer pitched blip. The pair is rendered tight, with rate setting the tick-to-tock spacing, so the file carries no dead air. A short dark cabin reflection is opt-in.
export const meta = {
  title: "Indicator Tick-Tock", kind: "sfx", format: "sound", duration: 0.5, price: 2, author: "hollowbody", payout: "hollowbody@creators.oasis.example", kit: "Car Interior", description: "A car turn-signal relay tick-tock pair, mechanical or digital, with sharpness, tock body, blink rate and an optional cabin tail; each seed is a slightly different click for dashboards and cockpit scenes.",
  tags: ["car", "indicator", "turn signal", "relay", "tick", "interior", "blinker", "vehicle"],
};
export const params = { knobs: {
  relay: { type: "choice", label: "Relay type", default: "mechanical", options: ["mechanical", "digital"] },
  sharpness: { type: "range", label: "Click sharpness", default: 0.6, min: 0, max: 1, step: 0.01 },
  body: { type: "range", label: "Tock body", default: 0.5, min: 0, max: 1, step: 0.01 },
  rate: { type: "range", label: "Rate (Hz)", default: 1.6, min: 1, max: 3, step: 0.05 },
  cabin: { type: "toggle", label: "Cabin reverb tail", default: false },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + (p.relay === "digital" ? 91 : 17));
  const spacing = 0.07 + 0.17 / p.rate, t0 = 0.01;
  const total = t0 + spacing + 0.24 + (p.cabin ? 0.08 : 0), out = new Float32Array(c.seconds(total, sr));
  const mech = p.relay === "mechanical", sh = p.sharpness, bd = p.body;
  const tick = (t, g, tock) => {
    const v = 0.9 + r() * 0.2;
    if (mech) {
      const f = tock ? 1 : 1.6;
      c.mix(out, c.burst(r, 0.008, "hp", (tock ? 1800 : 2600) + 3500 * sh, 0.8, 0.0004, 0.002 + 0.002 * (1 - sh), sr), t, g * (0.6 + 0.4 * sh) * v, sr);
      c.mix(out, c.ring([[2300 * f * (0.96 + r() * 0.08), 0.6], [3700 * f * (0.98 + r() * 0.04), 0.4], [5600 * f, 0.25]], 0.07, 0.01 + 0.012 * (1 - sh), sr), t + 0.0005, (tock ? 0.3 : 0.55) * g, sr);
      if (tock) {
        const k = 130 + 70 * (1 - bd);
        c.mix(out, c.ring([[k * (0.95 + r() * 0.1), 1], [k * 2.3 * (0.98 + r() * 0.04), 0.45], [k * 3.7, 0.2]], 0.22, 0.03 + 0.07 * bd, sr), t + 0.001, (0.4 + 0.75 * bd) * g, sr);
      }
    } else {
      const n = c.seconds(tock ? 0.12 + 0.06 * bd : 0.06, sr);
      const f0 = (tock ? 900 - 300 * bd : 2600 + 1500 * sh) * (0.97 + r() * 0.06);
      const o = c.osc("sine", (tt) => f0 * (1 + 0.3 * Math.exp(-tt * 120)), n, sr), e = c.env(n, 0.0008 + 0.002 * (1 - sh), tock ? 0.025 + 0.05 * bd : 0.012, sr);
      for (let i = 0; i < n; i++) o[i] *= e[i];
      c.mix(out, o, t, 0.8 * g * v, sr);
      c.mix(out, c.burst(r, 0.003, "hp", 4000 + 4000 * sh, 0.7, 0.0003, 0.001, sr), t, (0.1 + 0.3 * sh) * g, sr);
    }
  };
  tick(t0, 1, false);
  tick(t0 + spacing + (r() - 0.5) * 0.004, 0.9, true);
  let res = out;
  if (p.cabin) {
    const w = c.reverb(out.slice(), { size: 0.15, decay: 0.08, mixAmt: 1 }, sr);
    c.filter(w, c.biquad("lp", 3500, 0.7, sr));
    res = new Float32Array(out.length);
    for (let i = 0; i < out.length; i++) res[i] = out[i] + 0.25 * (w[i] - out[i]);
  }
  c.filter(res, c.biquad("hp", 120, 0.7, sr));
  c.fade(c.finish(res, 0.85, 1.1), 8, sr);
  return { samples: res };
}
