import { chromium } from "playwright";
const [,, outDir, ...pages] = process.argv;
const b = await chromium.launch();
for (const spec of pages) {
  const [name, url, dark] = spec.split("|");
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, colorScheme: dark ? "dark" : "light" });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => console.log(name, "pageerror", e.message));
  p.on("console", (m) => { if (m.type() === "error") console.log(name, "console", m.text()); });
  await p.goto(url, { waitUntil: "networkidle" });
  await p.waitForTimeout(2500);
  await p.screenshot({ path: `${outDir}/${name}.png`, fullPage: true });
  console.log("shot", name);
  await ctx.close();
}
await b.close();
