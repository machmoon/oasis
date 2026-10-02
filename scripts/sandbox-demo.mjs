// The whole Oasis payment path against the real PayPal sandbox, in one command: npm run sandbox-demo
//
// Starts its own Oasis server on PORT (default 8788, separate data dir), with a zero-length refund window so held
// royalties release in seconds instead of 14 days. You approve two orders in PayPal's window with a sandbox
// *personal* account; everything else is automatic. Every PayPal ID is written to docs/SANDBOX-RUN.md.
//
// Needs PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET (sandbox) in .env. Optional: PAYOUT_EMAIL_CREATOR and
// PAYOUT_EMAIL_PARENT (sandbox account emails, so royalties land somewhere you can see; defaults are example.com
// addresses, which PayPal's sandbox reports as UNCLAIMED).
import "dotenv/config";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";

const PORT = Number(process.env.DEMO_PORT || 8788);
process.env.PORT = String(PORT);
process.env.OASIS_BASE_URL = `http://localhost:${PORT}`;
process.env.OASIS_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "oasis-sandbox-"));
process.env.OASIS_REFUND_WINDOW_MS = "1";
if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
  console.error("Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET (sandbox) in .env first. See PAYPAL.md.");
  process.exit(1);
}

const { createApp } = await import("../server/app.js");
const catalog = await import("../server/catalog.js");
const commerce = await import("../server/commerce.js");
const app = await createApp();
const server = await new Promise((r) => { const s = app.listen(PORT, () => r(s)); });
const BASE = `http://localhost:${PORT}`;
const log = [`# Oasis against the PayPal sandbox`, ``, `Run ${new Date().toISOString()} by \`npm run sandbox-demo\`. Every ID below is a real PayPal sandbox object.`, ``];
const step = (title, lines) => { console.log(`\n== ${title}\n${lines.join("\n")}`); log.push(`## ${title}`, ``, ...lines.map((l) => `- ${l}`), ``); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rpc = async (name, args) => {
  const r = await fetch(`${BASE}/mcp`, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" }, body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method: "tools/call", params: { name, arguments: args } }) });
  const j = await r.json();
  const text = j.result?.content?.find((c) => c.type === "text")?.text || j.error?.message || "";
  if (j.result?.isError || j.error) throw new Error(text);
  return JSON.parse(text);
};
const approve = async (order) => {
  console.log(`\nApprove in PayPal with your sandbox personal account:\n  ${order.approve_url}\n(opening it for you; waiting up to 10 minutes)`);
  execFile("open", [order.approve_url], () => {});
  for (let i = 0; i < 200; i++) {
    const o = await rpc("get_order", { order_id: order.order_id, claim_token: order.claim_token }).catch(() => null);
    if (o && ["COMPLETED", "CAPTURE_PENDING"].includes(o.status)) return o;
    await sleep(3000);
  }
  throw new Error("Not approved within 10 minutes");
};

try {
  // 1. The human issues a mandate; the agent shops with it.
  const { mandate, token } = await (await fetch(`${BASE}/api/mandates`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ description: "Sandbox demo kit", max_total_usd: 20, expires_in_hours: 1 }) })).json();
  step("1. Mandate issued by the human", [`${mandate.id}: $${mandate.budget_usd}, expires ${mandate.intent_expiry}`]);

  // 2. Over budget: refused before PayPal is called.
  const big = await rpc("create_order", { items: ["app-icon", "pricing-card", "gilded-deco-tier-0f823929", "lantern-fortune-tier-5b119cb5"].map((asset_id) => ({ asset_id })), mandate: token, agent_name: "sandbox-demo agent" }).then(() => "accepted (unexpected)", (e) => e.message);
  step("2. An order over the mandate", [`refused: ${big}`]);

  // 3. A real order: create, approve in PayPal, capture, download.
  const o = await rpc("create_order", { items: [{ asset_id: "pricing-card", knobs: { plan: "Sandbox", price: "$5" } }], mandate: token, agent_name: "sandbox-demo agent" });
  step("3. Order created by the agent", [`PayPal order ${o.order_id}, $${o.total_usd}`, `approve_url ${o.approve_url}`]);
  const done = await approve(o);
  const full = await (await fetch(`${BASE}/api/orders/${o.order_id}`, { headers: { "X-Oasis-Claim": o.claim_token } })).json();
  const svg = await fetch(done.downloads[0].svg);
  step("4. Approved, captured, licensed", [`status ${full.status}, capture ${full.captureId}`, `licensed SVG download: HTTP ${svg.status}`, `same order without the claim token shows licences: ${!!(await (await fetch(`${BASE}/api/orders/${o.order_id}`)).json()).licenses}`]);

  // 4. Refund: PayPal refund, licence revoked, budget returned.
  const refunded = await (await fetch(`${BASE}/api/orders/${o.order_id}/refund`, { method: "POST", headers: { "Content-Type": "application/json", "X-Oasis-Claim": o.claim_token }, body: JSON.stringify({ reason: "sandbox demo" }) })).json();
  const after = await fetch(done.downloads[0].svg);
  const m2 = await (await fetch(`${BASE}/api/mandates/${mandate.id}`)).json();
  step("5. Refunded through the Payments API", [`order status ${refunded.status}, refund ${refunded.refundId}`, `licensed download after refund: HTTP ${after.status}`, `mandate remaining $${m2.remaining_usd} of $${m2.budget_usd}`]);

  // 5. A fork of a fork: royalties held, then paid up the chain through Payouts.
  const child = catalog.getAsset("lantern-fortune-tier-5b119cb5");
  const parent = catalog.getAsset(child.lineage[0]);
  child.payoutEmail = process.env.PAYOUT_EMAIL_CREATOR || "oasis-creator@example.com";
  parent.payoutEmail = process.env.PAYOUT_EMAIL_PARENT || "oasis-parent@example.com";
  const f = await rpc("create_order", { items: [{ asset_id: child.id }], mandate: token, agent_name: "sandbox-demo agent" });
  const fd = await approve(f);
  const held = await (await fetch(`${BASE}/api/orders/${f.order_id}`, { headers: { "X-Oasis-Claim": f.claim_token } })).json();
  await sleep(50);
  await commerce.releaseDuePayouts(Date.now() + 1000);
  const paid = await (await fetch(`${BASE}/api/orders/${f.order_id}`, { headers: { "X-Oasis-Claim": f.claim_token } })).json();
  step("6. A fork of a fork, royalties through Payouts", [
    `PayPal order ${f.order_id}, capture ${held.captureId}, $${fd.total_usd}`,
    ...held.royalties.map((r) => `${r.role} ${r.author}: $${(r.cents / 100).toFixed(2)}${r.email ? ` to ${r.email}` : " (platform)"}`),
    `royalties held at capture: ${held.payoutHold?.status}; after the (shortened) refund window: Payouts batch ${paid.payoutBatch?.id || paid.payoutBatch?.error} (${paid.payoutBatch?.status || "error"})`,
  ]);
  fs.writeFileSync("docs/SANDBOX-RUN.md", log.join("\n") + "\n");
  console.log("\nWrote docs/SANDBOX-RUN.md");
} catch (e) {
  console.error("\nsandbox-demo failed:", e.message);
  process.exitCode = 1;
} finally {
  server.close();
}
