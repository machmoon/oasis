// Lantern swing: a hand lantern on a creaking bail. Each swing reversal loads the handle: a pitched stick-slip creak with a load arc, a frame thunk, and a decaying bounce of jittered inharmonic clinks; a soft low air swish follows swing velocity.
export const meta = {
  title: "Swaying Lantern", kind: "foley", format: "sound", duration: 3, price: 2, author: "stormfront", payout: "stormfront@creators.oasis.example", kit: "Forest at Night", description: "A hand lantern swinging on its handle, with a creaking bail and loose glass rattling at each turn; for night walks, camp scenes and lantern-lit searches.",
  tags: ["lantern", "creak", "rattle", "swing", "foley", "night", "metal", "glass"],
};
export const params = { knobs: {
  lantern: { type: "choice", label: "Lantern", default: "tin", options: ["tin", "brass", "glass"] },
  swing: { type: "range", label: "Swing", default: 0.5, min: 0, max: 1, step: 0.01 },
  creak: { type: "range", label: "Creak", default: 0.6, min: 0, max: 1, step: 0.01 },
  rattle: { type: "range", label: "Rattle", default: 0.5, min: 0, max: 1, step: 0.01 },
  rate: { type: "range", label: "Swing rate", default: 0.7, min: 0.4, max: 1.4, step: 0.01 },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, li = params.knobs.lantern.options.indexOf(p.lantern), r = c.rng(p.seed * 6151 + li * 97 + 3);
  const dur = 3, n = c.seconds(dur, sr), out = new Float32Array(n), half = 0.5 / p.rate, A = 0.25 + 0.75 * p.swing;
  const mat = [
    { base: 1900, ratios: [1, 1.47, 2.31, 3.2, 4.6], dec: 0.014, nz: 0.6, body: [[420, 1], [1130, 0.4]], bd: 0.03, f0: 210, fm: [1250, 2900], q: 6 },
    { base: 1300, ratios: [1, 1.62, 2.41, 3.37, 4.9], dec: 0.05, nz: 0.25, body: [[310, 1], [760, 0.5], [1490, 0.3]], bd: 0.08, f0: 150, fm: [850, 2100], q: 9 },
    { base: 3100, ratios: [1, 1.83, 2.9, 4.15], dec: 0.035, nz: 0.1, body: [[520, 1], [1400, 0.3]], bd: 0.025, f0: 260, fm: [1100, 2600], q: 7 },
  ][li];
  const t0 = 0.16 + r() * 0.12, rev = [t0 - half], amp = [];
  for (let t = t0; t < dur + half; t += half * (0.86 + r() * 0.28)) rev.push(t);
  for (let k = 0; k < rev.length; k++) amp.push(A * (0.78 + 0.4 * r()));
  const sw = c.noise(r, n), bp = c.biquad("bp", 350 + 500 * p.swing, 0.6, sr), lpS = c.biquad("lp", 1400 + 1000 * p.swing, 0.7, sr);
  let seg = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    while (seg < rev.length - 2 && t >= rev[seg + 1]) seg++;
    const v = Math.sin(Math.PI * c.clamp((t - rev[seg]) / (rev[seg + 1] - rev[seg]), 0, 1));
    sw[i] = lpS(bp(sw[i])) * v * v * amp[seg] * Math.min(1, t / 0.2);
  }
  c.mix(out, sw, 0, 0.05 + 0.13 * p.swing, sr);
  const fj = 0.9 + r() * 0.2;
  for (let k = 1; k < rev.length; k++) {
    const tk = rev[k], a = amp[k];
    if (tk > dur - 0.45) break;
    c.mix(out, c.ring(mat.body.map(([f, g]) => [f * (0.97 + r() * 0.06), g]), 0.3, mat.bd, sr), tk + 0.004, 0.3 * a, sr);
    c.mix(out, c.burst(r, 0.015, "lp", 1800, 0.8, 0.001, 0.004, sr), tk, 0.2 * a, sr);
    if (p.creak > 0) {
      const L = (0.16 + 0.3 * p.creak * a) * (0.8 + 0.4 * r()), m = c.seconds(L, sr), x = new Float32Array(m);
      const b1 = c.biquad("bp", mat.fm[0] * (0.9 + r() * 0.2), mat.q, sr), b2 = c.biquad("bp", mat.fm[1] * (0.9 + r() * 0.2), mat.q * 1.3, sr);
      const bend = 0.25 + 0.45 * r(), dir = r() < 0.5 ? 1 : -1, peak = 0.3 + 0.25 * r();
      let ph = 0, jit = 1, s = 0;
      for (let i = 0; i < m; i++) {
        const u = i / m, f = mat.f0 * fj * (0.8 + bend * Math.sin(Math.PI * u) + 0.12 * dir * u) * jit;
        ph += f / sr;
        let imp = 0;
        if (ph >= 1) { ph -= 1; jit = 0.97 + r() * 0.06; imp = r() < 0.06 ? 0 : 0.7 + 0.5 * r(); }
        s = imp + s * 0.55;
        const e = u < peak ? u / peak : Math.pow((1 - u) / (1 - peak), 1.6);
        x[i] = (0.35 * s + b1(s) + 0.7 * b2(s)) * e;
      }
      c.mix(out, c.fade(x, 4, sr), Math.max(0, tk - L * 0.35), 1.1 * p.creak * (0.45 + 0.55 * a), sr);
    }
    if (p.rattle > 0) {
      const clinks = Math.round(2 + p.rattle * 8 * (0.5 + 0.5 * a)), dec = Math.min(mat.dec, half * 0.15);
      let t = tk + 0.008 + r() * 0.02, gap = 0.025 + r() * 0.03, g = 1;
      for (let j = 0; j < clinks; j++) {
        const base = mat.base * (0.88 + r() * 0.24);
        const modes = mat.ratios.map((q, z) => [base * q * (0.96 + r() * 0.08), (1 / (1 + z * 0.6)) * (0.5 + r() * 0.5)]);
        c.mix(out, c.ring(modes, dec * 6, dec * (0.7 + r() * 0.6), sr), t + 0.0008, 0.45 * p.rattle * g * a, sr);
        c.mix(out, c.burst(r, 0.006, "hp", 2500 + r() * 2500, 0.8, 0.0004, 0.0015, sr), t, mat.nz * 0.35 * p.rattle * g * a, sr);
        t += gap * (0.6 + 0.8 * r()); gap *= 0.74; g *= 0.62 + 0.28 * r();
      }
    }
  }
  c.fade(c.finish(out, 0.85, 1.1), 40, sr);
  return { samples: out };
}
