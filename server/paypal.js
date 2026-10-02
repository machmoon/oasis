// PayPal integration. Orders follow PayPal's own reference server
// (paypal-examples/docs-examples, standard-integration/server/node/server.js): OrdersController from
// @paypal/paypal-server-sdk, create with intent CAPTURE, capture on approval. Payouts are not in that
// SDK, so creator royalties use the REST Payouts API with the same client credentials.
import { CheckoutPaymentIntent, Client, Environment, ItemCategory, LogLevel, OrdersController, PaymentsController, PaypalExperienceUserAction, ApiError } from "@paypal/paypal-server-sdk";
import { config, paypalConfigured } from "./config.js";

let orders, payments;
function controller() {
  if (!paypalConfigured()) {
    // Operators see which settings are missing; users and agents only see that checkout is off. Nothing is charged.
    console.warn("PayPal is not configured: set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET");
    throw Object.assign(new Error("Checkout isn't connected on this server yet, so no PayPal order could be opened. Nothing was charged."), { status: 503 });
  }
  if (!orders) {
    const client = new Client({
      clientCredentialsAuthCredentials: { oAuthClientId: config.paypal.clientId, oAuthClientSecret: config.paypal.clientSecret },
      timeout: 0,
      environment: Environment.Sandbox,
      logging: { logLevel: LogLevel.Warn },
    });
    orders = new OrdersController(client);
    payments = new PaymentsController(client);
  }
  return orders;
}

const money = (n) => ({ currencyCode: "USD", value: n.toFixed(2) });

/** lines: [{ name, sku, price, description, url }] — prices already validated server-side. */
export async function createOrder(lines, { returnUrl, cancelUrl, customId, description } = {}) {
  const total = lines.reduce((s, l) => s + l.price, 0);
  const body = {
    intent: CheckoutPaymentIntent.Capture,
    purchaseUnits: [
      {
        referenceId: "oasis",
        customId,
        description: (description || `Oasis licences (${lines.length})`).slice(0, 127),
        softDescriptor: "OASIS",
        amount: { ...money(total), breakdown: { itemTotal: money(total) } },
        items: lines.map((l) => ({
          name: l.name.slice(0, 127),
          unitAmount: money(l.price),
          quantity: "1",
          sku: l.sku.slice(0, 127),
          description: (l.description || "").slice(0, 127),
          category: ItemCategory.DigitalGoods,
          url: l.url,
        })),
      },
    ],
    paymentSource: returnUrl
      ? { paypal: { experienceContext: { brandName: "Oasis", userAction: PaypalExperienceUserAction.PayNow, shippingPreference: "NO_SHIPPING", returnUrl, cancelUrl } } }
      : undefined,
  };
  try {
    // PayPal-Request-Id makes a retried create return the same order instead of a duplicate.
    const { body: raw } = await controller().createOrder({ body, prefer: "return=representation", paypalRequestId: customId ? `oasis-create-${customId}` : undefined });
    return JSON.parse(raw);
  } catch (e) {
    throw describe(e);
  }
}

export async function getOrder(id) {
  try {
    const { body } = await controller().getOrder({ id });
    return JSON.parse(body);
  } catch (e) {
    throw describe(e);
  }
}

export async function captureOrder(id) {
  try {
    const { body } = await controller().captureOrder({ id, prefer: "return=representation", paypalRequestId: `oasis-capture-${id}` });
    return JSON.parse(body);
  } catch (e) {
    throw describe(e);
  }
}

function describe(e) {
  if (e instanceof ApiError) {
    let detail = e.message;
    try {
      const b = JSON.parse(e.body);
      detail = b.details?.[0] ? `${b.details[0].issue}: ${b.details[0].description} (${b.debug_id})` : b.message || detail;
    } catch {}
    // A 401 means this server's own PayPal credentials were refused: tell the operator in the log, and tell the
    // buyer or agent plainly instead of passing PayPal's empty auth error through.
    if (e.statusCode === 401) {
      console.error("PayPal rejected this server's credentials (401): check PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET");
      return Object.assign(new Error("Checkout couldn't sign in to PayPal on this server, so no order was opened. Nothing was charged."), { status: 503 });
    }
    const err = new Error(detail || `PayPal error ${e.statusCode}`);
    err.status = e.statusCode;
    return err;
  }
  return e;
}

let token = { value: null, exp: 0 };
async function accessToken() {
  if (token.value && Date.now() < token.exp) return token.value;
  const r = await fetch(`${config.paypal.apiBase}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: "Basic " + Buffer.from(`${config.paypal.clientId}:${config.paypal.clientSecret}`).toString("base64"), "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`PayPal auth failed: ${j.error_description || r.status}`);
  token = { value: j.access_token, exp: Date.now() + (j.expires_in - 60) * 1000 };
  return token.value;
}

/** Pays creators their royalty share. items: [{ email, amount, note, ref }]. */
export async function sendPayouts(batchId, items) {
  const r = await fetch(`${config.paypal.apiBase}/v1/payments/payouts`, {
    method: "POST",
    headers: { Authorization: `Bearer ${await accessToken()}`, "Content-Type": "application/json", "PayPal-Request-Id": batchId },
    body: JSON.stringify({
      sender_batch_header: { sender_batch_id: batchId, email_subject: "You earned a royalty on Oasis", email_message: "Someone licensed a remix built on your work." },
      items: items.map((i) => ({ recipient_type: "EMAIL", receiver: i.email, amount: { value: i.amount.toFixed(2), currency: "USD" }, note: i.note, sender_item_id: i.ref })),
    }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.details?.[0]?.issue || j.message || `payouts failed (${r.status})`);
  return j;
}

export async function refundCapture(captureId, { amount, note, requestId } = {}) {
  controller();
  try {
    const { body } = await payments.refundCapturedPayment({
      captureId,
      prefer: "return=representation",
      paypalRequestId: requestId,
      body: { amount: amount ? money(amount) : undefined, noteToPayer: note },
    });
    return JSON.parse(body);
  } catch (e) {
    throw describe(e);
  }
}

export async function rest(method, pathname, body, { requestId } = {}) {
  const r = await fetch(`${config.paypal.apiBase}${pathname}`, {
    method,
    headers: { Authorization: `Bearer ${await accessToken()}`, "Content-Type": "application/json", Prefer: "return=representation", ...(requestId ? { "PayPal-Request-Id": requestId } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(j.details?.[0]?.issue || j.message || `PayPal ${r.status}`), { status: r.status });
  return j;
}

export const getPayoutBatch = (batchId) => rest("GET", `/v1/payments/payouts/${encodeURIComponent(batchId)}`);

/** Verifies a webhook's signature with PayPal (the documented verify-webhook-signature call). */
export async function verifyWebhook(headers, event) {
  if (!config.paypal.webhookId) return false;
  const j = await rest("POST", "/v1/notifications/verify-webhook-signature", {
    auth_algo: headers["paypal-auth-algo"],
    cert_url: headers["paypal-cert-url"],
    transmission_id: headers["paypal-transmission-id"],
    transmission_sig: headers["paypal-transmission-sig"],
    transmission_time: headers["paypal-transmission-time"],
    webhook_id: config.paypal.webhookId,
    webhook_event: event,
  });
  return j.verification_status === "SUCCESS";
}

/** Registers this server's webhook URL for the events Oasis acts on; returns the webhook id. */
export async function ensureWebhook(url) {
  const events = ["CHECKOUT.ORDER.APPROVED", "PAYMENT.CAPTURE.COMPLETED", "PAYMENT.CAPTURE.DENIED", "PAYMENT.CAPTURE.REFUNDED", "PAYMENT.CAPTURE.REVERSED", "PAYMENT.PAYOUTS-ITEM.SUCCEEDED", "PAYMENT.PAYOUTS-ITEM.UNCLAIMED", "PAYMENT.PAYOUTS-ITEM.FAILED", "PAYMENT.PAYOUTS-ITEM.RETURNED"];
  const list = await rest("GET", "/v1/notifications/webhooks");
  const existing = (list.webhooks || []).find((w) => w.url === url);
  if (existing) return existing.id;
  const w = await rest("POST", "/v1/notifications/webhooks", { url, event_types: events.map((name) => ({ name })) });
  return w.id;
}

// ---------- Vault: the human approves once, agents' orders charge the saved PayPal wallet ----------
// Follows PayPal's "save PayPal with the Orders API / setup tokens" flow (v3 vault): a setup token the payer
// approves, exchanged for a payment token, then orders with payment_source.paypal.vault_id and
// stored_credential payment_initiator MERCHANT, because the buyer is not present when an agent buys.

/** Starts a budget: returns { id, approveUrl } for the human to approve in PayPal. */
export async function createSetupToken({ returnUrl, cancelUrl, description, requestId }) {
  const j = await rest("POST", "/v3/vault/setup-tokens", {
    payment_source: {
      paypal: {
        description: String(description || "Oasis agent budget").slice(0, 127),
        usage_pattern: "UNSCHEDULED_PREPAID",
        usage_type: "MERCHANT",
        customer_type: "CONSUMER",
        permit_multiple_payment_tokens: true,
        experience_context: { brand_name: "Oasis", shipping_preference: "NO_SHIPPING", return_url: returnUrl, cancel_url: cancelUrl },
      },
    },
  }, { requestId });
  return { id: j.id, status: j.status, approveUrl: j.links?.find((l) => l.rel === "approve")?.href || null };
}

/** After approval: setup token -> long-lived payment token (vault id). */
export async function createPaymentToken(setupTokenId) {
  const j = await rest("POST", "/v3/vault/payment-tokens", { payment_source: { token: { id: setupTokenId, type: "SETUP_TOKEN" } } }, { requestId: `oasis-pt-${setupTokenId}` });
  return { id: j.id, customerId: j.customer?.id || null, payerEmail: j.payment_source?.paypal?.email_address || null, payerName: [j.payment_source?.paypal?.name?.given_name, j.payment_source?.paypal?.name?.surname].filter(Boolean).join(" ") || null };
}

export const deletePaymentToken = (id) => rest("DELETE", `/v3/vault/payment-tokens/${encodeURIComponent(id)}`).catch(() => null);

/** An order paid from a vaulted wallet with no buyer present. PayPal returns it COMPLETED in the same call. */
export async function createVaultedOrder(lines, { vaultId, customId, description, requestId }) {
  const total = lines.reduce((s, l) => s + l.price, 0);
  const m = (n) => ({ currency_code: "USD", value: n.toFixed(2) });
  return rest("POST", "/v2/checkout/orders", {
    intent: "CAPTURE",
    purchase_units: [{
      reference_id: "oasis",
      custom_id: customId,
      description: String(description || `Oasis licences (${lines.length})`).slice(0, 127),
      soft_descriptor: "OASIS",
      amount: { ...m(total), breakdown: { item_total: m(total) } },
      items: lines.map((l) => ({ name: l.name.slice(0, 127), unit_amount: m(l.price), quantity: "1", sku: l.sku.slice(0, 127), description: (l.description || "").slice(0, 127), category: "DIGITAL_GOODS", url: l.url })),
    }],
    payment_source: { paypal: { vault_id: vaultId, stored_credential: { payment_initiator: "MERCHANT", usage: "SUBSEQUENT", usage_pattern: "UNSCHEDULED_PREPAID" } } },
  }, { requestId });
}
