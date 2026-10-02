# Oasis

**Tagline:** Design assets built as tiny programs. Your AI agent remixes them into your brand and opens a PayPal order that only you can approve.

## Inspiration

Agents build interfaces now. Describe a product to Claude, v0 or Lovable and a working UI comes back in a minute. The
code half of that loop is solved. The design half isn't: the moment the agent needs a hero illustration, an icon set,
a pricing card or an app icon, it falls off a cliff.

It can generate an image, which arrives unlicensed, off-brand and different every time. Or it can grab a stock asset:
a frozen file someone else finished. The illustration is the wrong teal, the card has three feature rows when you
need five. A person opens Figma and fixes it. An agent can't. And even when the agent finds the right asset, it can't
buy it, because stock sites are built for a human with a card in a checkout form, and an agent holding your card is
exactly what nobody should build.

Polyfork showed the way out for 3D: sell models as programs, not meshes. Design needs that, plus two pieces 3D didn't:
**brand** (every asset a team uses has to be in their colours) and **a payment an agent can start but only a human can
finish**. That second piece is what PayPal's order approval already is.

## What it does

**Oasis is a store of design assets where nothing is finished.** Every asset is an ES module: typed knobs in, SVG out.
67 assets (64 built-in programs and 3 AI forks) with 671 knobs, from pricing cards and phone mockups to Bauhaus posters and Oasis Town,
an isometric street diorama that rebuilds as you turn its knobs.

![Change it after you find it](https://raw.githubusercontent.com/machmoon/oasis/main/docs/figures/01-rebuilt-not-stretched.png)

The pricing card above is one program at two settings. It isn't stretched: it grows three feature rows and a badge.
The city grows from 4 blocks to 25. A file can't do either.

**Brand Mode.** 235 of 247 colour knobs in the catalogue declare a role: background, surface,
ink, muted, primary, secondary, highlight. Set your brand once and *every asset* re-renders in it, and components with
a light/dark theme follow the brand's darkness on their own.

![One brand, every asset](https://raw.githubusercontent.com/machmoon/oasis/main/docs/figures/02-one-brand-every-asset.png)

**The Oasis agent.** Describe your product and what you need ("a calm meditation app in deep teal and coral: app icon,
hero background, pricing card, testimonial avatars, under $20"). Claude searches the catalogue, applies one brand to
every piece, **looks at each render it makes** and remixes again when something is off, fills a cart, and opens a
**PayPal order**. You see every licence with the agent's reason, inside the spending cap you set, and you approve it
in PayPal's own window. The agent can ask; it can't pay.

**Any agent can shop.** One MCP endpoint (`/mcp`, no key to browse) exposes `search_assets`, `get_asset`,
`remix_asset` (returns the render so the agent can judge it), `create_order` and `get_order`. `create_order` takes the
human's `max_total_usd` (the server refuses anything above it) and the agent's name, which PayPal shows the buyer in
the approval screen. `get_order` captures after approval and returns licensed downloads.

**Forks pay upstream.** Fork any asset with AI ("make it art deco"). Claude rewrites the program, the sandbox and harness
prove it renders, and it's published with its lineage. A $10 licence of a fork of a fork pays its creator $6, the
parent $2, the grandparent $1 and Oasis $1, through **PayPal Payouts**. Royalties are held until the 14-day refund
window closes, so nobody is paid on a refunded sale.

![Forks pay upstream](https://raw.githubusercontent.com/machmoon/oasis/main/docs/figures/03-forks-pay-upstream.png)

**What you download.** The exact remix as SVG, a 2048 px PNG, a React component, a CSS class, or the program itself.

## How we built it

**PayPal, end to end** (walkthrough with code references: [PAYPAL.md](https://github.com/machmoon/oasis/blob/main/PAYPAL.md)):
- **Orders v2** via `@paypal/paypal-server-sdk`: itemised `DIGITAL_GOODS`, `PAY_NOW`, `NO_SHIPPING`, return URLs so an
  MCP agent can hand a human the `payer-action` link, and the agent's name and cap in the order description.
- **Smart Buttons** in the asset page, the cart and inside the agent chat.
- **Capture is server-side and verified:** licences are issued only if the captured amount and currency equal what
  the server priced; a mismatch is refunded automatically. One capture per order, because the browser, the return URL
  and a webhook can race.
- **`PayPal-Request-Id` idempotency** on create, capture and refund.
- **Webhooks**, verified with `verify-webhook-signature`: `CHECKOUT.ORDER.APPROVED` captures orders whose tab closed,
  `PAYMENT.CAPTURE.REFUNDED` revokes licences, `PAYMENT.PAYOUTS-ITEM.*` tracks each royalty.
- **Payouts** for royalties, held until the refund window closes and cancelled by a refund; **refunds** within 14 days
  through the Payments API. In production the creator split moves to **PayPal Commerce Platform** (per-unit `payee` +
  `platform_fees`) so refunds unwind it automatically.
- **Where this stands, plainly:** the live deploy has no PayPal sandbox keys yet, so no order has been captured and no Payouts batch has been sent. Every path above is exercised by the tests against a fake PayPal client. Live counts of orders, verified webhooks and payouts: [oasis-design.onrender.com/#/status](https://oasis-design.onrender.com/#/status).

**The asset factory.** 59 of the 67 assets were written by an agent pipeline (5 are
hand-written programs, 3 are AI forks). The first 36 came from factory v1 (builder self-review only, all since
re-checked by the harness). Every build since tonight's v2 goes through the full gate below: 58 builds,
23 published, 35 rejected (the factory is stopped for judging, so these match `factory/stats.jsonl` line for line). Nothing ships on the builder's word:
1. Claude writes a program from a one-line brief and critiques its own renders.
2. **A harness measures it.** Every asset is rendered across its knob space: defaults, presets, every range at min and
   max, random combinations, and a light and a dark brand. Blank output, slow renders, oversize SVG, missing brand
   roles and **dead knobs** (a knob whose every value yields byte-identical SVG) are rejected.
3. **An independent grader in a fresh session**, which never saw the builder's reasoning, looks at those renders and
   publishes or rejects. It has caught real bugs a self-review missed: a checkout screen whose order total didn't add
   up, a login screen whose focus ring turned the error colour on one brand.
4. Each verdict writes one general lesson into every later build's prompt (115 so far).

Every verdict, with the grader's main finding, and every test name are in
[docs/PROOF.md](https://github.com/machmoon/oasis/blob/main/docs/PROOF.md), generated from the factory log and the test run.

**Safety.** Asset programs, including AI-written forks, run in QuickJS compiled to WebAssembly: no `require`, no file
system, no network, a 48 MB heap. An allocation storm can outrun QuickJS's own interrupt (it took 8.3 s to die in
testing), so every server render runs in a worker thread that is **terminated at 3 s**. Output must be SVG and is only
shown through `<img>`. Paid source never leaves the server; catalogue previews are low-res raster comps.

**Tested.** 26/26 tests pass: price tampering, the capture race, amount-mismatch refunds, refund revocation,
webhook handling, the spending cap, royalty cents along a fork chain, sandbox escapes and the deadline kill.

**Stack.** Node + Express, a no-build vanilla JS store, Claude Opus 5.5 (agent, forks, factory, grader), MCP Streamable
HTTP, resvg, Playwright, Render.

## Challenges we ran into

- **The builder approves its own dead knobs.** On the first 40 assets, a pixel-diff harness flagged 22 with at least one
  knob that barely changed anything; the stricter byte-identical rule found 3 that changed nothing at their defaults. "Every knob
  must change the bytes" became a hard gate.
- **A memory bomb beat the sandbox's own clock.** The fix was a deadline enforced from outside, by killing the worker.
- **Brand Mode on dark brands** made light components unreadable until themed components learned to follow the
  brand's background luminance.
- **Royalties in cents.** 30% of $7.99 split across a parent and grandparents must sum to exactly 799 cents. Tested.

## Accomplishments that we're proud of

- An agent that goes from a one-paragraph brief to a coherent, branded kit and a PayPal order you approve, and throws
  away its own muddy first renders without being asked.
- A fork of a fork that pays three parties automatically.
- Brand Mode: one palette re-skins 67 assets.

## What we learned

- Agents need assets that are **code**: a planner can read, diff and change one line of a program. Design adds a
  second reason: a program can take a brand as input.
- **Measure the artefact, not the agent's description of it.** Every quality jump came from a check that rendered the
  program and counted something.
- For agentic commerce the right primitive isn't "the agent has a card". It's **the agent creates the order, the human
  approves it, the server enforces the cap**, and PayPal's order approval already works that way.

## What's next

PayPal Commerce Platform onboarding so creator splits settle at capture; Subscriptions for an all-access plan; a
Figma plugin and `npx oasis add pricing-card --brand ./brand.json`; more kits that share one grid.
