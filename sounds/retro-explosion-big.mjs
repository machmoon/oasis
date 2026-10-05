// Boss explosion: staggered NES-style 1-bit LFSR noise bursts with falling clock and square "thoom", satellite crackles, a stepped-triangle rumble and an optional crumbling tail.
export const meta = {
  title: "Boss Meltdown", kind: "impact", format: "sound", duration: 3, price: 4, author: "quietmachine", payout: "quietmachine@creators.oasis.example", kit: "Retro Arcade", description: "A long, crumbling 8-bit boss explosion of staggered bursts and debris crackle over a stepped rumble, for boss deaths, base destructions and screen-clear bombs.",
  tags: ["explosion", "8-bit", "chiptune", "boss", "arcade", "retro", "crumble", "nes"],
};
export const params = { knobs: {
  size: { type: "choice", label: "Size", default: "huge", options: ["large", "huge", "screen-clear"] },
  density: { type: "range", label: "Burst density", default: 0.5, min: 0, max: 1, step: 0.01 },
  rumble: { type: "range", label: "Low rumble", default: 0.5, min: 0, max: 1, step: 0.01 },
  crunch: { type: "range", label: "Crunch", default: 0.5, min: 0, max: 1, step: 0.01 },
  rate: { type: "range", label: "Burst rate", default: 5, min: 2, max: 10, step: 0.5 },
  tail: { type: "toggle", label: "Crumbling tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, B = c.between, idx = params.knobs.size.options.indexOf(p.size);
  const r = c.rng(p.seed * 7907 + idx * 101 + 3), cr = p.crunch;
  const s = [{ win: 1.2, tau: 0.07, hi: 11000, lo: 1300, rum: 72 }, { win: 1.7, tau: 0.09, hi: 7000, lo: 700, rum: 55 },
    { win: 2.1, tau: 0.12, hi: 4500, lo: 380, rum: 42 }][idx];
  const ev = [];
  let t = 0.002, k = 0, lastT = 0;
  while (t < s.win && k < 18) {
    const prog = t / s.win;
    ev.push({ t, amp: k === 0 ? 1 : (0.55 + 0.45 * r()) * (1 - 0.55 * prog), tau: k === 0 ? s.tau * 1.6 : Math.min(0.14, s.tau * B(r, 0.7, 1.3)),
      hi: s.hi * B(r, 0.75, 1.2), lo: s.lo * B(r, 0.8, 1.2), sq: B(r, 160, 380) * (1 - 0.4 * prog) });
    const sats = Math.round(p.density * (0.5 + 1.6 * r()));
    for (let j = 0; j < sats; j++) ev.push({ t: t + B(r, 0.015, 0.075), amp: B(r, 0.25, 0.5) * (1 - 0.5 * prog), tau: s.tau * B(r, 0.2, 0.32), hi: s.hi * 1.2, lo: s.lo * 2, sq: 0 });
    lastT = t;
    t += Math.max(0.05, -Math.log(1 - r() * 0.95) / p.rate * (0.6 + 1.4 * prog));
    k++;
  }
  if (idx === 2) ev.push({ t: 0.001, amp: 0.8, tau: 0.03, hi: 16000, lo: 9000, sq: 0 });
  const debris = Math.round(p.density * 35 * s.win);
  for (let j = 0; j < debris; j++) ev.push({ t: B(r, 0.02, s.win + 0.1), amp: B(r, 0.1, 0.3), tau: B(r, 0.004, 0.012), hi: B(r, 6000, 10000), lo: 3000, sq: r() < 0.3 ? B(r, 600, 1400) : 0 });
  if (p.tail) ev.push({ t: lastT + 0.02, amp: 0.7, tau: Math.min(0.2, s.tau * 2.2), hi: s.hi * 0.4, lo: 150, sq: 90 });
  let end = 0;
  for (const e of ev) end = Math.max(end, e.t + e.tau * 5);
  const pad = p.tail ? 0.25 : 0.12, cap = 3.8, clipped = end + pad > cap;
  const n = c.seconds(Math.min(end + pad, cap), sr), out = new Float32Array(n);
  const kc = 1 - Math.exp(-c.TAU * (2500 + 12000 * cr) / sr), fl = Math.max(1, Math.round(sr / 60)), att = 0.002 * sr;
  for (const e of ev) {
    const i0 = Math.round(e.t * sr), m = Math.min(Math.ceil(e.tau * 5 * sr), n - i0), fm = Math.max(1, Math.round(0.01 * sr));
    const dec = Math.exp(-1 / (e.tau * sr)), gd = Math.exp(-1 / (e.tau * 1.5 * sr)), span = e.hi - e.lo, hasSq = e.sq > 0;
    let env = 1, g = 1, ph = 0, sp = r(), v = 1, lp = 0, es = 1, fc = 0, lf = 1 + Math.floor(r() * 32766);
    for (let i = 0; i < m; i++) {
      ph += (e.lo + span * g) / sr;
      if (ph >= 1) { ph -= Math.floor(ph); lf = (lf >> 1) | (((lf ^ (lf >> 1)) & 1) << 14); v = (lf & 1) ? 1 : -1; }
      lp += (v - lp) * kc;
      let x = 0.8 * lp;
      if (hasSq) { sp += e.sq * (0.3 + 0.7 * g) / sr; if (sp >= 1) sp -= 1; x += sp < 0.5 ? 0.35 : -0.35; }
      if (++fc >= fl) { fc = 0; es = Math.round(env * 15) / 15; }
      const a = i < att ? i / att : (m - i < fm ? (m - i) / fm : 1);
      out[i0 + i] += e.amp * a * ((1 - cr) * env + cr * es) * x;
      env *= dec; g *= gd;
    }
  }
  if (p.rumble > 0) {
    const br = c.brown(r, n), lpR = c.biquad("lp", 110, 0.8, sr), f0 = s.rum * B(r, 0.9, 1.1), ra = c.seconds(0.008, sr);
    let ph = 0;
    for (let i = 0; i < n; i++) {
      const inv = 1 - i / n;
      ph += f0 * (0.45 + 0.55 * inv) / sr; if (ph >= 1) ph -= 1;
      const tri = Math.round((4 * Math.abs(ph - 0.5) - 1) * 7.5) / 7.5;
      const e = (i < ra ? i / ra : 1) * inv * inv;
      out[i] += p.rumble * 0.6 * (0.6 * tri + 0.8 * lpR(br[i])) * e;
    }
  }
  if (p.tail) c.reverb(out, { size: 0.7, decay: 0.6, mixAmt: 0.22 }, sr);
  c.finish(out, 0.9, 1.3);
  const L = Math.pow(2, 8 - 4 * cr), hold = cr > 0.05 ? Math.max(1, Math.round((1 + 5 * cr) * sr / 22050)) : 1;
  let h = 0, hc = 0;
  for (let i = 0; i < n; i++) { if (hc === 0) h = Math.round(out[i] * L) / L; if (++hc >= hold) hc = 0; out[i] = h; }
  const rel = Math.min(n, c.seconds(clipped ? 0.45 : pad, sr));
  for (let j = 0; j < rel; j++) { const q = 1 - j / rel; out[n - rel + j] *= q * q; }
  c.fade(out, 4, sr);
  return { samples: out };
}
