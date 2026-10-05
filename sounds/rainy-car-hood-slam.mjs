// Wet car-panel slam: damped low panel thump plus panel-coloured slap, short inharmonic sheet-metal modes with a noise shimmer, a panel event (hood latch rattle, roof flex-back, trunk cavity boom), a bright water sheet with pitched droplet chirps clustered after the hit, and an optional street slapback and reverb tail.
export const meta = {
  title: "Wet Hood Slam", kind: "impact", format: "sound", duration: 1.2, price: 3, author: "foleyroom", payout: "foleyroom@creators.oasis.example", kit: "Rainy City Street", description: "A hand or object slamming a rain-soaked car hood, roof or trunk. Force, metal ring, water spray and pitch are knobs and every seed is a different hit, for night-street chases, arguments and break-ins.",
  tags: ["car", "hood", "slam", "metal", "impact", "wet", "rain", "street"],
};
export const params = { knobs: {
  panel: { type: "choice", label: "Panel", default: "hood", options: ["hood", "roof", "trunk"] },
  force: { type: "range", label: "Force", default: 0.6, min: 0, max: 1, step: 0.01 },
  ring: { type: "range", label: "Metal ring", default: 0.35, min: 0, max: 1, step: 0.01 },
  spray: { type: "range", label: "Water spray", default: 0.5, min: 0, max: 1, step: 0.01 },
  pitch: { type: "range", label: "Pitch", default: 0.5, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Street tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, pi = params.knobs.panel.options.indexOf(p.panel), r = c.rng(p.seed * 6007 + pi * 211 + 13);
  const F = p.force, pk = Math.pow(2, (p.pitch - 0.5) * 1.4), t0 = 0.004;
  const P = [
    { f: 72, d: 0.035, lp: 420, hit: 3400, hq: 1, rq: 0.85, sh: 1300, modes: [[180, 1], [287, 0.7], [431, 0.55], [612, 0.4], [905, 0.3], [1340, 0.2], [1980, 0.12]] },
    { f: 110, d: 0.022, lp: 700, hit: 6000, hq: 0.75, rq: 1.15, sh: 2400, modes: [[240, 1], [395, 0.8], [588, 0.6], [870, 0.5], [1260, 0.4], [1820, 0.3], [2650, 0.2], [3700, 0.12]] },
    { f: 50, d: 0.07, lp: 240, hit: 1800, hq: 1.3, rq: 0.6, sh: 700, modes: [[150, 1], [236, 0.6], [370, 0.4], [540, 0.25], [790, 0.15]] },
  ][pi];
  const tau = (0.025 + 0.17 * p.ring) * P.rq * (0.85 + 0.3 * F);
  const dripEnd = 0.08 + 0.3 * p.spray;
  const len = Math.max(0.45, 5 * tau + 0.1, dripEnd + 0.12) + (p.tail ? 0.85 : 0.05);
  const n = c.seconds(len, sr), out = new Float32Array(n);
  const chirp = (at, f, dur, amp, rise) => {
    const s = Math.floor(at * sr), m = Math.min(c.seconds(dur, sr), n - s); let ph = 0;
    for (let i = 0; i < m; i++) {
      const t = i / sr; ph += c.TAU * f * (1 + rise * t / dur) / sr;
      out[s + i] += Math.sin(ph) * amp * Math.min(1, t / 0.0004) * Math.exp(-t / (dur * 0.3));
    }
  };
  const bf = P.f * pk * (1 + 0.08 * F), bd = P.d * (0.6 + 0.8 * F);
  c.mix(out, c.ring([[bf, 1], [bf * 1.52, 0.45], [bf * 2.3, 0.2]], bd * 7, bd, sr), t0 + 0.0008, 0.5 + 0.5 * F, sr);
  c.mix(out, c.burst(r, 0.05 + 0.04 * F, "lp", P.lp * pk, 0.8, 0.0015, 0.012 + 0.02 * F, sr), t0, 0.25 + 0.75 * F, sr);
  c.mix(out, c.burst(r, 0.012, "lp", P.hit * (0.5 + 0.8 * F), 0.8, 0.0006 + 0.002 * (1 - F), 0.002 + 0.002 * (1 - F), sr), t0, (0.35 + 0.55 * F) * P.hq, sr);
  c.mix(out, c.burst(r, 0.02, "bp", 1600 * pk, 0.9, 0.0008, 0.004, sr), t0 + 0.001, 0.15 + 0.45 * p.spray, sr);
  const keep = Math.max(2, Math.round(P.modes.length * (0.35 + 0.65 * p.ring))), md = [];
  for (let k = 0; k < keep; k++) {
    const [f, a] = P.modes[k], fd = f * pk * (0.985 + r() * 0.03), aa = a * (1 - (k / P.modes.length) * (1 - F) * 0.7);
    md.push([fd, aa], [fd * (1.002 + r() * 0.004), aa * 0.6]);
  }
  c.mix(out, c.ring(md, Math.min(len - 0.02, tau * 6), tau, sr), t0 + 0.0005, (0.1 + 0.4 * p.ring) * (0.5 + 0.5 * F), sr);
  c.mix(out, c.burst(r, tau * 5, "bp", P.sh * pk, 1.2, 0.001, tau * 0.8, sr), t0 + 0.001, (0.05 + 0.3 * p.ring) * (0.5 + 0.5 * F), sr);
  if (pi === 0) {
    let t = t0 + 0.01 + r() * 0.006;
    for (let k = 0, kn = 3 + Math.round(3 * F); k < kn; k++) {
      c.mix(out, c.ring([[2300 * pk * (0.9 + 0.2 * r()), 1], [5100 * pk, 0.4]], 0.03, 0.004, sr), t, 0.25 * (0.3 + 0.7 * F) * Math.pow(0.7, k), sr);
      t += 0.006 + r() * 0.014;
    }
  } else if (pi === 1) {
    const tb = t0 + 0.03 + r() * 0.02;
    c.mix(out, c.ring(P.modes.slice(1, 4).map(([f, a]) => [f * pk * 1.06, a]), 0.12, 0.025 + 0.03 * p.ring, sr), tb, 0.4 * (0.3 + 0.7 * F), sr);
    c.mix(out, c.burst(r, 0.01, "lp", 4000 * pk, 0.8, 0.0008, 0.003, sr), tb, 0.3 * (0.3 + 0.7 * F), sr);
  } else {
    c.mix(out, c.ring([[44 * pk, 1], [89 * pk, 0.3], [134 * pk, 0.12]], 0.6, 0.08 + 0.07 * F, sr), t0 + 0.006, 0.6 + 0.35 * F, sr);
  }
  const sp = p.spray, push = 0.4 + 0.6 * F;
  c.mix(out, c.burst(r, 0.07 + 0.1 * sp, "hp", 3500, 0.7, 0.0015, 0.02 + 0.045 * sp, sr), t0 + 0.002, (0.05 + 0.5 * sp) * push, sr);
  const drops = Math.round((6 + 220 * sp) * push);
  for (let d = 0; d < drops; d++) {
    const t = t0 + 0.002 + Math.pow(r(), 2.2) * (0.05 + 0.12 * F);
    chirp(t, c.between(r, 1800, 6500) * Math.sqrt(pk), c.between(r, 0.004, 0.014), (0.03 + 0.09 * r()) * push, 0.3 + r() * 0.9);
  }
  const back = Math.round(sp * (14 + 40 * F));
  for (let d = 0; d < back; d++) {
    const t = Math.min(dripEnd, 0.03 + -Math.log(1 - 0.95 * r()) * 0.05 * (0.5 + sp));
    const a = Math.exp(-(t - 0.03) / 0.15);
    c.mix(out, c.burst(r, 0.006, "bp", c.between(r, 2500, 6000), 3, 0.0004, 0.0015, sr), t, (0.04 + 0.07 * r()) * a, sr);
    if (r() < 0.7) chirp(t + 0.001, c.between(r, 1400, 4200), c.between(r, 0.006, 0.02), (0.03 + 0.05 * r()) * a, 0.4 + r());
  }
  let res = out;
  if (p.tail) {
    const ref = out.slice(); c.filter(ref, c.biquad("lp", 1800, 0.7, sr)); c.filter(ref, c.biquad("hp", 120, 0.7, sr));
    const d1 = 0.12 + 0.05 * r();
    c.mix(out, ref, d1, 0.38, sr); c.mix(out, ref, d1 * 1.9, 0.18, sr); c.mix(out, ref, d1 * 2.8, 0.08, sr);
    const rv = c.reverb(out, { size: 0.75, decay: 0.6, mixAmt: 0.28 }, sr);
    if (rv && rv.length) res = rv;
  }
  c.finish(res, 0.9, 1.1);
  c.gain(res, 0.6 + 0.35 * F);
  const fo = Math.min(res.length, c.seconds(p.tail ? 0.3 : 0.06, sr));
  for (let i = 0; i < fo; i++) res[res.length - 1 - i] *= 0.5 - 0.5 * Math.cos(Math.PI * i / fo);
  c.fade(res, 3, sr);
  return { samples: res };
}
