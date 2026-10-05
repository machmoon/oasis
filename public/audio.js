// The browser's sound glue, shared by the sound page, the kit pages and the home hero: one AudioContext unlocked on
// the first gesture (the autoplay policy), WAV fetch + decode, a render path that runs a free program in a Worker
// off the main thread, and the two pictures (waveform, spectrogram) drawn from analyse() in public/sound-dsp.js, the
// same function the server measured with. Playback is one AudioBufferSourceNode per start, as Tone.js's Player does
// (Tone/source/buffer/Player.ts _start: a fresh ToneBufferSource each time), so overlapping takes never cut each other.
import { analyse } from "/sound-dsp.js";

let ctx = null;
const listeners = new Set();
/** The page's AudioContext, created lazily. `unlocked()` is true once a gesture resumed it. */
export function audio() {
  if (!ctx) { ctx = new (window.AudioContext || window.webkitAudioContext)(); ctx.addEventListener?.("statechange", () => listeners.forEach((f) => f(ctx.state))); }
  return ctx;
}
export const unlocked = () => !!ctx && ctx.state === "running";
export function onUnlock(f) { listeners.add(f); return () => listeners.delete(f); }
/** Call from a click: resumes the context so later programmatic plays are allowed. */
export async function unlock() { const c = audio(); if (c.state !== "running") await c.resume(); listeners.forEach((f) => f(c.state)); return c; }
// the first pointer or key anywhere unlocks, so a visitor who clicked a knob can hear the next render
for (const ev of ["pointerdown", "keydown"]) addEventListener(ev, () => { if (ctx && ctx.state !== "running") ctx.resume().catch(() => {}); }, { capture: true, passive: true });

const bufferCache = new Map();
/** Fetches a WAV and decodes it into an AudioBuffer (cached by URL). */
export async function loadWav(url) {
  if (bufferCache.has(url)) return bufferCache.get(url);
  const p = (async () => {
    const r = await fetch(url);
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || `render failed (${r.status})`);
    const takes = r.headers.get("X-Oasis-Takes");
    const buf = await audio().decodeAudioData(await r.arrayBuffer());
    buf.oasisWatermarked = r.headers.get("X-Oasis-Watermarked") === "1";
    if (takes) buf.oasisTakes = JSON.parse(takes);
    return buf;
  })().catch((e) => { bufferCache.delete(url); throw e; });
  bufferCache.set(url, p);
  if (bufferCache.size > 80) bufferCache.delete(bufferCache.keys().next().value);
  return p;
}
/** Float32Array samples into an AudioBuffer (ToneAudioBuffer.fromArray). */
export function toBuffer(samples, sr) { const b = audio().createBuffer(1, samples.length, sr); b.copyToChannel(samples, 0); return b; }
/** Plays a buffer now; returns { source, stop, done } so a page can draw a playhead or stop it. */
export function play(buffer, { gain = 1, when = 0, rate = 1 } = {}) {
  const c = audio(), src = c.createBufferSource(), g = c.createGain();
  src.buffer = buffer; src.playbackRate.value = rate; g.gain.value = gain;
  src.connect(g).connect(c.destination);
  const at = c.currentTime + when;
  src.start(at);
  const done = new Promise((r) => src.addEventListener("ended", r, { once: true }));
  return { source: src, startedAt: at, stop: () => { try { src.stop(); } catch {} }, done };
}

// ---------- rendering a program in a Worker (free sounds and licensed programs: the source is in hand) ----------
let worker = null, seq = 0;
const jobs = new Map();
function getWorker() {
  if (worker) return worker;
  worker = new Worker("/sound-worker.js", { type: "module" });
  worker.onmessage = (e) => { const j = jobs.get(e.data.id); if (!j) return; jobs.delete(e.data.id); e.data.error ? j.reject(new Error(e.data.error)) : j.resolve(e.data); };
  worker.onerror = (e) => { for (const j of jobs.values()) j.reject(new Error(e.message)); jobs.clear(); };
  return worker;
}
/** Runs a program's source with knobs in the Worker; resolves { samples, sr, values, ms }. */
export function renderInWorker(source, knobs, sr = 44100) {
  return new Promise((resolve, reject) => { const id = ++seq; jobs.set(id, { resolve, reject }); getWorker().postMessage({ id, source, knobs, sr }); });
}

// ---------- pictures ----------
// The waveform is drawn the way wavesurfer.js draws playback (src/renderer.ts renderProgress: the played part is a
// second colour clipped to the playhead, plus a cursor line): ink for what is still to come, the accent for what has
// played. The spectrogram is painted one pixel per frame and bin into an ImageData and drawn scaled through the
// browser's bilinear filter, as wavesurfer's spectrogram plugin paints (src/spectrogram-setup.ts: paintColumnPixels
// into an ImageData, createImageBitmap, drawImage at canvas size), through the Roseus colour map Audacity ships as
// its default spectrogram scheme (public/spectrogram-roseus.js names the files). The picture carries its own light
// (near-black at silence) so it reads the same in the light and dark themes, like the model sheet does.
import { ROSEUS, ROSEUS_LUT } from "/spectrogram-roseus.js";
export { analyse };
const css = (name, fallback) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
/** The spectrogram's own background, so a frame around it can match. */
export const SPEC_BG = `rgb(${ROSEUS[0].join(" ")})`;
function fit(canvas) {
  const dpr = devicePixelRatio || 1, w = canvas.clientWidth || 300, h = canvas.clientHeight || 120;
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
  const g = canvas.getContext("2d"); g.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { g, w, h };
}
/** Draws a min/max waveform into a canvas; `at` (0..1) paints the played part in the accent and draws a cursor. */
export function drawWave(canvas, wave, { at = null, color = null, line = null, dim = false } = {}) {
  const { g, w, h } = fit(canvas); g.clearRect(0, 0, w, h);
  const mid = h / 2;
  g.fillStyle = line || css("--line", "#E1E4EA"); g.fillRect(0, mid, w, 1);
  if (!wave?.length) return;
  const ink = color || css("--ink", "#131313"), accent = css("--accent", "#E08A1E");
  const cols = wave.length, bw = w / cols, pad = Math.max(3, h * 0.06);
  g.globalAlpha = dim ? 0.38 : 1;
  for (let c = 0; c < cols; c++) {
    const [lo, hi] = wave[c]; const y0 = mid - hi * (mid - pad), y1 = mid - lo * (mid - pad);
    g.fillStyle = at !== null && (c + 0.5) / cols <= at ? accent : ink;
    g.fillRect(c * bw, y0, Math.max(1, bw - 0.4), Math.max(1, y1 - y0));
  }
  g.globalAlpha = 1;
  if (at !== null) { g.fillStyle = accent; g.fillRect(Math.round(at * w) - 1, 0, 2, h); }
}
const specCache = new WeakMap();
/** Paints a spectrogram (frames × bins, 0..255, low bins first) into an offscreen canvas, once per spec. */
function specImage(spec) {
  if (specCache.has(spec)) return specCache.get(spec);
  const frames = spec.length, bins = spec[0].length;
  const img = new ImageData(frames, bins), d = img.data;
  for (let f = 0; f < frames; f++) for (let b = 0; b < bins; b++) {
    const v = Math.max(0, Math.min(255, spec[f][b] | 0)), o = ((bins - 1 - b) * frames + f) * 4;
    d[o] = ROSEUS_LUT[v * 3]; d[o + 1] = ROSEUS_LUT[v * 3 + 1]; d[o + 2] = ROSEUS_LUT[v * 3 + 2]; d[o + 3] = 255;
  }
  const off = document.createElement("canvas"); off.width = frames; off.height = bins;
  off.getContext("2d").putImageData(img, 0, 0);
  specCache.set(spec, off);
  return off;
}
/** Draws a spectrogram with low frequencies at the bottom; `at` (0..1) draws a cursor. */
export function drawSpec(canvas, spec, { at = null } = {}) {
  const { g, w, h } = fit(canvas);
  g.fillStyle = SPEC_BG; g.fillRect(0, 0, w, h);
  if (!spec?.length) return;
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = "high";
  g.drawImage(specImage(spec), 0, 0, w, h);
  if (at !== null) { g.fillStyle = "rgb(255 255 255 / .85)"; g.fillRect(Math.round(at * w) - 1, 0, 2, h); }
}
/** Animates a playhead across the pictures while a take plays. */
export function playhead(buffer, started, draw) {
  const c = audio(), dur = buffer.duration;
  const f = () => { const k = (c.currentTime - started) / dur; if (k >= 1) { draw(null); return; } draw(Math.max(0, k)); requestAnimationFrame(f); };
  requestAnimationFrame(f);
}
