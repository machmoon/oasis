// Microwave done: a piezo triple-beep or a small struck bell; beeps are chirped, band-limited odd-harmonic tones with a contact tick, bells are inharmonic tine modes over a striker click, and the tail adds a small dry kitchen-room wash.
export const meta = {
  title: "Microwave Done", kind: "ui", format: "sound", duration: 1.2, price: 1, author: "quietmachine", payout: "quietmachine@creators.oasis.example", kit: "Kitchen", description: "The microwave-finished signal as a piezo triple beep or a bright bell ding, with pitch, repeats, brightness and room tail as knobs, for kitchen scenes, timers and cooking-game UI.",
  tags: ["microwave", "ding", "beep", "kitchen", "timer", "ui", "notification", "appliance"],
};
export const params = { knobs: {
  style: { type: "choice", label: "Style", default: "triple beep", options: ["bell ding", "triple beep"] },
  pitch: { type: "range", label: "Pitch", default: 0.5, min: 0, max: 1, step: 0.01 },
  repeats: { type: "range", label: "Repeat count", default: 1, min: 1, max: 4, step: 1 },
  brightness: { type: "range", label: "Brightness", default: 0.6, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Room tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, nyq = 0.45 * sr, bell = p.style === "bell ding", b = p.brightness, reps = Math.max(1, Math.min(4, Math.round(p.repeats)));
  const r = c.rng(p.seed * 613 + (bell ? 41 : 7) + 3);
  const f0 = (bell ? 760 : 1400) * Math.pow(2, p.pitch * 1.4) * (0.975 + r() * 0.05);
  const beepLen = 0.1 + r() * 0.03, gap = 0.17 + r() * 0.03, h3 = 0.7 + r() * 0.6, h5 = 0.5 + r() * 0.6;
  const tau = p.tail ? 0.32 : 0.16, ringLen = tau * 5;
  const onsets = [];
  for (let k = 0; k < reps; k++) {
    if (bell) onsets.push(0.003 + k * 0.55 + (k ? (r() - 0.5) * 0.012 : 0));
    else for (let j = 0; j < 3; j++) onsets.push(0.003 + k * 0.8 + j * gap + ((k || j) ? (r() - 0.5) * 0.005 : 0));
  }
  const last = onsets[onsets.length - 1];
  const total = Math.min(3.9, last + (bell ? ringLen : beepLen) + (p.tail ? 0.55 : 0.06) + 0.04);
  const out = new Float32Array(c.seconds(total, sr));
  const hm = 0.35 + 0.65 * b;
  const beep = (t, g) => {
    const n = c.seconds(beepLen, sr), s = new Float32Array(n), f = f0 * (0.997 + r() * 0.006);
    const a3 = 3 * f < nyq ? hm * h3 / 3 : 0, a5 = 5 * f < nyq ? hm * h5 * 0.8 / 5 : 0;
    const atk = 0.002 * sr, rel = 0.012 * sr, chirp = 0.004 * sr;
    let ph = 0;
    for (let i = 0; i < n; i++) {
      ph += c.TAU * f * (1 + 0.015 * Math.exp(-i / chirp)) / sr;
      const x = Math.sin(ph) + a3 * Math.sin(3 * ph) + a5 * Math.sin(5 * ph);
      s[i] = x * Math.min(1, i / atk) * Math.min(1, (n - i) / rel) * (1 - 0.15 * i / n);
    }
    c.mix(out, s, t, g, sr);
    c.mix(out, c.burst(r, 0.004, "hp", Math.min(nyq * 0.8, 3000 + 4000 * b), 0.7, 0.0003, 0.001, sr), t, 0.06 + 0.2 * b, sr);
  };
  const ding = (t, g) => {
    const d = () => 0.985 + r() * 0.03, lim = (m) => m.filter(([f]) => f < nyq);
    c.mix(out, c.ring(lim([[f0 * d(), 1], [f0 * 0.5 * d(), 0.06 + 0.06 * b], [f0 * 1.003, 0.3]]), ringLen, tau * (0.9 + r() * 0.2), sr), t + 0.0008, 0.7 * g, sr);
    c.mix(out, c.ring(lim([[f0 * 2.76 * d(), 0.5 * (0.25 + 0.75 * b)], [f0 * 5.4 * d(), 0.3 * (0.2 + 0.8 * b)], [f0 * 8.93 * d(), 0.15 * b]]), ringLen * 0.5, tau * 0.35, sr), t + 0.0005, 0.6 * g, sr);
    c.mix(out, c.burst(r, 0.006, "bp", Math.min(nyq * 0.8, 4000 + 4000 * b), 1.5, 0.0004, 0.0015, sr), t, (0.25 + 0.35 * b) * g, sr);
  };
  for (let k = 0; k < onsets.length; k++) {
    const g = 0.88 + r() * 0.12;
    if (bell) ding(onsets[k], g); else beep(onsets[k], g);
  }
  c.filter(out, c.biquad("lp", Math.min(nyq, 3500 + 10000 * b), 0.7, sr));
  c.filter(out, c.biquad("hp", bell ? 250 : 500, 0.7, sr));
  let res = out;
  if (p.tail) {
    const w = c.reverb(out, { size: 0.4, decay: bell ? 0.5 : 0.35, mixAmt: bell ? 0.2 : 0.12 }, sr) || out;
    res = new Float32Array(out.length);
    for (let i = 0; i < res.length && i < w.length; i++) res[i] = w[i];
  }
  c.finish(res, 0.88);
  c.fade(res, 4, sr);
  const n = res.length, fl = Math.min(n, c.seconds(0.03, sr));
  for (let i = 0; i < fl; i++) res[n - 1 - i] *= i / fl;
  return { samples: res };
}
