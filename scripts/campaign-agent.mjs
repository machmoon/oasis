// An agent runs a whole launch campaign on Oasis over MCP: it only knows the /mcp URL and gets one paragraph.
// Claude writes the briefs (and the jokes) itself, calls make_film for each, and checks them with get_film.
// The transcript is written to docs/campaign-session.md. Run: node scripts/campaign-agent.mjs [url]
import "dotenv/config";
import fs from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const URL_ = process.argv[2] || "http://localhost:5177/mcp";
const ALLOWED = new Set(["make_film", "get_film"]);
const BRIEF = process.env.BRIEF || `You're the creative director at a tiny launch agency, and it's Friday. Six clients need a launch film by tonight. Make all six on Oasis with make_film, one in each world it knows: a Kyoto street, a seaside town, a snowy winter village, a candy-pastel street, an autumn high street, and San Francisco. The clients are fictional small businesses and startups that you invent, and the films should make people laugh: deadpan, warm, a little absurd, like a good parody ad. Put the brand name in quotes in each brief, give each one a punchline, and name the world in the brief so Oasis builds the right street. Keep it kind: no real people, no real brands, nothing mean. Make the San Francisco one vertical (9:16) for Reels, and the rest landscape. When all six are made, check one with get_film, then give me a one-line pitch for each.`;

const mcp = new Client({ name: "oasis-campaign-agent", version: "1.0.0" });
await mcp.connect(new StreamableHTTPClientTransport(new URL(URL_)));
const tools = (await mcp.listTools()).tools.filter((t) => ALLOWED.has(t.name));
const log = [`# An agent runs a launch campaign on Oasis over MCP`, ``, `Recorded ${new Date().toISOString()} by \`scripts/campaign-agent.mjs\` against \`${URL_}\`.`,
  `The agent is Claude (claude-opus-5-5) with no Oasis code: only the MCP tools ${tools.map((t) => `\`${t.name}\``).join(", ")}.`, ``, `**Brief:** ${BRIEF}`, ``];
const films = [];

const claude = new Anthropic();
const messages = [{ role: "user", content: BRIEF }];
for (let turn = 0; turn < 16; turn++) {
  const res = await claude.messages.create({
    model: "claude-opus-5-5", max_tokens: 6000,
    system: "You are a creative director using Oasis's tools. Write funny, kind, original briefs. Be brief in chat.",
    tools: tools.map((t) => ({ name: t.name, description: t.description, input_schema: t.inputSchema })),
    messages,
  });
  messages.push({ role: "assistant", content: res.content });
  const results = [];
  for (const b of res.content) {
    if (b.type === "text" && b.text.trim()) log.push(`**Agent:** ${b.text.trim()}`, ``);
    if (b.type !== "tool_use") continue;
    log.push(`**→ \`${b.name}\`** \`${JSON.stringify(b.input).slice(0, 500)}\``, ``);
    const r = await mcp.callTool({ name: b.name, arguments: b.input }).catch((e) => ({ isError: true, content: [{ type: "text", text: String(e.message) }] }));
    const text = (r.content || []).filter((c) => c.type === "text").map((c) => c.text).join("\n");
    if (b.name === "make_film") { try { const j = JSON.parse(text); films.push({ id: j.film_id || j.id, brief: b.input.brief, format: b.input.format || "16:9" }); } catch {} }
    log.push(`${r.isError ? "**✖ error:**" : "**←**"} \`${text.replace(/\s+/g, " ").slice(0, 400)}\``, ``);
    results.push({ type: "tool_result", tool_use_id: b.id, is_error: !!r.isError, content: [{ type: "text", text }] });
  }
  if (!results.length) break;
  messages.push({ role: "user", content: results });
}
await mcp.close();
fs.writeFileSync("docs/campaign-session.md", log.join("\n") + "\n");
fs.writeFileSync(".work/campaign-films.json", JSON.stringify(films, null, 2));
console.log(log.join("\n"));
console.log("\nFILMS", JSON.stringify(films));
process.exit(0);
