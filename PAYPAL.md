# How Oasis uses PayPal

A walkthrough of the payment path, in the order money moves. Every step links to the code that does it, and
`test/commerce.test.mjs` exercises each one against a fake PayPal client.

```
cart / agent / MCP
   │  POST /api/orders            create_order (MCP)
   ▼
server prices the cart ──► Orders v2: create (intent CAPTURE, DIGITAL_GOODS, PayPal-Request-Id)
   │
   ▼
human approves in PayPal  (the order's approval page, reached from Pay, or the payer-action link an agent hands over)
   │
   ▼
capture (server only) ──► amount + currency checked ──► licences issued ──► royalties split
   │                                                                          │
   │                                                                          ▼
   │                                                               Payouts batch to creators
   ▼
webhooks: ORDER.APPROVED → capture · CAPTURE.REFUNDED → revoke · PAYOUTS-ITEM.* → payout status
```

## 1. The server sets the price

`server/commerce.js` → `priceCart()` / `createCheckout()`

The browser (or agent) sends only `assetId` and knob values. The server looks each asset up in the catalogue,
resolves the knobs against the asset's schema, and takes the price from the catalogue. A client-supplied `price`
is ignored (tested: *prices come from the server, never the client*). Free items are dropped; a cart of only
free items is refused.

## 2. Orders v2: create

`server/paypal.js` → `createOrder()`, following PayPal's reference server
([`docs-examples/standard-integration/server/node/server.js`](https://github.com/paypal-examples/docs-examples/blob/main/standard-integration/server/node/server.js)).

- `@paypal/paypal-server-sdk` `OrdersController.createOrder`, `intent: CAPTURE`
- one `purchase_unit` with an itemised `items[]` (`category: DIGITAL_GOODS`, a `sku` per remix) and an
  `amount.breakdown.item_total` that equals the sum, so the buyer sees exactly what they're licensing
- `payment_source.paypal.experience_context`: `brand_name: Oasis`, `user_action: PAY_NOW`,
  `shipping_preference: NO_SHIPPING`, plus `return_url` / `cancel_url` for orders created by agents
- `PayPal-Request-Id: oasis-create-<ref>`: a retried request returns the same order instead of a duplicate

## 3. A human approves

- **On a kit or a sound's page:** the Pay button (`public/kits.js`, and "License it" in `public/sound-page.js`)
  calls `POST /api/kits/:id/checkout`, which creates the itemised order with `return_url`
  `/checkout/return?kit=<id>`, and sends the buyer to the order's PayPal approval link. PayPal returns them to
  `/checkout/return`, which captures server-side; the kit page then claims the licences with the claim token it
  saved before leaving. (A redirect, not the JS SDK's Smart Buttons: one flow for people and for agents' humans.)
- **From an outside agent over MCP:** `create_order` returns the order's `payer-action` link. The agent hands it
  to the human; PayPal redirects back to `/checkout/return`, which captures.

The agent never holds a payment method. It can create an order; only a human can approve one.

**The agent's budget is a mandate the human issued.** `server/mandates.js`, shaped after the `IntentMandate` in
Google's Agent Payments Protocol ([`AP2/code/sdk/python/ap2/models/mandate.py`](https://github.com/google-agentic-commerce/AP2/blob/main/code/sdk/python/ap2/models/mandate.py)):
a confirmed description, `intent_expiry`, optional `skus`, `user_cart_confirmation_required: true`. AP2's
human-present mandate has no amount, because the human confirms every cart; Oasis adds a server-held budget, because
`max_total_usd` alone is only the agent's word. The human issues one on `/#/agents` and gives the agent its
`mdt_…` token (the server stores only its SHA-256). MCP `create_order` requires it; the server reserves each order
against the balance under a per-mandate lock, so two concurrent orders can't both spend the last dollars. A capture
keeps the amount spent, a refund or amount mismatch gives it back, and an order nobody approves stops holding budget
after 3 hours, when PayPal's approval link expires anyway. The human can **revoke** a mandate at once
(`POST /api/mandates/revoke`, the Revoke button on `/#/agents`), and every order an agent creates is in the mandate's
audit log with the agent's name and time (tested: *the human's budget is enforced by the server, not
by what the agent says*).

**Who owns an order.** Order IDs travel through PayPal URLs, so they are not secrets. Each order gets a 128-bit
`claimToken` at creation (`createCheckout()`), returned once to whoever created it, the way Stripe returns a
PaymentIntent's `client_secret`. Licences, the money trail and refunds need it (`X-Oasis-Claim` over HTTP,
`claim_token` in MCP `get_order`); anyone else with the ID sees only the status (`publicOrder()`; tested: *the order
ID alone unlocks nothing*).

## 4. Capture, verified

`server/commerce.js` → `capture()` / `doCapture()`

- capture happens on the server only (`OrdersController.captureOrder`, `PayPal-Request-Id: oasis-capture-<id>`)
- **one capture per order:** the browser, the return URL and a webhook can all arrive at once, so captures are
  coalesced per order (tested: three simultaneous captures produce one PayPal call)
- **amount check:** licences are issued only when the captured `amount.value` and `currency_code` equal what the
  server priced. A mismatch marks the order `AMOUNT_MISMATCH` and is refunded automatically (tested)
- **pending captures** (eChecks, risk review): the order becomes `CAPTURE_PENDING`, keeps its mandate budget held,
  issues nothing and is never captured twice; `PAYMENT.CAPTURE.COMPLETED` fulfils it (amount-checked again) and
  `PAYMENT.CAPTURE.DENIED` closes it and releases the budget. A COMPLETED event that beats Oasis's own capture
  response fulfils the order without a second PayPal call (tested: *failure modes PayPal really produces*)
- each item gets a licence token; downloads are `GET /api/licenses/<token>/download.{svg|png|jsx|css|mjs}`

## 5. Royalties through Payouts, held through the refund window

`server/commerce.js` → `royaltySplit()`, `releaseDuePayouts()`; `server/paypal.js` → `sendPayouts()`

Each licence of a fork pays its creator 60%, its ancestors 30% (the parent takes two thirds of that, older
ancestors share the rest) and Oasis 10%, computed in integer cents so the parts always sum to the price (tested
across prices like $7.99).

Payouts can't be pulled back, and buyers can refund for 14 days. So royalties are **held** on the order at capture
and released by `releaseDuePayouts()` (run hourly) only once the order is past the refund window and still
`COMPLETED`. A refund inside the window cancels the hold, so a creator is never paid on a refunded sale (tested:
*a refund inside the window cancels held royalties*). The batch is idempotent on `sender_batch_id = oasis-<orderId>`.

**Production path (future work, not built).** Payouts suits a hackathon marketplace with a few creators. At scale the right tool is **PayPal
Commerce Platform**: onboard each creator as a seller, and split at capture with `payee` per purchase unit plus a
`platform_fees` entry, so refunds unwind the split automatically. The split function already produces the
per-party amounts that call needs.

## 6. Webhooks are the source of truth

`server/app.js` → `POST /api/paypal/webhook`; `server/commerce.js` → `handleWebhook()`

Every event is verified with PayPal's `verify-webhook-signature` API before anything is trusted (unsigned events
get a 400; tested). Then:

| Event | Effect |
|---|---|
| `CHECKOUT.ORDER.APPROVED` | captures the order, so a buyer who closed the tab still gets their licence |
| `PAYMENT.CAPTURE.REFUNDED`, `PAYMENT.CAPTURE.REVERSED` | marks the order refunded and revokes its licences |
| `PAYMENT.PAYOUTS-ITEM.SUCCEEDED / UNCLAIMED / FAILED / RETURNED` | records each royalty payment's status |

`ensureWebhook(url)` registers the webhook for exactly these event types.

## 7. Refunds

`POST /api/orders/:id/refund` → `PaymentsController.refundCapturedPayment` with
`PayPal-Request-Id: oasis-refund-<id>`, within 14 days. Licences are revoked immediately, and downloads return
`410 Gone` (tested).

## What has actually run

[`docs/SANDBOX-RUN.md`](docs/SANDBOX-RUN.md) is a real run of this whole path against the PayPal sandbox
(`npm run sandbox-demo -- --card`): a refused over-budget order, two captures, a refund that revokes the licence and
returns the budget, and a fork-of-a-fork royalty sent as a Payouts batch, each with its PayPal ID. In that run, approval
used PayPal's published sandbox test card through `confirm-payment-source` instead of a person logging in; without
`--card` the script opens PayPal's window and waits for you. The live deploy also lists every order, verified webhook
and payout it produces at [`/#/status`](https://oasis-design.onrender.com/#/status).

## One command against the real sandbox

```bash
npm run sandbox-demo
```

`scripts/sandbox-demo.mjs` starts its own Oasis on port 8788 with a shortened refund window and walks the whole path
against PayPal: a mandate, an over-budget order refused, an agent order you approve in PayPal's window, capture and a
licensed download, a refund that revokes the licence and returns the budget, and a fork-of-a-fork sale whose royalties
go out as a real Payouts batch. Every PayPal ID lands in [`docs/SANDBOX-RUN.md`](docs/SANDBOX-RUN.md).

## Sandbox quickstart (about five minutes)

```bash
git clone https://github.com/machmoon/oasis && cd oasis && npm install
cp .env.example .env    # then fill in the three lines below
#   PAYPAL_CLIENT_ID=...       developer.paypal.com → Apps & Credentials → Sandbox → your app
#   PAYPAL_CLIENT_SECRET=...
#   ANTHROPIC_API_KEY=...      optional: only the built-in agent needs it
npm start               # http://localhost:8787 ; /api/config should say "paypalReady": true
```

1. Open any paid asset, click **License**, and pay with your sandbox *personal* account in the PayPal popup.
   You land on `/#/order/<id>` with the capture ID and five download links.
2. `/#/status` now lists the order with its capture ID.
3. An agent's view of the same flow, over MCP:
   ```bash
   CAP=8 node scripts/mcp-agent.mjs http://localhost:8787/mcp   # writes docs/mcp-session.md
   ```
   The agent stays under `max_total_usd`, calls `create_order`, and hands you `approve_url`. Approve it in the
   browser, then call `get_order` with the `order_id` and `claim_token` from the transcript: it captures and returns
   the files. Without the token, the same call is refused.
4. Webhooks need a public URL. Expose the server (for example with `cloudflared tunnel --url http://localhost:8787`),
   register `https://<host>/api/paypal/webhook` in the sandbox app for the event types in section 6, set
   `PAYPAL_WEBHOOK_ID`, and restart. Each delivery then shows on `/#/status` with `verified` and its effect.

## Running it in the sandbox

1. developer.paypal.com → Apps & Credentials → Sandbox → your app: copy the client id and secret into `.env`
   (`PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`).
2. Testing tools → Sandbox accounts: use the *personal* account to pay in the popup; use another account's
   email as a fork's payout email to watch royalties arrive.
3. For webhooks: expose the server, register `https://<host>/api/paypal/webhook`, and set `PAYPAL_WEBHOOK_ID`.
