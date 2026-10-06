// Pads: a kit played on CRATE's instrument. CRATE is the iPhone Duo MPC that won Bitrig Hacks (Aradhya Mishra, Mahin
// Bharathwaj, Shuhan Zhang); its source is public at github.com/odoisveryverygood/crate-duo, and this page follows
// that source, file by file:
//   - the device: a black lid display over an aluminium deck, white keys, orange only for what is live, flat (no
//     shadows), motion 100 ms or less (Sources/UI/Theme.swift, Sources/App/RootView.swift)
//   - pads: 4x4 in MPC order, pad 1 bottom left (Sources/UI/PadGridView.swift:33-39); velocity from where the finger
//     lands, 127 at the top edge to 70 at the bottom (:157), gain (v/127)^1.6 (Sources/Audio/AudioSequencer.swift:461);
//     a hit is a 100 ms fill change and a 3 px orange bar along the top (PadGridView.swift:266, Theme.swift:104)
//   - keys: Z X C V pads 1-4, A S D F 5-8, Q W E R 9-12, 1 2 3 4 13-16; Space play, Return rec, / prompt, Cmd-Z undo
//     (Sources/App/KeyboardControl.swift:5,50-68)
//   - the lid: title row with LOOP segments, hero readouts BPM / SWING / BAR.beat, the pad line, the SEQ dot grid with
//     a gap each beat, hits as white dots, ghosts as rings, rests as specks, a playhead per lane, the punch strip, a
//     timing strip, the prompt row and style chips (Sources/UI/LidDisplayView.swift:17-49, LidPanels.swift:58-273,
//     518-625)
//   - the hinge, here a fader: one punch amount p drives lowpass 20000*(180/20000)^(p^0.85), crush 30*p^2 %, a 3/16
//     delay 22*p % and a hall 38*p %; past 0.92 the drums break down; pulling it from above 0.6 to under 0.1 inside
//     0.45 s is the DROP: punch resets, the crash and the kick fire (Sources/App/HingeFX.swift:7-56,
//     Sources/Audio/AudioEngine.swift:490-552)
//   - FX pads: hold FX (or tap to latch) and the pads become 16 effects; the finger's height is the amount, lifting
//     puts the previous effect back (Sources/Core/FXType.swift:32-59, Sources/Audio/AudioPadFX.swift:111-157,
//     PadGridView.swift:207-209, Sources/UI/UISupport.swift:151-183)
//   - sequencer: 16ths, swing as MPC percent (odd steps late by 2*swing/100-1 steps, 50-75, default 56), hits with a
//     late offset and ratchets decaying x0.85, a one-bar count-in before REC, quantise to the nearest 16th less 25 ms,
//     overdub, a 30-deep undo (AudioSequencer.swift:133,358-369,570-588; UISupport.swift:105-130;
//     Sources/AI/Orchestrator+Edit.swift:34,329-378)
//   - grooves use CRATE's format (library/grooves.json: [step, velocity, late, ratchet] per lane, lanes are pad roles);
//     the repository carries no licence, so the patterns below are written for Oasis, not copied
// Timing is a lookahead scheduler (CRATE ticks 5 ms with 100 ms lookahead; here a Worker ticks 25 ms as in
// github.com/cwilso/metronome, scheduling 100 ms ahead on the AudioContext clock).
// What CRATE cannot do, because its pads are samples: every Oasis pad is a program. Each hit plays the next of a pool
// of takes rendered from seeds (round robin from the program), and EDIT on the lid shows the program's knobs, which
// re-render the pad instead of trimming a file.
import { audio, unlock, loadWav, output, analyser } from "/audio.js";
import { wav } from "/sound-dsp.js";
import { control } from "/sound-page.js";
import "/knob.js";

for (const href of ["/sound.css", "/kit.css", "/pads.css"]) if (!document.querySelector(`link[href="${href}"]`)) { const l = document.createElement("link"); l.rel = "stylesheet"; l.href = href; document.head.appendChild(l); }

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
async function api(path) { const r = await fetch(path); if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || `${r.status}`); return r.json(); }

// pad n (0-based) -> key; the grid is drawn top row first: pads 13-16, 9-12, 5-8, 1-4
const KEYS = ["KeyZ", "KeyX", "KeyC", "KeyV", "KeyA", "KeyS", "KeyD", "KeyF", "KeyQ", "KeyW", "KeyE", "KeyR", "Digit1", "Digit2", "Digit3", "Digit4"];
const KEY_LABEL = (code) => code.replace(/^(Digit|Key)/, "");
const DRAW_ORDER = [12, 13, 14, 15, 8, 9, 10, 11, 4, 5, 6, 7, 0, 1, 2, 3];
const STEPS = 16;
const VEL = { X: 118, x: 92, g: 44 }; // CRATE's pattern letters (Sources/AI/OpenAIClient.swift:124-127)

// ---------- roles: which pad plays which lane of a groove ----------
const ROLE_RX = [
  ["kick", /kick|boom|thump|stomp|thud|slam|barrel|log drop|knock(?!le)|808|bass drum/],
  ["snare", /snare|snap|crack|slap|strike|shut|whip/],
  ["clap", /clap/],
  ["hat", /hat|tick|tap|click|clink|drip|coin|ping|blip|step|tock/],
  ["openhat", /open|sizzle|shaker|hiss|spray/],
  ["rim", /rim|knuckle|wood|block|stick/],
  ["perc", /perc|tom|bell|clank|anvil|pot|cup|mug|toast|glass|pan/],
  ["cymbal", /cymbal|crash|ride|gong|chime|toll|splash/],
  ["texture", /bed|rain|ambien|room|wind|crackle|hum|drone|night/],
];
function assignRoles(pads) {
  const role = new Array(pads.length).fill(null), taken = new Set();
  const text = (p) => `${p.item.name} ${p.item.title}`.toLowerCase();
  for (const [r, rx] of ROLE_RX) {
    const i = pads.findIndex((p, j) => role[j] === null && !taken.has(r) && (r === "texture" ? (p.item.kind === "ambience" || rx.test(text(p))) : rx.test(text(p))));
    if (i >= 0) { role[i] = r; taken.add(r); }
  }
  // what is left fills the drum roles still empty, shortest sounds first (a short sound is a better hat than a kick)
  const left = pads.map((p, i) => i).filter((i) => role[i] === null).sort((a, b) => pads[a].item.duration - pads[b].item.duration);
  const guessed = new Set();
  for (const r of ["hat", "kick", "snare", "perc", "rim", "clap", "openhat", "cymbal"]) { if (taken.has(r) || !left.length) continue; const i = left.shift(); role[i] = r; guessed.add(i); taken.add(r); }
  role.guessed = guessed; // a role given by elimination plays the groove's lane but is not printed as what the sound is
  return role;
}

// ---------- grooves, in CRATE's format: [step, velocity, late (fraction of a 16th), ratchet] over `bars` bars ----------
const hats8 = (v1, v2, late = 0, bars = 2) => Array.from({ length: bars * 8 }, (_, n) => [n * 2, n % 2 ? v2 : v1, n % 2 ? late : 0]);
const STYLES = {
  boombap: { name: "Boom bap", label: "BOOM BAP", bpm: 93, swing: 55, bars: 2, words: ["boom bap", "boombap", "90s", "golden era", "east coast"],
    lanes: { kick: [[0, 122, 0], [3, 70, 0.04], [10, 114, 0.02], [16, 122, 0], [19, 88, 0.02], [24, 104, 0.02], [26, 110, 0]], snare: [[4, 120, 0.03], [12, 122, 0.03], [20, 120, 0.03], [28, 122, 0.03], [31, 48, 0.05]], hat: hats8(94, 58, 0.02) } },
  dilla: { name: "Dilla", label: "DILLA", bpm: 88, swing: 57, bars: 2, words: ["dilla", "donuts", "laid back", "wonky", "drunk"],
    lanes: { kick: [[0, 118, -0.03], [6, 86, 0.14], [9, 106, 0.08], [16, 120, -0.02], [21, 90, 0.16], [25, 104, 0.06], [30, 78, 0.18]], snare: [[4, 110, 0.24], [12, 116, 0.22], [20, 112, 0.26], [28, 118, 0.22]], hat: hats8(80, 60, 0.2), rim: [[15, 46, 0.3], [31, 52, 0.28]] } },
  jazzhop: { name: "Jazz hop", label: "JAZZ HOP", bpm: 89, swing: 59, bars: 2, words: ["jazz", "jazzhop", "jazz hop", "nujabes", "jazzy"],
    lanes: { kick: [[0, 114, 0], [10, 100, 0.05], [16, 114, 0], [18, 76, 0.05], [27, 98, 0.05]], snare: [[4, 106, 0.08], [12, 110, 0.08], [20, 106, 0.08], [28, 112, 0.08]], hat: hats8(78, 60, 0.06), rim: [[7, 42, 0.1], [23, 44, 0.1]] } },
  lofi: { name: "Lo-fi", label: "LO-FI", bpm: 78, swing: 60, bars: 2, words: ["lofi", "lo-fi", "lo fi", "chill", "study", "bedroom", "cozy", "rainy"],
    lanes: { kick: [[0, 110, 0], [6, 80, 0.06], [10, 98, 0.04], [16, 110, 0], [25, 96, 0.04]], snare: [[4, 98, 0.12], [12, 102, 0.12], [20, 98, 0.12], [28, 104, 0.14]], hat: hats8(62, 44, 0.08), texture: [[0, 96, 0]] } },
  rnb: { name: "R&B", label: "R&B", bpm: 70, swing: 60, bars: 1, words: ["r&b", "rnb", "slow jam", "soul", "smooth"],
    lanes: { kick: [[0, 116, 0], [7, 90, 0.05], [10, 102, 0]], snare: [[4, 104, 0.06], [12, 108, 0.06]], clap: [[4, 86, 0.08], [12, 90, 0.08]], hat: Array.from({ length: 16 }, (_, s) => [s, s % 2 ? 42 : 62, 0]) } },
  house: { name: "House", label: "HOUSE", bpm: 124, swing: 54, bars: 1, words: ["house", "four on the floor", "club", "dance", "disco"],
    lanes: { kick: [[0, 124, 0], [4, 120, 0], [8, 124, 0], [12, 120, 0]], clap: [[4, 110, 0], [12, 112, 0]], snare: [[4, 96, 0.02], [12, 98, 0.02]], openhat: [[2, 94, 0], [6, 90, 0], [10, 94, 0], [14, 90, 0]], hat: Array.from({ length: 8 }, (_, n) => [n * 2 + 1, n % 2 ? 64 : 56, 0]), perc: [[7, 68, 0], [11, 62, 0]] } },
  trap: { name: "Trap", label: "TRAP", bpm: 140, swing: 50, bars: 2, words: ["trap", "atl", "808", "hard"],
    lanes: { kick: [[0, 124, 0], [6, 110, 0], [11, 116, 0], [16, 124, 0], [22, 106, 0], [27, 112, 0]], clap: [[8, 118, 0], [24, 118, 0]], snare: [[8, 108, 0], [24, 108, 0], [31, 76, 0]],
      hat: [...Array.from({ length: 32 }, (_, s) => [s, s % 2 ? 64 : 90, 0]).filter(([s]) => ![7, 15, 23, 30].includes(s)), [7, 82, 0, 2], [15, 84, 0, 3], [23, 82, 0, 2], [30, 88, 0, 4]] } },
  drill: { name: "Drill", label: "DRILL", bpm: 142, swing: 50, bars: 2, words: ["drill", "uk drill", "slide"],
    lanes: { kick: [[0, 122, 0], [10, 104, 0], [16, 120, 0], [23, 100, 0], [26, 98, 0]], snare: [[8, 118, 0], [24, 118, 0], [29, 96, 0]], hat: [[0, 90, 0], [3, 70, 0], [6, 84, 0], [9, 72, 0], [12, 86, 0], [14, 70, 0, 3], [16, 90, 0], [19, 70, 0], [22, 84, 0], [25, 72, 0], [28, 86, 0], [30, 76, 0, 3]], perc: [[5, 64, 0], [21, 66, 0]] } },
};
const STYLE_ORDER = ["jazzhop", "boombap", "dilla", "lofi", "rnb", "house", "trap", "drill"];

// ---------- the 16 FX pads (FXType.swift layout, top row first) ----------
const FX = [
  ["repeat", "BEAT REPEAT", "1/8 · 1/16 · 1/32"], ["crush", "CRUSH", "BITS ↓"], ["delay", "DELAY", "3/16 SYNC"], ["reverb", "REVERB", "HALL"],
  ["ring", "RING MOD", "80 → 1.5K"], ["lofi", "LOFI", "WOW · DUST"], ["color", "COLOR", "DRIVE"], ["grain", "GRANULAR", "SMEAR"],
  ["comb", "COMB", "10 → 1.5 MS"], ["lp", "LP FILTER", "CUTOFF ↓"], ["hp", "HP FILTER", "CUTOFF ↑"], ["bp", "BP FILTER", "SWEEP"],
  ["half", "HALF SPEED", "× 0.5"], ["radio", "RADIO", "BAND"], ["dub", "DUB ECHO", "3/8 FEED"], ["punch", "PUNCH", "THE HINGE"],
];

const wavUrl = (p, seed) => {
  const knobs = { ...p.knobs, ...(seed === undefined ? {} : { seed }) };
  const q = Object.keys(knobs).length ? `?p=${encodeURIComponent(JSON.stringify(knobs))}` : "";
  return p.item.licence ? `/api/licenses/${p.item.licence}/render.wav${q}` : `/api/assets/${encodeURIComponent(p.item.assetId)}/render.wav${q}`;
};
const cardUrl = (p) => `/api/assets/${encodeURIComponent(p.item.assetId)}/render.png?w=480${Object.keys(p.knobs).length ? `&p=${encodeURIComponent(JSON.stringify(p.knobs))}` : ""}`;
const fmtHz = (f) => (f >= 1000 ? `${(f / 1000).toFixed(f >= 10000 ? 0 : 1)}k` : `${Math.round(f)}`);

export async function pagePads(app, id) {
  app.innerHTML = `<div class="cr-page"><div class="wrap"><div class="skel" style="height:640px;border-radius:14px"></div></div></div>`;
  let kit;
  try { kit = await api(`/api/kits/${encodeURIComponent(id)}`); } catch { app.innerHTML = `<div class="wrap split2"><div><h1>That kit doesn't exist.</h1><p class="lede">Make one from a vibe, then play it here.</p><p style="margin-top:24px"><a class="btn primary" href="#/kits">Make a kit</a></p></div></div>`; return; }
  const details = await Promise.all(kit.items.map((it) => api(`/api/assets/${encodeURIComponent(it.assetId)}`).catch(() => null)));
  const pads = kit.items.slice(0, 16).map((item, i) => ({ i, item, detail: details[i], key: KEYS[i], knobs: { ...(item.knobs || {}) }, rr: 4, takes: [], next: 0, loading: null, lit: 0, ms: 0 }));
  const roles = assignRoles(pads);
  pads.forEach((p, i) => { p.role = roles[i]; p.guess = roles.guessed.has(i); });
  const hasSeed = (p) => !!p.detail?.knobs?.seed;
  const ac = audio();

  // ---------- engine: pads -> breakdown gains -> punch / FX insert -> master -> the page's bus ----------
  const padsBus = ac.createGain(), master = ac.createGain(); master.gain.value = 0.94;
  const lane = pads.map(() => { const g = ac.createGain(); g.connect(padsBus); return g; });
  const shaper = (f) => { const n = 2048, c = new Float32Array(n); for (let i = 0; i < n; i++) c[i] = f((i / (n - 1)) * 2 - 1); const s = ac.createWaveShaper(); s.curve = c; s.oversample = "2x"; return s; };
  const biq = (type, freq, Q = 0.7, gain = 0) => { const f = ac.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = Q; f.gain.value = gain; return f; };
  // the hall: Tone.js Reverb.generate()'s impulse (stereo noise, pre-delay, exponential approach), as in public/fx.js
  const hallIR = (() => { const sr = ac.sampleRate, dec = 2.6, pre = 0.025, n = Math.ceil((dec + pre) * sr), b = ac.createBuffer(2, n, sr), tc = Math.log(dec + 1) / Math.log(200); for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < n; i++) { const t = i / sr; d[i] = t < pre ? 0 : (Math.random() * 2 - 1) * Math.exp(-(t - pre) / tc); } } return b; })();
  const seq = { bpm: 90, swing: 56, bars: 2, style: null, playing: false, recording: false, countIn: 0, abs: 0, nextTime: 0, startedAt: 0 };
  const stepDur = () => 60 / seq.bpm / 4;
  /** An effect: { input, output, set(p) }, wet over dry. The PUNCH chain is AudioEngine.swift:523-530. */
  function makeFx(fxId) {
    const input = ac.createGain(), out = ac.createGain(), dry = ac.createGain(), wet = ac.createGain();
    input.connect(dry).connect(out); wet.connect(out); dry.gain.value = 1; wet.gain.value = 0;
    const T = (param, v) => param.setTargetAtTime(v, ac.currentTime, 0.005); // CRATE ramps every change over 20 ms
    const run = (...nodes) => { nodes.reduce((a, b) => (a.connect(b), b), input); return nodes[nodes.length - 1]; };
    const fx = { input, output: out, set: () => {}, stops: [] };
    if (fxId === "punch") {
      // the lowpass in series (the whole kit darkens), then crush, delay and hall as sends from it
      input.disconnect(); const lp = biq("lowpass", 20000, 0.9); input.connect(lp); lp.connect(dry);
      const crush = shaper((x) => Math.round(x * 8) / 8), cw = ac.createGain(); lp.connect(crush).connect(cw).connect(out); cw.gain.value = 0;
      const dl = ac.createDelay(2), fb = ac.createGain(), dlp = biq("lowpass", 9000), dw = ac.createGain(); fb.gain.value = 0.35; lp.connect(dl); dl.connect(dlp).connect(fb).connect(dl); dlp.connect(dw).connect(out); dw.gain.value = 0;
      const conv = ac.createConvolver(), rw = ac.createGain(); conv.buffer = hallIR; lp.connect(conv).connect(rw).connect(out); rw.gain.value = 0;
      fx.set = (p) => { T(lp.frequency, 20000 * Math.pow(180 / 20000, Math.pow(p, 0.85))); T(cw.gain, 0.3 * p * p); dl.delayTime.value = stepDur() * 3; T(dw.gain, 0.22 * p); T(rw.gain, 0.38 * p); };
    } else if (fxId === "lp" || fxId === "hp" || fxId === "bp") {
      input.disconnect(); const f = biq(fxId === "lp" ? "lowpass" : fxId === "hp" ? "highpass" : "bandpass", 1000, fxId === "bp" ? 4 : 1.2); input.connect(f).connect(dry);
      fx.set = (p) => T(f.frequency, fxId === "lp" ? 20000 * Math.pow(160 / 20000, p) : fxId === "hp" ? 10 * Math.pow(6000 / 10, p) : 200 * Math.pow(30, p));
    } else if (fxId === "crush") {
      const sh = [4, 5, 6, 8, 12].map((b) => shaper((x) => Math.round(x * 2 ** (b - 1)) / 2 ** (b - 1))); let cur = null;
      fx.set = (p) => { const s = sh[Math.max(0, Math.min(4, Math.floor((1 - p) * 5)))]; if (s !== cur) { cur?.disconnect(); input.connect(s); s.connect(wet); cur = s; } T(wet.gain, p); T(dry.gain, 1 - p); };
    } else if (fxId === "delay" || fxId === "dub") {
      const dl = ac.createDelay(2), fb = ac.createGain(), f = biq("lowpass", fxId === "dub" ? 2500 : 9000), hp = biq("highpass", fxId === "dub" ? 300 : 60);
      input.connect(dl); dl.connect(f).connect(hp).connect(fb).connect(dl); hp.connect(wet);
      fx.set = (p) => { dl.delayTime.value = stepDur() * (fxId === "dub" ? 6 : 3); T(fb.gain, fxId === "dub" ? 0.45 + 0.3 * p : 0.35); T(wet.gain, (fxId === "dub" ? 0.7 : 0.5) * p); };
    } else if (fxId === "reverb") {
      const conv = ac.createConvolver(); conv.buffer = hallIR; input.connect(conv).connect(wet);
      fx.set = (p) => { T(wet.gain, 0.8 * p); T(dry.gain, 1 - 0.35 * p); };
    } else if (fxId === "ring") {
      const ring = ac.createGain(), o = ac.createOscillator(); ring.gain.value = 0; o.connect(ring.gain); o.start(); fx.stops.push(o); input.connect(ring).connect(wet);
      fx.set = (p) => { T(o.frequency, 80 * Math.pow(1500 / 80, p)); T(wet.gain, Math.min(1, p * 1.4)); T(dry.gain, 1 - p * 0.8); };
    } else if (fxId === "lofi") {
      const dl = ac.createDelay(0.05), lfo = ac.createOscillator(), lg = ac.createGain(); dl.delayTime.value = 0.008; lfo.frequency.value = 0.6; lg.gain.value = 0.0015; lfo.connect(lg).connect(dl.delayTime); lfo.start(); fx.stops.push(lfo);
      run(biq("highpass", 150), shaper((x) => Math.round(x * 32) / 32), dl, biq("lowpass", 3800)).connect(wet);
      fx.set = (p) => { T(wet.gain, p); T(dry.gain, 1 - p); };
    } else if (fxId === "color") {
      run(biq("peaking", 900, 0.8, 5), shaper((x) => Math.tanh(4 * x) / Math.tanh(4)), biq("highshelf", 5000, 0.7, -4)).connect(wet);
      fx.set = (p) => { T(wet.gain, p * 0.9); T(dry.gain, 1 - p * 0.7); };
    } else if (fxId === "comb") {
      const dl = ac.createDelay(0.05), fb = ac.createGain(); fb.gain.value = 0.82; input.connect(dl); dl.connect(fb).connect(dl); dl.connect(wet);
      fx.set = (p) => { T(dl.delayTime, 0.010 - 0.0085 * p); T(wet.gain, 0.6 * Math.min(1, p * 2)); };
    } else if (fxId === "grain") {
      // an approximation: four short delays wandering on slow LFOs smear the kit into a cloud (no true grain engine)
      [0.023, 0.041, 0.067, 0.089].forEach((t, k) => { const dl = ac.createDelay(0.2), lfo = ac.createOscillator(), lg = ac.createGain(); dl.delayTime.value = t; lfo.frequency.value = 0.4 + k * 0.37; lg.gain.value = 0.012; lfo.connect(lg).connect(dl.delayTime); lfo.start(); fx.stops.push(lfo); input.connect(dl).connect(wet); });
      fx.set = (p) => { T(wet.gain, 0.45 * p); T(dry.gain, 1 - 0.6 * p); };
    } else if (fxId === "radio") {
      run(biq("highpass", 450, 0.9), biq("peaking", 1800, 1.2, 6), shaper((x) => Math.tanh(2.4 * x) / Math.tanh(2.4)), biq("lowpass", 3400, 0.9)).connect(wet);
      fx.set = (p) => { T(wet.gain, p * 0.9); T(dry.gain, 1 - p); };
    } // repeat and half act on the sequencer and on each voice, not on the bus
    return fx;
  }
  let fxId = "punch", fx = makeFx(fxId), punch = 0, repeatAnchor = null;
  padsBus.connect(fx.input); fx.output.connect(master); master.connect(output());
  const setFxType = (id2) => {
    if (id2 === fxId) return;
    const old = fx; padsBus.disconnect(); fxId = id2; fx = makeFx(id2); padsBus.connect(fx.input); fx.output.connect(master); fx.set(punch); repeatAnchor = null;
    setTimeout(() => { old.stops.forEach((o) => { try { o.stop(); } catch {} }); try { old.output.disconnect(); } catch {} }, 80);
    paintTiming();
  };
  let breakdown = false;
  const isDrum = (p) => p.role && p.role !== "texture";
  const setPunch = (p) => {
    punch = p < 0.04 ? 0 : Math.min(1, p);
    fx.set(punch);
    if (punch < 0.08) repeatAnchor = null;
    // breakdown: the drums fall away past 0.92 (+9 dB on what is left), back under 0.88 (AudioEngine.swift:534-552)
    if (!breakdown && punch > 0.92) { breakdown = true; pads.forEach((pd, i) => lane[i].gain.setTargetAtTime(isDrum(pd) ? 0 : 2.8, ac.currentTime, 0.007)); }
    else if (breakdown && punch < 0.88) { breakdown = false; lane.forEach((g) => g.gain.setTargetAtTime(1, ac.currentTime, 0.007)); }
    paintPunch();
  };

  // ---------- takes ----------
  const load = (p) => {
    const base = Number(p.knobs.seed ?? p.detail?.knobs?.seed?.default ?? 1);
    const seeds = hasSeed(p) ? Array.from({ length: p.rr }, (_, n) => base + n) : [undefined];
    const t0 = performance.now();
    const job = Promise.all(seeds.map((s) => loadWav(wavUrl(p, s)))).then((bufs) => { if (p.loading === job) { p.takes = bufs; p.next = 0; p.loading = null; p.ms = Math.round(performance.now() - t0); paintPad(p); paintTiming(); if (p.i === selected) paintLid(); } return bufs; });
    p.loading = job; paintPad(p);
    return job;
  };
  const queue = []; // what sounds, for drawing: { kind: "hit" | "step" | "count", ..., time }
  const trigger = (p, when, vel = 110) => {
    if (!p || !p.takes.length) return;
    const n = p.next++ % p.takes.length, src = ac.createBufferSource(), g = ac.createGain();
    src.buffer = p.takes[n];
    if (fxId === "half" && punch > 0) src.playbackRate.value = 1 - 0.5 * punch;
    g.gain.value = Math.pow(vel / 127, 1.6);
    src.connect(g).connect(lane[p.i]); src.start(when);
    queue.push({ kind: "hit", i: p.i, take: n, time: when });
  };

  // ---------- the pattern: per pad, per step across `bars`: null or { v, late, r } ----------
  let rows = pads.map(() => new Array(seq.bars * STEPS).fill(null));
  const undo = [], redo = [];
  const state = () => JSON.stringify({ rows, bpm: seq.bpm, swing: seq.swing, bars: seq.bars, style: seq.style });
  const restore = (j) => { const s = JSON.parse(j); rows = s.rows; seq.bpm = s.bpm; seq.swing = s.swing; seq.bars = s.bars; seq.style = s.style; paintAll(); };
  const snapshot = () => { undo.push(state()); if (undo.length > 30) undo.shift(); redo.length = 0; };
  const applyStyle = (key) => {
    const st = STYLES[key]; if (!st) return;
    snapshot();
    seq.style = key; seq.bpm = st.bpm; seq.swing = st.swing; seq.bars = st.bars;
    rows = pads.map(() => new Array(st.bars * STEPS).fill(null));
    for (const [r, hits] of Object.entries(st.lanes)) {
      const i = pads.findIndex((p) => p.role === r); if (i < 0) continue;
      for (const [s, v, late = 0, ratchet = 1] of hits) if (s < st.bars * STEPS) rows[i][s] = { v, late, r: ratchet };
    }
    paintAll();
  };
  const setBars = (n) => { rows = rows.map((r) => Array.from({ length: n * STEPS }, (_, s) => r[s % r.length])); seq.bars = n; paintAll(); };

  // PERFORM: CRATE's offline phrase performer (Sources/AI/Performer.swift): in every 8-bar phrase, bar 8 gets the next
  // fill of a rotation and bar 4 gets ghost notes; the fills keep CRATE's names, the hits are written for Oasis
  const ROTATION = ["snare_roll", "hat_stutter", "kick_double", "crash_next", "dropout", "halftime"];
  const FILL_NAME = { snare_roll: "Roll", hat_stutter: "Stutter", kick_double: "Kick x2", crash_next: "Crash", dropout: "Dropout", halftime: "Half time", ghost_notes: "Ghosts" };
  const perf = { on: false, turn: 0, crash: false, last: "" };
  const laneOf = (role) => pads.findIndex((p) => p.role === role);
  /** The 16 steps of one bar as they will play: the pattern, then the bar's fill on top. */
  function barRows(bar) {
    const out = rows.map((r) => r.slice((bar % seq.bars) * STEPS, (bar % seq.bars) * STEPS + STEPS).map((h) => (h ? { ...h } : null)));
    if (!perf.on) return { out, fill: null };
    const inPhrase = (bar % 8) + 1;
    let fill = inPhrase === 8 ? ROTATION[perf.turn % ROTATION.length] : inPhrase === 4 ? "ghost_notes" : null;
    if (inPhrase === 8) perf.turn++;
    const k = laneOf("kick"), sn = laneOf("snare") >= 0 ? laneOf("snare") : laneOf("clap"), hh = laneOf("hat"), cy = laneOf("cymbal") >= 0 ? laneOf("cymbal") : laneOf("openhat");
    const put = (i, s, v, r = 1) => { if (i >= 0) out[i][s] = { v, late: 0, r }; };
    const clear = (i, from) => { if (i >= 0) for (let s = from; s < STEPS; s++) out[i][s] = null; };
    if (perf.crash) { put(cy, 0, 118); perf.crash = false; }
    if (fill === "snare_roll") { clear(sn, 12); [58, 70, 86, 104].forEach((v, n) => put(sn, 12 + n, v)); }
    else if (fill === "hat_stutter") { clear(hh, 12); [[2, 80], [3, 76], [4, 84], [4, 90]].forEach(([r, v], n) => put(hh, 12 + n, v, r)); }
    else if (fill === "kick_double") { put(k, 14, 100); put(k, 15, 112); }
    else if (fill === "crash_next") { perf.crash = true; put(sn, 15, 96); }
    else if (fill === "dropout") out.forEach((r, i) => { if (pads[i].role !== "texture") for (let s = 8; s < STEPS; s++) r[s] = null; });
    else if (fill === "halftime") { if (sn >= 0) { out[sn] = out[sn].map(() => null); put(sn, 8, 118); } if (hh >= 0) out[hh] = out[hh].map((h, s) => (s % 4 === 0 ? h || { v: 80, late: 0, r: 1 } : null)); }
    else if (fill === "ghost_notes") [7, 10, 15].forEach((s) => { if (sn >= 0 && !out[sn][s]) put(sn, s, 40); });
    if (fill && fill !== "ghost_notes") perf.last = FILL_NAME[fill];
    return { out, fill };
  }
  let playing = null; // the bar being played, with its fill
  const schedule = () => {
    while (seq.nextTime < ac.currentTime + 0.1) {
      const d = stepDur(), t0 = seq.nextTime;
      if (seq.countIn > 0) { // a click per beat for one bar before REC writes (UISupport.swift:105-130)
        const n = 16 - seq.countIn; if (n % 4 === 0) click(t0, n === 0);
        queue.push({ kind: "count", n, time: t0 });
        seq.countIn--; seq.nextTime += d; if (seq.countIn === 0) { seq.abs = 0; seq.startedAt = seq.nextTime; } continue;
      }
      const len = seq.bars * STEPS, s = seq.abs % len, swingLate = s % 2 ? (2 * seq.swing / 100 - 1) * d : 0;
      // beat repeat holds the steps under it and loops a slice: 1/8 under half, 1/16 from half, 1/32 near the top
      const repeating = fxId === "repeat" && punch >= 0.08;
      let src = s, ratMul = 1;
      if (repeating) { const span = punch >= 0.5 ? 1 : 2; if (repeatAnchor === null) repeatAnchor = s - (s % span); src = repeatAnchor + (((s - repeatAnchor) % span) + span) % span; ratMul = punch >= 0.85 ? 2 : 1; }
      if (s % STEPS === 0 || !playing) { playing = barRows(Math.floor(seq.abs / STEPS)); if (playing.fill) queue.push({ kind: "fill", fill: playing.fill, time: t0 }); }
      pads.forEach((p, i) => {
        const h = repeating ? rows[i][src] : playing.out[i][s % STEPS]; if (!h) return;
        const r = (h.r || 1) * ratMul;
        for (let k = 0; k < r; k++) trigger(p, t0 + swingLate + h.late * d + (k * d) / r, Math.round(h.v * Math.pow(0.85, k)));
      });
      queue.push({ kind: "step", s, bar: Math.floor(s / STEPS), time: t0 + swingLate });
      seq.abs++; seq.nextTime += d;
    }
  };
  const click = (t, accent) => { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = accent ? 1760 : 1320; g.gain.setValueAtTime(0.18, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05); o.connect(g).connect(master); o.start(t); o.stop(t + 0.06); };
  const timer = new Worker(URL.createObjectURL(new Blob([`let t=null;onmessage=(e)=>{if(e.data==="start"){clearInterval(t);t=setInterval(()=>postMessage("tick"),25);}else{clearInterval(t);t=null;}};`], { type: "text/javascript" })));
  timer.onmessage = () => seq.playing && schedule();
  const play = async ({ countIn = false } = {}) => {
    await unlock();
    // the first bar should sound: wait for the takes still rendering (a fresh load takes a moment)
    const waiting = pads.filter((p) => p.loading);
    if (waiting.length) { $("#cr-play").classList.add("wait"); $("#cr-play").textContent = "…"; await Promise.all(waiting.map((p) => p.loading)); $("#cr-play").classList.remove("wait"); $("#cr-play").textContent = "PLAY"; if (!document.getElementById("cr")) return; }
    seq.playing = true; seq.abs = 0; seq.countIn = countIn ? 16 : 0; seq.nextTime = ac.currentTime + 0.06; seq.startedAt = seq.nextTime + (countIn ? 16 * stepDur() : 0); timer.postMessage("start"); paintTransport(); };
  const stop = () => { jam = []; paintJam(); playing = null; perf.turn = 0; perf.crash = false; seq.playing = false; seq.recording = false; seq.countIn = 0; timer.postMessage("stop"); queue.length = 0; paintTransport(); paintSeqHead(-1); };
  /** Where a live hit lands while recording: the nearest 16th, less 25 ms of touch latency (AudioSequencer.swift:570-588). */
  const recStep = () => { const len = seq.bars * STEPS, rel = ac.currentTime - 0.025 - seq.startedAt; return ((Math.round(rel / stepDur()) % len) + len) % len; };

  let selected = 0, fxMode = false, fxLatched = false, lidMode = "seq", shownBar = 0;
  app.innerHTML = `<div class="cr-page">
    <div class="wrap">
      <nav class="a-crumb" aria-label="Breadcrumb"><a href="#/kits">Kits</a><span>/</span><a href="#/kit/${esc(kit.id)}">${esc(kit.title)}</a><span>/</span><span>Pads</span></nav>
      <div class="cr-device" id="cr">
        <section class="cr-lid" aria-label="Display">
          <div class="cr-title"><div><b id="cr-style">Kit</b><span>${esc(kit.title)}, ${pads.length} programs</span>${kit.licensed ? `<a class="cr-lic ok" href="#/kit/${esc(kit.id)}" title="PayPal order ${esc(kit.licence?.orderId || "")}">Licensed · plays clean</a>` : kit.total > 0 ? `<a class="cr-lic" id="cr-lic" href="#/kit/${esc(kit.id)}">Preview · license ${"$"}${Number(kit.total).toFixed(2)} with PayPal →</a>` : ""}</div><button class="cr-loop" id="cr-loop" type="button" aria-label="Loop length"><span>LOOP · <b id="cr-bars">2</b> <em id="cr-bars-w">BARS</em></span><i id="cr-segs"></i></button></div>
          <div class="cr-hero">
            <button class="cr-read" id="cr-bpm-b" type="button"><b class="num" id="cr-bpm">90</b><span>BPM</span></button>
            <button class="cr-read" id="cr-swing-b" type="button"><b class="num" id="cr-swing">56</b><span>SWING</span></button>
            <div class="cr-read"><b class="num" id="cr-pos">1.1</b><span>BAR · BEAT</span></div>
            <div class="cr-drop" id="cr-drop" aria-live="polite">DROP</div>
          </div>
          <div class="cr-tempo" id="cr-tempo" hidden>
            <button type="button" data-t="tap">TAP</button><button type="button" data-t="-1">−1</button><button type="button" data-t="+1">+1</button>
            <span>SWING</span>${[50, 54, 58, 62, 66, 70].map((s) => `<button type="button" data-sw="${s}">${s}</button>`).join("")}
          </div>
          <div class="cr-padline" id="cr-padline"></div>
          <div class="cr-main" id="cr-main"></div>
          <div class="cr-punch" id="cr-punch" hidden><i id="cr-cells"></i><b class="num" id="cr-punch-v"></b><span id="cr-punch-t"></span></div>
          <div class="cr-timing" id="cr-timing"></div>
          <form class="cr-prompt" id="cr-prompt" autocomplete="off"><span aria-hidden="true">›</span><input id="cr-q" placeholder="Describe a beat or a kit: rusty sci-fi dungeon, boom bap, bpm 96, looser" aria-label="Describe a beat"><button type="button" data-c="undo" title="Undo (Cmd-Z)">↶ UNDO</button><button type="button" data-c="redo" title="Redo (Shift-Cmd-Z)">↷ REDO</button><button type="button" data-c="keep" id="cr-keep" disabled title="Keep what you just played over the loop">KEEP JAM</button><button type="button" data-c="perform" id="cr-perform" aria-pressed="false" title="Fills at the end of every phrase">✦ PERFORM</button></form>
          <div class="cr-chips" id="cr-chips">${STYLE_ORDER.map((k) => `<button type="button" data-style="${k}">${STYLES[k].name}</button>`).join("")}</div>
        </section>
        <div class="cr-hinge" aria-hidden="true"></div>
        <section class="cr-deck" aria-label="Deck">
          <div class="cr-left">
            <button class="cr-key" id="cr-fx" type="button" aria-pressed="false" title="Hold for FX pads, tap to latch">FX</button>
            <button class="cr-key" id="cr-edit" type="button" aria-pressed="false" title="The selected pad's program knobs">EDIT</button>
            <button class="cr-key" id="cr-export" type="button" title="Render the loop to a WAV">BOUNCE</button>
            <button class="cr-key" id="cr-stagebtn" type="button" title="Full-screen stage view for the room (Esc leaves)">STAGE</button>
          </div>
          <div class="cr-pads" id="cr-pads">${DRAW_ORDER.filter((i) => i < Math.max(8, Math.ceil(pads.length / 4) * 4)).map((i) => `<button class="cr-pad" type="button" data-i="${i}"><span class="cr-win">${pads[i] ? `<img src="${esc(cardUrl(pads[i]))}" alt="" loading="lazy" width="480" height="240">` : ""}</span><span class="cr-n">${i + 1}</span><span class="cr-k">${KEY_LABEL(KEYS[i])}</span><span class="cr-name"></span><span class="cr-hint"></span></button>`).join("")}</div>
          <div class="cr-right">
            <div class="cr-fader-w"><span class="cr-silk">FX · HINGE</span>
              <div class="cr-fader-row"><div class="cr-fader" id="cr-fader" role="slider" tabindex="0" aria-label="Hinge: the punch amount. Pull it down fast from above 60 for the drop." aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i class="cr-cap"></i></div>
              <span class="cr-scale" aria-hidden="true"><i>100</i><i>75</i><i>50</i><i>25</i><i>0</i></span></div>
            </div>
            <div class="cr-tx">
              <button class="cr-key rec" id="cr-rec" type="button" aria-pressed="false" title="Record (Return)"><i></i>REC</button>
              <button class="cr-key" id="cr-play" type="button" title="Play (Space)">PLAY</button>
              <button class="cr-key" id="cr-stop" type="button" title="Stop">STOP</button>
            </div>
          </div>
        </section>
      </div>
      <p class="cr-foot">Keys <kbd>Z X C V</kbd> pads 1-4, <kbd>A S D F</kbd> 5-8, <kbd>Q W E R</kbd> 9-12, <kbd>1 2 3 4</kbd> 13-16. <kbd>Space</kbd> play, <kbd>Return</kbd> record, <kbd>/</kbd> the prompt. Where you strike a pad is how hard. Pull the hinge up for the punch, then down fast for the drop. Every hit is the next take rendered from that pad's program.</p>
      <p class="cr-credit">The layout and the hinge are <a href="https://github.com/odoisveryverygood/crate-duo" target="_blank" rel="noopener">CRATE</a>'s, the iPhone Duo MPC that won Bitrig Hacks.</p>
    </div>
  </div>`;

  // ---------- painting ----------
  function paintPad(p) { if (!document.getElementById("cr")) return; // the visitor has left the page
    const el = $(`.cr-pad[data-i="${p.i}"]`, app); if (!el) return;
    el.classList.toggle("loading", !!p.loading);
    el.classList.toggle("sel", p.i === selected && !fxMode);
    const f = FX[DRAW_ORDER.indexOf(p.i)];
    $(".cr-name", el).textContent = fxMode ? f[1] : p.item.name;
    $(".cr-hint", el).textContent = fxMode ? f[2] : p.guess ? "" : (p.role || "").toUpperCase();
  }
  function paintFxPads() { if (!document.getElementById("cr")) return; // the visitor has left the page
    $("#cr").classList.toggle("fx", fxMode);
    $$(".cr-pad", app).forEach((el) => {
      const i = Number(el.dataset.i), f = FX[DRAW_ORDER.indexOf(i)];
      el.classList.toggle("fxon", fxMode && f[0] === fxId);
      if (i >= pads.length) { el.classList.toggle("empty", !fxMode); $(".cr-name", el).textContent = fxMode ? f[1] : ""; $(".cr-hint", el).textContent = fxMode ? f[2] : ""; }
    });
    pads.forEach(paintPad);
    $("#cr-fx").classList.toggle("on", fxMode); $("#cr-fx").setAttribute("aria-pressed", fxMode);
  }
  function paintLid() { if (!document.getElementById("cr")) return; // the visitor has left the page
    $("#cr-style").textContent = seq.style ? STYLES[seq.style].name : "Kit";
    $("#cr-bpm").textContent = Math.round(seq.bpm); $("#cr-swing").textContent = seq.swing; $("#cr-bars").textContent = seq.bars; $("#cr-bars-w").textContent = seq.bars === 1 ? "BAR" : "BARS";
    $("#cr-segs").innerHTML = Array.from({ length: seq.bars }, (_, b) => `<i data-b="${b}"></i>`).join("");
    $$("[data-style]", app).forEach((c) => c.classList.toggle("on", c.dataset.style === seq.style));
    const p = pads[selected];
    $("#cr-padline").innerHTML = `<span class="cr-tag">${selected + 1}</span><img src="${esc(cardUrl(p))}" alt="" width="480" height="240"><div class="cr-pl-t"><b>${esc(p.item.name)}</b><span>${esc(p.item.title)} by ${esc(p.item.author)}</span></div><span class="cr-takes" id="cr-takes">${p.takes.length ? p.takes.map((_, n) => `<canvas data-n="${n}" width="72" height="34" title="Take ${n + 1}"></canvas>`).join("") : `<em class="cr-wait">RENDERING</em>`}<em>${hasSeed(p) ? `${p.takes.length || p.rr} TAKES` : "1 TAKE"}</em></span><button type="button" class="cr-chip${lidMode === "edit" ? " on" : ""}" id="cr-edit2">EDIT</button>`;
    $("#cr-edit2").addEventListener("click", toggleEdit);
    // the takes themselves: one small waveform per seed, so the difference between hits is visible, not just heard
    $$("#cr-takes canvas", app).forEach((c) => drawTake(c, p.takes[Number(c.dataset.n)]));
    paintMain(); paintTiming();
  }
  function drawTake(c, buf) {
    if (!buf) return;
    const g = c.getContext("2d"), W = c.width, H = c.height, d = buf.getChannelData(0), per = Math.max(1, Math.floor(d.length / W));
    let peak = 0; for (let i = 0; i < d.length; i += 8) peak = Math.max(peak, Math.abs(d[i]));
    const k = peak > 0 ? (H / 2 - 2) / peak : 1;
    g.clearRect(0, 0, W, H); g.fillStyle = "#F5F5F3";
    for (let x = 0; x < W; x++) { let lo = 0, hi = 0; for (let i = x * per; i < (x + 1) * per && i < d.length; i++) { if (d[i] < lo) lo = d[i]; if (d[i] > hi) hi = d[i]; } g.fillRect(x, H / 2 - hi * k, 1, Math.max(1, (hi - lo) * k)); }
  }
  function paintMain() { if (!document.getElementById("cr")) return; // the visitor has left the page
    const main = $("#cr-main");
    if (lidMode === "edit") return paintEdit(main);
    const lanes = pads.map((p, i) => i).filter((i) => i === selected || rows[i].some(Boolean));
    main.innerHTML = `<div class="cr-seq"><div class="cr-ruler"><span></span>${Array.from({ length: STEPS }, (_, s) => `<i>${s % 4 === 0 ? s + 1 : ""}</i>`).join("")}</div>${lanes.map((i) => `<div class="cr-lane${i === selected ? " sel" : ""}" data-i="${i}"><button type="button" class="cr-lname" data-sel="${i}" title="Long-press to clear the lane">${esc(pads[i].item.name)}</button>${Array.from({ length: STEPS }, (_, s) => `<button type="button" class="cr-dot" data-i="${i}" data-s="${s}" aria-label="${esc(pads[i].item.name)} step ${s + 1}"></button>`).join("")}</div>`).join("")}</div>`;
    paintDots();
  }
  /** The lid shows the bar under the playhead (bar 1 when stopped); a dot is the hit at that step of that bar. */
  function paintDots() {
    $$(".cr-dot", app).forEach((d) => {
      const h = rows[d.dataset.i][shownBar * STEPS + Number(d.dataset.s)];
      d.className = `cr-dot${h ? (h.v < 60 ? " ghost" : h.v >= 110 ? " hit acc" : " hit") : ""}${h?.r > 1 ? " rat" : ""}`;
    });
  }
  function paintSeqHead(s) {
    $$(".cr-dot.now", app).forEach((d) => d.classList.remove("now"));
    if (s >= 0) $$(`.cr-dot[data-s="${s % STEPS}"]`, app).forEach((d) => d.classList.add("now"));
  }
  function paintEdit(main) {
    const p = pads[selected], d = p.detail;
    const entries = d ? Object.entries(d.knobs).filter(([k]) => k !== "seed") : [];
    const vals = { ...Object.fromEntries(entries.map(([k, def]) => [k, def.default])), ...(p.item.values || {}), ...p.knobs };
    main.innerHTML = `<div class="cr-edit">
      <div class="a-dials cr-dials">${entries.filter(([, def]) => def.type === "range" || def.type === "choice").map(([k, def]) => control(k, { ...def, default: vals[k] })).join("")}</div>
      <div class="cr-edit-side">
        ${d?.presets?.length ? `<div class="cr-presets">${d.presets.map((n) => `<button type="button" class="cr-chip" data-preset="${esc(n)}">${esc(n.toUpperCase())}</button>`).join("")}</div>` : ""}
        <label class="cr-rr">TAKES <select id="cr-rrsel"${hasSeed(p) ? "" : " disabled"}>${[1, 2, 4, 8].map((n) => `<option value="${n}"${n === (hasSeed(p) ? p.rr : 1) ? " selected" : ""}>${n}</option>`).join("")}</select></label>
        <a class="cr-chip" href="#/a/${esc(p.item.assetId)}${p.item.licence ? `?lic=${esc(p.item.licence)}` : ""}">OPEN PROGRAM ↗</a>
        <p>${hasSeed(p) ? "A knob re-renders this pad from its program. Takes is how many seeds a run of hits cycles through." : "A knob re-renders this pad from its program. It has no seed knob, so every hit is the same take."}</p>
      </div></div>`;
    let t = 0;
    $$("oasis-knob", main).forEach((kn) => kn.addEventListener("change", () => {
      const k = kn.dataset.k, def = d.knobs[k];
      if (kn.value === def.default) delete p.knobs[k]; else p.knobs[k] = kn.value;
      clearTimeout(t); t = setTimeout(() => load(p).then(() => { trigger(p, ac.currentTime, 110); const img = $("#cr-padline img"); if (img) img.src = cardUrl(p); }), 160);
    }));
    $$("[data-preset]", main).forEach((b) => b.addEventListener("click", async () => {
      const pv = d.presetValues?.[b.dataset.preset]; if (!pv) return;
      p.knobs = Object.fromEntries(Object.entries(pv).filter(([k, v]) => k !== "seed" && d.knobs[k] && v !== d.knobs[k].default));
      await load(p); trigger(p, ac.currentTime, 110);
    }));
    $("#cr-rrsel")?.addEventListener("change", (e) => { p.rr = Number(e.target.value); load(p); });
  }
  function paintTransport() { if (!document.getElementById("cr")) return; // the visitor has left the page
    $("#cr-play").classList.toggle("on", seq.playing && seq.countIn === 0);
    $("#cr-rec").classList.toggle("on", seq.recording); $("#cr-rec").setAttribute("aria-pressed", seq.recording);
  }
  function paintPunch() { if (!document.getElementById("cr")) return; // the visitor has left the page
    $("#cr-fader").style.setProperty("--p", punch); $("#cr-fader").setAttribute("aria-valuenow", Math.round(punch * 100));
    const show = punch > 0.04;
    $("#cr-punch").hidden = !show; $("#cr-timing").hidden = show;
    if (!show) return;
    const lit = Math.round(punch * 24);
    $("#cr-cells").innerHTML = Array.from({ length: 24 }, (_, n) => `<i class="${n < lit ? "on" : ""}"></i>`).join("");
    $("#cr-punch-v").textContent = `${Math.round(punch * 100)}%`;
    const name = FX.find((f) => f[0] === fxId)[1];
    $("#cr-punch-t").textContent = fxId === "punch" ? `LPF ${fmtHz(20000 * Math.pow(180 / 20000, Math.pow(punch, 0.85)))} · VERB ${Math.round(38 * punch)}${breakdown ? " · BREAKDOWN" : ""}` : `${name}${fxId === "repeat" ? ` ${punch >= 0.85 ? "1/32" : punch >= 0.5 ? "1/16" : "1/8"}` : ""}`;
  }
  function paintTiming() { if (!document.getElementById("cr")) return; // the visitor has left the page
    const loaded = pads.filter((p) => p.takes.length), ms = loaded.length ? Math.round(loaded.reduce((s, p) => s + p.ms, 0) / loaded.length) : 0;
    $("#cr-timing").innerHTML = `<span>Rendered in ${ms} ms a pad, ${loaded.reduce((s, p) => s + p.takes.length, 0)} takes from ${pads.length} programs</span>${perf.on ? `<span class="cr-perf">Perform on</span>` : ""}<span class="cr-mode">${fxMode ? "FX pads" : lidMode === "edit" ? "Edit" : "Pattern"}, hinge on ${FX.find((f) => f[0] === fxId)[1].toLowerCase()}</span>`;
  }
  function paintAll() { paintLid(); paintTransport(); pads.forEach(paintPad); paintStage(); }
  const select = (i) => { if (i >= pads.length) return; const was = selected; selected = i; paintPad(pads[was]); paintPad(pads[i]); paintLid(); };
  function toggleEdit() { lidMode = lidMode === "edit" ? "seq" : "edit"; $("#cr-edit").classList.toggle("on", lidMode === "edit"); $("#cr-edit").setAttribute("aria-pressed", lidMode === "edit"); paintLid(); }

  // ---------- input: pads ----------
  const velOf = (e, el) => { const r = el.getBoundingClientRect(); return Math.round(127 - 57 * Math.max(0, Math.min(1, (e.clientY - r.top) / r.height))); };
  // KEEP JAM: pads played over the loop with REC off are remembered, quantised as a recorded hit would be, newest
  // loop only; KEEP writes them in (AudioSequencer.swift:602-641 noteJam / captureJam)
  let jam = [];
  const paintJam = () => { const b = $("#cr-keep"); if (!b) return; b.disabled = !jam.length; b.textContent = jam.length ? `KEEP JAM · ${jam.length}` : "KEEP JAM"; };
  const hit = async (i, vel) => {
    const p = pads[i]; if (!p) return;
    await unlock();
    trigger(p, ac.currentTime, vel);
    if (seq.playing && seq.recording && seq.countIn === 0) { const s = recStep(); snapshot(); rows[i][s] = rows[i][s] || { v: vel, late: 0, r: 1 }; paintMain(); }
    else if (seq.playing && seq.countIn === 0) {
      const abs = Math.round((ac.currentTime - 0.025 - seq.startedAt) / stepDur()), total = seq.bars * STEPS;
      jam.push({ i, abs, v: vel }); jam = jam.filter((h) => h.abs > abs - total); paintJam();
    }
    if (selected !== i) select(i);
  };
  let fxHeld = null;
  const fxAmount = (e, el) => { const r = el.getBoundingClientRect(); return 0.25 + 0.75 * Math.max(0, Math.min(1, 1 - (e.clientY - r.top) / r.height)); };
  $("#cr-pads").addEventListener("pointerdown", (e) => {
    const el = e.target.closest(".cr-pad"); if (!el) return; e.preventDefault();
    const i = Number(el.dataset.i), slot = DRAW_ORDER.indexOf(i);
    if (fxMode) { // punch the effect under the finger in, its height the amount; lifting puts the last one back
      fxHeld = { el, prev: { id: fxId, p: punch }, pointer: e.pointerId };
      el.setPointerCapture(e.pointerId); unlock(); setFxType(FX[slot][0]); setPunch(fxAmount(e, el)); paintFxPads();
      return;
    }
    if (i >= pads.length) return;
    el.classList.add("down"); hit(i, velOf(e, el));
  });
  $("#cr-pads").addEventListener("pointermove", (e) => { if (fxHeld && e.pointerId === fxHeld.pointer) setPunch(fxAmount(e, fxHeld.el)); });
  const padUp = (e) => {
    $$(".cr-pad.down", app).forEach((el) => el.classList.remove("down"));
    if (fxHeld && e.pointerId === fxHeld.pointer) { const { prev } = fxHeld; fxHeld = null; if (!fxLatched) { setFxType(prev.id); setPunch(prev.p); } else setPunch(0); paintFxPads(); }
  };
  $("#cr-pads").addEventListener("pointerup", padUp); $("#cr-pads").addEventListener("pointercancel", padUp);

  // FX: hold for momentary FX pads, a tap under 0.3 s latches them (UISupport.swift:151-155)
  let fxDownAt = 0;
  $("#cr-fx").addEventListener("pointerdown", () => { fxDownAt = performance.now(); if (fxLatched) { fxLatched = false; fxMode = false; } else fxMode = true; paintFxPads(); paintTiming(); });
  $("#cr-fx").addEventListener("pointerup", () => { if (!fxMode) return; if (performance.now() - fxDownAt < 300) fxLatched = true; else if (!fxLatched) fxMode = false; paintFxPads(); paintTiming(); });
  $("#cr-edit").addEventListener("click", toggleEdit);

  // ---------- input: the lid ----------
  $("#cr-main").addEventListener("click", (e) => {
    const n = e.target.closest("[data-sel]"); if (n) return select(Number(n.dataset.sel));
    const d = e.target.closest(".cr-dot"); if (!d) return;
    // a tap writes the step in every bar, cycling hit, accent, ghost, rest (LidPanels.swift: toggle across bars)
    const i = Number(d.dataset.i), s = Number(d.dataset.s), cur = rows[i][shownBar * STEPS + s];
    const next = !cur ? { v: VEL.x, late: 0, r: 1 } : cur.v >= 110 ? { v: VEL.g, late: 0, r: 1 } : cur.v < 60 ? null : { v: VEL.X, late: 0, r: 1 };
    snapshot();
    for (let b = 0; b < seq.bars; b++) rows[i][b * STEPS + s] = next ? { ...next, late: cur?.late || 0 } : null;
    paintDots();
    if (next && !seq.playing) unlock().then(() => trigger(pads[i], ac.currentTime, next.v));
  });
  let longT = 0; // a long press on a lane name clears the lane
  $("#cr-main").addEventListener("pointerdown", (e) => { const n = e.target.closest(".cr-lname"); if (!n) return; longT = setTimeout(() => { snapshot(); rows[Number(n.dataset.sel)].fill(null); paintMain(); }, 500); });
  $("#cr-main").addEventListener("pointerup", () => clearTimeout(longT));
  $("#cr-loop").addEventListener("click", () => { const opts = [1, 2, 4, 8]; snapshot(); setBars(opts[(opts.indexOf(seq.bars) + 1) % opts.length]); });
  const taps = [], tempo = $("#cr-tempo");
  $("#cr-bpm-b").addEventListener("click", () => (tempo.hidden = !tempo.hidden));
  $("#cr-swing-b").addEventListener("click", () => (tempo.hidden = !tempo.hidden));
  tempo.addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.t === "tap") { const now = performance.now(); if (taps.length && now - taps[taps.length - 1] > 2000) taps.length = 0; taps.push(now); if (taps.length > 5) taps.shift(); if (taps.length >= 2) seq.bpm = Math.max(50, Math.min(200, Math.round(60000 / ((taps[taps.length - 1] - taps[0]) / (taps.length - 1))))); }
    else if (b.dataset.t) seq.bpm = Math.max(50, Math.min(200, seq.bpm + Number(b.dataset.t)));
    else if (b.dataset.sw) seq.swing = Number(b.dataset.sw);
    paintLid();
  });
  $("#cr-chips").addEventListener("click", (e) => { const c = e.target.closest("[data-style]"); if (!c) return; applyStyle(c.dataset.style); if (!seq.playing) play(); });
  // the prompt: CRATE's direct commands and style words, parsed here (KeywordParser.swift, Orchestrator+Edit.swift:329-378)
  // a style is named by whole words: "house" picks House, "lighthouse" is a vibe to dig
  const wordRx = (w) => new RegExp(`(^|[^a-z0-9&])${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^a-z0-9&])`);
  const styleIn = (q) => STYLE_ORDER.find((k) => [k, ...STYLES[k].words].some((w) => wordRx(w).test(q)));
  const nudge = (dir) => rows.forEach((r, i) => r.forEach((h) => { if (!h) return; const amt = /snare|clap/.test(pads[i].role || "") ? 0.08 : pads[i].role === "hat" ? 0.04 : 0; h.late = Math.max(-0.3, Math.min(0.4, h.late + dir * amt)); }));
  const command = (text) => {
    const q = text.toLowerCase().trim(); if (!q) return "";
    let m;
    if (q === "undo") return doUndo(), "UNDO";
    if (q === "redo") return doRedo(), "REDO";
    if ((m = q.match(/(\d{2,3})\s*bpm|bpm\s*(\d{2,3})/))) { snapshot(); seq.bpm = Math.max(50, Math.min(200, Number(m[1] || m[2]))); paintLid(); return `BPM ${seq.bpm}`; }
    if (/faster|speed up|quicker/.test(q)) { snapshot(); seq.bpm = Math.min(200, seq.bpm + 5); paintLid(); return `BPM ${seq.bpm}`; }
    if (/slower|slow down/.test(q)) { snapshot(); seq.bpm = Math.max(50, seq.bpm - 5); paintLid(); return `BPM ${seq.bpm}`; }
    if (/half ?time/.test(q)) { snapshot(); seq.bpm = Math.max(50, Math.round(seq.bpm / 2)); paintLid(); return `HALF TIME · ${seq.bpm}`; }
    if ((m = q.match(/(\d)\s*bars?/)) && [1, 2, 4, 8].includes(Number(m[1]))) { snapshot(); setBars(Number(m[1])); return `${m[1]} BARS`; }
    if (/looser|swing it|more swing|lazier/.test(q)) { snapshot(); seq.swing = Math.min(75, seq.swing + 4); nudge(1); paintLid(); return `SWING ${seq.swing}`; }
    if (/tighter|straight|less swing|quantize/.test(q)) { snapshot(); seq.swing = Math.max(50, seq.swing - 4); nudge(-1); paintLid(); return `SWING ${seq.swing}`; }
    if ((m = q.match(/(?:take out|remove|drop|mute|no) (?:the )?(\w+)/))) {
      const word = m[1].replace(/s$/, ""), alias = { hihat: "hat", hi: "hat", drum: "kick", crash: "cymbal" }[word] || word;
      const hitLanes = pads.map((p, i) => i).filter((i) => pads[i].role === alias || pads[i].item.name.toLowerCase().includes(word));
      if (hitLanes.length) { snapshot(); hitLanes.forEach((i) => rows[i].fill(null)); paintMain(); return `CLEARED ${alias.toUpperCase()}`; }
    }
    const style = styleIn(q);
    if (style) { applyStyle(style); if (!seq.playing) play(); return STYLES[style].label; }
    return "?";
  };
  const doUndo = () => { if (!undo.length) return; redo.push(state()); restore(undo.pop()); };
  const doRedo = () => { if (!redo.length) return; undo.push(state()); restore(redo.pop()); };
  // anything that is not a command or a style is a vibe: DIG it into a new kit and open that kit on the pads, the way
  // CRATE's DIG key turns the prompt into a kit (Sources/UI/UISupport.swift:202-210, LidDisplayView.swift:934-983)
  const dig = async (vibe) => {
    const q = $("#cr-q"); q.disabled = true; q.value = ""; q.placeholder = `DIGGING · ${vibe.toUpperCase()}`;
    try { const r = await fetch("/api/kits", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ vibe }) }); const j = await r.json(); if (!r.ok) throw new Error(j.error || r.status); location.hash = `#/pads/${j.id}`; }
    catch (err) { q.disabled = false; q.placeholder = `× FAILED · ${String(err.message).toUpperCase()}`; }
  };
  $("#cr-prompt").addEventListener("submit", (e) => {
    e.preventDefault();
    // several commands in one line ("boom bap, bpm 96, take out the hats") run in order, a style first so the
    // rest edit its groove
    const text = $("#cr-q").value.trim(), bits = text.split(/\s*(?:,|;|\band then\b|\bthen\b)\s*/).filter(Boolean);
    const rank = (b) => (styleIn(b.toLowerCase()) ? 0 : 1);
    const results = bits.length > 1 ? [...bits].sort((a, b) => rank(a) - rank(b)).map(command) : [command(text)];
    const r = results.every((x) => x === "?") ? "?" : results.filter((x) => x !== "?").join(" · ");
    if (r === "?" && text.split(/\s+/).length >= 2) return dig(text);
    // a line that mixes commands with a vibe ("rusty sci-fi dungeon, boom bap, bpm 96") digs the vibe, and the new
    // kit's pads run the commands once they open
    const sorted = bits.length > 1 ? [...bits].sort((a, b) => rank(a) - rank(b)) : [text];
    const vibe = sorted.filter((b, i) => results[i] === "?" && b.split(/\s+/).length >= 2);
    if (vibe.length) { try { sessionStorage.setItem("oasis.pads.then", JSON.stringify(sorted.filter((b, i) => results[i] !== "?"))); } catch {} return dig(vibe.join(", ")); }
    $("#cr-q").value = "";
    $("#cr-q").placeholder = r === "?" ? "A style (boom bap, dilla, house), bpm 96, looser, 4 bars, take out the hats, or a vibe to dig" : `✓ ${r}`; $("#cr-q").blur();
  });
  $("#cr-prompt").addEventListener("click", (e) => {
    const b = e.target.closest("[data-c]"); if (!b) return;
    if (b.dataset.c === "keep") { if (!jam.length) return; snapshot(); const total = seq.bars * STEPS; for (const h of jam) { const s = ((h.abs % total) + total) % total; rows[h.i][s] = rows[h.i][s] || { v: h.v, late: 0, r: 1 }; } jam = []; paintJam(); paintMain(); return; }
    if (b.dataset.c === "perform") { perf.on = !perf.on; perf.turn = 0; b.classList.toggle("on", perf.on); b.setAttribute("aria-pressed", perf.on); paintTiming(); if (perf.on && !seq.playing) play(); return; }
    b.dataset.c === "undo" ? doUndo() : doRedo();
  });

  // ---------- input: transport and the hinge fader ----------
  $("#cr-play").addEventListener("click", () => { if (!seq.playing) play(); });
  $("#cr-stop").addEventListener("click", stop);
  $("#cr-rec").addEventListener("click", async () => { if (seq.recording) { seq.recording = false; paintTransport(); return; } seq.recording = true; if (!seq.playing) await play({ countIn: true }); paintTransport(); });
  const fader = $("#cr-fader");
  const faderAt = (e) => { const r = fader.getBoundingClientRect(); return 1 - Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)); };
  const trail = []; // recent punch values, for the DROP gesture (HingeFX.swift:36-56)
  let lastDrop = 0;
  const watchDrop = () => {
    const now = performance.now(); trail.push([now, punch]); while (trail.length && now - trail[0][0] > 450) trail.shift();
    if (punch < 0.1 && trail.some(([, v]) => v > 0.6) && now - lastDrop > 1000) { lastDrop = now; trail.length = 0; drop(); }
  };
  function drop() {
    setPunch(0);
    const t = ac.currentTime + 0.005, cym = pads.find((p) => p.role === "cymbal") || pads.find((p) => p.role === "openhat"), kick = pads.find((p) => p.role === "kick");
    if (cym) trigger(cym, t, 118);
    if (kick) trigger(kick, t, 124);
    const el = $("#cr-drop"); el.classList.remove("on"); void el.offsetWidth; el.classList.add("on");
    if (stage) { const d = $("#cs-drop", stage); d.classList.remove("on"); void d.offsetWidth; d.classList.add("on"); }
  }
  let dragging = false;
  fader.addEventListener("pointerdown", (e) => { dragging = true; fader.setPointerCapture(e.pointerId); unlock(); setPunch(faderAt(e)); watchDrop(); });
  fader.addEventListener("pointermove", (e) => { if (!dragging) return; setPunch(faderAt(e)); watchDrop(); });
  fader.addEventListener("pointerup", (e) => { if (dragging) setPunch(faderAt(e)); dragging = false; watchDrop(); });
  fader.addEventListener("keydown", (e) => { const d = { ArrowUp: 0.05, ArrowDown: -0.05, PageUp: 0.25, PageDown: -0.25, Home: -1, End: 1 }[e.key]; if (d === undefined) return; e.preventDefault(); e.stopPropagation(); setPunch(Math.max(0, Math.min(1, punch + d))); watchDrop(); });

  // ---------- input: keys ----------
  const onKey = (e) => {
    if (e.target.closest("input, select, textarea, oasis-knob")) { if (e.key === "Escape") e.target.blur(); return; }
    if (e.key === "Escape" && stage) { closeStage(); return; }
    if ((e.metaKey || e.ctrlKey) && e.code === "KeyZ") { e.preventDefault(); e.shiftKey ? doRedo() : doUndo(); return; }
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.code === "Space") { e.preventDefault(); e.target.closest("button")?.blur(); if (!e.repeat) seq.playing ? stop() : play(); return; }
    if (e.code === "Enter") { e.preventDefault(); $("#cr-rec").click(); return; }
    if (e.key === "/") { e.preventDefault(); $("#cr-q").focus(); return; }
    const i = KEYS.indexOf(e.code);
    if (i >= 0 && !e.repeat) { e.preventDefault(); hit(i, 110); $(`.cr-pad[data-i="${i}"]`, app)?.classList.add("down"); }
  };
  const onKeyUp = (e) => { if (e.code === "Space" && e.target.closest("button")) e.preventDefault(); const i = KEYS.indexOf(e.code); if (i >= 0) $(`.cr-pad[data-i="${i}"]`, app)?.classList.remove("down"); };
  addEventListener("keydown", onKey); addEventListener("keyup", onKeyUp);

  // ---------- STAGE: CRATE's audience view (Sources/Crowd/CrowdStageView.swift) as a full-screen page for the room:
  // a 4x4 dot matrix lit on every hit (held 160 ms), the style in Doto, the kit and tempo, an output level bar, the
  // last fill, and DROP full-screen in the accent at 0.93 for 280 ms. Keys keep playing underneath; Esc leaves.
  let stage = null;
  const openStage = async () => {
    if (stage) return;
    stage = document.createElement("div"); stage.className = "cr-stage"; stage.setAttribute("role", "dialog"); stage.setAttribute("aria-label", "Stage view");
    stage.innerHTML = `<div class="cs-grid">${DRAW_ORDER.filter((i) => i < Math.max(4, Math.ceil(pads.length / 4) * 4)).map((i) => `<div class="cs-cell${pads[i] ? "" : " none"}" data-i="${i}"><i></i><span>${pads[i] ? esc(pads[i].item.name) : ""}</span></div>`).join("")}</div>
      <div class="cs-side"><b class="cs-brand">OASIS · PADS</b><div class="cs-style" id="cs-style"></div><div class="cs-kit" id="cs-kit"></div><div class="cs-level"><i id="cs-level"></i></div><div class="cs-fill" id="cs-fill"></div><p class="cs-hint">Keys still play. Esc leaves.</p></div>
      <div class="cs-drop" id="cs-drop">DROP</div>`;
    document.body.appendChild(stage);
    paintStage();
    try { await stage.requestFullscreen?.(); } catch {}
    stage.addEventListener("click", (e) => { if (!e.target.closest(".cs-cell")) return; const i = Number(e.target.closest(".cs-cell").dataset.i); if (pads[i]) hit(i, 110); });
  };
  const closeStage = () => { if (!stage) return; if (document.fullscreenElement === stage) document.exitFullscreen?.().catch(() => {}); stage.remove(); stage = null; };
  document.addEventListener("fullscreenchange", () => { if (stage && !document.fullscreenElement) closeStage(); });
  function paintStage() { if (!stage) return; $("#cs-style", stage).textContent = (seq.style ? STYLES[seq.style].label : "KIT"); $("#cs-kit", stage).textContent = `${kit.title} · ${Math.round(seq.bpm)} BPM`; }
  $("#cr-stagebtn").addEventListener("click", openStage);
  // the licence chip goes straight to PayPal (the kit page's own checkout and claim flow); it is a link to the kit
  // page only if JavaScript cannot start the order
  $("#cr-lic")?.addEventListener("click", async (e) => {
    e.preventDefault();
    const key = `oasis.kit.${kit.id}`; let pend = null; try { pend = JSON.parse(localStorage.getItem(key)); } catch {}
    if (pend?.approveUrl && Date.now() - (pend.at || 0) < 3 * 3600e3) { location.href = pend.approveUrl; return; }
    try { const r = await fetch(`/api/kits/${kit.id}/checkout`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }); const o = await r.json(); if (!r.ok) throw new Error(o.error); try { localStorage.setItem(key, JSON.stringify({ orderId: o.order_id, claimToken: o.claim_token, approveUrl: o.approve_url, at: Date.now() })); } catch {} location.href = o.approve_url; }
    catch { location.hash = `#/kit/${kit.id}`; }
  });
  const tap = analyser(), lvl = new Float32Array(tap.fftSize);
  // ---------- draw what has sounded, against the audio clock (metronome.js draw()) ----------
  let raf = 0;
  const draw = () => {
    const now = ac.currentTime;
    while (queue.length && queue[0].time <= now) {
      const q = queue.shift();
      if (q.kind === "step") {
        if (q.bar !== shownBar) { shownBar = q.bar; paintDots(); }
        paintSeqHead(q.s);
        $("#cr-pos").textContent = `${q.bar + 1}.${Math.floor((q.s % STEPS) / 4) + 1}`;
        $$("#cr-segs i", app).forEach((g) => { const b = Number(g.dataset.b); g.className = b === q.bar ? "now" : b < q.bar ? "past" : ""; });
      } else if (q.kind === "fill") {
        if (stage) $("#cs-fill", stage).textContent = `▸ ${FILL_NAME[q.fill].toUpperCase()}`;
        const t = $("#cr-timing .cr-perf"); if (t) { t.textContent = `▸ ${FILL_NAME[q.fill]}`; t.classList.remove("on"); void t.offsetWidth; t.classList.add("on"); }
      } else if (q.kind === "count") {
        $("#cr-pos").textContent = `−${4 - Math.floor(q.n / 4)}`;
      } else {
        const p = pads[q.i]; p.lit = now + 0.1; // lit for 100 ms after a hit (Theme.swift:104)
        if (stage) { const c = $(`.cs-cell[data-i="${q.i}"]`, stage); if (c) { c.classList.add("on"); clearTimeout(c.t); c.t = setTimeout(() => c.classList.remove("on"), 160); } }
        $(`.cr-pad[data-i="${q.i}"]`, app)?.classList.add("lit");
        if (q.i === selected) $$("#cr-takes canvas", app).forEach((d) => d.classList.toggle("on", Number(d.dataset.n) === q.take));
      }
    }
    if (stage) { tap.getFloatTimeDomainData(lvl); let sq = 0; for (let i = 0; i < lvl.length; i += 4) sq += lvl[i] * lvl[i]; $("#cs-level", stage).style.transform = `scaleX(${Math.min(1, Math.sqrt(sq / (lvl.length / 4)) * 3.2)})`; }
    for (const p of pads) if (p.lit && now > p.lit) { p.lit = 0; $(`.cr-pad[data-i="${p.i}"]`, app)?.classList.remove("lit"); }
    raf = requestAnimationFrame(draw);
  };
  raf = requestAnimationFrame(draw);

  // ---------- bounce: the loop rendered offline, dry, to a WAV ----------
  $("#cr-export").addEventListener("click", async () => {
    const b = $("#cr-export"); b.disabled = true; b.textContent = "…";
    try {
      await Promise.all(pads.map((p) => p.loading || p.takes));
      const sr = 44100, d = stepDur(), len = seq.bars * STEPS, total = Math.ceil((len * d + 2) * sr);
      const off = new OfflineAudioContext(1, total, sr), bus = off.createGain(); bus.gain.value = 0.94; bus.connect(off.destination);
      const counters = pads.map(() => 0);
      for (let s = 0; s < len; s++) {
        const swingLate = s % 2 ? (2 * seq.swing / 100 - 1) * d : 0;
        pads.forEach((p, i) => {
          const h = rows[i][s]; if (!h || !p.takes.length) return;
          const r = h.r || 1;
          for (let k = 0; k < r; k++) { const src = off.createBufferSource(), g = off.createGain(); src.buffer = p.takes[counters[i]++ % p.takes.length]; g.gain.value = Math.pow(Math.round(h.v * Math.pow(0.85, k)) / 127, 1.6); src.connect(g).connect(bus); src.start(Math.max(0, s * d + swingLate + h.late * d + (k * d) / r)); }
        });
      }
      const out = (await off.startRendering()).getChannelData(0);
      let peak = 0; for (const v of out) peak = Math.max(peak, Math.abs(v));
      if (peak > 0.98) for (let i = 0; i < out.length; i++) out[i] *= 0.98 / peak;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([wav(out, sr)], { type: "audio/wav" }));
      a.download = `${kit.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${seq.style || "kit"}-${Math.round(seq.bpm)}bpm.wav`;
      document.body.appendChild(a); a.click(); a.remove();
      b.textContent = "✓";
    } catch (err) { b.textContent = "×"; console.error(err); }
    setTimeout(() => { b.disabled = false; b.textContent = "BOUNCE"; }, 1600);
  });

  // a first groove from what the kit is, the way CRATE starts every kit on its style's groove: a kit with a bed and no
  // drum names gets lo-fi, anything else boom bap
  applyStyle(pads.some((p) => p.role === "texture") && !pads.some((p) => /kick|808|drum|snare/.test(p.item.name.toLowerCase())) ? "lofi" : "boombap");
  // commands left from the line that dug this kit run over that first groove
  try { const then = JSON.parse(sessionStorage.getItem("oasis.pads.then") || "[]"); sessionStorage.removeItem("oasis.pads.then"); const done = then.map(command).filter((x) => x && x !== "?"); if (done.length) $("#cr-q").placeholder = `✓ ${done.join(" · ")}`; } catch {}
  undo.length = 0;
  paintFxPads(); paintAll(); setPunch(0);
  pads.forEach(load);

  addEventListener("hashchange", () => { closeStage(); stop(); timer.terminate(); cancelAnimationFrame(raf); removeEventListener("keydown", onKey); removeEventListener("keyup", onKeyUp); try { padsBus.disconnect(); master.disconnect(); fx.stops.forEach((o) => o.stop()); } catch {} }, { once: true });
}
