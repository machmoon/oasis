// Stills from a film, through the same render page the MP4 uses: node scripts/film-frames.mjs <base> <filmId> <outDir> <seconds...>
// Used to check the edit (ramps, transitions, the title) frame by frame, and to feed the judging panel.
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const [base, id, out, ...times] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: process.platform === "darwin" ? ["--use-angle=metal", "--ignore-gpu-blocklist"] : ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 1280 } });
page.on("console", (m) => m.type() === "error" && console.error("page:", m.text()));
await page.goto(`${base}/film.html?id=${encodeURIComponent(id)}`);
await page.waitForFunction(() => window.__film?.ready || window.__film?.error, null, { timeout: 120_000 });
const err = await page.evaluate(() => window.__film.error);
if (err) throw new Error(err);
const fps = await page.evaluate(() => window.__film.fps);
for (const s of times) {
  const frame = Math.round(Number(s) * fps);
  const [url] = await page.evaluate((f) => window.__film.frames(f, 1), frame);
  const file = path.join(out, `t${Number(s).toFixed(2).padStart(6, "0")}.jpg`);
  fs.writeFileSync(file, Buffer.from(url.split(",")[1], "base64"));
  console.log(file);
}
await browser.close();
