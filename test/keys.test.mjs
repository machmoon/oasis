// The on-screen keyboard's pure half (public/keys-core.js): which notes a voice plays, where the keys sit, the
// computer-keyboard row, and the cache key a rendered note lives under. Every sounds/inst-* voice is checked.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { midiOf, nameOf, noteKnob, playableNotes, keyRange, layout, QWERTY, baseFor, cacheKey } from "../public/keys-core.js";

test("note names round-trip through MIDI", () => {
  assert.equal(midiOf("C4"), 60);
  assert.equal(midiOf("A4"), 69);
  assert.equal(midiOf("F#3"), 54);
  assert.equal(midiOf("Bb2"), 46);
  assert.equal(midiOf("H2"), null);
  for (let m = 21; m <= 108; m++) assert.equal(midiOf(nameOf(m)), m);
});

test("the playable notes are the note knob's options, low to high", () => {
  const knobs = { note: { type: "choice", options: ["C2", "D2", "E2", "G2", "A2", "C3", "A1"] }, cutoff: { type: "range" } };
  assert.equal(noteKnob(knobs), "note");
  assert.deepEqual(playableNotes(knobs).map((n) => n.name), ["A1", "C2", "D2", "E2", "G2", "A2", "C3"]);
  assert.deepEqual(keyRange(playableNotes(knobs)), { lo: 24, hi: 48 });
  assert.equal(baseFor(playableNotes(knobs)), 24);
  // a choice knob that is not notes, or no note knob at all, gives no keyboard
  assert.equal(noteKnob({ note: { type: "choice", options: ["soft", "hard"] } }), null);
  assert.deepEqual(playableNotes({ cutoff: { type: "range" } }), []);
});

test("every Instrument voice has a note knob, and every note lands on a key the QWERTY row can reach", async () => {
  const files = fs.readdirSync(new URL("../sounds/", import.meta.url)).filter((f) => f.startsWith("inst-"));
  assert.ok(files.length >= 12);
  for (const f of files) {
    const { params } = await import(new URL(`../sounds/${f}`, import.meta.url));
    const notes = playableNotes(params.knobs);
    assert.ok(notes.length >= 5, `${f} has notes`);
    const { lo, hi } = keyRange(notes);
    const keys = layout(lo, hi).keys.map((k) => k.midi);
    for (const n of notes) assert.ok(keys.includes(n.midi), `${f}: ${n.name} is drawn`);
    // with the row starting at the lowest note's C, Z/X octave shifts reach every note
    const base = baseFor(notes), span = Math.max(...Object.values(QWERTY));
    for (const n of notes) assert.ok(n.midi >= base && (n.midi - base) % 12 <= span, `${f}: ${n.name} is reachable`);
  }
});

test("the keybed is a real piano: 7 white units an octave, black keys 7/12 wide between them", () => {
  const { keys, width } = layout(60, 71);
  assert.equal(width, 7);
  assert.equal(keys.length, 12);
  assert.deepEqual(keys.filter((k) => k.black).map((k) => k.name), ["C#4", "D#4", "F#4", "G#4", "A#4"]);
  const cs = keys.find((k) => k.name === "C#4");
  assert.ok(Math.abs(cs.x - 7 / 12) < 1e-9 && Math.abs(cs.w - 7 / 12) < 1e-9);
  assert.equal(keys.find((k) => k.name === "B4").x, 6);
});

test("the cache key ignores the note knob's own value and the order of the other knobs", () => {
  const a = cacheKey({ note: "C3", cutoff: 0.5, seed: 1 }, "note", "E3");
  const b = cacheKey({ seed: 1, cutoff: 0.5, note: "G3" }, "note", "E3");
  assert.equal(a, b);
  assert.notEqual(a, cacheKey({ note: "C3", cutoff: 0.6, seed: 1 }, "note", "E3"));
  assert.notEqual(a, cacheKey({ note: "C3", cutoff: 0.5, seed: 1 }, "note", "G3"));
});
