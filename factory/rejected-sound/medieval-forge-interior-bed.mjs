// Forge interior: a loopable smithy bed. Layers: a stationary low fire roar with gentle gusts, a mid flame flutter, a bright hiss, and a dense irregular crackle layer (snaps, wood pops, ember spits, spark showers) whose amplitudes span a wide range. The crackle layer and its room tail are wrapped circularly, so the loop closes without a seam. Final level is normalised by RMS so seeds and extremes stay equally loud.
export const meta = {
  title: "Forge Interior", kind: "ambience", format: "sound", duration: 3, price: 4, author: "stormfront", payout: "stormfront@creators.oasis.example", kit: "Medieval Market", description: "A loopable smithy interior: a soft fire roar with flickering flame body under sharp irregular crackles and ember spits, in a stone room; forge size, fire intensity, crackle density and reverb are knobs, and each seed is a different three seconds of the same fire.",
  tags: ["forge", "smithy", "fire", "crackle", "ambience", "medieval", "loop", "blacksmith"],
};
export const params = { knobs: {
  size: { type: "choice", label: "Forge size", default: "small", options: ["small", "large"] },
  fire: { type: "range", label: "Fire intensity", default: 0.5, min: 0, max: 1, step: 0.01 },
  crackle: { type: "range", label: "Crackle density", default: 0.5, min: 0, max: 1, step: 0.01 },
  room: { type: "range", label: "Room reverb", default: 0.4, min: 0, max: 1, step: 0.01 },
  crossfade: { type: "toggle", label: "Loop crossfade", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + (p.size === "large" ? 71 : 13)), dur = 3;
  const n = c.seconds(dur, sr), L = c.seconds(0.5, sr), N = n + L, total = dur + 0.5;
  const big = p.size === "large" ? 1 : 0, f = p.fire;
  const bed = new Float32Array(N), ev = new Float32Array(N);
  const roar = c.brown(r, N), o1 = c.onepole(sr), lp2 = c.biquad("lp", big ? 260 + 200 * f : 500 + 400 * f, 0.7, sr);
  for (let i = 0; i < N; i++) roar[i] = lp2(o1(roar[i], big ? 140 + 200 * f : 260 + 300 * f));
  c.mix(bed, roar, 0, 3 + 4 * f + 2 * big, sr);
  const fl = c.noise(r, N), bp = c.biquad("bp", (big ? 600 : 900) + 600 * f, 0.7, sr), bp2 = c.biquad("bp", (big ? 1500 : 2400) + 800 * f, 0.8, sr);
  let g = 0.5, tg = 0.5;
  for (let i = 0; i < N; i++) { if (i % 300 === 0) tg = 0.15 + r() * 0.85; g += (tg - g) * 0.05; const x = fl[i]; fl[i] = (bp(x) + 0.6 * bp2(x)) * g; }
  c.mix(bed, fl, 0, 0.3 + 0.7 * f, sr);
  const hs = c.pink(r, N), hh = c.biquad("hp", 4500, 0.7, sr); g = 0.5; tg = 0.5;
  for (let i = 0; i < N; i++) { if (i % 500 === 0) tg = 0.2 + r() * 0.8; g += (tg - g) * 0.05; hs[i] = hh(hs[i]) * g; }
  c.mix(bed, hs, 0, 0.04 + 0.12 * f, sr);
  const rms = (b, m) => { let s = 0; for (let i = 0; i < m; i++) s += b[i] * b[i]; return Math.sqrt(s / m) || 1; };
  c.gain(bed, 0.12 / rms(bed, n));
  const snaps = Math.round((10 + 40 * p.crackle) * total * (0.8 + 0.4 * f));
  const put = (b, t, a) => { c.mix(ev, b, t, a, sr); if (t > n - 0.2) c.mix(ev, b, t - dur, a, sr); };
  for (let k = 0; k < snaps; k++) {
    const t = r() * total, a = Math.pow(r(), 2.5), ty = r(), fr = (2000 + r() * 4500) * (big ? 0.7 : 1), amp = 0.1 + 1.6 * a;
    if (ty < 0.45) put(c.burst(r, 0.003 + r() * 0.005, "bp", fr, 0.8 + r(), 0.0002, 0.0008 + r() * 0.002, sr), t, amp);
    else if (ty < 0.7) {
      put(c.burst(r, 0.035, "lp", (big ? 350 : 600) + 400 * r(), 0.8, 0.0005, 0.01 + 0.012 * big, sr), t, amp * 1.2);
      put(c.burst(r, 0.006, "hp", 2500, 0.8, 0.0002, 0.0015, sr), t, amp * 0.6);
    } else if (ty < 0.88) { const m = 3 + Math.floor(r() * 5); for (let j = 0; j < m; j++) put(c.burst(r, 0.003, "hp", 3000 + r() * 4000, 0.8, 0.0002, 0.0008, sr), t + j * 0.007 * (0.4 + r()), (0.2 + 0.6 * r()) * (0.3 + a)); }
    else put(c.burst(r, 0.04, "bp", 5000 + 1500 * r(), 0.7, 0.002, 0.014, sr), t, 0.25 + 0.8 * a);
  }
  c.gain(ev, 0.55);
  let wet = ev;
  if (p.room > 0) {
    const w = c.reverb(ev.slice(), { size: 0.15 + 0.8 * big, decay: 0.2 + 0.75 * p.room, mixAmt: 1 }, sr);
    wet = new Float32Array(N);
    for (let i = 0; i < N; i++) wet[i] = ev[i] + (w[i] || 0) * (0.3 + 1.1 * p.room);
  }
  const fin = new Float32Array(n);
  for (let i = 0; i < n; i++) fin[i] = bed[i] + wet[i];
  if (p.crossfade) for (let i = 0; i < L; i++) { const a = Math.PI / 2 * i / L; fin[i] = bed[i] * Math.sin(a) + bed[n + i] * Math.cos(a) + wet[i] + wet[n + i]; }
  const k = 0.2 / rms(fin, n);
  c.gain(fin, k);
  c.fade(fin, 10, sr);
  c.finish(fin, 0.85, 1);
  return { samples: fin };
}
