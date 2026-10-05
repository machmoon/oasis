// Far thunder roll: uneven brown-noise swells behind buildings with a sub swell, a muffled tearing crack mid-swell, slapback echoes and rain wash.
export const meta = {
  title: "Distant Thunder Roll", kind: "sfx", format: "sound", duration: 3.6, price: 3, author: "foleyroom", payout: "foleyroom@creators.oasis.example", kit: "Rainy City Street", description: "A far thunder roll that swells in from behind rain-soaked city blocks in several uneven rumbles, with storm size, rumble depth, crack, roll length, pitch and a building-echo tail as knobs; every seed is a different strike.",
  tags: ["thunder", "storm", "rumble", "weather", "rain", "city", "distant", "night"],
};
export const params = { knobs: {
  size: { type: "choice", label: "Size", default: "medium", options: ["small", "medium", "large"] },
  depth: { type: "range", label: "Rumble depth", default: 0.6, min: 0, max: 1, step: 0.01 },
  crack: { type: "range", label: "Crack amount", default: 0.4, min: 0, max: 1, step: 0.01 },
  roll: { type: "range", label: "Roll length", default: 0.6, min: 0, max: 1, step: 0.01 },
  pitch: { type: "range", label: "Pitch", default: 1, min: 0.5, max: 2, step: 0.01 },
  tail: { type: "toggle", label: "Echo tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const si = params.knobs.size.options.indexOf(p.size), sr = c.sr, r = c.rng(p.seed * 4703 + si * 211 + 3), ny = sr * 0.42;
  const S = [{ k: 2, span: 1.1, sub: 0.35, lp: 620, att: 0.13, dec: 0.2, cs: 0.05 }, { k: 3, span: 2.1, sub: 0.75, lp: 420, att: 0.24, dec: 0.34, cs: 0.1 }, { k: 5, span: 3.1, sub: 1.15, lp: 280, att: 0.36, dec: 0.5, cs: 0.16 }][si];
  const pf = p.pitch, depth = p.depth, crack = p.crack, roll = p.roll, dk = 1 / Math.sqrt(pf), dm = (p.tail ? 1 : 0.7) * dk;
  const pk = (b) => { let m = 1e-9; for (let i = 0; i < b.length; i++) m = Math.max(m, Math.abs(b[i])); return m; };
  const span = S.span * (0.4 + 0.6 * roll), K = S.k + Math.round(roll * (S.k + 1)), P = [], peakAt = 0.15 + 0.35 * r();
  for (let j = 0; j < K; j++) {
    const x = j / K, t = j === 0 ? 0.01 : 0.01 + span * c.clamp((j + 0.6 * (r() - 0.5)) / K, 0.05, 1);
    const a = j === 0 ? 0.55 + 0.25 * r() : (0.35 + 0.65 * r()) * (0.35 + 0.65 * Math.exp(-Math.abs(x - peakAt) * 2.2));
    const at = j === 0 ? S.att * (1.2 + 0.6 * r()) : S.att * (0.5 + 0.9 * r());
    P.push({ t, a, at, dec: (S.dec + 0.25 * depth) * (0.6 + 0.8 * r()) * dm });
  }
  let end = 0; for (const q of P) end = Math.max(end, q.t + q.at + q.dec * 3.5);
  const tailT = p.tail ? 0.9 + 0.2 * si : 0.12, maxEnd = 3.9 - tailT;
  if (end > maxEnd) { const k = maxEnd / end; for (const q of P) { q.t *= k; q.at *= k; q.dec *= k; } end = maxEnd; }
  const n = c.seconds(end + tailT, sr), out = new Float32Array(n);
  const B = 32, nb = Math.ceil(n / B) + 2, ev = new Float32Array(nb);
  for (let b = 0; b < nb; b++) {
    const t = b * B / sr; let s = 0;
    for (const q of P) { const d = t - q.t; if (d < 0) continue; const u = Math.sin(Math.min(1, d / q.at) * Math.PI / 2); s += q.a * (d < q.at ? u * u : Math.exp(-(d - q.at) / q.dec)); }
    ev[b] = s;
  }
  const em = pk(ev); for (let b = 0; b < nb; b++) ev[b] /= em;
  const br = c.brown(r, n), lpA = c.onepole(sr), lpB = c.onepole(sr), sub = c.biquad("lp", 48 * pf, 1.6, sr), rum = new Float32Array(n);
  const base = S.lp * (1.35 - 0.75 * depth) * pf, sm = 30 / sr, step = Math.max(1, Math.round(0.035 * sr));
  let g = 0.7, gt = 0.7;
  for (let i = 0; i < n; i++) {
    const bi = i / B, b0 = bi | 0, e = ev[b0] + (ev[b0 + 1] - ev[b0]) * (bi - b0);
    if (i % step === 0) gt = 0.4 + 0.6 * r();
    g += (gt - g) * sm;
    const x = br[i], f = base * (0.4 + 1.0 * Math.min(1, e));
    rum[i] = (lpB(lpA(x, f), f * 1.5) * (1 - 0.45 * depth) + sub(x) * S.sub * depth * 1.8) * e * g;
  }
  c.mix(out, rum, 0, 0.8 / pk(rum), sr);
  if (crack > 0.01) {
    const tc = P[0].t + P[0].at * 0.55, cr = new Float32Array(c.seconds(0.6, sr)), ng = Math.round(8 + 80 * crack), cs = S.cs + 0.08 * crack;
    c.mix(cr, c.burst(r, 0.25, "lp", Math.min(ny, (260 + 300 * crack) * pf), 0.8, 0.004, 0.06 + 0.03 * si, sr), 0, 0.9, sr);
    for (let k = 0; k < ng; k++) c.mix(cr, c.burst(r, 0.03, "bp", Math.min(ny, (500 + 3000 * r() * (0.4 + 0.6 * crack)) * pf), 1.2, 0.0015, 0.003 + 0.012 * r(), sr), Math.pow(r(), 1.5) * cs, 0.3 + 0.7 * r(), sr);
    c.filter(cr, c.biquad("lp", Math.min(ny, (1200 + 3300 * crack) * pf), 0.7, sr));
    c.mix(out, cr, tc, 1.1 * crack / pk(cr), sr);
    const per = Math.round(crack * 5), cl = new Float32Array(n);
    for (let j = 1; j < P.length; j++) for (let k = 0; k < per; k++) c.mix(cl, c.burst(r, 0.05, "bp", Math.min(ny, (200 + 700 * r()) * pf), 1.6, 0.002, 0.01 + 0.02 * r(), sr), P[j].t + r() * P[j].at * 1.5, P[j].a * (0.4 + 0.6 * r()), sr);
    if (per > 0) c.mix(out, cl, 0, 0.25 * crack / pk(cl), sr);
  }
  if (p.tail) {
    const echo = Float32Array.from(out); c.filter(echo, c.biquad("lp", 350 * pf, 0.7, sr));
    c.mix(out, echo, 0.25 + 0.06 * r(), 0.45, sr); c.mix(out, echo, 0.47 + 0.08 * r(), 0.3, sr); c.mix(out, echo, 0.75 + 0.1 * r(), 0.18, sr);
    c.reverb(out, { size: 0.85 + 0.05 * si, decay: 0.8 + 0.05 * si, mixAmt: 0.25 + 0.08 * si }, sr);
  }
  c.finish(out, 0.85, 1.3);
  let last = n - 1; while (last > 0 && Math.abs(out[last]) < 0.0015) last--;
  const len = Math.min(n, last + c.seconds(0.05, sr)), res = out.slice(0, len);
  const hiss = c.pink(r, len), hp = c.biquad("hp", 1200, 0.7, sr), lp = c.biquad("lp", 4500, 0.7, sr);
  for (let i = 0; i < len; i++) hiss[i] = lp(hp(hiss[i]));
  const drops = Math.round(len / sr * 30);
  for (let d = 0; d < drops; d++) c.mix(hiss, c.burst(r, 0.006, "bp", 2000 + r() * 2200, 3, 0.0004, 0.002, sr), r() * len / sr, 0.35 * pk(hiss) * r(), sr);
  const hg = 0.03 / pk(hiss), fi = 0.3 * sr, fo = 0.35 * sr;
  for (let i = 0; i < len; i++) res[i] += hiss[i] * hg * Math.min(1, i / fi, (len - i) / fo);
  c.finish(res, 0.88, 1.1);
  c.fade(res, 20, sr);
  return { samples: res };
}
