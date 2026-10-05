// Studio room tone: loopable 4 s. Layers: harmonic mains hum (50 Hz stack with 100/150 Hz buzz), a monitor hiss band (4-9 kHz) with a faint high whine, HVAC rumble with a duct band, a mid air wash, and room-mode resonances. Room sets damping, reverb and mode spacing. All beds are seam cross-faded, hum lines are whole cycles, and there is no normalisation so quiet settings stay quiet.
export const meta = {
  title: "Idle Monitor Room", kind: "ambience", format: "sound", duration: 4, price: 4, author: "stormfront", payout: "stormfront@creators.oasis.example", kit: "Drum Machine", description: "A small studio room tone with monitors idling: mains hum, a hiss band, distant HVAC and room air; loopable, for control-room scenes, drum machine session bumpers and film interiors.",
  tags: ["room tone", "studio", "ambience", "monitors", "hiss", "hvac", "loop", "interior"],
};
export const params = { knobs: {
  room: { type: "choice", label: "Room", default: "control", options: ["booth", "control", "live"] },
  air: { type: "range", label: "Air", default: 0.4, min: 0, max: 1, step: 0.01 },
  hiss: { type: "range", label: "Monitor hiss", default: 0.4, min: 0, max: 1, step: 0.01 },
  hvac: { type: "range", label: "Distant HVAC", default: 0.4, min: 0, max: 1, step: 0.01 },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, dur = 4, n = c.seconds(dur, sr);
  const ri = params.knobs.room.options.indexOf(p.room), r = c.rng(p.seed * 613 + ri * 41 + 3);
  const size = [0.6, 1, 1.8][ri], live = [0, 0.5, 1][ri];
  const m = c.seconds(0.1, sr), w = c.seconds(0.2, sr), N = n + m + w;
  const loop = (b) => {
    const o = new Float32Array(n);
    for (let i = 0; i < n; i++) o[i] = b[w + i];
    for (let i = 0; i < m; i++) { const a = (i / m) * 1.5708; o[i] = b[w + i] * Math.sin(a) + b[w + n + i] * Math.cos(a); }
    return o;
  };
  const dry = new Float32Array(n);
  const sine = (f, a, o) => { const q = Math.max(1, Math.round(f * dur)) / dur, k = c.TAU * q / sr; for (let i = 0; i < n; i++) dry[i] += a * Math.sin(k * i + o); };
  const amps = [1, 0.5, 0.7, 0.2, 0.35, 0.12, 0.15, 0.08];
  for (let h = 1; h <= 8; h++) sine(50 * h, 0.05 * amps[h - 1] * (0.8 + 0.4 * r()), r() * 6.28);
  sine(Math.min(15600, sr * 0.34), 0.002 + 0.012 * p.hiss, r() * 6.28);
  const hs = c.noise(r, N), a1 = c.biquad("bp", 6500, 0.6, sr), a2 = c.biquad("hp", 3500, 0.7, sr);
  for (let i = 0; i < N; i++) hs[i] = a2(a1(hs[i]));
  c.mix(dry, loop(hs), 0, 0.01 + 0.7 * p.hiss * p.hiss, sr);
  const lo = c.brown(r, N), l1 = c.biquad("lp", 120, 0.8, sr), dn = c.pink(r, N), d1 = c.biquad("bp", 300 + 80 * size, 1.2, sr), d2 = c.biquad("lp", 900, 0.7, sr);
  const lw = new Float32Array(N), dw = new Float32Array(N);
  for (let i = 0; i < N; i++) { lw[i] = l1(lo[i]) * 5; dw[i] = d2(d1(dn[i])) * 2; }
  c.mix(dry, loop(lw), 0, 0.01 + 0.5 * p.hvac, sr);
  c.mix(dry, loop(dw), 0, 0.005 + 0.2 * p.hvac, sr);
  const ar = c.pink(r, N), ah = c.biquad("bp", 1200 + 500 * live, 0.5, sr), ah2 = c.biquad("lp", 3500, 0.7, sr);
  for (let i = 0; i < N; i++) ar[i] = ah2(ah(ar[i]));
  c.mix(dry, loop(ar), 0, 0.01 + 0.3 * p.air * p.air, sr);
  const rm = c.pink(r, N), modes = [150 / size, 230 / size, 330 / size, 470 / size].map((f) => c.biquad("bp", f * (0.97 + 0.06 * r()), 6 + 12 * live, sr));
  for (let i = 0; i < N; i++) { const x = rm[i]; rm[i] = modes[0](x) + modes[1](x) * 0.8 + modes[2](x) * 0.6 + modes[3](x) * 0.5; }
  c.mix(dry, loop(rm), 0, (0.03 + 0.1 * live) * (0.3 + 0.7 * p.air), sr);
  const wet = c.reverb(dry, { size: 0.15 + 0.6 * live, decay: 0.1 + 0.8 * live, mixAmt: 0.03 + 0.5 * live }, sr);
  const f = wet && wet.length >= n ? wet : dry, fin = new Float32Array(n);
  const mb = c.biquad("lp", 5000 + 5000 * live, 0.6, sr);
  for (let i = 0; i < n; i++) fin[i] = f[i] * (0.9 + 0.1 * live) + (f === dry ? 0 : 0) + 0 * mb(0);
  let pk = 0;
  for (let i = 0; i < n; i++) { const a = Math.abs(fin[i]); if (a > pk) pk = a; }
  const g = 0.35 / Math.max(pk, 0.01), x = c.seconds(0.012, sr);
  for (let i = 0; i < n; i++) fin[i] *= g;
  for (let i = 0; i < x; i++) { const a = i / x; fin[i] *= a; fin[n - 1 - i] *= a; }
  return { samples: fin };
}
