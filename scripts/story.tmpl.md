## Inspiration

Agents can write a 3D scene in a minute now. Ask Claude Code for a cozy Kyoto street in three.js and you get one. But
every shop, tram and lantern in that street is somebody's work, and the agent has no way to pay them. It can't check
out on a store, it shouldn't hold your card, and asking you to click through twelve checkouts defeats the point of
having an agent.

The 3D side of this is getting solved: there are now libraries where a model is a small program with knobs instead of
a frozen mesh, so an agent can read it, change one parameter and rebuild it. What nobody has solved is the money. When
an agent assembles a scene from forty pieces by a dozen creators, who pays whom, inside what limit, approved by which
human?

That is a payments problem, and it is exactly the shape of the tools PayPal already ships: a wallet a human can save
for a merchant once (Vault), orders that charge it with no buyer present, and Payouts to many people at once.

## What it does

**Oasis is a registry of 3D assets written as code, where AI agents are the buyers.**

1. **You give your agent a budget.** Pick an amount, approve once in PayPal. Under the hood that is a PayPal Vault
   setup token you approve, exchanged for a payment token Oasis keeps. That is the last checkout you see.
2. **Your agent builds the scene.** Claude Code (or any MCP client) searches the registry, reads each piece's knobs,
   previews them, and buys everything the scene needs in one `buy_assets` call. Oasis charges your saved wallet in a
   single PayPal order, with no redirect, and refuses anything over the budget before PayPal is ever called.
3. **Every piece is a licensed import.** The agent gets a module URL per piece and writes
   `import { createAsset } from "…/cdn/town-shop.mjs?lic=…"; scene.add(createAsset({ floors: 3 }))`.
   Knobs rebuild the model: more floors means more windows, not a taller mesh.
4. **Every creator gets paid.** Each creator's share is booked on the ledger the moment PayPal completes, and paid
   out with PayPal Payouts after the 14-day refund window.

In the demo video, the agent is the real Claude Code CLI, unedited. It had a $25 budget for a street that wanted more,
chose what to cut, and bought {{runPieces}} pieces from {{runCreators}} creators for {{runTotal}} in PayPal sandbox
order **{{runOrder}}**. The ledger you see updating is filmed at the same moment.

**Without a licence, nothing breaks.** A browser import with no licence still loads, as a grey block with the real
footprint, so a scene never crashes. Anything that isn't a browser (an agent, `curl`, a build step) gets
**HTTP 402 Payment Required** in the shape of Coinbase's x402 v2 transport: a `PAYMENT-REQUIRED` header with the price
in cents and the creator to pay, and a retry with `PAYMENT-SIGNATURE` that settles through the PayPal budget and
returns the module with `PAYMENT-RESPONSE`.

## How we built it

- **PayPal Vault (v3 setup and payment tokens)** for the one-time approval, and **Orders v2** with
  `payment_source.paypal.vault_id` and `stored_credential.payment_initiator: MERCHANT` for agent purchases, which
  PayPal completes in the same call. **Payouts** pays creators. Webhooks are signature-verified, refunds revoke
  licences (the module URL returns 410), and payouts are held until the refund window closes.
- **The budget** is a server-held mandate shaped after Google's Agent Payments Protocol (AP2) open payment mandate:
  a `payment.budget` constraint checked like AP2's `BudgetEvaluator` (past spend plus this payment against the cap),
  an expiry, and a revocable bearer token. The agent can restate any limit it likes; only the server's number counts.
- **The 402** follows coinbase/x402's v2 HTTP transport, with one fiat scheme (`exact`, network `paypal:sandbox`,
  asset `USD`), which x402's spec allows for ISO 4217 currencies.
- **MCP** (Streamable HTTP): `search_assets`, `get_asset`, `preview_asset`, `buy_assets`, `get_budget`, plus
  `/llms.txt` for agents that read before they call.
- **Assets are programs.** Each piece exports `build(knobs)` returning boxes, gables, cylinders and cones in metres.
  It runs in a QuickJS sandbox on the server for previews and as plain JavaScript in the buyer's scene through a
  shared three.js runtime, so the import is exactly the model you previewed. {{kitPieces}} pieces today, on one 6 m
  grid and palette, many built by an agent factory with a separate grader (see the repo's `factory/`).
- **Claude** (Opus 5.5) is both sides: the buyer in the demo (Claude Code over MCP) and the builder in the factory.
- Node, Express, three.js, PayPal Server SDK and REST, the MCP TypeScript SDK, Render. {{tests}} tests.

## Challenges we ran into

- **Charging without a buyer present.** The first design still sent the human to PayPal for every order, which made
  the agent pointless. Vault with merchant-initiated stored credentials fixed it; the hard part was making the server,
  not the agent, the only place the cap lives, including holds for in-flight orders and giving budget back on a
  decline.
- **A licence that a browser can use.** Browsers can't answer a 402 on a module import; the import just fails and the
  scene dies. So browser imports get a placeholder of the right size, and only non-browser clients get the 402.
- **Splitting money honestly.** One Orders v2 order can name at most 10 payees, each a real merchant account. We
  capture to the platform and pay creators with one Payouts batch per order, held until refunds can no longer land.

## Accomplishments that we're proud of

- A real agent, unedited, spending a real (sandbox) budget, choosing under a constraint, and paying several creators
  in one order, with the order ID on screen and on the ledger.
- Every guardrail runs on the server: over-budget is refused before PayPal is called, a revoked token fails at once,
  a refund revokes the licence and returns the budget.

## What we learned

- The agent should never hold the money or the limit. Give it a token; keep the balance, the cap and the kill switch
  on the server.
- Payment standards for agents (x402, AP2) and PayPal's existing primitives fit together better than we expected:
  x402 describes the price, AP2 describes the permission, PayPal moves the money.

## What's next for Oasis

- Open publishing: anyone uploads a program, sets a price and a PayPal account, and earns when agents import it.
- PayPal Complete Payments so creators are paid at capture instead of after a hold.
- Per-creator and per-asset limits in the budget (AP2's `allowed_payees`), and budgets for teams.

**Honest notes:** everything runs on the PayPal sandbox. The creator accounts in the demo are sandbox accounts, and
the kit pieces were made by Oasis's own agent factory, not by four separate people.
