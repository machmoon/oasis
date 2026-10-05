// Pot lid clang: a lid drops onto a pot or counter, rings and wobbles itself flat. A smoothed strike excites a bank of plate modes (steel: bright, long, beating; glass: shorter, clunkier). An accelerating, fading train of rim contacts re-excites the modes as the lid wobbles down. A knob thunk, rim ticks and an optional kitchen room sit on top.
export const meta = {
  title: "Lid Clang Settle", kind: "impact", format: "sound", duration: 2, price: 2, author: "foleyroom", payout: "foleyroom@creators.oasis.example", kit: "Kitchen", description: "A pot lid clanging down and wobbling to rest. Material, diameter, force, wobble length and pitch are knobs, and every seed is a different drop, for kitchen foley in games and film.",
  tags: ["pot", "lid", "clang", "kitchen", "metal", "glass", "wobble", "impact"],
};
export const params = { knobs: {
  material: { type: "choice", label: "Lid material", default: "steel", options: ["steel", "glass"] },
  diameter: { type: "range", label: "Diameter", default: 0.5, min: 0, max: 1, step: 0.01 },
  force: { type: "range", label: "Impact force", default: 0.6, min: 0, max: 1, step: 0.01 },
  wobble: { type: "range", label: "Wobble duration", default: 0.5, min: 0, max: 1, step: 0.01 },
  pitch: { type: "range", label: "Pitch (semitones)", default: 0, min: -7, max: 7, step: 0.1 },
  tail: { type: "toggle", label: "Room tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, steel = p.material === "steel", r = c.rng(p.seed * 6151 + (steel ? 0 : 97) + 3);
  const d = p.diameter, F = p.force, W = p.wobble;
  const f0 = (steel ? 900 - 450 * d : 520 - 200 * d) * Math.pow(2, p.pitch / 12) * c.between(r, 0.96, 1.04);
  const ring0 = steel ? 0.7 + 1.1 * d : 0.09 + 0.14 * d;
  const t0 = 0.004, tw0 = t0 + 0.06 + 0.08 * F + r() * 0.03, Tw = 0.3 + 2.0 * W, settle = tw0 + Tw;
  const dur = Math.min(3.8, settle + ring0 * (steel ? 1.2 : 2.5) + (p.tail ? 0.35 : 0.05));
  const n = c.seconds(dur, sr), hit = new Float32Array(n), wob = new Float32Array(n);
  let out = new Float32Array(n);
  const pulse = (buf, t, a, ms) => {
    const s = Math.floor(t * sr), w = Math.max(2, Math.round(ms * 0.001 * sr));
    for (let k = 0; k < w * 6 && s + k < n; k++) { const x = k / w; buf[s + k] += (a / w) * x * Math.exp(1 - x); }
  };
  pulse(hit, t0, 1.6, 0.25 + 0.9 * (1 - F));
  c.mix(out, c.burst(r, 0.01, "hp", 2500 + 6000 * F, 0.7, 0.0005, 0.002, sr), t0, 0.12 + 0.25 * F, sr);
  if (F > 0.35) pulse(hit, t0 + 0.02 + 0.035 * F * r(), 0.45 * F, 0.4);
  let t = tw0, cnt = 0, side = 1;
  const dtS = (steel ? 0.11 : 0.13) + 0.08 * d;
  while (t < settle && cnt < 450) {
    const u = (t - tw0) / Tw, fall = Math.pow(1 - u, 1.4);
    const a = (0.05 + 0.13 * F) * (0.15 + 0.85 * fall) * c.between(r, 0.55, 1.35);
    side = r() < 0.8 ? -side : side;
    pulse(wob, t, a * side, steel ? 0.4 : 0.6);
    c.mix(out, c.burst(r, 0.004, "hp", (steel ? 3000 : 3800) + r() * 3500, 0.8, 0.0004, 0.0012, sr), t, a * (steel ? 0.12 : 0.18), sr);
    t += (dtS * Math.pow(1 - u, 1.8) + 0.006) * c.between(r, 0.7, 1.3);
    cnt++;
  }
  pulse(wob, settle, 0.08, 0.8);
  const ratios = steel ? [1, 1.53, 2.31, 2.98, 3.87, 4.92, 6.13, 7.41] : [1, 2.08, 3.36, 4.81, 6.4];
  const amps = steel ? [1, 0.85, 0.75, 0.6, 0.5, 0.4, 0.3, 0.22] : [1, 0.6, 0.4, 0.22, 0.12];
  const modes = [];
  for (let k = 0; k < ratios.length; k++) {
    const f = f0 * ratios[k] * c.between(r, 0.98, 1.02), dec = ring0 / (1 + (steel ? 0.28 : 0.8) * k);
    const gh = amps[k] * Math.pow(0.35 + 0.65 * F, k * 0.4), gw = amps[k] * Math.pow(0.75, k);
    modes.push([f, dec, gh, gw]);
    if (steel && k < 3) modes.push([f * (1 + c.between(r, 0.002, 0.007)), dec, gh * 0.7, gw * 0.7]);
  }
  const si = Math.floor(settle * sr), damp = steel ? 0.45 : 0.5;
  for (const [f, dec, gh, gw] of modes) {
    if (f > sr * 0.45) continue;
    const w = c.TAU * f / sr, cw = 2 * Math.cos(w), b = Math.sin(w);
    const rA = Math.exp(-1 / (dec * sr)), rB = Math.exp(-1 / (dec * damp * sr));
    const a1A = cw * rA, a2A = rA * rA, a1B = cw * rB, a2B = rB * rB;
    let y1 = 0, y2 = 0;
    for (let i = 0; i < n; i++) {
      const y = (i < si ? a1A * y1 - a2A * y2 : a1B * y1 - a2B * y2) + b * (gh * hit[i] + gw * wob[i]);
      y2 = y1; y1 = y; out[i] += y * 0.35;
    }
  }
  const tf = (steel ? 170 : 130) * (1.25 - 0.45 * d);
  c.mix(out, c.ring([[tf, 1], [tf * 2.37, 0.35]], 0.12, 0.02 + 0.02 * d, sr), t0, (steel ? 0.15 : 0.3) * (0.4 + 0.6 * F), sr);
  if (!steel) c.mix(out, c.burst(r, 0.012, "bp", 4500 + r() * 1500, 1.2, 0.0005, 0.003, sr), t0, 0.25 + 0.3 * F, sr);
  if (p.tail) out = c.reverb(out, { size: 0.35, decay: 0.6, mixAmt: 0.22 }, sr) || out;
  c.finish(out, 0.9, 1.1);
  let pk = 0;
  for (let i = 0; i < n; i++) { const a = Math.abs(out[i]); if (a > pk) pk = a; }
  if (pk > 0) c.gain(out, (0.62 + 0.28 * F) / pk);
  c.fade(out, 10, sr);
  return { samples: out };
}
