// Brush push: a body forcing through fern, bramble or sapling. Irregular branch encounters each bring bright leaf-flick grains, a stick-slip scrape stroke and a plant signature (frond swish, thorn zipper, stem creak). A scatter of loose leaves and a light air body sit underneath. Saplings whip back, and an optional twig snap cracks on top.
export const meta = {
  title: "Undergrowth Push", kind: "foley", format: "sound", duration: 1.2, price: 2, author: "stormfront", payout: "stormfront@creators.oasis.example", kit: "Forest at Night", description: "Pushing through ferns, brambles or saplings: force, leaf rustle, branch scrape and length are knobs, and every seed is a different shove through the brush.",
  tags: ["foley", "undergrowth", "bushes", "rustle", "branches", "forest", "movement", "leaves"],
};
export const params = { knobs: {
  plant: { type: "choice", label: "Plant", default: "fern", options: ["fern", "bramble", "sapling"] },
  force: { type: "range", label: "Push force", default: 0.5, min: 0, max: 1, step: 0.01 },
  rustle: { type: "range", label: "Leaf rustle", default: 0.6, min: 0, max: 1, step: 0.01 },
  scrape: { type: "range", label: "Scrape", default: 0.4, min: 0, max: 1, step: 0.01 },
  duration: { type: "range", label: "Duration", default: 1.2, min: 0.4, max: 3.5, step: 0.05 },
  snap: { type: "toggle", label: "Twig snap", default: false },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, idx = params.knobs.plant.options.indexOf(p.plant), r = c.rng(p.seed * 6113 + idx * 409 + 3);
  const D = p.duration, F = p.force, R = p.rustle, S = p.scrape, n = c.seconds(D + 0.35, sr), out = new Float32Array(n);
  const ss = (x) => { x = c.clamp(x, 0, 1); return x * x * (3 - 2 * x); };
  const a = 0.06 + 0.1 * r(), b = 0.62 + 0.15 * r(), bumps = [];
  for (let k = 0, m = 2 + Math.floor(r() * 3 + D * 1.5); k < m; k++) bumps.push([0.08 + 0.84 * r(), (0.03 + 0.1 * r()) / Math.sqrt(D), 0.3 + 0.7 * r()]);
  const G = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = i / sr / D; if (x >= 1) break;
    let s = 0.35; for (const [cx, w, h] of bumps) { const d = (x - cx) / w; s += 0.65 * h * Math.exp(-d * d); }
    G[i] = Math.min(1, s) * ss(x / a) * ss((1 - x) / (1 - b));
  }
  const gAt = (t) => G[Math.min(n - 1, Math.max(0, Math.floor(t * sr)))];
  const pick = () => { for (let k = 0; k < 30; k++) { const t = r() * D; if (r() < gAt(t)) return t; } return D * r(); };
  const P = [
    { f: 3400, Q: 1.0, d0: 0.012, d1: 0.032, att: 0.004, sc: 2600, body: 0.3 },
    { f: 4800, Q: 2.2, d0: 0.004, d1: 0.012, att: 0.0008, sc: 4300, body: 0.18 },
    { f: 2300, Q: 1.4, d0: 0.006, d1: 0.02, att: 0.0015, sc: 1400, body: 0.45 },
  ][idx];
  const body = c.brown(r, n), op = c.onepole(sr), bh = c.biquad("hp", 140, 0.7, sr);
  for (let i = 0; i < n; i++) body[i] = bh(op(body[i], 300 + 900 * F * G[i])) * G[i];
  c.mix(out, body, 0, P.body * (0.3 + 0.7 * F), sr);
  const grain = (t, g, fm) => c.mix(out, c.burst(r, c.between(r, P.d0, P.d1), "bp", P.f * fm * (0.55 + 0.9 * r()), P.Q * (0.7 + 0.6 * r()), P.att * (0.6 + 0.8 * r()), P.d0 * (0.4 + r()), sr), t, g, sr);
  for (let g = 0, m = Math.round(D * (40 + 220 * R) * (0.6 + 0.6 * F)); g < m; g++) { const t = pick(); grain(t, (0.1 + 0.35 * r()) * (0.15 + 0.85 * R) * gAt(t), 1.1); }
  const stroke = (t, len, fc, g) => {
    const m = c.seconds(len, sr), x = c.noise(r, m), l1 = c.onepole(sr), l2 = c.onepole(sr), dir = r() < 0.5 ? 1 : -1;
    let amp = 0.5, hold = 0, slip = idx === 2 ? 0.3 : 0.5;
    for (let i = 0; i < m; i++) {
      if (--hold <= 0) { hold = 20 + Math.floor(r() * 140); amp = r() < slip ? 0.6 + 0.4 * r() : 0.1 + 0.2 * r(); }
      const u = i / m, f = fc * (1 + dir * 0.25 * (u - 0.5)), h = l1(x[i], f * 1.6);
      x[i] = (h - l2(h, f * 0.55)) * amp * Math.sin(Math.PI * Math.min(1, u * 5)) * (1 - u);
    }
    c.mix(out, x, t, g, sr);
  };
  const rate = 2 + 3 * F;
  for (let t = 0.03 + r() * 0.08; t < D * 0.93; t += (0.06 + 0.9 * -Math.log(1 - 0.98 * r())) / rate) {
    if (r() > gAt(t) + 0.15) continue;
    const e = gAt(t) * (0.3 + 0.7 * Math.pow(r(), 0.7)), k = Math.round(3 + 22 * R * (0.6 + 0.6 * F)), spread = 0.05 + 0.25 * r();
    for (let g = 0; g < k; g++) { const u = Math.pow(r(), 1.5); grain(t + spread * u, (0.2 + 0.6 * r()) * (0.15 + 0.85 * R) * e * (1 - 0.6 * u), 1); }
    if (S > 0.01 && r() < 0.5 + 0.5 * S) stroke(t + 0.02 * r(), (0.05 + 0.3 * r()) * (0.7 + 0.6 * F), P.sc * (0.7 + 0.6 * r()), 1.4 * S * e);
    if (idx === 0 && r() < 0.6) {
      const m = c.seconds(0.08 + 0.22 * r(), sr), x = c.noise(r, m), l1 = c.onepole(sr), l2 = c.onepole(sr), f0 = 5000 + 2500 * r();
      for (let i = 0; i < m; i++) { const u = i / m; x[i] = (l1(x[i], f0 * (1 - 0.5 * u)) - l2(x[i], 1500)) * Math.sin(Math.PI * Math.min(1, u * (1.5 + 2 * r()))) * (1 - u); }
      c.mix(out, x, t, 0.8 * e * (0.3 + 0.7 * R), sr);
    } else if (idx === 1 && r() < 0.4 + 0.6 * S) {
      const g = (0.4 + 0.5 * r()) * (0.3 + 0.7 * S) * e;
      c.mix(out, c.burst(r, 0.015 + r() * 0.02, "bp", 5000 + r() * 3000, 5, 0.0008, 0.006, sr), t, g, sr);
      for (let z = 0, zt = t, m = 5 + Math.floor(r() * 8); z < m; z++) { zt += 0.002 + r() * 0.008; c.mix(out, c.burst(r, 0.003, "hp", 5500 + r() * 3000, 1, 0.0003, 0.0008, sr), zt, g * (0.3 + 0.5 * r()), sr); }
    } else if (idx === 2 && r() < 0.6) {
      const len = 0.08 + 0.17 * r(), base = 380 + 400 * r();
      for (let tt = 0; tt < len; ) {
        const x = tt / len; tt += (1 / (30 + 60 * x)) * (0.6 + 0.8 * r());
        c.mix(out, c.burst(r, 0.004, "bp", base * (0.9 + 0.2 * r()), 7, 0.0004, 0.0012, sr), t + tt, (0.3 + 0.3 * r()) * Math.sin(Math.PI * x) * e * (0.35 + 0.65 * F), sr);
      }
    }
  }
  if (idx === 2) {
    const tw = D * (0.82 + 0.06 * r()), wn = c.seconds(0.16, sr), w = c.noise(r, wn), wl = c.onepole(sr);
    for (let i = 0; i < wn; i++) { const x = i / wn; w[i] = wl(w[i], 3500 - 2800 * x) * Math.sin(Math.PI * Math.min(1, x * 3)) * (1 - x) * (1 - x); }
    c.mix(out, w, tw, 0.7 * (0.4 + 0.6 * F), sr);
    c.mix(out, c.ring([[150 + 40 * r(), 1], [330 + 50 * r(), 0.5], [760, 0.2]], 0.15, 0.025, sr), tw + 0.1, 0.4 * (0.3 + 0.7 * F), sr);
  }
  c.finish(out, p.snap ? 0.6 : 0.85, 1.3);
  if (p.snap) {
    const t = D * (0.3 + 0.4 * r()), j = 0.85 + 0.3 * r();
    c.mix(out, c.burst(r, 0.008, "hp", 1800, 0.8, 0.0004, 0.002, sr), t, 1.1, sr);
    c.mix(out, c.ring([[900 * j, 1], [2100 * j, 0.6], [3600 * j, 0.35]], 0.07, 0.01, sr), t + 0.0005, 0.6, sr);
    c.mix(out, c.ring([[170 * j, 1], [340 * j, 0.3]], 0.1, 0.02, sr), t + 0.001, 0.4, sr);
    for (let k = 0; k < 8; k++) c.mix(out, c.burst(r, 0.004, "bp", 2500 + r() * 4000, 3, 0.0003, 0.001, sr), t + 0.005 + r() * 0.04, 0.4 * r(), sr);
    c.finish(out, 0.92, 1.2);
  }
  let last = n - 1; while (last > 0 && Math.abs(out[last]) < 0.004) last--;
  const res = out.slice(0, Math.min(n, last + c.seconds(0.03, sr)));
  c.gain(res, 0.6 + 0.4 * F);
  c.fade(res, 25, sr);
  return { samples: res };
}
