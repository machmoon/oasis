// Twig Snap: an instant bright fracture click, a beam-mode crack, green-fibre tear, splinter crackle, litter, a foot thump, bouncing pieces and a short forest tail.
export const meta = {
  title: "Twig Snap", kind: "foley", format: "sound", duration: 0.45, price: 1, author: "stormfront", payout: "stormfront@creators.oasis.example", kit: "Forest at Night", description: "A twig cracking underfoot on a forest floor: thickness, dryness, force, splinter crackle and distance are knobs, and every seed is a different branch for night-walk foley.",
  tags: ["twig", "snap", "branch", "crack", "forest", "footstep", "foley", "night"],
};
export const params = { knobs: {
  thickness: { type: "choice", label: "Twig thickness", default: "medium", options: ["thin", "medium", "thick"] },
  dryness: { type: "range", label: "Dryness", default: 0.75, min: 0, max: 1, step: 0.01 },
  force: { type: "range", label: "Force", default: 0.6, min: 0, max: 1, step: 0.01 },
  crackle: { type: "range", label: "Splinter crackle", default: 0.5, min: 0, max: 1, step: 0.01 },
  distance: { type: "range", label: "Distance", default: 0.2, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Forest tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, ti = params.knobs.thickness.options.indexOf(p.thickness), ny = sr * 0.45;
  const r = c.rng(p.seed * 6151 + ti * 389 + 23), dry = p.dryness, f = p.force, far = p.distance;
  const T = [{ f0: 3400, sz: 0.5 }, { f0: 1800, sz: 0.8 }, { f0: 820, sz: 1.2 }][ti];
  const out = new Float32Array(c.seconds(1.0, sr));
  let last = 0;
  const at = (buf, t, g) => { c.mix(out, buf, t, g, sr); last = Math.max(last, t + buf.length / sr); };
  const snap = 0.003 + 0.002 * r();
  const crack = (t, g) => {
    at(c.burst(r, 0.006, "hp", 2500 + 5000 * dry, 0.7, 0.0003, 0.0008 + 0.0025 * (1 - dry), sr), t, g * (0.7 + 0.5 * dry));
    at(c.burst(r, 0.01, "bp", Math.min(T.f0 * 2.4, ny), 1.8, 0.0004, 0.0018, sr), t, g * 0.45);
    const b = T.f0 * (0.9 + 0.2 * r()) * (0.8 + 0.3 * dry), dec = (0.005 + 0.022 * dry) * T.sz;
    const modes = [[1, 1], [2.756, 0.65], [5.404, 0.4 * (0.3 + dry)], [8.933, 0.25 * dry]];
    at(c.ring(modes.map(([m, a]) => [Math.min(b * m * (0.98 + 0.04 * r()), ny), a]), dec * 7 + 0.01, dec, sr), t + 0.0005, g * 0.7);
  };
  const g0 = 0.55 + 0.45 * f;
  crack(snap, g0);
  if (ti > 0 && r() < 0.35 + 0.4 * ti * dry) crack(snap + 0.008 + 0.022 * r() * T.sz, g0 * (0.45 + 0.25 * r()));
  at(c.burst(r, 0.02 * T.sz, "lp", 1400 + 900 * dry, 0.8, 0.0008, 0.006, sr), snap, (0.12 + 0.15 * f) * T.sz);
  if (dry < 0.95) {
    const n = c.seconds(0.03 + 0.09 * (1 - dry) * T.sz, sr), x = c.noise(r, n), bp = c.biquad("bp", 800 + 600 * dry + 500 * (2 - ti), 1.4, sr);
    let fl = 1;
    for (let i = 0; i < n; i++) { if (i % 90 === 0) fl = 0.3 + 0.7 * r(); x[i] = bp(x[i]) * fl * Math.min(1, i / (0.002 * sr)) * (1 - i / n); }
    at(x, snap + 0.001, 0.9 * (1 - dry) * (0.5 + 0.5 * f));
  }
  const spl = Math.round(p.crackle * (18 + 34 * dry) * (0.6 + 0.4 * f) * (0.7 + 0.3 * T.sz));
  for (let k = 0; k < spl; k++) {
    const d = -Math.log(1 - r() * 0.97) * 0.02 * T.sz;
    at(c.burst(r, 0.002 + 0.004 * r(), "bp", Math.min(2600 + 6000 * r() * (0.5 + 0.5 * dry), ny), 3 + 3 * r(), 0.0003, 0.0007 + 0.001 * r(), sr), snap + 0.002 + d, (0.12 + 0.35 * r()) * Math.exp(-d / 0.06));
  }
  const litter = Math.round(8 + 18 * f);
  for (let k = 0; k < litter; k++) at(c.burst(r, 0.005, "bp", 1300 + 3000 * r(), 2, 0.0006, 0.002, sr), snap + 0.001 + r() * 0.06 * T.sz, 0.05 + 0.1 * r());
  const th = 75 + 30 * (2 - ti) + 10 * r();
  at(c.ring([[th, 1], [th * 2.1, 0.35], [th * 4.3, 0.15]], 0.12 * T.sz, (0.012 + 0.02 * f) * T.sz, sr), snap, (0.06 + 0.3 * f) * T.sz);
  let bt = snap + (0.035 + 0.05 * r()) * T.sz, gap = (0.03 + 0.03 * r()) * T.sz, bg = 0.22 * (0.4 + 0.6 * f);
  for (let k = 0, nb = 1 + ti + Math.round(1.5 * f); k < nb; k++) {
    const pf = T.f0 * (1.6 + r()) * (0.8 + 0.3 * dry);
    at(c.ring([[Math.min(pf, ny), 1], [Math.min(pf * 2.7, ny), 0.4]], 0.03, 0.004 + 0.004 * dry, sr), bt, bg);
    at(c.burst(r, 0.003, "hp", 2500, 0.7, 0.0003, 0.0008, sr), bt, bg * 0.6);
    bt += gap; gap *= 0.55 + 0.1 * r(); bg *= 0.6;
  }
  if (p.tail) {
    let st = snap + (0.03 + 0.03 * r()) * T.sz, sg = 0.12 + 0.1 * f;
    for (let k = 0, ns = 3 + Math.round(4 * f * T.sz); k < ns; k++) {
      at(c.burst(r, 0.015 + 0.025 * r(), "bp", 1500 + 2500 * r(), 1, 0.002 + 0.003 * r(), 0.006 + 0.008 * r(), sr), st, sg * (0.6 + 0.6 * r()));
      st += (0.012 + 0.035 * r()) * T.sz * (1 + 0.25 * k); sg *= 0.75;
    }
  }
  let end = Math.min(last + 0.02, 0.7);
  if (p.tail) {
    const wet = new Float32Array(out.length), fb = 0.55 + 0.1 * far;
    for (const ms of [29.7, 37.1, 41.1, 43.7]) {
      const d = Math.round(ms * (0.8 + 0.4 * far) * sr / 1000), buf = new Float32Array(d), lp = c.onepole(sr);
      for (let i = 0, j = 0; i < out.length; i++, j = (j + 1) % d) { const y = buf[j]; wet[i] += y; buf[j] = out[i] + fb * lp(y, 3200 - 1200 * far); }
    }
    const w = (0.12 + 0.12 * far) * (0.85 + 0.3 * r());
    for (let i = 0; i < out.length; i++) out[i] += wet[i] * w;
    end = Math.min(end + (0.1 + 0.14 * far) * (0.6 + 0.4 * T.sz), 0.95);
  }
  const lp = c.biquad("lp", Math.min(16000 * Math.pow(0.25, far), ny), 0.7, sr), hp = c.biquad("hp", 60 + 60 * (2 - ti), 0.7, sr);
  c.filter(out, (x) => lp(hp(x)));
  const s = out.slice(0, c.seconds(end, sr)), fn = c.seconds(p.tail ? 0.06 : 0.03, sr);
  c.finish(s, 0.92, 1.1);
  for (let i = 0; i < fn; i++) { const u = i / fn; s[s.length - 1 - i] *= u * u; }
  c.fade(s, 1, sr);
  c.gain(s, (0.8 + 0.2 * f) * (1 - 0.25 * far));
  return { samples: s };
}
