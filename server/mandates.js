// Spending mandates: a budget a human issues to an agent, held and enforced by the server.
//
// Shaped after the IntentMandate in Google's Agent Payments Protocol (AP2,
// github.com/google-agentic-commerce/AP2, code/sdk/python/ap2/models/mandate.py): a natural-language description the
// human confirmed, an expiry, optional SKU limits, and user_cart_confirmation_required, which is always true here
// because every Oasis order is still approved by the human in PayPal. AP2's human-present IntentMandate carries no
// amount; Oasis adds a server-held budget, because the risk it closes is an agent restating its own cap
// (max_total_usd is only the agent's word). The agent holds a bearer token; the server holds the balance.
//
// A mandate can also be funded: the human approves a PayPal Vault setup token once, and from then on the agent's
// orders are charged to that saved wallet with no human in the loop (user_cart_confirmation_required: false, which
// AP2 defines as "the agent can make purchases on the user's behalf once all purchase conditions have been
// satisfied"). view() also projects the mandate as AP2's newer open payment mandate
// (code/sdk/schemas/ap2/open_payment_mandate.json): a payment.budget constraint checked the way AP2's
// BudgetEvaluator does (code/sdk/python/ap2/sdk/constraints.py: past spend + this payment <= max), plus
// payment.execution_date and payment.allowed_payees.
import crypto from "node:crypto";
import * as store from "./store.js";

export const UNCAPTURED_HOLD_MS = 3 * 60 * 60 * 1000; // an order nobody approves stops holding budget after 3 h
const cents = (usd) => Math.round(Number(usd) * 100);
const hash = (token) => crypto.createHash("sha256").update(String(token)).digest("hex");

export async function issue({ description, maxTotalUsd, expiresInHours = 24, skus = null, funded = false, now = Date.now() }) {
  const budget = cents(maxTotalUsd);
  if (!(budget >= 100 && budget <= 50000)) throw Object.assign(new Error("Budget must be between $1 and $500"), { status: 400 });
  const hours = Math.min(168, Math.max(1, Number(expiresInHours) || 24));
  const token = `mdt_${crypto.randomBytes(20).toString("hex")}`;
  const m = {
    id: `mnd_${crypto.randomBytes(6).toString("hex")}`,
    tokenHash: hash(token), // only the hash is stored: a leaked data dir doesn't leak spendable tokens
    natural_language_description: String(description || "Sounds for my game").slice(0, 300),
    skus: Array.isArray(skus) && skus.length ? skus.map(String).slice(0, 50) : null,
    user_cart_confirmation_required: !funded,
    // funded mandates: { state: "awaiting_approval" | "active" | "closed", setupTokenId, paymentTokenId, payerEmail }
    vault: funded ? { state: "awaiting_approval" } : null,
    intent_expiry: new Date(now + hours * 3600_000).toISOString(),
    budgetCents: budget,
    holds: [], // { orderId, cents, at, state: "held" | "spent" | "released" }
    createdAt: new Date(now).toISOString(),
  };
  await store.put("mandates", m.id, m);
  return { mandate: view(m, now), token };
}

async function byToken(token) {
  if (typeof token !== "string" || !token.startsWith("mdt_")) return null;
  const h = hash(token);
  return (await store.list("mandates")).find((m) => m.tokenHash === h) || null;
}

function live(m, now) {
  for (const h of m.holds) if (h.state === "held" && now - Date.parse(h.at) > UNCAPTURED_HOLD_MS) h.state = "released";
  return m;
}
const committed = (m) => m.holds.filter((h) => h.state !== "released").reduce((s, h) => s + h.cents, 0);

export function view(m, now = Date.now()) {
  live(m, now);
  const spent = m.holds.filter((h) => h.state === "spent").reduce((s, h) => s + h.cents, 0);
  return {
    id: m.id, natural_language_description: m.natural_language_description, skus: m.skus,
    user_cart_confirmation_required: !m.vault, intent_expiry: m.intent_expiry, expired: now > Date.parse(m.intent_expiry),
    funding: m.vault ? { state: m.vault.state, payer: m.vault.payerEmail || null, approve_url: m.vault.state === "awaiting_approval" ? m.vault.approveUrl || null : null } : null,
    spent_usd: spent / 100,
    open_mandate: {
      vct: "mandate.payment.open.1",
      constraints: [
        { type: "payment.budget", max: m.budgetCents / 100, currency: "USD" },
        { type: "payment.execution_date", not_after: m.intent_expiry },
        ...(m.skus ? [{ type: "checkout.line_items", allowed: m.skus }] : []),
      ],
      payment_instrument: m.vault ? { type: "paypal.vault", payer: m.vault.payerEmail || null } : { type: "paypal.checkout_per_order" },
    },
    revoked_at: m.revokedAt || null,
    budget_usd: m.budgetCents / 100, remaining_usd: m.revokedAt ? 0 : (m.budgetCents - committed(m)) / 100,
    // The audit log: every order an agent created against this mandate, by whom and when.
    orders: m.holds.map((h) => ({ order_id: h.orderId, usd: h.cents / 100, state: h.state, agent_name: h.agentName || null, at: h.at })),
  };
}

export async function get(id) {
  const m = await store.get("mandates", id);
  return m ? view(m) : null;
}

// One reservation at a time per mandate, so two concurrent orders can't both fit into the same remaining budget.
const locks = new Map();
function locked(id, fn) {
  const prev = locks.get(id) || Promise.resolve();
  const next = prev.then(fn, fn);
  locks.set(id, next.catch(() => {}));
  return next;
}

/** Checks the mandate and reserves `totalUsd` for an order about to be created. Returns a release function. */
export async function reserve(token, { totalUsd, assetIds, agentName = null, now = Date.now() }) {
  const found = await byToken(token);
  if (!found) throw Object.assign(new Error("Unknown or revoked mandate token. Ask the human to issue one at /#/agents."), { status: 403 });
  return locked(found.id, async () => {
    const m = live(await store.get("mandates", found.id), now);
    if (m.revokedAt) throw Object.assign(new Error(`Mandate ${m.id} was revoked by the human at ${m.revokedAt}.`), { status: 403 });
    if (m.vault && m.vault.state !== "active") throw Object.assign(new Error(`Mandate ${m.id} is waiting for the human to approve it in PayPal${m.vault.approveUrl ? ` (${m.vault.approveUrl})` : ""}.`), { status: 403 });
    if (now > Date.parse(m.intent_expiry)) throw Object.assign(new Error(`Mandate ${m.id} expired at ${m.intent_expiry}.`), { status: 403 });
    if (m.skus && assetIds.some((a) => !m.skus.includes(a))) throw Object.assign(new Error(`Mandate ${m.id} only allows: ${m.skus.join(", ")}.`), { status: 403 });
    const want = cents(totalUsd), left = m.budgetCents - committed(m);
    if (want > left) throw Object.assign(new Error(`Order total $${(want / 100).toFixed(2)} is over what mandate ${m.id} has left ($${(left / 100).toFixed(2)} of $${(m.budgetCents / 100).toFixed(2)}). Ask the human to issue a larger mandate.`), { status: 402 });
    const hold = { id: crypto.randomBytes(6).toString("hex"), agentName: agentName ? String(agentName).slice(0, 40) : null, orderId: null, cents: want, at: new Date(now).toISOString(), state: "held" };
    m.holds.push(hold);
    await store.put("mandates", m.id, m);
    return {
      mandate: m,
      bind: async (orderId) => locked(m.id, async () => { const x = await store.get("mandates", m.id); x.holds.find((h) => h.id === hold.id).orderId = orderId; await store.put("mandates", m.id, x); }),
      release: async () => locked(m.id, async () => { const x = await store.get("mandates", m.id); const h = x.holds.find((y) => y.id === hold.id && y.state === "held"); if (h) h.state = "released"; await store.put("mandates", m.id, x); }),
    };
  });
}

/** Order lifecycle → budget: captured orders stay spent; refunded or failed ones give the budget back. */
export async function settle(mandateId, orderId, state) {
  if (!mandateId) return;
  await locked(mandateId, async () => {
    const m = await store.get("mandates", mandateId);
    const h = m?.holds.find((x) => x.orderId === orderId);
    if (!h) return;
    h.state = state;
    await store.put("mandates", mandateId, m);
  });
}

/** Funding: remembers the setup token the human is about to approve. */
export async function attachSetup(id, { setupTokenId, approveUrl }) {
  return locked(id, async () => {
    const m = await store.get("mandates", id);
    m.vault = { ...m.vault, setupTokenId, approveUrl };
    await store.put("mandates", id, m);
    return m;
  });
}

export async function bySetupToken(setupTokenId) {
  return (await store.list("mandates")).find((m) => m.vault?.setupTokenId === setupTokenId) || null;
}

/** The human approved in PayPal: the vaulted wallet is now this mandate's payment instrument. */
export async function activate(id, { paymentTokenId, payerEmail }) {
  return locked(id, async () => {
    const m = await store.get("mandates", id);
    if (m.vault.state === "active") return view(m);
    m.vault = { ...m.vault, state: "active", paymentTokenId, payerEmail, approvedAt: new Date().toISOString() };
    await store.put("mandates", id, m);
    return view(m);
  });
}

/** Internal: the full record for a bearer token (commerce needs the vault id to charge). */
export const recordByToken = byToken;

export async function byTokenView(token) {
  const m = await byToken(token);
  return m ? view(m) : null;
}

/** The human's kill switch: the token stops working at once. Orders already created can still be approved or not. */
export async function revoke(token, now = Date.now()) {
  const found = await byToken(token);
  if (!found) throw Object.assign(new Error("Unknown mandate token"), { status: 404 });
  return locked(found.id, async () => {
    const m = await store.get("mandates", found.id);
    m.revokedAt = m.revokedAt || new Date(now).toISOString();
    await store.put("mandates", m.id, m);
    return view(m, now);
  });
}
