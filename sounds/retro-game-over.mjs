// Game over: a slow descending natural-minor jingle on a chip voice (square, triangle or 25% pulse). Near-legato notes fall in clear steps and sag flat, a snapped minor harmony and a quiet triangle bass sit under the line, and the last note droops with vibrato into an optional dotted echo tail.
export const meta = {
  title: "Last Credit", kind: "music-loop", format: "sound", duration: 2.7, price: 4, author: "kickdrum", payout: "kickdrum@creators.oasis.example", kit: "Retro Arcade", description: "A slow, sad 8-bit game-over jingle that falls through a minor line and droops on its last note; waveform, key, tempo, sadness, harmony and tail are knobs.",
  tags: ["game over", "chiptune", "8-bit", "jingle", "arcade", "sad", "stinger", "retro"],
};
export const params = { knobs: {
  waveform: { type: "choice", label: "Waveform", default: "square", options: ["square", "triangle", "pulse25"] },
  key: { type: "range", label: "Key (semitones)", default: 0, min: -6, max: 6, step: 1 },
  tempo: { type: "range", label: "Tempo rate", default: 1, min: 0.75, max: 1.5, step: 0.05 },
  sadness: { type: "range", label: "Sadness detune", default: 0.4, min: 0, max: 1, step: 0.01 },
  harmony: { type: "range", label: "Harmony", default: 0.5, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Fade tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + 29), sad = p.sadness, harm = p.harmony;
  const beat = 0.25 / p.tempo, del = beat * 1.5, root = 261.63 * Math.pow(2, p.key / 12);
  const lines = [[12, 10, 7, 5, 3, 2, 0], [7, 5, 3, 2, -1, 2, 0], [15, 12, 10, 7, 3, 2, 0]];
  const mel = lines[Math.floor(r() * 3)], minor = [0, 2, 3, 5, 7, 8, 10];
  const snap = (m) => { let h = m - 4; while (!minor.includes(((h % 12) + 12) % 12)) h--; return h; };
  const lastOn = 6 * beat, hold = 2.2 * beat;
  const total = Math.min(4, lastOn + hold + (p.tail ? 0.3 + del : 0.22));
  const out = new Float32Array(c.seconds(total, sr));
  const isTri = p.waveform === "triangle", duty = p.waveform === "pulse25" ? 0.25 : 0.5;
  const voice = (semi, t0, len, amp, last, tri, dt) => {
    const rel = last ? (p.tail ? 0.3 : 0.1) : 0.045, i0 = Math.round(t0 * sr);
    const n = Math.min(c.seconds(len + rel * 5, sr), out.length - i0);
    const f0 = root * Math.pow(2, semi / 12) * dt, dc = tri ? 0 : 2 * duty - 1;
    const vr = 4.2 + r() * 1.8, vd = last ? 0.08 + 0.45 * sad : 0.03 * sad, ph0 = r() * 6;
    const fall = last ? 0.4 + 2.2 * sad : 0.06 + 0.3 * sad;
    const k1 = Math.exp(-1 / (0.06 * sr)), k2 = Math.exp(-1 / (len * 1.2 * sr)), kr = Math.exp(-1 / (rel * sr));
    const lenS = len * sr, att = 0.004 * sr, slowOn = last && p.tail;
    let ph = r(), inc = 0, d1 = 1, d2 = 1, rr = 1;
    for (let i = 0; i < n; i++) {
      if ((i & 31) === 0) {
        const s = i / sr, u = Math.min(1, s / len);
        inc = f0 * Math.exp(0.05776 * (-fall * u * u + vd * Math.sin(c.TAU * vr * s + ph0) * Math.min(1, s / 0.2))) / sr;
      }
      const v = tri ? 4 * Math.abs(ph - 0.5) - 1 : (ph < duty ? 1 : -1) - dc;
      let e = (i < att ? i / att : 1) * (0.6 + 0.4 * d1); d1 *= k1;
      if (slowOn) { e *= 0.4 + 0.6 * d2; d2 *= k2; }
      if (i > lenS) { e *= rr; rr *= kr; }
      out[i0 + i] += amp * v * e;
      ph += inc; if (ph >= 1) ph -= 1;
    }
  };
  const lvl = isTri ? 1 : duty < 0.5 ? 0.7 : 0.55;
  for (let k = 0; k < 7; k++) {
    const last = k === 6, on = k === 0 ? 0.004 : k * beat + (r() - 0.5) * 0.014;
    const len = last ? hold : beat * (0.8 + r() * 0.06), sag = 1 - sad * 0.004 * k;
    const a = lvl * (1 - 0.03 * k) * (0.92 + r() * 0.16);
    voice(mel[k], on, len, a, last, isTri, sag);
    if (sad > 0.02) voice(mel[k], on, len, a * 0.35 * sad, last, isTri, sag * (1 + 0.008 * sad));
    if (harm > 0.01) voice(last ? -9 : snap(mel[k]), on + 0.002, len, a * 0.45 * harm, last, isTri, sag * 0.999);
    if (harm > 0.01 && (last || k % 2 === 0)) voice(last ? -12 : snap(mel[k]) - 12, on, last ? len : beat * 1.6, 0.35 * harm, last, true, sag);
  }
  c.filter(out, c.biquad("hp", 40, 0.7, sr));
  if (p.tail) {
    const d = c.seconds(del, sr), lp = c.onepole(sr);
    for (let i = d; i < out.length; i++) out[i] += 0.3 * lp(out[i - d], 2400);
  }
  const fl = c.seconds(p.tail ? 0.22 : 0.1, sr), st = out.length - fl;
  for (let i = Math.max(0, st); i < out.length; i++) out[i] *= 0.5 + 0.5 * Math.cos(Math.PI * (i - st) / fl);
  c.fade(c.finish(out, 0.9, 1.1), 12, sr);
  return { samples: out };
}
