// Bridge room tone: a steady, quiet loopable bridge bed (smooth vent hiss, hull rumble, reactor hum) under evenly spread console beep motifs and data chatter; room size sets distance, tail and colour.
export const meta = {
  title: "Quiet Bridge Air", kind: "ambience", format: "sound", duration: 3, price: 4, author: "stormfront", payout: "stormfront@creators.oasis.example", kit: "Sci-fi Console", description: "A quiet, loopable three-second starship bridge room tone: steady ventilation hiss and reactor hum with distant console beeps and data chatter, to sit under dialogue in cockpit and command-deck scenes.",
  tags: ["sci-fi", "bridge", "room tone", "ambience", "loop", "console", "starship", "hum"],
};
export const params = { knobs: {
  room: { type: "choice", label: "Room size", default: "large", options: ["small", "large"] },
  activity: { type: "range", label: "Activity", default: 0.3, min: 0, max: 1, step: 0.01 },
  hiss: { type: "range", label: "Air hiss", default: 0.35, min: 0, max: 1, step: 0.01 },
  density: { type: "range", label: "Chirp density", default: 0.3, min: 0, max: 1, step: 0.01 },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, dur = 3, n = c.seconds(dur, sr), large = p.room === "large", a = p.activity, T = c.TAU;
  const r = c.rng(p.seed * 613 + (large ? 71 : 3)), out = new Float32Array(n);
  const lap = (buf, f) => { for (let k = 0; k < 2 * n; k++) { const i = k % n, y = f(buf[i]); if (k >= n) buf[i] = y; } return buf; };
  const rms = (buf) => { let s = 0; for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i]; return Math.sqrt(s / buf.length) || 1e-9; };
  const norm = (buf, t) => c.gain(buf, t / rms(buf));
  const put = (buf, src, at, g) => { const s0 = Math.floor(at * sr); for (let i = 0; i < src.length; i++) buf[(s0 + i) % n] += src[i] * g; };
  const air = c.pink(r, n), ahp = c.biquad("hp", large ? 120 : 300, 0.7, sr), box = c.biquad("bp", large ? 220 : 520, 1.2, sr);
  const lpf = (1600 + 6500 * p.hiss) * (large ? 0.7 : 1.1), alp = c.biquad("lp", lpf, 0.6, sr), alp2 = c.biquad("lp", lpf * 1.3, 0.6, sr);
  lap(air, (v) => { const y = alp2(alp(ahp(v))); return y + 0.8 * box(y); }); norm(air, 0.022 + 0.07 * p.hiss);
  const ph1 = r() * T, ph2 = r() * T;
  for (let i = 0; i < n; i++) { const u = T * i / n; out[i] += air[i] * (1 + 0.05 * Math.sin(u + ph1) + 0.03 * Math.sin(2 * u + ph2)); }
  const rum = c.noise(r, n), rbp = c.biquad("bp", large ? 65 : 110, 0.7, sr), rbp2 = c.biquad("lp", large ? 140 : 220, 0.7, sr);
  lap(rum, (v) => rbp2(rbp(v))); norm(rum, large ? 0.018 : 0.011);
  const f0 = Math.round(c.between(r, 48, 62) * dur) / dur, beat = (1 + Math.floor(r() * 3)) / dur, hp0 = r() * T;
  const hg = 0.012 + 0.012 * a;
  for (let i = 0; i < n; i++) {
    const w = T * f0 * i / sr;
    const h = 0.7 * Math.sin(w) + 0.5 * Math.sin(2 * w + T * beat * i / sr) + (0.25 + 0.3 * a) * Math.sin(3 * w + hp0) + (0.15 + 0.25 * a) * Math.sin(5 * w + 2 * hp0) + 0.12 * a * Math.sin(8 * w);
    out[i] += rum[i] + h * hg;
  }
  const ch = new Float32Array(n);
  const tone = (f, len, sweep, vib, amp, harm) => {
    const L = len * sr, m = Math.round(L + 0.09 * sr), x = new Float32Array(m), at = 0.003 * sr, rel = 0.016 * sr, vr = T * c.between(r, 16, 28) / sr; let ph = 0;
    for (let i = 0; i < m; i++) {
      ph += T * f * (1 + sweep * Math.min(1, i / L) + vib * Math.sin(vr * i)) / sr;
      const e = Math.min(1, i / at) * (i < L ? 1 - 0.25 * i / L : 0.75 * Math.exp(-(i - L) / rel));
      x[i] = (Math.sin(ph) + harm * Math.sin(3 * ph) + 0.5 * harm * Math.sin(5 * ph)) * e * amp;
    }
    return x;
  };
  const motifs = [[1, 1.25, 1.5], [1.5, 1.25, 1], [1, 1.5, 1, 1.5], [1], [2, 1], [1, 1, 1.333], [1, 2], [1.5, 1.122, 1, 0.75]];
  const chirps = Math.round(3 + 10 * p.density), slot = dur / chirps, off = r() * slot;
  for (let k = 0; k < chirps; k++) {
    let t = (k + 0.15 + 0.7 * r()) * slot + off;
    const mo = motifs[Math.floor(r() * motifs.length)], base = c.between(r, 800, 2600), amp = c.between(r, 0.35, 0.6), harm = r() < 0.4 ? c.between(r, 0.25, 0.4) : c.between(r, 0.02, 0.1);
    const single = mo.length === 1, len = single ? c.between(r, 0.12, 0.22) : c.between(r, 0.035, 0.07), gap = c.between(r, 0.015, 0.04);
    const sweep = single ? c.between(r, -0.1, 0.15) : 0, vib = single && r() < 0.5 ? 0.012 : 0;
    for (let j = 0; j < mo.length; j++) { put(ch, tone(base * mo[j], len, sweep, vib, amp * (j ? 0.85 : 1), harm), t % dur, 1); t += len + gap; }
  }
  const clusters = 2 + Math.round(4 * a), grains = Math.round(6 + 54 * a), cs = dur / clusters, coff = r() * cs;
  const centres = Array.from({ length: clusters }, (_, k) => (k + 0.25 + 0.5 * r()) * cs + coff);
  for (let g = 0; g < grains; g++) {
    const t = ((centres[g % clusters] + (r() + r() - 1) * 0.1) % dur + dur) % dur;
    put(ch, tone(1100 + 150 * Math.floor(r() * 9), c.between(r, 0.01, 0.025), 0, 0, c.between(r, 0.08, 0.16), 0.15), t, 1);
  }
  const dlp = c.biquad("lp", large ? 3200 : 7500, 0.7, sr); lap(ch, (v) => dlp(v));
  const sc = large ? 1.7 : 0.35, rt = large ? 2.4 : 0.25, damp = 1 - Math.exp(-T * (large ? 1800 : 8000) / sr);
  const combs = [29.7, 37.1, 41.1, 43.7].map((ms) => { const d = Math.max(8, Math.round(ms * sc * sr / 1000)); return { b: new Float32Array(d), i: 0, s: 0, g: Math.pow(10, -3 * d / sr / rt) }; });
  const aps = [5, 1.7].map((ms) => ({ b: new Float32Array(Math.round(ms * sr / 1000)), i: 0 }));
  const wet = new Float32Array(n);
  for (let k = 0; k < 2 * n; k++) {
    const x = ch[k % n]; let s = 0;
    for (const cb of combs) { const y = cb.b[cb.i]; cb.s += damp * (y - cb.s); cb.b[cb.i] = x + cb.g * cb.s; cb.i = (cb.i + 1) % cb.b.length; s += y; }
    for (const ap of aps) { const y = ap.b[ap.i], v = s + 0.6 * y; ap.b[ap.i] = v; ap.i = (ap.i + 1) % ap.b.length; s = y - 0.6 * v; }
    if (k >= n) wet[k % n] = s;
  }
  norm(wet, rms(ch) * (large ? 0.75 : 0.18));
  const dry = large ? 0.6 : 1;
  for (let i = 0; i < n; i++) out[i] += ch[i] * dry + wet[i];
  c.finish(out, 0.65);
  c.fade(out, 15, sr);
  return { samples: out };
}
