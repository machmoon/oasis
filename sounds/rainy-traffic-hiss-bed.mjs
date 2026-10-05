// Wet traffic hiss bed: a far road wash (filtered pink noise), close and distant passes of tire hiss with a Doppler sweep, droplet spray grains and a low tyre/engine rumble, placed in a sized street reverb.
export const meta = {
  title: "Wet Traffic Hiss", kind: "ambience", format: "sound", duration: 4, price: 5, author: "stormfront", payout: "stormfront@creators.oasis.example", kit: "Rainy City Street", description: "A loopable four seconds of cars hissing past on a rain-soaked road at night: road width, traffic density, tire spray, low rumble and pass rate are knobs, for city exteriors and wet downtown scenes.",
  tags: ["traffic", "rain", "tires", "hiss", "city", "street", "loop", "night"],
};
export const params = { knobs: {
  road: { type: "choice", label: "Road width", default: "street", options: ["alley", "street", "avenue"] },
  density: { type: "range", label: "Traffic density", default: 0.5, min: 0, max: 1, step: 0.01 },
  spray: { type: "range", label: "Tire spray", default: 0.5, min: 0, max: 1, step: 0.01 },
  rumble: { type: "range", label: "Low rumble", default: 0.3, min: 0, max: 1, step: 0.01 },
  rate: { type: "range", label: "Pass rate (per s)", default: 0.75, min: 0.25, max: 2, step: 0.05 },
  loop: { type: "toggle", label: "Loop crossfade", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, dur = 4, n = c.seconds(dur, sr);
  const r = c.rng(p.seed * 613 + params.knobs.road.options.indexOf(p.road) * 41 + 3);
  const W = {
    alley: { L: 1.1, d: [0.12, 0.3], wash: [500, 2600], rv: { size: 0.25, decay: 0.5, mixAmt: 0.38 } },
    street: { L: 1.6, d: [0.25, 0.65], wash: [350, 2000], rv: { size: 0.5, decay: 0.9, mixAmt: 0.22 } },
    avenue: { L: 2.2, d: [0.4, 1.0], wash: [250, 1500], rv: { size: 0.85, decay: 1.7, mixAmt: 0.28 } },
  }[p.road];
  const L = c.seconds(W.L, sr), pbuf = new Float32Array(n + L);
  const hiF = sr * 0.49, TAU = c.TAU, exp = Math.exp, sqrt = Math.sqrt, atan = Math.atan, min = Math.min;
  const kof = (f0) => 1 - exp(-TAU * (f0 > hiF ? hiF : f0 < 5 ? 5 : f0) / sr);
  // The pass window sin(PI·i/L) is the same for every pass: computed once (as doubles, the same values).
  const WIN = new Float64Array(L); for (let i = 0; i < L; i++) WIN[i] = Math.sin(Math.PI * i / L);
  const pass = (tc, d, v, amp) => {
    let start = Math.round(tc - L / 2);
    if (p.loop) { if (start < 0) start += n; } else start = Math.max(0, Math.min(n - L, start));
    const hw = (0.06 + 0.28 * d) / v * sr, fc = (700 + 3200 * (1 - d)) * c.between(r, 0.85, 1.15), sprAmt = p.spray * (1.5 - d);
    // The six one-pole filters run inline with their state in locals (no closure call per filter per sample). Each
    // coefficient is the kit's onepole formula verbatim, 1 - exp(-TAU * clamp(f0, 5, 0.49 sr) / sr), so the
    // samples are bit-identical; lpB's fixed 200 Hz coefficient is computed once.
    let yA = 0, yB = 0, yC = 0, yD = 0, yE = 0, yF = 0, fl = 0, b = 0;
    const kB = kof(200), rumble = p.rumble > 0;
    for (let i = 0; i < L; i++) {
      const x = (i - L / 2) / hw, e1 = 1 / (1 + x * x), e = e1 * sqrt(e1), win = WIN[i];
      const dop = 1 - 0.2 * v * atan(x) / 1.5708, wn = r() * 2 - 1, ws = r() * 2 - 1;
      yA += kof(fc * dop) * (wn - yA); yB += kB * (wn - yB);
      const hiss = yA - yB;
      if (i % 40 === 0) fl = r() < 0.5 ? 0.4 + r() : 0.12;
      yC += kof(min(9500 * dop, sr * 0.45)) * (ws - yC); yD += kof(2600 * dop) * (ws - yD);
      const spr = (yC - yD) * fl * sqrt(e);
      let rum = 0;
      if (rumble) { b = b * 0.998 + wn * 0.03; yE += kof(110 * dop) * (b - yE); yF += kof(70 * dop) * (yE - yF); rum = yF * 7; }
      pbuf[start + i] += amp * e * win * (hiss + 1.6 * sprAmt * spr + 1.8 * p.rumble * rum);
    }
  };
  const count = Math.max(1, Math.round(p.rate * dur));
  for (let k = 0; k < count; k++) {
    const d = c.between(r, W.d[0], W.d[1]);
    pass(((k + 0.5 + (r() - 0.5) * 0.8) / count) * n, d, c.between(r, 0.7, 1.3), (1.25 - 0.75 * d) * c.between(r, 0.7, 1));
  }
  const far = Math.min(6, Math.round(p.density * 5 * (0.8 + 0.4 * r())));
  for (let k = 0; k < far; k++) pass(r() * n, Math.min(1.1, W.d[1] + 0.2), c.between(r, 0.6, 1), c.between(r, 0.25, 0.4));
  c.reverb(pbuf, W.rv, sr);
  const X = c.seconds(0.4, sr), bed = c.pink(r, n + X);
  const hp = c.biquad("hp", W.wash[0], 0.7, sr), lp = c.biquad("lp", W.wash[1] + 2800 * p.density, 0.7, sr);
  const ph1 = r() * c.TAU, ph2 = r() * c.TAU, lowLp = c.onepole(sr), lowLp2 = c.onepole(sr);
  let bb = 0;
  // hp then lp over the whole bed as blocks on doubles (the kit's biquad .process): the same values lp(hp(x)) gave.
  const B = lp.process(hp.process(Float64Array.from(bed)));
  for (let i = 0; i < n + X; i++) {
    const m = 0.75 + 0.15 * Math.sin(c.TAU * 2 * i / n + ph1) + 0.1 * Math.sin(c.TAU * 5 * i / n + ph2);
    let low = 0;
    if (p.rumble > 0) { bb = bb * 0.998 + (r() * 2 - 1) * 0.03; low = lowLp2(lowLp(bb, 90), 60) * 6; }
    bed[i] = B[i] * m * (0.28 + 0.5 * p.density) + p.rumble * (0.3 + 0.5 * p.density) * low;
  }
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = pbuf[i] + bed[i];
  if (p.loop) {
    for (let i = 0; i < L; i++) out[i] += pbuf[n + i];
    for (let i = 0; i < X; i++) {
      const a = i / X, gi = Math.sin(a * 1.5708), go = Math.cos(a * 1.5708);
      out[i] += bed[i] * (gi - 1) + bed[n + i] * go;
    }
  }
  c.fade(c.finish(out, 0.8), p.loop ? 12 : 250, sr);
  return { samples: out };
}
