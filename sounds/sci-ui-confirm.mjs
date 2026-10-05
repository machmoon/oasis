// Confirm chirp: two rising notes (a short lead-in, a held answer), each with its own scoop, attack and release; timbre picks a sine, detuned bell modes or a bandlimited arcade pulse, sparkle adds harmonic glints and a contact tick, tail adds a damped two-tap echo.
export const meta = {
  title: "Bridge Acknowledge", kind: "ui", format: "sound", duration: 0.45, price: 1, author: "quietmachine", payout: "quietmachine@creators.oasis.example", kit: "Sci-fi Console", description: "A rising two-tone acknowledge chirp for starship consoles and sci-fi menus, with timbre, pitch, interval, sparkle and an echo tail as knobs; every seed is a slightly different confirm.",
  tags: ["confirm", "ui", "sci-fi", "chirp", "beep", "acknowledge", "console", "interface"],
};
export const params = { knobs: {
  timbre: { type: "choice", label: "Timbre", default: "chime", options: ["soft", "chime", "digital"] },
  pitch: { type: "range", label: "Pitch (Hz)", default: 880, min: 400, max: 1800, step: 1 },
  spread: { type: "range", label: "Interval spread", default: 0.5, min: 0, max: 1, step: 0.01 },
  sparkle: { type: "range", label: "Sparkle", default: 0.4, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Echo tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 4421 + params.knobs.timbre.options.indexOf(p.timbre) * 97 + 3), TAU = c.TAU, ny = sr * 0.45;
  const tm = { soft: { att: 0.004, dec: 0.07 }, chime: { att: 0.0008, dec: 0.16 }, digital: { att: 0.0006, dec: 0 } }[p.timbre];
  const note = (f, len) => {
    const n = c.seconds(len, sr), x = new Float32Array(n), rel = c.seconds(p.timbre === "digital" ? 0.008 : 0.016, sr);
    let ratios, amps;
    if (p.timbre === "chime") { ratios = [1, 1.0025 + r() * 0.002, 2.76 * (0.99 + r() * 0.02), 5.4 * (0.98 + r() * 0.04)]; amps = [0.75, 0.15, 0.3 + r() * 0.1, 0.12]; }
    else if (p.timbre === "digital") { ratios = [1, 3, 5, 7, 9]; amps = [1, 0.33, 0.2, 0.14, 0.11]; }
    else { ratios = [1, 2]; amps = [1, 0.15]; }
    const M = ratios.length, ph = new Float64Array(M), ev = new Float64Array(M).fill(1);
    const ks = ratios.map((q, m) => Math.exp(-1 / (sr * Math.max(0.01, tm.dec * (m < 2 ? 1 : m === 2 ? 0.5 : 0.22)))));
    const scoop = 0.03 + r() * 0.015, step = c.seconds(0.008 + r() * 0.004, sr);
    for (let i = 0; i < n; i++) {
      const t = i / sr, a = Math.min(1, t / tm.att) * Math.min(1, (n - i) / rel);
      const fi = p.timbre === "digital" ? f * (i < step ? 0.84 : 1) : f * (1 - scoop * Math.exp(-t / 0.009));
      let v = 0;
      for (let m = 0; m < M; m++) {
        const fm = fi * ratios[m]; if (fm > ny) continue;
        ph[m] += fm / sr; if (ph[m] > 1) ph[m] -= 1;
        if (p.timbre !== "digital") ev[m] *= ks[m];
        v += Math.sin(TAU * ph[m]) * amps[m] * ev[m];
      }
      if (p.timbre === "soft") v *= 0.35 + 0.65 * ev[0];
      if (p.timbre === "digital") v *= 0.7 * (1 - 0.25 * t / len);
      x[i] = v * a;
    }
    return x;
  };
  const f1 = p.pitch * (0.994 + r() * 0.012), ratio = Math.pow(2, (3 + 9 * p.spread) / 12), f2 = f1 * ratio * (0.996 + r() * 0.008);
  const len1 = 0.07, on2 = len1 + 0.01 + r() * 0.007, len2 = p.timbre === "chime" ? 0.26 : 0.17;
  const tailLen = p.tail ? 0.28 : 0.01, total = c.seconds(on2 + len2 + tailLen, sr), out = new Float32Array(total);
  c.mix(out, note(f1, len1), 0, 0.75 + r() * 0.08, sr);
  c.mix(out, note(f2, len2), on2, 1, sr);
  for (const at of [0, on2]) c.mix(out, c.burst(r, 0.004, "hp", 3500 + 3000 * p.sparkle, 0.7, 0.0003, 0.001, sr), at, 0.06 + 0.35 * p.sparkle, sr);
  const grains = Math.round(p.sparkle * 14);
  for (let g = 0; g < grains; g++) {
    const h = [2, 3, 4, 6][Math.floor(r() * 4)], fg = Math.min(ny, f2 * h * (1 + (r() - 0.5) * 0.01));
    const at = g < grains / 4 ? r() * len1 : on2 + Math.pow(r(), 1.5) * len2 * 0.8;
    c.mix(out, c.ring([[fg, 1], [Math.min(ny, fg * 1.007), 0.5]], 0.05, 0.008 + r() * 0.01, sr), at + 0.002, (0.05 + 0.12 * r()) * (0.4 + 0.6 * p.sparkle), sr);
  }
  if (p.tail) {
    const dry = Float32Array.from(out), d1 = c.seconds(0.093 + r() * 0.01, sr), d2 = c.seconds(0.17 + r() * 0.015, sr), la = c.onepole(sr), lb = c.onepole(sr);
    for (let i = 0; i < total; i++) {
      out[i] += 0.38 * la(i >= d1 ? dry[i - d1] : 0, 3800) + 0.2 * lb(i >= d2 ? dry[i - d2] : 0, 2400);
    }
    const tap = c.seconds(0.12, sr);
    for (let i = 0; i < tap; i++) out[total - 1 - i] *= i / tap;
  }
  c.fade(c.finish(out, 0.85), 3, sr);
  return { samples: out };
}
