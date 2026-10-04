// One continuous take of the real Studio for the demo video: node scripts/demo-take.mjs <base> <outDir>
// Headed Chromium on the GPU (the film plays in real time), recorded by Playwright. A visible cursor is drawn because
// screen recordings of a headless-driven page show none. The PayPal step opens the real sandbox approval page; for an
// unattended take the order is then approved with PayPal's published sandbox test card (as scripts/sandbox-demo.mjs
// --card does), and the page returns through Oasis's own /checkout/return, so the claim, capture, colour sweep and
// payouts are the app's real code path.
import "dotenv/config";
import fs from "node:fs";
import { chromium } from "playwright";

const [base = "http://localhost:5177", out = "renders/takes"] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const { rest } = await import("../server/paypal.js");
const BRIEF = 'a 15-second teaser for "Momiji Ramen" on a Kyoto market street at dusk';
const marks = [];
const t0 = Date.now();
const mark = (label) => { marks.push({ t: (Date.now() - t0) / 1000, label }); console.log(`${((Date.now() - t0) / 1000).toFixed(1)}s ${label}`); };

const browser = await chromium.launch({ headless: false, args: ["--use-angle=metal", "--autoplay-policy=no-user-gesture-required", "--window-position=2400,0"] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, recordVideo: { dir: out, size: { width: 1440, height: 900 } } });
await ctx.addInitScript(() => {
  addEventListener("DOMContentLoaded", () => {
    const c = document.createElement("div");
    c.style.cssText = "position:fixed;left:0;top:0;width:22px;height:22px;z-index:2147483647;pointer-events:none;transform:translate(-100px,-100px);transition:transform .06s linear";
    c.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M4 2 L4 19 L8.5 15 L11.5 21.5 L14.2 20.3 L11.3 13.9 L17.5 13.9 Z" fill="#131313" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/></svg>';
    document.body.appendChild(c);
    addEventListener("mousemove", (e) => { c.style.transform = `translate(${e.clientX - 3}px, ${e.clientY - 2}px)`; }, true);
    addEventListener("mousedown", () => { c.firstChild.style.transform = "scale(.86)"; }, true);
    addEventListener("mouseup", () => { c.firstChild.style.transform = ""; }, true);
  });
});
const page = await ctx.newPage();
const wait = (ms) => page.waitForTimeout(ms);
async function glide(sel, { click = true, offset = [0, 0] } = {}) {
  const box = await page.locator(sel).first().boundingBox();
  if (!box) throw new Error(`not on screen: ${sel}`);
  await page.mouse.move(box.x + box.width / 2 + offset[0], box.y + box.height / 2 + offset[1], { steps: 28 });
  await wait(180);
  if (click) await page.mouse.click(box.x + box.width / 2 + offset[0], box.y + box.height / 2 + offset[1]);
}

// 1. the Studio opens on a street; type the brief and direct it
await page.goto(`${base}/#/studio`);
await page.waitForFunction(() => window.__player, null, { timeout: 60_000 });
await wait(3500);
mark("studio open");
await glide("#brief-text");
await page.keyboard.press("Meta+A"); await page.keyboard.press("Backspace");
await page.keyboard.type(BRIEF, { delay: 32 });
await wait(400);
await glide("#direct");
mark("direct");
await page.waitForFunction(() => location.hash.startsWith("#/film/"), null, { timeout: 60_000 });
const id = await page.evaluate(() => location.hash.split("/")[2]);
mark(`film ${id} building`);
await wait(19_000); // the street drops in and the first cut plays through
mark("first cut played");

// 2. Claude's cut swaps in while the first one plays
await page.waitForFunction(() => document.getElementById("director-chip")?.hidden, null, { timeout: 90_000 }).catch(() => {});
mark("claude's cut in");
await wait(4000);

// 3. restyle and edit: instant
await glide('[data-style="dream"]'); mark("dream"); await wait(5500);
await glide('[data-style="hype"]'); mark("hype"); await wait(5000);
await glide('#trk-cam .clip[data-i="3"]'); mark("select title shot"); await wait(1200);
await glide('[data-ramp="expo"]'); await wait(900);
await glide('[data-cutk="zoom"]'); mark("edited"); await wait(1500);
await glide("#play"); await wait(4500);
await glide("#play"); await wait(500);

// 4. pay with PayPal: the real sandbox approval page, then back through Oasis's return URL
await page.locator("#licence").scrollIntoViewIfNeeded();
await glide("#checkout");
mark("pay with paypal");
await page.waitForURL(/paypal\.com/, { timeout: 60_000 });
await wait(5000);
mark("paypal page");
const pending = await page.evaluate((fid) => JSON.parse(localStorage.getItem(`oasis.film.${fid}`) || "null"), id).catch(() => null);
const orderId = new URL(page.url()).searchParams.get("token") || pending?.order;
const card = await rest("POST", `/v2/checkout/orders/${orderId}/confirm-payment-source`, {
  payment_source: { card: { number: "4012000033330026", expiry: "2030-12", security_code: "123", name: "Sandbox Tester", billing_address: { address_line_1: "1 Test St", admin_area_2: "San Jose", admin_area_1: "CA", postal_code: "95131", country_code: "US" } } },
});
mark(`approved ${orderId} ${card.status}`);
await page.goto(`${base}/checkout/return?film=${encodeURIComponent(id)}&token=${encodeURIComponent(orderId)}`);
await page.waitForFunction(() => window.__player, null, { timeout: 60_000 });
mark("back in studio: claim and sweep");
await wait(14_000);

// 5. vertical for Reels, then render
await glide('#formats [data-f="9:16"]'); mark("vertical"); await wait(9000);
await glide("#export"); mark("render"); await wait(5000);

fs.writeFileSync(`${out}/marks.json`, JSON.stringify({ film: id, order: orderId, marks }, null, 2));
await ctx.close();
await browser.close();
console.log("take saved in", out);
