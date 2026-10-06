import crypto from "node:crypto";
import * as world from "./world.js";
// One tool surface, two consumers: the in-app Oasis agent (Claude tool use) and outside agents over
// MCP (server/mcp.js registers search_assets, get_asset, preview_asset, make_kit, get_kit, buy_assets, get_budget).
// createOrder and getOrder below are the earlier build's order tools, kept for scripts/ and tests, not registered on MCP.
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

// ---------- sounds: the registry's front door ----------
const soundLine = (a) => ({
  asset_id: a.id, title: a.title, kind: a.kind, kit: a.worldKit || null, author: a.author, price_usd: a.price, seconds: a.duration, description: a.description,
  knobs: Object.keys(a.params.knobs || {}), preview_wav: `${config.baseUrl}/api/assets/${a.id}/render.wav`, card_png: `${config.baseUrl}/api/assets/${a.id}/render.png`,
});
/** Sound search: title, tags, kind and kit; falls back to the whole registry when nothing matches. */
export function searchSounds({ query = "", kind, max_price, limit = 20 }) {
  const all = catalog.search({ query, kind, format: "sound", maxPrice: max_price, limit: 400 });
  const list = all.length || !query ? all : catalog.search({ query: "", kind, format: "sound", maxPrice: max_price, limit: 400 });
  return list.slice(0, limit).map(soundLine);
}
/** Everything an agent needs to render one sound at the call site. */
export function getSound({ asset_id }) {
  const a = catalog.getAsset(asset_id);
  if (!a || a.format !== "sound") throw new Error(`No sound "${asset_id}". Use search_assets first.`);
  return {
    ...soundLine(a), tags: a.tags, knobs: a.params.knobs, forked_from: a.forkedFrom,
    how_to_import: `Buy a licence with buy_assets, then: import { createSound, play } from "<module url from buy_assets>"; play(audioContext, { ...knobs, seed: n }) renders and plays a fresh take; createSound(knobs, sampleRate) returns { sr, samples: Float32Array } for an engine. Without a licence the module plays a placeholder tick; over HTTP it answers 402.`,
    render: `${config.baseUrl}/api/assets/${a.id}/render.wav?p=<url-encoded JSON knobs>  (paid sounds carry a preview watermark until licensed)`,
  };
}

/** 3D registry search: what an agent building a scene needs to choose pieces. */
export function search3d({ query = "", max_price, limit = 20 }) {
  const all = catalog.search({ query, maxPrice: max_price, limit: 200 }).filter((a) => a.format === "blocks");
  const list = all.length || !query ? all : catalog.search({ query: "", maxPrice: max_price, limit: 200 }).filter((a) => a.format === "blocks");
  return list.slice(0, limit).map((a) => ({
    asset_id: a.id, title: a.title, author: a.author, price_usd: a.price, footprint_m: a.footprint, description: a.description,
    knobs: Object.keys(a.params.knobs || {}), preview_png: `${config.baseUrl}/api/assets/${a.id}/render.png`,
  }));
}

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

/** Everything an agent needs to place one 3D asset in a three.js scene. */
export function get3d({ asset_id }) {
  const a = catalog.getAsset(asset_id);
  if (!a || a.format !== "blocks") throw new Error(`No 3D asset "${asset_id}". Use search_assets first.`);
  return {
    asset_id: a.id, title: a.title, author: a.author, price_usd: a.price, description: a.description,
    footprint_m: a.footprint, units: "metres, y up, model sits on y=0, footprint starts at x=0,z=0, front faces -z",
    knobs: a.params.knobs, presets: a.params.presets || {},
    how_to_import: `Buy a licence with buy_assets, then: import { createAsset } from "<module url from buy_assets>"; scene.add(createAsset({ ...knobs })). The page needs an import map for "three" and "three/addons/". Without a licence the module renders a grey placeholder.`,
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

export async function buyAssets({ items, mandate, agent_name }) {
  const { moduleUrl } = await import("./registry.js");
  const mandates = await import("./mandates.js");
  const o = await commerce.buyWithMandate(String(mandate || ""), items.map((i) => ({ assetId: i.asset_id, knobs: i.knobs })), { agentName: agent_name ? String(agent_name).slice(0, 40) : "an MCP agent" });
  const m = await mandates.get(o.mandateId);
  return {
    order_id: o.id, paypal_status: o.status, total_usd: o.total,
    imports: o.licenses.map((l) => ({ asset_id: l.assetId, title: l.title, module: moduleUrl(l.assetId, l.token) })),
    creators_paid: commerce.saleEvent(o).creators,
    budget: { spent_usd: m.spent_usd, remaining_usd: m.remaining_usd, of_usd: m.budget_usd },
    ledger: `${config.baseUrl}/#/ledger`,
  };
}

// ---------- kits: a vibe becomes up to ten tuned sound programs, licensed in one order ----------
export async function makeKit({ vibe, mandate, agent_name, dry_run }) {
  const kits = await import("./kits.js");
  // dry_run plans and prices the kit without saving it (nothing lands in the public list, nothing is bought)
  if (dry_run) return kitStatus({ id: null, ...(await kits.planKit(String(vibe || "").slice(0, 300))), licence: null });
  let k = await kits.save(await kits.planKit(String(vibe || "").slice(0, 300)));
  if (mandate) {
    const items = kits.billItems(k);
    const o = items.length ? await commerce.buyWithMandate(String(mandate), items, { agentName: agent_name ? String(agent_name).slice(0, 40) : "an MCP agent" }) : null;
    k = await kits.save(k, { licence: kits.licenceOf(k, o, "mandate") });
  }
  return kitStatus(k);
}
export async function getKit({ kit_id, mandate }) {
  const kits = await import("./kits.js");
  const k = await kits.get(String(kit_id));
  if (!k) throw new Error("Unknown kit_id");
  return kitStatus(k, await kits.owns(k, { mandate }));
}
async function kitStatus(k, owner = true) {
  const kits = await import("./kits.js");
  const v = kits.view(k, { owner });
  return {
    kit_id: v.id, title: v.title, vibe: v.vibe, link: `${config.baseUrl}/#/kit/${v.id}`, planned_by: v.planner,
    parts: v.items.map((l) => ({ name: l.name, asset_id: l.assetId, kind: l.kind, author: l.author, price_usd: l.price, knobs: l.knobs, reason: l.reason, preview_wav: l.preview, module: l.module, wav: l.wav })),
    total_usd: v.total, creators: v.creators, unmatched_words: v.unmatched, licensed: v.licensed, order_id: v.licence?.orderId || null, creators_paid: v.licence?.creators || [],
    next: v.licensed && !owner ? "Licensed by someone else: pass the mandate that paid for it to get the modules and WAVs." : v.licensed ? "Licensed: import each part's module (play(ctx, knobs)) or download its WAV." : "Unlicensed: previews carry a watermark tick. Pass the human's mandate to license the whole kit in one order, or open the link and pay with PayPal.",
  };
}

// ---------- films: an agent asks for a short film, licenses it inside the budget, and gets an MP4 ----------
export async function makeFilm({ brief, mandate, agent_name, format, direct = true }) {
  const film = await import("./film.js");
  const render = await import("./film-render.js");
  let f = await film.planFilm(String(brief || "").slice(0, 400));
  if (direct) { try { f = (await film.direct(f, f.brief)) || f; } catch {} }
  if (format) f = film.cleanFilm({ ...f, format });
  f = await film.save(f);
  let licence = null;
  if (mandate) {
    const items = film.billItems(f);
    const o = items.length ? await commerce.buyWithMandate(String(mandate), items, { agentName: agent_name ? String(agent_name).slice(0, 40) : "an MCP agent" }) : null;
    licence = { orderId: o?.id || "free", total: o?.total || 0, creators: o ? commerce.saleEvent(o).creators : [], tokens: Object.fromEntries((o?.licenses || []).map((l) => [l.assetId, l.token])), at: new Date().toISOString() };
    f = await film.save(f, { licence });
  }
  const canRender = await render.available();
  if (canRender) { await film.save(f, { render: { status: "queued", progress: 0 } }); render.enqueue(f.id); }
  return filmStatus(await film.get(f.id), { canRender });
}
export async function getFilm({ film_id }) {
  const film = await import("./film.js");
  const f = await film.get(String(film_id));
  if (!f) throw new Error("Unknown film_id");
  return filmStatus(f, { canRender: await (await import("./film-render.js")).available() });
}
async function filmStatus(f, { canRender }) {
  const film = await import("./film.js");
  const bill = film.billOf(f);
  return {
    film_id: f.id, title: f.title, link: `${config.baseUrl}/#/film/${f.id}`, seconds: f.seconds, shots: f.shots.map((s) => `${s.kind} ${s.seconds}s ${s.time}${s.card ? " + card" : ""}`),
    signs: f.signs.map((s) => `${s.title} (${s.where}) by ${s.author}`), brand: f.brand, weather: f.weather, music: f.music?.mood || null, format: f.format,
    bill: bill.lines.map((l) => ({ asset_id: l.asset, title: l.title, kind: l.kind, use: l.use, price_usd: l.price, author: l.author })), total_usd: bill.total, creators: bill.creators,
    licensed: !!f.licence, order_id: f.licence?.orderId || null, creators_paid: f.licence?.creators || [],
    render: f.render?.status || "idle", progress: f.render?.progress ?? 0, mp4: f.render?.status === "done" ? `${config.baseUrl}/api/films/${f.id}/film.mp4` : null,
    next: !f.licence ? "Unlicensed: paid pieces render grey and signs carry a watermark. Pass the human's mandate to license everything in one order." : f.render?.status === "done" ? "Download the MP4." : canRender ? "Poll get_film until render is done (about a minute)." : "This server can't render MP4; open the link to export in the browser.",
  };
}
