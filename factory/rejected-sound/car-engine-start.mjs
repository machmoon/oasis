// Engine start: starter whine and cranking pulses heard through the cabin, then ignition catches in uneven firing pops, flares past idle and settles. Layers: starter motor tone with gear clunk, compression-stroke pulse train that slows and speeds, firing pulses with exhaust body, a rev flare, and an optional cabin tail.
export const meta = {
  title: "Engine Catch", kind: "sfx", format: "sound", duration: 3.5, price: 4, author: "hollowbody", payout: "hollowbody@creators.oasis.example", kit: "Car Interior", description: "A starter motor cranking, the engine stumbling into fire, flaring and settling to idle, heard from inside the car; for ignition-on moments in driving games and films.",
  tags: ["car", "engine", "start", "starter", "ignition", "idle", "vehicle", "interior"],
};
export const params = { knobs: {
  engine: { type: "choice", label: "Engine size", default: "V6", options: ["4cyl", "V6", "V8"] },
  crank: { type: "range", label: "Crank length", default: 0.5, min: 0, max: 1, step: 0.01 },
  roughness: { type: "range", label: "Catch roughness", default: 0.4, min: 0, max: 1, step: 0.01 },
  flare: { type: "range", label: "Rev flare", default: 0.5, min: 0, max: 1, step: 0.01 },
  pitch: { type: "range", label: "Pitch", default: 0.5, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Cabin tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + params.knobs.engine.options.indexOf(p.engine) * 37 + 3);
  const cyl = { "4cyl": 4, V6: 6, V8: 8 }[p.engine], pm = Math.pow(2, (p.pitch - 0.5) * 0.8);
  const idleHz = (cyl / 2) * (p.engine === "V8" ? 11 : p.engine === "V6" ? 12.5 : 14) * pm;
  const crankT = 0.5 + 1.1 * p.crank, total = crankT + 2.2, dur = 3.8, out = new Float32Array(c.seconds(dur, sr));
  const lead = 0.05;
  // starter: whining tone with a pulsing load, rpm sags on each compression
  const sn = c.seconds(crankT + 0.15, sr), st = new Float32Array(sn);
  const crankHz = (3.2 + 0.6 * (cyl / 8)) * pm; let ph = 0, ph2 = 0;
  for (let i = 0; i < sn; i++) {
    const t = i / sr, comp = 0.5 + 0.5 * Math.sin(c.TAU * crankHz * t - 1.2), spin = 1 - 0.25 * comp;
    const f = (260 + 90 * Math.min(1, t / 0.4)) * spin * pm;
    ph += c.TAU * f / sr; ph2 += c.TAU * f * 2.03 / sr;
    const e = Math.min(1, t / 0.02) * (t > crankT ? Math.max(0, 1 - (t - crankT) / 0.15) : 1);
    st[i] = (Math.sin(ph) * 0.5 + Math.sin(ph2) * 0.2 + Math.sign(Math.sin(ph * 7)) * 0.04) * e * (0.7 + 0.3 * comp);
  }
  c.mix(out, st, lead, 0.35, sr);
  c.mix(out, c.ring([[180, 1], [640, 0.6], [1900, 0.3]], 0.12, 0.03, sr), lead, 0.7, sr);
  c.mix(out, c.burst(r, 0.02, "bp", 2400, 2, 0.0005, 0.006, sr), lead, 0.4, sr);
  // cranking thumps: low engine turning over, one per compression
  let t = lead + 0.08;
  while (t < lead + crankT) {
    const a = 0.6 + 0.4 * r();
    c.mix(out, c.ring([[55 * pm, 1], [110 * pm, 0.5], [170 * pm, 0.2]], 0.16, 0.04, sr), t, 0.5 * a, sr);
    c.mix(out, c.burst(r, 0.05, "lp", 500, 0.8, 0.003, 0.015, sr), t, 0.25 * a, sr);
    t += (1 / crankHz) * (0.9 + 0.2 * r) * 1;
  }
  // catch: firing pulses, irregular at first, then smoothing out; rpm flares then settles
  const t0 = lead + crankT, fireEnd = dur - 0.35;
  t = t0; let k = 0;
  while (t < fireEnd) {
    const u = (t - t0) / (fireEnd - t0), x = t - t0;
    const rpm = idleHz * (0.5 + 0.9 * Math.min(1, x / 0.25) + p.flare * 1.4 * Math.exp(-Math.pow((x - 0.45) / 0.3, 2)) - 0.0 * u) * (1 + 0.1 * Math.exp(-x / 0.8));
    const rough = p.roughness * Math.exp(-x / 0.9);
    const miss = r() < rough * 0.45 && x < 1.2;
    const a = miss ? 0.12 * r() : (0.6 + 0.4 * r() * (0.4 + rough)) * (0.7 + 0.3 * Math.min(1, x / 0.3));
    const f0 = (70 + 25 * (rpm / idleHz)) * (cyl === 8 ? 0.85 : cyl === 4 ? 1.2 : 1) * pm;
    c.mix(out, c.ring([[f0, 1], [f0 * 2, 0.55], [f0 * 3.1, 0.3], [f0 * 4.7, 0.12]], 0.14, 0.035, sr), t, 0.5 * a, sr);
    c.mix(out, c.burst(r, 0.03, "lp", 700 + 900 * a, 0.8, 0.001, 0.008, sr), t, 0.35 * a, sr);
    if (!miss && k % 3 === 0) c.mix(out, c.burst(r, 0.012, "bp", 2600 + 1500 * r(), 2, 0.0005, 0.003, sr), t, 0.12 * a, sr);
    const gap = 1 / rpm * (1 + (miss ? 0.5 : 0) + (r() - 0.5) * (0.1 + 0.7 * rough));
    t += Math.max(0.012, gap); k++;
  }
  // intake / exhaust rumble following the flare
  const n = out.length, rum = c.brown(r, n), lp = c.biquad("lp", 220 * pm, 0.9, sr);
  for (let i = 0; i < n; i++) {
    const x = i / sr - t0, g = x < 0 ? 0 : Math.min(1, x / 0.15) * (0.4 + 0.9 * p.flare * Math.exp(-Math.pow((x - 0.45) / 0.35, 2)));
    rum[i] = lp(rum[i]) * g * 3;
  }
  c.mix(out, rum, 0, 0.5, sr);
  if (p.tail) {
    const tl = c.reverb(out.slice(), { size: 0.35, decay: 0.5, mixAmt: 1 }, sr);
    for (let i = 0; i < n; i++) out[i] += 0.35 * tl[i];
  }
  c.filter(out, c.biquad("lp", 4200, 0.7, sr));
  c.fade(out, 12, sr);
  const fo = Math.floor(0.3 * sr);
  for (let i = 0; i < fo; i++) out[n - 1 - i] *= i / fo;
  c.finish(out, 0.88, 1.1);
  return { samples: out };
}
