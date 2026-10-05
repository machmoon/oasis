// Licenses a kit through a real PayPal sandbox Checkout order: node scripts/kit-license-sandbox.mjs <base> <kitId>
// The order is approved with one of PayPal's published sandbox test cards (confirm-payment-source,
// developer.paypal.com/tools/sandbox/card-testing) instead of a person in PayPal's window, as
// scripts/film-license-sandbox.mjs does; creation, capture, the amount check and the licences are Oasis's normal code.
import "dotenv/config";
const [base = "http://localhost:8795", id] = process.argv.slice(2);
const { rest } = await import("../server/paypal.js");
const j = async (path, body) => { const r = await fetch(base + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body || {}) }); const x = await r.json(); if (!r.ok) throw new Error(x.error || r.status); return x; };
const o = await j(`/api/kits/${id}/checkout`);
console.log("order", o.order_id, `$${o.total_usd}`);
const c = await rest("POST", `/v2/checkout/orders/${o.order_id}/confirm-payment-source`, {
  payment_source: { card: { number: "4012000033330026", expiry: "2030-12", security_code: "123", name: "Sandbox Tester", billing_address: { address_line_1: "1 Test St", admin_area_2: "San Jose", admin_area_1: "CA", postal_code: "95131", country_code: "US" } } },
});
console.log("approved with the sandbox test card:", c.status);
for (let i = 0; i < 10; i++) {
  try {
    const k = await j(`/api/kits/${id}/claim`, { order_id: o.order_id, claim_token: o.claim_token });
    console.log("licensed:", JSON.stringify(k.licence));
    console.log(k.items.map((it) => `${it.name}: ${it.module}`).join("\n"));
    process.exit(0);
  } catch (e) { console.log("claim:", e.message); await new Promise((r) => setTimeout(r, 2000)); }
}
process.exit(1);
