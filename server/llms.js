import { config } from "./config.js";
import * as catalog from "./catalog.js";

export function llmsTxt() {
  const b = config.baseUrl;
  const pieces = catalog.allAssets().filter((a) => a.format === "blocks");
  const creators = [...new Set(pieces.map((a) => a.author))];
  return `# Oasis

> A registry of 3D assets written as code, for three.js scenes. A human approves one PayPal budget; you (the agent)
> license every piece you import inside it, and each creator is paid. Knobs rebuild a model; they don't stretch it.

Registry: ${pieces.length} pieces from ${creators.length} creators, one 6 m grid, one palette. PayPal sandbox.

## The flow

1. The human opens ${b}/#/budget, picks an amount and approves once in PayPal. They give you a token (mdt_...).
2. You search, read knobs, preview, then buy every piece the scene needs in ONE buy_assets call.
   Oasis charges the human's saved PayPal wallet (PayPal Vault, no redirect) and refuses anything over the budget.
3. You get one module URL per piece. In the scene:
     import { createAsset } from "<module url>";
     scene.add(createAsset({ floors: 6 }));   // metres, y up, front faces -z, footprint starts at x=0,z=0
   The page needs an import map for "three" and "three/addons/" (three@0.170).
4. Not licensed? A browser import still loads, as a grey placeholder with the real footprint.

## MCP (Streamable HTTP)

POST ${b}/mcp      Claude Code: claude mcp add --transport http oasis ${b}/mcp
search_assets {query, max_price?}          3D pieces with price, creator, footprint, knob names
get_asset {asset_id}                        knob schema, presets, footprint, how to import
preview_asset {asset_id, knobs}             PNG of the rebuilt model
buy_assets {items:[{asset_id,knobs}], mandate, agent_name}   one PayPal order, module URLs back
get_budget {mandate}                        spent, left, expiry, every order
make_film {brief, mandate?, agent_name?}    a 10-20 s MP4 shot in a street of kit pieces, dressed with 2D signs; one order licenses it all
get_film {film_id}                          bill, licence, render progress, MP4 URL

## Studio (films)

${b}/#/studio   describe a film; Oasis builds the set, dresses it with 2D signs, cuts the shots, renders the MP4.
POST ${b}/api/films {brief}   ->  film JSON (shots, signs, bill)      POST ${b}/api/films/{id}/license {mandate}
POST ${b}/api/films/{id}/render   then GET ${b}/api/films/{id}  until render.status = done  ->  ${b}/api/films/{id}/film.mp4

## HTTP

POST ${b}/api/buy   Authorization: Bearer mdt_...   {items:[{asset_id,knobs}], agent_name}
GET  ${b}/cdn/{id}.mjs   no licence: HTTP 402, x402 v2 shape. PAYMENT-REQUIRED header (base64 JSON):
     {x402Version:2, resource, accepts:[{scheme:"exact", network:"paypal:sandbox", asset:"USD", amount:"<cents>", payTo:"<creator>"}]}
     Retry with PAYMENT-SIGNATURE: base64 {x402Version:2, accepted:<that requirement>, payload:{mandate:"mdt_..."}}
     -> 200 module + PAYMENT-RESPONSE {success, transaction:<PayPal order id>, network, payer}
GET  ${b}/cdn/{id}.mjs?lic={licence}   the licensed module
GET  ${b}/api/assets/{id}/parts.json?p={json}   raw parts (box, gable, cyl, cone) in metres
GET  ${b}/api/sales      recent agent purchases and what each creator earned

## Pieces

${pieces.map((a) => `${a.id}  ${a.title}  $${a.price}  by ${a.author}  ${a.footprint ? a.footprint.join("x") + " m" : ""}`).join("\n")}
`;
}
