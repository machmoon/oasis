// Renders every asset (default + each preset) to PNG so a human can review the catalogue at a glance.
import fs from "node:fs";
import path from "node:path";
import { Resvg } from "@resvg/resvg-js";
import { inspect, renderSource } from "../server/sandbox.js";
import { resolveKnobs, applyPreset } from "../server/knobs.js";

const dir = process.argv[2] || "assets";
const outDir = process.argv[3] || "/tmp/oasis-sheet";
fs.mkdirSync(outDir, { recursive: true });
const only = process.argv[4];
for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(".mjs"))) {
  if (only && !f.includes(only)) continue;
  const src = fs.readFileSync(path.join(dir, f), "utf8");
  try {
    const { params } = inspect(src);
    const variants = [["default", {}], ...Object.keys(params.presets || {}).map((n) => [n, applyPreset(params, n)])];
    for (const [name, input] of variants.slice(0, 3)) {
      const svg = renderSource(src, resolveKnobs(params, input));
      const png = new Resvg(svg, { fitTo: { mode: "width", value: 360 }, font: { loadSystemFonts: true } }).render().asPng();
      fs.writeFileSync(path.join(outDir, `${f.replace(".mjs", "")}--${name}.png`), png);
    }
    console.log("ok  ", f);
  } catch (e) {
    console.log("FAIL", f, e.message);
  }
}
