// Full-page screenshot for design review: node scripts/shoot-full.mjs <url> <out.png> [waitMs] [width]
import { chromium } from "playwright";
const [url, out, wait = "7000", width = "1440"] = process.argv.slice(2);
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const p = await b.newPage({ viewport: { width: +width, height: 900 } });
await p.goto(url, { waitUntil: "domcontentloaded" });
await p.waitForTimeout(+wait);
// reveal every scroll-triggered block before the shot
await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); } scrollTo(0, 0); });
await p.waitForTimeout(800);
await p.screenshot({ path: out, fullPage: true });
await b.close();
