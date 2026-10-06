// Every sound picture on the site is wavesurfer.js v7 (github.com/katspaugh/wavesurfer.js, BSD-3-Clause, vendored
// from the npm build in public/vendor/wavesurfer/ with its licence). What is ours is the glue, and each piece names the
// wavesurfer file it follows:
//
// - BufferMedia is a port of src/webaudio.ts (WebAudioPlayer, "a Web Audio buffer player emulating the behavior of an
//   HTML5 Audio element") passed as wavesurfer's `media` option. Two changes: it plays on the page's one AudioContext
//   into the master bus (public/audio.js output(), which carries the AnalyserNode the live view reads) instead of a
//   context of its own, and it takes an AudioBuffer we already hold (a Worker render or a decoded render.wav) instead
//   of fetching `src`. So wavesurfer's own transport, click-to-seek, cursor and progress run on our audio graph.
// - The audio goes in as wavesurfer "peaks" at full resolution: ws.load("", [samples], duration). src/decoder.ts
//   createBuffer turns that into an AudioBuffer-shaped object whose sampleRate is length / duration, so the
//   Spectrogram plugin (src/plugins/spectrogram.ts, Roseus is its default colorMap) runs its FFT on the real samples
//   with no second decode.
// - The rebuild morph is a renderFunction (the WaveSurferOptions hook src/renderer.ts calls in renderSingleCanvas). It
//   computes bars the way renderBarWaveform does (src/renderer-utils.ts calculateBarSegments: per bar, the largest
//   positive and negative excursion, a rounded rect from mid - top to mid + bottom) and, while a rebuild settles,
//   draws each bar between its old and new height. Motion's spring (vendor/motion) drives the mix from 0 to 1 and
//   each frame calls ws.setOptions({}), which re-renders through the same path (renderer.ts setOptions -> reRender).
// - The live view follows the Record plugin's renderMicStream (src/plugins/record.ts): read an AnalyserNode every
//   frame and hand the numbers to a wavesurfer instance with load("", [data], duration). Here the analyser is on the
//   playback bus, not a microphone, and there are two instances: a spectrum (barAlign "bottom", a Roseus gradient)
//   and an oscilloscope line (a renderFunction stroking the time-domain samples).
import WaveSurfer from "/vendor/wavesurfer/wavesurfer.esm.js";
import Hover from "/vendor/wavesurfer/plugins/hover.esm.js";
import Timeline from "/vendor/wavesurfer/plugins/timeline.esm.js";
import Spectrogram from "/vendor/wavesurfer/plugins/spectrogram.esm.js";
import Minimap from "/vendor/wavesurfer/plugins/minimap.esm.js";
import Regions from "/vendor/wavesurfer/plugins/regions.esm.js";
import { audio, output, analyser } from "/audio.js";
import { animate } from "/vendor/motion/index.js";

export { WaveSurfer, Minimap, Regions };
export const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const tok = (n, fb) => getComputedStyle(document.documentElement).getPropertyValue(n).trim() || fb;
const scheme = matchMedia("(prefers-color-scheme: dark)");
/** Calls f now and whenever the colour scheme flips, so canvases repaint with the new tokens. */
export function onTheme(f) { f(); const g = () => f(); scheme.addEventListener("change", g); return () => scheme.removeEventListener("change", g); }
/** Roseus stops (github.com/dofuuz/roseus, the table wavesurfer's fft.ts ships), bright to dark, for gradients. */
export const ROSEUS_STOPS = ["#FEFBF9", "#F7B465", "#F05C53", "#C42A82", "#7D1F9F", "#2A2675", "#040507"];

// ---------- BufferMedia: src/webaudio.ts WebAudioPlayer, on our context and bus ----------
export class BufferMedia {
  constructor() {
    this.listeners = {};
    this.ctx = audio();
    this.gainNode = this.ctx.createGain();
    this.gainNode.connect(output());
    this.bufferNode = null; this.buffer = null;
    this.playStartTime = 0; this.playbackPosition = 0; this._playbackRate = 1; this._muted = false;
    this.paused = true; this.seeking = false; this.autoplay = false; this.currentSrc = ""; this.crossOrigin = null;
  }
  // event-emitter.ts semantics: on() returns an unsubscribe; { once } is honoured
  addEventListener(ev, fn, opts) {
    const set = (this.listeners[ev] ||= new Set());
    if (opts?.once) { const w = (...a) => { set.delete(w); fn(...a); }; set.add(w); return () => set.delete(w); }
    set.add(fn); return () => set.delete(fn);
  }
  removeEventListener(ev, fn) { this.listeners[ev]?.delete(fn); }
  emit(ev) { this.listeners[ev]?.forEach((f) => f()); }
  get src() { return this.currentSrc; }
  set src(v) { this.currentSrc = v || ""; }
  async load() {}
  remove() { this.pause(); }
  removeAttribute(name) { if (name === "currentTime") this.currentTime = 0; }
  canPlayType(t) { return /^(audio|video)\//.test(t) ? "maybe" : ""; }
  /** Hands it the take to play; the position returns to the start. */
  setBuffer(buffer) {
    const was = !this.paused; if (was) this._pause();
    this.buffer = buffer; this.playbackPosition = 0; this.paused = true;
    if (was) this.emit("pause");
    this.emit("loadedmetadata"); this.emit("canplay");
  }
  _play() {
    if (!this.paused || !this.buffer) return;
    this.paused = false;
    if (this.bufferNode) { this.bufferNode.onended = null; this.bufferNode.disconnect(); }
    this.bufferNode = this.ctx.createBufferSource();
    this.bufferNode.buffer = this.buffer;
    this.bufferNode.playbackRate.value = this._playbackRate;
    this.bufferNode.connect(this.gainNode);
    let pos = this.playbackPosition;
    if (pos >= this.duration || pos < 0) { pos = 0; this.playbackPosition = 0; }
    this.bufferNode.start(this.ctx.currentTime, pos);
    this.playStartTime = this.ctx.currentTime;
    this.bufferNode.onended = () => { if (!this.paused && this.duration - this.currentTime < 0.01) { this.pause(); this.playbackPosition = 0; this.emit("ended"); } };
  }
  _pause() {
    this.paused = true;
    if (this.bufferNode) { this.bufferNode.onended = null; try { this.bufferNode.stop(); } catch {} }
    this.playbackPosition += (this.ctx.currentTime - this.playStartTime) * this._playbackRate;
  }
  async play() {
    if (!this.paused) return;
    if (this.ctx.state !== "running") await this.ctx.resume();
    this._play(); this.emit("play");
  }
  pause() { if (this.paused) return; this._pause(); this.emit("pause"); }
  get currentTime() { return this.paused ? this.playbackPosition : this.playbackPosition + (this.ctx.currentTime - this.playStartTime) * this._playbackRate; }
  set currentTime(v) { const was = !this.paused; if (was) this._pause(); this.playbackPosition = v; if (was) this._play(); this.emit("seeking"); this.emit("timeupdate"); }
  get duration() { return this.buffer?.duration || 0; }
  get ended() { return false; }
  get playbackRate() { return this._playbackRate; }
  set playbackRate(v) { this._playbackRate = v || 1; if (this.bufferNode) this.bufferNode.playbackRate.value = this._playbackRate; }
  get volume() { return this.gainNode.gain.value; }
  set volume(v) { this.gainNode.gain.value = v; this.emit("volumechange"); }
  get muted() { return this._muted; }
  set muted(v) { this._muted = !!v; this.gainNode.gain.value = v ? 0 : 1; }
  getGainNode() { return this.gainNode; }
}

// ---------- the morphing bar renderer ----------
/** Bars from samples, renderer-utils.ts calculateBarSegments: per bar, the max positive and max negative excursion. */
function barsOf(ch, n) {
  const top = new Float32Array(n), bot = new Float32Array(n), len = ch.length;
  for (let i = 0; i < n; i++) {
    const a = Math.floor((i * len) / n), b = Math.max(a + 1, Math.floor(((i + 1) * len) / n));
    let t = 0, m = 0;
    for (let j = a; j < b && j < len; j++) { const v = ch[j]; if (v > t) t = v; else if (-v > m) m = -v; }
    top[i] = t; bot[i] = m;
  }
  return { top, bot, n };
}
const resample = (bars, n) => {
  if (!bars || bars.n === n) return bars;
  const top = new Float32Array(n), bot = new Float32Array(n);
  for (let i = 0; i < n; i++) { const j = Math.min(bars.n - 1, Math.floor((i * bars.n) / n)); top[i] = bars.top[j]; bot[i] = bars.bot[j]; }
  return { top, bot, n };
};
// ---------- bars coloured by spectral centroid ----------
// Each bar takes its colour from the spectral centroid under it, the way Freesound draws its waveforms (MTG/freesound
// utils/audioprocessing/processing.py WaveformImage.draw_peaks: a colour lookup indexed by the normalised centroid) and
// the way the server draws every card (server/sound.js cardPng): the same Roseus ramp, the same "a bar under 4% of full
// scale is drawn dim and left out of the range" rule, so a sound's card and its page agree.
const TONE_RAMP = [[125, 31, 159], [196, 42, 130], [240, 92, 83], [247, 180, 101], [254, 251, 249]];
const TONE_DIM = "rgb(125 31 159 / .59)", TONE_STEPS = 32;
const TONE_FILLS = Array.from({ length: TONE_STEPS }, (_, q) => {
  const f = (q / (TONE_STEPS - 1)) * (TONE_RAMP.length - 1), i = Math.min(TONE_RAMP.length - 2, Math.floor(f)), u = f - i;
  return `rgb(${[0, 1, 2].map((c) => Math.round(TONE_RAMP[i][c] + (TONE_RAMP[i + 1][c] - TONE_RAMP[i][c]) * u)).join(" ")})`;
});
/** Per bar 0..1, or -1 for a quiet bar: the centroid of a 512-sample Hann window at the bar's centre over 32 bins. */
function tonesOf(ch, bars) {
  const n = bars.n, win = 512, bins = 32, out = new Float32Array(n), hann = new Float32Array(win), len = ch.length;
  for (let i = 0; i < win; i++) hann[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / win);
  const ks = Array.from({ length: bins }, (_, b) => Math.min(win / 2 - 1, Math.round(Math.pow((b + 0.5) / bins, 1.8) * (win / 2 - 2)) + 1));
  let peak = 0; for (let i = 0; i < n; i++) peak = Math.max(peak, bars.top[i], bars.bot[i]);
  const gain = peak > 0 ? Math.min(4, 0.96 / peak) : 1;
  let lo = 1, hi = 0;
  for (let i = 0; i < n; i++) {
    if ((bars.top[i] + bars.bot[i]) * gain <= 0.08) { out[i] = -1; continue; }
    const o = Math.max(0, Math.min(len - win, Math.floor(((i + 0.5) * len) / n) - win / 2));
    let s = 0, w = 0;
    for (let b = 0; b < bins; b++) {
      let re = 0, im = 0; const k = ks[b];
      for (let j = 0; j < win; j++) { const v = (ch[o + j] || 0) * hann[j], a = (2 * Math.PI * k * j) / win; re += v * Math.cos(a); im -= v * Math.sin(a); }
      const m = Math.sqrt(re * re + im * im); s += m * b; w += m;
    }
    out[i] = w > 0 ? s / w / (bins - 1) : 0;
    if (out[i] < lo) lo = out[i]; if (out[i] > hi) hi = out[i];
  }
  if (lo > hi) { lo = 0; hi = 1; }
  const span = Math.max(0.08, hi - lo);
  for (let i = 0; i < n; i++) if (out[i] >= 0) out[i] = (out[i] - lo) / span;
  return out;
}

function morphRenderer(state, { barWidth, barGap, barRadius, scale = 0.94, floor = 1 }) {
  return (channels, ctx) => {
    const { width: W, height: H } = ctx.canvas, pr = Math.max(1, devicePixelRatio || 1);
    const bw = barWidth * pr, sp = bw + barGap * pr, n = Math.max(1, Math.floor(W / sp)), mid = H / 2;
    const ch = channels[0];
    if (state.cacheCh !== ch || state.cache?.n !== n) { state.cacheCh = ch; state.cache = barsOf(ch, n); state.tones = null; }
    const to = state.cache, from = state.k < 1 ? resample(state.from, n) : null, k = state.k;
    // wavesurfer calls this once and makes the progress layer from a copy recoloured "source-in" with progressColor
    // (src/renderer.ts renderSingleCanvas), so the played part still reads as one accent. A watermarked preview keeps
    // its colours at reduced strength: the same sound as its card, visibly not yet licensed.
    const toned = state.tone;
    if (toned) ctx.globalAlpha = state.dim ? 0.62 : 1;
    if (toned && !state.tones) state.tones = tonesOf(ch, to);
    const shown = { top: new Float32Array(n), bot: new Float32Array(n), n };
    const paths = toned ? new Map() : null;
    if (!toned) ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const t = from ? from.top[i] + (to.top[i] - from.top[i]) * k : to.top[i];
      const b = from ? from.bot[i] + (to.bot[i] - from.bot[i]) * k : to.bot[i];
      shown.top[i] = t; shown.bot[i] = b;
      const th = Math.max(0, t * mid * scale), bh = Math.max(0, b * mid * scale), h = Math.max(floor * pr, th + bh);
      const y = th + bh < floor * pr ? mid - h / 2 : mid - th;
      let path = ctx;
      if (paths) {
        const tone = state.tones[Math.min(state.tones.length - 1, i)], key = tone < 0 ? TONE_DIM : TONE_FILLS[Math.round(tone * (TONE_STEPS - 1))];
        if (!paths.has(key)) paths.set(key, new Path2D());
        path = paths.get(key);
      }
      if (barRadius && path.roundRect) path.roundRect(i * sp, y, bw, h, barRadius * pr); else path.rect(i * sp, y, bw, h);
    }
    if (paths) for (const [fill, path] of paths) { ctx.fillStyle = fill; ctx.fill(path); }
    else ctx.fill();
    state.shown = shown;
  };
}


// ---------- the spectrogram follows every take ----------
// The vendored 7.12.12 plugin keeps cachedFrequencies keyed by cachedBuffer, but its throttledRender takes the
// fastRender path (redraw cachedFrequencies) whenever the zoom has not moved, without checking that the decoded data
// is still the buffer the cache came from, and a redraw that lands while render() is computing is dropped
// (`if (this.isRendering) return`). A rebuild here keeps the zoom, so every take after the first redrew the first
// take's picture. Upstream fixed both in v8: dist/plugins/spectrogram.esm.js (wavesurfer.js 8.0.1, function ze, the
// throttledRender successor) takes the fast path only when `getDecodedData() === cachedBuffer`, and a redraw that
// arrives mid-render sets a pending flag that Fe() replays once the render finishes. This patches the 7.x instance
// the same way rather than taking a major-version upgrade.
function followTakes(spec) {
  let pending = false;
  const stale = () => !!spec.cachedBuffer && spec.cachedBuffer !== spec.wavesurfer?.getDecodedData();
  const throttled = spec.throttledRender.bind(spec), render = spec.render.bind(spec);
  spec.throttledRender = () => {
    if (spec.isRendering) { pending = true; return; }
    if (stale()) spec.clearCache();
    throttled();
  };
  spec.render = async () => {
    try { await render(); } finally { if (pending || stale()) { pending = false; spec.throttledRender(); } }
  };
  return spec;
}
/** A still copy of the spectrogram's canvases laid over it, faded out once the next take's picture is drawn. */
function specGhost(spec) {
  const wrap = spec.wrapper, src = spec.canvases || [];
  if (!wrap || !src.length) return null;
  const g = document.createElement("div"); g.setAttribute("part", "spec-ghost");
  Object.assign(g.style, { position: "absolute", left: 0, top: 0, width: "100%", height: "100%", zIndex: 5, pointerEvents: "none" });
  for (const c of src) { const k = document.createElement("canvas"); k.width = c.width; k.height = c.height; k.style.cssText = c.style.cssText; k.getContext("2d").drawImage(c, 0, 0); g.appendChild(k); }
  wrap.appendChild(g);
  return g;
}

// ---------- hover readout: time and level ----------
const fmtTime = (s) => (s < 1 ? `${Math.round(s * 1000)} ms` : `${s.toFixed(2)} s`);
function levelAt(buffer, sec, win = 0.01) {
  if (!buffer) return null;
  const d = buffer.getChannelData(0), sr = buffer.sampleRate, c = Math.round(sec * sr), h = Math.round((win * sr) / 2);
  let s = 0, n = 0; for (let i = Math.max(0, c - h); i < Math.min(d.length, c + h); i++) { s += d[i] * d[i]; n++; }
  const rms = Math.sqrt(s / Math.max(1, n));
  return rms > 1e-6 ? 20 * Math.log10(rms) : -Infinity;
}
/** A "nice" tick step (1, 2, 5 x 10^n) giving about `target` ticks across the duration. */
function niceStep(dur, target) {
  const raw = dur / target, p = Math.pow(10, Math.floor(Math.log10(raw)));
  return [1, 2, 5, 10].map((m) => m * p).find((s) => s >= raw) || raw;
}

/** A take without its trailing digital silence (below -60 dBFS), keeping 80 ms of tail, so the waveform and the
 * spectrogram fill their frame instead of running a flat line to the edge. Nothing audible is cut. */
function trimTail(buf) {
  if (!buf || buf.numberOfChannels !== 1) return buf;
  const d = buf.getChannelData(0); let last = d.length - 1;
  while (last > 0 && Math.abs(d[last]) < 0.001) last--;
  const keep = Math.min(d.length, last + Math.round(0.08 * buf.sampleRate));
  if (keep >= d.length * 0.95) return buf;
  const out = new AudioBuffer({ length: keep, sampleRate: buf.sampleRate, numberOfChannels: 1 });
  out.copyToChannel(d.subarray(0, keep), 0);
  for (const k of ["oasisWatermarked", "oasisTakes"]) if (buf[k] !== undefined) out[k] = buf[k];
  return out;
}

/**
 * Mounts a waveform. Options: height, spectrogram (px height or 0), timeline (an element to hold the ticks),
 * hover, barWidth/barGap/barRadius, compact (no interaction), onState(playing).
 * Returns { ws, media, show(buffer, { dim }), play(), stop(), toggle(), playing, buffer, destroy() }.
 */
export function mountWave(container, opts = {}) {
  const { height = 160, spectrogram = 0, timeline = null, hover = true, barWidth = 2, barGap = 1, barRadius = 2, compact = false, onState = () => {}, specLabels = true, wsOptions = {}, extraPlugins = [], tone = true } = opts;
  const media = new BufferMedia();
  const state = { k: 1, from: null, shown: null, tone, dim: false };
  let dim = false, buffer = null, anim = null, tl = null, tlDur = 0, ghost = null, ghostAnim = null, offGhost = null;
  const dropGhost = () => { ghostAnim?.stop(); offGhost?.(); offGhost = null; ghost?.remove(); ghost = null; };
  const colors = () => {
    const ink = tok("--ink", "#15171C"), muted = tok("--muted", "#6B7280");
    return { waveColor: dim ? muted : ink, progressColor: tok("--accent", "#E08A1E"), cursorColor: tok("--accent", "#E08A1E") };
  };
  const plugins = [];
  if (hover && !compact) plugins.push(Hover.create({ lineColor: tok("--accent", "#E08A1E"), lineWidth: 1, labelBackground: tok("--ink", "#15171C"), labelColor: tok("--bg", "#F6F7F9"), labelSize: "11px",
    formatTimeCallback: (s) => { const db = levelAt(buffer, s); return `${fmtTime(s)} · ${db === null ? "" : db === -Infinity ? "silence" : `${db.toFixed(1)} dB`}`; } }));
  const spec = spectrogram ? followTakes(Spectrogram.create({ height: spectrogram, labels: specLabels, labelsColor: "rgb(255 255 255 / .62)", labelsHzColor: "rgb(255 255 255 / .45)", labelsBackground: "rgba(0, 0, 0, 0.55)", colorMap: "roseus", scale: "mel", fftSamples: 512, windowFunc: "hann", gainDB: 24, rangeDB: 84 })) : null;
  if (spec) plugins.push(spec);
  plugins.push(...extraPlugins);
  const ws = WaveSurfer.create({
    container, media, height, ...colors(), cursorWidth: compact ? 0 : 2, interact: !compact, dragToSeek: !compact, normalize: false, hideScrollbar: true, autoScroll: false,
    renderFunction: morphRenderer(state, { barWidth, barGap, barRadius }), plugins, ...wsOptions,
  });
  const offTheme = onTheme(() => ws.setOptions(colors()));
  ws.on("play", () => onState(true));
  ws.on("pause", () => onState(false));
  ws.on("finish", () => { ws.setTime(0); onState(false); });
  const setTimeline = (dur) => {
    if (!timeline || Math.abs(dur - tlDur) < 1e-3) return;
    tlDur = dur; tl?.destroy();
    const step = niceStep(dur, Math.max(3, Math.min(10, Math.round((container.clientWidth || 600) / 90))));
    tl = ws.registerPlugin(Timeline.create({ container: timeline, height: 18, timeInterval: step / 2, primaryLabelInterval: step, secondaryLabelInterval: step, secondaryLabelOpacity: 0,
      formatTimeCallback: (s) => (s === 0 ? "0" : dur < 2 ? `${Math.round(s * 1000)}ms` : `${Math.round(s * 100) / 100}s`),
      style: { color: "var(--muted)", fontFamily: "var(--font-mono)", fontSize: "11px" } }));
  };
  const api = {
    ws, media,
    get buffer() { return buffer; },
    get playing() { return !media.paused; },
    /** Shows a take. When a picture is already up, the old bars glide into the new ones. */
    async show(buf, { dim: d = false, morph = true } = {}) {
      buf = trimTail(buf);
      const was = !media.paused;
      if (was) ws.pause();
      dim = d; state.dim = d; buffer = buf;
      anim?.stop();
      const glide = morph && !reduced && !!state.shown;
      state.from = glide ? state.shown : null; state.k = glide ? 0 : 1;
      // the spectrogram cross-fades with the bar morph: the old picture is held over the new one and fades out once
      // the plugin has drawn the new take (it emits "ready" at the end of drawSpectrogram)
      dropGhost();
      if (spec && glide) {
        ghost = specGhost(spec);
        if (ghost) offGhost = spec.once("ready", () => {
          offGhost = null; const g = ghost;
          requestAnimationFrame(() => { if (g !== ghost) return; ghostAnim = animate(g, { opacity: [1, 0] }, { duration: 0.34, ease: "easeOut" }); ghostAnim.then(() => { if (g === ghost) dropGhost(); }); });
        });
      }
      media.setBuffer(buf);
      ws.setOptions(colors());
      await ws.load("", [buf.getChannelData(0).slice()], buf.duration);
      setTimeline(buf.duration);
      if (glide) anim = animate(0, 1, { type: "spring", visualDuration: 0.34, bounce: 0.2, onUpdate: (k) => { state.k = k; ws.setOptions({}); }, onComplete: () => { state.k = 1; state.from = null; ws.setOptions({}); } });
    },
    async play() { if (!buffer) return; ws.setTime(0); await ws.play(); },
    stop() { ws.pause(); ws.setTime(0); },
    async toggle() { if (!media.paused) api.stop(); else await api.play(); },
    destroy() { anim?.stop(); dropGhost(); offTheme(); ws.destroy(); media.gainNode.disconnect(); },
  };
  return api;
}

/**
 * The live view: a spectrum and an oscilloscope of whatever is playing through the master bus, drawn by two
 * wavesurfer instances fed from the AnalyserNode every frame (the Record plugin's renderMicStream loop).
 */
export function mountLive(container) {
  container.innerHTML = `<div class="lv-spec"></div><div class="lv-scope"></div><span class="lv-tag" aria-hidden="true">live</span>`;
  const specEl = container.querySelector(".lv-spec"), scopeEl = container.querySelector(".lv-scope");
  const h = () => Math.max(40, container.clientHeight || 72);
  const spec = WaveSurfer.create({ container: specEl, height: h(), waveColor: ROSEUS_STOPS.slice(1, 6), barWidth: 3, barGap: 2, barRadius: 2, barAlign: "bottom", barMinHeight: 1, cursorWidth: 0, interact: false, normalize: false, hideScrollbar: true });
  let scopeData = null;
  const scope = WaveSurfer.create({ container: scopeEl, height: h(), waveColor: tok("--accent", "#E08A1E"), cursorWidth: 0, interact: false, hideScrollbar: true,
    renderFunction: (_, ctx) => {
      const { width: W, height: H } = ctx.canvas, d = scopeData; if (!d) return;
      ctx.lineWidth = 1.5 * Math.max(1, devicePixelRatio || 1); ctx.strokeStyle = ctx.fillStyle; ctx.globalAlpha = 0.95; ctx.beginPath();
      for (let x = 0; x < W; x++) { const v = d[Math.floor((x / W) * d.length)] || 0; const y = H / 2 - v * H * 0.42; x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.stroke();
    } });
  const an = analyser(), sr = audio().sampleRate;
  const freq = new Float32Array(an.frequencyBinCount), time = new Float32Array(1024);
  let raf = 0, quiet = 0, alive = true, visible = true;
  const bands = () => Math.max(24, Math.floor((specEl.clientWidth || 600) / 5));
  const frame = () => {
    if (!alive) return;
    an.getFloatFrequencyData(freq); an.getFloatTimeDomainData(time);
    const n = bands(), out = new Float32Array(n), lo = Math.log(40), hi = Math.log(Math.min(16000, sr / 2));
    let energy = 0;
    for (let i = 0; i < n; i++) {
      const f0 = Math.exp(lo + ((hi - lo) * i) / n), f1 = Math.exp(lo + ((hi - lo) * (i + 1)) / n);
      const b0 = Math.floor((f0 / (sr / 2)) * freq.length), b1 = Math.max(b0 + 1, Math.ceil((f1 / (sr / 2)) * freq.length));
      let m = -Infinity; for (let b = b0; b < b1 && b < freq.length; b++) if (freq[b] > m) m = freq[b];
      const v = Math.max(0, Math.min(1, (m + 92) / 78)); out[i] = v * 0.92; energy += v;
    }
    let peak = 0; for (let i = 0; i < time.length; i++) peak = Math.max(peak, Math.abs(time[i]));
    quiet = peak < 1e-4 && energy < 0.01 ? quiet + 1 : 0;
    container.classList.toggle("on", quiet < 20);
    if (quiet < 30 && visible) {
      spec.load("", [out], n / 60).catch(() => {});
      scopeData = time.slice(); scope.load("", [new Float32Array([0, 0])], 1).catch(() => {});
      raf = requestAnimationFrame(frame);
    } else raf = setTimeout(() => requestAnimationFrame(frame), 250);
  };
  const io = new IntersectionObserver((es) => { visible = es[0].isIntersecting; }); io.observe(container);
  const offTheme = onTheme(() => scope.setOptions({ waveColor: tok("--accent", "#E08A1E") }));
  const ro = new ResizeObserver(() => { spec.setOptions({ height: h() }); scope.setOptions({ height: h() }); }); ro.observe(container);
  // an empty frame first, so the strip shows its baseline before anything plays
  spec.load("", [new Float32Array(bands())], 1).catch(() => {});
  frame();
  return { destroy() { alive = false; cancelAnimationFrame(raf); clearTimeout(raf); io.disconnect(); ro.disconnect(); offTheme(); spec.destroy(); scope.destroy(); } };
}

/**
 * A small waveform for a card or a kit part, built lazily when it scrolls into view. ensure() builds it now (a kit
 * playing through its parts needs the next part's waveform before that part has scrolled into view) and resolves to
 * the mounted wave, or null when the take could not be loaded.
 */
export function lazyWave(el, load, opts = {}) {
  let w = null, pending = null;
  const build = () => pending ||= (async () => {
    io.disconnect();
    try { const { buffer, dim } = await load(); if (!el.isConnected) return null; w = mountWave(el, { compact: true, hover: false, ...opts }); await w.show(buffer, { dim, morph: false }); el.classList.add("in"); el.dispatchEvent(new CustomEvent("wave", { detail: w })); return w; }
    catch { el.classList.add("in", "err"); return null; }
  })();
  const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) build(); }, { rootMargin: "240px" });
  io.observe(el);
  return { get wave() { return w; }, ensure: build };
}
