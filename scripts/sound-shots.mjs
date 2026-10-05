// Screenshots of the sound surfaces, light and dark, desktop and phone, for the before/after pair in
// docs/figures/sound/: `node scripts/sound-shots.mjs <base> <outdir> <prefix>`. Headless Playwright only.
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const [base = "http://localhost:8799", out = "docs/figures/sound", prefix = "after"] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const pages = [
  ["home", "#/", 4500],
  ["sounds", "#/sounds", 3500],
  ["sound", "#/a/footstep", 4000],
  ["walk", "#/a/footstep", 7000, "#sp-walk-sec"],
  ["kit", "#/kit/k58950da729", 3500],
];
const b = await chromium.launch();
for (const [scheme, vp, tag] of [["light", { width: 1440, height: 900 }, "desktop"], ["dark", { width: 1440, height: 900 }, "desktop"], ["light", { width: 390, height: 844 }, "phone"]]) {
  const ctx = await b.newContext({ viewport: vp, colorScheme: scheme, deviceScaleFactor: tag === "phone" ? 2 : 1 });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => console.log("pageerror", name, e.message));
  var name;
  for (const [n, hash, wait, sel] of pages) {
    name = n;
    if (tag === "phone" && n === "walk") continue;
    await p.goto(`${base}/${hash}`);
    await p.waitForTimeout(800);
    if (sel) await p.locator(sel).scrollIntoViewIfNeeded();
    await p.waitForTimeout(wait);
    const file = `${out}/${prefix}-${n}-${tag}-${scheme}.png`;
    await p.screenshot({ path: file });
    console.log(file);
  }
  await ctx.close();
}
await b.close();
