// Looks for sound: the same idea as Polyfork's "six shader looks" on every model (polyfork.dev/blog
// six-shader-looks-and-which-ones-you-can-keep, read for docs/POLYFORK-GAP.md), where a look is a treatment over the
// asset and the post says which ones survive export. Here a look is a chain of Web Audio nodes over a whole kit, built
// the same way on the live AudioContext and on the OfflineAudioContext that renders an export, so every look is kept in
// the WAV. Each one is a recognisable studio move, wet over dry:
//   Room, Hall: a convolution reverb whose impulse is the one Tone.js generates (Tone/effect/Reverb.ts generate():
//     stereo white noise, silent for the pre-delay, then an exponential approach to zero over the decay; the time
//     constant is Tone's exponentialApproachValueAtTime, ln(decay + 1) / ln(200)).
//   Tape: soft saturation, a short delay swung by a slow LFO (wow) and a fast one (flutter), the top rolled off.
//   8-bit: an amplitude crush (a staircase WaveShaper curve, 5 bits) band-limited like a cheap DAC. It is not a sample-
//     rate reduction, which native nodes cannot do without an AudioWorklet.
//   Radio: the telephone band (450 Hz to 3.4 kHz) with a presence bump and some drive.
//   Underwater: a resonant lowpass at 420 Hz with a slow chorus.
export const LOOKS = [
  { id: "dry", label: "Dry" },
  { id: "room", label: "Room" },
  { id: "hall", label: "Hall" },
  { id: "tape", label: "Tape" },
  { id: "lofi", label: "8-bit" },
  { id: "radio", label: "Radio" },
  { id: "under", label: "Underwater" },
];

const irCache = new WeakMap();
function impulse(ctx, decay, pre) {
  const key = `${decay}:${pre}:${ctx.sampleRate}`;
  let byCtx = irCache.get(ctx); if (!byCtx) irCache.set(ctx, (byCtx = new Map()));
  if (byCtx.has(key)) return byCtx.get(key);
  const sr = ctx.sampleRate, n = Math.ceil((decay + pre) * sr), b = ctx.createBuffer(2, n, sr), tc = Math.log(decay + 1) / Math.log(200);
  for (let c = 0; c < 2; c++) {
    const d = b.getChannelData(c);
    for (let i = 0; i < n; i++) { const t = i / sr; d[i] = t < pre ? 0 : (Math.random() * 2 - 1) * Math.exp(-(t - pre) / tc); }
  }
  byCtx.set(key, b);
  return b;
}
const shaper = (ctx, f) => { const n = 2048, c = new Float32Array(n); for (let i = 0; i < n; i++) c[i] = f((i / (n - 1)) * 2 - 1); const s = ctx.createWaveShaper(); s.curve = c; s.oversample = "2x"; return s; };
const biq = (ctx, type, freq, Q = 0.7, gain = 0) => { const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = Q; f.gain.value = gain; return f; };
const lfo = (ctx, rate, depth, param) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = rate; g.gain.value = depth; o.connect(g).connect(param); o.start(); return o; };

/** Builds a look on a context: { input, output, stop() }. Connect your source to input and output onward. */
export function buildLook(ctx, id) {
  const input = ctx.createGain(), output = ctx.createGain(), dry = ctx.createGain(), wet = ctx.createGain();
  input.connect(dry).connect(output); wet.connect(output);
  const oscs = [];
  const chain = (...nodes) => { nodes.reduce((a, b) => (a.connect(b), b), input); nodes[nodes.length - 1].connect(wet); };
  if (id === "room" || id === "hall") {
    const conv = ctx.createConvolver(); conv.buffer = id === "room" ? impulse(ctx, 0.7, 0.006) : impulse(ctx, 2.8, 0.028);
    if (id === "room") { chain(conv); dry.gain.value = 0.86; wet.gain.value = 0.32; }
    else { chain(conv, biq(ctx, "lowpass", 6500)); dry.gain.value = 0.78; wet.gain.value = 0.46; }
  } else if (id === "tape") {
    const sat = shaper(ctx, (x) => Math.tanh(1.7 * x) / Math.tanh(1.7)), dl = ctx.createDelay(0.05); dl.delayTime.value = 0.008;
    oscs.push(lfo(ctx, 0.55, 0.0012, dl.delayTime), lfo(ctx, 8.7, 0.00012, dl.delayTime));
    chain(sat, dl, biq(ctx, "lowpass", 9500), biq(ctx, "highshelf", 6000, 0.7, -3));
    dry.gain.value = 0; wet.gain.value = 0.95;
  } else if (id === "lofi") {
    const steps = 2 ** 5;
    chain(biq(ctx, "highpass", 120), shaper(ctx, (x) => Math.round(x * (steps / 2)) / (steps / 2)), biq(ctx, "lowpass", 5200));
    dry.gain.value = 0; wet.gain.value = 0.9;
  } else if (id === "radio") {
    chain(biq(ctx, "highpass", 450, 0.9), biq(ctx, "peaking", 1800, 1.2, 6), shaper(ctx, (x) => Math.tanh(2.4 * x) / Math.tanh(2.4)), biq(ctx, "lowpass", 3400, 0.9));
    dry.gain.value = 0; wet.gain.value = 0.85;
  } else if (id === "under") {
    const dl = ctx.createDelay(0.05); dl.delayTime.value = 0.018; oscs.push(lfo(ctx, 0.3, 0.004, dl.delayTime));
    chain(biq(ctx, "lowpass", 420, 6), dl);
    dry.gain.value = 0; wet.gain.value = 1.15;
  } else { wet.gain.value = 0; }
  return { input, output, stop: () => { oscs.forEach((o) => { try { o.stop(); } catch {} }); try { input.disconnect(); output.disconnect(); } catch {} } };
}
