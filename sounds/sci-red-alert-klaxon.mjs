// Red alert klaxon: three rising whoops (seeded exponential pitch glides with scoop and vibrato), grit as drive plus a gentle crush, a PA-speaker band and a comb/allpass room whose tail fills the gaps.
export const meta = {
  title: "Red Alert Klaxon", kind: "sfx", format: "sound", duration: 2.5, price: 3, author: "quietmachine", payout: "quietmachine@creators.oasis.example", kit: "Sci-fi Console", description: "A classic whooping starship red-alert siren cycle with voice, cycle rate, pitch, grit and room as knobs, for bridge emergencies, battle stations and hull-breach scenes.",
  tags: ["alarm", "siren", "red alert", "klaxon", "sci-fi", "starship", "whoop", "warning"],
};
export const params = { knobs: {
  voice: { type: "choice", label: "Voice", default: "whoop", options: ["whoop", "square", "horn"] },
  rate: { type: "range", label: "Cycle rate", default: 1.4, min: 1, max: 3, step: 0.05 },
  pitch: { type: "range", label: "Pitch (Hz)", default: 360, min: 200, max: 700, step: 1 },
  grit: { type: "range", label: "Grit", default: 0.2, min: 0, max: 1, step: 0.01 },
  room: { type: "range", label: "Room reverb", default: 0.35, min: 0, max: 1, step: 0.01 },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
function blep(t, dt) {
  if (t < dt) { t /= dt; return t + t - t * t - 1; }
  if (t > 1 - dt) { t = (t - 1) / dt; return t * t + t + t + 1; }
  return 0;
}
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + params.knobs.voice.options.indexOf(p.voice) * 97 + 3);
  const cyc = 1 / p.rate, whoops = 3, on = cyc * 0.84, t60 = 0.35 + 1.6 * p.room;
  const n = c.seconds(whoops * cyc + 0.08 + 0.55 * t60, sr), out = new Float32Array(n);
  const g = p.grit, drive = 1 + 7 * g, dn = Math.tanh(drive), levels = 6 + 50 * (1 - g), hold = 1 + Math.round(g * 2 * sr / 22050);
  const T = c.TAU;
  for (let w = 0; w < whoops; w++) {
    const depth = Math.log(2.2 + 0.7 * r()), bend = -0.45 + 0.9 * r(), f0 = p.pitch * (0.97 + 0.06 * r());
    const scoop = 0.04 + 0.08 * r(), vr = 4.5 + 3.5 * r(), vd = 0.002 + 0.008 * r(), m = c.seconds(on, sr), buf = new Float32Array(m);
    const fA = c.biquad("bp", 1300 + 500 * r(), 1.2, sr), fB = c.biquad("lp", 3200, 0.7, sr);
    let ph = r(), ph2 = r(), ph3 = r(), held = 0;
    for (let i = 0; i < m; i++) {
      const t = i / sr, x = i / m, s = x * (1 - bend) + x * x * bend;
      const sc = t < 0.04 ? 1 - scoop * (1 - t / 0.04) : 1;
      const f = f0 * sc * Math.exp(depth * s) * (1 + vd * Math.sin(T * vr * t)), dt = f / sr;
      ph += dt; if (ph >= 1) ph -= 1;
      let y;
      if (p.voice === "whoop") {
        y = Math.sin(T * ph) + 0.35 * Math.sin(2 * T * ph) + 0.12 * Math.sin(3 * T * ph);
      } else if (p.voice === "square") {
        const q = ph + 0.5 >= 1 ? ph - 0.5 : ph + 0.5;
        y = 0.7 * ((ph < 0.5 ? 1 : -1) + blep(ph, dt) - blep(q, dt));
      } else {
        const d2 = dt * 1.007, d3 = dt * 0.5;
        ph2 += d2; if (ph2 >= 1) ph2 -= 1; ph3 += d3; if (ph3 >= 1) ph3 -= 1;
        const s1 = 2 * ph - 1 - blep(ph, dt), s2 = 2 * ph2 - 1 - blep(ph2, d2), s3 = 2 * ph3 - 1 - blep(ph3, d3);
        const raw = s1 + 0.8 * s2 + 0.35 * s3;
        y = 1.7 * fA(raw) + 0.45 * fB(raw);
      }
      y = Math.tanh(y * drive) / dn;
      if (g > 0.05) {
        if (i % hold === 0) held = Math.round(y * levels) / levels;
        y = held + g * 0.08 * (r() * 2 - 1) * Math.abs(y);
      }
      const amp = Math.min(1, i / (0.004 * sr)) * (x > 0.85 ? (1 - x) / 0.15 : 1) * (0.72 + 0.28 * x);
      buf[i] = y * amp;
    }
    c.mix(out, buf, w * cyc + r() * 0.005, 0.85 + 0.15 * r(), sr);
  }
  const hp = c.biquad("hp", 170, 0.7, sr), lp = c.biquad("lp", 8500 - 3000 * g, 0.7, sr);
  c.filter(out, (v) => lp(hp(v)));
  const sz = 0.6 + 0.9 * p.room, wet = new Float32Array(n), damp = 0.25 + 0.4 * p.room;
  for (const d0 of [0.0297, 0.0371, 0.0411, 0.0437]) {
    const L = Math.max(1, Math.round(d0 * sz * sr)), fb = Math.exp(-6.9 * d0 * sz / t60), line = new Float32Array(L);
    let k = 0, z = 0;
    for (let i = 0; i < n; i++) { const y = line[k]; z = y + damp * (z - y); line[k] = out[i] + fb * z; wet[i] += y * 0.25; k = k + 1 === L ? 0 : k + 1; }
  }
  for (const d0 of [0.005, 0.0017]) {
    const L = Math.max(1, Math.round(d0 * sr)), line = new Float32Array(L); let k = 0;
    for (let i = 0; i < n; i++) { const b = line[k], v = wet[i] + 0.6 * b; line[k] = v; wet[i] = b - 0.6 * v; k = k + 1 === L ? 0 : k + 1; }
  }
  const mixW = 0.1 + 0.75 * p.room, dry = 1 - 0.35 * p.room;
  for (let i = 0; i < n; i++) out[i] = out[i] * dry + wet[i] * mixW;
  c.fade(c.finish(out, 0.9, 1.1), 10, sr);
  return { samples: out };
}
