// Rear hatch shut, heard from the front seats: lid-swing whoosh, then a pitch-dropping body thump, sheet-metal panel modes and a bright crack, a two-stage latch (strike, catch), a separate pressure pop with a seal-air hiss, trim rattles, a cinch whirr, and an optional cabin tail. Each type has its own structure: boomy sedan boot, rebounding glassy hatchback, soft-touch power cinch.
export const meta = {
  title: "Hatch Thump Inside", kind: "impact", format: "sound", duration: 1.2, price: 3, author: "hollowbody", payout: "hollowbody@creators.oasis.example", kit: "Car Interior", description: "A rear hatch or trunk lid closing as heard from the front seats: deep sedan boot thump, glassy rebounding hatchback or soft power cinch, with latch click, cabin pressure pop and rattles, for car interiors in games and film.",
  tags: ["car", "trunk", "hatch", "door", "thunk", "latch", "interior", "impact"],
};
export const params = { knobs: {
  type: { type: "choice", label: "Hatch type", default: "sedan", options: ["sedan", "hatchback", "power"] },
  force: { type: "range", label: "Force", default: 0.5, min: 0, max: 1, step: 0.01 },
  pressure: { type: "range", label: "Cabin pressure pop", default: 0.5, min: 0, max: 1, step: 0.01 },
  motor: { type: "range", label: "Latch motor", default: 0.5, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Cabin tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + params.knobs.type.options.indexOf(p.type) * 97 + 3), f = p.force, ty = p.type;
  const power = ty === "power", hb = ty === "hatchback", J = (a, s) => a * (1 - s + 2 * s * r());
  const fb = J({ sedan: 54, hatchback: 86, power: 100 }[ty], 0.06), dec = { sedan: 0.24, hatchback: 0.12, power: 0.07 }[ty];
  const pm = J({ sedan: 380, hatchback: 620, power: 520 }[ty], 0.08), lat = J({ sedan: 1900, hatchback: 1500, power: 3000 }[ty], 0.08);
  const cinchT = power ? 0.14 : 0, cinchD = power ? 0.34 : 0.2;
  const tc = power ? cinchT + cinchD + 0.02 : 0.13, t0 = 0.12;
  const total = tc + (p.tail ? 0.95 : 0.5), n = c.seconds(total, sr);
  let body = new Float32Array(n);
  const det = new Float32Array(n);
  const hit = (t, a) => {
    const bn = c.seconds(0.7, sr), sw = c.osc("sine", (u) => fb * (1 + (0.4 + 0.7 * f) * Math.exp(-u * 35)), bn, sr), be = c.env(bn, 0.002, dec * (0.8 + 0.5 * f), sr);
    for (let i = 0; i < bn; i++) sw[i] *= be[i];
    c.mix(body, sw, t, a * (0.5 + 0.6 * f), sr);
    c.mix(body, c.ring([[fb * 1.6, 0.7], [fb * 2.5, 0.45], [fb * 3.8, hb ? 0.5 : 0.2]], 0.5, dec * 1.4, sr), t + 0.002, a * (0.2 + 0.3 * f), sr);
    c.mix(det, c.ring([[pm, 1], [pm * 1.58, 0.6], [pm * 2.31, 0.4], [pm * 3.4, 0.2]], 0.3, hb ? 0.05 : 0.09, sr), t, a * (0.08 + 0.3 * f), sr);
    c.mix(det, c.burst(r, 0.014, "hp", 1500 + 3000 * f, 0.8, 0.0004, 0.004, sr), t, a * f * f * 1.1, sr);
    const lt = t + 0.014 + 0.01 * r(), lg = a * (0.12 + 0.7 * f * Math.sqrt(f));
    c.mix(det, c.ring([[lat, 1], [lat * 1.62, 0.5], [lat * 2.9, 0.25]], 0.09, 0.012, sr), lt, lg, sr);
    c.mix(det, c.burst(r, 0.01, "bp", lat, 2, 0.0005, 0.003, sr), lt, lg * 0.9, sr);
    c.mix(det, c.ring([[lat * 0.62, 1], [lat * 1.3, 0.4]], 0.05, 0.007, sr), lt + 0.035 + 0.03 * r(), lg * 0.6, sr);
    return lt;
  };
  if (!power) {
    const wn = c.seconds(0.12, sr), wh = c.pink(r, wn), wb = c.biquad("bp", 450 + 700 * f, 0.7, sr);
    for (let i = 0; i < wn; i++) { const u = i / wn; wh[i] = wb(wh[i]) * Math.sin(Math.PI * u) * u * u; }
    c.mix(body, wh, 0.0, 1.2 * (0.2 + f), sr);
  }
  const hs = power ? t0 : t0;
  let last;
  if (power) { hit(hs, 0.22); last = hit(tc + t0, 0.75); } else last = hit(t0, 1);
  const tH = power ? tc + t0 : t0;
  if (hb) hit(tH + 0.08 + 0.03 * r(), 0.12 + 0.3 * f);
  const pn = c.seconds(0.45, sr), pp = c.osc("sine", (u) => 26 + 40 * Math.exp(-u * 18), pn, sr), pe = c.env(pn, 0.008, 0.1 + 0.05 * f, sr);
  const sg = c.brown(r, pn), sl = c.biquad("lp", 140, 0.8, sr), ah = c.noise(r, pn), ahp = c.biquad("hp", 3200, 0.7, sr);
  const pa = new Float32Array(pn), ph = new Float32Array(pn);
  for (let i = 0; i < pn; i++) { const s = Math.sin(Math.PI * i / pn); pa[i] = pp[i] * pe[i] + 5 * sl(sg[i]) * s; ph[i] = ahp(ah[i]) * s * s; }
  c.mix(body, pa, tH + 0.015, 1.6 * p.pressure * (0.4 + 0.6 * f), sr);
  c.mix(det, ph, tH + 0.03, 0.22 * p.pressure, sr);
  if (p.motor > 0) {
    const d = cinchD, mn = c.seconds(d, sr), mb = c.biquad("bp", 1300, 1.2, sr), nz = c.noise(r, mn), nb = c.biquad("bp", 2400, 2, sr), tooth = 60 + 25 * r();
    const m = c.osc("saw", (u) => 500 + 1000 * (u / d) + 25 * Math.sin(u * 41 + p.seed), mn, sr), sh = c.adsr(mn, { attack: 0.03, sustain: 0.75, decay: 0.05 }, sr);
    for (let i = 0; i < mn; i++) m[i] = (mb(m[i]) + 0.6 * nb(nz[i])) * sh[i] * (0.45 + 0.55 * Math.sign(Math.sin(i / sr * tooth * 6.283)));
    c.mix(det, m, power ? tH - cinchD - 0.02 : last + 0.06, (power ? 0.5 : 0.28) * p.motor, sr);
  }
  const rb = tH + 0.05, nr = (hb ? 6 : ty === "sedan" ? 2 : 1) + Math.round(4 * f * r() + 2 * f);
  let rt = rb;
  for (let k = 0; k < nr; k++) {
    rt += 0.015 + 0.05 * r() * (1 + k * 0.25);
    const g = (0.1 + 0.3 * f) / (1 + k * 0.35);
    const fr = hb ? 2400 + r() * 1800 : 800 + r() * 1500;
    c.mix(det, c.ring([[fr, 1], [fr * 1.9, 0.4]], 0.06, hb ? 0.022 : 0.012, sr), rt, g, sr);
    if (hb) c.mix(det, c.burst(r, 0.025, "bp", 2800 + 900 * r(), 3, 0.001, 0.008, sr), rt, g * 0.8, sr);
  }
  if (p.tail) {
    const tn = c.seconds(0.9, sr), tl = c.brown(r, tn), tf = c.biquad("lp", 200, 0.8, sr);
    for (let i = 0; i < tn; i++) tl[i] = tf(tl[i]) * Math.exp(-i / sr / 0.25);
    c.mix(body, tl, tH + 0.03, 2.2 * (0.3 + 0.5 * f), sr);
    for (let k = 0; k < 5; k++) c.mix(det, c.burst(r, 0.12, "bp", 500 + 1100 * r(), 4, 0.004, 0.035, sr), tH + 0.1 + k * 0.1 * (0.6 + r()), (0.05 + 0.07 * f) / (1 + k * 0.5), sr);
    const rv = c.reverb(body, { size: 0.35, decay: 0.45, mixAmt: 0.3 }, sr);
    if (rv && rv.length === n) body = rv;
  }
  c.filter(body, c.biquad("lp", 400 + 2600 * f, 0.7, sr));
  c.filter(det, c.biquad("lp", 3500 + 3500 * f, 0.7, sr));
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = body[i] + det[i];
  c.finish(out, 0.5 + 0.4 * f, 1.1);
  c.fade(out, p.tail ? 40 : 60, sr);
  return { samples: out };
}
