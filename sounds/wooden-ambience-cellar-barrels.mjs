// Barrel cellar: a loopable underground bed. Layers: quiet brown-noise room tone, a damp standing-wave hum, rising-pitch drips with stone slap echoes, heel-toe boot thumps through the floorboards above, and a gliding stick-slip barrel-stave creak with a hoop knock. Events wrap across the loop point.
export const meta = {
  title: "Barrel Cellar Drips", kind: "ambience", format: "sound", duration: 3, price: 3, author: "stormfront", payout: "stormfront@creators.oasis.example", kit: "Wooden Tavern", description: "A loopable cellar bed under a wooden tavern, with water drips echoing off stone, barrels settling and boots thudding through the floor above, for dungeon, cellar and basement scenes.",
  tags: ["cellar", "drips", "ambience", "loop", "tavern", "barrels", "underground", "damp"],
};
export const params = { knobs: {
  size: { type: "choice", label: "Cellar size", default: "small", options: ["small", "vault"] },
  drips: { type: "range", label: "Drip rate", default: 1.5, min: 0.3, max: 6, step: 0.1 },
  steps: { type: "range", label: "Muffled footsteps", default: 0.5, min: 0, max: 1, step: 0.01 },
  hum: { type: "range", label: "Damp hum", default: 0.4, min: 0, max: 1, step: 0.01 },
  loop: { type: "range", label: "Loop length", default: 3, min: 2, max: 4, step: 0.1 },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, vault = p.size === "vault", r = c.rng(p.seed * 4241 + (vault ? 503 : 11));
  const L = p.loop, n = c.seconds(L, sr), tailN = c.seconds(2, sr);
  const out = new Float32Array(n), ev = new Float32Array(n + tailN);
  const air = c.brown(r, n), lp = c.biquad("lp", vault ? 220 : 520, 0.7, sr), hp = c.biquad("hp", 30, 0.7, sr);
  const ph0 = r() * c.TAU, k1 = Math.max(1, Math.round(L * 0.4));
  for (let i = 0; i < n; i++) air[i] = lp(hp(air[i])) * (0.8 + 0.2 * Math.sin(c.TAU * k1 * i / n + ph0));
  c.mix(out, air, 0, 0.28, sr);
  if (p.hum > 0) {
    const fh = (vault ? 43 : 86) * (0.97 + r() * 0.06), hb = c.noise(r, n), bp = c.biquad("bp", fh * 2, 6, sr);
    const kv = Math.max(1, Math.round(L * 0.5)), pv = r() * c.TAU; let ph = 0;
    for (let i = 0; i < n; i++) {
      const t = i / n, f = fh * (1 + 0.004 * Math.sin(c.TAU * kv * t + pv)); ph += c.TAU * f / sr;
      const sw = 0.7 + 0.3 * Math.sin(c.TAU * k1 * t + pv * 1.7);
      out[i] += 0.55 * p.hum * sw * (0.3 * (Math.sin(ph) + 0.5 * Math.sin(2 * ph) + 0.25 * Math.sin(3 * ph + 0.5)) + 0.4 * bp(hb[i]));
    }
  }
  const dripF = vault ? 1000 : 1500, echoes = vault ? [[0.11, 0.38], [0.24, 0.2], [0.39, 0.1]] : [[0.035, 0.22], [0.075, 0.1]];
  const drip = (at, amp) => {
    const f0 = dripF * (0.7 + r() * 0.6), d = 0.05 + r() * 0.04, m = c.seconds(d, sr), x = new Float32Array(m), tau = 0.012 + r() * 0.012;
    let ph = 0;
    for (let i = 0; i < m; i++) { const s = i / sr; ph += c.TAU * f0 * (1 + 1.3 * s / d) / sr; x[i] = Math.sin(ph) * Math.exp(-s / tau) * Math.min(1, s / 0.0008); }
    c.fade(x, 3, sr);
    c.mix(x, c.burst(r, 0.01, "bp", 3200 + r() * 2000, 1.5, 0.0003, 0.002, sr), 0, 0.35, sr);
    c.mix(ev, x, at, amp, sr);
    const lpE = c.biquad("lp", vault ? 1800 : 2600, 0.7, sr), xe = Float32Array.from(x); c.filter(xe, lpE);
    for (const [dt, g] of echoes) c.mix(ev, xe, at + dt * (0.9 + 0.2 * r()), amp * g, sr);
  };
  let t = r() * 0.5 / p.drips;
  while (t < L) { drip(t, 0.6 + 0.4 * r()); t += (0.55 + 0.9 * r()) / p.drips; }
  if (p.steps > 0) {
    const st = new Float32Array(n + tailN), cnt = Math.max(1, Math.round(p.steps * L / 0.6));
    let ts = r() * L, side = r() < 0.5 ? 0 : 1;
    for (let s = 0; s < cnt; s++) {
      const k = 0.88 + r() * 0.24, g = (0.7 + 0.3 * r()) * (side ? 0.8 : 1);
      c.mix(st, c.ring([[58 * k, 1], [112 * k, 0.45], [196 * k, 0.2]], 0.28, 0.05, sr), ts + 0.003, g, sr);
      c.mix(st, c.burst(r, 0.04, "lp", 450, 0.8, 0.002, 0.012, sr), ts, g * 0.8, sr);
      c.mix(st, c.ring([[74 * k, 1], [150 * k, 0.3]], 0.18, 0.03, sr), ts + 0.07 + r() * 0.03, g * 0.5, sr);
      if (r() < 0.3) c.mix(st, c.ring([[240 * k, 1], [410 * k, 0.4]], 0.15, 0.04, sr), ts + 0.05, g * 0.15, sr);
      ts += 0.48 + r() * 0.2 + (r() < 0.15 ? 0.35 : 0); side ^= 1; if (ts >= L) ts -= L;
    }
    c.filter(st, c.biquad("lp", vault ? 260 : 380, 0.8, sr));
    c.mix(ev, st, 0, 2.2 * (0.4 + 0.6 * p.steps), sr);
  }
  const ct = r() * L, cd = 0.45 + r() * 0.3, cm = c.seconds(cd, sr), cx = new Float32Array(cm), cf = (vault ? 95 : 130) * (0.85 + r() * 0.3);
  let next = 0;
  for (let i = 0; i < cm; i++) {
    const u = i / cm, vel = Math.sin(Math.PI * u);
    if (i >= next) { cx[i] = (0.5 + 0.5 * r()) * vel; next = i + Math.max(8, Math.round(sr / (cf * (0.7 + 0.4 * u + 0.3 * vel)) * (0.88 + 0.24 * r()))); }
  }
  const b1 = c.biquad("bp", 520 * (0.9 + r() * 0.2), 9, sr), b2 = c.biquad("bp", 1150 * (0.9 + r() * 0.2), 11, sr);
  for (let i = 0; i < cm; i++) cx[i] = b1(cx[i]) + 0.6 * b2(cx[i]);
  c.fade(cx, 20, sr);
  c.mix(ev, cx, ct, 1.1, sr);
  c.mix(ev, c.ring([[(vault ? 95 : 120) * (0.9 + r() * 0.2), 1], [260, 0.35], [610, 0.12]], 0.2, 0.035, sr), ct + cd * 0.9, 0.35, sr);
  const wet = c.reverb(ev, { size: vault ? 0.85 : 0.35, decay: vault ? 0.7 : 0.35, mixAmt: vault ? 0.3 : 0.12 }, sr) || ev;
  for (let i = 0; i < wet.length; i++) out[i % n] += wet[i];
  c.fade(c.finish(out, 0.8), 15, sr);
  return { samples: out };
}
