// Kettle: a stovetop kettle (or electric jug) heating from a low rumble to a full boil. Layers: a brown-noise base rumble and a pink roar that track the heat curve, Poisson-timed Minnaert bubble chirps and noise pops, and turbulent spout hiss. The stovetop whistle starts as breathy, sputtering, flat air, settles up to pitch, blooms its octave and then holds as a loud two-chamber tone that masks the boil until the kettle is lifted. The electric jug ends in a cavitation roar and a thermostat click.
export const meta = {
  title: "Kettle To Whistle", kind: "sfx", format: "sound", duration: 3.9, price: 3, author: "foleyroom", payout: "foleyroom@creators.oasis.example", kit: "Kitchen", description: "A kettle climbing from a quiet heating rumble through rolling bubbles to a shrill, sustained whistle or an electric click, for kitchen scenes, morning routines and tension cues.",
  tags: ["kettle", "boil", "whistle", "steam", "kitchen", "bubbles", "foley", "stove"],
};
export const params = { knobs: {
  type: { type: "choice", label: "Kettle type", default: "stovetop whistle", options: ["stovetop whistle", "electric click"] },
  stage: { type: "range", label: "Boil stage", default: 0.3, min: 0, max: 1, step: 0.01 },
  pitch: { type: "range", label: "Whistle pitch (Hz)", default: 1800, min: 800, max: 3000, step: 10 },
  steam: { type: "range", label: "Steam hiss", default: 0.5, min: 0, max: 1, step: 0.01 },
  duration: { type: "range", label: "Duration (s)", default: 3, min: 1.5, max: 3, step: 0.1 },
  tail: { type: "toggle", label: "Tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, el = p.type === "electric click", r = c.rng(p.seed * 4513 + (el ? 101 : 7));
  const D = Math.min(3, Math.max(1.5, p.duration)), tail = p.tail ? 0.9 : 0.35, tau = p.tail ? 0.18 : 0.07;
  const n = Math.min(c.seconds(D + tail, sr), c.seconds(3.95, sr)), out = new Float32Array(n);
  const ss = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x), s0 = 0.8 * p.stage, F = p.pitch, st = p.steam;
  const tw = Math.min(D - 0.9, Math.max(0.15, D * 0.5 * (1 - p.stage) * (0.9 + 0.2 * r())));
  const Tb = el ? D * 0.8 : Math.max(0.3, tw + 0.2);
  const H = new Float32Array(n), W = new Float32Array(n), duck = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    H[i] = t < D ? Math.min(1, s0 + (1 - s0) * t / Tb) * ss(t / 0.5) : Math.exp(-(t - D) / (el ? tau : tau * 1.6));
    W[i] = el || t < tw ? 0 : ss((t - tw) / 0.6) * (t > D ? Math.exp(-(t - D) / (tau * 1.4)) : 1);
    duck[i] = 1 - 0.7 * W[i];
  }
  const br = c.brown(r, n), pk = c.pink(r, n), lp1 = c.onepole(sr), lp2 = c.onepole(sr), hp2 = c.onepole(sr);
  let wob = 0.7, wt = 0.7;
  for (let i = 0; i < n; i++) {
    if (i % 600 === 0) wt = 0.55 + 0.45 * r();
    wob += (wt - wob) * 0.003;
    const h = H[i], roar = lp2(pk[i], el ? 600 + 2600 * h : 300 + 1500 * h);
    const rg = el ? 1.6 * h * (1 - h) + 0.15 * h : 0.35 * h * h;
    out[i] = (lp1(br[i], 70 + 230 * h) * (0.1 + 0.6 * h) * wob + (roar - hp2(roar, 200)) * rg * wob) * duck[i];
  }
  let t = 0.05, count = 0;
  while (t < D + tail && count < 2600) {
    const i0 = Math.floor(t * sr), h = H[Math.min(n - 1, i0)];
    t += -Math.log(1 - r() * 0.999) / (4 + 200 * Math.pow(h, 1.5));
    if (i0 >= n || h < 0.02) continue;
    count++;
    const early = h < 0.5 && r() < 0.5, f0 = early ? c.between(r, 500, 1300) : c.between(r, 350, 2400) * (1.25 - 0.4 * h);
    const len = early ? 0.012 + r() * 0.02 : 0.003 + r() * 0.012, m = c.seconds(len, sr), k = 0.3 + r() * 0.9;
    const a = (0.15 + 0.85 * r()) * (0.25 + 0.6 * h) * 0.5 * duck[i0], att = 0.0004 * sr;
    let ph = r() * 6;
    for (let j = 0; j < m && i0 + j < n; j++) { const x = j / m; ph += c.TAU * f0 * (1 + k * x) / sr; out[i0 + j] += Math.sin(ph) * Math.min(1, j / att) * (1 - x) * (1 - x) * a; }
    if (r() < 0.4) c.mix(out, c.burst(r, 0.004 + r() * 0.006, "bp", f0 * (1.5 + r()), 1.2, 0.0003, 0.0015, sr), t, a * 0.8, sr);
  }
  const lpS = c.onepole(sr), lpB = c.onepole(sr);
  let turb = 0.6, tt = 0.6, gate = 0, gt = 0, nextG = 0, vib = 0, vt = 0, ph1 = 0, ph2 = 0, ph3 = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr, h = H[i], x = r() * 2 - 1;
    if (i % 400 === 0) { tt = 0.4 + 0.6 * r(); vt = (r() - 0.5) * 0.012; }
    turb += (tt - turb) * 0.002; vib += (vt - vib) * 0.001;
    out[i] += (x - lpS(x, 2400)) * st * (0.03 + 0.4 * ss((h - 0.4) / 0.5)) * turb * 0.35 * (1 - 0.65 * W[i]);
    if (el) { ph1 += c.TAU * F * 0.5 * (1 + vib) / sr; out[i] += lpB(x, 300) * Math.sin(ph1) * st * h * h * h * 2; continue; }
    if (t < tw) continue;
    const u = t - tw, off = t > D ? t - D : 0, rise = ss(u / 0.6), unsettled = 1 - ss(u / 0.9);
    if (t >= nextG) { gt = u < 0.55 ? (r() < 0.55 ? r() * 0.5 : 1) : 1; nextG = t + 0.012 + r() * 0.045; }
    gate += (gt - gate) * 0.005;
    const drop = off ? 1 - 0.2 * (1 - Math.exp(-off / 0.2)) : 1;
    const f = F * (0.84 + 0.16 * ss(u / 0.8)) * drop * (1 + vib * (1 + 4 * unsettled));
    const lvl = W[i] * gate * (0.92 + 0.08 * turb), bloom = rise * rise;
    ph1 += c.TAU * f / sr; ph2 += c.TAU * f * 1.004 / sr; ph3 += c.TAU * f * 2 / sr;
    const tone = (0.6 * Math.sin(ph1) + 0.18 * Math.sin(ph2) + 0.2 * bloom * Math.sin(ph3)) * (0.35 + 0.65 * rise);
    const breath = lpB(x, 350) * Math.sin(ph1) * 2.2 * (0.55 * unsettled + 0.1 + 0.1 * st);
    out[i] += 1.4 * lvl * (tone + breath);
  }
  if (el) {
    c.mix(out, c.burst(r, 0.01, "hp", 2800, 0.8, 0.0004, 0.002, sr), D, 1.6, sr);
    c.mix(out, c.ring([[1650 * (0.97 + 0.06 * r()), 1], [3530, 0.35], [5200, 0.15]], 0.07, 0.012, sr), D + 0.0005, 0.9, sr);
    c.mix(out, c.ring([[170 * (0.95 + 0.1 * r()), 1], [410, 0.3]], 0.1, 0.02, sr), D + 0.001, 1.0, sr);
    c.mix(out, c.burst(r, 0.006, "bp", 4200, 1.5, 0.0003, 0.0015, sr), D + 0.012 + 0.006 * r(), 0.5, sr);
  } else {
    const k = 0.97 + 0.06 * r();
    c.mix(out, c.burst(r, 0.01, "bp", 3200, 1, 0.0006, 0.003, sr), D - 0.01, 0.3, sr);
    c.mix(out, c.ring([[1900 * k, 1], [2870 * k, 0.6], [4460 * k, 0.3]], 0.12, 0.02, sr), D - 0.009, 0.15, sr);
  }
  c.finish(out, 0.9);
  c.fade(out, 12, sr);
  return { samples: out };
}
