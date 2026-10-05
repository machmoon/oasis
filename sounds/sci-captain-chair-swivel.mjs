// Captain's chair swivel: a stick-slip creak whose pulse rate and pitch bend with angular speed, a bearing whir that sweeps with the turn, padded weight shift, an optional end-stop thunk and a little bridge air.
export const meta = {
  title: "Captain's Swivel", kind: "foley", format: "sound", duration: 1.4, price: 2, author: "quietmachine", payout: "quietmachine@creators.oasis.example", kit: "Sci-fi Console", description: "A starship command chair turning on its pedestal: padded creak, a bearing whir that sweeps with the rotation and an end-stop thunk, for bridge scenes and cockpit foley.",
  tags: ["chair", "swivel", "creak", "bearing", "scifi", "bridge", "foley", "rotation"],
};
export const params = { knobs: {
  material: { type: "choice", label: "Material", default: "leather", options: ["leather", "vinyl", "alloy"] },
  speed: { type: "range", label: "Speed", default: 1.3, min: 0.6, max: 2, step: 0.05 },
  creak: { type: "range", label: "Creak", default: 0.6, min: 0, max: 1, step: 0.01 },
  whir: { type: "range", label: "Bearing whir", default: 0.5, min: 0, max: 1, step: 0.01 },
  stop: { type: "toggle", label: "End stop", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, mi = Math.max(0, params.knobs.material.options.indexOf(p.material));
  const r = c.rng(p.seed * 6151 + mi * 97 + 3);
  const M = [
    { whir: 150, cr: [75, 200], f1: 640, f2: 1550, q: 6, pad: 0.9, bright: 2600, thump: [[82, 1], [137, 0.5], [212, 0.25]], td: 0.035, click: 1500 },
    { whir: 185, cr: [110, 260], f1: 1400, f2: 2800, q: 7, pad: 0.6, bright: 4000, thump: [[110, 1], [240, 0.5], [520, 0.25]], td: 0.03, click: 2200 },
    { whir: 290, cr: [380, 720], f1: 2300, f2: 4900, q: 13, pad: 0.15, bright: 7000, thump: [[1720, 1], [1734, 0.7], [2910, 0.45], [4480, 0.2]], td: 0.05, click: 3500 },
  ][mi];
  const rot = 1.3 / p.speed, dur = rot + 0.45, n = c.seconds(dur, sr), nr = c.seconds(rot, sr);
  const ca = 0.12 + 0.88 * p.creak, wa = 0.1 + 0.9 * p.whir;
  const skew = c.between(r, 0.3, 0.62), V = new Float32Array(n);
  for (let i = 0; i < nr; i++) { const u = i / nr, x = u < skew ? u / skew : 1 - (u - skew) / (1 - skew); V[i] = x * x * (3 - 2 * x); }
  const knots = (k) => { const a = []; for (let j = 0; j <= Math.ceil(dur / k) + 2; j++) a.push(r()); return (i) => { const t = i / sr / k, j = Math.floor(t), f = t - j; return a[j] + (a[j + 1] - a[j]) * f; }; };
  const norm = (b) => { let m = 1e-9; for (let i = 0; i < b.length; i++) m = Math.max(m, Math.abs(b[i])); for (let i = 0; i < b.length; i++) b[i] /= m; return b; };
  const out = new Float32Array(n);
  // creak: stick-slip pulse train, rate bent by angular speed and a seeded wobble, through the material's formants
  const wob = knots(0.11), gate = knots(0.19), cr = new Float32Array(n);
  const b1 = c.biquad("bp", M.f1 * c.between(r, 0.9, 1.1), M.q, sr), b2 = c.biquad("bp", M.f2 * c.between(r, 0.9, 1.1), M.q * 1.3, sr);
  const kd = Math.exp(-1 / (0.0005 * sr)); let ph = 0, ex = 0;
  for (let i = 0; i < n; i++) {
    const v = V[i];
    const rate = (M.cr[0] + (M.cr[1] - M.cr[0]) * (0.15 + 0.85 * v) * (0.75 + 0.5 * wob(i))) * (0.8 + 0.2 * p.speed);
    ph += rate / sr;
    if (ph >= 1) { ph -= 1; ex += 0.5 + 0.5 * r(); }
    ex *= kd;
    const gg = Math.max(0.35, c.clamp((gate(i) - 0.2) * 3, 0, 1)), e = v > 0.003 ? gg * v * (1.6 - 0.6 * v) : 0;
    cr[i] = (b1(ex) + 0.6 * b2(ex)) * e;
  }
  c.mix(out, norm(cr), 0, 0.7 * ca, sr);
  // bearing whir: a pitched tone sweeping with angular speed, a beating twin and a caged ball rumble
  const wh = new Float32Array(n), nz = c.noise(r, n), bb = c.biquad("bp", M.bright * 0.5, 2, sr), lpw = c.biquad("lp", M.bright, 0.7, sr);
  const base = M.whir * c.between(r, 0.96, 1.04) * Math.sqrt(p.speed);
  let p1 = 0, p2 = 0, p3 = 0, pb = 0;
  for (let i = 0; i < n; i++) {
    const v = V[i], f = base * (0.35 + 0.65 * v), a = v * (0.3 + 0.7 * v);
    p1 += c.TAU * f / sr; p2 += c.TAU * f * 2.007 / sr; p3 += c.TAU * f * 3.48 / sr; pb += c.TAU * f * 0.41 / sr;
    const tone = Math.sin(p1) + 0.4 * Math.sin(p2) + (0.15 + 0.25 * mi) * Math.sin(p3);
    const ball = bb(nz[i]) * (0.55 + 0.45 * Math.sin(pb)) * (0.6 + 0.3 * mi);
    wh[i] = lpw(tone * 0.6 + ball) * a;
  }
  c.mix(out, norm(wh), 0, 0.5 * wa, sr);
  // padding: compressed cushion and the sitter's weight shift as the turn starts
  const np = c.seconds(Math.min(rot, 0.8), sr), pad = c.pink(r, np), lpp = c.biquad("lp", 350 + M.bright * 0.12, 0.8, sr), fl = knots(0.04);
  for (let i = 0; i < np; i++) { const t = i / sr; pad[i] = lpp(pad[i]) * Math.min(1, t / 0.02) * Math.exp(-t / 0.2) * (0.5 + 0.5 * fl(i)); }
  c.mix(out, norm(pad), 0.002, 0.3 * M.pad, sr);
  c.mix(out, c.ring(M.thump.map(([f, a]) => [f * c.between(r, 0.97, 1.03) * (mi === 2 ? 0.6 : 1), a]), 0.2, 0.02, sr), 0.003, 0.2, sr);
  c.mix(out, c.burst(r, 0.025, "lp", 800 + M.bright * 0.2, 0.7, 0.001, 0.008, sr), 0, 0.25, sr);
  if (p.stop) {
    const t0 = rot - 0.03 + c.between(r, 0, 0.02), hit = 0.75 + 0.35 * p.speed;
    c.mix(out, c.ring(M.thump.map(([f, a]) => [f * c.between(r, 0.98, 1.02), a * c.between(r, 0.7, 1)]), 0.3, M.td, sr), t0 + 0.001, 0.75 * hit, sr);
    c.mix(out, c.burst(r, 0.02, mi === 2 ? "hp" : "bp", M.click, mi === 2 ? 0.8 : 1.2, 0.0008, 0.005, sr), t0, 0.7 * hit, sr);
    c.mix(out, c.burst(r, 0.012, "bp", M.bright * 0.6, 2, 0.0005, 0.003, sr), t0 + 0.035 + r() * 0.02, 0.2 * hit, sr);
  }
  const wet = c.reverb(out, { size: 0.35, decay: 0.5, mixAmt: 0.1 }, sr);
  const res = wet && wet.length ? wet : out;
  c.finish(res, 0.88, 1.1);
  c.fade(res, 15, sr);
  return { samples: res };
}
