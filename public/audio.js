// The browser's sound glue, shared by the sound page, the kit pages and the home hero: one AudioContext unlocked on
// the first gesture (the autoplay policy), WAV fetch + decode, a render path that runs a free program in a Worker
// off the main thread, and analyse() from public/sound-dsp.js, the
// same function the server measured with. Playback is one AudioBufferSourceNode per start, as Tone.js's Player does
// (Tone/source/buffer/Player.ts _start: a fresh ToneBufferSource each time), so overlapping takes never cut each other.
import { analyse } from "/sound-dsp.js";
import { buildLook } from "/fx.js";

let ctx = null;
const listeners = new Set();
/** The page's AudioContext, created lazily. `unlocked()` is true once a gesture resumed it. */
export function audio() {
  if (!ctx) { ctx = new (window.AudioContext || window.webkitAudioContext)(); ctx.addEventListener?.("statechange", () => listeners.forEach((f) => f(ctx.state))); }
  return ctx;
}
export const unlocked = () => !!ctx && ctx.state === "running";
export function onUnlock(f) { listeners.add(f); return () => listeners.delete(f); }
let bus = null, tap = null, post = null, look = null;
/** The master bus every take plays into: gain -> (a look, public/fx.js) -> analyser -> speakers. */
export function output() {
  if (!bus) { const c = audio(); bus = c.createGain(); post = c.createGain(); tap = c.createAnalyser(); tap.fftSize = 2048; tap.smoothingTimeConstant = 0.72; bus.connect(post); post.connect(tap).connect(c.destination); }
  return bus;
}
/** Puts a look on the master bus (or "dry" to take it off); what the analyser shows is what you hear. */
export function setBusLook(id) {
  output();
  const old = look;
  bus.disconnect();
  look = id && id !== "dry" ? buildLook(audio(), id) : null;
  if (look) { bus.connect(look.input); look.output.connect(post); } else bus.connect(post);
  if (old) setTimeout(() => old.stop(), 60);
}
/** The AnalyserNode on the master bus (the live spectrum and scope read it). */
export function analyser() { output(); return tap; }
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
  src.connect(g).connect(output());
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

export { analyse };
