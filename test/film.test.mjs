// Films: the procedural plan is deterministic and valid, cleanFilm never trusts the director, the bill charges
// each program once, signs mount on real pieces, and the HTTP surface serves films and their art.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

process.env.OASIS_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "oasis-film-"));
process.env.ANTHROPIC_API_KEY = "";
const catalog = await import("../server/catalog.js");
const film = await import("../server/film.js");
const { createApp } = await import("../server/app.js");

let server, base;
before(async () => {
  await catalog.load();
  const app = await createApp();
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server?.close());

const BRIEF = 'a 15-second teaser for "Momiji Ramen" on a Kyoto market street at dusk';

test("the same brief plans the same film", async () => {
  const a = await film.planFilm(BRIEF), b = await film.planFilm(BRIEF);
  assert.deepEqual(a.shots, b.shots);
  assert.deepEqual(a.signs, b.signs);
  assert.equal(a.title, "Momiji Ramen: a Kyoto street");
  assert.equal(a.world.time, "dusk");
  assert.ok(a.seconds > 10 && a.seconds <= 30);
  assert.ok(a.shots.some((s) => s.time === "night"), "ends with the windows lit");
  assert.ok(a.shots.at(-1).card, "ends on a card");
  assert.equal(a.shots.at(-1).card.name, "MOMIJI RAMEN", "the end card is the brand's lockup");
  assert.equal(a.shots.at(-1).card.knobs.letters, "MR", "with the brand's monogram");
});

test("brand names come from the brief", () => {
  assert.equal(film.brandNameOf('a teaser for "Momiji Ramen" at dusk', "kyoto"), "Momiji Ramen");
  assert.equal(film.brandNameOf("a launch film for Tidepool Surf, by the sea", "seaside"), "Tidepool Surf");
  assert.equal(film.brandNameOf("a cosy winter street", "winter"), "Northlight");
});

test("cleanFilm rejects what the director must not do", async () => {
  const f = await film.planFilm(BRIEF);
  const dirty = film.cleanFilm({
    ...f,
    signs: [{ asset: "town-shop", placement: "p0", where: "roof" }, { asset: "wordmark-type", placement: "nope", where: "roof", w: 999, knobs: { text: "x".repeat(500) } }],
    shots: [
      { kind: "teleport", seconds: 3 },
      { kind: "orbit", seconds: 99, target: [1e9, -1e9, "a"], radius: -5, height: 1e6, from: 9999 },
      { kind: "static", seconds: 2, time: "noon", card: { asset: "town-shop" } },
      { kind: "dolly", seconds: 2, from: [0, 2, 15], to: [30, 2, 15], look: [40, 1.5, 14], fov: 500 },
    ],
  });
  assert.equal(dirty.signs.length, 1, "a 3D piece is not a sign");
  assert.equal(dirty.signs[0].placement, film.heroOf(f.world).id, "an unknown mount falls back to the hero");
  assert.ok(dirty.signs[0].w <= 8);
  assert.ok(dirty.signs[0].knobs.text.length <= 80);
  assert.deepEqual(dirty.shots.map((s) => s.kind), ["orbit", "static", "dolly"]);
  assert.equal(dirty.shots[0].seconds, 10);
  assert.ok(dirty.shots[0].radius[0] >= 2 && dirty.shots[0].height[0] <= 120);
  assert.equal(dirty.shots[1].time, f.world.time, "a bad time of day falls back to the world's");
  assert.equal(dirty.shots[1].card, undefined, "a 3D piece is not a card");
  assert.equal(dirty.shots[2].fov, 75);
});

test("the bill charges each program once and lists every creator", async () => {
  const f = await film.planFilm(BRIEF);
  const bill = film.billOf(f);
  const ids = bill.lines.map((l) => l.asset);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(bill.lines.some((l) => l.asset === "wordmark-type" && l.kind === "2d"));
  assert.ok(bill.lines.some((l) => l.asset === "town-shop" && l.kind === "3d" && l.placed > 1));
  assert.equal(bill.total, Math.round(bill.lines.reduce((s, l) => s + l.price, 0) * 100) / 100);
  assert.ok(bill.creators.includes("oasis-factory") && bill.creators.includes("mika-blocks"));
  assert.ok(film.billItems(f).every((i) => catalog.getAsset(i.assetId).price > 0));
});

test("signs mount on the roof ridge or at the kerb of a real piece", async () => {
  const f = await film.planFilm(BRIEF);
  const h = await film.hydrate(f);
  const roof = h.signs.find((s) => s.where === "roof"), kerb = h.signs.find((s) => s.where === "kerb");
  assert.ok(roof.mount.at[1] > 3, "a roof sign sits above the building");
  assert.equal(kerb.mount.at[1], 0);
  assert.ok(kerb.mount.post > 0);
  assert.equal(h.parts.length, new Set(f.world.placements.map((p) => p.asset + JSON.stringify(p.knobs))).size);
  assert.ok(h.placements.every((p) => h.parts[p.part]));
});

test("HTTP: a film is created, served with its bill, and its art is watermarked until licensed", async () => {
  const r = await fetch(`${base}/api/films`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ brief: BRIEF, direct: false }) });
  assert.equal(r.status, 200);
  const f = await r.json();
  assert.match(f.id, /^f[0-9a-f]{10}$/);
  assert.equal(f.licensed, false);
  assert.ok(f.bill.total > 0);
  assert.equal(typeof f.renderer, "boolean");
  const g = await (await fetch(`${base}/api/films/${f.id}`)).json();
  assert.equal(g.title, f.title);
  const png = await fetch(`${base}/api/films/${f.id}/art/${f.signs[0].id}.png?w=256`);
  assert.equal(png.headers.get("content-type"), "image/png");
  assert.ok((await png.arrayBuffer()).byteLength > 1000);
  const card = await fetch(`${base}/api/films/${f.id}/art/card-${f.shots.at(-1).id}.png?w=256`);
  assert.equal(card.status, 200);
  assert.equal((await fetch(`${base}/api/films/${f.id}/art/nope.png`)).status, 404);
  assert.equal((await fetch(`${base}/api/films/${f.id}/film.mp4`)).status, 404, "not rendered yet");
  assert.equal((await fetch(`${base}/api/films/nope`)).status, 404);
  const empty = await fetch(`${base}/api/films`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
  assert.equal(empty.status, 400);
});

test("HTTP: licensing a film needs a funded mandate", async () => {
  const f = await (await fetch(`${base}/api/films`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ brief: BRIEF, direct: false }) })).json();
  const r = await fetch(`${base}/api/films/${f.id}/license`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mandate: "mdt_nope" }) });
  assert.equal(r.status, 403);
  const g = await (await fetch(`${base}/api/films/${f.id}`)).json();
  assert.equal(g.licensed, false, "nothing changed");
});

test("llms.txt and MCP list the film tools", async () => {
  const txt = await (await fetch(`${base}/llms.txt`)).text();
  assert.match(txt, /make_film \{brief, mandate\?/);
  const r = await fetch(`${base}/mcp`, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }) });
  const j = await r.json();
  const names = j.result.tools.map((t) => t.name);
  assert.ok(names.includes("make_film") && names.includes("get_film"));
});

test("the soundtrack is a program: same seed, same bytes, a real WAV", async () => {
  const music = await import("../server/film-music.js");
  const a = music.toWav(music.compose({ seed: "momiji", mood: "warm", seconds: 3 }));
  const b = music.toWav(music.compose({ seed: "momiji", mood: "warm", seconds: 3 }));
  assert.ok(a.equals(b));
  assert.equal(a.toString("ascii", 0, 4), "RIFF");
  assert.equal(a.readUInt32LE(24), 44100);
  assert.equal(a.readUInt16LE(22), 2, "stereo");
  assert.ok(a.length > 44100 * 4 * 3, "longer than the film, for the tail");
  assert.ok(!music.toWav(music.compose({ seed: "tidepool", mood: "cool", seconds: 3 })).equals(a));
  let peak = 0;
  for (let i = 44; i < a.length; i += 2) peak = Math.max(peak, Math.abs(a.readInt16LE(i)));
  assert.ok(peak > 3000 && peak <= 32767, `audible and unclipped (peak ${peak})`);
});

test("weather, music, light ramps, lower-thirds and formats survive cleanFilm; junk does not", async () => {
  const f = await film.planFilm(BRIEF);
  assert.equal(f.weather, "leaves", "momiji is maple: a Momiji brief gets falling leaves, not blossom");
  assert.equal(f.music.mood, "warm");
  assert.equal(f.format, "16:9");
  const crane = f.shots.find((s) => s.kind === "crane");
  assert.equal(crane.time, "dusk"); assert.equal(crane.timeTo, "night");
  assert.equal(f.shots.find((s) => s.kind === "dolly").card.layout, "lower");
  const c = film.cleanFilm({ ...f, weather: "lava", music: { mood: "angry" }, format: "4:3", shots: [{ kind: "static", seconds: 2, time: "day", timeTo: "day", target: [0, 1, 0], azimuth: 0, radius: 10, height: 5, card: { asset: "wordmark-type", layout: "sideways" } }] });
  assert.equal(c.weather, "none");
  assert.equal(c.music.mood, "warm");
  assert.equal(c.format, "16:9");
  assert.equal(c.shots[0].timeTo, undefined, "a ramp to the same time is no ramp");
  assert.equal(c.shots[0].card.layout, "full");
  const tall = film.cleanFilm({ ...f, format: "9:16" });
  assert.deepEqual(tall.size, [1080, 1920]);
  assert.equal(film.cleanFilm({ ...f, music: null }).music, null);
});

test("HTTP: music.wav streams and a format change keeps the cut and resets the render", async () => {
  const f = await (await fetch(`${base}/api/films`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ brief: BRIEF, direct: false }) })).json();
  const wav = await fetch(`${base}/api/films/${f.id}/music.wav`);
  assert.equal(wav.headers.get("content-type"), "audio/wav");
  assert.ok((await wav.arrayBuffer()).byteLength > 44100 * 4 * f.seconds);
  const sq = await (await fetch(`${base}/api/films/${f.id}/format`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ format: "1:1" }) })).json();
  assert.deepEqual(sq.size, [1080, 1080]);
  assert.deepEqual(sq.shots.map((s) => s.id), f.shots.map((s) => s.id));
  assert.equal(sq.render.status, "idle");
});

test("the edit: styles, ramps, cuts, one title, and junk dropped", async () => {
  const f = await film.planFilm(BRIEF);
  assert.equal(f.edit.style, "hype", "a teaser is cut as a hype edit");
  assert.ok(f.shots.slice(1).some((s) => s.cut === "whip") && f.shots.some((s) => s.ramp === "expo" || s.ramp === "punch"));
  assert.equal(f.shots.filter((s) => s.title).length, 1, "one 3D title per film");
  assert.equal(f.shots[0].cut, undefined, "the first shot has nothing to cut from");
  const calm = await film.planFilm('a calm dreamy film for "Tidepool" by the sea');
  assert.equal(calm.edit.style, "dream");
  const r = film.restyle(f, "clean");
  assert.equal(r.edit.style, "clean");
  assert.deepEqual(r.world, f.world, "a restyle keeps the street");
  const c = film.cleanFilm({ ...f, edit: { style: "chaos" }, shots: [
    { kind: "orbit", seconds: 3, cut: "whip", ramp: "bounce", shake: 9, title: { text: "A" } },
    { kind: "static", seconds: 3, cut: "teleport", hits: [99, "x"], title: { text: "SECOND" } },
  ] });
  assert.equal(c.edit.style, "clean");
  assert.equal(c.shots[0].cut, undefined); assert.equal(c.shots[0].ramp, undefined); assert.equal(c.shots[0].shake, 1);
  assert.equal(c.shots[1].cut, undefined, "unknown cuts are dropped");
  assert.deepEqual(c.shots[1].hits, [3], "hits are clamped into the shot");
  assert.equal(c.shots[1].title, undefined, "only the first title survives");
  const mount = film.titleMountOf(f.world);
  assert.ok(mount.at[0] > 0 && mount.at[0] < f.world.size[0], "the title lands inside the street");
});
