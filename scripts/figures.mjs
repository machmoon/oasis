// Builds the submission figures from real renders (no mockups): each figure is an HTML page
// screenshotted by Playwright into docs/figures/*.png.
import fs from "node:fs";
import * as catalog from "../server/catalog.js";
import { BRAND_PRESETS } from "../public/brands.js";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require("/Users/patliu/Desktop/Coding/oasis-video/node_modules/playwright");

await catalog.load();
const OUT = new URL("../docs/figures/", import.meta.url).pathname;
const uri = (svg) => "data:image/svg+xml;base64," + Buffer.from(svg).toString("base64");
const shot = (id, input = {}) => {
  const a = catalog.getAsset(id);
  const { svg, values } = catalog.render(a, input);
  return { a, svg, values, size: catalog.sizeOf(svg, a.size), src: uri(svg) };
};
const brand = (b) => (({ name, slug, ...c }) => c)(b);

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,800&family=Geist:wght@400;500;600&family=Geist+Mono:wght@500&display=swap');
*{box-sizing:border-box} body{margin:0;background:#EEF1F5;color:#15171C;font-family:'Geist',sans-serif;width:1600px;height:1000px;padding:56px 72px;display:flex;flex-direction:column}
.logo{display:flex;align-items:center;gap:10px;font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:28px;letter-spacing:-.03em}
h1{font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:66px;letter-spacing:-.035em;line-height:1;margin:22px 0 12px;text-align:center;letter-spacing:-.01em} h1 em{font-style:normal;color:#E8452A}
.sub{text-align:center;color:#646B78;font-size:20px;max-width:1000px;margin:0 auto 28px}
.mono{font-family:'Geist Mono',monospace;font-size:16px;color:#646B78}
.foot{margin-top:auto;text-align:right;font-size:15px;color:#646B78}`;
const LOGO = `<div class="logo"><svg viewBox="0 0 32 32" width="30" height="30"><path d="M16 3 28 10 16 17 4 10Z" fill="#FF5B37"/><path d="M4 10 16 17V30L4 23Z" fill="#15171C"/><path d="M28 10 16 17V30L28 23Z" fill="#3C424D"/><path d="M16 6.5 22 10 16 13.5 10 10Z" fill="#FFD58A"/></svg>Oasis</div>`;
const page = (body, extra = "") => `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}${extra}</style></head><body>${LOGO}${body}</body></html>`;

const figs = {};

// 1. Rebuilt, not stretched.
{
  const a = shot("pricing-card", { features: 3, popular: false, plan: "Starter", price: "$12" });
  const b = shot("pricing-card", { features: 6, plan: "Studio", price: "$29" });
  const c = shot("isometric-city", { grid: 2, seed: 41 });
  const d = shot("isometric-city", { grid: 5, seed: 41 });
  const fig = (s, cap) => `<div class="f"><div class="box"><img src="${s.src}"/></div><div class="mono">${cap}</div></div>`;
  figs["01-rebuilt-not-stretched"] = page(`<h1>Change it <em>after</em> you find it</h1><p class="sub">Same two programs at two settings each. Nothing is scaled: the card grows rows and a badge, the city grows blocks. Stretching a file can't add a fourth feature row.</p>
  <div class="row">${fig(a, `features 3 · no badge · ${a.size[0]}×${a.size[1]}`)}${fig(b, `features 6 · badge · ${b.size[0]}×${b.size[1]}`)}${fig(c, "grid 2 · 4 blocks")}${fig(d, "grid 5 · 25 blocks")}</div><div class="foot">every Oasis asset is an ES module: knobs in, SVG out</div>`,
  `.row{display:grid;grid-template-columns:repeat(4,1fr);gap:22px;flex:1;min-height:0}.f{display:flex;flex-direction:column;gap:10px;min-height:0}.box{flex:1;min-height:0;background:#fff;border:2px solid #15171C;border-radius:18px;box-shadow:0 4px 0 #15171C;display:grid;place-items:center;padding:14px}.box img{max-width:100%;max-height:560px}`);
}

// 2. One brand, every asset.
{
  const ids = ["oasis-town", "pricing-card", "phone-mockup", "line-icons", "bauhaus-poster", "spot-illustrations", "app-icon"];
  const brands = [BRAND_PRESETS[0], BRAND_PRESETS[3], BRAND_PRESETS[2]];
  const rows = brands.map((b) => `<div class="brow"><div class="bname"><i>${["background", "ink", "primary", "secondary", "highlight"].map((r) => `<s style="background:${b[r]}"></s>`).join("")}</i>${b.name}</div>${ids.map((id) => `<div class="cell"><img src="${shot(id, { brand: brand(b) }).src}"/></div>`).join("")}</div>`).join("");
  figs["02-one-brand-every-asset"] = page(`<h1>One brand, <em>every</em> asset</h1><p class="sub">Every colour knob in the catalogue declares a role (background, ink, primary…). Set your brand once and all of Oasis re-renders in it, including dark mode for components with a theme.</p>${rows}<div class="foot">3 brands × 7 assets, one request each, no hand-editing</div>`,
  `.brow{display:grid;grid-template-columns:150px repeat(7,1fr);gap:12px;align-items:center;margin-bottom:10px}.bname{font-weight:600;font-size:17px;display:flex;flex-direction:column;gap:8px}.bname i{display:flex;border-radius:99px;overflow:hidden;width:110px}.bname s{flex:1;height:18px}.cell{background:#fff;border:2px solid #15171C;border-radius:14px;box-shadow:0 3px 0 #15171C;height:212px;display:grid;place-items:center;overflow:hidden}.cell img{max-width:100%;max-height:100%;object-fit:contain}`);
}

// 3. Forks pay upstream.
{
  const chain = ["pricing-card", "gilded-deco-tier-0f823929", "lantern-fortune-tier-5b119cb5"].map((id) => shot(id));
  const split = await import("../server/commerce.js").then((m) => m.royaltySplit(catalog.getAsset("lantern-fortune-tier-5b119cb5"), 8));
  const card = (s, role) => `<div class="node"><div class="img"><img src="${s.src}"/></div><b>${s.a.title}</b><span>${role} · by ${s.a.author}${s.a.price ? ` · $${s.a.price}` : ""}</span></div>`;
  figs["03-forks-pay-upstream"] = page(`<h1>Forks pay <em>upstream</em></h1><p class="sub">Anyone can fork an asset with AI and sell it. A licence of the grandchild pays everyone it came from, through PayPal Payouts, the moment payment is captured.</p>
  <div class="chain">${card(chain[0], "original")}<div class="arr">fork →<small>“art deco, black and gold”</small></div>${card(chain[1], "fork")}<div class="arr">fork →<small>“Lunar New Year, red lacquer”</small></div>${card(chain[2], "fork of a fork")}</div>
  <div class="split">A $8 licence of <b>Lantern Fortune Tier</b> splits: ${split.map((s) => `<span>${s.role} <b>$${(s.cents / 100).toFixed(2)}</b></span>`).join("")}</div>`,
  `.chain{display:flex;align-items:center;gap:18px;justify-content:center;flex:1;min-height:0}.node{width:330px;display:flex;flex-direction:column;gap:6px}.node .img{background:#fff;border:2px solid #15171C;border-radius:18px;box-shadow:0 4px 0 #15171C;height:440px;display:grid;place-items:center;padding:12px}.node img{max-height:100%;max-width:100%}.node b{font-size:19px}.node span{color:#646B78;font-size:15px}.arr{font-family:'Instrument Serif',serif;font-size:30px;color:#E8452A;text-align:center;display:flex;flex-direction:column}.arr small{font-family:'Instrument Sans';font-size:14px;color:#646B78;max-width:150px}.split{margin-top:22px;text-align:center;font-size:20px;display:flex;gap:22px;justify-content:center;flex-wrap:wrap}.split span{background:#fff;border:2px solid #15171C;border-radius:99px;box-shadow:0 3px 0 #15171C;padding:8px 16px}`);
}

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
for (const [name, html] of Object.entries(figs)) {
  fs.writeFileSync(`${OUT}${name}.html`, html);
  await p.goto("file://" + OUT + name + ".html");
  await p.waitForTimeout(1200);
  await p.screenshot({ path: `${OUT}${name}.png` });
  console.log("figure", name);
}
await b.close();
