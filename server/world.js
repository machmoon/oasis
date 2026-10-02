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
    out.push({ asset: a.id, title: a.title, price: a.price, author: a.author, at, rot: [0, 90, 180, 270].includes(pl.rot) ? pl.rot : 0, knobs });
  }
  return { ...plan, placements: out };
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

/** Claude rewrites the procedural plan to fit the prompt better (names, colours, which pieces where). */
export async function agentPlan(prompt, base) {
  if (!config.anthropicKey) return null;
  const kit = catalog.allAssets().filter((a) => a.format === "blocks").map((a) => ({ id: a.id, title: a.title, footprint: a.footprint, knobs: Object.fromEntries(Object.entries(a.params.knobs).map(([k, v]) => [k, v.type === "choice" ? v.options : v.type])) }));
  const client = new Anthropic({ apiKey: config.anthropicKey });
  const msg = await client.messages.create({
    model: "claude-opus-5-5",
    max_tokens: 6000,
    system: "You design tiny toy-block worlds on a 6 m grid from a kit of parametric 3D pieces. Return only JSON.",
    messages: [{ role: "user", content: `Prompt: ${prompt}\n\nKit (id, footprint in metres, knobs):\n${JSON.stringify(kit)}\n\nHere is a starting layout made by a procedural street generator. Improve it for the prompt: recolour pieces (hex colours), change which pieces go where, add or remove up to 12 placements, keep everything inside x 0..${base.size[0]} and z 0..${base.size[1]}, keep the road row and ground tiles. Keep rot to 0 or 180 (180 for the near row so fronts face the road).\n\n${JSON.stringify({ time: base.time, placements: base.placements.map(({ asset, at, rot, knobs }) => ({ asset, at, rot, knobs })) })}\n\nReply with JSON only: {"title": "<a 2-5 word place name>", "time": "day|dusk|night", "placements": [...]}` }],
  });
  const text = msg.content.find((c) => c.type === "text")?.text || "";
  const json = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
  return { ...base, title: json.title, time: ["day", "dusk", "night"].includes(json.time) ? json.time : base.time, placements: json.placements || base.placements, by: "agent" };
}
