// Deck boots: a short walk on starship grating, plate or carpet. Each step rolls heel to toe on one shared panel, whose small detuned twin modes ring and beat over a weighted thump. Grate adds bar rattle, plate a hollow boom, carpet a muffled fibre scuff, all in a small room.
export const meta = {
  title: "Deck Plating Boots", kind: "foley", format: "sound", duration: 2.4, price: 2, author: "quietmachine", payout: "quietmachine@creators.oasis.example", kit: "Sci-fi Console", description: "A short walk of boots across starship deck grating, steel plate or bridge carpet; pace, weight, metal ring and step count are knobs and every seed is a fresh walk.",
  tags: ["footsteps", "boots", "metal", "grating", "starship", "deck", "sci-fi", "foley"],
};
export const params = { knobs: {
  surface: { type: "choice", label: "Surface", default: "grate", options: ["grate", "plate", "carpet"] },
  pace: { type: "range", label: "Pace (steps/s)", default: 1.8, min: 1, max: 3, step: 0.05 },
  weight: { type: "range", label: "Weight", default: 0.5, min: 0, max: 1, step: 0.01 },
  ring: { type: "range", label: "Ring", default: 0.4, min: 0, max: 1, step: 0.01 },
  steps: { type: "range", label: "Step count", default: 4, min: 1, max: 6, step: 1 },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, S = p.surface, si = params.knobs.surface.options.indexOf(S);
  const r = c.rng(p.seed * 7349 + si * 101 + 3), w = p.weight;
  const rk = 1 / (1 + 0.4 * (p.pace - 1)), rg = p.ring * rk;
  const count = Math.max(1, Math.round(p.steps)), iv = Math.min(1 / p.pace, 3.1 / Math.max(1, count - 1));
  const tempo = 0.94 + 0.12 * r(), limp = (r() - 0.5) * 0.1, onsets = [0];
  for (let s = 1; s < count; s++) onsets.push(onsets[s - 1] + iv * tempo * (1 + (s % 2 ? limp : -limp)) + (r() - 0.5) * 0.03);
  const tail = 0.3 + (S === "plate" ? 0.55 : S === "grate" ? 0.3 : 0.1) * rg + 0.1 * w;
  const slen = Math.min(tail + 0.12, 1.2), n = c.seconds(onsets[count - 1] + slen + 0.05, sr), out = new Float32Array(n);
  const tw = (f, a) => [[f, a], [f * (1.003 + 0.009 * r()), a * (0.5 + 0.3 * r())]];
  const base = S === "grate"
    ? [...tw(c.between(r, 1100, 2000), 0.6 + 0.4 * r()), ...tw(c.between(r, 2000, 3000), 0.5 + 0.4 * r()), ...tw(c.between(r, 3000, 3900), 0.4 + 0.4 * r()), ...tw(280 + 90 * r(), 0.6)]
    : S === "plate"
    ? [...tw(c.between(r, 150, 250), 1), ...tw(c.between(r, 400, 580), 0.6), ...tw(c.between(r, 900, 1350), 0.35), ...tw(c.between(r, 2200, 2900), 0.15)]
    : tw(c.between(r, 130, 190), 1);
  const panel = (foot) => base.map(([f, a]) => [f * (1 + foot * 0.006 + (r() - 0.5) * 0.012), a * (0.75 + 0.5 * r())]);
  const thumpHz = (88 - 42 * w) * (0.95 + 0.1 * r());
  const contact = (buf, at, a, toe, modes) => {
    const tk = toe ? 0.45 : 1, f0 = thumpHz * (0.97 + 0.06 * r()) * (toe ? 1.2 : 1);
    c.mix(buf, c.ring([[f0, 1], [f0 * 2.07, 0.3]], 0.22, 0.02 + 0.07 * w, sr), at + 0.002, a * (0.3 + 0.6 * w) * tk, sr);
    const cl = { grate: ["hp", 2400 + 1200 * r(), 0.8], plate: ["bp", 1500 + 900 * r(), 1.2], carpet: ["lp", 700 + 500 * w, 0.7] }[S];
    const att = toe ? 0.003 + 0.002 * r() : 0.0005 + 0.0012 * r();
    c.mix(buf, c.burst(r, toe ? 0.03 : 0.02, toe && S !== "carpet" ? "lp" : cl[0], toe ? cl[1] * 0.7 : cl[1], cl[2], att, S === "carpet" ? 0.012 : toe ? 0.008 : 0.004, sr), at, a * (toe ? 0.25 : 0.7), sr);
    if (S === "grate") {
      c.mix(buf, c.ring(modes, 0.5, 0.012 + 0.17 * rg, sr), at + 0.001, a * (0.18 + 0.3 * rg) * tk, sr);
      const g = Math.round((6 + 16 * w) * tk);
      for (let k = 0; k < g; k++) c.mix(buf, c.burst(r, 0.004, "bp", 2800 + r() * 4500, 5, 0.0003, 0.001, sr), at + 0.004 + Math.pow(r(), 1.5) * (0.04 + 0.04 * w), a * (0.1 + 0.2 * r()) * (0.4 + 0.6 * w) * tk, sr);
    } else if (S === "plate") {
      c.mix(buf, c.ring(modes, 0.9, 0.03 + 0.4 * rg, sr), at + 0.002, a * (0.22 + 0.35 * rg) * (0.7 + 0.5 * w) * tk, sr);
      c.mix(buf, c.burst(r, 0.05, "lp", 900 + 500 * w, 0.9, 0.002, 0.015, sr), at, a * 0.35 * tk, sr);
    } else {
      c.mix(buf, c.ring(modes, 0.3, 0.008 + 0.07 * rg, sr), at + 0.004, a * (0.06 + 0.25 * rg) * tk, sr);
      c.mix(buf, c.burst(r, 0.07, "bp", 1500 + 900 * r(), 0.8, 0.006, 0.025, sr), at + 0.008, a * 0.28 * tk, sr);
    }
  };
  for (let s = 0; s < count; s++) {
    const step = new Float32Array(c.seconds(slen, sr)), modes = panel(s % 2 ? 1 : -1);
    const lv = (0.85 + 0.2 * r()) * (s % 2 ? 0.88 : 1), roll = (0.016 + 0.016 * r()) * (1.2 - 0.1 * (p.pace - 1));
    contact(step, 0, lv, false, modes);
    contact(step, roll, lv * (0.6 + 0.2 * r()), true, modes);
    if (S === "carpet") c.filter(step, c.biquad("lp", 1800 + 900 * rg, 0.7, sr));
    c.fade(step, 15, sr);
    c.mix(out, step, onsets[s], 1, sr);
  }
  const rv = c.reverb(out, { size: 0.3 + 0.4 * rg, decay: 0.3 + 0.5 * rg, mixAmt: (0.06 + 0.12 * rg) * (1.25 - 0.25 * p.pace) }, sr);
  const res = new Float32Array(n), src = rv && rv.length ? rv : out;
  for (let i = 0; i < n && i < src.length; i++) res[i] = src[i];
  c.finish(res, 0.9, 1.1);
  c.fade(res, 20, sr);
  for (let i = 0; i < 16 && i < n; i++) res[i] *= i / 16;
  return { samples: res };
}
