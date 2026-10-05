// Kits: a one-line vibe ("rainy cyberpunk alley footsteps and UI clicks") becomes a kit of 6-10 licensed sound
// programs chosen and knob-tuned by Claude, priced as one PayPal order. This is the Crate idea (devpost.com/software/
// crate-iphone-duo-mpc: "describe the vibe you're going for and get straight to playing") on a registry where every
// pad is a program, so the kit is tuned, not sampled. Without a model key a keyword planner builds the kit instead,
// so the order path never depends on Claude being up.
import crypto from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import * as catalog from "./catalog.js";
import * as commerce from "./commerce.js";
import * as store from "./store.js";
import { config } from "./config.js";
import { diffFromDefaults } from "./knobs.js";

let client;
const hash = (s) => [...String(s)].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 17) >>> 0;
const sounds = () => catalog.allAssets().filter((a) => a.format === "sound");

/** The catalogue as the planner reads it: one line per sound, knobs with their ranges. */
function catalogLines() {
  return sounds().map((a) => `${a.id} | ${a.title} | ${a.kind} | ${a.worldKit || "-"} | $${a.price} | ${a.author} | ${a.description} | knobs: ${Object.entries(a.params.knobs).map(([k, d]) => d.type === "choice" ? `${k}(${d.options.join("/")})` : d.type === "range" ? `${k}(${d.min}..${d.max})` : `${k}(on/off)`).join(", ")}`).join("\n");
}

/** Keyword planner: scores every sound against the vibe's words, keeps the kinds varied, 8 parts. */
export function planByKeywords(vibe, { count = 8 } = {}) {
  const terms = vibe.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 2);
  const scored = sounds().map((a) => {
    const hay = `${a.title} ${a.tags.join(" ")} ${a.description} ${a.kind} ${a.worldKit || ""}`.toLowerCase();
    let s = 0;
    for (const t of terms) { if (a.title.toLowerCase().includes(t)) s += 4; if (a.tags.some((x) => x.includes(t))) s += 3; if ((a.worldKit || "").toLowerCase().includes(t)) s += 2; if (hay.includes(t)) s += 1; }
    return [a, s + ((hash(vibe + a.id) % 100) / 1000)];
  }).sort((x, y) => y[1] - x[1]);
  const picked = [], kinds = {};
  for (const [a] of scored) { if (picked.length >= count) break; if ((kinds[a.kind] || 0) >= Math.ceil(count / 3)) continue; picked.push(a); kinds[a.kind] = (kinds[a.kind] || 0) + 1; }
  for (const [a] of scored) { if (picked.length >= count) break; if (!picked.includes(a)) picked.push(a); }
  return { title: vibe.split(/\s+/).slice(0, 4).map((w) => w[0].toUpperCase() + w.slice(1)).join(" "), items: picked.map((a, i) => ({ assetId: a.id, knobs: a.params.knobs.seed ? { seed: 1 + (hash(vibe + i) % 500) } : {}, name: a.title, reason: "matched the vibe's words" })) };
}

const SYSTEM = `You are the sound supervisor for Oasis, a registry where every sound is a program with typed knobs. A person gives you a one-line vibe; you build them a kit of 6 to 10 sounds from the catalogue, each with knobs tuned to the vibe (materials, weight, wetness, distance, brightness, pitch, a different seed per part), so the kit plays as one place. Cover what the vibe asks for first, then round it out (a bed, a few one-shots, a UI or impact if it fits). Name each part the way a sample pack would ("Alley Step L", "Neon Click"). Keep the total modest.

Return JSON only: {"title":"2-4 words","items":[{"asset_id":"...","name":"...","knobs":{...},"reason":"one line"}]}. Knob values must be inside each knob's range or options; omit knobs you leave at default; always set a seed when the sound has one.`;

/** Claude plans the kit from the vibe and the catalogue; falls back to keywords when no model is configured. */
export async function planKit(vibe) {
  const v = String(vibe || "").trim().slice(0, 300);
  if (!v) throw Object.assign(new Error("Say what the kit is for"), { status: 400 });
  let plan = null, planner = "keywords";
  if (config.anthropicKey && sounds().length) {
    client ||= new Anthropic({ apiKey: config.anthropicKey });
    try {
      const msg = await client.messages.create({ model: config.directorModel, max_tokens: 4000, system: SYSTEM, messages: [{ role: "user", content: `Vibe: ${v}\n\nCatalogue (id | title | kind | kit | price | creator | description | knobs):\n${catalogLines()}` }] });
      const text = msg.content.filter((b) => b.type === "text").map((b) => b.text).join("");
      const j = JSON.parse(text.match(/\{[\s\S]*\}/)[0]);
      plan = { title: String(j.title || v).slice(0, 60), items: (j.items || []).map((it) => ({ assetId: it.asset_id, knobs: it.knobs || {}, name: String(it.name || "").slice(0, 40), reason: String(it.reason || "").slice(0, 160) })) };
      planner = config.directorModel;
    } catch (e) { console.warn("kit planner", e.message); }
  }
  if (!plan) plan = planByKeywords(v);
  return cleanKit(v, plan, planner);
}

/** Only real sounds, knobs resolved against their schemas, 6-10 parts, priced from the catalogue. */
export function cleanKit(vibe, plan, planner = "keywords") {
  let items = (plan.items || []).map((it) => { const a = catalog.getAsset(it.assetId); return a && a.format === "sound" ? { a, it } : null; }).filter(Boolean).slice(0, 10);
  if (items.length < 6) { const fill = planByKeywords(vibe, { count: 10 }).items.filter((f) => !items.some((x) => x.a.id === f.assetId)); for (const f of fill) { if (items.length >= 6) break; items.push({ a: catalog.getAsset(f.assetId), it: f }); } }
  const lines = items.map(({ a, it }, i) => {
    const values = catalog.resolveInput(a, it.knobs || {});
    return { assetId: a.id, title: a.title, kind: a.kind, author: a.author, price: a.price, knobs: diffFromDefaults(a.params, values), values, name: it.name || a.title, reason: it.reason || "", duration: a.duration, idx: i };
  });
  const total = Math.round(lines.reduce((s, l) => s + l.price, 0) * 100) / 100;
  const creators = [...new Set(lines.filter((l) => l.price > 0).map((l) => l.author))];
  return { title: plan.title || vibe, vibe, planner, items: lines, total, creators };
}

export async function save(kit, extra = {}) {
  const doc = { id: kit.id || `k${crypto.randomBytes(5).toString("hex")}`, ...kit, ...extra, createdAt: kit.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() };
  await store.put("kits", doc.id, doc);
  return doc;
}
export const get = (id) => store.get("kits", id);
export const billItems = (kit) => kit.items.filter((l) => l.price > 0).map((l) => ({ assetId: l.assetId, knobs: l.values }));

/** The licence a completed order gives a kit: one token per paid part, what each creator earned. */
export function licenceOf(kit, order, via = "mandate") {
  const tokens = Object.fromEntries((order?.licenses || []).map((l) => [l.assetId, l.token]));
  const creators = order ? commerce.saleEvent(order).creators : [];
  return { orderId: order?.id || "free", total: order?.total || 0, creators, tokens, at: new Date().toISOString(), via };
}

/** Public view: parts with their preview and, once licensed, their clean render and module URLs. */
export function view(kit) {
  const b = config.baseUrl;
  return {
    id: kit.id, title: kit.title, vibe: kit.vibe, planner: kit.planner, createdAt: kit.createdAt, total: kit.total, creators: kit.creators, licensed: !!kit.licence,
    licence: kit.licence ? { orderId: kit.licence.orderId, total: kit.licence.total, creators: kit.licence.creators, at: kit.licence.at, via: kit.licence.via } : null,
    items: kit.items.map((l) => {
      const q = Object.keys(l.knobs).length ? `?p=${encodeURIComponent(JSON.stringify(l.knobs))}` : "";
      const tok = kit.licence?.tokens?.[l.assetId] || (l.price === 0 ? "free" : null);
      return { ...l, preview: `${b}/api/assets/${l.assetId}/render.wav${q}`, card: `${b}/api/assets/${l.assetId}/render.png${q}`,
        licence: tok && tok !== "free" ? tok : null,
        wav: tok ? (tok === "free" ? `${b}/api/assets/${l.assetId}/download.wav${q}` : `${b}/api/licenses/${tok}/download.wav`) : null,
        module: tok ? `${b}/cdn/${l.assetId}.mjs${tok === "free" ? "" : `?lic=${tok}`}` : null };
    }),
  };
}
