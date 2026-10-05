// Hologram dissolve: a steady detuned projector chord holds, then frays (stutter, bit-crush, wobble) and glides down while a thinning cloud of bright harmonic grains replaces it, plus sparse crackle and a short room tail.
export const meta = {
  title: "Hologram Dissolve", kind: "sfx", format: "sound", duration: 1.2, price: 3, author: "quietmachine", payout: "quietmachine@creators.oasis.example", kit: "Sci-fi Console", description: "A hologram tone that holds, then breaks apart into scattered digital grains as it falls in pitch; size, length, scatter, pitch drop and a room tail are knobs, every seed dissolves differently, for sci-fi UIs, comms cutoffs and projections shutting down.",
  tags: ["hologram", "sci-fi", "dissolve", "digital", "grains", "glitch", "fade-out", "interface"],
};
export const params = { knobs: {
  size: { type: "choice", label: "Size", default: "medium", options: ["small", "medium", "room"] },
  duration: { type: "range", label: "Duration", default: 1.2, min: 0.4, max: 3, step: 0.05 },
  scatter: { type: "range", label: "Scatter", default: 0.5, min: 0, max: 1, step: 0.01 },
  drop: { type: "range", label: "Pitch drop", default: 0.5, min: 0.1, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Room tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, si = Math.max(0, params.knobs.size.options.indexOf(p.size)), r = c.rng(p.seed * 613 + si * 97 + 3);
  const S = [{ f: 1320, g: 150, rv: 0.25, gl: 0.6, hp: 400 }, { f: 880, g: 190, rv: 0.5, gl: 1, hp: 250 }, { f: 520, g: 240, rv: 0.85, gl: 1.5, hp: 150 }][si];
  const dur = p.duration, sc = p.scatter, dr = p.drop, TAU = c.TAU;
  const tail = p.tail ? 0.12 + 0.4 * S.rv : 0.03;
  const n = c.seconds(dur + tail, sr), nb = c.seconds(dur, sr), out = new Float32Array(n);
  const h = 0.42 - 0.22 * sc + 0.08 * (r() - 0.5);
  const coh = x => x < h ? 1 : Math.pow(Math.max(0, 1 - (x - h) / (1 - h)), 1.4);
  const bend = x => Math.pow(2, -2.2 * dr * Math.pow(x, 1.4));
  const det = [1, 1.004 + 0.003 * r(), 1.5 * (1 + 0.003 * (r() - 0.5)), 2.003 + 0.005 * r(), 3.01 + 0.01 * r()], amps = [0.8, 0.5, 0.45, 0.35, 0.2], ph = [0, 0, 0, 0, 0];
  const blk = Math.round(sr * (0.014 + 0.012 * r())), fl = 9 + r() * 8, fph = r() * TAU, a = 0.012 * sr;
  let gate = 1, g = 1, held = 0, jt = 0, js = 0, sh = 0;
  for (let i = 0; i < nb; i++) {
    const x = i / nb, q = coh(x), br = 1 - q;
    if (i % blk === 0) { gate = r() < br * (0.35 + 0.5 * sc) ? 0.12 * r() : 1; jt = (r() - 0.5) * br * (0.01 + 0.04 * sc); }
    g += (gate - g) * 0.008; js += (jt - js) * 0.002;
    const f = S.f * bend(x) * (1 + js);
    let s = 0;
    for (let k = 0; k < 5; k++) { ph[k] += TAU * f * det[k] / sr; s += amps[k] * Math.sin(ph[k]); }
    if (i % (1 + Math.floor(br * (1 + 5 * sc))) === 0) { const st = 64 - 50 * br * (0.3 + 0.7 * sc); held = Math.round(s * st) / st; }
    sh += TAU * fl * (1 + 2 * br) / sr;
    const shim = 0.8 + 0.2 * Math.sin(sh + fph);
    out[i] += 0.3 * held * g * shim * q * Math.min(1, i / a);
  }
  const harm = [1, 1.5, 2, 3, 4, 5, 6, 8];
  const G = Math.min(1000, Math.round(S.g * (0.5 + sc) * (0.6 + dur / 2)));
  for (let k = 0; k < G; k++) {
    const x = h * 0.7 + (0.95 - h * 0.7) * Math.pow(r(), 1.3 + 0.5 * (1 - sc));
    let f = S.f * bend(x) * harm[Math.floor(r() * harm.length)] * (1 + (r() - 0.5) * 0.08 * sc);
    f = Math.min(f, sr * 0.42);
    const fe = f * (1 - 0.25 * dr * r());
    const len = c.seconds((0.003 + r() * (0.007 + 0.012 * (1 - sc)) * (1 - 0.5 * x)) * S.gl, sr);
    const amp = (0.1 + 0.25 * r()) * Math.pow(1 - x, 0.6) * (x < h ? 0.4 : 1);
    const sq = r() < 0.08 + 0.25 * sc, s0 = Math.round(x * dur * sr);
    let phs = r() * TAU;
    for (let i = 0; i < len && s0 + i < n; i++) {
      const u = i / len, w = Math.sin(Math.PI * Math.sqrt(u));
      phs += TAU * (f + (fe - f) * u) / sr;
      const v = Math.sin(phs);
      out[s0 + i] += amp * w * (sq ? (v > 0 ? 0.3 : -0.3) : v);
    }
  }
  const C = Math.round((3 + 22 * sc) * dur);
  for (let k = 0; k < C; k++) {
    const x = h + (0.92 - h) * Math.pow(r(), 1.3);
    c.mix(out, c.burst(r, 0.003, "hp", 5000 + r() * 4000, 0.7, 0.0003, 0.0009, sr), x * dur, (0.05 + 0.08 * r()) * (1 - x), sr);
  }
  if (p.tail) {
    const w = c.reverb(out, { size: S.rv, decay: 0.25 + 0.7 * S.rv, mixAmt: 0.1 + 0.12 * S.rv }, sr);
    if (w && w !== out) out.set(w.length > n ? w.subarray(0, n) : w);
  }
  c.filter(out, c.biquad("hp", S.hp, 0.7, sr));
  const tl = n - nb;
  for (let i = nb; i < n; i++) { const u = (n - i) / tl; out[i] *= u * u; }
  c.finish(out, 0.9);
  c.fade(out, 8, sr);
  return { samples: out };
}
