// Kits: describe the vibe you're going for and get straight to playing (the Crate idea). The kit page plays every
// part (watermarked until paid), shows each part's knobs, and licenses the whole kit with one PayPal order; when the
// order lands every part turns clean and gets its import line and WAV.
import { audio, unlock, loadWav, play } from "/audio.js";
import { lazyWave, mountLive, themed } from "/wave.js";
import { KIND_LABEL, makeRenderer } from "/sound-page.js";
import { mountKitPlayer } from "/keys.js";

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const usd = (n) => `$${Number(n || 0).toFixed(2)}`;
const price = (n) => (Number(n) === 0 ? "Free" : usd(n));
const icon = (name) => `<i class="ph-bold ph-${name}" aria-hidden="true"></i>`;
const api = async (path, { method = "GET", body, headers = {} } = {}) => { const r = await fetch(path, { method, headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...headers }, body: body ? JSON.stringify(body) : undefined }); const j = await r.json().catch(() => ({})); if (!r.ok) throw Object.assign(new Error(j.error || `Request failed (${r.status})`), { status: r.status }); return j; };
const toast = (msg) => { const t = $("#toast"); if (!t) return; t.textContent = msg; t.classList.add("on"); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove("on"), 2600); };
const store = { get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} } };
for (const href of ["/sound.css", "/pay.css"]) if (!document.querySelector(`link[href="${href}"]`)) { const l = document.createElement("link"); l.rel = "stylesheet"; l.href = href; document.head.appendChild(l); }
// Copying the kit link follows github/clipboard-copy-element (src/clipboard.ts): navigator.clipboard.writeText when
// the browser allows it, else select the text and execCommand("copy"); the button says "Copied" for a moment.
async function copyLink(text, btn) {
  let ok = false;
  try { await navigator.clipboard.writeText(text); ok = true; }
  catch { const f = $("#kv-url"); if (f) { f.focus(); f.select(); try { ok = document.execCommand("copy"); } catch {} } }
  const lbl = btn.querySelector("span"); if (!lbl) return;
  lbl.textContent = ok ? "Copied" : "Press ⌘C"; btn.classList.toggle("done", ok);
  clearTimeout(copyLink.t); copyLink.t = setTimeout(() => { lbl.textContent = "Copy link"; btn.classList.remove("done"); }, 1800);
}
const EXAMPLES = ["rainy cyberpunk alley footsteps and UI clicks", "a cosy wooden tavern with a crackling fire", "sci-fi console: confirms, denies and a servo door", "lo-fi drum kit with a dusty kick", "forest at night, quiet, with an owl", "retro arcade: coins, blips and a power-up"];

export async function pageKits(app) {
  const params = new URLSearchParams(location.hash.split("?")[1] || "");
  app.innerHTML = `<div class="wrap kt-page">
    <h1>Kits</h1>
    <p class="lede">Describe a scene. Get six to ten sounds tuned to it, priced as one PayPal order.</p>
    <form class="kt-form" id="kt-form">
      <div class="row"><input type="text" id="kt-vibe" list="kt-sugg" maxlength="300" placeholder="Describe a scene: a haunted lighthouse in a storm" value="${esc(params.get("vibe") || "")}" autocomplete="off"><button class="btn primary" type="submit" id="kt-go">${icon("sparkle")} Make a kit</button></div>
      <datalist id="kt-sugg">${EXAMPLES.map((e) => `<option value="${esc(e)}"></option>`).join("")}</datalist>
    </form>
    <div id="kt-status" hidden></div>
    <section class="kt-recent"><h2>Recent kits</h2><div class="kt-list" id="kt-list"><div class="skel" style="height:72px"></div></div></section>
  </div>`;

  $("#kt-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const vibe = $("#kt-vibe").value.trim(); if (!vibe) return;
    const go = $("#kt-go"); go.disabled = true; go.innerHTML = `${icon("circle-notch")} Choosing sounds…`;
    const st = $("#kt-status"); st.hidden = false; st.className = "kt-status"; st.innerHTML = `<i></i><span>Claude is reading the registry and tuning knobs for "${esc(vibe)}"</span>`;
    try { const k = await api("/api/kits", { method: "POST", body: { vibe } }); location.hash = `#/kit/${k.id}`; }
    catch (err) { st.className = "kt-status err"; st.innerHTML = `<span>${esc(err.message)}</span>`; go.disabled = false; go.innerHTML = `${icon("sparkle")} Make a kit`; }
  });
  api("/api/kits").then((list) => {
    if (!$("#kt-list")) return; // the visitor has left the page
    // one tile per vibe: the list arrives licensed first, then newest, so the first kit seen for a vibe is the one to show;
    // the others are earlier takes on the same line and are counted on it
    const byVibe = new Map();
    for (const k of list) { const key = k.vibe.trim().toLowerCase(); const t = byVibe.get(key); t ? t.takes++ : byVibe.set(key, { ...k, takes: 1 }); }
    const tiles = [...byVibe.values()];
    // one row grammar across the site (the sounds list): a mosaic of the kit's parts, its name and vibe, the counts,
    // the price and whether it is paid; a link to play it on pads at the end
    $("#kt-list").innerHTML = tiles.length ? `<div class="s-rows kt-rows">${tiles.map((k) => `<div class="kt-row">
      <a class="kt-mini" href="#/kit/${esc(k.id)}" tabindex="-1" aria-hidden="true">${(k.cards || []).slice(0, 4).map((c) => `<img src="${esc(themed(c))}" alt="" loading="lazy" width="160" height="80">`).join("")}</a>
      <a class="s-name" href="#/kit/${esc(k.id)}"><b>${esc(k.title)}</b>${k.vibe.trim().toLowerCase() !== k.title.trim().toLowerCase() ? `<span>${esc(k.vibe)}</span>` : ""}</a>
      <span class="s-c num">${k.parts} sound${k.parts === 1 ? "" : "s"}</span><span class="s-c num">${k.creators} creator${k.creators === 1 ? "" : "s"}</span>
      <span class="s-c s-price num">${usd(k.total)}${k.licensed ? `<small>paid</small>` : ""}</span>
      <a class="kt-pads" href="#/pads/${esc(k.id)}" title="Play it on pads" aria-label="Play ${esc(k.title)} on pads">${icon("squares-four")}</a></div>`).join("")}</div>` : `<p class="muted">No kits yet. Yours will be the first.</p>`;
  }).catch((e) => { if (!$("#kt-list")) return; $("#kt-list").innerHTML = `<p class="muted">Recent kits could not be loaded: ${esc(e.message)}</p>`; });
}

export async function pageKit(app, id) {
  // the page's shape while the kit loads: a title, a list of parts, a bill
  app.innerHTML = `<div class="wrap a-page kv-skel" aria-busy="true"><div class="skel" style="height:14px;width:120px;margin-bottom:18px"></div><div class="skel" style="height:44px;width:min(420px,70%);margin-bottom:28px"></div><div class="kv-body"><div class="kv-parts">${Array.from({ length: 6 }, () => `<div class="kv-part"><span class="skel" style="width:36px;height:36px;border-radius:50%"></span><span class="skel" style="height:48px"></span><span><span class="skel" style="width:50%"></span><span class="skel" style="width:80%;margin-top:8px"></span></span><span class="skel" style="width:48px"></span></div>`).join("")}</div><div class="skel" style="height:320px;border-radius:var(--r-lg)"></div></div></div>`;
  let k;
  // a licensed kit's clean files go to its buyer only: this browser's claim token, or the budget it set up
  // a receipt link (#/kit/<id>?claim=<token>) hands the claim token to another browser of the same buyer, the way a
  // Gumroad receipt link opens the purchase anywhere; it is kept here and dropped from the address bar
  const claimQ = new URLSearchParams(location.hash.split("?")[1] || "").get("claim");
  if (claimQ && /^[0-9a-f]{32}$/.test(claimQ)) { store.set(`oasis.kit.${id}`, { ...(store.get(`oasis.kit.${id}`) || {}), claimToken: claimQ }); history.replaceState(null, "", `#/kit/${encodeURIComponent(id)}`); }
  const mine = store.get(`oasis.kit.${id}`), budget = store.get("oasis.budget");
  const who = { ...(mine?.claimToken ? { "X-Claim-Token": mine.claimToken } : {}), ...(budget?.token ? { Authorization: `Bearer ${budget.token}` } : {}) };
  const here = location.hash;
  try { k = await api(`/api/kits/${encodeURIComponent(id)}`, { headers: who }); } catch { app.innerHTML = `<div class="wrap split2"><div><h1>That kit doesn't exist.</h1><p class="lede">It may have been removed, or the link has a typo.</p><p style="margin-top:24px"><a class="btn primary" href="#/kits">Make a kit</a></p></div></div>`; return; }
  if (location.hash !== here) return; // the visitor moved on while this loaded
  // back from PayPal: the browser that started the order claims the licence with its claim token
  const pending = store.get(`oasis.kit.${k.id}`);
  if (!k.licensed && pending?.orderId) {
    try { k = await api(`/api/kits/${k.id}/claim`, { method: "POST", body: { order_id: pending.orderId, claim_token: pending.claimToken } }); if (k.licensed) toast("Paid. Every part is licensed and plays clean."); } catch (e) { if (e.status !== 409) toast(e.message); }
  }
  draw();

  function draw() {
    const paid = k.licensed, creators = {}, kitUrl = `${location.origin}/#/kit/${encodeURIComponent(k.id)}`;
    for (const i of k.items) if (i.price > 0) creators[i.author] = (creators[i.author] || 0) + i.price;
    app.innerHTML = `<div class="wrap a-page">
      <nav class="a-crumb" aria-label="Breadcrumb"><a href="#/kits">Kits</a><span>/</span><span>${esc(k.title)}</span></nav>
      <header class="kv-head">
        <div><h1>${esc(k.title)}</h1><p class="kv-vibe">${k.planner === "single" ? `One sound, licensed on its own with the knobs set on its page.` : `${k.vibe.trim().toLowerCase() !== k.title.trim().toLowerCase() ? `${esc(k.vibe.charAt(0).toUpperCase() + k.vibe.slice(1))}. ` : ""}<span class="num">${k.items.length}</span> sounds from ${k.creators.length} creator${k.creators.length === 1 ? "" : "s"}, <span title="${k.planner === "keywords" ? "The Claude planner was offline" : esc(k.planner)}">${k.planner === "keywords" ? "matched by keyword" : "picked by Claude"}</span>.`}</p></div>
        <div class="kv-side">
          ${paid ? (k.owner ? "" : `<span class="kv-state">${icon("waveform")} Licensed by its buyer; previews here</span>`) : `<span class="kv-state">${icon("waveform")} Watermarked preview until paid</span>`}
          <div class="kv-share"><input id="kv-url" type="hidden" value="${esc(kitUrl)}"><button class="btn small" id="kv-copy" type="button">${icon("link-simple")} <span>Copy link</span></button></div>
        </div>
      </header>
      <div class="kv-body">
        <div>
          <div class="kv-all"><button class="s-play big" id="kv-all" aria-label="Play the kit" aria-pressed="false">${icon("play")}</button><div class="kv-now" aria-live="polite"><b id="kv-now-t">Play the kit</b><span id="kv-now-s">${k.items.length === 1 ? "one part" : `${k.items.length} parts, one after another`}</span></div><div class="kv-live" id="kv-live" aria-hidden="true"></div><a class="btn primary kv-pads" href="#/pads/${esc(k.id)}">${icon("squares-four")} Play it on pads</a></div>
          <section class="kp" id="kv-play" hidden aria-label="Play the kit's voices"></section>
          <div class="kv-parts" id="kv-parts">${k.items.map((it, i) => part(it, i, paid)).join("")}</div>
        </div>
        <aside class="kv-bill">
          <div class="receipt">
            <div class="r-head"><b>${esc(k.title)}</b><span>${k.items.length} sound${k.items.length === 1 ? "" : "s"}, ${Object.keys(creators).length} creator${Object.keys(creators).length === 1 ? "" : "s"}</span></div>
            ${Object.entries(creators).sort((a, b) => b[1] - a[1]).map(([who, v]) => `<div class="r-who"><div class="r-name"><a href="#/creator/${encodeURIComponent(who)}">${esc(who)}</a><em class="num">${usd(v)}</em></div>${k.items.filter((i) => i.author === who && i.price > 0).map((i) => `<div class="r-line"><span>${esc(i.name)}</span><span class="num">${usd(i.price)}</span></div>`).join("")}</div>`).join("")}
            ${k.items.some((i) => i.price === 0) ? `<div class="r-who"><div class="r-name">${k.items.some((i) => i.covered) ? "covered and free" : "free"}<em class="num">$0.00</em></div>${k.items.filter((i) => i.price === 0).map((i) => `<div class="r-line"><span>${esc(i.name)}</span><span class="num">${i.covered ? "same program" : "free"}</span></div>`).join("")}</div>` : ""}
            <div class="r-total"><span>${paid ? "Paid in one PayPal order" : "One PayPal order"}</span><b class="num">${usd(k.total)}</b></div>
            ${paid ? `<dl class="r-facts"><div><dt>Captured</dt><dd>${new Date(k.licence.at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</dd></div><div><dt>PayPal order</dt><dd><code class="num">${esc(k.licence.orderId)}</code></dd></div>${k.licence.creators.map((c, i) => `<div><dt>${i ? "" : "Creators receive"}</dt><dd>${esc(c.author)} <span class="num">${usd(c.usd)}</span></dd></div>`).join("")}</dl><p class="r-note">Prices above are what the buyer paid; creators receive them less Oasis's 10% fee.</p>` : `<div class="r-paypal">${icon("paypal-logo")} Orders v2, itemised per part. Creator shares paid with PayPal Payouts.</div>`}
          </div>
          <button class="btn kv-packbtn" id="kv-pack" type="button">${icon("file-zip")} <span>Game pack: 8 takes of every sound${paid || k.total === 0 ? "" : " (preview)"}</span></button>
          ${paid ? `<a class="btn" href="#/kits">${icon("sparkle")} Make another kit</a>` : k.total > 0 ? `<button class="pk-pp" id="kv-pay" type="button">Pay ${usd(k.total)} with <em>Pay<b>Pal</b></em></button><p class="fine" style="margin:0;font-size:13px;color:var(--muted)">PayPal sandbox. No real money moves. You approve in PayPal's window and come back here licensed.</p>
            <div class="alt"><span>Or license it on a budget your agent holds:</span><div class="row"><input id="kv-mandate" placeholder="mdt_…"><button class="btn small" id="kv-lic" type="button">License</button></div></div>` : `<button class="btn primary" id="kv-free" type="button">${icon("seal-check")} Claim the free kit</button>`}
        </aside>
      </div>
    </div>`;
    wire(paid);
  }
  function part(it, i, paid) {
    const knobs = Object.entries(it.knobs || {});
    return `<div class="kv-part" data-i="${i}">
      <span class="kv-n num" aria-hidden="true">${i + 1}</span>
      <button class="s-play" data-play="${i}" aria-label="Play ${esc(it.name)}">${icon("play")}</button>
      <div class="pic" data-wave="${i}"></div>
      <div class="who"><b class="kv-name">${esc(it.name)}</b><span class="kv-meta">${esc(it.title !== it.name ? `${it.title} by ${it.author}` : `by ${it.author}`)}${it.reason && /^(matched|near|nothing)/.test(it.reason) ? `<em class="kv-why"> · ${esc(it.reason)}</em>` : ""}</span>${(() => { const shown = knobs.filter(([k, v]) => k !== "seed" && v !== false); return shown.length ? `<span class="kv-knobs" title="Knobs tuned for this kit">${shown.map(([k, v]) => `${esc(k)} <b>${esc(String(v))}</b>`).join(", ")}</span>` : ""; })()}
</div>
      <span class="kv-acts"><a href="#/a/${esc(it.assetId)}${it.licence ? `?lic=${esc(it.licence)}` : ""}" title="Open with knobs" aria-label="Open ${esc(it.name)} with knobs">${icon("sliders-horizontal")}</a>${it.wav ? `<a href="${esc(it.wav)}" title="WAV, 44.1 kHz" aria-label="Download ${esc(it.name)} as WAV">${icon("download-simple")}</a><button type="button" class="kv-code" aria-expanded="false" aria-controls="kv-code-${i}" title="Import line" aria-label="Show the import line">${icon("code")}</button>` : ""}</span>
      <div class="amt num${paid || it.price === 0 ? " clean" : ""}">${it.covered ? "covered" : price(it.price)}<small>${it.covered ? "same program" : paid ? "" : it.price === 0 ? "free" : "preview"}</small></div>
      ${it.wav ? `<div class="links" id="kv-code-${i}" hidden><code>import { play } from "${esc(it.module)}"</code></div>` : ""}
    </div>`;
  }
  // The game pack: what game audio does by hand (record several takes of every sound and pick one at random so the
  // tenth footstep is not the first) done by the programs. Eight seeds per part, named part_01..08, a manifest an
  // engine can read, the import lines for live takes, and a plain record of what was licensed. Paid parts come
  // clean once the kit is licensed; until then they carry the preview tick and the pack says so.
  async function gamePack(btn) {
    const slug = (t) => String(t).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
    const own = k.licensed && k.owner; // the clean files reach the buyer only
    const kitSlug = slug(k.title), files = [], manifest = { kit: k.title, vibe: k.vibe, licensed: !!own, order: k.licence?.orderId || null, parts: [] };
    const label = btn.querySelector("span"), was = label.textContent;
    const parts = k.items.map((it, i) => ({ it, i, name: slug(it.name) || `part_${i + 1}` }));
    const seen = new Map(); parts.forEach((p) => { const n = (seen.get(p.name) || 0) + 1; seen.set(p.name, n); if (n > 1) p.name += `_${n}`; });
    let done = 0; const total = parts.reduce((s, p) => s + (p.it.values?.seed !== undefined ? 8 : 1), 0);
    for (const { it, name } of parts) {
      const seeded = it.values?.seed !== undefined, base = Number(it.values?.seed ?? 1), takes = [];
      for (let n = 0; n < (seeded ? 8 : 1); n++) {
        // clean parts at 44.1 kHz (the rate the kit rows advertise); a preview stays the 22.05 kHz watermarked render
        const clean = !!it.licence || it.price === 0, knobs = { ...it.knobs, ...(seeded ? { seed: base + n } : {}) }, q = `?p=${encodeURIComponent(JSON.stringify(knobs))}${clean ? "&sr=44100" : ""}`;
        const url = it.licence ? `/api/licenses/${it.licence}/render.wav${q}` : `/api/assets/${encodeURIComponent(it.assetId)}/render.wav${q}`;
        const r = await fetch(url); if (!r.ok) throw new Error(`${it.name}: render failed (${r.status})`);
        const file = `${kitSlug}/${name}_${String(n + 1).padStart(2, "0")}.wav`;
        files.push({ name: file, data: new Uint8Array(await r.arrayBuffer()) });
        takes.push({ file, seed: seeded ? base + n : null, watermarked: r.headers.get("X-Oasis-Watermarked") === "1" });
        label.textContent = `Rendering ${++done} of ${total}`;
      }
      manifest.parts.push({ name: it.name, program: it.assetId, title: it.title, author: it.author, kind: it.kind, knobs: it.knobs, takes, live: it.module || `${location.origin}/cdn/${it.assetId}.mjs` });
    }
    const marked = manifest.parts.some((p) => p.takes.some((t) => t.watermarked));
    files.push({ name: `${kitSlug}/oasis-kit.json`, data: JSON.stringify(manifest, null, 2) });
    files.push({ name: `${kitSlug}/README.txt`, data: [`${k.title}`, `"${k.vibe}"`, "",
      "Every sound here is eight takes of one program (seeds in oasis-kit.json). Pick one at random each time it plays",
      "and the player never hears the same file twice in a row. For takes without end, import the program and play it live:", "",
      ...manifest.parts.map((p, n) => `  import { play as play${n + 1} } from "${p.live}";   // ${p.name}`), "",
      "Each import is its own binding (play1, play2, ...); call one with an AudioContext to hear a fresh take.", "",
      marked ? "These are previews: paid parts carry a soft tick every 0.6 s until the kit is licensed on its page." : "These are clean renders.", "",
      `Kit page: ${location.origin}/#/kit/${k.id}`, ""].join("\n") });
    files.push({ name: `${kitSlug}/LICENSE.txt`, data: [own ? `Licensed with PayPal order ${k.licence.orderId} on ${new Date(k.licence.at).toUTCString()}.` : "Not licensed yet. These files are previews.", "",
      "Parts, their programs and who made them:", ...manifest.parts.map((p) => `  ${p.name}: ${p.title} (${p.program}) by ${p.author}`), "",
      own ? "What the order bought: a license to import and ship each program, at any knobs and any seed, in what you make (the terms the registry states on every program's 402 and in /llms.txt)." : "",
      `Credit line: Sounds from Oasis by ${[...new Set(manifest.parts.map((p) => p.author))].join(", ")}.`, ""].join("\n") });
    const { zip } = await import("/zip.js");
    const a = document.createElement("a"); a.href = URL.createObjectURL(zip(files)); a.download = `${kitSlug}-game-pack${marked ? "-preview" : ""}.zip`;
    document.body.appendChild(a); a.click(); a.remove();
    label.textContent = `Saved ${files.length - 3} takes`; setTimeout(() => (label.textContent = was), 2400);
  }
  function wire(paid) {
    $("#kv-pack").addEventListener("click", async (e) => { const b = e.currentTarget; b.disabled = true; try { await gamePack(b); } catch (err) { toast(err.message); } b.disabled = false; });
    // the import line is one click away instead of printed under every part
    $("#kv-parts").addEventListener("click", (e) => {
      const b = e.target.closest(".kv-code"); if (!b) return;
      const box = document.getElementById(b.getAttribute("aria-controls")), open = box.hidden;
      box.hidden = !open; b.setAttribute("aria-expanded", open);
    });
    const buffers = new Map();
    const bufFor = async (i) => { if (!buffers.has(i)) buffers.set(i, loadWav(k.items[i].licence ? `/api/licenses/${k.items[i].licence}/render.wav?p=${encodeURIComponent(JSON.stringify(k.items[i].knobs))}` : k.items[i].preview.replace(/^https?:\/\/[^/]+/, ""))); return buffers.get(i); };
    // each part's waveform is a small wavesurfer over the same buffer it plays (public/wave.js lazyWave), dimmed while
    // it is a watermarked preview; the live spectrum and scope by "play the kit" listen to the master bus
    const waves = k.items.map((it, i) => lazyWave($(`[data-wave="${i}"]`), async () => ({ buffer: await bufFor(i), dim: !paid && it.price > 0 }), { height: 48, barWidth: 2, barGap: 1, barRadius: 1, wsOptions: { cursorWidth: 2 } }));
    const live = mountLive($("#kv-live"));
    // parts that are voices (a note knob) are playable on a keyboard, with the kit's tuned knobs and, once the kit is
    // paid, its licence: public/keys.js mountKitPlayer, the same strip the sound page has
    let kp = null;
    Promise.all(k.items.map((it) => api(`/api/assets/${encodeURIComponent(it.assetId)}`).then((d) => ({ ...d, title: it.name, values: it.knobs, licence: it.licence || null }), () => null))).then((ds) => {
      if (!$("#kv-play")) return;
      kp = mountKitPlayer($("#kv-play"), ds.filter(Boolean), { title: "Play the voices", renderFor: (v) => makeRenderer(v, { licence: v.licence, analysis: false }), blurb: paid && k.owner ? "Licensed: every note plays clean." : k.total > 0 ? "Watermarked previews until the kit is paid." : "" });
    });
    addEventListener("hashchange", () => setTimeout(() => { if (!$("#kv-live")) { stop(); live.destroy(); kp?.destroy(); } }, 0), { once: true });
    // one transport for the page: a single part, or the whole kit in order. Every start takes a new token, so a stop
    // or a newer click ends whatever was playing (its wave pauses, its "finish" wait resolves) and the loop below exits.
    let token = 0, current = null, playingAll = false;
    const motion = matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    const mark = (i, on) => {
      const b = $(`[data-play="${i}"]`), row = b?.closest(".kv-part"); if (!b) return;
      b.classList.toggle("on", on); b.innerHTML = icon(on ? "stop" : "play"); b.setAttribute("aria-label", `${on ? "Stop" : "Play"} ${k.items[i].name}`);
      row.classList.toggle("on", on); if (on) row.setAttribute("aria-current", "true"); else row.removeAttribute("aria-current");
    };
    const now = (t, sub) => { $("#kv-now-t").textContent = t; $("#kv-now-s").textContent = sub; };
    const allBtn = (on) => { const b = $("#kv-all"); b.classList.toggle("on", on); b.innerHTML = icon(on ? "stop" : "play"); b.setAttribute("aria-pressed", String(on)); b.setAttribute("aria-label", on ? "Stop the kit" : "Play the kit"); };
    function stop() {
      token++;
      if (current) { current.end(); current = null; }
      if (playingAll) { playingAll = false; allBtn(false); now("Play the kit", `${k.items.length} parts, one after another`); $("#kv-parts").classList.remove("seq"); }
    }
    const playOne = async (i, t) => {
      mark(i, true);
      try {
        const w = await waves[i].ensure();
        if (t !== token) return;
        await new Promise((resolve) => {
          if (w) {
            const done = () => { w.ws.un("finish", done); w.ws.un("pause", done); resolve(); };
            current = { i, end: () => w.stop() };
            w.ws.on("finish", done); w.ws.on("pause", done);
            w.play();
          } else {
            bufFor(i).then((buf) => { if (t !== token) return resolve(); const h = play(buf); current = { i, end: () => { h.stop?.(); resolve(); } }; h.done.then(resolve); }, resolve);
          }
        });
      } catch (e) { toast(e.message); }
      finally { mark(i, false); if (current?.i === i) current = null; }
    };
    $("#kv-parts").addEventListener("click", async (e) => {
      const b = e.target.closest("[data-play]"); if (!b) return;
      const i = Number(b.dataset.play), was = current?.i === i && !playingAll;
      stop(); if (was) return;
      await unlock(); playOne(i, token);
    });
    $("#kv-all").addEventListener("click", async () => {
      if (playingAll) { stop(); return; }
      stop(); await unlock();
      const t = token; playingAll = true; allBtn(true); $("#kv-parts").classList.add("seq");
      for (let i = 0; i < k.items.length && t === token; i++) {
        now(k.items[i].name, `Part ${i + 1} of ${k.items.length}`);
        $(`.kv-part[data-i="${i}"]`)?.scrollIntoView({ block: "nearest", behavior: motion });
        if (i + 1 < k.items.length) waves[i + 1].ensure(); // the next take decodes while this one plays
        await playOne(i, t);
        if (t === token) await new Promise((r) => setTimeout(r, 220));
      }
      if (t === token) stop();
    });
    $("#kv-copy").addEventListener("click", () => copyLink($("#kv-url").value, $("#kv-copy")));
    $("#kv-url").addEventListener("focus", (e) => e.target.select());
    $("#kv-pay")?.addEventListener("click", async () => {
      const b = $("#kv-pay"); b.setAttribute("aria-busy", "true"); b.innerHTML = `<span class="pk-spin" aria-hidden="true"></span> Opening PayPal…`;
      try {
        const pend = store.get(`oasis.kit.${k.id}`);
        if (pend?.approveUrl && Date.now() - (pend.at || 0) < 3 * 3600e3) { location.href = pend.approveUrl; return; }
        const o = await api(`/api/kits/${k.id}/checkout`, { method: "POST", body: {} });
        store.set(`oasis.kit.${k.id}`, { orderId: o.order_id, claimToken: o.claim_token, approveUrl: o.approve_url, at: Date.now() });
        location.href = o.approve_url;
      } catch (e) { toast(e.message); b.removeAttribute("aria-busy"); b.innerHTML = `Pay ${usd(k.total)} with <em>Pay<b>Pal</b></em>`; }
    });
    $("#kv-lic")?.addEventListener("click", async () => {
      const m = $("#kv-mandate").value.trim(); if (!m) { toast("Paste the budget token"); return; }
      try { k = await api(`/api/kits/${k.id}/license`, { method: "POST", body: { mandate: m, agent_name: "the kit page" } }); toast("Licensed on the budget."); draw(); } catch (e) { toast(e.message); }
    });
    $("#kv-free")?.addEventListener("click", async () => { try { k = await api(`/api/kits/${k.id}/license`, { method: "POST", body: {} }); draw(); } catch (e) { toast(e.message); } });
  }
}
