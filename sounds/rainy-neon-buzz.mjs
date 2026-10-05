// Neon hum: a sign humming in the rain. Mains-locked ballast hum, a jittery 2f tube buzz through a glass formant, gas hiss that sputters when the tube dims, spatter clusters ticking and ringing on the glass, and either a seamless loop or a strike-up and power-down.
export const meta = {
  title: "Neon In Rain", kind: "sfx", format: "sound", duration: 2.5, price: 2, author: "foleyroom", payout: "foleyroom@creators.oasis.example", kit: "Rainy City Street", description: "A neon sign hums and sputters while rain ticks on its glass, either striking up and dying away or as a seamless loop, for night streets, bar fronts and motel signs in games or film.",
  tags: ["neon", "hum", "buzz", "flicker", "sign", "electric", "rain", "night"],
};
export const params = { knobs: {
  size: { type: "choice", label: "Tube size", default: "medium", options: ["small", "medium", "large"] },
  buzz: { type: "range", label: "Buzz intensity", default: 0.5, min: 0, max: 1, step: 0.01 },
  flicker: { type: "range", label: "Flicker amount", default: 0.3, min: 0, max: 1, step: 0.01 },
  rain: { type: "range", label: "Rain on glass", default: 0.4, min: 0, max: 1, step: 0.01 },
  pitch: { type: "range", label: "Hum pitch (Hz)", default: 60, min: 40, max: 140, step: 1 },
  tail: { type: "toggle", label: "Strike-up & power-down (off = seamless loop)", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, si = params.knobs.size.options.indexOf(p.size), r = c.rng(p.seed * 6113 + si * 97 + 3);
  const tube = [{ f: 2600, q: 2.6, sub: 0.08, hiss: 5600, res: 0.9 }, { f: 1500, q: 2.1, sub: 0.25, hiss: 3800, res: 1.0 }, { f: 820, q: 1.6, sub: 0.55, hiss: 2400, res: 1.2 }][si];
  const loop = !p.tail, f0 = p.pitch * (0.995 + r() * 0.01), drive = 1 + 13 * p.buzz, norm = Math.tanh(drive);
  const n = loop ? Math.round(Math.round(2.5 * f0) / f0 * sr) : c.seconds(2.5, sr), xf = loop ? c.seconds(0.06, sr) : 0, N = n + xf, dur = N / sr;
  const out = new Float32Array(N), gate = new Float32Array(N).fill(1), spt = new Float32Array(N), crack = new Float32Array(N);
  const events = Math.round(p.flicker * 7 + (p.flicker > 0.05 ? 1 : 0));
  for (let e = 0; e < events; e++) {
    const t0 = 0.35 + r() * (2.5 - 1.2), start = c.seconds(t0, sr), len = c.seconds(0.05 + (0.08 + 0.25 * p.flicker) * r(), sr);
    let state = 1, next = 0;
    for (let i = 0; i < len && start + i < N; i++) {
      if (i >= next) { state = r() < 0.55 ? 0.12 + 0.35 * r() : 0.9; next = i + c.seconds(0.008 + 0.025 * r(), sr); }
      gate[start + i] = Math.min(gate[start + i], state); spt[start + i] = 1;
    }
    const os = start + len, ol = c.seconds(0.05, sr);
    for (let i = 0; i < ol && os + i < N; i++) gate[os + i] = Math.max(gate[os + i], 1 + 0.25 * (1 - i / ol));
    c.mix(crack, c.burst(r, 0.03, "bp", tube.f * 1.8, 2.2, 0.0015, 0.008, sr), t0 + len / sr, 0.2 + 0.25 * p.buzz, sr);
  }
  const strikeN = loop ? 0 : c.seconds(0.3, sr);
  if (strikeN) {
    let state = 0, next = 0;
    for (let i = 0; i < strikeN; i++) {
      if (i >= next) { state = r() < Math.pow(i / strikeN, 0.7) ? 1 : 0.05 + 0.2 * r(); next = i + c.seconds(0.008 + 0.02 * r(), sr); }
      gate[i] = state; spt[i] = 1 - i / strikeN;
    }
    c.mix(crack, c.burst(r, 0.03, "bp", tube.f * 1.5, 1.8, 0.002, 0.01, sr), 0.004, 0.35, sr);
  }
  const sm = c.onepole(sr), form = c.biquad("bp", tube.f, tube.q, sr), form2 = c.biquad("bp", tube.f * 2.3, tube.q * 1.5, sr);
  const hissBp = c.biquad("bp", tube.hiss, 1.2, sr), hz = c.noise(r, N), wobPh = r() * c.TAU;
  const wobF = loop ? (1 + Math.floor(r() * 2)) * sr / n : 0.4 + r() * 0.6;
  const tailN = loop ? 0 : c.seconds(0.7, sr), inN = c.seconds(0.01, sr);
  let ph = 0, jit = 1, sp = 1;
  for (let i = 0; i < N; i++) {
    let k = 1;
    if (tailN && i > N - tailN) k = (N - i) / tailN;
    if (!loop && i < inN) k *= i / inN;
    const prev = ph;
    ph += f0 * (0.8 + 0.2 * k) / sr;
    if (ph > 1) { ph -= 1; jit = 1 + (r() - 0.5) * 0.5 * p.buzz; sp = 1 - spt[i] * 0.75 * r(); }
    else if (prev < 0.5 && ph >= 0.5) sp = 1 - spt[i] * 0.75 * r();
    const s1 = Math.sin(c.TAU * ph), s2 = Math.sin(2 * c.TAU * ph), g = sm(gate[i], 60) * k * k;
    const bz = Math.tanh(drive * jit * (s2 + 0.25 * s1 + 0.1 * Math.sin(6 * c.TAU * ph))) / norm * sp;
    const res = form(bz) * tube.res + form2(bz) * 0.5 * p.buzz;
    const pulse = 0.5 + 0.5 * s2, hiss = hissBp(hz[i]) * pulse * pulse * pulse * (0.06 + 0.3 * p.buzz) * sp;
    const wob = 1 + 0.03 * Math.sin(c.TAU * wobF * i / sr + wobPh);
    const ballast = s1 + 0.12 * Math.sin(3 * c.TAU * ph) + 0.06 * Math.sin(4 * c.TAU * ph);
    out[i] = (0.35 * bz + res + hiss) * g * wob + tube.sub * ballast * (0.6 + 0.4 * Math.min(1, g)) * k + crack[i] * k;
  }
  if (p.rain > 0) {
    const rb = new Float32Array(N), clusters = Math.round(p.rain * 28 * dur);
    for (let d = 0; d < clusters; d++) {
      const t = r() * (dur - 0.05), m = 1 + Math.floor(r() * r() * 4);
      for (let j = 0; j < m; j++) {
        const tt = t + j * (0.004 + 0.02 * r()), a = (0.35 + 0.65 * r()) * (j ? 0.6 : 1);
        c.mix(rb, c.burst(r, 0.003, "hp", 2200 + r() * 2500, 0.7, 0.0003, 0.0009, sr), tt, a, sr);
        c.mix(rb, c.ring([[2100 + r() * 1500, 1], [5200 + r() * 1500, 0.4]], 0.03, 0.005 + 0.004 * r(), sr), tt + 0.0005, a * 0.3, sr);
        if (r() < 0.25) {
          const pn = c.seconds(0.03, sr), f1 = 600 + r() * 500, pl = c.osc("sine", (u) => f1 * (1 + u * 30), pn, sr);
          c.mix(rb, c.multiply(pl, c.env(pn, 0.001, 0.008, sr)), tt + 0.002, a * 0.35, sr);
        }
      }
    }
    c.mix(out, rb, 0, 0.8, sr);
  }
  c.filter(out, c.biquad("hp", 30, 0.7, sr));
  let buf = out;
  if (loop) {
    for (let i = 0; i < xf; i++) { const w = 0.5 - 0.5 * Math.cos(Math.PI * i / xf); out[i] = out[i] * w + out[n + i] * (1 - w); }
    buf = out.slice(0, n);
  } else buf = c.reverb(out, { size: 0.65, decay: 0.55, mixAmt: 0.3 }, sr) || out;
  c.finish(buf, 0.9, 1.3);
  c.gain(buf, (0.62 + 0.2 * p.buzz + 0.15 * p.rain) * [0.92, 0.97, 1][si]);
  c.fade(buf, 12, sr);
  return { samples: buf };
}
