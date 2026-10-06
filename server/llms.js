import { config } from "./config.js";
import * as catalog from "./catalog.js";

export function llmsTxt() {
  const b = config.baseUrl;
  const sounds = catalog.allAssets().filter((a) => a.format === "sound");
  const creators = [...new Set(sounds.map((a) => a.author))];
  const kits = [...new Set(sounds.map((a) => a.worldKit).filter(Boolean))];
  return `# Oasis

> A registry of sounds written as code. Every sound is a small program with typed knobs (material, weight, wetness,
> pitch, a seed): you render it at the call site instead of downloading a file, so one footstep program is 300
> footsteps that never repeat. A human approves one PayPal budget; you (the agent) license every sound you import
> inside it, and each creator's share is booked.

Registry: ${sounds.length} sound programs from ${creators.length} creators in ${kits.length} kits (${kits.slice(0, 6).join(", ")}${kits.length > 6 ? ", ..." : ""}). PayPal sandbox.

## The flow

1. The human opens ${b}/#/budget, picks an amount and approves once in PayPal. They give you a token (mdt_...).
2. You search, read knobs, preview (a WAV and a spectrogram), then buy every sound the scene needs in ONE buy_assets
   call, or ask make_kit for a whole kit from a vibe. Oasis charges the human's saved PayPal wallet (PayPal Vault,
   no redirect) and refuses anything over the budget.
3. You get one module URL per sound. In the page or engine:
     import { play, createSound } from "<module url>";
     play(audioContext, { surface: "gravel", weight: 0.7, seed: 42 });   // renders and plays a fresh take
     const { samples, sr } = createSound({ seed: 43 }, 44100);         // Float32Array for your own engine
4. Not licensed? A browser import still loads, as a placeholder tick of the real length. Previews carry a soft watermark.

## MCP (Streamable HTTP)

POST ${b}/mcp      Claude Code: claude mcp add --transport http oasis ${b}/mcp
search_assets {query, kind?, max_price?}    sounds with price, creator, kit, length, knob names
get_asset {asset_id}                        knob schema, how to import
preview_asset {asset_id, knobs}             the rendered WAV, a waveform+spectrogram PNG, measured numbers
buy_assets {items:[{asset_id,knobs}], mandate, agent_name}   one PayPal order, module URLs back
make_kit {vibe, mandate?, agent_name?}      6-10 sounds chosen and knob-tuned to a vibe, priced as one order; licensed at once with a mandate
get_kit {kit_id}                            parts, bill, licence, module and WAV URLs
get_budget {mandate}                        spent, left, expiry, every order

## HTTP

POST ${b}/api/buy   Authorization: Bearer mdt_...   {items:[{asset_id,knobs}], agent_name}
POST ${b}/api/kits {vibe}                      a kit (JSON); POST ${b}/api/kits/{id}/license {mandate}
GET  ${b}/api/assets/{id}/render.wav?p={json}  a render (22.05 kHz mono; add &sr=44100); paid sounds watermarked until licensed
GET  ${b}/api/assets/{id}/sound.json?p={json}  seconds, peak, rms, centroid, waveform and spectrogram data
GET  ${b}/api/assets/{id}/render.png           waveform over spectrogram
POST ${b}/api/sounds/{id}/walk {count, gap, knobs}   N takes (one per seed) laid along a timeline, one WAV
GET  ${b}/cdn/{id}.mjs   no licence: HTTP 402, x402 v2 shape. PAYMENT-REQUIRED header (base64 JSON):
     {x402Version:2, resource, accepts:[{scheme:"exact", network:"paypal:sandbox", asset:"USD", amount:"<cents>", payTo:"<creator>"}]}
     Retry with PAYMENT-SIGNATURE: base64 {x402Version:2, accepted:<that requirement>, payload:{mandate:"mdt_..."}}
     -> 200 module + PAYMENT-RESPONSE {success, transaction:<PayPal order id>, network, payer}
GET  ${b}/cdn/{id}.mjs?lic={licence}   the licensed module
GET  ${b}/api/sales      recent agent purchases and what each creator earned

## The sound contract (factory/CONTRACT-SOUND.md)

export const meta = { title, kind: "sfx"|"ambience"|"ui"|"impact"|"foley"|"music-loop", format: "sound", duration, price, author, tags }
export const params = { knobs: { ...typed knobs, seed } }
export function build(knobs, ctx) -> { samples: Float32Array }   pure math over ctx (seeded rng, filters, oscillators), ctx.sr samples/s

## Sounds

${sounds.map((a) => `${a.id}  ${a.title}  ${a.kind}  $${a.price}  by ${a.author}  ${a.worldKit || ""}  ${a.duration}s`).join("\n")}
`;
}
