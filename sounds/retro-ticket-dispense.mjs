// Ticket dispenser: a geared motor that spins up, sags as each ticket loads it and winds down, with paper rustle per ticket and a perforation snap at each tear line.
export const meta = {
  title: "Ticket Spool", kind: "foley", format: "sound", duration: 1.6, price: 2, author: "quietmachine", payout: "quietmachine@creators.oasis.example", kit: "Retro Arcade", description: "An arcade ticket dispenser whirring out a few tickets, a stack or a jackpot run, with motor whine, paper rustle and feed rate as knobs; every seed is a different payout.",
  tags: ["ticket", "dispenser", "arcade", "motor", "paper", "redemption", "prize", "foley"],
};
export const params = { knobs: {
  count: { type: "choice", label: "Ticket count", default: "stack", options: ["few", "stack", "jackpot"] },
  whir: { type: "range", label: "Motor whir", default: 0.5, min: 0, max: 1, step: 0.01 },
  rustle: { type: "range", label: "Paper rustle", default: 0.5, min: 0, max: 1, step: 0.01 },
  rate: { type: "range", label: "Feed rate", default: 8, min: 4, max: 14, step: 0.5 },
  tail: { type: "toggle", label: "Spin-down tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 4513 + params.knobs.count.options.indexOf(p.count) * 97 + 3);
  const tickets = { few: 3, stack: 8, jackpot: 16 }[p.count], iv = Math.min(1 / p.rate, 3 / tickets);
  const up = 0.06 + r() * 0.02, run = tickets * iv + 0.03, down = p.tail ? 0.32 : 0.1, rev = p.tail ? 0.18 : 0.03;
  const out = new Float32Array(c.seconds(up + run + down + rev, sr));
  const m = c.seconds(up + run + down, sr), motor = new Float32Array(m);
  const f0 = 92 * (0.94 + r() * 0.12), gear = 10 + Math.floor(r() * 3), wr = 5 + r() * 4, wp = r() * 6;
  const lp = c.onepole(sr), hp = c.biquad("hp", 70, 0.7, sr), whir = p.whir;
  let ph1 = 0, ph2 = 0, ph3 = 0, wph = 0;
  for (let i = 0; i < m; i++) {
    const t = i / sr;
    let s;
    if (t < up) { const k = t / up; s = k * (2 - k); }
    else if (t < up + run) s = 1;
    else { const k = Math.max(0, 1 - (t - up - run) / down); s = k * k; }
    const tp = (t - up) / iv, sag = t > up && t < up + run - 0.03 ? Math.exp(-(tp - Math.floor(tp)) * 5) : 0;
    wph += wr * (1 + 0.3 * Math.sin(t * 1.7 + wp)) / sr;
    const f = f0 * (0.25 + 0.75 * s) * (1 - 0.13 * sag) * (1 + 0.012 * Math.sin(c.TAU * wph));
    ph1 = (ph1 + f / sr) % 1; ph2 = (ph2 + f * gear / sr) % 1; ph3 = (ph3 + f * gear * 2.01 / sr) % 1;
    const buzz = lp(2 * ph1 - 1, 300 + 2600 * whir);
    const whine = Math.sin(c.TAU * ph2) * (0.12 + 0.45 * whir) + Math.sin(c.TAU * ph3) * 0.12 * whir;
    motor[i] = hp(buzz * 0.45 + whine) * Math.sqrt(s) * (1 - 0.25 * sag);
  }
  c.mix(out, motor, 0, 0.05 + 0.36 * whir, sr);
  for (let k = 0; k < tickets; k++) {
    const t0 = up + k * iv + (r() - 0.5) * 0.12 * iv, rl = 0.85 * iv;
    c.mix(out, c.burst(r, rl, "bp", 2600 + r() * 900, 0.7, 0.003, rl * 0.35, sr), t0, 0.03 + 0.14 * p.rustle, sr);
    const grains = 4 + Math.round(22 * p.rustle);
    for (let g = 0; g < grains; g++) {
      const tg = t0 + r() * rl;
      c.mix(out, c.burst(r, 0.003 + 0.006 * r(), "bp", 1800 + r() * 5200, 1.5 + 2 * r(), 0.0004, 0.001 + 0.003 * r(), sr), tg, (0.06 + 0.26 * p.rustle) * (0.4 + 0.6 * r()), sr);
    }
    const ts = t0 + iv * (0.86 + r() * 0.06), hit = 0.8 + 0.4 * r();
    c.mix(out, c.burst(r, 0.006, "hp", 3500 + r() * 1500, 0.8, 0.0004, 0.0015, sr), ts, 0.6 * hit, sr);
    c.mix(out, c.ring([[2900 * (0.97 + r() * 0.06), 1], [5100 * (0.97 + r() * 0.06), 0.4]], 0.02, 0.003, sr), ts + 0.0005, 0.3 * hit, sr);
    c.mix(out, c.burst(r, 0.012, "bp", 1200 + r() * 400, 1.2, 0.0006, 0.003, sr), ts, 0.25 * hit, sr);
  }
  if (p.tail) {
    const te = up + run + 0.01;
    c.mix(out, c.burst(r, 0.07, "bp", 3400, 1, 0.004, 0.025, sr), te, 0.12 + 0.3 * p.rustle, sr);
    c.mix(out, c.ring([[175 * (0.95 + r() * 0.1), 1], [430, 0.4], [1250, 0.15]], 0.08, 0.018, sr), te + 0.05, 0.4, sr);
    c.mix(out, c.burst(r, 0.006, "hp", 3000, 0.8, 0.0004, 0.0015, sr), te + 0.05, 0.3, sr);
  }
  const res = (p.tail ? c.reverb(out, { size: 0.3, decay: 0.35, mixAmt: 0.14 }, sr) : null) || out;
  c.fade(c.finish(res, 0.85), 8, sr);
  return { samples: res };
}
