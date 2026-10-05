// Console key press: a finger contact grain, a short noisy bottom-out click with damped material modes (rubber dome, detuned metal snap, glass tap plus haptic pulse), and an optional two-stage latch catch.
export const meta = {
  title: "Console Key Press", kind: "foley", format: "sound", duration: 0.12, price: 1, author: "quietmachine", payout: "quietmachine@creators.oasis.example", kit: "Sci-fi Console", description: "A physical starship console key or touch-panel press in rubber, metal or glass, with force, click brightness and a latching catch as knobs; every seed is a slightly different press.",
  tags: ["button", "console", "keypress", "sci-fi", "switch", "touch-panel", "interface", "foley"],
};
export const params = { knobs: {
  material: { type: "choice", label: "Material", default: "metal", options: ["rubber", "metal", "glass"] },
  force: { type: "range", label: "Force", default: 0.5, min: 0, max: 1, step: 0.01 },
  brightness: { type: "range", label: "Click brightness", default: 0.5, min: 0, max: 1, step: 0.01 },
  latch: { type: "toggle", label: "Latch", default: false },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, mi = params.knobs.material.options.indexOf(p.material);
  const r = c.rng(p.seed * 4513 + mi * 197 + 11), f = p.force, b = p.brightness;
  const M = {
    rubber: { modes: [[190, 1], [430, 0.45], [960, 0.18]], dec: 0.006, click: 1600, q: 0.8, clickAmt: 0.45, modeAmt: 0.6, thump: 0.9, touch: 900, latchF: 1300 },
    metal: { modes: [[2300, 1], [3710, 0.6], [5980, 0.35], [8200, 0.2]], dec: 0.011, click: 4200, q: 1.0, clickAmt: 1.0, modeAmt: 0.35, thump: 0.35, touch: 2600, latchF: 3300 },
    glass: { modes: [[1650, 1], [4400, 0.5], [7900, 0.3]], dec: 0.009, click: 6000, q: 0.8, clickAmt: 0.7, modeAmt: 0.3, thump: 0.12, touch: 3600, latchF: 2700 },
  }[p.material];
  const dec = M.dec * (0.8 + 0.4 * r()) * (1 + 0.3 * f);
  const tb = 0.004 + (1 - f) * 0.01 + r() * 0.003;
  const tl = tb + 0.03 + r() * 0.015;
  const latchDec = p.material === "rubber" ? 0.005 : 0.008;
  const end = Math.max(tb + dec * 6, p.latch ? tl + 0.006 + latchDec * 6 : 0, p.material === "glass" ? tb + 0.04 : 0, tb + 0.05) + 0.012;
  const out = new Float32Array(c.seconds(end, sr));
  c.mix(out, c.burst(r, 0.012 + 0.006 * r(), "bp", M.touch * (0.8 + 0.4 * r()), 1.2, 0.002, 0.004, sr), 0, 0.14 + 0.12 * (1 - f), sr);
  const modes = [];
  M.modes.forEach(([hz, a], k) => {
    const fr = hz * (1 - 0.06 * f) * (0.96 + 0.08 * r()), amp = a * (0.6 + 0.8 * r()) * (k ? 0.3 + 0.9 * b : 1);
    modes.push([fr, amp]);
    if (p.material === "metal") modes.push([fr * (1.004 + 0.008 * r()), amp * (0.4 + 0.3 * r())]);
    if (p.material === "rubber") modes.push([fr * (1.04 + 0.05 * r()), amp * 0.5]);
  });
  c.mix(out, c.ring(modes, dec * 6, dec, sr), tb + 0.0006, M.modeAmt * (0.6 + 0.6 * f), sr);
  c.mix(out, c.burst(r, 0.01, p.material === "rubber" ? "lp" : "bp", M.click * (0.45 + 0.9 * b), M.q, 0.0003 + 0.0008 * (1 - f), 0.002 + 0.0015 * r(), sr), tb, M.clickAmt * (0.5 + 0.5 * f), sr);
  c.mix(out, c.burst(r, 0.005, "hp", 4500 + 6500 * b, 0.7, 0.0003, 0.0009, sr), tb, 0.1 + 0.5 * b * (p.material === "rubber" ? 0.45 : 1), sr);
  const th = 80 + 50 * (1 - f) + 20 * r();
  c.mix(out, c.ring([[th, 1], [th * 2.3, 0.3]], 0.05, 0.007 + 0.006 * f, sr), tb + 0.001, M.thump * (0.2 + 0.6 * f), sr);
  c.mix(out, c.burst(r, 0.02, "lp", 600 + 400 * f, 0.8, 0.001, 0.005, sr), tb, M.thump * 0.4 * f, sr);
  if (p.material === "glass") {
    const n = c.seconds(0.035, sr), hz = 165 + 25 * r(), h = c.osc("sine", hz, n, sr);
    c.multiply(h, c.env(n, 0.002, 0.008, sr));
    c.mix(out, h, tb + 0.002, 0.25 + 0.3 * f, sr);
  }
  if (p.latch) {
    const lf = M.latchF * (0.9 + 0.2 * r()), gap = 0.003 + 0.003 * r();
    c.mix(out, c.burst(r, 0.006, "bp", lf * (1.2 + 0.6 * b), 1.6, 0.0004, 0.0012, sr), tl, 0.75, sr);
    c.mix(out, c.burst(r, 0.005, "bp", lf * (0.7 + 0.3 * r()), 2, 0.0003, 0.001, sr), tl + gap, 0.5, sr);
    c.mix(out, c.ring([[lf, 1], [lf * 1.58 * (0.97 + 0.06 * r()), 0.5], [lf * 1.007, 0.5]], latchDec * 6, latchDec, sr), tl + 0.0005, 0.3, sr);
    c.mix(out, c.ring([[th * 1.6, 1]], 0.03, 0.006, sr), tl + gap, 0.35 * M.thump + 0.1, sr);
    if (p.material === "glass") {
      const n = c.seconds(0.02, sr), h = c.osc("sine", 210 + 20 * r(), n, sr);
      c.multiply(h, c.env(n, 0.0015, 0.005, sr));
      c.mix(out, h, tl + 0.001, 0.3, sr);
    }
  }
  c.finish(out, 0.9, 1.1);
  c.fade(out, 2, sr);
  c.gain(out, 0.6 + 0.4 * f);
  return { samples: out };
}
