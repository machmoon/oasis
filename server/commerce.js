// Carts become PayPal orders; captured orders become licences; licence revenue flows back up the
// fork lineage as royalties, paid with PayPal Payouts.
import crypto from "node:crypto";
import { EventEmitter } from "node:events";
import * as mandates from "./mandates.js";
import * as catalog from "./catalog.js";
import * as paypalApi from "./paypal.js";

// The PayPal client is injectable so the order lifecycle can be tested without network calls.
let paypal = paypalApi;
export function setPaypalClient(client) { paypal = client || paypalApi; }
import * as store from "./store.js";
import { config } from "./config.js";
import { diffFromDefaults } from "./knobs.js";

/** Every completed sale, for the live feed (/api/feed). */
export const events = new EventEmitter();
events.setMaxListeners(200);

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

export async function createCheckout(items, { agent = false, agentName = null, maxTotal = null, mandate = null, worldId = null, returnUrl, cancelUrl } = {}) {
  const lines = priceCart(items).filter((l) => l.price > 0);
  if (!lines.length) throw Object.assign(new Error("Nothing to pay for: every item in the cart is free."), { status: 400 });
  const total = lines.reduce((s, l) => s + l.price, 0);
  // An agent's order can never exceed the cap its human set; the server enforces it, not the model.
  if (maxTotal !== null && maxTotal !== undefined && total > Number(maxTotal) + 1e-9) {
    throw Object.assign(new Error(`Order total $${total.toFixed(2)} is over the $${Number(maxTotal).toFixed(2)} spending cap. Remove items or ask the human to raise the cap.`), { status: 402 });
  }
  // A mandate is the human's budget, held by the server: unlike max_total_usd, the agent can't restate it.
  const hold = mandate ? await mandates.reserve(mandate, { totalUsd: total, assetIds: lines.map((l) => l.asset.id), agentName }) : null;
  const ref = crypto.randomBytes(6).toString("hex");
  const capText = hold ? `, within the $${(hold.mandate.budgetCents / 100).toFixed(0)} budget you gave it (mandate ${hold.mandate.id})` : maxTotal ? `, within your $${Number(maxTotal).toFixed(0)} cap` : "";
  let order;
  try {
  order = await paypal.createOrder(
    lines.map((l, i) => ({
      name: `${l.asset.title} — remix licence`,
      sku: `${l.asset.id}:${ref}:${i}`,
      price: l.price,
      description: Object.entries(diffFromDefaults(l.asset.params, l.values)).slice(0, 4).map(([k, v]) => `${k}=${v}`).join(", ") || "default knobs",
      url: `${config.baseUrl}/#/a/${l.asset.id}`,
    })),
    { returnUrl, cancelUrl, customId: ref, description: agent ? `Requested by ${agentName || "an AI agent"} on Oasis${capText}. You approve; the agent cannot pay.` : undefined },
  );
  } catch (e) {
    await hold?.release();
    throw e;
  }
  await hold?.bind(order.id);
  const doc = {
    id: order.id,
    ref,
    status: order.status,
    agent,
    agentName: agent ? agentName || "AI agent" : null,
    maxTotal: maxTotal ?? null,
    mandateId: hold?.mandate.id || null,
    worldId,
    createdAt: new Date().toISOString(),
    total: lines.reduce((s, l) => s + l.price, 0),
    items: lines.map((l) => ({ assetId: l.asset.id, title: l.asset.title, price: l.price, knobs: l.values })),
    approveUrl: order.links?.find((x) => x.rel === "payer-action" || x.rel === "approve")?.href || null,
    // Like Stripe's PaymentIntent client_secret: returned once, to whoever created the order, and required to
    // read its licences or refund it. Order IDs travel through PayPal URLs, so they can't be the secret.
    claimToken: crypto.randomBytes(16).toString("hex"),
  };
  await store.put("orders", order.id, doc);
  return doc;
}

/**
 * An agent buys with a funded mandate: one PayPal order charged to the human's vaulted wallet, no redirect.
 * The mandate's budget is reserved first (and released if PayPal declines), PayPal returns the order COMPLETED
 * in the same call, and the same fulfil() as human checkout issues licences and books each creator's royalty.
 */
export async function buyWithMandate(mandateToken, items, { agentName = null } = {}) {
  const m = await mandates.recordByToken(mandateToken);
  if (!m) throw Object.assign(new Error("Unknown or revoked mandate token. Ask the human for an Oasis budget at /#/budget."), { status: 403 });
  if (!m.vault) throw Object.assign(new Error(`Mandate ${m.id} is not funded: every order on it needs the human to approve in PayPal. Open the kit link and pay with PayPal, or ask the human to fund the budget at /#/budget.`), { status: 409 });
  const lines = priceCart(items);
  const paid = lines.filter((l) => l.price > 0);
  const total = paid.reduce((s, l) => s + l.price, 0);
  const ref = crypto.randomBytes(6).toString("hex");
  const doc = {
    id: null, ref, status: "CREATED", agent: true, agentName: agentName || "AI agent", mandateId: m.id, funded: true,
    createdAt: new Date().toISOString(), total,
    items: lines.map((l) => ({ assetId: l.asset.id, title: l.asset.title, price: l.price, knobs: l.values, author: l.asset.author })),
    claimToken: crypto.randomBytes(16).toString("hex"),
  };
  if (!paid.length) return freeLicences(doc);
  const hold = await mandates.reserve(mandateToken, { totalUsd: total, assetIds: paid.map((l) => l.asset.id), agentName });
  let order;
  try {
    order = await paypal.createVaultedOrder(
      paid.map((l, i) => ({
        name: `${l.asset.title} licence`, sku: `${l.asset.id}:${ref}:${i}`, price: l.price, url: `${config.baseUrl}/#/a/${l.asset.id}`,
        description: Object.entries(diffFromDefaults(l.asset.params, l.values)).slice(0, 4).map(([k, v]) => `${k}=${v}`).join(", ") || "default knobs",
      })),
      { vaultId: hold.mandate.vault.paymentTokenId, customId: ref, requestId: `oasis-agent-${ref}`, description: `Bought by ${doc.agentName} within your $${(hold.mandate.budgetCents / 100).toFixed(0)} Oasis budget (${m.id})` },
    );
  } catch (e) {
    await hold.release();
    throw Object.assign(new Error(`PayPal declined the charge on the saved wallet: ${e.message}. Nothing was licensed.`), { status: e.status === 422 ? 402 : e.status || 502 });
  }
  await hold.bind(order.id);
  doc.id = order.id;
  doc.status = order.status;
  doc.items = doc.items.filter((it) => it.price > 0);
  doc.freeItems = lines.filter((l) => l.price <= 0).map((l) => ({ assetId: l.asset.id, title: l.asset.title, knobs: l.values }));
  const p = order.payer || {};
  doc.payer = { name: [p.name?.given_name, p.name?.surname].filter(Boolean).join(" "), email: p.email_address || hold.mandate.vault.payerEmail };
  await store.put("orders", order.id, doc);
  const cap = order.purchase_units?.[0]?.payments?.captures?.[0];
  if (order.status !== "COMPLETED" || cap?.status !== "COMPLETED") {
    if (cap?.status === "PENDING") { doc.status = "CAPTURE_PENDING"; doc.captureId = cap.id; await store.put("orders", order.id, doc); return doc; }
    await mandates.settle(m.id, order.id, "released");
    doc.status = cap?.status || order.status;
    await store.put("orders", order.id, doc);
    throw Object.assign(new Error(`PayPal did not complete the payment (${doc.status}). Nothing was licensed.`), { status: 402 });
  }
  if (!(await amountOk(doc, cap))) throw Object.assign(new Error("Captured amount did not match; refunded"), { status: 409 });
  const done = await fulfil(doc, cap);
  for (const f of doc.freeItems) await issueFree(done, f);
  return done;
}

async function issueFree(o, f) {
  const token = crypto.randomBytes(16).toString("hex");
  await store.put("licenses", token, { token, orderId: o.id, assetId: f.assetId, title: f.title, knobs: f.knobs, price: 0, licensee: o.payer || {}, createdAt: new Date().toISOString() });
  o.licenses.push({ token, assetId: f.assetId, title: f.title });
  if (o.id) await store.put("orders", o.id, o);
}

async function freeLicences(doc) {
  doc.id = `free-${doc.ref}`; doc.status = "COMPLETED"; doc.licenses = [];
  for (const it of doc.items) await issueFree(doc, it);
  await store.put("orders", doc.id, doc);
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
  return exclusive(orderId, () => doCapture(orderId));
}
function exclusive(orderId, fn) {
  const prev = capturing.get(orderId) || Promise.resolve();
  const next = prev.catch(() => {}).then(fn);
  capturing.set(orderId, next);
  next.finally(() => { if (capturing.get(orderId) === next) capturing.delete(orderId); }).catch(() => {});
  return next;
}

const TERMINAL = ["COMPLETED", "REFUNDED", "AMOUNT_MISMATCH", "CAPTURE_PENDING", "DENIED"];

// Licences are only issued for exactly the amount and currency this server priced; anything else is refunded.
async function amountOk(existing, cap) {
  const paid = Number(cap?.amount?.value), expected = Number(existing.total.toFixed(2));
  if (cap?.amount?.currency_code === "USD" && Math.abs(paid - expected) <= 0.001) return true;
  existing.status = "AMOUNT_MISMATCH";
  existing.captureId = cap.id;
  await store.put("orders", existing.id, existing);
  await mandates.settle(existing.mandateId, existing.id, "released");
  await paypal.refundCapture(cap.id, { note: "Amount did not match the Oasis price; refunded automatically.", requestId: `oasis-mismatch-${existing.id}` }).catch(() => {});
  return false;
}

async function doCapture(orderId) {
  const existing = await store.get("orders", orderId);
  if (!existing) throw Object.assign(new Error("Unknown order"), { status: 404 });
  // Terminal states never capture again: a replayed APPROVED webhook must not resurrect a refunded order,
  // and a PENDING capture is finished by PayPal's PAYMENT.CAPTURE.COMPLETED webhook, not by capturing twice.
  if (TERMINAL.includes(existing.status)) return existing;
  const result = await paypal.captureOrder(orderId);
  const cap = result.purchase_units?.[0]?.payments?.captures?.[0];
  existing.payer = payerOf(result.payer);
  if (cap?.status === "COMPLETED" || cap?.status === "PENDING") {
    if (!(await amountOk(existing, cap))) throw Object.assign(new Error(`Captured ${cap.amount?.value} ${cap.amount?.currency_code}, expected ${existing.total.toFixed(2)} USD; refunded`), { status: 409 });
  }
  if (cap?.status === "PENDING") {
    // eChecks and risk reviews: PayPal has the money in flight. Hold the budget, issue nothing yet.
    existing.status = "CAPTURE_PENDING";
    existing.captureId = cap.id;
    existing.pendingReason = cap.status_details?.reason || null;
    await store.put("orders", orderId, existing);
    return existing;
  }
  if (result.status !== "COMPLETED" || cap?.status !== "COMPLETED") {
    existing.status = result.status;
    await store.put("orders", orderId, existing);
    throw Object.assign(new Error(`Payment not completed (${cap?.status || result.status})`), { status: 402 });
  }
  return fulfil(existing, cap);
}

const payerOf = (payer = {}) => ({ name: [payer.name?.given_name, payer.name?.surname].filter(Boolean).join(" "), email: payer.email_address });

/** PayPal says a capture completed (webhook): finish a pending order, or one whose own capture response we missed. */
export function completeFromWebhook(orderId, cap) {
  return exclusive(orderId, async () => {
    const existing = await store.get("orders", orderId);
    if (!existing || ["COMPLETED", "REFUNDED", "AMOUNT_MISMATCH", "DENIED"].includes(existing.status)) return existing;
    if (!(await amountOk(existing, cap))) return existing;
    return fulfil(existing, cap);
  });
}

async function fulfil(existing, cap) {
  const orderId = existing.id;
  existing.status = "COMPLETED";
  delete existing.pendingReason;
  existing.captureId = cap.id;
  await mandates.settle(existing.mandateId, orderId, "spent");
  existing.payer = existing.payer || {};
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
  events.emit("sale", saleEvent(existing));
  return existing;
}

/** A sale as the public feed shows it: who bought, what, and which creators earned how much. No secrets. */
export function saleEvent(o) {
  const creators = {};
  for (const r of o.royalties || []) if (r.role !== "platform") creators[r.author] = (creators[r.author] || 0) + r.cents;
  return {
    orderId: o.id, at: new Date().toISOString(), agent: o.agent ? o.agentName : null, funded: !!o.funded, total: o.total,
    items: o.items.map((i) => ({ assetId: i.assetId, title: i.title, price: i.price })),
    creators: Object.entries(creators).map(([author, cents]) => ({ author, usd: cents / 100 })),
    payoutAfter: o.payoutHold?.releaseAfter || null,
  };
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
  await mandates.settle(o.mandateId, o.id, "released"); // a refund gives the budget back
  if (o.payoutHold?.status === "HELD") o.payoutHold.status = "CANCELLED";
  for (const l of o.licenses || []) {
    const lic = await store.get("licenses", l.token);
    if (lic) await store.put("licenses", l.token, { ...lic, revoked: true, revokedAt: new Date().toISOString() });
  }
  // a kit paid by this order is unlicensed again (its previews come back), and keeps a note of the refund
  for (const k of await store.list("kits")) {
    if (k.licence?.orderId === o.id) await store.put("kits", k.id, { ...k, licence: null, refunded: { orderId: o.id, refundId, at: new Date().toISOString() }, updatedAt: new Date().toISOString() });
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
    case "PAYMENT.CAPTURE.COMPLETED": {
      const orderId = r.supplementary_data?.related_ids?.order_id;
      if (orderId && (await store.get("orders", orderId))) await completeFromWebhook(orderId, r);
      return "completed";
    }
    case "PAYMENT.CAPTURE.DENIED":
    case "PAYMENT.CAPTURE.DECLINED": {
      const orderId = r.supplementary_data?.related_ids?.order_id;
      const o = orderId && (await store.get("orders", orderId));
      if (o && o.status !== "COMPLETED" && o.status !== "REFUNDED") {
        o.status = "DENIED";
        await store.put("orders", orderId, o);
        await mandates.settle(o.mandateId, orderId, "released");
      }
      return "denied";
    }
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

/** Constant-time check of an order's claim token. */
export function ownsOrder(o, claim) {
  return !!(o?.claimToken && typeof claim === "string" && claim.length === o.claimToken.length && crypto.timingSafeEqual(Buffer.from(claim), Buffer.from(o.claimToken)));
}

/** What an order looks like over HTTP: status for anyone with the ID, licences and money trail only for its owner. */
export function publicOrder(o, claim) {
  const base = { id: o.id, status: o.status, total: o.total, createdAt: o.createdAt, agentName: o.agentName, maxTotal: o.maxTotal, items: o.items.map(({ assetId, title, price }) => ({ assetId, title, price })) };
  if (!ownsOrder(o, claim)) return { ...base, owner: false };
  const { claimToken, ...rest } = o;
  return { ...rest, owner: true };
}
