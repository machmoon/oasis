// Warning alarm: a repeating urgent pulse tone for a starship bridge. Each pulse is a swept sine, band-limited saw or
// detuned-twin chime with a soft attack and a hp contact tick; urgency adds a hi-lo two-tone, deeper sweep, rasp and
// harmonics; the tail is a light bridge-room reverb that rings out after the last pulse.
export const meta = {
  title: "Red Alert Pulse", kind: "sfx", format: "sound", duration: 2, price: 2, author: "quietmachine", payout: "quietmachine@creators.oasis.example", kit: "Sci-fi Console", description: "A repeating urgent warning pulse whose tone, rate, pitch and urgency are knobs, for starship alarms, hull breaches and countdown warnings.",
  tags: ["alarm", "warning", "sci-fi", "pulse", "alert", "beep", "starship", "console"],
};
export const params = { knobs: {
  tone: { type: "choice", label: "Tone", default: "sine", options: ["sine", "saw", "chime"] },
  rate: { type: "range", label: "Pulse rate (Hz)", default: 4, min: 2, max: 10, step: 0.1 },
  pitch: { type: "range", label: "Pitch (Hz)", default: 880, min: 400, max: 1600, step: 1 },
  urgency: { type: "range", label: "Urgency", default: 0.5, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Room tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + params.knobs.tone.options.indexOf(p.tone) * 71 + 3);
  const u = p.urgency, rate = p.rate, per = 1 / rate, on = per * (0.48 + 0.2 * u);
  const count = Math.max(2, Math.floor(1.8 * rate));
  const f0 = p.pitch * c.between(r, 0.975, 1.025), ratio = [1.5, 1.335, 1.26][Math.floor(r() * 3)];
  const bend = c.between(r, -0.6, 0.6), sw = 0.06 + 0.3 * u, nyq = sr * 0.45;
  const lastEnd = 0.004 + (count - 1) * per + on;
  const n = c.seconds(lastEnd + (p.tail ? 0.5 : 0.012), sr), out = new Float32Array(n);
  const ratios = [1, 2.76 * c.between(r, 0.98, 1.02), 5.4 * c.between(r, 0.97, 1.03)];
  const amHz = 28 + r() * 14, amPh = r() * c.TAU;
  for (let k = 0; k < count; k++) {
    const t0 = 0.002 + k * per + (k ? c.between(r, -0.0015, 0.0015) : 0);
    const fk = f0 * (1 + (ratio - 1) * u * (k % 2)) * (0.996 + r() * 0.008), m = c.seconds(on, sr);
    let x;
    if (p.tone === "chime") {
      const modes = [];
      for (const q of ratios) { modes.push([fk * q, 1 / q]); modes.push([fk * q * (1.003 + r() * 0.003), 0.6 / q]); }
      x = c.ring(modes, on, on * (0.3 + 0.15 * r()), sr);
    } else {
      x = new Float32Array(m);
      const saw = p.tone === "saw", H = saw ? Math.max(1, Math.min(4 + Math.round(10 * u), Math.floor(nyq / (fk * (1 + sw))))) : 2;
      const h2 = 0.12 + 0.2 * u; let ph = 0;
      for (let i = 0; i < m; i++) {
        const s = i / m, f = fk * (1 + sw * s * (1 - bend * (1 - s)));
        ph += c.TAU * f / sr; if (ph > c.TAU) ph -= c.TAU;
        if (saw) { let v = 0; for (let h = 1; h <= H; h++) v += Math.sin(h * ph) * (1 - 0.5 * h / (H + 1)) / h; x[i] = v * 0.75; }
        else x[i] = Math.sin(ph) + h2 * Math.sin(2 * ph);
      }
    }
    const att = p.tone === "chime" ? 0.0008 : 0.003;
    for (let i = 0; i < x.length; i++) {
      const t = i / sr, a = Math.max(0, Math.min(1, t / att, (on - t) / 0.012));
      x[i] *= a * (1 - 0.4 * u * (0.5 + 0.5 * Math.sin(c.TAU * amHz * t + amPh)));
    }
    c.mix(out, x, t0, 0.6 * (0.9 + 0.1 * r()), sr);
    c.mix(out, c.burst(r, 0.006, "hp", 2500 + 3500 * u, 0.8, 0.0004, 0.0015, sr), t0, 0.1 + 0.2 * u, sr);
  }
  let buf = out;
  if (p.tail) buf = c.reverb(out, { size: 0.45, decay: 0.55, mixAmt: 0.16 * (1 - 0.4 * (rate - 2) / 8) }, sr) || out;
  c.fade(c.finish(buf, 0.92), 8, sr);
  c.gain(buf, 0.7 + 0.3 * u);
  return { samples: buf };
}
