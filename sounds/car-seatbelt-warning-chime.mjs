// Seatbelt warning chime: two-note beeps filling the timeline, a struck inharmonic bell (soft) or a gated buzzer with partials (harsh); urgency tightens spacing and raises pitch, ramp swells level, tail adds cabin reverb after the last beep.
export const meta = {
  title: "Belt Reminder", kind: "sfx", format: "sound", duration: 3, price: 2, author: "hollowbody", payout: "hollowbody@creators.oasis.example", kit: "Car Interior",
  description: "An insistent unbuckled-seatbelt reminder: a series of two-note beeps that quicken and rise in level, soft bell or harsh buzzer, for car interiors in games and film.",
  tags: ["seatbelt", "car", "warning", "chime", "beep", "dashboard", "alert", "interior"],
};
export const params = { knobs: {
  tone: { type: "choice", label: "Tone", default: "soft", options: ["soft", "harsh"] },
  urgency: { type: "range", label: "Urgency", default: 0.5, min: 0, max: 1, step: 0.01 },
  ramp: { type: "range", label: "Volume ramp", default: 0.5, min: 0, max: 1, step: 0.01 },
  rate: { type: "range", label: "Rate", default: 1, min: 0.6, max: 1.6, step: 0.05 },
  pitch: { type: "range", label: "Pitch", default: 0.5, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Cabin tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + 29), total = 3, N = c.seconds(total, sr), out = new Float32Array(N);
  const base = 880 * Math.pow(2, (p.pitch - 0.5) * 1.2), harsh = p.tone === "harsh";
  const tEnd = 2.4;
  let t = 0.06;
  while (t < tEnd) {
    const prog = t / tEnd;
    const f = base * (1 + 0.18 * p.urgency * prog) * (0.997 + r() * 0.006);
    const lvl = (1 - p.ramp * 0.75 * (1 - prog)) * (0.92 + r() * 0.08);
    for (let j = 0; j < 2; j++) {
      const ff = f * (j ? 1.26 : 1), len = harsh ? 0.12 : 0.22, n = c.seconds(len, sr);
      let body;
      if (harsh) {
        body = c.osc("square", ff, n, sr, { duty: 0.35 });
        const lp = c.biquad("lp", 3600, 1.4, sr), e = c.adsr(n, { attack: 0.002, sustain: 0.85, decay: 0.02, punch: 0.3 }, sr);
        for (let i = 0; i < n; i++) body[i] = lp(body[i]) * e[i] * (0.75 + 0.25 * Math.sin(i / sr * 1195));
        c.mix(body, c.ring([[ff * 2.76, 0.3], [ff * 5.4, 0.15]], len, 0.03, sr), 0, 0.4, sr);
      } else {
        body = c.ring([[ff, 1], [ff * 2.76, 0.3], [ff * 5.4, 0.1]], len, 0.08, sr);
      }
      c.mix(body, c.burst(r, 0.004, "bp", ff * 3, 2, 0.0003, 0.0015, sr), 0, 0.25, sr);
      c.mix(out, body, t + j * (harsh ? 0.12 : 0.1), 0.6 * lvl * (j ? 0.9 : 1), sr);
    }
    const per = c.clamp((0.6 - 0.32 * p.urgency * (0.4 + 0.6 * prog)) / p.rate, 0.28, 0.6);
    t += per * (0.98 + r() * 0.04);
  }
  c.filter(out, c.biquad("lp", harsh ? 6000 : 5500, 0.7, sr));
  let res = out;
  if (p.tail) {
    const wet = c.reverb(out, { size: 0.3, decay: 0.45, mixAmt: 0.3 }, sr);
    res = new Float32Array(N);
    for (let i = 0; i < N; i++) res[i] = wet[i] || 0;
  }
  c.fade(c.finish(res, 0.85, 1.1), 12, sr);
  return { samples: res };
}
