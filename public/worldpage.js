// The Oasis demo: describe a place, watch an agent build it from parametric 3D kit pieces, reshape any piece,
// then buy the whole world in one PayPal approval that pays every creator whose piece you used.
import { createViewer } from "/world3d.js";

const EXAMPLES = ["A Kyoto market street at dusk", "A seaside summer town", "A snowy winter village at night", "A cute pastel candy town", "A cosy autumn high street"];

export async function pageWorld(app, h) {
  const { api, esc, money, mountPayPal, knobControl, newOrder, toast, claims } = h;
  app.innerHTML = `<div class="world">
    <div class="world-stage" id="stage"></div>
    <div class="world-prompt">
      <h1>Describe a place. <em>Watch it build.</em></h1>
      <form id="wform" class="wform"><input id="wp" maxlength="300" autocomplete="off" placeholder="A Kyoto market street at dusk" /><button class="btn primary" id="wgo">Build</button></form>
      <div class="wchips">${EXAMPLES.map((e) => `<button class="chip" data-ex="${esc(e)}">${esc(e)}</button>`).join("")}</div>
      <label class="wagent"><input type="checkbox" id="wagent" ${h.agentReady ? "checked" : "disabled"} /> Claude art-directs it <span class="muted">${h.agentReady ? "(about 20 s)" : "(agent offline)"}</span></label>
    </div>
    <div class="world-time" role="toolbar"><button class="btn small" data-t="day">Day</button><button class="btn small" data-t="dusk">Dusk</button><button class="btn small" data-t="night">Night</button></div>
    <aside class="world-panel" id="wpanel"><p class="muted" style="margin:0">Building…</p></aside>
    <div class="world-inspect" id="winspect" hidden></div>
    <p class="world-hint">Drag to orbit · scroll to zoom · click any piece to reshape it</p>
  </div>`;

  const v = createViewer(document.getElementById("stage"), { time: "day" });
  let plan = null, groups = [], building = 0;

  const keyOf = (p) => p.asset + "|" + JSON.stringify(p.knobs);
  const sig = (p) => keyOf(p) + "|" + p.at.join(",") + "|" + p.rot;

  // Shows a plan. Pieces that are unchanged since the last plan stay put; new or changed ones drop in.
  async function show(next, run, { fresh = false } = {}) {
    const keys = [...new Set(next.placements.map(keyOf))];
    const { parts } = await api("/api/world/parts", { method: "POST", body: { items: keys.map((k) => ({ asset: k.slice(0, k.indexOf("|")), knobs: JSON.parse(k.slice(k.indexOf("|") + 1)) })) } });
    if (run !== building) return;
    const byKey = new Map(keys.map((k, i) => [k, parts[i]]));
    const old = new Map();
    if (!fresh && plan) plan.placements.forEach((p, i) => { if (groups[i]) old.set(sig(p), [...(old.get(sig(p)) || []), groups[i]]); });
    else v.clearWorld();
    plan = next;
    v.setTime(plan.time);
    app.querySelectorAll("[data-t]").forEach((b) => b.classList.toggle("on", b.dataset.t === plan.time));
    const order = (a) => (a.startsWith("town-road") || a.startsWith("town-plaza") ? 0 : ["town-shop", "town-house", "town-stall", "town-torii"].includes(a) ? 1 : 2);
    const idx = plan.placements.map((p, i) => i).sort((a, b) => order(plan.placements[a].asset) - order(plan.placements[b].asset) || plan.placements[a].at[0] - plan.placements[b].at[0]);
    const nextGroups = [];
    let dropped = 0;
    idx.forEach((i) => {
      const pl = plan.placements[i];
      const reuse = old.get(sig(pl))?.pop();
      if (reuse) { reuse.userData.idx = i; nextGroups[i] = reuse; return; }
      const g = v.addPlaced(byKey.get(keyOf(pl)), { at: pl.at, rot: pl.rot });
      g.userData.idx = i;
      nextGroups[i] = g;
      v.dropIn(g, fresh ? (order(pl.asset) === 0 ? dropped * 18 : 500 + dropped * 55) : dropped * 70);
      dropped++;
    });
    for (const gs of old.values()) for (const g of gs) v.content.remove(g);
    groups = nextGroups;
    animateLife();
    if (!show.framed) {
      const { THREE } = await import("/world3d.js");
      const [w, d] = plan.size, wide = innerWidth > 860;
      const box = new THREE.Box3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(w, 8, d));
      v.frame(box, { fit: 1.2 });
      // fit the world inside the canvas area the panels leave free (left panel only covers the top)
      const el = document.getElementById("stage"), W = el.clientWidth, H = el.clientHeight;
      const right = wide ? 1 - (document.getElementById("wpanel").offsetWidth + 48) / W : 0.97;
      const top = wide ? 0.06 : 0.04, left = wide ? 0.03 : 0.03;
      v.fitToRect(box, [left, top, right, 0.86]);
      show.framed = true;
    }
    drawPanel();
  }

  // Life: trams run along their rails and wrap around; the camera drifts until the visitor takes over.
  let lifeTick = null;
  function animateLife() {
    if (lifeTick) v.tickers.delete(lifeTick);
    const trams = groups.filter((g, i) => g && plan.placements[i]?.asset === "town-tram");
    const W = plan.size[0];
    let last = performance.now();
    lifeTick = (t) => {
      const dt = Math.min(0.05, (t - last) / 1000); last = t;
      for (const g of trams) { if (!g.visible) continue; g.position.x += dt * 2.2; if (g.position.x > W + 1) g.position.x = -9; }
    };
    v.tickers.add(lifeTick);
  }
  v.controls.autoRotate = true;
  v.controls.autoRotateSpeed = 0.35;
  v.renderer.domElement.addEventListener("pointerdown", () => { v.controls.autoRotate = false; }, { once: true });

  async function build(prompt, { agent = false } = {}) {
    const run = ++building;
    status(agent ? "Claude is planning your world. This takes about 20 seconds." : "Planning…");
    $("#winspect").hidden = true; v.select(null);
    // the procedural plan builds immediately; Claude's version replaces it when it arrives
    const quick = await api("/api/world/plan", { method: "POST", body: { prompt } });
    if (run !== building) return;
    await show(quick, run, { fresh: true });
    if (!agent) return;
    status("Claude is art-directing this world…", true);
    try {
      const smart = await api("/api/world/plan", { method: "POST", body: { prompt, agent: true } });
      if (run === building) await show(smart, run);
    } catch (e) { if (run === building) toast(e.message); }
  }

  async function edit(request) {
    if (!plan) return;
    const run = ++building;
    status(`Working on “${request}”…`, true);
    try {
      const next = await api("/api/world/edit", { method: "POST", body: { request, plan } });
      if (run === building) await show(next, run);
    } catch (e) { if (run === building) { toast(e.message); drawPanel(); } }
  }

  function status(text, keepBill) {
    if (keepBill && plan) { const n = $("#wnote"); if (n) { n.textContent = text; n.classList.add("busy"); return; } }
    $("#wpanel").innerHTML = `<p class="muted" style="margin:0">${esc(text)}</p>`;
  }

  function drawPanel() {
    const bill = plan.bill, paid = bill.filter((l) => l.price > 0).sort((a, b) => b.price - a.price), free = bill.filter((l) => !l.price);
    // one licence per kit piece, covering every remix of it in this world
    const licences = [...new Map(paid.map((l) => [l.asset, l])).values()];
    const total = licences.reduce((s, l) => s + l.price, 0);
    const creators = [...new Set(bill.map((l) => l.author))];
    $("#wpanel").innerHTML = `
      <p class="wkicker">${esc(plan.title || plan.prompt)}</p>
      <p class="wnote" id="wnote">${plan.say ? esc(plan.say) : plan.by === "agent" ? "" : "Talk to it below: “make it night”, “paint the shops mint”, “add more trees”."}</p>
      <form class="wedit" id="wedit"><input id="wask" maxlength="400" autocomplete="off" placeholder="Change it: add a tram, make it snow…" /><button class="btn small">Ask</button></form>
      <h2>${plan.placements.length} pieces, ${bill.length} remixes</h2>
      <ul class="wbill">${Object.values(paid.reduce((m, l) => { const g = (m[l.asset] ||= { title: l.title, author: l.author, remixes: 0, placed: 0, sum: 0 }); g.remixes++; g.placed += l.count; g.sum = l.price; return m; }, {})).map((g) => `<li><span><b>${esc(g.title)}</b><em>${g.placed} placed${g.remixes > 1 ? `, ${g.remixes} remixes` : ""} · by ${esc(g.author)}</em></span><b>${money(g.sum)}</b></li>`).join("")}
        <li class="wfree"><span><b>${free.reduce((s, l) => s + l.count, 0)} free pieces</b><em>${[...new Set(free.map((l) => l.title))].join(", ")}</em></span><b>Free</b></li></ul>
      <div class="wtotal"><span>One licence for the whole world</span><b>${money(total)}</b></div>
      <p class="muted wsplit">${licences.length} licences from ${creators.length} creator${creators.length === 1 ? "" : "s"}, each covering every remix of that piece here. One PayPal approval pays them all.</p>
      <div id="wpp"></div>
      <div class="wbuyrow"><button class="btn primary wbuy" id="wbuy">Buy this world · ${money(total)}</button><button class="btn" id="wshare">Share</button></div>
      <p class="muted" style="font-size:12px;margin:10px 0 0">Buying gets you the whole world as one GLB for three.js, Unity, Godot or Blender, plus every piece's program.</p>`;
    $("#wedit").addEventListener("submit", (e) => { e.preventDefault(); const q = $("#wask").value.trim(); if (q) edit(q); });
    $("#wshare").addEventListener("click", async () => {
      const id = await save();
      const url = `${location.origin}/#/w/${id}`;
      history.replaceState(null, "", `#/w/${id}`);
      try { await navigator.clipboard.writeText(url); toast("Link copied. Anyone can open this world."); } catch { toast(url); }
    });
    $("#wbuy").addEventListener("click", async () => {
      $("#wbuy").remove();
      const worldId = await save();
      mountPayPal($("#wpp"), {
        createOrder: () => newOrder(licences.map((l) => ({ assetId: l.asset, knobs: l.knobs })), { worldId }),
        onDone: (o) => { location.hash = `#/order/${o.id}`; },
      });
    });
  }

  // click a piece to reshape it
  v.renderer.domElement.addEventListener("click", (ev) => {
    if (!plan) return;
    const g = v.pick(ev);
    if (!g || g.userData.idx == null) { v.select(null); $("#winspect").hidden = true; return; }
    inspect(g.userData.idx);
  });
  async function inspect(i) {
    const pl = plan.placements[i], g = groups[i];
    v.select(g);
    const a = await api(`/api/assets/${encodeURIComponent(pl.asset)}`);
    const box = $("#winspect");
    box.hidden = false;
    box.innerHTML = `<h3>${esc(a.title)} <a class="btn small ghost" href="#/a/${esc(a.id)}">Open</a></h3><p class="muted" style="margin:-6px 0 10px;font-size:12.5px">by ${esc(a.author)} · ${a.price ? money(a.price) : "free"}</p><div class="wknobs">${Object.entries(a.knobs).map(([n, k]) => knobControl(n, k, pl.knobs[n])).join("")}</div>`;
    let t;
    const rebuild = () => { clearTimeout(t); t = setTimeout(async () => {
      const { parts } = await api(`/api/assets/${encodeURIComponent(pl.asset)}/parts.json?p=${encodeURIComponent(JSON.stringify(pl.knobs))}`);
      const ng = v.addPlaced(parts, { at: pl.at, rot: pl.rot });
      ng.userData.idx = i;
      v.content.remove(groups[i]);
      groups[i] = ng;
      v.select(ng);
      plan = { ...plan, bill: rebill() };
      drawPanel();
    }, 70); };
    // Same binding as the asset page: segmented choices, ranges, toggles, colours, text.
    box.querySelectorAll("[data-k]").forEach((el) => {
      const name = el.dataset.k, k = a.knobs[name];
      if (el.classList.contains("seg")) {
        el.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => {
          pl.knobs = { ...pl.knobs, [name]: b.dataset.v };
          el.querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b));
          rebuild();
        }));
        return;
      }
      el.addEventListener("input", () => {
        let val = el.value;
        if (k.type === "range") { val = Number(el.value); el.parentElement.querySelector("output").textContent = el.value; }
        else if (k.type === "toggle") val = el.checked;
        else if (k.type === "color") { val = el.value.toUpperCase(); el.nextElementSibling.textContent = val; }
        pl.knobs = { ...pl.knobs, [name]: val };
        rebuild();
      });
    });
  }
  function rebill() {
    const lines = new Map();
    for (const p of plan.placements) {
      const key = p.asset + JSON.stringify(p.knobs);
      if (!lines.has(key)) lines.set(key, { asset: p.asset, title: p.title, price: p.price, author: p.author, knobs: p.knobs, count: 0 });
      lines.get(key).count++;
    }
    return [...lines.values()];
  }

  const $ = (s) => app.querySelector(s);
  $("#wform").addEventListener("submit", (e) => { e.preventDefault(); build($("#wp").value.trim() || $("#wp").placeholder, { agent: $("#wagent").checked }); });
  app.querySelectorAll("[data-ex]").forEach((b) => b.addEventListener("click", () => { $("#wp").value = b.dataset.ex; build(b.dataset.ex, { agent: $("#wagent").checked }); }));
  app.querySelectorAll("[data-t]").forEach((b) => b.addEventListener("click", () => { v.setTime(b.dataset.t); app.querySelectorAll("[data-t]").forEach((x) => x.classList.toggle("on", x === b)); }));
  // Saved worlds are immutable snapshots: saving again after an edit makes a new link.
  let savedSig = null, savedId = null;
  async function save() {
    const sigNow = JSON.stringify(plan.placements.map((p) => [p.asset, p.at, p.rot, p.knobs])) + plan.time;
    if (sigNow === savedSig) return savedId;
    const { id } = await api("/api/worlds", { method: "POST", body: { plan } });
    savedSig = sigNow; savedId = id;
    return id;
  }

  if (h.worldId) {
    try {
      const w = await api(`/api/worlds/${encodeURIComponent(h.worldId)}`);
      $("#wp").value = w.prompt || w.title;
      await show(w, ++building, { fresh: true });
      savedId = w.id;
    } catch { toast("That world link doesn't exist"); build(EXAMPLES[0]); }
  } else build(EXAMPLES[0]);
}
