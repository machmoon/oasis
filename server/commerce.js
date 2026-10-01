// Carts become PayPal orders; captured orders become licences; licence revenue flows back up the
// fork lineage as royalties, paid with PayPal Payouts.
import crypto from "node:crypto";
import * as catalog from "./catalog.js";
import * as paypal from "./paypal.js";
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
    const { values } = catalog.render(a, it.knobs);
    lines.push({ asset: a, values, price: a.price });
  }
  return lines;
}

export async function createCheckout(items, { agent = false, returnUrl, cancelUrl } = {}) {
  const lines = priceCart(items).filter((l) => l.price > 0);
  if (!lines.length) throw Object.assign(new Error("Nothing to pay for: every item in the cart is free."), { status: 400 });
  const ref = crypto.randomBytes(6).toString("hex");
  const order = await paypal.createOrder(
    lines.map((l, i) => ({
      name: `${l.asset.title} — remix licence`,
      sku: `${l.asset.id}:${ref}:${i}`,
      price: l.price,
      description: Object.entries(diffFromDefaults(l.asset.params, l.values)).slice(0, 4).map(([k, v]) => `${k}=${v}`).join(", ") || "default knobs",
      url: `${config.baseUrl}/#/a/${l.asset.id}`,
    })),
    { returnUrl, cancelUrl, customId: ref },
  );
  const doc = {
    id: order.id,
    ref,
    status: order.status,
    agent,
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

export async function capture(orderId) {
  const existing = await store.get("orders", orderId);
  if (!existing) throw Object.assign(new Error("Unknown order"), { status: 404 });
  if (existing.status === "COMPLETED") return existing;
  const result = await paypal.captureOrder(orderId);
  const cap = result.purchase_units?.[0]?.payments?.captures?.[0];
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
  if (payouts.length) {
    try {
      const batch = await paypal.sendPayouts(`oasis-${orderId}`, payouts);
      existing.payoutBatch = { id: batch.batch_header?.payout_batch_id, status: batch.batch_header?.batch_status, count: payouts.length };
    } catch (e) {
      existing.payoutBatch = { error: e.message, count: payouts.length };
    }
  }
  await store.put("orders", orderId, existing);
  for (const [i, l] of ledger.entries()) await store.put("ledger", `${orderId}-${i}`, l);
  return existing;
}

export async function license(token) {
  const lic = await store.get("licenses", token);
  if (!lic) throw Object.assign(new Error("Unknown licence"), { status: 404 });
  return lic;
}
