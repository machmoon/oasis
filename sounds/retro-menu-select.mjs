// Menu select blip: two band-limited chiptune pulse notes (root, then a quantised interval up) with an attack chirp and NES-style accent, lowpassed for brightness, plus optional discrete echo repeats.
export const meta = {
  title: "Confirm Blip", kind: "ui", format: "sound", duration: 0.25, price: 1, author: "quietmachine", payout: "quietmachine@creators.oasis.example", kit: "Retro Arcade", description: "An 8-bit two-tone confirm blip for menu selects and button presses, with knobs for waveform, pitch, interval, brightness and an echo tail; each seed is a slightly different press.",
  tags: ["ui", "select", "confirm", "blip", "chiptune", "8-bit", "arcade", "menu"],
};
export const params = { knobs: {
  waveform: { type: "choice", label: "Waveform", default: "square", options: ["square", "pulse25"] },
  pitch: { type: "range", label: "Pitch (Hz)", default: 660, min: 300, max: 1400, step: 1 },
  interval: { type: "range", label: "Interval", default: 0.5, min: 0, max: 1, step: 0.01 },
  brightness: { type: "range", label: "Brightness", default: 0.6, min: 0, max: 1, step: 0.01 },
  echo: { type: "toggle", label: "Echo tail", default: false },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + 29);
  const duty = p.waveform === "pulse25" ? 0.25 : 0.5;
  const semis = Math.round(3 + 9 * p.interval);
  const f1 = p.pitch * (0.985 + r() * 0.03);
  const f2 = f1 * Math.pow(2, semis / 12) * (0.996 + r() * 0.008);
  const d1 = 0.045 + r() * 0.015, gap = 0.012 + r() * 0.01, d2 = 0.085 + r() * 0.03;
  const chirp = 0.02 + r() * 0.03, rel = 0.02, sag = 0.2 + r() * 0.15;
  const tone = (f, d, amp) => {
    const n = c.seconds(d + rel, sr), x = new Float32Array(n);
    const H = Math.max(1, Math.floor(Math.min(0.45 * sr, 12000) / (f * (1 + chirp))));
    const a = new Float32Array(H + 1);
    for (let k = 1; k <= H; k++) a[k] = 2 * Math.sin(Math.PI * k * duty) / (Math.PI * k);
    const att = Math.max(1, Math.round(0.0015 * sr)), hold = c.seconds(d, sr), tau = 0.004 * sr;
    let ph = r() * c.TAU;
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      ph += c.TAU * f * (1 + chirp * Math.exp(-t / 0.005)) / sr;
      const s1 = Math.sin(ph), cs = 2 * Math.cos(ph);
      let sm2 = 0, sm1 = s1, acc = a[1] * s1;
      for (let k = 2; k <= H; k++) { const sk = cs * sm1 - sm2; sm2 = sm1; sm1 = sk; acc += a[k] * sk; }
      let e = i < att ? i / att : 1;
      if (i < hold) e *= (1 - sag) + sag * Math.exp(-t / 0.02);
      else e *= (1 - sag) * Math.exp(-(i - hold) / tau);
      x[i] = acc * e * amp;
    }
    return x;
  };
  const dryLen = d1 + gap + d2 + rel;
  const dry = new Float32Array(c.seconds(dryLen, sr));
  c.mix(dry, tone(f1, d1, 0.75 + r() * 0.1), 0.001, 1, sr);
  c.mix(dry, tone(f2, d2, 1), 0.001 + d1 + gap, 1, sr);
  const delay = 0.14 + r() * 0.02, repeats = 3;
  const total = p.echo ? dryLen + repeats * delay + 0.08 : dryLen + 0.012;
  const out = new Float32Array(c.seconds(total, sr));
  c.mix(out, dry, 0, 1, sr);
  if (p.echo) {
    const darker = c.biquad("lp", 2500 + 2500 * p.brightness, 0.7, sr);
    let echoBuf = dry.slice();
    for (let k = 1; k <= repeats; k++) {
      echoBuf = c.filter(echoBuf.slice(), darker);
      c.mix(out, echoBuf, k * delay, Math.pow(0.42, k), sr);
    }
  }
  const cut = Math.min(sr * 0.45, 1200 + 10000 * Math.pow(p.brightness, 1.5));
  c.filter(out, c.biquad("lp", cut, 0.7, sr));
  c.filter(out, c.biquad("hp", 40, 0.7, sr));
  c.fade(c.finish(out, 0.85), 3, sr);
  if (duty < 0.5) c.gain(out, 1.0); else c.gain(out, 0.88);
  return { samples: out };
}
