import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { inspect, renderSource } from "../server/sandbox.js";
import { resolveKnobs, brandKnobs, completeBrand } from "../server/knobs.js";
import * as catalog from "../server/catalog.js";
import { royaltySplit } from "../server/commerce.js";

await catalog.load();

test("every catalogue asset loads and renders at defaults", () => {
  for (const a of catalog.allAssets()) assert.match(catalog.render(a, {}).svg, /^<svg/, a.id);
});

test("knob values are clamped, snapped and validated against the schema", () => {
  const params = { knobs: { n: { type: "range", default: 5, min: 1, max: 10, step: 1 }, c: { type: "color", default: "#000000" }, ch: { type: "choice", default: "a", options: ["a", "b"] }, t: { type: "toggle", default: false } } };
  assert.deepEqual(resolveKnobs(params, { n: 99.4, c: "red", ch: "z", t: "true" }), { n: 10, c: "#000000", ch: "a", t: true });
  assert.equal(resolveKnobs(params, { n: 3.6 }).n, 4);
});

test("brand mode maps roles and follows the brand's darkness", () => {
  const params = { knobs: { bg: { type: "color", role: "background", default: "#FFFFFF" }, cta: { type: "color", role: "primary", default: "#000000" }, theme: { type: "choice", default: "light", options: ["light", "dark"] } } };
  assert.deepEqual(brandKnobs(params, { background: "#0D0F14", primary: "#B4FF39" }), { bg: "#0D0F14", cta: "#B4FF39", theme: "dark" });
  assert.ok(completeBrand({}).surface);
});

test("royalties: every cent is accounted for along a fork chain", () => {
  const a = catalog.getAsset("lantern-fortune-tier-5b119cb5");
  for (const price of [1, 7.99, 8, 12.34]) {
    const total = royaltySplit(a, price).reduce((s, x) => s + x.cents, 0);
    assert.equal(total, Math.round(price * 100), `price ${price}`);
  }
});

const escape = (body) => `export const params = { knobs: {} }; export default function render() { ${body} }`;
test("sandbox: no Node, no network, no file system", () => {
  for (const body of ["return require('fs')", "return process.env", "return fetch('http://x')", "return globalThis.Deno"]) {
    assert.throws(() => renderSource(escape(body), {}), undefined, body);
  }
});

test("sandbox: infinite loops and memory bombs are stopped", () => {
  assert.throws(() => renderSource(escape("while (true) {}"), {}), /interrupted|render failed/);
  assert.throws(() => renderSource(escape("const a = []; while (true) a.push('x'.repeat(1e6));"), {}));
});

test("sandbox: output must be SVG", () => {
  assert.throws(() => renderSource(escape("return 'hello'"), {}), /svg/);
});

test("paid previews are watermarked, so paid source never reaches the browser", () => {
  const a = catalog.allAssets().find((x) => x.price > 0);
  const { svg } = catalog.render(a, {});
  assert.match(catalog.watermark(svg, catalog.sizeOf(svg, a.size)), /oasis · preview/);
  assert.equal(catalog.summary(a, { withKnobs: true }).source, undefined);
});

test("pool: an allocation bomb is killed by the wall-clock deadline", async () => {
  const { renderInPool } = await import("../server/pool.js");
  const t = Date.now();
  await assert.rejects(renderInPool(escape("const a = []; while (true) a.push('x'.repeat(1e6));"), {}));
  assert.ok(Date.now() - t < 4000, `took ${Date.now() - t} ms`);
  assert.match(await renderInPool(escape("return '<svg/>'"), {}), /^<svg/);
});
