// Carts become PayPal orders; captured orders become licences; licence revenue flows back up the
// fork lineage as royalties, paid with PayPal Payouts.
import crypto from "node:crypto";
import * as catalog from "./catalog.js";
import * as paypalApi from "./paypal.js";

// The PayPal client is injectable so the order lifecycle can be tested without network calls.
let paypal = paypalApi;
export function setPaypalClient(client) { paypal = client || paypalApi; }
import * as store from "./store.js";
import { config } from "./config.js";
import { diffFromDefaults } from "./knobs.js";

const PLATFORM_AUTHORS = new Set(["oasis", "oasis-factory"]);

/** Validates a cart against the live catalogue: prices always come from the server. */
export function priceCart(items = []) {
  const lines = [];
  for (const it of items.slice(0, 50)) {
    const a = catalog.getAsset(it.assetId);
    if (!a) throw Object.assign(new Error(`Unknown asset ${it.assetId}`), { status: 400 });
    const values = catalog.resolveInput(a, it.knobs);
    lines.push({ asset: a, values, price: a.price });
  }
  return lines;
}

export async function createCheckout(items, { agent = false, agentName = null, maxTotal = null, returnUrl, cancelUrl } = {}) {
  const lines = priceCart(items).filter((l) => l.price > 0);
  if (!lines.length) throw Object.assign(new Error("Nothing to pay for: every item in the cart is free."), { status: 400 });
  const total = lines.reduce((s, l) => s + l.price, 0);
  // An agent's order can never exceed the cap its human set; the server enforces it, not the model.
  if (maxTotal !== null && maxTotal !== undefined && total > Number(maxTotal) + 1e-9) {
    throw Object.assign(new Error(`Order total $${total.toFixed(2)} is over the $${Number(maxTotal).toFixed(2)} spending cap. Remove items or ask the human to raise the cap.`), { status: 402 });
  }
  const ref = crypto.randomBytes(6).toString("hex");
  const order = await paypal.createOrder(
    lines.map((l, i) => ({
      name: `${l.asset.title} — remix licence`,
      sku: `${l.asset.id}:${ref}:${i}`,
      price: l.price,
      description: Object.entries(diffFromDefaults(l.asset.params, l.values)).slice(0, 4).map(([k, v]) => `${k}=${v}`).join(", ") || "default knobs",
      url: `${config.baseUrl}/#/a/${l.asset.id}`,
    })),
    { returnUrl, cancelUrl, customId: ref, description: agent ? `Requested by ${agentName || "an AI agent"} on Oasis${maxTotal ? `, within your $${Number(maxTotal).toFixed(0)} cap` : ""}. You approve; the agent cannot pay.` : undefined },
  );
  const doc = {
    id: order.id,
    ref,
    status: order.status,
    agent,
    agentName: agent ? agentName || "AI agent" : null,
    maxTotal: maxTotal ?? null,
    createdAt: new Date().toISOString(),
    total: lines.reduce((s, l) => s + l.price, 0),
    items: lines.map((l) => ({ assetId: l.asset.id, title: l.asset.title, price: l.price, knobs: l.values })),
    approveUrl: order.links?.find((x) => x.rel === "payer-action" || x.rel === "approve")?.href || null,
  };
  await store.put("orders", order.id, doc);
  return doc;
}

/** Splits one sale between the asset's creator, its ancestors and the platform (all in cents). */
export function royaltySplit(asset, price) {
  const cents = Math.round(price * 100);
  const shares = [];
  const pay = (author, email, c, role) => {
    if (c <= 0) return;
    if (PLATFORM_AUTHORS.has(author) || !email) shares.push({ author: PLATFORM_AUTHORS.has(author) ? "oasis" : author, email: null, cents: c, role, held: !PLATFORM_AUTHORS.has(author) });
    else shares.push({ author, email, cents: c, role });
  };
  const platform = Math.round((cents * config.split.platform) / 10000);
  const ancestors = (asset.lineage || []).map((id) => catalog.getAsset(id)).filter(Boolean);
  let upstream = ancestors.length ? Math.round((cents * config.split.upstream) / 10000) : 0;
  const creator = cents - platform - upstream;
  pay(asset.author, asset.payoutEmail, creator, "creator");
  // Parent takes two thirds of the upstream pool; older ancestors share the rest equally.
  if (ancestors.length) {
    const parentCut = ancestors.length === 1 ? upstream : Math.round((upstream * 2) / 3);
    pay(ancestors[0].author, ancestors[0].payoutEmail, parentCut, "parent");
    const rest = upstream - parentCut;
    const older = ancestors.slice(1);
    older.forEach((a, i) => pay(a.author, a.payoutEmail, Math.floor(rest / older.length) + (i < rest % older.length ? 1 : 0), "ancestor"));
  }
  shares.push({ author: "oasis", email: null, cents: platform, role: "platform" });
  return shares;
}

// One capture per order at a time: the browser, the return URL and a webhook can all race to capture.
const capturing = new Map();
export function capture(orderId) {
  if (!capturing.has(orderId)) capturing.set(orderId, doCapture(orderId).finally(() => capturing.delete(orderId)));
  return capturing.get(orderId);
}

async function doCapture(orderId) {
  const existing = await store.get("orders", orderId);
  if (!existing) throw Object.assign(new Error("Unknown order"), { status: 404 });
  // Terminal states never capture again: a replayed APPROVED webhook must not resurrect a refunded order.
  if (["COMPLETED", "REFUNDED", "AMOUNT_MISMATCH"].includes(existing.status)) return existing;
  const result = await paypal.captureOrder(orderId);
  const cap = result.purchase_units?.[0]?.payments?.captures?.[0];
  // Licences are only issued for exactly the amount and currency this server priced.
  const paid = Number(cap?.amount?.value), expected = Number(existing.total.toFixed(2));
  if (cap?.status === "COMPLETED" && (cap.amount?.currency_code !== "USD" || Math.abs(paid - expected) > 0.001)) {
    existing.status = "AMOUNT_MISMATCH";
    existing.captureId = cap.id;
    await store.put("orders", orderId, existing);
    await paypal.refundCapture(cap.id, { note: "Amount did not match the Oasis price; refunded automatically.", requestId: `oasis-mismatch-${orderId}` }).catch(() => {});
    throw Object.assign(new Error(`Captured ${cap.amount?.value} ${cap.amount?.currency_code}, expected ${expected} USD; refunded`), { status: 409 });
  }
  if (result.status !== "COMPLETED" || cap?.status !== "COMPLETED") {
    existing.status = result.status;
    await store.put("orders", orderId, existing);
    throw Object.assign(new Error(`Payment not completed (${cap?.status || result.status})`), { status: 402 });
  }
  const payer = result.payer || {};
  existing.status = "COMPLETED";
  existing.captureId = cap.id;
  existing.payer = { name: [payer.name?.given_name, payer.name?.surname].filter(Boolean).join(" "), email: payer.email_address };
  existing.licenses = [];
  const payouts = [];
  const ledger = [];
  for (const [i, item] of existing.items.entries()) {
    const token = crypto.randomBytes(16).toString("hex");
    const asset = catalog.getAsset(item.assetId);
    await store.put("licenses", token, { token, orderId, assetId: item.assetId, title: item.title, knobs: item.knobs, price: item.price, licensee: existing.payer, createdAt: new Date().toISOString() });
    existing.licenses.push({ token, assetId: item.assetId, title: item.title });
    for (const s of royaltySplit(asset, item.price)) {
      ledger.push({ orderId, assetId: item.assetId, title: item.title, ...s, at: new Date().toISOString() });
      if (s.email && s.role !== "platform") payouts.push({ email: s.email, amount: s.cents / 100, note: `Royalty for ${item.title}`, ref: `${orderId}-${i}-${s.role}` });
    }
  }
  existing.royalties = ledger;
  // Royalties are held until the refund window closes: Payouts can't be pulled back, refunds can arrive
  // for 14 days. releaseDuePayouts() pays held royalties once an order is past the window and not refunded.
  // (In production, PayPal Commerce Platform splits at capture with platform fees; see PAYPAL.md.)
  if (payouts.length) {
    existing.payoutHold = { items: payouts, releaseAfter: new Date(Date.now() + REFUND_WINDOW_MS).toISOString(), status: "HELD" };
  }
  await store.put("orders", orderId, existing);
  for (const [i, l] of ledger.entries()) await store.put("ledger", `${orderId}-${i}`, l);
  return existing;
}

export async function license(token) {
  const lic = await store.get("licenses", token);
  if (!lic) throw Object.assign(new Error("Unknown licence"), { status: 404 });
  if (lic.revoked) throw Object.assign(new Error("This licence was refunded and is no longer valid"), { status: 410 });
  return lic;
}

export const REFUND_WINDOW_MS = Number(process.env.OASIS_REFUND_WINDOW_MS) || 14 * 864e5;

/** Pays every held royalty whose order is past the refund window and wasn't refunded. Idempotent per order. */
export async function releaseDuePayouts(now = Date.now()) {
  const released = [];
  for (const o of await store.list("orders")) {
    const h = o.payoutHold;
    if (!h || h.status !== "HELD" || Date.parse(h.releaseAfter) > now) continue;
    if (o.status !== "COMPLETED") { h.status = "CANCELLED"; await store.put("orders", o.id, o); continue; }
    try {
      const batch = await paypal.sendPayouts(`oasis-${o.id}`, h.items);
      h.status = "SENT";
      o.payoutBatch = { id: batch.batch_header?.payout_batch_id, status: batch.batch_header?.batch_status, count: h.items.length };
      released.push(o.id);
    } catch (e) {
      o.payoutBatch = { error: e.message, count: h.items.length };
    }
    await store.put("orders", o.id, o);
  }
  return released;
}

/** Buyer refund within 14 days: refunds the PayPal capture and revokes every licence on the order. */
export async function refund(orderId, { reason = "Refund requested" } = {}) {
  const o = await store.get("orders", orderId);
  if (!o) throw Object.assign(new Error("Unknown order"), { status: 404 });
  if (o.status !== "COMPLETED") throw Object.assign(new Error(`Order is ${o.status}`), { status: 409 });
  if (Date.now() - Date.parse(o.createdAt) > REFUND_WINDOW_MS) throw Object.assign(new Error("Refund window (14 days) has passed"), { status: 409 });
  const r = await paypal.refundCapture(o.captureId, { note: reason.slice(0, 200), requestId: `oasis-refund-${orderId}` });
  await markRefunded(o, r.id);
  return o;
}

async function markRefunded(o, refundId) {
  o.status = "REFUNDED";
  o.refundId = refundId;
  if (o.payoutHold?.status === "HELD") o.payoutHold.status = "CANCELLED";
  for (const l of o.licenses || []) {
    const lic = await store.get("licenses", l.token);
    if (lic) await store.put("licenses", l.token, { ...lic, revoked: true, revokedAt: new Date().toISOString() });
  }
  await store.put("orders", o.id, o);
}

/** PayPal webhooks: the source of truth when a browser tab closes before capture or a payout settles. */
export async function handleWebhook(event) {
  const r = event.resource || {};
  switch (event.event_type) {
    case "CHECKOUT.ORDER.APPROVED":
      if (await store.get("orders", r.id)) await capture(r.id);
      return "captured";
    case "PAYMENT.CAPTURE.REFUNDED":
    case "PAYMENT.CAPTURE.REVERSED": {
      const orderId = r.supplementary_data?.related_ids?.order_id;
      const o = orderId && (await store.get("orders", orderId));
      if (o && o.status !== "REFUNDED") await markRefunded(o, r.id);
      return "revoked";
    }
    case "PAYMENT.PAYOUTS-ITEM.SUCCEEDED":
    case "PAYMENT.PAYOUTS-ITEM.UNCLAIMED":
    case "PAYMENT.PAYOUTS-ITEM.FAILED":
    case "PAYMENT.PAYOUTS-ITEM.RETURNED": {
      const ref = r.payout_item?.sender_item_id;
      if (ref) await store.put("payouts", ref, { ref, status: r.transaction_status, itemId: r.payout_item_id, at: new Date().toISOString() });
      return "payout updated";
    }
    default:
      return "ignored";
  }
}
