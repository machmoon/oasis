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
export { analyse };
const css = (name, fallback) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
/** Draws a min/max waveform into a canvas; `at` (0..1) draws a playhead. */
export function drawWave(canvas, wave, { at = null, color = null, line = null, dim = false } = {}) {
  const dpr = devicePixelRatio || 1, w = canvas.clientWidth || 300, h = canvas.clientHeight || 120;
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
  const g = canvas.getContext("2d"); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
  const mid = h / 2;
  g.fillStyle = line || css("--line", "#E1E4EA"); g.fillRect(0, mid, w, 1);
  if (!wave?.length) return;
  g.fillStyle = color || css("--ink", "#131313"); if (dim) g.globalAlpha = 0.35;
  const cols = wave.length, bw = w / cols;
  for (let c = 0; c < cols; c++) { const [lo, hi] = wave[c]; const y0 = mid - hi * (mid - 4), y1 = mid - lo * (mid - 4); g.fillRect(c * bw, y0, Math.max(1, bw - 0.4), Math.max(1, y1 - y0)); }
  g.globalAlpha = 1;
  if (at !== null) { g.fillStyle = css("--accent", "#0070E0"); g.fillRect(at * w - 1, 0, 2, h); }
}
const heat = (v) => { const t = v / 255; return t < 0.5 ? `rgb(${255 - 121 * t * 2 | 0},${255 - 120 * t * 2 | 0},${255 - 12 * t * 2 | 0})` : `rgb(${134 + 109 * (t - 0.5) * 2 | 0},${135 - 100 * (t - 0.5) * 2 | 0},${243 - 180 * (t - 0.5) * 2 | 0})`; };
/** Draws a spectrogram (frames × bins, 0..255) with low frequencies at the bottom. */
export function drawSpec(canvas, spec, { at = null } = {}) {
  const dpr = devicePixelRatio || 1, w = canvas.clientWidth || 300, h = canvas.clientHeight || 120;
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
  const g = canvas.getContext("2d"); g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.fillStyle = "#fff"; g.fillRect(0, 0, w, h);
  if (!spec?.length) return;
  const frames = spec.length, bins = spec[0].length, fw = w / frames, bh = h / bins;
  for (let f = 0; f < frames; f++) for (let b = 0; b < bins; b++) { const v = spec[f][b]; if (v < 8) continue; g.fillStyle = heat(v); g.fillRect(f * fw, h - (b + 1) * bh, fw + 0.5, bh + 0.5); }
  if (at !== null) { g.fillStyle = css("--accent", "#0070E0"); g.fillRect(at * w - 1, 0, 2, h); }
}
/** Animates a playhead across the pictures while a take plays. */
export function playhead(buffer, started, draw) {
  const c = audio(), dur = buffer.duration;
  const f = () => { const k = (c.currentTime - started) / dur; if (k >= 1) { draw(null); return; } draw(Math.max(0, k)); requestAnimationFrame(f); };
  requestAnimationFrame(f);
}
