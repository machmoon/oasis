// Pothole bump: a sharp tire slap and falling-pitch thump into the hole, a bump-stop clunk, the exit thump, then a damped suspension rebound as separate pitched thumps; cabin rattle is a dense mid/high buzz bed plus discrete knocks, each burst triggered by an impact; the optional tail is a low cabin boom that swells under it all.
export const meta = {
  title: "Pothole Slam", kind: "impact", format: "sound", duration: 1.2, price: 3, author: "hollowbody", payout: "hollowbody@creators.oasis.example", kit: "Car Interior", description: "A car tire dropping into a pothole and thumping out, with suspension bounce and loose interior rattle; for driving scenes, cabin cutaways and road-hazard moments.",
  tags: ["car", "pothole", "bump", "suspension", "impact", "rattle", "interior", "road"],
};
export const params = { knobs: {
  tire: { type: "choice", label: "Tire size", default: "small", options: ["small", "large"] },
  severity: { type: "range", label: "Hit severity", default: 0.6, min: 0, max: 1, step: 0.01 },
  bounce: { type: "range", label: "Suspension bounce", default: 0.5, min: 0, max: 1, step: 0.01 },
  rattle: { type: "range", label: "Interior rattle", default: 0.5, min: 0, max: 1, step: 0.01 },
  pitch: { type: "range", label: "Thump pitch", default: 0.5, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Cabin tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, big = p.tire === "large", s = 0.4 + 0.6 * p.severity;
  const r = c.rng(p.seed * 613 + (big ? 41 : 3)), N = c.seconds(1.2, sr), out = new Float32Array(N);
  const f0 = (big ? 44 : 62) * Math.pow(2, p.pitch * 1.2) * (0.99 + r() * 0.02);
  const gap = (big ? 0.17 : 0.12) + r() * 0.01, t1 = 0.01, t2 = t1 + gap;
  const thump = (t, g, pm, hard, dec) => {
    const n = c.seconds(0.35, sr), f = f0 * pm;
    const x = c.osc("sine", (tt) => f * (1 + 1.3 * Math.exp(-tt / 0.02)), n, sr);
    c.mix(out, c.multiply(x, c.env(n, 0.0015, dec, sr)), t, g, sr);
    c.mix(out, c.burst(r, 0.04, "lp", (big ? 450 : 700) + 600 * s, 0.8, 0.0006, 0.012, sr), t, g * 0.6 * hard, sr);
    c.mix(out, c.burst(r, 0.012, "hp", 2000, 0.8, 0.0003, 0.003, sr), t, g * 0.5 * hard, sr);
  };
  thump(t1, 0.75 + 0.25 * s, 1, 1, 0.06 + 0.03 * s + (big ? 0.02 : 0));
  c.mix(out, c.ring([[95, 1], [240, 0.6], [1500, 0.2]], 0.15, 0.03, sr), t2 - 0.01, 0.3 * s, sr);
  thump(t2, 0.6 + 0.3 * s, 0.85, 0.85, 0.07 + 0.03 * s);
  const rb = t2 + (big ? 0.2 : 0.15), step = (big ? 0.2 : 0.15);
  const ev = [t1, t2];
  for (let k = 0; k < 3; k++) {
    const t = rb + k * step * (0.95 + r() * 0.1);
    thump(t, (0.12 + 0.55 * p.bounce) * Math.pow(0.5, k) * (0.5 + 0.5 * s), 0.8 - 0.07 * k, 0.5 * p.bounce, 0.07);
    ev.push(t);
  }
  const lvl = 0.3 + 0.7 * p.rattle, rn = c.seconds(1.0, sr), z = c.noise(r, rn);
  const bp = c.biquad("bp", 2600, 1.2, sr), bp2 = c.biquad("bp", 1100, 2.5, sr), gate = new Float32Array(rn);
  for (let k = 0; k < ev.length; k++) for (let i = Math.floor(ev[k] * sr); i < rn; i++) gate[i] += Math.exp(-(i / sr - ev[k]) / 0.09) * (k < 2 ? 1 : 0.5);
  let g = 0;
  for (let i = 0; i < rn; i++) { if (i % 80 === 0) g = r() < 0.65 ? 0.3 + r() : 0; z[i] = (bp(z[i]) + 0.8 * bp2(z[i])) * g * Math.min(1, gate[i]); }
  c.mix(out, z, 0.005, 0.5 * lvl * s, sr);
  const hits = Math.round(16 + 26 * p.rattle);
  for (let k = 0; k < hits; k++) {
    const t = ev[Math.floor(r() * ev.length)] + 0.01 + Math.pow(r(), 1.6) * 0.25, kind = r();
    if (t > 1.0) continue;
    const a = lvl * (0.3 + 0.7 * r()) * s;
    if (kind < 0.35) c.mix(out, c.burst(r, 0.008, "bp", 3000 + r() * 3500, 5, 0.0003, 0.002, sr), t, 0.5 * a, sr);
    else if (kind < 0.65) c.mix(out, c.ring([[800 + r() * 500, 1], [1900 + r() * 700, 0.5]], 0.1, 0.02, sr), t, 0.55 * a, sr);
    else { const f = 4300 + r() * 1500; for (let j = 0; j < 3; j++) c.mix(out, c.ring([[f * (1 + 0.37 * j), 1], [f * 1.5, 0.4]], 0.1, 0.025, sr), t + j * (0.012 + r() * 0.01), 0.25 * a, sr); }
  }
  if (p.tail) {
    const n = c.seconds(0.9, sr), boom = c.osc("sine", (tt) => f0 * 1.3 * (1 - 0.2 * tt), n, sr), e = c.env(n, 0.03, 0.28, sr);
    c.mix(out, c.multiply(boom, e), 0.03, 0.4 * s, sr);
    const tl = c.reverb(out.slice(0, c.seconds(0.5, sr)), { size: 0.5, decay: 0.8, mixAmt: 1 }, sr);
    c.filter(tl, c.biquad("lp", 1800, 0.7, sr));
    c.mix(out, tl, 0.03, 0.6, sr);
  }
  c.filter(out, c.biquad("lp", big ? 7000 : 10000, 0.7, sr));
  c.fade(out, 40, sr);
  c.finish(out, 0.88, 1.2);
  return { samples: out };
}
