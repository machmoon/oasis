// Screenshots the sound registry: home, the sounds browser, a sound page with knobs turned, a kit made from a vibe,
// and the kit's paid state (claimed through the test's fake capture when PayPal isn't reachable, or after a sandbox
// approval when a claim is stored). node scripts/shot-sound.mjs <outDir> <base> [assetId] [kitId]
import { chromium } from "playwright";
const [,, outDir = "docs/figures/sound", base = "http://localhost:8795", id = "footstep", kitId = ""] = process.argv;
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const p = await ctx.newPage();
p.on("pageerror", (e) => console.log("pageerror", e.stack || e.message));
p.on("console", (m) => { if (m.type() === "error") console.log("console", m.text().slice(0, 300)); });
const shot = async (name, opts = {}) => { await p.screenshot({ path: `${outDir}/${name}.png`, ...opts }); console.log("shot", name); };
await p.goto(`${base}/#/`, { waitUntil: "networkidle" }); await p.waitForTimeout(3500); await shot("home");
await p.waitForTimeout(6000); await shot("home-kit-beat");
await p.goto(`${base}/#/sounds`, { waitUntil: "networkidle" }); await p.waitForTimeout(2500); await shot("sounds", { fullPage: true });
await p.goto(`${base}/#/a/${id}`, { waitUntil: "networkidle" }); await p.waitForTimeout(2500); await shot("sound-defaults");
const weight = p.locator("#k-weight");
if (await weight.count()) { await weight.evaluate((el) => { el.value = el.max; el.dispatchEvent(new Event("input", { bubbles: true })); }); await p.waitForTimeout(900); }
const choice = p.locator('[data-choice="surface"] button[data-v="snow"]');
if (await choice.count()) { await choice.click(); await p.waitForTimeout(900); }
await shot("sound-knobs");
await p.locator("#sp-walk-sec").scrollIntoViewIfNeeded(); await p.waitForTimeout(4000); await shot("sound-walk");
await shot("sound-full", { fullPage: true });
let kit = kitId;
if (!kit) {
  await p.goto(`${base}/#/kits`, { waitUntil: "networkidle" }); await p.waitForTimeout(800); await shot("kits");
  await p.fill("#kt-vibe", "rainy cyberpunk alley footsteps and UI clicks"); await p.click("#kt-go");
  await p.waitForURL(/#\/kit\//, { timeout: 120000 }); await p.waitForTimeout(3000);
  kit = p.url().split("#/kit/")[1];
} else { await p.goto(`${base}/#/kit/${kit}`, { waitUntil: "networkidle" }); await p.waitForTimeout(3000); }
await shot("kit", { fullPage: true });
console.log("kit", kit);
await ctx.close(); await b.close();
