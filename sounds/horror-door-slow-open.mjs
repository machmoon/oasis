// Horror door: a heavy door swung open on rusty hinges. Layers: latch click and release, two detuned hinges each a stick-slip pulse train on a gliding pitch, scrape noise, a wood or iron body groan, a thud with a small rebound at the end of the swing, and an optional room tail.
export const meta = {
  title: "Rusty Hinge Door", kind: "foley", format: "sound", duration: 3.5, price: 3, author: "hollowbody", payout: "hollowbody@creators.oasis.example", kit: "Horror House", description: "A heavy door pushed slowly open on rusty hinges, with a latch click, a stick-slip creak and a dull bump at the end; for haunted-house entrances and slow reveals.",
  tags: ["door", "creak", "hinge", "horror", "haunted", "rusty", "latch", "foley"],
};
export const params = { knobs: {
  door: { type: "choice", label: "Door", default: "wood", options: ["wood", "iron"] },
  rust: { type: "range", label: "Rust", default: 0.6, min: 0, max: 1, step: 0.01 },
  speed: { type: "range", label: "Swing speed", default: 0.4, min: 0, max: 1, step: 0.01 },
  latch: { type: "range", label: "Latch click", default: 0.6, min: 0, max: 1, step: 0.01 },
  pitch: { type: "range", label: "Pitch", default: 0.5, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Room tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + (p.door === "iron" ? 91 : 13));
  const iron = p.door === "iron", T = 3.5, out = new Float32Array(c.seconds(T, sr));
  const swing = 2.6 - 1.3 * p.speed, pm = Math.pow(2, (p.pitch - 0.5) * 1.6), rust = p.rust;
  const t0 = 0.3, end = t0 + swing, n = c.seconds(swing, sr);
  c.mix(out, c.burst(r, 0.01, "bp", 2500 + 2000 * p.latch, 1.5, 0.0004, 0.003, sr), 0.02, 0.2 + 0.7 * p.latch, sr);
  c.mix(out, c.ring([[iron ? 1800 : 900, 1], [iron ? 3100 : 1700, 0.5]], 0.09, iron ? 0.035 : 0.012, sr), 0.021, 0.25 * p.latch, sr);
  c.mix(out, c.burst(r, 0.025, "lp", 600, 0.8, 0.001, 0.01, sr), 0.15, 0.55 * p.latch, sr);
  c.mix(out, c.ring([[iron ? 260 : 170, 1], [iron ? 540 : 380, 0.4]], 0.1, 0.025, sr), 0.15, 0.3 * p.latch, sr);
  const hinge = (fm, rate, amp) => {
    const x = new Float32Array(n), sc = c.noise(r, n), bp = c.biquad("bp", 2400 * pm * fm, 2.5, sr), lp = c.onepole(sr);
    let ph = 0, sp = r(), stick = 1, level = 0, nxt = 0, drift = 0;
    for (let i = 0; i < n; i++) {
      const t = i / n, ts = i / sr, v = Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.05)), 0.7);
      if (ts >= nxt) { stick = r() < 0.3 * (0.4 + rust) ? 0.1 : 0.5 + 0.5 * r(); nxt = ts + 0.05 + r() * 0.2; }
      level += (stick - level) * 0.004;
      drift += (r() - 0.5) * 0.02; drift *= 0.995;
      const fs = rate * (0.5 + v) * (1 + drift);
      sp += fs / sr; if (sp >= 1) sp -= 1;
      const slip = (1 - sp) * (1 - sp), f = (iron ? 420 : 280) * pm * fm * (0.65 + 0.9 * v + 0.35 * level + 0.3 * drift);
      ph += c.TAU * f / sr;
      const saw = (ph / c.TAU % 1) * 2 - 1, tone = lp(saw + 0.6 * Math.sin(ph * 2.01) + 0.4 * Math.sin(ph * 3.02), f * (2 + 3 * rust));
      const env = Math.min(1, ts / 0.12) * Math.min(1, (swing - ts) / 0.3) * (0.25 + 0.75 * v);
      x[i] = (tone * (0.3 + 0.7 * slip) + bp(sc[i]) * (0.4 + 0.8 * rust) * slip) * level * env * amp;
    }
    return x;
  };
  const cr = 0.12 + 0.88 * rust;
  c.mix(out, hinge(1, 22 + 30 * p.speed, 1), t0, 0.55 * cr, sr);
  c.mix(out, hinge(1.19 + 0.05 * r(), 14 + 22 * p.speed, 0.7), t0 + 0.08, 0.45 * cr, sr);
  c.mix(out, c.burst(r, 0.05, "bp", 700, 1.5, 0.002, 0.02, sr), t0, 0.35 * cr, sr);
  const g = c.brown(r, n), gb = c.biquad("bp", (iron ? 150 : 100) * pm, 3, sr);
  for (let i = 0; i < n; i++) { const ts = i / sr; g[i] = gb(g[i]) * Math.min(1, ts / 0.4) * Math.min(1, (swing - ts) / 0.5) * (0.6 + 0.4 * Math.sin(ts * 4 + 1)); }
  c.mix(out, g, t0, 1.6, sr);
  c.mix(out, c.ring([[(iron ? 70 : 55) * pm, 1], [(iron ? 143 : 110) * pm, 0.5], [iron ? 920 : 310, 0.2]], 0.7, iron ? 0.3 : 0.14, sr), end, 0.8, sr);
  c.mix(out, c.burst(r, 0.03, "lp", iron ? 2500 : 1100, 0.8, 0.002, 0.01, sr), end, 0.5, sr);
  c.mix(out, c.ring([[(iron ? 80 : 62) * pm, 1], [iron ? 1100 : 380, 0.2]], 0.3, 0.08, sr), end + 0.22 + 0.06 * r(), 0.22, sr);
  if (iron) c.mix(out, c.ring([[620, 1], [1710, 0.5], [2900, 0.3]], 1, 0.4, sr), end, 0.12, sr);
  const res = p.tail ? c.reverb(out, { size: 0.8, decay: 0.55, mixAmt: 0.35 }, sr) : out;
  c.fade(c.finish(res, 0.85, 1.1), 25, sr);
  return { samples: res };
}
