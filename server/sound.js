// Sound renders on the server: WAV bytes, the preview watermark for unlicensed paid sounds, and the pictures the
// catalogue shows (a waveform, a spectrogram, and the card that stacks both). Analysis comes from the same DSP
// module the programs run against (public/sound-dsp.js), so the browser can draw exactly what the server measured.
import { analyse, wav, rng, biquad, TAU } from "../public/sound-dsp.js";
import { canvas } from "./png.js";

export { analyse };

export const toWav = (samples, sr) => Buffer.from(wav(samples, sr));

/**
 * The preview watermark, the sound registry's "clay until paid": a soft 2.4 kHz tick every 0.6 s and a gentle lowpass
 * at 7 kHz, the way stock-audio sites voice-tag previews (Pond5 and Epidemic overlay a spoken tag; a tick is kinder on
 * a 0.3 s click). The licensed render is the clean program output; nothing here touches the program.
 */
export function watermark(samples, sr) {
  const out = new Float32Array(samples.length), lp = biquad("lp", 7000, 0.7, sr), r = rng(0x5a1e);
  for (let i = 0; i < out.length; i++) out[i] = lp(samples[i]);
  const period = Math.round(0.6 * sr), tick = Math.round(0.03 * sr);
  for (let at = Math.round(0.08 * sr); at < out.length; at += period) {
    const ph = r() * TAU;
    for (let i = 0; i < tick && at + i < out.length; i++) out[at + i] += 0.12 * Math.sin(TAU * 2400 * i / sr + ph) * Math.exp(-i / (tick * 0.35)) * Math.min(1, i / 40);
  }
  for (let i = 0; i < out.length; i++) out[i] = Math.max(-1, Math.min(1, out[i]));
  return out;
}

// ---------- pictures ----------
const INK = [19, 22, 30, 255], ACCENT = [0, 112, 224, 255], FAINT = [19, 22, 30, 28], BG = [255, 255, 255, 255];
const heat = (v) => { // 0..255 into a cool-to-hot ramp on white: the spectrogram's ink
  const t = v / 255;
  return t < 0.5 ? [255 - 220 * t * 2 * 0.55, 255 - 200 * t * 2 * 0.6, 255 - 60 * t * 2 * 0.2, 255] : [134 + 121 * (t - 0.5) * 2 * 0.9, 135 - 100 * (t - 0.5) * 2, 243 - 180 * (t - 0.5) * 2, 255];
};

export function waveformPng(a, width = 640, height = 200, { accent = ACCENT } = {}) {
  const c = canvas(width, height, BG), mid = Math.floor(height / 2);
  c.rect(0, mid, width, 1, FAINT);
  const cols = a.wave.length;
  for (let x = 0; x < width; x++) {
    const [lo, hi] = a.wave[Math.min(cols - 1, Math.floor(x / width * cols))];
    const y0 = Math.round(mid - hi * (height / 2 - 6)), y1 = Math.round(mid - lo * (height / 2 - 6));
    c.vline(x, y0, Math.max(y1, y0 + 1), accent);
  }
  return c.png();
}

export function spectrogramPng(a, width = 640, height = 160) {
  const c = canvas(width, height, BG), frames = a.spec.length, bins = a.spec[0]?.length || 1;
  for (let x = 0; x < width; x++) {
    const row = a.spec[Math.min(frames - 1, Math.floor(x / width * frames))];
    for (let y = 0; y < height; y++) c.put(x, y, heat(row[Math.min(bins - 1, Math.floor((1 - (y + 0.5) / height) * bins))]));
  }
  return c.png();
}

/** The catalogue card: waveform over spectrogram, square, the way the kit grid shows one sound. */
export function cardPng(a, size = 640) {
  const c = canvas(size, size, BG), top = Math.round(size * 0.46), mid = Math.round(top / 2);
  c.rect(0, mid, size, 1, FAINT);
  const cols = a.wave.length;
  for (let x = 0; x < size; x++) {
    const [lo, hi] = a.wave[Math.min(cols - 1, Math.floor(x / size * cols))];
    c.vline(x, Math.round(mid - hi * (mid - 10)), Math.max(Math.round(mid - lo * (mid - 10)), Math.round(mid - hi * (mid - 10)) + 1), INK);
  }
  const frames = a.spec.length, bins = a.spec[0]?.length || 1, h = size - top;
  for (let x = 0; x < size; x++) {
    const row = a.spec[Math.min(frames - 1, Math.floor(x / size * frames))];
    for (let y = 0; y < h; y++) c.put(x, top + y, heat(row[Math.min(bins - 1, Math.floor((1 - (y + 0.5) / h) * bins))]));
  }
  return c.png();
}
