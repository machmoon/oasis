// Owl Notify: a two-note "hoo-hoo" notification. Each note is a tonal body (additive partials per voice, pitch contour,
// delayed vibrato) plus a voice-coloured breath layer and an onset chiff; the tail adds answering echoes and a room.
export const meta = {
  title: "Owl Call Chime", kind: "ui", format: "sound", duration: 0.75, price: 1, author: "quietmachine", payout: "quietmachine@creators.oasis.example", kit: "Forest at Night", description: "A stylized two-note owl hoot for notifications and alerts, voiced as a wooden flute, an ocarina or an arcade synth; every seed is a slightly different call.",
  tags: ["owl", "hoot", "notification", "ui", "alert", "flute", "ocarina", "forest"],
};
export const params = { knobs: {
  voice: { type: "choice", label: "Voice", default: "wooden flute", options: ["wooden flute", "ocarina", "synth"] },
  pitch: { type: "range", label: "Pitch (Hz)", default: 520, min: 340, max: 1200, step: 1 },
  interval: { type: "range", label: "Two-note interval (semitones)", default: -3, min: -12, max: 12, step: 1 },
  softness: { type: "range", label: "Softness", default: 0.4, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
const V = {
  "wooden flute": { h: [[1, 1], [2, 0.22], [3, 0.1], [4, 0.04]], breath: 0.4, vib: 5.2, vibD: 0.007, att: 0.016, bend: 0.025, blip: 0, chiff: 0.3, rel: 0.34 },
  ocarina: { h: [[1, 1], [2, 0.06], [3, 0.03]], breath: 0.12, vib: 4.4, vibD: 0.003, att: 0.012, bend: 0.012, blip: 0, chiff: 0.12, rel: 0.3 },
  synth: { h: [[1, 1], [3, 0.33], [5, 0.2], [7, 0.14], [9, 0.1]], breath: 0.03, vib: 7, vibD: 0.012, att: 0.004, bend: 0, blip: 0.5, chiff: 0, rel: 0.22 },
};
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + params.knobs.voice.options.indexOf(p.voice) * 37 + 11);
  const v = V[p.voice], s = p.softness;
  const d1 = 0.1 + r() * 0.09, gap = 0.04 + r() * 0.05, d2 = 0.18 + r() * 0.12;
  const f1 = p.pitch * (0.985 + r() * 0.03), f2 = f1 * Math.pow(2, p.interval / 12) * (0.992 + r() * 0.016);
  const t1 = 0.008, t2 = t1 + d1 + gap, end = t2 + d2, total = end + (p.tail ? 0.4 : 0.03);
  const out = new Float32Array(c.seconds(total, sr));
  const note = (f, dur, amp) => {
    const n = c.seconds(dur, sr), x = new Float32Array(n), nz = c.noise(r, n);
    const att = v.att * (0.6 + 2.4 * s), rel = dur * (v.rel + 0.15 * s), relStart = dur - rel;
    const bend = v.bend * (0.5 + r()), droop = 0.015 + 0.04 * r(), vph = r() * c.TAU, vdel = 0.05 + r() * 0.05;
    const hs = v.h.map(([k, a], j) => [k, j ? a * (1 - 0.85 * s) : a]);
    const bp = c.biquad("bp", f * (1.4 + 0.4 * r()), 1.2, sr), bn = v.breath * (0.5 + 0.6 * s);
    let ph = 0;
    for (let i = 0; i < n; i++) {
      const t = i / sr, u = t / dur;
      const vib = v.vibD * Math.min(1, t / vdel) * Math.sin(c.TAU * v.vib * t + vph);
      const fi = f * (1 + bend * (1 - Math.exp(-t / 0.018)) - droop * u * u + vib) * (1 + v.blip * Math.exp(-t / 0.008));
      ph += c.TAU * fi / sr;
      let y = 0;
      for (let h = 0; h < hs.length; h++) y += hs[h][1] * Math.sin(hs[h][0] * ph);
      const e = Math.min(1, t / att) * (t > relStart ? 0.5 + 0.5 * Math.cos(Math.PI * (t - relStart) / rel) : 1);
      x[i] = (y * 0.7 + bp(nz[i]) * bn) * e * amp;
    }
    return x;
  };
  c.mix(out, note(f1, d1, 0.85), t1, 1, sr);
  c.mix(out, note(f2, d2, 1), t2, 1, sr);
  if (v.chiff > 0) {
    c.mix(out, c.burst(r, 0.025, "bp", f1 * 3, 1, 0.001, 0.007, sr), t1, v.chiff * (1 - 0.6 * s), sr);
    c.mix(out, c.burst(r, 0.025, "bp", f2 * 3, 1, 0.001, 0.007, sr), t2, v.chiff * (1 - 0.6 * s), sr);
  }
  if (p.tail) {
    const dry = c.filter(out.slice(0, c.seconds(end + 0.01, sr)), c.biquad("lp", 1400 + 1500 * (1 - s), 0.7, sr));
    const dt = 0.14 + r() * 0.05;
    c.mix(out, dry, dt, 0.32, sr);
    c.mix(out, dry, dt * 2 + r() * 0.02, 0.13, sr);
    c.reverb(out, { size: 0.6, decay: 0.6 + 0.2 * s, mixAmt: 0.35 + 0.1 * s }, sr);
  }
  const fhi = Math.max(f1, f2);
  c.filter(out, c.biquad("lp", Math.max(fhi * 2.5, 2200 + 10000 * (1 - s)), 0.7, sr));
  c.finish(out, 0.85);
  c.fade(out, 5, sr);
  return { samples: out };
}
