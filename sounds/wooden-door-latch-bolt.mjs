// Door latch & bolt: an iron latch lifted, a bolt slid or an oak bar shifted on a tavern door. A grab click, a friction slide (noise, stick-slip grains, a rusty gliding squeal), then a damped iron clack on the door's wooden body, keeper bounces, and an optional small-room tail.
export const meta = {
  title: "Iron Door Latch", kind: "foley", format: "sound", duration: 0.8, price: 2, author: "hollowbody", payout: "hollowbody@creators.oasis.example", kit: "Wooden Tavern", description: "An iron thumb-latch lifted, a bolt slid home or a heavy bar shifted on a wooden door, with knobs for force, rust grind and speed; each seed is a fresh take for tavern doors, cellars and dungeon gates.",
  tags: ["latch", "bolt", "door", "iron", "rust", "foley", "tavern", "lock"],
};
export const params = { knobs: {
  action: { type: "choice", label: "Action", default: "latch", options: ["latch", "bolt", "bar"] },
  force: { type: "range", label: "Force", default: 0.55, min: 0, max: 1, step: 0.01 },
  rust: { type: "range", label: "Rust grind", default: 0.35, min: 0, max: 1, step: 0.01 },
  speed: { type: "range", label: "Speed", default: 1, min: 0.5, max: 2, step: 0.05 },
  tail: { type: "toggle", label: "Room tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, ai = Math.max(0, params.knobs.action.options.indexOf(p.action));
  const r = c.rng(p.seed * 6151 + ai * 389 + 23), f = p.force, g = p.rust, T = 1 / p.speed;
  const A = [
    { pre: 0.04, slide: 0.15, fric: [2600, 2.2], modes: [1180, 2.71, 4.93, 7.2], md: 0.04, wood: 220, thud: 0.45, tick: [2400, 5100] },
    { pre: 0.03, slide: 0.27, fric: [1700, 1.6], modes: [760, 2.37, 4.1, 6.6], md: 0.035, wood: 160, thud: 0.65, tick: [1900, 4300] },
    { pre: 0.06, slide: 0.36, fric: [750, 1.2], modes: [430, 2.6, 5.3, 8.1], md: 0.025, wood: 105, thud: 1, tick: [380, 930] },
  ][ai];
  const t0 = A.pre * T, len = A.slide * T * (0.92 + 0.16 * r()), hit = t0 + len + 0.004 + r() * 0.008 * T;
  const md = A.md * (p.tail ? 1.3 : 1), wd = 0.025 + 0.03 * f;
  const out = new Float32Array(c.seconds(hit + Math.max(md, wd) * 6 + 0.12 + (p.tail ? 0.3 : 0), sr));
  const win = (u) => Math.max(0, Math.min(1, u / 0.15, (1 - u) / 0.06)), dt = () => 0.98 + 0.04 * r();
  // grab: thumb on the lever, a hand on the bolt knob, fingers under the bar
  c.mix(out, c.ring([[A.tick[0] * dt(), 1], [A.tick[1] * dt(), 0.4]], 0.04, ai === 2 ? 0.012 : 0.006, sr), 0.003, 0.35 + 0.2 * f, sr);
  c.mix(out, c.burst(r, 0.006, "hp", 1800 + 2500 * f, 0.8, 0.0004, 0.0012, sr), 0.002, 0.25 + 0.2 * f, sr);
  // the slide: friction noise under stick-slip grains whose rate follows speed and rust
  const n = c.seconds(len, sr), x = c.noise(r, n), bp = c.biquad("bp", A.fric[0] * (0.9 + 0.2 * r()), A.fric[1], sr);
  let wob = 1;
  for (let i = 0; i < n; i++) { if (i % 220 === 0) wob = 0.55 + 0.45 * r(); x[i] = bp(x[i]) * win(i / n) * wob; }
  c.mix(out, x, t0, (0.3 + 0.25 * f) * (1 - 0.3 * g), sr);
  let t = 0;
  while (true) {
    t += (0.003 + 0.018 * (1 - g)) * (0.5 + 0.5 * T) * (0.4 + 1.2 * r());
    if (t >= len) break;
    c.mix(out, c.burst(r, 0.003 + 0.004 * r(), "bp", A.fric[0] * (0.7 + 1.1 * r()), 3, 0.0003, 0.001 + 0.002 * r(), sr), t0 + t, (0.15 + 0.6 * g) * win(t / len) * (0.5 + 0.5 * r()), sr);
  }
  if (g > 0.02) {
    const s0 = A.fric[0] * 0.42 * (0.85 + 0.3 * r()), gl = c.between(r, 0.15, 0.45) * (r() < 0.5 ? -1 : 1), vib = 4 + 5 * r();
    const sq = c.osc("tri", (tt) => s0 * (1 + gl * tt / len + 0.03 * Math.sin(c.TAU * vib * tt)), n, sr);
    const sl = c.biquad("lp", s0 * 3, 0.7, sr);
    let a = 0.7;
    for (let i = 0; i < n; i++) { if (i % 300 === 0) a = c.clamp(a + (r() - 0.5) * 0.5, 0.25, 1); sq[i] = sl(sq[i]) * win(i / n) * a; }
    c.mix(out, sq, t0, 0.45 * Math.sqrt(g), sr);
  }
  // the stop: contact edge, damped iron (high partials die first), the door's wooden body and a low thump
  c.mix(out, c.burst(r, 0.007, "hp", 1500 + 3500 * f, 0.7, 0.0004, 0.0016, sr), hit, 0.45 + 0.5 * f, sr);
  const b = A.modes[0] * (0.96 + 0.08 * r()), mg = (0.3 + 0.45 * f) * (ai === 2 ? 0.6 : 1);
  c.mix(out, c.ring([[b, 1], [b * A.modes[1] * dt(), 0.55]], md * 6, md, sr), hit + 0.0008, mg, sr);
  c.mix(out, c.ring([[b * A.modes[2] * dt(), 0.5], [b * A.modes[3] * dt(), 0.2 + 0.3 * f]], md * 3, md * 0.4, sr), hit + 0.0008, mg, sr);
  const w0 = A.wood * (1 - 0.15 * f) * dt();
  c.mix(out, c.ring([[w0, 1], [w0 * 2.31 * dt(), 0.45], [w0 * 3.9 * dt(), 0.18]], wd * 6, wd, sr), hit + 0.001, A.thud * (0.25 + 0.7 * f), sr);
  c.mix(out, c.burst(r, 0.035, "lp", 150 + 120 * f, 0.9, 0.0015, 0.012, sr), hit, A.thud * (0.15 + 0.7 * f), sr);
  // keeper: the latch bar bounces in its catch, the bolt knob drops into its slot
  const bounces = ai === 0 ? 2 + Math.floor(r() * 2) : ai === 1 ? 1 : 0;
  let bt = hit, gap = (0.03 + 0.02 * r()) * (0.6 + 0.4 * T) * (1.2 - 0.4 * f), ba = 0.35 + 0.2 * f;
  for (let k = 0; k < bounces; k++) {
    bt += gap; gap *= 0.6 + 0.1 * r(); ba *= 0.55;
    c.mix(out, c.ring([[b * 1.07 * dt(), 0.7], [b * A.modes[2] * dt(), 0.35]], 0.08, md * 0.35, sr), bt, ba, sr);
    c.mix(out, c.burst(r, 0.004, "hp", 3000, 0.8, 0.0003, 0.001, sr), bt, ba * 0.8, sr);
  }
  c.filter(out, c.biquad("lp", 3500 + 7000 * f, 0.7, sr));
  let res = out;
  if (p.tail) res = c.reverb(out, { size: 0.3, decay: 0.45, mixAmt: 0.22 }, sr) || out;
  c.finish(res, 0.9);
  c.fade(res, 10, sr);
  return { samples: res };
}
