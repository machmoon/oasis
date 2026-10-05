// Page flip: a riffle of page turns over a continuous paper-rustle bed (pink noise through a curling lowpass whose brightness follows each page, with fibre flutter), each page adding a soft landing thump and a snap edge sized by paper stiffness, with a binding body (staple stack, spiral coil zip, ring clack); the tail is the stack settling and the binding ringing down.
export const meta = {
  title: "Page Flip", kind: "foley", format: "sound", duration: 1.5, price: 1, author: "foleyroom", payout: "foleyroom@creators.oasis.example", kit: "Office", description: "Pages riffled through a stapled document, spiral notebook or ring binder, with flip rate, page count and paper stiffness as knobs; for desk scenes, studying and paperwork.",
  tags: ["page", "flip", "paper", "notebook", "binder", "office", "foley", "riffle"],
};
export const params = { knobs: {
  binding: { type: "choice", label: "Binding", default: "stapled", options: ["stapled", "spiral", "ring binder"] },
  rate: { type: "range", label: "Flip rate", default: 0.5, min: 0, max: 1, step: 0.01 },
  pages: { type: "range", label: "Page count", default: 0.5, min: 0, max: 1, step: 0.01 },
  snap: { type: "range", label: "Stiffness", default: 0.5, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Settle tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + params.knobs.binding.options.indexOf(p.binding) * 97 + 3);
  const B = p.binding, S = p.snap, count = Math.round(5 + 11 * p.pages), gap = 0.17 - 0.105 * p.rate;
  const baseCut = { stapled: 3000, spiral: 4200, "ring binder": 2400 }[B] * (0.8 + 0.6 * S);
  const pages = []; let t = 0.04;
  for (let k = 0; k < count; k++) {
    const mid = Math.sin(Math.PI * (k + 0.5) / count), sw = Math.min(0.3, Math.max(0.09, gap * (1.5 + 1.5 * r()))) * (B === "ring binder" ? 1.1 : 1);
    pages.push({ t, sw, a: (0.45 + 0.55 * r()) * (0.7 + 0.3 * mid), cut: baseCut * (0.6 + 0.9 * r()) });
    t += gap * (1.3 - 0.5 * mid) * (0.6 + 0.8 * r());
  }
  const lastP = pages[count - 1], last = lastP.t + lastP.sw * 0.6;
  const n = c.seconds(last + (p.tail ? 0.6 : 0.1), sr), out = new Float32Array(n), act = new Float32Array(n), num = new Float32Array(n), den = new Float32Array(n);
  const bump = (t0, sw, a, cut, atk) => {
    const s0 = Math.floor(t0 * sr), m = Math.floor(sw * sr);
    for (let i = 0; i < m && s0 + i < n; i++) {
      const u = i / m, q = Math.min(1, u / atk), e = q * q * (3 - 2 * q) * Math.exp(-3.2 * u) * a;
      act[s0 + i] += e; num[s0 + i] += e * cut; den[s0 + i] += e;
    }
  };
  const atk = 0.32 - 0.22 * S;
  for (const g of pages) bump(g.t, g.sw, g.a, g.cut, atk);
  if (p.tail) for (let q = 0; q < 4; q++) bump(last + 0.02 + q * 0.07 * (0.6 + 0.8 * r()), 0.12 + 0.2 * r(), 0.22 * (1 - q * 0.2) * (0.6 + 0.8 * r()), 1800 + 1200 * r(), 0.3);
  const pk = c.pink(r, n), wn = c.noise(r, n), l1 = c.onepole(sr), l2 = c.onepole(sr), hp = c.biquad("hp", 330, 0.7, sr), hp2 = c.biquad("hp", 3500, 0.7, sr);
  const m = Math.round(sr / 190); let g0 = 1, g1 = 1, cs = baseCut;
  for (let i = 0; i < n; i++) {
    if (i % m === 0) { g0 = g1; g1 = 0.35 + 0.65 * r(); }
    if (den[i] > 1e-5) cs += (num[i] / den[i] - cs) * 0.003;
    const y = hp(l2(l1(pk[i] * 3, cs), cs)) + 0.3 * hp2(wn[i]) * Math.min(1, cs / 5000);
    out[i] = y * act[i] * (g0 + (g1 - g0) * (i % m) / m) * 1.6;
  }
  for (const g of pages) {
    const ts = g.t + g.sw * (0.3 + 0.2 * r()), a = g.a;
    c.mix(out, c.burst(r, 0.04, "lp", 260 + 260 * r(), 1, 0.003, 0.014, sr), ts, (0.12 + 0.18 * S) * a, sr);
    c.mix(out, c.burst(r, 0.014, "bp", 2400 + 2600 * r(), 0.9, 0.001, 0.002 + 0.005 * S, sr), ts + 0.002, (0.03 + 0.4 * S) * a * (0.4 + 0.6 * r()), sr);
    if (B === "stapled") c.mix(out, c.ring([[190 + 70 * r(), 1], [430 + 90 * r(), 0.4]], 0.07, 0.018, sr), ts, 0.16 * a, sr);
    else if (B === "spiral") {
      const rings = 5 + Math.floor(5 * r()); let tt = g.t + 0.01;
      for (let q = 0; q < rings; q++) { const f = 2800 + 1600 * r(); c.mix(out, c.ring([[f, 1], [f * 1.8, 0.35]], 0.03, 0.004 + 0.004 * r(), sr), tt, (0.16 - 0.1 * q / rings) * (0.5 + 0.5 * r()) * a, sr); tt += 0.006 + 0.008 * r(); }
    } else if (r() < 0.6) {
      c.mix(out, c.ring([[800 * (0.97 + 0.06 * r()), 1], [1900, 0.4], [3100, 0.2]], 0.07, 0.014, sr), ts, 0.2 * a, sr);
      c.mix(out, c.ring([[140 + 25 * r(), 1]], 0.08, 0.02, sr), ts, 0.28 * a, sr);
    }
  }
  if (p.tail) {
    if (B === "spiral") for (let q = 0; q < 8; q++) c.mix(out, c.ring([[3000 + 1500 * r(), 1], [5400, 0.3]], 0.03, 0.005, sr), last + 0.02 + 0.03 * q * (1 + 0.3 * q) * (0.7 + 0.6 * r()), 0.12 * (1 - q / 9), sr);
    else if (B === "ring binder") c.mix(out, c.ring([[790 * (0.97 + 0.06 * r()), 1], [1850, 0.4]], 0.14, 0.035, sr), last + 0.06, 0.12, sr);
    else c.mix(out, c.burst(r, 0.06, "lp", 300, 1, 0.004, 0.02, sr), last + 0.06, 0.14, sr);
  }
  c.fade(c.finish(out, 0.85, 1.1), 25, sr);
  return { samples: out };
}
