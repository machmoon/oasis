// Barrel tap knock: a wooden mallet seating a brass spigot in a barrel bung. Each blow has a sharp mallet onset, a short brass spigot tick that climbs as it drives home, a damped barrel-body thump tuned by size and fullness, and a wedging rasp; liquid answers with slosh and rising bubble chirps; an optional room and settling tail.
export const meta = {
  title: "Barrel Tap Knock", kind: "sfx", format: "sound", duration: 1.4, price: 3, author: "hollowbody", payout: "hollowbody@creators.oasis.example", kit: "Wooden Tavern", description: "A wooden mallet driving a spigot into a barrel bung, with barrel size, strike force, how full the barrel is, the number of blows and a room tail as knobs, for tavern cellars, taprooms and brewing scenes.",
  tags: ["barrel", "tap", "mallet", "spigot", "tavern", "wood", "knock", "cellar"],
};
export const params = { knobs: {
  barrel: { type: "choice", label: "Barrel size", default: "hogshead", options: ["keg", "hogshead", "tun"] },
  force: { type: "range", label: "Strike force", default: 0.6, min: 0, max: 1, step: 0.01 },
  fullness: { type: "range", label: "Liquid fullness", default: 0.6, min: 0, max: 1, step: 0.01 },
  hits: { type: "range", label: "Hit count", default: 3, min: 1, max: 6, step: 1 },
  tail: { type: "toggle", label: "Room tail", default: false },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, si = Math.max(0, params.knobs.barrel.options.indexOf(p.barrel)), r = c.rng(p.seed * 7919 + si * 131 + 3);
  const B = [{ f: 190, tau: 0.03, sp: 0.25, bub: 1250, lp: 900 }, { f: 112, tau: 0.05, sp: 0.3, bub: 820, lp: 600 }, { f: 66, tau: 0.075, sp: 0.36, bub: 520, lp: 380 }][si];
  const F = p.force, L = p.fullness, H = Math.max(1, Math.round(p.hits));
  const tau = B.tau * (1 - 0.5 * L), bf = B.f * (1 - 0.12 * L) * (0.97 + 0.06 * r());
  const times = []; let t = 0.004;
  for (let h = 0; h < H; h++) { times.push(t); t += B.sp * (1.1 - 0.2 * F) + (r() - 0.5) * 0.06; }
  const last = times[H - 1];
  const n = c.seconds(last + Math.max(0.28, tau * 7) + (L > 0.01 ? 0.22 : 0) + (p.tail ? 0.8 : 0), sr);
  let out = new Float32Array(n);
  const modes = (at, list, a, drop) => {
    let len = 0; for (const m of list) len = Math.max(len, m[2] * 7);
    const m = c.seconds(len, sr), x = new Float32Array(m), att = 0.0012 * sr;
    for (const [f, amp, tc] of list) {
      const k = Math.exp(-1 / (tc * sr)); let e = amp, ph = r() * 0.3;
      for (let i = 0; i < m; i++) { ph += c.TAU * f * (1 + drop * Math.exp(-i / (0.006 * sr))) / sr; x[i] += Math.sin(ph) * e; e *= k; }
    }
    for (let i = 0; i < att && i < m; i++) x[i] *= i / att;
    c.mix(out, c.fade(x, 3, sr), at, a, sr);
  };
  const bubble = (at, f0, d, a) => {
    const m = c.seconds(d, sr), x = new Float32Array(m), att = 0.0015 * sr; let ph = 0;
    for (let i = 0; i < m; i++) { const u = i / m; ph += c.TAU * f0 * (1 + 1.1 * u * u) / sr; x[i] = Math.sin(ph) * Math.exp(-4 * u) * (1 - u) * Math.min(1, i / att); }
    c.mix(out, x, at, a, sr);
  };
  const slosh = (at, a) => {
    const m = c.seconds(0.3, sr), x = c.brown(r, m), lp = c.biquad("lp", B.lp, 0.8, sr), e = c.env(m, 0.025, 0.06 + 0.02 * si, sr);
    let pk = 1e-6;
    for (let i = 0; i < m; i++) { x[i] = lp(x[i]) * e[i]; pk = Math.max(pk, Math.abs(x[i])); }
    c.mix(out, c.fade(x, 6, sr), at, a / pk, sr);
  };
  for (let h = 0; h < H; h++) {
    const k = H > 1 ? h / (H - 1) : 1, at = times[h];
    const g = (0.75 + 0.25 * F) * (0.9 + 0.2 * r()) * (h === H - 1 && H > 1 ? 1.12 : 1);
    c.mix(out, c.burst(r, 0.01, "lp", 1800 + 6500 * F, 0.7, 0.0006, 0.002 + 0.002 * (1 - F), sr), at, 0.9 * g, sr);
    modes(at + 0.0005, [[640 * (0.97 + 0.06 * r()), 1, 0.006], [1580, 0.4, 0.004]], 0.3 * g, 0.05);
    const sp = 2300 * (1 + 0.15 * k) * (0.99 + 0.02 * r());
    modes(at + 0.0008, [[sp, 1, 0.012 + 0.01 * (1 - k)], [sp * 2.31, 0.45, 0.007], [sp * 3.9, 0.2, 0.004]], 0.28 * g * (1 - 0.35 * k) * (0.45 + 0.55 * F), 0);
    modes(at + 0.002, [[bf, 1, tau], [bf * 1.93, 0.5, tau * 0.6], [bf * 2.87, 0.3, tau * 0.4], [bf * 4.1, 0.15, tau * 0.25]], (0.55 + 0.45 * k) * g * (0.5 + 0.5 * F), 0.12 + 0.1 * F);
    c.mix(out, c.burst(r, 0.06, "lp", 360 - 100 * si, 0.7, 0.002, 0.012 + 0.008 * si, sr), at + 0.001, 0.7 * g * (0.4 + 0.6 * F), sr);
    c.mix(out, c.burst(r, 0.05, "bp", 1100 + 600 * r(), 2.5, 0.004, 0.015, sr), at + 0.006, 0.18 * g * (1 - 0.5 * k), sr);
    c.mix(out, c.burst(r, 0.006, "lp", 3000 + 3000 * F, 0.7, 0.0004, 0.0015, sr), at + 0.018 + 0.01 * r(), 0.2 * g * (1 - 0.5 * F), sr);
    if (L > 0.01) {
      slosh(at + 0.012, 0.4 * L * g);
      const nb = Math.round(1 + L * (3 + 4 * F));
      for (let b = 0; b < nb; b++) bubble(at + 0.03 + Math.pow(r(), 1.3) * 0.16, B.bub * (0.6 + 0.8 * r()), 0.02 + 0.03 * r(), 0.32 * L * (0.5 + 0.5 * r()));
    }
  }
  if (p.tail) {
    if (L > 0.01) {
      slosh(last + 0.12, 0.25 * L);
      const nb = Math.round(3 + 10 * L);
      for (let b = 0; b < nb; b++) bubble(last + 0.08 + Math.pow(r(), 1.3) * 0.5, B.bub * (0.5 + 0.7 * r()), 0.02 + 0.03 * r(), 0.2 * L * (0.4 + 0.6 * r()));
    }
    out = c.reverb(out, { size: 0.35 + 0.15 * si, decay: 0.45 + 0.2 * si, mixAmt: 0.22 }, sr) || out;
  }
  c.finish(out, 0.9, 1.1);
  c.gain(out, 0.6 + 0.35 * F);
  c.fade(out, 10, sr);
  return { samples: out };
}
