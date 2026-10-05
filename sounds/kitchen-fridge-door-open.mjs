// Fridge door: a low-mid gasket peel, a pressure dip into a damped low "thwup" pop, a soft swing of air, a door shelf of 3-4 bottles that clink when the door lurches and again as it settles, and an optional cold-air spill tail.
export const meta = {
  title: "Fridge Unseal", kind: "foley", format: "sound", duration: 1.2, price: 2, author: "foleyroom", payout: "foleyroom@creators.oasis.example", kit: "Kitchen", description: "A fridge door peeling off its gasket with a low suction thwup, a soft swing of air and bottles clinking in the door shelf, for kitchen scenes and home interiors.",
  tags: ["fridge", "door", "kitchen", "gasket", "suction", "bottles", "clink", "foley"],
};
export const params = { knobs: {
  size: { type: "choice", label: "Fridge size", default: "full", options: ["compact", "full", "double"] },
  suction: { type: "range", label: "Seal suction", default: 0.6, min: 0, max: 1, step: 0.01 },
  rattle: { type: "range", label: "Shelf rattle", default: 0.6, min: 0, max: 1, step: 0.01 },
  swing: { type: "range", label: "Swing speed", default: 0.5, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Cold air tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, si = params.knobs.size.options.indexOf(p.size), r = c.rng(p.seed * 6151 + si * 211 + 3);
  const S = [{ pop: 150, f: 190, m: 0.6, dk: 0.022 }, { pop: 100, f: 125, m: 1, dk: 0.032 }, { pop: 72, f: 88, m: 1.4, dk: 0.045 }][si];
  const suck = p.suction, rat = p.rattle, sw = p.swing;
  const peel = (0.03 + 0.1 * suck) * (0.7 + 0.3 * S.m) * (0.85 + 0.3 * r()), tr = 0.004 + peel;
  const dipS = (0.012 + 0.01 * S.m) * (0.9 + 0.2 * r()), tp = tr + dipS;
  const swingDur = (0.9 - 0.55 * sw) * (0.8 + 0.25 * S.m) * (0.9 + 0.2 * r()), ts = tp + swingDur * 0.85;
  const total = ts + (p.tail ? 0.8 : 0.3), out = new Float32Array(c.seconds(total, sr));
  const grains = Math.round(6 + 30 * suck);
  for (let g = 0; g < grains; g++) {
    const x = 1 - Math.pow(r(), 2), t = 0.004 + peel * x * 0.97;
    c.mix(out, c.burst(r, 0.003 + r() * 0.005, "bp", (300 + r() * 1200) / Math.sqrt(S.m), 1.5 + r() * 1.5, 0.0004, 0.001 + r() * 0.002, sr), t, (0.1 + 0.25 * r()) * (0.4 + 0.6 * suck) * (0.4 + 0.6 * x), sr);
  }
  {
    const np = c.seconds(peel, sr), n = np + c.seconds(0.01, sr), x = c.noise(r, n), a = c.onepole(sr), b = c.onepole(sr);
    for (let i = 0; i < n; i++) {
      const q = Math.min(1, i / np), f = 160 + (350 + 450 * suck) * q * q / S.m;
      const e = i < np ? q * Math.sqrt(q) : Math.exp(-(i - np) / (0.003 * sr));
      const lo = a(x[i], f * 1.5); x[i] = (lo - b(lo, f * 0.5)) * e;
    }
    c.mix(out, x, 0.004, 0.35 + 0.6 * suck, sr);
  }
  {
    const dip = c.seconds(dipS, sr), pn = c.seconds(0.05 + 0.06 * S.m, sr), P = new Float32Array(dip + pn), f0 = S.pop * (0.94 + 0.12 * r());
    let ph = 0;
    for (let i = 0; i < dip; i++) P[i] = -0.4 * Math.sin(Math.PI * i / dip);
    for (let j = 0; j < pn; j++) {
      const t = j / sr; ph += c.TAU * f0 * (1 + 0.7 * Math.exp(-t / 0.008)) / sr;
      P[dip + j] = Math.sin(ph) * Math.exp(-t / (S.dk * (0.9 + 0.2 * r() * 0 + 0.2 * suck)));
    }
    c.mix(out, P, tr, 0.55 + 0.55 * suck, sr);
  }
  c.mix(out, c.burst(r, 0.05, "lp", 520 / S.m, 0.9, 0.001, 0.008 + 0.006 * S.m, sr), tp, 0.25 + 0.35 * suck, sr);
  const modes = [[S.f, 1], [S.f * 2.31, 0.45], [S.f * 3.87, 0.2]].map(([f, a]) => [f * (0.96 + r() * 0.08), a]);
  c.mix(out, c.ring(modes, 0.2, S.dk * 0.8, sr), tp + 0.001, 0.12 + 0.2 * suck, sr);
  {
    const n = c.seconds(swingDur + 0.12, sr), x = c.pink(r, n), lp = c.onepole(sr), lp2 = c.onepole(sr), hp = c.onepole(sr);
    const ns = c.seconds(swingDur, sr), pk = 0.2 + 0.15 * r(); let w = 1;
    for (let i = 0; i < n; i++) {
      if (i % 512 === 0) w = c.clamp(w + (r() - 0.5) * 0.25, 0.6, 1.2);
      const q = i / ns, v = q < pk ? Math.sin(q / pk * Math.PI / 2) : Math.max(0, 1 - (q - pk) / (1 - pk + 0.1));
      const e = v * v * w, f = 160 + (250 + 900 * sw) * e / S.m, y = lp2(lp(x[i], f), f);
      x[i] = (y - hp(y, 60)) * e;
    }
    c.mix(out, x, tp, (0.15 + 0.5 * sw) * (0.8 + 0.2 * S.m), sr);
  }
  const bottles = [];
  for (let k = 0; k < 3 + Math.round(r()); k++) bottles.push({ f: 1500 + r() * 2400, r2: 2.6 + r() * 0.5, r3: 4.9 + r() * 0.9, dk: 0.025 + r() * 0.03, glass: k === 0 || r() < 0.75 });
  const clink = (t, g) => {
    const b = bottles[Math.floor(r() * bottles.length)];
    if (b.glass) {
      const f = b.f * (0.985 + r() * 0.03);
      c.mix(out, c.ring([[f, 1], [f * b.r2, 0.5], [f * b.r3, 0.22]], 0.14, b.dk * (0.8 + 0.4 * r()), sr), t + 0.0006, g * 0.6, sr);
      c.mix(out, c.burst(r, 0.004, "hp", 3000 + r() * 2500, 0.7, 0.0003, 0.0008, sr), t, g * 0.3, sr);
    } else {
      const f = b.f * 0.22 * (0.97 + r() * 0.06);
      c.mix(out, c.ring([[f, 1], [f * 2.4, 0.35]], 0.05, 0.008 + r() * 0.004, sr), t + 0.0005, g * 0.6, sr);
      c.mix(out, c.burst(r, 0.02, "bp", f * 2, 1.2, 0.0005, 0.004, sr), t, g * 0.4, sr);
    }
  };
  const lvl = (0.45 + 0.55 * rat) * (0.65 + 0.35 * sw) * (0.9 + 0.2 * r());
  const n1 = Math.max(2, Math.round((3 + 16 * rat) * (0.7 + 0.5 * sw) * (0.8 + 0.25 * S.m)));
  for (let k = 0; k < n1; k++) {
    const d = Math.min(swingDur * 0.5, 0.015 + r() * 0.01 - Math.log(1 - r() * 0.97) * (0.035 + 0.06 * (1 - sw)));
    clink(tp + d, (0.35 + 0.65 * r()) * lvl * (0.5 + 0.5 * Math.exp(-d / 0.15)));
  }
  c.mix(out, c.burst(r, 0.06, "lp", 260 / S.m, 0.8, 0.004, 0.015, sr), ts, 0.05 + 0.15 * sw, sr);
  const n2 = Math.max(1, Math.round(n1 * (0.25 + 0.35 * sw)));
  for (let k = 0; k < n2; k++) {
    const d = Math.min(0.14, -Math.log(1 - r() * 0.97) * 0.04);
    clink(ts + 0.004 + d, (0.3 + 0.6 * r()) * lvl * 0.6 * Math.exp(-d / 0.1));
  }
  if (p.tail) {
    const t0 = tp + 0.05, n = c.seconds(total - t0 - 0.03, sr), x = c.pink(r, n), e = c.adsr(n, { attack: 0.18, sustain: 0.3, decay: 0.35 }, sr);
    const hp = c.biquad("hp", 150, 0.7, sr), lp = c.biquad("lp", 450 + 300 / S.m, 0.7, sr); let w = 1;
    for (let i = 0; i < n; i++) { if (i % 1024 === 0) w = c.clamp(w + (r() - 0.5) * 0.3, 0.5, 1.2); x[i] = lp(hp(x[i])) * e[i] * w * Math.min(1, (n - i) / (0.15 * sr)); }
    c.mix(out, x, t0, 0.25 + 0.2 * suck, sr);
    for (let k = 0; k < 1 + Math.round(r() + 2 * rat); k++) clink(ts + 0.12 + r() * 0.3, (0.15 + 0.2 * r()) * lvl);
    c.reverb(out, { size: 0.25, decay: 0.35, mixAmt: 0.14 }, sr);
  }
  c.finish(out, 0.9, 1.1);
  c.fade(out, 15, sr);
  return { samples: out };
}
