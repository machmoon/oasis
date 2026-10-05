// Wind Whisper: a gust through a crack that almost speaks. A glottis-like buzz (harmonic stack with wandering pitch) and turbulent air noise both pass through gliding vowel formants (state-preserving resonators), are shaped by an irregular gust envelope, and optionally ring into a damped comb-filter room tail.
export const meta = {
  title: "Wind Whisper", kind: "sfx", format: "sound", duration: 3, price: 3, author: "hollowbody", payout: "hollowbody@creators.oasis.example", kit: "Horror House", description: "A breathy gust of wind forcing through a crack that almost forms a voice, for haunted-house doorways, keyholes and chimneys.",
  tags: ["wind", "whisper", "horror", "voice", "gust", "haunted", "keyhole", "eerie"],
};
export const params = { knobs: {
  gap: { type: "choice", label: "Gap size", default: "keyhole", options: ["keyhole", "window", "chimney"] },
  breathiness: { type: "range", label: "Breathiness", default: 0.6, min: 0, max: 1, step: 0.01 },
  vowel: { type: "range", label: "Vowel shape", default: 0.5, min: 0, max: 1, step: 0.01 },
  pitch: { type: "range", label: "Pitch", default: 0.5, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Room tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + params.knobs.gap.options.indexOf(p.gap) * 29 + 3);
  const bodyDur = 2.0, n = c.seconds(p.tail ? 3 : 2.2, sr), body = c.seconds(bodyDur, sr);
  const g = { keyhole: [1.5, 1.0, 0.55], window: [1, 0.75, 0.9], chimney: [0.6, 0.5, 1.3] }[p.gap];
  const f0 = (110 + 150 * p.pitch) * g[0] * (0.97 + r() * 0.06);
  const ph = [r(), r(), r()], wob = [0.7 + r() * 0.8, 1.3 + r() * 1.2];
  const gust = new Float32Array(body);
  let smooth = 0, sm2 = 0;
  const peakAt = 0.35 + r() * 0.2;
  for (let i = 0; i < body; i++) {
    const t = i / sr, u = t / bodyDur;
    if (i % 512 === 0) smooth += ((r() - 0.5) * 1.1 - smooth) * 0.4;
    sm2 += ((smooth) - sm2) * 0.002;
    const s = u < peakAt ? Math.sin(Math.PI / 2 * u / peakAt) : Math.cos(Math.PI / 2 * (u - peakAt) / (1 - peakAt));
    gust[i] = s * s * c.clamp(0.7 + 0.25 * Math.sin(t * wob[0] * 3 + ph[0] * 6) + sm2 + 0.3 * smooth, 0.2, 1.3);
  }
  const voice = new Float32Array(body);
  let phase = 0;
  for (let i = 0; i < body; i++) {
    const t = i / sr;
    const f = f0 * (1 + 0.05 * Math.sin(t * wob[1] * 2.3 + ph[1] * 6) + 0.03 * Math.sin(t * 7 + ph[2] * 6) + 0.1 * (t / bodyDur - 0.5));
    phase += f / sr;
    let v = 0;
    for (let h = 1; h <= 14; h++) v += Math.sin(c.TAU * phase * h) / h;
    voice[i] = v;
  }
  const vowels = [[300, 870, 2240], [730, 1090, 2440], [270, 2290, 3010], [440, 1020, 2240]];
  const air = c.noise(r, body), out = new Float32Array(n);
  const vg = 0.9 * (1 - 0.8 * p.breathiness), ag = 0.35 + 1.1 * p.breathiness;
  const qv = 8 + 8 * (1 - p.breathiness), qa = 3 + 3 * p.vowel;
  const wv = [1, 0.7, 0.35], wa = [0.9, 0.9, 0.6];
  const v1 = [0, 0, 0], v2 = [0, 0, 0], a1 = [0, 0, 0], a2 = [0, 0, 0];
  const cv = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], ca = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  const res = (f, q) => { const R = Math.exp(-Math.PI * (f / q) / sr); return [2 * R * Math.cos(c.TAU * f / sr), -R * R, 1 - R]; };
  for (let i = 0; i < body; i++) {
    if (i % 32 === 0) {
      const t = i / sr / bodyDur, pos = c.clamp(p.vowel * 2.2 + 0.4 * Math.sin(t * 9 + ph[0] * 6) + 0.6 * t * (p.vowel + 0.3), 0, 2.99);
      const a = Math.floor(pos), fr = pos - a, A = vowels[a], B = vowels[a + 1];
      for (let k = 0; k < 3; k++) {
        const f = (A[k] + (B[k] - A[k]) * fr) * g[1] * (0.85 + 0.3 * (1 - g[2] * 0.4));
        cv[k] = res(f, qv); ca[k] = res(f * 1.05, qa);
      }
    }
    let vs = 0, as = 0;
    for (let k = 0; k < 3; k++) {
      const yv = cv[k][0] * v1[k] + cv[k][1] * v2[k] + cv[k][2] * voice[i]; v2[k] = v1[k]; v1[k] = yv; vs += yv * wv[k];
      const ya = ca[k][0] * a1[k] + ca[k][1] * a2[k] + ca[k][2] * air[i]; a2[k] = a1[k]; a1[k] = ya; as += ya * wa[k];
    }
    out[i] = (vs * vg * 2.5 + as * ag * 4) * gust[i];
  }
  const hiss = c.pink(r, body), hp = c.biquad("hp", 2500 * g[1], 0.7, sr);
  for (let i = 0; i < body; i++) out[i] += hp(hiss[i]) * gust[i] * 0.05 * (0.3 + p.breathiness);
  c.filter(out, c.biquad("lp", 5000 + 3000 * (1 - g[2] * 0.5), 0.7, sr));
  c.fade(out, 25, sr);
  if (p.tail) {
    const dry = Float32Array.from(out), dl = [0.037, 0.053, 0.071].map((d) => Math.round(d * sr * (0.8 + 0.5 * g[2])));
    for (let k = 0; k < 3; k++) {
      const D = dl[k], buf = new Float32Array(n); let lp = 0;
      for (let i = 0; i < n; i++) {
        const fb = i >= D ? buf[i - D] : 0;
        lp += (fb - lp) * 0.35;
        buf[i] = dry[i] + lp * 0.72;
        out[i] += (buf[i] - dry[i]) * 0.3;
      }
    }
  }
  c.finish(out, 0.85, 1.1);
  c.fade(out, 60, sr);
  return { samples: out };
}
