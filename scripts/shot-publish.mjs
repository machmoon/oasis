// Screenshots the creator side: the publish page empty, with the template loaded, after the check, and published;
// then a creator page with real ledger rows. Runs its own server on a scratch data dir with the test's fake PayPal
// client, licenses one kit through the real checkout and claim path so the ledger has rows, and shoots headless.
//   node scripts/shot-publish.mjs [outDir] [port]
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
const [,, outDir = "docs/figures/sound", port = "8798"] = process.argv;
process.env.OASIS_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "oasis-shot-publish-"));
process.env.PAYPAL_CLIENT_ID = "test"; process.env.PAYPAL_CLIENT_SECRET = "test"; process.env.ANTHROPIC_API_KEY = "";
process.env.PORT = port; process.env.OASIS_BASE_URL = `http://localhost:${port}`; process.env.OASIS_RELOAD_SECONDS = "0";
const { chromium } = await import("playwright");
const commerce = await import("../server/commerce.js");
const store = await import("../server/store.js");
const { createApp } = await import("../server/app.js");

const app = await createApp();
const server = await new Promise((r) => { const s = app.listen(Number(port), () => r(s)); });
const base = `http://localhost:${port}`;
const fake = { async createOrder() { return { id: "KIT-7F3A21", status: "CREATED", links: [{ rel: "payer-action", href: "https://sandbox.paypal.com/checkoutnow?token=x" }] }; },
  async captureOrder(id) { const o = await store.get("orders", id); return { id, status: "COMPLETED", payer: { name: { given_name: "Dana", surname: "Reyes" }, email_address: "buyer@example.com" }, purchase_units: [{ payments: { captures: [{ id: `CAP-${id}`, status: "COMPLETED", amount: { currency_code: "USD", value: o.total.toFixed(2) } }] } }] }; } };
commerce.setPaypalClient(fake);
const post = async (p, body) => (await fetch(`${base}${p}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })).json();
const kit = await post("/api/kits", { vibe: "rainy cyberpunk alley footsteps and UI clicks" });
const co = await post(`/api/kits/${kit.id}/checkout`, {});
const paid = await post(`/api/kits/${kit.id}/claim`, { order_id: co.order_id, claim_token: co.claim_token });
const creator = paid.licence.creators.sort((a, b) => b.usd - a.usd)[0].author;
console.log("kit", kit.id, "paid", paid.licensed, "creator", creator);

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const p = await ctx.newPage();
p.on("pageerror", (e) => console.log("pageerror", e.stack || e.message));
p.on("console", (m) => { if (m.type() === "error") console.log("console", m.text().slice(0, 300)); });
const shot = async (name, opts = {}) => { await p.screenshot({ path: `${outDir}/${name}.png`, ...opts }); console.log("shot", name); };

await p.goto(`${base}/#/publish`, { waitUntil: "networkidle" }); await p.waitForTimeout(800); await shot("publish-empty");
await p.click("#pb-template"); await p.waitForTimeout(600); await shot("publish-template");
await p.click("#pb-check"); await p.waitForSelector("#pb-form:not([hidden])", { timeout: 60000 }); await p.waitForTimeout(900);
await p.evaluate(() => window.scrollTo(0, 0)); await shot("publish-checked"); await shot("publish-checked-full", { fullPage: true });
await p.fill("#pb-title", "Desk Tap"); await p.fill("#pb-desc", "A small tap for a desk app's buttons, from a struck plastic body under a one-millisecond edge.");
await p.fill("#pb-tags", "tap, desk, click, button, ui");
await p.locator("#pb-price").evaluate((el) => { el.value = 2; el.dispatchEvent(new Event("input", { bubbles: true })); });
await p.fill("#pb-author", "tapper"); await p.fill("#pb-email", "tapper@creators.oasis.example");
await p.locator("#pb-form").scrollIntoViewIfNeeded(); await p.waitForTimeout(300); await shot("publish-form");
await p.click("#pb-go"); await p.waitForSelector("#pb-done:not([hidden])", { timeout: 60000 }); await p.waitForTimeout(900); await shot("publish-published");
await p.goto(`${base}/#/creator/${creator}`, { waitUntil: "networkidle" }); await p.waitForTimeout(2500); await shot("creator"); await shot("creator-full", { fullPage: true });
await p.goto(`${base}/#/creator/tapper`, { waitUntil: "networkidle" }); await p.waitForTimeout(2000); await shot("creator-new");
await ctx.close(); await b.close(); server.close(); process.exit(0);
