// The Oasis asset factory: Claude writes a parametric asset program from a one-line brief, the
// sandbox proves it loads and renders across its knobs, then Claude looks at the rendered PNGs and
// revises once. Survivors are published to the catalogue with author "oasis-factory".
import fs from "node:fs";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { Resvg } from "@resvg/resvg-js";
import { inspect, renderSource } from "../server/sandbox.js";
import { resolveKnobs, applyPreset } from "../server/knobs.js";

const client = new Anthropic();
const MODEL = "claude-opus-5-5";
const ROOT = path.resolve(import.meta.dirname, "..");
const CONTRACT = fs.readFileSync(path.join(ROOT, "factory/CONTRACT.md"), "utf8");
const EXAMPLES = ["organic-blob.mjs", "line-icons.mjs"]
  .map((f) => `--- assets/${f} ---\n${fs.readFileSync(path.join(ROOT, "assets", f), "utf8").slice(0, 6000)}`)
  .join("\n\n");

const SYSTEM = `You are a senior product designer and creative coder writing assets for Oasis, a marketplace where design assets are small programs with typed knobs that buyers remix before downloading.

${CONTRACT}

Two published examples follow. Match their contract exactly; exceed their craft.

${EXAMPLES}

Return ONLY the module source in one \`\`\`js fenced block. No commentary outside the block.`;

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
  const msg = await client.messages
    .stream({ model: MODEL, max_tokens: 32000, output_config: { effort: "high" }, system: SYSTEM, messages })
    .finalMessage();
  if (msg.stop_reason === "refusal") throw new Error("refused");
  return msg.content.filter((b) => b.type === "text").map((b) => b.text).join("");
}

export async function makeAsset(brief, slug, { outDir = path.join(ROOT, "assets"), log = console.log } = {}) {
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
  fs.writeFileSync(path.join(outDir, `${slug}.mjs`), src);
  return { slug, meta: rendered.meta, png: rendered.pngs[0] };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const briefs = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
  const concurrency = Number(process.argv[3] || 4);
  const queue = briefs.filter((b) => !fs.existsSync(path.join(ROOT, "assets", `${b.slug}.mjs`)));
  let done = 0;
  async function worker() {
    while (queue.length) {
      const b = queue.shift();
      const t = Date.now();
      try {
        await makeAsset(b.brief, b.slug);
        console.log(`ok   ${b.slug} (${((Date.now() - t) / 1000).toFixed(0)}s) [${++done}]`);
      } catch (e) {
        console.log(`FAIL ${b.slug}: ${e.message}`);
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
}
