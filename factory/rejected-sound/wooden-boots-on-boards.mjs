// Boots on boards: heel strike, scuffing roll and toe contact on a damped board body, a boot-specific attack (padded leather, clattering hobnails or a heavy slab heel), a low board-settle wash, a gliding stick-slip creak and an optional low-ceiling room tail.
export const meta = {
  title: "Boots on Boards", kind: "foley", format: "sound", duration: 2.2, price: 3, author: "hollowbody", payout: "hollowbody@creators.oasis.example", kit: "Wooden Tavern", description: "Boot footsteps crossing creaky tavern floorboards; boot type, pace, weight, creak, step count and a room tail are knobs, and every seed is a different walk.",
  tags: ["footsteps", "boots", "floorboards", "creak", "wood", "tavern", "foley", "walk"],
};
export const params = { knobs: {
  boot: { type: "choice", label: "Boot", default: "hobnail", options: ["soft leather", "hobnail", "heavy"] },
  pace: { type: "range", label: "Pace (steps/s)", default: 2, min: 1, max: 3, step: 0.05 },
  weight: { type: "range", label: "Weight", default: 0.5, min: 0, max: 1, step: 0.01 },
  creak: { type: "range", label: "Board creak", default: 0.5, min: 0, max: 1, step: 0.01 },
  steps: { type: "range", label: "Steps", default: 4, min: 1, max: 6, step: 1 },
  tail: { type: "toggle", label: "Room tail", default: false },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, bi = params.knobs.boot.options.indexOf(p.boot), r = c.rng(p.seed * 7919 + bi * 131 + 3);
  const w = p.weight, cr = p.creak;
  const B = {
    "soft leather": { f: 900, q: 0.7, a: 0.003, d: 0.012, g: 0.3, thump: 0.9, ht: 0.09, low: 1.05, sc: [1400, 0.5] },
    hobnail: { f: 4200, q: 1.2, a: 0.0004, d: 0.002, g: 0.55, thump: 0.8, ht: 0.07, low: 1, sc: [3200, 0.35] },
    heavy: { f: 1500, q: 0.8, a: 0.0008, d: 0.007, g: 0.6, thump: 1.6, ht: 0.12, low: 0.78, sc: [700, 0.3] },
  }[p.boot];
  const creakMax = cr > 0 ? 0.2 + 0.4 * cr + 0.1 * w : 0, tailS = p.tail ? 0.7 : 0;
  const pad = 0.01 + B.ht * 1.4 + Math.max(0.28, creakMax + 0.05) + tailS, avail = 3.85 - pad;
  let steps = Math.max(1, Math.round(p.steps)), gap = 1 / p.pace;
  if (steps > 1 && (steps - 1) * gap * 1.02 > avail) gap = Math.max(0.7 * gap, avail / ((steps - 1) * 1.02));
  while (steps > 1 && (steps - 1) * gap * 1.02 > avail) steps--;
  const out = new Float32Array(Math.min(c.seconds(3.95, sr), c.seconds(pad + (steps - 1) * gap * 1.02, sr)));
  const bodyDecay = (0.022 + 0.035 * w + (bi === 2 ? 0.015 : 0)) * (p.tail ? 1.4 : 1);
  const contact = (t, amp, heel) => {
    const f = (150 - 50 * w) * B.low * (0.9 + 0.2 * r());
    const modes = [[f, 1], [f * 2.27 * (0.97 + 0.06 * r()), 0.45], [f * 3.9, 0.2], [f * 6.3 * (0.96 + 0.08 * r()), 0.09]];
    c.mix(out, c.ring(modes, 0.22, bodyDecay, sr), t + 0.001, amp * B.thump * (heel ? 0.8 : 0.5), sr);
    c.mix(out, c.burst(r, 0.07, "lp", 280 + 220 * w, 0.7, 0.001, 0.018 + 0.03 * w, sr), t, amp * B.thump * (heel ? 0.9 : 0.55), sr);
    c.mix(out, c.burst(r, 0.025, "bp", B.f * (0.9 + 0.2 * r()), B.q, B.a, B.d, sr), t, amp * B.g * (heel ? 1 : 0.6), sr);
    if (bi === 1) {
      const nails = 2 + Math.floor(r() * 3);
      for (let k = 0; k < nails; k++) c.mix(out, c.ring([[3000 + r() * 3000, 1], [7000 + r() * 2500, 0.4]], 0.03, 0.003 + 0.003 * r(), sr), t + r() * 0.006, amp * (0.18 + 0.15 * r()), sr);
    } else if (bi === 0) {
      c.mix(out, c.burst(r, 0.08, "lp", 1700 + 600 * r(), 0.5, 0.008, 0.028, sr), t + 0.004, amp * (heel ? 0.12 : 0.22), sr);
    } else {
      c.mix(out, c.burst(r, 0.06, "bp", 170 + 40 * r(), 1.2, 0.0008, 0.025, sr), t, amp * 0.9, sr);
    }
  };
  const scuff = (t, len, amp) => {
    const n = c.seconds(len, sr), x = c.noise(r, n), bp = c.biquad("bp", B.sc[0] * (0.85 + 0.3 * r()), 1.1, sr); let g = 1;
    for (let i = 0; i < n; i++) { if (i % 90 === 0) g = 0.4 + 0.6 * r(); const u = i / n; x[i] = bp(x[i]) * g * Math.sin(Math.PI * Math.min(1, u * 1.3)) * (1 - 0.5 * u); }
    c.mix(out, x, t, amp * B.sc[1], sr);
  };
  const creakAt = (t, len, amt) => {
    const n = c.seconds(len, sr), x = new Float32Array(n);
    const f0 = (190 + 240 * r()) * (1 - 0.3 * w), f1 = f0 * (0.6 + 0.8 * r());
    const b1 = c.biquad("bp", 520 + 400 * r(), 4, sr), b2 = c.biquad("bp", 1400 + 900 * r(), 5, sr), b3 = c.biquad("bp", 2600 + 900 * r(), 4, sr), hp = c.biquad("hp", 200, 0.7, sr);
    let ph = r(), jit = 1;
    for (let i = 0; i < n; i++) {
      const u = i / n; ph += (f0 + (f1 - f0) * u) / sr * jit;
      let e = 0; if (ph >= 1) { ph -= 1; e = 0.6 + 0.4 * r(); jit = 0.94 + 0.12 * r(); }
      const v = hp(e), sw = Math.sin(Math.PI * Math.min(1, u * 1.15));
      x[i] = (b1(v) + 0.8 * b2(v) + 0.4 * b3(v)) * sw;
    }
    c.mix(out, x, t, amt, sr);
  };
  let creaked = false;
  for (let s = 0; s < steps; s++) {
    const t = 0.01 + s * gap + (s ? (r() - 0.5) * 0.04 * gap : 0);
    const amp = (0.5 + 0.5 * w) * (0.85 + 0.3 * r()) * (s % 2 ? 0.92 : 1);
    const ht = B.ht * (0.8 + 0.3 / p.pace) * (0.9 + 0.2 * r());
    contact(t, amp, true);
    c.mix(out, c.burst(r, 0.2, "lp", 220 + 120 * w, 0.7, 0.004, 0.05 + 0.05 * w, sr), t + 0.003, amp * 0.35, sr);
    scuff(t + 0.006, ht * 1.1, amp);
    contact(t + ht, amp * (0.55 + 0.2 * r()), false);
    if (cr > 0 && (r() < 0.3 + 0.7 * cr || (!creaked && s === steps - 1))) {
      creaked = true;
      const len = Math.min(creakMax, (0.2 + 0.4 * cr + 0.1 * w) * (0.65 + 0.35 * r()));
      creakAt(t + ht * 0.5 + r() * 0.04, len, 2.2 * (0.35 + 0.65 * cr) * (0.7 + 0.3 * w));
    }
  }
  if (p.tail) c.reverb(out, { size: 0.55, decay: 0.85, mixAmt: 0.42 }, sr);
  c.finish(out, 0.9, 1.1);
  c.gain(out, 0.72 + 0.28 * w);
  c.fade(out, 12, sr);
  return { samples: out };
}
