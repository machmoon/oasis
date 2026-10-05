// Servo door: a pneumatic bridge door opening, built from a latch clunk (low thump plus a beating metal click), a falling pneumatic hiss, a pitched servo whine whose pitch follows the door's velocity curve, stick-slip roller ticks spaced by that same velocity, and a damped end-stop thud with rebound, plus an optional bridge-room tail.
export const meta = {
  title: "Bridge Door Open", kind: "sfx", format: "sound", duration: 1.4, price: 3, author: "quietmachine", payout: "quietmachine@creators.oasis.example", kit: "Sci-fi Console", description: "A pneumatic sliding starship door opening with a latch clunk, valve hiss, rising and settling servo whine and an end-stop thud; size, speed, hiss, whine and tail are knobs, and every seed is a different door cycle.",
  tags: ["door", "scifi", "servo", "pneumatic", "hiss", "spaceship", "bridge", "mechanical"],
};
export const params = { knobs: {
  size: { type: "choice", label: "Size", default: "door", options: ["hatch", "door", "blast-door"] },
  speed: { type: "range", label: "Speed", default: 1, min: 0.5, max: 2, step: 0.05 },
  hiss: { type: "range", label: "Hiss", default: 0.6, min: 0, max: 1, step: 0.01 },
  whine: { type: "range", label: "Servo whine", default: 0.6, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Room tail", default: false },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, si = Math.max(0, params.knobs.size.options.indexOf(p.size)), r = c.rng(p.seed * 7919 + si * 131 + 3);
  const S = [
    { travel: 0.5, f0: 1150, h2: 0.3, h3: 0.1, roll: 3200, thump: 150, metal: 1900, end: 0.45, low: 0.05, hl: 0.35, hf: 6500, grind: 0 },
    { travel: 0.85, f0: 720, h2: 0.45, h3: 0.25, roll: 2000, thump: 95, metal: 1150, end: 0.65, low: 0.25, hl: 0.55, hf: 4800, grind: 0.15 },
    { travel: 1.45, f0: 330, h2: 0.6, h3: 0.45, roll: 900, thump: 52, metal: 560, end: 1, low: 0.7, hl: 0.9, hf: 3200, grind: 0.4 },
  ][si];
  const travel = S.travel / p.speed * c.between(r, 0.94, 1.06), pre = 0.05 + 0.04 * si + r() * 0.015, stop = pre + travel;
  const n = c.seconds(stop + 0.26 + 0.1 * si + (p.tail ? 0.6 : 0), sr), out = new Float32Array(n);
  const wf = 1.7 + r() * 1.6, wp = r() * c.TAU, wd = 0.04 + r() * 0.05, acc = 0.18 + r() * 0.08, dec = 0.26 + r() * 0.08;
  const vel = (t) => {
    const u = (t - pre) / travel; if (u <= 0 || u >= 1) return 0;
    const v = Math.min(1, u / acc, (1 - u) / dec);
    return v * v * (3 - 2 * v) * (1 + wd * Math.sin(c.TAU * wf * t + wp));
  };
  const metal = (f, d) => c.ring([[f, 0.6], [f * 1.004, 0.5], [f * 2.76, 0.3], [f * 2.771, 0.25], [f * 5.4, 0.12]], d * 5, d, sr);
  c.mix(out, c.ring([[S.thump, 1], [S.thump * 2.1, 0.35], [S.thump * 3.3, 0.12]], 0.3, 0.05 + 0.03 * si, sr), 0.007, 0.9, sr);
  c.mix(out, metal(S.metal * c.between(r, 0.97, 1.03), 0.025 + 0.02 * si), 0.006, 0.3, sr);
  c.mix(out, c.burst(r, 0.01, "bp", 3500, 1.2, 0.0005, 0.002, sr), 0.006, 0.6, sr);
  c.mix(out, c.burst(r, 0.008, "bp", 2400 + r() * 1500, 2, 0.0004, 0.0015, sr), pre * 0.6, 0.3, sr);
  const hd = Math.min(travel * 0.9, S.hl / Math.sqrt(p.speed)) + 0.12, hn = c.seconds(hd, sr), h = c.noise(r, hn);
  const lpA = c.onepole(sr), lpB = c.onepole(sr), hk = Math.exp(-1 / (hd * 0.35 * sr));
  let hg = 1, fl = 1;
  for (let i = 0; i < hn; i++) {
    if (i % 64 === 0) fl = 0.75 + 0.25 * r();
    const t = i / sr, fc = S.hf * (1 - 0.55 * t / hd), x = h[i];
    h[i] = (lpA(x, fc) - lpB(x, fc * 0.22)) * hg * fl * Math.min(1, t / 0.006);
    hg *= hk;
  }
  c.mix(out, h, pre - 0.015, 0.9 * p.hiss, sr);
  c.mix(out, c.burst(r, 0.18, "lp", 1500 - 300 * si, 0.8, 0.004, 0.05, sr), stop - 0.02, 0.35 * p.hiss, sr);
  const f0 = S.f0 * c.between(r, 0.94, 1.06) * (0.8 + 0.2 * p.speed), gr = c.between(r, 1.45, 1.6), ov = 0.04 + r() * 0.06;
  const i0 = c.seconds(pre, sr), i1 = Math.min(n, c.seconds(stop + 0.1, sr)), ak = 1 - Math.exp(-1 / (0.015 * sr));
  const wl = 0.06 + 0.94 * p.whine;
  let ph = 0, amp = 0, gph = 0;
  for (let i = i0; i < i1; i++) {
    const t = i / sr, v = vel(t), u = (t - pre) / travel; amp += (v - amp) * ak;
    const bump = u > 0 && u < acc * 1.6 ? ov * Math.sin(Math.PI * u / (acc * 1.6)) : 0;
    ph += f0 * (0.3 + 0.7 * v + bump) / sr; gph += f0 * 0.11 * (0.3 + 0.7 * v) / sr;
    const a = c.TAU * ph, s = Math.sin(a) + S.h2 * Math.sin(2 * a) + S.h3 * Math.sin(3 * a) + 0.2 * Math.sin(gr * a);
    const g = 1 + S.grind * Math.sin(c.TAU * gph);
    out[i] += wl * 0.3 * amp * s * g * (0.8 + 0.2 * Math.sin(a / 7));
  }
  let t = pre + 0.01, k = 0;
  while (t < stop && k++ < 700) {
    const v = vel(t);
    if (v > 0.04) {
      c.mix(out, c.burst(r, 0.006, "bp", S.roll * c.between(r, 0.7, 1.3), 3 + r() * 4, 0.0004, 0.0015 + r() * 0.002, sr), t, (0.08 + 0.18 * r()) * v, sr);
      if (r() < 0.06) c.mix(out, metal(S.metal * c.between(r, 1.3, 1.9), 0.01), t, 0.07 * v, sr);
    }
    t += (0.0055 + 0.003 * si) / (0.12 + v) * c.between(r, 0.5, 1.5);
  }
  const rn = c.seconds(travel, sr), rb = c.brown(r, rn), rlp = c.biquad("lp", 110 + 60 * (2 - si), 0.8, sr);
  for (let i = 0; i < rn; i++) rb[i] = rlp(rb[i]) * vel(pre + i / sr);
  c.mix(out, rb, pre, S.low * 1.4, sr);
  c.mix(out, c.ring([[S.thump * 1.1, 1], [S.thump * 2.3, 0.4], [S.thump * 3.9, 0.15]], 0.35, 0.05 + 0.05 * si, sr), stop - 0.008, S.end * 0.7, sr);
  c.mix(out, metal(S.metal * c.between(r, 0.9, 1.1), 0.025 + 0.03 * si), stop - 0.006, 0.18, sr);
  c.mix(out, c.burst(r, 0.025, "bp", 1800 + r() * 1200, 1, 0.0008, 0.006, sr), stop - 0.008, 0.5, sr);
  c.mix(out, c.burst(r, 0.01, "bp", 2200 + r() * 1500, 2, 0.0005, 0.002, sr), stop + 0.05 + r() * 0.04, 0.18, sr);
  if (si === 2) c.mix(out, c.ring([[S.thump * 1.05, 1], [S.thump * 2.2, 0.3]], 0.3, 0.07, sr), stop + 0.08 + r() * 0.03, 0.3, sr);
  if (p.tail) {
    const res = c.reverb(out, { size: 0.55 + 0.2 * si, decay: 0.5 + 0.25 * si, mixAmt: 0.35 }, sr);
    if (res && res !== out) out.set(res.length > n ? res.subarray(0, n) : res);
  }
  c.finish(out, 0.9);
  c.fade(out, 5, sr);
  return { samples: out };
}
