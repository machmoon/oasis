// Oasis: a registry of sounds as code. A human approves one PayPal budget; agents license every sound they import
// and each creator is paid. Pages: home, sounds, sound, kits, kit, budget, ledger. The 3D kit and the film studio
// stay reachable (#/kit, #/studio) but are off the nav.
import { leaveStudio } from "/studio.js"; // the studio page is retired; leaveStudio still tidies anything it left behind
import { pageKit as page3dKit, pageAsset, pageSounds } from "/kit.js";
import { pageKits, pageKit } from "/kits.js";
import { themed, avatar } from "/wave.js";

const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const usd = (n) => `$${Number(n || 0).toFixed(2)}`;
const price = (n) => (Number(n) === 0 ? "Free" : usd(n));
const app = $("#app");
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

async function api(path, { method = "GET", body, headers = {} } = {}) {
  const r = await fetch(path, { method, headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...headers }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(j.error || `Request failed (${r.status})`), { status: r.status });
  return j;
}
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("on");
  clearTimeout(toast.t);
  toast.t = setTimeout(() => t.classList.remove("on"), 2600);
}
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};
const icon = (name) => `<i class="ph-bold ph-${name}" aria-hidden="true"></i>`;
const thumb = (id, w = 360) => themed(`/api/assets/${encodeURIComponent(id)}/render.png?w=${w}`);

// Entrance: each block rises once when it scrolls into view (IntersectionObserver, no scroll listeners).
const io = "IntersectionObserver" in window ? new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: 0.12 }) : null;
function rise(root = app) { root.querySelectorAll(".rise").forEach((el) => (io && !reduced ? io.observe(el) : el.classList.add("in"))); }

let viewers = [];
function disposeViewers() { viewers.forEach((v) => v.dispose()); viewers = []; }

let CATALOG = null;
async function catalog() {
  if (!CATALOG) CATALOG = (await api("/api/assets")).filter((a) => a.format === "sound");
  return CATALOG;
}

// ---------- home ----------
// The home page lives in home.js: the hero is the product running in the live runtime (a street assembling in clay,
// rebuilt by its knobs, painted by a PayPal order), then the live piece, the bill, the agent command and the kit.
async function pageHome() {
  const { pageHome: home } = await import("/home.js");
  await home(app, { api, esc, usd, price, icon, thumb, catalog, drawSales, viewers, reduced, rise, toast });
}

async function drawKit(el, { limit = 12 } = {}) {
  const list = (await catalog()).filter((a) => a.author !== "oasis" || a.price > 0).slice(0, limit);
  el.innerHTML = list.map((a) => `<a class="piece" href="#/a/${esc(a.id)}"><span class="sheet"><img src="${thumb(a.id)}" alt="${esc(a.title)}" loading="lazy" width="360" height="360"></span><div><b>${esc(a.title)}</b><em>${price(a.price)}</em><span>${esc(a.author)}</span></div></a>`).join("");
  // the sheet shimmers until its render arrives, then the picture fades in (cached renders are in at once)
  el.querySelectorAll(".sheet img").forEach((img) => { const on = () => img.parentElement.classList.add("in"); img.complete && img.naturalWidth ? on() : img.addEventListener("load", on, { once: true }); img.addEventListener("error", on, { once: true }); });
}

// ---------- sales and creators (shared by home and ledger) ----------
// A row reads the way a payments list does (Stripe Dashboard's payments table, Gumroad's sales): the amount and its
// status lead, then what was bought, then who was paid, then the reference. No made-up avatar.
// One order as a row of a Stripe Dashboard payments table: date, what was bought, amount, status, the PayPal order;
// the split and the capture open underneath (a disclosure, as Stripe opens a payment's detail)
function saleRow(s, fresh = false) {
  const names = s.items.map((i) => i.title);
  const list = names.length > 3 ? `${names.slice(0, 3).join(", ")} and ${names.length - 3} more` : names.join(", ");
  const held = s.payoutAfter && new Date(s.payoutAfter) > new Date(), day = (d) => new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const status = s.payout === "SENT" ? "Paid out" : held ? `Held until ${day(s.payoutAfter)}` : s.payout === "WAITING_FOR_EMAIL" ? "Waiting for payout emails" : "Held";
  return `<details class="sale-row${fresh ? " new" : ""}"><summary>
    <span class="sr-date">${s.at ? esc(day(s.at)) : ""}</span>
    <span class="sr-what">${s.kit ? `<a href="#/kit/${esc(s.kit.id)}">${esc(s.kit.title)}</a> <small>${s.kit.parts || names.length} sounds</small>` : esc(list)}${s.funded ? ` <small class="sale-st agent">agent, on a budget</small>` : ""}</span>
    <b class="sr-amt num">${usd(s.total)}</b>
    <span class="sr-st${s.payout === "SENT" ? " ok" : ""}" ${s.repeated ? `title="This early order billed a repeated program more than once, before kits charged each program once"` : ""}>${esc(status)}</span>${s.refunded?.length ? `<span class="sr-st warn">Partially refunded ${usd(s.refunded.reduce((a, r) => a + r.usd, 0))} · ${esc(s.refunded.map((r) => r.id).join(", "))}</span>` : s.repeated ? `<span class="sr-st warn">${usd(s.repeated)} of repeated parts · refund pending</span>` : ""}
    <code class="sr-id">${esc(s.orderId)}</code></summary>
    <div class="sr-more"><div>${s.creators.map((c) => `<span><a href="#/creator/${encodeURIComponent(c.author)}">${esc(c.author)}</a> receives <b class="num">${usd(c.usd)}</b></span>`).join("")}</div><div class="ids">PayPal order ${esc(s.orderId)}${s.captureId ? ` · capture ${esc(s.captureId)}` : ""}</div></div></details>`;
}
function creatorTotals(sales) {
  const t = {};
  for (const s of sales) for (const c of s.creators) t[c.author] = (t[c.author] || 0) + c.usd;
  return Object.entries(t).sort((a, b) => b[1] - a[1]);
}
async function drawSales({ limit = 6, empty = null, after = null } = {}) {
  let sales = await api("/api/sales").catch(() => []);
  const paint = (bump = []) => {
    if (!$("#sales")) return; // the visitor has left the ledger
    $("#sales").innerHTML = sales.length ? sales.slice(0, limit).map((s, i) => saleRow(s, i === 0 && bump.length)).join("")
      : empty || `<div class="empty"><h3>No agent has bought anything yet.</h3><p>Give an agent a budget and ask it to build a scene. Its purchase shows up here the moment PayPal completes it.</p><a class="btn" href="#/budget">Give your agent a budget</a></div>`;
    const totals = creatorTotals(sales);
    $("#creators").innerHTML = totals.length ? totals.map(([a, v]) => `<div class="creator"><div><b><a href="#/creator/${encodeURIComponent(a)}">${esc(a)}</a></b></div><div class="earn${bump.includes(a) ? " bump" : ""}">${usd(v)}</div></div>`).join("")
      : "";
    $("#creators").hidden = !totals.length;
    $("#sales").closest(".ledger")?.classList.toggle("solo", !totals.length);
    after?.(sales, bump);
  };
  paint();
  feed((s) => { sales = [s, ...sales]; paint(s.creators.map((c) => c.author)); });
  return sales.length;
}
let source = null;
function feed(onSale) {
  source?.close();
  source = new EventSource("/api/feed");
  source.addEventListener("sale", (e) => onSale(JSON.parse(e.data)));
}

// ---------- the pay pages: budget, budget view, ledger ----------
// Their stylesheet (/pay.css) loads on first use, the way the Studio loads its own.
function payCss() {
  if (document.getElementById("pay-css")) return;
  const l = document.createElement("link"); l.id = "pay-css"; l.rel = "stylesheet"; l.href = "/pay.css"; document.head.appendChild(l);
}
const pkNote = (kind, ic, title, text, acts = "") => `<div class="pk-note ${kind}">${icon(ic)}<b>${esc(title)}</b><p>${esc(text)}</p>${acts ? `<div class="acts">${acts}</div>` : ""}</div>`;
/** A segmented control (cult-ui halo-segmented): one thumb slides under the pressed button. Returns a getter. */
function segment(el, { value, onChange } = {}) {
  let th = el.querySelector(".thumb");
  if (!th) { th = document.createElement("i"); th.className = "thumb"; th.setAttribute("aria-hidden", "true"); el.prepend(th); }
  const place = () => { const on = el.querySelector("button.on"); if (!on) return; th.style.width = `${on.offsetWidth}px`; th.style.transform = `translateX(${on.offsetLeft}px)`; };
  const set = (v) => { el.querySelectorAll("button").forEach((b) => { const on = b.dataset.v === String(v); b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); }); place(); };
  el.addEventListener("click", (e) => { const b = e.target.closest("button[data-v]"); if (!b) return; set(b.dataset.v); onChange?.(b.dataset.v); });
  if (value !== undefined) set(value); else place();
  requestAnimationFrame(place);
  addEventListener("resize", place, { passive: true });
  return () => el.querySelector("button.on")?.dataset.v;
}

async function pageBudget(id) {
  if (id) return pageBudgetView(id);
  payCss();
  const last = store.get("oasis.budget");
  app.innerHTML = `<div class="wrap split2 pk">
    <div>
      <h1>New budget</h1>
      <p class="lede">You approve once in PayPal. Your agent can then license sounds and kits up to this amount, and nothing more.</p>
      <dl class="pk-kv">
        <dt>Charged</dt><dd>Only when the agent buys, one PayPal order per kit</dd>
        <dt>Cap</dt><dd>Enforced by Oasis before PayPal is called</dd>
        <dt>Stop</dt><dd>Revoke it from the budget's own page (you land there after PayPal); the token stops working at once</dd>
      </dl>
      ${last ? `<p style="margin-top:28px"><a class="link" href="#/budget/${esc(last.id)}">Open your last budget</a></p>` : ""}
    </div>
    <form class="pk-panel" id="bform" novalidate>
      <div class="pk-field"><label id="amt-l">Amount</label><div class="pk-seg wide" id="amts" role="group" aria-labelledby="amt-l">${[10, 25, 50, 100].map((n) => `<button type="button" data-v="${n}" class="num">$${n}</button>`).join("")}</div></div>
      <div class="pk-field"><label for="desc">What is it for?</label><input class="pk-in" type="text" id="desc" maxlength="200" placeholder="Sounds for a rainy city street scene"><span class="help">Shown to you in PayPal and on every receipt.</span></div>
      <div class="pk-field"><label id="hrs-l">Expires after</label><div class="pk-seg wide" id="hours" role="group" aria-labelledby="hrs-l"><button type="button" data-v="24">24 hours</button><button type="button" data-v="72">3 days</button><button type="button" data-v="168">7 days</button></div></div>
      <div class="pk-err" id="berr" role="alert"></div>
      <button class="btn primary pk-go" id="bgo" type="submit">Continue to PayPal</button>
    </form></div>`;
  const amount = segment($("#amts"), { value: 25 }), hours = segment($("#hours"), { value: 24 });
  $("#bform").addEventListener("submit", async (e) => {
    e.preventDefault();
    const b = $("#bgo");
    b.setAttribute("aria-busy", "true"); b.innerHTML = `<span class="pk-spin" aria-hidden="true"></span> Opening PayPal…`;
    $("#berr").innerHTML = "";
    try {
      const r = await api("/api/budgets", { method: "POST", body: { usd: Number(amount()), description: $("#desc").value, hours: Number(hours()) } });
      store.set("oasis.budget", { id: r.mandate.id, token: r.token });
      location.href = r.approveUrl;
    } catch (err) {
      $("#berr").innerHTML = pkNote("err", "warning", err.status === 503 ? "PayPal is not connected on this server" : "PayPal could not open the approval", err.message);
      b.removeAttribute("aria-busy"); b.innerHTML = `Continue to PayPal`;
    }
  });
}

async function pageBudgetView(id) {
  payCss();
  app.innerHTML = `<div class="wrap split2 pk"><div class="pk-stack"><div class="pk-sk line" style="width:120px"></div><div class="pk-sk big"></div><div class="pk-sk line" style="width:70%"></div><div class="pk-sk line" style="width:45%"></div></div><div class="pk-panel pk-stack"><div class="pk-sk title"></div><div class="pk-sk line"></div><div class="pk-sk row"></div><div class="pk-sk btn"></div></div></div>`;
  let m;
  try { m = await api(`/api/mandates/${encodeURIComponent(id)}`); } catch { return notFound("That budget doesn't exist."); }
  const mine = store.get("oasis.budget");
  const token = mine?.id === id ? mine.token : null;
  const live = m.funding?.state === "active" && !m.revoked_at && !m.expired;
  const host = location.origin;
  const state = m.revoked_at ? ["off", "x-circle", "Revoked"] : m.expired ? ["off", "clock", "Expired"] : live ? ["live", "seal-check", "Approved in PayPal"] : ["", "hourglass", "Waiting for PayPal approval"];
  const spent = m.orders.filter((o) => o.state === "spent");
  app.innerHTML = `<div class="wrap split2 pk">
    <div>
      <span class="pk-state ${state[0]}">${icon(state[1])} ${state[2]}</span>
      <div class="pk-money"><b class="num">${usd(m.remaining_usd)}</b><span class="num">left of ${usd(m.budget_usd)}</span></div>
      <p class="lede">${esc(m.natural_language_description)}</p>
      <dl class="pk-kv">
        <dt>Paid from</dt><dd>${esc(m.funding?.payer || "Your PayPal account, once approved")}</dd>
        <dt>Spent</dt><dd class="num">${usd(m.spent_usd)} in ${spent.length} order${spent.length === 1 ? "" : "s"}</dd>
        <dt>Expires</dt><dd>${new Date(m.intent_expiry).toLocaleString()}</dd>
      </dl>
      <div class="pk-col-h" style="margin-top:36px">Orders <span>${m.orders.length ? `${m.orders.length} so far` : ""}</span></div>
      ${m.orders.length
        ? `<div class="pk-orders">${m.orders.map((o) => `<div class="pk-order ${o.state}"><b>${esc(o.agent_name || "Agent")} ${o.state === "spent" ? "paid" : o.state === "held" ? "is paying" : "was refused or refunded"}</b><span class="ids">PayPal order ${esc(o.order_id || "pending")}</span><span class="amt num">${usd(o.usd)}</span></div>`).join("")}</div>`
        : pkNote("", "robot", "No orders yet", live ? "Point your agent at the MCP server and it will buy inside this budget. Each order shows up here the moment PayPal completes it." : "Orders appear here once the budget is approved and an agent buys inside it.")}
    </div>
    <div class="pk-panel">
      ${!live && !m.revoked_at && !m.expired && m.funding?.approve_url ? `<h3>One step left</h3><p class="muted">Approve the budget in PayPal so your agent can use it.</p><a class="pk-pp" style="margin-top:14px" href="${esc(m.funding.approve_url)}">Approve with <em>Pay<b>Pal</b></em></a><div class="pk-sep"></div>` : ""}
      ${token ? `<h3>Give this to your agent</h3><p class="muted" style="margin:6px 0 14px">Treat it like a password. Only you can see it, in this browser.</p>
        <div class="pk-secret"><span id="tok">${esc(token)}</span><button class="pk-b sm" id="copy" type="button">${icon("copy")} Copy</button></div>
        <h3 style="margin-top:24px">Connect Claude Code</h3>
        <div class="pk-code">claude mcp add --transport http oasis ${esc(host)}/mcp</div>
        ${m.revoked_at ? "" : `<div class="pk-sep"></div><button class="pk-b danger" id="revoke" type="button">${icon("prohibit")} Revoke this budget</button><p class="muted" style="font-size:13px;margin:10px 0 0">The token stops working at once. Orders already captured stay paid.</p>`}`
      : pkNote("", "key", "The token lives in the browser that made this budget", "It was shown once, there. Open this page in that browser to see it, or make a new budget.", `<a class="pk-b sm" href="#/budget">New budget</a>`)}
    </div></div>`;
  $("#copy")?.addEventListener("click", async () => { try { await navigator.clipboard.writeText(token); toast("Token copied"); } catch { toast("Select the token and copy it"); } });
  // revoke in two presses: the first arms the button, the second does it (no modal)
  let armed = false;
  $("#revoke")?.addEventListener("click", async () => {
    const b = $("#revoke");
    if (!armed) { armed = true; b.classList.add("arm"); b.innerHTML = `${icon("prohibit")} Revoke for good?`; setTimeout(() => { if (armed) { armed = false; b.classList.remove("arm"); b.innerHTML = `${icon("prohibit")} Revoke this budget`; } }, 4000); return; }
    b.setAttribute("aria-busy", "true"); b.innerHTML = `<span class="pk-spin" aria-hidden="true"></span> Revoking…`;
    try { await api("/api/mandates/revoke", { method: "POST", body: { token } }); toast("Revoked. The token no longer works."); pageBudgetView(id); }
    catch (e) { toast(e.message); armed = false; b.removeAttribute("aria-busy"); b.classList.remove("arm"); b.innerHTML = `${icon("prohibit")} Revoke this budget`; }
  });
}

// ---------- ledger ----------
async function pageLedger() {
  payCss();
  app.innerHTML = `<div class="wrap pk" style="padding-block:48px 96px">
    <div class="head"><h1>Ledger</h1><p>Every captured PayPal order and each creator's share of it, held for the 14-day refund window, then paid out to the creator's PayPal email once one is set.</p></div>
    <dl class="pk-bal two" id="stats"><div><dt>Held for creators</dt><dd class="num" id="st-held">–</dd><dd class="pk-stat-sub">from <b class="num" id="st-orders">–</b> PayPal orders for <b class="num" id="st-creators">–</b> creators<span id="st-pending"></span><span hidden id="st-paid"></span></dd></div><div><dt>Paid out</dt><dd class="num" id="st-out">–</dd><dd class="pk-stat-sub">with PayPal Payouts</dd></div></dl>
    <div class="ledger">
      <div><div class="pk-col-h">Orders <span class="pk-live"><i aria-hidden="true"></i>live</span></div><div class="sales" id="sales"><div class="pk-stack" style="padding:12px 16px"><div class="pk-sk row"></div><div class="pk-sk row"></div><div class="pk-sk row"></div></div></div></div>
      <div><div class="pk-col-h" id="cr-h">Creators <span>earned so far</span></div><div class="creators" id="creators"><div class="pk-stack"><div class="pk-sk row"></div><div class="pk-sk row"></div></div></div></div>
    </div></div>`;
  const empty = pkNote("empty", "receipt", "Nothing has been paid for yet", "Make a kit and license it, or give an agent a budget and let it buy. Every order lands here the moment PayPal completes it.", `<a class="pk-b sm" href="#/kits">${icon("squares-four")} Make a kit</a><a class="pk-b sm" href="#/budget">${icon("wallet")} Give an agent a budget</a>`);
  drawSales({ limit: 40, empty, after: (sales, bump) => {
    const paid = sales.reduce((a, s) => a + s.creators.reduce((x, c) => x + c.usd, 0), 0);
    const who = new Set(sales.flatMap((s) => s.creators.map((c) => c.author)));
    const set = (id, v) => { const el = $(id); if (!el) return; el.textContent = v; if (bump.length) { el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump"); } };
    set("#st-paid", usd(paid)); set("#st-orders", String(sales.length)); set("#st-creators", String(who.size));
    // money the ledger holds but owes back: the creators' 90% of lines an early order billed twice, until refunded
    const owed = sales.reduce((t, s) => t + (s.refunded?.length ? 0 : (s.repeated || 0) * 0.9), 0);
    if ($("#st-pending")) $("#st-pending").textContent = owed ? `; ${usd(owed)} of it goes back to a buyer once the pending refund runs` : "";
    if (!$("#cr-h")) return; // the visitor has left the ledger
    $("#cr-h").hidden = !who.size;
    // what has actually left as Payouts and what is still held in the refund window, from the ledger itself
    api("/api/ledger").then((l) => {
      const out = l.authors.filter((a) => a.author !== "oasis").reduce((s, a) => s + a.paidOut, 0) / 100, held = l.authors.reduce((s, a) => s + a.held, 0) / 100;
      if (!$("#st-out")) return;
      $("#st-out").textContent = usd(out); $("#st-held").textContent = usd(held);
    }).catch(() => {});
  } });
}

function notFound(msg) {
  app.innerHTML = `<div class="wrap split2"><div><h1>${esc(msg)}</h1><p class="lede">It may have been removed, or the link has a typo.</p><div class="cta" style="margin-top:24px;display:flex;gap:12px"><a class="btn primary" href="#/sounds">Browse sounds</a><a class="link" href="#/">Home</a></div></div></div>`;
}

// ---------- nav overflow menu (Primer UnderlineNav: a "More" button that opens the links that do not fit) ----------
const moreBtn = $(".nav-more-btn"), moreMenu = $("#nav-more-menu");
function closeMore(focus = false) { moreMenu.hidden = true; moreBtn.setAttribute("aria-expanded", "false"); if (focus) moreBtn.focus(); }
moreBtn.addEventListener("click", () => {
  const open = moreMenu.hidden;
  moreMenu.hidden = !open; moreBtn.setAttribute("aria-expanded", String(open));
  if (open) moreMenu.querySelector("a")?.focus();
});
document.addEventListener("click", (e) => { if (!moreMenu.hidden && !e.target.closest(".nav-more")) closeMore(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !moreMenu.hidden) closeMore(true); });
moreMenu.addEventListener("click", (e) => { if (e.target.closest("a")) closeMore(); });

// ---------- router ----------
let routeSeq = 0;
const STALE = Symbol("stale route");
async function route() {
  const my = ++routeSeq;
  // a page module still loading when the visitor moves on must not paint over the newer page
  const mod = async (path) => { const m = await import(path); if (my !== routeSeq) throw STALE; return m; };
  disposeViewers();
  leaveStudio();
  source?.close();
  const [path] = location.hash.slice(1).split("?");
  const seg = (path || "/").split("/").filter(Boolean);
  const navKey = (seg[0] === "kit" && seg[1]) || seg[0] === "pads" ? "kits" : seg[0] === "a" || seg[0] === "creator" ? "sounds" : seg[0] || "home";
  document.querySelectorAll("[data-nav]").forEach((a) => a.classList.toggle("on", a.dataset.nav === navKey));
  closeMore();
  moreBtn.toggleAttribute("data-current", !!moreMenu.querySelector(`[data-nav="${navKey}"]`));
  window.scrollTo(0, 0);
  // the old page goes at once: a module still loading must not leave the last route on screen under the new nav
  app.innerHTML = `<div class="wrap" aria-busy="true" style="min-height:70vh"></div>`;
  // the browser tab names the page (a history of tabs that all read "Oasis" is a judge's complaint)
  const TITLES = { sounds: "Sounds", kits: "Kits", kit: "Kit", pads: "Pads", a: "Sound", ledger: "Ledger", publish: "Publish", creator: "Creator", agents: "For agents", budget: "Budget", studio: "Studio" };
  document.title = seg.length ? `${TITLES[seg[0]] || "Oasis"} · Oasis` : "Oasis: sound effects you tune, licensed per kit";
  try {
    if (!seg.length) await pageHome();
    else if (seg[0] === "budget") await pageBudget(seg[1]);
    else if (seg[0] === "ledger") await pageLedger();
    else if (seg[0] === "sounds") await pageSounds(app);
    else if (seg[0] === "kits") await pageKits(app);
    else if (seg[0] === "kit" && seg[1]) await pageKit(app, seg[1]);
    else if (seg[0] === "agents") await (await mod("/agents.js")).pageAgents(app);
    else if (seg[0] === "pads" && seg[1]) await (await mod("/pads.js")).pagePads(app, seg[1]);
    else if (seg[0] === "kit") { location.replace("#/kits"); return; } // the old 3D kit is retired; kits are sound kits now
    else if (seg[0] === "a" && seg[1]) await pageAsset(app, seg[1]);
    else if (seg[0] === "publish") await (await mod("/publish.js")).pagePublish(app);
    else if (seg[0] === "creator" && seg[1]) await (await mod("/publish.js")).pageCreator(app, decodeURIComponent(seg[1]));
    else if (seg[0] === "studio" || seg[0] === "film") { location.replace("#/kits"); return; } // the earlier build's film studio is retired (it saved a film on every visit)
    else notFound("That page doesn't exist.");
  } catch (e) {
    if (e === STALE || my !== routeSeq) return; // the visitor has moved on; the newer route owns the page
    console.error(e);
    app.innerHTML = `<div class="wrap split2"><div><h1>Something went wrong.</h1><p class="lede">${esc(e.message)}</p><a class="btn" href="#/">Home</a></div></div>`;
  }
}
addEventListener("hashchange", route);
route();
