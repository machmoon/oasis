// Horror house room tone: a steady, loopable 3 s empty room. The bed is band-limited pink air with slow periodic breathing, a room-mode resonance and a circular comb that gives each size its own acoustics. A low mains hum sits under it, and faint settling creaks are separate stick-slip wood tones that wrap around the loop point. Creak timing and pitch ignore the room, so room size only changes the acoustics.
export const meta = {
  title: "Empty Room Air", kind: "ambience", format: "sound", duration: 3, price: 4, author: "stormfront", payout: "stormfront@creators.oasis.example", kit: "Horror House", description: "A loopable three seconds of empty-room air with faint settling creaks and an optional electrical hum; room size, air, creak density and hum are knobs. Use it as the bed under an abandoned-house scene.",
  tags: ["room tone", "ambience", "loop", "horror", "empty", "creak", "hum", "house"],
};
export const params = { knobs: {
  room: { type: "choice", label: "Room size", default: "bedroom", options: ["closet", "bedroom", "hall"] },
  air: { type: "range", label: "Air level", default: 0.5, min: 0, max: 1, step: 0.01 },
  creaks: { type: "range", label: "Creak density", default: 0.5, min: 0, max: 1, step: 0.01 },
  hum: { type: "range", label: "Hum", default: 0.2, min: 0, max: 1, step: 0.01 },
  loop: { type: "toggle", label: "Seamless loop", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + 29), rc = c.rng(p.seed * 31 + 7), dur = 3, n = c.seconds(dur, sr), xf = c.seconds(0.3, sr), N = n + xf;
  const size = { closet: 0, bedroom: 1, hall: 2 }[p.room], T = c.TAU;
  const lpF = [3600, 2200, 1300][size], hpF = [260, 140, 70][size];
  const raw = c.pink(r, N), hp = c.biquad("hp", hpF, 0.7, sr), lp = c.biquad("lp", lpF, 0.8, sr);
  const ph1 = r() * 6.28, ph2 = r() * 6.28, ph3 = r() * 6.28;
  for (let i = 0; i < N; i++) { const t = i / sr; raw[i] = lp(hp(raw[i])) * (0.8 + 0.12 * Math.sin(T * t / dur + ph1) + 0.08 * Math.sin(T * 2 * t / dur + ph2)); }
  const bed = new Float32Array(n);
  for (let i = 0; i < n; i++) bed[i] = raw[i];
  for (let i = 0; i < xf; i++) { const a = i / xf; bed[i] = raw[i] * Math.sqrt(a) + raw[n + i] * Math.sqrt(1 - a); }
  let e = 0;
  for (let i = 0; i < n; i++) e += bed[i] * bed[i];
  const sc = (0.1 + 0.1 * p.air) / Math.sqrt(e / n + 1e-12), out = new Float32Array(n);
  const mode = c.biquad("bp", [750, 320, 120][size], 4, sr);
  for (let i = 0; i < n; i++) { bed[i] *= sc; out[i] = bed[i] + 0.9 * mode(bed[i]); }
  const hf = [100, 60, 50][size], hl = c.biquad("lp", 300, 0.7, sr), ha = 0.002 + 0.07 * p.hum;
  for (let i = 0; i < n; i++) { const t = i / sr, a = T * hf * t + ph3; out[i] += ha * hl(Math.sin(a) + 0.4 * Math.sin(2 * a + 1) * (0.7 + 0.3 * Math.sin(T * t / dur)) + 0.15 * Math.sin(3 * a)); }
  const count = Math.round(5.5 * p.creaks), slot = dur / 6;
  for (let k = 0; k < count; k++) {
    const len = 0.3 + rc() * 0.35, m = c.seconds(len, sr), f0 = 110 + rc() * 220, dir = rc() < 0.5 ? 1 : -1, pr = 22 + rc() * 30, jit = rc() * 6.28;
    const at = Math.floor(((k + 0.5) * 6 / Math.max(count, 1) * 0.5 + rc() * 0.4) * slot * 2 * sr + rc() * sr * 0.5), amp = 0.1 + 0.1 * rc();
    let ph = 0;
    for (let i = 0; i < m; i++) {
      const u = i / m, t = i / sr, f = f0 * (1 + dir * 0.35 * u + 0.03 * Math.sin(t * 40 + jit));
      ph += T * f / sr;
      const pulse = 0.5 + 0.5 * Math.sin(T * pr * t + jit), env = Math.min(1, i / (0.02 * sr)) * Math.pow(Math.sin(Math.PI * u), 1.5);
      out[(at + i) % n] += amp * (Math.sin(ph) + 0.55 * Math.sin(2 * ph + 0.5) + 0.3 * Math.sin(3 * ph)) * (0.25 + 0.75 * pulse * pulse) * env;
    }
  }
  const g = [0.3, 0.45, 0.6][size], d = Math.round([0.003, 0.011, 0.031][size] * sr), y = new Float32Array(n);
  for (let pass = 0; pass < 2; pass++) for (let i = 0; i < n; i++) y[i] = out[i] + g * y[(i - d + n) % n];
  c.finish(y, 0.8);
  c.fade(y, p.loop ? 10 : 250, sr);
  return { samples: y };
}
