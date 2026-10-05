// Cabinet joystick and buttons: a stream of switch actuations on a shared mash timeline. Each press is a bright plastic click, a hardware-specific resonant body and a return-click on release. Stick presses add a gate thunk and spring twang. The housing layer is a panel buzz plus loose parts that bounce to rest after every press, and a small cabinet tail is optional.
export const meta = {
  title: "Cabinet Button Mash", kind: "foley", format: "sound", duration: 2.2, price: 3, author: "quietmachine", payout: "quietmachine@creators.oasis.example", kit: "Retro Arcade", description: "Arcade cabinet joystick clacks and button mashing, with switch hardware, mash density, force, housing rattle and press rate as knobs; for retro arcade scenes and game-over frenzy.",
  tags: ["arcade", "joystick", "buttons", "clack", "microswitch", "mash", "cabinet", "retro"],
};
export const params = { knobs: {
  hardware: { type: "choice", label: "Hardware", default: "microswitch", options: ["microswitch", "leaf-switch", "worn"] },
  density: { type: "range", label: "Mash density", default: 0.5, min: 0, max: 1, step: 0.01 },
  force: { type: "range", label: "Force", default: 0.5, min: 0, max: 1, step: 0.01 },
  rattle: { type: "range", label: "Rattle", default: 0.4, min: 0, max: 1, step: 0.01 },
  rate: { type: "range", label: "Press rate", default: 8, min: 4, max: 14, step: 0.5 },
  tail: { type: "toggle", label: "Room tail", default: false },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, rt = c.rng(p.seed * 613 + 3), r = c.rng(p.seed * 211 + params.knobs.hardware.options.indexOf(p.hardware) * 71 + 9), rr = c.rng(p.seed * 97 + 5);
  const dur = 2.2, n = c.seconds(dur, sr), out = new Float32Array(n), F = p.force, D = p.density, R = p.rattle;
  const hw = { microswitch: { f: 4200, q: 1.5, m: [[2600, 1], [5100, 0.7], [7400, 0.4], [9200, 0.2]], d: 0.014, ret: 0.8, lo: 1 },
    "leaf-switch": { f: 2400, q: 1, m: [[1500, 1], [2250, 0.8], [3300, 0.6], [4700, 0.4]], d: 0.03, ret: 0.5, lo: 0.9 },
    worn: { f: 1500, q: 0.8, m: [[620, 1], [1350, 0.6], [2100, 0.3]], d: 0.035, ret: 0.3, lo: 1.2 } }[p.hardware];
  const press = (t, g, joy) => {
    const k = (0.7 + 0.6 * F) * g, det = 0.97 + r() * 0.06;
    c.mix(out, c.burst(r, 0.008, "hp", hw.f * (0.85 + r() * 0.3), hw.q, 0.0004, 0.002, sr), t, 0.6 * k, sr);
    c.mix(out, c.ring(hw.m.map(([f, a]) => [f * det * (joy ? 0.6 : 1), a * (0.7 + 0.6 * r())]), hw.d * 6, hw.d * (0.8 + 0.5 * F), sr), t + 0.0006, 0.45 * k, sr);
    c.mix(out, c.ring([[(joy ? 85 : 160) * det * (1 - 0.2 * F), 1], [(joy ? 170 : 320) * det, 0.3]], 0.09, 0.02 + 0.025 * F, sr), t + 0.001, (0.3 + 0.5 * F) * g * hw.lo, sr);
    if (joy) {
      c.mix(out, c.ring([[260 * det, 0.6], [410 * det, 0.5], [1130 * det, 0.25]], 0.12, 0.03, sr), t + 0.012, 0.18 * k, sr);
      c.mix(out, c.burst(r, 0.02, "bp", 1800 + r() * 800, 3, 0.002, 0.006, sr), t + 0.008, 0.15 * k, sr);
    }
    if (p.hardware === "worn") c.mix(out, c.burst(r, 0.035, "bp", 900 + r() * 700, 2, 0.003, 0.01, sr), t + 0.004, 0.2 * k, sr);
    const rel = t + 0.04 + r() * 0.05 + 0.02 * F;
    c.mix(out, c.burst(r, 0.006, "hp", hw.f * 1.1, hw.q, 0.0004, 0.0015, sr), rel, 0.55 * k * hw.ret, sr);
    c.mix(out, c.ring(hw.m.map(([f, a]) => [f * det * 1.08, a]), hw.d * 4, hw.d * 0.6, sr), rel, 0.22 * hw.ret * k, sr);
  };
  const beats = [], gap = 1 / p.rate;
  let t = 0.04 + rt() * 0.06;
  while (t < dur - 0.4) {
    if (rt() < 0.7 + 0.3 * D) {
      const burst = 1 + Math.floor(rt() * (1 + 3 * D));
      for (let b = 0; b < burst; b++) beats.push([t + b * gap * (0.3 + 0.2 * rt()), 0.6 + 0.4 * rt(), rt() < 0.3]);
    }
    t += gap * (0.8 + 0.6 * rt()) * (1.3 - 0.5 * D);
  }
  for (const [bt, g, joy] of beats) if (bt < dur - 0.3) press(bt, g, joy);
  if (R > 0.001) {
    for (const [bt, g] of beats) {
      if (bt >= dur - 0.3) continue;
      const s = (0.4 + 0.6 * F) * g * R, w = 0.9 + rr() * 0.25;
      c.mix(out, c.ring([[190 * w, 1], [310 * w, 0.7], [520 * w, 0.4], [880 * w, 0.2]], 0.3, 0.04 + 0.1 * R, sr), bt + 0.004, 0.55 * s, sr);
      const cnt = Math.round(R * (3 + 7 * rr()));
      let tt = bt + 0.025, iv = 0.016 + 0.01 * rr();
      for (let k = 0; k < cnt; k++) {
        if (tt < dur - 0.2) c.mix(out, c.ring([[800 + rr() * 1200, 1], [2400 + rr() * 2000, 0.5], [4300 + rr() * 1500, 0.2]], 0.04, 0.008 + 0.006 * rr(), sr), tt, 0.5 * s * Math.pow(0.85, k) * (0.6 + 0.4 * rr()), sr);
        tt += iv; iv *= 0.86 + 0.08 * rr();
      }
    }
  }
  let res = out;
  if (p.tail) {
    const wet = c.reverb(out, { size: 0.35, decay: 0.3, mixAmt: 0.5 }, sr);
    res = new Float32Array(n);
    for (let i = 0; i < n; i++) res[i] = out[i] * 0.8 + wet[i] * 0.45;
  }
  c.fade(res, 25, sr);
  c.fade(c.finish(res, 0.85, 1.1), 20, sr);
  return { samples: res };
}
