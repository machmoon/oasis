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
import * as registry from "./registry.js";
import * as paypal from "./paypal.js";
import * as film from "./film.js";
import * as filmRender from "./film-render.js";
import { musicFor } from "./film-music.js";
import * as sound from "./sound.js";
import * as kits from "./kits.js";
import * as publish from "./publish.js";

export async function createApp() {
  await catalog.load();
  // The factory publishes new sound programs while the server runs: pick them up without a restart.
  if (process.env.OASIS_RELOAD_SECONDS !== "0") setInterval(() => catalog.load().catch((e) => console.warn("catalog reload", e.message)), (Number(process.env.OASIS_RELOAD_SECONDS) || 90) * 1000).unref();
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1); // Render terminates TLS in front of us; rate limits key on the client's IP.
  app.use(express.json({ limit: "1mb" }));

  const wrap = (fn) => (req, res) =>
    Promise.resolve(fn(req, res)).catch((e) => {
      if (!e.status || e.status >= 500) console.error(req.method, req.path, e);
      // a coded refusal (publish checks) carries its code and the harness's full list, so a page can show every line
      if (!res.headersSent) res.status(e.status || 500).json({ error: e.message, ...(e.code ? { code: e.code } : {}), ...(e.errors ? { errors: e.errors, warnings: e.warnings || [] } : {}) });
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
    res.json({ prerendered: fs.existsSync(new URL("../public/prerender/", import.meta.url).pathname), paypalClientId: config.paypal.clientId || null, paypalReady: paypalConfigured(), agentReady: kits.plannerReady(), ...catalog.stats() }),
  );

  app.get("/api/assets", wrap((req, res) => {
    const list = catalog.search({ query: req.query.q || "", kind: req.query.kind || undefined, freeOnly: req.query.free === "1", limit: 500 });
    res.json(list.map((a) => catalog.summary(a)));
  }));

  app.get("/api/assets/:id", wrap((req, res) => {
    const a = mustAsset(req.params.id);
    res.json({ ...catalog.summary(a, { withKnobs: true }), parent: a.forkedFrom ? catalog.summary(catalog.getAsset(a.forkedFrom) || { ...a, params: {} }) : null, children: catalog.allAssets().filter((x) => x.forkedFrom === a.id).map((x) => catalog.summary(x)) });
  }));

  // ---------- sounds: the program renders to samples; the server serves WAV, pictures and numbers ----------
  // A paid sound's preview carries the watermark (a soft tick, a lowpass) unless the request names a licence for it.
  const soundOf = async (req, a, { licensed = false } = {}) => {
    const r = await catalog.soundAsync(a, parseKnobs(req), { sr: req.query.sr === "44100" ? 44100 : undefined });
    let clean = licensed || a.price <= 0;
    if (!clean && req.query.lic) { const lic = await commerce.license(String(req.query.lic)).catch(() => null); clean = !!lic && lic.assetId === a.id; }
    return { ...r, samples: clean ? r.samples : sound.watermark(r.samples, r.sr), watermarked: !clean };
  };
  const mustSound = (id) => { const a = mustAsset(id); if (a.format !== "sound") throw Object.assign(new Error(`${id} is not a sound`), { status: 404 }); return a; };
  const sendWav = (res, { samples, sr, watermarked }, name) => res.set({ "Content-Type": "audio/wav", "Cache-Control": "no-cache", "Content-Disposition": `inline; filename="${name}.wav"`, "X-Oasis-Watermarked": watermarked ? "1" : "0" }).send(sound.toWav(samples, sr));
  app.get("/api/assets/:id/render.wav", wrap(async (req, res) => sendWav(res, await soundOf(req, mustSound(req.params.id)), req.params.id)));
  app.get("/api/assets/:id/sound.json", wrap(async (req, res) => {
    const a = mustSound(req.params.id);
    const r = await soundOf(req, a);
    res.set("Cache-Control", "no-cache").json({ id: a.id, values: r.values, watermarked: r.watermarked, ...sound.analyse(r.samples, r.sr) });
  }));
  app.get("/api/assets/:id/waveform.png", wrap(async (req, res) => {
    const r = await soundOf(req, mustSound(req.params.id));
    res.set("Content-Type", "image/png").set("Cache-Control", "public, max-age=300").send(sound.waveformPng(sound.analyse(r.samples, r.sr, { cols: 320 }), Math.min(1280, Number(req.query.w) || 640), Math.min(640, Number(req.query.h) || 200)));
  }));
  app.get("/api/assets/:id/spectrogram.png", wrap(async (req, res) => {
    const r = await soundOf(req, mustSound(req.params.id));
    res.set("Content-Type", "image/png").set("Cache-Control", "public, max-age=300").send(sound.spectrogramPng(sound.analyse(r.samples, r.sr), Math.min(1280, Number(req.query.w) || 640), Math.min(640, Number(req.query.h) || 160)));
  }));
  // A walk: the same program rendered once per seed and laid along a timeline, the "300 variants" demo. Returns one
  // WAV; ?json=1 returns each take's numbers instead, for the scatter plot.
  const walkLimit = rateLimit({ windowMs: 60_000, limit: 30, standardHeaders: "draft-8", legacyHeaders: false });
  app.post("/api/sounds/:id/walk", walkLimit, wrap(async (req, res) => {
    const a = mustSound(req.params.id);
    const n = Math.max(1, Math.min(300, Number(req.body?.count) || 24)), gap = Math.max(0.05, Math.min(2, Number(req.body?.gap) || 0.28));
    const base = catalog.resolveInput(a, req.body?.knobs || {});
    const seedKnob = a.params.knobs.seed;
    const seeds = Array.from({ length: n }, (_, i) => (seedKnob ? seedKnob.min + ((Number(req.body?.from) || 100) + i) % (seedKnob.max - seedKnob.min + 1) : 0));
    const takes = await Promise.all(seeds.map((seed) => catalog.soundAsync(a, seedKnob ? { ...base, seed } : base)));
    const sr = takes[0].sr, total = new Float32Array(Math.min(sr * 30, Math.round((n * gap + 1) * sr)));
    const { mix } = await import("../public/sound-dsp.js");
    const stats = takes.map((t, i) => { mix(total, t.samples, i * gap, 0.8, sr); const an = sound.analyse(t.samples, sr, { cols: 8, bins: 16 }); return { seed: seeds[i], at: Math.round(i * gap * 1000) / 1000, peak: an.peak, rms: an.rms, centroid: an.centroid, seconds: an.seconds }; });
    if (req.query.json === "1") return res.json({ id: a.id, knobs: base, sr, seconds: total.length / sr, takes: stats });
    const clean = a.price <= 0 || (req.body?.lic && (await commerce.license(String(req.body.lic)).catch(() => null))?.assetId === a.id);
    for (let i = 0; i < total.length; i++) total[i] = Math.max(-1, Math.min(1, total[i]));
    res.set("X-Oasis-Takes", JSON.stringify(stats.map((s) => [s.at, s.peak, s.centroid])).slice(0, 7000));
    sendWav(res, { samples: clean ? total : sound.watermark(total, sr), sr, watermarked: !clean }, `${a.id}-walk`);
  }));

  // ?night=1 draws a block asset's sheet after dark (lit parts glow), the way the kit grid shows it on hover.
  app.get("/api/assets/:id/render.png", wrap(async (req, res) => {
    const a = mustAsset(req.params.id);
    if (a.format === "sound") {
      // a sound's sheet: its waveform over its spectrogram
      const r = await soundOf(req, a);
      return res.set("Content-Type", "image/png").set("Cache-Control", "public, max-age=300").send(sound.cardPng(sound.analyse(r.samples, r.sr, { cols: 320 }), Math.min(1024, Number(req.query.w) || 640), undefined, req.query.theme === "light" ? "light" : "dark"));
    }
    const { svg } = await catalog.renderAsync(a, parseKnobs(req), { night: req.query.night === "1" });
    res.set("Content-Type", "image/png").set("Cache-Control", "public, max-age=300").send(await catalog.toPng(svg, Math.min(1024, Number(req.query.w) || 640)));
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
    if (a.price > 0) throw Object.assign(new Error("This asset needs a license: check out with PayPal first."), { status: 402 });
    await sendFormat(res, a, parseKnobs(req), req.params.fmt);
  }));

  async function sendFormat(res, a, knobs, fmt) {
    if (a.format === "sound") {
      if (fmt === "mjs") return res.set("Content-Type", "text/javascript; charset=utf-8").set("Content-Disposition", `attachment; filename="${a.id}.mjs"`).send(a.source);
      if (fmt !== "wav") throw Object.assign(new Error("Sounds download as WAV (44.1 kHz) or as their program (.mjs)"), { status: 400 });
      const r = await catalog.soundAsync(a, knobs, { sr: 44100 });
      return res.set({ "Content-Type": "audio/wav", "Content-Disposition": `attachment; filename="${a.id}.wav"` }).send(sound.toWav(r.samples, r.sr));
    }
    if (fmt === "glb") {
      if (a.format !== "blocks") throw Object.assign(new Error("GLB is available for 3D block assets"), { status: 400 });
      const { parts } = await catalog.buildAsync(a, knobs);
      const glb = await toGlb([{ parts }], { name: a.id });
      return res.set("Content-Type", "model/gltf-binary").set("Content-Disposition", `attachment; filename="${a.id}.glb"`).send(glb);
    }
    const f = FORMATS[fmt];
    if (!f) throw Object.assign(new Error(`Unknown format ${fmt}`), { status: 400 });
    const { svg, values } = await catalog.renderAsync(a, knobs);
    res.set("Content-Type", f.type).set("Content-Disposition", `attachment; filename="${a.id}.${f.ext}"`).send(await f.make(svg, a, values));
  }

  app.post("/api/assets/:id/fork", wrap(async (req, res) => {
    const { instruction, author, payoutEmail, price } = req.body || {};
    const email = typeof payoutEmail === "string" && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(payoutEmail) ? payoutEmail : null;
    const fork = await forkAsset({ assetId: req.params.id, instruction, author: String(author || "anonymous").slice(0, 40), payoutEmail: email, price });
    res.json(catalog.summary(fork));
  }));

  // Creators publish their own programs (server/publish.js): a dry run that loads, measures and renders, then the
  // write, which re-runs the dry run. The contract is served as text, the way polyfork.dev serves /prompt.txt.
  const publishLimit = rateLimit({ windowMs: 60_000, limit: 30, standardHeaders: "draft-8", legacyHeaders: false });
  app.get("/contract.txt", (req, res) => res.type("text/plain").send(publish.CONTRACT));
  app.get("/api/publish/template", (req, res) => res.type("text/javascript").send(publish.TEMPLATE));
  app.post("/api/publish/check", publishLimit, wrap(async (req, res) => res.set("Cache-Control", "no-cache").json(await publish.check(req.body?.source))));
  app.post("/api/publish", publishLimit, wrap(async (req, res) => res.status(201).json(catalog.summary(await publish.publish(req.body || {})))));
  app.get("/api/creators/:name", wrap(async (req, res) => res.set("Cache-Control", "no-cache").json(await publish.creator(String(req.params.name).toLowerCase().slice(0, 40)))));

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
  // Budgets: the human approves one PayPal Vault setup token; the agent then buys inside the budget, unattended.
  app.post("/api/budgets", mandateLimit, wrap(async (req, res) => {
    const { description, usd, hours } = req.body || {};
    const { mandate, token } = await mandates.issue({ description: description || "3D assets for my scene", maxTotalUsd: usd, expiresInHours: hours || 24, funded: true });
    const setup = await paypal.createSetupToken({
      description: `Oasis: up to $${Number(usd).toFixed(0)} for your agent's 3D assets`,
      returnUrl: `${config.baseUrl}/budget/return?m=${mandate.id}`, cancelUrl: `${config.baseUrl}/#/budget?cancelled=${mandate.id}`,
      requestId: `oasis-setup-${mandate.id}`,
    });
    await mandates.attachSetup(mandate.id, { setupTokenId: setup.id, approveUrl: setup.approveUrl });
    res.json({ mandate: await mandates.get(mandate.id), token, approveUrl: setup.approveUrl });
  }));
  app.get("/budget/return", wrap(async (req, res) => {
    const setupTokenId = String(req.query.approval_token_id || req.query.token || "");
    const m = await mandates.bySetupToken(setupTokenId);
    if (!m) throw Object.assign(new Error("Unknown approval"), { status: 404 });
    if (m.vault.state !== "active") {
      const pt = await paypal.createPaymentToken(setupTokenId);
      await mandates.activate(m.id, { paymentTokenId: pt.id, payerEmail: pt.payerEmail });
    }
    res.redirect(`/#/budget/${m.id}`);
  }));
  // An agent with a funded mandate buys licences: one PayPal order on the vaulted wallet, no redirect.
  const buyLimit = rateLimit({ windowMs: 60_000, limit: 30, standardHeaders: "draft-8", legacyHeaders: false });
  const bearer = (req) => (req.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  app.post("/api/buy", buyLimit, wrap(async (req, res) => {
    const items = (req.body?.items || []).map((it) => (typeof it === "string" ? { assetId: it } : { assetId: it.asset_id || it.assetId, knobs: it.knobs }));
    if (!items.length) throw Object.assign(new Error("items required: [{ asset_id, knobs? }]"), { status: 400 });
    const o = await commerce.buyWithMandate(bearer(req), items, { agentName: req.body?.agent_name || req.get("X-Agent-Name") || null });
    res.json(buyResult(o, await mandates.get(o.mandateId)));
  }));
  const buyResult = (o, m) => ({
    order_id: o.id, status: o.status, total_usd: o.total,
    imports: o.licenses.map((l) => ({ asset_id: l.assetId, title: l.title, module: registry.moduleUrl(l.assetId, l.token) })),
    creators_paid: commerce.saleEvent(o).creators,
    budget: { remaining_usd: m?.remaining_usd, spent_usd: m?.spent_usd, of_usd: m?.budget_usd },
  });

  // The live sales feed: Server-Sent Events, one event per completed sale.
  app.get("/api/feed", (req, res) => {
    res.set({ "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive", "X-Accel-Buffering": "no" });
    res.flushHeaders();
    const send = (ev) => res.write(`event: sale\ndata: ${JSON.stringify(ev)}\n\n`);
    commerce.events.on("sale", send);
    const ping = setInterval(() => res.write(": ping\n\n"), 20000);
    req.on("close", () => { clearInterval(ping); commerce.events.off("sale", send); });
  });
  // Every captured order with royalties: kit checkouts, agent orders on a budget, single-asset licences.
  app.get("/api/sales", wrap(async (req, res) => {
    const orders = (await store.list("orders")).filter((o) => o.status === "COMPLETED" && o.royalties?.length).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    // the capture and the payout batch's state ride along, so the ledger shows the money moving, not only the order
    res.json(orders.slice(0, 40).map(commerce.saleEvent).map((e, i) => ({ ...e, at: orders[i].createdAt, captureId: orders[i].captureId || null, payout: orders[i].payoutHold?.status || null })));
  }));

  // Kits: a vibe becomes 6-10 tuned sound programs (server/kits.js), licensed in one PayPal order.
  const kitLimit = rateLimit({ windowMs: 60_000, limit: 12, standardHeaders: "draft-8", legacyHeaders: false });
  const mustKit = async (id) => { const k = await kits.get(id); if (!k) throw Object.assign(new Error("No such kit"), { status: 404 }); return k; };
  app.post("/api/kits", kitLimit, wrap(async (req, res) => {
    const vibe = String(req.body?.vibe || "").slice(0, 300);
    if (!vibe.trim()) throw Object.assign(new Error("Say what the kit is for"), { status: 400 });
    // quick: the keyword planner, not saved (the home hero's demo bill), so a page view never spends a model call
    if (req.body?.quick) return res.json(kits.view({ id: null, ...kits.cleanKit(vibe, kits.planByKeywords(vibe)), licence: null }));
    res.json(kits.view(await kits.save(await kits.planKit(vibe))));
  }));
  // One sound, licensed on its own: a one-part kit with the knobs the buyer set, so it goes through the same itemised
  // PayPal checkout, capture, claim and creator split as any kit.
  app.post("/api/kits/single", kitLimit, wrap(async (req, res) => {
    const a = mustSound(String(req.body?.assetId || ""));
    const knobs = req.body?.knobs && typeof req.body.knobs === "object" ? req.body.knobs : {};
    const plan = { title: a.title, items: [{ assetId: a.id, knobs, name: a.title, reason: "licensed on its own, with the knobs set on its page" }] };
    const fresh = kits.cleanKit(a.title, plan, "single");
    // the same sound with the same knobs, not yet paid for, is the same order: a second click reuses it
    const same = (await store.list("kits")).find((k) => k.planner === "single" && !k.licence && k.items[0]?.assetId === a.id && JSON.stringify(k.items[0].knobs) === JSON.stringify(fresh.items[0].knobs));
    res.json(kits.view(same || await kits.save(fresh)));
  }));
  app.get("/api/kits", wrap(async (req, res) => {
    // one row per kit name and per vibe: the list is licensed first, then newest, so a repeat take is dropped
    const seen = new Set(), key = (s) => String(s || "").trim().toLowerCase();
    const all = (await store.list("kits")).filter((k) => k.planner !== "single" && k.items.length >= 4).sort((a, b) => (!!b.licence - !!a.licence) || b.updatedAt.localeCompare(a.updatedAt))
      .filter((k) => { const t = `t:${key(kits.tidyTitle(k.title))}`, v = `v:${key(k.vibe)}`; if (seen.has(t) || seen.has(v)) return false; seen.add(t); seen.add(v); return true; }).slice(0, 24);
    // the tile's picture: its first four parts as tuned in the kit (the same card render a part shows on the kit page)
    const card = (l) => `/api/assets/${encodeURIComponent(l.assetId)}/render.png?w=320${Object.keys(l.knobs || {}).length ? `&p=${encodeURIComponent(JSON.stringify(l.knobs))}` : ""}`;
    res.json(all.map((k) => ({ id: k.id, title: kits.tidyTitle(k.title), vibe: k.vibe, parts: k.items.length, total: k.total, creators: k.creators.length, licensed: !!k.licence, createdAt: k.createdAt, cards: k.items.filter((l) => !l.covered).slice(0, 4).map(card) })));
  }));
  // who is asking: the browser's claim token, or an agent's mandate (Bearer, as on /api/kits/:id/license)
  const kitCaller = (req) => ({ claim: req.get("x-claim-token") || req.body?.claim_token, mandate: req.body?.mandate || (req.get("authorization") || "").replace(/^Bearer\s+/i, "") || null });
  app.get("/api/kits/:id", wrap(async (req, res) => { const k = await mustKit(req.params.id); res.set("Cache-Control", "no-cache").json(kits.view(k, { owner: await kits.owns(k, kitCaller(req)) })); }));
  // Licensing a kit on a funded budget: every paid part, once, in one vaulted order.
  app.post("/api/kits/:id/license", buyLimit, wrap(async (req, res) => {
    const k = await mustKit(req.params.id);
    if (k.licence) return res.json(kits.view(k, { owner: await kits.owns(k, kitCaller(req)) }));
    const items = kits.billItems(k);
    const mandate = String(req.body?.mandate || (req.get("authorization") || "").replace(/^Bearer\s+/i, ""));
    const o = items.length ? await commerce.buyWithMandate(mandate, items, { agentName: String(req.body?.agent_name || "Oasis Kits").slice(0, 40) }) : null;
    res.json(kits.view(await kits.save(k, { licence: kits.licenceOf(k, o, "mandate") })));
  }));
  // Licensing a kit through PayPal Checkout: one Orders v2 order for every paid part, approved by the person in
  // PayPal's own window. The claim token comes back once, to the browser that started it.
  app.post("/api/kits/:id/checkout", buyLimit, wrap(async (req, res) => {
    const k = await mustKit(req.params.id);
    if (k.licence) throw Object.assign(new Error("This kit is already licensed"), { status: 409 });
    const o = await commerce.createCheckout(kits.billItems(k), { returnUrl: `${config.baseUrl}/checkout/return?kit=${encodeURIComponent(k.id)}`, cancelUrl: `${config.baseUrl}/#/kit/${encodeURIComponent(k.id)}` });
    res.json({ order_id: o.id, approve_url: o.approveUrl, claim_token: o.claimToken, total_usd: o.total });
  }));
  app.post("/api/kits/:id/claim", buyLimit, wrap(async (req, res) => {
    const k = await mustKit(req.params.id);
    if (k.licence) return res.json(kits.view(k, { owner: await kits.owns(k, kitCaller(req)) }));
    let o = await store.get("orders", String(req.body?.order_id || ""));
    if (!commerce.ownsOrder(o, String(req.body?.claim_token || ""))) throw Object.assign(new Error("Unknown order, or wrong claim token"), { status: 404 });
    if (o.status !== "COMPLETED") { try { o = await commerce.capture(o.id); } catch (e) { console.warn("kit claim capture", e.message); } }
    if (o.status !== "COMPLETED") throw Object.assign(new Error(`The PayPal order is ${String(o.status || "not approved").toLowerCase()} yet`), { status: 409 });
    const paid = new Set(o.items.map((i) => i.assetId));
    if (!kits.billItems(k).every((i) => paid.has(i.assetId))) throw Object.assign(new Error("That order does not cover this kit"), { status: 409 });
    res.json(kits.view(await kits.save(k, { licence: { ...kits.licenceOf(k, o, "checkout"), captureId: o.captureId || null } })));
  }));

  // Films: a brief becomes a short film shot in a world of kit pieces, dressed with 2D assets (server/film.js).
  const filmLimit = rateLimit({ windowMs: 60_000, limit: 12, standardHeaders: "draft-8", legacyHeaders: false });
  const mustFilm = async (id) => {
    const f = await film.get(id);
    if (!f) throw Object.assign(new Error("No such film"), { status: 404 });
    return f;
  };
  const filmView = async (f) => ({ ...(await film.hydrate(f)), render: f.render || { status: "idle" }, licensed: !!f.licence, licence: f.licence ? { orderId: f.licence.orderId, total: f.licence.total, creators: f.licence.creators, platformUsd: f.licence.platformUsd, platformPct: f.licence.platformPct } : null, renderer: await filmRender.available(), link: `${config.baseUrl}/#/film/${f.id}` });
  app.post("/api/films", filmLimit, wrap(async (req, res) => {
    const brief = String(req.body?.brief || "").slice(0, 400);
    if (!brief.trim()) throw Object.assign(new Error("Say what the film is about"), { status: 400 });
    let f = await film.planFilm(brief);
    if (req.body?.direct !== false) { try { f = (await film.direct(f, brief)) || f; } catch (e) { console.error("director", e.message); } }
    res.json(await filmView(await film.save(f)));
  }));
  app.get("/api/films", wrap(async (req, res) => {
    const all = (await store.list("films")).filter((f) => f.render?.status === "done").sort((a, b) => (!!b.licence - !!a.licence) || b.updatedAt.localeCompare(a.updatedAt)).slice(0, 12); // films in colour first
    res.json(all.map((f) => ({ id: f.id, title: f.title, brief: f.brief, seconds: f.seconds, mp4: `/api/films/${f.id}/film.mp4`, poster: `/api/films/${f.id}/poster.jpg`, licensed: !!f.licence && !/^DEV-/.test(f.licence.orderId || ""), creators: film.billOf(f).creators.length })));
  }));
  app.get("/api/films/:id", wrap(async (req, res) => res.set("Cache-Control", "no-cache").json(await filmView(await mustFilm(req.params.id)))));
  app.post("/api/films/:id/direct", filmLimit, wrap(async (req, res) => {
    const f = await mustFilm(req.params.id);
    const next = await film.direct(f, `${f.brief}\n\nChange: ${String(req.body?.request || "").slice(0, 400)}`);
    if (!next) throw Object.assign(new Error("The director isn't available on this server"), { status: 503 });
    res.json(await filmView(await film.save({ ...next, id: f.id, createdAt: f.createdAt, licence: f.licence || null, render: null })));
  }));
  // Licensing a film is one agent purchase on a funded budget: every paid piece, sign and card, once.
  app.post("/api/films/:id/license", buyLimit, wrap(async (req, res) => {
    const f = await mustFilm(req.params.id);
    if (f.licence) return res.json(await filmView(f));
    const items = film.billItems(f);
    const mandate = String(req.body?.mandate || (req.get("authorization") || "").replace(/^Bearer\s+/i, ""));
    const o = items.length ? await commerce.buyWithMandate(mandate, items, { agentName: String(req.body?.agent_name || "Oasis Studio").slice(0, 40) }) : null;
    const split = o ? film.payoutsOf(o) : null;
    const licence = { orderId: o?.id || "free", total: o?.total || 0, creators: split?.creators || [], platformUsd: split?.platformUsd || 0, platformPct: split?.platformPct || 0, tokens: Object.fromEntries((o?.licenses || []).map((l) => [l.assetId, l.token])), at: new Date().toISOString() };
    res.json(await filmView(await film.save(f, { licence, render: null })));
  }));
  // Licensing a film through PayPal Checkout: one Orders v2 order for every paid piece, sign and card, approved by the
  // person in PayPal's own window. The claim token comes back once, to the browser that started it.
  app.post("/api/films/:id/checkout", buyLimit, wrap(async (req, res) => {
    const f = await mustFilm(req.params.id);
    if (f.licence) throw Object.assign(new Error("This film is already licensed"), { status: 409 });
    const o = await commerce.createCheckout(film.billItems(f), { returnUrl: `${config.baseUrl}/checkout/return?film=${encodeURIComponent(f.id)}`, cancelUrl: `${config.baseUrl}/#/film/${encodeURIComponent(f.id)}` });
    res.json({ order_id: o.id, approve_url: o.approveUrl, claim_token: o.claimToken, total_usd: o.total });
  }));
  // The order's owner claims the licence once PayPal has the payment: captured here if the return page did not.
  app.post("/api/films/:id/claim", buyLimit, wrap(async (req, res) => {
    const f = await mustFilm(req.params.id);
    if (f.licence) return res.json(await filmView(f));
    let o = await store.get("orders", String(req.body?.order_id || ""));
    if (!commerce.ownsOrder(o, String(req.body?.claim_token || ""))) throw Object.assign(new Error("Unknown order, or wrong claim token"), { status: 404 });
    if (o.status !== "COMPLETED") { try { o = await commerce.capture(o.id); } catch (e) { console.warn("film claim capture", e.message); } }
    if (o.status !== "COMPLETED") throw Object.assign(new Error(`The PayPal order is ${String(o.status || "not approved").toLowerCase()} yet`), { status: 409 });
    const paid = new Set(o.items.map((i) => i.assetId));
    if (!film.billItems(f).every((i) => paid.has(i.assetId))) throw Object.assign(new Error("That order does not cover this film"), { status: 409 });
    const split = film.payoutsOf(o);
    const licence = { orderId: o.id, captureId: o.captureId || null, total: o.total, creators: split.creators, platformUsd: split.platformUsd, platformPct: split.platformPct, tokens: Object.fromEntries((o.licenses || []).map((l) => [l.assetId, l.token])), at: new Date().toISOString(), via: "checkout" };
    res.json(await filmView(await film.save(f, { licence, render: null })));
  }));
  app.get("/api/films/:id/music.wav", wrap(async (req, res) => {
    const f = await mustFilm(req.params.id);
    if (!f.music) throw Object.assign(new Error("This film has no music"), { status: 404 });
    res.set("Content-Type", "audio/wav").set("Cache-Control", "public, max-age=3600").send(musicFor(f));
  }));
  // The same film in another format (landscape, vertical, square): the cut is kept, the render starts over.
  app.post("/api/films/:id/format", filmLimit, wrap(async (req, res) => {
    const f = await mustFilm(req.params.id);
    const next = film.cleanFilm({ ...f, format: String(req.body?.format || "16:9") });
    res.json(await filmView(await film.save({ ...f, ...next, render: null })));
  }));
  // The same film recut in another edit style (hype, clean, dream): the set, signs and brand stay.
  app.post("/api/films/:id/style", filmLimit, wrap(async (req, res) => {
    const f = await mustFilm(req.params.id);
    const next = film.restyle(f, String(req.body?.style || "hype"));
    res.json(await filmView(await film.save({ ...f, ...next, render: null })));
  }));
  // One shot's edit, as the inspector changes it: its speed ramp, the cut into it, shake and length.
  const editLimit = rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: "draft-8", legacyHeaders: false });
  app.post("/api/films/:id/shots/:i", editLimit, wrap(async (req, res) => {
    const f = await mustFilm(req.params.id);
    const i = Number(req.params.i);
    if (!Number.isInteger(i) || !f.shots[i]) throw Object.assign(new Error("No such shot"), { status: 404 });
    const b = req.body || {}, s = { ...f.shots[i] };
    for (const k of ["ramp", "cut", "shake", "seconds"]) if (b[k] !== undefined) s[k] = b[k];
    if (b.cut === "cut") delete s.cut;
    const next = film.cleanFilm({ ...f, shots: f.shots.map((x, j) => (j === i ? s : x)) });
    res.json(await filmView(await film.save({ ...f, ...next, render: null })));
  }));
  app.post("/api/films/:id/render", filmLimit, wrap(async (req, res) => {
    const f = await mustFilm(req.params.id);
    if (!(await filmRender.available())) throw Object.assign(new Error("This server can't render MP4s (needs Playwright and ffmpeg). Use the in-browser export."), { status: 503 });
    if (f.render?.status !== "rendering") await film.save(f, { render: { status: "queued", progress: 0, at: new Date().toISOString() } });
    filmRender.enqueue(f.id);
    res.json({ id: f.id, render: (await film.get(f.id)).render });
  }));
  app.get("/api/films/:id/poster.jpg", wrap(async (req, res) => {
    const f = await mustFilm(req.params.id);
    if (!fs.existsSync(filmRender.posterPath(f.id))) throw Object.assign(new Error("No poster yet"), { status: 404 });
    res.set("Cache-Control", "no-cache").sendFile(filmRender.posterPath(f.id));
  }));
  app.get("/api/films/:id/film.mp4", wrap(async (req, res) => {
    const f = await mustFilm(req.params.id);
    if (f.render?.status !== "done" || !fs.existsSync(filmRender.mp4Path(f.id))) throw Object.assign(new Error("Not rendered yet"), { status: 404 });
    res.set("Content-Disposition", `inline; filename="${f.id}.mp4"`).sendFile(filmRender.mp4Path(f.id));
  }));
  // A sign or card as a texture: the 2D asset in the film's brand. Paid assets carry the watermark until licensed.
  app.get("/api/films/:id/art/:ref.png", wrap(async (req, res) => {
    const f = await mustFilm(req.params.id);
    const ref = req.params.ref;
    const s = ref.startsWith("card-") ? f.shots.find((k) => k.id === ref.slice(5))?.card : f.signs.find((k) => k.id === ref);
    if (!s) throw Object.assign(new Error("No such sign"), { status: 404 });
    const a = mustAsset(s.asset);
    const { svg } = await catalog.renderAsync(a, { ...s.knobs, brand: f.brand });
    const out = a.price > 0 && !f.licence ? catalog.watermark(svg, catalog.sizeOf(svg, a.size)) : svg;
    res.set("Content-Type", "image/png").set("Cache-Control", "no-cache").send(await catalog.toPng(out, Math.min(1600, Number(req.query.w) || 1024)));
  }));

  // The registry: import any 3D asset from a URL; a licence makes it real (see server/registry.js).
  app.get("/cdn/runtime.mjs", (req, res) => {
    res.set({ "Content-Type": "text/javascript; charset=utf-8", "Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=300" });
    res.sendFile(new URL("../public/blocks-runtime.js", import.meta.url).pathname);
  });
  for (const f of ["sound-dsp", "sound-runtime"]) app.get(`/cdn/${f}.mjs`, (req, res) => {
    res.set({ "Content-Type": "text/javascript; charset=utf-8", "Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=300" });
    res.sendFile(new URL(`../public/${f}.js`, import.meta.url).pathname, { dotfiles: "allow" }); // a checkout under a dot-directory is still served
  });
  app.get("/cdn/:id.mjs", wrap(async (req, res) => {
    const a = mustAsset(req.params.id);
    if (a.format !== "blocks" && a.format !== "sound") throw Object.assign(new Error(`${a.id} is not importable: only 3D pieces and sounds are`), { status: 404 });
    const licensed = (lic) => (a.format === "sound" ? registry.licensedSoundModule(a, lic) : registry.licensedModule(a, lic));
    res.set({ "Access-Control-Allow-Origin": "*", "Access-Control-Expose-Headers": "PAYMENT-REQUIRED, PAYMENT-RESPONSE", Vary: "Sec-Fetch-Dest, PAYMENT-SIGNATURE" });
    const js = (body) => res.set({ "Content-Type": "text/javascript; charset=utf-8", "Cache-Control": "private, no-store" }).send(body);
    if (req.query.lic) {
      const lic = await commerce.license(String(req.query.lic)).catch((e) => { throw Object.assign(new Error(e.message), { status: e.status === 410 ? 410 : 403 }); });
      if (lic.assetId !== a.id) throw Object.assign(new Error("That license is for a different asset"), { status: 403 });
      return js(licensed(lic));
    }
    if (a.price <= 0) return js(licensed({ token: "free", orderId: "free" }));
    const sig = req.get("PAYMENT-SIGNATURE");
    if (sig) {
      const { lic, response } = await registry.settle(a, sig, { agentName: req.get("X-Agent-Name") });
      res.set("PAYMENT-RESPONSE", response);
      return js(licensed(await commerce.license(lic.token)));
    }
    if (req.get("Sec-Fetch-Dest") === "script") return js(a.format === "sound" ? registry.placeholderSoundModule(a) : await registry.placeholderModule(a));
    const pr = registry.paymentRequired(a);
    res.status(402).set("PAYMENT-REQUIRED", registry.headerOf(pr)).json(pr);
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
  // A licensed sound at any knobs, clean: the licence is to the program, not to one take of it.
  app.get("/api/licenses/:token/render.wav", wrap(async (req, res) => {
    const lic = await commerce.license(req.params.token);
    const a = mustSound(lic.assetId);
    if (!req.query.p) req.query.p = JSON.stringify(lic.knobs || {});
    sendWav(res, await soundOf(req, a, { licensed: true }), a.id);
  }));

  app.get("/api/ledger", wrap(async (req, res) => {
    const rows = await store.list("ledger");
    // A share is paid out only once releaseDuePayouts() has sent its order's batch (payoutHold.status SENT);
    // until the 14-day refund window closes it is held, and a refund cancels it. Having a PayPal email is not enough.
    const hold = Object.fromEntries((await store.list("orders")).map((o) => [o.id, o.payoutHold?.status || null]));
    const byAuthor = {};
    for (const r of rows) {
      const k = r.author;
      byAuthor[k] ||= { author: k, cents: 0, sales: 0, paidOut: 0, held: 0 };
      byAuthor[k].cents += r.cents;
      byAuthor[k].sales += 1;
      if (r.role === "platform") continue;
      if (r.email && hold[r.orderId] === "SENT") byAuthor[k].paidOut += r.cents;
      else if (r.held || (r.email && hold[r.orderId] === "HELD")) byAuthor[k].held += r.cents;
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
  const isCreate = (req) => req.body?.method === "tools/call" && ["create_order", "buy_assets"].includes(req.body?.params?.name);
  // Public evidence page: what the deploy can do and the PayPal objects it has actually produced.
  const numbers = fs.existsSync("docs/numbers.json") ? JSON.parse(fs.readFileSync("docs/numbers.json", "utf8")) : {};
  app.get("/api/status", wrap(async (req, res) => {
    const recent = (rows, n = 12) => rows.sort((a, b) => String(b.createdAt || b.at).localeCompare(String(a.createdAt || a.at))).slice(0, n);
    const orders = await store.list("orders");
    const byStatus = orders.reduce((m, o) => ((m[o.status] = (m[o.status] || 0) + 1), m), {});
    res.set("Cache-Control", "no-cache").json({
      paypalReady: paypalConfigured(), agentReady: kits.plannerReady(), planner: kits.plannerHealth, paypalEnv: "sandbox",
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
    // a kit's or a film's checkout comes back to its page, which claims the licence with its claim token
    const filmId = String(req.query.film || ""), kitId = String(req.query.kit || "");
    res.redirect(kitId ? `/#/kit/${encodeURIComponent(kitId)}` : filmId ? `/#/film/${encodeURIComponent(filmId)}` : `/#/order/${encodeURIComponent(id)}`);
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
