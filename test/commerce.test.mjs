// The order lifecycle against a fake PayPal: pricing, capture verification, the capture lock,
// refunds revoking licences, webhook handling and royalty payouts.
import { test, before } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

process.env.OASIS_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "oasis-test-"));
process.env.PAYPAL_CLIENT_ID = "test";
process.env.PAYPAL_CLIENT_SECRET = "test";
const catalog = await import("../server/catalog.js");
const commerce = await import("../server/commerce.js");
const store = await import("../server/store.js");

function fakePaypal({ captureAmount, captureStatus = "COMPLETED", declineFirst = false } = {}) {
  const calls = { create: [], capture: 0, refunds: [], payouts: [] };
  let n = 0;
  return {
    calls,
    async createOrder(lines, opts) { calls.create.push({ lines, opts }); return { id: `ORDER${++n}`, status: "CREATED", links: [{ rel: "payer-action", href: "https://sandbox.paypal.com/checkoutnow?token=x" }] }; },
    async captureOrder(id) {
      calls.capture++;
      await new Promise((r) => setTimeout(r, 20));
      if (declineFirst && calls.capture === 1) throw Object.assign(new Error("UNPROCESSABLE_ENTITY: INSTRUMENT_DECLINED"), { status: 422 });
      const o = await store.get("orders", id);
      const value = (captureAmount ?? o.total).toFixed(2);
      return { id, status: "COMPLETED", payer: { name: { given_name: "Ada", surname: "Lovelace" }, email_address: "buyer@example.com" }, purchase_units: [{ payments: { captures: [{ id: `CAP-${id}`, status: captureStatus, ...(captureStatus === "PENDING" ? { status_details: { reason: "ECHECK" } } : {}), amount: { currency_code: "USD", value } }] } }] };
    },
    async refundCapture(captureId, opts) { calls.refunds.push({ captureId, opts }); return { id: `REF-${captureId}`, status: "COMPLETED" }; },
    async sendPayouts(batchId, items) { calls.payouts.push({ batchId, items }); return { batch_header: { payout_batch_id: `PB-${batchId}`, batch_status: "PENDING" } }; },
  };
}

before(async () => { await catalog.load(); });

test("prices come from the server, never the client", async () => {
  const pp = fakePaypal();
  commerce.setPaypalClient(pp);
  const o = await commerce.createCheckout([{ assetId: "pricing-card", knobs: { accent: "#FF0000" }, price: 0.01 }]);
  assert.equal(o.total, catalog.getAsset("pricing-card").price);
  assert.equal(pp.calls.create[0].lines[0].price, catalog.getAsset("pricing-card").price);
});

test("free-only carts are refused", async () => {
  commerce.setPaypalClient(fakePaypal());
  await assert.rejects(commerce.createCheckout([{ assetId: "line-icons" }]), /free/);
});

test("capture issues one licence per item and is idempotent under a race", async () => {
  const pp = fakePaypal();
  commerce.setPaypalClient(pp);
  const o = await commerce.createCheckout([{ assetId: "pricing-card" }, { assetId: "retro-sunset-poster" }]);
  const [a, b, c] = await Promise.all([commerce.capture(o.id), commerce.capture(o.id), commerce.capture(o.id)]);
  assert.equal(pp.calls.capture, 1, "browser, return URL and webhook racing must capture once");
  assert.equal(a.status, "COMPLETED");
  assert.equal(a.licenses.length, 2);
  assert.deepEqual(a.licenses, b.licenses);
  const again = await commerce.capture(o.id);
  assert.equal(pp.calls.capture, 1);
  assert.equal(again.licenses.length, 2);
});

test("a capture for the wrong amount grants nothing and is refunded", async () => {
  const pp = fakePaypal({ captureAmount: 0.5 });
  commerce.setPaypalClient(pp);
  const o = await commerce.createCheckout([{ assetId: "pricing-card" }]);
  await assert.rejects(commerce.capture(o.id), /expected/);
  const saved = await store.get("orders", o.id);
  assert.equal(saved.status, "AMOUNT_MISMATCH");
  assert.equal(saved.licenses, undefined);
  assert.equal(pp.calls.refunds.length, 1);
});

test("refunds revoke every licence on the order", async () => {
  const pp = fakePaypal();
  commerce.setPaypalClient(pp);
  const o = await commerce.createCheckout([{ assetId: "pricing-card" }]);
  const done = await commerce.capture(o.id);
  const token = done.licenses[0].token;
  assert.ok(await commerce.license(token));
  await commerce.refund(o.id, { reason: "changed my mind" });
  await assert.rejects(commerce.license(token), /refunded/);
});

test("webhooks: approval captures, refund events revoke, payout events are recorded", async () => {
  const pp = fakePaypal();
  commerce.setPaypalClient(pp);
  const o = await commerce.createCheckout([{ assetId: "pricing-card" }]);
  assert.equal(await commerce.handleWebhook({ event_type: "CHECKOUT.ORDER.APPROVED", resource: { id: o.id } }), "captured");
  const done = await store.get("orders", o.id);
  assert.equal(done.status, "COMPLETED");
  assert.equal(await commerce.handleWebhook({ event_type: "PAYMENT.CAPTURE.REFUNDED", resource: { id: "R1", supplementary_data: { related_ids: { order_id: o.id } } } }), "revoked");
  await assert.rejects(commerce.license(done.licenses[0].token), /refunded/);
  await commerce.handleWebhook({ event_type: "PAYMENT.PAYOUTS-ITEM.UNCLAIMED", resource: { payout_item_id: "I1", transaction_status: "UNCLAIMED", payout_item: { sender_item_id: "X-0-creator" } } });
  assert.equal((await store.get("payouts", "X-0-creator")).status, "UNCLAIMED");
});

test("royalties are held through the refund window, then paid up the fork chain", async () => {
  const pp = fakePaypal();
  commerce.setPaypalClient(pp);
  const child = catalog.getAsset("lantern-fortune-tier-5b119cb5");
  const parent = catalog.getAsset(child.lineage[0]);
  child.payoutEmail = "fork-creator@example.com";
  parent.payoutEmail = "parent-creator@example.com";
  const o = await commerce.createCheckout([{ assetId: child.id }]);
  const done = await commerce.capture(o.id);
  assert.equal(pp.calls.payouts.length, 0, "nothing is paid while a refund is still possible");
  assert.equal(done.payoutHold.status, "HELD");
  assert.equal(done.royalties.reduce((s, r) => s + r.cents, 0), Math.round(child.price * 100));
  await commerce.releaseDuePayouts(Date.now() - 1000);
  assert.equal(pp.calls.payouts.length, 0, "not released before the window closes");
  await commerce.releaseDuePayouts(Date.now() + commerce.REFUND_WINDOW_MS + 1000);
  const items = pp.calls.payouts.find((b) => b.batchId === `oasis-${o.id}`).items;
  assert.equal(items.find((i) => i.email === "fork-creator@example.com").amount, +(child.price * 0.6).toFixed(2));
  assert.equal(items.find((i) => i.email === "parent-creator@example.com").amount, +(child.price * 0.2).toFixed(2));
});

test("a refund inside the window cancels held royalties, so creators are never paid on refunded sales", async () => {
  const pp = fakePaypal();
  commerce.setPaypalClient(pp);
  const child = catalog.getAsset("lantern-fortune-tier-5b119cb5");
  child.payoutEmail = "fork-creator@example.com";
  const o = await commerce.createCheckout([{ assetId: child.id }]);
  await commerce.capture(o.id);
  await commerce.refund(o.id, { reason: "test" });
  const before = pp.calls.payouts.length;
  await commerce.releaseDuePayouts(Date.now() + commerce.REFUND_WINDOW_MS + 1000);
  assert.equal(pp.calls.payouts.filter((b) => b.batchId === `oasis-${o.id}`).length, 0);
  assert.equal(pp.calls.payouts.length, before);
});

test("agent orders over the human's spending cap are refused; attribution reaches PayPal", async () => {
  const pp = fakePaypal();
  commerce.setPaypalClient(pp);
  await assert.rejects(commerce.createCheckout([{ assetId: "pricing-card" }, { assetId: "retro-sunset-poster" }], { agent: true, agentName: "Claude Code", maxTotal: 6 }), /cap/);
  const o = await commerce.createCheckout([{ assetId: "pricing-card" }], { agent: true, agentName: "Claude Code", maxTotal: 6 });
  assert.match(pp.calls.create.at(-1).opts.description, /Claude Code.*\$6 cap/);
  assert.equal(o.agentName, "Claude Code");
});

test("webhooks: PayPal's duplicate and replayed deliveries change nothing twice", async () => {
  const pp = fakePaypal();
  commerce.setPaypalClient(pp);
  const o = await commerce.createCheckout([{ assetId: "pricing-card" }]);
  const approved = { event_type: "CHECKOUT.ORDER.APPROVED", resource: { id: o.id } };
  await Promise.all([commerce.handleWebhook(approved), commerce.handleWebhook(approved)]);
  await commerce.handleWebhook(approved);
  assert.equal(pp.calls.capture, 1, "three deliveries, one capture");
  const once = await store.get("orders", o.id);
  assert.equal(once.licenses.length, 1);
  const refunded = { event_type: "PAYMENT.CAPTURE.REFUNDED", resource: { id: "R9", supplementary_data: { related_ids: { order_id: o.id } } } };
  await commerce.handleWebhook(refunded);
  await commerce.handleWebhook(refunded);
  const after = await store.get("orders", o.id);
  assert.equal(after.licenses.length, 1, "licences are revoked, not duplicated or recreated");
  await assert.rejects(commerce.license(after.licenses[0].token), /refunded/);
  // A late, replayed approval must not resurrect a refunded order.
  await commerce.handleWebhook(approved);
  assert.equal(pp.calls.capture, 1);
  await assert.rejects(commerce.license(after.licenses[0].token), /refunded/);
});

test("an order's licences belong to whoever created it: the order ID alone unlocks nothing", async () => {
  const pp = fakePaypal();
  commerce.setPaypalClient(pp);
  const tools = await import("../server/tools.js");
  const o = await tools.createOrder({ items: [{ assetId: "pricing-card" }], max_total_usd: 20, agent_name: "test agent" });
  assert.match(o.claimToken, /^[a-f0-9]{32}$/);
  const done = await commerce.capture(o.id);
  const stranger = commerce.publicOrder(done, "");
  assert.equal(stranger.owner, false);
  assert.equal(stranger.licenses, undefined, "no licence tokens without the claim");
  assert.equal(stranger.claimToken, undefined);
  const owner = commerce.publicOrder(done, o.claimToken);
  assert.equal(owner.licenses.length, 1);
  assert.equal(owner.claimToken, undefined, "the token is never echoed back");
  await assert.rejects(tools.getOrder({ order_id: o.id }), /claim_token/);
  await assert.rejects(tools.getOrder({ order_id: o.id, claim_token: "0".repeat(32) }), /claim_token/);
  const got = await tools.getOrder({ order_id: o.id, claim_token: o.claimToken });
  assert.equal(got.downloads.length, 1);
});

test("mandates: the human's budget is enforced by the server, not by what the agent says", async () => {
  const pp = fakePaypal();
  commerce.setPaypalClient(pp);
  const mandates = await import("../server/mandates.js");
  const tools = await import("../server/tools.js");
  const price = catalog.getAsset("pricing-card").price; // $5
  const { mandate, token } = await mandates.issue({ description: "Pricing cards for Lumen", maxTotalUsd: price * 2, expiresInHours: 1 });
  assert.equal(mandate.remaining_usd, price * 2);
  assert.equal((await store.get("mandates", mandate.id)).tokenHash.length, 64, "only a hash of the token is stored");

  // The agent claiming a huge cap changes nothing: the mandate decides.
  const a = await tools.createOrder({ items: [{ assetId: "pricing-card" }], mandate: token, max_total_usd: 9999 });
  assert.equal(a.mandateId, mandate.id);
  assert.match(pp.calls.create[0].opts.description, /budget you gave it/);
  // Two orders racing for the last $5: exactly one fits.
  const race = await Promise.allSettled([1, 2].map(() => tools.createOrder({ items: [{ assetId: "pricing-card" }], mandate: token })));
  assert.equal(race.filter((r) => r.status === "fulfilled").length, 1);
  assert.match(race.find((r) => r.status === "rejected").reason.message, /left/);
  assert.equal((await mandates.get(mandate.id)).remaining_usd, 0);

  // A refund gives the budget back; a capture keeps it spent.
  await commerce.capture(a.id);
  assert.equal((await mandates.get(mandate.id)).orders.find((o) => o.order_id === a.id).state, "spent");
  await commerce.handleWebhook({ event_type: "PAYMENT.CAPTURE.REFUNDED", resource: { id: "RM", supplementary_data: { related_ids: { order_id: a.id } } } });
  assert.equal((await mandates.get(mandate.id)).remaining_usd, price);

  // Forged, expired and SKU-limited mandates are refused.
  await assert.rejects(tools.createOrder({ items: [{ assetId: "pricing-card" }], mandate: "mdt_" + "0".repeat(40) }), /Unknown or revoked/);
  const old = await mandates.issue({ maxTotalUsd: 50, expiresInHours: 1, now: Date.now() - 2 * 3600_000 });
  await assert.rejects(tools.createOrder({ items: [{ assetId: "pricing-card" }], mandate: old.token }), /expired/);
  const narrow = await mandates.issue({ maxTotalUsd: 50, skus: ["app-icon"] });
  await assert.rejects(tools.createOrder({ items: [{ assetId: "pricing-card" }], mandate: narrow.token }), /only allows/);
  // An order nobody approves stops holding budget after the hold window.
  const idle = await mandates.issue({ maxTotalUsd: price });
  await tools.createOrder({ items: [{ assetId: "pricing-card" }], mandate: idle.token });
  assert.equal((await mandates.get(idle.mandate.id)).remaining_usd, 0);
  const later = mandates.view(await store.get("mandates", idle.mandate.id), Date.now() + mandates.UNCAPTURED_HOLD_MS + 1000);
  assert.equal(later.remaining_usd, price);
});

test("failure modes PayPal really produces: declined card, pending capture, out-of-order and denied captures", async () => {
  const mandates = await import("../server/mandates.js");
  const tools = await import("../server/tools.js");
  const capEvent = (o, type, value = o.total) => ({ event_type: type, resource: { id: `CAP-${o.id}`, status: type.split(".").pop(), amount: { currency_code: "USD", value: value.toFixed(2) }, supplementary_data: { related_ids: { order_id: o.id } } } });

  // INSTRUMENT_DECLINED: nothing is recorded as paid, and the payer's retry (actions.restart()) captures normally.
  let pp = fakePaypal({ declineFirst: true });
  commerce.setPaypalClient(pp);
  const d = await commerce.createCheckout([{ assetId: "pricing-card" }]);
  await assert.rejects(commerce.capture(d.id), /INSTRUMENT_DECLINED/);
  assert.equal((await store.get("orders", d.id)).status, "CREATED");
  assert.equal((await commerce.capture(d.id)).status, "COMPLETED");

  // PENDING (an eCheck): no licences, budget stays held, no second capture; PAYMENT.CAPTURE.COMPLETED finishes it once.
  pp = fakePaypal({ captureStatus: "PENDING" });
  commerce.setPaypalClient(pp);
  const { token } = await mandates.issue({ maxTotalUsd: 20 });
  const p = await tools.createOrder({ items: [{ assetId: "pricing-card" }], mandate: token });
  const pending = await commerce.capture(p.id);
  assert.equal(pending.status, "CAPTURE_PENDING");
  assert.equal(pending.pendingReason, "ECHECK");
  assert.equal(pending.licenses, undefined);
  await commerce.handleWebhook({ event_type: "CHECKOUT.ORDER.APPROVED", resource: { id: p.id } });
  assert.equal(pp.calls.capture, 1, "a pending capture is never captured again");
  await Promise.all([commerce.handleWebhook(capEvent(p, "PAYMENT.CAPTURE.COMPLETED")), commerce.handleWebhook(capEvent(p, "PAYMENT.CAPTURE.COMPLETED"))]);
  const cleared = await store.get("orders", p.id);
  assert.equal(cleared.status, "COMPLETED");
  assert.equal(cleared.licenses.length, 1, "duplicate COMPLETED deliveries issue one licence");
  assert.equal((await mandates.get(p.mandateId)).orders[0].state, "spent");

  // PENDING then DENIED: the order is closed and the mandate gets its budget back.
  const q = await tools.createOrder({ items: [{ assetId: "pricing-card" }], mandate: token });
  await commerce.capture(q.id);
  await commerce.handleWebhook(capEvent(q, "PAYMENT.CAPTURE.DENIED"));
  assert.equal((await store.get("orders", q.id)).status, "DENIED");
  assert.equal((await mandates.get(q.mandateId)).orders.find((o) => o.order_id === q.id).state, "released");

  // Out of order: COMPLETED arrives before our own capture call finishes, or with no capture call at all.
  pp = fakePaypal();
  commerce.setPaypalClient(pp);
  const r = await commerce.createCheckout([{ assetId: "pricing-card" }]);
  await commerce.handleWebhook(capEvent(r, "PAYMENT.CAPTURE.COMPLETED"));
  assert.equal((await store.get("orders", r.id)).status, "COMPLETED");
  await commerce.capture(r.id);
  assert.equal(pp.calls.capture, 0, "PayPal already captured it; Oasis doesn't call capture again");

  // A COMPLETED webhook for the wrong amount is refunded, never licensed.
  const w = await commerce.createCheckout([{ assetId: "pricing-card" }]);
  await commerce.handleWebhook(capEvent(w, "PAYMENT.CAPTURE.COMPLETED", w.total + 1));
  assert.equal((await store.get("orders", w.id)).status, "AMOUNT_MISMATCH");
  assert.equal(pp.calls.refunds.at(-1).captureId, `CAP-${w.id}`);

  // Payout items that bounce are recorded with their final status.
  await commerce.handleWebhook({ event_type: "PAYMENT.PAYOUTS-ITEM.FAILED", resource: { payout_item_id: "I9", transaction_status: "FAILED", payout_item: { sender_item_id: "Y-0-creator" } } });
  assert.equal((await store.get("payouts", "Y-0-creator")).status, "FAILED");
});

test("mandates: the human can revoke one at once, and every agent order is in its audit log", async () => {
  const pp = fakePaypal();
  commerce.setPaypalClient(pp);
  const mandates = await import("../server/mandates.js");
  const tools = await import("../server/tools.js");
  const { mandate, token } = await mandates.issue({ maxTotalUsd: 50 });
  const o = await tools.createOrder({ items: [{ assetId: "pricing-card" }], mandate: token, agent_name: "Cursor agent" });
  const log = (await mandates.get(mandate.id)).orders;
  assert.equal(log[0].order_id, o.id);
  assert.equal(log[0].agent_name, "Cursor agent");
  const revoked = await mandates.revoke(token);
  assert.ok(revoked.revoked_at);
  assert.equal(revoked.remaining_usd, 0);
  await assert.rejects(tools.createOrder({ items: [{ assetId: "pricing-card" }], mandate: token }), /revoked/);
});
