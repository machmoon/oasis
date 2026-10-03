// Oasis over MCP: any agent (Claude Code, Claude Desktop, Cursor…) can find 3D assets for a scene and license them
// inside the budget a human approved once in PayPal.
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
    description: "Search the Oasis registry of 3D assets for three.js scenes. Every asset is a program from an independent creator: knobs rebuild the model (more floors, more stakes), they don't stretch it. All kit pieces share one 6 m grid and palette, so they fit together.",
    inputSchema: { query: z.string().describe("e.g. 'kyoto shop', 'tram', 'street lamp'"), max_price: z.number().optional() },
  }, async (args) => text(tools.search3d(args)));
  server.registerTool("get_asset", {
    description: "Knobs (types, ranges, options), footprint in metres, presets and how to import one 3D asset.",
    inputSchema: { asset_id: z.string() },
  }, async (args) => text(tools.get3d(args)));
  server.registerTool("preview_asset", {
    description: "See an asset with your knob values before you buy: returns an isometric PNG of the rebuilt model.",
    inputSchema: { asset_id: z.string(), knobs: z.record(z.string(), z.any()).default({}) },
  }, async ({ asset_id, knobs }) => {
    const a = catalog.getAsset(asset_id);
    if (!a || a.format !== "blocks") throw new Error(`No 3D asset "${asset_id}"`);
    const { svg, values } = await catalog.renderAsync(a, knobs);
    return { content: [{ type: "image", data: catalog.toPng(svg, 512).toString("base64"), mimeType: "image/png" }, { type: "text", text: JSON.stringify({ asset_id, knobs: values, price_usd: a.price }) }] };
  });
  server.registerTool("buy_assets", {
    description: "License 3D assets with the budget the human approved in PayPal (a funded mandate, mdt_...). Oasis charges the human's saved PayPal wallet in one order, inside the budget, with no redirect, and pays each creator their share. Returns a module URL per asset to import in the scene: import { createAsset } from '<module>'. Buy everything the scene needs in one call. If it is over what is left, the call is refused and nothing is charged.",
    inputSchema: {
      items: z.array(z.object({ asset_id: z.string(), knobs: z.record(z.string(), z.any()).default({}) })).min(1),
      mandate: z.string().describe("The funded mandate token the human gave you"),
      agent_name: z.string().optional().describe("Your name, shown on the human's PayPal receipt and the Oasis ledger"),
    },
  }, async ({ items, mandate, agent_name }) => text(await tools.buyAssets({ items, mandate, agent_name })));
  server.registerTool("make_film", {
    description: "Make a short film (10-20 s, 1280x720 MP4) from a brief: Oasis builds a street of kit pieces, dresses it with 2D design assets as signs in the brand's colours, and cuts camera moves (orbit, dolly, push-in, night crane, end card). Every piece, sign and card is a program, so the render is deterministic and every creator is paid once. With a mandate the whole film is licensed in one order; without one, paid pieces render grey and signs are watermarked.",
    inputSchema: { brief: z.string().describe("What the film is about, e.g. 'a 15-second teaser for \"Momiji Ramen\" on a Kyoto street at dusk'"), mandate: z.string().optional().describe("The human's funded budget token (mdt_...) to license everything"), agent_name: z.string().optional(), format: z.enum(["16:9", "9:16", "1:1"]).optional().describe("landscape (default), vertical for Reels and Shorts, or square") },
  }, async (args) => text(await tools.makeFilm(args)));
  server.registerTool("get_film", {
    description: "Status of a film: its bill, whether it is licensed, render progress, and the MP4 URL when done.",
    inputSchema: { film_id: z.string() },
  }, async (args) => text(await tools.getFilm(args)));
  server.registerTool("get_budget", {
    description: "What the human allowed: budget, spent, what is left, expiry, and every order charged against it.",
    inputSchema: { mandate: z.string() },
  }, async ({ mandate }) => text(await tools.getMandate({ mandate })));
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
