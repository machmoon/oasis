# Oasis against the PayPal sandbox

Run 2026-10-02T17:31:56.446Z by `npm run sandbox-demo`. Every ID below is a real PayPal sandbox object.

**Approval was automated:** each order was approved with one of PayPal's published sandbox test cards (`confirm-payment-source`) instead of a person logging in to PayPal's window. Capture, the amount check, licences, the refund and Payouts all ran through Oasis's normal code against the real sandbox.

## 1. Mandate issued by the human

- mnd_a17538cc068d: $20, expires 2026-10-02T18:31:56.465Z

## 2. An order over the mandate

- refused: Order total $25.00 is over what mandate mnd_a17538cc068d has left ($20.00 of $20.00). Ask the human to issue a larger mandate.

## 3. Order created by the agent

- PayPal order 47M93830FG9553221, $5
- approve_url https://www.sandbox.paypal.com/checkoutnow?token=47M93830FG9553221

## 4. Approved, captured, licensed

- status COMPLETED, capture 56834260T0051970X
- licensed SVG download: HTTP 200
- same order without the claim token shows licences: false

## 5. Refunded through the Payments API

- order status REFUNDED, refund 8GM623335Y0788449
- licensed download after refund: HTTP 410
- mandate remaining $20 of $20

## 6. A fork of a fork, royalties through Payouts

- PayPal order 8V3397808V699150W, capture 7BX91257JM822105U, $8
- creator Pat Liu: $4.80 to oasis-creator@example.com
- parent Pat Liu: $1.60 to oasis-parent@example.com
- ancestor oasis: $0.80 (platform)
- platform oasis: $0.80 (platform)
- royalties held at capture: HELD; after the refund window (clock fast-forwarded): Payouts batch CXTQ4BE5FC6GC (PENDING)

