// Busy kitchen bed: pre-rolled, crossfaded hob roar, sizzle crackle and extractor noise, loop-locked hum and blade tone, struck clinks, chops and pan set-downs wrapped through a diffuse room.
export const meta = {
  title: "Busy Kitchen Tone", kind: "ambience", format: "sound", duration: 3, price: 5, author: "stormfront", payout: "stormfront@creators.oasis.example", kit: "Kitchen", description: "A seamless loop of a busy home kitchen with a distant hob, sizzle, cutlery and glass clinks, a fridge hum and an extractor fan, for domestic scenes and cooking games.",
  tags: ["kitchen", "ambience", "room tone", "loop", "cooking", "clinks", "extractor", "domestic"],
};
export const params = { knobs: {
  room: { type: "choice", label: "Room size", default: "galley", options: ["galley", "open-plan"] },
  activity: { type: "range", label: "Activity", default: 0.5, min: 0, max: 1, step: 0.01 },
  clinks: { type: "range", label: "Clink density", default: 0.5, min: 0, max: 1, step: 0.01 },
  fan: { type: "range", label: "Extractor fan", default: 0.3, min: 0, max: 1, step: 0.01 },
  loop: { type: "range", label: "Loop length (s)", default: 3, min: 2, max: 4, step: 0.1 },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, big = p.room === "open-plan", a = p.activity, D = p.loop, T = c.TAU;
  const r = c.rng(p.seed * 977 + (big ? 11 : 3));
  const n = c.seconds(D, sr), X = c.seconds(0.25, sr), P = c.seconds(0.5, sr), L = P + n + X;
  const ph = [r() * T, r() * T, r() * T, r() * T];
  const bed = new Float32Array(n + X);
  const roar = c.pink(r, L), rb = c.biquad("bp", big ? 380 : 540, 0.8, sr), rl = c.biquad("lp", big ? 1300 : 2600, 0.7, sr);
  const siz = c.noise(r, L), sh = c.biquad("hp", big ? 3500 : 4500, 0.7, sr), sl = c.biquad("lp", big ? 7000 : 10000, 0.7, sr);
  const fb = c.brown(r, L), fl = c.biquad("lp", big ? 380 : 520, 0.7, sr), fh = c.biquad("hp", 40, 0.7, sr);
  const fw = c.noise(r, L), fbp = c.biquad("bp", big ? 900 : 1300, 0.6, sr);
  let g = 0.5, nextG = 0;
  for (let i = 0; i < L; i++) {
    const flick = 1 + 0.05 * Math.sin(T * 2 * i / n + ph[0]) + 0.03 * Math.sin(T * 5 * i / n + ph[1]);
    if (i >= nextG) { g = r() < 0.1 ? 1 + 0.5 * r() : 0.4 + 0.5 * r(); nextG = i + 15 + Math.floor(-Math.log(1 - r()) * 120); }
    const v = rl(rb(roar[i])) * flick * (0.3 + 0.6 * a) + sl(sh(siz[i])) * g * (0.05 + 0.15 * a)
      + p.fan * (0.5 * fh(fl(fb[i])) + 0.22 * fbp(fw[i]));
    if (i >= P) bed[i - P] = v;
  }
  const tone = new Float32Array(n), kh = Math.max(1, Math.round(50 * (0.97 + 0.06 * r()) * n / sr));
  const hA = [0.45, 1, 0.35, 0.18], fBlade = Math.round((95 + 40 * r()) * n / sr) * sr / n;
  let bp = 0;
  for (let i = 0; i < n; i++) {
    let h = 0;
    for (let k = 0; k < 4; k++) h += hA[k] * Math.sin(T * (k + 1) * kh * i / n + k * ph[3]);
    bp += T * fBlade * (1 + 0.015 * Math.sin(T * 2 * i / n + ph[2])) / sr;
    tone[i] = 0.022 * h + p.fan * (0.07 * Math.sin(bp) + 0.035 * Math.sin(2 * bp) + 0.02 * Math.sin(3 * bp + 1));
  }
  const ev = new Float32Array(n);
  const put = (src, t, gn) => { const s = Math.floor((((t % D) + D) % D) * sr); for (let j = 0; j < src.length && j < n; j++) ev[(s + j) % n] += src[j] * gn; };
  const nyq = 0.45 * sr, md = (m, k) => m.map(([f, am]) => [Math.min(nyq, f * k * (0.97 + 0.06 * r())), am]);
  const rate = 80 + 450 * a;
  for (let t = -Math.log(1 - r()) / rate; t < D; t += -Math.log(1 - r()) / rate)
    put(c.burst(r, 0.001 + 0.003 * r(), "bp", 2800 + 6000 * r(), 1.5, 0.0003, 0.0007 + 0.0015 * r(), sr), t, (0.05 + 0.1 * r()) * (0.5 + 0.5 * a));
  const runs = Math.round(a * D * 0.7);
  for (let q = 0; q < runs; q++) {
    let t = 0.08 + (q + 0.1 + 0.6 * r()) * (D - 1.3) / runs;
    const hits = 3 + Math.floor(r() * 4), k = 0.9 + 0.2 * r();
    for (let h = 0; h < hits; h++) {
      put(c.burst(r, 0.025, "lp", 800 * k, 0.8, 0.001, 0.006, sr), t, 0.18);
      put(c.ring(md([[185, 1], [430, 0.5], [960, 0.2]], k), 0.05, 0.01, sr), t + 0.001, 0.1);
      put(c.burst(r, 0.006, "bp", 2400 * k, 1.2, 0.0004, 0.0015, sr), t, 0.2);
      t += 0.165 + 0.03 * r();
    }
  }
  if (r() < 0.4 + 0.5 * a) {
    const t = (0.25 + 0.4 * r()) * D;
    put(c.burst(r, 0.006, "hp", 2200, 0.8, 0.0003, 0.0012, sr), t, 0.3);
    put(c.burst(r, 0.03, "lp", 300, 0.8, 0.001, 0.008, sr), t, 0.15);
    put(c.ring(md([[210, 1], [530, 0.6], [1270, 0.5], [2650, 0.3]], 1), 0.25, 0.05, sr), t + 0.001, 0.16);
  }
  const types = [
    { m: [[2650, 1], [4120, 0.7], [6890, 0.5], [9370, 0.35]], d: 0.035, gn: 0.5 },
    { m: [[1930, 1], [3410, 0.6], [5270, 0.45], [7840, 0.3]], d: 0.09, gn: 0.4 },
    { m: [[1120, 1], [2570, 0.6], [4380, 0.45], [6230, 0.25]], d: 0.04, gn: 0.55 },
  ];
  const nc = Math.round((0.6 + 3.6 * p.clinks) * D);
  for (let q = 0; q < nc; q++) {
    const ty = types[Math.floor(r() * 3)], t0 = 0.05 + (q + 0.15 + 0.7 * r()) * (D - 0.4) / nc, reps = r() < 0.35 ? 2 + Math.floor(r() * 2) : 1;
    const k = 0.85 + 0.35 * r(), dist = big ? 0.65 : 1;
    for (let h = 0, t = t0; h < reps; h++, t += 0.04 + 0.06 * r()) {
      const lv = (0.5 + 0.5 * r()) * ty.gn * dist * (h ? 0.55 : 1), d = ty.d * (0.8 + 0.4 * r()), m = md(ty.m, k);
      put(c.burst(r, 0.003, "hp", 2500 + 2500 * r(), 0.7, 0.0002, 0.0008, sr), t, lv * 1.1);
      put(c.ring(m.slice(0, 2), d * 5, d, sr), t + 0.0003, lv);
      put(c.ring(m.slice(2), d * 2, d * 0.35, sr), t + 0.0003, lv * 0.8);
    }
  }
  const N2 = 2 * n, two = new Float32Array(N2);
  two.set(ev); two.set(ev, n);
  if (big) c.filter(two, c.biquad("lp", 6000, 0.7, sr));
  const dls = big ? [0.0437, 0.0497, 0.0571, 0.0631, 0.0701, 0.0773] : [0.0193, 0.0229, 0.0271, 0.0307];
  const wet = new Float32Array(N2), rt = big ? 1.5 : 0.22, mixAmt = big ? 0.55 : 0.15, damp = big ? 0.35 : 0.6;
  for (const dl of dls) {
    const m = Math.max(1, Math.round(dl * sr * (0.98 + 0.04 * r()))), buf = new Float32Array(m), fg = Math.exp(-6.9078 * (m / sr) / rt);
    let s = 0, idx = 0;
    for (let i = 0; i < N2; i++) {
      const y = buf[idx]; s += damp * (y - s);
      buf[idx] = two[i] + fg * s; wet[i] += y / dls.length;
      if (++idx >= m) idx = 0;
    }
  }
  for (const [dl, ga] of [[0.0051, 0.6], [0.0017, 0.6]]) {
    const m = Math.max(1, Math.round(dl * sr)), buf = new Float32Array(m);
    for (let i = 0, idx = 0; i < N2; i++) {
      const d = buf[idx], y = d - ga * wet[i];
      buf[idx] = wet[i] + ga * y; wet[i] = y;
      if (++idx >= m) idx = 0;
    }
  }
  const pd = big ? c.seconds(0.02, sr) : 0, K = big ? 1.4 : 1.8, out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const u = i / X * Math.PI / 2, b = i < X ? bed[i] * Math.sin(u) + bed[n + i] * Math.cos(u) : bed[i];
    out[i] = b + tone[i] + 0.9 * (two[n + i] * (1 - mixAmt) + wet[n + i - pd] * mixAmt * K);
  }
  c.finish(out, 0.8, 1.1);
  return { samples: out };
}
