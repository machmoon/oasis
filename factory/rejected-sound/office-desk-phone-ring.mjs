// Desk phone ring: a ring cadence in three phone types. Analog bell = clapper rattling between two gongs (individual struck strikes, ringing tail after each burst); digital VoIP = double warble bursts of two-tone chirps; conference speaker = rising three-note chime through a small-speaker band. Rings are auto-fitted so the last one always finishes before the file ends.
export const meta = {
  title: "Desk Phone Ring", kind: "sfx", format: "sound", duration: 3, price: 2, author: "foleyroom", payout: "foleyroom@creators.oasis.example", kit: "Office", description: "An office desk phone ringing its cadence, as an analog bell, a digital VoIP double warble or a conference speaker chime; for open-plan office scenes and ringing-phone cues.",
  tags: ["phone", "ring", "office", "desk", "telephone", "bell", "voip", "foley"],
};
export const params = { knobs: {
  type: { type: "choice", label: "Phone type", default: "analog bell", options: ["digital VoIP", "analog bell", "conference speaker"] },
  pitch: { type: "range", label: "Ring pitch", default: 0.5, min: 0, max: 1, step: 0.01 },
  rate: { type: "range", label: "Ring cadence (slow to fast)", default: 0.5, min: 0, max: 1, step: 0.01 },
  volume: { type: "range", label: "Volume", default: 0.8, min: 0, max: 1, step: 0.01 },
  distance: { type: "range", label: "Distance", default: 0.2, min: 0, max: 1, step: 0.01 },
  room: { type: "toggle", label: "Room tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + params.knobs.type.options.indexOf(p.type) * 29 + 3);
  const n = c.seconds(3, sr), out = new Float32Array(n);
  const pm = Math.pow(2, (p.pitch - 0.5) * 1.2);
  const burst = 0.85 - 0.35 * p.rate, gap = 0.75 - 0.35 * p.rate;
  let t0 = 0.04 + r() * 0.03;
  while (t0 + burst + 0.4 < 2.9) {
    const b = new Float32Array(c.seconds(burst + 0.45, sr)), amp = 0.85 + 0.15 * r();
    if (p.type === "analog bell") {
      const rate = 21 * (0.93 + 0.14 * r()), hits = Math.round(burst * rate), f1 = 1180 * pm * (0.985 + r() * 0.03);
      const mk = (side, dec, len) => c.ring([[f1 * side, 1], [f1 * side * 2.41, 0.5], [f1 * side * 3.9, 0.22], [f1 * side * 5.4, 0.1], [f1 * 0.62, 0.3]], len, dec, sr);
      const strike = [mk(1, 0.04, 0.2), mk(1.12, 0.04, 0.2)], last = [mk(1, 0.14, 0.45), mk(1.12, 0.14, 0.45)];
      const tick = c.burst(r, 0.005, "bp", 4500, 2, 0.0003, 0.0015, sr), knock = c.ring([[260 * pm, 1], [510 * pm, 0.4]], 0.03, 0.008, sr);
      for (let h = 0; h < hits; h++) {
        const t = Math.max(0, h / rate + (r() - 0.5) * 0.003), a = Math.min(1, 0.4 + h / 4) * (0.75 + 0.25 * r());
        c.mix(b, h === hits - 1 ? last[h % 2] : strike[h % 2], t, 0.5 * a, sr);
        c.mix(b, tick, t, 0.18 * a, sr);
        c.mix(b, knock, t, 0.2 * a, sr);
      }
    } else if (p.type === "digital VoIP") {
      const fa = 880 * pm, fb = 1175 * pm, step = 0.04, m = Math.floor(step * sr), lp = c.biquad("lp", 5000, 0.7, sr);
      const chirp = [fa, fb].map((f) => {
        const s = new Float32Array(m), o = c.osc("square", f, m, sr, { duty: 0.4 }), o2 = c.osc("sine", f * 2, m, sr, {}), e = c.adsr(m, { attack: 0.004, sustain: 0.85, decay: 0.008 }, sr);
        for (let i = 0; i < m; i++) s[i] = (0.3 * o[i] + 0.4 * o2[i]) * e[i];
        return s;
      });
      const per = Math.floor(burst * 0.4 / step);
      for (let k = 0; k < 2; k++) for (let h = 0; h < per; h++) c.mix(b, chirp[h % 2], k * burst * 0.52 + h * step, 0.8, sr);
      c.filter(b, lp);
    } else {
      const sp = 0.14 - 0.04 * p.rate, notes = [660, 830, 990], reps = Math.max(1, Math.round(burst / 0.55));
      for (let k = 0; k < reps; k++) for (let j = 0; j < 3; j++) {
        const f = notes[j] * pm * (0.995 + r() * 0.01), t = k * 0.5 + j * sp;
        c.mix(b, c.ring([[f, 1], [2 * f, 0.3], [3 * f, 0.12]], 0.3, 0.1, sr), t, (0.55 + 0.2 * j) * (0.85 + 0.15 * r()), sr);
        c.mix(b, c.burst(r, 0.006, "bp", 2800, 1.5, 0.0005, 0.002, sr), t, 0.12, sr);
      }
      const hp = c.biquad("hp", 300, 0.7, sr), lp = c.biquad("lp", 3800, 0.7, sr), box = c.biquad("bp", 520, 3, sr);
      for (let i = 0; i < b.length; i++) { const x = b[i]; b[i] = lp(hp(x)) + 0.4 * box(x); }
    }
    c.fade(b, 4, sr);
    c.mix(out, b, t0, amp, sr);
    t0 += (burst + gap) * (0.94 + 0.12 * r());
  }
  const d = p.distance;
  c.filter(out, c.biquad("lp", 9000 - 7000 * d, 0.7, sr));
  c.gain(out, (0.3 + 0.7 * p.volume) * (1 - 0.65 * d));
  if (p.room) {
    const wet = c.reverb(out.slice(), { size: 0.5 + 0.3 * d, decay: 0.5, mixAmt: 1 }, sr);
    for (let i = 0; i < n; i++) out[i] += wet[i] * (0.16 + 0.3 * d);
  }
  c.finish(out, 0.9, 1.1);
  c.gain(out, 0.45 + 0.55 * p.volume);
  c.fade(out, 20, sr);
  return { samples: out };
}
