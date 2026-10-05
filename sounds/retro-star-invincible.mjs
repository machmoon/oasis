// Star Invincible: a shimmering 8-bit invincibility trill. A naive pulse/square voice flips between two notes at the trill rate while its root climbs a major arpeggio (lifting an octave at the end), with drifting vibrato, shimmer tremolo and soft note gating; a sparkle layer of pitched harmonic pings and tight noise glints rides on top, and an optional chip-delay tail echoes it away.
export const meta = {
  title: "Star Invincible", kind: "sfx", format: "sound", duration: 1.6, price: 3, author: "quietmachine", payout: "quietmachine@creators.oasis.example", kit: "Retro Arcade", description: "A shimmering chiptune invincibility trill with sparkle glints, for a power-star pickup, a temporary shield or any 8-bit power-up state.",
  tags: ["invincible", "star", "power-up", "chiptune", "8-bit", "arcade", "trill", "retro"],
};
export const params = { knobs: {
  waveform: { type: "choice", label: "Waveform", default: "pulse12", options: ["pulse12", "square"] },
  pitch: { type: "range", label: "Pitch (Hz)", default: 520, min: 200, max: 1200, step: 1 },
  depth: { type: "range", label: "Trill depth", default: 0.4, min: 0, max: 1, step: 0.01 },
  sparkle: { type: "range", label: "Sparkle noise", default: 0.5, min: 0, max: 1, step: 0.01 },
  rate: { type: "range", label: "Trill rate (Hz)", default: 15, min: 6, max: 30, step: 0.5 },
  tail: { type: "toggle", label: "Echo tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 4513 + (p.waveform === "square" ? 7 : 0) + 11), sq = p.waveform === "square";
  const body = 1.12 + r() * 0.12, echoes = p.tail ? 4 : 0, gap = 0.1 + r() * 0.025;
  const total = body + echoes * gap + 0.08, n = c.seconds(total, sr), nb = c.seconds(body, sr);
  const dry = new Float32Array(n), duty = sq ? 0.5 : 0.125, dc = 2 * duty - 1;
  const base = p.pitch * (0.985 + r() * 0.03), rate = p.rate * (0.95 + r() * 0.1);
  const hi = Math.pow(2, (2 + 10 * p.depth) / 12);
  const arps = [[0, 4, 7, 12], [0, 5, 9, 12], [0, 4, 7, 11]][Math.floor(r() * 3)];
  const steps = arps.map((s) => Math.pow(2, s / 12)), rot = Math.floor(r() * 2);
  const vr = 5 + r() * 2.5, vph = r() * c.TAU, vd = 0.003 + r() * 0.004, perNote = 6 + Math.floor(r() * 3) * 2;
  const tr = 9 + r() * 4, tph = r() * c.TAU, td = 0.1 + r() * 0.08, lift = 0.72 + r() * 0.1;
  const k = 1 - Math.exp(-c.TAU * 450 / sr), rel = 0.34, relStart = body - rel;
  let phase = r(), gs = 0;
  for (let i = 0; i < nb; i++) {
    const t = i / sr, nt = t * rate * 2, ni = Math.floor(nt), np = nt - ni, u = t / body;
    const oct = u > lift ? 2 : 1;
    const f = base * oct * steps[(Math.floor(ni / perNote) + rot) % 4] * (ni % 2 ? hi : 1) * (1 + vd * (1 + 0.5 * Math.sin(t * 1.3)) * Math.sin(c.TAU * vr * t + vph));
    phase += f / sr; phase -= Math.floor(phase);
    const v = (phase < duty ? 1 : -1) - dc;
    gs += ((np < 0.82 ? 1 - 0.25 * np : 0.45) - gs) * k;
    const shim = 1 - td * (0.6 + 0.4 * Math.sin(t * 2.1 + tph)) * (0.5 + 0.5 * Math.sin(c.TAU * tr * t * (1 + 0.08 * Math.sin(t * 3.3)) + tph));
    const a = Math.min(1, t / 0.004) * (1 - 0.15 * u) * shim * (t > relStart ? Math.exp(-(t - relStart) / 0.085) : 1);
    dry[i] = v * gs * a * (sq ? 0.42 : 0.7);
  }
  c.filter(dry, c.biquad("hp", 90, 0.7, sr));
  c.filter(dry, c.biquad("lp", Math.min(13000, sr * 0.42), 0.7, sr));
  const pings = Math.round(70 * p.sparkle * body + 4), top = sr * 0.45;
  for (let g = 0; g < pings; g++) {
    const t = 0.01 + r() * (body - 0.2), fall = t > relStart ? 0.35 : 1;
    const f = Math.min(top, base * [3, 4, 5, 6, 8][Math.floor(r() * 5)] * (0.99 + r() * 0.02));
    c.mix(dry, c.ring([[f, 1], [Math.min(sr * 0.47, f * 2.01), 0.35]], 0.06, 0.008 + r() * 0.012, sr), t, (0.05 + 0.12 * r()) * (0.3 + p.sparkle) * fall, sr);
  }
  const glints = Math.round(60 * p.sparkle * body);
  for (let g = 0; g < glints; g++) {
    const t = 0.01 + r() * (body - 0.2), fall = t > relStart ? 0.3 : 1;
    c.mix(dry, c.burst(r, 0.01, "bp", Math.min(sr * 0.42, 6000 + r() * 5000), 6, 0.0004, 0.0015 + r() * 0.003, sr), t, (0.08 + 0.18 * r()) * p.sparkle * fall, sr);
  }
  const out = Float32Array.from(dry), lp = c.onepole(sr);
  for (let e = 1; e <= echoes; e++) {
    const d = Float32Array.from(dry), fc = 8000 / e;
    for (let i = 0; i < d.length; i++) d[i] = lp(d[i], fc);
    c.mix(out, d, e * gap, 0.45 * Math.pow(0.5, e - 1), sr);
  }
  c.fade(c.finish(out, 0.88), 6, sr);
  return { samples: out };
}
