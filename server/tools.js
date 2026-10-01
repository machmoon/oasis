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
    knobs: a.params.knobs, colourway_presets: a.params.presets || {}, default_size: a.size,
    forked_from: a.forkedFrom, preview_url: previewUrl(a.id, {}, null),
  };
}

export function remixAsset({ asset_id, preset, knobs = {} }) {
  const a = catalog.getAsset(asset_id);
  if (!a) throw new Error(`No asset "${asset_id}".`);
  const { svg, values } = catalog.render(a, { ...knobs, ...(preset ? { preset } : {}) });
  return { asset: a, svg, values, preview_url: previewUrl(a.id, values, a), price_usd: a.price };
}

export async function createOrder({ items }) {
  return commerce.createCheckout(items, {
    agent: true,
    returnUrl: `${config.baseUrl}/checkout/return`,
    cancelUrl: `${config.baseUrl}/#/cart`,
  });
}

export async function getOrder({ order_id }) {
  let o = await store.get("orders", order_id);
  if (!o) throw new Error("Unknown order");
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
