// An outside MCP client making a kit on Oasis, the way Claude Code would: list tools, search, preview one sound
// (audio + picture back), make_kit from a vibe, read it back. Writes docs/mcp-kit-session.md.
// node scripts/mcp-kit-session.mjs [mcpUrl] [vibe]
import fs from "node:fs";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const URL_ = process.argv[2] || "http://localhost:8795/mcp";
const VIBE = process.argv[3] || "a cosy wooden tavern with a crackling fire and a creaking door";
const mcp = new Client({ name: "oasis-kit-client", version: "1.0.0" });
await mcp.connect(new StreamableHTTPClientTransport(new URL(URL_)));
const log = [`# A kit over MCP`, ``, `Recorded ${new Date().toISOString()} by \`scripts/mcp-kit-session.mjs\` against \`${URL_}\`.`, ``];
const call = async (name, args) => {
  const t = Date.now();
  const r = await mcp.callTool({ name, arguments: args });
  const text = (r.content || []).filter((c) => c.type === "text").map((c) => c.text).join("\n");
  const media = (r.content || []).filter((c) => c.type !== "text").map((c) => `${c.type} ${c.mimeType} ${Math.round((c.data?.length || 0) * 3 / 4 / 1024)} KB`);
  log.push(`**→ \`${name}\`** \`${JSON.stringify(args)}\` (${Date.now() - t} ms)`, ``, "```json", text.slice(0, 2500), "```", media.length ? `returned: ${media.join(", ")}` : "", ``);
  return { text, r };
};
const { tools } = await mcp.listTools();
log.push(`Tools: ${tools.map((t) => `\`${t.name}\``).join(", ")}`, ``);
await call("search_assets", { query: "footstep" });
const pv = await call("preview_asset", { asset_id: "footstep", knobs: { surface: "wood", weight: 0.8, seed: 7 } });
const audio = pv.r.content.find((c) => c.type === "audio");
if (audio) fs.writeFileSync("docs/figures/sound/mcp-preview.wav", Buffer.from(audio.data, "base64"));
const kit = await call("make_kit", { vibe: VIBE, agent_name: "the kit client" });
const kitId = JSON.parse(kit.text).kit_id;
await call("get_kit", { kit_id: kitId });
await mcp.close();
fs.writeFileSync("docs/mcp-kit-session.md", log.join("\n"));
console.log("kit", kitId, "written docs/mcp-kit-session.md");
