// Films: a brief becomes a short film shot inside a world of kit pieces, dressed with 2D assets rendered as signs,
// and cut from a list of camera moves. Everything in a film is a program (the pieces, the signs, the shots), so the
// render is deterministic: frame N is a pure function of the film, the way Remotion renders a composition
// (remotion-dev/remotion, packages/renderer/src/render-frames.ts: open the page, seek each frame, screenshot,
// stitch). The planner below is procedural and always works; when the Claude key is present the director rewrites
// the brand, the sign copy and the shot list through one typed tool call, and the server validates every value.
import crypto from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import * as catalog from "./catalog.js";
import * as world from "./world.js";
import * as store from "./store.js";
import { bounds } from "./blocks.js";
import { resolveKnobs, completeBrand } from "./knobs.js";
import { config } from "./config.js";
import { moodOf, MOODS } from "./film-music.js";

export const FPS = 30;
export const SIZE = [1920, 1080];
// Formats, as Remotion compositions carry a width and height: the same film renders landscape, vertical or square.
export const FORMATS = { "16:9": [1920, 1080], "9:16": [1080, 1920], "1:1": [1080, 1080] };
export const WEATHER = ["none", "blossom", "snow", "rain", "leaves", "fog"];
const weatherOf = (theme, brief = "") => (/momiji|maple|autumn|leaf|leaves/i.test(brief) ? "leaves" : { kyoto: "blossom", candy: "blossom", winter: "snow", autumn: "leaves", sf: "fog" }[theme] || "none");
const CELL = world.CELL;
export const SHOT_KINDS = ["orbit", "dolly", "push", "crane", "static"];
// The edit: speed ramps (public/film-fx.js CURVES, from easings.net), the transition into each shot, and the
// film-wide finish. "hype" is the After Effects cut (ramps, whips, a title that slams in); "clean" is calm and
// straight; "dream" is soft, bright and slow.
export const RAMPS = ["smooth", "linear", "expo", "punch", "build", "quart"];
export const CUTS = ["cut", "whip", "zoom", "glitch", "flash"];
export const STYLES = ["hype", "clean", "dream"];
export const styleOf = (brief) => (/\b(calm|dreamy|dream|soft|cosy|cozy|gentle|slow)\b/i.test(brief) ? "dream" : /\b(clean|minimal|simple|quiet)\b/i.test(brief) ? "clean" : "hype");
const TIMES = ["day", "dusk", "night"];
const MAX_SHOTS = 8, MAX_SECONDS = 30, MAX_SIGNS = 6;

// 2D assets that read well as street signs (roof boards, kerb boards) and as end cards, with the text knob that
// carries the brand's name. Kept to pieces whose composition survives being seen from a street.
export const SIGN_ASSETS = {
  "wordmark-type": { text: "text", roof: true, card: true },
  "geometric-logo-mark": { text: "wordmark", roof: false, card: true },
  "monogram-logo": { text: "letters", roof: true, card: true, initials: true },
  "retro-sunset-poster": { text: "headline", board: true, card: true },
  "swiss-poster": { text: "headline", board: true, card: true },
  "bauhaus-poster": { text: "headline", board: true, card: true },
  "social-quote-card": { text: "quote", board: true, card: false },
  "event-ticket": { text: "eventName", board: true, card: false },
  "packaging-label": { text: "name", board: true, card: false },
  "youtube-thumbnail": { text: "headline", board: true, card: true },
};

const rng = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const hash = (s) => [...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 11);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, Number(v) || 0));
const title = (s) => s.replace(/\s+/g, " ").trim().replace(/\b\w/g, (c) => c.toUpperCase());

/** The brand name a brief implies: quoted words first, then "for X", then the theme's own name. */
export function brandNameOf(brief, theme) {
  const q = brief.match(/["“]([^"”]{2,32})["”]/);
  if (q) return title(q[1]);
  const f = brief.match(/\b(?:for|called|named)\s+([A-Z][\w'&-]*(?:\s+[A-Z][\w'&-]*){0,2})/);
  if (f) return f[1];
  return { kyoto: "Momiji", seaside: "Tidepool", winter: "Northlight", autumn: "Ember Oak", candy: "Blossom", sf: "Vibecheck", town: "Oasis" }[theme] || "Oasis";
}

function withIds(plan) {
  return { ...plan, placements: plan.placements.map((p, i) => ({ ...p, id: p.id || `p${i}` })) };
}

/** The piece a film is about: a shop on the far row near the middle, else the biggest building. */
export function heroOf(plan) {
  const b = plan.placements.filter((p) => ["town-shop", "town-flats", "town-house", "town-stall", "town-torii"].includes(p.asset));
  const mid = plan.size[0] / 2;
  const far = b.filter((p) => p.rot === 0 && p.at[2] >= 3 * CELL);
  const score = (p) => (p.asset === "town-shop" ? 0 : p.asset === "town-flats" ? 1 : 2) * 100 + Math.abs(p.at[0] + 3 - mid);
  return [...far, ...b].sort((a, b2) => score(a) - score(b2))[0] || plan.placements[0];
}

/** Azimuth (degrees) from which a placement's front is seen: fronts face -z at rot 0. */
const frontAzimuth = (p) => (p.rot === 180 ? 0 : 180);
const centreOf = (p, fp = [6, 6]) => [p.at[0] + (p.rot === 180 ? -fp[0] / 2 : fp[0] / 2), 0, p.at[2] + (p.rot === 180 ? -fp[1] / 2 : fp[1] / 2)];

/** Where a sign sits, in metres: a board on the roof ridge facing the road, or a kerb board on the pavement. */
export async function mountSign(sign, plan) {
  const p = plan.placements.find((x) => x.id === sign.placement) || heroOf(plan);
  const a = catalog.getAsset(p.asset);
  const fp = a?.footprint || [6, 6];
  const { parts } = await catalog.buildAsync(a, p.knobs);
  const [, hi] = bounds(parts);
  const c = centreOf(p, fp);
  const facing = p.rot === 180 ? 1 : -1; // the road is on this side of the piece
  if (sign.where === "roof") return { at: [c[0], hi[1] + 0.25, c[2] + facing * (fp[1] / 2 - 1.2)], rot: p.rot, w: sign.w, h: sign.h, post: 0.5 };
  // kerb: a free-standing board just past the pavement, in front of the piece, turned a little toward the camera
  return { at: [c[0] + (p.rot === 180 ? 2.2 : -2.2), 0, c[2] + facing * (fp[1] / 2 + 0.9)], rot: p.rot, w: sign.w, h: sign.h, post: 0.9 };
}

/** The procedural film: a street from the brief, two signs for the brand, five shots, one end card. */
export async function planFilm(brief, { seed } = {}) {
  brief = String(brief || "a cosy little town").slice(0, 400);
  const plan = withIds(world.cleanPlan(world.planWorld(brief, { seed })));
  const r = rng(seed ?? hash(brief));
  const hero = heroOf(plan);
  const name = brandNameOf(brief, plan.theme);
  const k = hero.knobs || {};
  const time = plan.time;
  const brand = completeBrand({
    primary: k.awning || k.canopy || k.balcony || "#E5484D",
    secondary: k.trim || k.roof || "#3B4250",
    ink: "#1B1F2A",
    background: k.wall || "#F6EEE0",
    highlight: k.sign || "#F2B33D",
  });
  // the sign's ground is the brand's most vivid colour (a ramen shop's red board, a surf shop's teal), its letters the paper
  const vividOf = (b) => [b.primary, b.highlight, b.secondary].map((c) => { const n = parseInt(c.slice(1), 16), r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, bl = (n & 255) / 255, mx = Math.max(r, g, bl), mn = Math.min(r, g, bl), l = (mx + mn) / 2, sat = mx === mn ? 0 : (mx - mn) / (1 - Math.abs(2 * l - 1)); return { c, score: sat * (l > 0.3 && l < 0.72 ? 1 : 0.2) }; }).sort((a, b) => b.score - a.score)[0].c;
  const signBg = vividOf({ ...brand, primary: k.awning || k.canopy || brand.primary });
  const lum = (c) => { const n = parseInt(c.slice(1), 16); return (0.2126 * (n >> 16) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255; };
  const signInk = lum(signBg) > 0.55 ? brand.ink : brand.background; // letters that read on the board
  const second = plan.placements.filter((p) => p.id !== hero.id && ["town-flats", "town-shop", "town-house"].includes(p.asset) && p.rot !== hero.rot).sort((a, b) => Math.abs(a.at[0] - hero.at[0]) - Math.abs(b.at[0] - hero.at[0]))[0];
  const poster = ["retro-sunset-poster", "swiss-poster", "bauhaus-poster"][Math.floor(r() * 3)];
  const signs = [
    { id: "s0", asset: "wordmark-type", placement: hero.id, where: "roof", w: 5.4, h: 1.8, knobs: { text: name.toUpperCase().slice(0, 14), background: signBg, ink: signInk, accent: signInk === brand.ink ? brand.background : brand.ink, slant: 0, rules: false, style: "stacked shadow" } },
    ...(second && catalog.getAsset(poster) ? [{ id: "s1", asset: poster, placement: second.id, where: "kerb", w: 1.3, h: 1.85, knobs: { headline: name.split(" ")[0] } }] : []),
  ];
  const style = styleOf(brief);
  const shots = shotsFor(style, plan, hero, name, { ...brand, board: signBg, boardInk: signInk });
  const place = { kyoto: "a Kyoto street", sf: "a San Francisco street", seaside: "a seaside street", winter: "a winter street", autumn: "an autumn street", candy: "a candy street", town: "a street" }[plan.theme] || "a street";
  return cleanFilm({ title: `${name}: ${place}`, brief, brand, world: plan, signs, shots, edit: { style }, weather: weatherOf(plan.theme, brief), music: { seed: brief, mood: moodOf(plan.theme, plan.time) } });
}

/**
 * Where the 3D title lands: standing in the middle of the road in front of the hero, turned to face down the street,
 * so a camera low in the road sees it in one-point perspective with the buildings either side.
 */
export function titleMountOf(plan) {
  const hero = heroOf(plan);
  const fp = catalog.getAsset(hero.asset)?.footprint || [6, 6];
  const hc = centreOf(hero, fp);
  // one cell down the street from the hero, so its kerb sign is behind the camera rather than in front of the word
  // The camera sits 7.5-13 m up the road from the word. Shoot from whichever end of the street has nothing tall on the
  // pavement in that stretch; if neither does, the player clears those pieces for the title shot only (a cheated set).
  const blockers = plan.placements.filter((p) => ["town-torii", "town-stall"].includes(p.asset)).map((p) => p.at[0] - (p.rot === 180 ? CELL : 0) + 2);
  const clearFrom = (x, dir) => blockers.every((b) => (dir > 0 ? b < x - 15 || b > x + 1 : b > x + 15 || b < x - 1));
  const want = Math.min(plan.size[0] - CELL * 0.5, hc[0] + CELL);
  const options = [];
  for (let x = 6; x <= plan.size[0] - 6; x += CELL * 0.5) for (const dir of [1, -1]) if ((dir > 0 ? x >= 14 : x <= plan.size[0] - 14)) options.push({ x, dir, clear: clearFrom(x, dir) });
  const pick = options.filter((o) => o.clear).sort((a, b) => Math.abs(a.x - want) - Math.abs(b.x - want))[0] || { x: Math.max(14, want), dir: 1, clear: false };
  const x = pick.x;
  return { at: [x, 0.06, 2.5 * CELL], face: pick.dir > 0 ? "-x" : "+x", dir: pick.dir, clearSet: !pick.clear, size: 1.25, maxWidth: CELL * 0.72, paid: false };
}

/** The cut for an edit style: the same street, shot calm (clean, dream) or as a hype edit. */
export function shotsFor(style, plan, hero, name, brand) {
  const [W, D] = plan.size;
  const centre = [W / 2, 1.5, D / 2];
  const hc = centreOf(hero, catalog.getAsset(hero.asset)?.footprint);
  const time = plan.time;
  const az = frontAzimuth(hero);
  const roadZ = 2.5 * CELL;
  // Cameras stay in the road (z 12..18 on a 5-row world) or above the roofs: a radius past the far kerb would put
  // the lens inside the building opposite. The hero's centre is about 3 m behind its facade.
  const R = Math.max(W, D);
  const word = name.toUpperCase().slice(0, 14);
  const tm = titleMountOf(plan);
  // cards wear the brand: a dark panel in the brand's ink, the name in its paper colour, the accent in its most vivid
  const accent = brand ? [brand.highlight, brand.primary, brand.secondary].find((c) => c && !/^#(1|2|3)/i.test(c)) || brand.primary : undefined;
  const branded = brand ? { background: brand.ink, ink: brand.background, accent, slant: 0, rules: false, style: "stacked shadow" } : {};
  const PLACE = { kyoto: "Kyoto · Market Street", sf: "Hayes Valley, San Francisco", seaside: "On the Seafront", winter: "Up in the Mountains", autumn: "On the High Street", candy: "Sweet Street", town: "On Main Street" };
  // the lower third is the shop's board (same colours as the roof sign); the end card is the dark brand panel
  const board = brand?.board ? { ...branded, background: brand.board, ink: brand.boardInk, accent: brand.boardInk === brand.ink ? brand.background : brand.ink } : branded;
  // the lower third is the shop's board; the end card is a lockup: the brand's monogram (a licensed 2D mark), the name
  // set large and tracked under it, a rule and one line of place
  const initials = name.split(/\s+/).map((w) => w[0]).join("").slice(0, 3).toUpperCase();
  const card = (layout) => layout === "lower"
    ? { asset: "wordmark-type", layout, knobs: { ...board, text: word }, scrim: 0, fade: 0.4 }
    : { asset: "monogram-logo", layout, knobs: { letters: initials, transparent: true, container: "circle", font: "sans", style: "solid", primary: brand?.board || brand?.primary, ink: brand?.ink || "#1B1F2A" }, name: word, sub: PLACE[plan.theme] || PLACE.town, scrim: 0.86, fade: 0.5 };
  // the title shot: low in the road, pushing down the street toward the word as it drops in
  const d = tm.dir || 1;
  const titleShot = (seconds, ramp, cut, at) => ({ id: "kt", kind: "dolly", seconds, time, fov: 44, ramp, cut, shake: 0.12, from: [tm.at[0] - 13 * d, 1.6, tm.at[2]], to: [tm.at[0] - 7.5 * d, 1.2, tm.at[2]], look: [tm.at[0] + 4 * d, 1.9, tm.at[2]], title: { text: word, at } });
  if (style === "hype") return [
    { id: "k0", kind: "orbit", seconds: 3, time, fov: 34, ramp: "quart", target: centre, radius: R * 1.1, height: R * 0.4, from: az - 42, to: az - 10 },
    { id: "k1", kind: "dolly", seconds: 2.4, time, fov: 52, ramp: "punch", cut: "whip", shake: 0.3, from: [1.5, 1.7, roadZ], to: [W - 9, 1.9, roadZ], look: [W + 10, 1.5, roadZ + 1.5], card: card("lower") },
    { id: "k2", kind: "push", seconds: 2.2, time, fov: 46, ramp: "punch", cut: "zoom", target: [hc[0], 4.6, hc[2]], azimuth: az + 16, radius: [13, 8.5], height: [3.2, 2.6] },
    titleShot(3, "smooth", "glitch", 0.95),
    { id: "k4", kind: "crane", seconds: 2.8, time: time === "night" ? "night" : "dusk", timeTo: "night", fov: 40, ramp: "expo", cut: "whip", target: [hc[0], 2, hc[2]], azimuth: az - 28, radius: [14, 25], height: [6, 19] },
    { id: "k5", kind: "static", seconds: 2.6, time: "night", fov: 40, cut: "flash", target: [hc[0], 1.2, hc[2]], azimuth: az + 34, radius: 9, height: 1.6, card: card("full") },
  ];
  const soft = style === "dream";
  return [
    { id: "k0", kind: "orbit", seconds: soft ? 4.5 : 4, time, fov: 34, ramp: soft ? "smooth" : undefined, target: centre, radius: R * 1.15, height: R * 0.42, from: az - 40, to: az - 12 },
    { id: "k1", kind: "dolly", seconds: 3.5, time, fov: 50, ramp: "quart", from: [1.5, 1.9, roadZ], to: [W - 7, 1.9, roadZ], look: [W + 10, 1.5, roadZ + 1.5], card: card("lower") },
    titleShot(3.2, "smooth", soft ? "zoom" : "cut", 1.1),
    { id: "k3", kind: "crane", seconds: 3.5, time: time === "night" ? "night" : "dusk", timeTo: "night", fov: 40, ramp: "quart", cut: soft ? "zoom" : "cut", target: [hc[0], 2, hc[2]], azimuth: az - 24, radius: [15, 24], height: [9, 18] },
    { id: "k4", kind: "static", seconds: 2.8, time: "night", fov: 40, cut: soft ? "flash" : "cut", target: [hc[0], 1.2, hc[2]], azimuth: az + 34, radius: 9, height: 1.6, card: card("full") },
  ];
}

/** The same film recut in another edit style: world, signs, brand and sound stay; the shot list is replanned. */
export function restyle(f, style) {
  if (!STYLES.includes(style)) style = "hype";
  const hero = heroOf(f.world);
  const name = f.signs[0]?.knobs?.text ? title(String(f.signs[0].knobs.text).toLowerCase()) : brandNameOf(f.brief, f.world.theme);
  const roof = f.signs.find((x) => x.asset === "wordmark-type")?.knobs || {};
  return cleanFilm({ ...f, shots: shotsFor(style, f.world, hero, name, { ...f.brand, board: roof.background, boardInk: roof.ink }), edit: { style } });
}

/** Validates a film: real assets, resolved knobs, finite numbers, shots inside limits. Never trusts the model. */
export function cleanFilm(f) {
  const plan = withIds(world.cleanPlan(f.world));
  const ids = new Set(plan.placements.map((p) => p.id));
  const brand = completeBrand(f.brand || {});
  const signs = [];
  for (const s of (f.signs || []).slice(0, MAX_SIGNS)) {
    const a = catalog.getAsset(s.asset);
    if (!a || a.format !== "svg" || !SIGN_ASSETS[a.id]) continue;
    const spec = SIGN_ASSETS[a.id];
    const where = s.where === "roof" && spec.roof !== false ? "roof" : "kerb";
    const knobs = resolveKnobs(a.params, s.knobs || {});
    const ratio = a.size[0] / a.size[1];
    const w = clamp(s.w, 0.6, 8) || (where === "roof" ? 5 : 1.3), h = s.h ? clamp(s.h, 0.4, 6) : w / ratio;
    signs.push({ id: s.id || `s${signs.length}`, asset: a.id, title: a.title, author: a.author, price: a.price, placement: ids.has(s.placement) ? s.placement : heroOf(plan).id, where, w, h, knobs });
  }
  const shots = [];
  let total = 0;
  for (const s of (f.shots || []).slice(0, MAX_SHOTS)) {
    if (!SHOT_KINDS.includes(s.kind)) continue;
    const seconds = clamp(s.seconds, 0.8, 10) || 3;
    if (total + seconds > MAX_SECONDS) break;
    total += seconds;
    const v3 = (v, d) => (Array.isArray(v) && v.length === 3 && v.every((n) => Number.isFinite(Number(n))) ? v.map((n) => clamp(n, -200, 400)) : d);
    const pair = (v, lo, hi, d) => (Array.isArray(v) ? [clamp(v[0], lo, hi), clamp(v[1], lo, hi)] : v !== undefined ? [clamp(v, lo, hi), clamp(v, lo, hi)] : d);
    const out = { id: s.id || `k${shots.length}`, kind: s.kind, seconds, time: TIMES.includes(s.time) ? s.time : plan.time, fov: clamp(s.fov ?? 40, 20, 75) };
    if (TIMES.includes(s.timeTo) && s.timeTo !== out.time) out.timeTo = s.timeTo; // the light changes inside the shot
    if (RAMPS.includes(s.ramp)) out.ramp = s.ramp;
    if (shots.length && CUTS.includes(s.cut) && s.cut !== "cut") out.cut = s.cut; // the first shot has nothing to cut from
    if (Number(s.shake) > 0) out.shake = clamp(s.shake, 0, 1);
    if (Array.isArray(s.hits)) { const h = s.hits.filter((x) => x !== null && x !== "" && Number.isFinite(Number(x))).map((x) => clamp(x, 0, seconds)).slice(0, 4); if (h.length) out.hits = h; }
    if (s.title && String(s.title.text || "").trim()) out.title = { text: String(s.title.text).replace(/[^\x20-\x7E]/g, "").trim().slice(0, 18), at: clamp(s.title.at ?? 1, 0.4, Math.max(0.4, seconds - 0.4)) };
    if (s.kind === "dolly") { out.from = v3(s.from, [0, 2, 15]); out.to = v3(s.to, [30, 2, 15]); out.look = v3(s.look, [40, 1.5, 14]); }
    else {
      out.target = v3(s.target, [plan.size[0] / 2, 1.5, plan.size[1] / 2]);
      out.radius = pair(s.radius, 2, 200, [20, 20]);
      out.height = pair(s.height, 0.3, 120, [8, 8]);
      if (s.kind === "orbit") { out.from = clamp(s.from, -720, 720); out.to = clamp(s.to ?? out.from + 30, -720, 720); }
      else out.azimuth = clamp(s.azimuth, -720, 720);
    }
    if (s.card) {
      const a = catalog.getAsset(s.card.asset);
      if (a && a.format === "svg" && SIGN_ASSETS[a.id]?.card) out.card = { asset: a.id, title: a.title, author: a.author, price: a.price, knobs: resolveKnobs(a.params, s.card.knobs || {}), layout: s.card.layout === "lower" ? "lower" : "full", ...(s.card.sub ? { sub: String(s.card.sub).slice(0, 40) } : {}), ...(s.card.name ? { name: String(s.card.name).slice(0, 24) } : {}), scrim: clamp(s.card.scrim ?? (s.card.layout === "lower" ? 0 : 0.5), 0, 0.9), fade: clamp(s.card.fade ?? 0.5, 0, 2) };
    }
    shots.push(out);
  }
  if (!shots.length) shots.push({ id: "k0", kind: "orbit", seconds: 4, time: plan.time, target: [plan.size[0] / 2, 1.5, plan.size[1] / 2], radius: [40, 40], height: [20, 20], from: 140, to: 170 });
  const format = FORMATS[f.format] ? f.format : "16:9";
  const weather = WEATHER.includes(f.weather) ? f.weather : "none";
  const music = f.music === null ? null : { seed: String(f.music?.seed || f.brief || "oasis").slice(0, 400), mood: MOODS[f.music?.mood] ? f.music.mood : "warm" };
  // one title per film: keep the first
  let titled = false;
  for (const s of shots) { if (s.title && titled) delete s.title; if (s.title) titled = true; }
  const edit = { style: STYLES.includes(f.edit?.style) ? f.edit.style : "clean" };
  return { title: String(f.title || plan.title || plan.prompt || "Untitled film").slice(0, 80), brief: String(f.brief || "").slice(0, 400), brand, world: plan, signs, shots, edit, fps: FPS, format, size: FORMATS[format], weather, music, seconds: Math.round(total * 100) / 100 };
}

/** One line per licence the film needs: each kit piece once, each 2D asset once. Free pieces are listed, not charged. */
export function billOf(film) {
  const lines = new Map();
  const add = (a, use, knobs) => {
    if (!a) return;
    if (!lines.has(a.id)) lines.set(a.id, { asset: a.id, title: a.title, author: a.author, price: a.price, kind: a.format === "blocks" ? "3d" : "2d", knobs, placed: 0, use });
    lines.get(a.id).placed++;
  };
  for (const p of film.world.placements) add(catalog.getAsset(p.asset), "set", p.knobs);
  for (const s of film.signs) add(catalog.getAsset(s.asset), "sign", s.knobs);
  for (const s of film.shots) if (s.card) add(catalog.getAsset(s.card.asset), "card", s.card.knobs);
  const list = [...lines.values()];
  return { lines: list, total: Math.round(list.reduce((s, l) => s + l.price, 0) * 100) / 100, creators: [...new Set(list.map((l) => l.author))] };
}
/**
 * Who a film's order pays: each creator's share of their own pieces, and the platform's cut, in cents so the lines sum
 * to the order total exactly. Named by the asset's real author (the agent factory is a creator too, not the platform).
 */
export function payoutsOf(order) {
  const bps = config.split?.platform ?? 1000, by = new Map();
  let platform = 0;
  for (const i of order.items || []) {
    const a = catalog.getAsset(i.assetId), cents = Math.round(i.price * 100), fee = Math.round((cents * bps) / 10000);
    platform += fee;
    const who = a?.author || "unknown";
    by.set(who, (by.get(who) || 0) + cents - fee);
  }
  return { creators: [...by].map(([author, cents]) => ({ author, usd: cents / 100 })), platformUsd: platform / 100, platformPct: bps / 100, totalUsd: (platform + [...by.values()].reduce((a, c) => a + c, 0)) / 100 };
}

/** The licence items an order needs: every paid line, with the first remix's knobs. */
export const billItems = (film) => billOf(film).lines.filter((l) => l.price > 0).map((l) => ({ assetId: l.asset, knobs: l.knobs }));

// ---------- the director: Claude rewrites brand, copy and cut through one typed tool ----------
const DIRECT_TOOL = {
  name: "write_film",
  description: "Rewrite the film for the brief. Keep what already works; change the brand, the sign copy and the shot list so the film tells the brief's story in under 20 seconds.",
  input_schema: {
    type: "object",
    properties: {
      title: { type: "string", description: "2-6 words" },
      brand: { type: "object", properties: { name: { type: "string" }, primary: { type: "string" }, secondary: { type: "string" }, ink: { type: "string" }, background: { type: "string" }, highlight: { type: "string" } }, description: "#RRGGBB colours by role; every sign and card follows them" },
      signs: { type: "array", items: { type: "object", properties: { asset: { type: "string" }, placement: { type: "string" }, where: { type: "string", enum: ["roof", "kerb"] }, w: { type: "number" }, knobs: { type: "object", additionalProperties: true } }, required: ["asset", "placement", "where"] } },
      shots: {
        type: "array",
        description: "In order. orbit: target, radius, height, from/to azimuth degrees. push and crane: target, azimuth, radius [start,end], height [start,end]. dolly: from, to, look (metres). static: target, azimuth, radius, height, optional card.",
        items: { type: "object", properties: {
          kind: { type: "string", enum: SHOT_KINDS }, seconds: { type: "number" }, time: { type: "string", enum: TIMES }, timeTo: { type: "string", enum: TIMES, description: "if set, the light fades from time to timeTo across the shot (dusk to night makes the windows and signs come on)" }, fov: { type: "number", description: "vertical field of view in degrees, 20-75; 50 feels like a wide lens" },
          target: { type: "array", items: { type: "number" } }, azimuth: { type: "number" }, from: {}, to: {}, look: { type: "array", items: { type: "number" } },
          radius: {}, height: {},
          ramp: { type: "string", enum: RAMPS, description: "speed curve of the move: expo (fast-slow-fast, the After Effects ramp), punch (snaps in, then breathes), build (slow, then snaps), quart, smooth, linear" },
          cut: { type: "string", enum: CUTS, description: "transition INTO this shot: whip (the camera spins through the cut with motion blur), zoom (zoom-through), glitch, flash (white hit), cut" },
          shake: { type: "number", description: "0-1 handheld shake for the shot" },
          hits: { type: "array", items: { type: "number" }, description: "seconds into the shot where the camera takes an impact" },
          title: { type: "object", properties: { text: { type: "string" }, at: { type: "number" } }, description: "a 3D extruded title that drops into the street in front of the hero and slams down at `at` seconds. One per film; put it on a push toward the hero's kerb." },
          card: { type: "object", properties: { asset: { type: "string" }, layout: { type: "string", enum: ["full", "lower"], description: "full: centred over a scrim (end card). lower: a lower-third title at the bottom left while the shot plays" }, sub: { type: "string", description: "end card only: one short line under the wordmark, e.g. the place" }, knobs: { type: "object", additionalProperties: true }, scrim: { type: "number" }, fade: { type: "number" } } },
        }, required: ["kind", "seconds"] },
      },
      edit: { type: "object", properties: { style: { type: "string", enum: STYLES } }, description: "the finish: hype (punchy, contrasty, glitch and RGB split on cuts), clean (calm, straight), dream (soft bloom, shallow focus)" },
      weather: { type: "string", enum: WEATHER, description: "what is in the air: blossom petals, snow, rain, autumn leaves, rolling fog, or nothing" },
      music: { type: "object", properties: { mood: { type: "string", enum: Object.keys(MOODS) } }, description: "the generated soundtrack's mood: warm (major pentatonic plucks), bright (quicker, major), cool (slower, minor)" },
      say: { type: "string", description: "One sentence to the person about the film you cut" },
    },
    required: ["shots"],
  },
};

/** Claude directs: given the procedural film and the brief, it returns a revised, validated film (or null). */
export async function direct(film, request) {
  if (!config.anthropicKey) return null;
  const client = new Anthropic({ apiKey: config.anthropicKey });
  const hero = heroOf(film.world);
  const pieces = film.world.placements.filter((p) => !["town-plaza", "town-road"].includes(p.asset)).map((p) => ({ id: p.id, asset: p.asset, cell: [Math.floor(p.at[0] / CELL), Math.floor(p.at[2] / CELL)], rot: p.rot, front_seen_from_azimuth: frontAzimuth(p) }));
  const signAssets = Object.entries(SIGN_ASSETS).map(([id, s]) => { const a = catalog.getAsset(id); return a ? { asset: id, title: a.title, text_knob: s.text, text_knobs: Object.entries(a.params.knobs).filter(([, k]) => k.type === "text").map(([k]) => k), roof: s.roof !== false, card: !!s.card, price: a.price } : null; }).filter(Boolean);
  const [W, D] = film.world.size;
  const msg = await client.messages.create({
    model: config.directorModel || config.agentModel,
    max_tokens: 3000,
    system: `You direct short films shot inside toy-block streets built from parametric 3D pieces, dressed with 2D design assets as signs. The street is alive: the tram runs its rails and parked cars drive by, and weather can fall through the air. The world is ${W} x ${D} m (x across, z deep, y up); the road runs along x at z ${2 * CELL}..${3 * CELL}; buildings face it from rows z ${CELL}..${2 * CELL} and ${3 * CELL}..${4 * CELL}. Cameras: azimuth 0 looks toward -z from +z, 180 looks toward +z. A piece's front is seen from its front_seen_from_azimuth. Keep cameras above y 1.2. A camera at street level must stay inside the road (z between 12.5 and 17.5), so a radius from a building on the far row is at most 9 m; wider views go above the roofs (height 9+). Window lights glow at night; one night shot near the end always lands. End on a static shot with a card that carries the brand name. Total under 18 seconds, 4-6 shots. Cut like an After Effects editor: ramp moves (expo, punch), whip or zoom through cuts, one 3D title that slams in with a hit, a flash into the end card. Match the edit style to the brief. Write sign copy in the brand's voice: short, specific, no slogans with "elevate" or "seamless". If the brief is a parody (a San Francisco founder, a startup that just raised), be funny in the deadpan way the Bay Area talks about itself: posters like "NOW HIRING 10X BARISTAS" or "POST-SEED, PRE-PRODUCT", never mean, never about real people or real companies. Always answer by calling write_film.`,
    tools: [DIRECT_TOOL],
    messages: [{ role: "user", content: `Brief: ${request}\n\nHero piece: ${hero.id} (${hero.asset}) at ${JSON.stringify(hero.at)} rot ${hero.rot}.\nPieces: ${JSON.stringify(pieces)}\nSign assets: ${JSON.stringify(signAssets)}\nTitle mount (where a 3D title lands): ${JSON.stringify(titleMountOf(film.world))}\nCurrent film: ${JSON.stringify({ title: film.title, edit: film.edit, brand: film.brand, signs: film.signs.map((s) => ({ asset: s.asset, placement: s.placement, where: s.where, knobs: s.knobs })), shots: film.shots })}` }],
  });
  const call = msg.content.find((c) => c.type === "tool_use");
  if (!call) return null;
  const e = call.input;
  const brand = e.brand ? completeBrand({ ...film.brand, ...Object.fromEntries(Object.entries(e.brand).filter(([k, v]) => k !== "name" && /^#[0-9a-fA-F]{6}$/.test(String(v)))) }) : film.brand;
  const next = cleanFilm({ ...film, title: e.title || film.title, brand, signs: e.signs || film.signs, shots: e.shots || film.shots, edit: e.edit?.style ? { style: e.edit.style } : film.edit, weather: e.weather || film.weather, music: e.music?.mood ? { ...film.music, mood: e.music.mood } : film.music });
  return { ...next, say: String(e.say || "").slice(0, 200), by: "director" };
}

// ---------- persistence ----------
export async function save(film, extra = {}) {
  const id = film.id || `f${crypto.randomBytes(5).toString("hex")}`;
  const doc = { ...film, ...extra, id, createdAt: film.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() };
  await store.put("films", id, doc);
  return doc;
}
export const get = (id) => store.get("films", id);

/** A film with everything the player needs: the parts of every piece, the mounts of every sign, the bill. */
export async function hydrate(film) {
  const keys = [...new Set(film.world.placements.map((p) => p.asset + "|" + JSON.stringify(p.knobs)))];
  const parts = await Promise.all(keys.map(async (k) => (await catalog.buildAsync(catalog.getAsset(k.slice(0, k.indexOf("|"))), JSON.parse(k.slice(k.indexOf("|") + 1)))).parts));
  const byKey = Object.fromEntries(keys.map((k, i) => [k, i]));
  const signs = await Promise.all(film.signs.map(async (s) => ({ ...s, mount: await mountSign(s, film.world) })));
  return { ...film, parts, titleMount: titleMountOf(film.world), musicUrl: film.music ? `/api/films/${film.id}/music.wav` : null, placements: film.world.placements.map((p) => ({ id: p.id, asset: p.asset, at: p.at, rot: p.rot, part: byKey[p.asset + "|" + JSON.stringify(p.knobs)] })), signs, bill: billOf(film) };
}
