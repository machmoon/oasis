// Screenshots the asset page through its interactions: a knob change, a look, compare, the street.
// node scripts/shot-asset.mjs <outDir> <base> <assetId>
import { chromium } from "playwright";
const [,, outDir, base = "http://localhost:8792", id = "town-shop"] = process.argv;
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const p = await ctx.newPage();
p.on("pageerror", (e) => console.log("pageerror", e.message));
p.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") console.log("console", m.type(), m.text().slice(0, 300)); });
await p.goto(`${base}/#/a/${id}`, { waitUntil: "networkidle" });
await p.waitForTimeout(2500);
await p.screenshot({ path: `${outDir}/asset-1-defaults.png` });
// floors up: the new floors flash
const floors = p.locator("#k-floors");
if (await floors.count()) { await floors.evaluate((el) => { el.value = el.max; el.dispatchEvent(new Event("input", { bubbles: true })); }); await p.waitForTimeout(260); await p.screenshot({ path: `${outDir}/asset-2-rebuild-flash.png` }); await p.waitForTimeout(900); }
const width = p.locator("#k-width");
if (await width.count()) { await width.evaluate((el) => { el.value = el.min; el.dispatchEvent(new Event("input", { bubbles: true })); }); await p.waitForTimeout(1200); }
// a preset
const preset = p.locator(".a-preset").nth(1);
if (await preset.count()) { await preset.click(); await p.waitForTimeout(1200); }
await p.screenshot({ path: `${outDir}/asset-3-remixed.png` });
// compare
await p.click("#a-compare"); await p.waitForTimeout(1800);
await p.screenshot({ path: `${outDir}/asset-4-compare.png` });
await p.click("#a-compare");
// looks
for (const look of ["ink", "dither", "pixel", "ps1", "clay"]) {
  await p.click(`#a-looks button[data-v="${look}"]`); await p.waitForTimeout(700);
  await p.locator("#a-stage").screenshot({ path: `${outDir}/look-${look}.png` });
}
await p.click(`#a-looks button[data-v="studio"]`);
await p.click(`#a-time button[data-v="night"]`); await p.waitForTimeout(600);
await p.locator("#a-stage").screenshot({ path: `${outDir}/look-night.png` });
await p.click(`#a-time button[data-v="day"]`);
// the street
await p.locator("#a-place-sec").scrollIntoViewIfNeeded(); await p.waitForTimeout(4500);
await p.screenshot({ path: `${outDir}/asset-5-street.png` });
await p.screenshot({ path: `${outDir}/asset-full.png`, fullPage: true });
await ctx.close(); await b.close();
console.log("done");
