// The pure half of the on-screen keyboard (public/keys.js): note names, which notes a program can play, where each
// key sits on a piano, the computer-keyboard map, and the cache key a rendered note is stored under. No DOM and no
// audio here, so test/keys.test.mjs can import it under node.
//
// Prior art, read in source:
// - Geometry is g200kg/webaudio-controls (webaudio-controls.js, class WebAudioKeyboard, Apache-2.0), the same file
//   public/knob.js ports: white keys are one unit wide and an octave is 7 units; black keys are 7/12 wide and sit at
//   kp = [0, 7/12, 1, 3*7/12, 2, 3, 6*7/12, 4, 8*7/12, 5, 10*7/12, 6] (the left edge of each semitone of the octave),
//   so the twelve semitones divide the octave evenly the way a real keybed's top does. Its range is min..max MIDI.
// - The computer keyboard is the tracker/DAW row: Ableton Live's Computer MIDI Keyboard and stuartmemo/qwerty-hancock
//   (src/constants.ts DEFAULT_KEY_MAP: a w s e d f t g y h u j = C..B, then k o l p ; ' = C..F an octave up).
//   Deviation, on purpose: qwerty-hancock matches event.key (and aliases z for QWERTZ); we match event.code, the
//   physical key, so AZERTY and QWERTZ players get the same row Ableton gives them. Z and X shift the octave, as
//   Ableton does (qwerty-hancock has keyOctave/keyPressOffset settings for the same thing).

const PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const KP = [0, 7 / 12, 1, (3 * 7) / 12, 2, 3, (6 * 7) / 12, 4, (8 * 7) / 12, 5, (10 * 7) / 12, 6];
const BLACK = new Set([1, 3, 6, 8, 10]);

/** "C4" -> 60, "F#3" -> 54, "Bb2" -> 46 (MIDI, C4 = 60, the convention the inst-* programs use). null if not a note. */
export function midiOf(name) {
  const m = /^([A-Ga-g])([#b]?)(-?\d)$/.exec(String(name ?? "").trim());
  if (!m) return null;
  return PC[m[1].toUpperCase()] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0) + 12 * (Number(m[3]) + 1);
}
/** 60 -> "C4" (sharps, as qwerty-hancock's NOTE_NAMES spell them). */
export const nameOf = (midi) => `${NAMES[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`;
export const isBlack = (midi) => BLACK.has(((midi % 12) + 12) % 12);

/** The program's note knob: a choice knob named "note" (or labelled Note) whose every option is a note name. */
export function noteKnob(knobs = {}) {
  const pick = Object.entries(knobs).find(([k, d]) => d?.type === "choice" && (k === "note" || /^note$/i.test(d.label || "")));
  if (!pick) return null;
  const [name, d] = pick;
  if (!Array.isArray(d.options) || !d.options.length || d.options.some((o) => midiOf(o) === null)) return null;
  return name;
}

/** The notes a program can play, low to high, as { name, midi }: the note knob's options, deduplicated. */
export function playableNotes(knobs = {}) {
  const k = noteKnob(knobs);
  if (!k) return [];
  const seen = new Map();
  for (const name of knobs[k].options) { const midi = midiOf(name); if (!seen.has(midi)) seen.set(midi, { name, midi }); }
  return [...seen.values()].sort((a, b) => a.midi - b.midi);
}

/** The keybed to draw: from the C at or below the lowest note to the highest note (out to a white key), like
 * webaudio-keyboard's min/max, and never less than one octave so a short range still reads as a piano. */
export function keyRange(notes) {
  if (!notes.length) return null;
  const lo = Math.floor(notes[0].midi / 12) * 12;
  let hi = Math.max(notes.at(-1).midi, lo + 11);
  if (isBlack(hi)) hi += 1;
  return { lo, hi };
}

/** Every key from lo to hi with its place in white-key units: { midi, name, black, x, w }, plus the bed's width. */
export function layout(lo, hi) {
  const at = (m) => 7 * Math.floor(m / 12) + KP[((m % 12) + 12) % 12];
  const x0 = at(lo);
  const keys = [];
  for (let m = lo; m <= hi; m++) {
    const black = isBlack(m);
    keys.push({ midi: m, name: nameOf(m), black, x: at(m) - x0, w: black ? 7 / 12 : 1 });
  }
  const width = keys.filter((k) => !k.black).length;
  return { keys, width };
}

/** event.code -> semitones above the base C (Ableton's row; qwerty-hancock DEFAULT_KEY_MAP by position). */
export const QWERTY = {
  KeyA: 0, KeyW: 1, KeyS: 2, KeyE: 3, KeyD: 4, KeyF: 5, KeyT: 6, KeyG: 7, KeyY: 8, KeyH: 9, KeyU: 10, KeyJ: 11,
  KeyK: 12, KeyO: 13, KeyL: 14, KeyP: 15, Semicolon: 16, Quote: 17,
};
/** The letter printed on a key, for the visible hint. */
export const QWERTY_LABEL = Object.fromEntries(Object.keys(QWERTY).map((c) => [c, c === "Semicolon" ? ";" : c === "Quote" ? "'" : c.slice(3).toLowerCase()]));

/** The C the A key plays: the octave of the lowest playable note, so the row starts on something you can hear. */
export const baseFor = (notes) => (notes.length ? Math.floor(notes[0].midi / 12) * 12 : 48);

/** The cache key of one rendered note: every other knob's value, in a stable order, then the note. Two knob states
 * that differ only in key order (or in the note knob's own value) share their renders. */
export function cacheKey(values, noteName, note) {
  const rest = Object.keys(values || {}).filter((k) => k !== noteName).sort().map((k) => [k, values[k]]);
  return `${JSON.stringify(rest)}|${note}`;
}
