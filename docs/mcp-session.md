# An outside agent on Oasis over MCP

Recorded 2026-10-02T06:44:54.957Z by `scripts/mcp-agent.mjs` against `https://oasis-design.onrender.com/mcp`.
The agent is Claude (claude-opus-5-5) with no Oasis code: only the tools the MCP server lists (`search_assets`, `get_asset`, `remix_asset`, `create_order`, `get_mandate`, `get_order`).

**The human issued** mandate `mnd_115c67161c9d` ($8, 1 hour) and pasted its token into the brief.

**Brief:** I'm launching Lumen, a reading app. Brand: ink #1B1F3B, paper #F7F3EA, amber #F2A541. Find me an app icon and a pricing card in that brand, then open a PayPal order for both. I've given you a $8 budget: mandate token mdt_….

**→ `search_assets`** `{"query":"app icon"}`

**←** `[ { "asset_id": "app-icon", "title": "Squircle App Icon", "kind": "icons", "price_usd": 5, "description": "A polished iOS-style app icon with six crafted glyphs, gradient body, gloss and depth, for app mockups, store listings and pitch decks.", "tags": [ "app icon", "ios", "squircle", "icon", "gradient", "mobile", "glyph", "branding" ], "author": "oasis-factory", "forked_from": null, "presets": [ "Lagoon", "Sunset", "Grove", "Midnight" ] }, { "asset_id": "line-icons", "title": "Oasis Line Icons"`

**→ `search_assets`** `{"query":"pricing card"}`

**←** `[ { "asset_id": "pricing-card", "title": "Pricing Plan Card", "kind": "ui", "price_usd": 5, "description": "A polished SaaS pricing card with feature checklist, CTA and ribbon, for landing pages, pitch decks and UI mockups.", "tags": [ "pricing", "pricing card", "saas", "ui", "plan", "subscription", "landing page", "component" ], "author": "oasis-factory", "forked_from": null, "presets": [ "Indigo", "Emerald", "Coral", "Midnight" ] }, { "asset_id": "stat-card", "title": "Pulse Stat Card", "kind"`

**→ `get_mandate`** `{"mandate":"mdt_…"}`

**←** `{ "id": "mnd_115c67161c9d", "natural_language_description": "App icon and pricing card for Lumen", "skus": null, "user_cart_confirmation_required": true, "intent_expiry": "2026-10-02T07:44:54.725Z", "expired": false, "budget_usd": 8, "remaining_usd": 8, "orders": [] }`

**→ `get_asset`** `{"asset_id":"app-icon"}`

**←** `{ "asset_id": "app-icon", "title": "Squircle App Icon", "kind": "icons", "price_usd": 5, "description": "A polished iOS-style app icon with six crafted glyphs, gradient body, gloss and depth, for app mockups, store listings and pitch decks.", "author": "oasis-factory", "knobs": { "top": { "type": "color", "role": "secondary", "label": "Gradient top", "default": "#3EC6FF" }, "bottom": { "type": "color", "role": "primary", "label": "Gradient bottom", "default": "#2B5BFF" }, "ink": { "type": "color`

**→ `get_asset`** `{"asset_id":"pricing-card"}`

**←** `{ "asset_id": "pricing-card", "title": "Pricing Plan Card", "kind": "ui", "price_usd": 5, "description": "A polished SaaS pricing card with feature checklist, CTA and ribbon, for landing pages, pitch decks and UI mockups.", "author": "oasis-factory", "knobs": { "accent": { "type": "color", "role": "primary", "label": "Accent", "default": "#5B5CF0" }, "backdrop": { "type": "color", "role": "background", "label": "Backdrop", "default": "#ECEEF6" }, "theme": { "type": "choice", "label": "Theme", "d`

**→ `get_asset`** `{"asset_id":"line-icons"}`

**←** `{ "asset_id": "line-icons", "title": "Oasis Line Icons", "kind": "icons", "price_usd": 0, "description": "24 crisp line icons with brand-tunable stroke, style and containers. Show one or the whole sheet.", "author": "oasis", "knobs": { "icon": { "type": "choice", "label": "Icon", "default": "palette", "options": [ "house", "search", "heart", "star", "bell", "camera", "palette", "brush", "sparkles", "cloud", "sun", "moon", "leaf", "coffee", "music", "map-pin", "shopping-bag", "user", "settings", `

**→ `remix_asset`** `{"asset_id":"line-icons","knobs":{"icon":"sun","layout":"single","color":"#1B1F3B","accent":"#F2A541","background":"#F7F3EA","style":"duotone","container":"squircle","stroke":2.25}}`

**←** `{"asset_id":"line-icons","knobs":{"icon":"sun","layout":"single","color":"#1B1F3B","accent":"#F2A541","background":"#F7F3EA","stroke":2.25,"style":"duotone","container":"squircle","linecap":"round"},"price_usd":0,"preview_url":"https://oasis-design.onrender.com/api/assets/line-icons/render.svg?p=%7B%22icon%22%3A%22sun%22%2C%22layout%22%3A%22single%22%2C%22color%22%3A%22%231B1F3B%22%2C%22accent%22%3A%22%23F2A541%22%2C%22background%22%3A%22%23F7F3EA%22%2C%22stroke%22%3A2.25%7D"}` (+1 render)

**→ `remix_asset`** `{"asset_id":"pricing-card","knobs":{"accent":"#F2A541","backdrop":"#F7F3EA","theme":"light","plan":"Lumen Plus","price":"$6","period":"month","button":"solid","popular":true}}`

**←** `{"asset_id":"pricing-card","knobs":{"accent":"#F2A541","backdrop":"#F7F3EA","theme":"light","period":"month","button":"solid","plan":"Lumen Plus","price":"$6","features":5,"radius":20,"popular":true},"price_usd":5,"preview_url":"https://oasis-design.onrender.com/api/assets/pricing-card/render.svg?p=%7B%22accent%22%3A%22%23F2A541%22%2C%22backdrop%22%3A%22%23F7F3EA%22%2C%22plan%22%3A%22Lumen%20Plus%22%2C%22price%22%3A%22%246%22%7D"}` (+1 render)

**→ `create_order`** `{"mandate":"mdt_…","agent_name":"Lumen shopping agent","max_total_usd":8,"items":[{"asset_id":"line-icons","knobs":{"icon":"sun","layout":"single","color":"#1B1F3B","accent":"#F2A541","background":"#F7F3EA","stroke":2.25,"style":"duotone","container":"squircle","linecap":"round"}},{"asset_id":"pricing-card","knobs":{"accent":"#F2A541","backdrop":"#F7F3EA","theme":"light","period":"month","button":`

**✖ error:** `PayPal sandbox credentials are not configured (PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET).`

**Agent:** I made both designs, but I couldn't open the PayPal order. The store's PayPal connection isn't set up on their end, so it returned an error. Nothing was charged, and your $8 budget is still unused.

**The budget issue:** the two obvious picks, the Squircle App Icon and the Pricing Plan Card, cost $5 each. That's $10, which is over your $8 limit. To stay under it, I used a free icon instead of the paid one.

1. **App icon: Oasis Line Icons (free).** A sun icon in amber and ink on a rounded square, on your paper background. [Preview](https://oasis-design.onrender.com/api/assets/line-icons/render.svg?p=%7B%22icon%22%3A%22sun%22%2C%22layout%22%3A%22single%22%2C%22color%22%3A%22%231B1F3B%22%2C%22accent%22%3A%22%23F2A541%22%2C%22background%22%3A%22%23F7F3EA%22%2C%22stroke%22%3A2.25%7D)
2. **Pricing card: Pricing Plan Card ($5).** Amber accents on your paper background, with "Lumen Plus", "$6 / month" and a "Most popular" banner. The plan name and price are placeholders I made up, so tell me what you want instead. [Preview](https://oasis-design.onrender.com/api/assets/pricing-card/render.svg?p=%7B%22accent%22%3A%22%23F2A541%22%2C%22backdrop%22%3A%22%23F7F3EA%22%2C%22plan%22%3A%22Lumen%20Plus%22%2C%22price%22%3A%22%246%22%7D)

The order total would be **$5**, which leaves $3 of your budget.

**Next steps:**
- Once the store fixes its PayPal setup, I'll try the order again and send you the PayPal link to approve.
- The free icon may not need a paid order at all. Its preview link should already work.
- If you'd rather have the more polished $5 Squircle App Icon, raise the budget to at least $10 and I'll swap it in.

---

**Scripted probe (not the agent):** `create_order` for $10 of items against the same $8 mandate, claiming `max_total_usd: 9999`.

**✖ refused:** `Order total $10.00 is over what mandate mnd_115c67161c9d has left ($8.00 of $8.00). Ask the human to issue a larger mandate.`

