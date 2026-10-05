// Sound programs: the sandbox, determinism, the watermark, the HTTP renders, the CDN gate, and a kit order through
// PayPal Checkout against the fake PayPal client.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

process.env.OASIS_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "oasis-sound-"));
process.env.PAYPAL_CLIENT_ID = "test";
process.env.PAYPAL_CLIENT_SECRET = "test";
process.env.ANTHROPIC_API_KEY = ""; // the kit planner falls back to keywords: the order path never needs a model
const { renderSound, inspect } = await import("../server/sandbox.js");
const sound = await import("../server/sound.js");
const catalog = await import("../server/catalog.js");
const commerce = await import("../server/commerce.js");
const kits = await import("../server/kits.js");
const store = await import("../server/store.js");
const { createApp } = await import("../server/app.js");
const { measure } = await import("../factory/harness-sound.mjs");

let server, base;
before(async () => {
  const app = await createApp();
  await new Promise((r) => { server = app.listen(0, r); });
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

const footstep = () => catalog.getAsset("footstep");

test("a sound program renders deterministically: same knobs, same bytes; another seed, another take", () => {
  const a = footstep();
  const x = catalog.sound(a, { surface: "gravel", seed: 5 }).samples, y = catalog.sound(a, { surface: "gravel", seed: 5 }).samples, z = catalog.sound(a, { surface: "gravel", seed: 6 }).samples;
  assert.equal(Buffer.compare(Buffer.from(x.buffer), Buffer.from(y.buffer)), 0);
  assert.notEqual(Buffer.compare(Buffer.from(x.buffer), Buffer.from(z.buffer)), 0);
  assert.ok(x.length > 22050 * 0.3 && x.length < 22050 * 1);
  const an = sound.analyse(x, 22050);
  assert.ok(an.peak > 0.3 && an.peak <= 1 && an.clipped === 0 && an.centroid > 100, JSON.stringify(an));
});

test("sandbox: sound programs cannot use Math.random, import modules, run too long or return junk", () => {
  assert.throws(() => renderSound("export const meta={format:'sound'}; export const params={knobs:{}}; export function build(p,c){ return { samples: Float32Array.from({length:10},()=>Math.random()) } }", {}), /Math.random/);
  assert.throws(() => renderSound("import fs from 'node:fs'; export const meta={}; export const params={knobs:{}}; export function build(){ return {samples:new Float32Array(10)} }", {}), /not allowed/);
  assert.throws(() => renderSound("export const meta={}; export const params={knobs:{}}; export function build(p,c){ return { samples: new Float32Array(c.sr * 9) } }", {}), /longer than/);
  assert.throws(() => renderSound("export const meta={}; export const params={knobs:{}}; export function build(p,c){ const s=new Float32Array(10); s[3]=NaN; return {samples:s} }", {}), /finite/);
  assert.throws(() => renderSound("export const meta={}; export const params={knobs:{}}; export function build(){ while(true){} }", {}), /interrupted|failed/);
});

test("every sound in the catalogue passes the harness: knobs matter, seeds differ, no clipping, no silence", () => {
  const sounds = catalog.allAssets().filter((a) => a.format === "sound");
  assert.ok(sounds.length >= 5);
  for (const a of sounds.slice(0, 8)) { const rep = measure(a.source); assert.deepEqual(rep.errors, [], `${a.id}: ${rep.errors.join(" | ")}`); }
});

test("the preview watermark changes a paid render and leaves a licensed one alone", async () => {
  const a = footstep();
  const clean = catalog.sound(a, {}).samples, wm = sound.watermark(clean, 22050);
  assert.notEqual(Buffer.compare(Buffer.from(clean.buffer), Buffer.from(wm.buffer)), 0);
  const r = await fetch(`${base}/api/assets/footstep/render.wav`);
  assert.equal(r.headers.get("content-type"), "audio/wav");
  assert.equal(r.headers.get("x-oasis-watermarked"), "1");
  const wav = Buffer.from(await r.arrayBuffer());
  assert.equal(wav.subarray(0, 4).toString(), "RIFF");
  assert.equal(wav.readUInt32LE(24), 22050);
  assert.equal(wav.length, 44 + clean.length * 2);
  assert.equal((await fetch(`${base}/api/assets/footstep/download.wav`)).status, 402);
});

test("sound pictures and numbers come from the same render: card, waveform, spectrogram, sound.json", async () => {
  for (const f of ["render.png", "waveform.png", "spectrogram.png"]) {
    const r = await fetch(`${base}/api/assets/footstep/${f}?p=${encodeURIComponent(JSON.stringify({ surface: "snow" }))}`);
    assert.equal(r.status, 200, f);
    assert.equal(r.headers.get("content-type"), "image/png");
    assert.equal(Buffer.from(await r.arrayBuffer()).subarray(1, 4).toString(), "PNG");
  }
  const j = await (await fetch(`${base}/api/assets/footstep/sound.json?p=${encodeURIComponent(JSON.stringify({ surface: "snow", seed: 9 }))}`)).json();
  assert.equal(j.values.surface, "snow"); assert.equal(j.values.seed, 9);
  assert.ok(j.wave.length === 240 && j.spec.length > 10 && j.peak > 0.3 && j.watermarked === true);
  const walk = await fetch(`${base}/api/sounds/footstep/walk?json=1`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ count: 12, knobs: { surface: "wood" } }) });
  const w = await walk.json();
  assert.equal(w.takes.length, 12);
  assert.equal(new Set(w.takes.map((t) => t.seed)).size, 12, "every take is a different seed");
});

test("the CDN serves sounds like 3D pieces: 402 with x402 to agents, a placeholder tick to browsers, the program with a licence", async () => {
  const r = await fetch(`${base}/cdn/footstep.mjs`);
  assert.equal(r.status, 402);
  const pr = JSON.parse(Buffer.from(r.headers.get("payment-required"), "base64").toString());
  assert.equal(pr.accepts[0].network, "paypal:sandbox");
  assert.equal(pr.accepts[0].amount, "300");
  const stub = await (await fetch(`${base}/cdn/footstep.mjs`, { headers: { "Sec-Fetch-Dest": "script" } })).text();
  assert.match(stub, /NOT LICENSED/);
  assert.doesNotMatch(stub, /c\.burst/, "the program never ships unlicensed");
  const free = await (await fetch(`${base}/cdn/sound-runtime.mjs`)).text();
  assert.match(free, /export function renderProgram/);
});

test("a kit: a vibe becomes 6-10 tuned sounds, one PayPal order licenses them all, and every part turns clean", async () => {
  const fake = { calls: [], async createOrder(lines, opts) { this.calls.push(lines); return { id: "KITORDER1", status: "CREATED", links: [{ rel: "payer-action", href: "https://sandbox.paypal.com/checkoutnow?token=x" }] }; },
    async captureOrder(id) { const o = await store.get("orders", id); return { id, status: "COMPLETED", payer: { email_address: "buyer@example.com" }, purchase_units: [{ payments: { captures: [{ id: `CAP-${id}`, status: "COMPLETED", amount: { currency_code: "USD", value: o.total.toFixed(2) } }] } }] }; } };
  commerce.setPaypalClient(fake);
  try {
    const k = await (await fetch(`${base}/api/kits`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ vibe: "rainy street footsteps and soft ui clicks" }) })).json();
    assert.ok(k.items.length >= 5 && k.items.length <= 10, `${k.items.length} parts`);
    assert.equal(k.planner, "keywords");
    assert.ok(k.items.some((i) => i.assetId === "footstep") && k.items.some((i) => i.assetId === "ui-click"));
    assert.ok(k.items.every((i) => i.licence === null || i.price === 0));
    assert.equal(k.total, Math.round(k.items.reduce((s, i) => s + i.price, 0) * 100) / 100);
    const co = await (await fetch(`${base}/api/kits/${k.id}/checkout`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })).json();
    assert.equal(co.total_usd, k.total);
    assert.equal(fake.calls[0].length, k.items.filter((i) => i.price > 0).length, "one PayPal line per paid part");
    // the person approves in PayPal; the return page captures; the kit page claims with its token
    const bad = await fetch(`${base}/api/kits/${k.id}/claim`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ order_id: co.order_id, claim_token: "nope" }) });
    assert.equal(bad.status, 404, "the order id alone unlocks nothing");
    const paid = await (await fetch(`${base}/api/kits/${k.id}/claim`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ order_id: co.order_id, claim_token: co.claim_token }) })).json();
    assert.equal(paid.licensed, true);
    assert.equal(paid.licence.orderId, "KITORDER1");
    assert.ok(paid.licence.creators.length >= 2, "several creators earned on one order");
    for (const i of paid.items) { assert.ok(i.module && i.wav, i.assetId); if (i.price > 0) assert.ok(i.licence); }
    const part = paid.items.find((i) => i.price > 0);
    const clean = await fetch(`${base}/api/licenses/${part.licence}/render.wav?p=${encodeURIComponent(JSON.stringify({ seed: 77 }))}`);
    assert.equal(clean.headers.get("x-oasis-watermarked"), "0", "a licensed render at new knobs is clean");
    const mod = await (await fetch(part.module.replace(/^https?:\/\/[^/]+/, base))).text();
    assert.match(mod, /export function createSound/);
    assert.match(mod, /export function build/);
  } finally { commerce.setPaypalClient(null); }
});
