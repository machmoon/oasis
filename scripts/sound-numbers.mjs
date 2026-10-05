// Measures the sound registry and writes docs/sound-numbers.json: counts (sounds, kits, creators, knobs by type),
// render time per sound in the sandbox at 22.05 kHz, seed distinctness, and the factory's tally from stats.jsonl.
// node scripts/sound-numbers.mjs
import fs from "node:fs";
import { inspect, renderSound, SOUND_SR } from "../server/sandbox.js";
import { resolveKnobs } from "../server/knobs.js";
import { analyse } from "../public/sound-dsp.js";

const files = fs.readdirSync("sounds").filter((f) => f.endsWith(".mjs")).sort();
const rows = [];
for (const f of files) {
  const src = fs.readFileSync(`sounds/${f}`, "utf8");
  const { meta, params } = inspect(src);
  const defaults = resolveKnobs(params, {});
  const t = performance.now(); const s = renderSound(src, defaults, { sr: SOUND_SR }); const ms = Math.round(performance.now() - t);
  const a = analyse(s, SOUND_SR, { cols: 48, bins: 16 });
  const s2 = params.knobs.seed ? renderSound(src, resolveKnobs(params, { seed: params.knobs.seed.min + 7 }), { sr: SOUND_SR }) : s;
  let ab = 0, aa = 0, bb = 0; const n = Math.min(s.length, s2.length); for (let i = 0; i < n; i++) { ab += s[i] * s2[i]; aa += s[i] * s[i]; bb += s2[i] * s2[i]; }
  rows.push({ id: f.replace(/\.mjs$/, ""), title: meta.title, kind: meta.kind, kit: meta.kit || null, author: meta.author, price: meta.price, knobs: Object.keys(params.knobs).length, seconds: +a.seconds.toFixed(2), ms, peak: a.peak, rms: a.rms, centroid: a.centroid, seedCorrelation: +(ab / Math.sqrt(aa * bb || 1)).toFixed(3) });
}
const stats = fs.existsSync("factory/stats.jsonl") ? fs.readFileSync("factory/stats.jsonl", "utf8").trim().split("\n").map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter((j) => j && j.format === "sound") : [];
const tally = {};
for (const s of stats) tally[s.verdict] = (tally[s.verdict] || 0) + 1;
const byType = {};
for (const f of files) { const { params } = inspect(fs.readFileSync(`sounds/${f}`, "utf8")); for (const k of Object.values(params.knobs)) byType[k.type] = (byType[k.type] || 0) + 1; }
const out = {
  at: new Date().toISOString(), sounds: rows.length, kits: [...new Set(rows.map((r) => r.kit).filter(Boolean))].length, creators: [...new Set(rows.map((r) => r.author))].length,
  kinds: rows.reduce((m, r) => ((m[r.kind] = (m[r.kind] || 0) + 1), m), {}), knobsTotal: rows.reduce((s, r) => s + r.knobs, 0), knobsByType: byType,
  renderMs: { min: Math.min(...rows.map((r) => r.ms)), median: rows.map((r) => r.ms).sort((a, b) => a - b)[rows.length >> 1], max: Math.max(...rows.map((r) => r.ms)) },
  seedCorrelation: { max: Math.max(...rows.map((r) => r.seedCorrelation)), median: rows.map((r) => r.seedCorrelation).sort((a, b) => a - b)[rows.length >> 1] },
  factory: { builds: stats.length, ...tally, lessons: fs.existsSync("factory/lessons-sound.md") ? fs.readFileSync("factory/lessons-sound.md", "utf8").trim().split("\n").length : 0 },
  rows,
};
fs.writeFileSync("docs/sound-numbers.json", JSON.stringify(out, null, 1));
const { rows: _, ...summary } = out;
console.log(JSON.stringify(summary, null, 1));
