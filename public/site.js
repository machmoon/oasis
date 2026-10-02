// Oasis: a registry of 3D assets as code. A human approves one PayPal budget; agents license every piece they
// import and each creator is paid. Pages: home, budget, ledger, kit, asset.
import { createViewer, THREE } from "/world3d.js";

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
async function pageHome() {
  app.innerHTML = `
  <div class="wrap">
    <section class="hero">
      <div>
        <h1>Your agent builds the scene. Every creator gets paid.</h1>
        <p class="lede">Oasis is a registry of 3D assets written as code. Approve one PayPal budget, and agents license every piece they import.</p>
        <div class="cta">
          <a class="btn primary" href="#/budget">Give your agent a budget</a>
          <a class="link" href="#/kit">See the kit</a>
        </div>
      </div>
      <div class="stage" id="hero-stage" role="img" aria-label="A Kyoto street built from Oasis registry pieces, rotating slowly"><div class="tag" id="hero-tag">Loading the street</div></div>
    </section>
  </div>

  <section class="band"><div class="wrap">
    <div class="head rise"><h2>Paid by agents, as it happens.</h2><p>Every sale below is a real PayPal sandbox order an agent placed inside a human's budget. Each creator's share is booked the moment it clears.</p></div>
    <div class="ledger rise">
      <div class="sales" id="sales"><div class="sale"><div class="who skel"></div><div><div class="skel" style="height:16px;width:70%"></div><div class="skel" style="height:12px;width:40%;margin-top:10px"></div></div><div></div></div></div>
      <div class="creators" id="creators"></div>
    </div>
  </div></section>

  <section class="band"><div class="wrap">
    <div class="head rise"><h2>A model is a program. Import it.</h2><p>Knobs don't stretch the mesh. They rebuild it: five floors become eight with more windows, not taller ones. The licence rides in the URL.</p></div>
    <div class="program rise">
      <div class="code" id="code"></div>
      <div class="knobbox"><div class="stage" id="knob-stage" role="img" aria-label="Apartment Flats, rebuilt live as you move the knobs"></div>
        <div class="knobs" id="knobs"><div class="skel" style="height:20px"></div></div></div>
    </div>
  </div></section>

  <section class="band"><div class="wrap">
    <div class="head rise"><h2>You approve once. The agent does the rest.</h2></div>
    <div class="flow rise">
      <div><span class="glyph">${icon("hand-coins")}</span><h3>Approve a budget</h3><p>One PayPal approval saves your wallet for Oasis agents, capped at the amount you pick and expiring when you say.</p><code>PayPal Vault, setup token to payment token</code></div>
      <div><span class="glyph">${icon("robot")}</span><h3>The agent buys what it imports</h3><p>It searches the registry, picks pieces from many creators and pays inside your budget. Anything over is refused before PayPal is called.</p><code>MCP buy_assets, or HTTP 402 in x402 shape</code></div>
      <div><span class="glyph">${icon("coins")}</span><h3>Creators get paid</h3><p>One order per scene, charged to your saved wallet with no redirect. Each creator's share is paid out by PayPal Payouts.</p><code>Orders v2 with vault_id, then Payouts</code></div>
    </div>
  </div></section>

  <section class="band"><div class="wrap">
    <div class="head rise"><h2>One kit, many creators.</h2><p>Every piece sits on the same 6 m grid and palette, so a shop from one creator fits beside a tram from another.</p></div>
    <div class="kit rise" id="kit"></div>
  </div></section>

  <section class="band"><div class="wrap agents">
    <div class="rise">
      <h2>Built for agents first.</h2>
      <ul>
        <li>${icon("plug")}<span>Add the MCP server to Claude Code, Cursor or any MCP client.</span></li>
        <li>${icon("lock-key")}<span>The agent holds a budget token. The server holds the money and refuses anything over the cap.</span></li>
        <li>${icon("x-circle")}<span>Revoke the token and the next purchase fails at once.</span></li>
      </ul>
      <div class="cta" style="margin-top:26px"><a class="btn" href="/llms.txt">Read llms.txt</a></div>
    </div>
    <div class="code rise" id="mcp-code"></div>
  </div></section>`;
  rise();

  const host = location.origin;
  $("#code").innerHTML = `<span class="c">// in any three.js page with an import map for "three"</span>
<span class="k">import</span> { createAsset }
  <span class="k">from</span> <span class="s">"${host}/cdn/town-flats.mjs?lic=…"</span>;

scene.add(createAsset({ floors: <span id="code-floors">5</span>, tank: <span id="code-bal">true</span> }));

<span class="c">// no licence? the import still loads, as a grey</span>
<span class="c">// placeholder with the real footprint.</span>
<span class="c">// agents fetching it get HTTP 402 with the price.</span>`;
  $("#mcp-code").innerHTML = `<span class="c"># Claude Code</span>
claude mcp add --transport http oasis ${host}/mcp

<span class="c"># then, in your project</span>
<span class="s">"Build a cozy Kyoto street in three.js.
 Use Oasis for the 3D pieces. Budget token: mdt_…"</span>

<span class="c"># what the agent can call</span>
search_assets   get_asset   preview_asset
buy_assets      get_budget`;

  mountStreet($("#hero-stage")).then(({ plan }) => {
    const types = new Map(plan.placements.map((p) => [p.asset, p]));
    const creators = new Set(plan.placements.map((p) => p.author).filter((a) => a !== "oasis"));
    $("#hero-tag").innerHTML = `${plan.placements.length} pieces, ${types.size} programs, <b>${creators.size} creators</b>`;
  }).catch(() => ($("#hero-tag").textContent = "The street could not load. Refresh to try again."));

  mountKnobDemo();
  drawKit($("#kit"));
  drawSales();
}

async function mountKnobDemo() {
  const id = "town-flats";
  const a = await api(`/api/assets/${id}`);
  const v = createViewer($("#knob-stage"), { time: "day", autoRotate: !reduced });
  viewers.push(v);
  const values = Object.fromEntries(Object.entries(a.knobs).map(([k, d]) => [k, d.default]));
  const show = ["floors", "tank", "lights"].filter((k) => a.knobs[k]);
  const box = $("#knobs");
  box.innerHTML = show.map((k) => {
    const d = a.knobs[k];
    if (d.type === "range") return `<div class="knob"><label for="k-${k}">${esc(d.label || k)}</label><input type="range" id="k-${k}" data-k="${k}" min="${d.min}" max="${d.max}" step="${d.step || 1}" value="${d.default}"><output id="o-${k}">${d.default}</output></div>`;
    if (d.type === "toggle") return `<div class="knob"><label for="k-${k}">${esc(d.label || k)}</label><input type="checkbox" id="k-${k}" data-k="${k}" ${d.default ? "checked" : ""}><output id="o-${k}">${d.default ? "on" : "off"}</output></div>`;
    return "";
  }).join("") + `<div class="readout" id="readout">Building…</div>`;
  let n = 0;
  // Frame once on the tallest version, then hold the camera still so the building visibly grows.
  const tallest = await api(`/api/assets/${id}/parts.json?p=${encodeURIComponent(JSON.stringify({ floors: a.knobs.floors?.max }))}`);
  v.setParts(tallest.parts, { reframe: true });
  const rebuild = async () => {
    const run = ++n;
    const diff = Object.fromEntries(show.map((k) => [k, values[k]]));
    const { parts } = await api(`/api/assets/${id}/parts.json?p=${encodeURIComponent(JSON.stringify(diff))}`);
    if (run !== n) return;
    v.setParts(parts, { lock: true });
    const s = v.stats();
    $("#readout").innerHTML = `Rebuilt: <b>${parts.length}</b> parts, <b>${s.tris.toLocaleString()}</b> triangles`;
    if ($("#code-floors")) $("#code-floors").textContent = values.floors;
    if ($("#code-bal")) $("#code-bal").textContent = String(!!values.tank);
  };
  box.addEventListener("input", (e) => {
    const k = e.target.dataset.k;
    if (!k) return;
    values[k] = e.target.type === "checkbox" ? e.target.checked : Number(e.target.value);
    $(`#o-${k}`).textContent = e.target.type === "checkbox" ? (e.target.checked ? "on" : "off") : e.target.value;
    clearTimeout(rebuild.t);
    rebuild.t = setTimeout(rebuild, 60);
  });
  rebuild();
}

async function drawKit(el, { limit = 12 } = {}) {
  const list = (await catalog()).filter((a) => a.author !== "oasis" || a.price > 0).slice(0, limit);
  el.innerHTML = list.map((a) => `<a class="piece" href="#/a/${esc(a.id)}"><img src="${thumb(a.id)}" alt="${esc(a.title)}" loading="lazy" width="360" height="360"><div><b>${esc(a.title)}</b><em>${price(a.price)}</em><span>${esc(a.author)}</span></div></a>`).join("");
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
async function drawSales({ limit = 6 } = {}) {
  let sales = await api("/api/sales").catch(() => []);
  const cat = await catalog();
  const face = (author) => cat.find((a) => a.author === author)?.id;
  const paint = (bump = []) => {
    $("#sales").innerHTML = sales.length ? sales.slice(0, limit).map((s, i) => saleRow(s, i === 0 && bump.length)).join("")
      : `<div class="empty"><h3>No agent has bought anything yet.</h3><p>Give an agent a budget and ask it to build a scene. Its purchase shows up here the moment PayPal completes it.</p><a class="btn" href="#/budget">Give your agent a budget</a></div>`;
    const totals = creatorTotals(sales);
    $("#creators").innerHTML = totals.length ? totals.map(([a, v]) => `<div class="creator"><img src="${face(a) ? thumb(face(a), 120) : ""}" alt=""><div><b>${esc(a)}</b><div class="muted" style="font-size:13px">sandbox creator account</div></div><div class="earn${bump.includes(a) ? " bump" : ""}">${usd(v)}</div></div>`).join("")
      : (sales.length ? "" : `<div class="creator"><div class="skel" style="width:52px;height:52px"></div><div class="muted">Creators appear here with what they earned.</div><div></div></div>`);
  };
  paint();
  feed((s) => { sales = [s, ...sales]; paint(s.creators.map((c) => c.author)); });
}
let source = null;
function feed(onSale) {
  source?.close();
  source = new EventSource("/api/feed");
  source.addEventListener("sale", (e) => onSale(JSON.parse(e.data)));
}

// ---------- budget ----------
async function pageBudget(id) {
  if (id) return pageBudgetView(id);
  const last = store.get("oasis.budget");
  app.innerHTML = `<div class="wrap split2">
    <div>
      <h1>Give your agent a budget.</h1>
      <p class="lede">You approve once in PayPal. Your agent can then license 3D pieces up to this amount, and nothing more.</p>
      <dl class="kv" style="margin-top:28px">
        <dt>Charged</dt><dd>Only when the agent buys, one PayPal order per scene</dd>
        <dt>Cap</dt><dd>Enforced by Oasis before PayPal is called</dd>
        <dt>Stop</dt><dd>Revoke the token any time; it stops working at once</dd>
      </dl>
      ${last ? `<p style="margin-top:28px"><a class="link" href="#/budget/${esc(last.id)}">Open your last budget</a></p>` : ""}
    </div>
    <form class="panel" id="bform" novalidate>
      <div class="field"><label>Amount</label><div class="amounts" id="amts">${[10, 25, 50, 100].map((n) => `<button type="button" data-v="${n}" class="${n === 25 ? "on" : ""}">$${n}</button>`).join("")}</div></div>
      <div class="field"><label for="desc">What is it for?</label><input type="text" id="desc" maxlength="200" value="3D pieces for a cozy Kyoto street scene"><span class="help">Shown to you in PayPal and on every receipt.</span></div>
      <div class="field"><label for="hours">Expires after</label><select id="hours"><option value="24">24 hours</option><option value="72">3 days</option><option value="168">7 days</option></select></div>
      <div class="err" id="berr" role="alert" style="color:var(--accent);min-height:20px;font-size:14px"></div>
      <button class="btn primary" style="width:100%" id="bgo">Approve with PayPal</button>
      <p class="muted" style="font-size:13px;margin:12px 0 0">PayPal sandbox. No real money moves.</p>
    </form></div>`;
  let usdAmt = 25;
  $("#amts").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; usdAmt = Number(b.dataset.v); $("#amts").querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b)); });
  $("#bform").addEventListener("submit", async (e) => {
    e.preventDefault();
    $("#bgo").disabled = true;
    $("#bgo").textContent = "Opening PayPal…";
    try {
      const r = await api("/api/budgets", { method: "POST", body: { usd: usdAmt, description: $("#desc").value, hours: Number($("#hours").value) } });
      store.set("oasis.budget", { id: r.mandate.id, token: r.token });
      location.href = r.approveUrl;
    } catch (err) {
      $("#berr").textContent = err.message;
      $("#bgo").disabled = false;
      $("#bgo").textContent = "Approve with PayPal";
    }
  });
}

async function pageBudgetView(id) {
  app.innerHTML = `<div class="wrap split2"><div class="skel" style="height:280px"></div><div class="skel" style="height:280px"></div></div>`;
  let m;
  try { m = await api(`/api/mandates/${encodeURIComponent(id)}`); } catch { return notFound("That budget doesn't exist."); }
  const mine = store.get("oasis.budget");
  const token = mine?.id === id ? mine.token : null;
  const live = m.funding?.state === "active" && !m.revoked_at && !m.expired;
  const host = location.origin;
  app.innerHTML = `<div class="wrap split2">
    <div>
      <span class="state ${live ? "live" : "wait"}">${m.revoked_at ? "Revoked" : m.expired ? "Expired" : live ? "Approved in PayPal" : "Waiting for PayPal approval"}</span>
      <h1 style="margin-top:16px">${usd(m.remaining_usd)} <span class="muted" style="font-size:.5em">left of ${usd(m.budget_usd)}</span></h1>
      <p class="lede">${esc(m.natural_language_description)}</p>
      <dl class="kv" style="margin-top:24px">
        <dt>Paid from</dt><dd>${esc(m.funding?.payer || "Your PayPal account, once approved")}</dd>
        <dt>Spent</dt><dd>${usd(m.spent_usd)} in ${m.orders.filter((o) => o.state === "spent").length} orders</dd>
        <dt>Expires</dt><dd>${new Date(m.intent_expiry).toLocaleString()}</dd>
      </dl>
      ${m.orders.length ? `<h3 style="margin:36px 0 12px">Orders</h3><div class="sales">${m.orders.map((o) => `<div class="sale"><div class="who">${esc((o.agent_name || "A").slice(0, 1))}</div><div class="what"><b>${esc(o.agent_name || "Agent")}</b> ${o.state === "spent" ? "paid" : o.state === "held" ? "is paying" : "was refused or refunded"}<div class="ids">PayPal order ${esc(o.order_id || "pending")}</div></div><div class="amt">${usd(o.usd)}</div></div>`).join("")}</div>` : ""}
    </div>
    <div class="panel">
      ${!live && m.funding?.approve_url ? `<h3>One step left</h3><p class="muted">Approve the budget in PayPal so your agent can use it.</p><a class="btn primary" href="${esc(m.funding.approve_url)}">Approve with PayPal</a>` : ""}
      ${token ? `<h3>Give this to your agent</h3><p class="muted" style="margin:6px 0 14px">Treat it like a password. Only you can see it, in this browser.</p>
        <div class="secret"><span id="tok">${esc(token)}</span><button class="btn small" id="copy">Copy</button></div>
        <h3 style="margin-top:24px">Connect Claude Code</h3>
        <div class="code" style="margin-top:12px;font-size:12.5px">claude mcp add --transport http oasis ${esc(host)}/mcp</div>
        ${m.revoked_at ? "" : `<button class="btn" id="revoke" style="margin-top:22px">Revoke this budget</button>`}`
      : `<p class="muted">The agent token for this budget was shown only in the browser that created it.</p>`}
    </div></div>`;
  $("#copy")?.addEventListener("click", async () => { try { await navigator.clipboard.writeText(token); toast("Token copied"); } catch { toast("Select the token and copy it"); } });
  $("#revoke")?.addEventListener("click", async () => {
    $("#revoke").disabled = true;
    try { await api("/api/mandates/revoke", { method: "POST", body: { token } }); toast("Revoked. The token no longer works."); pageBudgetView(id); }
    catch (e) { toast(e.message); $("#revoke").disabled = false; }
  });
}

// ---------- ledger ----------
async function pageLedger() {
  app.innerHTML = `<div class="wrap" style="padding:48px 0 96px">
    <div class="head"><h1>The ledger.</h1><p>Every licence an agent bought, the PayPal order behind it, and what each creator earned. Creator shares are paid out with PayPal Payouts once the 14-day refund window closes.</p></div>
    <div class="ledger"><div class="sales" id="sales"></div><div class="creators" id="creators"></div></div></div>`;
  drawSales({ limit: 40 });
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
  source?.close();
  const [path] = location.hash.slice(1).split("?");
  const seg = (path || "/").split("/").filter(Boolean);
  document.querySelectorAll("[data-nav]").forEach((a) => a.classList.toggle("on", a.dataset.nav === (seg[0] || "home")));
  window.scrollTo(0, 0);
  try {
    if (!seg.length) await pageHome();
    else if (seg[0] === "budget") await pageBudget(seg[1]);
    else if (seg[0] === "ledger") await pageLedger();
    else if (seg[0] === "kit") await pageKit();
    else if (seg[0] === "a" && seg[1]) await pageAsset(seg[1]);
    else notFound("That page doesn't exist.");
  } catch (e) {
    console.error(e);
    app.innerHTML = `<div class="wrap split2"><div><h1>Something went wrong.</h1><p class="lede">${esc(e.message)}</p><a class="btn" href="#/">Home</a></div></div>`;
  }
}
addEventListener("hashchange", route);
route();
