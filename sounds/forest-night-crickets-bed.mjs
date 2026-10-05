// Cricket bed: loopable field of stridulating insects; per-insect pulse trains on a circular timeline, a wrapped far chorus, air floor and room.
export const meta = {
  title: "Night Crickets", kind: "ambience", format: "sound", duration: 3, price: 4, author: "stormfront", payout: "stormfront@creators.oasis.example", kit: "Forest at Night", description: "A loopable three-second bed of layered field, tree or katydid crickets with density, distance, chirp rate and temperature drift as knobs, for night forests, camps and countryside scenes.",
  tags: ["crickets", "night", "ambience", "insects", "forest", "loop", "summer", "nature"],
};
export const params = { knobs: {
  species: { type: "choice", label: "Species", default: "field", options: ["field", "tree", "katydid"] },
  density: { type: "range", label: "Density", default: 0.5, min: 0, max: 1, step: 0.01 },
  distance: { type: "range", label: "Distance", default: 0.3, min: 0, max: 1, step: 0.01 },
  rate: { type: "range", label: "Chirp rate (Hz)", default: 2, min: 0.5, max: 4, step: 0.05 },
  drift: { type: "range", label: "Temperature drift", default: 0.3, min: 0, max: 1, step: 0.01 },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, L = 3, n = c.seconds(L, sr), TAU = c.TAU;
  const r = c.rng(p.seed * 4241 + params.knobs.species.options.indexOf(p.species) * 197 + 11);
  const sp = {
    field: { f: 4600, np: [3, 5], pl: 0.016, pg: 0.034, rm: 1, gl: 0.05, h: 0.15, sync: 0, lv: 1 },
    tree: { f: 2900, np: [9, 12], pl: 0.013, pg: 0.024, rm: 0.9, gl: 0.02, h: 0.05, sync: 1, lv: 1 },
    katydid: { f: 7400, np: [2, 3], pl: 0.05, pg: 0.085, rm: 0.55, gl: 0.1, h: 0, sync: 0, lv: 1.3 },
  }[p.species];
  const loopRun = (buf, fn) => { for (let pass = 0; pass < 2; pass++) for (let i = 0; i < buf.length; i++) { const y = fn(buf[i]); if (pass) buf[i] = y; } return buf; };
  let nb = null;
  if (p.species === "katydid") { nb = c.noise(r, n); const bp = c.biquad("bp", Math.min(7000, sr * 0.4), 1.5, sr); loopRun(nb, bp); }
  const near = new Float32Array(n), far = new Float32Array(n);
  const chirp = (buf, t0, g, f, pr, np) => {
    const len = Math.floor(sp.pl / pr * sr);
    for (let q = 0; q < np; q++) {
      const st = Math.floor((t0 + q * sp.pg / pr) * sr), aq = g * (0.75 + 0.25 * q / Math.max(1, np - 1)) * (0.85 + 0.15 * r());
      let ph = r() * TAU;
      for (let s = 0; s < len; s++) {
        const x = s / len, w = Math.sin(Math.PI * x), e = w * w * aq;
        ph += TAU * f * (1 - sp.gl * x) / sr;
        const idx = (st + s) % n;
        let v = Math.sin(ph) + sp.h * Math.sin(2 * ph);
        if (nb) v = 0.45 * v + nb[idx] * (0.55 + 0.45 * Math.sin(TAU * 290 * s / sr)) * 1.6;
        buf[idx] += v * e;
      }
    }
  };
  const thin = Math.min(1, 2.2 / p.rate);
  const nNear = 1 + Math.round(8 * p.density * thin), nFar = 3 + Math.round(12 * p.density * thin);
  const gPhi = r() * TAU, syncPhase = r() * 0.5;
  for (let k = 0; k < nNear + nFar; k++) {
    const isFar = k >= nNear, depth = isFar ? 0.55 + 0.45 * r() : 0.5 * r();
    const g = sp.lv * (isFar ? 0.35 : 1) * (0.4 + 0.6 * r()) * (1 - 0.35 * depth) * (1 - 0.55 * p.distance);
    const f = sp.f * (0.95 + 0.1 * r());
    const rateI = p.rate * sp.rm * (sp.sync ? 0.99 + 0.02 * r() : 0.85 + 0.3 * r());
    const cnt = Math.max(1, Math.round(L * rateI)), per = L / cnt;
    const phase = sp.sync ? syncPhase + r() * 0.03 : r() * per;
    let np = sp.np[0] + Math.floor(r() * (sp.np[1] - sp.np[0] + 1));
    np = Math.min(np, Math.max(2, Math.floor(0.75 * per / sp.pg)));
    const phi = gPhi + r() * 1.5;
    for (let j = 0; j < cnt; j++) {
      const w = Math.sin(TAU * j / cnt + phi);
      let t = phase + j * per + p.drift * 0.25 * per * w + (r() - 0.5) * 0.004;
      t = ((t % L) + L) % L;
      chirp(isFar ? far : near, t, g, f * (1 + 0.05 * p.drift * w), 1 + 0.18 * p.drift * w, np);
    }
  }
  const chG = (0.1 + 0.08 * p.density) * (1 - 0.3 * p.distance), pc = Math.round(L / sp.pg) / L;
  for (let v = 0; v < 3; v++) {
    const fm = Math.round(sp.f * (0.93 + 0.14 * r()) * L) / L, cr = Math.max(1, Math.round(p.rate * L * (0.7 + 0.6 * r()))) / L;
    const p1 = r() * TAU, p2 = r() * TAU, p3 = r() * TAU, dw = Math.round(1 + 2 * r()) / L;
    for (let i = 0; i < n; i++) {
      const t = i / n * L, pu = Math.sin(TAU * pc * t + p2), sw = 0.55 + 0.45 * Math.sin(TAU * cr * t + p3);
      const fd = 1 + 0.004 * p.drift * Math.sin(TAU * dw * t + p3);
      far[i] += Math.sin(TAU * fm * t * fd + p1) * pu * pu * sw * chG;
    }
  }
  loopRun(near, c.biquad("lp", Math.min(sr * 0.45, 13000 - 9000 * p.distance), 0.7, sr));
  loopRun(far, c.biquad("lp", Math.min(sr * 0.45, (sp.f + 2500) - 1500 * p.distance), 0.7, sr));
  const bed = c.pink(r, n), bhp = c.biquad("hp", 400, 0.7, sr), blp = c.biquad("lp", 3000 - 1200 * p.distance, 0.7, sr);
  loopRun(bed, (x) => blp(bhp(x)));
  const bedG = 0.1 + 0.06 * p.distance;
  const dbl = new Float32Array(2 * n);
  for (let i = 0; i < n; i++) { const v = near[i] + far[i] + bed[i] * bedG; dbl[i] = v; dbl[i + n] = v; }
  const busy = 1 + 0.35 * p.density * p.rate;
  const rv = c.reverb(dbl, { size: 0.55 + 0.3 * p.distance, decay: (0.45 + 0.3 * p.distance) / Math.sqrt(busy), mixAmt: (0.1 + 0.25 * p.distance) / busy }, sr) || dbl;
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = rv[n + i];
  c.fade(c.finish(out, 0.8), 15, sr);
  return { samples: out };
}
