// Water lap on a moored hull: a swelling lowpassed wash bed, irregular soft slosh swells (slow-attack filtered noise with a falling-then-rising bubble gurgle), and a hull cavity resonance that rings under each slosh, with a tail toggle adding a long diffuse wash.
export const meta = {
  title: "Hull Lap", kind: "sfx", format: "sound", duration: 3, price: 2, author: "stormfront", payout: "stormfront@creators.oasis.example", kit: "Ocean Harbour", description: "Gentle water lapping against a moored hull, with wood, fibreglass or steel character and a hollow cavity; for harbour beds, night docks and quiet boat scenes.",
  tags: ["water", "lap", "hull", "harbour", "boat", "moored", "waves", "ocean"],
};
export const params = { knobs: {
  hull: { type: "choice", label: "Hull", default: "wood", options: ["wood", "fibreglass", "steel"] },
  amount: { type: "range", label: "Amount", default: 0.5, min: 0, max: 1, step: 0.01 },
  hollowness: { type: "range", label: "Hollowness", default: 0.5, min: 0, max: 1, step: 0.01 },
  rate: { type: "range", label: "Rate", default: 1.5, min: 0.5, max: 3, step: 0.05 },
  tail: { type: "toggle", label: "Tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + params.knobs.hull.options.indexOf(p.hull) * 37 + 3);
  const dur = 3, n = c.seconds(dur, sr), out = new Float32Array(n);
  // [cavity Hz, partial ratio, cavity decay, slosh centre Hz, cavity level, bubble Hz, wash lowpass]
  const m = { wood: [150, 2.2, 0.09, 700, 0.7, 500, 1100], fibreglass: [330, 3.2, 0.035, 1500, 0.5, 900, 2200], steel: [220, 1.6, 0.45, 1000, 1.2, 650, 1500] }[p.hull];
  const hollowF = m[0] * (0.8 + 0.4 * p.hollowness);
  const wash = c.pink(r, n), lp = c.biquad("lp", m[6], 0.7, sr), hp = c.biquad("hp", 90, 0.7, sr);
  const ph = [r() * 6, r() * 6, r() * 6];
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    wash[i] = hp(lp(wash[i])) * (0.6 + 0.25 * Math.sin(t * 2.3 + ph[0]) + 0.15 * Math.sin(t * 4.1 * p.rate / 1.5 + ph[1]));
  }
  c.mix(out, wash, 0, 0.3 + 0.15 * p.amount, sr);
  const events = Math.round(dur * (3 + 3 * p.rate));
  let t = -0.05;
  for (let e = 0; e < events; e++) {
    t += (dur / events) * (0.4 + 1.2 * r());
    if (t > dur - 0.3) t = r() * (dur - 0.5);
    const a = (0.25 + 0.75 * r()) * (0.3 + 0.7 * p.amount);
    const L = 0.14 + 0.16 * r() + 0.08 * a, sn = c.seconds(L, sr), sp = c.noise(r, sn);
    const fc = m[3] * (0.6 + 0.9 * r()), bp = c.biquad("bp", fc, 0.8, sr), pk = 0.3 + 0.25 * r();
    for (let i = 0; i < sn; i++) {
      const u = i / sn, sh = u < pk ? Math.sin(u / pk * 1.5708) : Math.exp(-(u - pk) * 4.5);
      sp[i] = bp(sp[i]) * sh * sh;
    }
    c.mix(out, sp, t, 1.6 * a, sr);
    const nb = 1 + Math.floor(r() * 3);
    for (let b = 0; b < nb; b++) {
      const bl = 0.04 + 0.06 * r(), f0 = m[5] * (0.6 + 0.9 * r()), bn = c.seconds(bl, sr), dir = r() < 0.5 ? 1 : -1;
      const ch = c.osc("sine", (tt) => f0 * (1 + dir * 0.8 * tt / bl), bn, sr), be = c.env(bn, 0.008, bl * 0.4, sr);
      c.mix(out, c.multiply(ch, be), t + L * pk * (0.6 + r()), 0.12 * a, sr);
    }
    const f = hollowF * (0.97 + 0.06 * r());
    c.mix(out, c.ring([[f, 1], [f * m[1], 0.3]], m[2] * 3 + 0.05, m[2] * (0.6 + 0.8 * p.hollowness), sr), t + L * pk * 0.7, 0.3 * a * m[4] * (0.2 + 0.8 * p.hollowness), sr);
  }
  if (p.tail) {
    const src = Float32Array.from(out), sm = c.onepole(sr), y = new Float32Array(n);
    for (const [d, g] of [[0.083, 0.7], [0.131, 0.65], [0.197, 0.6], [0.263, 0.55]]) {
      const k = Math.round(d * sr);
      for (let i = 0; i < n; i++) y[i] = src[i] + (i >= k ? g * y[i - k] : 0);
      for (let i = 0; i < n; i++) out[i] += 0.22 * sm(y[i], 1200);
      y.fill(0);
    }
  }
  c.fade(out, 15, sr);
  c.finish(out, 0.8, 1.1);
  c.fade(out, 15, sr);
  return { samples: out };
}
