// Keyboard typing burst: each keystroke is a bright plastic click, a switch-specific bottom-out body, a keycap ring, a quieter key-up release and a desk thump; spacebar and enter get a lower, longer stabilised thock, and an optional small-room tail follows.
export const meta = {
  title: "Desk Typing Burst", kind: "foley", format: "sound", duration: 2.4, price: 3, author: "foleyroom", payout: "foleyroom@creators.oasis.example", kit: "Office", description: "A burst of continuous typing on a desk keyboard with membrane, mechanical or laptop switches; rate, force, space and enter weight, desk resonance and a room tail are knobs. Use it for office scenes and hacking or work montages.",
  tags: ["keyboard", "typing", "keys", "office", "desk", "foley", "mechanical", "laptop"],
};
export const params = { knobs: {
  switchType: { type: "choice", label: "Switch type", default: "mechanical", options: ["membrane", "mechanical", "laptop"] },
  rate: { type: "range", label: "Typing rate (keys/s)", default: 8, min: 4.5, max: 12, step: 0.5 },
  intensity: { type: "range", label: "Intensity", default: 0.5, min: 0, max: 1, step: 0.01 },
  bigKeys: { type: "range", label: "Space and enter", default: 0.4, min: 0, max: 1, step: 0.01 },
  desk: { type: "range", label: "Desk resonance", default: 0.4, min: 0, max: 1, step: 0.01 },
  room: { type: "toggle", label: "Room tail", default: false },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + params.knobs.switchType.options.indexOf(p.switchType) * 71 + 3);
  const total = 2.1, out = new Float32Array(c.seconds(total + (p.room ? 0.3 : 0.1), sr));
  const S = {
    membrane: { click: 2400, cq: 0.7, ca: 0.3, body: [[240, 1], [500, 0.4], [820, 0.15]], bd: 0.024, ring: 0, bot: 800, lp: 4200, rel: 0.15 },
    mechanical: { click: 5600, cq: 1.3, ca: 0.85, body: [[430, 1], [1150, 0.5], [2300, 0.28]], bd: 0.014, ring: 0.35, bot: 2400, lp: 14000, rel: 0.35 },
    laptop: { click: 4200, cq: 0.9, ca: 0.5, body: [[900, 0.8], [1900, 0.5], [3300, 0.25]], bd: 0.006, ring: 0.12, bot: 3200, lp: 10000, rel: 0.12 },
  }[p.switchType];
  const gap = 1 / p.rate, deskF = 130 + 60 * r();
  let t = 0.03, k = 0, phrase = 5 + Math.floor(r() * 6);
  while (t < total - 0.15) {
    const big = r() < 0.04 + 0.18 * p.bigKeys;
    const f = 0.85 + 0.3 * r(), force = (0.35 + 0.65 * p.intensity) * (0.6 + 0.4 * r()) * (big ? 1.1 : 1);
    const sh = big ? 0.6 : f;
    const n = c.seconds(0.17, sr), key = new Float32Array(n);
    c.mix(key, c.burst(r, 0.006, "hp", S.click * sh, S.cq, 0.0004, 0.0018, sr), 0, S.ca * (0.6 + 0.4 * force), sr);
    c.mix(key, c.burst(r, 0.012, "bp", S.bot * sh, 1.5, 0.0008, 0.004, sr), 0.004, 0.5 * force, sr);
    c.mix(key, c.ring(S.body.map(([hz, a]) => [hz * sh * (0.97 + 0.06 * r()), a]), 0.1, S.bd * (big ? 2.2 : 1), sr), 0.003, 0.5 * force, sr);
    if (p.switchType === "mechanical") c.mix(key, c.ring([[3400 * sh, 0.5], [5100 * sh, 0.3]], 0.05, 0.008, sr), 0.0005, S.ring * 0.7, sr);
    if (p.switchType === "membrane") c.mix(key, c.burst(r, 0.03, "lp", 600, 0.8, 0.002, 0.01, sr), 0.002, 0.35 * force, sr);
    if (p.switchType === "laptop") c.mix(key, c.ring([[1400 * sh, 0.6]], 0.03, 0.005, sr), 0.001, 0.3 * force, sr);
    if (big) c.mix(key, c.burst(r, 0.05, "lp", 300 + 100 * r(), 0.9, 0.002, 0.018, sr), 0.002, 0.6 * force, sr);
    if (p.desk > 0) c.mix(key, c.ring([[deskF * (big ? 0.8 : 1), 1], [deskF * 2.1, 0.3]], 0.12, 0.03 + 0.03 * p.desk, sr), 0.003, (0.1 + 0.8 * p.desk) * force * 0.6, sr);
    c.mix(key, c.burst(r, 0.008, "hp", S.click * 0.7 * sh, 0.8, 0.0006, 0.0025, sr), 0.06 + 0.04 * r(), S.rel * (0.5 + 0.5 * force), sr);
    c.filter(key, c.biquad("lp", S.lp, 0.7, sr));
    c.mix(out, key, t, force, sr);
    k++;
    let pause = 0;
    if (k % phrase === 0) { pause = gap * (1.2 + 1.5 * r()); phrase = 5 + Math.floor(r() * 6); }
    t += gap * (0.65 + 0.7 * r()) + pause;
  }
  let res = out;
  if (p.room) {
    const wet = c.reverb(out, { size: 0.35, decay: 0.3, mixAmt: 0.3 }, sr);
    c.filter(wet, c.biquad("lp", 6500, 0.7, sr));
    res = wet.length >= out.length ? wet.subarray(0, out.length) : wet;
  }
  const end = new Float32Array(res.length);
  end.set(res);
  c.fade(end, 25, sr);
  c.finish(end, 0.85, 1.1);
  return { samples: end };
}
