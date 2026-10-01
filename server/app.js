import express from "express";
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
import { llmsTxt } from "./llms.js";

export async function createApp() {
  await catalog.load();
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "1mb" }));

  const wrap = (fn) => (req, res) =>
    Promise.resolve(fn(req, res)).catch((e) => {
      if (!e.status || e.status >= 500) console.error(req.method, req.path, e);
      if (!res.headersSent) res.status(e.status || 500).json({ error: e.message });
    });
  const parseKnobs = (req) => {
    try {
      const p = req.query.p ? JSON.parse(String(req.query.p)) : {};
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
    res.json({ paypalClientId: config.paypal.clientId || null, paypalReady: paypalConfigured(), agentReady: !!config.anthropicKey, ...catalog.stats() }),
  );

  app.get("/api/assets", wrap((req, res) => {
    const list = catalog.search({ query: req.query.q || "", kind: req.query.kind || undefined, freeOnly: req.query.free === "1", limit: 500 });
    res.json(list.map((a) => catalog.summary(a)));
  }));

  app.get("/api/assets/:id", wrap((req, res) => {
    const a = mustAsset(req.params.id);
    res.json({ ...catalog.summary(a, { withKnobs: true }), parent: a.forkedFrom ? catalog.summary(catalog.getAsset(a.forkedFrom) || { ...a, params: {} }) : null, children: catalog.allAssets().filter((x) => x.forkedFrom === a.id).map((x) => catalog.summary(x)) });
  }));

  app.get("/api/assets/:id/render.svg", wrap((req, res) => {
    const a = mustAsset(req.params.id);
    const { svg } = catalog.render(a, parseKnobs(req));
    const out = a.price > 0 ? catalog.watermark(svg, catalog.sizeOf(svg, a.size)) : svg;
    res.set("Content-Type", "image/svg+xml").set("Cache-Control", "no-cache").send(out);
  }));

  app.get("/api/assets/:id/download.:fmt", wrap((req, res) => {
    const a = mustAsset(req.params.id);
    if (a.price > 0) throw Object.assign(new Error("This asset needs a licence: check out with PayPal first."), { status: 402 });
    sendFormat(res, a, parseKnobs(req), req.params.fmt);
  }));

  function sendFormat(res, a, knobs, fmt) {
    const f = FORMATS[fmt];
    if (!f) throw Object.assign(new Error(`Unknown format ${fmt}`), { status: 400 });
    const { svg, values } = catalog.render(a, knobs);
    res.set("Content-Type", f.type).set("Content-Disposition", `attachment; filename="${a.id}.${f.ext}"`).send(f.make(svg, a, values));
  }

  app.post("/api/assets/:id/fork", wrap(async (req, res) => {
    const { instruction, author, payoutEmail, price } = req.body || {};
    const email = typeof payoutEmail === "string" && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(payoutEmail) ? payoutEmail : null;
    const fork = await forkAsset({ assetId: req.params.id, instruction, author: String(author || "anonymous").slice(0, 40), payoutEmail: email, price });
    res.json(catalog.summary(fork));
  }));

  app.post("/api/orders", wrap(async (req, res) => {
    const o = await commerce.createCheckout(req.body?.items || []);
    res.json({ id: o.id, total: o.total, items: o.items });
  }));
  app.post("/api/orders/:id/capture", wrap(async (req, res) => res.json(await commerce.capture(req.params.id))));
  app.get("/api/orders/:id", wrap(async (req, res) => {
    const o = await store.get("orders", req.params.id);
    if (!o) throw Object.assign(new Error("Unknown order"), { status: 404 });
    res.json(o);
  }));

  app.get("/api/licenses/:token", wrap(async (req, res) => res.json(await commerce.license(req.params.token))));
  app.get("/api/licenses/:token/download.:fmt", wrap(async (req, res) => {
    const lic = await commerce.license(req.params.token);
    sendFormat(res, mustAsset(lic.assetId), lic.knobs, req.params.fmt);
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
    if (!message || typeof message !== "string") throw Object.assign(new Error("message required"), { status: 400 });
    const chatId = /^[a-f0-9]{16}$/.test(req.body.chatId || "") ? req.body.chatId : crypto.randomBytes(8).toString("hex");
    const chat = (await store.get("chats", chatId)) || { id: chatId, messages: [] };
    res.set({ "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive", "X-Accel-Buffering": "no" });
    res.flushHeaders();
    const emit = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    emit("chat", { chatId });
    const ping = setInterval(() => res.write(": ping\n\n"), 15000);
    const history = [...chat.messages, { role: "user", content: message.slice(0, 4000) }];
    try {
      await runAgent({ history, cart }, (event, data) => {
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

  app.post("/mcp", handleMcp);
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

  app.get("/llms.txt", (req, res) => res.type("text/plain").send(llmsTxt()));
  app.get("/api", (req, res) => res.type("text/plain").send(llmsTxt()));
  app.use(express.static(new URL("../public/", import.meta.url).pathname, { extensions: ["html"], maxAge: "5m" }));
  return app;
}
