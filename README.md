# Oasis: sounds as programs, kits from a vibe, every creator paid

**Oasis is a registry of sounds written as code. Every sound is a small program with typed knobs, so one footstep
program is three hundred footsteps that never repeat. Describe a vibe, get a kit of sounds tuned to it, and one
PayPal order pays every creator in it.**

Sell the program, not the file. A footstep has surface, weight, pace, wetness and a seed; a rain bed has intensity,
the surface it falls on and distance; a kick has tune, drop, length and drive. The buyer renders at the call site:

```js
import { play, createSound } from "https://oasis-design.onrender.com/cdn/footstep.mjs?lic=…";
play(audioContext, { surface: "gravel", weight: 0.8, seed: 42 });   // a fresh take, rendered, not resampled
const { samples, sr } = createSound({ surface: "snow", seed: 43 }, 44100);   // Float32Array for your own engine
```

Describe a vibe ("rainy cyberpunk alley footsteps and UI clicks") and Claude picks six to ten programs from the
registry and tunes their knobs to the scene (the Crate idea: *describe the vibe you're going for and get straight to
playing*, devpost.com/software/crate-iphone-duo-mpc). Until the kit is paid for, previews carry a soft watermark tick.
Pay with PayPal and every part plays clean while each creator's share lands, all from one itemised Orders v2 order.

Built for the [PayPal AI Hackathon](https://paypalaihackathon.devpost.com/).
PayPal details: **[PAYPAL.md](PAYPAL.md)** · Write-up: **[SUBMISSION.md](SUBMISSION.md)**

## How it works

| | What happens | PayPal / protocol |
|---|---|---|
| **Approve once** | You pick an amount and expiry at `/#/budget` and approve in PayPal. You hand your agent a token. | PayPal Vault v3: setup token, approval, payment token |
| **The agent shops** | It searches, reads knobs, previews (a WAV and a spectrogram), then buys every sound the scene needs in one `buy_assets` call, or asks `make_kit` for a whole kit. Over budget is refused before PayPal is called. | Orders v2 with `payment_source.paypal.vault_id`, `stored_credential.payment_initiator: MERCHANT`: completed in one call, no redirect |
| **Licensed imports** | One module URL per sound. Without a licence, browsers get a placeholder tick of the real length; other clients get **HTTP 402**. | coinbase/x402 v2 HTTP transport (`PAYMENT-REQUIRED`, `PAYMENT-SIGNATURE`, `PAYMENT-RESPONSE`), scheme `exact`, network `paypal:sandbox`, asset `USD` |
| **Kits** | `/#/kits`: a vibe becomes 6-10 tuned programs priced as one order. Pay with PayPal in PayPal's own window, or license on a funded budget. A kit charges each program once. | Same Orders v2 checkout and capture as everything else; `POST /api/kits/{id}/license` on a mandate |
| **Creators paid** | Each creator's share lands on the live ledger (`/#/ledger`) when PayPal completes; paid out after the 14-day refund window. | PayPal Payouts, verified webhooks, refunds revoke licences (410) |
| **Guardrails** | The budget is server-held: cap, expiry, holds for in-flight orders, revoke = instant stop. | Shaped after AP2's open payment mandate (`payment.budget`, `payment.execution_date`) |

## For agents (MCP)

```bash
claude mcp add --transport http oasis https://oasis-design.onrender.com/mcp
```

`search_assets` · `get_asset` · `preview_asset` (the rendered WAV, a waveform+spectrogram PNG, measured numbers) ·
`buy_assets` · `make_kit` (a vibe becomes a licensed kit) · `get_kit` · `get_budget`

Plain HTTP works too: `POST /api/buy` with `Authorization: Bearer mdt_…`, `POST /api/kits {vibe}`, or answer the
402 on `/cdn/{id}.mjs`. `GET /llms.txt` has the whole surface.

## The sound contract

Every sound is one ES module with `meta` (title, kind, price, creator, nominal duration), `params` (typed knobs:
choice, range, toggle, and a required `seed`) and `build(knobs, ctx)`, which returns PCM samples from pure math over
`ctx`, the DSP kit (`public/sound-dsp.js`: a seeded PRNG, RBJ biquads, pink and brown noise from Tone.js's
`Noise.ts`, Karplus-Strong as Tone.js's `PluckSynth.ts` builds it, the envelope and sweep stages of jsfxr's
`sfxr.js`, and the layering idioms of Farnell's *Designing Sound*). No Web Audio, no `Math.random` (it throws in
the sandbox), so the same knobs give the same samples in the server's QuickJS sandbox, in a browser Worker and in a
licensed import. The contract is `factory/CONTRACT-SOUND.md`; the server runs programs with
`server/sandbox.js renderSound` (two host-registered modules, nothing else importable, 6 s and 48 MB caps) and
serves `render.wav`, `sound.json` (seconds, peak, RMS, centroid, waveform and spectrogram data), `waveform.png`,
`spectrogram.png`, the catalogue card, and a per-seed `walk` (300 takes on one timeline, 1.4 s on the worker pool).

Measured in the sandbox (QuickJS, Apple Silicon): footstep 20-35 ms, UI click 13-17 ms, kick 30 ms, door 50-65 ms,
a 3 s rain bed 280-350 ms at 22.05 kHz. V8 does the same work in a few ms, which is why the sound page renders free
programs in a Worker and only asks the server for paid ones.

## For creators

`/#/publish`: paste or upload a program written to the contract (or start from the Soft Click template), and **Check**
runs it through the server sandbox and the same harness the factory passes (`factory/harness-sound.mjs`: length,
peak, RMS, silence, clipping, every knob audible, seed distinctness, render time), shows the waveform, the
spectrogram and a play button per knob, and only then **Publish** lists it with a title, kind, tags, a price ($0 to
$50) and the PayPal email every sale pays. The flow is `npm publish`'s (`lib/commands/publish.js`: pack with
`dryRun`, show the contents, then send; `server/publish.js` names the files). `/#/creator/<name>` is what the ledger
says a creator earned: every order that paid them, forks of their programs and the royalty those paid, and the
payout email on file, masked. No accounts: a name is taken by publishing, and cannot be re-used with another email.

## The factory

`factory/factory-sound.mjs` plans kits (one Claude call per kit: Rainy City Street, Wooden Tavern, Sci-fi Console,
Forest at Night, Kitchen, Retro Arcade, Office, Car Interior, Medieval Market, Drum Machine, Ocean Harbour, Horror
House; 26-31 parts each, 358 briefs) and builds each part: Claude writes the program from the brief inside the
kit's room and the creator's voice, the sandbox proves it renders, Claude reviews its own renders as pictures with
the numbers, `factory/harness-sound.mjs` measures it across its knob space (length, peak, RMS, silence, clipping,
every knob's audible effect, seed distinctness by waveform correlation, render ms) and sends failures back, and an
independent grader (`factory/grader-sound.mjs`) listens through waveform+spectrogram cards and decides. Survivors
are published to `sounds/` under one of five creators (sandbox PayPal payees); every build is a line in
`factory/stats.jsonl`, and the grader's lessons go into `factory/lessons-sound.md`, which every later build reads.

Two kits were not built by the factory: Instrument (`sounds/inst-*`, 12 playable synth voices by kickdrum) and
Interface (`sounds/iface-*`, 12 dry UI sounds by quietmachine) were hand-written by a Claude Code agent against the
same contract and pass the same harness. Each says so in its header and names the open-source synth it follows
(STK, Open303, Tone.js, jsfxr) in `meta.credit`; they have no lines in `factory/stats.jsonl`.

## Run it

```bash
npm ci
cp .env.example .env   # PayPal sandbox client id/secret, Anthropic key (kits and the factory)
npm start              # http://localhost:8787
npm test               # 69 tests: commerce, mandates, the sandbox, sound renders, the kit order
node factory/factory-sound.mjs run 4        # build the planned briefs on 4 lanes
node factory/harness-sound.mjs sounds       # measure every published sound
node scripts/kit-license-sandbox.mjs http://localhost:8787 <kitId>   # license a kit through a real sandbox order
```

The 3D kit and the brand-film Studio from the earlier build stay reachable at `/#/kit` and `/#/studio` and in the
code (`server/film.js`, `public/studio.js`); they are off the nav and out of the pitch.
