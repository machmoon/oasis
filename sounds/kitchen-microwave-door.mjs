// Microwave door: a latch pop open or a latch-shut catch. Layers: latch press/hook clicks, a clamped sheet-metal thump (damped noise body + short panel tinks), a spring twang, the swing whoosh, plastic rattle grains and an optional room tail.
export const meta = {
  title: "Microwave Latch", kind: "foley", format: "sound", duration: 0.5, price: 2, author: "foleyroom", payout: "foleyroom@creators.oasis.example", kit: "Kitchen", description: "A microwave door popping open on its button or handle latch, or swinging shut and catching; spring snap, panel rattle and room tail are knobs for kitchen scenes and appliance UI.",
  tags: ["microwave", "door", "latch", "kitchen", "appliance", "click", "foley", "open-close"],
};
export const params = { knobs: {
  action: { type: "choice", label: "Action", default: "open", options: ["open", "close"] },
  latch: { type: "choice", label: "Latch type", default: "button", options: ["button", "handle"] },
  spring: { type: "range", label: "Spring", default: 0.5, min: 0, max: 1, step: 0.01 },
  rattle: { type: "range", label: "Plastic rattle", default: 0.4, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Room tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const open = p.action === "open", btn = p.latch === "button", s = p.spring, rt = p.rattle;
  const sr = c.sr, r = c.rng(p.seed * 4973 + (open ? 11 : 29) + (btn ? 3 : 7));
  const j = (a) => 1 + (r() - 0.5) * 2 * a, tailLen = p.tail ? 0.3 : 0.13;
  let tr, ts = 0, ti = 0, gap = 0, last;
  if (open) { tr = (btn ? 0.03 : 0.085) + 0.025 * (1 - s) * j(0.1); ts = tr + (0.2 - 0.08 * s) * j(0.06); last = ts; }
  else { ti = (0.05 + 0.02 * (1 - s)) * j(0.05); gap = (btn ? 0.018 : 0.03) * (1.2 - 0.4 * s) * j(0.08); last = ti + gap; }
  const out = new Float32Array(c.seconds(last + tailLen + 0.03, sr));
  const click = (t, f, q, g, ringy) => {
    c.mix(out, c.burst(r, 0.008, "bp", f * j(0.08), q, 0.0003, 0.0012 + 0.001 * r(), sr), t, g * j(0.12), sr);
    c.mix(out, c.burst(r, 0.004, "hp", 3000, 0.7, 0.0002, 0.0006, sr), t, g * 0.4, sr);
    if (ringy) c.mix(out, c.ring([[f * 0.62 * j(0.03), 1], [f * 1.41 * j(0.03), 0.5]], 0.05, ringy, sr), t + 0.0003, g * 0.3, sr);
  };
  const thump = (t, base, g, soft) => {
    c.mix(out, c.burst(r, 0.1, "lp", (soft ? 380 : 560) * j(0.1), 0.7, 0.0015, soft ? 0.025 : 0.02, sr), t, g, sr);
    c.mix(out, c.ring([[base * j(0.04), 1], [base * 2.23 * j(0.04), 0.4]], 0.16, (soft ? 0.02 : 0.032) * j(0.15), sr), t + 0.001, g * 0.55, sr);
    if (!soft) c.mix(out, c.ring([[760 * j(0.05), 0.6], [1180 * j(0.05), 0.4], [1630 * j(0.05), 0.25]], 0.1, 0.016 * j(0.2), sr), t + 0.0008, g * 0.35, sr);
  };
  const twang = (t, g) => {
    const k = (0.8 + 0.4 * s) * j(0.05);
    c.mix(out, c.ring([[1700 * k, 1], [2650 * k * j(0.02), 0.45], [4300 * k * j(0.02), 0.2]], 0.07 + 0.12 * s, 0.01 + 0.04 * s, sr), t + 0.0015, g * (0.05 + 0.4 * s), sr);
  };
  const sweep = (t, len, g, f0, f1, chatter) => {
    const n = c.seconds(len, sr), x = c.noise(r, n), a = c.onepole(sr), b = c.onepole(sr), pk = chatter ? 0.7 : 0.3 + 0.15 * r();
    let gate = 1, cnt = 0;
    for (let i = 0; i < n; i++) {
      const u = i / n, fc = f0 + (f1 - f0) * u, v = u < pk ? u / pk : (1 - u) / (1 - pk);
      if (chatter && --cnt <= 0) { gate = 0.15 + 0.85 * r(); cnt = 12 + Math.floor(r() * 120); }
      const lo = a(x[i], fc); x[i] = (lo - b(lo, fc * 0.4)) * v * gate;
    }
    c.mix(out, x, t, g, sr);
  };
  const rattle = (t, g) => {
    const count = Math.round(4 + 26 * rt), lo = btn ? 2200 : 1300, hi = btn ? 5800 : 3900;
    let tt = t + 0.002;
    for (let k = 0; k < count; k++) {
      tt += -Math.log(1 - r() * 0.98) * (0.004 + 0.008 * k / count);
      const a = (0.3 + 0.7 * r()) * Math.exp(-(tt - t) / 0.07);
      c.mix(out, c.burst(r, 0.004 + r() * 0.005, "bp", lo + r() * (hi - lo), 3 + r() * 5, 0.0003, 0.0008 + r() * 0.0015, sr), tt, a * g * (0.08 + 0.6 * rt), sr);
    }
  };
  if (open) {
    if (btn) { click(0.002, 1400, 1.5, 0.4, 0.004); click(0.012 * j(0.2), 2400, 2, 0.2, 0); }
    else sweep(0.002, tr - 0.004, 0.45, 500, 1300, true);
    click(tr, btn ? 4200 : 1600, btn ? 3 : 1.6, 1, btn ? 0.005 : 0.009);
    if (!btn) c.mix(out, c.burst(r, 0.03, "bp", 900 * j(0.1), 2, 0.001, 0.008, sr), tr + 0.001, 0.5, sr);
    thump(tr + 0.002, btn ? 240 : 180, btn ? 0.28 : 0.5, false);
    twang(tr, btn ? 1 : 0.6);
    rattle(tr, 1);
    sweep(tr + 0.006, ts - tr + 0.01, 0.22 + 0.3 * s, 250, 1500 + 900 * s, false);
    thump(ts, 140, 0.3 + 0.2 * s, true);
    rattle(ts, 0.5);
  } else {
    sweep(0.001, ti + 0.004, 0.3 + 0.2 * s, 300, 1200 + 600 * s, false);
    click(ti, btn ? 3600 : 1900, 2, 0.55, 0.004);
    thump(ti + 0.002, btn ? 155 : 125, 0.75, false);
    if (!btn) { let tt = ti + 0.004; for (let k = 0; k < 3; k++) { tt += (gap - 0.006) / 3 * j(0.3); click(tt, 2600 * j(0.1), 3, 0.25, 0); } }
    click(ti + gap, btn ? 5200 : 2300, btn ? 3 : 2, 1, btn ? 0.004 : 0.008);
    twang(ti + gap, btn ? 0.8 : 0.5);
    rattle(ti, btn ? 1 : 1.3);
  }
  if (p.tail) c.reverb(out, { size: 0.35, decay: 0.4, mixAmt: 0.28 }, sr);
  c.finish(out, 0.9, 1.1);
  c.fade(out, p.tail ? 60 : 30, sr);
  return { samples: out };
}
