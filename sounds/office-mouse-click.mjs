// Mouse click: a microswitch press and a distinct, softer release. Body is a ring of plastic shell modes, contact is a filtered noise edge, the switch snap is a tiny high ring, and an optional desk/shell tail rings under it.
export const meta = {
  title: "Mouse Click", kind: "foley", format: "sound", duration: 0.35, price: 1, author: "foleyroom", payout: "foleyroom@creators.oasis.example", kit: "Office", description: "An office mouse button press and release, single or double, in cheap plastic, gaming or silent builds; every seed is a slightly different finger.",
  tags: ["mouse", "click", "office", "button", "computer", "foley", "desk", "double-click"],
};
export const params = { knobs: {
  build: { type: "choice", label: "Mouse build", default: "cheap plastic", options: ["cheap plastic", "gaming", "silent"] },
  clicks: { type: "choice", label: "Click count", default: "single", options: ["single", "double"] },
  sharpness: { type: "range", label: "Sharpness", default: 0.5, min: 0, max: 1, step: 0.01 },
  release: { type: "range", label: "Release level", default: 0.5, min: 0, max: 1, step: 0.01 },
  pitch: { type: "range", label: "Pitch", default: 0.5, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Shell tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + params.knobs.build.options.indexOf(p.build) * 97 + 11);
  const dbl = p.clicks === "double";
  const out = new Float32Array(c.seconds(dbl ? 0.36 : 0.23, sr));
  const pm = Math.pow(2, (p.pitch - 0.5) * 1.6), sh = p.sharpness;
  const B = {
    "cheap plastic": { body: [[1500, 1], [2450, 0.6], [3700, 0.35]], dec: 0.012, snap: 4200, lvl: 0.8, tick: 0.7, shell: 330 },
    gaming: { body: [[2300, 1], [4100, 0.5], [6300, 0.3]], dec: 0.007, snap: 6500, lvl: 1, tick: 1, shell: 430 },
    silent: { body: [[520, 1], [980, 0.45]], dec: 0.02, snap: 1600, lvl: 0.45, tick: 0.25, shell: 250 },
  }[p.build];
  const hit = (t, lvl, rel) => {
    const f = pm * (0.97 + r() * 0.06);
    const modes = B.body.map(([hz, a]) => [hz * f * (rel ? 0.7 : 1) * (0.99 + r() * 0.02), a * (0.8 + r() * 0.4)]);
    const d = B.dec * (rel ? 0.7 : 1) * (1.3 - 0.6 * sh);
    c.mix(out, c.ring(modes, d * 8, d, sr), t + 0.0005, 0.6 * lvl, sr);
    c.mix(out, c.burst(r, rel ? 0.005 : 0.008, rel ? "bp" : "hp", (rel ? 0.7 : 1) * (1500 + 5000 * sh) * pm, rel ? 1.5 : 0.8, 0.0003, 0.0015, sr), t, (0.25 + 0.6 * sh) * B.tick * lvl, sr);
    if (!rel) c.mix(out, c.ring([[B.snap * f, 1], [B.snap * 1.7 * f, 0.4]], 0.02, 0.003 + 0.002 * (1 - sh), sr), t + 0.0003, 0.4 * B.tick * lvl, sr);
    else c.mix(out, c.burst(r, 0.012, "lp", 700 * f, 0.9, 0.001, 0.004, sr), t, 0.25 * lvl, sr);
    if (p.tail) c.mix(out, c.ring([[B.shell * f, 1], [B.shell * 1.85 * f * (0.98 + r() * 0.04), 0.5], [B.shell * 3.4 * f, 0.2]], 0.1, 0.025 + 0.015 * (p.build === "silent" ? 0.5 : 1), sr), t + 0.001, (rel ? 0.1 : 0.16) * lvl, sr);
  };
  const press = (t, lvl) => {
    hit(t, lvl * B.lvl, false);
    hit(t + 0.045 + r() * 0.02, lvl * B.lvl * 0.9 * (0.15 + 0.85 * p.release), true);
  };
  press(0.004, 1);
  if (dbl) press(0.135 + r() * 0.03, 0.85 + r() * 0.1);
  c.filter(out, c.biquad("lp", 5000 + 9000 * sh, 0.7, sr));
  c.finish(out, 0.85, 1.1);
  c.fade(out, 8, sr);
  return { samples: out };
}
