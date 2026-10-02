// Oasis client. Plain modules, hash routing, no build step.
import { BRAND_PRESETS } from "./brands.js";
const $ = (s, el = document) => el.querySelector(s);
const app = $("#app");
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
// Minimal, safe Markdown for agent messages: escape first, then bold and inline code only.
const md = (t) => esc(t).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/`([^`]+)`/g, "<code>$1</code>");
const money = (n) => (n === 0 ? "Free" : `$${Number(n).toFixed(2).replace(/\.00$/, "")}`);
const api = async (path, opts = {}) => {
  const claim = opts.claim ? { "X-Oasis-Claim": opts.claim } : {};
  const r = await fetch(path, { ...opts, headers: { "Content-Type": "application/json", ...claim }, body: opts.body ? JSON.stringify(opts.body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `Request failed (${r.status})`);
  return j;
};
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};
// Claim tokens for orders this browser created; the server shows licences only to their owner.
const claims = {
  get: (id) => store.get("oasis.claims", {})[id],
  set: (id, t) => { if (t) store.set("oasis.claims", { ...store.get("oasis.claims", {}), [id]: t }); },
};
const newOrder = async (items) => { const o = await api("/api/orders", { method: "POST", body: { items } }); claims.set(o.id, o.claimToken); return o.id; };
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("on");
  clearTimeout(toast.t);
  toast.t = setTimeout(() => t.classList.remove("on"), 2200);
}
// ---------- Brand Mode ----------
// A brand is colours by role; every colour knob in the catalogue declares a role, so one brand
// re-skins every asset. Surface and muted are derived, matching server/knobs.js completeBrand.
const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mixHex = (a, b, t) => "#" + hexRgb(a).map((v, i) => Math.round(v + (hexRgb(b)[i] - v) * t).toString(16).padStart(2, "0")).join("").toUpperCase();
function completeBrand(b) {
  const o = { background: "#FFFFFF", ink: "#1C1A17", ...b };
  o.surface ||= mixHex(o.background, o.ink, 0.06);
  o.muted ||= mixHex(o.ink, o.background, 0.55);
  return o;
}
const brandState = { get() { return store.get("oasis.brand", { on: false, ...BRAND_PRESETS[1] }); }, set(v) { store.set("oasis.brand", v); } };
const activeBrand = () => { const b = brandState.get(); return b.on ? b : null; };
const brandParam = (b) => { const { name, on, ...c } = b; return encodeURIComponent(JSON.stringify(c)); };
const presetSlug = (b) => {
  if (!b) return "default";
  const p = BRAND_PRESETS.find((x) => ["background", "ink", "primary", "secondary", "highlight"].every((r) => (x[r] || "").toUpperCase() === (b[r] || "").toUpperCase()) && !b.surface && !b.muted);
  return p ? p.slug : null;
};
/** Card/hero thumbnail: a pre-rendered PNG comp when one exists, else a live render. */
const thumbUrl = (id, knobs = {}, brand = activeBrand()) => {
  const slug = Object.keys(knobs).length ? null : presetSlug(brand);
  return slug && CONFIG.prerendered ? `/prerender/${encodeURIComponent(id)}--${slug}.png` : renderUrl(id, knobs, brand);
};
const renderUrl = (id, knobs = {}, brand = activeBrand()) => {
  // Defaults and preset brands are pre-rendered at build time; only real remixes hit the sandbox.
  const slug = Object.keys(knobs).length ? null : presetSlug(brand);
  if (slug && CONFIG.prerendered) return `/prerender/${encodeURIComponent(id)}--${slug}.svg`;
  const q = [];
  if (Object.keys(knobs).length) q.push(`p=${encodeURIComponent(JSON.stringify(knobs))}`);
  if (brand) q.push(`brand=${brandParam(brand)}`);
  return `/api/assets/${encodeURIComponent(id)}/render.svg${q.length ? "?" + q.join("&") : ""}`;
};
const swatches = (b) => ["background", "ink", "primary", "secondary", "highlight"].map((r) => `<span style="background:${b[r]}"></span>`).join("");

function drawBrandPill() {
  const b = brandState.get();
  const pill = $("#brand-pill");
  pill.classList.toggle("on", b.on);
  pill.innerHTML = `<i class="dots">${swatches(b)}</i>${b.on ? esc(b.name) : "Brand mode"}`;
}
function openBrandPanel() {
  let panel = $("#brand-panel");
  if (panel) { panel.remove(); return; }
  const b = brandState.get();
  panel = document.createElement("div");
  panel.id = "brand-panel";
  panel.className = "brand-panel";
  const roles = [["background", "Background"], ["ink", "Ink"], ["primary", "Primary"], ["secondary", "Secondary"], ["highlight", "Highlight"]];
  panel.innerHTML = `<div class="bp-head"><b>Brand mode</b><label class="bp-on"><input type="checkbox" class="toggle" id="bp-on" ${b.on ? "checked" : ""}/> On</label></div>
    <p class="muted">Set your brand once. Every asset in the catalogue re-renders in it: colour knobs declare roles.</p>
    <div class="bp-presets">${BRAND_PRESETS.map((p, i) => `<button class="swatch-chip ${p.name === b.name ? "on" : ""}" data-bp="${i}" title="${esc(p.name)}">${swatches(p)}</button>`).join("")}</div>
    <input class="bp-name" id="bp-name" value="${esc(b.name)}" maxlength="30" />
    <div class="bp-roles">${roles.map(([r, l]) => `<label><input type="color" data-role="${r}" value="${b[r]}"/>${l}</label>`).join("")}</div>`;
  document.body.appendChild(panel);
  const save = (patch) => { const next = { ...brandState.get(), ...patch }; brandState.set(next); drawBrandPill(); clearTimeout(save.t); save.t = setTimeout(route, 120); };
  panel.querySelector("#bp-on").addEventListener("change", (e) => save({ on: e.target.checked }));
  panel.querySelectorAll("[data-bp]").forEach((btn) => btn.addEventListener("click", () => {
    const p = BRAND_PRESETS[+btn.dataset.bp];
    panel.querySelectorAll("[data-bp]").forEach((x) => x.classList.toggle("on", x === btn));
    panel.querySelector("#bp-name").value = p.name;
    panel.querySelectorAll("[data-role]").forEach((inp) => (inp.value = p[inp.dataset.role]));
    panel.querySelector("#bp-on").checked = true;
    save({ ...p, on: true });
  }));
  panel.querySelector("#bp-name").addEventListener("input", (e) => save({ name: e.target.value || "My brand" }));
  panel.querySelectorAll("[data-role]").forEach((inp) => inp.addEventListener("input", () => { panel.querySelector("#bp-on").checked = true; save({ [inp.dataset.role]: inp.value.toUpperCase(), on: true }); }));
}
const COVER_KINDS = new Set(["background", "pattern", "poster", "illustration"]);
const KIND_LABEL = { icons: "Icon set", ui: "UI component", mockup: "Mockup", illustration: "Illustration", pattern: "Pattern", background: "Background", poster: "Poster", brand: "Brand mark", avatar: "Avatar", shape: "Shape", type: "Type" };
const KINDS = ["icons", "ui", "mockup", "illustration", "pattern", "background", "poster", "brand", "avatar", "shape", "type"];

let CONFIG = { paypalReady: false, agentReady: false };
let CATALOG = [];

// ---------- cart ----------
const cart = {
  items: store.get("oasis.cart", []),
  save() { store.set("oasis.cart", this.items); $("#cart-count").textContent = this.items.length; },
  add(item) { this.items.push(item); this.save(); },
  remove(i) { this.items.splice(i, 1); this.save(); },
  clear() { this.items = []; this.save(); },
  total() { return this.items.reduce((s, i) => s + (i.price || 0), 0); },
};

// ---------- PayPal ----------
let paypalLoading;
function loadPayPal() {
  if (window.paypal) return Promise.resolve(window.paypal);
  if (!CONFIG.paypalClientId) return Promise.reject(new Error("PayPal sandbox is not configured on this server yet."));
  paypalLoading ||= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(CONFIG.paypalClientId)}&currency=USD&intent=capture&components=buttons`;
    s.onload = () => resolve(window.paypal);
    s.onerror = () => reject(new Error("Could not load PayPal."));
    document.head.appendChild(s);
  });
  return paypalLoading;
}

/** Renders PayPal Buttons, following PayPal's standard-integration client (createOrder -> onApprove -> capture). */
async function mountPayPal(el, { createOrder, onDone }) {
  el.innerHTML = "";
  try {
    const paypal = await loadPayPal();
    await paypal
      .Buttons({
        style: { shape: "pill", layout: "vertical", color: "black", label: "pay", height: 46 },
        createOrder,
        async onApprove(data, actions) {
          el.insertAdjacentHTML("beforeend", `<p class="muted" style="text-align:center">Capturing payment…</p>`);
          try {
            const order = await api(`/api/orders/${data.orderID}/capture`, { method: "POST", claim: claims.get(data.orderID) });
            onDone(order);
          } catch (e) {
            if (/INSTRUMENT_DECLINED/.test(e.message)) return actions.restart();
            el.insertAdjacentHTML("beforeend", `<p class="notice">${esc(e.message)}</p>`);
          }
        },
        onError(err) {
          el.insertAdjacentHTML("beforeend", `<p class="notice">PayPal error: ${esc(err?.message || err)}</p>`);
        },
      })
      .render(el);
  } catch (e) {
    el.innerHTML = `<p class="notice">${esc(e.message)}</p>`;
  }
}

// ---------- shared bits ----------
function card(a) {
  const cover = COVER_KINDS.has(a.kind) ? "cover" : "";
  return `<a class="card" href="#/a/${esc(a.id)}">
    <div class="thumb ${cover}"><img loading="lazy" src="${thumbUrl(a.id)}" alt="${esc(a.title)}" />
      <div class="badges">${a.price === 0 ? `<span class="badge free">Free</span>` : ""}${a.forkedFrom ? `<span class="badge fork">Fork</span>` : ""}<span class="badge right">${a.knobCount} knobs</span></div>
    </div>
    <div class="meta"><b>${esc(a.title)}</b><span>${a.price === 0 ? esc(a.kind) : money(a.price)}</span></div>
  </a>`;
}

function setNav(name) {
  document.querySelectorAll(".nav a").forEach((a) => a.classList.toggle("on", a.dataset.nav === name));
}

// ---------- pages ----------
// ---------- home ----------
const SEASONS = ["spring", "summer", "autumn", "winter"];
const TIMES = ["day", "dusk", "night"];
const BENTO = ["oasis-town", "pricing-card", "phone-mockup", "line-icons", "bauhaus-poster", "spot-illustrations", "app-icon"];

function reveal(root) {
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: 0.12 });
  root.querySelectorAll(".reveal").forEach((el, i) => { el.style.transitionDelay = `${(i % 4) * 70}ms`; io.observe(el); });
}

function swapImg(img, src) {
  const pre = new Image();
  pre.onload = () => { img.src = src; };
  pre.src = src;
}

function pageHome() {
  setNav("");
  const town = { season: "spring", time: "day", brand: activeBrand() || BRAND_PRESETS[0] };
  const townUrl = () => {
    const knobs = {};
    if (town.season !== "spring") knobs.season = town.season;
    if (town.time !== "day") knobs.time = town.time;
    return renderUrl("oasis-town", knobs, town.brand);
  };
  const fresh = CATALOG.filter((a) => !BENTO.includes(a.id) && !a.kit).slice(0, 8);
  const townKit = CATALOG.filter((a) => a.kit === "Oasis Town");
  app.innerHTML = `
  <div class="wrap">
    <section class="hero">
      <div>
        <h1>Assets your agent can <em>brand and buy.</em></h1>
        <p class="lede">Design assets built as tiny programs: icons, UI kits, whole towns. Your agent remixes them to your brand. You approve in PayPal.</p>
        <div class="cta">
          <a class="btn primary" href="#/browse">Browse assets</a>
          <a class="btn" href="#/agent">Brief the agent</a>
        </div>
        <a class="askcard" href="#/agent" aria-label="See how the agent asks and you approve">
          <small>The Oasis agent asks</small>
          <b>License 2 remixes · $10</b>
          <span class="capmeter"><i style="width:50%"></i></span>
          <span class="askfoot"><span>$10 of your $20 cap</span><span class="approve-pill">You approve in PayPal</span></span>
        </a>
      </div>
      <div class="stage">
        <img class="town" id="town" src="${townUrl()}" alt="Oasis Town, an isometric street diorama rendered live from its program" />

        <div class="dock" role="toolbar" aria-label="Oasis Town knobs">
          <div class="grp">${SEASONS.map((s) => `<button class="knobbtn ${s === town.season ? "on" : ""}" data-season="${s}">${s}</button>`).join("")}</div>
          <div class="grp">${TIMES.map((t) => `<button class="knobbtn ${t === town.time ? "on" : ""}" data-time="${t}">${t}</button>`).join("")}</div>
          <div class="grp">${BRAND_PRESETS.map((p, i) => `<button class="swatch-chip ${p.slug === (town.brand.slug || "") ? "on" : ""}" data-brand="${i}" title="${esc(p.name)} brand">${swatches(p)}</button>`).join("")}</div>
        </div>
      </div>
    </section>

    <section class="block reveal">
      <p class="eyebrow">Agentic commerce</p>
      <h2 class="title">Your agent shops. You approve.</h2>
      <p class="sub">Brief the Oasis agent, or any agent over MCP. It builds a branded kit, checks every render, and opens a PayPal order only you can pay.</p>
      <div class="flowtrack">
        <div class="flowstep"><h3>Brief</h3><p>“A calm meditation app in deep teal and coral. App icon, hero, pricing card. Under $20.”</p><div class="capchip"><span>Spending cap</span><b>$20</b><small>The server refuses any order above it.</small></div></div>
        <div class="flowstep"><h3>Search and remix</h3><p>One brand across every piece. Muddy render? It remixes again.</p><div class="thumbs"><img src="${thumbUrl("app-icon", {}, BRAND_PRESETS[1])}" alt=""/><img src="${thumbUrl("mesh-gradient", {}, BRAND_PRESETS[1])}" alt=""/></div></div>
        <div class="flowstep"><h3>Kit in the cart</h3><p>Exact remixes, priced by the server, with a reason for each.</p><div class="thumbs"><img src="${thumbUrl("pricing-card", {}, BRAND_PRESETS[1])}" alt=""/><img src="${thumbUrl("beam-avatar", {}, BRAND_PRESETS[1])}" alt=""/></div></div>
        <div class="flowstep paypal"><h3>You pay in PayPal</h3><p>The agent creates the order. Only you can approve it, in PayPal's own window.</p>
          <div class="ordermock"><small>The order note in PayPal</small><p>Requested by the Oasis agent on Oasis, within your $20 cap. You approve; the agent cannot pay.</p><div><span>2 paid licences (2 free items need none)</span><b>$10.00</b></div></div>
          <p class="fine">Capture is verified on the server. Creator royalties go out through Payouts after the 14-day refund window.</p></div>
      </div>
    </section>

    <section class="block reveal">
      <h2 class="title">One brand. Every asset.</h2>
      <p class="sub">Every colour knob in Oasis knows its job: background, ink, primary, highlight. Pick a brand and the whole catalogue re-renders in it.</p>
      <div class="brandbar">${BRAND_PRESETS.map((p, i) => `<button class="swatch-chip ${i === 0 ? "on" : ""}" data-bento="${i}" title="${esc(p.name)}">${swatches(p)}</button>`).join("")}<span class="muted" id="bento-name">${esc(BRAND_PRESETS[0].name)}</span></div>
      <form class="pastebrand" id="pastebrand"><label class="sr-only" for="hexes">Your brand colours</label><input id="hexes" placeholder="Paste your colours: #0E3B43 #F5EBDD #FF7A59" autocomplete="off" /><button class="btn small">Try mine</button><button class="btn small ghost" type="button" id="use-mine" hidden>Use it everywhere</button></form>
      <div class="bento" id="bento">${BENTO.map((id, i) => `<a class="cell c${i + 1} ${["bauhaus-poster", "oasis-town"].includes(id) ? "cover" : ""}" href="#/a/${id}"><img src="${thumbUrl(id, {}, BRAND_PRESETS[0])}" alt="${esc(CATALOG.find((a) => a.id === id)?.title || id)}" /></a>`).join("")}</div>
    </section>

    <section class="block reveal">
      <h2 class="title">Forks pay upstream.</h2>
      <p class="sub">Fork any asset with AI and sell it. Every licence pays the creators it came from through PayPal Payouts: 60% to you, 30% upstream.</p>
      <div class="grid" style="grid-template-columns:repeat(3,1fr)">${["pricing-card", "gilded-deco-tier-0f823929", "lantern-fortune-tier-5b119cb5"].map((id) => { const a = CATALOG.find((x) => x.id === id); return a ? card(a) : ""; }).join("")}</div>
    </section>

    ${townKit.length >= 4 ? `<section class="block reveal">
      <div style="display:flex;align-items:end;justify-content:space-between;gap:16px;flex-wrap:wrap">
        <div><h2 class="title" style="margin:0 0 8px">The Oasis Town kit.</h2><p class="sub" style="margin:0">${townKit.length} dioramas on one grid, one light and one scale, so they sit side by side. Every one takes your brand.</p></div>
        <a class="btn" href="#/browse?kit=Oasis%20Town">Open the kit</a>
      </div>
      <div class="kitrow${townKit.length % 4 && townKit.length % 3 === 0 ? " three" : ""}">${townKit.slice(0, townKit.length % 4 && townKit.length % 3 === 0 ? 9 : 8).map(card).join("")}</div>
    </section>` : ""}

    <section class="block reveal">
      <div style="display:flex;align-items:end;justify-content:space-between;gap:16px;flex-wrap:wrap">
        <h2 class="title" style="margin:0">Fresh from the factory.</h2>
        <a class="btn" href="#/browse">All ${CATALOG.length} assets</a>
      </div>
      <div class="grid" style="margin-top:24px">${fresh.map(card).join("")}</div>
    </section>

    <section class="block split reveal">
      <div>
        <h2 class="title">Plug in any agent.</h2>
        <p class="sub">One MCP endpoint, no key to browse. Claude Code, Cursor or your own agent can search, remix and ask a human to pay.</p>
        <a class="btn" href="#/agents">Connect an agent</a>
      </div>
      <pre class="code">claude mcp add --transport http oasis ${esc(location.origin)}/mcp

&gt; Make me a hero and a pricing card in our
  brand green, then buy the card.

search_assets  remix_asset  create_order
you approve in PayPal  get_order  files</pre>
    </section>
  </div>`;

  const townImg = $("#town");
  const redrawTown = () => swapImg(townImg, townUrl());
  app.querySelectorAll("[data-season]").forEach((b) => b.addEventListener("click", () => { town.season = b.dataset.season; app.querySelectorAll("[data-season]").forEach((x) => x.classList.toggle("on", x === b)); redrawTown(); }));
  app.querySelectorAll("[data-time]").forEach((b) => b.addEventListener("click", () => { town.time = b.dataset.time; app.querySelectorAll("[data-time]").forEach((x) => x.classList.toggle("on", x === b)); redrawTown(); }));
  app.querySelectorAll("[data-brand]").forEach((b) => b.addEventListener("click", () => { town.brand = BRAND_PRESETS[+b.dataset.brand]; app.querySelectorAll("[data-brand]").forEach((x) => x.classList.toggle("on", x === b)); redrawTown(); }));
  app.querySelectorAll("[data-bento]").forEach((b) => b.addEventListener("click", () => {
    const brand = BRAND_PRESETS[+b.dataset.bento];
    app.querySelectorAll("[data-bento]").forEach((x) => x.classList.toggle("on", x === b));
    $("#bento-name").textContent = brand.name;
    $("#bento").querySelectorAll("img").forEach((img, i) => swapImg(img, thumbUrl(BENTO[i], {}, brand)));
  }));
  // Paste any hex colours: darkest → ink, lightest → background, the rest by saturation → primary, secondary, highlight.
  let pasted = null;
  $("#pastebrand").addEventListener("submit", (e) => {
    e.preventDefault();
    const hexes = [...new Set(($("#hexes").value.match(/#?[0-9a-f]{6}\b/gi) || []).map((h) => "#" + h.replace("#", "").toUpperCase()))];
    if (hexes.length < 2) return toast("Paste at least two hex colours, like #0E3B43 #FF7A59");
    const lum = (h) => hexRgb(h).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
    const sat = (h) => { const c = hexRgb(h); return Math.max(...c) - Math.min(...c); };
    const byLum = [...hexes].sort((a, b) => lum(a) - lum(b));
    const ink = byLum[0], background = byLum.at(-1);
    const rest = hexes.filter((h) => h !== ink && h !== background).sort((a, b) => sat(b) - sat(a));
    pasted = completeBrand({ name: "Your brand", background, ink, primary: rest[0] || ink, secondary: rest[1] || mixHex(rest[0] || ink, background, 0.35), highlight: rest[2] || mixHex(rest[0] || ink, "#FFFFFF", 0.45) });
    app.querySelectorAll("[data-bento]").forEach((x) => x.classList.remove("on"));
    $("#bento-name").textContent = "Your brand";
    $("#bento").querySelectorAll("img").forEach((img, i) => swapImg(img, thumbUrl(BENTO[i], {}, pasted)));
    $("#use-mine").hidden = false;
  });
  $("#use-mine").addEventListener("click", () => {
    brandState.set({ ...pasted, on: true });
    toast("Your brand is on. Every asset in the catalogue now renders in it.");
    location.hash = "#/browse";
  });
  reveal(app);
}

function pageBrowse(params) {
  setNav("browse");
  const state = { q: params.get("q") || "", kind: params.get("kind") || "", free: params.get("free") === "1", kit: params.get("kit") || "" };
  const kits = [...new Set(CATALOG.map((a) => a.kit).filter(Boolean))];
  app.innerHTML = `<div class="wrap">
    <div class="crumbs"><h1>Browse</h1><span class="muted">${CATALOG.length} programmable assets</span></div>
    <div class="filters">
      <input class="search" id="q" placeholder="Search: pricing card, sunset poster, icons…" value="${esc(state.q)}" />
      <button class="chip ${state.kind ? "" : "on"}" data-kind="">All</button>
      ${KINDS.filter((k) => CATALOG.some((a) => a.kind === k)).map((k) => `<button class="chip ${state.kind === k ? "on" : ""}" data-kind="${k}">${k}</button>`).join("")}
      <button class="chip ${state.free ? "on" : ""}" id="free">Free only</button>
      ${kits.map((k) => `<button class="chip kitchip ${state.kit === k ? "on" : ""}" data-kit="${esc(k)}">${esc(k)} kit</button>`).join("")}
    </div>
    <div class="grid" id="grid"></div>
  </div>`;
  const draw = () => {
    const terms = state.q.toLowerCase().split(/\s+/).filter(Boolean);
    const list = CATALOG.filter((a) => (!state.kind || a.kind === state.kind) && (!state.free || a.price === 0) && (!state.kit || a.kit === state.kit) && terms.every((t) => (a.title + " " + a.tags.join(" ") + " " + a.description + " " + a.kind).toLowerCase().includes(t)));
    $("#grid").innerHTML = list.length ? list.map(card).join("") : `<div class="empty" style="grid-column:1/-1">Nothing matches. <a href="#/agent">Ask the agent</a> to fork something new.</div>`;
  };
  $("#q").addEventListener("input", (e) => { state.q = e.target.value; draw(); });
  app.querySelectorAll("[data-kind]").forEach((b) => b.addEventListener("click", () => {
    state.kind = b.dataset.kind;
    app.querySelectorAll("[data-kind]").forEach((x) => x.classList.toggle("on", x === b));
    draw();
  }));
  $("#free").addEventListener("click", (e) => { state.free = !state.free; e.target.classList.toggle("on", state.free); draw(); });
  app.querySelectorAll("[data-kit]").forEach((b) => b.addEventListener("click", () => { state.kit = state.kit === b.dataset.kit ? "" : b.dataset.kit; b.classList.toggle("on", !!state.kit); draw(); }));
  draw();
}

function knobControl(name, k, v) {
  const id = `k-${name}`;
  let ctl = "", out = "";
  if (k.type === "color") ctl = `<div class="color"><input type="color" id="${id}" data-k="${name}" value="${esc(v)}" /><span class="mono">${esc(v)}</span></div>`;
  else if (k.type === "range") { ctl = `<input type="range" id="${id}" data-k="${name}" min="${k.min}" max="${k.max}" step="${k.step || (k.max - k.min) / 100}" value="${v}" />`; out = `<output>${v}</output>`; }
  else if (k.type === "choice") {
    ctl = k.options.length <= 5
      ? `<div class="seg" data-k="${name}">${k.options.map((o) => `<button type="button" data-v="${esc(o)}" class="${o === v ? "on" : ""}">${esc(o)}</button>`).join("")}</div>`
      : `<select id="${id}" data-k="${name}">${k.options.map((o) => `<option ${o === v ? "selected" : ""}>${esc(o)}</option>`).join("")}</select>`;
  } else if (k.type === "toggle") ctl = `<input type="checkbox" class="toggle" id="${id}" data-k="${name}" ${v ? "checked" : ""} />`;
  else ctl = `<input type="text" id="${id}" data-k="${name}" value="${esc(v)}" maxlength="${k.maxLength || 80}" />`;
  return `<div class="knob"><label for="${id}" title="${esc(k.describe || "")}">${esc(k.label || name)}</label>${ctl}${out}</div>`;
}

function orderKnobs(knobs) {
  // Display order after Polyfork's PolyforkParams.Remixable: colours first, then choices, then the rest.
  const rank = { color: 0, text: 1, choice: 2, range: 3, toggle: 4 };
  return Object.entries(knobs).sort((a, b) => (rank[a[1].type] ?? 5) - (rank[b[1].type] ?? 5));
}

async function pageAsset(id) {
  setNav("browse");
  app.innerHTML = `<div class="wrap"><div class="crumbs"><span class="spinner"></span></div></div>`;
  let a;
  try { a = await api(`/api/assets/${encodeURIComponent(id)}`); } catch (e) { app.innerHTML = notFound("That asset isn't in the oasis."); return; }
  const defaults = Object.fromEntries(Object.entries(a.knobs).map(([k, v]) => [k, v.default]));
  const values = { ...defaults };
  const brand = activeBrand();
  if (brand) {
    const b = completeBrand(brand);
    for (const [n, role] of Object.entries(a.roles || {})) if (b[role]) values[n] = b[role].toUpperCase();
    const [r, g, bl] = hexRgb(b.background);
    const dark = (r * 299 + g * 587 + bl * 114) / 1000 < 110;
    for (const [n, k] of Object.entries(a.knobs)) if (k.type === "choice" && k.options.includes("light") && k.options.includes("dark")) values[n] = dark ? "dark" : "light";
  }
  let preset = null;
  const diff = () => Object.fromEntries(Object.entries(values).filter(([k, v]) => v !== defaults[k]));
  const presetSwatch = (p) => Object.values(a.presetValues[p] || {}).slice(0, 5).map((c) => `<s style="background:${esc(c)}"></s>`).join("");

  app.innerHTML = `<div class="wrap">
    <div class="crumbs"><a class="btn ghost small" href="#/browse">←</a><h1>${esc(a.title)}</h1>${a.forkedFrom ? `<span class="badge fork">Fork</span>` : ""}<span class="badge">${esc(KIND_LABEL[a.kind] || a.kind)}</span></div>
    <div class="asset">
      <div>
        <div class="viewer">
          <div class="canvas"><img id="view" src="${renderUrl(a.id, Object.fromEntries(Object.entries(values).filter(([k, v]) => v !== defaults[k])), null)}" alt="${esc(a.title)}" /><span class="busy" id="busy"></span></div>
          <div class="vbar"><span class="muted">${a.price > 0 ? "Preview is watermarked until licensed" : "Free · download any remix"}</span>
            <button class="btn small ghost" id="reset">Reset</button>
            <button class="btn small ghost" id="random">Surprise me</button>
            <button class="btn small" id="copylink">Copy remix link</button>
            <button class="btn small primary" id="quickbuy">${a.price > 0 ? `License · ${money(a.price)}` : "Download"}</button>
          </div>
        </div>
      </div>
      <div>
        <div class="panel">
          <h3>Remix <span class="muted" style="text-transform:none;letter-spacing:0;font-weight:400">${Object.keys(a.knobs).length} knobs</span></h3>
          ${brand ? `<p class="brand-note"><i class="dots">${swatches(brand)}</i> In your <b>${esc(brand.name)}</b> brand. <button class="linkish" id="own-colours">Use the asset's own colours</button></p>` : ""}
          ${a.presets.length ? `<div class="presets">${a.presets.map((p) => `<button class="preset" data-preset="${esc(p)}"><i>${presetSwatch(p)}</i>${esc(p)}</button>`).join("")}</div>` : ""}
          <div id="knobs">${orderKnobs(a.knobs).map(([n, k]) => knobControl(n, k, values[n])).join("")}</div>
        </div>
        <div class="panel buy">
          <h3>Licence</h3>
          <div class="price">${money(a.price)}</div>
          <div class="muted" style="font-size:13px">${a.price > 0 ? "One-time commercial licence for this exact remix." : "Free for personal and commercial use."}</div>
          <div class="row">
            ${a.price > 0
              ? `<button class="btn primary" id="addcart">Add remix to cart</button><button class="btn" id="buynow">Buy now</button>`
              : `<a class="btn primary" id="dl-svg">Download SVG</a><a class="btn" id="dl-png">PNG</a><a class="btn" id="dl-jsx">React</a><button class="btn" id="copy-figma" title="Paste straight into a Figma frame">Copy for Figma</button>`}
          </div>
          <div id="buynow-box" style="margin-top:12px"></div>
          <ul>
            <li>Exports: SVG, 2048px PNG, React component, CSS, and the source program</li>
            <li>${esc(a.description)}</li>
            <li>By ${esc(a.author)}${a.credit ? ` · ${esc(a.credit)}` : ""}</li>
          </ul>
        </div>
        <div class="panel fork-form">
          <h3>Fork with AI</h3>
          <p class="muted" style="margin:0 0 10px;font-size:13.5px">Describe a new direction. Claude rewrites the program into a new asset you can sell, and ${esc(a.author)} earns a royalty on every licence.</p>
          <label for="fork-ins" class="fieldlabel">New direction</label><textarea id="fork-ins" placeholder="Art deco, gold line work, a stepped frame"></textarea>
          <div class="two"><label><span class="fieldlabel">Your name</span><input id="fork-author" autocomplete="name" /></label><label><span class="fieldlabel">PayPal email for royalties</span><input id="fork-email" type="email" autocomplete="email" /></label><label><span class="fieldlabel">Price ($)</span><input id="fork-price" type="number" min="0" step="1" value="${Math.max(2, a.price)}" /></label></div>
          <button class="btn palm" id="fork-go" style="width:100%">Fork it</button>
          <div id="fork-status" style="margin-top:10px"></div>
        </div>
      </div>
    </div>
    <div class="below">
        ${Object.keys(a.roles || {}).length ? `<div class="brandstrip"><h3>In a brand</h3><div class="brandrow">${BRAND_PRESETS.map((p, i) => `<button class="brandtile" data-bp="${i}" title="Apply the ${esc(p.name)} brand"><img loading="lazy" src="${thumbUrl(a.id, {}, p)}" alt="${esc(a.title)} in the ${esc(p.name)} brand"/><span><i class="dots">${swatches(p)}</i>${esc(p.name)}</span></button>`).join("")}</div></div>` : ""}
        <div class="useit">
          <h3 style="margin:0;font-size:20px">Use it</h3>
          <div class="tabs" id="tabs">
            ${["React", "SVG", "CSS", "Program", "AI agent"].map((t, i) => `<button class="chip ${i === 0 ? "on" : ""}" data-tab="${t}">${t}</button>`).join("")}
          </div>
          <pre class="code" id="snippet"></pre>
        </div>
        ${a.parent ? `<a class="lineage" href="#/a/${esc(a.parent.id)}"><img src="${renderUrl(a.parent.id)}" alt=""/><div><b>Forked from ${esc(a.parent.title)}</b><div class="muted" style="font-size:13px">${esc(a.parent.author)} earns a royalty on every licence of this fork.</div></div></a>` : ""}
        ${a.children?.length ? `<h3 style="margin:24px 0 10px;font-size:20px">Forks of this asset</h3><div class="grid">${a.children.map(card).join("")}</div>` : ""}
    </div>
  </div>`;

  const view = $("#view"), busy = $("#busy");
  let pending;
  const refresh = () => {
    clearTimeout(pending);
    pending = setTimeout(() => {
      busy.classList.add("on");
      const next = new Image();
      next.onload = next.onerror = () => { view.src = next.src; busy.classList.remove("on"); };
      next.src = renderUrl(a.id, diff(), null);
      updateSnippet();
      updateDownloads();
    }, 60);
  };
  const syncControls = () => {
    $("#knobs").innerHTML = orderKnobs(a.knobs).map(([n, k]) => knobControl(n, k, values[n])).join("");
    bindKnobs();
  };
  function bindKnobs() {
    $("#knobs").querySelectorAll("[data-k]").forEach((el) => {
      const name = el.dataset.k, k = a.knobs[name];
      if (el.classList.contains("seg")) {
        el.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => {
          values[name] = b.dataset.v;
          el.querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b));
          refresh();
        }));
        return;
      }
      el.addEventListener("input", () => {
        if (k.type === "range") { values[name] = Number(el.value); el.parentElement.querySelector("output").textContent = el.value; }
        else if (k.type === "toggle") values[name] = el.checked;
        else if (k.type === "color") { values[name] = el.value.toUpperCase(); el.nextElementSibling.textContent = values[name]; }
        else values[name] = el.value;
        refresh();
      });
    });
  }
  bindKnobs();
  app.querySelectorAll("[data-preset]").forEach((b) => b.addEventListener("click", () => {
    preset = b.dataset.preset;
    Object.assign(values, a.presetValues[preset]);
    app.querySelectorAll("[data-preset]").forEach((x) => x.classList.toggle("on", x === b));
    syncControls();
    refresh();
  }));
  app.querySelectorAll("[data-bp]").forEach((btn) => btn.addEventListener("click", () => {
    const b = completeBrand(BRAND_PRESETS[+btn.dataset.bp]);
    for (const [n, role] of Object.entries(a.roles || {})) if (b[role]) values[n] = b[role].toUpperCase();
    const [r, g, bl] = hexRgb(b.background);
    for (const [n, k] of Object.entries(a.knobs)) if (k.type === "choice" && k.options.includes("light") && k.options.includes("dark")) values[n] = (r * 299 + g * 587 + bl * 114) / 1000 < 110 ? "dark" : "light";
    syncControls();
    refresh();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }));
  $("#own-colours")?.addEventListener("click", (e) => { for (const n of Object.keys(a.roles || {})) values[n] = defaults[n]; e.target.closest(".brand-note").remove(); syncControls(); refresh(); });
  $("#reset").addEventListener("click", () => { Object.assign(values, defaults); syncControls(); refresh(); });
  $("#random").addEventListener("click", () => {
    for (const [n, k] of Object.entries(a.knobs)) {
      if (k.type === "range") values[n] = Math.round((k.min + Math.random() * (k.max - k.min)) / (k.step || 1)) * (k.step || 1);
      if (k.type === "choice") values[n] = k.options[Math.floor(Math.random() * k.options.length)];
    }
    if (a.presets.length) Object.assign(values, a.presetValues[a.presets[Math.floor(Math.random() * a.presets.length)]]);
    syncControls();
    refresh();
  });
  $("#copylink").addEventListener("click", async () => {
    const url = `${location.origin}/#/a/${a.id}?p=${encodeURIComponent(JSON.stringify(diff()))}`;
    try { await navigator.clipboard.writeText(url); toast("Remix link copied"); } catch { toast(url); }
  });

  let tab = "React";
  const updateSnippet = () => {
    const p = JSON.stringify(diff());
    const name = a.title.replace(/[^a-zA-Z0-9]+(.)?/g, (_, c) => (c ? c.toUpperCase() : "")).replace(/^./, (c) => c.toUpperCase());
    const snippets = {
      React: `// ${a.price > 0 ? "After licensing, download" : "Download"} ${a.id}.jsx, then:\nimport ${name} from "./${a.id}.jsx";\n\nexport default function Hero() {\n  return <${name} className="w-full h-auto" aria-label="${a.title}" />;\n}`,
      SVG: `<img src="${a.id}.svg" alt="${a.title}" width="${a.size[0]}" height="${a.size[1]}" />`,
      CSS: `/* ${a.id}.css gives you a ready class */\n<section class="oasis-${a.id}">…</section>`,
      Program: `// The asset is a program. Change any knob and re-render, forever.\nimport render, { params } from "./${a.id}.mjs";\n\nconst svg = render({ ...defaults(params), ...${p} });`,
      "AI agent": `claude mcp add --transport http oasis ${location.origin}/mcp\n\n> remix_asset { "asset_id": "${a.id}", "knobs": ${p} }`,
    };
    $("#snippet").textContent = snippets[tab];
  };
  app.querySelectorAll("[data-tab]").forEach((b) => b.addEventListener("click", () => {
    tab = b.dataset.tab;
    app.querySelectorAll("[data-tab]").forEach((x) => x.classList.toggle("on", x === b));
    updateSnippet();
  }));
  const updateDownloads = () => {
    if (a.price > 0) return;
    const q = `?p=${encodeURIComponent(JSON.stringify(diff()))}`;
    for (const f of ["svg", "png", "jsx"]) { const el = $(`#dl-${f}`); if (el) el.href = `/api/assets/${a.id}/download.${f}${q}`; }
  };
  updateSnippet();
  updateDownloads();
  $("#copy-figma")?.addEventListener("click", async () => {
    // Figma turns pasted SVG markup into editable vector layers.
    try {
      const svg = await (await fetch(`/api/assets/${a.id}/download.svg?p=${encodeURIComponent(JSON.stringify(diff()))}`)).text();
      await navigator.clipboard.writeText(svg);
      toast("Copied. Paste into Figma to get editable layers");
    } catch { toast("Copy failed. Use Download SVG instead"); }
  });

  const item = () => ({ assetId: a.id, title: a.title, price: a.price, knobs: { ...values }, previewUrl: renderUrl(a.id, diff(), null) });
  $("#addcart")?.addEventListener("click", () => { cart.add(item()); toast("Added to cart"); });
  $("#quickbuy").addEventListener("click", () => {
    $(".panel.buy").scrollIntoView({ behavior: "smooth", block: "center" });
    if (a.price > 0 && !$("#buynow-box").childElementCount) $("#buynow").click();
  });
  $("#buynow")?.addEventListener("click", () => {
    const box = $("#buynow-box");
    mountPayPal(box, {
      createOrder: () => newOrder([{ assetId: a.id, knobs: values }]),
      onDone: (order) => (location.hash = `#/order/${order.id}`),
    });
  });

  $("#fork-go").addEventListener("click", async () => {
    const instruction = $("#fork-ins").value.trim();
    if (instruction.length < 3) return toast("Describe the new direction first");
    const btn = $("#fork-go");
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span> Claude is rewriting the program…`;
    $("#fork-status").innerHTML = `<p class="muted" style="font-size:13px">This takes about a minute: the new program is written, then rendered in a sandbox to prove it works.</p>`;
    try {
      const fork = await api(`/api/assets/${a.id}/fork`, { method: "POST", body: { instruction, author: $("#fork-author").value.trim() || "anonymous", payoutEmail: $("#fork-email").value.trim(), price: Number($("#fork-price").value) } });
      CATALOG.unshift(fork);
      location.hash = `#/a/${fork.id}`;
      toast("Fork published");
    } catch (e) {
      $("#fork-status").innerHTML = `<p class="notice">${esc(e.message)}</p>`;
      btn.disabled = false;
      btn.textContent = "Fork it";
    }
  });

  const hp = new URLSearchParams(location.hash.split("?")[1] || "");
  if (hp.get("p")) {
    try { Object.assign(values, JSON.parse(hp.get("p"))); syncControls(); refresh(); } catch {}
  }
}

// ---------- agent ----------
const SUGGESTIONS = [
  "I'm launching Tidepool, a calm meditation app (deep teal, sand, coral). I need an app icon, a hero background, a pricing card and avatars for testimonials. Budget $20.",
  "Brand kit for 'Ember & Oak', a wood-fired pizza place: logo mark, a poster for opening night Oct 24, and a pattern for the menu.",
  "Our fintech dashboard needs stat cards, progress rings and toast notifications in a dark theme with lime accents. Keep it under $15.",
];

function notFound(msg) {
  return `<div class="wrap"><div class="empty-state" style="margin-top:40px"><img src="/api/assets/oasis-town/render.svg?p=${encodeURIComponent(JSON.stringify({ time: "night" }))}" alt="Oasis Town at night" /><div><h2>${esc(msg)}</h2><p>It may have been renamed, or the link has a typo.</p><div class="cta"><a class="btn primary" href="#/browse">Browse assets</a><a class="btn" href="#/">Home</a></div></div></div></div>`;
}

function pageAgent() {
  setNav("agent");
  const session = store.get("oasis.agent", { chatId: null, log: [] });
  app.innerHTML = `<div class="wrap"><div class="agent">
    <div class="chat">
      <div class="log" id="log"></div>
      <form class="composer" id="composer">
        <label class="sr-only" for="input">Your brief</label>
        <textarea id="input" rows="2" placeholder="Describe your brand and what you need"></textarea>
        <label class="cap-field"><span class="fieldlabel">Spending cap</span><span class="cap-input">$<input id="cap" type="number" min="1" max="500" step="1" value="${esc(String(session.cap || 20))}" /></span></label>
        <button class="btn primary" id="send">Send</button>
      </form>
    </div>
    <aside class="board">
      <div class="panel"><h3>Your kit <button class="btn small ghost" id="newchat">New brief</button></h3><div id="kit"></div></div>
      <div class="panel"><h3>Checkout</h3><div id="checkout"><p class="muted" style="margin:0;font-size:13.5px">When the kit is ready the agent opens a PayPal order. You approve the payment. The agent can't.</p></div></div>
    </aside>
  </div></div>`;
  const log = $("#log");
  if (!session.log.length) {
    log.innerHTML = `<div class="agent-intro" id="suggest">
      <img src="${thumbUrl("oasis-town", {}, BRAND_PRESETS[1])}" alt="" />
      <h2>Tell me about your brand.</h2>
      <p>I'll find the assets you need, put them all in your colours, check every render, and open a PayPal order for you to approve.</p>
      ${CONFIG.agentReady ? "" : `<p class="offline">Playing a real recorded run. <button class="btn small" id="watch-replay">Show it again</button></p>`}
      <div class="briefs">${SUGGESTIONS.map((t, i) => `<button class="brief" data-s="${i}"><i class="dots">${swatches(BRAND_PRESETS[[1, 2, 3][i]])}</i><span>${esc(t)}</span></button>`).join("")}</div>
    </div>`;
  }

  let replayKit = null, replayRun = 0;
  const drawKit = () => {
    const items = replayKit || cart.items;
    const total = items.reduce((s, i) => s + i.price, 0);
    $("#kit").innerHTML = items.length
      ? `<div class="kit${items.length >= 4 ? " compact" : ""}">${items.map((i) => `<div class="item" title="${esc(i.title)}"><img src="${esc(i.previewUrl)}" alt="${esc(i.title)}"/><div><span>${esc(i.title)}</span><b>${money(i.price)}</b></div></div>`).join("")}</div><div class="total"><span>Total</span><b>${money(total)}</b></div>${replayKit ? `<div class="replay-actions"><span class="muted">From a recorded run.</span><button class="btn small" id="take-kit">Add this kit to my cart</button></div>` : ""}`
      : `<div class="empty">Remixes the agent picks land here.</div>`;
  };
  drawKit();
  $("#kit").addEventListener("click", (e) => {
    if (!e.target.closest("#take-kit") || !replayKit) return;
    for (const i of replayKit) cart.add({ ...i });
    toast(`${replayKit.length} branded remixes added to your cart`);
  });
  const add = (html, cls) => {
    const d = document.createElement("div");
    d.className = cls;
    d.innerHTML = html;
    log.appendChild(d);
    log.scrollTop = log.scrollHeight;
    return d;
  };
  for (const entry of session.log) add(entry.html, entry.cls);
  const remember = (html, cls) => { if (replayKit) return; session.log.push({ html, cls }); store.set("oasis.agent", session); };

  $("#newchat").addEventListener("click", () => { store.set("oasis.agent", { chatId: null, log: [] }); cart.clear(); pageAgent(); });
  $("#suggest")?.querySelectorAll("button[data-s]").forEach((b) => b.addEventListener("click", () => { $("#input").value = SUGGESTIONS[+b.dataset.s]; $("#input").focus(); }));
  $("#watch-replay")?.addEventListener("click", () => replay());
  if (!CONFIG.agentReady && !session.log.length) setTimeout(() => replay(), 400);
  $("#input").addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); $("#composer").requestSubmit(); } });

  const TOOL_LABEL = { search_assets: (i) => `Searching “${i.query}”`, get_asset: (i) => `Reading ${i.asset_id}`, remix_asset: (i) => `Remixing ${i.asset_id}`, add_to_cart: (i) => `Adding ${i.asset_id} to the kit`, create_order: () => "Opening a PayPal order", fork_asset: (i) => `Forking ${i.asset_id} into something new` };

  // One handler for live streams and recorded replays.
  let bot = null, botText = "", variants = null;
  const flushBot = () => { if (bot && botText.trim()) remember(md(botText.trim()), "msg bot"); bot = null; botText = ""; };
  function handle(ev, data) {
          if (ev === "chat") { session.chatId = data.chatId; store.set("oasis.agent", session); }
          else if (ev === "text") {
            if (!bot) { if (!data.delta.trim()) return; bot = add("", "msg bot"); variants = null; }
            botText += data.delta;
            bot.innerHTML = md(botText.replace(/^\s+/, ""));
            log.scrollTop = log.scrollHeight;
          } else if (ev === "tool") {
            flushBot();
            // Consecutive calls of the same tool collapse into one step: "Remixing · app-icon · mesh-gradient".
            const GROUP = { search_assets: ["Searching", (i) => `“${i.query}”`], get_asset: ["Reading", (i) => i.asset_id], remix_asset: ["Remixing", (i) => i.asset_id], add_to_cart: ["Adding to the kit", (i) => i.asset_id] };
            const g = GROUP[data.name];
            let last = log.lastElementChild;
            if (last?.classList.contains("variant-row") && last.previousElementSibling?.dataset.tool === data.name) last = last.previousElementSibling;
            if (g && last?.dataset.tool === data.name) {
              const item = g[1](data.input || {});
              const seen = (last.seen ||= new Set([last.dataset.first]));
              last.querySelector("span").insertAdjacentHTML("beforeend", ` · ${esc(item)}${seen.has(item) ? " (again)" : ""}`);
              seen.add(item);
              if (last.entry) { last.entry.html = last.innerHTML; if (!replayKit) store.set("oasis.agent", session); }
            } else {
              const html = g ? `<i></i><b>${g[0]}</b><span> · ${esc(g[1](data.input || {}))}</span>` : `<i></i>${esc((TOOL_LABEL[data.name] || ((i) => data.name))(data.input || {}))}`;
              const row = add(html, "toolrow");
              row.dataset.tool = data.name;
              if (g) row.dataset.first = g[1](data.input || {});
              row.entry = { html, cls: "toolrow" };
              if (!replayKit) { session.log.push(row.entry); store.set("oasis.agent", session); }
            }
          } else if (ev === "tool_error") {
            add(`<i></i>${esc(data.message)}`, "toolrow err");
          } else if (ev === "variant") {
            if (!variants) {
              variants = add("", "variant-row");
              variants.entry = { html: "", cls: "variant-row" };
              if (!replayKit) session.log.push(variants.entry);
            }
            variants.insertAdjacentHTML("beforeend", `<a href="#/a/${esc(data.assetId)}?p=${encodeURIComponent(JSON.stringify(data.knobs))}" title="${esc(data.title)}"><img src="${esc(data.previewUrl.replace(/^https?:\/\/[^/]+/, ""))}" alt="${esc(data.title)}"/></a>`);
            variants.entry.html = variants.innerHTML;
            if (!replayKit) store.set("oasis.agent", session);
          } else if (ev === "cart_add") {
            const item = { ...data, previewUrl: data.previewUrl.replace(/^https?:\/\/[^/]+/, "") };
            if (!replayKit) cart.add(item);
            drawKit();
          } else if (ev === "checkout") {
            showCheckout(data);
          } else if (ev === "fork") {
            add(`<i></i>New asset published: <a href="#/a/${esc(data.assetId)}">${esc(data.title)}</a>`, "toolrow");
          } else if (ev === "status") {
            add(`<i></i>${esc(data.message)}`, "toolrow");
          } else if (ev === "error") {
            add(esc(data.message), "notice");
          }
  }

  async function replay() {
    const run = ++replayRun;
    const rec = await api("/replays/tidepool.json");
    if (!document.body.contains(log) || run !== replayRun) return;
    log.innerHTML = "";
    // Open on the payoff: the finished kit and the approval the agent asks for. The log below shows how it got there.
    replayKit = rec.events.filter(([e]) => e === "cart_add").map(([, d]) => ({ ...d, previewUrl: d.previewUrl.replace(/^https?:\/\/[^/]+/, "") }));
    drawKit();
    const cap = 20, total = replayKit.reduce((s, i) => s + i.price, 0);
    $("#checkout").innerHTML = `<div class="approve">
      <p class="approve-head">What the agent asked you to approve</p>
      <ul>${replayKit.map((i) => `<li><span><b>${esc(i.title)}</b>${i.reason ? `<em>${esc(i.reason)}</em>` : ""}</span><b>${money(i.price)}</b></li>`).join("")}</ul>
      <div class="capmeter"><i style="width:${Math.min(100, (total / cap) * 100)}%"></i></div>
      <p class="capnote ok">${money(total)} of your ${money(cap)} cap. The server refuses anything over it.</p>
      <p class="muted" style="font-size:12px;margin:8px 0 0">In a live run the PayPal button appears here and only you can approve it. This server has no PayPal sandbox keys yet, so the recording stops at the order.</p>
    </div>`;
    add(`<i></i>Replay of a real run recorded ${esc(new Date(rec.recorded).toLocaleString())}. Nothing here is staged.`, "toolrow");
    add(esc(rec.brief), "msg user");
    for (const [ev, data] of rec.events) {
      if (!document.body.contains(log) || run !== replayRun) return;
      // The recording was made before this server had PayPal keys; it stops where the PayPal order opens.
      if (ev === "tool" && data.name === "create_order") {
        flushBot();
        add(`<i></i>Opening a PayPal order`, "toolrow");
        add(`<i></i>The recording stops here. In a live run the agent opens the PayPal order now, and you approve it in the Checkout panel. Nothing is charged until you do.`, "toolrow");
        break;
      }
      handle(ev, data);
    }
    flushBot();
    add(`<i></i>End of the recording. <button class="btn small" id="replay-again">Show it again</button>`, "toolrow");
    $("#replay-again")?.addEventListener("click", () => replay());
  }

  $("#composer").addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = $("#input").value.trim();
    if (!text) return;
    $("#input").value = "";
    $("#suggest")?.remove();
    if (replayKit) { replayRun++; replayKit = null; log.innerHTML = ""; drawKit(); }
    const userHtml = esc(text);
    add(userHtml, "msg user");
    remember(userHtml, "msg user");
    $("#send").disabled = true;
    bot = null; botText = ""; variants = null;
    try {
      const res = await fetch("/api/agent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ budget: (session.cap = Number($("#cap").value) || 20), chatId: session.chatId, message: activeBrand() && !session.chatId ? `${text}\n\n(My brand in Oasis Brand Mode: ${JSON.stringify(completeBrand((({ on, ...b }) => b)(activeBrand())))})` : text, cart: cart.items }) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Agent unavailable");
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let idx;
        while ((idx = buf.indexOf("\n\n")) >= 0) {
          const chunk = buf.slice(0, idx);
          buf = buf.slice(idx + 2);
          const ev = chunk.match(/^event: (.+)$/m)?.[1];
          const dataLine = chunk.match(/^data: (.+)$/m)?.[1];
          if (!ev || !dataLine) continue;
          handle(ev, JSON.parse(dataLine));
        }
      }
    } catch (err) {
      add(esc(err.message), "notice");
    } finally {
      flushBot();
      $("#send").disabled = false;
    }
  });

  function showCheckout(order) {
    claims.set(order.orderId, order.claimToken);
    const box = $("#checkout");
    box.innerHTML = `<div class="approve">
      <p class="approve-head">The Oasis agent is asking you to approve</p>
      <ul>${order.items.map((i) => `<li><span><b>${esc(i.title)}</b>${i.reason ? `<em>${esc(i.reason)}</em>` : ""}</span><b>${money(i.price)}</b></li>`).join("")}</ul>
      <div class="total" style="padding:12px 0 8px"><span>Total</span><b>${money(order.total)}</b></div>
      ${order.cap ? `<p class="capnote ${order.total <= order.cap ? "ok" : "notice"}">Within your ${money(order.cap)} cap. The server refuses anything over it.</p>` : ""}
      <div id="pp"></div>
      <p class="muted" style="font-size:12px;margin:8px 0 0">PayPal sandbox order ${esc(order.orderId)}. Only you can approve it.</p>
    </div>`;
    mountPayPal($("#pp"), {
      createOrder: async () => order.orderId,
      onDone: (o) => { cart.clear(); location.hash = `#/order/${o.id}`; },
    });
  }
}

function pageCart() {
  setNav("cart");
  const draw = () => {
    const paid = cart.items.filter((i) => i.price > 0);
    app.innerHTML = `<div class="wrap" style="max-width:820px">
      <div class="crumbs"><h1>Cart</h1></div>
      ${cart.items.length ? cart.items.map((i, n) => `<div class="cart-line"><img src="${esc(i.previewUrl)}" alt=""/><div><b>${esc(i.title)}</b><div class="muted" style="font-size:13px">${esc(i.reason || "Your remix")}</div></div><b>${money(i.price)}</b><button class="btn small ghost rm" data-i="${n}">Remove</button></div>`).join("") : `<div class="empty-state"><img src="${thumbUrl("oasis-town", {}, activeBrand() || BRAND_PRESETS[0])}" alt="" /><div><h2>Your cart is empty.</h2><p>Remix something you like, or let the agent build a whole kit in your brand.</p><div class="cta"><a class="btn primary" href="#/browse">Browse assets</a><a class="btn" href="#/agent">Brief the agent</a></div></div></div>`}
      ${cart.items.length ? `<div class="total"><span>Total</span><b>${money(cart.total())}</b></div>` : ""}
      ${paid.length ? `<div id="pp" style="max-width:420px;margin-left:auto"></div>` : cart.items.length ? `<p class="ok">Everything here is free: download from each asset page.</p>` : ""}
    </div>`;
    app.querySelectorAll(".rm").forEach((b) => b.addEventListener("click", () => { cart.remove(+b.dataset.i); draw(); }));
    if (paid.length)
      mountPayPal($("#pp"), {
        createOrder: () => newOrder(paid.map((i) => ({ assetId: i.assetId, knobs: i.knobs }))),
        onDone: (o) => { cart.clear(); location.hash = `#/order/${o.id}`; },
      });
  };
  draw();
}

async function pageOrder(id) {
  setNav("");
  app.innerHTML = `<div class="wrap" style="max-width:860px"><div class="crumbs"><span class="spinner"></span></div></div>`;
  let o;
  try { o = await api(`/api/orders/${encodeURIComponent(id)}`, { claim: claims.get(id) }); } catch (e) { app.innerHTML = notFound("We couldn't find that order."); return; }
  const done = o.status === "COMPLETED";
  app.innerHTML = `<div class="wrap" style="max-width:860px">
    <div class="crumbs"><h1>${done ? "Licensed." : o.status === "CAPTURE_PENDING" ? "Payment clearing." : "Order " + esc(o.status.toLowerCase())}</h1></div>
    ${done && !o.owner ? `<p class="ok">Paid ${money(o.total)} with PayPal. The files go to whoever created this order: open it in that browser, or the agent that created it collects them with its claim token.</p>` : ""}
    ${done && o.owner ? `<p class="ok">Paid ${money(o.total)} with PayPal${o.payer?.name ? ` by ${esc(o.payer.name)}` : ""} · capture ${esc(o.captureId)}</p>` : done ? "" : o.status === "CAPTURE_PENDING" ? `<p class="notice">PayPal has the payment and is still clearing it${o.pendingReason ? ` (${esc(o.pendingReason.toLowerCase().replace(/_/g, " "))})` : ""}. Your files unlock here the moment it completes.</p>` : o.status === "DENIED" ? `<p class="notice">PayPal declined this payment, so nothing was charged and no budget was used.</p>` : `<p class="notice">This order hasn't been paid yet.</p>`}
    ${(o.licenses || []).map((l) => `<div class="cart-line" style="grid-template-columns:84px 1fr auto"><img src="/api/licenses/${esc(l.token)}/download.svg" alt=""/><div><b>${esc(l.title)}</b><div class="muted mono" style="font-size:11px">licence ${esc(l.token.slice(0, 12))}…</div></div>
      <div class="dl">${["svg", "png", "jsx", "css", "mjs"].map((f) => `<a class="btn small" href="/api/licenses/${esc(l.token)}/download.${f}">${{ svg: "SVG", png: "PNG", jsx: "React", css: "CSS", mjs: "Program" }[f]}</a>`).join("")}<button class="btn small" data-figma="${esc(l.token)}">Copy for Figma</button></div></div>`).join("")}
    ${o.royalties?.length ? `<h3 style="margin:28px 0 8px">Where your money went</h3><table class="table"><tr><th>Asset</th><th>To</th><th>Role</th><th>Amount</th></tr>${o.royalties.map((r) => `<tr><td>${esc(r.title)}</td><td>${esc(r.author)}</td><td>${esc(r.role)}${r.held ? " (held)" : ""}</td><td>${money(r.cents / 100)}</td></tr>`).join("")}</table>
      ${o.payoutBatch ? `<p class="muted" style="font-size:13px">${o.payoutBatch.error ? `Royalty payouts queued: ${esc(o.payoutBatch.error)}` : `PayPal Payouts batch ${esc(o.payoutBatch.id)} sent ${o.payoutBatch.count} royalt${o.payoutBatch.count === 1 ? "y" : "ies"} (${esc(o.payoutBatch.status)}).`}</p>` : ""}` : ""}
  </div>`;
}

document.addEventListener("click", async (e) => {
  const t = e.target.closest("[data-figma]");
  if (!t) return;
  try { await navigator.clipboard.writeText(await (await fetch(`/api/licenses/${t.dataset.figma}/download.svg`)).text()); toast("Copied. Paste into Figma to get editable layers"); } catch { toast("Copy failed. Use the SVG download"); }
});

async function pageCreators() {
  setNav("creators");
  app.innerHTML = `<div class="wrap"><div class="crumbs"><h1>Creators</h1></div><span class="spinner"></span></div>`;
  const led = await api("/api/ledger").catch(() => ({ authors: [], recent: [] }));
  const forks = CATALOG.filter((a) => a.forkedFrom);
  app.innerHTML = `<div class="wrap">
    <div class="crumbs"><h1>Creators</h1></div>
    <div class="split">
      <div class="panel">
        <h3>How forks pay</h3>
        <p style="margin-top:0">Fork any asset with AI and sell it. Every licence pays you and the creators you forked from, through PayPal Payouts once the 14-day refund window closes.</p>
        <div class="chain">${["pricing-card", "gilded-deco-tier-0f823929", "lantern-fortune-tier-5b119cb5"].map((id, i) => { const a = CATALOG.find((x) => x.id === id); return a ? `${i ? '<span class="chain-arrow">fork</span>' : ""}<a class="chain-node" href="#/a/${id}"><img src="${thumbUrl(id)}" alt=""/><b>${esc(a.title)}</b><span>${i === 0 ? "original" : i === 1 ? "fork" : "fork of a fork"}</span></a>` : ""; }).join("")}</div>
        <div class="flow" style="margin-top:12px"><span class="node">$10 licence</span><span class="arrow">=</span><span class="node">$6 fork creator</span><span class="node">$2 parent</span><span class="node">$1 grandparent</span><span class="node">$1 Oasis</span></div>
        <p class="muted" style="font-size:13px;margin-bottom:0">Deeper lineages split the upstream 30%: the parent takes two thirds, older ancestors share the rest.</p>
      </div>
      <div class="panel">
        <h3>Royalty ledger</h3>
        ${led.authors.length ? `<table class="table"><tr><th>Creator</th><th>Sales</th><th>Earned</th></tr>${led.authors.map((r) => `<tr><td>${esc(r.author)}</td><td>${r.sales}</td><td>${money(r.cents / 100)}</td></tr>`).join("")}</table>` : `<div class="empty">No sales yet: be the first.</div>`}
      </div>
    </div>
    <h2 class="title" style="margin-top:40px">Community forks</h2>
    ${forks.length ? `<div class="grid">${forks.map(card).join("")}</div>` : `<div class="empty">No forks yet. Open any asset and press “Fork it”.</div>`}
  </div>`;
}

function pageAgents() {
  setNav("agents");
  const o = location.origin;
  app.innerHTML = `<div class="wrap" style="max-width:900px">
    <div class="crumbs"><h1>For AI agents</h1></div>
    <p style="font-size:17px" class="muted">Oasis is built to be shopped by agents. One MCP endpoint, no key to browse. Payments always come back to a human in PayPal.</p>
    <div class="panel" id="mandate"><h3>Give your agent a budget</h3>
      <p style="margin:0 0 12px">Agents can't create orders on their own say-so. You issue a mandate here; the server holds the balance and refuses any order over what is left. You still approve every payment in PayPal.</p>
      <form id="mandate-form" class="mandate-form">
        <label><span class="fieldlabel">What it's for</span><input name="description" maxlength="300" value="Brand kit for my launch: icons, hero, pricing card" /></label>
        <label><span class="fieldlabel">Budget</span><span class="cap-input">$<input name="max_total_usd" type="number" min="1" max="500" step="1" value="20" /></span></label>
        <label><span class="fieldlabel">Expires</span><select name="expires_in_hours"><option value="1">in 1 hour</option><option value="24" selected>in 24 hours</option><option value="168">in 7 days</option></select></label>
        <button class="btn primary">Issue mandate</button>
      </form>
      <div id="mandate-out"></div>
      <div id="my-mandates"></div>
    </div>
    <div class="panel" id="mcp-live"><h3>Live traffic</h3><p class="muted" style="margin:0">Counting…</p></div>
    <div class="panel"><h3>Claude Code</h3><pre class="code">claude mcp add --transport http oasis ${esc(o)}/mcp</pre></div>
    <div class="panel"><h3>Claude Desktop and claude.ai</h3><p style="margin:0 0 8px">Settings → Connectors → Add custom connector, then paste:</p><pre class="code">${esc(o)}/mcp</pre></div>
    <div class="panel"><h3>Cursor, VS Code and other MCP clients</h3><p style="margin:0 0 8px"><span class="mono">.cursor/mcp.json</span> or your client's MCP config:</p><pre class="code">{
  "mcpServers": {
    "oasis": { "type": "http", "url": "${esc(o)}/mcp" }
  }
}</pre></div>
    <div class="panel"><h3>Tools</h3><table class="table">
      <tr><td class="mono">search_assets</td><td>Find assets by words, kind and price.</td></tr>
      <tr><td class="mono">get_asset</td><td>Typed knob schema and colourway presets.</td></tr>
      <tr><td class="mono">remix_asset</td><td>Render with knobs; returns the image so the agent can judge it.</td></tr>
      <tr><td class="mono">create_order</td><td>PayPal order for remixes; returns an approve link for the human. Needs the human's <span class="mono">mandate</span> token; pass <span class="mono">agent_name</span> too (shown in PayPal's approval screen).</td></tr>
      <tr><td class="mono">get_mandate</td><td>The budget the human gave you, what is left, and the orders charged to it.</td></tr>
      <tr><td class="mono">get_order</td><td>After approval: captures and returns SVG, PNG, React and program downloads. Needs the <span class="mono">claim_token</span> that <span class="mono">create_order</span> returned, so an order ID alone unlocks nothing.</td></tr>
    </table></div>
    <div class="panel"><h3>Plain HTTP</h3><pre class="code">GET ${esc(o)}/llms.txt
GET ${esc(o)}/api/assets?q=pricing&amp;kind=ui
GET ${esc(o)}/api/assets/pricing-card/render.svg?preset=Indigo</pre></div>
    <div class="panel"><h3>What the server enforces</h3><ul class="plain">
      <li>Prices come from the catalogue, never from the agent.</li>
      <li><span class="mono">create_order</span> needs a mandate you issued. The server reserves each order against it, so two orders can't both spend the last dollars, and an agent restating its cap changes nothing.</li>
      <li>At most 10 orders a minute per client and 120 MCP calls a minute; over that, JSON-RPC error <span class="mono">-32029</span>.</li>
      <li>No agent can pay. Every order waits for a human to approve it in PayPal.</li>
      <li>Licensed files go only to the order's creator, proven by a one-time claim token.</li>
    </ul><p style="margin:10px 0 0"><a href="https://github.com/machmoon/oasis/blob/main/docs/mcp-session.md">Read a recorded session</a> of an outside agent shopping by URL alone.</p></div>
  </div>`;
  // Mandates this browser issued: the token never leaves this device except to the agent you give it to.
  const mine = () => store.get("oasis.mandates", []);
  const drawMine = async () => {
    const box = $("#my-mandates");
    if (!box || !mine().length) return;
    const rows = (await Promise.all(mine().map(async ({ id, token }) => ({ token, m: await api(`/api/mandates/${id}`).catch(() => null) })))).filter((r) => r.m);
    box.innerHTML = `<h4 style="margin:18px 0 8px">Your mandates</h4>${rows.map(({ token, m }) => `<div class="mandate-row">
      <div><b>${esc(m.id)}</b> · ${esc(m.natural_language_description)}<br/><span class="muted" style="font-size:13px">${money(m.remaining_usd)} left of ${money(m.budget_usd)} · ${m.revoked_at ? "revoked" : m.expired ? "expired" : "until " + esc(new Date(m.intent_expiry).toLocaleString())}</span>
      ${m.orders.length ? `<ul class="audit">${m.orders.map((o) => `<li><span class="mono">${esc(o.order_id || "pending")}</span> ${money(o.usd)} · ${esc(o.state)} · ${esc(o.agent_name || "an agent")} · ${esc(new Date(o.at).toLocaleString())}</li>`).join("")}</ul>` : `<p class="muted" style="margin:4px 0 0;font-size:12.5px">No orders yet.</p>`}</div>
      ${m.revoked_at || m.expired ? "" : `<button class="btn small" data-revoke="${esc(token)}">Revoke</button>`}</div>`).join("")}`;
    box.querySelectorAll("[data-revoke]").forEach((b) => b.addEventListener("click", async () => {
      await api("/api/mandates/revoke", { method: "POST", body: { token: b.dataset.revoke } });
      toast("Mandate revoked. The agent can't create orders with it any more.");
      drawMine();
    }));
  };
  drawMine();
  $("#mandate-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const out = $("#mandate-out");
    try {
      const { mandate, token } = await api("/api/mandates", { method: "POST", body: { description: f.get("description"), max_total_usd: Number(f.get("max_total_usd")), expires_in_hours: Number(f.get("expires_in_hours")) } });
      out.innerHTML = `<div class="mandate-token"><p style="margin:0 0 8px"><b>Mandate ${esc(mandate.id)}</b> · ${money(mandate.budget_usd)} until ${esc(new Date(mandate.intent_expiry).toLocaleString())}. Give your agent this token. It is shown once.</p>
        <pre class="code" id="mdt">${esc(token)}</pre>
        <p class="muted" style="margin:8px 0 0;font-size:13px">Tell your agent: “Use mandate ${esc(token.slice(0, 12))}… for create_order.” Check what's left at any time with <span class="mono">get_mandate</span>.</p>
        <button class="btn small" id="copy-mdt" type="button">Copy token</button></div>`;
      store.set("oasis.mandates", [{ id: mandate.id, token }, ...mine()].slice(0, 10));
      drawMine();
      $("#copy-mdt").addEventListener("click", async () => { try { await navigator.clipboard.writeText(token); toast("Mandate token copied"); } catch { toast(token); } });
    } catch (err) { out.innerHTML = `<p class="notice">${esc(err.message)}</p>`; }
  });
  api("/api/stats/mcp").then((s) => {
    const box = $("#mcp-live");
    if (!box) return;
    const tools = Object.entries(s.tools).sort((a, b) => b[1] - a[1]);
    const clients = Object.entries(s.clients).sort((a, b) => b[1] - a[1]);
    box.innerHTML = `<h3>Live traffic <span class="muted" style="text-transform:none;letter-spacing:0;font-weight:400">since ${esc(new Date(s.since).toLocaleDateString())}</span></h3>
      <div class="stats3"><div><b>${s.requests}</b><span>MCP requests</span></div><div><b>${Object.values(s.tools).reduce((a, b) => a + b, 0)}</b><span>tool calls</span></div><div><b>${clients.length}</b><span>distinct clients</span></div></div>
      ${tools.length ? `<p class="muted" style="margin:10px 0 0;font-size:13px">${tools.map(([t, n]) => `<span class="mono">${esc(t)}</span> ${n}`).join(" · ")}${clients.length ? `<br/>Clients: ${clients.map(([c, n]) => `${esc(c)} (${n})`).join(", ")}` : ""}</p>` : ""}`;
  }).catch(() => {});
}

async function pageStatus() {
  setNav("status");
  app.innerHTML = `<div class="wrap" style="max-width:1000px"><div class="crumbs"><h1>Proof</h1></div><p class="muted">Loading…</p></div>`;
  const s = await api("/api/status");
  const GH = "https://github.com/machmoon/oasis/blob/main";
  const pill = (on, yes, no) => `<span class="state ${on ? "on" : "off"}">${on ? yes : no}</span>`;
  const when = (t) => (t ? esc(new Date(t).toLocaleString()) : "");
  const table = (rows, cols, empty) => rows.length
    ? `<div class="tablewrap"><table class="table"><tr>${cols.map(([h]) => `<th>${h}</th>`).join("")}</tr>${rows.map((r) => `<tr>${cols.map(([, f]) => `<td>${f(r)}</td>`).join("")}</tr>`).join("")}</table></div>`
    : `<p class="muted" style="margin:0">${empty}</p>`;
  const nokeys = s.paypalReady ? "" : " This deploy has no PayPal sandbox keys yet, so there is nothing to list.";
  app.innerHTML = `<div class="wrap" style="max-width:1000px">
    <div class="crumbs"><h1>Proof</h1></div>
    <p class="muted" style="font-size:17px;margin-top:0">Read live from this server, not typed by hand. Every PayPal object Oasis creates shows up here with its real sandbox ID.</p>
    <div class="stats4">
      <div><span>PayPal sandbox</span>${pill(s.paypalReady, "Connected", "No keys yet")}</div>
      <div><span>Live agent</span>${pill(s.agentReady, "On", "Off (replay)")}</div>
      <div><span>Tests</span><b>${esc(s.tests || "?")}</b><a href="${GH}/docs/PROOF.md">names and output</a></div>
      <div><span>Factory</span><b>${s.factory.published}/${s.factory.builds}</b><a href="${GH}/docs/PROOF.md#factory-v2-verdicts-${s.factory.published}-published-${s.factory.rejected}-rejected-of-${s.factory.builds}">published, every verdict</a></div>
    </div>
    <div class="panel"><h3>PayPal orders <span class="muted" style="text-transform:none;letter-spacing:0;font-weight:400">${s.orders.total} total${Object.keys(s.orders.byStatus).length ? " · " + Object.entries(s.orders.byStatus).map(([k, v]) => `${v} ${esc(k.toLowerCase())}`).join(", ") : ""}</span></h3>
      ${table(s.orders.recent, [["Order", (o) => `<span class="mono">${esc(o.id)}</span>`], ["Status", (o) => esc(o.status)], ["Total", (o) => money(o.total)], ["Requested by", (o) => esc(o.agentName || "a person") + (o.cap ? ` · cap ${money(o.cap)}` : "")], ["Capture", (o) => `<span class="mono">${esc(o.captureId || "")}</span>`], ["Royalties", (o) => esc(o.payoutBatch || o.payoutHold || "")], ["Created", (o) => when(o.createdAt)]], "No orders yet." + nokeys)}</div>
    <div class="panel"><h3>Webhook events</h3><p class="muted" style="margin:-4px 0 10px;font-size:13px">Each is checked with PayPal's verify-webhook-signature API before anything is trusted. Rejected ones are logged too.</p>
      ${table(s.webhooks, [["Received", (w) => when(w.at)], ["Event", (w) => `<span class="mono">${esc(w.type)}</span>`], ["Resource", (w) => `<span class="mono">${esc(w.resourceId)}</span>`], ["Signature", (w) => pill(w.verified, "verified", "rejected")], ["Effect", (w) => esc(w.result)]], "No webhook deliveries yet." + nokeys)}</div>
    <div class="panel"><h3>Royalty payouts</h3><p class="muted" style="margin:-4px 0 10px;font-size:13px">Held for the 14-day refund window, then sent as one Payouts batch per order. A refund in the window cancels them.</p>
      ${table(s.payouts, [["Item", (p) => `<span class="mono">${esc(p.ref)}</span>`], ["Status", (p) => esc(p.status)], ["PayPal item", (p) => `<span class="mono">${esc(p.itemId || "")}</span>`], ["Updated", (p) => when(p.at)]], "No payouts yet. The first ones release 14 days after the first captured sale of a fork.")}</div>
    <div class="panel"><h3>Agents over MCP <span class="muted" style="text-transform:none;letter-spacing:0;font-weight:400">since ${when(s.mcp.since)}</span></h3>
      <div class="stats3"><div><b>${s.mcp.requests}</b><span>requests</span></div><div><b>${Object.values(s.mcp.tools).reduce((a, b) => a + b, 0)}</b><span>tool calls</span></div><div><b>${Object.keys(s.mcp.clients).length}</b><span>distinct clients</span></div></div>
      <p class="muted" style="margin:10px 0 0;font-size:13px">${Object.entries(s.mcp.tools).map(([t, n]) => `<span class="mono">${esc(t)}</span> ${n}`).join(" · ") || "No tool calls yet."} <a href="${GH}/docs/mcp-session.md">Read a recorded outside-agent session</a>.</p></div>
    <p class="muted" style="font-size:13px">How the payment path works, with code references: <a href="${GH}/PAYPAL.md">PAYPAL.md</a>.</p>
  </div>`;
}

// ---------- router ----------
async function route() {
  const [path, query] = location.hash.slice(1).split("?");
  const params = new URLSearchParams(query || "");
  const parts = (path || "/").split("/").filter(Boolean);
  window.scrollTo(0, 0);
  if (!parts.length) return pageHome();
  if (parts[0] === "browse") return pageBrowse(params);
  if (parts[0] === "a" && parts[1]) return pageAsset(decodeURIComponent(parts[1]));
  if (parts[0] === "agent") return pageAgent();
  if (parts[0] === "cart") return pageCart();
  if (parts[0] === "order" && parts[1]) return pageOrder(decodeURIComponent(parts[1]));
  if (parts[0] === "creators") return pageCreators();
  if (parts[0] === "agents") return pageAgents();
  if (parts[0] === "status") return pageStatus();
  pageHome();
}

$("#brand-pill").addEventListener("click", openBrandPanel);
addEventListener("scroll", () => $("#top").classList.toggle("scrolled", scrollY > 8), { passive: true });
addEventListener("hashchange", route);
(async () => {
  cart.save();
  drawBrandPill();
  [CONFIG, CATALOG] = await Promise.all([api("/api/config"), api("/api/assets")]);
  const FEATURED = ["retro-sunset-poster", "pricing-card", "desert-oasis-scene", "phone-mockup", "bauhaus-poster", "line-icons", "spot-illustrations", "bento-grid", "terrazzo-pattern", "geometric-logo-mark"];
  const rank = (a) => { const i = FEATURED.indexOf(a.id); return i < 0 ? FEATURED.length + (a.forkedFrom ? 0 : 1) : i; };
  CATALOG.sort((a, b) => rank(a) - rank(b));
  route();
})();
