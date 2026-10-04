// The rasteriser's child process: SVG in, PNG out, over IPC. resvg is native code, and a panic in it (one malformed
// path is enough) aborts the whole process, worker threads included; living in its own process, it can only take
// itself down. server/raster.js restarts it.
import { Resvg } from "@resvg/resvg-js";
process.on("message", ({ id, svg, width, systemFonts = true }) => {
  try {
    const png = new Resvg(svg, { fitTo: { mode: "width", value: width }, font: { loadSystemFonts: systemFonts } }).render().asPng();
    process.send({ id, png: Buffer.from(png).toString("base64") });
  } catch (e) {
    process.send({ id, error: String(e?.message || e) });
  }
});
