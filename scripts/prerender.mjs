// Pre-renders every asset at its defaults and in each Brand Mode preset into public/prerender/, so
// browsing the catalogue costs no sandbox time on a small host. Live renders only happen for remixes.
import fs from "node:fs";
import * as catalog from "../server/catalog.js";
import { BRAND_PRESETS } from "../public/brands.js";

const OUT = new URL("../public/prerender/", import.meta.url).pathname;
fs.mkdirSync(OUT, { recursive: true });
await catalog.load();
let n = 0;
for (const a of catalog.allAssets()) {
  for (const b of [null, ...BRAND_PRESETS]) {
    const input = b ? { brand: (({ name, ...c }) => c)(b) } : {};
    const { svg } = catalog.render(a, input);
    const out = a.price > 0 ? catalog.watermark(svg, catalog.sizeOf(svg, a.size)) : svg;
    fs.writeFileSync(`${OUT}${a.id}--${b ? b.slug : "default"}.svg`, out);
    // Low-res raster comps for cards and the hero: clean, quick to decode; full vectors stay gated.
    fs.writeFileSync(`${OUT}${a.id}--${b ? b.slug : "default"}.png`, await catalog.toPng(svg, 560));
    n++;
  }
}
console.log(`prerendered ${n} previews`);
process.exit(0); // the rasteriser child keeps the event loop alive
