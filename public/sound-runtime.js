// The sound runtime a licensed CDN import pulls in next to the program (the way blocks-runtime.js serves 3D pieces):
// knob resolution (the same rules as server/knobs.js) and the Web Audio glue. The program itself never touches
// Web Audio; it returns samples, and this turns them into an AudioBuffer (Tone.js ToneAudioBuffer.fromArray:
// context.createBuffer + copyToChannel) and plays them (Tone.js Player: one AudioBufferSourceNode per start()).
import * as dsp from "./sound-dsp.js";
export { dsp };

const HEX = /^#[0-9a-fA-F]{6}$/;
export function resolveKnobs(params, input = {}) {
  const out = {};
  for (const [name, k] of Object.entries(params?.knobs || {})) {
    const v = input[name];
    switch (k.type) {
      case "color": out[name] = typeof v === "string" && HEX.test(v) ? v.toUpperCase() : k.default; break;
      case "range": { let n = Number(v); if (v === undefined || v === null || v === "" || Number.isNaN(n)) n = k.default; n = Math.min(k.max, Math.max(k.min, n)); if (k.step) n = Math.round((n - k.min) / k.step) * k.step + k.min; out[name] = Math.round(n * 10000) / 10000; break; }
      case "choice": out[name] = k.options?.includes(v) ? v : k.default; break;
      case "toggle": out[name] = v === undefined ? !!k.default : v === true || v === "true" || v === 1; break;
      case "text": out[name] = typeof v === "string" ? v.slice(0, k.maxLength || 80) : k.default; break;
      default: out[name] = v ?? k.default;
    }
  }
  return out;
}

/** Runs a program's build with the DSP kit at a sample rate. Pure: no audio context needed. */
export function renderProgram(mod, knobs = {}, sr = 44100) {
  const values = resolveKnobs(mod.params, knobs);
  const out = mod.build(values, { sr, ...dsp });
  const s = out?.samples || out;
  return { sr, samples: s instanceof Float32Array ? s : Float32Array.from(s), values };
}

/** Float32Array samples into an AudioBuffer of the context (ToneAudioBuffer.fromArray). */
export function toAudioBuffer(ctx, samples, sr) {
  const buf = ctx.createBuffer(1, samples.length, sr);
  buf.copyToChannel(samples, 0);
  return buf;
}

/** Plays a buffer now (or at `when`), with a gain, returning the source node so a caller can stop it. */
export function play(ctx, buffer, { when = 0, gain = 1, rate = 1, destination = ctx.destination } = {}) {
  const src = ctx.createBufferSource();
  src.buffer = buffer; src.playbackRate.value = rate;
  const g = ctx.createGain(); g.gain.value = gain;
  src.connect(g).connect(destination);
  src.start(ctx.currentTime + when);
  return src;
}
