// The catalogue: built-in programs from assets/, plus community and AI forks from the store.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { rasterize } from "./raster.js";
import { inspect, renderSource, renderSound, SOUND_SR } from "./sandbox.js";
import { renderInPool, buildInPool, soundInPool } from "./pool.js";
import { resolveKnobs, applyPreset, brandKnobs } from "./knobs.js";
import * as store from "./store.js";

const ASSET_DIR = new URL("../assets/", import.meta.url).pathname;
// Sound programs (factory/CONTRACT-SOUND.md) live beside the 2D and 3D assets; the registry's front door is sounds.
const SOUND_DIR = new URL("../sounds/", import.meta.url).pathname;
export const SOUND_KINDS = ["sfx", "ambience", "ui", "impact", "foley", "music-loop"];
const assets = new Map();
let loadedForks = 0;

function record(id, source, extra = {}) {
  const { meta, params } = inspect(source);
  const format = meta.format === "sound" ? "sound" : meta.format === "blocks" || /export\s+function\s+build\s*\(/.test(source) ? "blocks" : "svg";
  return {
    id,
    title: meta.title || id,
    kind: meta.kind || (format === "sound" ? "sfx" : "illustration"),
    description: meta.description || "",
    tags: meta.tags || [],
    price: Math.max(0, Number(meta.price) || 0),
    author: meta.author || "oasis",
    // Creator accounts in this sandbox build are PayPal sandbox payees (meta.payout); forks carry their own.
    payoutEmail: meta.payout || null,
    credit: meta.credit || null,
    size: meta.size || [800, 600],
    // "sound": build(p, dsp) returns samples; "blocks": build(p) returns 3D parts (server/blocks.js); "svg": render(p).
    format,
    // nominal seconds of one render, from meta (the real length is whatever the program returns)
    duration: format === "sound" ? Math.max(0.05, Math.min(4, Number(meta.duration) || 1)) : null,
    footprint: meta.footprint || null,
    worldKit: meta.kit || null,
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
  for (const dir of [ASSET_DIR, SOUND_DIR]) {
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(".mjs")).sort()) {
      const id = f.replace(/\.mjs$/, "");
      try {
        assets.set(id, record(id, fs.readFileSync(path.join(dir, f), "utf8")));
      } catch (e) {
        console.warn(`skipping ${f}: ${e.message}`);
      }
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
    price: a.price, author: a.author, credit: a.credit, size: a.size, format: a.format, footprint: a.footprint, duration: a.duration,
    forkedFrom: a.forkedFrom, lineage: a.lineage, createdAt: a.createdAt,
    presets: Object.keys(a.params.presets || {}),
    knobCount: Object.keys(a.params.knobs || {}).length,
    // Kits: assets built to one grid, light and scale so they compose (oasis-town is the kit's reference).
    kit: a.kit || (a.id === "oasis-town" || a.id.startsWith("iso-") ? "Oasis Town" : null),
    worldKit: a.worldKit,
    roles: Object.fromEntries(Object.entries(a.params.knobs || {}).filter(([, k]) => k.type === "color" && k.role).map(([n, k]) => [n, k.role])),
    forks: allAssets().filter((x) => x.forkedFrom === a.id).length,
  };
  if (withKnobs) {
    s.knobs = a.params.knobs;
    s.presetValues = a.params.presets || {};
    if (a.price === 0) s.source = a.source;
  }
  return s;
}

export function search({ query = "", kind, format, maxPrice, freeOnly, limit = 24 } = {}) {
  const terms = String(query).toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 1);
  let list = allAssets();
  if (format) list = list.filter((a) => a.format === format);
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
  const { preset, brand, ...rest } = input || {};
  const base = brand ? { ...brandKnobs(a.params, brand), ...rest } : rest;
  const values = resolveKnobs(a.params, preset ? applyPreset(a.params, preset, base) : base);
  const key = a.id + JSON.stringify(values);
  let svg = cache.get(key);
  if (!svg) {
    svg = renderSource(a.source, values);
    if (cache.size > 500) cache.delete(cache.keys().next().value);
    cache.set(key, svg);
  }
  return { svg, values };
}

export function resolveInput(a, input) {
  const { preset, brand, ...rest } = input || {};
  const base = brand ? { ...brandKnobs(a.params, brand), ...rest } : rest;
  return resolveKnobs(a.params, preset ? applyPreset(a.params, preset, base) : base);
}

/** Same as render, but on the worker pool: the HTTP preview path. */
export async function renderAsync(a, input = {}, opts = {}) {
  const values = resolveInput(a, input);
  const key = a.id + JSON.stringify(values) + (opts.night ? "N" : "");
  let svg = cache.get(key);
  if (!svg) {
    svg = await renderInPool(a.source, values, opts);
    if (cache.size > 500) cache.delete(cache.keys().next().value);
    cache.set(key, svg);
  }
  return { svg, values };
}

const partsCache = new Map();
/** Block assets: the parts list for a remix, built on the worker pool. */
export async function buildAsync(a, input = {}) {
  const values = resolveInput(a, input);
  const key = a.id + JSON.stringify(values);
  let parts = partsCache.get(key);
  if (!parts) {
    parts = await buildInPool(a.source, values);
    if (partsCache.size > 300) partsCache.delete(partsCache.keys().next().value);
    partsCache.set(key, parts);
  }
  return { parts, values };
}

// Sound renders: Float32Array samples, cached by knobs (~90 KB each at 22.05 kHz for a one-second sound).
const soundCache = new Map();
const soundKey = (a, values, sr) => `${a.id}@${sr}${JSON.stringify(values)}`;
/** Sound programs: samples for a remix, on the worker pool. */
export async function soundAsync(a, input = {}, { sr = SOUND_SR } = {}) {
  const values = resolveInput(a, input);
  const key = soundKey(a, values, sr);
  let samples = soundCache.get(key);
  if (!samples) {
    samples = await soundInPool(a.source, values, sr);
    if (soundCache.size > 150) soundCache.delete(soundCache.keys().next().value);
    soundCache.set(key, samples);
  }
  return { samples, sr, values };
}
/** Same, on the calling thread (tests and the factory). */
export function sound(a, input = {}, { sr = SOUND_SR } = {}) {
  const values = resolveInput(a, input);
  return { samples: renderSound(a.source, values, { sr }), sr, values };
}

/** A paid asset's preview carries a tiled watermark until it is licensed. */
export function watermark(svg, size) {
  const [w, h] = size;
  // The asset's content is inlined (its root <svg> unwrapped into a group shifted by its viewBox), not nested as a
  // second <svg>: resvg panics on a nested <svg> whose content uses filters, and a panic aborts the process.
  const open = svg.match(/^<svg\b[^>]*>/)?.[0] || "";
  const vb = open.match(/viewBox="\s*([-\d.]+)[\s,]+([-\d.]+)/);
  const body = svg.slice(open.length).replace(/<\/svg>\s*$/, "");
  const inner = `<g transform="translate(${vb ? -Number(vb[1]) : 0},${vb ? -Number(vb[2]) : 0})">${body}</g>`;
  const fs = Math.max(13, Math.round(Math.min(w, h) / 26));
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"><defs><pattern id="oasis-wm" width="${fs * 15}" height="${fs * 9}" patternUnits="userSpaceOnUse" patternTransform="rotate(-24)"><text x="0" y="${fs * 2}" font-family="Helvetica, Arial, sans-serif" font-size="${fs}" font-weight="700" fill="#000000" fill-opacity="0.11" stroke="#ffffff" stroke-opacity="0.3" stroke-width="0.7">oasis preview</text></pattern></defs>${inner}<rect width="${w}" height="${h}" fill="url(#oasis-wm)"/></svg>`;
}

export function sizeOf(svg, fallback) {
  const m = svg.match(/viewBox="\s*[-\d.]+\s+[-\d.]+\s+([\d.]+)\s+([\d.]+)/);
  return m ? [Number(m[1]), Number(m[2])] : fallback;
}

/** SVG to PNG, in a supervised child process so a resvg panic can't take the server down (server/raster.js). */
export function toPng(svg, width = 1024) {
  return rasterize(svg, width);
}

export async function addFork(doc) {
  await store.put("forks", doc.id, doc);
  assets.set(doc.id, record(doc.id, doc.source, doc));
  return assets.get(doc.id);
}

export const newId = (prefix) => `${prefix}-${crypto.randomBytes(4).toString("hex")}`;
export const stats = () => ({ assets: assets.size, sounds: allAssets().filter((a) => a.format === "sound").length, forks: loadedForks });
