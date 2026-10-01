import { config } from "./config.js";
import * as catalog from "./catalog.js";

export function llmsTxt() {
  const b = config.baseUrl;
  const kinds = {};
  for (const a of catalog.allAssets()) kinds[a.kind] = (kinds[a.kind] || 0) + 1;
  return `# Oasis

> Design assets you can reshape. Every icon set, illustration, UI component, mockup, poster, pattern and
> brand mark on Oasis is a small program with typed knobs. Remix it, then license the exact remix with PayPal.

Catalogue: ${catalog.allAssets().length} assets (${Object.entries(kinds).map(([k, n]) => `${n} ${k}`).join(", ")}).

## For agents

MCP (Streamable HTTP, no key to browse): POST ${b}/mcp
Tools: search_assets, get_asset, remix_asset, create_order, get_order.
Flow: search -> get_asset (knob schema) -> remix_asset (see the render) -> create_order -> give the human
approve_url -> they pay in PayPal -> get_order returns download links (SVG, PNG, React, source program).

Claude Code: claude mcp add --transport http oasis ${b}/mcp

## REST

GET  ${b}/api/assets?q=pricing&kind=ui&free=1
GET  ${b}/api/assets/{id}                      knobs, presets, lineage
GET  ${b}/api/assets/{id}/render.svg?p={json}  remix preview (paid assets watermarked)
GET  ${b}/api/assets/{id}/download.{svg|png|jsx|css|mjs|json}?p={json}   free assets only
POST ${b}/api/orders {items:[{assetId,knobs}]}  -> PayPal order
POST ${b}/api/orders/{id}/capture

## Knobs

type: color (#RRGGBB) | range (min,max,step) | choice (options) | toggle | text
presets: named colourways, pass ?preset=Name or {"preset":"Name"}
`;
}
