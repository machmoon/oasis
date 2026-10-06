// Creators publish their own sound programs, and have a page that shows what they earned.
//
// The publish flow is shaped after npm's: `npm publish` packs the tarball with dryRun, prints its contents (logTar)
// so the author sees exactly what will ship, re-reads the manifest, and only then PUTs to the registry
// (npm/cli lib/commands/publish.js, `pack(spec, { dryRun: true })` → `logTar(pkgContents)` → `libpub(manifest, …)`);
// libnpmpublish refuses early with a coded error for a private manifest (lib/publish.js, EPRIVATE). Here `check()`
// is the dry run: the sandbox loads the module, the factory's harness measures it across its knob space, the
// defaults are rendered for the pictures, and the page shows all of it before anything is written. `publish()`
// re-runs the same check on the source it is handed (npm re-reads the manifest for the same reason) and writes the
// program into the catalogue. The contract itself is served as text, the way polyfork.dev serves /prompt.txt.
import fs from "node:fs";
import { SOUND_SR } from "./sandbox.js";
import { harnessInPool, soundInPool, inspectInPool } from "./pool.js";
import { resolveKnobs } from "./knobs.js";
import { analyse } from "../public/sound-dsp.js";
import * as catalog from "./catalog.js";
import * as store from "./store.js";

export const TEMPLATE = fs.readFileSync(new URL("../seed/templates/soft-click.mjs", import.meta.url), "utf8");
export const CONTRACT = fs.readFileSync(new URL("../factory/CONTRACT-SOUND.md", import.meta.url), "utf8");
export const MAX_PRICE = 50;
const RESERVED = new Set(["oasis", "oasis-factory", "anonymous", "you"]);
const fail = (message, status = 400, extra = {}) => Object.assign(new Error(message), { status, ...extra });
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** The dry run: loads, measures and renders a program; never writes. Resolves even when the harness fails. */
export async function check(source) {
  source = String(source ?? "");
  if (!source.trim()) throw fail("Paste or upload a sound program first.", 400, { code: "EEMPTY" });
  if (source.length > 64_000) throw fail("The program is over 64 KB. The contract asks for about 120 lines.", 400, { code: "ESIZE" });
  // Refused before a render, the way libnpmpublish refuses a private manifest: the sandbox would throw on the first
  // call anyway, but the reason should be the first thing a creator reads.
  if (/Math\s*\.\s*random/.test(source)) throw fail("Math.random is not allowed: derive every variation from the seed knob through ctx.rng, so the same knobs give the same samples in the sandbox, in a browser Worker and in a licensed import.", 400, { code: "ERANDOM" });
  if (/^\s*import\s/m.test(source)) throw fail("A sound program imports nothing: build(p, ctx) receives the whole DSP kit as ctx.", 400, { code: "EIMPORT" });
  let meta, params;
  try { ({ meta, params } = await inspectInPool(source)); } catch (e) { throw fail(`The sandbox could not load the module: ${e.message}`, 400, { code: "ELOAD" }); }
  const report = await harnessInPool(source);
  const values = resolveKnobs(params, {});
  let analysis = null;
  if (report.defaults) {
    try { const s = await soundInPool(source, values, SOUND_SR); analysis = analyse(s, SOUND_SR, { cols: 320 }); } catch {}
  }
  return {
    ok: report.errors.length === 0,
    meta: { title: meta.title || "", kind: meta.kind || "", description: meta.description || "", tags: Array.isArray(meta.tags) ? meta.tags.slice(0, 8).map(String) : [], price: Number(meta.price) || 0, duration: Number(meta.duration) || null, author: meta.author || "" },
    params,
    values,
    report,
    analysis,
  };
}

const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 28) || "sound";

/** Validates the listing fields, re-runs the check, pins the meta the listing decides, and writes the program. */
export async function publish({ source, title, kind, tags, price, author, payoutEmail, description } = {}) {
  const name = String(author || "").trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9._-]{1,39}$/.test(name)) throw fail("Creator name: 2 to 40 characters, letters, digits, dots and dashes. It becomes your page at /#/creator/<name>.", 400, { code: "ENAME" });
  if (RESERVED.has(name)) throw fail(`"${name}" is reserved. Pick a creator name of your own.`, 400, { code: "ENAME" });
  const usd = Math.round(Number(price) * 100) / 100;
  if (!Number.isFinite(usd) || usd < 0 || usd > MAX_PRICE) throw fail(`Price: $0 (free) to $${MAX_PRICE}.`, 400, { code: "EPRICE" });
  const email = typeof payoutEmail === "string" && payoutEmail.trim() ? payoutEmail.trim() : null;
  if (email && !EMAIL.test(email)) throw fail("The PayPal payout email is not an email address.", 400, { code: "EEMAIL" });
  if (usd > 0 && !email) throw fail("A priced sound needs a PayPal email: that is where every sale's share is paid.", 400, { code: "EEMAIL" });
  // Without accounts, the name plus the payout email is the identity: nobody can list under a name that already
  // pays out somewhere else (npm's "cannot publish over" check, for a registry whose versions are creators).
  const other = catalog.allAssets().find((a) => a.author === name && a.payoutEmail && email && a.payoutEmail !== email);
  if (other) throw fail(`${name} already publishes on Oasis with a different PayPal email. Use that email, or pick another name.`, 409, { code: "ENAMETAKEN" });
  const t = String(title || "").trim();
  if (t.length < 2 || t.length > 60) throw fail("Title: 2 to 60 characters.", 400, { code: "ETITLE" });
  if (!catalog.SOUND_KINDS.includes(kind)) throw fail(`Kind must be one of ${catalog.SOUND_KINDS.join(", ")}.`, 400, { code: "EKIND" });
  const tagList = [...new Set((Array.isArray(tags) ? tags : String(tags || "").split(/[,\s]+/)).map((x) => String(x).toLowerCase().trim().replace(/[^a-z0-9-]/g, "")).filter(Boolean))].slice(0, 8);
  const desc = String(description || "").trim().slice(0, 240);

  const c = await check(source);
  if (!c.ok) throw fail(`The harness rejected it: ${c.report.errors[0]}`, 422, { code: "EHARNESS", errors: c.report.errors, warnings: c.report.warnings });

  // Pin the meta fields the listing decides, as the factory does (factory-sound.mjs pinMeta), so the module that
  // ships from /cdn says the same as the catalogue. Fields the module lacks are carried by the catalogue record.
  let src = String(source).replace(/author:\s*"[^"]*"/, `author: "${name}"`).replace(/payout:\s*"[^"]*",?\s*/, "").replace(/price:\s*[\d.]+/, `price: ${usd}`);
  src = src.replace(/title:\s*"[^"]*"/, `title: ${JSON.stringify(t)}`).replace(/kind:\s*"[^"]*"/, `kind: "${kind}"`);
  if (email) src = src.replace(/author:\s*"[^"]*"/, `author: "${name}", payout: ${JSON.stringify(email)}`);

  const doc = {
    id: catalog.newId(slug(t)),
    source: src,
    title: t, kind, tags: tagList, description: desc || c.meta.description,
    price: usd, author: name, payoutEmail: email,
    published: true, forkedFrom: null, lineage: [],
    createdAt: new Date().toISOString(),
    harness: { renders: c.report.renders, slowestMs: c.report.slowestMs, seedSimilarity: c.report.seedSimilarity, defaults: c.report.defaults, warnings: c.report.warnings },
  };
  return catalog.addPublished(doc);
}

const mask = (email) => { if (!email) return null; const [l, d] = email.split("@"); return `${l[0]}${"•".repeat(Math.max(2, Math.min(6, l.length - 2)))}${l.length > 1 ? l.at(-1) : ""}@${d}`; };
const sum = (rows) => rows.reduce((s, r) => s + r.cents, 0);

/** A creator as their page shows them: sounds, what the ledger paid them, the orders behind it, forks and royalties. */
export async function creator(name) {
  const sounds = catalog.allAssets().filter((a) => a.author === name && a.format === "sound").sort((a, b) => a.title.localeCompare(b.title));
  const rows = (await store.list("ledger")).filter((r) => r.author === name && r.role !== "platform");
  if (!sounds.length && !rows.length) throw fail(`No creator called ${name}`, 404);
  const ids = new Set(sounds.map((a) => a.id));
  const forks = catalog.allAssets().filter((a) => a.author !== name && (a.lineage || []).some((id) => ids.has(id)));
  const direct = rows.filter((r) => r.role === "creator"), royalty = rows.filter((r) => r.role !== "creator");
  const byOrder = {};
  for (const r of rows) {
    const o = (byOrder[r.orderId] ||= { orderId: r.orderId, at: r.at, cents: 0, items: [] });
    o.cents += r.cents;
    o.items.push({ assetId: r.assetId, title: r.title, cents: r.cents, role: r.role, held: !!r.held });
  }
  const orders = Object.values(byOrder).sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 40);
  for (const o of orders) {
    const od = await store.get("orders", o.orderId);
    if (!od) continue;
    o.agent = od.agentName || null; o.total = od.total; o.status = od.status; o.payoutAfter = od.payoutHold?.releaseAfter || null; o.payout = od.payoutHold?.status || null;
  }
  const hold = {};
  for (const id of Object.keys(byOrder)) hold[id] = (await store.get("orders", id))?.payoutHold?.status || null;
  const email = sounds.find((a) => a.payoutEmail)?.payoutEmail || rows.find((r) => r.email)?.email || null;
  const since = sounds.map((a) => a.createdAt).filter(Boolean).sort()[0] || null;
  return {
    name,
    payoutEmail: mask(email),
    hasPayout: !!email,
    since,
    sounds: sounds.map((a) => catalog.summary(a)),
    forks: forks.map((f) => ({ ...catalog.summary(f), royaltyCents: sum(royalty.filter((r) => r.assetId === f.id)) })),
    // held: waiting on a PayPal email, or on the order's refund window (payoutHold HELD); paidOut: the order's batch was SENT
    earned: { cents: sum(rows), direct: sum(direct), royalties: sum(royalty), held: sum(rows.filter((r) => r.held || (r.email && hold[r.orderId] === "HELD"))), paidOut: sum(rows.filter((r) => r.email && hold[r.orderId] === "SENT")), orders: Object.keys(byOrder).length },
    orders,
  };
}
