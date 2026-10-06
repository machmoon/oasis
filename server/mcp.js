// Oasis over MCP: any agent (Claude Code, Claude Desktop, Cursor…) can find sound programs for a game or a film and
// license them inside the budget a human approved once in PayPal.
// Stateless Streamable HTTP, per the SDK's simpleStatelessStreamableHttp example.
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import * as z from "zod/v4";
import * as tools from "./tools.js";
import * as catalog from "./catalog.js";
import * as sound from "./sound.js";

const text = (obj) => ({ content: [{ type: "text", text: typeof obj === "string" ? obj : JSON.stringify(obj, null, 2) }] });
const KINDS = ["sfx", "ambience", "ui", "impact", "foley", "music-loop"];

function getServer() {
  const server = new McpServer({ name: "oasis", version: "2.0.0" });
  server.registerTool("search_assets", {
    description: "Search the Oasis registry of sound programs. Every sound is a program from an independent creator with typed knobs (material, weight, wetness, pitch, a seed): the knobs re-render the sound, they don't stretch a file, so one footstep program is 300 different footsteps. Sounds belong to kits (Rainy City Street, Sci-fi Console, Drum Machine...) that share a room and a material language.",
    inputSchema: { query: z.string().describe("e.g. 'footstep gravel', 'ui click', 'rain', 'door slam', 'kick'"), kind: z.enum(KINDS).optional(), max_price: z.number().optional() },
  }, async (args) => text(tools.searchSounds(args)));
  server.registerTool("get_asset", {
    description: "Knobs (types, ranges, options), length, price, creator and how to import one sound program.",
    inputSchema: { asset_id: z.string() },
  }, async (args) => text(tools.getSound(args)));
  server.registerTool("preview_asset", {
    description: "Hear a sound with your knob values before you buy: returns the rendered WAV (22.05 kHz mono, paid sounds carry a soft watermark tick) and a picture of its waveform and spectrogram, plus the measured numbers.",
    inputSchema: { asset_id: z.string(), knobs: z.record(z.string(), z.any()).default({}) },
  }, async ({ asset_id, knobs }) => {
    const a = catalog.getAsset(asset_id);
    if (!a || a.format !== "sound") throw new Error(`No sound "${asset_id}"`);
    const r = await catalog.soundAsync(a, knobs);
    const samples = a.price > 0 ? sound.watermark(r.samples, r.sr) : r.samples;
    const an = sound.analyse(samples, r.sr, { cols: 320 });
    return { content: [
      { type: "audio", data: sound.toWav(samples, r.sr).toString("base64"), mimeType: "audio/wav" },
      { type: "image", data: sound.cardPng(an, 448).toString("base64"), mimeType: "image/png" },
      { type: "text", text: JSON.stringify({ asset_id, knobs: r.values, price_usd: a.price, seconds: +an.seconds.toFixed(3), peak: an.peak, rms: an.rms, centroid_hz: an.centroid, watermarked: a.price > 0 }) },
    ] };
  });
  server.registerTool("buy_assets", {
    description: "License sounds with the budget the human approved in PayPal (a funded mandate, mdt_...). Oasis charges the human's saved PayPal wallet in one order, inside the budget, with no redirect, and pays each creator their share. Returns a module URL per sound: import { play, createSound } from '<module>'. Buy everything the scene needs in one call. If it is over what is left, the call is refused and nothing is charged.",
    inputSchema: {
      items: z.array(z.object({ asset_id: z.string(), knobs: z.record(z.string(), z.any()).default({}) })).min(1),
      mandate: z.string().describe("The funded mandate token the human gave you"),
      agent_name: z.string().optional().describe("Your name, shown on the human's PayPal receipt and the Oasis ledger"),
    },
  }, async ({ items, mandate, agent_name }) => text(await tools.buyAssets({ items, mandate, agent_name })));
  server.registerTool("make_kit", {
    description: "Describe the vibe you're going for and get a kit: Claude (or a keyword planner when the model is offline; the response says which in planned_by) picks up to ten sound programs from the registry and tunes their knobs to the vibe (materials, weight, wetness, seeds), priced as one order. With a mandate the whole kit is licensed at once and every creator is paid; without one you get watermarked previews and a link where a person can pay with PayPal.",
    inputSchema: { vibe: z.string().describe("e.g. 'rainy cyberpunk alley footsteps and UI clicks', 'cosy wooden tavern', 'lo-fi drum kit with a dusty kick'"), mandate: z.string().optional().describe("The human's funded budget token (mdt_...) to license the kit"), agent_name: z.string().optional() },
  }, async (args) => text(await tools.makeKit(args)));
  server.registerTool("get_kit", {
    description: "A kit's parts, knobs, bill, whether it is licensed, and each part's module and WAV once it is.",
    inputSchema: { kit_id: z.string(), mandate: z.string().optional().describe("The mandate that paid for the kit; its modules and WAVs are only returned to their owner") },
  }, async (args) => text(await tools.getKit(args)));
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
