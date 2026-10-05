// Pan drop: a pan hitting tile. Plate modes in three bands that die at different rates, with detuned twins for shimmer, form the body. Each contact adds a tile tick and floor thud, then bounces and an accelerating rim wobble settle it.
export const meta = {
  title: "Pan On Tile", kind: "impact", format: "sound", duration: 2.5, price: 3, author: "foleyroom", payout: "foleyroom@creators.oasis.example", kit: "Kitchen", description: "A frying pan dropped on a kitchen tile floor, bouncing and clattering to rest; material, size, drop height, bounces and ring are knobs, and every seed is a different fall.",
  tags: ["pan", "drop", "kitchen", "clatter", "metal", "impact", "bounce", "foley"],
};
export const params = { knobs: {
  material: { type: "choice", label: "Pan material", default: "steel", options: ["cast iron", "aluminium", "steel"] },
  size: { type: "range", label: "Size", default: 0.5, min: 0, max: 1, step: 0.01 },
  height: { type: "range", label: "Drop height", default: 0.5, min: 0, max: 1, step: 0.01 },
  bounces: { type: "range", label: "Bounce count", default: 0.5, min: 0, max: 1, step: 0.01 },
  ring: { type: "range", label: "Ring decay", default: 0.4, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Room tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, mi = params.knobs.material.options.indexOf(p.material), r = c.rng(p.seed * 7907 + mi * 313 + 11);
  const m = [
    { f: 210, e: 0.28, d0: 0.035, d1: 0.16, tilt: 0.55, bmax: 3, wob: 4, tile: 0.6, thud: 0.9, hi: 0.5 },
    { f: 470, e: 0.55, d0: 0.06, d1: 0.4, tilt: 0.95, bmax: 9, wob: 14, tile: 1, thud: 0.3, hi: 1 },
    { f: 360, e: 0.45, d0: 0.1, d1: 0.75, tilt: 0.85, bmax: 7, wob: 11, tile: 0.85, thud: 0.45, hi: 0.85 },
  ][mi];
  const s = p.size, h = 0.1 + 0.9 * p.height;
  const f0 = m.f * (1.45 - 0.75 * s) * (0.94 + 0.12 * r());
  const ratios = [1, 1.59, 2.14, 2.3, 2.65, 2.92, 3.5, 4.15, 5.2].map(q => q * (0.98 + 0.04 * r()));
  const hits = [];
  let t = 0.01, a = 1, dt = Math.max(0.03, 2 * m.e * Math.sqrt(2 * h / 9.8) * (0.8 + 0.4 * r()));
  hits.push({ t, a, br: 1, rim: false });
  if (r() < 0.7) hits.push({ t: t + 0.008 + 0.025 * r(), a: 0.35 + 0.25 * r(), br: 0.8, rim: true });
  const nb = Math.round(p.bounces * m.bmax * (0.8 + 0.4 * r()));
  for (let b = 0; b < nb; b++) {
    t += dt; a *= Math.sqrt(m.e) * (0.75 + 0.4 * r());
    hits.push({ t, a, br: 0.6 + 0.4 * r(), rim: r() < 0.4 });
    dt = Math.max(0.015, dt * (m.e + 0.25) * (0.7 + 0.6 * r()));
  }
  const nw = nb >= 2 ? Math.round(p.bounces * m.wob * (0.7 + 0.6 * r())) : 0;
  let wi = Math.min(0.09, dt * 0.9), wa = a * 0.6;
  for (let w = 0; w < nw; w++) {
    t += wi * (0.6 + 0.8 * r()); wa *= 0.86 + 0.08 * r();
    hits.push({ t, a: wa * (0.6 + 0.8 * r()), br: 0.5 + 0.5 * r(), rim: true });
    wi = Math.max(0.008, wi * (0.78 + 0.1 * r()));
  }
  const last = hits.reduce((x, e) => Math.max(x, e.t), 0), pad = p.tail ? 0.6 : 0.08;
  const tau = Math.min((m.d0 + (m.d1 - m.d0) * p.ring) * (0.8 + 0.4 * s), Math.max(0.03, (3.85 - pad - last) / 6.5));
  let end = 0;
  for (const e of hits) { e.d = tau * (e.rim ? 0.5 : 1) * (0.85 + 0.3 * r()); e.n = e.d * Math.max(1.5, 6.5 + Math.log(e.a)) + 0.02; end = Math.max(end, e.t + e.n); }
  const len = Math.min(3.95, end + pad + 0.03);
  let out = new Float32Array(c.seconds(len, sr));
  for (const e of hits) {
    const bands = [[], [], []], det = e.rim ? 1.015 : 1;
    ratios.forEach((q, k) => {
      const f = f0 * q * (0.996 + 0.008 * r()) * det, amp = Math.pow(m.tilt, k) * (0.3 + 0.7 * r()) * (e.rim && k === 0 ? 0.3 : 1);
      const b = bands[k < 3 ? 0 : k < 6 ? 1 : 2];
      b.push([f, amp]);
      if (k < 6) b.push([f * (1.003 + 0.007 * r()), amp * (0.4 + 0.3 * r())]);
    });
    const dur = Math.min(len - e.t - 0.002, e.n);
    if (dur > 0.01) [[1, 0.55], [0.55, 0.45 * m.hi], [0.3, 0.35 * m.hi]].forEach(([dk, g], bi) => {
      const x = c.ring(bands[bi], dur * (bi ? 0.7 : 1), e.d * dk, sr, 1); c.fade(x, 0.6, sr);
      c.mix(out, x, e.t + 0.0006, g * e.a * (bi ? 0.5 + 0.5 * h * e.br : 1), sr);
    });
    c.mix(out, c.burst(r, 0.012, "bp", 2800 + 3500 * r(), 1.2, 0.0004, 0.0015 + 0.002 * r(), sr), e.t, m.tile * e.a * (0.4 + 0.5 * h) * e.br, sr);
    c.mix(out, c.burst(r, 0.01, "hp", 1200 + 3000 * h * e.br, 0.7, 0.0003, 0.001, sr), e.t, 0.35 * e.a, sr);
    if (!e.rim) c.mix(out, c.burst(r, 0.07, "lp", 150 + 150 * (1 - s), 0.7, 0.001, 0.012 + 0.025 * s, sr), e.t, m.thud * e.a * (0.4 + 0.5 * s) * (0.4 + 0.6 * h), sr);
  }
  if (p.tail) { const wet = c.reverb(out, { size: 0.45, decay: 0.55, mixAmt: 0.25 }, sr); if (wet && wet.length) out = wet; }
  c.finish(out, 0.9, 1.15);
  c.fade(out, 25, sr);
  c.gain(out, 0.6 + 0.4 * p.height);
  return { samples: out };
}
