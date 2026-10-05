// Office HVAC bed: a low duct rumble, a shaped airflow hiss that tilts with the airflow knob, a clearly tonal fan/whistle line and a rattle of plastic tick clusters. Ceiling vents are bright, with a narrow filter whistle and fast fine ticks; the rooftop unit is a dark compressor drone with blade-pass harmonics pulsing at 6 Hz and slow heavy rattles. All noise beds are equal-power crossfaded; tones, gust and rattle are periodic over the loop. Crossfade off simply leaves the raw noise seam, with no level dip.
export const meta = {
  title: "Aircon Floor Bed", kind: "ambience", format: "sound", duration: 3, price: 4, author: "stormfront", payout: "stormfront@creators.oasis.example", kit: "Office", description: "A loopable open-plan office air-conditioner bed: ceiling vents with hiss and a filter whistle or a rooftop unit with a compressor drone, with airflow, duct rumble, vent rattle and filter tone as knobs, for office floors and waiting rooms.",
  tags: ["aircon", "hvac", "office", "ambience", "loop", "vent", "fan", "room tone"],
};
export const params = { knobs: {
  system: { type: "choice", label: "System size", default: "ceiling vents", options: ["ceiling vents", "rooftop unit"] },
  airflow: { type: "range", label: "Airflow", default: 0.5, min: 0, max: 1, step: 0.01 },
  rumble: { type: "range", label: "Low rumble", default: 0.5, min: 0, max: 1, step: 0.01 },
  rattle: { type: "range", label: "Vent rattle", default: 0.4, min: 0, max: 1, step: 0.01 },
  tone: { type: "range", label: "Filter tone pitch", default: 0.5, min: 0, max: 1, step: 0.01 },
  crossfade: { type: "toggle", label: "Loop crossfade", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + 29), dur = 3, big = p.system === "rooftop unit", a = p.airflow;
  const n = c.seconds(dur, sr), pad = c.seconds(0.45, sr), L = n + pad, out = new Float32Array(L);
  const nz = (b) => { let s = 0; for (let i = 0; i < b.length; i++) s += b[i] * b[i]; const k = 1 / Math.sqrt(s / b.length + 1e-9); for (let i = 0; i < b.length; i++) b[i] *= k; return b; };
  const grid = (f) => Math.max(1, Math.round(f * dur)) / dur;
  const sub = c.brown(r, L), s1 = c.biquad("lp", big ? 80 : 120, 0.9, sr), s2 = c.biquad("bp", big ? 52 : 90, 2.5, sr);
  for (let i = 0; i < L; i++) sub[i] = s1(sub[i]) + 1.5 * s2(sub[i]);
  c.mix(out, nz(sub), 0, 0.1 + 1.1 * p.rumble, sr);
  const mid = c.pink(r, L), m1 = c.biquad("bp", big ? 260 + 300 * a : 700 + 900 * a, 0.8, sr), m2 = c.biquad("lp", big ? 900 : 2500, 0.7, sr);
  for (let i = 0; i < L; i++) mid[i] = m2(m1(mid[i]));
  c.mix(out, nz(mid), 0, (big ? 0.6 : 0.3) * (0.1 + 1.2 * a), sr);
  const hi = c.noise(r, L), h1 = c.biquad("hp", big ? 1500 : 3000, 0.6, sr), h2 = c.biquad("lp", big ? 3500 : 9000, 0.6, sr);
  for (let i = 0; i < L; i++) hi[i] = h2(h1(hi[i]));
  c.mix(out, nz(hi), 0, (big ? 0.04 : 0.28) * a * a * 1.6, sr);
  const wf = (big ? 380 : 1400) * Math.pow(2, p.tone * 1.6), wh = c.noise(r, L), w1 = c.biquad("bp", wf, 30, sr);
  for (let i = 0; i < L; i++) wh[i] = w1(wh[i]);
  c.mix(out, nz(wh), 0, (big ? 0.12 : 0.3) * (0.3 + a), sr);
  const res = new Float32Array(n);
  for (let i = 0; i < n; i++) res[i] = out[i];
  if (p.crossfade) for (let i = 0; i < pad; i++) { const k = i / pad * 1.5707963; res[i] = out[i] * Math.sin(k) + out[n + i] * Math.cos(k); }
  const p1 = r() * 6.28, p2 = r() * 6.28, f0 = grid((big ? 55 : 150) * Math.pow(2, p.tone * (big ? 1.2 : 1.5)));
  const hum = grid(big ? 60 : 120), w = c.TAU * f0 / sr, wm = c.TAU * hum / sr, tg = big ? 0.35 : 0.14;
  for (let i = 0; i < n; i++) {
    const t = i / n, gust = 1 + 0.12 * Math.sin(c.TAU * t + p1) + 0.06 * Math.sin(c.TAU * 2 * t + p2);
    let tn = 0;
    if (big) { const pulse = 0.65 + 0.35 * Math.sin(c.TAU * 18 * t + p1); for (let k = 1; k <= 6; k++) tn += Math.sin(w * k * i + k) / Math.pow(k, 0.7); tn *= pulse; }
    else tn = Math.sin(w * i) * 0.6 + 0.35 * Math.sin(2 * w * i + 1) + 0.15 * Math.sin(3 * w * i);
    tn += 0.5 * Math.sin(wm * i + p2) + 0.25 * Math.sin(2 * wm * i);
    res[i] = res[i] * gust + tg * (0.4 + 0.6 * p.tone) * tn;
  }
  const tail = c.seconds(0.15, sr), rt = new Float32Array(n + tail), clusters = big ? 3 : 5;
  for (let q = 0; q < clusters; q++) {
    const t0 = (q + 0.2 + 0.6 * r()) * dur / clusters, fr = (big ? 450 : 1500) + r() * 1500, cnt = 8 + Math.round(r() * 8), sp = big ? 0.03 : 0.015;
    for (let d = 0; d < cnt; d++) c.mix(rt, c.ring([[fr * (0.9 + 0.2 * r()), 1], [fr * 1.7, 0.4], [fr * 2.9, 0.15]], 0.07, 0.01 + r() * 0.015, sr), t0 + d * (sp + 0.012 * r()), (0.4 + 0.6 * r()) * (0.05 + 1.3 * p.rattle) * (big ? 0.6 : 0.9), sr);
  }
  for (let i = 0; i < n + tail; i++) res[i % n] += rt[i];
  c.finish(res, 0.8, 1.05);
  c.fade(res, 10, sr);
  return { samples: res };
}
