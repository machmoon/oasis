// Car idle at lights: a steady cabin bed (engine idle pulses at 22 Hz, broadband HVAC air with a vent whistle, tyre-hiss road wash), muffled pass-by whooshes with a rising/falling band and Doppler-ish engine drone, and audible two-tone horns. Window cracked opens the high band and adds outside air. Events wrap around the loop; the bed stays level at all settings.
export const meta = {
  title: "Idling At Lights", kind: "ambience", format: "sound", duration: 3, price: 4, author: "stormfront", payout: "stormfront@creators.oasis.example", kit: "Car Interior", description: "A loopable stopped-at-the-lights car interior: a low engine idle, HVAC fan, muffled traffic passing outside and distant horns, with the window closed or cracked.",
  tags: ["car", "interior", "traffic", "idle", "hvac", "city", "ambience", "loop"],
};
export const params = { knobs: {
  window: { type: "choice", label: "Window", default: "closed", options: ["closed", "cracked"] },
  traffic: { type: "range", label: "Traffic density", default: 0.5, min: 0, max: 1, step: 0.01 },
  fan: { type: "range", label: "HVAC fan", default: 0.4, min: 0, max: 1, step: 0.01 },
  idle: { type: "range", label: "Engine idle", default: 0.5, min: 0, max: 1, step: 0.01 },
  horns: { type: "range", label: "Distant horns", default: 0.3, min: 0, max: 1, step: 0.01 },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + 29), dur = 3, n = c.seconds(dur, sr), out = new Float32Array(n);
  const open = p.window === "cracked" ? 1 : 0;
  const add = (x, start, g) => { const s = Math.floor(start * sr); for (let i = 0; i < x.length; i++) out[(s + i) % n] += x[i] * g; };
  const idle = new Float32Array(n);
  for (let k = 0; k < 66; k++) {
    const t = k / 22 + (r() - 0.5) * 0.002, a = 0.75 + 0.25 * r();
    const m = c.seconds(0.07, sr), x = c.ring([[44, 1], [88, 0.7], [132, 0.6], [220, 0.4], [330, 0.25], [440, 0.12]], 0.07, 0.018, sr);
    for (let i = 0; i < m; i++) idle[(Math.floor(t * sr) + i) % n] += x[i] * a;
  }
  c.filter(idle, c.biquad("lp", 700, 0.8, sr));
  c.mix(out, idle, 0, 0.12 + 0.3 * p.idle, sr);
  const rum = c.brown(r, n); c.filter(rum, c.biquad("lp", 110, 0.7, sr));
  c.mix(out, rum, 0, 0.1 + 0.15 * p.idle, sr);
  const air = c.pink(r, n), hp = c.biquad("hp", 700, 0.7, sr), lp = c.biquad("lp", 3500 + 5000 * p.fan, 0.7, sr);
  for (let i = 0; i < n; i++) air[i] = lp(hp(air[i]));
  c.mix(out, air, 0, 0.3 + 0.7 * p.fan, sr);
  const vent = c.osc("sine", 1800 + 400 * p.fan, n, sr), vent2 = c.osc("sine", 2650 + 300 * p.fan, n, sr);
  for (let i = 0; i < n; i++) vent[i] = vent[i] + 0.5 * vent2[i];
  c.mix(out, vent, 0, 0.01 + 0.05 * p.fan, sr);
  const road = c.pink(r, n); c.filter(road, c.biquad("bp", 600 + 900 * open, 0.5, sr));
  c.mix(out, road, 0, 0.12 + 0.2 * p.traffic + 0.2 * open, sr);
  const hiss = c.noise(r, n); c.filter(hiss, c.biquad("bp", 3500, 0.6, sr));
  c.mix(out, hiss, 0, 0.1 * open * (0.4 + p.traffic), sr);
  const cars = Math.round(2 + 4 * p.traffic), cut = 500 + 1500 * open;
  for (let k = 0; k < cars; k++) {
    const len = 0.7 + r() * 0.7, m = c.seconds(len, sr), x = c.pink(r, m), f = c.onepole(sr), d = c.osc("saw", (k % 2 ? 60 : 90) + r() * 30, m, sr), fd = c.onepole(sr);
    const start = (k + r() * 0.6) / cars * dur, g = (0.5 + 0.5 * r()) * (0.5 + 0.6 * p.traffic), hi = cut * (0.8 + 0.6 * r());
    for (let i = 0; i < m; i++) {
      const sh = Math.sin(Math.PI * i / m), s2 = sh * sh;
      x[i] = (f(x[i], hi * (0.3 + 1.5 * sh)) * 1.5 + fd(d[i], 250 + 300 * sh) * 0.5) * s2;
    }
    add(x, start, g * 1.3);
  }
  const blasts = Math.round(p.horns * 3 + 0.4);
  for (let h = 0; h < blasts; h++) {
    const len = 0.3 + r() * 0.3, m = c.seconds(len, sr), f0 = 400 + r() * 100, x = new Float32Array(m);
    const a = c.osc("saw", f0, m, sr), b = c.osc("saw", f0 * 1.26, m, sr), e = c.adsr(m, { attack: 0.03, sustain: 0.85, decay: 0.1 }, sr);
    for (let i = 0; i < m; i++) x[i] = (a[i] + b[i] * 0.8) * e[i];
    c.filter(x, c.biquad("bp", 1100 + 800 * open, 0.9, sr));
    add(x, (h + 0.15 + r() * 0.6) / blasts * (dur - 0.4), 0.5 + 1.3 * p.horns);
  }
  c.fade(c.finish(out, 0.8, 1.1), 15, sr);
  return { samples: out };
}
