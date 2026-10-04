// Converts a TTF/OTF to three.js's typeface JSON (for FontLoader/TextGeometry), the way gero3/facetype.js does it
// (javascripts/main.js, convert()): every glyph's path in "m l q b z" commands, scaled to a resolution of 1000.
// Printable ASCII only, which is all a film title uses. Needs opentype.js, which is not a project dependency:
//   npx -y -p opentype.js node scripts/font-to-typeface.mjs in.ttf out.json   (or run it from a dir that has it)
import fs from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const opentype = require(process.env.OPENTYPE || "opentype.js");
const [src, out] = process.argv.slice(2);
const font = opentype.parse(fs.readFileSync(src).buffer.slice(0));
const scale = (1000 * 100) / ((font.unitsPerEm || 2048) * 72);
const r = Math.round, result = { glyphs: {} };
for (let i = 0; i < font.glyphs.length; i++) {
  const g = font.glyphs.get(i);
  for (const u of new Set([g.unicode, ...(g.unicodes || [])].filter((x) => x !== undefined))) {
    if (u < 32 || u > 126) continue;
    let o = "";
    for (const c of g.path.commands) {
      o += (c.type.toLowerCase() === "c" ? "b" : c.type.toLowerCase()) + " ";
      if (c.x !== undefined) o += `${r(c.x * scale)} ${r(c.y * scale)} `;
      if (c.x1 !== undefined) o += `${r(c.x1 * scale)} ${r(c.y1 * scale)} `;
      if (c.x2 !== undefined) o += `${r(c.x2 * scale)} ${r(c.y2 * scale)} `;
    }
    result.glyphs[String.fromCodePoint(u)] = { ha: r(g.advanceWidth * scale), x_min: r((g.xMin ?? 0) * scale), x_max: r((g.xMax ?? 0) * scale), o };
  }
}
const n = font.names.windows || font.names;
result.familyName = n.preferredFamily?.en || n.fontFamily?.en;
result.ascender = r(font.ascender * scale);
result.descender = r(font.descender * scale);
result.underlinePosition = r(font.tables.post.underlinePosition * scale);
result.underlineThickness = r(font.tables.post.underlineThickness * scale);
result.boundingBox = { yMin: r(font.tables.head.yMin * scale), xMin: r(font.tables.head.xMin * scale), yMax: r(font.tables.head.yMax * scale), xMax: r(font.tables.head.xMax * scale) };
result.resolution = 1000;
result.cssFontWeight = "normal";
result.cssFontStyle = "normal";
fs.writeFileSync(out, JSON.stringify(result));
console.log(out, Object.keys(result.glyphs).length, "glyphs");
