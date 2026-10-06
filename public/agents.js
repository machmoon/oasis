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
  ["make_kit", "A vibe in, a kit out: six to ten programs tuned to the scene, with the bill."],
  ["get_kit", "A kit's parts, knobs, bill, and each part's module and WAV once it is licensed."],
  ["buy_assets", "License sounds or a kit inside the budget the human approved. One PayPal order; every creator in it is paid."],
  ["get_budget", "What the human allowed: the cap, what is spent, what is left, when it expires, every order on it."],
];

export async function pageAgents(app) {
  const cmd = `claude mcp add --transport http oasis ${location.origin}/mcp`;
  app.innerHTML = `<div class="wrap ag-page">
    <header class="ag-head"><h1>Agents buy sounds the same way</h1><p class="lede">Connect over MCP, give it a budget in PayPal once, and it licenses kits inside that cap.</p></header>
    <div class="ag-flow">
      <section class="ag-step"><h2>Connect</h2><p>One line in Claude Code. Seven tools appear.</p><div class="ag-cmd"><code id="ag-cmd">${esc(cmd)}</code><button type="button" class="btn small" id="ag-copy">${icon("copy")} Copy</button></div></section>
      <section class="ag-step"><h2>Give it a budget</h2><p>You approve a cap and an expiry in PayPal. Oasis holds the token, enforces the cap and charges your saved PayPal wallet per order.</p><a class="btn primary" href="#/budget">${icon("wallet")} Set a budget</a></section>
      <section class="ag-step"><h2>It licenses inside the cap</h2><p>An order over the cap, past the expiry or after you revoke is refused before PayPal is called.</p><a class="link" href="#/ledger">Every order lands in the ledger</a></section>
    </div>
    <div class="ag-grid">
      <section class="ag-tools" aria-labelledby="ag-tools-h"><h2 id="ag-tools-h">The tools</h2><dl id="ag-tools">${TOOLS.map(([t, d]) => `<div><dt><code>${t}</code><span class="ag-n" data-tool="${t}"></span></dt><dd>${esc(d)}</dd></div>`).join("")}</dl></section>
      <aside class="ag-side">
        <section class="ag-live"><h2>Used so far</h2><p id="ag-stats" class="ag-muted">Loading the server's MCP counter…</p></section>
        <section class="ag-402"><h2>Without a licence, a 402</h2><p>An agent that imports a paid program it has not licensed gets HTTP 402 with an x402 <code>PAYMENT-REQUIRED</code> header, fetched live from this server:</p><pre id="ag-402">GET /cdn/footstep.mjs …</pre></section>
        <p class="ag-muted">The whole protocol for machines is <a class="link" href="/llms.txt">llms.txt</a>.</p>
      </aside>
    </div>
  </div>`;
  $("#ag-copy").addEventListener("click", async () => { try { await navigator.clipboard.writeText(cmd); $("#ag-copy").innerHTML = `${icon("check")} Copied`; setTimeout(() => ($("#ag-copy").innerHTML = `${icon("copy")} Copy`), 1800); } catch { const r = document.createRange(); r.selectNodeContents($("#ag-cmd")); getSelection().removeAllRanges(); getSelection().addRange(r); } });
  fetch("/api/stats/mcp").then((r) => r.json()).then((s) => {
    if (!$("#ag-stats")) return;
    const clients = Object.keys(s.clients || {});
    $("#ag-stats").innerHTML = `<b class="num">${s.requests}</b> MCP requests since this server started (${new Date(s.since).toLocaleString()})${clients.length ? `, from ${clients.map((c) => `<code>${esc(c)}</code>`).join(" and ")}` : ""}.`;
    for (const [t, n] of Object.entries(s.tools || {})) { const el = document.querySelector(`.ag-n[data-tool="${t}"]`); if (el) el.textContent = `${n} call${n === 1 ? "" : "s"}`; }
  }).catch(() => { if ($("#ag-stats")) $("#ag-stats").textContent = "The MCP counter is not available."; });
  fetch("/cdn/footstep.mjs", { headers: { Accept: "application/json" } }).then(async (r) => {
    const h = r.headers.get("PAYMENT-REQUIRED"), body = await r.json().catch(() => null);
    if (!$("#ag-402")) return;
    let header = h; try { header = JSON.stringify(JSON.parse(atob(h)), null, 2); } catch {}
    $("#ag-402").textContent = `GET /cdn/footstep.mjs\nHTTP ${r.status} ${r.statusText || (r.status === 402 ? "Payment Required" : "")}\nPAYMENT-REQUIRED: ${h ? `${h.slice(0, 48)}…` : "(none)"}\n\n${header && header !== h ? header : JSON.stringify(body, null, 2)}`.slice(0, 1600);
  }).catch(() => {});
}
