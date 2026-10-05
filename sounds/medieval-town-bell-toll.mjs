// Bronze bell toll: a struck bell built from inharmonic partials (hum, prime, tierce, quint, nominal and upper modes) with beating pairs, each partial decaying at its own rate so the bright strike dies fast and the hum rings on; a clapper click and thud, a shimmer layer of detuned high partials, then distance filtering and an optional reverb tail.
export const meta = {
  title: "Bronze Bell Toll", kind: "impact", format: "sound", duration: 4, price: 4, author: "hollowbody", payout: "hollowbody@creators.oasis.example", kit: "Medieval Market",
  description: "A single bronze bell strike, from handbell to great tower bell, with strike force, inharmonic shimmer, distance and a long ringing tail as knobs; for market squares, church towers and film period scenes.",
  tags: ["bell", "bronze", "church", "toll", "medieval", "market", "impact", "resonance"],
};
export const params = { knobs: {
  size: { type: "choice", label: "Bell size", default: "tower", options: ["handbell", "tower", "great"] },
  force: { type: "range", label: "Strike force", default: 0.6, min: 0, max: 1, step: 0.01 },
  shimmer: { type: "range", label: "Inharmonic shimmer", default: 0.4, min: 0, max: 1, step: 0.01 },
  distance: { type: "range", label: "Distance", default: 0.2, min: 0, max: 1, step: 0.01 },
  pitch: { type: "range", label: "Pitch", default: 0.5, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Decay tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + params.knobs.size.options.indexOf(p.size) * 97 + 3);
  const cls = { handbell: [880, 1.5], tower: [262, 2.6], great: [98, 3.0] }[p.size];
  const f0 = cls[0] * Math.pow(2, (p.pitch - 0.5) * 0.8), T = cls[1], F = p.force;
  const dur = 4, n = c.seconds(dur, sr), out = new Float32Array(n);
  const ratios = [[0.5, 1, 1], [1, 0.9, 0.8], [1.2, 0.7, 0.55], [1.5, 0.45, 0.4], [2, 0.8, 0.3], [2.5, 0.35, 0.22], [3.0, 0.3, 0.18], [4.1, 0.22, 0.12], [5.4, 0.16, 0.08]];
  const tailK = p.tail ? 1 : 0.4;
  ratios.forEach(([ra, a, d], k) => {
    const f = f0 * ra * (1 + (r() - 0.5) * 0.006);
    if (f > sr * 0.45) return;
    const amp = a * (k > 3 ? 0.3 + 1.1 * F : 1) * (0.9 + 0.2 * r());
    const tau = T * (0.07 + 0.55 * d) * tailK;
    c.mix(out, c.ring([[f, amp]], dur, tau, sr), 0.001, 0.22, sr);
    c.mix(out, c.ring([[f * (1.002 + r() * 0.005), amp * 0.6]], dur, tau * 0.9, sr), 0.001, 0.22, sr);
  });
  const nsh = Math.round(3 + 6 * p.shimmer), shim = new Float32Array(n);
  for (let k = 0; k < nsh; k++) {
    const f = f0 * (5.5 + r() * 7), lfo = 3 + r() * 6, ph = r() * 6.28, dd = T * (0.06 + 0.1 * r()) * tailK;
    if (f > sr * 0.45) continue;
    const mode = c.ring([[f, 1]], dur, dd, sr);
    for (let i = 0; i < n; i++) shim[i] += mode[i] * (0.6 + 0.4 * Math.sin(c.TAU * lfo * i / sr + ph));
  }
  c.mix(out, shim, 0.002, 0.05 + 0.35 * p.shimmer, sr);
  const sz = Math.min(1.6, 0.5 + 300 / f0 * 0.5);
  c.mix(out, c.burst(r, 0.012, "bp", 2500 + 3000 * F, 1.2, 0.0004, 0.004, sr), 0, 0.4 + 0.8 * F, sr);
  c.mix(out, c.ring([[f0 * 0.5, 1], [f0 * 0.8, 0.4]], 0.15, 0.025 + 0.02 * F, sr), 0.001, 0.3 + 0.5 * F, sr);
  c.mix(out, c.burst(r, 0.03, "lp", 500 + 300 * sz, 0.8, 0.001, 0.01, sr), 0.001, 0.4 * F, sr);
  c.filter(out, c.biquad("lp", 16000 - 13500 * p.distance - 1500 * (1 - F), 0.7, sr));
  let res = out;
  if (p.tail || p.distance > 0.3) {
    const w = c.reverb(out, { size: 0.5 + 0.4 * p.distance, decay: p.tail ? 0.6 : 0.3, mixAmt: 0.15 + 0.5 * p.distance }, sr);
    res = new Float32Array(n);
    for (let i = 0; i < n; i++) res[i] = w[i] !== undefined ? w[i] : out[i];
  }
  c.finish(res, 0.9, 1.1);
  c.gain(res, (0.8 + 0.2 * F) * (1 - 0.25 * p.distance));
  c.fade(res, 60, sr);
  return { samples: res };
}
