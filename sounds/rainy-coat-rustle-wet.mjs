// Wet raincoat: crinkle impulses ringing in fabric resonances over a thin swish bed, stick-slip squeak chirps, a ratcheting zipper tooth run, and a drip-off tail with a trickle.
export const meta = {
  title: "Wet Raincoat Rustle", kind: "foley", format: "sound", duration: 1.4, price: 1, author: "foleyroom", payout: "foleyroom@creators.oasis.example", kit: "Rainy City Street", description: "A soaked raincoat shifting on a body: vinyl, nylon or wool crinkle, rubbery water squeaks, a zipper pull and a dripping tail as knobs, for characters coming in off a rainy night street.",
  tags: ["raincoat", "cloth", "foley", "zipper", "rustle", "wet", "squeak", "rain"],
};
export const params = { knobs: {
  fabric: { type: "choice", label: "Fabric", default: "vinyl", options: ["vinyl", "nylon", "wool"] },
  movement: { type: "range", label: "Movement", default: 0.55, min: 0, max: 1, step: 0.01 },
  squeak: { type: "range", label: "Water squeak", default: 0.5, min: 0, max: 1, step: 0.01 },
  zipper: { type: "range", label: "Zipper presence", default: 0.5, min: 0, max: 1, step: 0.01 },
  speed: { type: "range", label: "Speed", default: 1, min: 0.5, max: 2, step: 0.05 },
  tail: { type: "toggle", label: "Drip tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, fi = params.knobs.fabric.options.indexOf(p.fabric), r = c.rng(p.seed * 7919 + fi * 211 + 3);
  const F = [
    { b1: 2600, b2: 5400, Q: 3, dens: 1100, pw: 3, bed: 0.22, hp: 900, lo: 1800, hi: 5000, sq: 900, kz: 1, len: 1 },
    { b1: 4300, b2: 7600, Q: 2.2, dens: 2400, pw: 2, bed: 0.4, hp: 2200, lo: 4000, hi: 6000, sq: 1300, kz: 1.15, len: 0.8 },
    { b1: 650, b2: 1500, Q: 1.2, dens: 450, pw: 1.5, bed: 0.9, hp: 120, lo: 500, hi: 1200, sq: 450, kz: 0.75, len: 1.4 },
  ][fi];
  const m = p.movement, sp = p.speed, q = p.squeak, z = p.zipper, zon = z > 0.01, ng = 1 + Math.round(m * 4);
  const zl = (0.22 + 0.3 * z) / sp, gests = [];
  let t = 0.015, end = 0, zs = 0;
  for (let k = 0; k < ng; k++) {
    const d = (0.16 + 0.2 * r()) * F.len * (1.25 - 0.45 * m) / sp;
    gests.push([t, d, (0.3 + 0.7 * m) * (0.6 + 0.4 * r())]); end = Math.max(end, t + d);
    if (k === 0 && zon) { zs = t + d * 0.85; t = zs + zl + 0.04; end = Math.max(end, zs + zl + 0.06); }
    else t += d * (1.05 - 0.6 * m) * (0.7 + 0.6 * r());
  }
  const tailLen = p.tail ? 0.85 : 0, n = c.seconds(end + 0.3 + tailLen, sr), out = new Float32Array(n), env = new Float32Array(n);
  for (const [t0, d, a] of gests) {
    const i0 = Math.floor(t0 * sr), L = Math.floor(d * sr);
    for (let j = 0; j < L && i0 + j < n; j++) {
      const u = j / L, s = Math.sin(Math.PI * 0.5 * Math.min(1, u / 0.3));
      env[i0 + j] += a * (u < 0.3 ? s * s : 0.5 + 0.5 * Math.cos(Math.PI * (u - 0.3) / 0.7));
    }
  }
  const cal = (f, Q) => { const h = c.biquad("bp", f, Q, sr); let mx = 1e-6; for (let i = 0; i < 256; i++) mx = Math.max(mx, Math.abs(h(i ? 0 : 1))); return 1 / mx; };
  const k1 = cal(F.b1, F.Q), k2 = cal(F.b2, F.Q * 1.3), b1 = c.biquad("bp", F.b1, F.Q, sr), b2 = c.biquad("bp", F.b2, F.Q * 1.3, sr);
  const x = c.noise(r, n), hp = c.biquad("hp", F.hp, 0.7, sr), lp = c.onepole(sr), lp2 = c.onepole(sr);
  const pr = F.dens * (0.25 + 0.75 * m) * Math.sqrt(sp) / sr;
  for (let i = 0; i < n; i++) {
    const e = env[i];
    let ex = 0;
    if (e > 0.01 && r() < pr * e * 1.5) ex = (r() < 0.5 ? -1 : 1) * e * (0.25 + 0.75 * Math.pow(r(), F.pw));
    const f = F.lo + F.hi * e;
    out[i] = b1(ex) * k1 + 0.6 * b2(ex) * k2 + lp2(lp(hp(x[i]), f), f) * e * F.bed * 0.5;
  }
  let ss = 0, cn = 0;
  for (let i = 0; i < n; i++) if (env[i] > 0.05) { ss += out[i] * out[i]; cn++; }
  const U = 3 * Math.sqrt(ss / Math.max(1, cn)) || 0.1;
  if (fi === 2) for (const [t0, d, a] of gests) c.mix(out, c.ring([[85 + 30 * r(), 1], [190 + 40 * r(), 0.35]], 0.16, 0.035, sr), t0 + d * 0.3, U * 0.8 * a, sr);
  const chirp = (at, dur, f0, gl, amp) => {
    const L = c.seconds(dur, sr), b = new Float32Array(L), f1 = c.biquad("bp", F.sq * 2.2, 5, sr), f2 = c.biquad("bp", F.sq * 4.5, 4, sr);
    let ph = 0, per = 1, mx = 1e-6;
    for (let j = 0; j < L; j++) {
      const u = j / L; ph += f0 * (1 + gl * u) * per / sr;
      let imp = 0;
      if (ph >= 1) { ph -= 1; per = 0.9 + 0.2 * r(); imp = 0.5 + 0.5 * r(); }
      const e = Math.min(1, j / (0.003 * sr)) * Math.min(1, (L - j) / (0.008 * sr)) * (1 - 0.5 * u);
      b[j] = (f1(imp) + 0.6 * f2(imp) + 0.15 * imp) * e; mx = Math.max(mx, Math.abs(b[j]));
    }
    c.mix(out, c.gain(b, amp / mx) || b, at, 1, sr);
  };
  const nq = q > 0.01 ? 1 + Math.round(q * 3) : 0;
  for (let k = 0; k < nq; k++) {
    const g = gests[Math.floor(r() * ng)], nc = 2 + Math.floor(r() * 3), f0 = F.sq * (0.35 + 0.25 * r());
    let at = g[0] + g[1] * (0.15 + 0.4 * r());
    for (let s = 0; s < nc; s++) {
      const dur = (0.025 + 0.045 * r()) / Math.sqrt(sp);
      chirp(at, dur, f0 * (1 + 0.15 * s) * (0.9 + 0.2 * r()), 0.2 + 0.5 * r(), U * (0.55 + 0.7 * q) * (0.7 + 0.3 * r()));
      at += dur + (0.008 + 0.03 * r()) / sp;
    }
  }
  const drop = (at, f, g) => {
    const L = c.seconds(0.04, sr), b = new Float32Array(L); let ph = 0;
    for (let j = 0; j < L; j++) { const s = j / sr; ph += f * (1 + 25 * s) / sr; b[j] = Math.sin(c.TAU * ph) * Math.exp(-s / 0.008) * Math.min(1, s / 0.0015); }
    c.mix(out, b, at, g, sr);
  };
  for (let k = 0, nd = Math.round(q * 8); k < nd; k++) { const g = gests[Math.floor(r() * ng)]; drop(g[0] + r() * g[1], 1300 + r() * 2000, U * (0.3 + 0.4 * r()) * q); }
  if (zon) {
    const rate = (38 + 30 * z) * sp * (fi === 2 ? 0.85 : 1) * (0.9 + 0.2 * r()), L8 = c.seconds(0.01, sr);
    let tt = 0.004, tooth = 0, cnt = 0;
    while (tt < zl - 0.012 && cnt++ < 300) {
      const v = 0.8 + 0.2 * Math.sin(Math.PI * tt / zl), i0 = Math.round((zs + tt) * sr), a = U * (1.2 + 1.3 * z) * (tooth++ % 2 ? 0.75 : 1) * (0.85 + 0.15 * v);
      const f = 3000 * F.kz * (0.97 + 0.06 * r());
      for (let j = 0; j < L8 && i0 + j < n; j++) { const s = j / sr; out[i0 + j] += a * Math.min(1, s / 0.0003) * ((r() * 2 - 1) * Math.exp(-s / 0.0008) + 0.6 * Math.sin(c.TAU * f * s) * Math.exp(-s / 0.002)); }
      tt += (0.96 + 0.08 * r()) / (rate * v);
    }
    const L = c.seconds(zl, sr), h = c.noise(r, L), bz = c.biquad("bp", 2200 * F.kz, 1.4, sr);
    for (let j = 0; j < L; j++) h[j] = bz(h[j]) * Math.sin(Math.PI * j / L);
    c.mix(out, h, zs, U * 0.12, sr);
    c.mix(out, c.ring([[1700 * F.kz, 1], [4100 * F.kz, 0.5]], 0.05, 0.008, sr), zs + zl, U * 0.7 * z, sr);
  }
  if (p.tail) {
    const nd = 14 + Math.floor(r() * 8);
    for (let k = 0; k < nd; k++) { const u = Math.pow(r(), 1.8); drop(end + 0.02 + u * 0.75, 900 + r() * 1900, U * (0.35 + 0.35 * r()) * (1 - 0.6 * u)); }
    const L = c.seconds(0.75, sr), tr = c.noise(r, L), bt = c.biquad("bp", 3200, 1, sr); let gg = 0, gt = 0;
    for (let j = 0; j < L; j++) { if (j % 220 === 0) gt = r() < 0.5 ? r() : 0.1; gg += (gt - gg) * 0.02; tr[j] = bt(tr[j]) * gg * Math.exp(-j / sr / 0.3) * Math.min(1, j / (0.02 * sr)); }
    c.mix(out, tr, end, U * 0.25, sr);
  }
  const w = c.reverb(out, { size: 0.3, decay: 0.4, mixAmt: 0.14 }, sr) || out;
  if (w !== out) for (let i = 0; i < n; i++) out[i] = w[i] || 0;
  c.finish(out, 0.9, 1.1);
  let last = n - 1;
  while (last > 0 && Math.abs(out[last]) < 0.001) last--;
  const res = out.slice(0, Math.min(n, last + c.seconds(0.03, sr))), fl = Math.min(res.length >> 2, c.seconds(0.03, sr));
  c.fade(res, 3, sr);
  for (let j = 0; j < fl; j++) res[res.length - 1 - j] *= j / fl;
  return { samples: res };
}
