// Screenshots a licensed kit and one of its parts opened with its licence (clean, no watermark).
// node scripts/shot-paid.mjs <outDir> <base> <kitId>
import { chromium } from "playwright";
const [,, outDir = "docs/figures/sound", base = "http://localhost:8795", kitId] = process.argv;
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const p = await ctx.newPage();
p.on("pageerror", (e) => console.log("pageerror", e.message));
await p.goto(`${base}/#/kit/${kitId}`, { waitUntil: "networkidle" }); await p.waitForTimeout(3000);
await p.screenshot({ path: `${outDir}/kit-paid.png`, fullPage: true }); console.log("shot kit-paid");
const link = p.locator('.kv-part .links a[href*="?lic="]').first();
await link.click(); await p.waitForTimeout(3000);
await p.screenshot({ path: `${outDir}/sound-licensed.png` }); console.log("shot sound-licensed");
await ctx.close(); await b.close();
