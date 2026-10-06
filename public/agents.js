// For agents: what an agent does on Oasis, shown with live data rather than described. The MCP command to connect,
// the budget a human approves once in PayPal (Vault), the tools, how much they have been used (/api/stats/mcp), and
// a real 402 from an unlicensed import (the x402 PAYMENT-REQUIRED header), fetched when the page opens.
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const icon = (name) => `<i class="ph-bold ph-${name}" aria-hidden="true"></i>`;
for (const href of ["/sound.css", "/agents.css"]) if (!document.querySelector(`link[href="${href}"]`)) { const l = document.createElement("link"); l.rel = "stylesheet"; l.href = href; document.head.appendChild(l); }

// the tools as server/mcp.js registers them, in the order an agent uses them
const TOOLS = [
  ["search_assets", "Search the registry by words, kind or kit. Every result is a program with knobs, a price and its creator."],
  ["get_asset", "One program's knobs (types, ranges, options), length, price and how to import it."],
  ["preview_asset", "Hear it with the agent's knob values before buying: a watermarked WAV and a picture of it."],
  ["make_kit", "A vibe in, a kit out: up to ten programs tuned to the scene, with the bill and who planned it."],
  ["get_kit", "A kit's parts, knobs, bill, and each part's module and WAV once it is licensed."],
  ["buy_assets", "License sounds or a kit inside the budget the human approved. One PayPal order; every creator in it gets a share booked, paid out after the 14-day refund window."],
  ["get_budget", "What the human allowed: the cap, what is spent, what is left, when it expires, every order on it."],
];

export async function pageAgents(app) {
  const cmd = `claude mcp add --transport http oasis ${location.origin}/mcp`;
  const mcpUrl = `${location.origin}/mcp`;
  const clients = [
    ["claude", "Claude Code", cmd],
    ["cursor", "Cursor", JSON.stringify({ mcpServers: { oasis: { url: mcpUrl } } }, null, 2)],
    ["http", "Any client", `POST ${mcpUrl}\nContent-Type: application/json\n\n{"jsonrpc":"2.0","id":1,"method":"tools/list"}`],
  ];
  // the order of Stripe's MCP doc (docs.stripe.com/mcp): a title and one sentence, install per client in tabs, the
  // tools as a table, then what governs spending; plus the live proof only this server can show
  app.innerHTML = `<div class="wrap ag-page">
    <header class="ag-head"><h1>For agents</h1><p class="lede">An MCP server: agents search, preview and license sounds inside a budget you approve in PayPal.</p></header>
    <section class="ag-sec"><h2>Connect</h2>
      <div class="cr-tabs ag-tabs" role="tablist" aria-label="Client">${clients.map(([id, label], i) => `<button type="button" role="tab" id="agt-${id}" aria-controls="agp-${id}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}">${label}</button>`).join("")}</div>
      ${clients.map(([id, , text], i) => `<div class="ag-cmd" role="tabpanel" id="agp-${id}" aria-labelledby="agt-${id}"${i ? " hidden" : ""}><code>${esc(text)}</code><button type="button" class="btn small ag-copy" data-copy="${esc(text)}">${icon("copy")} Copy</button></div>`).join("")}
    </section>
    <section class="ag-sec"><h2>Tools</h2>
      <table class="ag-table"><thead><tr><th>Tool</th><th>What it does</th><th class="num">Calls</th></tr></thead><tbody>${TOOLS.map(([t, d]) => `<tr><td><code>${t}</code></td><td>${esc(d)}</td><td class="num ag-n" data-tool="${t}">0</td></tr>`).join("")}</tbody></table>
      <p id="ag-stats" class="ag-muted"></p>
    </section>
    <div class="ag-grid">
      <section class="ag-sec"><h2>Spending</h2><p>You approve a cap and an expiry in PayPal. Oasis holds the token and charges your saved PayPal wallet per order; an order over the cap, past the expiry or after you revoke is refused before PayPal is called. Every order lands in the <a class="link" href="#/ledger">ledger</a>.</p><p style="margin-top:14px"><a class="btn primary" href="#/budget">${icon("wallet")} Set a budget</a></p>
        <p class="ag-muted" style="margin-top:14px">To stop a budget, open it (the link PayPal returned you to) and revoke it there; the token stops working at once.</p></section>
      <section class="ag-sec ag-402"><h2>Without a license</h2><p>An import of a paid program answers HTTP 402 with a <code>PAYMENT-REQUIRED</code> header shaped after x402. Ask this server for one:</p><p style="margin-top:12px"><button class="btn small" id="ag-402-go" type="button">${icon("terminal-window")} GET /cdn/footstep.mjs</button></p><pre id="ag-402" hidden></pre></section>
    </div>
    <p class="ag-muted">The protocol for machines: <a class="link" href="/llms.txt">llms.txt</a>.</p>
  </div>`;
  const tabEls = [...app.querySelectorAll('.ag-tabs [role="tab"]')];
  const pick = (t) => { tabEls.forEach((x) => { const on = x === t; x.setAttribute("aria-selected", on); x.tabIndex = on ? 0 : -1; document.getElementById(x.getAttribute("aria-controls")).hidden = !on; }); t.focus(); };
  tabEls.forEach((t, i) => { t.addEventListener("click", () => pick(t)); t.addEventListener("keydown", (e) => { const d = { ArrowRight: 1, ArrowLeft: -1 }[e.key]; if (d) { e.preventDefault(); pick(tabEls[(i + d + tabEls.length) % tabEls.length]); } }); });
  app.querySelectorAll(".ag-copy").forEach((b) => b.addEventListener("click", async () => { try { await navigator.clipboard.writeText(b.dataset.copy); b.innerHTML = `${icon("check")} Copied`; setTimeout(() => (b.innerHTML = `${icon("copy")} Copy`), 1800); } catch {} }));
  fetch("/api/stats/mcp").then((r) => r.json()).then((s) => {
    if (!$("#ag-stats")) return;
    const clients = Object.keys(s.clients || {});
    $("#ag-stats").innerHTML = `<b class="num">${s.requests}</b> MCP requests since ${new Date(s.since).toLocaleDateString(undefined, { month: "short", day: "numeric" })}${clients.length ? `, from ${clients.map((c) => `<code>${esc(c)}</code>`).join(" and ")}` : ""}.`;
    for (const [t, n] of Object.entries(s.tools || {})) { const el = document.querySelector(`.ag-n[data-tool="${t}"]`); if (el) el.textContent = n; }
  }).catch(() => { if ($("#ag-stats")) $("#ag-stats").textContent = "The MCP counter is not available."; });
  // the 402 is fetched when asked for (a 402 on page load reads as an error in every visitor's console)
  $("#ag-402-go").addEventListener("click", () => { $("#ag-402").hidden = false; $("#ag-402").textContent = "GET /cdn/footstep.mjs …"; fetch("/cdn/footstep.mjs", { headers: { Accept: "application/json" } }).then(async (r) => {
    const h = r.headers.get("PAYMENT-REQUIRED"), body = await r.json().catch(() => null);
    if (!$("#ag-402")) return;
    let header = h; try { header = JSON.stringify(JSON.parse(atob(h)), null, 2); } catch {}
    $("#ag-402").textContent = `GET /cdn/footstep.mjs\nHTTP ${r.status} ${r.statusText || (r.status === 402 ? "Payment Required" : "")}\nPAYMENT-REQUIRED: ${h ? `${h.slice(0, 48)}…` : "(none)"}\n\n${header && header !== h ? header : JSON.stringify(body, null, 2)}`.slice(0, 1600);
  }).catch(() => {}); });
}
