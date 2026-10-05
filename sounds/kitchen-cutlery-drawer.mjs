// Cutlery drawer: runner friction (stick-slip wood chatter or a smooth ball-bearing roll) swept along the travel, cutlery rattle that follows the drawer's acceleration, a carcass thump at the stop, and a settling jingle with a small cabinet tail.
export const meta = {
  title: "Cutlery Drawer", kind: "foley", format: "sound", duration: 1.2, price: 2, author: "foleyroom", payout: "foleyroom@creators.oasis.example", kit: "Kitchen", description: "A kitchen cutlery drawer pulled open or pushed shut on wooden or ball-bearing runners, with knives and spoons rattling inside; load, force and a settling tail are knobs.",
  tags: ["drawer", "cutlery", "kitchen", "rattle", "foley", "slide", "cabinet", "household"],
};
export const params = { knobs: {
  direction: { type: "choice", label: "Direction", default: "open", options: ["open", "close"] },
  runner: { type: "choice", label: "Runner", default: "wood", options: ["wood", "ball-bearing"] },
  load: { type: "range", label: "Cutlery load", default: 0.6, min: 0, max: 1, step: 0.01 },
  force: { type: "range", label: "Force", default: 0.5, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Settle tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, open = p.direction === "open", wood = p.runner === "wood", L = p.load, F = p.force;
  const r = c.rng(p.seed * 7919 + (open ? 0 : 131) + (wood ? 0 : 17) + 3);
  const slide = (0.6 - 0.3 * F + 0.08 * L) * c.between(r, 0.9, 1.1), t0 = 0.004, tStop = t0 + slide;
  const tail = p.tail ? 0.65 : 0.25;
  let out = new Float32Array(c.seconds(tStop + tail, sr));
  const vel = (u) => open ? Math.min(1, u * 5) * (1 - 0.35 * u) : Math.min(1, u * 3.5) * (0.8 + 0.2 * u);
  const acc = (u) => Math.abs(vel(Math.min(1, u + 0.02)) - vel(Math.max(0, u - 0.02))) * 12;
  const ns = c.seconds(slide, sr), src = c.noise(r, ns), fr = new Float32Array(ns), lp = c.onepole(sr), lp2 = c.onepole(sr), fj = c.between(r, 0.92, 1.08);
  let low = 0, band = 0, g = 0.6, gs = 0.6, next = 0, ph = r() * c.TAU;
  const q = wood ? 0.22 : 0.8, edgeN = 0.015 * sr, rollHz = c.between(r, 38, 55);
  for (let i = 0; i < ns; i++) {
    const u = i / ns, v = vel(u), pos = open ? u : 1 - u;
    const fc = wood ? (380 + 900 * pos) * (1 - 0.25 * L) * fj : (900 + 700 * pos) * fj;
    if (wood && i >= next) { g = r() < 0.22 ? 0.04 : 0.3 + 0.7 * r(); next = i + Math.max(8, -Math.log(1 - r() + 1e-9) * sr * 0.006 / (0.25 + v)); }
    ph += c.TAU * rollHz * (0.4 + v) / sr;
    gs += ((wood ? g : 0.65 + 0.35 * Math.sin(ph)) - gs) * (wood ? 0.1 : 0.02);
    const f = 2 * Math.sin(Math.PI * Math.min(fc, sr * 0.15) / sr);
    low += f * band; const high = src[i] - low - q * band; band += f * high;
    const rum = lp(src[i], wood ? 170 : 130);
    const body = wood ? band * gs : lp2(band, 2400) * gs * 0.9;
    fr[i] = (body + rum * 1.6 * (0.4 + 0.6 * L)) * v * Math.min(1, (ns - i) / edgeN, i / (0.003 * sr));
  }
  c.mix(out, fr, t0, (wood ? 0.42 : 0.26) * (0.5 + 0.6 * F) * (0.7 + 0.3 * L), sr);
  if (!wood) {
    const rate = 60 + 120 * F; let t = 0;
    for (;;) {
      t += -Math.log(1 - r() + 1e-9) / rate; if (t > slide) break;
      c.mix(out, c.burst(r, 0.003, "bp", Math.min(c.between(r, 2500, 4500), sr * 0.4), 3, 0.0003, 0.0008, sr), t0 + t, 0.05 * vel(t / slide) * (0.5 + r()), sr);
    }
  }
  const clink = (t, a) => {
    const f0 = (r() < 0.3 ? c.between(r, 900, 1600) : c.between(r, 1800, 4300)) * (1 - 0.12 * L);
    const modes = [[f0, 1], [f0 * c.between(r, 2.6, 2.9), 0.55], [f0 * c.between(r, 4.9, 5.6), 0.3]].filter((m) => m[0] < sr * 0.45);
    const dec = c.between(r, 0.005, 0.02);
    c.mix(out, c.ring(modes, dec * 6, dec, sr), t, a, sr);
    c.mix(out, c.burst(r, 0.003, "hp", 3500, 0.7, 0.0003, 0.0008, sr), t, a * 0.5, sr);
  };
  const nStart = Math.round(L * (3 + 10 * F));
  for (let k = 0; k < nStart; k++) clink(t0 + 0.015 + Math.pow(r(), 1.5) * 0.12, (0.2 + 0.4 * r()) * (0.5 + 0.5 * F));
  const slideRate = L * (18 + 34 * F); let ts = 0.03;
  while (slideRate > 0) {
    ts += -Math.log(1 - r() + 1e-9) / slideRate; if (ts > slide - 0.01) break;
    const u = ts / slide; if (r() < 0.35 + 0.65 * Math.min(1, acc(u) + 0.3 * vel(u))) clink(t0 + ts, (0.1 + 0.22 * r()) * (0.4 + 0.6 * vel(u)));
  }
  const nStop = Math.round((L * (4 + 22 * F) + (L > 0.05 ? 2 : 0)) * (open ? 1 : 1.3));
  for (let k = 0; k < nStop; k++) { const dt = Math.pow(r(), 2) * 0.14; clink(tStop + 0.002 + dt, (0.25 + 0.5 * r()) * (0.4 + 0.6 * F) * (1 - 0.6 * dt / 0.14)); }
  if (p.tail && L > 0.02) {
    const m = Math.round(L * (4 + 10 * F)); let tt = tStop + 0.14;
    for (let k = 0; k < m; k++) { tt += c.between(r, 0.02, 0.07) * (1 + k * 0.35); if (tt > tStop + tail - 0.12) break; clink(tt, 0.22 * (1 - k / m) * (0.5 + r())); }
  }
  const dj = () => c.between(r, 0.96, 1.04), heavy = 1 - 0.15 * L;
  if (open) {
    c.mix(out, c.burst(r, 0.015, "bp", 1200 * dj(), 1.2, 0.0005, 0.004, sr), t0 * 0.5, 0.2 + 0.2 * F, sr);
    c.mix(out, c.ring([[130 * dj(), 1], [290 * dj(), 0.4]], 0.12, 0.02, sr), t0, 0.15 + 0.25 * F, sr);
    c.mix(out, c.ring([[110 * heavy * dj(), 1], [245 * heavy * dj(), 0.45], [520 * dj(), 0.2]], 0.25, 0.03 * (1 + 0.5 * L), sr), tStop, 0.35 + 0.55 * F, sr);
  } else {
    c.mix(out, c.burst(r, 0.02, "lp", 600 * dj(), 0.8, 0.002, 0.006, sr), t0 * 0.5, 0.15 + 0.2 * F, sr);
    c.mix(out, c.ring([[72 * heavy * dj(), 1], [158 * heavy * dj(), 0.6], [340 * dj(), 0.3], [690 * dj(), 0.15]], 0.4, 0.05 * (1 + 0.5 * L), sr), tStop, 0.6 + 0.9 * F, sr);
    c.mix(out, c.burst(r, 0.03, "bp", 600 * dj(), 0.9, 0.0006, 0.008, sr), tStop, 0.4 + 0.5 * F, sr);
  }
  if (wood) c.mix(out, c.burst(r, 0.025, "lp", 2200 * dj(), 0.8, 0.0006, 0.006, sr), tStop, 0.4 + 0.4 * F, sr);
  else {
    c.mix(out, c.burst(r, 0.01, "hp", 4500, 0.8, 0.0003, 0.002, sr), tStop, 0.3 + 0.3 * F, sr);
    c.mix(out, c.ring([[2900 * dj(), 1], [Math.min(6100 * dj(), sr * 0.45), 0.4]], 0.04, 0.006, sr), tStop + 0.001, 0.2 + 0.2 * F, sr);
  }
  if (p.tail) out = c.reverb(out, { size: 0.35, decay: 0.45, mixAmt: 0.2 }, sr);
  c.finish(out, 0.9, 1.1);
  c.fade(out, 30, sr);
  return { samples: out };
}
