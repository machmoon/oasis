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
      <label class="wagent"><input type="checkbox" id="wagent" /> Let Claude plan the layout <span class="muted">(slower, smarter)</span></label>
    </div>
    <div class="world-time" role="toolbar"><button class="btn small" data-t="day">Day</button><button class="btn small" data-t="dusk">Dusk</button><button class="btn small" data-t="night">Night</button></div>
    <aside class="world-panel" id="wpanel"><p class="muted" style="margin:0">Building…</p></aside>
    <div class="world-inspect" id="winspect" hidden></div>
    <p class="world-hint">Drag to orbit · scroll to zoom · click any piece to reshape it</p>
  </div>`;

  const v = createViewer(document.getElementById("stage"), { time: "day" });
  let plan = null, groups = [], building = 0;

  async function build(prompt, { agent = false } = {}) {
    const run = ++building;
    $("#wpanel").innerHTML = `<p class="muted" style="margin:0">${agent ? "Claude is planning your world…" : "Planning…"}</p>`;
    $("#winspect").hidden = true; v.select(null);
    const next = await api("/api/world/plan", { method: "POST", body: { prompt, agent } });
    if (run !== building) return;
    plan = next;
    // one parts request for every distinct remix in the plan
    const keys = [...new Set(plan.placements.map((p) => p.asset + "|" + JSON.stringify(p.knobs)))];
    const { parts } = await api("/api/world/parts", { method: "POST", body: { items: keys.map((k) => { const [asset, knobs] = [k.slice(0, k.indexOf("|")), JSON.parse(k.slice(k.indexOf("|") + 1))]; return { asset, knobs }; }) } });
    if (run !== building) return;
    const byKey = new Map(keys.map((k, i) => [k, parts[i]]));
    v.clearWorld(); groups = [];
    v.setTime(plan.time);
    app.querySelectorAll("[data-t]").forEach((b) => b.classList.toggle("on", b.dataset.t === plan.time));
    // ground first, then buildings, then the small things, so it reads as being built
    const order = (a) => (a.startsWith("town-road") || a.startsWith("town-plaza") ? 0 : a === "town-shop" || a === "town-house" || a === "town-stall" || a === "town-torii" ? 1 : 2);
    const idx = plan.placements.map((p, i) => i).sort((a, b) => order(plan.placements[a].asset) - order(plan.placements[b].asset) || plan.placements[a].at[0] - plan.placements[b].at[0]);
    idx.forEach((i, n) => {
      const pl = plan.placements[i];
      const g = v.addPlaced(byKey.get(pl.asset + "|" + JSON.stringify(pl.knobs)), { at: pl.at, rot: pl.rot });
      g.userData.idx = i;
      groups[i] = g;
      v.dropIn(g, order(pl.asset) === 0 ? n * 18 : 500 + n * 55);
    });
    if (!build.framed) {
      const { THREE } = await import("/world3d.js");
      const [w, d] = plan.size;
      const wide = innerWidth > 860;
      v.frame(new THREE.Box3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(w, 6, d)), { fit: wide ? 1.12 : 1.3, shift: 0 });
      build.framed = true;
    }
    drawPanel();
  }

  function drawPanel() {
    const bill = plan.bill, paid = bill.filter((l) => l.price > 0).sort((a, b) => b.price - a.price), free = bill.filter((l) => !l.price), total = paid.reduce((s, l) => s + l.price, 0);
    const creators = [...new Set(bill.map((l) => l.author))];
    $("#wpanel").innerHTML = `
      <p class="wkicker">${esc(plan.title || plan.prompt)}</p>
      <h2>${plan.placements.length} pieces, ${bill.length} remixes</h2>
      <ul class="wbill">${Object.values(paid.reduce((m, l) => { const g = (m[l.asset] ||= { title: l.title, author: l.author, remixes: 0, placed: 0, sum: 0 }); g.remixes++; g.placed += l.count; g.sum += l.price; return m; }, {})).map((g) => `<li><span><b>${esc(g.title)}</b><em>${g.remixes} remix${g.remixes === 1 ? "" : "es"}, ${g.placed} placed · by ${esc(g.author)}</em></span><b>${money(g.sum)}</b></li>`).join("")}
        <li class="wfree"><span><b>${free.reduce((s, l) => s + l.count, 0)} free pieces</b><em>${[...new Set(free.map((l) => l.title))].join(", ")}</em></span><b>Free</b></li></ul>
      <div class="wtotal"><span>One licence for the whole world</span><b>${money(total)}</b></div>
      <p class="muted wsplit">${paid.length} paid remixes from ${creators.length} creator${creators.length === 1 ? "" : "s"}. One PayPal approval pays every one of them.</p>
      <div id="wpp"></div>
      <button class="btn primary wbuy" id="wbuy">Buy this world · ${money(total)}</button>`;
    $("#wbuy").addEventListener("click", () => {
      $("#wbuy").remove();
      mountPayPal($("#wpp"), {
        createOrder: () => newOrder(paid.map((l) => ({ assetId: l.asset, knobs: l.knobs }))),
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
  build(EXAMPLES[0]);
}
