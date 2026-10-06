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
import * as mandates from "./mandates.js";
import { config } from "./config.js";
import { diffFromDefaults } from "./knobs.js";

let client;
const hash = (s) => [...String(s)].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 17) >>> 0;
const sounds = () => catalog.allAssets().filter((a) => a.format === "sound");

/** The catalogue as the planner reads it: one line per sound, knobs with their ranges. */
function catalogLines() {
  return sounds().map((a) => `${a.id} | ${a.title} | ${a.kind} | ${a.worldKit || "-"} | $${a.price} | ${a.author} | ${a.description} | knobs: ${Object.entries(a.params.knobs).map(([k, d]) => d.type === "choice" ? `${k}(${d.options.join("/")})` : d.type === "range" ? `${k}(${d.min}..${d.max})` : `${k}(on/off)`).join(", ")}`).join("\n");
}

/** Keyword planner, the fallback when no model is configured: scores every sound against the vibe's words (and a few
 * near words, so "haunted" finds the horror kit), keeps the kinds varied, 8 parts. Each part says which words it
 * matched, and one that matched nothing says so, so a thin kit reads as thin rather than as a confident plan. */
const STOP = new Set(["a", "an", "the", "in", "at", "of", "with", "and", "for", "on", "to", "by", "my", "some", "kit", "sounds", "sound"]);
const NEAR = { subway: ["train", "tunnel", "metro", "rumble", "echo"], station: ["train", "echo", "announcement"], tunnel: ["echo", "rumble", "drip"], haunted: ["horror", "ghost", "creak", "night"], spooky: ["horror", "ghost", "night"], creepy: ["horror", "creak"], scary: ["horror"], ocean: ["sea", "harbour", "wave", "gull"], sea: ["harbour", "wave"], beach: ["wave", "harbour", "gull"], city: ["street", "traffic", "rain"], urban: ["street", "traffic"], space: ["sci-fi", "console", "laser"], spaceship: ["sci-fi", "console", "servo"], robot: ["sci-fi", "servo", "console"], cyberpunk: ["neon", "rain", "sci-fi", "street"], medieval: ["market", "anvil", "tavern"], fantasy: ["tavern", "market", "magic"], cafe: ["office", "mug", "cup", "kitchen"], coffee: ["mug", "cup", "kitchen"], cooking: ["kitchen"], car: ["engine", "door", "car"], drive: ["car", "engine"], game: ["arcade", "coin", "blip"], retro: ["arcade", "chip", "pixel"], arcade: ["coin", "blip", "pixel"], drums: ["kick", "snare", "hat"], beat: ["kick", "snare", "hat"], woods: ["forest", "owl", "night"], forest: ["owl", "night", "wind"], lighthouse: ["harbour", "sea", "wind", "foghorn"], storm: ["rain", "thunder", "wind"], gong: ["bell", "toll", "chime"], temple: ["bell", "chime", "stone", "echo"], underwater: ["bubble", "water", "drip", "sea"], bubbles: ["bubble"], church: ["bell", "toll"], cave: ["drip", "echo", "stone"], ui: ["click", "interface", "toggle"], menu: ["click", "interface", "ui"] };
// Words that turn knobs when Claude is not there to: each adjective names the knobs it moves (by key or label) and
// which way. The idea is Freesound's and Splice's tag facets read backwards (a "heavy" tag implies a heavy setting);
// the table is ours, kept short and literal.
const ADJ = [
  [["heavy", "big", "huge", "massive", "thick"], /weight|force|mass|size|heav|body/, 1],
  [["light", "soft", "gentle", "quiet", "small", "tiny", "delicate"], /weight|force|intensity|size|hard|loud/, -1],
  [["distant", "far", "faraway", "echoing", "cavernous", "hall"], /distance|room|reverb|space|tail|wet(?!ness)/, 1],
  [["close", "dry", "tight", "intimate"], /distance|room|reverb|space|tail/, -1],
  [["wet", "rainy", "rain", "soaked", "drizzle", "puddle"], /wetness|rain|drizzle|splash|slosh|moist/, 1],
  [["storm", "stormy", "windy", "gusty", "wild"], /wind|gust|intensity|storm|rattle/, 1],
  [["dark", "deep", "low", "midnight", "night", "muffled"], /bright|pitch|tone|cutoff|air/, -1],
  [["bright", "high", "shiny", "sparkly", "crisp"], /bright|pitch|tone|cutoff|air|sparkle/, 1],
  [["fast", "quick", "frantic", "rapid"], /pace|speed|rate|tempo/, 1],
  [["slow", "lazy", "sluggish"], /pace|speed|rate|tempo/, -1],
  [["rusty", "old", "dirty", "worn", "crunchy", "lofi", "gritty", "broken"], /rust|grit|crush|drive|dirt|wear|age|crackle|noise/, 1],
  [["haunted", "creepy", "eerie", "spooky", "uneasy"], /eerie|wobble|detune|dissonan|creak/, 1],
];
/** Knob values the vibe's words imply for one sound: a choice whose option names a word, a range an adjective moves. */
function tuneByWords(a, terms, own = terms) {
  const out = {}, why = [];
  for (const [key, d] of Object.entries(a.params.knobs || {})) {
    if (key === "seed") continue;
    const name = `${key} ${d.label || ""}`.toLowerCase();
    if (d.type === "choice") {
      const opt = d.options.find((o) => terms.some((t) => String(o).toLowerCase().split(/[^a-z0-9]+/).includes(t)));
      if (opt !== undefined && opt !== d.default) { out[key] = opt; why.push(`${d.label || key} ${opt}`); }
    } else if (d.type === "range") {
      const hit = ADJ.find(([ws, rx]) => new RegExp(`\\b(?:${rx.source})`).test(name) && ws.some((w) => own.includes(w))); // only the person's own words move a range
      if (!hit) continue;
      const span = d.max - d.min, step = d.step || span / 100, v = Math.round((d.min + span * (hit[2] > 0 ? 0.8 : 0.2)) / step) * step;
      out[key] = +Math.min(d.max, Math.max(d.min, v)).toFixed(4); why.push(`${d.label || key} ${hit[2] > 0 ? "up" : "down"} for "${hit[0].find((w) => own.includes(w))}"`);
    }
  }
  return { knobs: out, why };
}

export function planByKeywords(vibe, { count = 8 } = {}) {
  // plurals match their singular ("footsteps" finds Footstep, "clicks" finds Click)
  const words = [...new Set(vibe.toLowerCase().split(/[^a-z0-9-]+/).filter((t) => t.length > 2 && !STOP.has(t)).map((t) => (t.length > 4 && t.endsWith("s") && !t.endsWith("ss") ? t.slice(0, -1) : t)))];
  const terms = [...new Set(words.flatMap((t) => [t, ...(NEAR[t] || [])]))];
  // a word that matches half the registry says little; a word that matches three sounds says a lot: each term is
  // weighted by its inverse document frequency, ln(N / df), the weighting of classic TF-IDF (Lucene's TFIDFSimilarity)
  const all = sounds(), hays = new Map(all.map((a) => [a.id, `${a.title} ${a.tags.join(" ")} ${a.description} ${a.kind} ${a.worldKit || ""}`.toLowerCase()]));
  // whole words only (with a plural ending), the way a search engine's tokenizer matches: "platform" is not "platformer"
  const rx = Object.fromEntries(terms.map((t) => [t, new RegExp(`(^|[^a-z0-9])${t.replace(/[^a-z0-9-]/g, "")}(s|es)?($|[^a-z0-9])`)]));
  const has = (text, t) => rx[t].test(text);
  const idf = Object.fromEntries(terms.map((t) => { const df = all.filter((a) => has(hays.get(a.id), t)).length; return [t, Math.log((all.length + 1) / (df + 1)) + 0.2]; }));
  const scored = all.map((a) => {
    const hay = hays.get(a.id);
    let s = 0; const hit = [];
    for (const t of terms) {
      const w = (words.includes(t) ? 1 : 0.6) * idf[t]; // a near word counts for less than the person's own word
      let ts = 0;
      if (has(a.title.toLowerCase(), t)) ts += 4; if (a.tags.some((x) => has(x.toLowerCase(), t))) ts += 3; if (has((a.worldKit || "").toLowerCase(), t)) ts += 2; if (has(hay, t)) ts += 1;
      if (ts) { s += ts * w; hit.push(t); }
    }
    return [a, s + ((hash(vibe + a.id) % 100) / 1000), hit];
  }).sort((x, y) => y[1] - x[1]);
  const picked = [], kinds = {};
  for (const e of scored) { if (picked.length >= count) break; if ((kinds[e[0].kind] || 0) >= (e[0].kind === "music" ? 1 : e[0].kind === "ambience" ? 2 : Math.ceil(count / 3))) continue; /* one music loop per kit at most: a loop matched on one shared word is the loosest pick */ picked.push(e); kinds[e[0].kind] = (kinds[e[0].kind] || 0) + 1; }
  // a part that matched nothing is not sold as part of the kit; only if the vibe matched almost nothing does the kit
  // fall back to the closest sounds, and then each says so
  // parts that match the person's own words come first; near-word matches only top a thin kit up to four, and a
  // part that matched nothing only appears when the vibe matched almost nothing (each says so in its reason)
  const own = picked.filter((e) => e[2].some((h) => words.includes(h))), near = picked.filter((e) => e[2].length && !own.includes(e));
  let final = own.length >= 4 ? own : [...own, ...near].slice(0, Math.max(4, own.length));
  if (final.length < 4) final = [...final, ...picked.filter((e) => !final.includes(e))].slice(0, 4);
  const unmatched = words.filter((w) => !all.some((a) => has(hays.get(a.id), w))); // the vibe's words the registry has nothing for
  // when a noun of the scene went unmatched ("train", "airport"), a part whose only hits are mood words ("night",
  // "busy", "rainy") is filler for a scene we cannot supply: a short honest kit plus the warning beats eight fillers
  const MOOD = new Set(["night", "midnight", "busy", "rainy", "rain", "dark", "quiet", "old", "abandoned", "cosy", "cozy", "big", "small", "heavy", "light", "wet", "dry", "distant", "haunted", "creepy", "spooky", "empty", "late", "early"]);
  if (unmatched.length) { const solid = final.filter((e) => e[2].some((h) => words.includes(h) && !MOOD.has(h))); if (solid.length >= 2) final = solid; }
  picked.length = 0; picked.push(...final);
  const titleWords = vibe.split(/\s+/).filter(Boolean);
  while (titleWords.length && STOP.has(titleWords[0].toLowerCase())) titleWords.shift();
  const t4 = titleWords.slice(0, 4); while (t4.length > 1 && STOP.has(t4[t4.length - 1].toLowerCase())) t4.pop();
  const title = t4.map((w) => w[0].toUpperCase() + w.slice(1)).join(" ").replace(/[,:;.]+$/, "") || "Untitled Kit";
  const raw = vibe.toLowerCase().split(/[^a-z0-9-]+/).filter(Boolean), allTerms = [...new Set([...raw, ...terms])];
  return { title, unmatched, nothing: words.length > 0 && unmatched.length === words.length, items: picked.map(([a, , hit], i) => { const tune = tuneByWords(a, allTerms, raw); return { assetId: a.id, knobs: { ...tune.knobs, ...(a.params.knobs.seed ? { seed: 1 + (hash(`${vibe}|${a.id}|${i * 7919}`) % 9999) } : {}) }, name: a.title,
    tuned: tune.why,
    reason: (() => { const own = hit.filter((h) => words.includes(h)), near = hit.filter((h) => !words.includes(h)); return own.length ? `matched ${own.slice(0, 3).map((h) => `"${h}"`).join(", ")}${near.length ? `, near ${near.slice(0, 2).map((h) => `"${h}"`).join(", ")}` : ""}` : near.length ? `near words ${near.slice(0, 3).map((h) => `"${h}"`).join(", ")}` : "nothing in the registry matched; picked as the closest sound"; })() }; }) };
}

const SYSTEM = `You are the sound supervisor for Oasis, a registry where every sound is a program with typed knobs. A person gives you a one-line vibe; you build them a kit of 6 to 10 sounds from the catalogue, each with knobs tuned to the vibe (materials, weight, wetness, distance, brightness, pitch, a different seed per part), so the kit plays as one place. Cover what the vibe asks for first, then round it out (a bed, a few one-shots, a UI or impact if it fits). Name each part the way a sample pack would ("Alley Step L", "Neon Click"). Keep the total modest.

Return JSON only: {"title":"2-4 words","items":[{"asset_id":"...","name":"...","knobs":{...},"reason":"one line"}]}. Knob values must be inside each knob's range or options; omit knobs you leave at default; always set a seed when the sound has one.`;

/** How the last Claude call went, so /api/config and /api/status report a planner that answers, not a key that is set. */
export const plannerHealth = { ok: null, error: null, at: null };
// true or false once a call has answered; null (unknown) from boot until then, rather than claiming ready
/** One cheap call at boot (a 1-token reply) so the planner's status is known before a visitor finds out. */
export async function probePlanner() {
  if (!config.anthropicKey) return Object.assign(plannerHealth, { ok: false, error: "no ANTHROPIC_API_KEY", at: new Date().toISOString() });
  client ||= new Anthropic({ apiKey: config.anthropicKey });
  try { await client.messages.create({ model: config.directorModel, max_tokens: 1, messages: [{ role: "user", content: "ok" }] }); Object.assign(plannerHealth, { ok: true, error: null, at: new Date().toISOString() }); }
  catch (e) { Object.assign(plannerHealth, { ok: false, error: e.error?.error?.message || e.message, at: new Date().toISOString() }); }
  return plannerHealth;
}
export const plannerReady = () => !config.anthropicKey ? false : plannerHealth.ok;

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
      Object.assign(plannerHealth, { ok: true, error: null, at: new Date().toISOString() });
    } catch (e) {
      console.warn("kit planner", e.message);
      Object.assign(plannerHealth, { ok: false, error: e.error?.error?.message || e.message, at: new Date().toISOString() });
    }
  }
  if (!plan) {
    plan = planByKeywords(v);
    // a vibe none of whose words the registry knows gets an answer, not a priced grab-bag
    if (plan.nothing) throw Object.assign(new Error(`Nothing in the registry matches "${v}" yet. Try the scene's things: footsteps, doors, rain, coins, bells.`), { status: 422, code: "ENOMATCH" });
  }
  return cleanKit(v, plan, planner);
}

/** Only real sounds, knobs resolved against their schemas, 6-10 parts, priced from the catalogue. */
export function cleanKit(vibe, plan, planner = "keywords") {
  let items = (plan.items || []).map((it) => { const a = catalog.getAsset(it.assetId); return a && a.format === "sound" ? { a, it } : null; }).filter(Boolean).slice(0, 10);
  if (items.length < 6 && planner !== "single" && planner !== "keywords") { const fill = planByKeywords(vibe, { count: 10 }).items.filter((f) => !items.some((x) => x.a.id === f.assetId)); for (const f of fill) { if (items.length >= 6) break; items.push({ a: catalog.getAsset(f.assetId), it: f }); } }
  // A licence is to the program, so a kit charges each program once: a second part on the same program is covered.
  const seen = new Set();
  const lines = items.map(({ a, it }, i) => {
    const values = catalog.resolveInput(a, it.knobs || {});
    const covered = seen.has(a.id); seen.add(a.id);
    return { assetId: a.id, title: a.title, kind: a.kind, author: a.author, price: covered ? 0 : a.price, covered, knobs: diffFromDefaults(a.params, values), values, name: it.name || a.title, reason: it.reason || "", tuned: it.tuned || [], duration: a.duration, idx: i };
  });
  const total = Math.round(lines.reduce((s, l) => s + l.price, 0) * 100) / 100;
  const creators = [...new Set(lines.filter((l) => l.price > 0).map((l) => l.author))];
  return { title: plan.title || vibe, vibe, planner, items: lines, total, creators, unmatched: plan.unmatched || [] };
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

/** A stored title without a dangling stop word ("Haunted Lighthouse In A" from before the planner trimmed them). */
export function tidyTitle(t) {
  // a title ends at its first clause: "Haunted House with Creaking" reads "Haunted House", "Retro Arcade: Coins, Jumps"
  // keeps its colon, "Ocean Harbour with Gulls" reads "Ocean Harbour" (two words or more before the cut)
  let w = String(t || "").split(/\s+/).filter(Boolean);
  const cut = w.findIndex((x, i) => i >= 2 && (/^(with|and|in|at|on)$/i.test(x) || /,$/.test(w[i - 1])));
  if (cut > 0) w = w.slice(0, cut);
  w = w.map((x, i) => (i === w.length - 1 ? x.replace(/[,:;.]+$/, "") : x));
  while (w.length > 1 && STOP.has(w[w.length - 1].toLowerCase().replace(/[,:;.]+$/, ""))) w.pop();
  // headline case (Chicago): short articles, conjunctions and prepositions stay lower case unless they lead
  const SMALL = new Set(["a", "an", "the", "and", "or", "but", "of", "in", "on", "at", "to", "for", "with", "by", "from"]);
  return w.map((x, i) => (i > 0 && SMALL.has(x.toLowerCase()) ? x.toLowerCase() : x)).join(" ").replace(/[,:;.]+$/, "") || "Untitled Kit";
}

/** Whether a caller may see a licensed kit's tokens: the claim token its PayPal order handed the buyer's browser, or
 *  the mandate that paid for it. The order ID alone unlocks nothing (the same rule as commerce.publicOrder). */
export async function owns(kit, { claim, mandate } = {}) {
  if (!kit.licence?.tokens || !Object.keys(kit.licence.tokens).length) return true; // nothing paid, nothing to hide
  const o = await store.get("orders", kit.licence.orderId);
  if (claim && commerce.ownsOrder(o, String(claim))) return true;
  if (mandate && o?.mandateId) { const m = await mandates.recordByToken(String(mandate)); if (m && m.id === o.mandateId) return true; }
  return false;
}

/** Public view: parts with their preview and, once licensed and only for its owner, their clean render and module URLs. */
export function view(kit, { owner = true } = {}) {
  const b = config.baseUrl;
  return {
    id: kit.id, title: tidyTitle(kit.title), vibe: kit.vibe, planner: kit.planner, createdAt: kit.createdAt, total: kit.total, creators: kit.creators, licensed: !!kit.licence, owner: !!kit.licence && owner, unmatched: kit.unmatched || [],
    licence: kit.licence ? { orderId: kit.licence.orderId, total: kit.licence.total, creators: kit.licence.creators, at: kit.licence.at, via: kit.licence.via } : null,
    items: kit.items.map((l) => {
      const q = Object.keys(l.knobs).length ? `?p=${encodeURIComponent(JSON.stringify(l.knobs))}` : "";
      const tok = (owner ? kit.licence?.tokens?.[l.assetId] : null) || (l.price === 0 && !l.covered ? "free" : null) || (l.covered && kit.items.find((x) => x.assetId === l.assetId && !x.covered)?.price === 0 ? "free" : null);
      return { ...l, preview: `${b}/api/assets/${l.assetId}/render.wav${q}`, card: `${b}/api/assets/${l.assetId}/render.png${q}`,
        licence: tok && tok !== "free" ? tok : null,
        wav: tok ? (tok === "free" ? `${b}/api/assets/${l.assetId}/download.wav${q}` : `${b}/api/licenses/${tok}/download.wav`) : null,
        module: tok ? `${b}/cdn/${l.assetId}.mjs${tok === "free" ? "" : `?lic=${tok}`}` : null };
    }),
  };
}
