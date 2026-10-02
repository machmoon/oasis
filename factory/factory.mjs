// The Oasis asset factory: Claude writes a parametric asset program from a one-line brief, the
// sandbox proves it loads and renders across its knobs, then Claude looks at the rendered PNGs and
// revises once. Survivors are published to the catalogue with author "oasis-factory".
import fs from "node:fs";
import path from "node:path";
import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import { Resvg } from "@resvg/resvg-js";
import { inspect, renderSource } from "../server/sandbox.js";
import { resolveKnobs, applyPreset, brandKnobs } from "../server/knobs.js";
import { measure, BRAND_PROBES } from "./harness.mjs";
import { grade } from "./grader.mjs";
import { rolesFor, applyRoles } from "./annotate-roles.mjs";

const client = new Anthropic();
const MODEL = "claude-opus-5-5";
const ROOT = path.resolve(import.meta.dirname, "..");
const CONTRACT = fs.readFileSync(path.join(ROOT, process.env.FACTORY_CONTRACT || "factory/CONTRACT.md"), "utf8");
const EXAMPLES = (process.env.FACTORY_EXAMPLES || "organic-blob.mjs,line-icons.mjs").split(",")
  .map((f) => `--- assets/${f} ---\n${fs.readFileSync(path.join(ROOT, "assets", f), "utf8").slice(0, 16000)}`)
  .join("\n\n");

const LESSONS_FILE = path.join(ROOT, process.env.FACTORY_LESSONS || "factory/lessons.md");
const STATS_FILE = path.join(ROOT, "factory/stats.jsonl");
const lessons = () => (fs.existsSync(LESSONS_FILE) ? fs.readFileSync(LESSONS_FILE, "utf8").trim().split("\n").filter(Boolean).slice(-40) : []);
const SYSTEM_BASE = `You are a senior product designer and creative coder writing assets for Oasis, a marketplace where design assets are small programs with typed knobs that buyers remix before downloading.

${CONTRACT}

Two published examples follow. Match their contract exactly; exceed their craft.

${EXAMPLES}

Return ONLY the module source in one \`\`\`js fenced block. No commentary outside the block.`;
// Lessons written by the grader after earlier builds; every build reads all of them.
const SYSTEM = () => {
  const l = lessons();
  return l.length ? `${SYSTEM_BASE}\n\nLessons from earlier builds (each cost a rejection once; do not repeat them):\n${l.join("\n")}` : SYSTEM_BASE;
};

function extractCode(text) {
  const m = text.match(/```(?:js|javascript)?\n([\s\S]*?)```/);
  return (m ? m[1] : text).trim() + "\n";
}

function renderPngs(src) {
  const { meta, params } = inspect(src);
  const variants = [{}, ...Object.keys(params.presets || {}).slice(0, 2).map((n) => applyPreset(params, n))];
  // Also push every range knob to its max once, so broken extremes show up in review.
  const extreme = {};
  for (const [k, v] of Object.entries(params.knobs || {})) if (v.type === "range") extreme[k] = v.max;
  variants.push(extreme);
  const pngs = variants.map((input) => {
    const svg = renderSource(src, resolveKnobs(params, input));
    return new Resvg(svg, { fitTo: { mode: "width", value: 512 }, font: { loadSystemFonts: true } }).render().asPng();
  });
  return { meta, params, pngs };
}

async function ask(messages) {
  let msg;
  // Long streams occasionally drop (sleep, network); retry the turn rather than lose the build.
  for (let attempt = 0; ; attempt++) {
    try {
      msg = await client.messages
        .stream({ model: MODEL, max_tokens: 64000, output_config: { effort: process.env.FACTORY_EFFORT || "medium" }, system: SYSTEM(), messages })
        .finalMessage();
      break;
    } catch (e) {
      if (attempt >= 4 || (e.status && e.status < 500 && e.status !== 429)) throw e;
      await new Promise((r) => setTimeout(r, 5000 * 2 ** attempt));
    }
  }
  if (msg.stop_reason === "refusal") throw new Error("refused");
  if (msg.stop_reason === "max_tokens") console.log("  (response hit max_tokens; module is likely truncated)");
  return msg.content.filter((b) => b.type === "text").map((b) => b.text).join("");
}

export async function makeAsset(brief, slug, { outDir = path.join(ROOT, "assets"), log = console.log } = {}) {
  const started = Date.now();
  const messages = [{ role: "user", content: `Brief: ${brief}\nAsset id (file name): ${slug}` }];
  let src = extractCode(await ask(messages));
  let rendered;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      rendered = renderPngs(src);
      break;
    } catch (e) {
      log(`  [${slug}] sandbox rejected attempt ${attempt + 1}: ${e.message}`);
      messages.push({ role: "assistant", content: "```js\n" + src + "```" }, { role: "user", content: `The sandbox rejected it: ${e.message}\nFix it and return the full module.` });
      src = extractCode(await ask(messages));
    }
  }
  if (!rendered) throw new Error("never rendered");
  // Visual review: Claude sees its own output at defaults, two presets and every range at max.
  messages.push(
    { role: "assistant", content: "```js\n" + src + "```" },
    {
      role: "user",
      content: [
        ...rendered.pngs.map((png) => ({ type: "image", source: { type: "base64", media_type: "image/png", data: png.toString("base64") } })),
        { type: "text", text: "These are your renders: defaults, two presets, and every range knob at its maximum. Critique them as a design director would (composition, balance, colour, polish, anything clipped, overlapping or broken at the extremes). Then return the improved full module. If it is already excellent, return it unchanged." },
      ],
    },
  );
  const revised = extractCode(await ask(messages));
  try {
    rendered = renderPngs(revised);
    src = revised;
  } catch (e) {
    log(`  [${slug}] revision failed (${e.message}); keeping first version`);
  }
  const stat = { slug, brief, at: new Date().toISOString(), harness: [], grades: [], verdict: null };
  // The harness measures the program across its knob space; its failures go back to the builder.
  for (let fix = 0; fix < 3; fix++) {
    const rep = measure(src);
    stat.harness.push({ errors: rep.errors, warnings: rep.warnings, renders: rep.renders, worstMs: rep.slowestMs });
    if (!rep.errors.length) break;
    if (fix === 2) { stat.verdict = "rejected:harness"; break; }
    log(`  [${slug}] harness: ${rep.errors.join(" | ")}`);
    messages.push({ role: "assistant", content: "```js\n" + src + "```" }, { role: "user", content: `An automated harness measured your program and found: ${rep.errors.join("; ")}. Fix these and return the full module.` });
    try { const next = extractCode(await ask(messages)); renderPngs(next); src = next; } catch (e) { log(`  [${slug}] harness fix failed: ${e.message}`); }
  }
  // Brand roles, then the independent grader in a fresh session.
  if (!stat.verdict) {
    try { const roles = await rolesFor(src); src = applyRoles(src, roles); } catch (e) { log(`  [${slug}] roles: ${e.message}`); }
    for (let round = 0; round < 3 && !stat.verdict; round++) {
      const g = await grade({ brief, title: inspect(src).meta.title, ...gradeRenders(src) });
      stat.grades.push(g);
      if (g.lesson) fs.appendFileSync(LESSONS_FILE, `- ${g.lesson.replace(/\s+/g, " ").trim()}\n`);
      if (g.verdict === "publish") { stat.verdict = "published"; break; }
      if (round === 2) { stat.verdict = "rejected:grader"; break; }
      log(`  [${slug}] grader rejected: ${(g.flaws || []).join(" | ")}`);
      messages.push({ role: "assistant", content: "```js\n" + src + "```" }, { role: "user", content: `An independent reviewer rejected it: ${(g.flaws || []).join("; ")}. Scores: ${JSON.stringify(g.scores)}. Address every flaw and return the full module, keeping each colour knob's role.` });
      try { const next = extractCode(await ask(messages)); if (!measure(next).errors.length) src = next; } catch (e) { log(`  [${slug}] regrade fix failed: ${e.message}`); }
    }
  }
  stat.seconds = Math.round((Date.now() - started) / 1000);
  fs.appendFileSync(STATS_FILE, JSON.stringify(stat) + "\n");
  const dest = stat.verdict === "published" ? outDir : path.join(ROOT, "factory/rejected");
  fs.mkdirSync(dest, { recursive: true });
  fs.writeFileSync(path.join(dest, `${slug}.mjs`), src);
  return { slug, verdict: stat.verdict, meta: inspect(src).meta };
}

function gradeRenders(src) {
  const { params } = inspect(src);
  const shots = [["Defaults", {}]];
  for (const n of Object.keys(params.presets || {}).slice(0, 2)) shots.push([`Preset ${n}`, applyPreset(params, n)]);
  const hi = {};
  for (const [k, v] of Object.entries(params.knobs || {})) if (v.type === "range") hi[k] = v.max;
  shots.push(["Every range knob at its maximum", hi]);
  // Show the grader what each choice knob does (season, time, style...), so working knobs aren't marked unverified.
  for (const [k, v] of Object.entries(params.knobs || {}).filter(([, v]) => v.type === "choice").slice(0, 3)) {
    const alt = v.options.filter((o) => o !== v.default).slice(-1)[0];
    if (alt) shots.push([`Choice knob "${k}" set to "${alt}"`, { [k]: alt }]);
  }
  shots.push(["Light brand probe", brandKnobs(params, BRAND_PROBES.light)]);
  shots.push(["Dark brand probe", brandKnobs(params, BRAND_PROBES.dark)]);
  const pngs = shots.map(([, input]) => new Resvg(renderSource(src, resolveKnobs(params, input)), { fitTo: { mode: "width", value: 512 }, font: { loadSystemFonts: true } }).render().asPng());
  return { pngs, labels: shots.map(([l]) => l) };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const briefs = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
  const concurrency = Number(process.argv[3] || 4);
  const queue = briefs.filter((b) => !fs.existsSync(path.join(ROOT, "assets", `${b.slug}.mjs`)) && !fs.existsSync(path.join(ROOT, "factory/rejected", `${b.slug}.mjs`)));
  let done = 0;
  async function worker() {
    while (queue.length) {
      const b = queue.shift();
      const t = Date.now();
      try {
        const r = await makeAsset(b.brief, b.slug);
        console.log(`${r.verdict === "published" ? "ok  " : "REJ "} ${b.slug} ${r.verdict} (${((Date.now() - t) / 1000).toFixed(0)}s) [${++done}]`);
      } catch (e) {
        console.log(`FAIL ${b.slug}: ${e.message}`);
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
}
