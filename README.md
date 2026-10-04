# Oasis: brief in, brand film out, every creator paid

**Oasis turns a one-line brief into a brand film built from creators' 3D and 2D assets, and one PayPal order pays
every creator in it.**

Type "a 15-second teaser for Momiji Ramen on a Kyoto market street at dusk". Oasis builds the street from creators'
parametric 3D pieces, hangs 2D design assets on it as signs in the brand's colours, and cuts the film like an editor:
speed ramps, a whip pan with motion blur, a glitch cut, the brand's name slamming into the street as a 3D title, dusk
turning to night. Until it is paid for, the whole street is clay. Pay with PayPal, and the colour sweeps through the
street while each creator's payout lands, all from one itemised Orders v2 order.

Built for the [PayPal AI Hackathon](https://paypalaihackathon.devpost.com/).
Live: **https://oasis-design.onrender.com** · Studio: **[/#/studio](https://oasis-design.onrender.com/#/studio)** ·
PayPal details: **[PAYPAL.md](PAYPAL.md)** · Write-up: **[SUBMISSION.md](SUBMISSION.md)**

Under the films is a registry of 3D assets written as code, and agents can buy from it too: approve one PayPal budget,
and your agent (Claude Code, Cursor, anything that speaks MCP) licenses every piece it imports inside that budget.

```js
import { createAsset } from "https://oasis-design.onrender.com/cdn/town-shop.mjs?lic=…";
scene.add(createAsset({ floors: 3, awning: "#2F7A55" }));   // a program: knobs rebuild it, they don't stretch it
```

## How it works

| | What happens | PayPal / protocol |
|---|---|---|
| **Approve once** | You pick an amount and expiry at `/#/budget` and approve in PayPal. You hand your agent a token. | PayPal Vault v3: setup token, approval, payment token |
| **The agent shops** | It searches, reads knobs, previews, then buys the whole scene in one `buy_assets` call. Over budget is refused before PayPal is called. | Orders v2 with `payment_source.paypal.vault_id`, `stored_credential.payment_initiator: MERCHANT`: completed in one call, no redirect |
| **Licensed imports** | One module URL per piece. Without a licence, browsers get a grey placeholder of the real size; other clients get **HTTP 402**. | coinbase/x402 v2 HTTP transport (`PAYMENT-REQUIRED`, `PAYMENT-SIGNATURE`, `PAYMENT-RESPONSE`), scheme `exact`, network `paypal:sandbox`, asset `USD` |
| **Creators paid** | Each creator's share lands on the live ledger (`/#/ledger`) when PayPal completes; paid out after the 14-day refund window. | PayPal Payouts, verified webhooks, refunds revoke licences (410) |
| **The studio** | Describe a film at `/#/studio`. Oasis builds a street from the kit, hangs 2D design assets on it as signs in your brand, cuts the camera moves and renders a 1280x720 MP4. One order licenses every piece, sign and card. | Same funded budget, one `POST /api/films/{id}/license`; unlicensed films render paid pieces grey and signs watermarked |
| **Guardrails** | The budget is server-held: cap, expiry, holds for in-flight orders, revoke = instant stop. | Shaped after AP2's open payment mandate (`payment.budget`, `payment.execution_date`) |

## For agents (MCP)

```bash
claude mcp add --transport http oasis https://oasis-design.onrender.com/mcp
```

`search_assets` · `get_asset` · `preview_asset` (PNG of the rebuilt model) · `buy_assets` · `get_budget` · `make_film` (a short film from a brief, licensed inside the budget) · `get_film`

Plain HTTP works too: `POST /api/buy` with `Authorization: Bearer mdt_…`, or answer the 402 on `/cdn/{id}.mjs`.

## The asset format

Every piece is an ES module with `meta`, `params` (typed knobs) and `build(knobs)`, which returns boxes, gables,
cylinders and cones in metres (y up, front faces −z, one 6 m grid). The server runs it in a QuickJS sandbox for
previews; the buyer's page runs the same program through a shared three.js runtime (`public/blocks-runtime.js`), so
the import is exactly the model that was previewed. Many pieces were written by an agent factory and accepted only
after a separate grader looked at renders from several angles and at night (`factory/`).

## The studio

A film is a program too: `server/film.js` plans it (the street, the signs, the shots), Claude can redirect it through one
typed `write_film` call that the server validates, and `public/film-player.js` draws frame N from the film alone. The
The set is alive (the tram runs, cars drive, dusk fades into night inside a shot), weather falls by theme, and the
soundtrack is synthesised from the film's seed (`server/film-music.js`: Karplus-Strong plucks over a pad) and muxed in.
Formats: 16:9, 9:16 and 1:1 from the same cut. The server renders the way Remotion does (`remotion-dev/remotion`, `packages/renderer/src/render-frames.ts`): headless
Chromium seeks every frame on `/film.html`, ffmpeg stitches them (`server/film-render.js`). Without Playwright or
ffmpeg the studio still plays the film live and exports a WebM from the browser.

## Run it

```bash
npm ci
cp .env.example .env   # PayPal sandbox client id/secret, Anthropic key (factory only)
npm start              # http://localhost:8787
npx playwright install chromium   # optional: server-side MP4 rendering (ffmpeg on PATH)
npm test
```

The sandbox app needs **Vault** enabled (Save payment methods) for budgets. `scripts/` has the sandbox end-to-end run
and the numbers used in the story.

## Honest notes

Everything runs on the PayPal sandbox. The creator accounts are sandbox accounts, and the kit pieces were made by
Oasis's own agent factory. MIT licensed.
