// <oasis-keys>: the on-screen keyboard for a sound program with a note knob, and the note player behind it.
// The element is a port in the style of public/knob.js: g200kg/webaudio-controls (webaudio-controls.js, class
// WebAudioKeyboard, Apache-2.0) for the keybed (min..max MIDI, white keys one unit, black keys 7/12 at the kp offsets;
// see public/keys-core.js) and for pointer handling: a press captures the pointer and every move re-reads which key is
// under it, so dragging across the keys is a glissando, and each touch is its own pointer, so chords work. Its
// keydown/keyup pair (one note per physical key, ignored while held) follows stuartmemo/qwerty-hancock
// (src/events.ts handleKeyDown/handleKeyUp: skip modifier chords, a keysDown map keyed by event.code so auto-repeat
// and a second keydown do nothing, release on keyup). Where it deviates, on purpose: webaudio-keyboard draws on one
// canvas with no ARIA; here every key is a <button> with an aria-label, the bed is one tab stop with roving focus
// (Left/Right between playable keys, Enter/Space plays, the WAI-ARIA toolbar pattern), keys outside the program's
// note options are drawn greyed and aria-disabled, and the computer keyboard never fires while you type in a field.
import { midiOf, nameOf, keyRange, layout, QWERTY, QWERTY_LABEL, baseFor, cacheKey } from "/keys-core.js";
import { unlock, play } from "/audio.js";

const css = `
:host { display: block; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; }
.bed { position: relative; width: 100%; height: var(--keys-h, 132px); touch-action: none; }
.k { position: absolute; top: 0; box-sizing: border-box; margin: 0; padding: 0 0 7px; border: 1px solid var(--line-strong); border-top: 0;
  border-radius: 0 0 6px 6px; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; gap: 1px;
  font: 600 10.5px/1 var(--font-mono); cursor: pointer; outline: none; -webkit-tap-highlight-color: transparent;
  transition: background-color 60ms, transform 60ms; }
.k.w { height: 100%; background: var(--surface); color: var(--muted); z-index: 1; }
.k.b { height: 61%; background: var(--ink); color: var(--bg); border-color: var(--ink); z-index: 2; border-radius: 0 0 4px 4px; padding-bottom: 5px; font-size: 9.5px; }
.k.off.w { background: var(--sunk); color: color-mix(in srgb, var(--muted) 55%, transparent); cursor: default; }
.k.off.b { background: color-mix(in srgb, var(--ink) 42%, var(--sunk)); border-color: transparent; cursor: default; }
.k.on { background: var(--accent) !important; color: var(--accent-ink) !important; border-color: var(--accent) !important; transform: translateY(1px); }
.k.wait:not(.on) { background-image: linear-gradient(0deg, color-mix(in srgb, var(--accent) 22%, transparent), transparent 60%); }
.k:focus-visible { box-shadow: inset 0 0 0 2px var(--accent), 0 0 0 3px color-mix(in srgb, var(--accent) 35%, transparent); z-index: 3; }
.k .q { opacity: .9; text-transform: uppercase; }
.k .n { font-weight: 500; opacity: .75; }
.k.b .n { display: none; }
@media (max-width: 599px) { .k { font-size: 9px; padding-bottom: 5px; } .k.b { font-size: 8px; } }
@media (prefers-reduced-motion: reduce) { .k { transition: none; } .k.on { transform: none; } }
`;
const EDITABLE = "input, textarea, select, [contenteditable=''], [contenteditable='true']";

class OasisKeys extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" }).innerHTML = `<style>${css}</style><div class="bed" role="group" part="bed"></div>`;
    this.bed = this.shadowRoot.querySelector(".bed");
    this.lit = new Map(); // midi -> how many hands hold it (a pointer, a computer key)
    this.pointers = new Map(); // pointerId -> midi under it (webaudio-keyboard's this.values, one per touch)
    this.keysDown = new Map(); // event.code -> midi (qwerty-hancock's state.keysDown)
    this.shift = 0; // octaves the Z/X keys have moved the row
    this._onKey = (e) => this._key(e, true);
    this._onKeyUp = (e) => this._key(e, false);
    this._blur = () => this._releaseAll();
  }
  /** The playable note names ("C3|E3|G3"); everything else on the bed is drawn greyed. */
  get notes() { return (this.getAttribute("notes") || "").split("|").filter(Boolean).map((name) => ({ name, midi: midiOf(name) })).filter((n) => n.midi !== null).sort((a, b) => a.midi - b.midi); }
  set notes(list) { this.setAttribute("notes", list.map((n) => n.name || n).join("|")); }
  static get observedAttributes() { return ["notes", "label"]; }
  attributeChangedCallback() { if (this.isConnected) this._build(); }
  connectedCallback() {
    this._build();
    if (this._wired) return; this._wired = true;
    this.bed.addEventListener("pointerdown", (e) => this._down(e));
    this.bed.addEventListener("keydown", (e) => this._focusKey(e));
    this.bed.addEventListener("keyup", (e) => { if (e.key === "Enter" || e.key === " ") { const b = e.target.closest?.(".k"); if (b) this._release(Number(b.dataset.m)); } });
    this.bed.addEventListener("focusin", (e) => { const b = e.target.closest?.(".k"); if (b) this._rove(b); });
    if (!this.hasAttribute("no-qwerty")) {
      document.addEventListener("keydown", this._onKey);
      document.addEventListener("keyup", this._onKeyUp);
      addEventListener("blur", this._blur);
    }
  }
  disconnectedCallback() {
    document.removeEventListener("keydown", this._onKey);
    document.removeEventListener("keyup", this._onKeyUp);
    removeEventListener("blur", this._blur);
    this._wired = false;
    this._releaseAll();
  }
  /** The C the computer keyboard's A plays now. */
  get base() { return baseFor(this.notes) + 12 * this.shift; }
  _build() {
    const notes = this.notes, r = keyRange(notes);
    this.playable = new Map(notes.map((n) => [n.midi, n.name]));
    this.bed.setAttribute("aria-label", this.getAttribute("label") || "Keyboard");
    if (!r) { this.bed.innerHTML = ""; return; }
    const { keys, width } = layout(r.lo, r.hi);
    this.range = r;
    const first = notes[0].midi;
    this.bed.innerHTML = keys.map((k) => {
      const on = this.playable.has(k.midi), name = this.playable.get(k.midi) || k.name;
      return `<button type="button" class="k ${k.black ? "b" : "w"}${on ? "" : " off"}" data-m="${k.midi}" tabindex="${k.midi === first ? 0 : -1}"
        aria-label="${name}${on ? "" : ", not in this voice"}"${on ? "" : ' aria-disabled="true"'}
        style="left:${((k.x / width) * 100).toFixed(4)}%;width:${((k.w / width) * 100).toFixed(4)}%"><span class="q"></span><span class="n">${k.midi % 12 === 0 || (on && !k.black) ? name : ""}</span></button>`;
    }).join("");
    this._labels();
  }
  /** Prints the computer key on each key the row reaches at the current octave. */
  _labels() {
    const base = this.base, byMidi = new Map(Object.entries(QWERTY).map(([code, st]) => [base + st, QWERTY_LABEL[code]]));
    this.shadowRoot.querySelectorAll(".k").forEach((b) => { b.querySelector(".q").textContent = this.hasAttribute("no-qwerty") ? "" : byMidi.get(Number(b.dataset.m)) || ""; });
  }
  _btn(m) { return this.shadowRoot.querySelector(`.k[data-m="${m}"]`); }
  /** Lights a key (and keeps it lit while any hand still holds it); fires noteon for a playable key. */
  _press(m) {
    if (m == null || !this.playable.has(m)) return; // a greyed key neither lights nor sounds
    const n = (this.lit.get(m) || 0) + 1; this.lit.set(m, n);
    this._btn(m)?.classList.add("on");
    if (n === 1) this.dispatchEvent(new CustomEvent("noteon", { detail: { note: this.playable.get(m), midi: m } }));
  }
  _release(m) {
    if (m == null || !this.lit.has(m)) return;
    const n = this.lit.get(m) - 1;
    if (n > 0) { this.lit.set(m, n); return; }
    this.lit.delete(m);
    const b = this._btn(m); if (b) setTimeout(() => { if (!this.lit.has(m)) b.classList.remove("on"); }, 90); // a tap still shows
    if (this.playable.has(m)) this.dispatchEvent(new CustomEvent("noteoff", { detail: { note: this.playable.get(m), midi: m } }));
  }
  _releaseAll() { for (const m of [...this.lit.keys()]) { this.lit.set(m, 1); this._release(m); } this.pointers.clear(); this.keysDown.clear(); }
  /** Lights a key from outside (a note played by a different control) for a moment. */
  flash(m, ms = 160) { const b = this._btn(m); if (!b) return; b.classList.add("on"); setTimeout(() => { if (!this.lit.has(m)) b.classList.remove("on"); }, ms); }
  /** Marks keys whose render is still on its way. */
  waiting(m, on) { this._btn(m)?.classList.toggle("wait", on); }

  /** The key under a point: black keys sit on top, so ask the shadow root what is hit (webaudio-keyboard instead
   * does the arithmetic on its canvas; with real buttons the browser's hit test is the same answer). */
  _at(x, y) { const el = this.shadowRoot.elementFromPoint(x, y)?.closest?.(".k"); return el && this.bed.contains(el) ? Number(el.dataset.m) : null; }
  _down(e) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const m = this._at(e.clientX, e.clientY);
    e.preventDefault(); // no text selection, no focus-scroll, no emulated mouse events after a touch
    if (m !== null && this.playable.has(m)) { const b = this._btn(m); this._rove(b); b.focus({ preventScroll: true }); }
    this.bed.setPointerCapture?.(e.pointerId);
    this.pointers.set(e.pointerId, m);
    this._press(m);
    const move = (ev) => {
      if (ev.pointerId !== e.pointerId || !this.pointers.has(ev.pointerId)) return;
      const k = this._at(ev.clientX, ev.clientY), was = this.pointers.get(ev.pointerId);
      if (k === was) return;
      // a glissando: leaving a key releases it, entering one plays it (qwerty-hancock handleMouseOver/Out)
      this.pointers.set(ev.pointerId, k); this._release(was); this._press(k);
    };
    const up = (ev) => {
      if (ev.pointerId !== e.pointerId) return;
      this._release(this.pointers.get(ev.pointerId)); this.pointers.delete(ev.pointerId);
      this.bed.removeEventListener("pointermove", move); this.bed.removeEventListener("pointerup", up); this.bed.removeEventListener("pointercancel", up);
    };
    this.bed.addEventListener("pointermove", move); this.bed.addEventListener("pointerup", up); this.bed.addEventListener("pointercancel", up);
  }
  /** Roving tabindex: the bed is one tab stop, the last key you touched. */
  _rove(b) { if (!b || b.getAttribute("aria-disabled")) return; this.shadowRoot.querySelectorAll(".k[tabindex='0']").forEach((x) => x !== b && x.setAttribute("tabindex", "-1")); b.setAttribute("tabindex", "0"); }
  _focusKey(e) {
    const b = e.target.closest?.(".k"); if (!b) return;
    const m = Number(b.dataset.m);
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); if (!e.repeat) this._press(m); return; }
    const dir = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key] ?? (e.key === "Home" ? -99 : e.key === "End" ? 99 : 0);
    if (!dir) return;
    e.preventDefault(); e.stopPropagation();
    const list = [...this.playable.keys()].sort((a, b) => a - b), i = list.indexOf(m);
    const next = list[Math.max(0, Math.min(list.length - 1, (i < 0 ? 0 : i) + dir))];
    const nb = this._btn(next); this._rove(nb); nb?.focus();
  }
  /** The computer keyboard (qwerty-hancock handleKeyDown/handleKeyUp, Ableton's row; Z/X move it an octave). */
  _key(e, down) {
    if (!this.isConnected || !this.playable?.size) return;
    if (!down) { const m = this.keysDown.get(e.code); if (m === undefined) return; this.keysDown.delete(e.code); this._release(m); return; }
    if (e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented) return;
    const t = e.composedPath?.()[0] || e.target;
    if (t?.closest?.(EDITABLE) || t?.isContentEditable) return; // typing in a field is typing, not playing
    if (e.code === "KeyZ" || e.code === "KeyX") { if (!e.repeat) this.octave(e.code === "KeyZ" ? -1 : 1); e.preventDefault(); return; }
    if (!(e.code in QWERTY)) return;
    e.preventDefault();
    if (e.repeat || this.keysDown.has(e.code)) return;
    const m = this.base + QWERTY[e.code];
    this.keysDown.set(e.code, m);
    if (this.playable.has(m)) this._press(m); else this.flashOff(m);
  }
  /** Moves the computer keyboard's row an octave, as far as it still reaches a playable note. */
  octave(d) {
    const notes = this.notes; if (!notes.length) return;
    const lo = notes[0].midi, hi = notes.at(-1).midi, span = Math.max(...Object.values(QWERTY));
    const next = this.shift + d, base = baseFor(notes) + 12 * next;
    if (base + span < lo || base > hi) return;
    this.shift = next; this._labels();
    this.dispatchEvent(new CustomEvent("octave", { detail: { base, from: nameOf(base), to: nameOf(base + span) } }));
  }
  /** A computer key that lands on a greyed key nudges it, so you can see where you are. */
  flashOff(m) { const b = this._btn(m); if (!b) return; b.animate?.([{ transform: "translateY(1px)" }, { transform: "none" }], { duration: 120 }); }
}
if (!customElements.get("oasis-keys")) customElements.define("oasis-keys", OasisKeys);

// ---------- the note player: every note rendered ahead, cached by knob state, played as overlapping one-shots ----------
// Each note is the program run again with the note knob set (the same render path the page's stage uses, so a paid
// sound's notes come back from the server's preview route with the watermark until a licence is in hand). Playback is
// public/audio.js play(): a fresh AudioBufferSourceNode per press, as Tone.js's Player starts one ToneBufferSource
// per start() (Tone/source/buffer/Player.ts), so notes ring over each other the way Tone's Sampler voices do.
const LIMIT = 96; // renders kept: a dozen knob states of a nine-note voice
export function notePlayer({ render, knobName, notes, values, onState = () => {} }) {
  const cache = new Map(), done = new Set();
  let gen = 0, timer = null, watermarked = null, error = null;
  const keyOf = (note) => cacheKey(values(), knobName, note);
  const report = () => onState({ ready: notes.filter((n) => done.has(keyOf(n.name))).length, total: notes.length, watermarked, error });
  /** The AudioBuffer of one note at the current knobs: from the cache, or rendered now (and cached). */
  const get = (note) => {
    const key = keyOf(note);
    if (cache.has(key)) { const p = cache.get(key); cache.delete(key); cache.set(key, p); return p; } // LRU touch
    const p = render({ ...values(), [knobName]: note }).then((r) => { watermarked = !!r.watermarked; done.add(key); return r.buffer; });
    p.catch(() => { cache.delete(key); });
    cache.set(key, p);
    while (cache.size > LIMIT) { const old = cache.keys().next().value; cache.delete(old); done.delete(old); }
    return p;
  };
  /** Renders every note in the background, two at a time; a newer call (a knob moved again) abandons the old pass. */
  const run = async () => {
    const g = ++gen, queue = [...notes];
    error = null; report();
    const lane = async () => {
      while (queue.length && g === gen) {
        const n = queue.shift();
        try { await get(n.name); } catch (e) { error = e.message; }
        if (g === gen) report();
      }
    };
    await Promise.all([lane(), lane()]);
  };
  return {
    get,
    /** Call after any knob change; debounced like the stage's own rebuild, a little longer so the stage goes first. */
    warm(ms = 350) { clearTimeout(timer); timer = setTimeout(run, ms); report(); },
    ready: (note) => done.has(keyOf(note)),
    /** Plays one note now (or as soon as its render lands). */
    async trigger(note, { gain = 0.85 } = {}) {
      await unlock();
      const buf = await get(note);
      return play(buf, { gain });
    },
    stop() { gen++; clearTimeout(timer); },
  };
}

const escAttr = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
/** The keyboard strip for one voice: a status line, the octave of the computer row, and <oasis-keys>.
 * `notes` from keys-core playableNotes(knobs); `values()` the knob values to play with (the page's live object). */
export function mountKeys(host, { notes, knobName, render, values, title = "Play it", label = "Keyboard" }) {
  host.classList.add("ks");
  host.innerHTML = `<div class="ks-head"><b class="ks-title">${escAttr(title)}</b><span class="ks-status" aria-live="polite"></span>
    <span class="ks-oct" role="group" aria-label="Computer keyboard octave"><button type="button" class="ks-ob" data-d="-1" aria-label="Octave down (Z)">z</button><span class="ks-row"></span><button type="button" class="ks-ob" data-d="1" aria-label="Octave up (X)">x</button></span></div>
    <oasis-keys label="${escAttr(label)}" notes="${escAttr(notes.map((n) => n.name).join("|"))}"></oasis-keys>
    <p class="ks-hint">Click or tap the keys, drag across them, or play <kbd>a</kbd>&#8202;<kbd>w</kbd>&#8202;<kbd>s</kbd>&#8202;<kbd>e</kbd>&#8202;<kbd>d</kbd> … <kbd>k</kbd> on your keyboard; <kbd>z</kbd> <kbd>x</kbd> change octave.</p>`;
  const keys = host.querySelector("oasis-keys"), status = host.querySelector(".ks-status"), row = host.querySelector(".ks-row");
  const span = Math.max(...Object.values(QWERTY));
  const showRow = () => { row.textContent = `${nameOf(keys.base)}–${nameOf(keys.base + span)}`; };
  showRow();
  const player = notePlayer({ render, knobName, notes, values, onState: ({ ready, total, watermarked, error }) => {
    status.classList.toggle("err", !!error);
    status.textContent = error ? `A note did not render: ${error}` : ready < total ? `Rendering notes, ${ready} of ${total}` : `${total} notes ready${watermarked ? ", watermarked preview" : ""}`;
    for (const n of notes) keys.waiting(n.midi, !player?.ready(n.name));
  } });
  keys.addEventListener("noteon", async (e) => {
    const { note, midi } = e.detail;
    if (!player.ready(note)) keys.waiting(midi, true);
    try { await player.trigger(note); } catch (err) { status.classList.add("err"); status.textContent = `${note} did not render: ${err.message}`; }
    keys.waiting(midi, !player.ready(note));
  });
  keys.addEventListener("octave", showRow);
  host.querySelector(".ks-oct").addEventListener("click", (e) => { const b = e.target.closest(".ks-ob"); if (b) keys.octave(Number(b.dataset.d)); });
  player.warm(500);
  return { keys, player, changed: () => player.warm(), destroy() { player.stop(); host.innerHTML = ""; } };
}
