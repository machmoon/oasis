// Reverse clap riser into crash hit: reversed clap clusters accelerate and swell toward a brief suck-out gap, then a cracking transient, pitch-dropping sub thump and a crash of inharmonic partials over a modulated noise wash, all sent through a plate, hall or spring space.
export const meta = {
  title: "Reverse Clap Hit", kind: "impact", format: "sound", duration: 3, price: 3, author: "kickdrum", payout: "kickdrum@creators.oasis.example", kit: "Drum Machine", description: "A reversed analogue clap swells up into a big crash-and-thump hit, with plate, hall or spring space; a drum-machine stinger for transitions, drops and trailers.",
  tags: ["reverse", "clap", "riser", "crash", "impact", "stinger", "drum machine", "transition"],
};
export const params = { knobs: {
  space: { type: "choice", label: "Space", default: "plate", options: ["plate", "hall", "spring"] },
  rise: { type: "range", label: "Rise length", default: 0.5, min: 0, max: 1, step: 0.01 },
  weight: { type: "range", label: "Hit weight", default: 0.6, min: 0, max: 1, step: 0.01 },
  brightness: { type: "range", label: "Brightness", default: 0.5, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Long tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + params.knobs.space.options.indexOf(p.space) * 29 + 3);
  const total = 3.4, out = new Float32Array(c.seconds(total, sr));
  const rise = 0.4 + 0.8 * p.rise, gap = 0.07, hitT = rise + gap, br = p.brightness, w = p.weight;
  const claps = Math.round(7 + 12 * p.rise);
  for (let k = 0; k < claps; k++) {
    const u = (k + 0.2 + r() * 0.6) / claps, t = rise - rise * (1 - Math.pow(u, 0.7));
    const len = 0.12 + 0.06 * r(), n = c.seconds(len, sr), cl = new Float32Array(n);
    const f = 1000 + 1800 * br + 700 * r();
    for (let b = 0; b < 4; b++) c.mix(cl, c.burst(r, 0.012, "bp", f * (0.85 + 0.3 * r()), 1.8, 0.0005, 0.005, sr), b * (0.007 + 0.006 * r()), 0.5 + 0.4 * r(), sr);
    c.mix(cl, c.burst(r, 0.08, "bp", f * 0.9, 1.2, 0.001, 0.028, sr), 0.03, 0.55, sr);
    cl.reverse();
    c.mix(out, cl, Math.max(0, t - len + 0.03), 0.1 + 0.65 * u * u, sr);
  }
  const sn = c.seconds(rise, sr), sw = c.noise(r, sn), op = c.onepole(sr);
  for (let i = 0; i < sn; i++) { const u = i / sn; sw[i] = op(sw[i], 1200 + 5000 * br * u) * u * u * u * 0.25; }
  c.mix(out, sw, 0, 1, sr);
  for (let i = c.seconds(rise - 0.02, sr); i < c.seconds(hitT, sr); i++) out[i] *= 0.15;
  c.mix(out, c.burst(r, 0.02, "hp", 1800 + 2500 * br, 0.7, 0.0004, 0.006, sr), hitT, 0.9, sr);
  c.mix(out, c.burst(r, 0.05, "bp", 1500, 0.9, 0.0008, 0.015, sr), hitT, 0.5 * (0.5 + 0.5 * w), sr);
  const tn = c.seconds(0.5 + 0.5 * w, sr);
  const th = c.osc("sine", (t) => 42 + 75 * Math.exp(-t * 22) * (0.8 + 0.4 * w), tn, sr);
  const te = c.env(tn, 0.002, 0.12 + 0.25 * w, sr);
  for (let i = 0; i < tn; i++) th[i] *= te[i];
  c.mix(out, th, hitT, 0.5 + 0.7 * w, sr);
  const cd = p.tail ? 1.8 : 0.7, cn = c.seconds(cd + 0.2, sr), cr = new Float32Array(cn);
  const base = 330 + 250 * br;
  for (let m = 0; m < 12; m++) {
    const f = base * (1 + m * 0.73 + r() * 0.6) * (1 + 0.3 * br), a = 0.15 + 0.35 * r();
    c.mix(cr, c.ring([[f, a]], cd * (0.35 + 0.65 * r()), 0.1 + 0.3 * r() * cd, sr, 1), 0, 0.4, sr);
  }
  const wn = c.noise(r, cn), hp = c.biquad("hp", 2200 + 3500 * br, 0.7, sr), we = c.env(cn, 0.002, cd * 0.28 + 0.1, sr), sm = c.onepole(sr);
  let g = 1;
  for (let i = 0; i < cn; i++) { if (i % 90 === 0) g = 0.5 + 0.5 * r(); wn[i] = hp(wn[i]) * (we[i] * 0.8 + 0.2 * we[i] * we[i]) * (0.6 + 0.4 * sm(g, 300)); }
  c.mix(cr, wn, 0, 0.9 * (0.5 + 0.5 * w), sr);
  c.mix(out, cr, hitT, 0.7, sr);
  const size = { plate: 0.5, hall: 0.85, spring: 0.3 }[p.space], dec = (p.tail ? 1 : 0.5) * size;
  const wet = c.reverb(out, { size, decay: dec, mixAmt: p.space === "hall" ? 0.28 : 0.22 }, sr);
  const res = wet && wet.length ? wet : out;
  if (p.space === "spring") { const s = c.biquad("bp", 1800, 1.2, sr); for (let i = 0; i < res.length; i++) res[i] = 0.7 * res[i] + 0.3 * s(res[i]) * (1 + Math.sin(i / sr * 38)); }
  const fin = new Float32Array(c.seconds(total, sr));
  for (let i = 0; i < fin.length && i < res.length; i++) fin[i] = res[i];
  const e = fin.length, tl = c.seconds(p.tail ? 0.5 : 0.25, sr);
  for (let i = 0; i < tl; i++) fin[e - 1 - i] *= i / tl;
  c.finish(fin, 0.9, 1.2);
  c.fade(fin, 3, sr);
  return { samples: fin };
}
