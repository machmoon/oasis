// SVG to PNG in a supervised child process (server/raster-child.js). If resvg panics, the child dies, the request in
// flight fails with an error, and the next request gets a fresh child, while the server keeps serving.
import { fork } from "node:child_process";

let child = null, seq = 0;
const pending = new Map();

function spawn() {
  child = fork(new URL("./raster-child.js", import.meta.url), { serialization: "advanced", stdio: ["ignore", "ignore", "pipe", "ipc"] });
  child.on("message", ({ id, png, error }) => {
    const p = pending.get(id);
    if (!p) return;
    pending.delete(id);
    clearTimeout(p.timer);
    error ? p.reject(new Error(`Could not rasterise: ${error}`)) : p.resolve(Buffer.from(png, "base64"));
  });
  child.on("exit", () => {
    child = null;
    for (const [id, p] of pending) { clearTimeout(p.timer); p.reject(new Error("The rasteriser crashed on this image")); pending.delete(id); }
  });
}

/** Resolves to PNG bytes `width` px wide; rejects (and never takes the server down) if the SVG breaks resvg. */
export async function rasterize(svg, width = 1024) {
  try { return await once(svg, width, true); }
  catch (e) { if (!/crashed/.test(e.message)) throw e; return once(svg, width, false); } // retry without system fonts
}
function once(svg, width, systemFonts) {
  if (!child) spawn();
  const id = ++seq;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { pending.delete(id); reject(new Error("Rasterising timed out")); child?.kill(); }, 15_000);
    pending.set(id, { resolve, reject, timer });
    child.send({ id, svg, width, systemFonts });
  });
}
