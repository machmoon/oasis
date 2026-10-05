// Car horn down a wet block: envelope-driven diaphragm tones (a nasal double meep, a beating two-tone pair, or a three-reed air chord) through a horn formant, discrete darkening slapbacks off the facades, and an optional wet street layer (tyre-hiss swell, drips, short wash).
export const meta = {
  title: "Wet Block Honk", kind: "sfx", format: "sound", duration: 1.2, price: 2, author: "foleyroom", payout: "foleyroom@creators.oasis.example", kit: "Rainy City Street", description: "A short car horn slapping back off the buildings of a rainy downtown block; horn type, length, distance, street echo and pitch are knobs, a wet street layer adds tyre hiss and drips, and every seed is a different driver.",
  tags: ["car horn", "honk", "traffic", "city", "street", "echo", "vehicle", "rain"],
};
export const params = { knobs: {
  horn: { type: "choice", label: "Horn type", default: "sedan", options: ["compact", "sedan", "truck"] },
  length: { type: "range", label: "Length", default: 0.35, min: 0, max: 1, step: 0.01 },
  distance: { type: "range", label: "Distance", default: 0.5, min: 0, max: 1, step: 0.01 },
  echo: { type: "range", label: "Street echo", default: 0.5, min: 0, max: 1, step: 0.01 },
  pitch: { type: "range", label: "Pitch", default: 0.5, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Wet street tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, idx = params.knobs.horn.options.indexOf(p.horn), r = c.rng(p.seed * 6113 + idx * 97 + 3);
  const H = {
    compact: { tones: [[560, 1]], form: 2800, q: 3, lp: 7000, drive: 5, atk: 0.006, rel: 0.012, hp: 300 },
    sedan: { tones: [[410, 1], [516, 0.9]], form: 1700, q: 1.4, lp: 6000, drive: 4, atk: 0.008, rel: 0.02, hp: 170 },
    truck: { tones: [[185, 1], [233, 0.85], [277, 0.75]], form: 1100, q: 1.2, lp: 4200, drive: 3, atk: 0.03, rel: 0.045, hp: 90 },
  }[p.horn];
  const truck = p.horn === "truck", pm = Math.pow(2, (p.pitch - 0.5) * 0.8), L = p.length, dist = p.distance;
  let segs;
  if (p.horn === "compact") { const tl = 0.05 + 0.13 * L, gap = 0.06 + 0.03 * r(); segs = [[0, tl], [tl + gap, tl * (0.8 + 0.4 * r())]]; }
  else segs = [[0, (truck ? 0.14 : 0.1) + (truck ? 0.38 : 0.35) * L]];
  const gEnd = segs[segs.length - 1][0] + segs[segs.length - 1][1];
  const tones = H.tones.map(([f, a]) => [f * pm * (0.99 + 0.02 * r()), a]);
  const ph = tones.map(() => r() * c.TAU), wf = 4 + 3 * r(), wp = r() * c.TAU, sag = 0.04 + 0.06 * r(), scoopAmt = 0.04 + 0.04 * r();
  const n = c.seconds(gEnd + H.rel * 7 + 0.02, sr), x = new Float32Array(n), norm = 1 / Math.tanh(H.drive);
  const bp = c.biquad("bp", H.form * Math.sqrt(pm), H.q, sr), hp = c.biquad("hp", H.hp, 0.7, sr), lp = c.biquad("lp", H.lp * Math.sqrt(pm), 0.7, sr);
  const ka = 1 - Math.exp(-1 / (H.atk * sr)), kr = 1 - Math.exp(-1 / (H.rel * sr));
  let e1 = 0, e2 = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    let gate = 0;
    for (const [s0, sl] of segs) if (t >= s0 && t < s0 + sl) gate = 1;
    e1 += (gate - e1) * (gate > e1 ? ka : kr);
    e2 += (e1 - e2) * (e1 > e2 ? ka : kr);
    const e = e2 * (1 - sag * Math.min(1, t / gEnd));
    const fm = (1 - scoopAmt * (1 - e2)) * (1 + 0.003 * Math.sin(c.TAU * wf * t + wp));
    let s = 0;
    for (let k = 0; k < tones.length; k++) {
      ph[k] += c.TAU * tones[k][0] * fm / sr;
      if (ph[k] > c.TAU) ph[k] -= c.TAU;
      const v = truck ? Math.sin(ph[k]) + 0.45 * Math.sin(2 * ph[k]) : Math.sin(ph[k]);
      s += tones[k][1] * Math.tanh(H.drive * e * v) * norm;
    }
    x[i] = lp(hp(0.55 * bp(s) + 0.45 * s));
  }
  const darken = (buf, fc) => { const a = c.onepole(sr), b = c.onepole(sr), y = new Float32Array(buf.length); for (let i = 0; i < buf.length; i++) y[i] = b(a(buf[i], fc), fc); return y; };
  const pre = 0.005 + 0.05 * dist, nE = Math.round(4 * p.echo), base = c.between(r, 0.11, 0.16) * (1 + 0.3 * dist);
  const delays = [];
  for (let k = 1; k <= nE; k++) delays.push(base * k + (r() - 0.5) * 0.03);
  const last = nE ? delays[nE - 1] + 0.02 : 0, T60 = 0.45 + 0.3 * dist + 0.25 * p.echo;
  const hornEnd = pre + n / sr + last, out = new Float32Array(c.seconds(hornEnd + (p.tail ? T60 : 0.03), sr));
  c.mix(out, darken(x, 10000 * (1 - dist) + 1200), pre, 1 - 0.55 * dist, sr);
  for (let k = 1; k <= nE; k++) {
    const g = (0.3 + 0.4 * p.echo) * (0.75 + 0.25 * dist) * Math.pow(0.64, k - 1) * (0.85 + 0.3 * r());
    const y = darken(x, 6000 / (1 + 0.5 * k) * (1 - 0.5 * dist) + 600), at = pre + delays[k - 1];
    c.mix(out, y, at, g, sr);
    c.mix(out, y, at + 0.008 + 0.01 * r(), g * 0.35, sr);
  }
  if (p.tail) {
    const size = 0.8 + 0.4 * p.echo, damp = 0.5 - 0.3 * dist, wetAmt = 0.12 + 0.12 * p.echo + 0.1 * dist;
    const cd = [0.0297, 0.0371, 0.0411, 0.0437].map(d => Math.max(1, Math.round(d * size * (0.96 + 0.08 * r()) * sr)));
    const cb = cd.map(d => new Float32Array(d)), ci = cd.map(() => 0), cl = cd.map(() => 0), cg = cd.map(d => Math.pow(10, -3 * d / sr / T60));
    for (let i = 0; i < out.length; i++) {
      const v = out[i];
      let w = 0;
      for (let k = 0; k < 4; k++) {
        const y = cb[k][ci[k]];
        cl[k] += damp * (y - cl[k]);
        cb[k][ci[k]] = v + cl[k] * cg[k];
        if (++ci[k] >= cd[k]) ci[k] = 0;
        w += y;
      }
      out[i] = v + wetAmt * 0.25 * w;
    }
    const m = out.length, hiss = c.pink(r, m), hh = c.biquad("hp", 1800, 0.7, sr), hl = c.biquad("lp", 8500 - 3500 * dist, 0.7, sr);
    const lvl = 0.16 * (1 - 0.4 * dist), peakAt = 0.3 + 0.4 * r();
    for (let i = 0; i < m; i++) {
      const u = i / m, sw = u < peakAt ? Math.sin(Math.PI * 0.5 * u / peakAt) : Math.cos(Math.PI * 0.5 * (u - peakAt) / (1 - peakAt));
      hiss[i] = hl(hh(hiss[i])) * sw * sw * lvl;
    }
    c.mix(out, hiss, 0, 1, sr);
    const drips = Math.round(15 + 25 * (1 - dist)), dur = m / sr;
    for (let d = 0; d < drips; d++) {
      const t = 0.02 + r() * (dur - 0.06);
      c.mix(out, c.burst(r, 0.006 + 0.006 * r(), "bp", 2500 + 4500 * r(), 6, 0.0004, 0.002, sr), t, (0.06 + 0.1 * r()) * (1 - 0.5 * dist), sr);
    }
  }
  c.finish(out, 0.9);
  c.gain(out, 1 - 0.3 * dist);
  let end = out.length - 1;
  while (end > 0 && Math.abs(out[end]) < 0.003) end--;
  const res = out.slice(0, Math.min(out.length, end + c.seconds(0.015, sr)));
  c.fade(res, 12, sr);
  return { samples: res };
}
