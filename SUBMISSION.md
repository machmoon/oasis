# Oasis

**Tagline:** Oasis is a registry of sounds written as code. Describe a vibe, get a kit of sounds tuned to it, and one PayPal order pays every creator in it.

## Inspiration

A game needs three hundred footsteps that match, and today it gets three hundred copies of one file. Sound libraries
sell files; the thing a game or a film actually wants is the *sound*, with the surface, the weight, the wetness and
a fresh take every time. And the person who designed that footstep is paid once, when the pack sells, if at all.

We wanted to sell the program, not the file: every sound a small program with typed knobs, rendered at the call site,
licensed per program, with the creator paid from every order that includes it. Then we folded in the Crate idea
(*describe the vibe you're going for and get straight to playing*): one line in, a tuned kit out.

## What it does

**Every sound is a program.** `footstep.mjs` exports `meta`, `params` (surface, weight, pace, wetness, seed) and
`build(knobs, ctx)`, which returns PCM samples from pure math over a seeded PRNG. The same knobs give the same
samples in the server's QuickJS sandbox, in a browser Worker and in a licensed import, and a different seed is a
different take. The sound page shows it: turn a knob, the waveform and spectrogram redraw, a take plays, the import
line updates with the knobs at the call site, and a walk of 300 seeds is 300 different dots on one timeline.

**Describe the vibe, get a kit.** "Rainy cyberpunk alley footsteps and UI clicks." Claude reads the registry and picks
six to ten programs, tunes their knobs to the scene (wet concrete, heavy, seed per part) and names them like a sample
pack. Until the kit is paid for every preview carries a soft watermark tick.

**Pay with PayPal, every part turns clean.** The kit's bill is one PayPal Orders v2 order with an itemised line per
program; a second part on the same program is covered. On capture each creator's share is booked and the kit page
shows every part's module URL and clean WAV. Shares go out through PayPal Payouts after the refund window.

**Agents run the same loop.** Over MCP (`search_assets`, `preview_asset` returns the WAV and a spectrogram,
`make_kit`, `buy_assets`), an agent makes and licenses a kit inside a budget a human approved once in PayPal
(Vault); an order over the budget is refused before PayPal is called. An unlicensed `import` gets HTTP 402 with headers
shaped after x402 v2 (the payment proof is a mandate token, not a signed x402 payment), and a browser import gets a placeholder tick of the real length.

## How we built it

- **The sound contract and DSP kit** (`factory/CONTRACT-SOUND.md`, `public/sound-dsp.js`): RBJ cookbook biquads,
  pink and brown noise from Tone.js's `Noise.ts`, Karplus-Strong as Tone.js's `PluckSynth.ts` builds it, the
  envelope and sweep stages of jsfxr's `sfxr.js`, a Schroeder reverb, and the layering idioms of Farnell's *Designing
  Sound* (a body, a contact layer, air). `Math.random` throws in the sandbox; only the host's two modules resolve.
- **Server renders** (`server/sound.js`, `server/png.js`): WAV, waveform, spectrogram, a catalogue card, measured
  numbers, a per-seed walk (300 takes in 1.4 s on the worker pool), and the preview watermark.
- **The factory** (`factory/factory-sound.mjs`): Claude plans twelve kits (358 briefs), writes each program inside
  the kit's room and a creator's voice, reviews its own renders as pictures, a harness measures the program across
  its knobs and seeds (length, peak, RMS, silence, clipping, every knob's audible effect, waveform correlation
  between seeds, render ms), and an independent grader listens through the pictures. Lessons feed back into the prompt.
- **PayPal** ([PAYPAL.md](PAYPAL.md)): Orders v2 via `@paypal/paypal-server-sdk` with itemised `DIGITAL_GOODS`;
  server-side capture that checks the amount and currency and refunds on a mismatch; `PayPal-Request-Id`
  idempotency; signed webhooks; refunds that revoke licences; Payouts for creator shares; Vault setup tokens for
  agent budgets.

## Proof

- **A real sandbox order for a kit**, created by the kit page's own checkout (`POST /api/kits/:id/checkout`, then
  `/claim`): 97H109249N081403K ($22.00, the Hearthside Tavern kit), captured and split across three creators
  (hollowbody $15.30, stormfront $3.60, quietmachine $0.90). Its Cellar Door Creak part runs the same program as Old
  Door Creak and shows as covered: the program is charged once. An earlier order, 9SS52993P3394003X ($23.00), was
  placed before that rule and charged a repeated program more than once. Both were approved with one of PayPal's
  published sandbox test cards instead of a person in PayPal's window; capture, the amount check and the licences
  are the normal code path.
- 69 tests pass, including the sandbox refusing `Math.random`, imports and over-long renders; determinism; the
  watermark; the CDN gate; and a kit order through checkout, capture and claim.
- The catalogue is growing as the factory runs; `GET /api/config` reports the live count and `/llms.txt` lists every
  sound with its kit and creator.

## Challenges we ran into

- **Grading sound without ears.** The grader sees pictures and numbers. Left to its own verdict it rejected nearly
  everything; the bar is now the scores (every score at least 5, average at least 6.5) on top of a harness that has
  already proven the program renders, every knob matters and seeds differ.
- **Interpreted DSP.** Per-sample loops in QuickJS are 50-100x slower than V8, so the sandbox's clock is 6 s, the
  pool's 8 s, previews render at 22.05 kHz, and free programs render in a browser Worker instead.
- **Autoplay.** Sound needs a gesture, so the hero runs silent until Listen is pressed, then plays every render.

## What we learned

- "Clay until paid" works for sound too: a soft tick on every preview that lifts the moment the order lands says
  "this was paid for" faster than any receipt.
- For agentic commerce the right primitive is not "the agent has a card": the human approves a budget once in PayPal,
  the server enforces it, and every creator is paid from the same order.

## What's next

More kits from more creators, PayPal Commerce Platform multiparty settlement so the split happens at capture, and
stereo and longer loops.
