// Highway cabin roar: three clearly separate bands (a low rumble bed, a mid tyre roar through cabin resonances, a high wind hiss), with the road surface changing the tyre layer's texture. Asphalt is a smooth hush, concrete is a tonal hum plus slab thumps, gravel is bright crackling grit. Insulation is a real lowpass on everything above the rumble. The loop is seamless by construction, using crossfaded noise, integer-cycle swells and wrapped events.
export const meta = {
  title: "Highway Cabin Roar", kind: "ambience", format: "sound", duration: 4, price: 5, author: "stormfront", payout: "stormfront@creators.oasis.example", kit: "Car Interior", description: "A loopable four seconds of tyre roar and wind heard from inside a car at highway speed, for driving scenes, cutscenes and in-car menus.",
  tags: ["car", "road", "highway", "tires", "wind", "cabin", "loop", "driving"],
};
export const params = { knobs: {
  surface: { type: "choice", label: "Road surface", default: "asphalt", options: ["asphalt", "concrete", "gravel"] },
  speed: { type: "range", label: "Speed", default: 0.6, min: 0, max: 1, step: 0.01 },
  wind: { type: "range", label: "Wind hiss", default: 0.4, min: 0, max: 1, step: 0.01 },
  insulation: { type: "range", label: "Insulation", default: 0.5, min: 0, max: 1, step: 0.01 },
  rumble: { type: "range", label: "Low rumble", default: 0.45, min: 0, max: 1, step: 0.01 },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, si = params.knobs.surface.options.indexOf(p.surface), r = c.rng(p.seed * 613 + si * 41 + 29);
  const dur = 4, n = c.seconds(dur, sr), L = c.seconds(0.3, sr), N = n + L, sp = p.speed, ins = p.insulation;
  const tw = (cyc, ph) => (i) => Math.sin(c.TAU * cyc * i / n + ph);
  const s1 = tw(1, r() * 6), s2 = tw(2, r() * 6), s3 = tw(3, r() * 6), s5 = tw(5, r() * 6), s7 = tw(7, r() * 6);
  const norm = (b) => { let s = 0; for (let i = 0; i < N; i++) s += b[i] * b[i]; const k = 1 / Math.sqrt(s / N + 1e-9); for (let i = 0; i < N; i++) b[i] *= k; return b; };
  const xf = (b) => { const o = new Float32Array(n); for (let i = 0; i < n; i++) { if (i < L) { const a = 1.5708 * i / L; o[i] = b[i] * Math.sin(a) + b[n + i] * Math.cos(a); } else o[i] = b[i]; } return o; };
  const W = [[0.7, 1, 0.25], [1.2, 0.6, 0.1], [0.3, 0.7, 1.4]][si];
  const pk = c.pink(r, N), pk2 = c.pink(r, N), pk3 = c.pink(r, N);
  const lo = c.biquad("lp", 260, 0.8, sr), mid = c.biquad("bp", [900, 600, 1400][si] * (0.6 + 0.9 * sp), 0.7, sr), res = c.biquad("bp", [170, 140, 230][si] * (0.8 + 0.5 * sp), 2, sr);
  const hi = c.biquad("bp", 3400 * (0.8 + 0.5 * sp), 0.8, sr), hum = c.biquad("bp", 250 * (0.8 + 0.4 * sp), 7, sr);
  const cut = 600 + 6400 * Math.pow(1 - ins, 1.6) + 1200 * sp, la = c.biquad("lp", cut, 0.7, sr), lb = c.biquad("lp", cut, 0.7, sr);
  const step = Math.round(sr * 0.0007), gd = si === 2 ? 0.85 : 0.1;
  let a = r(), b = r(), k = 0;
  const roar = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    if (++k >= step) { k = 0; a = b; b = r(); }
    const tex = 1 - gd + 2 * gd * (a + (b - a) * k / step);
    const s = W[0] * (lo(pk[i]) * 2.5 + res(pk2[i]) * 2) + W[1] * mid(pk3[i]) * 1.6 + W[2] * hi(pk[i]) * 1.6 * tex + (si === 1 ? hum(pk2[i]) * 3 : 0);
    roar[i] = lb(la(s)) * (1 + 0.18 * s2(i) + 0.12 * s5(i) + 0.1 * s7(i));
  }
  const wn = c.noise(r, N), wh = c.biquad("hp", 2500 + 1500 * sp, 0.7, sr), wb = c.biquad("bp", 5200, 0.7, sr), wl = c.biquad("lp", 11000 - 7000 * ins, 0.7, sr);
  for (let i = 0; i < N; i++) { const v = wn[i]; wn[i] = wl(wh(v) + wb(v)) * Math.max(0.1, 0.7 + 0.25 * s1(i) + 0.2 * s3(i) + 0.1 * s7(i)); }
  const lw = c.brown(r, N), ll = c.biquad("lp", 75, 0.9, sr);
  for (let i = 0; i < N; i++) lw[i] = ll(lw[i]) * (1 + 0.3 * s1(i) + 0.15 * s3(i));
  const bed = new Float32Array(N), mv = 0.3 + 0.7 * sp;
  c.mix(bed, norm(roar), 0, mv * 0.9 * (1 - 0.35 * ins), sr);
  c.mix(bed, norm(wn), 0, (0.03 + 0.9 * p.wind) * (0.2 + 0.8 * sp) * (1 - 0.3 * ins), sr);
  c.mix(bed, norm(lw), 0, 0.05 + 1.5 * p.rumble, sr);
  const out = xf(bed), ev = new Float32Array(N);
  if (si === 1) {
    const cnt = Math.round(3 + 6 * sp), gap = dur / cnt;
    for (let j = 0; j < cnt; j++) {
      const t = j * gap + (r() - 0.5) * 0.15 * gap, f = 60 + r() * 25, amp = 0.9 * mv * (1 - 0.5 * ins);
      c.mix(ev, c.ring([[f, 1], [f * 2.1, 0.5], [f * 3.4, 0.2]], 0.3, 0.07, sr), t, amp, sr);
      c.mix(ev, c.burst(r, 0.02, "lp", 700, 1, 0.001, 0.008, sr), t, amp * 0.7, sr);
      c.mix(ev, c.ring([[f * 1.05, 1], [f * 2.2, 0.4]], 0.25, 0.06, sr), t + 0.09 + r() * 0.02, amp * 0.6, sr);
    }
  }
  const f0 = Math.round((30 + 26 * sp) * dur) / dur, tg = 0.05 + 0.5 * p.rumble;
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    out[i] += ev[i] + (i < N - n ? ev[n + i] : 0) + tg * (1 + 0.2 * s2(i)) * (Math.sin(c.TAU * f0 * t) + 0.6 * Math.sin(c.TAU * (f0 + 0.5 * Math.round(5.5)) * t + 1));
  }
  const loud = c.clamp((0.45 * sp + 0.3 * p.wind + 0.3 * p.rumble) * (1 - 0.25 * ins), 0, 1);
  c.finish(out, 0.5 + 0.42 * loud, 1.05);
  c.fade(out, 3, sr);
  return { samples: out };
}
