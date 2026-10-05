// Barrel roll: a keg or hogshead rolled over tavern boards. A continuous rumble/grind follows the speed, irregular seam knocks hit the damped stave modes and hoops, the fill adds slosh chirps, loose boards stick-slip creak, and an optional tail rocks it to rest.
export const meta = {
  title: "Barrel Over Boards", kind: "foley", format: "sound", duration: 3, price: 3, author: "hollowbody", payout: "hollowbody@creators.oasis.example", kit: "Wooden Tavern", description: "A wooden barrel rolled across creaking floorboards, with the size, fill, creak, roll speed and settle as knobs; use it for tavern cellars, docks and ship holds.",
  tags: ["barrel", "roll", "floorboards", "wood", "creak", "tavern", "keg", "foley"],
};
export const params = { knobs: {
  size: { type: "choice", label: "Barrel size", default: "keg", options: ["keg", "hogshead"] },
  fullness: { type: "range", label: "Fullness", default: 0.4, min: 0, max: 1, step: 0.01 },
  creak: { type: "range", label: "Floor creak", default: 0.5, min: 0, max: 1, step: 0.01 },
  speed: { type: "range", label: "Roll speed", default: 1, min: 0.5, max: 2, step: 0.05 },
  tail: { type: "toggle", label: "Settle tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, big = p.size === "hogshead", r = c.rng(p.seed * 6151 + (big ? 97 : 13));
  const full = p.fullness, spd = p.speed, TAU = c.TAU;
  const rollT = 1.0 + 1.1 / spd, tailT = p.tail ? 0.75 : 0.22;
  const n = c.seconds(rollT + tailT, sr), out = new Float32Array(n);
  const circ = big ? 2.3 : 1.25, k = (big ? 0.62 : 1) * (1 - 0.22 * full);
  const modes = [[175 * k, 1], [405 * k, 0.55], [690 * k, 0.3], [1130 * k, 0.16], [1720 * k, 0.08]];
  const ringDec = (big ? 0.032 : 0.024) * (1 - 0.6 * full) + 0.008, mass = (big ? 1.4 : 1) * (0.5 + 0.8 * full);
  const sl = full <= 0 ? 0 : 0.25 + 0.75 * Math.sin(Math.PI * full);
  const prof = u => u < 0.12 ? Math.sin(Math.PI / 2 * u / 0.12) : u > 0.55 ? Math.pow(Math.max(0, 1 - u) / 0.45, 0.8) : 1;
  const per = big ? 0.2 : 0.16;
  const rock = d => p.tail && d >= 0 ? 0.3 * Math.exp(-d / 0.2) * Math.abs(Math.sin(Math.PI * (d + 0.05) / per)) : 0;
  const knock = (t, a, bung) => {
    const md = modes.map(([f, m]) => [f * (0.96 + 0.08 * r()), m * (0.5 + 0.9 * r())]);
    c.mix(out, c.burst(r, 0.01, "lp", 1800 + 1500 * (1 - full), 0.8, 0.0006, 0.0025, sr), t, 0.4 * a, sr);
    c.mix(out, c.burst(r, 0.04, "bp", 500 * k + 350 + 300 * r(), 0.9, 0.0008, 0.012, sr), t, 0.45 * a, sr);
    c.mix(out, c.ring(md, 0.12, ringDec, sr), t + 0.0008, 0.32 * a * (bung ? 1.6 : 1), sr);
    c.mix(out, c.ring([[(big ? 56 : 70) + 30 * r(), 1], [150, 0.3]], 0.1, 0.018 + 0.02 * full, sr), t + 0.001, 0.45 * a * mass, sr);
    if (r() < 0.5) c.mix(out, c.ring([[2850 + 400 * r(), 1], [4100 + 500 * r(), 0.6], [5900 + 600 * r(), 0.3]], 0.04, 0.006, sr), t + 0.002, 0.06 * a, sr);
  };
  const chirp = (t, f0, len, a) => {
    const m = c.seconds(len, sr), b = new Float32Array(m), dec = Math.exp(-5 / m), att = 0.002 * sr; let ph = 0, g = 1;
    for (let i = 0; i < m; i++) { const u = i / m; ph += TAU * f0 * (1 + 0.9 * u * u) / sr; g *= dec; b[i] = Math.sin(ph) * g * Math.min(1, i / att); }
    c.mix(out, c.fade(b, 2, sr), t, a, sr);
  };
  const creakEv = (t, len, a) => {
    const m = c.seconds(len, sr), b = new Float32Array(m), fr = 480 + 520 * r();
    const bp1 = c.biquad("bp", fr, 14, sr), bp2 = c.biquad("bp", fr * 2.1, 10, sr), bp3 = c.biquad("bp", 2600 + 800 * r(), 4, sr);
    const f0 = 110 + 150 * r(), f1 = f0 * (0.55 + 1.0 * r()); let ph = 0, pk = 1e-9;
    for (let i = 0; i < m; i++) {
      const u = i / m; ph += (f0 + (f1 - f0) * u) * (1 + 0.1 * (r() - 0.5)) / sr; let imp = 0;
      if (ph >= 1) { ph -= 1; imp = 0.5 + 0.5 * r(); }
      const w = Math.sin(Math.PI * Math.min(1, u * 1.3)); b[i] = (bp1(imp) + 0.6 * bp2(imp) + 0.25 * bp3(imp)) * w; pk = Math.max(pk, Math.abs(b[i]));
    }
    c.mix(out, c.fade(b, 4, sr), t, a / pk, sr);
  };
  const dt = 0.001, steps = Math.ceil(rollT / dt), vel = new Float32Array(steps + 1);
  let x = 0, nextSeam = 0.04 + 0.1 * r(), nextRev = circ * (0.3 + 0.5 * r());
  for (let s = 0; s < steps; s++) {
    const t = s * dt, v = spd * prof(t / rollT); vel[s] = v; x += v * dt;
    if (x >= nextSeam) { knock(t, Math.min(1, 0.25 + 0.55 * v) * (0.6 + 0.5 * r()) * (r() < 0.2 ? 0.35 : 1), false); nextSeam += 0.09 + 0.13 * r(); }
    if (x >= nextRev) { knock(t + 0.003, Math.min(1, 0.25 + 0.5 * v) * (0.8 + 0.3 * r()), true); nextRev += circ; }
  }
  const rum = c.brown(r, n), grit = c.noise(r, n), wash = c.pink(r, n), lpR = c.onepole(sr), hpR = c.biquad("hp", 35, 0.7, sr);
  const bpG = c.biquad("bp", 900 * k + 400, 0.9, sr), lpS = c.biquad("lp", big ? 380 : 520, 0.8, sr);
  const aEv = 1 - Math.exp(-1 / (0.015 * sr)), jit = r() * TAU; let ev = 0, pos = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr, tv = t < rollT ? vel[Math.min(steps, Math.floor(t / dt))] : rock(t - rollT);
    ev += (tv - ev) * aEv; pos += ev / sr; const rot = TAU * pos / circ, se = Math.sqrt(Math.max(0, ev));
    const lumpy = 0.75 + 0.25 * Math.sin(rot + jit);
    const sw = 0.5 + 0.5 * Math.sin(2 * rot + jit + 0.6 * Math.sin(rot * 0.37));
    out[i] += hpR(lpR(rum[i], (120 + 90 * ev) * (big ? 0.7 : 1))) * se * lumpy * 0.5 * mass
      + bpG(grit[i]) * se * 0.15 * (1 - 0.5 * full) + lpS(wash[i]) * sl * Math.min(1, se) * sw * 0.35;
  }
  const chirps = Math.round(sl * rollT * (10 + 8 * spd)), fb = big ? 0.75 : 1;
  for (let j = 0; j < chirps; j++) {
    const t = r() * rollT * 0.97, s = Math.min(steps, Math.floor(t / dt));
    if (r() < 0.25 + 0.75 * vel[s] / spd) chirp(t, (250 + 450 * r()) * fb, 0.02 + 0.035 * r(), (0.06 + 0.08 * r()) * sl);
  }
  const creaks = Math.round(p.creak * (2 + rollT * 1.4));
  for (let j = 0; j < creaks; j++) {
    const len = (0.18 + 0.25 * r()) / Math.sqrt(spd), t = 0.08 + r() * Math.max(0.05, rollT - len - 0.1);
    creakEv(t, len, (0.2 + 0.3 * p.creak) * (0.8 + 0.3 * mass) * (0.7 + 0.5 * r()));
  }
  if (p.tail) {
    [[-0.03, 0.5], [per - 0.05, 0.32], [2 * per - 0.05, 0.18], [3 * per - 0.05, 0.08]].forEach(([d, a]) => knock(rollT + d + 0.01 * r(), a, false));
    for (let j = 0; j < Math.round(sl * 14); j++) chirp(rollT + Math.pow(r(), 1.5) * 0.5, (220 + 400 * r()) * fb, 0.02 + 0.04 * r(), 0.09 * sl * (0.5 + 0.5 * r()));
    if (p.creak > 0) creakEv(rollT + 0.05, 0.3 + 0.15 * r(), 0.15 + 0.3 * p.creak);
  }
  const res = p.tail ? c.reverb(out, { size: 0.3, decay: 0.45, mixAmt: 0.14 }, sr) : out;
  const fin = res && res.length ? res : out;
  c.finish(fin, 0.9, 1.1);
  c.fade(fin, 5, sr);
  for (let i = 0, m = c.seconds(0.04, sr); i < m && i < fin.length; i++) fin[fin.length - 1 - i] *= i / m;
  return { samples: fin };
}
