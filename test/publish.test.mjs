// The creator side: publishing a sound program (the dry-run check, the write, the refusals) and the creator page API.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

process.env.OASIS_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "oasis-publish-"));
process.env.OASIS_RELOAD_SECONDS = "0";
const catalog = await import("../server/catalog.js");
const store = await import("../server/store.js");
const { createApp } = await import("../server/app.js");

let server, base;
before(async () => {
  const app = await createApp();
  await new Promise((r) => { server = app.listen(0, r); });
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

const post = async (p, body) => { const r = await fetch(`${base}${p}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); return { status: r.status, json: await r.json() }; };
const template = () => fetch(`${base}/api/publish/template`).then((r) => r.text());

test("the template is a working program: the check loads it, measures every knob and renders the pictures", async () => {
  const src = await template();
  assert.match(src, /export function build/);
  const { status, json: c } = await post("/api/publish/check", { source: src });
  assert.equal(status, 200);
  assert.equal(c.ok, true, c.report.errors.join(" | "));
  assert.deepEqual(c.report.errors, []);
  assert.equal(c.report.deadKnobs.length, 0);
  assert.ok(c.report.renders >= 10 && c.report.slowestMs < 2500);
  assert.ok(c.report.seedSimilarity < 0.995, "seeds differ");
  assert.equal(c.report.knobEffects.length, 4, "one row per knob apart from seed");
  assert.ok(c.report.knobEffects.every((k) => !k.dead && k.alt && k.distance > 0));
  assert.ok(c.analysis.wave.length === 320 && c.analysis.spec.length > 2 && c.analysis.peak > 0.5);
  assert.equal(c.meta.title, "Soft Click");
  assert.equal(c.values.material, "plastic");
});

test("a good program publishes under the creator's name and is in the catalogue, the CDN and the store", async () => {
  const src = await template();
  const { status, json: a } = await post("/api/publish", { source: src, title: "Desk Tap", kind: "ui", tags: "tap, desk, Click, tap", description: "A small tap for a desk app.", price: 2.5, author: "Tapper", payoutEmail: "tapper@creators.oasis.example" });
  assert.equal(status, 201, JSON.stringify(a));
  assert.equal(a.author, "tapper");
  assert.equal(a.title, "Desk Tap");
  assert.equal(a.price, 2.5);
  assert.deepEqual(a.tags, ["tap", "desk", "click"]);
  assert.equal(a.format, "sound");
  assert.equal(a.knobCount, 5);
  assert.match(a.id, /^desk-tap-[0-9a-f]{8}$/);
  const rec = catalog.getAsset(a.id);
  assert.equal(rec.payoutEmail, "tapper@creators.oasis.example");
  assert.match(rec.source, /author: "tapper", payout: "tapper@creators.oasis.example"/);
  assert.match(rec.source, /price: 2.5/);
  // in the store, so it survives a restart and a reload
  assert.equal((await store.get("published", a.id)).author, "tapper");
  await catalog.load();
  assert.ok(catalog.getAsset(a.id), "reloaded from the store");
  // a paid sound: watermarked preview, 402 on the CDN, found by search
  const wav = await fetch(`${base}/api/assets/${a.id}/render.wav`);
  assert.equal(wav.headers.get("x-oasis-watermarked"), "1");
  assert.equal((await fetch(`${base}/cdn/${a.id}.mjs`)).status, 402);
  const found = await (await fetch(`${base}/api/assets?q=desk+tap`)).json();
  assert.ok(found.some((x) => x.id === a.id));
  // a free one needs no email, and the source ships with the catalogue record
  const free = await post("/api/publish", { source: src, title: "Free Tap", kind: "ui", price: 0, author: "tapper" });
  assert.equal(free.status, 201);
  assert.equal(free.json.price, 0);
  assert.equal((await fetch(`${base}/cdn/${free.json.id}.mjs`)).status, 200);
});

test("a program that fails the harness is rejected with the reason, and nothing is written", async () => {
  // the template with the brightness knob disconnected: the harness hears no change at either extreme
  const dead = (await template()).replace(/\+ 6000 \* p\.brightness/, "").replace(/0\.6 \* p\.brightness/, "0.6 * 0.5").replace(/10000 \* p\.brightness/, "5000");
  const c = await post("/api/publish/check", { source: dead });
  assert.equal(c.status, 200);
  assert.equal(c.json.ok, false);
  assert.ok(c.json.report.errors.some((e) => /no audible effect: brightness/.test(e)), c.json.report.errors.join(" | "));
  assert.ok(c.json.report.knobEffects.find((k) => k.knob === "brightness").dead);
  const before = (await store.list("published")).length;
  const r = await post("/api/publish", { source: dead, title: "Dead Knob", kind: "ui", price: 0, author: "tapper" });
  assert.equal(r.status, 422);
  assert.equal(r.json.code, "EHARNESS");
  assert.match(r.json.error, /The harness rejected it: .*no audible effect: brightness/);
  assert.ok(Array.isArray(r.json.errors) && r.json.errors.length >= 1);
  assert.equal((await store.list("published")).length, before);
  // a program that clips and never fades is refused too
  const loud = (await template()).replace("c.fade(c.finish(out, 0.85), 2, sr);", "for (let i = 0; i < out.length; i++) out[i] = out[i] > 0 ? 1 : -1;");
  const l = await post("/api/publish/check", { source: loud });
  assert.equal(l.json.ok, false);
  assert.ok(l.json.report.errors.some((e) => /clipped samples/.test(e)));
});

test("Math.random, imports, broken modules and bad listings are refused with a coded message", async () => {
  const src = await template();
  const rnd = await post("/api/publish/check", { source: src.replace("r() * 0.06", "Math.random() * 0.06") });
  assert.equal(rnd.status, 400);
  assert.equal(rnd.json.code, "ERANDOM");
  assert.match(rnd.json.error, /Math\.random is not allowed/);
  const rndPub = await post("/api/publish", { source: src.replace("r()", "Math.random()"), title: "Rnd", kind: "ui", price: 0, author: "tapper" });
  assert.equal(rndPub.status, 400);
  assert.equal(rndPub.json.code, "ERANDOM");
  const imp = await post("/api/publish/check", { source: `import fs from "node:fs";\n${src}` });
  assert.equal(imp.json.code, "EIMPORT");
  const broken = await post("/api/publish/check", { source: "export const meta = {" });
  assert.equal(broken.status, 400);
  assert.equal(broken.json.code, "ELOAD");
  assert.equal((await post("/api/publish/check", { source: "" })).json.code, "EEMPTY");
  // the listing
  assert.equal((await post("/api/publish", { source: src, title: "X", kind: "ui", price: 0, author: "tapper" })).json.code, "ETITLE");
  assert.equal((await post("/api/publish", { source: src, title: "Fine Title", kind: "song", price: 0, author: "tapper" })).json.code, "EKIND");
  assert.equal((await post("/api/publish", { source: src, title: "Fine Title", kind: "ui", price: 99, author: "tapper" })).json.code, "EPRICE");
  assert.equal((await post("/api/publish", { source: src, title: "Fine Title", kind: "ui", price: 3, author: "tapper" })).json.code, "EEMAIL");
  assert.equal((await post("/api/publish", { source: src, title: "Fine Title", kind: "ui", price: 0, author: "oasis" })).json.code, "ENAME");
  assert.equal((await post("/api/publish", { source: src, title: "Fine Title", kind: "ui", price: 0, author: "a" })).json.code, "ENAME");
  // a name that already pays out elsewhere cannot be taken with another email
  const taken = await post("/api/publish", { source: src, title: "Fine Title", kind: "ui", price: 1, author: "tapper", payoutEmail: "someone-else@example.com" });
  assert.equal(taken.status, 409);
  assert.equal(taken.json.code, "ENAMETAKEN");
});

test("the creator page API: sounds, what the ledger paid them, the orders behind it, forks and royalties, the masked email", async () => {
  const mine = catalog.allAssets().find((a) => a.author === "tapper" && a.price > 0);
  // a fork of their program by someone else, and ledger rows the way commerce.fulfil writes them
  await catalog.addFork({ id: "desk-tap-remix-00000001", source: mine.source.replace('author: "tapper"', 'author: "remixer"'), forkedFrom: mine.id, lineage: [mine.id], author: "remixer", payoutEmail: "remixer@example.com", price: 4, createdAt: new Date().toISOString() });
  const at = new Date().toISOString();
  await store.put("orders", "ORDER-A", { id: "ORDER-A", status: "COMPLETED", agentName: "scene-builder", total: 2.5, createdAt: at, items: [{ assetId: mine.id, title: mine.title, price: 2.5 }], payoutHold: { status: "HELD", releaseAfter: at } });
  await store.put("ledger", "ORDER-A-0", { orderId: "ORDER-A", assetId: mine.id, title: mine.title, author: "tapper", email: "tapper@creators.oasis.example", cents: 225, role: "creator", at });
  await store.put("ledger", "ORDER-A-1", { orderId: "ORDER-A", assetId: mine.id, title: mine.title, author: "oasis", email: null, cents: 25, role: "platform", at });
  await store.put("orders", "ORDER-B", { id: "ORDER-B", status: "COMPLETED", agentName: null, total: 4, createdAt: at, items: [{ assetId: "desk-tap-remix-00000001", title: "Remix", price: 4 }] });
  await store.put("ledger", "ORDER-B-0", { orderId: "ORDER-B", assetId: "desk-tap-remix-00000001", title: "Remix", author: "remixer", email: "remixer@example.com", cents: 240, role: "creator", at });
  await store.put("ledger", "ORDER-B-1", { orderId: "ORDER-B", assetId: "desk-tap-remix-00000001", title: "Remix", author: "tapper", email: "tapper@creators.oasis.example", cents: 120, role: "parent", at });
  await store.put("ledger", "ORDER-B-2", { orderId: "ORDER-B", assetId: "desk-tap-remix-00000001", title: "Remix", author: "oasis", email: null, cents: 40, role: "platform", at });
  const r = await fetch(`${base}/api/creators/Tapper`);
  assert.equal(r.status, 200);
  const c = await r.json();
  assert.equal(c.name, "tapper");
  assert.equal(c.sounds.length, 2);
  assert.ok(c.sounds.every((s) => s.author === "tapper" && !("source" in s && s.price > 0)), "paid sources never leak");
  assert.equal(c.earned.cents, 345);
  assert.equal(c.earned.direct, 225);
  assert.equal(c.earned.royalties, 120);
  assert.equal(c.earned.orders, 2);
  assert.equal(c.orders.length, 2);
  const a = c.orders.find((o) => o.orderId === "ORDER-A");
  assert.equal(a.agent, "scene-builder"); assert.equal(a.cents, 225); assert.equal(a.payout, "HELD");
  assert.equal(c.forks.length, 1);
  assert.equal(c.forks[0].id, "desk-tap-remix-00000001");
  assert.equal(c.forks[0].royaltyCents, 120);
  assert.equal(c.payoutEmail, "t••••r@creators.oasis.example");
  assert.equal(c.hasPayout, true);
  // a factory creator has sounds and no earnings; an unknown name is a 404
  const f = await (await fetch(`${base}/api/creators/foleyroom`)).json();
  assert.ok(f.sounds.length >= 1 && f.earned.cents === 0);
  assert.equal((await fetch(`${base}/api/creators/nobody-here`)).status, 404);
});
