// Re-grades rejected sound programs against the current bar (one grader call each, no rebuild): a program the
// harness passes and the grader now scores high enough moves from factory/rejected-sound/ to sounds/.
//   node factory/regrade-sound.mjs
import fs from "node:fs";
import path from "node:path";
import "dotenv/config";
import { inspect, renderSound, SOUND_SR } from "../server/sandbox.js";
import { resolveKnobs } from "../server/knobs.js";
import { analyse } from "../public/sound-dsp.js";
import { cardPng } from "../server/sound.js";
import { measure } from "./harness-sound.mjs";
import { gradeSound } from "./grader-sound.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const REJ = path.join(ROOT, "factory/rejected-sound"), OUT = path.join(ROOT, "sounds");
const briefs = JSON.parse(fs.readFileSync(path.join(ROOT, "factory/briefs-sound.json"), "utf8"));
const STATS = path.join(ROOT, "factory/stats.jsonl");

function shots(src) {
  const { meta, params } = inspect(src);
  const list = [["Defaults", {}]];
  for (const [k, v] of Object.entries(params.knobs || {}).filter(([, v]) => v.type === "choice").slice(0, 2)) for (const o of v.options.filter((o) => o !== v.default).slice(0, 2)) list.push([`${k} = ${o}`, { [k]: o }]);
  const lo = {}, hi = {};
  for (const [k, v] of Object.entries(params.knobs || {})) if (v.type === "range" && k !== "seed") { lo[k] = v.min; hi[k] = v.max; }
  list.push(["Every range at its minimum", lo], ["Every range at its maximum", hi]);
  if (params.knobs?.seed) list.push(["Seed 2", { seed: params.knobs.seed.min + 1 }], ["Seed 3", { seed: params.knobs.seed.min + 2 }]);
  const pngs = [], numbers = [];
  for (const [, input] of list) { const s = renderSound(src, resolveKnobs(params, input), { sr: SOUND_SR }); const a = analyse(s, SOUND_SR, { cols: 320 }); pngs.push(cardPng(a, 448)); numbers.push(`${a.seconds.toFixed(2)} s, peak ${a.peak}, rms ${a.rms}, centroid ${a.centroid} Hz, silence ${Math.round(a.silence * 100)}%`); }
  return { meta, pngs, labels: list.map(([l]) => l), numbers };
}

const files = fs.existsSync(REJ) ? fs.readdirSync(REJ).filter((f) => f.endsWith(".mjs")) : [];
let moved = 0;
await Promise.all(Array.from({ length: 4 }, async () => {
  while (files.length) {
    const f = files.shift(), slug = f.replace(/\.mjs$/, ""), src = fs.readFileSync(path.join(REJ, f), "utf8");
    const b = briefs.find((x) => x.slug === slug);
    if (!b) continue;
    const rep = measure(src);
    if (rep.errors.length) { console.log(`skip ${slug}: ${rep.errors[0]}`); continue; }
    try {
      const sh = shots(src);
      const g = await gradeSound({ brief: b.brief, title: sh.meta.title, pngs: sh.pngs, labels: sh.labels, numbers: sh.numbers });
      const vals = Object.values(g.scores || {}).map(Number);
      const ok = vals.length >= 4 && vals.every((v) => v >= 5) && vals.reduce((a, c) => a + c, 0) / vals.length >= 6.5;
      fs.appendFileSync(STATS, JSON.stringify({ slug, kit: b.kit, at: new Date().toISOString(), regrade: g, verdict: ok ? "published:regrade" : "rejected:regrade", format: "sound" }) + "\n");
      if (ok) { fs.renameSync(path.join(REJ, f), path.join(OUT, f)); moved++; }
      console.log(`${ok ? "ok  " : "REJ "} ${slug} ${vals.join("")}`);
    } catch (e) { console.log(`FAIL ${slug}: ${e.message}`); }
  }
}));
console.log(`${moved} moved to sounds/`);
