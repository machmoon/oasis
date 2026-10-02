// Oasis over MCP: any agent (Claude Code, Claude Desktop, Cursor…) can browse, remix and buy.
// Stateless Streamable HTTP, per the SDK's simpleStatelessStreamableHttp example.
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import * as z from "zod/v4";
import * as tools from "./tools.js";
import * as catalog from "./catalog.js";

const text = (obj) => ({ content: [{ type: "text", text: typeof obj === "string" ? obj : JSON.stringify(obj, null, 2) }] });

function getServer() {
  const server = new McpServer({ name: "oasis", version: "1.0.0" });
  server.registerTool("search_assets", {
    description: "Search Oasis for design assets (icons, illustrations, UI, mockups, posters, patterns, brand marks). Every asset is a program with knobs you can remix.",
    inputSchema: { query: z.string(), kind: z.string().optional(), max_price: z.number().optional(), free_only: z.boolean().optional() },
  }, async (args) => text(tools.searchAssets(args)));
  server.registerTool("get_asset", {
    description: "Knob schema (types, ranges, options) and colourway presets for one asset.",
    inputSchema: { asset_id: z.string() },
  }, async (args) => text(tools.getAsset(args)));
  server.registerTool("remix_asset", {
    description: "Render an asset with knob values; returns a PNG preview and a stable preview URL. Paid assets preview with a watermark until licensed.",
    inputSchema: { asset_id: z.string(), preset: z.string().optional(), brand: z.record(z.string(), z.string()).optional().describe("Brand palette by role: background, surface, ink, muted, primary, secondary, highlight"), knobs: z.record(z.string(), z.any()).default({}) },
  }, async (args) => {
    const r = await tools.remixAsset(args);
    const svg = r.price_usd > 0 ? catalog.watermark(r.svg, catalog.sizeOf(r.svg, r.asset.size)) : r.svg;
    return {
      content: [
        { type: "image", data: catalog.toPng(svg, 512).toString("base64"), mimeType: "image/png" },
        { type: "text", text: JSON.stringify({ asset_id: r.asset.id, knobs: r.values, price_usd: r.price_usd, preview_url: r.preview_url }) },
      ],
    };
  });
  server.registerTool("create_order", {
    description: "Create a PayPal order licensing one or more remixes. Needs a mandate token: a budget the human issued at /#/agents and gave you. The server reserves the total against it and refuses anything over what is left. Returns approve_url: give it to the human, who still approves the payment in PayPal. Then call get_order with order_id and claim_token.",
    inputSchema: {
      items: z.array(z.object({ asset_id: z.string(), knobs: z.record(z.string(), z.any()).default({}) })).optional(),
      mandate: z.string().describe("Mandate token (mdt_...) the human gave you. Without one, no order can be created."),
      max_total_usd: z.number().positive().optional().describe("Optional tighter cap for this one order"),
      agent_name: z.string().optional().describe("Your name, shown to the human in PayPal's approval screen"),
      world_id: z.string().optional().describe("Buy a whole world from build_world: items may be omitted"),
    },
  }, async ({ items, mandate, max_total_usd, agent_name, world_id }) => {
    const o = await tools.createOrder({ items: (items || []).map((i) => ({ assetId: i.asset_id, knobs: i.knobs })), mandate, max_total_usd, agent_name, world_id });
    return text({ order_id: o.id, claim_token: o.claimToken, status: o.status, total_usd: o.total, mandate_id: o.mandateId, approve_url: o.approveUrl, next: "Ask the human to open approve_url and pay with PayPal, then call get_order with order_id and claim_token. Keep claim_token private: it unlocks the licensed files." });
  });
  server.registerTool("build_world", {
    description: "Build a little 3D world from a description (e.g. 'a Kyoto market street at dusk'). Oasis plans it from parametric kit pieces, Claude art-directs it, and you get a link the human can open and orbit, plus the bill of materials. Pass world_id to create_order to buy the whole world.",
    inputSchema: { prompt: z.string(), art_direct: z.boolean().optional().describe("Let Claude restyle the layout (about 20 s)") },
  }, async ({ prompt, art_direct }) => text(await tools.buildWorld({ prompt, art_direct })));
  server.registerTool("edit_world", {
    description: "Change a world you built: 'make it night', 'paint the shops mint', 'add a tram'. Returns a new world id and link (worlds are immutable snapshots).",
    inputSchema: { world_id: z.string(), request: z.string() },
  }, async ({ world_id, request }) => text(await tools.editWorld({ world_id, request })));
  server.registerTool("get_mandate", {
    description: "What the human allowed: budget, what is left, expiry and the orders charged against it.",
    inputSchema: { mandate: z.string() },
  }, async ({ mandate }) => text(await tools.getMandate({ mandate })));
  server.registerTool("get_order", {
    description: "Order status. Once the human has approved in PayPal this captures payment and returns licensed download links (SVG, PNG, React, source program).",
    inputSchema: { order_id: z.string(), claim_token: z.string().describe("Returned by create_order; proves this agent created the order") },
  }, async (args) => text(await tools.getOrder(args)));
  return server;
}

export async function handleMcp(req, res) {
  const server = getServer();
  try {
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
    res.on("close", () => {
      transport.close();
      server.close();
    });
  } catch (e) {
    console.error("MCP error", e);
    if (!res.headersSent) res.status(500).json({ jsonrpc: "2.0", error: { code: -32603, message: "Internal server error" }, id: null });
  }
}
