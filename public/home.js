// Oasis home. The hero is the product running in the live three.js runtime (world3d.js, blocks-runtime.js), not a
// picture of it: a brief is typed, the street assembles from creators' pieces in clay, one piece is rebuilt by its
// knobs, then a PayPal order lands and the colour sweeps through the street while each creator's share appears.
// The loop is shaped after polyfork.dev's hero film (their hero-stage.js: one stage, a cast of briefs, beats that
// each change one thing, the headline answering the beat, and the film yielding when a visitor touches the canvas).
// The clay and the colour sweep are ported from Oasis's own film player (public/film-player.js: setClay, sweep).
import { createViewer, THREE } from "/world3d.js";

const $ = (s, el = document) => el.querySelector(s);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const smooth = (u) => u * u * (3 - 2 * u);

const BRIEFS = [
  { brief: "a 15-second teaser for Momiji Ramen on a Kyoto market street at dusk", brand: "Momiji Ramen" },
  { brief: "a launch film for Saltline Surf on a seaside harbour in summer", brand: "Saltline Surf" },
  { brief: "a holiday spot for Fjell Coffee in a snowy alpine village", brand: "Fjell Coffee" },
  { brief: "a pastel ad for Cloudpop Candy, cute and sweet", brand: "Cloudpop Candy" },
];
const CLAY = new THREE.Color("#DADCE0"), FLASH = new THREE.Color("#FFE7B8");
const EDGE = new THREE.LineBasicMaterial({ color: "#5C6270", transparent: true, opacity: 0.55 });

/** The bill of a planned street: paid placements grouped by creator, the way the film's order is itemised. */
function billOf(plan) {
  const by = new Map();
  for (const p of plan.placements) {
    if (!(p.price > 0)) continue;
    if (!by.has(p.author)) by.set(p.author, { author: p.author, usd: 0, lines: new Map() });
    const c = by.get(p.author);
    c.usd += p.price;
    const l = c.lines.get(p.title) || { title: p.title, n: 0, usd: 0 };
    l.n++; l.usd += p.price; c.lines.set(p.title, l);
  }
  const creators = [...by.values()].sort((a, b) => b.usd - a.usd).map((c) => ({ ...c, lines: [...c.lines.values()] }));
  return { creators, total: creators.reduce((a, c) => a + c.usd, 0), pieces: plan.placements.length };
}

/** A spring to a value, the way cult-ui's RollingNumber animates money (rolling-number.tsx: mass .8, stiffness 75,
 *  damping 15, a spring not a tween, so a bigger total takes a touch longer and lands without a hard stop). */
function springTo(from, to, onStep, { mass = 0.8, stiffness = 75, damping = 15 } = {}) {
  let x = from, v = 0, last = performance.now();
  return new Promise((resolve) => {
    const step = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const a = (-stiffness * (x - to) - damping * v) / mass;
      v += a * dt; x += v * dt;
      if (Math.abs(x - to) < 0.005 && Math.abs(v) < 0.01) { onStep(to); resolve(); return; }
      onStep(x);
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}

export async function pageHome(app, ctx) {
  const { api, esc, usd, price, icon, thumb, catalog, drawSales, viewers, reduced, rise } = ctx;
  app.innerHTML = `
  <section class="hero" id="hero" aria-label="Oasis building and licensing a street, live">
    <div class="hero-stage" id="hero-stage"></div>
    <div class="wrap"><div class="hero-copy">
      <h1><span class="line on" data-beat="brief">Brief in.</span><span class="line" data-beat="film">Film out.</span><span class="line" data-beat="paid">Creators paid.</span></h1>
      <p class="lede">A one-line brief becomes a brand film made of creators' 3D pieces. One PayPal order pays all of them.</p>
      <div class="cta"><a class="btn primary" href="#/studio">Make a film</a><a class="btn" href="#/kit">See the kit</a></div>
    </div></div>
    <div class="hero-readout" id="readout" aria-live="polite"><i class="live"></i><span>planning a street</span></div>
    <div class="hero-pay" id="hero-pay"><div class="hero-chips" id="hero-chips"></div><span class="btn paypal pay" id="pay-btn">${icon("paypal-logo")} Pay <span class="money num" id="pay-money">$0.00</span></span></div>
  </section>

  <section class="wrap band">
    <div class="rebuild">
      <div><div class="rebuild-stage" id="rb-stage"><span class="readout" id="rb-readout"></span></div></div>
      <div>
        <h2>Rebuilt, not stretched.</h2>
        <p class="lede">Every piece is a program. Turn a knob and it is built again: more floors mean more windows, not taller ones.</p>
        <div class="rebuild-knobs" id="rb-knobs"></div>
        <div class="rebuild-import" id="rb-import"></div>
      </div>
    </div>
  </section>

  <section class="wrap band" id="pay">
    <div class="order">
      <div>
        <h2>One order. Every creator.</h2>
        <p class="lede">The street above is a bill. Approve it once in PayPal and each creator's share is booked from the same order.</p>
        <a class="btn" href="#/budget">Give an agent a budget</a>
      </div>
      <div class="receipt" id="receipt"><div class="skel" style="height:280px"></div></div>
    </div>
  </section>

  <section class="wrap band" id="sales-sec" hidden>
    <div class="head"><h2>Paid so far.</h2></div>
    <div class="ledger"><div class="sales" id="sales"></div><div class="creators" id="creators"></div></div>
  </section>

  <section class="wrap band agents-band">
    <h2>Agents run the same loop.</h2>
    <p class="lede">Connect Claude Code over MCP. It makes the film and licenses it inside a budget you approved once.</p>
    <div class="cmd"><span id="cmd-text"></span><button type="button" id="cmd-copy">Copy</button></div>
    <div class="tools">${["make_film", "get_film", "buy_assets", "get_budget"].map((t) => `<span class="chip">${t}</span>`).join("")}</div>
  </section>

  <section class="wrap band">
    <div class="kit-head"><h2>Made from creators' pieces.</h2><a class="link" href="#/kit">All pieces</a></div>
    <div class="kit-row" id="kit"></div>
  </section>`;

  const cmd = `claude mcp add --transport http oasis ${location.origin}/mcp`;
  $("#cmd-text").textContent = cmd;
  $("#cmd-copy").addEventListener("click", async () => { try { await navigator.clipboard.writeText(cmd); ctx.toast("Copied"); } catch { ctx.toast("Select the command and copy it"); } });

  drawKitRow($("#kit"), { catalog, thumb, esc, price });
  drawSales().then((n) => { if (n) $("#sales-sec").hidden = false; });
  mountRebuild({ api, esc, viewers, reduced });
  const hero = mountHero({ api, esc, usd, viewers, reduced, onBill: (b, brand) => drawReceipt($("#receipt"), b, brand, { esc, usd, icon }) });
  viewers.push({ dispose: hero.stop });
  rise(app);
}

// ---------- the hero ----------
function mountHero({ api, esc, usd, viewers, reduced, onBill }) {
  const el = $("#hero"), stage = $("#hero-stage"), readout = $("#readout"), payBtn = $("#pay-btn"), money = $("#pay-money"), chips = $("#hero-chips");
  const lines = [...el.querySelectorAll("h1 .line")];
  const v = createViewer(stage, { time: "day", autoRotate: false });
  viewers.push(v);
  v.controls.autoRotateSpeed = 0.4;
  let alive = true, paused = 0, offscreen = false;
  const stop = () => { alive = false; };

  // a visitor took the camera: the film yields for a while (polyfork hero-stage.js takeOver)
  stage.addEventListener("pointerdown", () => { paused = Infinity; v.controls.autoRotate = false; });
  addEventListener("pointerup", () => { if (paused === Infinity) paused = performance.now() + 7000; });
  const io = new IntersectionObserver((es) => { offscreen = !es[0].isIntersecting; }, { threshold: 0.05 });
  io.observe(stage);
  const wait = async () => { while (alive && (offscreen || paused > performance.now())) await sleep(200); if (alive && paused && paused <= performance.now()) { paused = 0; v.controls.autoRotate = !reduced; } };

  const sky = () => { el.style.setProperty("--sky", v.scene.background.getStyle()); };
  const setTime = (t, ms = 900) => {
    const from = v.scene.background.clone();
    v.setTime(t);
    const to = v.scene.background.clone(); sky();
    // the copy flips ink at the midpoint of the sky fade, so it is never dark on dark or light on light
    setTimeout(() => el.classList.toggle("night", t === "night"), reduced ? 0 : ms * 0.45);
    if (reduced || !ms) return;
    const start = performance.now(), c = new THREE.Color();
    const f = () => { const k = Math.min(1, (performance.now() - start) / ms); v.scene.background = c.copy(from).lerp(to, smooth(k)); if (k < 1) requestAnimationFrame(f); };
    f();
  };
  setTime("day", 0);

  const beat = (name) => lines.forEach((l) => { const i = ["brief", "film", "paid"].indexOf(l.dataset.beat), j = ["brief", "film", "paid"].indexOf(name); l.classList.toggle("on", i === j); l.classList.toggle("done", i < j); });
  const say = (html, live = false) => { readout.innerHTML = `<i class="${live ? "live" : ""}"></i>${html}`; };

  // streets are fetched once per brief and kept; the next brief is fetched while the current one plays
  const cache = new Map();
  const street = (b) => {
    if (!cache.has(b.brief)) cache.set(b.brief, (async () => {
      const plan = await api("/api/world/plan", { method: "POST", body: { prompt: b.brief } });
      const keys = [...new Set(plan.placements.map((p) => p.asset + "|" + JSON.stringify(p.knobs)))];
      const { parts } = await api("/api/world/parts", { method: "POST", body: { items: keys.map((k) => ({ asset: k.slice(0, k.indexOf("|")), knobs: JSON.parse(k.slice(k.indexOf("|") + 1)) })) } });
      return { plan, byKey: new Map(keys.map((k, i) => [k, parts[i]])) };
    })().catch((e) => { cache.delete(b.brief); throw e; }));
    return cache.get(b.brief);
  };

  // clay: k = 1 is the unlicensed model sheet, k = 0 the piece in its real colours (film-player.js setClay)
  const clay = [];
  function toClay(g) {
    const entry = { g, mats: [], edges: [], d: 0, y: g.position.y };
    g.traverse((o) => { if (o.isMesh) { o.material = o.material.clone(); entry.mats.push({ m: o.material, color: o.material.color.clone(), emissive: o.material.emissive.clone(), ei: o.material.emissiveIntensity, rough: o.material.roughness, metal: o.material.metalness }); } });
    g.traverse((o) => { if (o.isMesh) { const e = new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry, 25), EDGE.clone()); e.position.copy(o.position); e.quaternion.copy(o.quaternion); e.scale.copy(o.scale); o.parent.add(e); entry.edges.push(e); } });
    clay.push(entry);
    setClay(entry, 1);
    return entry;
  }
  function setClay(entry, k, flash = 0) {
    entry.k = k;
    for (const c of entry.mats) {
      c.m.color.copy(c.color).lerp(CLAY, k);
      c.m.emissive.copy(c.emissive).multiplyScalar(1 - k);
      if (flash > 0) c.m.emissive.lerp(FLASH, flash);
      c.m.emissiveIntensity = flash > 0 ? Math.max(c.ei, 0.9 * flash) : k >= 1 ? 0 : c.ei;
      c.m.roughness = c.rough + (0.85 - c.rough) * k; c.m.metalness = c.metal * (1 - k);
    }
    for (const e of entry.edges) { e.material.opacity = 0.55 * k; e.visible = k > 0.01; }
  }
  function dropEntry(entry) {
    const i = clay.indexOf(entry); if (i >= 0) clay.splice(i, 1);
    entry.g.traverse((o) => { if (o.isMesh || o.isLineSegments) o.geometry.dispose(); });
    entry.g.removeFromParent();
  }
  /** The licence lands: colour sweeps out from `from` through the street, each piece lifted and lit as the wave reaches
   *  it (film-player.js sweep). */
  function sweep(from, ms = 2600) {
    if (!clay.length) return Promise.resolve();
    const far = Math.max(...clay.map((c) => c.g.position.distanceTo(from))) || 1;
    for (const c of clay) { c.d = c.g.position.distanceTo(from) / far; c.y = c.g.position.y; }
    const start = performance.now();
    return new Promise((resolve) => {
      const step = (now) => {
        const k = Math.min(1, (now - start) / ms);
        for (const c of clay) {
          const u = Math.min(1, Math.max(0, (k * 1.35 - c.d * 0.85) / 0.5)), e = smooth(u);
          setClay(c, 1 - e, Math.sin(Math.PI * u) * 0.85);
          c.g.position.y = c.y + Math.sin(Math.PI * e) * 0.35;
        }
        if (k < 1 && alive) requestAnimationFrame(step);
        else { for (const c of clay) { setClay(c, 0, 0); c.g.position.y = c.y; } resolve(); }
      };
      requestAnimationFrame(step);
    });
  }

  // the camera: the street sits in the right part of the band, the copy in the left (world3d fitToRect, measured)
  let box = null;
  const fit = () => {
    if (!box) return;
    const narrow = innerWidth < 900, w = stage.clientWidth;
    // the rendered centre moves right (a negative view offset) so the street sits beside the copy, not under it
    v.setOffset(narrow ? 0 : -Math.round(w * 0.24));
    v.frame(box, { fit: 1 });
    v.fitToRect(box, narrow ? [0.03, 0.06, 0.97, 0.9] : [0.47, 0.06, 0.985, 0.92]);
  };
  new ResizeObserver(fit).observe(stage);

  /** Pieces leave the way they came: a quick drop below the ground, staggered. */
  async function rollOut() {
    const entries = clay.slice();
    if (!entries.length) return;
    if (reduced) { entries.forEach(dropEntry); return; }
    const start = performance.now();
    await new Promise((resolve) => {
      const step = (now) => {
        let busy = false;
        entries.forEach((c, i) => { const k = Math.min(1, Math.max(0, (now - start - i * 8) / 380)); c.g.position.y = c.y - 14 * k * k; c.g.visible = k < 1; busy ||= k < 1; });
        busy && alive ? requestAnimationFrame(step) : resolve();
      };
      requestAnimationFrame(step);
    });
    entries.forEach(dropEntry);
  }

  /** The street assembles: every placement drops in, in clay, a few frames apart. */
  async function build({ plan, byKey }) {
    const [w, d] = plan.size;
    box = new THREE.Box3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(w, 7, d));
    fit();
    const entries = plan.placements.map((p, i) => {
      const g = v.addPlaced(byKey.get(p.asset + "|" + JSON.stringify(p.knobs)), { at: p.at, rot: p.rot });
      const e = toClay(g); e.p = p;
      if (!reduced) v.dropIn(g, i * 24);
      return e;
    });
    if (!reduced) await sleep(plan.placements.length * 24 + 700);
    return entries;
  }

  /** One building is rebuilt by its knobs: more floors, built again, not scaled. */
  async function reshape(entries) {
    const e = entries.find((x) => x.p.asset === "town-shop") || entries.find((x) => x.p.asset === "town-house" || x.p.asset === "town-flats");
    if (!e) return null;
    const p = e.p, f0 = p.knobs.floors ?? 2;
    const meta = await api(`/api/assets/${encodeURIComponent(p.asset)}`).catch(() => null);
    const max = meta?.knobs?.floors?.max ?? 4;
    const steps = [Math.min(max, f0 + 2), Math.min(max, f0 + 1)].filter((f, i, a) => f !== f0 && a.indexOf(f) === i);
    let cur = e;
    for (const f of steps) {
      if (!alive) return cur;
      const { parts } = await api("/api/world/parts", { method: "POST", body: { items: [{ asset: p.asset, knobs: { ...p.knobs, floors: f } }] } });
      const g = v.addPlaced(parts[0], { at: p.at, rot: p.rot });
      const next = toClay(g); next.p = { ...p, knobs: { ...p.knobs, floors: f } };
      dropEntry(cur); cur = next;
      say(`<b>${esc(p.title)}</b> by ${esc(p.author)}: floors ${f0} &rarr; <b>${f}</b>`, true);
      if (!reduced) {
        const start = performance.now();
        await new Promise((r) => { const step = () => { const k = Math.min(1, (performance.now() - start) / 520); const s = 1 + Math.sin(Math.PI * k) * 0.04; g.scale.set(s, 0.75 + 0.25 * (1 - Math.pow(1 - k, 3)) + (1 - k) * 0, s); if (k < 1 && alive) requestAnimationFrame(step); else { g.scale.set(1, 1, 1); r(); } }; step(); });
        await sleep(650);
      }
    }
    return cur;
  }

  /** The order lands: the total rolls up, the control is pressed, the colour sweeps from the brand's shop outward. */
  async function pay(plan, from, brand) {
    const bill = billOf(plan);
    onBill?.(bill, brand);
    chips.innerHTML = "";
    say(`one PayPal order, <b>${bill.creators.length} creators</b>`);
    payBtn.classList.add("in");
    if (!reduced) await springTo(0, bill.total, (x) => (money.textContent = usd(x)));
    else money.textContent = usd(bill.total);
    await sleep(reduced ? 0 : 500);
    payBtn.classList.add("press"); await sleep(160); payBtn.classList.remove("press");
    bill.creators.forEach((c, i) => {
      const chip = document.createElement("span"); chip.className = "chip"; chip.innerHTML = `${esc(c.author)} <b>+${usd(c.usd)}</b>`;
      chips.appendChild(chip);
      setTimeout(() => chip.classList.add("in"), reduced ? 0 : 300 + i * 420);
    });
    const ms = reduced ? 0 : 2600;
    const t = plan.time === "night" ? "night" : plan.time === "dusk" ? "night" : "dusk";
    setTimeout(() => setTime(t, 1400), ms * 0.4);
    if (ms) await sweep(from, ms); else for (const c of clay) setClay(c, 0);
    say(`<b>${usd(bill.total)}</b> paid to ${bill.creators.length} creators in one PayPal order`);
  }

  async function type(text) {
    if (reduced) { say(`"${esc(text)}"`, true); return; }
    for (let i = 1; i <= text.length && alive; i += 2) { say(`"${esc(text.slice(0, i))}<span class="caret"></span>`, true); await sleep(28); }
    say(`"${esc(text)}"`, true);
    await sleep(500);
  }

  async function loop() {
    for (let i = 0; alive; i = (i + 1) % BRIEFS.length) {
      const b = BRIEFS[i];
      street(BRIEFS[(i + 1) % BRIEFS.length]).catch(() => {});
      try {
        await wait();
        beat("brief");
        payBtn.classList.remove("in"); chips.querySelectorAll(".chip").forEach((c) => c.classList.remove("in"));
        v.controls.autoRotate = false;
        const [s] = await Promise.all([street(b), type(b.brief), rollOut()]);
        if (!alive) return;
        setTime(s.plan.time === "night" ? "dusk" : s.plan.time, 700);
        say(`building <b>${s.plan.placements.length} pieces</b> from ${new Set(s.plan.placements.filter((p) => p.price > 0).map((p) => p.author)).size} creators`, true);
        const entries = await build(s);
        beat("film");
        v.controls.autoRotate = !reduced;
        await wait();
        if (!alive) return;
        const hero = await reshape(entries);
        await sleep(reduced ? 0 : 400);
        await wait();
        beat("paid");
        const from = hero ? hero.g.position.clone() : box.getCenter(new THREE.Vector3());
        await pay(s.plan, from, b.brand);
        if (reduced) return; // one street, built and paid, is the whole story without motion
        await sleep(3600);
        await wait();
      } catch (e) {
        say(`the street is busy, trying again`);
        await sleep(4000);
      }
    }
  }
  loop();
  return { stop };
}

// ---------- rebuilt, not stretched ----------
async function mountRebuild({ api, esc, viewers, reduced }) {
  const stage = $("#rb-stage"), knobsEl = $("#rb-knobs"), imp = $("#rb-import"), out = $("#rb-readout");
  const id = "town-shop";
  const a = await api(`/api/assets/${id}`).catch(() => null);
  if (!a || !stage.isConnected) return;
  const v = createViewer(stage, { time: "day" });
  viewers.push(v);
  const knobs = a.knobs || {};
  const values = Object.fromEntries(Object.entries(knobs).map(([k, d]) => [k, d.default]));
  const show = ["floors", "width", "awning", "roof"].filter((k) => knobs[k]);
  const SWATCH = ["#E5484D", "#0E7C7B", "#F28CB1", "#2F7A55", "#F6C85F", "#2B3242"];
  knobsEl.innerHTML = show.map((k) => {
    const d = knobs[k], label = esc(d.label || k[0].toUpperCase() + k.slice(1));
    if (d.type === "range") return `<div class="knob"><label for="rb-${k}">${label}</label><input type="range" id="rb-${k}" data-k="${k}" min="${d.min}" max="${d.max}" step="${d.step || 1}" value="${d.default}"><output id="rbo-${k}" class="num">${d.default}</output></div>`;
    if (d.type === "color") return `<div class="knob"><label>${label}</label><div class="swatches" data-k="${k}">${SWATCH.map((c) => `<button type="button" data-c="${c}" class="${c.toLowerCase() === String(d.default).toLowerCase() ? "on" : ""}" style="background:${c}" aria-label="${label} ${c}"></button>`).join("")}</div><output></output></div>`;
    if (d.type === "choice") return `<div class="knob"><label for="rb-${k}">${label}</label><select id="rb-${k}" data-k="${k}">${d.options.map((o) => `<option ${o === d.default ? "selected" : ""}>${esc(o)}</option>`).join("")}</select><output></output></div>`;
    return "";
  }).join("");
  const diff = () => Object.fromEntries(Object.entries(values).filter(([k, val]) => val !== knobs[k].default));
  let n = 0;
  const rebuild = async () => {
    const run = ++n;
    const { parts } = await api(`/api/assets/${id}/parts.json?p=${encodeURIComponent(JSON.stringify(diff()))}`);
    if (run !== n || !stage.isConnected) return;
    v.setParts(parts);
    const s = v.stats();
    out.innerHTML = `<b>${parts.length}</b> parts, <b>${s.tris.toLocaleString()}</b> triangles`;
    const d = diff();
    imp.innerHTML = `<span class="k">import</span> { createAsset } <span class="k">from</span> <span class="s">"${esc(location.origin)}/cdn/${id}.mjs?lic=…"</span>;\nscene.add(createAsset(${Object.keys(d).length ? esc(JSON.stringify(d)) : ""}));`;
  };
  knobsEl.addEventListener("input", (e) => {
    const k = e.target.dataset.k; if (!k) return;
    values[k] = e.target.type === "range" ? Number(e.target.value) : e.target.value;
    const o = $(`#rbo-${k}`); if (o) o.textContent = e.target.value;
    clearTimeout(rebuild.t); rebuild.t = setTimeout(rebuild, 40);
  });
  knobsEl.addEventListener("click", (e) => {
    const b = e.target.closest(".swatches button"); if (!b) return;
    const k = b.parentElement.dataset.k; values[k] = b.dataset.c;
    b.parentElement.querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b));
    rebuild();
  });
  await rebuild();
  v.frame(null, { fit: 1.08 });
}

// ---------- the receipt ----------
function drawReceipt(el, bill, brand, { esc, usd, icon }) {
  if (!el?.isConnected) return;
  el.innerHTML = `<div class="r-head"><b>${esc(brand)} street</b><span>${bill.pieces} pieces, ${bill.creators.length} creators</span></div>
    ${bill.creators.map((c) => `<div class="r-who"><div class="r-name">${esc(c.author)}<em class="num">${usd(c.usd)}</em></div>${c.lines.map((l) => `<div class="r-line"><span>${l.n > 1 ? `${l.n} &times; ` : ""}${esc(l.title)}</span><span class="num">${usd(l.usd)}</span></div>`).join("")}</div>`).join("")}
    <div class="r-total"><span>One PayPal order</span><b class="num">${usd(bill.total)}</b></div>
    <div class="r-paypal">${icon("paypal-logo")} Orders v2, itemised. Shares paid out with PayPal Payouts.</div>`;
}

// ---------- the kit row ----------
async function drawKitRow(el, { catalog, thumb, esc, price }) {
  const list = (await catalog()).filter((a) => a.author !== "oasis" || a.price > 0);
  if (!el.isConnected) return;
  el.innerHTML = list.map((a) => `<a class="piece" href="#/a/${esc(a.id)}"><span class="sheet"><img src="${thumb(a.id)}" alt="${esc(a.title)}" loading="lazy" width="360" height="360"></span><div><b>${esc(a.title)}</b><em class="num">${price(a.price)}</em><span>${esc(a.author)}</span></div></a>`).join("");
  el.querySelectorAll(".sheet img").forEach((img) => { const on = () => img.parentElement.classList.add("in"); img.complete && img.naturalWidth ? on() : img.addEventListener("load", on, { once: true }); img.addEventListener("error", on, { once: true }); });
}
