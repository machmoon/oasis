// The catalogue: built-in programs from assets/, plus community and AI forks from the store.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { Resvg } from "@resvg/resvg-js";
import { inspect, renderSource } from "./sandbox.js";
import { resolveKnobs, applyPreset } from "./knobs.js";
import * as store from "./store.js";

const ASSET_DIR = new URL("../assets/", import.meta.url).pathname;
const assets = new Map();
let loadedForks = 0;

function record(id, source, extra = {}) {
  const { meta, params } = inspect(source);
  return {
    id,
    title: meta.title || id,
    kind: meta.kind || "illustration",
    description: meta.description || "",
    tags: meta.tags || [],
    price: Math.max(0, Number(meta.price) || 0),
    author: meta.author || "oasis",
    credit: meta.credit || null,
    size: meta.size || [800, 600],
    params,
    source,
    forkedFrom: null,
    lineage: [],
    createdAt: null,
    ...extra,
  };
}

export async function load() {
  assets.clear();
  for (const f of fs.readdirSync(ASSET_DIR).filter((f) => f.endsWith(".mjs")).sort()) {
    const id = f.replace(/\.mjs$/, "");
    try {
      assets.set(id, record(id, fs.readFileSync(path.join(ASSET_DIR, f), "utf8")));
    } catch (e) {
      console.warn(`skipping ${f}: ${e.message}`);
    }
  }
  const seedDir = new URL("../seed/forks/", import.meta.url).pathname;
  const seeds = fs.existsSync(seedDir) ? fs.readdirSync(seedDir).filter((f) => f.endsWith(".json")).map((f) => JSON.parse(fs.readFileSync(path.join(seedDir, f), "utf8"))) : [];
  const forks = [...seeds, ...(await store.list("forks"))];
  for (const fk of forks) {
    try {
      assets.set(fk.id, record(fk.id, fk.source, fk));
    } catch (e) {
      console.warn(`skipping fork ${fk.id}: ${e.message}`);
    }
  }
  loadedForks = forks.length;
  return assets.size;
}

export const getAsset = (id) => assets.get(id) || null;
export const allAssets = () => [...assets.values()];

/** Public JSON view of an asset; never includes the program source of a paid asset. */
export function summary(a, { withKnobs = false } = {}) {
  const s = {
    id: a.id, title: a.title, kind: a.kind, description: a.description, tags: a.tags,
    price: a.price, author: a.author, credit: a.credit, size: a.size,
    forkedFrom: a.forkedFrom, lineage: a.lineage, createdAt: a.createdAt,
    presets: Object.keys(a.params.presets || {}),
    knobCount: Object.keys(a.params.knobs || {}).length,
    forks: allAssets().filter((x) => x.forkedFrom === a.id).length,
  };
  if (withKnobs) {
    s.knobs = a.params.knobs;
    s.presetValues = a.params.presets || {};
    if (a.price === 0) s.source = a.source;
  }
  return s;
}

export function search({ query = "", kind, maxPrice, freeOnly, limit = 24 } = {}) {
  const terms = String(query).toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 1);
  let list = allAssets();
  if (kind) list = list.filter((a) => a.kind === kind);
  if (freeOnly) list = list.filter((a) => a.price === 0);
  if (maxPrice !== undefined && maxPrice !== null) list = list.filter((a) => a.price <= maxPrice);
  const scored = list.map((a) => {
    if (!terms.length) return [a, 1];
    const hay = { title: a.title.toLowerCase(), tags: a.tags.join(" ").toLowerCase(), desc: a.description.toLowerCase(), kind: a.kind };
    let s = 0;
    for (const t of terms) {
      if (hay.title.includes(t)) s += 5;
      if (hay.tags.includes(t)) s += 4;
      if (hay.kind.includes(t)) s += 3;
      if (hay.desc.includes(t)) s += 1;
    }
    return [a, s];
  });
  return scored.filter(([, s]) => s > 0).sort((x, y) => y[1] - x[1] || (x[0].forkedFrom ? 1 : -1)).slice(0, limit).map(([a]) => a);
}

const cache = new Map();
/** Renders a remix. Input may name a colourway `preset`; everything is validated against the schema. */
export function render(a, input = {}) {
  const { preset, ...rest } = input || {};
  const values = resolveKnobs(a.params, preset ? applyPreset(a.params, preset, rest) : rest);
  const key = a.id + JSON.stringify(values);
  let svg = cache.get(key);
  if (!svg) {
    svg = renderSource(a.source, values);
    if (cache.size > 500) cache.delete(cache.keys().next().value);
    cache.set(key, svg);
  }
  return { svg, values };
}

/** A paid asset's preview carries a tiled watermark until it is licensed. */
export function watermark(svg, size) {
  const [w, h] = size;
  const inner = svg.replace(/^<svg\b([^>]*)>/, (m, attrs) => `<svg x="0" y="0" width="${w}" height="${h}"${attrs.replace(/\s(width|height|x|y)="[^"]*"/g, "")}>`);
  const fs = Math.max(14, Math.round(Math.min(w, h) / 22));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"><defs><pattern id="oasis-wm" width="${fs * 11}" height="${fs * 6}" patternUnits="userSpaceOnUse" patternTransform="rotate(-24)"><text x="0" y="${fs * 2}" font-family="Helvetica, Arial, sans-serif" font-size="${fs}" font-weight="700" fill="#000000" fill-opacity="0.16" stroke="#ffffff" stroke-opacity="0.35" stroke-width="0.8">oasis · preview</text></pattern></defs>${inner}<rect width="${w}" height="${h}" fill="url(#oasis-wm)"/></svg>`;
}

export function sizeOf(svg, fallback) {
  const m = svg.match(/viewBox="\s*[-\d.]+\s+[-\d.]+\s+([\d.]+)\s+([\d.]+)/);
  return m ? [Number(m[1]), Number(m[2])] : fallback;
}

export function toPng(svg, width = 1024) {
  return new Resvg(svg, { fitTo: { mode: "width", value: width }, font: { loadSystemFonts: true } }).render().asPng();
}

export async function addFork(doc) {
  await store.put("forks", doc.id, doc);
  assets.set(doc.id, record(doc.id, doc.source, doc));
  return assets.get(doc.id);
}

export const newId = (prefix) => `${prefix}-${crypto.randomBytes(4).toString("hex")}`;
export const stats = () => ({ assets: assets.size, forks: loadedForks });
