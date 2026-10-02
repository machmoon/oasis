// Screenshots of Oasis for the judge panel: the live site when it's up, else localhost.
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
const require = createRequire("/Users/patliu/Desktop/Coding/oasis-video/package.json");
const { chromium } = require("playwright");
const OUT = "/Users/patliu/Desktop/Coding/oasis/judging/shots/";
let base = "https://oasis-design.onrender.com";
try { if (execSync(`curl -s -m 25 -o /dev/null -w '%{http_code}' ${base}/api/config`).toString() !== "200") base = "http://localhost:8787"; } catch { base = "http://localhost:8787"; }
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 }, colorScheme: "light" });
for (const [name, route] of [["1-home", "/#/"], ["2-browse", "/#/browse"], ["3-asset", "/#/a/pricing-card"], ["4-agent", "/#/agent"]]) {
  try {
    await p.goto(base + route, { timeout: 60000 });
    await p.waitForLoadState("networkidle", { timeout: 60000 });
    await p.waitForTimeout(1500);
    await p.screenshot({ path: OUT + name + ".png" });
  } catch {}
}
await b.close();
