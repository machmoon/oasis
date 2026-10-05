// Bare bulb buzzing and flickering out: a 100 Hz mains-hum stack plus hum-pulsed arc hiss, gated by a stutter that builds from steady to dropouts. Each re-strike gets a tick, then a final pop, and an optional ringing glass tail.
export const meta = {
  title: "Dying Bulb", kind: "sfx", format: "sound", duration: 3, price: 2, author: "hollowbody", payout: "hollowbody@creators.oasis.example", kit: "Horror House", description: "A bare bulb buzzing, stuttering and flickering out with a final pop, for abandoned-house scares and power-failure beats.",
  tags: ["bulb", "flicker", "buzz", "horror", "electric", "hum", "pop", "lighting"],
};
export const params = { knobs: {
  bulb: { type: "choice", label: "Bulb", default: "filament", options: ["filament", "fluorescent"] },
  buzz: { type: "range", label: "Buzz", default: 0.6, min: 0, max: 1, step: 0.01 },
  chaos: { type: "range", label: "Flicker chaos", default: 0.5, min: 0, max: 1, step: 0.01 },
  pop: { type: "range", label: "Pop", default: 0.6, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Glass tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + (p.bulb === "filament" ? 3 : 91));
  const fl = p.bulb === "fluorescent", ch = p.chaos;
  const die = 1.4 + 0.4 * r() + 0.3 * ch, t0 = 0.3 + 0.3 * r();
  const n = c.seconds(die + (p.tail ? 1.1 : 0.4), sr), out = new Float32Array(n);
  const hz = 100 * (0.99 + r() * 0.02);
  const gate = new Float32Array(n), strikes = [];
  let next = 0, lvl = 1, on = 1;
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    if (t >= next) {
      if (t > die) { on = 0; lvl = 0; next = 1e9; }
      else if (t < t0) { on = 1; lvl = 0.92 + 0.08 * r(); next = t0; }
      else {
        const prog = Math.min(1, (t - t0) / (die - t0));
        const off = (0.2 + 0.5 * ch) * Math.pow(prog, 0.7) + 0.1 * prog;
        const was = on;
        on = r() < off ? 0 : 1;
        if (on && !was && strikes.length < 60) strikes.push([t, prog]);
        lvl = on ? (0.5 + 0.5 * r()) * (1 - 0.3 * prog) : (fl ? 0 : 0.1 * r());
        next = t + (on ? 0.04 + 0.22 * r() * (1.1 - 0.7 * prog) : 0.015 + 0.09 * r() * (0.4 + ch)) * (1.3 - 0.6 * ch);
      }
    }
    gate[i] = lvl;
  }
  const sm = c.onepole(sr), sf = fl ? 900 : 70;
  for (let i = 0; i < n; i++) gate[i] = sm(gate[i], sf);
  const stack = new Float32Array(n), hiss = c.pink(r, n), bp = c.biquad("bp", fl ? 4200 : 2400, 1.4, sr);
  const harm = fl ? 10 : 6;
  for (let h = 1; h <= harm; h++) {
    const a = (fl ? 1 / Math.sqrt(h) : 1 / h) * (h % 2 ? 1 : 0.7), w = c.TAU * hz * h / sr, ph = r() * 6.28;
    for (let i = 0; i < n; i++) stack[i] += a * Math.sin(w * i + ph);
  }
  const wp = Math.PI * hz / sr;
  for (let i = 0; i < n; i++) {
    const s = Math.sin(wp * i), s2 = s * s, pulse = s2 * s2 * 2.2;
    const t = i / sr, sag = 1 - 0.25 * Math.min(1, t / die);
    stack[i] = stack[i] * (0.8 + 0.2 * Math.sin(c.TAU * 6.3 * t)) * sag * (fl ? 0.35 : 0.7) + bp(hiss[i]) * pulse * (fl ? 2.4 : 1.5) * (0.1 + 1.4 * p.buzz);
  }
  c.filter(stack, c.biquad(fl ? "hp" : "lp", fl ? 250 : 2600, 0.7, sr));
  const tone = c.osc("sine", (t) => (fl ? 8200 : 3100) * (1 - 0.06 * Math.min(1, t / die)), n, sr);
  for (let i = 0; i < n; i++) out[i] = (stack[i] * (0.12 + 0.35 * p.buzz) + tone[i] * (fl ? 0.05 : 0.015) * (0.3 + p.buzz)) * gate[i];
  for (const [t, prog] of strikes) {
    c.mix(out, c.burst(r, 0.012, "hp", fl ? 2500 + r() * 3000 : 1800 + r() * 1500, 1.2, 0.0003, 0.003, sr), t, (fl ? 0.4 : 0.2) + 0.25 * r() + 0.15 * prog, sr);
    if (fl) c.mix(out, c.ring([[hz * 3, 1], [6200 + r() * 1500, 0.4]], 0.06, 0.012, sr), t, 0.2, sr);
  }
  for (let k = 0; k < Math.round(3 + 12 * ch); k++) c.mix(out, c.burst(r, 0.005, "hp", 3000 + r() * 3000, 1, 0.0003, 0.0015, sr), t0 + r() * (die - t0), 0.15 + 0.25 * r(), sr);
  const pt = die + 0.03;
  c.mix(out, c.burst(r, 0.035, "hp", 1200, 0.8, 0.0003, 0.007, sr), pt, 0.2 + 1.3 * p.pop, sr);
  c.mix(out, c.ring([[140, 1], [310, 0.4]], 0.15, 0.03, sr), pt, 0.8 * p.pop, sr);
  c.mix(out, c.ring([[4300, 1], [6100, 0.6], [8900, 0.3]], 0.3, 0.05, sr), pt, 0.25 * p.pop, sr);
  if (p.tail) {
    const dry = out.slice(0), rv = c.reverb(dry, { size: 0.5, decay: 0.5, mixAmt: 1 }, sr);
    c.mix(out, c.ring([[2650 * (0.98 + r() * 0.04), 0.6], [3870, 0.4], [5430, 0.25]], 0.8, 0.22, sr), pt + 0.01, 0.12 + 0.12 * p.pop, sr);
    const s0 = Math.floor((die - 0.1) * sr);
    for (let i = s0; i < n; i++) out[i] += rv[i] * 0.4;
  }
  c.fade(c.finish(out, 0.85, 1.1), p.tail ? 150 : 40, sr);
  return { samples: out };
}
