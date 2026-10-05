// Knob turn: a rotary pot twisted by hand. Detents are the main event (pre-tick, snap, body knock, tiny ring per notch) over a quiet scrape bed made of discrete friction grains whose rate follows hand speed; smooth pots get a ratcheting wiper crackle, stiff ones a stick-slip creak. The travel ends on a stop knock that sits inside the gesture.
export const meta = {
  title: "Detent Knob Turn", kind: "foley", format: "sound", duration: 0.8, price: 1, author: "kickdrum", payout: "kickdrum@creators.oasis.example", kit: "Drum Machine", description: "A rotary pot or detented knob being twisted, smooth with wiper crackle, clicking through countable steps or stiff and creaky; for synth and drum machine interface foley, hardware UI and tactile cutscene details.",
  tags: ["knob", "pot", "rotary", "detent", "click", "twist", "hardware", "synth"],
};
export const params = { knobs: {
  knob: { type: "choice", label: "Knob", default: "detented", options: ["smooth", "detented", "stiff"] },
  speed: { type: "range", label: "Speed", default: 0.5, min: 0, max: 1, step: 0.01 },
  steps: { type: "range", label: "Steps", default: 8, min: 1, max: 20, step: 1 },
  scrape: { type: "range", label: "Scrape", default: 0.4, min: 0, max: 1, step: 0.01 },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + params.knobs.knob.options.indexOf(p.knob) * 71 + 3);
  const kind = p.knob, steps = Math.round(p.steps), stiff = kind === "stiff", smooth = kind === "smooth";
  const turn = Math.min(0.7 - 0.3 * p.speed, 0.05 + steps * 0.045 + (smooth ? 0.25 : 0));
  const n = c.seconds(turn + 0.2, sr), out = new Float32Array(n);
  const vel = (t) => { const u = t / turn; return u <= 0 || u >= 1 ? 0 : Math.pow(Math.sin(Math.PI * u), 0.5); };
  const sc = 0.25 + 0.75 * p.scrape;
  const gn = Math.round((25 + 90 * p.scrape) * turn / 0.5 * (stiff ? 1.4 : smooth ? 2.2 : 1));
  for (let k = 0; k < gn; k++) {
    const t = r() * turn, v = vel(t);
    const f = (smooth ? 3000 : stiff ? 1200 : 2200) + r() * 2500 * (0.4 + v);
    c.mix(out, c.burst(r, 0.003 + r() * 0.005, "bp", f, 3, 0.0003, 0.0008 + r() * 0.0015, sr), t, (0.06 + 0.2 * r()) * v * sc * (smooth ? 1.3 : 0.8), sr);
  }
  if (smooth) {
    const wp = Math.round(turn * (50 + 60 * p.speed));
    for (let k = 0; k < wp; k++) {
      const t = (k + 0.3 + 0.4 * r()) / wp * turn, v = vel(t);
      c.mix(out, c.ring([[1500 + 600 * r(), 1], [3100 + 500 * r(), 0.4]], 0.015, 0.004, sr), t, 0.2 * v * (0.4 + 0.6 * sc), sr);
    }
  }
  if (stiff) {
    const m = c.seconds(turn, sr), f0 = 240 + 160 * r(), creak = new Float32Array(m), seg = Math.round(sr * 0.03);
    let ph = 0, slip = 1, ramp = 0;
    for (let i = 0; i < m; i++) {
      if (i % seg === 0) { slip = r() < 0.6 ? 1 : 0.1; ramp = 0; }
      ramp = Math.min(1, ramp + 1 / (0.002 * sr));
      const v = vel(i / sr);
      ph += c.TAU * f0 * (1 + 0.5 * v) * (1 + 0.04 * Math.sin(i / sr * 70)) / sr;
      creak[i] = (Math.sin(ph) + 0.5 * Math.sin(2.02 * ph) + 0.3 * Math.sin(3.1 * ph)) * slip * ramp * Math.exp(-(i % seg) / sr / 0.025) * v;
    }
    c.mix(out, creak, 0, 0.12 + 0.2 * p.scrape, sr);
  }
  const clicks = smooth ? 0 : steps;
  for (let k = 0; k < clicks; k++) {
    const t = 0.012 + (turn - 0.03) * (clicks > 1 ? k / (clicks - 1) : 0.5) + (r() - 0.5) * 0.002;
    const lvl = (0.75 + 0.25 * r()) * (stiff ? 0.7 : 1), fk = 1 + (r() - 0.5) * 0.12;
    c.mix(out, c.burst(r, 0.005, "bp", 2500 * fk, 1.5, 0.002, 0.002, sr), t - 0.005, 0.2 * lvl, sr);
    c.mix(out, c.burst(r, 0.006, "hp", 3500 * fk, 1, 0.0003, 0.0014, sr), t, 0.9 * lvl, sr);
    c.mix(out, c.ring([[(stiff ? 520 : 900) * fk, 1], [2300 * fk, 0.45], [3700 * fk, 0.2]], 0.03, 0.007, sr), t + 0.0004, 0.7 * lvl, sr);
    c.mix(out, c.burst(r, 0.015, "lp", 450, 0.9, 0.0008, 0.005, sr), t + 0.002, 0.45 * lvl, sr);
  }
  const te = turn + 0.004;
  c.mix(out, c.ring([[170 + 20 * r(), 1], [340, 0.4]], 0.08, 0.02, sr), te, smooth ? 0.2 : 0.35, sr);
  if (!smooth) c.mix(out, c.burst(r, 0.008, "hp", 2500, 1, 0.0005, 0.002, sr), te, 0.25, sr);
  c.fade(c.finish(out, 0.85, 1.1), 6, sr);
  return { samples: out };
}
