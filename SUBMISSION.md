# Devpost submission — Oasis

**Tagline:** Design assets you can reshape. Remix any icon, UI kit or poster with knobs, have an AI agent build your brand kit, and license the exact remix with PayPal.

## Inspiration

Stock design assets are frozen files. You buy an illustration and it's the wrong teal, the wrong proportions, and it
says "Lorem ipsum". Then you redraw it. Polyfork showed that 3D models can be sold as *programs* that buyers reshape
before downloading. We asked what happens if every product-design and UI asset worked that way, and if AI agents could
shop for them and pay through PayPal with a human approving.

## What it does

- **A store of 40+ programmable assets**: pricing cards, phone and browser mockups, icon sets, Swiss and Bauhaus
  posters, isometric illustrations, terrazzo and topographic patterns, logo marks, avatars. Each has 6–10 typed knobs
  and colourway presets. Drag a knob and it re-renders instantly.
- **License the exact remix with PayPal.** Smart Buttons check out a cart of remixes; downloads unlock as SVG, PNG,
  React component, CSS class, or the source program itself.
- **The Oasis agent.** Describe your brand and what you need. Claude searches, applies one palette across every
  piece, *looks at each render* and fixes what's off, fills the cart, and opens a PayPal order. You approve the
  payment in PayPal; the agent never can.
- **Fork with AI + royalties.** Describe a new direction ("make it art deco"). Claude rewrites the program, a
  sandbox proves it renders, and it's published as a new asset with lineage. Each sale pays the fork's creator 60%
  and its ancestors 30% through **PayPal Payouts**.
- **Agentic commerce over MCP.** Claude Code, Cursor or any MCP client can `search_assets → remix_asset →
  create_order`, hand the human a PayPal approve link, then `get_order` for the files.

## How we built it

- Node + Express; a vanilla-JS store with no build step.
- **PayPal Orders v2** via `@paypal/paypal-server-sdk` (itemised `DIGITAL_GOODS`, `PAY_NOW`, `NO_SHIPPING`,
  return/cancel URLs for agent-created orders), **JS SDK Smart Buttons**, and the **Payouts API** for royalties.
  The flow follows PayPal's `docs-examples/standard-integration` reference, and agent tool names mirror PayPal's agent toolkit.
- **Claude Opus 5.5** for the shopping agent (tool use with image tool results, so it critiques its own renders),
  Fork with AI, and the asset factory that wrote most of the catalogue from one-line briefs with a visual review pass.
- **QuickJS in WebAssembly** runs every asset program, including AI-written ones, with no I/O, a memory cap and a timeout.
- **MCP** (stateless Streamable HTTP) for outside agents, plus `llms.txt`.

## Challenges

- Making AI-written code safe to run on a server: QuickJS sandbox, SVG-only output shown through `<img>`, and paid
  source that never leaves the server.
- Quality at scale: the factory renders each asset at defaults, presets and every range maxed, and Claude reviews
  those images before anything is published.
- Royalties along a fork tree: splitting cents across ancestors deterministically and paying through Payouts.

## Accomplishments

- An agent that actually shops: it went from a one-paragraph brief to a coherent, paid-for brand kit, and threw away
  its own muddy first renders.
- Forks of forks pay everyone upstream automatically.

## What's next

PayPal Subscriptions for a Pro tier, Figma plugin export, and creator onboarding with PayPal Commerce Platform so payouts are split at capture.

## Built with

paypal-orders-v2, paypal-js-sdk, paypal-payouts, claude-opus-5-5, anthropic-sdk, model-context-protocol, quickjs, node.js, express, svg, resvg

## PayPal developer feedback

- The server SDK has no Payouts controller, so royalties needed a hand-rolled OAuth + REST call alongside the SDK.
- `payer-action` vs `approve` link naming differs between `payment_source.paypal.experience_context` and legacy
  `application_context` orders; agents need one stable approval link.
