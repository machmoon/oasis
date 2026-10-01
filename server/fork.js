// "Fork with AI": Claude rewrites an asset program to a new creative direction. The fork keeps its
// lineage, so every future sale of it pays the original creator (see commerce.royaltySplit).
import fs from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
import { inspect, renderSource } from "./sandbox.js";
import { resolveKnobs } from "./knobs.js";
import * as catalog from "./catalog.js";
import { config } from "./config.js";

const CONTRACT = fs.readFileSync(new URL("../factory/CONTRACT.md", import.meta.url), "utf8");
let client;

export async function forkAsset({ assetId, instruction, author = "anonymous", payoutEmail = null, price }) {
  const parent = catalog.getAsset(assetId);
  if (!parent) throw Object.assign(new Error("Unknown asset"), { status: 404 });
  if (!instruction || instruction.length < 3) throw Object.assign(new Error("Say how to change it"), { status: 400 });
  client ||= new Anthropic({ apiKey: config.anthropicKey });
  const system = `You fork design-asset programs for Oasis. Keep the asset contract below exactly. Keep what makes the parent good, change what the instruction asks, and make the result feel like a new, sellable asset (new title, description, tags, presets). Set meta.author to "${author.replace(/"/g, "")}". Return ONLY the full module in one \`\`\`js block.\n\n${CONTRACT}`;
  const messages = [{ role: "user", content: `Parent program (${parent.id}):\n\`\`\`js\n${parent.source}\n\`\`\`\n\nFork instruction: ${instruction.slice(0, 600)}` }];
  let src, err;
  for (let attempt = 0; attempt < 2; attempt++) {
    const msg = await client.messages
      .stream({ model: config.agentModel, max_tokens: 32000, output_config: { effort: "medium" }, system, messages })
      .finalMessage();
    if (msg.stop_reason === "refusal") throw Object.assign(new Error("The model declined this fork"), { status: 422 });
    const text = msg.content.filter((b) => b.type === "text").map((b) => b.text).join("");
    src = (text.match(/```(?:js|javascript)?\n([\s\S]*?)```/)?.[1] || text).trim() + "\n";
    try {
      const { params } = inspect(src);
      renderSource(src, resolveKnobs(params, {}));
      err = null;
      break;
    } catch (e) {
      err = e;
      messages.push({ role: "assistant", content: text }, { role: "user", content: `The sandbox rejected it: ${e.message}. Return the fixed full module.` });
    }
  }
  if (err) throw Object.assign(new Error(`Fork did not render: ${err.message}`), { status: 422 });
  const { meta } = inspect(src);
  const id = catalog.newId((meta.title || parent.id).toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 28).replace(/-$/, ""));
  const fixedPrice = price !== undefined ? Math.min(50, Math.max(0, Math.round(Number(price) * 100) / 100)) : Math.max(1, parent.price || 2);
  return catalog.addFork({
    id,
    source: src.replace(/price:\s*[\d.]+/, `price: ${fixedPrice}`),
    forkedFrom: parent.id,
    lineage: [parent.id, ...(parent.lineage || [])].slice(0, 6),
    instruction: instruction.slice(0, 600),
    author,
    payoutEmail,
    price: fixedPrice,
    createdAt: new Date().toISOString(),
  });
}
