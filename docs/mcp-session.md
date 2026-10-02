# An outside agent on Oasis over MCP

Recorded 2026-10-02T06:20:40.447Z by `scripts/mcp-agent.mjs` against `https://oasis-design.onrender.com/mcp`.
The agent is Claude (claude-opus-5-5) with no Oasis code: only the tools the MCP server lists (`search_assets`, `get_asset`, `remix_asset`, `create_order`, `get_order`).

**Brief:** I'm launching Lumen, a reading app. Brand: ink #1B1F3B, paper #F7F3EA, amber #F2A541. Find me an app icon and a pricing card in that brand, then open a PayPal order for both. My spending cap is $8; pass it as max_total_usd.

**→ `search_assets`** `{"query":"app icon","max_price":8}`

**←** `[ { "asset_id": "app-icon", "title": "Squircle App Icon", "kind": "icons", "price_usd": 5, "description": "A polished iOS-style app icon with six crafted glyphs, gradient body, gloss and depth, for app mockups, store listings and pitch decks.", "tags": [ "app icon", "ios", "squircle", "icon", "gradient", "mobile", "glyph", "branding" ], "author": "oasis-factory", "forked_from": null, "presets": [ "Lagoon", "Sunset", "Grove", "Midnight" ] }, { "asset_id": "line-icons", "title": "Oasis Line Icons"`

**→ `search_assets`** `{"query":"pricing card","max_price":8}`

**←** `[ { "asset_id": "pricing-card", "title": "Pricing Plan Card", "kind": "ui", "price_usd": 5, "description": "A polished SaaS pricing card with feature checklist, CTA and ribbon, for landing pages, pitch decks and UI mockups.", "tags": [ "pricing", "pricing card", "saas", "ui", "plan", "subscription", "landing page", "component" ], "author": "oasis-factory", "forked_from": null, "presets": [ "Indigo", "Emerald", "Coral", "Midnight" ] }, { "asset_id": "stat-card", "title": "Pulse Stat Card", "kind"`

**Agent:** App icon ($5) + pricing card ($5) = $10, which is over your $8 cap. I'll check whether the free line-icons set can work as the icon.

**→ `get_asset`** `{"asset_id":"line-icons"}`

**←** `{ "asset_id": "line-icons", "title": "Oasis Line Icons", "kind": "icons", "price_usd": 0, "description": "24 crisp line icons with brand-tunable stroke, style and containers. Show one or the whole sheet.", "author": "oasis", "knobs": { "icon": { "type": "choice", "label": "Icon", "default": "palette", "options": [ "house", "search", "heart", "star", "bell", "camera", "palette", "brush", "sparkles", "cloud", "sun", "moon", "leaf", "coffee", "music", "map-pin", "shopping-bag", "user", "settings", `

**→ `get_asset`** `{"asset_id":"pricing-card"}`

**←** `{ "asset_id": "pricing-card", "title": "Pricing Plan Card", "kind": "ui", "price_usd": 5, "description": "A polished SaaS pricing card with feature checklist, CTA and ribbon, for landing pages, pitch decks and UI mockups.", "author": "oasis-factory", "knobs": { "accent": { "type": "color", "role": "primary", "label": "Accent", "default": "#5B5CF0" }, "backdrop": { "type": "color", "role": "background", "label": "Backdrop", "default": "#ECEEF6" }, "theme": { "type": "choice", "label": "Theme", "d`

**→ `get_asset`** `{"asset_id":"app-icon"}`

**←** `{ "asset_id": "app-icon", "title": "Squircle App Icon", "kind": "icons", "price_usd": 5, "description": "A polished iOS-style app icon with six crafted glyphs, gradient body, gloss and depth, for app mockups, store listings and pitch decks.", "author": "oasis-factory", "knobs": { "top": { "type": "color", "role": "secondary", "label": "Gradient top", "default": "#3EC6FF" }, "bottom": { "type": "color", "role": "primary", "label": "Gradient bottom", "default": "#2B5BFF" }, "ink": { "type": "color`

**→ `remix_asset`** `{"asset_id":"line-icons","knobs":{"icon":"sun","layout":"single","color":"#1B1F3B","accent":"#F2A541","background":"#F7F3EA","style":"duotone","container":"squircle","stroke":2.25}}`

**←** `{"asset_id":"line-icons","knobs":{"icon":"sun","layout":"single","color":"#1B1F3B","accent":"#F2A541","background":"#F7F3EA","stroke":2.25,"style":"duotone","container":"squircle","linecap":"round"},"price_usd":0,"preview_url":"https://oasis-design.onrender.com/api/assets/line-icons/render.svg?p=%7B%22icon%22%3A%22sun%22%2C%22layout%22%3A%22single%22%2C%22color%22%3A%22%231B1F3B%22%2C%22accent%22%3A%22%23F2A541%22%2C%22background%22%3A%22%23F7F3EA%22%2C%22stroke%22%3A2.25%7D"}` (+1 render)

**→ `remix_asset`** `{"asset_id":"pricing-card","knobs":{"accent":"#F2A541","backdrop":"#F7F3EA","theme":"light","plan":"Lumen Plus","price":"$4.99","period":"month","button":"solid","popular":true}}`

**←** `{"asset_id":"pricing-card","knobs":{"accent":"#F2A541","backdrop":"#F7F3EA","theme":"light","period":"month","button":"solid","plan":"Lumen Plus","price":"$4.99","features":5,"radius":20,"popular":true},"price_usd":5,"preview_url":"https://oasis-design.onrender.com/api/assets/pricing-card/render.svg?p=%7B%22accent%22%3A%22%23F2A541%22%2C%22backdrop%22%3A%22%23F7F3EA%22%2C%22plan%22%3A%22Lumen%20Plus%22%2C%22price%22%3A%22%244.99%22%7D"}` (+1 render)

**→ `create_order`** `{"agent_name":"Lumen shopping agent","max_total_usd":8,"items":[{"asset_id":"line-icons","knobs":{"icon":"sun","layout":"single","color":"#1B1F3B","accent":"#F2A541","background":"#F7F3EA","stroke":2.25,"style":"duotone","container":"squircle","linecap":"round"}},{"asset_id":"pricing-card","knobs":{"accent":"#F2A541","backdrop":"#F7F3EA","theme":"light","period":"month","button":"solid","plan":"Lu`

**✖ error:** `PayPal sandbox credentials are not configured (PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET).`

**Agent:** I couldn't open the PayPal order. Oasis returned an error saying its PayPal sandbox credentials aren't set up. That's a problem on their side, so no order exists and you haven't been charged.

**What I picked:**
- **App icon:** Oasis Line Icons, **free**. A navy sun with an amber fill on a light amber squircle, over your paper colour. I chose it because the premium Squircle App Icon ($5) plus the pricing card ($5) would come to $10, which is over your $8 cap. The free set has no book icon, so I used the sun as a nod to "Lumen."
- **Pricing card:** Pricing Plan Card, **$5**. It uses your amber accent on a paper background and says "Lumen Plus · $4.99/month" with a "Most popular" ribbon. The placeholder text ("Everything a growing team needs," "Custom domains," etc.) is still the template's and doesn't fit a reading app. I can change it if those fields are editable.

**Total: $5**, under your $8 cap.

Previews:
- Icon: https://oasis-design.onrender.com/api/assets/line-icons/render.svg?p=%7B%22icon%22%3A%22sun%22%2C%22layout%22%3A%22single%22%2C%22color%22%3A%22%231B1F3B%22%2C%22accent%22%3A%22%23F2A541%22%2C%22background%22%3A%22%23F7F3EA%22%2C%22stroke%22%3A2.25%7D
- Card: https://oasis-design.onrender.com/api/assets/pricing-card/render.svg?p=%7B%22accent%22%3A%22%23F2A541%22%2C%22backdrop%22%3A%22%23F7F3EA%22%2C%22plan%22%3A%22Lumen%20Plus%22%2C%22price%22%3A%22%244.99%22%7D

Once Oasis fixes PayPal, I can open the same order with your $8 cap. If you'd rather have the premium $5 icon, you'd need to raise the cap to $10 to get it with the card.

