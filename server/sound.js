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

// The card's waveform takes its colour from each column's spectral centroid, the way Freesound draws every waveform it
// serves (MTG/freesound utils/audioprocessing/processing.py `WaveformImage.draw_peaks`: a colour lookup indexed by the
// normalised centroid, on a dark ground with the zero line at alpha 25). The ramp is Roseus, low to high (the stops the
// sound page's spectrogram uses, public/wave.js ROSEUS_STOPS), minus its near-black ends so the quietest colour still
// reads on the dark ground.
const CARD_BG = [11, 12, 16, 255], CARD_ZERO = [255, 255, 255, 25];
const CARD_RAMP = [[125, 31, 159], [196, 42, 130], [240, 92, 83], [247, 180, 101], [254, 251, 249]];
// On a light page the ramp's pale end would vanish into the paper, so the light card drops it and starts deeper
// (Roseus' dark half again), on a transparent ground the page's own surface shows through.
const LIGHT_RAMP = [[62, 18, 96], [125, 31, 159], [196, 42, 130], [226, 78, 66], [214, 128, 34]];
const rampAt = (t, ramp = CARD_RAMP) => {
  const f = Math.max(0, Math.min(1, t)) * (ramp.length - 1), i = Math.min(ramp.length - 2, Math.floor(f)), u = f - i;
  return [0, 1, 2].map((k) => Math.round(ramp[i][k] + (ramp[i + 1][k] - ramp[i][k]) * u));
};
/** Per-column brightness 0..1: the centroid of the spectrogram row under that column, over its bins. */
function columnCentroids(a, width, loud) {
  const frames = a.spec.length, bins = a.spec[0]?.length || 1, out = new Float32Array(width);
  for (let x = 0; x < width; x++) {
    const row = a.spec[Math.min(frames - 1, Math.floor(x / width * frames))] || [];
    let s = 0, w = 0;
    for (let b = 0; b < bins; b++) { const m = Math.pow(10, ((row[b] || 0) / 255 * 72 - 72) / 20); s += m * b; w += m; }
    out[x] = w > 0 ? s / w / (bins - 1) : 0;
  }
  // stretch to the sound's own range, so a dark rumble and a bright click both use the ramp
  let lo = 1, hi = 0; out.forEach((v, x) => { if (!loud[x]) return; if (v < lo) lo = v; if (v > hi) hi = v; });
  if (lo > hi) { lo = 0; hi = 1; }
  const span = Math.max(0.08, hi - lo);
  return out.map((v) => (v - lo) / span);
}

/** The catalogue card: a wide waveform coloured by spectral centroid on a dark ground (2:1 by default), or on a
 *  transparent one with the deeper ramp when theme is "light". */
export function cardPng(a, width = 640, height = Math.round(width / 2), theme = "dark") {
  const light = theme === "light", ramp = light ? LIGHT_RAMP : CARD_RAMP;
  const c = canvas(width, height, light ? [0, 0, 0, 0] : CARD_BG), mid = Math.floor(height / 2), amp = height / 2 - Math.round(height * 0.08);
  c.rect(0, mid, width, 1, light ? [0, 0, 0, 22] : CARD_ZERO);
  const cols = a.wave.length, col = (x) => a.wave[Math.min(cols - 1, Math.floor(x / width * cols))];
  let peak = 0; for (const [lo, hi] of a.wave) peak = Math.max(peak, -lo, hi);
  const gain = peak > 0 ? Math.min(4, 0.96 / peak) : 1; // quiet sounds still fill the card
  // a column under 4% of full scale is a tail or the noise floor: drawn dim, and left out of the colour range
  const loud = Array.from({ length: width }, (_, x) => (col(x)[1] - col(x)[0]) * gain > 0.08);
  const tone = columnCentroids(a, width, loud);
  for (let x = 0; x < width; x++) {
    const [lo, hi] = col(x);
    const y0 = Math.round(mid - hi * gain * amp), y1 = Math.round(mid - lo * gain * amp);
    c.vline(x, y0, Math.max(y1, y0 + 1), loud[x] ? [...rampAt(tone[x], ramp), 255] : [125, 31, 159, light ? 110 : 150]);
  }
  return c.png();
}
