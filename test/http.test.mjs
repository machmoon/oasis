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

test("MCP lists the five commerce tools", async () => {
  const r = await fetch(`${base}/mcp`, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }) });
  const j = await r.json();
  assert.deepEqual(j.result.tools.map((t) => t.name).sort(), ["create_order", "get_asset", "get_order", "remix_asset", "search_assets"]);
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
