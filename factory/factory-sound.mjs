// The Oasis sound factory: Claude writes a parametric sound program from a one-line brief inside a kit (a set of
// sounds that share a room, a material language and a creator, the way Polyfork's 3D kits share a palette), the
// sandbox proves it renders, the harness measures it across its knobs and seeds, Claude reviews its own renders
// once, and an independent grader decides. Survivors are published to sounds/ with the kit's creator as author.
// Lessons the grader writes go into factory/lessons-sound.md and every later build reads them.
//
//   node factory/factory-sound.mjs plan                 writes factory/briefs-sound.json from KITS (one call per kit)
//   node factory/factory-sound.mjs run <lanes> [kit]    builds every brief not yet published or rejected
import fs from "node:fs";
import path from "node:path";
import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import { inspect, renderSound, SOUND_SR } from "../server/sandbox.js";
import { resolveKnobs } from "../server/knobs.js";
import { analyse } from "../public/sound-dsp.js";
import { cardPng } from "../server/sound.js";
import { measure } from "./harness-sound.mjs";
import { gradeSound } from "./grader-sound.mjs";

const client = new Anthropic();
const MODEL = process.env.FACTORY_MODEL || "claude-opus-5-5";
const ROOT = path.resolve(import.meta.dirname, "..");
const CONTRACT = fs.readFileSync(path.join(ROOT, "factory/CONTRACT-SOUND.md"), "utf8");
const EXAMPLES = ["footstep.mjs", "ui-click.mjs", "rain-ambience.mjs"].map((f) => `--- sounds/${f} ---\n${fs.readFileSync(path.join(ROOT, "sounds", f), "utf8")}`).join("\n\n");
const LESSONS_FILE = path.join(ROOT, "factory/lessons-sound.md");
const STATS_FILE = path.join(ROOT, "factory/stats.jsonl");
const BRIEFS_FILE = path.join(ROOT, "factory/briefs-sound.json");
const OUT_DIR = path.join(ROOT, "sounds");
const REJECT_DIR = path.join(ROOT, "factory/rejected-sound");

// Creators: sandbox PayPal payees, one voice each. A kit has a house creator; ambiences, UI and music go to the
// specialists so every kit's bill lists several creators.
export const CREATORS = {
  foleyroom: { payout: "foleyroom@creators.oasis.example", voice: "props, doors, footsteps, cloth, hands: physical foley" },
  quietmachine: { payout: "quietmachine@creators.oasis.example", voice: "interfaces, consoles, synthetic beeps, arcade and sci-fi" },
  stormfront: { payout: "stormfront@creators.oasis.example", voice: "weather, rooms and outdoor beds: ambiences and loops" },
  kickdrum: { payout: "kickdrum@creators.oasis.example", voice: "drums, hits, stingers and musical one-shots" },
  hollowbody: { payout: "hollowbody@creators.oasis.example", voice: "wood, metal, glass and stone impacts and resonances" },
};
export const KITS = [
  { id: "rainy-city-street", title: "Rainy City Street", author: "foleyroom", room: "a wet downtown street at night: rain on everything, traffic hiss, neon buzz, puddles, umbrellas, the occasional distant siren" },
  { id: "wooden-tavern", title: "Wooden Tavern", author: "hollowbody", room: "a low-ceilinged wooden tavern: mugs, benches, a fire, coins, barrels, boots on boards, a creaking door" },
  { id: "sci-fi-console", title: "Sci-fi Console", author: "quietmachine", room: "a starship bridge: console beeps, confirms and denies, holograms, servo doors, scanner sweeps, alarms, a reactor hum" },
  { id: "forest-at-night", title: "Forest at Night", author: "stormfront", room: "a temperate forest after dark: crickets, an owl, wind in leaves, twigs snapping, a stream, distant thunder" },
  { id: "kitchen", title: "Kitchen", author: "foleyroom", room: "a home kitchen: knives on boards, pans, a kettle, a fridge door, sizzle, taps, cutlery, a microwave" },
  { id: "retro-arcade", title: "Retro Arcade", author: "quietmachine", room: "an 8-bit arcade cabinet: coins, jumps, lasers, power-ups, explosions, game over, 1-up, a looping chiptune bass" },
  { id: "office", title: "Office", author: "foleyroom", room: "an open-plan office: keyboards, mouse clicks, a printer, phones, an air conditioner bed, chairs, paper" },
  { id: "car-interior", title: "Car Interior", author: "hollowbody", room: "inside a modern car: indicator ticks, door thunks, seatbelt, engine start and idle, wipers, road noise, a chime" },
  { id: "medieval-market", title: "Medieval Market", author: "hollowbody", room: "a busy medieval market: a blacksmith's anvil, cart wheels on cobbles, cloth, coins, a bell, crowd walla, animals" },
  { id: "drum-machine", title: "Drum Machine", author: "kickdrum", room: "an analogue drum machine: kick, snare, rimshot, closed and open hats, clap, toms, cowbell, a tuned perc one-shot" },
  { id: "ocean-harbour", title: "Ocean Harbour", author: "stormfront", room: "a small harbour: waves on stone, gulls, rope creak, a bell buoy, a boat engine, a foghorn, wind over water" },
  { id: "horror-house", title: "Horror House", author: "hollowbody", room: "an abandoned house: floorboard creaks, a low drone, whispers of wind, a dripping tap, a slamming shutter, a stinger" },
];
const authorFor = (kit, kind) => (kind === "ambience" ? "stormfront" : kind === "ui" ? "quietmachine" : kind === "music-loop" ? "kickdrum" : kit.author);

const lessons = () => (fs.existsSync(LESSONS_FILE) ? fs.readFileSync(LESSONS_FILE, "utf8").trim().split("\n").filter(Boolean).slice(-40) : []);
const SYSTEM_BASE = `You are a senior sound designer and creative coder writing sound programs for Oasis, a registry where sounds are small programs with typed knobs that game and film teams render at the call site instead of downloading files.

${CONTRACT}

Three published examples follow. Match their contract exactly; exceed their craft.

${EXAMPLES}

Return ONLY the module source in one \`\`\`js fenced block. No commentary outside the block.`;
const SYSTEM = () => { const l = lessons(); return l.length ? `${SYSTEM_BASE}\n\nLessons from earlier builds (each cost a rejection once; do not repeat them):\n${l.join("\n")}` : SYSTEM_BASE; };

const extractCode = (text) => { const m = text.match(/```(?:js|javascript)?\n([\s\S]*?)```/); return (m ? m[1] : text).trim() + "\n"; };

async function ask(messages, { system = SYSTEM(), max_tokens = 16000, effort = process.env.FACTORY_EFFORT || "medium" } = {}) {
  let msg;
  for (let attempt = 0; ; attempt++) {
    try {
      msg = await client.messages.stream({ model: MODEL, max_tokens, output_config: { effort }, system, messages }).finalMessage();
      break;
    } catch (e) {
      if (attempt >= 4 || (e.status && e.status < 500 && e.status !== 429)) throw e;
      await new Promise((r) => setTimeout(r, 5000 * 2 ** attempt));
    }
  }
  if (msg.stop_reason === "refusal") throw new Error("refused");
  return msg.content.filter((b) => b.type === "text").map((b) => b.text).join("");
}

/** Renders the shots a reviewer needs: defaults, each choice's alternatives, every range at min and max, two seeds. */
function shots(src) {
  const { meta, params } = inspect(src);
  const list = [["Defaults", {}]];
  for (const [k, v] of Object.entries(params.knobs || {}).filter(([, v]) => v.type === "choice").slice(0, 2)) for (const o of v.options.filter((o) => o !== v.default).slice(0, 2)) list.push([`${k} = ${o}`, { [k]: o }]);
  const lo = {}, hi = {};
  for (const [k, v] of Object.entries(params.knobs || {})) if (v.type === "range" && k !== "seed") { lo[k] = v.min; hi[k] = v.max; }
  list.push(["Every range at its minimum", lo], ["Every range at its maximum", hi]);
  for (const [k, v] of Object.entries(params.knobs || {}).filter(([, v]) => v.type === "toggle").slice(0, 1)) list.push([`${k} = ${!v.default}`, { [k]: !v.default }]);
  if (params.knobs?.seed) list.push(["Seed 2", { seed: params.knobs.seed.min + 1 }], ["Seed 3", { seed: params.knobs.seed.min + 2 }]);
  const pngs = [], numbers = [];
  for (const [, input] of list) {
    const s = renderSound(src, resolveKnobs(params, input), { sr: SOUND_SR });
    const a = analyse(s, SOUND_SR, { cols: 320 });
    pngs.push(cardPng(a, 448));
    numbers.push(`${a.seconds.toFixed(2)} s, peak ${a.peak}, rms ${a.rms}, centroid ${a.centroid} Hz, silence ${Math.round(a.silence * 100)}%`);
  }
  return { meta, params, pngs, labels: list.map(([l]) => l), numbers };
}

/** Pins the meta fields the brief decides (kit, creator, payout, price) so a model can't drift them. */
function pinMeta(src, b) {
  const kit = KITS.find((k) => k.id === b.kit);
  const author = authorFor(kit, inspect(src).meta.kind || b.kind);
  let out = src.replace(/author:\s*"[^"]*"/, `author: "${author}"`).replace(/payout:\s*"[^"]*",?\s*/, "").replace(/kit:\s*"[^"]*",?\s*/, "");
  out = out.replace(/author:\s*"[^"]*"/, `author: "${author}", payout: "${CREATORS[author].payout}", kit: "${kit.title}"`);
  if (b.price !== undefined) out = out.replace(/price:\s*[\d.]+/, `price: ${b.price}`);
  return out;
}

export async function makeSound(b, { log = console.log } = {}) {
  const started = Date.now();
  const kit = KITS.find((k) => k.id === b.kit);
  const messages = [{ role: "user", content: `Kit: ${kit.title} (${kit.room}).\nCreator voice: ${CREATORS[authorFor(kit, b.kind)].voice}.\nSound kind: ${b.kind}.\nBrief: ${b.brief}\nAsset id (file name): ${b.slug}\nPrice: ${b.price}\nSet meta.kit to "${kit.title}".` }];
  const stat = { slug: b.slug, kit: b.kit, brief: b.brief, at: new Date().toISOString(), attempts: 0, harness: [], grades: [], verdict: null, format: "sound" };
  let src = extractCode(await ask(messages)); stat.attempts++;
  let rendered;
  for (let attempt = 0; attempt < 3; attempt++) {
    try { rendered = shots(src); break; }
    catch (e) {
      log(`  [${b.slug}] sandbox rejected attempt ${attempt + 1}: ${e.message}`);
      messages.push({ role: "assistant", content: "```js\n" + src + "```" }, { role: "user", content: `The sandbox rejected it: ${e.message}\nFix it and return the full module.` });
      src = extractCode(await ask(messages)); stat.attempts++;
    }
  }
  if (!rendered) { stat.verdict = "rejected:sandbox"; return finish(stat, src, started, b); }
  // Self-review: the builder sees its own renders as pictures with the numbers.
  messages.push(
    { role: "assistant", content: "```js\n" + src + "```" },
    { role: "user", content: [
      ...rendered.pngs.flatMap((png, i) => [{ type: "text", text: `${rendered.labels[i]}: ${rendered.numbers[i]}` }, { type: "image", source: { type: "base64", media_type: "image/png", data: png.toString("base64") } }]),
      { type: "text", text: "These are your renders (waveform over spectrogram, low frequencies at the bottom). Critique them as a sound supervisor would: does the envelope and spectrum match the thing described, are the extremes still that sound, do the seeds differ, is anything silent, clipped or too long? Then return the improved full module. If it is already excellent, return it unchanged." },
    ] },
  );
  try { const revised = extractCode(await ask(messages)); stat.attempts++; shots(revised); src = revised; } catch (e) { log(`  [${b.slug}] revision failed (${e.message}); keeping first version`); }
  for (let fix = 0; fix < 3; fix++) {
    const rep = measure(src);
    stat.harness.push({ errors: rep.errors, warnings: rep.warnings, renders: rep.renders, worstMs: rep.slowestMs, seedSimilarity: rep.seedSimilarity, defaults: rep.defaults });
    if (!rep.errors.length) break;
    if (fix === 2) { stat.verdict = "rejected:harness"; break; }
    log(`  [${b.slug}] harness: ${rep.errors.join(" | ")}`);
    messages.push({ role: "assistant", content: "```js\n" + src + "```" }, { role: "user", content: `An automated harness measured your program and found: ${rep.errors.join("; ")}. Fix these and return the full module.` });
    try { const next = extractCode(await ask(messages)); stat.attempts++; shots(next); src = next; } catch (e) { log(`  [${b.slug}] harness fix failed: ${e.message}`); }
  }
  if (!stat.verdict) {
    src = pinMeta(src, b);
    for (let round = 0; round < 3 && !stat.verdict; round++) {
      const sh = shots(src);
      const g = await gradeSound({ brief: b.brief, title: sh.meta.title, pngs: sh.pngs, labels: sh.labels, numbers: sh.numbers });
      stat.grades.push(g);
      if (g.lesson) fs.appendFileSync(LESSONS_FILE, `- ${g.lesson.replace(/\s+/g, " ").trim()}\n`);
      if (g.verdict === "publish") { stat.verdict = "published"; break; }
      if (round === 2) { stat.verdict = "rejected:grader"; break; }
      log(`  [${b.slug}] grader rejected: ${(g.flaws || []).join(" | ")}`);
      messages.push({ role: "assistant", content: "```js\n" + src + "```" }, { role: "user", content: `An independent reviewer rejected it: ${(g.flaws || []).join("; ")}. Scores: ${JSON.stringify(g.scores)}. Address every flaw and return the full module.` });
      try { const next = pinMeta(extractCode(await ask(messages)), b); stat.attempts++; if (!measure(next).errors.length) src = next; } catch (e) { log(`  [${b.slug}] regrade fix failed: ${e.message}`); }
    }
  }
  return finish(stat, src, started, b);
}

function finish(stat, src, started, b) {
  stat.seconds = Math.round((Date.now() - started) / 1000);
  fs.appendFileSync(STATS_FILE, JSON.stringify(stat) + "\n");
  const dest = stat.verdict === "published" ? OUT_DIR : REJECT_DIR;
  fs.mkdirSync(dest, { recursive: true });
  fs.writeFileSync(path.join(dest, `${b.slug}.mjs`), src);
  let meta = {}; try { meta = inspect(src).meta; } catch {}
  return { slug: b.slug, verdict: stat.verdict, meta, seconds: stat.seconds };
}

// ---------- planning: one call per kit writes its parts list ----------
async function plan() {
  const all = fs.existsSync(BRIEFS_FILE) ? JSON.parse(fs.readFileSync(BRIEFS_FILE, "utf8")) : [];
  for (const kit of KITS) {
    if (all.some((b) => b.kit === kit.id)) { console.log(`${kit.id}: planned`); continue; }
    const text = await ask([{ role: "user", content: `Plan the parts of a sound kit for Oasis called "${kit.title}": ${kit.room}.\nList 26 to 30 distinct sounds a game or film team would need for this place, each as a one-line brief for a parametric program with 4-7 knobs (name the knobs in the brief: a material or size choice, two or three 0..1 amounts, maybe a rate or pitch, a tail toggle). Mix kinds: mostly "sfx" and "foley" one-shots, 3-4 "ambience" beds (2-4 s, loopable), 2-3 "ui" sounds if the place has any interface, 2-4 "impact" hits, and 1-2 "music-loop" one-shots or short loops where it fits. Prices 1-5 USD, ambiences 3-5.\nReturn JSON only: an array of {"slug":"kebab-case-unique","kind":"sfx|ambience|ui|impact|foley|music-loop","brief":"...","price":n}. Slugs must start with "${kit.id.split("-")[0]}-".` }],
      { system: "You plan sound libraries. Return JSON only.", max_tokens: 8000, effort: "medium" });
    const parts = JSON.parse(text.match(/\[[\s\S]*\]/)[0]).map((p) => ({ ...p, kit: kit.id, slug: String(p.slug).toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 40) }));
    all.push(...parts);
    fs.writeFileSync(BRIEFS_FILE, JSON.stringify(all, null, 1));
    console.log(`${kit.id}: ${parts.length} parts planned`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const cmd = process.argv[2] || "run";
  if (cmd === "plan") await plan();
  else {
    const lanes = Number(process.argv[3] || 4), only = process.argv[4] || "";
    const briefs = JSON.parse(fs.readFileSync(BRIEFS_FILE, "utf8")).filter((b) => !only || b.kit.includes(only));
    const seen = new Set();
    const queue = briefs.filter((b) => !seen.has(b.slug) && seen.add(b.slug) && !fs.existsSync(path.join(OUT_DIR, `${b.slug}.mjs`)) && !fs.existsSync(path.join(REJECT_DIR, `${b.slug}.mjs`)));
    console.log(`${queue.length} briefs to build on ${lanes} lanes`);
    let done = 0;
    async function lane() {
      while (queue.length) {
        const b = queue.shift();
        try {
          const r = await makeSound(b);
          console.log(`${r.verdict === "published" ? "ok  " : "REJ "} ${b.kit}/${b.slug} ${r.verdict} (${r.seconds}s) [${++done}/${briefs.length}]`);
        } catch (e) {
          console.log(`FAIL ${b.slug}: ${e.message}`);
          fs.appendFileSync(STATS_FILE, JSON.stringify({ slug: b.slug, kit: b.kit, at: new Date().toISOString(), verdict: "failed", error: e.message, format: "sound" }) + "\n");
        }
      }
    }
    await Promise.all(Array.from({ length: lanes }, lane));
  }
}
