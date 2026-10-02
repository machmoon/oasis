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

function fakePaypal({ captureAmount } = {}) {
  const calls = { create: [], capture: 0, refunds: [], payouts: [] };
  let n = 0;
  return {
    calls,
    async createOrder(lines, opts) { calls.create.push({ lines, opts }); return { id: `ORDER${++n}`, status: "CREATED", links: [{ rel: "payer-action", href: "https://sandbox.paypal.com/checkoutnow?token=x" }] }; },
    async captureOrder(id) {
      calls.capture++;
      await new Promise((r) => setTimeout(r, 20));
      const o = await store.get("orders", id);
      const value = (captureAmount ?? o.total).toFixed(2);
      return { id, status: "COMPLETED", payer: { name: { given_name: "Ada", surname: "Lovelace" }, email_address: "buyer@example.com" }, purchase_units: [{ payments: { captures: [{ id: `CAP-${id}`, status: "COMPLETED", amount: { currency_code: "USD", value } }] } }] };
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
