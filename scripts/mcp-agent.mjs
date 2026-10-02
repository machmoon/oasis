// An outside agent shopping on Oasis over MCP, the way Claude Desktop or Cursor would: it only knows the /mcp URL.
// Claude gets the server's tools, a brief and a spending cap, and runs until it stops. The transcript is written
// to docs/mcp-session.md. Run: node scripts/mcp-agent.mjs [url]
import "dotenv/config";
import fs from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const URL_ = process.argv[2] || "https://oasis-design.onrender.com/mcp";
const CAP = Number(process.env.CAP || 8);
// The human's side: issue a mandate (the same call the "Give your agent a budget" form makes) and hand over the token.
const ORIGIN = new URL(URL_).origin;
const issued = await fetch(`${ORIGIN}/api/mandates`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ description: "App icon and pricing card for Lumen", max_total_usd: CAP, expires_in_hours: 1 }) }).then((r) => r.json());
const BRIEF = process.env.BRIEF || `I'm launching Lumen, a reading app. Brand: ink #1B1F3B, paper #F7F3EA, amber #F2A541. Find me an app icon and a pricing card in that brand, then open a PayPal order for both. I've given you a $${CAP} budget: mandate token ${issued.token}.`;

const mcp = new Client({ name: "oasis-external-agent", version: "1.0.0" });
await mcp.connect(new StreamableHTTPClientTransport(new URL(URL_)));
const { tools } = await mcp.listTools();
const log = [`# An outside agent on Oasis over MCP`, ``, `Recorded ${new Date().toISOString()} by \`scripts/mcp-agent.mjs\` against \`${URL_}\`.`,
  `The agent is Claude (claude-opus-5-5) with no Oasis code: only the tools the MCP server lists (${tools.map((t) => `\`${t.name}\``).join(", ")}).`, ``, `**The human issued** mandate \`${issued.mandate?.id}\` ($${CAP}, 1 hour) and pasted its token into the brief.`, ``, `**Brief:** ${BRIEF.replace(issued.token, "mdt_…")}`, ``];

const claude = new Anthropic();
const messages = [{ role: "user", content: BRIEF }];
for (let turn = 0; turn < 14; turn++) {
  const res = await claude.messages.create({
    model: "claude-opus-5-5", max_tokens: 4000,
    system: "You are a shopping agent acting for a user. Use the tools. Never exceed the user's cap. Be brief.",
    tools: tools.map((t) => ({ name: t.name, description: t.description, input_schema: t.inputSchema })),
    messages,
  });
  messages.push({ role: "assistant", content: res.content });
  const results = [];
  for (const b of res.content) {
    if (b.type === "text" && b.text.trim()) log.push(`**Agent:** ${b.text.trim()}`, ``);
    if (b.type !== "tool_use") continue;
    log.push(`**→ \`${b.name}\`** \`${JSON.stringify(b.input).replace(issued.token, "mdt_…").slice(0, 400)}\``, ``);
    const r = await mcp.callTool({ name: b.name, arguments: b.input }).catch((e) => ({ isError: true, content: [{ type: "text", text: String(e.message) }] }));
    const text = (r.content || []).filter((c) => c.type === "text").map((c) => c.text).join("\n");
    const imgs = (r.content || []).filter((c) => c.type === "image").length;
    log.push(`${r.isError ? "**✖ error:**" : "**←**"} ${"`"}${text.replace(/\s+/g, " ").slice(0, 500)}${"`"}${imgs ? ` (+${imgs} render)` : ""}`, ``);
    results.push({ type: "tool_result", tool_use_id: b.id, is_error: !!r.isError, content: (r.content || []).map((c) => c.type === "image" ? { type: "image", source: { type: "base64", media_type: c.mimeType, data: c.data } } : { type: "text", text: c.text }) });
  }
  if (!results.length) break;
  messages.push({ role: "user", content: results });
}
await mcp.close();
fs.writeFileSync("docs/mcp-session.md", log.join("\n") + "\n");
console.log(log.join("\n"));
