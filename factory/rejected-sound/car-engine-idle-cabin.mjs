// Cabin engine idle: a loopable 3 s idle through a sealed firewall. Layers: a firing-order train of resonant combustion thumps (uneven for the V8), mid crack and valve ticks that the firewall removes, a seat-vibration rumble, and a low cabin hush. Every event wraps around the loop edge and filters run twice, so it loops without a seam.
export const meta = {
  title: "Cabin Engine Idle", kind: "ambience", format: "sound", duration: 3, price: 4, author: "stormfront", payout: "stormfront@creators.oasis.example", kit: "Car Interior", description: "A loopable engine idle heard from inside a sealed car cabin, with engine size, rpm wobble, firewall muffling, seat rumble and pitch as knobs; for driving scenes waiting at a light.",
  tags: ["engine", "idle", "car", "interior", "cabin", "loop", "vehicle", "rumble"],
};
export const params = { knobs: {
  engine: { type: "choice", label: "Engine", default: "V6", options: ["4cyl", "V6", "V8"] },
  wobble: { type: "range", label: "RPM wobble", default: 0.35, min: 0, max: 1, step: 0.01 },
  muffling: { type: "range", label: "Firewall muffling", default: 0.5, min: 0, max: 1, step: 0.01 },
  rumble: { type: "range", label: "Seat vibration", default: 0.4, min: 0, max: 1, step: 0.01 },
  pitch: { type: "range", label: "Pitch (0.8x-1.3x rpm)", default: 0.5, min: 0, max: 1, step: 0.01 },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + 29 + params.knobs.engine.options.indexOf(p.engine) * 101), dur = 3, n = c.seconds(dur, sr), out = new Float32Array(n);
  const cfg = {
    "4cyl": { cyl: 4, rpm: 760, f: 150, pat: [1, 0.93, 0.97, 0.9], tj: 0.02, mid: 1.0 },
    V6: { cyl: 6, rpm: 700, f: 112, pat: [1, 0.82, 0.95, 0.76, 0.9, 0.85], tj: 0.05, mid: 0.7 },
    V8: { cyl: 8, rpm: 640, f: 78, pat: [1, 0.55, 0.9, 0.45, 1, 0.6, 0.85, 0.5], tj: 0.14, mid: 0.5 },
  }[p.engine];
  const cyl = cfg.cyl, muf = p.muffling;
  const cycles = Math.max(1, Math.round(cfg.rpm * (0.8 + 0.5 * p.pitch) / 120 * dur)), nFire = cycles * cyl, per = dur / nFire;
  const w1 = r() * 6.28, w2 = r() * 6.28, w3 = r() * 6.28;
  const add = (src, at, g) => { const s0 = ((Math.round(at * sr) % n) + n) % n; for (let i = 0; i < src.length; i++) out[(s0 + i) % n] += src[i] * g; };
  const loopFilter = (buf, fn) => { for (let i = 0; i < n; i++) fn(buf[i]); for (let i = 0; i < n; i++) buf[i] = fn(buf[i]); return buf; };
  const loopNoise = (gen) => { const e = c.seconds(0.25, sr), x = gen(n + e); for (let i = 0; i < e; i++) { const a = i / e; x[i] = x[i] * Math.sin(a * 1.5708) + x[n + i] * Math.cos(a * 1.5708); } return x.subarray(0, n); };
  for (let j = 0; j < nFire; j++) {
    const k = j / nFire, ph = j % cyl;
    const hunt = p.wobble * (Math.sin(c.TAU * 2 * k + w1) * 0.6 + Math.sin(c.TAU * 5 * k + w2) * 0.3 + Math.sin(c.TAU * 11 * k + w3) * 0.1);
    const t = j * per + per * (cfg.tj * 0.5 + 0.02 + 0.5 * p.wobble) * (r() - 0.5) + per * 0.6 * 0.12 * hunt * 3;
    const amp = cfg.pat[ph] * (1 + 0.5 * hunt * 0.5) * (0.92 + 0.16 * r());
    const f1 = cfg.f * (1 + 0.03 * (ph / cyl - 0.5)) * (0.8 + 0.4 * p.pitch) * (0.98 + 0.04 * r());
    const midA = 0.15 + 0.85 * (1 - muf);
    const ev = c.ring([[f1, 1], [f1 * 2.02, 0.6], [f1 * 3.1, 0.38 * cfg.mid], [f1 * 4.4, 0.3 * midA * cfg.mid], [f1 * 7.3 * (0.97 + 0.06 * r()), 0.25 * midA], [f1 * 11.5, 0.12 * midA]], 0.1, 0.03 + 0.02 * (1 - muf), sr);
    add(ev, t, amp * 0.5);
    add(c.burst(r, 0.012, "bp", 700 + 500 * r(), 1.5, 0.001, 0.005, sr), t, amp * 0.35 * midA);
    if (j % 2 === 0) add(c.burst(r, 0.005, "bp", 2600 + 1600 * r(), 3, 0.0005, 0.002, sr), t + per * (0.2 + 0.5 * r()), (0.25 + 0.4 * r()) * 0.3 * (1 - muf) * cfg.mid);
  }
  loopFilter(out, c.biquad("lp", 2600 - 2100 * muf, 0.8, sr));
  const rum = loopNoise((m) => c.brown(r, m)), lp4 = c.biquad("lp", 70, 0.9, sr), lp5 = c.biquad("bp", 38, 1.2, sr);
  const rb = new Float32Array(n);
  const fc = cycles / dur;
  for (let i = 0; i < n; i++) rb[i] = rum[i];
  loopFilter(rb, (x) => lp4(x) * 3 + lp5(x) * 4);
  const rg = 0.04 + 0.7 * p.rumble;
  for (let i = 0; i < n; i++) out[i] += rb[i] * rg + Math.sin(c.TAU * fc * i / sr + w1) * 0.12 * p.rumble;
  const air = loopNoise((m) => c.pink(r, m)), lp6 = c.biquad("lp", 450 + 300 * (1 - muf), 0.7, sr);
  loopFilter(air, lp6);
  for (let i = 0; i < n; i++) out[i] += air[i] * 0.12;
  c.finish(out, 0.8, 1.05);
  c.fade(out, 4, sr);
  return { samples: out };
}
