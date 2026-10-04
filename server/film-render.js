// Renders a film to MP4 the way Remotion renders a composition (remotion-dev/remotion,
// packages/renderer/src/render-frames.ts): open the film's page in headless Chromium, seek it to every frame,
// grab the pixels, and stitch them with ffmpeg. The page renders frame N from the film alone (public/film-player.js),
// so two renders of the same film are the same video, and the Studio's live preview is the same picture.
//
// Playwright is optional: a server without it (or without ffmpeg) reports that server rendering is unavailable and
// the browser's own export (MediaRecorder, real-time) is the fallback.
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { config } from "./config.js";
import * as film from "./film.js";
import { musicFor } from "./film-music.js";

const queue = [];
let running = false;
export const mp4Path = (id) => path.join(config.dataDir, "films", `${id}.mp4`);
/** The poster frame: two seconds into the shot where dusk turns to night (the windows come on), else 70% in. */
function posterAt(f) {
  let t = 0;
  for (const s of f.shots) { if (s.timeTo === "night") return t + Math.min(2.2, s.seconds * 0.8); t += s.seconds; }
  return f.seconds * 0.7;
}
export const posterPath = (id) => path.join(config.dataDir, "films", `${id}.poster.jpg`);

let playwright = null;
export async function available() {
  if (playwright === null) {
    try { playwright = (await import("playwright")).chromium; } catch { playwright = false; }
  }
  const ffmpeg = await new Promise((r) => { const p = spawn("ffmpeg", ["-version"]); p.on("error", () => r(false)); p.on("exit", (c) => r(c === 0)); });
  return !!playwright && ffmpeg;
}

/** Queues a render; progress lands on the film record (status, progress, frames). Resolves when queued. */
export function enqueue(id) {
  if (!queue.includes(id)) queue.push(id);
  pump();
}
async function pump() {
  if (running || !queue.length) return;
  running = true;
  const id = queue.shift();
  try { await render(id); }
  catch (e) {
    console.error("film render", id, e);
    const f = await film.get(id);
    if (f) await film.save(f, { render: { status: "failed", error: e.message.slice(0, 200), at: new Date().toISOString() } });
  }
  running = false;
  pump();
}

async function render(id) {
  let f = await film.get(id);
  if (!f) throw new Error("No such film");
  if (!(await available())) throw new Error("Server rendering needs Playwright and ffmpeg");
  const frames = Math.round(f.seconds * f.fps), [w, h] = f.size;
  await film.save(f, { render: { status: "rendering", progress: 0, frames, at: new Date().toISOString() } });
  fs.mkdirSync(path.dirname(mp4Path(id)), { recursive: true });
  const out = mp4Path(id) + ".part.mp4";
  // the soundtrack is generated from the film and muxed in; -shortest trims it to the picture
  const wav = mp4Path(id).replace(/\.mp4$/, ".wav");
  if (f.music) fs.writeFileSync(wav, musicFor(f));
  const ff = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(f.fps), "-c:v", "mjpeg", "-i", "-",
    ...(f.music ? ["-i", wav, "-c:a", "aac", "-b:a", "160k", "-shortest"] : []),
    "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-movflags", "+faststart", out]);
  let ffErr = "";
  ff.stderr.on("data", (d) => (ffErr += d));
  const done = new Promise((res, rej) => { ff.on("error", rej); ff.on("exit", (c) => (c === 0 ? res() : rej(new Error(`ffmpeg exited ${c}: ${ffErr.slice(0, 300)}`)))); });

  // On a Mac the GPU renders through ANGLE's Metal backend (about 40x faster than software on an M4); a server without a
  // GPU falls back to SwiftShader. Same frames either way, since every frame is a function of the film.
  const args = process.platform === "darwin" && !process.env.OASIS_RENDER_SOFTWARE ? ["--use-angle=metal", "--ignore-gpu-blocklist"] : ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"];
  const browser = await playwright.launch({ args });
  try {
    const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    page.on("pageerror", (e) => console.error("film page", e.message));
    await page.goto(`http://127.0.0.1:${config.port}/film.html?id=${encodeURIComponent(id)}&render=1`, { waitUntil: "load" });
    await page.waitForFunction(() => window.__film?.ready === true, null, { timeout: 60_000 });
    const BATCH = 8;
    for (let i = 0; i < frames; i += BATCH) {
      const n = Math.min(BATCH, frames - i);
      // Each frame is seeked and composited in the page, then handed over as JPEG; ffmpeg's stdin takes the batch.
      const shots = await page.evaluate(([from, count]) => window.__film.frames(from, count), [i, n]);
      for (const s of shots) {
        if (!ff.stdin.write(Buffer.from(s.slice(s.indexOf(",") + 1), "base64"))) await new Promise((r) => ff.stdin.once("drain", r));
      }
      f = await film.get(id);
      await film.save(f, { render: { ...f.render, status: "rendering", progress: Math.round(((i + n) / frames) * 100) / 100, frames } });
    }
  } finally {
    await browser.close();
  }
  ff.stdin.end();
  await done;
  fs.renameSync(out, mp4Path(id));
  // a poster frame from the film's last third (the night shots), so a page that can't play H.264 never shows black
  await new Promise((res) => { const p = spawn("ffmpeg", ["-y", "-loglevel", "error", "-ss", String(posterAt(f)), "-i", mp4Path(id), "-frames:v", "1", "-q:v", "3", posterPath(id)]); p.on("exit", res); p.on("error", res); });
  f = await film.get(id);
  await film.save(f, { render: { status: "done", progress: 1, frames, bytes: fs.statSync(mp4Path(id)).size, at: new Date().toISOString(), url: `${config.baseUrl}/api/films/${id}/film.mp4` } });
}
