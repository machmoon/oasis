import crypto from "node:crypto";
import * as world from "./world.js";
// One tool surface, two consumers: the in-app Oasis agent (Claude tool use) and outside agents over
// MCP. Names mirror PayPal's agent toolkit where they overlap (create_order, get_order).
import * as catalog from "./catalog.js";
import * as commerce from "./commerce.js";
import * as store from "./store.js";
import { config } from "./config.js";
import { diffFromDefaults } from "./knobs.js";

export const previewUrl = (id, values, a) => {
  const d = a ? diffFromDefaults(a.params, values) : values;
  const q = Object.keys(d).length ? `?p=${encodeURIComponent(JSON.stringify(d))}` : "";
  return `${config.baseUrl}/api/assets/${id}/render.svg${q}`;
};

export function searchAssets({ query = "", kind, max_price, free_only, limit = 12 }) {
  return catalog.search({ query, kind, maxPrice: max_price, freeOnly: free_only, limit }).map((a) => ({
    asset_id: a.id, title: a.title, kind: a.kind, price_usd: a.price, description: a.description,
    tags: a.tags, author: a.author, forked_from: a.forkedFrom, presets: Object.keys(a.params.presets || {}),
  }));
}

export function getAsset({ asset_id }) {
  const a = catalog.getAsset(asset_id);
  if (!a) throw new Error(`No asset "${asset_id}". Use search_assets first.`);
  return {
    asset_id: a.id, title: a.title, kind: a.kind, price_usd: a.price, description: a.description, author: a.author,
    knobs: a.params.knobs, colour_roles: Object.fromEntries(Object.entries(a.params.knobs).filter(([, k]) => k.role).map(([n, k]) => [n, k.role])), colourway_presets: a.params.presets || {}, default_size: a.size,
    forked_from: a.forkedFrom, preview_url: previewUrl(a.id, {}, null),
  };
}

export async function remixAsset({ asset_id, preset, brand, knobs = {} }) {
  const a = catalog.getAsset(asset_id);
  if (!a) throw new Error(`No asset "${asset_id}".`);
  const { svg, values } = await catalog.renderAsync(a, { ...knobs, ...(preset ? { preset } : {}), ...(brand ? { brand } : {}) });
  return { asset: a, svg, values, preview_url: previewUrl(a.id, values, a), price_usd: a.price };
}

export async function createOrder({ items, max_total_usd, agent_name, mandate, world_id }) {
  if (world_id) {
    const w = await store.get("worlds", world_id);
    if (!w) throw new Error("Unknown world_id");
    items = world.worldItems(world.billOf(w));
  }
  const o = await commerce.createCheckout(items, {
    worldId: world_id || null,
    agent: true,
    agentName: agent_name ? String(agent_name).slice(0, 40) : "an MCP agent",
    maxTotal: max_total_usd ?? null,
    mandate: mandate || null,
    returnUrl: `${config.baseUrl}/checkout/return`,
    cancelUrl: `${config.baseUrl}/#/cart`,
  });
  return o;
}

export async function getOrder({ order_id, claim_token }) {
  let o = await store.get("orders", order_id);
  if (!commerce.ownsOrder(o, claim_token)) throw new Error("Unknown order, or wrong claim_token");
  // An agent polling an order the human has approved completes it, like the return page would.
  if (o.status !== "COMPLETED") {
    try {
      const { getOrder: ppGet } = await import("./paypal.js");
      const live = await ppGet(order_id);
      if (live.status === "APPROVED") o = await commerce.capture(order_id);
      else o.status = live.status;
    } catch {}
  }
  return {
    order_id: o.id, status: o.status, total_usd: o.total, approve_url: o.status === "COMPLETED" ? null : o.approveUrl,
    items: o.items.map((i) => ({ asset_id: i.assetId, title: i.title, price_usd: i.price })),
    downloads: (o.licenses || []).map((l) => ({
      title: l.title,
      svg: `${config.baseUrl}/api/licenses/${l.token}/download.svg`,
      png: `${config.baseUrl}/api/licenses/${l.token}/download.png`,
      react: `${config.baseUrl}/api/licenses/${l.token}/download.jsx`,
      program: `${config.baseUrl}/api/licenses/${l.token}/download.mjs`,
    })),
  };
}

export async function getMandate({ mandate }) {
  const { byTokenView } = await import("./mandates.js");
  const v = await byTokenView(mandate);
  if (!v) throw new Error("Unknown mandate token");
  return v;
}

const worldLink = (id) => `${config.baseUrl}/#/w/${id}`;
async function saveWorld(plan) {
  const id = `w${crypto.randomBytes(5).toString("hex")}`;
  await store.put("worlds", id, { id, title: String(plan.title || plan.prompt || "Untitled world").slice(0, 80), prompt: String(plan.prompt || "").slice(0, 300), time: plan.time, size: plan.size, placements: plan.placements, createdAt: new Date().toISOString() });
  return id;
}
const worldSummary = (id, plan) => {
  const bill = world.billOf(plan);
  return { world_id: id, link: worldLink(id), title: plan.title || plan.prompt, time: plan.time, pieces: plan.placements.length, note: plan.say || undefined,
    bill: world.worldItems(bill).map((i) => { const l = bill.find((x) => x.asset === i.assetId); return { asset_id: l.asset, title: l.title, price_usd: l.price, placed: bill.filter((x) => x.asset === l.asset).reduce((s, x) => s + x.count, 0) }; }), total_usd: world.worldTotal(bill),
    next: "Give the human the link to look around. To buy it, call create_order with world_id and their mandate." };
};
export async function buildWorld({ prompt, art_direct }) {
  let plan = world.planWorld(String(prompt).slice(0, 300));
  if (art_direct) { try { plan = (await world.agentEdit(`Make this world fit: "${prompt}". Name it, recolour it, and add or swap pieces so it tells the story of the place.`, plan)) || plan; } catch {} }
  plan = world.cleanPlan(plan);
  return worldSummary(await saveWorld(plan), plan);
}
export async function editWorld({ world_id, request }) {
  const w = await store.get("worlds", world_id);
  if (!w) throw new Error("Unknown world_id");
  const next = await world.agentEdit(String(request).slice(0, 400), world.cleanPlan(w));
  if (!next) throw new Error("The world agent isn't available on this server");
  const plan = world.cleanPlan(next);
  return worldSummary(await saveWorld(plan), plan);
}
