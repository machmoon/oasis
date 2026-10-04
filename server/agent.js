// The Oasis agent: a creative director that shops. It searches the catalogue, remixes assets into
// one coherent brand, looks at every render it makes, fills the cart and opens a PayPal order. It can
// never pay: the human approves the order in PayPal's own checkout.
import Anthropic from "@anthropic-ai/sdk";
import { config } from "./config.js";
import * as tools from "./tools.js";
import * as catalog from "./catalog.js";
import { forkAsset } from "./fork.js";

let client;

const SYSTEM = `You are Oasis, a creative director who sources design assets for people from the Oasis marketplace. Every Oasis asset is a small program with typed knobs (colours, choices, ranges, text), so anything you find can be remixed to fit the brief exactly.

How you work:
- Read the brief for brand, mood, audience, deliverables and budget. If there is no budget, keep the total modest.
- Search broadly (several queries), then choose the few assets that cover the deliverables. Prefer fewer, stronger pieces.
- Decide ONE brand palette by role (background, ink, primary, secondary, highlight; surface and muted are derived) and pass the same brand to every remix so the kit is coherent; colour knobs declare roles. Override individual knobs only where a render needs it. Put the brand's own words in text knobs.
- Use remix_asset to set knobs. You will see the rendered image: judge it honestly and remix again if it looks off (contrast, clashing colours, clipped text).
- add_to_cart only finished remixes, each with a one-line reason.
- Free assets need no payment; paid ones are licensed through PayPal. When the cart is ready, call create_order once. The person approves payment themselves in PayPal; never claim to have paid.
- The person may have set a spending cap; it is given at the start of the conversation when present. Keep the paid total within it. The server refuses orders over the cap.
- If nothing in the catalogue fits a deliverable, fork_asset can create a new asset from the closest one (slow, about a minute: only when it matters).

Write like a calm, sharp designer: short sentences, no hype, no lists of every knob. When you finish, give a two-line summary of the kit, the palette, and the total.`;

const TOOL_DEFS = [
  {
    name: "search_assets",
    description: "Search the Oasis catalogue. Returns asset ids, titles, kinds, prices and colourway presets.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "What you are looking for, e.g. 'pricing card', 'coffee illustration'" },
        kind: { type: "string", enum: ["icons", "illustration", "pattern", "background", "ui", "mockup", "poster", "brand", "avatar", "shape", "type"] },
        max_price: { type: "number" },
      },
      required: ["query"],
    },
  },
  {
    name: "get_asset",
    description: "Full knob schema and colourway presets for one asset. Call before remixing an asset for the first time.",
    input_schema: { type: "object", properties: { asset_id: { type: "string" } }, required: ["asset_id"] },
  },
  {
    name: "remix_asset",
    description: "Render an asset with knob values (optionally starting from a named colourway preset). Returns the rendered image so you can judge it.",
    input_schema: {
      type: "object",
      properties: {
        asset_id: { type: "string" },
        preset: { type: "string", description: "Optional colourway preset name to start from" },
        brand: { type: "object", description: "Brand palette by role; every colour knob with a matching role takes it. Keys: background, surface, ink, muted, primary, secondary, highlight (#RRGGBB). Explicit knobs override it.", properties: { background: { type: "string" }, surface: { type: "string" }, ink: { type: "string" }, muted: { type: "string" }, primary: { type: "string" }, secondary: { type: "string" }, highlight: { type: "string" } } },
        knobs: { type: "object", description: "Knob name -> value. Colours are #RRGGBB.", additionalProperties: true },
      },
      required: ["asset_id", "knobs"],
    },
  },
  {
    name: "add_to_cart",
    description: "Add a finished remix to the person's cart.",
    input_schema: {
      type: "object",
      properties: {
        asset_id: { type: "string" },
        preset: { type: "string" },
        brand: { type: "object", description: "Brand palette by role; every colour knob with a matching role takes it. Keys: background, surface, ink, muted, primary, secondary, highlight (#RRGGBB). Explicit knobs override it.", properties: { background: { type: "string" }, surface: { type: "string" }, ink: { type: "string" }, muted: { type: "string" }, primary: { type: "string" }, secondary: { type: "string" }, highlight: { type: "string" } } },
        knobs: { type: "object", additionalProperties: true },
        reason: { type: "string", description: "One line: why this piece is in the kit" },
      },
      required: ["asset_id", "knobs", "reason"],
    },
  },
  {
    name: "create_order",
    description: "Create a PayPal order for every paid item in the cart. The person approves it in PayPal; you cannot pay.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "fork_asset",
    description: "Create a NEW asset by rewriting the closest existing one with an instruction. Slow; use only when no asset can be remixed to fit.",
    input_schema: {
      type: "object",
      properties: { asset_id: { type: "string" }, instruction: { type: "string" } },
      required: ["asset_id", "instruction"],
    },
  },
];

async function imageBlock(svg) {
  const png = await catalog.toPng(svg, 512);
  return { type: "image", source: { type: "base64", media_type: "image/png", data: png.toString("base64") } };
}

/**
 * Runs one agent turn. `history` is the full Anthropic message list the browser kept (appended to,
 * never edited, so thinking blocks stay valid). `cart` is the browser's cart. `emit(event, data)` streams to the UI.
 */
export async function runAgent({ history, cart, budget }, emit) {
  client ||= new Anthropic({ apiKey: config.anthropicKey });
  const messages = [...history];
  const workingCart = [...(cart || [])];
  for (let step = 0; step < 24; step++) {
    const stream = client.messages.stream({
      model: config.agentModel,
      max_tokens: 16000,
      output_config: { effort: "medium" },
      system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
      tools: TOOL_DEFS,
      messages,
    });
    stream.on("text", (t) => emit("text", { delta: t }));
    const msg = await stream.finalMessage();
    messages.push({ role: "assistant", content: msg.content });
    if (msg.stop_reason === "refusal") {
      emit("text", { delta: "\n\nI can't help with that brief." });
      break;
    }
    if (msg.stop_reason !== "tool_use") break;
    const results = [];
    for (const call of msg.content.filter((b) => b.type === "tool_use")) {
      emit("tool", { name: call.name, input: call.input });
      try {
        results.push({ type: "tool_result", tool_use_id: call.id, content: await execute(call, workingCart, emit, budget) });
      } catch (e) {
        emit("tool_error", { name: call.name, message: e.message });
        results.push({ type: "tool_result", tool_use_id: call.id, content: e.message, is_error: true });
      }
    }
    messages.push({ role: "user", content: results });
    emit("text", { delta: "\n\n" });
  }
  emit("history", { messages: messages.slice(history.length) });
}

async function execute(call, cart, emit, budget) {
  const input = call.input || {};
  switch (call.name) {
    case "search_assets":
      return JSON.stringify(tools.searchAssets({ ...input, limit: 10 }));
    case "get_asset":
      return JSON.stringify(tools.getAsset(input));
    case "remix_asset": {
      const r = await tools.remixAsset(input);
      emit("variant", { assetId: r.asset.id, title: r.asset.title, price: r.price_usd, knobs: r.values, previewUrl: r.preview_url });
      return [{ type: "text", text: JSON.stringify({ asset_id: r.asset.id, knobs: r.values, price_usd: r.price_usd }) }, await imageBlock(r.svg)];
    }
    case "add_to_cart": {
      const r = await tools.remixAsset(input);
      const item = { assetId: r.asset.id, title: r.asset.title, price: r.price_usd, knobs: r.values, reason: input.reason || "", previewUrl: r.preview_url };
      cart.push(item);
      emit("cart_add", item);
      return `Added. Cart now has ${cart.length} item(s), total $${cart.reduce((s, i) => s + i.price, 0).toFixed(2)}.`;
    }
    case "create_order": {
      const order = await tools.createOrder({ items: cart.map((c) => ({ assetId: c.assetId, knobs: c.knobs })), max_total_usd: budget || null, agent_name: "the Oasis agent" });
      emit("checkout", { orderId: order.id, claimToken: order.claimToken, total: order.total, items: order.items.map((i) => ({ ...i, reason: cart.find((c) => c.assetId === i.assetId)?.reason || "" })), approveUrl: order.approveUrl, cap: budget || null });
      return `PayPal order ${order.id} created for $${order.total.toFixed(2)} (${order.items.length} paid licence(s); free items need no payment). The person now approves it with the PayPal button shown in the chat.`;
    }
    case "fork_asset": {
      emit("status", { message: "Writing a new asset program…" });
      const fork = await forkAsset({ assetId: input.asset_id, instruction: input.instruction, author: "oasis-agent" });
      const { svg } = await catalog.renderAsync(fork, {});
      emit("fork", { assetId: fork.id, title: fork.title, forkedFrom: fork.forkedFrom });
      return [{ type: "text", text: JSON.stringify(tools.getAsset({ asset_id: fork.id })) }, await imageBlock(svg)];
    }
    default:
      throw new Error(`Unknown tool ${call.name}`);
  }
}
