// Licenses a film through a real PayPal sandbox Checkout order: node scripts/film-license-sandbox.mjs <base> <filmId>
// The order is approved with one of PayPal's published sandbox test cards (confirm-payment-source,
// developer.paypal.com/tools/sandbox/card-testing) instead of a person in PayPal's window, as scripts/sandbox-demo.mjs
// --card does; creation, capture, the amount check, licences and the film's licence are Oasis's normal code.
import "dotenv/config";
const [base = "http://localhost:5177", id] = process.argv.slice(2);
const { rest } = await import("../server/paypal.js");
const j = async (path, body) => { const r = await fetch(base + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body || {}) }); const x = await r.json(); if (!r.ok) throw new Error(x.error || r.status); return x; };
const o = await j(`/api/films/${id}/checkout`);
console.log("order", o.order_id, `$${o.total_usd}`);
const c = await rest("POST", `/v2/checkout/orders/${o.order_id}/confirm-payment-source`, {
  payment_source: { card: { number: "4012000033330026", expiry: "2030-12", security_code: "123", name: "Sandbox Tester", billing_address: { address_line_1: "1 Test St", admin_area_2: "San Jose", admin_area_1: "CA", postal_code: "95131", country_code: "US" } } },
});
console.log("approved with the sandbox test card:", c.status);
for (let i = 0; i < 10; i++) {
  try { const f = await j(`/api/films/${id}/claim`, { order_id: o.order_id, claim_token: o.claim_token }); console.log("licensed:", JSON.stringify(f.licence)); process.exit(0); }
  catch (e) { console.log("claim:", e.message); await new Promise((r) => setTimeout(r, 2000)); }
}
process.exit(1);
