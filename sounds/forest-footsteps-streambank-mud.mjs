// Streambank mud step: sole click and body thump, a squelch of mud compressing with trapped bubbles, optional splash
// droplets, then the foot pulled free: a low gurgling draw of rising suction bubbles, the seal popping and drips falling back.
export const meta = {
  title: "Streambank Mud Step", kind: "foley", format: "sound", duration: 0.8, price: 1, author: "stormfront", payout: "stormfront@creators.oasis.example", kit: "Forest at Night", description: "One footstep sinking into wet streambank mud and sucking free; shoe, weight, suction, splash and pull-out length are knobs, and every seed is a new step for a night-forest walk.",
  tags: ["footstep", "mud", "squelch", "suction", "wet", "foley", "stream", "forest"],
};
export const params = { knobs: {
  shoe: { type: "choice", label: "Shoe", default: "boot", options: ["boot", "sneaker", "bare"] },
  weight: { type: "range", label: "Weight", default: 0.5, min: 0, max: 1, step: 0.01 },
  suction: { type: "range", label: "Suction", default: 0.6, min: 0, max: 1, step: 0.01 },
  splash: { type: "range", label: "Water splash", default: 0.35, min: 0, max: 1, step: 0.01 },
  release: { type: "range", label: "Release length", default: 0.25, min: 0.08, max: 0.6, step: 0.01 },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, si = params.knobs.shoe.options.indexOf(p.shoe), r = c.rng(p.seed * 6151 + si * 97 + 3);
  const w = p.weight, su = p.suction, sp = p.splash, rel = p.release;
  const shoe = [
    { thump: 82, click: [1300, 0.8], clickG: 0.55, pop: 1, slap: 0 },
    { thump: 105, click: [2600, 1.3], clickG: 0.35, pop: 1.15, slap: 0 },
    { thump: 135, click: [850, 0.7], clickG: 0.15, pop: 1.4, slap: 1 },
  ][si];
  const tp = 0.13 + 0.07 * w + 0.06 * r(), end = tp + rel + 0.3, out = new Float32Array(c.seconds(end, sr));
  const bub = (f, d, rise, att) => {
    const n = c.seconds(d, sr), b = new Float32Array(n), k = Math.exp(-1 / (sr * d * 0.3));
    let ph = 0, a = 1;
    for (let i = 0; i < n; i++) { b[i] = Math.sin(ph) * a * Math.min(1, i / (att * sr)); a *= k; ph += c.TAU * f * (1 + rise * i / n) / sr; }
    return c.fade(b, 2, sr);
  };
  // contact: sole click, body thump, bare-skin slap, sneaker rubber chirp
  const f0 = shoe.thump * (1 - 0.3 * w) * (0.97 + 0.06 * r());
  c.mix(out, c.burst(r, 0.016, "bp", shoe.click[0] * (0.9 + 0.2 * r()), shoe.click[1], 0.0006, 0.004, sr), 0, shoe.clickG, sr);
  c.mix(out, c.ring([[f0, 1], [f0 * 2.13, 0.3], [f0 * 3.4, 0.1]], 0.32, 0.035 + 0.08 * w, sr), 0.002, 0.35 + 0.55 * w, sr);
  if (shoe.slap) c.mix(out, c.burst(r, 0.025, "bp", 1600 + 600 * r(), 0.9, 0.0005, 0.007, sr), 0, 0.6, sr);
  if (si === 1) {
    const cf = 1600 + 300 * r(), ch = c.osc("sine", (t) => cf + 140 * Math.sin(t * 190), c.seconds(0.03, sr), sr);
    c.multiply(ch, c.env(ch.length, 0.002, 0.008, sr)); c.mix(out, c.fade(ch, 3, sr), 0.004, 0.12, sr);
  }
  // squelch: mud compressing under the foot, a low flickering wash with falling cutoff
  const sn = c.seconds(0.1 + 0.16 * w, sr), sq = c.noise(r, sn), lq = c.onepole(sr), lq2 = c.onepole(sr), kq = Math.exp(-1 / (sr * (0.03 + 0.05 * w)));
  let fl = 1, nx = 0, e = 1;
  for (let i = 0; i < sn; i++) {
    if (i >= nx) { fl = 0.3 + 0.7 * r(); nx = i + Math.round(sr * (0.003 + 0.009 * r())); }
    const fc = 1500 - 1100 * i / sn + 300 * shoe.slap;
    sq[i] = lq2(lq(sq[i], fc), fc * 1.5) * fl * e * Math.min(1, i / (0.004 * sr)); e *= kq;
  }
  c.mix(out, c.fade(sq, 5, sr), 0.003, 1.4 + 0.7 * w, sr);
  const mb = 2 + Math.round(3 * w + 3 * r());
  for (let b = 0; b < mb; b++) c.mix(out, bub(220 + 380 * r(), 0.02 + 0.03 * r(), 0.6, 0.001), 0.01 + r() * 0.12, 0.12 + 0.15 * r(), sr);
  // splash: a wash and bright droplets thrown from the puddle
  if (sp > 0) {
    c.mix(out, c.burst(r, 0.08, "bp", 2300 + 800 * r(), 0.8, 0.002, 0.025, sr), 0.004, 0.55 * sp, sr);
    const dr = Math.round(3 + 28 * sp);
    for (let d = 0; d < dr; d++) c.mix(out, bub(1100 + 3000 * r(), 0.01 + 0.03 * r(), 0.4 + 0.8 * r(), 0.0006), 0.008 + Math.pow(r(), 1.5) * 0.16, (0.08 + 0.2 * r()) * sp, sr);
  }
  // pull-out: a low, steep-filtered sputtering draw that swells toward the break
  const pn = c.seconds(rel, sr), pl = c.noise(r, pn), lp = c.onepole(sr), lp2 = c.onepole(sr), ds = Math.round(0.008 * sr);
  fl = 1; nx = 0;
  for (let i = 0; i < pn; i++) {
    if (i >= nx) { fl = r() < 0.75 ? 0.4 + 0.6 * r() : 0.1; nx = i + Math.round(sr * (0.004 + 0.012 * r())); }
    const x = i / pn, fc = 200 + 450 * x + 250 * su;
    pl[i] = lp2(lp(pl[i], fc), fc) * fl * (0.25 + 0.75 * x * x) * Math.min(1, i / (0.01 * sr)) * Math.min(1, (pn - i) / ds);
  }
  c.mix(out, pl, tp, (0.5 + 2.2 * su) * (0.6 + 0.4 * w), sr);
  // gurgle: discrete suction bubbles rising in pitch and crowding toward the moment the seal breaks
  const gb = Math.round(3 + rel * (10 + 50 * su));
  for (let b = 0; b < gb; b++) {
    const x = Math.sqrt(r());
    c.mix(out, bub((140 + 260 * r()) * (1 + 0.8 * x), 0.02 + 0.03 * r(), 0.9, 0.0015), tp + rel * x * 0.97, (0.08 + 0.2 * r()) * (0.3 + 0.7 * su) * (0.4 + 0.6 * x), sr);
  }
  const pk = c.seconds(0.07, sr), pop = new Float32Array(pk), kp = Math.exp(-1 / (sr * (0.008 + 0.01 * su)));
  let ph = 0, a = 1;
  for (let i = 0; i < pk; i++) { const t = i / sr; pop[i] = Math.sin(ph) * a * Math.min(1, i / (0.0006 * sr)); a *= kp; ph += c.TAU * shoe.pop * (130 + (350 + 450 * su) * Math.min(1, t / 0.022)) / sr; }
  c.mix(out, c.fade(pop, 4, sr), tp + rel, 0.15 + 0.75 * su, sr);
  c.mix(out, c.burst(r, 0.03, "lp", 700 + 500 * su, 0.8, 0.001, 0.008, sr), tp + rel, 0.2 + 0.4 * su, sr);
  const rb = Math.round(1 + 5 * su);
  for (let b = 0; b < rb; b++) c.mix(out, bub(280 + 500 * r(), 0.025 + 0.035 * r(), 0.8, 0.001), tp + rel + 0.01 + r() * 0.1, (0.1 + 0.18 * r()) * su, sr);
  // drips falling back off the foot
  const dp = Math.round(1 + 9 * sp);
  for (let d = 0; d < dp; d++) c.mix(out, bub(1400 + 2400 * r(), 0.012 + 0.025 * r(), 0.7, 0.0005), tp + rel + 0.02 + r() * 0.2, (0.06 + 0.14 * r()) * (0.3 + 0.7 * sp), sr);
  c.finish(out, 0.92, 1.2);
  c.gain(out, 0.7 + 0.3 * w);
  c.fade(out, 15, sr);
  return { samples: out };
}
