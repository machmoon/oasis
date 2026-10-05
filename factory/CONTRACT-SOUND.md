## The Oasis sound contract

A sound is ONE self-contained ES module that describes a sound as a program, not a file. It runs in a QuickJS
sandbox: no imports, no DOM, no fetch, no timers, no Web Audio, and **no Math.random** (it throws; derive every
variation from the `seed` knob through `ctx.rng`). The same knobs must give the same samples in the sandbox, in
a browser Worker and in a licensed import, so build() is pure math over the `ctx` kit it is handed.

It exports exactly three things:

```js
export const meta = {
  title: "Human Title",              // 2-4 words, evocative ("Gravel Step", not "Footstep Generator")
  kind: "sfx" | "ambience" | "ui" | "impact" | "foley" | "music-loop",
  format: "sound",
  description: "One sentence: what it sounds like and what a game or film would use it for.",
  tags: ["6-8", "lowercase", "search", "terms"],
  price: 0,                          // USD for a commercial licence; 0 = free. Typical 1-6.
  author: "oasis-factory",
  duration: 0.5,                     // nominal seconds of one render (0.05-4). Ambiences and loops: 2-4 s.
};

export const params = {
  knobs: {
    // name: { type, label, default, ... }   Order: choices first, then ranges, then toggles, seed last.
    // type "choice": default, options: [strings]          the material, the size class, the style
    // type "range":  default, min, max, step (numbers)    0..1 for amounts (weight, wetness, brightness), Hz, seconds
    // type "toggle": default true/false                   an extra layer (reverb tail, a second hit)
    // seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 }   REQUIRED: a different seed
    //       is a different take of the same sound, so a game can ask for 300 footsteps that never repeat.
  },
};

/** Returns { samples: Float32Array } mono, -1..1, at ctx.sr samples per second. */
export function build(p, ctx) { ... }
```

`ctx` is the DSP kit (public/sound-dsp.js), plus `ctx.sr` (22050 for previews, 44100 for licensed renders; use
`ctx.sr` everywhere, never a literal rate):

- `rng(seed)` seeded PRNG; `between(r, lo, hi)`; `clamp`; `seconds(s, sr)` sample count; `db(dB)` gain; `TAU`
- sources: `noise(r, n)`, `pink(r, n)`, `brown(r, n)`, `osc(shape, freqOrFn, n, sr, {duty, phase})` with shape
  "sine" | "tri" | "saw" | "square" and a sweep when freq is `(t, i) => Hz`, `ring(modes, dur, decay, sr, amp)` for
  struck bodies (modes `[[Hz, amp], ...]`), `pluck(r, freq, dur, sr, {damp, loss})` Karplus-Strong
- envelopes: `env(n, attack, decay, sr)` exponential decay; `adsr(n, {attack, sustain, decay, punch}, sr)`;
  `burst(r, dur, type, f0, Q, attack, decay, sr)` a filtered noise grain
- filters: `biquad("lp"|"hp"|"bp"|"notch", f0, Q, sr)` returns a per-sample function; `onepole(sr)` returns
  `(x, f0) => y` for a cutoff that moves; `filter(buf, fn)` runs a buffer through one
- combining: `mix(out, src, atSeconds, gain, sr)`, `gain(buf, g)`, `multiply(buf, envelope)`,
  `fade(buf, ms, sr)`, `reverb(buf, {size, decay, mixAmt}, sr)`, `finish(buf, peak, drive)` normalise + soft ceiling

Rules that make a sound sell:
- 4-7 knobs a sound designer actually reaches for: the material or size class as a choice, two or three 0..1
  amounts (weight, brightness, wetness, distance, intensity), maybe a pitch or rate, a tail toggle, and the seed.
  Every knob must audibly change the render (a harness measures RMS, spectral centroid and the waveform across
  each knob's extremes and rejects dead knobs). Every combination must still sound intentional.
- Layer the way Farnell's Designing Sound does: a body (modes or a thump), a contact or texture layer (filtered
  noise grains), an air or tail layer (reverb, a decaying wash). Give transients a real attack (0.3-5 ms), not an
  instant edge, and let every sound end in silence (call `fade`), never on a click.
- Seeds must matter: the grain timing, the exact mode detune, the gust shape should come from `rng(p.seed)`.
  Two seeds of the same knobs must differ audibly but belong to the same sound.
- Level: peak between 0.5 and 0.95 after `finish`, no clipping, RMS above 0.02, and no more than 60 % of the
  buffer near-silent (ambiences: under 5 %). Ambiences and loops must loop: fade 10-20 ms at both ends.
- Keep the module under ~120 lines and the render under 1 s of CPU in an interpreter: at most a few thousand
  grains, no per-sample `Math.pow` where a multiply will do, no sample rates above `ctx.sr`.
- No comments explaining the contract; a one-line header comment saying what the sound is and how it is layered.
