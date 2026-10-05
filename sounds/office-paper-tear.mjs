// Paper tear: abrupt initial crack, then stick-slip pulls (active runs separated by near-silent gaps) in which a Poisson train of fibre-snap micro-grains carries the sound over a faint sheet rustle. Speed sets length and snap rate, paper type sets the snap spectrum and structure (cardstock thumps, notepad ratchets), and the room tail is a short, quiet reverb.
export const meta = {
  title: "Paper Tear", kind: "foley", format: "sound", duration: 1.2, price: 1, author: "foleyroom", payout: "foleyroom@creators.oasis.example", kit: "Office", description: "A sheet of paper ripped in one pull or peeled slowly, with paper type, speed, fibre grit and sheet count as knobs; for desks, offices and cleaning out drawers.",
  tags: ["paper", "tear", "rip", "office", "foley", "sheet", "peel", "notepad"],
};
export const params = { knobs: {
  paper: { type: "choice", label: "Paper", default: "printer", options: ["printer", "cardstock", "notepad perforation"] },
  speed: { type: "range", label: "Tear speed", default: 1, min: 0.4, max: 2.5, step: 0.05 },
  grit: { type: "range", label: "Fiber grit", default: 0.5, min: 0, max: 1, step: 0.01 },
  sheets: { type: "range", label: "Sheet count", default: 0.2, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Room tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + params.knobs.paper.options.indexOf(p.paper) * 97 + 11);
  const dur = 0.2 + 0.8 / p.speed, tot = c.seconds(dur + (p.tail ? 0.4 : 0.06), sr), out = new Float32Array(tot);
  const card = p.paper === "cardstock", perf = p.paper === "notepad perforation";
  const f0 = (card ? 1500 : perf ? 3800 : 3000) * (1 - 0.15 * p.sheets), snapQ = card ? 1.4 : 3.2;
  const M = Math.ceil(dur * 1000) + 2, act = new Float32Array(M);
  for (let m = 0; m < M;) {
    const len = Math.ceil((40 + r() * 110) / Math.sqrt(p.speed)), lv = 0.55 + 0.45 * r(), gap = Math.ceil((8 + r() * 30) / p.speed);
    for (let k = 0; k < len && m < M; k++, m++) act[m] = lv * (0.8 + 0.2 * r());
    for (let k = 0; k < gap && m < M; k++, m++) act[m] = 0.04;
  }
  for (let m = 0; m < M; m++) { const left = (M - m) / 40; if (left < 1) act[m] *= left; }
  const A = (t) => act[Math.min(M - 1, Math.floor(t * 1000))];
  const nb = c.seconds(dur, sr), bed = c.pink(r, nb), bh = c.biquad("hp", 500, 0.7, sr), bl = c.biquad("lp", card ? 3500 : 6500, 0.7, sr);
  for (let i = 0; i < nb; i++) bed[i] = bl(bh(bed[i])) * A(i / sr) * (0.3 + 0.7 * r());
  c.mix(out, bed, 0, 0.05 + 0.12 * p.sheets, sr);
  const layers = 1 + Math.round(p.sheets * 2), rate = (60 + 300 * p.grit) * p.speed * (card ? 0.7 : perf ? 0.45 : 1);
  for (let L = 0; L < layers; L++) {
    let t = 0.002 + L * 0.006 * r();
    while (t < dur - 0.02) {
      const e = A(t);
      if (e < 0.1) { t += 0.002 + r() * 0.004; continue; }
      const cluster = 1 + Math.floor(r() * (1 + 4 * p.grit)), big = r() < 0.05 + 0.2 * p.grit;
      for (let m = 0; m < cluster; m++) {
        const tt = t + m * (0.0003 + r() * 0.001), f = f0 * (0.4 + r() * 1.6);
        c.mix(out, c.burst(r, 0.002 + r() * 0.004, "bp", f, snapQ * (0.6 + r()), 0.0003, 0.0006 + r() * 0.002, sr), tt, (0.15 + 0.6 * r() * r() * 1.5) * (big ? 1.8 : 1) * (0.3 + e) * (0.5 + 0.6 * p.grit) / Math.sqrt(layers), sr);
      }
      if (big) c.mix(out, c.ring([[card ? 200 + r() * 250 : 700 + r() * 900, 1], [2200 + r() * 1800, 0.3]], 0.04, 0.008 + 0.014 * r() * (card ? 2 : 1), sr), t, 0.2 * e, sr);
      t += -Math.log(1 - r() * 0.98) / (rate * (0.3 + e)) + 0.0006;
    }
  }
  c.mix(out, c.burst(r, 0.025, "bp", f0 * 0.9, 1.2, 0.0004, 0.008, sr), 0, 1.1, sr);
  c.mix(out, c.ring([[card ? 240 : 520, 1], [card ? 600 : 1300, 0.4]], 0.09, card ? 0.045 : 0.02, sr), 0.001, card ? 0.6 : 0.3, sr);
  if (perf) {
    let t = 0.012, k = 0;
    while (t < dur - 0.03) {
      const e = 0.4 + 0.6 * A(t), a = e * (k % 4 === 0 ? 1.25 : 1);
      c.mix(out, c.burst(r, 0.005, "hp", 2800 + r() * 1500, 0.8, 0.0003, 0.0012, sr), t, 0.7 * a, sr);
      c.mix(out, c.ring([[1900 + r() * 700, 1], [4100 + r() * 600, 0.4]], 0.02, 0.004 + r() * 0.002, sr), t, 0.6 * a, sr);
      c.mix(out, c.ring([[300 + r() * 80, 1]], 0.02, 0.008, sr), t, 0.3 * a, sr);
      t += (0.02 / Math.pow(p.speed, 0.8)) * (0.92 + 0.16 * r()); k++;
    }
  }
  if (p.tail) {
    const wet = c.reverb(out.slice(), { size: 0.3, decay: 0.35, mixAmt: 1 }, sr);
    for (let i = 0; i < tot; i++) out[i] = out[i] + wet[i] * 0.3;
  }
  c.fade(c.finish(out, 0.85, 1.1), 20, sr);
  return { samples: out };
}
