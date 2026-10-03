// The HTTP surface judges and agents touch: webhook signatures, MCP, the licence gate.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

process.env.OASIS_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "oasis-http-"));
process.env.PAYPAL_WEBHOOK_ID = "";
const { createApp } = await import("../server/app.js");
let server, base;

before(async () => {
  const app = await createApp();
  await new Promise((r) => { server = app.listen(0, r); });
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

test("unsigned PayPal webhooks are rejected before anything is trusted", async () => {
  const r = await fetch(`${base}/api/paypal/webhook`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ event_type: "CHECKOUT.ORDER.APPROVED", resource: { id: "X" } }) });
  assert.equal(r.status, 400);
});

test("MCP lists the registry tools", async () => {
  const r = await fetch(`${base}/mcp`, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }) });
  const j = await r.json();
  assert.deepEqual(j.result.tools.map((t) => t.name).sort(), ["buy_assets", "get_asset", "get_budget", "get_film", "make_film", "preview_asset", "search_assets"]);
});

test("paid assets cannot be downloaded without a licence; free ones can", async () => {
  assert.equal((await fetch(`${base}/api/assets/pricing-card/download.svg`)).status, 402);
  const free = await fetch(`${base}/api/assets/oasis-town/download.svg`);
  assert.equal(free.status, 200);
  assert.match(await free.text(), /^<svg/);
});

test("paid previews are watermarked; brand mode re-skins renders", async () => {
  const wm = await (await fetch(`${base}/api/assets/pricing-card/render.svg`)).text();
  assert.match(wm, /oasis preview/);
  const branded = await (await fetch(`${base}/api/assets/pricing-card/render.svg?brand=${encodeURIComponent(JSON.stringify({ primary: "#B4FF39" }))}`)).text();
  assert.match(branded, /b4ff39|B4FF39/i);
});

test("a client cannot set its own price", async () => {
  const r = await fetch(`${base}/api/orders`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: [{ assetId: "nope" }] }) });
  assert.equal(r.status, 400);
});

test("MCP buy_assets is rate limited per client, and MCP traffic is counted publicly", async () => {
  const call = (id) => fetch(`${base}/mcp`, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" }, body: JSON.stringify({ jsonrpc: "2.0", id, method: "tools/call", params: { name: "buy_assets", arguments: { items: [{ asset_id: "town-shop" }], mandate: "mdt_nope" } } }) });
  const statuses = [];
  for (let i = 0; i < 12; i++) statuses.push((await call(i)).status);
  assert.equal(statuses.filter((s) => s === 429).length, 2, "the 11th and 12th orders in a minute are refused");
  const limited = await (await call(99)).json();
  assert.equal(limited.error.code, -32029);
  const stats = await (await fetch(`${base}/api/stats/mcp`)).json();
  assert.ok(stats.tools.buy_assets >= 10);
});

test("the public proof page logs a forged webhook as rejected and reports readiness honestly", async () => {
  await fetch(`${base}/api/paypal/webhook`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: "WH-FORGED", event_type: "PAYMENT.CAPTURE.REFUNDED", resource: { id: "CAP1" } }) });
  const s = await (await fetch(`${base}/api/status`)).json();
  const w = s.webhooks.find((x) => x.eventId === "WH-FORGED");
  assert.equal(w.verified, false);
  assert.match(w.result, /rejected/);
  assert.equal(typeof s.paypalReady, "boolean");
});

test("the registry: agents get an x402 402, browser imports get a placeholder, and a bad licence is refused", async () => {
  const r = await fetch(`${base}/cdn/town-shop.mjs`);
  assert.equal(r.status, 402);
  const pr = JSON.parse(Buffer.from(r.headers.get("payment-required"), "base64").toString());
  assert.equal(pr.x402Version, 2);
  assert.equal(pr.accepts[0].network, "paypal:sandbox");
  assert.equal(pr.accepts[0].asset, "USD");
  const stub = await fetch(`${base}/cdn/town-shop.mjs`, { headers: { "Sec-Fetch-Dest": "script" } });
  assert.equal(stub.status, 200);
  assert.match(await stub.text(), /NOT LICENSED/);
  assert.equal((await fetch(`${base}/cdn/town-shop.mjs?lic=nope`)).status, 403);
  const settle = await fetch(`${base}/cdn/town-shop.mjs`, { headers: { "PAYMENT-SIGNATURE": Buffer.from(JSON.stringify({ x402Version: 2, accepted: pr.accepts[0], payload: { mandate: "mdt_nope" } })).toString("base64") } });
  assert.equal(settle.status, 403, "an unknown mandate pays for nothing");
});
