// Kits: describe the vibe you're going for and get straight to playing (the Crate idea). The kit page plays every
// part (watermarked until paid), shows each part's knobs, and licenses the whole kit with one PayPal order; when the
// order lands every part turns clean and gets its import line and WAV.
import { audio, unlock, loadWav, play } from "/audio.js";
import { lazyWave, mountLive } from "/wave.js";
import { KIND_LABEL, makeRenderer } from "/sound-page.js";
import { mountKitPlayer } from "/keys.js";

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const usd = (n) => `$${Number(n || 0).toFixed(2)}`;
const price = (n) => (Number(n) === 0 ? "Free" : usd(n));
const icon = (name) => `<i class="ph-bold ph-${name}" aria-hidden="true"></i>`;
const api = async (path, { method = "GET", body } = {}) => { const r = await fetch(path, { method, headers: body ? { "Content-Type": "application/json" } : {}, body: body ? JSON.stringify(body) : undefined }); const j = await r.json().catch(() => ({})); if (!r.ok) throw Object.assign(new Error(j.error || `Request failed (${r.status})`), { status: r.status }); return j; };
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
const EXAMPLES = ["rainy cyberpunk alley footsteps and UI clicks", "a cosy wooden tavern with a crackling fire", "sci-fi console: confirms, denies and a servo door", "lo-fi drum kit with a dusty kick", "forest at night, quiet, with an owl", "a kitchen scene: knives, a kettle and a fridge"];

export async function pageKits(app) {
  const params = new URLSearchParams(location.hash.split("?")[1] || "");
  app.innerHTML = `<div class="wrap kt-page">
    <h1>Describe the vibe.</h1>
    <p class="lede">One line in, a kit out. Claude picks six to ten sound programs, tunes their knobs to your scene, and one PayPal order pays every creator.</p>
    <form class="kt-form" id="kt-form">
      <div class="row"><input type="text" id="kt-vibe" maxlength="300" placeholder="rainy cyberpunk alley footsteps and UI clicks" value="${esc(params.get("vibe") || "")}" autocomplete="off"><button class="btn primary" type="submit" id="kt-go">${icon("sparkle")} Make a kit</button></div>
      <div class="kt-examples">${EXAMPLES.map((e) => `<button type="button" data-v="${esc(e)}">${esc(e)}</button>`).join("")}</div>
    </form>
    <div id="kt-status" hidden></div>
    <section class="kt-recent"><h2>Recent kits.</h2><div class="kt-list" id="kt-list"><div class="skel" style="height:72px"></div></div></section>
  </div>`;
  $(".kt-examples").addEventListener("click", (e) => { const b = e.target.closest("button[data-v]"); if (!b) return; $("#kt-vibe").value = b.dataset.v; $("#kt-form").requestSubmit(); });
  $("#kt-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const vibe = $("#kt-vibe").value.trim(); if (!vibe) return;
    const go = $("#kt-go"); go.disabled = true; go.innerHTML = `${icon("circle-notch")} Choosing sounds…`;
    const st = $("#kt-status"); st.hidden = false; st.className = "kt-status"; st.innerHTML = `<i></i><span>Claude is reading the registry and tuning knobs for "${esc(vibe)}"</span>`;
    try { const k = await api("/api/kits", { method: "POST", body: { vibe } }); location.hash = `#/kit/${k.id}`; }
    catch (err) { st.className = "kt-status err"; st.innerHTML = `<span>${esc(err.message)}</span>`; go.disabled = false; go.innerHTML = `${icon("sparkle")} Make a kit`; }
  });
  api("/api/kits").then((list) => {
    // one tile per vibe: the list arrives licensed first, then newest, so the first kit seen for a vibe is the one to show;
    // the others are earlier takes on the same line and are counted on it
    const byVibe = new Map();
    for (const k of list) { const key = k.vibe.trim().toLowerCase(); const t = byVibe.get(key); t ? t.takes++ : byVibe.set(key, { ...k, takes: 1 }); }
    const tiles = [...byVibe.values()];
    $("#kt-list").innerHTML = tiles.length ? tiles.map((k) => `<a class="kt-tile" href="#/kit/${esc(k.id)}">
      <span class="kt-mosaic" data-n="${(k.cards || []).length}">${(k.cards || []).map((c) => `<img src="${esc(c)}" alt="" loading="lazy" width="320" height="160">`).join("")}</span>
      <span class="kt-body"><b>${esc(k.title)}</b>${k.licensed ? `<em class="kt-paid">${icon("seal-check")} Paid</em>` : ""}<q>${esc(k.vibe)}</q>
      <span class="kt-facts">${[[k.parts, "sounds"], [k.creators, "creators"], [usd(k.total), ""], ...(k.takes > 1 ? [[k.takes, "takes"]] : [])].map(([v, l]) => `<span><b class="num">${v}</b>${l ? ` ${l}` : ""}</span>`).join("")}</span></span></a>`).join("") : `<p class="muted">No kits yet. Yours will be the first.</p>`;
  }).catch((e) => { $("#kt-list").innerHTML = `<p class="muted">Recent kits could not be loaded: ${esc(e.message)}</p>`; });
}

export async function pageKit(app, id) {
  // the page's shape while the kit loads: a title, a list of parts, a bill
  app.innerHTML = `<div class="wrap a-page kv-skel" aria-busy="true"><div class="skel" style="height:14px;width:120px;margin-bottom:18px"></div><div class="skel" style="height:44px;width:min(420px,70%);margin-bottom:28px"></div><div class="kv-body"><div class="kv-parts">${Array.from({ length: 6 }, () => `<div class="kv-part"><span class="skel" style="width:36px;height:36px;border-radius:50%"></span><span class="skel" style="height:48px"></span><span><span class="skel" style="width:50%"></span><span class="skel" style="width:80%;margin-top:8px"></span></span><span class="skel" style="width:48px"></span></div>`).join("")}</div><div class="skel" style="height:320px;border-radius:var(--r-lg)"></div></div></div>`;
  let k;
  try { k = await api(`/api/kits/${encodeURIComponent(id)}`); } catch { app.innerHTML = `<div class="wrap split2"><div><h1>That kit doesn't exist.</h1><p class="lede">It may have been removed, or the link has a typo.</p><p style="margin-top:24px"><a class="btn primary" href="#/kits">Make a kit</a></p></div></div>`; return; }
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
        <div><h1>${esc(k.title)}</h1><p class="kv-vibe">"<b>${esc(k.vibe)}</b>". <span class="num">${k.items.length}</span> sounds from ${k.creators.length} creators, planned by ${esc(k.planner)}.</p></div>
        <div class="kv-side">
          <span class="kv-state${paid ? " paid" : ""}">${paid ? `${icon("seal-check")} Licensed · PayPal order ${esc(k.licence.orderId)}` : `${icon("waveform")} Watermarked preview until paid`}</span>
          <div class="kv-share"><label class="sr-only" for="kv-url">Link to this kit</label><input id="kv-url" readonly value="${esc(kitUrl)}" spellcheck="false"><button class="btn small" id="kv-copy" type="button">${icon("link-simple")} <span>Copy link</span></button></div>
        </div>
      </header>
      <div class="kv-body">
        <div>
          <div class="kv-all"><button class="s-play big" id="kv-all" aria-label="Play the kit" aria-pressed="false">${icon("play")}</button><div class="kv-now" aria-live="polite"><b id="kv-now-t">Play the kit</b><span id="kv-now-s">${k.items.length} parts, one after another</span></div><div class="kv-live" id="kv-live" aria-hidden="true"></div></div>
          <section class="kp" id="kv-play" hidden aria-label="Play the kit's voices"></section>
          <div class="kv-parts" id="kv-parts">${k.items.map((it, i) => part(it, i, paid)).join("")}</div>
        </div>
        <aside class="kv-bill">
          <div class="receipt">
            <div class="r-head"><b>${esc(k.title)}</b><span>${k.items.length} sounds, ${Object.keys(creators).length} creators</span></div>
            ${Object.entries(creators).sort((a, b) => b[1] - a[1]).map(([who, v]) => `<div class="r-who"><div class="r-name"><a href="#/creator/${encodeURIComponent(who)}">${esc(who)}</a><em class="num">${usd(v)}</em></div>${k.items.filter((i) => i.author === who && i.price > 0).map((i) => `<div class="r-line"><span>${esc(i.name)}</span><span class="num">${usd(i.price)}</span></div>`).join("")}</div>`).join("")}
            ${k.items.some((i) => i.price === 0) ? `<div class="r-who"><div class="r-name">${k.items.some((i) => i.covered) ? "covered and free" : "free"}<em class="num">$0.00</em></div>${k.items.filter((i) => i.price === 0).map((i) => `<div class="r-line"><span>${esc(i.name)}</span><span class="num">${i.covered ? "same program" : "free"}</span></div>`).join("")}</div>` : ""}
            <div class="r-total"><span>${paid ? "Paid in one PayPal order" : "One PayPal order"}</span><b class="num">${usd(k.total)}</b></div>
            ${paid ? `<div class="r-paypal">${icon("paypal-logo")} Captured ${new Date(k.licence.at).toLocaleString()}. ${k.licence.creators.map((c) => `${esc(c.author)} +${usd(c.usd)}`).join(", ")}.</div>` : `<div class="r-paypal">${icon("paypal-logo")} Orders v2, itemised per part. Creator shares paid with PayPal Payouts.</div>`}
          </div>
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
      <button class="s-play" data-play="${i}" aria-label="Play ${esc(it.name)}">${icon("play")}</button>
      <div class="pic" data-wave="${i}"></div>
      <div class="who"><b class="kv-name">${esc(it.name)}</b><span class="kv-meta">${esc(it.title)}, ${esc(KIND_LABEL[it.kind] || it.kind)} by ${esc(it.author)}${it.reason ? `. ${esc(it.reason[0].toUpperCase() + it.reason.slice(1).replace(/[.\s]+$/, ""))}.` : ""}</span>${knobs.length ? `<span class="kv-knobs">${knobs.map(([k, v]) => `<span>${esc(k)} ${esc(String(v))}</span>`).join("")}</span>` : ""}
        <span class="kv-acts"><a href="#/a/${esc(it.assetId)}${it.licence ? `?lic=${esc(it.licence)}` : ""}">${icon("sliders-horizontal")} Open with knobs</a>${it.wav ? `<a href="${esc(it.wav)}">${icon("download-simple")} WAV, 44.1 kHz</a><button type="button" class="kv-code" aria-expanded="false" aria-controls="kv-code-${i}">${icon("code")} Import line</button>` : ""}</span></div>
      <div class="amt num${paid || it.price === 0 ? " clean" : ""}">${it.covered ? "covered" : price(it.price)}<small>${it.covered ? "same program" : paid || it.price === 0 ? "clean" : "preview"}</small></div>
      ${it.wav ? `<div class="links" id="kv-code-${i}" hidden><code>import { play } from "${esc(it.module)}"</code></div>` : ""}
    </div>`;
  }
  function wire(paid) {
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
      kp = mountKitPlayer($("#kv-play"), ds.filter(Boolean), { title: "Play the voices", renderFor: (v) => makeRenderer(v, { licence: v.licence, analysis: false }), blurb: paid ? "Licensed: every note plays clean." : k.total > 0 ? "Watermarked previews until the kit is paid." : "" });
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
        const o = await api(`/api/kits/${k.id}/checkout`, { method: "POST", body: {} });
        store.set(`oasis.kit.${k.id}`, { orderId: o.order_id, claimToken: o.claim_token });
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
