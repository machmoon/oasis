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
human approves in PayPal  (Smart Buttons popup, or the payer-action link an agent hands over)
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

- **In the store and the agent chat:** PayPal JS SDK Smart Buttons (`public/app.js` → `mountPayPal`),
  `createOrder` → `onApprove` → server capture, including the `INSTRUMENT_DECLINED` → `actions.restart()` path
  from PayPal's reference client.
- **From an outside agent over MCP:** `create_order` returns the order's `payer-action` link. The agent hands it
  to the human; PayPal redirects back to `/checkout/return`, which captures.

The agent never holds a payment method. It can create an order; only a human can approve one.

## 4. Capture, verified

`server/commerce.js` → `capture()` / `doCapture()`

- capture happens on the server only (`OrdersController.captureOrder`, `PayPal-Request-Id: oasis-capture-<id>`)
- **one capture per order:** the browser, the return URL and a webhook can all arrive at once, so captures are
  coalesced per order (tested: three simultaneous captures produce one PayPal call)
- **amount check:** licences are issued only when the captured `amount.value` and `currency_code` equal what the
  server priced. A mismatch marks the order `AMOUNT_MISMATCH` and is refunded automatically (tested)
- each item gets a licence token; downloads are `GET /api/licenses/<token>/download.{svg|png|jsx|css|mjs}`

## 5. Royalties through Payouts

`server/commerce.js` → `royaltySplit()`; `server/paypal.js` → `sendPayouts()`

Each licence of a fork pays its creator 60%, its ancestors 30% (the parent takes two thirds of that, older
ancestors share the rest) and Oasis 10%, computed in integer cents so the parts always sum to the price (tested
across prices like $7.99). Creators with a PayPal email are paid in one Payouts batch, idempotent on
`sender_batch_id = oasis-<orderId>`; creators without one are recorded as held.

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

## Running it in the sandbox

1. developer.paypal.com → Apps & Credentials → Sandbox → your app: copy the client id and secret into `.env`
   (`PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`).
2. Testing tools → Sandbox accounts: use the *personal* account to pay in the popup; use another account's
   email as a fork's payout email to watch royalties arrive.
3. For webhooks: expose the server, register `https://<host>/api/paypal/webhook`, and set `PAYPAL_WEBHOOK_ID`.
