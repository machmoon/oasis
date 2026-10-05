// Deny tone: falling buzzy reject beeps, each a phase-accumulated oscillator (detuned saws, hollow square or formant pulse) bent sharply down under a closing filter, driven and ring-modded by harshness, with an optional decaying echo tail.
export const meta = {
  title: "Access Denied", kind: "ui", format: "sound", duration: 0.5, price: 1, author: "quietmachine", payout: "quietmachine@creators.oasis.example", kit: "Sci-fi Console", description: "A falling, buzzy starship-console reject tone whose timbre, pitch, harshness and repeat count are knobs; for denied inputs, locked doors and failed commands.",
  tags: ["deny", "error", "reject", "ui", "sci-fi", "console", "buzz", "beep"],
};
export const params = { knobs: {
  timbre: { type: "choice", label: "Timbre", default: "buzz", options: ["buzz", "square", "nasal"] },
  pitch: { type: "range", label: "Pitch (Hz)", default: 330, min: 140, max: 800, step: 1 },
  harshness: { type: "range", label: "Harshness", default: 0.5, min: 0, max: 1, step: 0.01 },
  repeats: { type: "range", label: "Repeat count", default: 2, min: 1, max: 4, step: 1 },
  tail: { type: "toggle", label: "Echo tail", default: false },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, ti = params.knobs.timbre.options.indexOf(p.timbre);
  const r = c.rng(p.seed * 613 + ti * 37 + 3), h = p.harshness, reps = Math.max(1, Math.round(p.repeats));
  const noteLen = (0.15 + 0.02 * r()) * (p.timbre === "nasal" ? 1.1 : 1), step = noteLen + 0.035 + 0.012 * r();
  const tailLen = p.tail ? 0.46 : 0;
  const out = new Float32Array(c.seconds((reps - 1) * step + noteLen * 1.3 + 0.03 + tailLen, sr));
  const detune = 1.006 + 0.01 * r(), vibRate = 18 + 14 * r(), vibPh = r() * c.TAU, duty = p.timbre === "nasal" ? 0.1 + 0.05 * r() : 0.5;
  const interval = 2.5 + 1.5 * r();
  for (let k = 0; k < reps; k++) {
    const last = k === reps - 1;
    const f0 = p.pitch * Math.pow(2, -k * interval / 12) * (0.99 + 0.02 * r());
    const drop = 0.3 + 0.08 * r() + 0.08 * h + (last ? 0.1 : 0);
    const len = noteLen * (last && reps > 1 ? 1.3 : 1), n = c.seconds(len, sr), x = new Float32Array(n);
    const lp = c.onepole(sr), form = c.biquad("bp", 1050 + 250 * r() + 600 * h, 3.5, sr), lp2 = c.onepole(sr);
    const att = Math.max(1, Math.floor(0.003 * sr)), rel = Math.floor(0.03 * sr);
    let ph1 = r(), ph2 = r(), ringPh = 0;
    const ringRatio = 0.23 + 0.06 * r(), drive = 1 + 7 * h;
    for (let i = 0; i < n; i++) {
      const prog = i / n, t = i / sr, bend = prog * (1.6 - 0.6 * prog);
      const f = f0 * (1 - drop * bend) * (1 + 0.006 * Math.sin(vibRate * c.TAU * t + vibPh));
      ph1 += f / sr; ph1 -= Math.floor(ph1);
      ph2 += f * detune / sr; ph2 -= Math.floor(ph2);
      let s;
      if (p.timbre === "buzz") s = 0.55 * (2 * ph1 - 1) + 0.45 * (2 * ph2 - 1) + 0.3 * (ph1 < 0.5 ? 0.5 : -0.5);
      else if (p.timbre === "square") s = (ph1 < 0.5 ? 0.8 : -0.8) + 0.12 * (ph2 < 0.5 ? 1 : -1);
      else { const pl = ph1 < duty ? 1 : -duty / (1 - duty); s = 0.4 * pl + 2.2 * form(pl); }
      ringPh += f * ringRatio / sr;
      s *= 1 - 0.55 * h + 0.55 * h * Math.sin(c.TAU * ringPh);
      s = Math.tanh(s * drive) / Math.tanh(drive);
      const cut = (1500 + 7000 * h) * (1 - 0.5 * prog) + f * 3;
      s = lp(s, Math.min(cut, sr * 0.45));
      if (p.timbre === "square") s = 0.7 * s + 0.3 * lp2(s, 600);
      const e = (i < att ? i / att : i > n - rel ? (n - i) / rel : 1) * (1 - 0.4 * prog);
      x[i] = s * e;
    }
    const at = k * step + (k ? (r() - 0.5) * 0.01 : 0) + 0.002;
    c.mix(out, x, at, 0.8 - 0.08 * k, sr);
    c.mix(out, c.burst(r, 0.006, "hp", 2500 + 3000 * h, 0.8, 0.0004, 0.0015, sr), at, 0.08 + 0.25 * h, sr);
  }
  if (p.tail) {
    const src = Float32Array.from(out), lpT = c.onepole(sr), d = 0.085 + 0.02 * r();
    for (let i = 0; i < src.length; i++) src[i] = lpT(src[i], 2200 - 800 * h);
    for (let e = 1; e <= 4; e++) c.mix(out, src, d * e, 0.42 * Math.pow(0.55, e - 1), sr);
  }
  c.finish(out, 0.88);
  c.fade(out, 4, sr);
  return { samples: out };
}
