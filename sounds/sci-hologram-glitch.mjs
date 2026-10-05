// Hologram glitch: a detuned saw/pulse projector tone gated by a jittered stutter clock, with seeded pitch jumps, static grains at each tear, a power-down droop, a pitch-aware bitcrusher and an optional short echo tail.
export const meta = {
  title: "Hologram Stutter", kind: "sfx", format: "sound", duration: 0.85, price: 2, author: "quietmachine", payout: "quietmachine@creators.oasis.example", kit: "Sci-fi Console", description: "An unstable hologram flickering and tearing as it fails, with stutter rate, severity, bitcrush and pitch as knobs, for sci-fi HUDs, comms dropouts and projector glitches.",
  tags: ["hologram", "glitch", "stutter", "sci-fi", "bitcrush", "flicker", "console", "interface"],
};
export const params = { knobs: {
  severity: { type: "range", label: "Severity", default: 0.5, min: 0, max: 1, step: 0.01 },
  rate: { type: "range", label: "Stutter rate (Hz)", default: 14, min: 4, max: 40, step: 0.5 },
  bitcrush: { type: "range", label: "Bitcrush", default: 0.35, min: 0, max: 1, step: 0.01 },
  pitch: { type: "range", label: "Pitch (Hz)", default: 330, min: 120, max: 900, step: 1 },
  tail: { type: "toggle", label: "Echo tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 6151 + 29), sev = p.severity, main = 0.8, tailLen = p.tail ? 0.4 : 0.03;
  const fast = (p.rate - 4) / 36, calm = 1 - 0.55 * fast;
  const m = c.seconds(main, sr), n = c.seconds(main + tailLen, sr), out = new Float32Array(n);
  const f = new Float32Array(m), g = new Float32Array(m), edges = [];
  const jumps = [0.5, 2, 1.5, 0.75, 1.335];
  let t = 0, seg = 0;
  while (t < main) {
    const len = (1 / p.rate) * (1 + (0.25 + sev) * (r() - 0.5) * 1.1);
    const i0 = Math.floor(t * sr), i1 = Math.min(m, Math.floor((t + len) * sr));
    const jump = r() < 0.08 + sev * 0.5 ? jumps[Math.floor(r() * 5)] : 1 + (r() - 0.5) * 0.03 * (0.3 + sev);
    const on = seg === 0 || r() > 0.1 + 0.4 * sev;
    const lvl = !on ? 0 : seg % 2 ? Math.max(0, 1 - (0.5 + 0.5 * sev) * (0.7 + 0.3 * r())) : 0.85 + 0.15 * r();
    for (let i = i0; i < i1; i++) { f[i] = p.pitch * jump; g[i] = lvl; }
    edges.push(t); t += len; seg++;
  }
  const down = 0.62 * main, fall = new Float32Array(m), amp = new Float32Array(m);
  for (let i = 0; i < m; i++) {
    const tt = i / sr, x = tt > down ? (tt - down) / (main - down) : 0;
    fall[i] = 1 - 0.55 * x * x;
    amp[i] = Math.min(1, tt / 0.004) * (1 - x) * (1 - x);
  }
  const fq = (tt, i) => f[Math.min(i, m - 1)] * fall[Math.min(i, m - 1)];
  const a = c.osc("saw", fq, m, sr), b = c.osc("square", (tt, i) => fq(tt, i) * 1.007, m, sr, { duty: 0.3 });
  const s = c.osc("sine", (tt, i) => fq(tt, i) * 0.5, m, sr), lp = c.onepole(sr);
  const holdMax = Math.min(10 * sr / 22050, sr / (2.5 * p.pitch * 1.5));
  const hold = 1 + Math.floor(p.bitcrush * Math.max(0, holdMax - 1)), q = Math.pow(2, 14 - p.bitcrush * 10), k = 1 - Math.exp(-1 / (0.0006 * sr));
  let gs = 0, held = 0;
  const tone = new Float32Array(m);
  for (let i = 0; i < m; i++) {
    gs += (g[i] - gs) * k;
    const tt = i / sr, shim = 0.5 + 0.5 * Math.sin(c.TAU * 9 * tt + 1.3 * Math.sin(c.TAU * 2.3 * tt));
    let x = lp(0.45 * a[i] + 0.35 * b[i], 1400 + 3200 * shim) + 0.4 * s[i];
    x *= gs * amp[i] * (0.88 + 0.12 * shim);
    if (i % hold === 0) held = Math.round(x * q) / q;
    tone[i] = held;
  }
  c.mix(out, tone, 0, 0.6, sr);
  for (const e of edges) {
    if (e > main - 0.05) continue;
    c.mix(out, c.burst(r, 0.004, "hp", 3000 + 3000 * r(), 0.8, 0.0003, 0.0012, sr), e, (0.1 + 0.22 * sev) * calm, sr);
    if (r() < (0.2 + 0.6 * sev) * calm) c.mix(out, c.burst(r, 0.01 + 0.02 * r(), "bp", 1800 + 5500 * r(), 1.5, 0.0005, 0.003 + 0.005 * r(), sr), e + 0.002, (0.08 + 0.3 * sev) * (0.5 + 0.5 * r()) * calm, sr);
  }
  if (p.tail) {
    const d = c.seconds(0.085 + 0.02 * r(), sr), damp = c.onepole(sr), fb = 0.32 * calm;
    for (let i = Math.max(d, m - c.seconds(0.15, sr)); i < n; i++) out[i] += fb * damp(out[i - d], 2400);
    const src = new Float32Array(n);
    src.set(out.subarray(m - c.seconds(0.2, sr), n), m - c.seconds(0.2, sr));
    const wet = c.reverb(src, { size: 0.4, decay: 0.3, mixAmt: 1 }, sr) || src;
    for (let i = m - c.seconds(0.2, sr); i < n; i++) out[i] += 0.2 * calm * (wet[i] - src[i]);
    for (let i = m; i < n; i++) { const x = (i - m) / (n - m); out[i] *= (1 - x) * (1 - x); }
  }
  c.finish(out, 0.88, 1.1);
  c.fade(out, 12, sr);
  return { samples: out };
}
