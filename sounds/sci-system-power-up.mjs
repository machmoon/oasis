// System Power-Up: a console bank spinning up. One machine: a harmonic hum whose whole stack glides up in pitch and opens in brightness, with a capacitor whine locked to a high harmonic of it, seeded brown-outs, a cascade of size-scaled relays thickening toward a lock-in thunk, and an optional settling room tail.
export const meta = {
  title: "System Power-Up", kind: "sfx", format: "sound", duration: 2, price: 3, author: "quietmachine", payout: "quietmachine@creators.oasis.example", kit: "Sci-fi Console", description: "A starship console bank powering on: a hum rises to pitch under a cascade of relay clicks and locks in, for boot-ups, restored power and ship-waking scenes.",
  tags: ["power-up", "sci-fi", "console", "relay", "hum", "boot", "starship", "startup"],
};
export const params = { knobs: {
  size: { type: "choice", label: "Size", default: "station", options: ["panel", "station", "bridge"] },
  duration: { type: "range", label: "Duration", default: 2, min: 0.8, max: 3, step: 0.05 },
  hum: { type: "range", label: "Hum level", default: 0.6, min: 0, max: 1, step: 0.01 },
  relays: { type: "range", label: "Relay density", default: 0.5, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, si = params.knobs.size.options.indexOf(p.size), r = c.rng(p.seed * 7919 + si * 131 + 3);
  const S = [
    { f: 220, W: 24, relays: [3, 16], hp: 4800, ring: [4000, 7500], body: 0, bodyF: 0, bounce: 1, thunk: 180, room: 0.25, tail: 0.5, bright: 2600, hg: 0.85, twin: 0 },
    { f: 110, W: 32, relays: [6, 30], hp: 3000, ring: [2000, 4500], body: 0.35, bodyF: 700, bounce: 2, thunk: 110, room: 0.5, tail: 0.7, bright: 3400, hg: 1, twin: 0.45 },
    { f: 55, W: 48, relays: [10, 50], hp: 1700, ring: [900, 2600], body: 0.7, bodyF: 260, bounce: 3, thunk: 65, room: 0.85, tail: 0.9, bright: 4200, hg: 1.25, twin: 0.7 },
  ][si];
  const dur = Math.min(3, p.duration), tailLen = p.tail ? Math.min(S.tail, 3.85 - dur) : 0.25;
  const n = c.seconds(dur + tailLen, sr), out = new Float32Array(n);
  const rise = 0.7 * dur, fTop = S.f * (0.985 + r() * 0.03), wobF = 3 + r() * 4, wobP = r() * c.TAU;
  const dips = [], nd = 1 + Math.floor(r() * 3);
  for (let d = 0; d < nd; d++) dips.push([rise * (0.12 + 0.4 * r()), 0.025 + 0.04 * r(), 0.35 + 0.4 * r()]);
  const humBuf = new Float32Array(n), whine = new Float32Array(n), lp = c.onepole(sr), det = 1.004 + 0.004 * r();
  let ph = 0, ph2 = 0, ph3 = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr, x = Math.min(1, t / rise), prog = 1 - (1 - x) * (1 - x);
    let sag = 0;
    for (let d = 0; d < nd; d++) { const u = (t - dips[d][0]) / dips[d][1]; if (u > -3 && u < 3) sag += dips[d][2] * Math.exp(-u * u); }
    sag = Math.min(0.85, sag);
    const f = fTop * (0.15 + 0.85 * prog) * (1 - 0.08 * sag) * (1 + 0.004 * Math.sin(c.TAU * wobF * t + wobP));
    ph += f / sr; ph -= Math.floor(ph); ph3 += f * det / sr; ph3 -= Math.floor(ph3);
    const a = ph * c.TAU, s1 = Math.sin(a), c2 = 2 * Math.cos(a), open = 0.35 + 0.6 * prog;
    let sk1 = s1, sk2 = 0, g = 1, s = s1;
    for (let k = 2; k <= 12; k++) { const sk = c2 * sk1 - sk2; sk2 = sk1; sk1 = sk; g *= open; s += sk * g / k; }
    const b = ph3 * c.TAU;
    s += S.twin * (Math.sin(b) + 0.4 * Math.sin(2 * b));
    s += 0.3 * lp(2 * ph - 1, 200 + S.bright * prog * (1 - 0.6 * sag));
    let amp = Math.min(1, t / 0.04) * (0.3 + 0.7 * prog) * (1 - sag);
    if (t > dur) { const k = (t - dur) / tailLen; amp *= p.tail ? Math.exp(-k / 0.3) : 0.5 + 0.5 * Math.cos(Math.PI * Math.min(1, k / 0.8)); }
    humBuf[i] = s * amp;
    ph2 += f * S.W / sr; ph2 -= Math.floor(ph2);
    const we = Math.min(1, t / 0.1) * (t < rise ? 0.4 + 0.6 * x : Math.exp(-(t - rise) / 0.18)) * (1 - 0.7 * sag);
    whine[i] = Math.sin(ph2 * c.TAU) * we;
  }
  c.mix(out, humBuf, 0, (0.12 + 0.48 * p.hum) * S.hg / (1 + 0.5 * S.twin), sr);
  c.mix(out, whine, 0, 0.035 + 0.07 * p.hum, sr);
  const count = Math.round(S.relays[0] + (S.relays[1] - S.relays[0]) * p.relays), end = dur * 0.93;
  for (let k = 0; k < count; k++) {
    const u = (k + 0.15 + 0.7 * r()) / count, t = 0.02 + (end - 0.02) * Math.pow(u, 0.85);
    const dist = si * 0.5 * r(), lvl = (0.35 + 0.45 * r()) * (0.8 + 0.3 * u) * (1 - 0.45 * dist);
    const hp = S.hp * (0.8 + 0.5 * r()) * (1 - 0.4 * dist), fr = c.between(r, S.ring[0], S.ring[1]);
    c.mix(out, c.burst(r, 0.006, "hp", hp, 0.8, 0.0004 + r() * 0.0008, 0.0012 + 0.001 * si, sr), t, lvl, sr);
    c.mix(out, c.ring([[fr, 1], [fr * (1.47 + r() * 0.1), 0.5], [fr * (0.5 + r() * 0.05), 0.3]], 0.06, 0.004 + r() * 0.006 + 0.004 * si, sr), t + 0.0005, 0.25 * lvl, sr);
    if (S.body) c.mix(out, c.burst(r, 0.025, "bp", S.bodyF * (0.8 + 0.4 * r()), 1.4, 0.001, 0.006 + 0.003 * si, sr), t, S.body * lvl, sr);
    let bt = t, bl = 0.45 * lvl;
    for (let j = 0; j < S.bounce; j++) { bt += 0.002 + r() * 0.005 * (1 + 0.5 * j); if (r() < 0.8) c.mix(out, c.burst(r, 0.004, "hp", hp * (1.05 + 0.2 * r()), 0.8, 0.0003, 0.001, sr), bt, bl, sr); bl *= 0.55; }
    if (si === 2 && r() < 0.25) { const lf = 150 + r() * 150; c.mix(out, c.ring([[lf, 1], [lf * (2.6 + 0.3 * r()), 0.4]], 0.12, 0.04, sr), t, 0.3 * lvl, sr); }
  }
  c.mix(out, c.ring([[S.thunk, 1], [S.thunk * 2.03, 0.4], [S.thunk * 3.1, 0.15]], 0.3, 0.06 + 0.04 * si, sr), rise, 0.45, sr);
  c.mix(out, c.burst(r, 0.03, "lp", 1200, 0.8, 0.002, 0.01, sr), rise, 0.4, sr);
  c.mix(out, c.burst(r, 0.006, "hp", 3200, 0.8, 0.0005, 0.0015, sr), rise + 0.001, 0.5, sr);
  let res = out;
  if (p.tail) res = c.reverb(out, { size: S.room, decay: 0.4 + 0.5 * S.room, mixAmt: 0.12 + 0.12 * S.room }, sr) || out;
  const maxN = c.seconds(3.9, sr);
  if (res.length > maxN) res = res.slice(0, maxN);
  c.finish(res, 0.88, 1.1);
  const rl = Math.min(res.length, c.seconds(p.tail ? 0.08 : 0.2, sr));
  for (let i = 0; i < rl; i++) res[res.length - 1 - i] *= 0.5 - 0.5 * Math.cos(Math.PI * i / rl);
  c.fade(res, 6, sr);
  return { samples: res };
}
