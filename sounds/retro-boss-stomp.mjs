// Retro boss stomp: a 4-bit triangle thump diving in pitch (the hero), an NES-style held-noise crunch for punch, a screen-shake rumble (held noise + triangle under jittered blocky AM) and optional aftershocks.
export const meta = {
  title: "Boss Stomp", kind: "impact", format: "sound", duration: 1.1, price: 3, author: "quietmachine", payout: "quietmachine@creators.oasis.example", kit: "Retro Arcade", description: "A heavy 8-bit boss footfall: a diving triangle-wave stomp with a crunchy noise hit and a shaking rumble, for screen-shake moments, boss arrivals and ground pounds.",
  tags: ["stomp", "boss", "8bit", "chiptune", "arcade", "impact", "rumble", "retro"],
};
export const params = { knobs: {
  weight: { type: "choice", label: "Weight", default: "giant", options: ["heavy", "giant", "titan"] },
  punch: { type: "range", label: "Punch", default: 0.6, min: 0, max: 1, step: 0.01 },
  rumble: { type: "range", label: "Rumble", default: 0.5, min: 0, max: 1, step: 0.01 },
  pitch: { type: "range", label: "Pitch (semitones)", default: 0, min: -12, max: 12, step: 1 },
  shake: { type: "range", label: "Shake rate (Hz)", default: 11, min: 4, max: 24, step: 0.5 },
  tail: { type: "toggle", label: "Aftershock tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, wi = params.knobs.weight.options.indexOf(p.weight), r = c.rng(p.seed * 4703 + wi * 211 + 3);
  const W = [{ f: 78, tau: 0.06, rl: 0.4, nz: 3600, sub: 0, cr: 0.6 }, { f: 48, tau: 0.1, rl: 0.65, nz: 1600, sub: 0.5, cr: 0.35 }, { f: 31, tau: 0.15, rl: 0.95, nz: 650, sub: 1, cr: 0.15 }][wi];
  const k = Math.pow(2, p.pitch / 12) * c.between(r, 0.96, 1.04);
  const fEnd = W.f * k, fStart = fEnd * (3 + 3 * p.punch) * c.between(r, 0.94, 1.06);
  const tau = W.tau * c.between(r, 0.88, 1.12), sweepT = (0.035 + 0.02 * wi) * c.between(r, 0.85, 1.15);
  const t0 = c.between(r, 0.0005, 0.0025);
  const tri = (ph) => { const t = 4 * Math.abs(ph - Math.floor(ph) - 0.5) - 1; return (Math.min(15, Math.floor((t + 1) * 8)) - 7.5) / 7.5; };
  const stomp = (fA, fB, sw0, tc, amp, sub) => {
    const n = c.seconds(tc * 6 + 0.01, sr), b = new Float32Array(n), dk = Math.exp(-1 / (tc * sr)), sw = Math.exp(-1 / (sw0 * sr));
    let ph = 0, ph2 = 0, e = 1, s = 1;
    for (let i = 0; i < n; i++) {
      const f = fB + (fA - fB) * s; s *= sw; ph += f / sr; ph2 += f * 0.5 / sr;
      const rel = Math.min(1, (n - i) / (0.01 * sr));
      b[i] = (tri(ph) + sub * 0.6 * tri(ph2)) * Math.min(1, i / (0.0015 * sr)) * e * amp * rel; e *= dk;
    }
    return b;
  };
  const rumbleLen = W.rl * (0.5 + 0.7 * p.rumble) * c.between(r, 0.92, 1.08);
  const washLen = p.tail ? rumbleLen + W.rl * 0.5 : 0;
  const shocks = []; let end = Math.max(tau * 6 + 0.01, rumbleLen + 0.004, washLen);
  if (p.tail) {
    let t = rumbleLen * 0.25, gap = 0.1 + 0.05 * wi, amp = 0.4;
    for (let s = 0; s < 2 + wi; s++) {
      t += gap * c.between(r, 0.8, 1.2); gap *= 0.72;
      const tc = tau * c.between(r, 0.4, 0.6);
      shocks.push([t, fStart * c.between(r, 0.45, 0.7), fEnd * c.between(r, 1.05, 1.2), tc, amp]);
      end = Math.max(end, t + tc * 6 + 0.01); amp *= c.between(r, 0.5, 0.7);
    }
  }
  const out = new Float32Array(c.seconds(t0 + end + 0.03, sr));
  c.mix(out, stomp(fStart, fEnd, sweepT, tau, 1, W.sub), t0, 1.25, sr);
  const cn = c.seconds(0.03 + 0.025 * wi + 0.03 * p.punch, sr), cx = new Float32Array(cn);
  const hold = Math.max(1, Math.round(sr / (W.nz * 2 * (0.7 + 0.6 * p.punch)))), clp = c.biquad("lp", W.nz * (1 + p.punch), 0.8, sr);
  const cdk = Math.exp(-1 / ((0.008 + 0.006 * wi) * sr)); let v = 0, ce = 1;
  for (let i = 0; i < cn; i++) { if (i % hold === 0) v = r() * 2 - 1; cx[i] = clp(v) * ce * Math.min(1, i / (0.0008 * sr)); ce *= cdk; }
  c.mix(out, cx, t0, 0.2 + 0.7 * p.punch, sr);
  c.mix(out, c.burst(r, 0.015, "bp", 2400 + 1600 * p.punch, 1.2, 0.0004, 0.003, sr), t0, W.cr * (0.3 + 0.7 * p.punch), sr);
  const nR = c.seconds(rumbleLen, sr), rx = new Float32Array(nR), rlp = c.biquad("lp", 90 + 80 * (2 - wi), 0.8, sr);
  const rh = Math.max(1, Math.round(sr / (300 + 450 * (2 - wi))));
  let rate = p.shake * c.between(r, 0.9, 1.1), target = rate, sph = r(), dep = 0.6, depT = 0.6, tph = 0, nv = 0;
  for (let i = 0; i < nR; i++) {
    if (i % 512 === 0) target = p.shake * (1 + 0.3 * (r() - 0.5));
    if (i % 1024 === 0) depT = 0.45 + 0.4 * r();
    rate += (target - rate) * 0.002; dep += (depT - dep) * 0.001; sph += rate / sr;
    const s = Math.sin(c.TAU * sph), sh = s / (Math.abs(s) + 0.3), am = 1 - dep * (0.5 + 0.5 * sh);
    if (i % rh === 0) nv = r() * 2 - 1;
    tph += fEnd * (1 + 0.04 * s) / sr;
    const x = i / nR, e = Math.min(1, i / (0.02 * sr)) * (1 - x) * (1 - x);
    rx[i] = (rlp(nv) * 1.4 + 0.5 * tri(tph)) * am * e;
  }
  c.mix(out, rx, t0 + 0.006, 0.1 + 0.5 * p.rumble, sr);
  if (p.tail) {
    const nW = c.seconds(washLen, sr), wx = new Float32Array(nW), wlp = c.biquad("lp", 80 + 40 * (2 - wi), 0.7, sr), wh = Math.max(1, Math.round(sr / 150));
    let wv = 0;
    for (let i = 0; i < nW; i++) { if (i % wh === 0) wv = r() * 2 - 1; const x = 1 - i / nW; wx[i] = wlp(wv) * Math.min(1, i / (0.05 * sr)) * x * x; }
    c.mix(out, wx, t0 + 0.01, 0.35 + 0.45 * p.rumble, sr);
    for (const [t, fa, fb, tc, a] of shocks) c.mix(out, stomp(fa, fb, sweepT * 0.6, tc, a, W.sub * 0.5), t0 + t, 1, sr);
  }
  c.fade(c.finish(out, 0.9, 1.2), 15, sr);
  return { samples: out };
}
