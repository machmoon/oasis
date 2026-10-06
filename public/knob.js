// <oasis-knob>: a rotary knob for a sound program's knobs. The interaction is ported from g200kg/webaudio-controls
// (webaudio-controls.js, class WebAudioKnob, Apache-2.0): a 270-degree sweep from -135 to +135 degrees; a vertical
// or horizontal drag moves the value by (dy up + dx right) / 128 px of the full range, Shift for 4x finer; the
// arrow keys move one step; Ctrl/Cmd-click (and here also a double-click) returns to the default; a value tip while
// dragging. Where it deviates, on purpose: it carries role="slider" with aria-valuenow/valuetext and Home/End/PageUp/
// PageDown (webaudio-knob has no ARIA); the wheel turns it only while it has focus (a page of knobs must still
// scroll); and instead of a sprite strip it draws a track arc and a value arc with d3-shape's arc() generator
// (d3-shape src/arc.js: angles in radians from 12 o'clock, clockwise, cornerRadius rounds the ends). A choice knob
// (options="a|b|c") has detents: one tick per option on the sweep, and the value snaps from detent to detent.
// Programmatic changes (a reset, the home film turning it) glide with Motion's spring (vendor/motion).
import { arc } from "d3-shape";
import { animate } from "/vendor/motion/index.js";

const SWEEP = (3 * Math.PI) / 4; // +-135 degrees
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const css = `
:host { display: inline-grid; justify-items: center; gap: 2px; width: var(--knob-w, 76px); font: 12px var(--font-sans); color: var(--muted); user-select: none; -webkit-user-select: none; touch-action: none; }
.dial { position: relative; width: var(--knob-size, 56px); height: var(--knob-size, 56px); border-radius: 50%; cursor: ns-resize; outline: none; }
.dial:focus-visible { box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 45%, transparent); }
:host([readonly]) .dial { cursor: default; }
svg { display: block; width: 100%; height: 100%; overflow: visible; }
.track { fill: var(--sunk); stroke: color-mix(in srgb, var(--ink) 8%, transparent); stroke-width: .5; }
.val { fill: var(--accent); }
.cap { fill: var(--surface); stroke: var(--line-strong); stroke-width: 1; filter: drop-shadow(0 1px 1.5px rgb(var(--shadow-color) / .22)); }
.ptr { stroke: var(--ink); stroke-width: 2.2; stroke-linecap: round; }
.tick { stroke: var(--line-strong); stroke-width: 1.4; stroke-linecap: round; }
.tick.on { stroke: var(--accent); }
.v { font: 600 12.5px var(--font-mono); font-variant-numeric: tabular-nums; color: var(--ink); max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.v.words { white-space: normal; text-overflow: clip; text-align: center; line-height: 1.15; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; font-size: 11.5px; }
.l { font-size: 12px; color: var(--muted); max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
:host(.hot) .v, :host(.hot) .l { color: var(--accent-text); }
.tip { position: absolute; left: 50%; bottom: calc(100% + 6px); transform: translateX(-50%); padding: 3px 7px; border-radius: 6px; background: var(--ink); color: var(--bg); font: 600 11.5px var(--font-mono); white-space: nowrap; opacity: 0; pointer-events: none; transition: opacity var(--t-fast, 120ms); }
.dial.drag .tip { opacity: 1; }
`;

class OasisKnob extends HTMLElement {
  static get observedAttributes() { return ["value"]; }
  constructor() {
    super();
    const r = this.attachShadow({ mode: "open" });
    r.innerHTML = `<style>${css}</style><div class="dial" part="dial" role="slider" tabindex="0"><svg viewBox="-30 -30 60 60" aria-hidden="true"><path class="track"/><g class="ticks"></g><path class="val"/><circle class="cap" r="15.5"/><line class="ptr" x1="0" y1="-6" x2="0" y2="-13"/></svg><span class="tip"></span></div><span class="v" part="value"></span><span class="l" part="label"></span>`;
    this.$ = (s) => r.querySelector(s);
    this._shown = null;
  }
  get options() { const o = this.getAttribute("options"); return o ? o.split("|") : null; }
  get min() { return this.options ? 0 : Number(this.getAttribute("min") ?? 0); }
  get max() { return this.options ? this.options.length - 1 : Number(this.getAttribute("max") ?? 1); }
  get step() { return this.options ? 1 : Number(this.getAttribute("step") || (this.max - this.min) / 100); }
  get default() { const d = this.getAttribute("default"); return d === null ? this.min : this.options ? Math.max(0, this.options.indexOf(d)) : Number(d); }
  /** For a choice knob the value is the option string; otherwise a number. */
  get value() { return this.options ? this.options[this._v] : this._v; }
  set value(v) { this._set(this._index(v), { animate: true }); }
  _index(v) { return this.options ? Math.max(0, this.options.indexOf(String(v))) : Number(v); }
  connectedCallback() {
    if (this._ready) return; this._ready = true;
    this._v = this._clamp(this._index(this.getAttribute("value") ?? this.getAttribute("default") ?? this.min));
    this.$(".l").textContent = this.getAttribute("label") || "";
    const dial = this.$(".dial");
    dial.setAttribute("aria-label", this.getAttribute("label") || "knob");
    this._ticks();
    this._draw(this._v);
    if (this.hasAttribute("readonly")) { dial.setAttribute("aria-readonly", "true"); return; }
    dial.addEventListener("pointerdown", (e) => this._down(e));
    dial.addEventListener("keydown", (e) => this._key(e));
    dial.addEventListener("dblclick", () => this._commit(this.default));
    dial.addEventListener("wheel", (e) => { if (this.shadowRoot.activeElement !== dial) return; e.preventDefault(); const d = this.options ? 1 : Math.max(this.step, (this.max - this.min) * 0.05); this._commit(this._v + (e.deltaY > 0 ? -d : d)); }, { passive: false });
  }
  attributeChangedCallback(n, o, v) { if (this._ready && n === "value" && o !== v) this._set(this._index(v), { animate: true }); }
  _clamp(v) { const s = this.step; v = Math.min(this.max, Math.max(this.min, v)); if (s) v = Math.round((v - this.min) / s) * s + this.min; return Number(v.toFixed(6)); }
  _fmt(v) { if (this.options) return this.options[Math.round(v)]; const s = this.step, d = s && s < 1 ? Math.min(3, Math.ceil(-Math.log10(s) - 1e-9)) : 0; return Number(v).toFixed(d); }
  _angle(v) { const k = (v - this.min) / (this.max - this.min || 1); return -SWEEP + 2 * SWEEP * k; }
  _ticks() {
    const g = this.$(".ticks"); if (!this.options) { g.innerHTML = ""; return; }
    g.innerHTML = this.options.map((_, i) => { const a = this._angle(i); return `<line class="tick" data-i="${i}" x1="${(Math.sin(a) * 24).toFixed(2)}" y1="${(-Math.cos(a) * 24).toFixed(2)}" x2="${(Math.sin(a) * 28.5).toFixed(2)}" y2="${(-Math.cos(a) * 28.5).toFixed(2)}"/>`; }).join("");
  }
  /** Paints the dial at a (possibly fractional, mid-glide) value. */
  _draw(v) {
    this._shown = v;
    const a = this._angle(v), ring = this.options ? [18, 21.5] : [18.5, 24];
    const g = arc().innerRadius(ring[0]).outerRadius(ring[1]).cornerRadius(2);
    this.$(".track").setAttribute("d", g({ startAngle: -SWEEP, endAngle: SWEEP }));
    this.$(".val").setAttribute("d", a > -SWEEP + 1e-3 ? g({ startAngle: -SWEEP, endAngle: a }) : "");
    this.$(".ptr").setAttribute("transform", `rotate(${(a * 180) / Math.PI})`);
    this.shadowRoot.querySelectorAll(".tick").forEach((t) => t.classList.toggle("on", Number(t.dataset.i) === Math.round(v)));
    const txt = this._fmt(this._v);
    // a choice reads as words ("wet concrete"), allowed two lines, instead of a truncated slug ("wet-concre…")
    const words = this.options ? String(txt).replace(/[-_]/g, " ") : txt;
    this.$(".v").textContent = words; this.$(".v").classList.toggle("words", !!this.options); this.$(".tip").textContent = words;
    const dial = this.$(".dial");
    dial.setAttribute("aria-valuemin", this.min); dial.setAttribute("aria-valuemax", this.max);
    dial.setAttribute("aria-valuenow", this._v); dial.setAttribute("aria-valuetext", txt);
  }
  _set(v, { animate: glide = false } = {}) {
    v = this._clamp(v);
    const from = this._shown ?? v; this._v = v;
    this._anim?.stop();
    if (!glide || reduced || from === v) { this._draw(v); return; }
    this._anim = animate(from, v, { type: "spring", visualDuration: 0.32, bounce: 0.18, onUpdate: (x) => this._draw(x) });
  }
  /** A user change: set, and fire input (and change) the way webaudio-knob's setValue(v, true) does. */
  _commit(v) {
    const before = this._v; this._set(v, { animate: !!this.options });
    if (this._v === before) return;
    this.dispatchEvent(new Event("input", { bubbles: true }));
    this.dispatchEvent(new Event("change", { bubbles: true }));
  }
  _key(e) {
    const s = this.step || 1, big = this.options ? 1 : Math.max(s, (this.max - this.min) / 10);
    const map = { ArrowUp: s, ArrowRight: s, ArrowDown: -s, ArrowLeft: -s, PageUp: big, PageDown: -big };
    if (e.key in map) this._commit(this._v + map[e.key] * (e.shiftKey && !this.options ? 10 : 1));
    else if (e.key === "Home") this._commit(this.min);
    else if (e.key === "End") this._commit(this.max);
    else return;
    e.preventDefault(); e.stopPropagation();
  }
  _down(e) {
    if (e.button !== 0) return;
    const dial = this.$(".dial");
    dial.focus();
    if (e.ctrlKey || e.metaKey) { this._commit(this.default); return; }
    e.preventDefault();
    dial.setPointerCapture(e.pointerId);
    dial.classList.add("drag");
    let sx = e.pageX, sy = e.pageY, start = this._v, shift = e.shiftKey;
    // choice knobs need a longer throw per detent, or four options flick past under one finger
    const span = this.options ? Math.max(128, this.options.length * 36) : 128;
    const move = (ev) => {
      if (ev.shiftKey !== shift) { shift = ev.shiftKey; sx = ev.pageX; sy = ev.pageY; start = this._v; }
      const offset = sy - ev.pageY + ev.pageX - sx;
      this._commit(start + ((this.max - this.min) * offset) / ((shift ? 4 : 1) * span));
    };
    const up = () => { dial.classList.remove("drag"); dial.removeEventListener("pointermove", move); dial.removeEventListener("pointerup", up); dial.removeEventListener("pointercancel", up); };
    dial.addEventListener("pointermove", move); dial.addEventListener("pointerup", up); dial.addEventListener("pointercancel", up);
  }
}
if (!customElements.get("oasis-knob")) customElements.define("oasis-knob", OasisKnob);
