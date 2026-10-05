// Two short screen recordings for docs/figures/sound/: a knob turn morphing the waveform, and a sound playing with the
// live spectrum and scope. `node scripts/sound-videos.mjs <base> <outdir>`. Headless Playwright recordVideo only.
import { chromium } from "playwright";
import { mkdirSync, renameSync, rmSync } from "node:fs";

const [base = "http://localhost:8799", out = "docs/figures/sound"] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ args: ["--autoplay-policy=no-user-gesture-required"] });

async function record(name, fn) {
  const dir = `${out}/.rec-${name}`;
  const ctx = await b.newContext({ viewport: { width: 1280, height: 760 }, recordVideo: { dir, size: { width: 1280, height: 760 } } });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => console.log("pageerror", e.message));
  await fn(p);
  const v = p.video();
  await ctx.close();
  renameSync(await v.path(), `${out}/${name}.webm`);
  rmSync(dir, { recursive: true, force: true });
  console.log(`${out}/${name}.webm`);
}

const open = async (p) => {
  await p.goto(`${base}/#/a/footstep`);
  await p.waitForSelector("#sp-readout b", { timeout: 90000 });
  await p.evaluate(() => window.scrollTo(0, 250));
  await p.waitForTimeout(1200);
};

// 1. turning knobs: weight up by drag, then the surface choice detent by detent; each render morphs out of the last
await record("knob-morph", async (p) => {
  await open(p);
  // waits for the render log to grow, so each step is filmed after its rebuild landed and the morph ran
  const rendered = async (n) => { await p.waitForFunction((n) => document.querySelectorAll("#a-log li:not(.empty)").length >= n, n, { timeout: 90000 }); await p.waitForTimeout(900); };
  const drag = async (sel, dy) => {
    const box = await p.locator(`${sel} .dial`).boundingBox();
    const x = box.x + box.width / 2, y = box.y + box.height / 2;
    await p.mouse.move(x, y); await p.mouse.down();
    for (let i = 1; i <= 12; i++) { await p.mouse.move(x, y - (dy * i) / 12); await p.waitForTimeout(30); }
    await p.mouse.up();
  };
  await drag("#k-weight", 60); await rendered(1);
  await p.locator("#k-surface .dial").focus(); await p.keyboard.press("ArrowRight"); await rendered(2);
  await p.keyboard.press("ArrowRight"); await rendered(3);
  await drag("#k-wetness", 90); await rendered(4);
  await p.locator("#k-pace .dial").focus(); await p.keyboard.press("PageUp"); await p.keyboard.press("PageUp"); await rendered(5);
});

// 2. a sound playing on loop: the cursor crosses the waveform and spectrogram, the live spectrum and scope move
await record("live-analyser", async (p) => {
  await open(p);
  await p.click("#sp-loop");
  await p.waitForTimeout(5500);
  await p.click("#sp-play");
  await p.waitForTimeout(600);
});
await b.close();
