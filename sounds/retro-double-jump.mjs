// Retro double jump: a square takeoff sweep, then a higher stacked climb with stepped chord arpeggio. Frame-stepped pitch, 4-bit volume, contact chirps and an optional 8-bit echo tail.
export const meta = {
  title: "Double Jump", kind: "sfx", format: "sound", duration: 0.6, price: 2, author: "quietmachine", payout: "quietmachine@creators.oasis.example", kit: "Retro Arcade", description: "An 8-bit second-stage jump: a rising chip sweep followed by a higher fluttering arpeggio climb, for platformer double jumps and air dashes.",
  tags: ["jump", "double-jump", "8bit", "chiptune", "arcade", "platformer", "retro", "arpeggio"],
};
export const params = { knobs: {
  waveform: { type: "choice", label: "Waveform", default: "square", options: ["square", "pulse25"] },
  pitch: { type: "range", label: "Pitch", default: 0.4, min: 0, max: 1, step: 0.01 },
  flutter: { type: "range", label: "Flutter", default: 0.6, min: 0, max: 1, step: 0.01 },
  height: { type: "range", label: "Height", default: 0.5, min: 0, max: 1, step: 0.01 },
  rate: { type: "range", label: "Arp rate", default: 22, min: 8, max: 40, step: 1 },
  tail: { type: "toggle", label: "Echo tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, pulse = p.waveform === "pulse25", r = c.rng(p.seed * 6151 + (pulse ? 71 : 3));
  const base = 160 * Math.pow(2, p.pitch * 2) * (0.95 + r() * 0.1);
  const span = 7 + 12 * p.height;
  const chords = [[1, 1.26, 1.5, 2], [1, 1.19, 1.5, 2], [1, 1.335, 1.5, 2], [1, 1.5, 1.26, 2], [1, 1.5, 2, 1.26]];
  const chord = chords[Math.floor(r() * chords.length)], phase = Math.floor(r() * 4);
  const frame = pulse ? 60 : 120;
  const d1 = 0.1 + 0.03 * r(), t2 = d1 + 0.025 + 0.025 * r(), d2 = 0.15 + 0.13 * p.height + 0.04 * r();
  const echo = 0.075 + 0.02 * r(), tailLen = p.tail ? echo * 3 + 0.1 : 0;
  const dryN = c.seconds(t2 + d2 + 0.02, sr), n = c.seconds(t2 + d2 + tailLen + 0.03, sr), out = new Float32Array(n);
  const LN2 = Math.LN2 / 12;
  const blep = (t, dt) => { if (t < dt) { t /= dt; return t + t - t * t - 1; } if (t > 1 - dt) { t = (t - 1) / dt; return t * t + t + t + 1; } return 0; };
  const voice = (dur, f0, semis, arp, lvl) => {
    const m = c.seconds(dur, sr), k = semis * LN2, ar = p.rate * (0.93 + 0.14 * r());
    const tones = arp < 0.05 ? 1 : 2 + Math.round(2 * arp), rel = pulse ? 0.42 : 0.58, x = new Float32Array(m);
    let ph = r(), lastF = -1, sweep = 1;
    for (let i = 0; i < m; i++) {
      const t = i / sr, fq = Math.floor(t * frame);
      if (fq !== lastF) { lastF = fq; const u = Math.min(1, fq / frame / dur); sweep = Math.exp(k * (1 - (1 - u) * (1 - u))); }
      const step = Math.floor(t * ar), odd = step % 2;
      const f = f0 * sweep * (tones > 1 ? chord[(step + phase) % tones] : 1), dt = Math.min(0.45, f / sr);
      const duty = pulse ? (odd && tones > 1 ? 0.125 : 0.25) : 0.5;
      ph += dt; if (ph >= 1) ph -= 1;
      let y = ph < duty ? 1 : -1;
      y += blep(ph, dt); let q = ph - duty; if (q < 0) q += 1; y -= blep(q, dt);
      const u = t / dur;
      let e = Math.min(1, t / 0.003) * (u < rel ? 1 - 0.2 * u : (1 - 0.2 * rel) * Math.pow(Math.max(0, 1 - (u - rel) / (1 - rel)), 1.7));
      e *= 1 - 0.35 * arp * odd;
      x[i] = (pulse ? y + 0.5 - duty * 2 : y) * (Math.round(e * 15) / 15) * lvl;
    }
    return c.fade(x, 1.5, sr);
  };
  c.mix(out, voice(d1, base, span * 0.6, 0, 0.75), 0, 1, sr);
  c.mix(out, c.burst(r, 0.006, "hp", 3200 + 1500 * r(), 0.8, 0.0004, 0.0015, sr), 0, 0.22, sr);
  const f2 = base * Math.exp(span * 0.45 * LN2) * (0.98 + 0.04 * r());
  c.mix(out, voice(d2, f2, span, p.flutter, 0.9), t2, 1, sr);
  c.mix(out, c.burst(r, 0.006, "hp", 4200 + 1500 * r(), 0.8, 0.0004, 0.0015, sr), t2, 0.26, sr);
  if (p.tail) {
    const dry = out.slice(0, dryN);
    c.filter(dry, c.biquad("lp", pulse ? 2000 : 2800, 0.7, sr));
    for (let e = 1; e <= 3; e++) c.mix(out, dry, e * echo, 0.75 * Math.pow(0.42, e), sr);
  }
  c.filter(out, c.biquad("lp", Math.min(9000, sr * 0.45), 0.7, sr));
  c.fade(c.finish(out, 0.9), 4, sr);
  return { samples: out };
}
