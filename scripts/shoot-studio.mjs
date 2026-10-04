// Screenshots of the Studio at a given route, for design review and the judging panel:
// node scripts/shoot-studio.mjs <url> <out.png> [waitMs] [seekSeconds]
import { chromium } from "playwright";
const [url, out, wait = "9000", seek] = process.argv.slice(2);
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
p.on("pageerror", (e) => console.error("pageerror:", e.message));
p.on("console", (m) => m.type() === "error" && console.error("console:", m.text()));
await p.goto(url, { waitUntil: "domcontentloaded" });
await p.waitForTimeout(+wait);
if (seek) await p.evaluate((t) => { window.__player?.pause(); window.__player?.goto(t); }, +seek);
await p.waitForTimeout(800);
await p.screenshot({ path: out });
await b.close();
