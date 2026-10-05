// Oasis: a registry of 3D assets as code. A human approves one PayPal budget; agents license every piece they
// import and each creator is paid. Pages: home, budget, ledger, kit, asset.
import { createViewer, THREE } from "/world3d.js";
import { pageStudio, leaveStudio } from "/studio.js";

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
const thumb = (id, w = 360) => `/api/assets/${encodeURIComponent(id)}/render.png?w=${w}`;

// Entrance: each block rises once when it scrolls into view (IntersectionObserver, no scroll listeners).
const io = "IntersectionObserver" in window ? new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: 0.12 }) : null;
function rise(root = app) { root.querySelectorAll(".rise").forEach((el) => (io && !reduced ? io.observe(el) : el.classList.add("in"))); }

let viewers = [];
function disposeViewers() { viewers.forEach((v) => v.dispose()); viewers = []; }

let CATALOG = null;
async function catalog() {
  if (!CATALOG) CATALOG = (await api("/api/assets")).filter((a) => a.format === "blocks");
  return CATALOG;
}

// ---------- a live street, made of real registry pieces ----------
async function mountStreet(el, { prompt = "a kyoto market street", time = "day", rotate = true } = {}) {
  const v = createViewer(el, { time, autoRotate: rotate && !reduced });
  viewers.push(v);
  const plan = await api("/api/world/plan", { method: "POST", body: { prompt } });
  const keys = [...new Set(plan.placements.map((p) => p.asset + "|" + JSON.stringify(p.knobs)))];
  const { parts } = await api("/api/world/parts", { method: "POST", body: { items: keys.map((k) => ({ asset: k.slice(0, k.indexOf("|")), knobs: JSON.parse(k.slice(k.indexOf("|") + 1)) })) } });
  const byKey = new Map(keys.map((k, i) => [k, parts[i]]));
  v.setTime(plan.time || time);
  plan.placements.forEach((p, i) => {
    const g = v.addPlaced(byKey.get(p.asset + "|" + JSON.stringify(p.knobs)), { at: p.at, rot: p.rot });
    if (!reduced) v.dropIn(g, i * 22);
  });
  const [w, d] = plan.size;
  const box = new THREE.Box3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(w, 7, d));
  const fit = () => { v.frame(box, { fit: 1.05 }); v.fitToRect(box, [0.01, 0.02, 0.99, 0.92]); };
  await new Promise(requestAnimationFrame);
  fit();
  new ResizeObserver(() => fit()).observe(el);
  return { v, plan };
}

// ---------- home ----------
// One story, in the order a judge needs it: the film, the clay that turns to colour when it is paid for, the bill that
// pays every creator in one PayPal order, the agent that can do all of it, and the pieces it is made from.
async function pageHome() {
  app.innerHTML = `
  <section class="wrap hero2">
    <div class="hero2-copy">
      <h1>Brief in. Brand film out.</h1>
      <p class="lede">Oasis cuts a brand film from creators' 3D and 2D assets. One PayPal order pays every creator.</p>
      <div class="cta">
        <a class="btn primary" href="#/studio">Make a film</a>
        <a class="link" href="#pay">How payment works</a>
      </div>
    </div>
    <figure class="hero2-film" id="hero-film"><div class="skel"></div></figure>
  </section>

  <section class="wrap compare-sec">
    <h2>Clay until it is paid for.</h2>
    <p class="lede">Every paid piece renders as clay and every sign is watermarked. License the film and the street takes its colours.</p>
    <div class="compare" id="compare" style="--at:50%">
      <img src="/media/street-licensed.jpg" alt="The Momiji Ramen street after licensing, in colour" width="1600" height="900">
      <img class="clay" src="/media/street-clay.jpg" alt="The same street before licensing, in clay" width="1600" height="900">
      <div class="handle" aria-hidden="true"><span>${icon("arrows-left-right")}</span></div>
      <input type="range" min="0" max="100" value="50" id="compare-range" aria-label="Compare the clay preview with the licensed film">
      <span class="cap left">Preview</span><span class="cap right">Licensed</span>
    </div>
  </section>

  <section class="wrap pay" id="pay">
    <div class="pay-copy">
      <h2>One approval pays everyone.</h2>
      <p class="lede">You approve a budget once in PayPal. The Studio, or your agent, buys inside it.</p>
      <dl class="facts">
        <dt>${icon("wallet")} Budget</dt><dd>Approved once with PayPal Vault. It has a cap and an expiry.</dd>
        <dt>${icon("shield-check")} Guardrail</dt><dd>An order over the cap is refused before PayPal is called.</dd>
        <dt>${icon("coins")} Payout</dt><dd>Each creator's share goes out through PayPal Payouts.</dd>
      </dl>
    </div>
    <div class="receipt" id="receipt"><div class="skel" style="height:320px"></div></div>
  </section>

  <section class="wrap sales-sec" id="sales-sec" hidden>
    <h2>Paid by agents.</h2>
    <div class="ledger">
      <div class="sales" id="sales"></div>
      <div class="creators" id="creators"></div>
    </div>
  </section>

  <section class="wrap agents2">
    <div>
      <h2>Agents run the same loop.</h2>
      <p class="lede">Connect Claude Code over MCP. It makes the film, licenses it inside your budget, and you approve nothing twice.</p>
      <a class="btn" href="/llms.txt">Read llms.txt</a>
    </div>
    <div class="code" id="mcp-code"></div>
  </section>

  <section class="wrap kit-sec">
    <h2>Made from creators' pieces.</h2>
    <div class="kit" id="kit"></div>
  </section>`;

  const host = location.origin;
  $("#mcp-code").innerHTML = `<span class="c"># connect once</span>
claude mcp add --transport http oasis ${esc(host)}/mcp

<span class="c"># then ask in plain words</span>
<span class="s">"Make a 15-second teaser for Momiji Ramen on a
 Kyoto street at dusk and license it. Budget: mdt_…"</span>

<span class="c"># what it calls</span>
make_film   get_film   buy_assets   get_budget`;

  // the compare slider: the clay image is clipped to the left of the handle
  const cmp = $("#compare"), range = $("#compare-range");
  range.addEventListener("input", () => cmp.style.setProperty("--at", `${range.value}%`));

  // the film: the latest rendered film in colour, else any rendered film, else the street it would be shot in
  const films = await api("/api/films").catch(() => []);
  const best = films[0] || null;
  const hero = $("#hero-film");
  if (best) {
    hero.innerHTML = `<div class="frame"><img src="${esc(best.poster)}" alt="" onerror="this.remove()"><video src="${esc(best.mp4)}" poster="${esc(best.poster)}" autoplay muted loop playsinline aria-label="${esc(best.title)}, rendered by the Oasis Studio"></video></div>
      <figcaption><b>${esc(best.title)}</b><span>"${esc(best.brief)}"</span></figcaption>`;
    drawReceipt(best.id);
  } else {
    hero.innerHTML = `<div class="frame" id="hero-stage"></div><figcaption><b>A street built from the kit</b><span>Open the Studio to cut a film in it.</span></figcaption>`;
    mountStreet($("#hero-stage")).catch(() => {});
    $("#receipt").innerHTML = `<p class="muted">The bill for a film appears here once one is made.</p>`;
  }
  drawKit($("#kit"), { limit: 10 });
  drawSales().then((n) => { if (n) $("#sales-sec").hidden = false; });
}

/** The real bill of a film, grouped by creator, as one PayPal order. */
async function drawReceipt(id) {
  const el = $("#receipt");
  try {
    const f = await api(`/api/films/${encodeURIComponent(id)}`);
    const paid = f.bill.lines.filter((l) => l.price > 0);
    const by = new Map();
    for (const l of paid) { if (!by.has(l.author)) by.set(l.author, []); by.get(l.author).push(l); }
    el.innerHTML = `<div class="r-head"><b>${esc(f.title)}</b><span>${paid.length} licences, ${by.size} creators</span></div>
      ${[...by].map(([author, ls]) => `<div class="r-who"><div class="r-name">${esc(author)}<em>${usd(ls.reduce((a, l) => a + l.price, 0))}</em></div>${ls.map((l) => `<div class="r-line"><span>${esc(l.title)}</span><span>${usd(l.price)}</span></div>`).join("")}</div>`).join("")}
      <div class="r-total"><span>One PayPal order</span><b>${usd(f.bill.total)}</b></div>`;
  } catch { el.innerHTML = ""; }
}

async function drawKit(el, { limit = 12 } = {}) {
  const list = (await catalog()).filter((a) => a.author !== "oasis" || a.price > 0).slice(0, limit);
  el.innerHTML = list.map((a) => `<a class="piece" href="#/a/${esc(a.id)}"><span class="sheet"><img src="${thumb(a.id)}" alt="${esc(a.title)}" loading="lazy" width="360" height="360"></span><div><b>${esc(a.title)}</b><em>${price(a.price)}</em><span>${esc(a.author)}</span></div></a>`).join("");
  // the sheet shimmers until its render arrives, then the picture fades in (cached renders are in at once)
  el.querySelectorAll(".sheet img").forEach((img) => { const on = () => img.parentElement.classList.add("in"); img.complete && img.naturalWidth ? on() : img.addEventListener("load", on, { once: true }); img.addEventListener("error", on, { once: true }); });
}

// ---------- sales and creators (shared by home and ledger) ----------
function saleRow(s, fresh = false) {
  const who = (s.agent || "?").replace(/^an? /i, "").slice(0, 1).toUpperCase();
  const names = s.items.map((i) => i.title);
  const list = names.length > 3 ? `${names.slice(0, 3).join(", ")} and ${names.length - 3} more` : names.join(", ");
  return `<div class="sale${fresh ? " new" : ""}">
    <div class="who" aria-hidden="true">${esc(who)}</div>
    <div class="what"><b>${esc(s.agent || "A buyer")}</b> licensed ${esc(list)}${s.funded ? " inside a human's budget" : ""}.
      <div class="split">${s.creators.map((c) => `<span class="chip">${esc(c.author)} <b>${usd(c.usd)}</b></span>`).join("")}</div>
      <div class="ids">PayPal order ${esc(s.orderId)}</div></div>
    <div class="amt">${usd(s.total)}</div></div>`;
}
function creatorTotals(sales) {
  const t = {};
  for (const s of sales) for (const c of s.creators) t[c.author] = (t[c.author] || 0) + c.usd;
  return Object.entries(t).sort((a, b) => b[1] - a[1]);
}
async function drawSales({ limit = 6, empty = null, after = null } = {}) {
  let sales = await api("/api/sales").catch(() => []);
  const cat = await catalog();
  const face = (author) => cat.find((a) => a.author === author)?.id;
  const paint = (bump = []) => {
    $("#sales").innerHTML = sales.length ? sales.slice(0, limit).map((s, i) => saleRow(s, i === 0 && bump.length)).join("")
      : empty || `<div class="empty"><h3>No agent has bought anything yet.</h3><p>Give an agent a budget and ask it to build a scene. Its purchase shows up here the moment PayPal completes it.</p><a class="btn" href="#/budget">Give your agent a budget</a></div>`;
    const totals = creatorTotals(sales);
    $("#creators").innerHTML = totals.length ? totals.map(([a, v]) => `<div class="creator"><img src="${face(a) ? thumb(face(a), 120) : ""}" alt=""><div><b>${esc(a)}</b><div class="muted" style="font-size:13px">sandbox creator account</div></div><div class="earn${bump.includes(a) ? " bump" : ""}">${usd(v)}</div></div>`).join("")
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
      <h1>Give your agent a budget.</h1>
      <p class="lede">You approve once in PayPal. Your agent can then license 3D pieces up to this amount, and nothing more.</p>
      <dl class="pk-kv">
        <dt>Charged</dt><dd>Only when the agent buys, one PayPal order per scene</dd>
        <dt>Cap</dt><dd>Enforced by Oasis before PayPal is called</dd>
        <dt>Stop</dt><dd>Revoke the token any time; it stops working at once</dd>
      </dl>
      ${last ? `<p style="margin-top:28px"><a class="link" href="#/budget/${esc(last.id)}">Open your last budget</a></p>` : ""}
    </div>
    <form class="pk-panel" id="bform" novalidate>
      <div class="pk-field"><label id="amt-l">Amount</label><div class="pk-seg wide" id="amts" role="group" aria-labelledby="amt-l">${[10, 25, 50, 100].map((n) => `<button type="button" data-v="${n}" class="num">$${n}</button>`).join("")}</div></div>
      <div class="pk-field"><label for="desc">What is it for?</label><input class="pk-in" type="text" id="desc" maxlength="200" value="3D pieces for a cozy Kyoto street scene"><span class="help">Shown to you in PayPal and on every receipt.</span></div>
      <div class="pk-field"><label id="hrs-l">Expires after</label><div class="pk-seg wide" id="hours" role="group" aria-labelledby="hrs-l"><button type="button" data-v="24">24 hours</button><button type="button" data-v="72">3 days</button><button type="button" data-v="168">7 days</button></div></div>
      <div class="pk-err" id="berr" role="alert"></div>
      <button class="pk-pp" id="bgo" type="submit">Approve with <em>Pay<b>Pal</b></em></button>
      <p class="fine">PayPal sandbox. No real money moves.</p>
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
      b.removeAttribute("aria-busy"); b.innerHTML = `Approve with <em>Pay<b>Pal</b></em>`;
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
  app.innerHTML = `<div class="wrap pk" style="padding:48px 0 96px">
    <div class="head"><h1>The ledger.</h1><p>Every licence an agent bought, the PayPal order behind it, and what each creator earned. Creator shares are paid out with PayPal Payouts once the 14-day refund window closes.</p></div>
    <div class="pk-stats" id="stats"><div class="pk-stat"><b class="num" id="st-paid">$0.00</b><span>paid to creators</span></div><div class="pk-stat"><b class="num" id="st-orders">0</b><span>PayPal orders</span></div><div class="pk-stat"><b class="num" id="st-creators">0</b><span>creators paid</span></div></div>
    <div class="ledger">
      <div><div class="pk-col-h">Orders <span class="pk-live"><i aria-hidden="true"></i>live</span></div><div class="sales" id="sales"><div class="pk-stack" style="padding:12px 16px"><div class="pk-sk row"></div><div class="pk-sk row"></div><div class="pk-sk row"></div></div></div></div>
      <div><div class="pk-col-h" id="cr-h">Creators <span>earned so far</span></div><div class="creators" id="creators"><div class="pk-stack"><div class="pk-sk row"></div><div class="pk-sk row"></div></div></div></div>
    </div></div>`;
  const empty = pkNote("empty", "receipt", "Nothing has been paid for yet", "Make a film in the Studio and license it, or give an agent a budget and let it buy. Every order lands here the moment PayPal completes it.", `<a class="pk-b sm" href="#/studio">${icon("film-slate")} Make a film</a><a class="pk-b sm" href="#/budget">${icon("wallet")} Give an agent a budget</a>`);
  drawSales({ limit: 40, empty, after: (sales, bump) => {
    const paid = sales.reduce((a, s) => a + s.creators.reduce((x, c) => x + c.usd, 0), 0);
    const who = new Set(sales.flatMap((s) => s.creators.map((c) => c.author)));
    const set = (id, v) => { const el = $(id); if (!el) return; el.textContent = v; if (bump.length) { el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump"); } };
    set("#st-paid", usd(paid)); set("#st-orders", String(sales.length)); set("#st-creators", String(who.size));
    $("#cr-h").hidden = !who.size;
  } });
}

// ---------- kit ----------
async function pageKit() {
  app.innerHTML = `<div class="wrap" style="padding:48px 0 96px">
    <div class="head"><h1>The kit.</h1><p>Every piece is a program on one 6 m grid. Open one to turn its knobs and watch it rebuild.</p></div>
    <div class="kit" id="kit"></div></div>`;
  drawKit($("#kit"), { limit: 100 });
}

// ---------- asset ----------
async function pageAsset(id) {
  let a;
  try { a = await api(`/api/assets/${encodeURIComponent(id)}`); } catch { return notFound("That asset doesn't exist."); }
  const knobs = a.knobs || {};
  const values = Object.fromEntries(Object.entries(knobs).map(([k, d]) => [k, d.default]));
  const control = (k, d) => {
    if (d.type === "range") return `<div class="knob"><label for="k-${k}">${esc(d.label || k)}</label><input type="range" id="k-${k}" data-k="${k}" min="${d.min}" max="${d.max}" step="${d.step || 1}" value="${d.default}"><output id="o-${k}">${d.default}</output></div>`;
    if (d.type === "toggle") return `<div class="knob"><label for="k-${k}">${esc(d.label || k)}</label><input type="checkbox" id="k-${k}" data-k="${k}" ${d.default ? "checked" : ""}><output id="o-${k}">${d.default ? "on" : "off"}</output></div>`;
    if (d.type === "color") return `<div class="knob"><label for="k-${k}">${esc(d.label || k)}</label><input type="color" id="k-${k}" data-k="${k}" value="${esc(d.default)}"><output id="o-${k}">${esc(d.default)}</output></div>`;
    if (d.type === "choice") return `<div class="knob"><label for="k-${k}">${esc(d.label || k)}</label><select id="k-${k}" data-k="${k}">${d.options.map((o) => `<option ${o === d.default ? "selected" : ""}>${esc(o)}</option>`).join("")}</select><output></output></div>`;
    return "";
  };
  app.innerHTML = `<div class="wrap asset">
    <div>
      <div class="stage" id="a-stage" role="img" aria-label="${esc(a.title)}, live 3D"></div>
      <div class="toolbar" id="times">${["day", "dusk", "night"].map((t) => `<button class="btn small${t === "day" ? " on" : ""}" data-t="${t}">${t[0].toUpperCase() + t.slice(1)}</button>`).join("")}<span class="readout" id="readout" style="margin-left:auto;align-self:center"></span></div>
    </div>
    <aside>
      <div class="panel">
        <h1 style="font-size:36px">${esc(a.title)}</h1>
        <p class="muted" style="margin:8px 0 0">by <b style="color:var(--ink)">${esc(a.author)}</b>${a.footprint ? `, ${a.footprint[0]} by ${a.footprint[1]} m` : ""}</p>
        <p style="margin:14px 0 0;color:var(--ink-2)">${esc(a.description)}</p>
        <div style="display:flex;align-items:baseline;gap:10px;margin-top:18px"><span class="big">${price(a.price)}</span><span class="muted">per licence</span></div>
      </div>
      <div class="panel" style="padding:22px"><div class="knobs" style="padding:0" id="knobs">${Object.entries(knobs).map(([k, d]) => control(k, d)).join("")}</div></div>
      <div class="panel" style="padding:22px">
        <h3>Import it</h3>
        <div class="code" style="margin-top:12px;font-size:12.5px;white-space:pre-wrap" id="imp"></div>
      </div>
    </aside></div>`;
  const v = createViewer($("#a-stage"), { time: "day" });
  viewers.push(v);
  $("#times").addEventListener("click", (e) => { const b = e.target.closest("[data-t]"); if (!b) return; v.setTime(b.dataset.t); $("#times").querySelectorAll("[data-t]").forEach((x) => x.classList.toggle("on", x === b)); });
  const diff = () => Object.fromEntries(Object.entries(values).filter(([k, val]) => val !== knobs[k].default));
  let n = 0;
  const rebuild = async () => {
    const run = ++n;
    const { parts } = await api(`/api/assets/${a.id}/parts.json?p=${encodeURIComponent(JSON.stringify(diff()))}`);
    if (run !== n) return;
    v.setParts(parts);
    const s = v.stats();
    $("#readout").innerHTML = `<b>${parts.length}</b> parts, <b>${s.tris.toLocaleString()}</b> triangles`;
    const d = diff();
    $("#imp").textContent = `import { createAsset } from "${location.origin}/cdn/${a.id}.mjs?lic=…";\nscene.add(createAsset(${Object.keys(d).length ? JSON.stringify(d) : ""}));`;
  };
  $("#knobs").addEventListener("input", (e) => {
    const k = e.target.dataset.k;
    if (!k) return;
    values[k] = e.target.type === "checkbox" ? e.target.checked : e.target.type === "range" ? Number(e.target.value) : e.target.value;
    const o = $(`#o-${k}`);
    if (o) o.textContent = e.target.type === "checkbox" ? (e.target.checked ? "on" : "off") : e.target.value;
    clearTimeout(rebuild.t);
    rebuild.t = setTimeout(rebuild, 50);
  });
  rebuild();
}

function notFound(msg) {
  app.innerHTML = `<div class="wrap split2"><div><h1>${esc(msg)}</h1><p class="lede">It may have been removed, or the link has a typo.</p><div class="cta" style="margin-top:24px;display:flex;gap:12px"><a class="btn primary" href="#/kit">See the kit</a><a class="link" href="#/">Home</a></div></div></div>`;
}

// ---------- router ----------
async function route() {
  disposeViewers();
  leaveStudio();
  source?.close();
  const [path] = location.hash.slice(1).split("?");
  const seg = (path || "/").split("/").filter(Boolean);
  document.querySelectorAll("[data-nav]").forEach((a) => a.classList.toggle("on", a.dataset.nav === (seg[0] === "film" ? "studio" : seg[0] || "home")));
  window.scrollTo(0, 0);
  try {
    if (!seg.length) await pageHome();
    else if (seg[0] === "budget") await pageBudget(seg[1]);
    else if (seg[0] === "ledger") await pageLedger();
    else if (seg[0] === "kit") await pageKit();
    else if (seg[0] === "a" && seg[1]) await pageAsset(seg[1]);
    else if (seg[0] === "studio") await pageStudio(app, null);
    else if (seg[0] === "film" && seg[1]) await pageStudio(app, seg[1]);
    else notFound("That page doesn't exist.");
  } catch (e) {
    console.error(e);
    app.innerHTML = `<div class="wrap split2"><div><h1>Something went wrong.</h1><p class="lede">${esc(e.message)}</p><a class="btn" href="#/">Home</a></div></div>`;
  }
}
addEventListener("hashchange", route);
route();
