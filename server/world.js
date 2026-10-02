// Worlds: a prompt becomes a layout of kit pieces on the Oasis Town grid (6 m cells). The planner is a
// deterministic street generator steered by the prompt's theme; when the Claude key is present the agent can
// rewrite the layout, but the procedural plan is always there so the demo never waits on a model.
import Anthropic from "@anthropic-ai/sdk";
import * as catalog from "./catalog.js";
import { resolveKnobs } from "./knobs.js";
import { config } from "./config.js";

export const CELL = 6;

function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const hash = (s) => [...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 7);

const THEMES = {
  kyoto: { words: ["kyoto", "japan", "tokyo", "shrine", "sakura", "cherry", "temple", "zen"], season: "spring", awnings: ["#E5484D", "#D9402E", "#2B3242"], walls: ["#F3E3C8", "#EFD9BC", "#F6EEE0"], roofs: ["#3B4250", "#5B6270"], torii: true, trees: "blossom" },
  seaside: { words: ["sea", "beach", "coast", "harbor", "harbour", "surf", "ocean", "island", "summer"], season: "summer", awnings: ["#0E7C7B", "#FF7A59", "#3E7BFA"], walls: ["#F5EBDD", "#E3F1F3", "#FFFFFF"], roofs: ["#0E7C7B", "#FF7A59"], trees: "round" },
  winter: { words: ["winter", "snow", "christmas", "alpine", "ski", "nordic", "cold"], season: "winter", awnings: ["#C8553D", "#2F7A55", "#3B4A5A"], walls: ["#D8E3EC", "#F6EEE0", "#EAD2C0"], roofs: ["#F3F6F9", "#3B4A5A"], trees: "pine" },
  autumn: { words: ["autumn", "fall", "harvest", "cozy", "cosy", "maple", "pumpkin"], season: "autumn", awnings: ["#E58A3A", "#7A4A3A", "#C8553D"], walls: ["#F3E3C8", "#E2C29B", "#F6EEE0"], roofs: ["#7A4A3A", "#5B6270"], trees: "round" },
  candy: { words: ["candy", "pastel", "cute", "kawaii", "pink", "sweet", "toy"], season: "spring", awnings: ["#FF5C8A", "#7D5BA6", "#FFB347"], walls: ["#FFF0F4", "#F2E6EE", "#FBE7EF"], roofs: ["#7D5BA6", "#FF5C8A"], trees: "blossom" },
  town: { words: [], season: "spring", awnings: ["#E5484D", "#3E7BFA", "#2F7A55"], walls: ["#F3E3C8", "#F6EEE0", "#D8DEE3"], roofs: ["#5B6270", "#C8553D"], trees: "blossom" },
};

export function themeOf(prompt) {
  const p = prompt.toLowerCase();
  for (const [name, t] of Object.entries(THEMES)) if (t.words.some((w) => p.includes(w))) return name;
  return "town";
}

/** A street of kit pieces for a prompt: two rows of buildings facing a road, greenery front and back. */
export function planWorld(prompt = "a cosy little town", { seed } = {}) {
  const p = prompt.toLowerCase();
  const themeName = themeOf(p), T = THEMES[themeName];
  const r = rng(seed ?? hash(prompt));
  const pick = (arr) => arr[Math.floor(r() * arr.length)];
  const time = /night|neon|evening|midnight/.test(p) ? "night" : /dusk|sunset|golden/.test(p) ? "dusk" : "day";
  const market = /market|stall|food|bazaar|fair/.test(p);
  const tram = /tram|train|transit|rail/.test(p) || r() > 0.5;
  const cols = /big|city|long|large/.test(p) ? 6 : 5;
  const placements = [];
  const place = (asset, cx, cz, knobs = {}, { rot = 0, dx = 0, dz = 0 } = {}) => {
    const x = cx * CELL + dx + (rot === 180 ? CELL : 0), z = cz * CELL + dz + (rot === 180 ? CELL : 0);
    placements.push({ asset, at: [x, 0, z], rot, knobs });
  };
  // ground: lawns front and back, plaza strip by the shops
  for (let cx = 0; cx < cols; cx++) {
    place("town-plaza", cx, 0, { surface: "grass", grass: T.season === "winter" ? "#EEF2F6" : T.season === "autumn" ? "#C9B58E" : "#A9C48A", beds: r() > 0.7 });
    place("town-plaza", cx, 4, { surface: "grass", grass: T.season === "winter" ? "#EEF2F6" : T.season === "autumn" ? "#C9B58E" : "#A9C48A" });
    place("town-road", cx, 2, { feature: tram ? "tram" : cx === Math.floor(cols / 2) ? "crossing" : "lanes" });
    place("town-plaza", cx, 1, { surface: "paving" });
    place("town-plaza", cx, 3, { surface: "paving" });
  }
  // buildings: far row faces the road (front at -z), near row is turned around
  for (let cx = 0; cx < cols; cx++) {
    for (const [cz, rot] of [[3, 0], [1, 180]]) {
      if (market && cz === 1 && cx % 2 === 1) { place("town-stall", cx, cz, { canopy: pick(T.awnings), stock: 4 + Math.floor(r() * 5) }, { rot, dx: 1, dz: 1.5 }); continue; }
      if (T.torii && cz === 1 && cx === Math.floor(cols / 2)) { place("town-torii", cx, cz, {}, { rot, dx: 1, dz: 2 }); continue; }
      const city = /city|downtown|urban|apartment|tower/.test(p);
      if (r() < (city ? 0.45 : 0.15)) { place("town-flats", cx, cz, { wall: pick(T.walls), balcony: pick(T.awnings), trim: pick(T.roofs), floors: 3 + Math.floor(r() * (city ? 5 : 3)), lights: time !== "day" }, { rot }); continue; }
      const house = r() > 0.6;
      if (house) place("town-house", cx, cz, { wall: pick(T.walls), roof: pick(T.roofs), floors: 1 + Math.floor(r() * 2), lights: time !== "day" }, { rot });
      else place("town-shop", cx, cz, { wall: pick(T.walls), awning: pick(T.awnings), trim: pick(T.roofs), floors: 1 + Math.floor(r() * 3), roof: r() > 0.35 ? "gable" : "flat", lights: time !== "day" }, { rot });
    }
  }
  // trees and lamps
  for (let cx = 0; cx < cols; cx++) {
    for (const cz of [0, 4]) if (r() > 0.25) place("town-tree", cx, cz, { shape: T.trees, season: T.season, height: 2.6 + r() * 2.2 }, { dx: 1 + r() * 2.5, dz: 1.5 + r() * 2 });
    if (cx % 2 === 0) { place("town-lamp", cx, 2, {}, { dx: 2.5, dz: -0.2 }); place("town-lamp", cx, 2, {}, { dx: 3.5, dz: 5.4 }); }
  }
  if (tram) placements.push({ asset: "town-tram", at: [CELL * 0.6, 0.1, CELL * 2 + 1.95], rot: 0, knobs: { body: pick(T.awnings), cars: 2, lights: time !== "day" } });
  // props: any small kit piece the factory has published (benches, fountains, carts...) dots the lawns
  const CORE = new Set(["town-shop", "town-house", "town-stall", "town-torii", "town-tram", "town-robot", "town-gate", "town-road", "town-plaza", "town-tree", "town-lamp", "town-flats", "town-hatchback"]);
  // parked cars along both kerbs
  const cars = 2 + Math.floor(r() * 3);
  for (let i = 0; i < cars; i++) {
    const far = r() > 0.5, x = 1 + r() * (cols * CELL - 6);
    placements.push({ asset: "town-hatchback", at: far ? [x + 4, 0.1, CELL * 2 + 5.2] : [x, 0.1, CELL * 2 + 0.75], rot: far ? 180 : 0, knobs: { body: pick([...T.awnings, "#F6EEE0", "#3A3F48"]), roof: r() > 0.85 ? "taxi" : "plain", lights: time !== "day" } });
  }
  const props = catalog.allAssets().filter((a) => a.format === "blocks" && !CORE.has(a.id) && a.footprint && Math.max(...a.footprint) <= 4).sort((a, b) => a.id.localeCompare(b.id));
  if (props.length) for (let cx = 0; cx < cols; cx++) for (const cz of [0, 4]) if (r() > 0.45) {
    const a = pick(props);
    place(a.id, cx, cz, {}, { dx: Math.min(6 - a.footprint[0], 0.5 + r() * 2), dz: Math.min(6 - a.footprint[1], 0.3 + r() * 1.5) });
  }
  // the Oasis agent itself, at the corner of the street
  place("town-robot", 0, 4, { cube: pick(T.awnings) }, { dx: 2, dz: 0.5 });
  return { prompt, theme: themeName, time, size: [cols * CELL, 5 * CELL], placements };
}

/** Validates a layout: real kit assets, schema-checked knobs, positions inside the world. */
export function cleanPlan(plan) {
  const out = [];
  for (const pl of plan.placements || []) {
    const a = catalog.getAsset(pl.asset);
    if (!a || a.format !== "blocks") continue;
    const knobs = resolveKnobs(a.params, pl.knobs || {});
    const at = (pl.at || [0, 0, 0]).slice(0, 3).map((v) => Math.max(-200, Math.min(200, Number(v) || 0)));
    out.push({ id: pl.id, asset: a.id, title: a.title, price: a.price, author: a.author, at, rot: [0, 90, 180, 270].includes(pl.rot) ? pl.rot : 0, knobs });
  }
  return { ...plan, placements: out };
}

/** What a world costs: one licence per kit piece, covering every remix of it in the world. */
export function worldTotal(bill) {
  const seen = new Map();
  for (const l of bill) if (!seen.has(l.asset)) seen.set(l.asset, l.price);
  return [...seen.values()].reduce((s, v) => s + v, 0);
}
/** The licence lines for a world order: one per paid piece, carrying the first remix's knobs. */
export function worldItems(bill) {
  const seen = new Map();
  for (const l of bill) if (l.price > 0 && !seen.has(l.asset)) seen.set(l.asset, { assetId: l.asset, knobs: l.knobs });
  return [...seen.values()];
}

/** The bill of materials: one line per distinct remix, with how many times it is placed. */
export function billOf(plan) {
  const lines = new Map();
  for (const pl of plan.placements) {
    const key = pl.asset + JSON.stringify(pl.knobs);
    if (!lines.has(key)) lines.set(key, { asset: pl.asset, title: pl.title, price: pl.price, author: pl.author, knobs: pl.knobs, count: 0 });
    lines.get(key).count++;
  }
  return [...lines.values()];
}

// ---------- the agent: edits a world through small operations, never by rewriting it ----------
const EDIT_TOOL = {
  name: "edit_world",
  description: "Change the world. Use set to recolour or reshape pieces, add to place a kit piece in a grid cell, remove to delete pieces, time for lighting, title to name the place.",
  input_schema: {
    type: "object",
    properties: {
      title: { type: "string", description: "A 2-5 word name for the place" },
      time: { type: "string", enum: ["day", "dusk", "night"] },
      say: { type: "string", description: "One short sentence to the user about what you changed" },
      ops: {
        type: "array",
        items: {
          type: "object",
          properties: {
            op: { type: "string", enum: ["set", "add", "remove"] },
            ids: { type: "array", items: { type: "string" }, description: "placement ids for set/remove" },
            asset: { type: "string", description: "kit piece id; for set without ids, applies to every placement of this asset" },
            cell: { type: "array", items: { type: "integer" }, description: "[cx, cz] grid cell for add" },
            offset: { type: "array", items: { type: "number" }, description: "[dx, dz] metres inside the cell for add" },
            rot: { type: "integer", enum: [0, 90, 180, 270] },
            knobs: { type: "object", description: "knob values to set" },
          },
          required: ["op"],
        },
      },
    },
    required: ["ops"],
  },
};

const withIds = (plan) => ({ ...plan, placements: plan.placements.map((p, i) => ({ id: p.id || `p${i}`, ...p })) });

/** Applies agent operations to a plan. Unknown ids and assets are skipped; cleanPlan validates the rest. */
export function applyOps(plan, edit) {
  let placements = withIds(plan).placements.map((p) => ({ ...p, knobs: { ...p.knobs } }));
  let n = placements.length;
  for (const o of edit.ops || []) {
    if (o.op === "remove") placements = placements.filter((p) => !(o.ids || []).includes(p.id));
    else if (o.op === "set") {
      for (const p of placements) if ((o.ids?.length ? o.ids.includes(p.id) : p.asset === o.asset) && o.knobs) Object.assign(p.knobs, o.knobs);
    } else if (o.op === "add" && o.asset && Array.isArray(o.cell)) {
      const [cx, cz] = o.cell, [dx, dz] = o.offset || [0, 0], rot = o.rot || 0;
      placements.push({ id: `p${n++}`, asset: o.asset, at: [cx * CELL + dx + (rot === 180 ? CELL : 0), 0, cz * CELL + dz + (rot === 180 ? CELL : 0)], rot, knobs: o.knobs || {} });
    }
  }
  return { ...plan, title: edit.title || plan.title, time: edit.time || plan.time, say: edit.say || "", placements };
}

/** Claude edits the world for a request: builds on the procedural plan, or changes the current one. */
export async function agentEdit(request, plan) {
  if (!config.anthropicKey) return null;
  const kit = catalog.allAssets().filter((a) => a.format === "blocks").map((a) => ({ id: a.id, title: a.title, footprint: a.footprint, knobs: Object.fromEntries(Object.entries(a.params.knobs).map(([k, v]) => [k, v.type === "choice" ? v.options : v.type === "range" ? [v.min, v.max] : v.type])) }));
  const cols = Math.round(plan.size[0] / CELL), rows = Math.round(plan.size[1] / CELL);
  const view = withIds(plan).placements.map((p) => ({ id: p.id, asset: p.asset, cell: [Math.floor(p.at[0] / CELL), Math.floor(p.at[2] / CELL)], rot: p.rot, knobs: Object.fromEntries(Object.entries(p.knobs).filter(([, v]) => typeof v !== "boolean" || v)) }));
  const client = new Anthropic({ apiKey: config.anthropicKey });
  const msg = await client.messages.create({
    model: "claude-opus-5-5",
    max_tokens: 4000,
    system: `You art-direct tiny toy-block worlds built from a kit of parametric 3D pieces on a ${CELL} m grid of ${cols} x ${rows} cells. Row 2 is the road; rows 1 and 3 hold buildings (row 1 pieces use rot 180 so their fronts face the road); rows 0 and 4 are lawns. Make tasteful, cohesive choices: a small palette, contrast between neighbours, details that tell the story of the place. Always answer by calling edit_world.`,
    tools: [EDIT_TOOL],
    messages: [{ role: "user", content: `Kit: ${JSON.stringify(kit)}\n\nCurrent world (time ${plan.time}): ${JSON.stringify(view)}\n\nRequest: ${request}` }],
  });
  const call = msg.content.find((c) => c.type === "tool_use");
  if (!call) return null;
  return { ...applyOps(plan, call.input), by: "agent" };
}
