import express from "express";
import { rateLimit } from "express-rate-limit";
import fs from "node:fs";
import crypto from "node:crypto";
import { config, paypalConfigured } from "./config.js";
import * as catalog from "./catalog.js";
import * as commerce from "./commerce.js";
import * as store from "./store.js";
import { FORMATS } from "./exports.js";
import { forkAsset } from "./fork.js";
import { runAgent } from "./agent.js";
import { handleMcp } from "./mcp.js";
import * as tools from "./tools.js";
import * as world from "./world.js";
import { toGlb } from "./glb.js";
import * as mandates from "./mandates.js";
import { llmsTxt } from "./llms.js";

export async function createApp() {
  await catalog.load();
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1); // Render terminates TLS in front of us; rate limits key on the client's IP.
  app.use(express.json({ limit: "1mb" }));

  const wrap = (fn) => (req, res) =>
    Promise.resolve(fn(req, res)).catch((e) => {
      if (!e.status || e.status >= 500) console.error(req.method, req.path, e);
      if (!res.headersSent) res.status(e.status || 500).json({ error: e.message });
    });
  const parseKnobs = (req) => {
    try {
      const p = req.query.p ? JSON.parse(String(req.query.p)) : {};
      if (req.query.brand) p.brand = JSON.parse(String(req.query.brand));
      return req.query.preset ? { ...p, preset: String(req.query.preset) } : p;
    } catch {
      throw Object.assign(new Error("p must be URL-encoded JSON"), { status: 400 });
    }
  };
  const mustAsset = (id) => {
    const a = catalog.getAsset(id);
    if (!a) throw Object.assign(new Error(`No asset ${id}`), { status: 404 });
    return a;
  };

  app.get("/api/config", (req, res) =>
    res.json({ prerendered: fs.existsSync(new URL("../public/prerender/", import.meta.url).pathname), paypalClientId: config.paypal.clientId || null, paypalReady: paypalConfigured(), agentReady: !!config.anthropicKey, ...catalog.stats() }),
  );

  app.get("/api/assets", wrap((req, res) => {
    const list = catalog.search({ query: req.query.q || "", kind: req.query.kind || undefined, freeOnly: req.query.free === "1", limit: 500 });
    res.json(list.map((a) => catalog.summary(a)));
  }));

  app.get("/api/assets/:id", wrap((req, res) => {
    const a = mustAsset(req.params.id);
    res.json({ ...catalog.summary(a, { withKnobs: true }), parent: a.forkedFrom ? catalog.summary(catalog.getAsset(a.forkedFrom) || { ...a, params: {} }) : null, children: catalog.allAssets().filter((x) => x.forkedFrom === a.id).map((x) => catalog.summary(x)) });
  }));

  app.get("/api/assets/:id/render.svg", wrap(async (req, res) => {
    const a = mustAsset(req.params.id);
    const { svg } = await catalog.renderAsync(a, parseKnobs(req));
    const out = a.price > 0 ? catalog.watermark(svg, catalog.sizeOf(svg, a.size)) : svg;
    res.set("Content-Type", "image/svg+xml").set("Cache-Control", "no-cache").send(out);
  }));

  // Worlds: a prompt becomes a placed layout of kit pieces; the browser builds it in 3D.
  const worldLimit = rateLimit({ windowMs: 60_000, limit: 20, standardHeaders: "draft-8", legacyHeaders: false });
  app.post("/api/world/plan", worldLimit, wrap(async (req, res) => {
    const prompt = String(req.body?.prompt || "a cosy little town").slice(0, 300);
    let plan = world.planWorld(prompt, { seed: Number(req.body?.seed) || undefined });
    if (req.body?.agent) {
      try { plan = (await world.agentEdit(`Make this world fit: "${prompt}". Name it, recolour it, and add or swap pieces so it tells the story of the place.`, plan)) || plan; } catch (e) { console.warn("agent plan", e.message); }
    }
    plan = world.cleanPlan(plan);
    const bill = world.billOf(plan);
    res.json({ ...plan, bill, total: world.worldTotal(bill) });
  }));
  // Talk to the world: "make it night", "add a tram", "paint the shops mint". Claude edits the current plan.
  app.post("/api/world/edit", worldLimit, wrap(async (req, res) => {
    const request = String(req.body?.request || "").slice(0, 400);
    const current = req.body?.plan;
    if (!request || !current?.placements) throw Object.assign(new Error("request and plan are required"), { status: 400 });
    const base = world.cleanPlan({ ...current, placements: current.placements.slice(0, 200) });
    let plan = await world.agentEdit(request, base);
    if (!plan) throw Object.assign(new Error("The world agent isn't available on this server."), { status: 503 });
    plan = world.cleanPlan(plan);
    const bill = world.billOf(plan);
    res.json({ ...plan, bill, total: world.worldTotal(bill) });
  }));

  // Saved worlds: a link anyone can open; the whole-world GLB unlocks with a completed order for that world.
  app.post("/api/worlds", worldLimit, wrap(async (req, res) => {
    const plan = world.cleanPlan({ ...(req.body?.plan || {}), placements: (req.body?.plan?.placements || []).slice(0, 200) });
    if (!plan.placements.length) throw Object.assign(new Error("Empty world"), { status: 400 });
    const id = `w${crypto.randomBytes(5).toString("hex")}`;
    const doc = { id, title: String(plan.title || plan.prompt || "Untitled world").slice(0, 80), prompt: String(plan.prompt || "").slice(0, 300), time: plan.time, size: plan.size, placements: plan.placements, createdAt: new Date().toISOString() };
    await store.put("worlds", id, doc);
    res.json({ id });
  }));
  app.get("/api/worlds/:id", wrap(async (req, res) => {
    const w = await store.get("worlds", req.params.id);
    if (!w) throw Object.assign(new Error("Unknown world"), { status: 404 });
    const bill = world.billOf(w);
    res.json({ ...w, bill, total: world.worldTotal(bill) });
  }));
  app.get("/api/worlds/:id/world.glb", wrap(async (req, res) => {
    const w = await store.get("worlds", req.params.id);
    if (!w) throw Object.assign(new Error("Unknown world"), { status: 404 });
    const paid = w.placements.some((p) => p.price > 0);
    if (paid) {
      const o = await store.get("orders", String(req.query.order || ""));
      if (!o || o.worldId !== w.id || o.status !== "COMPLETED" || !commerce.ownsOrder(o, String(req.query.claim || ""))) throw Object.assign(new Error("Buy this world to download it"), { status: 402 });
    }
    const items = await Promise.all(w.placements.map(async (p) => ({ parts: (await catalog.buildAsync(catalog.getAsset(p.asset), p.knobs)).parts, at: p.at, rot: p.rot })));
    res.set("Content-Type", "model/gltf-binary").set("Content-Disposition", `attachment; filename="${w.id}.glb"`).send(await toGlb(items, { name: w.title }));
  }));

  app.post("/api/world/parts", worldLimit, wrap(async (req, res) => {
    const items = (req.body?.items || []).slice(0, 80);
    const out = await Promise.all(items.map(async ({ asset, knobs }) => {
      const a = mustAsset(asset);
      if (a.format !== "blocks") throw Object.assign(new Error(`${asset} is not a 3D block asset`), { status: 400 });
      return (await catalog.buildAsync(a, knobs || {})).parts;
    }));
    res.json({ parts: out });
  }));

  // Block assets: the parts list the browser turns into a live 3D model (public/world3d.js).
  app.get("/api/assets/:id/parts.json", wrap(async (req, res) => {
    const a = mustAsset(req.params.id);
    if (a.format !== "blocks") throw Object.assign(new Error("Not a 3D block asset"), { status: 404 });
    const { parts, values } = await catalog.buildAsync(a, parseKnobs(req));
    res.set("Cache-Control", "no-cache").json({ id: a.id, values, parts });
  }));

  app.get("/api/assets/:id/download.:fmt", wrap(async (req, res) => {
    const a = mustAsset(req.params.id);
    if (a.price > 0) throw Object.assign(new Error("This asset needs a licence: check out with PayPal first."), { status: 402 });
    await sendFormat(res, a, parseKnobs(req), req.params.fmt);
  }));

  async function sendFormat(res, a, knobs, fmt) {
    if (fmt === "glb") {
      if (a.format !== "blocks") throw Object.assign(new Error("GLB is available for 3D block assets"), { status: 400 });
      const { parts } = await catalog.buildAsync(a, knobs);
      const glb = await toGlb([{ parts }], { name: a.id });
      return res.set("Content-Type", "model/gltf-binary").set("Content-Disposition", `attachment; filename="${a.id}.glb"`).send(glb);
    }
    const f = FORMATS[fmt];
    if (!f) throw Object.assign(new Error(`Unknown format ${fmt}`), { status: 400 });
    const { svg, values } = await catalog.renderAsync(a, knobs);
    res.set("Content-Type", f.type).set("Content-Disposition", `attachment; filename="${a.id}.${f.ext}"`).send(f.make(svg, a, values));
  }

  app.post("/api/assets/:id/fork", wrap(async (req, res) => {
    const { instruction, author, payoutEmail, price } = req.body || {};
    const email = typeof payoutEmail === "string" && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(payoutEmail) ? payoutEmail : null;
    const fork = await forkAsset({ assetId: req.params.id, instruction, author: String(author || "anonymous").slice(0, 40), payoutEmail: email, price });
    res.json(catalog.summary(fork));
  }));

  app.post("/api/orders", wrap(async (req, res) => {
    const worldId = /^w[0-9a-f]{10}$/.test(req.body?.worldId || "") ? req.body.worldId : null;
    const o = await commerce.createCheckout(req.body?.items || [], { worldId });
    res.json({ id: o.id, total: o.total, items: o.items, claimToken: o.claimToken });
  }));
  const claimOf = (req) => req.get("X-Oasis-Claim") || "";
  // Humans issue spending mandates to their agents; the token is shown once, the balance lives here.
  const mandateLimit = rateLimit({ windowMs: 60_000, limit: 10, standardHeaders: "draft-8", legacyHeaders: false });
  app.post("/api/mandates", mandateLimit, wrap(async (req, res) => {
    const { description, max_total_usd, expires_in_hours, skus } = req.body || {};
    res.json(await mandates.issue({ description, maxTotalUsd: max_total_usd, expiresInHours: expires_in_hours, skus }));
  }));
  app.post("/api/mandates/revoke", mandateLimit, wrap(async (req, res) => res.json(await mandates.revoke(String(req.body?.token || "")))));
  app.get("/api/mandates/:id", wrap(async (req, res) => {
    const m = await mandates.get(req.params.id);
    if (!m) throw Object.assign(new Error("Unknown mandate"), { status: 404 });
    res.json(m);
  }));
  // Anyone may trigger a capture (PayPal only captures approved orders), but only the owner sees the licences.
  app.post("/api/orders/:id/capture", wrap(async (req, res) => res.json(commerce.publicOrder(await commerce.capture(req.params.id), claimOf(req)))));
  app.get("/api/orders/:id", wrap(async (req, res) => {
    const o = await store.get("orders", req.params.id);
    if (!o) throw Object.assign(new Error("Unknown order"), { status: 404 });
    res.json(commerce.publicOrder(o, claimOf(req)));
  }));

  app.post("/api/orders/:id/refund", wrap(async (req, res) => {
    const o = await store.get("orders", req.params.id);
    if (!commerce.ownsOrder(o, claimOf(req))) throw Object.assign(new Error("Only the buyer can refund this order"), { status: 403 });
    res.json(commerce.publicOrder(await commerce.refund(req.params.id, req.body || {}), claimOf(req)));
  }));

  // PayPal webhooks, verified with verify-webhook-signature before anything is trusted.
  const webhookLimit = rateLimit({ windowMs: 60_000, limit: 60, standardHeaders: "draft-8", legacyHeaders: false });
  app.post("/api/paypal/webhook", webhookLimit, wrap(async (req, res) => {
    const { verifyWebhook } = await import("./paypal.js");
    const ev = req.body || {};
    const logEvent = (verified, result) => store.put("webhooks", `${Date.now()}-${crypto.randomBytes(3).toString("hex")}`, {
      at: new Date().toISOString(), eventId: String(ev.id || "").slice(0, 60), type: String(ev.event_type || "").slice(0, 60),
      resourceId: String(ev.resource?.id || ev.resource?.payout_item_id || "").slice(0, 60), verified, result,
    }).catch(() => {});
    if (!(await verifyWebhook(req.headers, req.body))) {
      await logEvent(false, "rejected: signature verification failed");
      return res.status(400).json({ error: "signature verification failed" });
    }
    const result = await commerce.handleWebhook(req.body);
    await logEvent(true, result);
    res.json({ ok: true, result });
  }));

  app.get("/api/licenses/:token", wrap(async (req, res) => res.json(await commerce.license(req.params.token))));
  app.get("/api/licenses/:token/download.:fmt", wrap(async (req, res) => {
    const lic = await commerce.license(req.params.token);
    await sendFormat(res, mustAsset(lic.assetId), lic.knobs, req.params.fmt);
  }));

  app.get("/api/ledger", wrap(async (req, res) => {
    const rows = await store.list("ledger");
    const byAuthor = {};
    for (const r of rows) {
      const k = r.author;
      byAuthor[k] ||= { author: k, cents: 0, sales: 0, paidOut: 0 };
      byAuthor[k].cents += r.cents;
      byAuthor[k].sales += 1;
      if (r.email) byAuthor[k].paidOut += r.cents;
    }
    res.json({ authors: Object.values(byAuthor).sort((a, b) => b.cents - a.cents), recent: rows.sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 30) });
  }));

  // The agent keeps each chat's history server-side, append-only.
  app.post("/api/agent", wrap(async (req, res) => {
    if (!config.anthropicKey) throw Object.assign(new Error("Agent not configured"), { status: 503 });
    const { message, cart } = req.body || {};
    const budget = Number(req.body?.budget) > 0 ? Math.min(500, Number(req.body.budget)) : null;
    if (!message || typeof message !== "string") throw Object.assign(new Error("message required"), { status: 400 });
    const chatId = /^[a-f0-9]{16}$/.test(req.body.chatId || "") ? req.body.chatId : crypto.randomBytes(8).toString("hex");
    const chat = (await store.get("chats", chatId)) || { id: chatId, messages: [] };
    res.set({ "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive", "X-Accel-Buffering": "no" });
    res.flushHeaders();
    const emit = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    emit("chat", { chatId });
    const ping = setInterval(() => res.write(": ping\n\n"), 15000);
    const history = [...chat.messages, { role: "user", content: message.slice(0, 4000) + (budget && !chat.messages.length ? `\n\n(Spending cap set by me in Oasis: $${budget}.)` : "") }];
    try {
      await runAgent({ history, cart, budget }, (event, data) => {
        if (event === "history") {
          chat.messages = [...history, ...data.messages];
          return;
        }
        emit(event, data);
      });
      await store.put("chats", chatId, chat);
    } catch (e) {
      console.error("agent", e);
      emit("error", { message: e.message });
    } finally {
      clearInterval(ping);
      emit("done", {});
      res.end();
    }
  }));

  // Abuse controls for the unauthenticated endpoints, using express-rate-limit's fixed windows.
  // Orders are the tightest: an agent has no reason to open more than a few a minute, and each is a PayPal call.
  const limit = (limitPerMin, jsonRpc = false) => rateLimit({
    windowMs: 60_000, limit: limitPerMin, standardHeaders: "draft-8", legacyHeaders: false,
    handler: (req, res) => res.status(429).json(jsonRpc
      ? { jsonrpc: "2.0", error: { code: -32029, message: "Rate limited. Slow down and retry in a minute." }, id: req.body?.id ?? null }
      : { error: "Rate limited. Slow down and retry in a minute." }),
  });
  const mcpLimit = limit(120, true), mcpOrderLimit = limit(10, true), orderLimit = limit(10), agentLimit = limit(6);
  app.use("/api/orders", (req, res, next) => (req.method === "POST" ? orderLimit(req, res, next) : next()));
  app.use("/api/agent", agentLimit);

  // A public count of MCP traffic, so "agents use this" is a number anyone can check.
  const mcpStats = (await store.get("stats", "mcp")) || { since: new Date().toISOString(), requests: 0, tools: {}, clients: {} };
  let statsDirty = false;
  setInterval(() => { if (statsDirty) { statsDirty = false; store.put("stats", "mcp", mcpStats).catch(() => {}); } }, 10_000).unref();
  const countMcp = (req, res, next) => {
    const m = req.body || {};
    mcpStats.requests++;
    if (m.method === "tools/call" && m.params?.name) mcpStats.tools[m.params.name] = (mcpStats.tools[m.params.name] || 0) + 1;
    if (m.method === "initialize") {
      const c = String(m.params?.clientInfo?.name || "unknown").slice(0, 40);
      mcpStats.clients[c] = (mcpStats.clients[c] || 0) + 1;
    }
    statsDirty = true;
    next();
  };
  const isCreate = (req) => req.body?.method === "tools/call" && req.body?.params?.name === "create_order";
  // Public evidence page: what the deploy can do and the PayPal objects it has actually produced.
  const numbers = fs.existsSync("docs/numbers.json") ? JSON.parse(fs.readFileSync("docs/numbers.json", "utf8")) : {};
  app.get("/api/status", wrap(async (req, res) => {
    const recent = (rows, n = 12) => rows.sort((a, b) => String(b.createdAt || b.at).localeCompare(String(a.createdAt || a.at))).slice(0, n);
    const orders = await store.list("orders");
    const byStatus = orders.reduce((m, o) => ((m[o.status] = (m[o.status] || 0) + 1), m), {});
    res.set("Cache-Control", "no-cache").json({
      paypalReady: paypalConfigured(), agentReady: !!config.anthropicKey, paypalEnv: "sandbox",
      tests: numbers.tests, factory: { builds: numbers.factoryBuilds, published: numbers.factoryPublished, rejected: numbers.factoryRejected },
      assets: catalog.allAssets().length,
      orders: { total: orders.length, byStatus, recent: recent(orders).map((o) => ({ id: o.id, status: o.status, total: o.total, items: o.items.length, agentName: o.agentName, cap: o.maxTotal, captureId: o.captureId || null, refundId: o.refundId || null, payoutHold: o.payoutHold?.status || null, payoutBatch: o.payoutBatch?.id || null, createdAt: o.createdAt })) },
      webhooks: recent(await store.list("webhooks"), 15),
      payouts: recent(await store.list("payouts"), 15),
      mcp: mcpStats,
    });
  }));
  app.get("/api/stats/mcp", (req, res) => res.set("Cache-Control", "no-cache").json(mcpStats));
  app.post("/mcp", mcpLimit, (req, res, next) => (isCreate(req) ? mcpOrderLimit(req, res, next) : next()), countMcp, handleMcp);
  app.get("/mcp", (req, res) => res.status(405).json({ jsonrpc: "2.0", error: { code: -32000, message: "Method not allowed. POST JSON-RPC to /mcp." }, id: null }));

  // PayPal sends the payer back here after approving an order an agent created.
  app.get("/checkout/return", wrap(async (req, res) => {
    const id = String(req.query.token || "");
    try {
      await commerce.capture(id);
    } catch (e) {
      console.warn("capture on return", e.message);
    }
    res.redirect(`/#/order/${encodeURIComponent(id)}`);
  }));

  // Assets published after the build (new forks) have no pre-rendered preview: render them live.
  app.get("/prerender/:file", async (req, res, next) => {
    const m = req.params.file.match(/^(.+)--([a-z0-9-]+)\.(svg|png)$/);
    if (!m || fs.existsSync(new URL(`../public/prerender/${req.params.file}`, import.meta.url).pathname)) return next();
    const { BRAND_PRESETS } = await import("../public/brands.js");
    const b = BRAND_PRESETS.find((x) => x.slug === m[2]);
    const q = b ? `?brand=${encodeURIComponent(JSON.stringify((({ name, slug, ...c }) => c)(b)))}` : "";
    res.redirect(302, `/api/assets/${encodeURIComponent(m[1])}/render.svg${q}`);
  });

  app.get("/llms.txt", (req, res) => res.type("text/plain").send(llmsTxt()));
  app.get("/api", (req, res) => res.type("text/plain").send(llmsTxt()));
  app.use(express.static(new URL("../public/", import.meta.url).pathname, { extensions: ["html"], maxAge: "5m" }));
  return app;
}
