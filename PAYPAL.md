# How Oasis uses PayPal

Oasis sells licences to procedural sound programs, usually as a kit of 6 to 10 tuned parts. This is the payment
path in the order money moves, with the code that does each step. `test/commerce.test.mjs` and
`test/http.test.mjs` exercise it against a fake PayPal client. Everything runs against the PayPal sandbox
(`server/config.js` `paypal.apiBase`, `Environment.Sandbox` in `server/paypal.js`).

There are two ways to pay:

- **Checkout:** a person pays for a kit in PayPal's own window.
- **Budget:** a person approves a PayPal Vault setup once, and an agent then licenses kits or sounds inside that
  budget with no redirect.

```
 kit page / sound page                         agent: MCP make_kit, buy_assets; POST /api/kits/:id/license
   │ POST /api/kits/:id/checkout                 │ funded mandate token (mdt_…), argument or Bearer
   ▼                                             ▼
 server prices the kit from the catalogue      server prices the items, reserves them against the mandate
   │                                             │
 Orders v2 create (CAPTURE, DIGITAL_GOODS)     Orders v2 create with payment_source.paypal.vault_id
   │ → approve_url + claim_token                 │ (PayPal returns it COMPLETED in the same call)
   ▼                                             │
 person approves in PayPal                       │
   │ → /checkout/return?kit=<id> (captures)      │
   ▼                                             │
 POST /api/kits/:id/claim (captures if needed)   │
   └─────────────────────┬───────────────────────┘
                         ▼
   amount + currency checked ──► licence tokens ──► royalty split (ledger) ──► payout held 14 days
                                                                                    │
                                                                                    ▼
                                                              releaseDuePayouts() ──► Payouts batch

 webhooks (signature verified): ORDER.APPROVED → capture · CAPTURE.COMPLETED / DENIED · CAPTURE.REFUNDED /
 REVERSED → revoke licences · PAYOUTS-ITEM.* → payout status
```

## 1. The server sets the price

`server/kits.js` `cleanKit()`; `server/commerce.js` `priceCart()`, `createCheckout()`, `buyWithMandate()`

A kit is planned from a one-line vibe (`planKit()`, Claude or a keyword fallback), then `cleanKit()` keeps only real
sound assets, resolves each part's knobs against its schema, and takes each price from the catalogue. A licence is
to the program, so a kit charges each program once: a second part on the same program is marked `covered` and
priced at 0. `kits.billItems()` passes only the paid parts on.

At checkout `priceCart()` looks every item up again and uses `asset.price`; the client sends only asset IDs and
knobs (tested: *prices come from the server, never the client*). Free items are dropped, and a cart of only free
items is refused.

## 2. Orders v2: create

`server/paypal.js` `createOrder()` (checkout) and `createVaultedOrder()` (budget)

`createOrder()` follows PayPal's reference server, `paypal-examples/docs-examples`,
`standard-integration/server/node/server.js`, as its header comment says:

- `@paypal/paypal-server-sdk` `OrdersController.createOrder`, `intent: CAPTURE`
- one purchase unit with itemised `items[]` (`category: DIGITAL_GOODS`, a `sku` per part of the form
  `<assetId>:<ref>:<i>`) and `amount.breakdown.item_total` equal to the sum
- `payment_source.paypal.experience_context`: `brand_name: Oasis`, `user_action: PAY_NOW`,
  `shipping_preference: NO_SHIPPING`, `return_url`, `cancel_url`
- `PayPal-Request-Id: oasis-create-<ref>`, so a retried create returns the same order

For a kit, `POST /api/kits/:id/checkout` (`server/app.js`) sets `return_url` to `/checkout/return?kit=<id>` and
`cancel_url` to `/#/kit/<id>`, and answers `{ order_id, approve_url, claim_token, total_usd }`. It refuses a kit
that is already licensed (409).

`createVaultedOrder()` builds the same itemised order with
`payment_source.paypal.vault_id` and `stored_credential: { payment_initiator: MERCHANT, usage: SUBSEQUENT,
usage_pattern: UNSCHEDULED_PREPAID }`, with `PayPal-Request-Id: oasis-agent-<ref>`.

## 3. Approval

**Checkout.** The kit page (`public/kits.js`), the pads page (`public/pads.js`) and "License it" on a sound's page
(`public/sound-page.js`, which first makes a one-part kit through `POST /api/kits/single`) all call
`POST /api/kits/:id/checkout`, save `{ orderId, claimToken }` in `localStorage`, and send the browser to
`approve_url`. PayPal returns the person to `GET /checkout/return`, which tries a capture and redirects to
`/#/kit/<id>`; the kit page then calls `POST /api/kits/:id/claim` with the saved `order_id` and `claim_token`.

**Budget.** `POST /api/budgets` (the form on `/#/budget`) issues a funded mandate (`server/mandates.js` `issue()`
with `funded: true`) and creates a Vault v3 setup token (`server/paypal.js` `createSetupToken()`,
`POST /v3/vault/setup-tokens`, `usage_type: MERCHANT`, `usage_pattern: UNSCHEDULED_PREPAID`). The person approves it
in PayPal; PayPal returns them to `GET /budget/return`, which exchanges the setup token for a payment token
(`createPaymentToken()`, `POST /v3/vault/payment-tokens`) and marks the mandate active (`mandates.activate()`). The
response to `POST /api/budgets` carries the `mdt_…` token once; the server stores only its SHA-256.

A mandate is shaped after the `IntentMandate` in Google's AP2 (`code/sdk/python/ap2/models/mandate.py`, cited in the
header of `server/mandates.js`): a description, `intent_expiry` (1 to 168 hours), optional `skus`, a budget between
$1 and $500. `mandates.view()` also projects it as AP2's open payment mandate with a `payment.budget` constraint.
`reserve()` checks, under a per-mandate lock, that the mandate is active, not revoked, not expired, inside its SKUs
and has enough left, then holds the amount. A capture marks the hold `spent`; a decline, refund or amount mismatch
marks it `released`; an order that never completes stops holding budget after 3 hours (`UNCAPTURED_HOLD_MS`).
`POST /api/mandates/revoke` stops a token at once.

An agent spends a funded mandate through:

- MCP `buy_assets` and `make_kit` with `mandate` (`server/mcp.js`, `server/tools.js` `buyAssets()`, `makeKit()`)
- `POST /api/kits/:id/license` with `mandate` in the body or `Authorization: Bearer mdt_…`
- `POST /api/buy` with the Bearer token
- an x402-shaped retry of `GET /cdn/<id>.mjs` with a `PAYMENT-SIGNATURE` header whose payload carries the mandate
  (`server/registry.js` `settle()`)

All of these call `commerce.buyWithMandate()`. It refuses a mandate with no active vault (409), reserves the total,
calls `createVaultedOrder()`, and releases the hold if PayPal declines.

**Who owns an order.** Order IDs travel through PayPal URLs, so they are not secrets. `createCheckout()` gives each
order a 128-bit `claimToken`, returned once to its creator. `commerce.ownsOrder()` checks it in constant time. A
licensed kit's tokens, clean WAVs and module URLs are returned only to its owner: `kits.owns()` accepts the order's
claim token (`X-Claim-Token` header or `claim_token` in the body) or the mandate that paid for the order (`mandate`
in the body or as Bearer). MCP `get_kit` accepts only `mandate`. Anyone else sees the kit as licensed with those
fields set to null (tested: *a licensed kit's tokens and clean files reach its buyer only, not anyone who knows the
kit id*).

## 4. Capture, verified

`server/commerce.js` `capture()`, `doCapture()`, `amountOk()`, `fulfil()`

- Capture happens on the server only (`OrdersController.captureOrder`, `PayPal-Request-Id: oasis-capture-<id>`).
  `/checkout/return`, `POST /api/kits/:id/claim`, `POST /api/orders/:id/capture` and the `CHECKOUT.ORDER.APPROVED`
  webhook can all trigger it.
- **One capture per order:** concurrent captures are chained per order ID (`exclusive()`), and an order in a
  terminal state (`COMPLETED`, `REFUNDED`, `AMOUNT_MISMATCH`, `CAPTURE_PENDING`, `DENIED`) is never captured again
  (tested: three simultaneous captures produce one PayPal call).
- **Amount check:** licences are issued only when the captured `amount.value` equals the server's total and
  `currency_code` is `USD`. Otherwise the order becomes `AMOUNT_MISMATCH`, the mandate hold is released and the
  capture is refunded automatically (tested).
- **Pending captures:** the order becomes `CAPTURE_PENDING`, keeps its hold and issues nothing.
  `PAYMENT.CAPTURE.COMPLETED` finishes it (amount-checked again, `completeFromWebhook()`); `PAYMENT.CAPTURE.DENIED`
  or `DECLINED` marks it `DENIED` and releases the hold.
- `fulfil()` issues one licence token per paid item, writes one ledger row per royalty share, and holds the payouts
  (section 5).
- `POST /api/kits/:id/claim` then checks that the order covers every paid part of the kit and stores the licence on
  the kit (`kits.licenceOf()`, `via: "checkout"`, with the capture ID).

**What a licence delivers** (`server/kits.js` `view()`, `server/app.js` `sendFormat()`):

- `wav`: `GET /api/licenses/<token>/download.wav`, the part at its kit knobs, 44.1 kHz
- `module`: `GET /cdn/<assetId>.mjs?lic=<token>`, an importable program (`createSound`, `play`)
- `GET /api/licenses/<token>/render.wav?p=<knobs>`: a clean render at any knob values
- `GET /api/licenses/<token>/download.mjs`: the program source

A sound downloads only as `wav` or `mjs`; other formats answer 400. Free parts use
`/api/assets/<id>/download.wav` with no token. Paid previews (`/api/assets/<id>/render.wav`, MCP `preview_asset`)
carry a watermark tick.

## 5. Revenue split and payouts, held through the refund window

`server/commerce.js` `royaltySplit()`, `fulfil()`, `releaseDuePayouts()`; `server/paypal.js` `sendPayouts()`

The split comes from `config.split` in `server/config.js`: `platform: 1000` and `upstream: 3000` basis points.
For each paid item, in integer cents:

- the platform (`oasis`) takes 10%
- if the asset has a fork lineage, 30% goes upstream: all of it to the parent if there is one ancestor, otherwise
  two thirds to the parent and the rest shared among older ancestors
- the creator takes the remainder: 90% with no lineage, 60% for a fork

Sounds published through `server/publish.js` and loaded by `server/catalog.js` start with `lineage: []`; only
`POST /api/assets/:id/fork` (`server/fork.js`) creates a lineage. Every royalty row in the recorded data is the
90/10 case. A creator with no payout email, or a platform author, has the share recorded in the ledger but not paid.

Payouts cannot be pulled back and buyers can refund for 14 days (`REFUND_WINDOW_MS`, overridable with
`OASIS_REFUND_WINDOW_MS`). So `fulfil()` stores the payout items on the order as `payoutHold` with `status: HELD`
and `releaseAfter` 14 days after capture. `releaseDuePayouts()` sends one Payouts batch per order once
`releaseAfter` has passed and the order is still `COMPLETED`, with `sender_batch_id` and `PayPal-Request-Id`
`oasis-<orderId>`; otherwise it marks the hold `CANCELLED`. It runs hourly only when the server is started through
`server/local.js` (`npm start`). The ledger (`GET /api/ledger`, `/#/ledger`) counts a share as paid out only once
its order's hold is `SENT`.

**Production path (future work, not built).** Payouts is enough for a sandbox marketplace with a few creators. At
scale the usual tool is PayPal Commerce Platform: onboard each creator as a seller and split at capture with a
`payee` per purchase unit and `platform_fees`, so a refund unwinds the split. `royaltySplit()` already produces the
per-party amounts that call would need.

## 6. Webhooks

`server/app.js` `POST /api/paypal/webhook`; `server/paypal.js` `verifyWebhook()`; `server/commerce.js`
`handleWebhook()`

Every event is checked with PayPal's `POST /v1/notifications/verify-webhook-signature` before anything else.
Without `PAYPAL_WEBHOOK_ID` set, `verifyWebhook()` returns false, so every event is rejected with 400 (tested:
*unsigned PayPal webhooks are rejected*). Each delivery, accepted or rejected, is logged and shown by
`GET /api/status`.

| Event | Effect |
|---|---|
| `CHECKOUT.ORDER.APPROVED` | captures a known order, so a person who closed the tab is still charged and licensed; the kit records the licence when its page next claims |
| `PAYMENT.CAPTURE.COMPLETED` | finishes a `CAPTURE_PENDING` order, or one whose capture response was missed |
| `PAYMENT.CAPTURE.DENIED`, `PAYMENT.CAPTURE.DECLINED` | marks the order `DENIED` and releases the mandate hold |
| `PAYMENT.CAPTURE.REFUNDED`, `PAYMENT.CAPTURE.REVERSED` | marks the order refunded and revokes its licences |
| `PAYMENT.PAYOUTS-ITEM.SUCCEEDED / UNCLAIMED / FAILED / RETURNED` | records each payout item's status |

`ensureWebhook(url)` in `server/paypal.js` can register a webhook for these types (without `DECLINED`), but
nothing in the server or `scripts/` calls it; register the webhook in the PayPal developer dashboard instead.

## 7. Refunds

`server/app.js` `POST /api/orders/:id/refund`; `server/commerce.js` `refund()`, `markRefunded()`

The caller must send the order's claim token as `X-Oasis-Claim` (for a kit, the `claim_token` from checkout). The
order must be `COMPLETED` and created less than 14 days ago. `refund()` calls
`PaymentsController.refundCapturedPayment` with `PayPal-Request-Id: oasis-refund-<id>`. `markRefunded()` releases
the mandate hold, cancels a held payout and revokes every licence on the order, so the licence's WAV downloads and
`/cdn/<id>.mjs?lic=` answer 410 (tested: *refunds revoke every licence on the order*).

A kit paid by the refunded order loses its licence too (`markRefunded()` clears `kit.licence` and records the refund
on the kit), so its page goes back to watermarked previews. One limit: there is no refund button in the UI, only
this endpoint.

## What has actually run

From the data directory of the local server used on 2026-10-05 and 06 (orders, ledger, mandates):

- **Two kit checkouts captured.** 97H109249N081403K ($22.00, Hearthside Tavern kit, capture 2SJ84518V9868791E) and
  9SS52993P3394003X ($23.00, Neon Rain Alley kit, capture 3CM92128GL1558305), each created by
  `POST /api/kits/:id/checkout` and claimed through `/claim`. `SUBMISSION.md` records that both were approved with
  PayPal's published sandbox test card through `confirm-payment-source` (as `scripts/kit-license-sandbox.mjs` does)
  rather than by a person logging in. Each wrote 18 ledger rows, creator and platform at 90/10.
- **Payouts held, not sent.** Both orders' payout holds are `HELD` until 2026-10-19; no batch has been sent for
  them. The creator emails are the catalogue's `*.oasis.example` addresses.
- **Six more checkout orders** were created and left `PAYER_ACTION_REQUIRED` (never approved).
- **One funded mandate** (mnd_a52d2604f2b3) created a real Vault setup token, 0KN46723RD198892M, which was never
  approved. The mandate is still `awaiting_approval` with no holds, so no payment token was created and **no
  `vault_id` order has run against the sandbox**. The budget path is covered only by the fake-client tests.
- **No webhook deliveries or payout statuses** are stored in that data.

An earlier build (before Oasis sold sounds) ran refunds and Payouts in the sandbox; see
[`docs/SANDBOX-RUN.md`](docs/SANDBOX-RUN.md): refund 8GM623335Y0788449 revoked a licence, and Payouts batch
CXTQ4BE5FC6GC was sent and last recorded as `PENDING`. No record shows any payout batch completing.

## Sandbox quickstart

```bash
npm install
cp .env.example .env
#   PAYPAL_CLIENT_ID=...       developer.paypal.com → Apps & Credentials → Sandbox → your app
#   PAYPAL_CLIENT_SECRET=...
#   ANTHROPIC_API_KEY=...      optional: without it kits are planned by keywords
npm start                      # http://localhost:8787 ; GET /api/config should say "paypalReady": true
```

1. **Pay for a kit in PayPal's window.** Open `http://localhost:8787/#/kits`, make a kit, click Pay with PayPal and
   approve with a sandbox *personal* account. You return to the kit page, which claims the licence; each part then
   has a clean WAV and a module URL.
2. **The same with a test card instead of a person:**
   ```bash
   KIT=$(curl -s -X POST localhost:8787/api/kits -H 'Content-Type: application/json' \
     -d '{"vibe":"cosy wooden tavern"}' | node -pe 'JSON.parse(require("fs").readFileSync(0)).id')
   node scripts/kit-license-sandbox.mjs http://localhost:8787 "$KIT"
   ```
3. **An agent over MCP.** `claude mcp add --transport http oasis http://localhost:8787/mcp`, or run
   `node scripts/mcp-kit-session.mjs http://localhost:8787/mcp`, which searches, previews and calls `make_kit`
   without a mandate (it rewrites `docs/mcp-kit-session.md`). To license through a budget, approve one at
   `/#/budget` and pass its `mdt_…` token to `make_kit` or `buy_assets`. This path has not yet run against the
   sandbox (see above).
4. **Webhooks** need a public URL. Expose the server (for example `cloudflared tunnel --url http://localhost:8787`),
   register `https://<host>/api/paypal/webhook` in the sandbox app for the events in section 6, set
   `PAYPAL_WEBHOOK_ID`, and restart. Deliveries then appear in `GET /api/status` with `verified` and their effect.

`npm run sandbox-demo` (`scripts/sandbox-demo.mjs`) and `scripts/mcp-agent.mjs` still exist but call the MCP
tools `create_order` (and, in `sandbox-demo`, `get_order`), which `server/mcp.js` no longer exposes, so they do not
work against this build.
