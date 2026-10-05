// Kits: describe the vibe you're going for and get straight to playing (the Crate idea). The kit page plays every
// part (watermarked until paid), shows each part's knobs, and licenses the whole kit with one PayPal order; when the
// order lands every part turns clean and gets its import line and WAV.
import { audio, unlock, loadWav, play, drawWave, playhead } from "/audio.js";
import { KIND_LABEL } from "/sound-page.js";

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
const EXAMPLES = ["rainy cyberpunk alley footsteps and UI clicks", "a cosy wooden tavern with a crackling fire", "sci-fi console: confirms, denies and a servo door", "lo-fi drum kit with a dusty kick", "forest at night, quiet, with an owl", "a kitchen scene: knives, a kettle and a fridge"];

export async function pageKits(app) {
  const params = new URLSearchParams(location.hash.split("?")[1] || "");
  app.innerHTML = `<div class="wrap kt-page">
    <h1>Describe the vibe.</h1>
    <p class="lede">One line in, a kit out: Claude picks six to ten sound programs from the registry and tunes their knobs to your scene. One PayPal order licenses the kit and pays every creator in it.</p>
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
    $("#kt-list").innerHTML = list.length ? list.map((k) => `<a class="kt-tile" href="#/kit/${esc(k.id)}"><b>${esc(k.title)}</b><span>"${esc(k.vibe)}"</span><span>${k.parts} sounds · ${k.creators} creators · ${usd(k.total)} ${k.licensed ? '· <em class="paid">paid</em>' : ""}</span></a>`).join("") : `<p class="muted">No kits yet. Yours will be the first.</p>`;
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
    const paid = k.licensed, creators = {};
    for (const i of k.items) if (i.price > 0) creators[i.author] = (creators[i.author] || 0) + i.price;
    app.innerHTML = `<div class="wrap a-page">
      <nav class="a-crumb" aria-label="Breadcrumb"><a href="#/kits">Kits</a><span>/</span><span>${esc(k.title)}</span></nav>
      <header class="kv-head">
        <div><h1>${esc(k.title)}</h1><p class="kv-vibe">"<b>${esc(k.vibe)}</b>". <span class="num">${k.items.length}</span> sounds from ${k.creators.length} creators, planned by ${esc(k.planner)}.</p></div>
        <span class="kv-state${paid ? " paid" : ""}">${paid ? `${icon("seal-check")} Licensed · PayPal order ${esc(k.licence.orderId)}` : `${icon("waveform")} Watermarked preview until paid`}</span>
      </header>
      <div class="kv-body">
        <div>
          <div class="kv-all"><button class="s-play" id="kv-all" aria-label="Play the whole kit">${icon("play")}</button><span>Play the kit, one part after another. Each part plays a fresh take of its program.</span></div>
          <div class="kv-parts" id="kv-parts">${k.items.map((it, i) => part(it, i, paid)).join("")}</div>
        </div>
        <aside class="kv-bill">
          <div class="receipt">
            <div class="r-head"><b>${esc(k.title)}</b><span>${k.items.length} sounds, ${Object.keys(creators).length} creators</span></div>
            ${Object.entries(creators).sort((a, b) => b[1] - a[1]).map(([who, v]) => `<div class="r-who"><div class="r-name">${esc(who)}<em class="num">${usd(v)}</em></div>${k.items.filter((i) => i.author === who && i.price > 0).map((i) => `<div class="r-line"><span>${esc(i.name)}</span><span class="num">${usd(i.price)}</span></div>`).join("")}</div>`).join("")}
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
      <div class="pic"><canvas data-wave="${i}"></canvas></div>
      <div class="who"><b>${esc(it.name)}</b><span>${esc(it.title)}, ${esc(KIND_LABEL[it.kind] || it.kind)} by ${esc(it.author)}${it.reason ? `. ${esc(it.reason[0].toUpperCase() + it.reason.slice(1))}.` : ""}</span>${knobs.length ? `<span class="knobs">${knobs.map(([k, v]) => `<span>${esc(k)} ${esc(String(v))}</span>`).join("")}</span>` : ""}
        <span class="acts"><a href="#/a/${esc(it.assetId)}${it.licence ? `?lic=${esc(it.licence)}` : ""}">${icon("sliders-horizontal")} Open with knobs</a>${it.wav ? `<a href="${esc(it.wav)}">${icon("download-simple")} WAV, 44.1 kHz</a>` : ""}</span></div>
      <div class="amt num${paid || it.price === 0 ? " clean" : ""}">${it.covered ? "covered" : price(it.price)}<small>${it.covered ? "same program" : paid || it.price === 0 ? "clean" : "preview"}</small></div>
      ${it.wav ? `<div class="links"><code>import { play } from "${esc(it.module)}"</code></div>` : ""}
    </div>`;
  }
  function wire(paid) {
    const buffers = new Map();
    const bufFor = async (i) => { if (!buffers.has(i)) buffers.set(i, loadWav(k.items[i].licence ? `/api/licenses/${k.items[i].licence}/render.wav?p=${encodeURIComponent(JSON.stringify(k.items[i].knobs))}` : k.items[i].preview.replace(/^https?:\/\/[^/]+/, ""))); return buffers.get(i); };
    // waveforms, drawn from each part's numbers
    k.items.forEach(async (it, i) => {
      try { const j = await api(`/api/assets/${it.assetId}/sound.json?p=${encodeURIComponent(JSON.stringify(it.knobs))}`); const c = $(`canvas[data-wave="${i}"]`); if (c) { it.wave = j.wave; drawWave(c, j.wave, { dim: !paid && it.price > 0 }); } } catch {}
    });
    let playingAll = false;
    const playOne = async (i) => {
      await unlock();
      const b = $(`[data-play="${i}"]`); b.classList.add("on"); b.innerHTML = icon("stop"); b.closest(".kv-part")?.classList.add("on");
      try {
        const buf = await bufFor(i); const p = play(buf);
        const c = $(`canvas[data-wave="${i}"]`); if (c && k.items[i].wave) playhead(buf, p.startedAt, (at) => drawWave(c, k.items[i].wave, { at, dim: !paid && k.items[i].price > 0 }));
        await p.done;
      } catch (e) { toast(e.message); }
      b.classList.remove("on"); b.innerHTML = icon("play"); b.closest(".kv-part")?.classList.remove("on");
    };
    app.addEventListener("click", (e) => { const b = e.target.closest("[data-play]"); if (b) playOne(Number(b.dataset.play)); });
    $("#kv-all").addEventListener("click", async () => {
      if (playingAll) { playingAll = false; return; }
      playingAll = true; $("#kv-all").innerHTML = icon("stop");
      for (let i = 0; i < k.items.length && playingAll; i++) { await playOne(i); await new Promise((r) => setTimeout(r, 140)); }
      playingAll = false; $("#kv-all").innerHTML = icon("play");
    });
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
