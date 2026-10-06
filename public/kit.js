// The kit browser and the asset page: everything about showing and rebuilding a piece. The asset page's hero is the
// rebuild itself: drag a knob, the program runs again in the server sandbox, the new parts flash in the shared
// three.js runtime, the import line updates, and the log says what changed. Seven looks (public/looks.js), a
// before/after compare over two locked viewers, and the piece shown in its kit's street with one plan call.
import { createViewer, THREE, partsToGroup } from "/world3d.js";
import { LOOKS, applyLook } from "/looks.js";
import { pageSound, KIND_LABEL, makeRenderer } from "/sound-page.js";
import { mountKitPlayer } from "/keys.js";
import { unlock, loadWav, play } from "/audio.js";
import { themed } from "/wave.js";

// styles live in kit.css and sound.css; loaded once, from here, so index.html stays as it is
for (const href of ["/kit.css", "/sound.css"]) if (!document.querySelector(`link[href="${href}"]`)) {
  const l = document.createElement("link"); l.rel = "stylesheet"; l.href = href; document.head.appendChild(l);
}

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const usd = (n) => `$${Number(n || 0).toFixed(2)}`;
const price = (n) => (Number(n) === 0 ? "Free" : usd(n));
const icon = (name) => `<i class="ph-bold ph-${name}" aria-hidden="true"></i>`;
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const thumb = (id, q = {}) => { const u = new URLSearchParams({ w: 360, ...q }); return `/api/assets/${encodeURIComponent(id)}/render.png?${u}`; };
const m = (n) => (Number.isInteger(n) ? n : Number(n).toFixed(1));

async function api(path, { method = "GET", body } = {}) {
  const r = await fetch(path, { method, headers: body ? { "Content-Type": "application/json" } : {}, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(j.error || `Request failed (${r.status})`), { status: r.status });
  return j;
}
function toast(msg) {
  const t = $("#toast"); if (!t) return;
  t.textContent = msg; t.classList.add("on");
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove("on"), 2600);
}

let ALL = null;
const all = async () => (ALL ||= await api("/api/assets"));
const catalog = async () => (await all()).filter((a) => a.format === "blocks");
const sounds = async () => (await all()).filter((a) => a.format === "sound");
const details = new Map();
async function detail(id) {
  if (!details.has(id)) details.set(id, api(`/api/assets/${encodeURIComponent(id)}`).catch((e) => { details.delete(id); throw e; }));
  return details.get(id);
}

// Kinds, from tags: the browser's categories (Polyfork's sidebar has Props, Buildings, Vehicles, Terrain...).
const KINDS = [
  ["Buildings", /\b(building|shop|house|flats|apartments|stall)\b/],
  ["Ground", /\b(tile|ground|road)\b/],
  ["Vehicles", /\b(vehicle|car|tram|van)\b/],
  ["Landmarks", /\b(landmark|pagoda|lighthouse|torii|bridge|fountain)\b/],
  ["Street", /\b(lamp|bench|bus stop|street furniture|fence|gate|barrier|flower cart|cart)\b/],
];
const kindOf = (a) => { const hay = a.tags.join(" ").toLowerCase(); return KINDS.find(([, re]) => re.test(hay))?.[0] || "Props"; };

// ---------- a segmented control (cult-ui halo-segmented: thumb measured from the active item) ----------
function segment(el, items, value, onChange) {
  el.classList.add("seg");
  el.innerHTML = `<span class="thumb" aria-hidden="true"></span>${items.map((it) => `<button type="button" role="radio" data-v="${esc(it.id)}" aria-checked="${it.id === value}" class="${it.id === value ? "on" : ""}">${esc(it.label)}</button>`).join("")}`;
  el.setAttribute("role", "radiogroup");
  const place = () => {
    const on = $(".on", el); const th = $(".thumb", el);
    if (!on) return;
    th.style.width = `${on.offsetWidth}px`; th.style.transform = `translateX(${on.offsetLeft}px)`;
  };
  el.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-v]"); if (!b || b.classList.contains("on")) return;
    $$("button", el).forEach((x) => { x.classList.toggle("on", x === b); x.setAttribute("aria-checked", x === b); });
    place(); onChange(b.dataset.v);
  });
  el.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    const bs = $$("button", el), i = bs.findIndex((b) => b.classList.contains("on"));
    bs[(i + (e.key === "ArrowRight" ? 1 : bs.length - 1)) % bs.length].click(); e.preventDefault();
  });
  requestAnimationFrame(place);
  new ResizeObserver(place).observe(el);
  return { set(v) { const b = $(`button[data-v="${CSS.escape(v)}"]`, el); if (b && !b.classList.contains("on")) b.click(); } };
}

// ---------- cards: a mounted sheet that rebuilds on hover ----------
function card(a) {
  return `<a class="k-card" href="#/a/${esc(a.id)}" data-id="${esc(a.id)}">
    <span class="k-sheet"><img class="a" src="${thumb(a.id)}" alt="${esc(a.title)}" loading="lazy" width="360" height="360"><img class="b" alt="" aria-hidden="true"><span class="k-cap"><i></i><span></span></span></span>
    <span class="k-meta"><b>${esc(a.title)}</b><em>${price(a.price)}</em><span class="by">${esc(a.author)}</span><span class="facts">${a.knobCount} knobs${a.footprint ? ` · ${m(a.footprint[0])}×${m(a.footprint[1])} m` : ""}</span></span></a>`;
}

/** Variants a card cycles through on hover: its presets, a changed range knob, then the piece at night. */
async function variantsOf(a) {
  const d = await detail(a.id);
  const out = [];
  // presets that only restate the defaults would show no change, so they are skipped
  for (const [name, vals] of Object.entries(d.presetValues || {})) if (Object.entries(vals).some(([k, val]) => d.knobs?.[k] && d.knobs[k].default !== val)) out.push({ name, q: { preset: name } });
  const range = Object.entries(d.knobs || {}).find(([, k]) => k.type === "range" && (k.max - k.min) / (k.step || 1) >= 2);
  if (range) { const [k, def] = range; const v = def.default === def.max ? def.min : def.max; out.push({ name: `${(def.label || k).toLowerCase()} ${v}`, q: { p: JSON.stringify({ [k]: v }) } }); }
  out.push({ name: "night", q: { night: 1 } });
  return out.slice(0, 4);
}

function liveCards(root) {
  // the sheet shimmers until its render arrives, then the picture fades in
  $$(".k-sheet img.a", root).forEach((img) => { const on = () => img.parentElement.classList.add("in"); img.complete && img.naturalWidth ? on() : img.addEventListener("load", on, { once: true }); img.addEventListener("error", on, { once: true }); });
  if (reduced || matchMedia("(hover: none)").matches) return;
  root.addEventListener("pointerenter", async (e) => {
    const c = e.target.closest?.(".k-card"); if (!c) return;
    const sheet = $(".k-sheet", c), b = $("img.b", c), cap = $(".k-cap span", c);
    c.dataset.hover = "1";
    const vs = await variantsOf({ id: c.dataset.id }).catch(() => []);
    let i = 0;
    const next = async () => {
      if (!c.dataset.hover || !vs.length) return;
      const v = vs[i++ % vs.length];
      const url = thumb(c.dataset.id, v.q);
      await new Promise((res) => { const im = new Image(); im.onload = im.onerror = res; im.src = url; });
      if (!c.dataset.hover) return;
      b.src = url; cap.textContent = v.name; sheet.classList.add("flip");
      c.hoverT = setTimeout(() => { if (!c.dataset.hover) return; sheet.classList.remove("flip"); c.hoverT = setTimeout(next, 260); }, 1100);
    };
    next();
  }, true);
  root.addEventListener("pointerleave", (e) => {
    const c = e.target.closest?.(".k-card"); if (!c) return;
    delete c.dataset.hover; clearTimeout(c.hoverT); $(".k-sheet", c).classList.remove("flip");
  }, true);
}

// ---------- the sounds browser ----------
// A card is Freesound's sound tile (MTG/freesound templates/sounds/display_sound.html: the player's waveform picture,
// then the name, then who made it): the picture is the server's card render, a wide waveform coloured by spectral
// centroid (server/sound.js cardPng), so 265 cards cost 265 small cached PNGs, not 265 decoded WAVs. Play fetches the
// one render.wav it needs and sweeps a playhead over the picture for the take's length. Hovering plays nothing (sound
// needs a gesture). One toolbar filters: search, kind, kit, creator, price, sort.
const soundThumb = (id, q = {}) => { const u = new URLSearchParams({ w: 480, ...q }); return themed(`/api/assets/${encodeURIComponent(id)}/render.png?${u}`); };
export function soundCard(a) {
  return `<div class="s-card" data-id="${esc(a.id)}">
    <span class="s-sheet"><a href="#/a/${esc(a.id)}" class="s-link" tabindex="-1" aria-hidden="true"><img src="${soundThumb(a.id)}" alt="" loading="lazy" width="480" height="240"></a><i class="s-cursor" aria-hidden="true"></i><button class="s-play" data-play="${esc(a.id)}" aria-label="Play ${esc(a.title)}">${icon("play")}</button></span>
    <a class="s-meta" href="#/a/${esc(a.id)}"><b>${esc(a.title)}</b><em class="num">${price(a.price)}</em><span class="by">${esc(a.author)}${a.kit ? ` <i>in</i> ${esc(a.kit)}` : ""}</span><span class="facts">${esc(KIND_LABEL[a.kind] || a.kind)}<i>${a.duration} s</i><i>${a.knobCount} knobs</i></span></a></div>`;
}
/** A sound as a row, the way a sound library lists results (MTG/freesound templates/search/search.html renders search
 * results as a vertical list; Splice's sample browser is rows of play, waveform, name, key/BPM, actions). The row reuses
 * the card's classes, so play, the sweep and the picture's fade-in work unchanged. */
export function soundRow(a, { maker = true, kit = true } = {}) {
  return `<div class="s-card s-row" data-id="${esc(a.id)}">
    <button class="s-play" data-play="${esc(a.id)}" aria-label="Play ${esc(a.title)}">${icon("play")}</button>
    <span class="s-sheet"><a href="#/a/${esc(a.id)}" class="s-link" tabindex="-1" aria-hidden="true"><img src="${soundThumb(a.id, { w: 320 })}" alt="" loading="lazy" width="320" height="160"></a><i class="s-cursor" aria-hidden="true"></i></span>
    <a class="s-name" href="#/a/${esc(a.id)}"><b>${esc(a.title)}</b><span>${maker ? `${esc(a.author)}${a.kit && kit ? ` <i>in</i> ` : ""}` : ""}${a.kit && kit ? esc(a.kit) : ""}</span></a>
    <span class="s-c s-kind">${esc(KIND_LABEL[a.kind] || a.kind)}</span><span class="s-c num">${Number(a.duration).toFixed(1)} s</span>
    <span class="s-c s-price num">${price(a.price)}</span></div>`;
}
const soundSkeleton = (n = 12) => Array.from({ length: n }, () => `<div class="s-skel" aria-hidden="true"><div class="skel"></div><div class="skel t"></div><div class="skel t"></div></div>`).join("");
export function liveSoundCards(root) {
  $$(".s-sheet img:not([data-wired])", root).forEach((img) => {
    img.dataset.wired = "1";
    const on = () => img.closest(".s-sheet")?.classList.add("in");
    img.complete && img.naturalWidth ? on() : img.addEventListener("load", on, { once: true });
    img.addEventListener("error", on, { once: true });
  });
  if (root.dataset.wired) return; root.dataset.wired = "1";
  let playing = null;
  const stop = () => { if (!playing) return; playing.p.stop(); const { b } = playing; playing = null; b.classList.remove("on"); b.innerHTML = icon("play"); b.closest(".s-card")?.classList.remove("playing"); };
  root.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-play]"); if (!b) return;
    e.preventDefault();
    await unlock();
    if (playing?.b === b) return stop();
    stop();
    b.classList.add("on"); b.innerHTML = icon("stop");
    try {
      const buf = await loadWav(`/api/assets/${encodeURIComponent(b.dataset.play)}/render.wav`);
      if (!b.classList.contains("on")) return; // stopped while it loaded
      const card = b.closest(".s-card"), p = play(buf); playing = { b, p };
      card.style.setProperty("--dur", `${buf.duration}s`);
      card.classList.remove("playing"); void card.offsetWidth; card.classList.add("playing");
      p.done.then(() => { if (playing?.p === p) stop(); });
    } catch (err) { toast(err.message); b.classList.remove("on"); b.innerHTML = icon("play"); }
  });
}

const SORTS = [["name", "Name"], ["kit", "Kit"], ["price-asc", "Price, low first"], ["price-desc", "Price, high first"], ["length", "Longest"], ["knobs", "Most knobs"]];
const options = (pairs, on) => pairs.map(([v, l]) => `<option value="${esc(v)}"${v === on ? " selected" : ""}>${esc(l)}</option>`).join("");

export async function pageSounds(app) {
  const params = new URLSearchParams(location.hash.split("?")[1] || "");
  app.innerHTML = `<div class="wrap kit-page s-page">
    <header class="s-intro"><h1>Sounds</h1></header>
    <div class="s-tools" role="search">
      <label class="s-search">${icon("magnifying-glass")}<input type="search" id="k-q" placeholder="Search sounds" aria-label="Search sounds" autocomplete="off"></label>
      <div class="s-kinds" id="k-kinds" aria-label="Kind"></div>
      <div class="s-sels">
        <label class="s-sel"><span>Kit</span><select id="k-kit"></select></label>
        <label class="s-sel"><span>Creator</span><select id="k-author"></select></label>
        <label class="s-sel"><span>Price</span><select id="k-price">${options([["all", "Any"], ["free", "Free"], ["paid", "Paid"]], "all")}</select></label>
        <label class="s-sel"><span>Sort</span><select id="k-sort">${options(SORTS, "name")}</select></label>
      </div>
    </div>
    <div class="s-countrow"><p class="s-count" id="k-count" aria-live="polite"></p><div class="s-view" role="group" aria-label="View"><button type="button" data-view="list" aria-pressed="true" title="List">${icon("list")}</button><button type="button" data-view="grid" aria-pressed="false" title="Grid">${icon("squares-four")}</button></div></div>
    <section class="kp" id="k-play" hidden aria-label="Play the kit"></section>
    <div class="s-grid" id="k-grid">${soundSkeleton()}</div>
    <div class="s-more" id="k-more" hidden><button class="btn" type="button" id="k-more-b"></button></div>
    <div class="k-empty" id="k-empty" hidden><h3>No sounds match.</h3><p>Clear a filter, or <a class="link" href="#/kits">describe a kit</a> and let Claude find the closest.</p><button class="btn small" type="button" id="k-clear">Clear filters</button></div>
  </div>`;
  let list;
  try { list = await sounds(); } catch (e) { $("#k-grid").innerHTML = ""; $("#k-empty").hidden = false; $("#k-empty").innerHTML = `<h3>The registry could not be loaded.</h3><p>${esc(e.message)}</p><button class="btn small" type="button" onclick="location.reload()">${icon("arrow-clockwise")} Try again</button>`; return; }
  const creators = [...new Set(list.map((a) => a.author))].sort();
  const kits = [...new Set(list.map((a) => a.kit).filter(Boolean))].sort();
  const state = { q: "", kind: "all", price: "all", author: "all", kit: kits.includes(params.get("kit")) ? params.get("kit") : "all", sort: "name" };
  $("#k-q").placeholder = `Search ${list.length} sounds`;
  const kinds = [...new Set(list.map((a) => a.kind))].sort();
  $("#k-kit").innerHTML = options([["all", "Any"], ...kits.map((k) => [k, k])], state.kit);
  $("#k-author").innerHTML = options([["all", "Any"], ...creators.map((c) => [c, c])], "all");
  const grid = $("#k-grid");
  // a page of cards at a time: 265 cards at once is a wall nobody scrolls (the design critic measured 18,000 px)
  const PAGE = 48; let shown = PAGE, last = [];
  let view = (() => { try { return localStorage.getItem("oasis.sounds.view") || "list"; } catch { return "list"; } })();
  const setView = (v) => { view = v; try { localStorage.setItem("oasis.sounds.view", v); } catch {} $$("[data-view]", app).forEach((b) => b.setAttribute("aria-pressed", b.dataset.view === v)); grid.className = v === "list" ? "s-rows" : "s-grid"; };
  $$("[data-view]", app).forEach((b) => b.addEventListener("click", () => { setView(b.dataset.view); paint(); }));
  const paint = () => {
    grid.innerHTML = last.slice(0, shown).map(view === "list" ? soundRow : soundCard).join("");
    const left = last.length - shown;
    $("#k-more").hidden = left <= 0;
    if (left > 0) $("#k-more-b").textContent = `Load more (${left} left)`;
    liveSoundCards(grid);
  };
  $("#k-more-b").addEventListener("click", () => { shown += PAGE; paint(); });
  setView(view);
  const draw = () => {
    shown = PAGE;
    const q = state.q.trim().toLowerCase();
    let out = list.filter((a) => (state.kind === "all" || a.kind === state.kind) && (state.price === "all" || (state.price === "free") === (a.price === 0)) && (state.author === "all" || a.author === state.author) && (state.kit === "all" || a.kit === state.kit)
      && (!q || `${a.title} ${a.kit || ""} ${a.author} ${a.description || ""}`.toLowerCase().includes(q)));
    const by = { name: (x, y) => x.title.localeCompare(y.title), kit: (x, y) => String(x.kit).localeCompare(String(y.kit)) || x.title.localeCompare(y.title), "price-asc": (x, y) => x.price - y.price || x.title.localeCompare(y.title), "price-desc": (x, y) => y.price - x.price || x.title.localeCompare(y.title), length: (x, y) => y.duration - x.duration, knobs: (x, y) => y.knobCount - x.knobCount }[state.sort];
    out = out.sort(by);
    last = out; paint();
    $("#k-count").innerHTML = out.length === list.length ? `<b class="num">${list.length}</b> sounds from <b class="num">${creators.length}</b> creators in <b class="num">${kits.length}</b> kits` : `<b class="num">${out.length}</b> of ${list.length} sounds`;
    $("#k-empty").hidden = out.length > 0;
    playKit();
  };
  // a kit of voices (the Instrument kit: every sound has a note knob) gets "Play the kit" over its grid: pick a voice,
  // play it on the keyboard (public/keys.js mountKitPlayer, the same strip a sound page has under its stage)
  let shownKit = null, kp = null;
  const playKit = async () => {
    if (state.kit === shownKit) return;
    const kit = (shownKit = state.kit);
    kp?.destroy(); kp = null; $("#k-play").hidden = true;
    if (kit === "all") return;
    const inKit = list.filter((a) => a.kit === kit).sort((x, y) => x.title.localeCompare(y.title));
    if (inKit.length > 40) return; // the knobs live on each sound's detail; a kit of voices is a dozen, not a crate
    const voices = (await Promise.all(inKit.map((a) => detail(a.id).catch(() => null)))).filter(Boolean);
    if (kit !== shownKit || !$("#k-play")) return;
    kp = mountKitPlayer($("#k-play"), voices, { renderFor: (v) => makeRenderer(v, { analysis: false }), blurb: "Pick a voice and play it. Every note is rendered from the program, ahead of your key press." });
  };
  segment($("#k-kinds"), [{ id: "all", label: "All" }, ...kinds.map((k) => ({ id: k, label: KIND_LABEL[k] || k }))], "all", (v) => { state.kind = v; draw(); });
  let qT = 0;
  $("#k-q").addEventListener("input", (e) => { clearTimeout(qT); qT = setTimeout(() => { state.q = e.target.value; draw(); }, 120); });
  [["k-kit", "kit"], ["k-author", "author"], ["k-price", "price"], ["k-sort", "sort"]].forEach(([id, key]) => $(`#${id}`).addEventListener("change", (e) => { state[key] = e.target.value; e.target.closest(".s-sel").classList.toggle("set", key !== "sort" && e.target.value !== "all"); draw(); }));
  $("#k-clear").addEventListener("click", () => {
    Object.assign(state, { q: "", kind: "all", price: "all", author: "all", kit: "all" });
    $("#k-q").value = ""; ["k-kit", "k-author", "k-price"].forEach((id) => { $(`#${id}`).value = "all"; $(`#${id}`).closest(".s-sel").classList.remove("set"); });
    $("#k-kinds").querySelector('[data-v="all"]').click();
    draw();
  });
  if (state.kit !== "all") $("#k-kit").closest(".s-sel").classList.add("set");
  draw();
}

// ---------- the 3D kit (off the nav, still at #/kit) ----------
export async function pageKit(app) {
  app.innerHTML = `<div class="wrap kit-page">
    <header class="k-head">
      <div><h1>The kit</h1><p class="lede">Every piece is a program on one 6 m grid. Hover one and it rebuilds; open one and turn its knobs.</p></div>
      <dl class="k-facts" id="k-facts"></dl>
    </header>
    <div class="k-bar">
      <div class="k-chips" id="k-kinds" role="group" aria-label="Kind"></div>
      <div class="k-chips" id="k-price" role="group" aria-label="Price"></div>
      <label class="k-sort">Sort <select id="k-sort"><option value="name">Name</option><option value="price-asc">Price, low to high</option><option value="price-desc">Price, high to low</option><option value="size">Footprint</option><option value="knobs">Most knobs</option></select></label>
    </div>
    <div class="k-row" id="k-creators"></div>
    <div class="k-grid" id="k-grid"></div>
    <div class="k-empty" id="k-empty" hidden><h3>No pieces match.</h3><p>Clear a filter, or ask the factory for one.</p></div>
  </div>`;
  const list = (await catalog()).filter((a) => a.author !== "oasis" || a.price > 0 || a.knobCount > 0);
  list.forEach((a) => (a.kind = kindOf(a)));
  const creators = [...new Set(list.map((a) => a.author))].sort();
  $("#k-facts").innerHTML = [[list.length, "pieces"], [creators.length, "creators"], ["6 m", "grid"]].map(([v, k]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("");

  const state = { kind: "all", price: "all", author: "all", sort: "name" };
  const counts = (key, vals) => vals.map((v) => [v, list.filter((a) => a[key] === v).length]);
  $("#k-kinds").innerHTML = [["all", "All", list.length], ...counts("kind", [...new Set(list.map((a) => a.kind))].sort()).map(([k, n]) => [k, k, n])].map(([v, l, n]) => `<button class="k-chip${v === "all" ? " on" : ""}" data-f="kind" data-v="${esc(v)}">${esc(l)} <small>${n}</small></button>`).join("");
  $("#k-price").innerHTML = [["all", "Any price"], ["free", "Free"], ["paid", "Paid"]].map(([v, l]) => `<button class="k-chip${v === "all" ? " on" : ""}" data-f="price" data-v="${v}">${l}</button>`).join("");
  $("#k-creators").innerHTML = `<span>By</span><div class="k-chips">${[["all", "everyone"], ...creators.map((c) => [c, c])].map(([v, l]) => `<button class="k-chip${v === "all" ? " on" : ""}" data-f="author" data-v="${esc(v)}">${v === "all" ? l : `<img src="${thumb(list.find((a) => a.author === v).id, { w: 80 })}" alt="">${esc(l)}`}</button>`).join("")}</div>`;

  const grid = $("#k-grid");
  // a page of cards at a time: 265 cards at once is a wall nobody scrolls (the design critic measured 18,000 px)
  const PAGE = 48; let shown = PAGE, last = [];
  let view = (() => { try { return localStorage.getItem("oasis.sounds.view") || "list"; } catch { return "list"; } })();
  const setView = (v) => { view = v; try { localStorage.setItem("oasis.sounds.view", v); } catch {} $$("[data-view]", app).forEach((b) => b.setAttribute("aria-pressed", b.dataset.view === v)); grid.className = v === "list" ? "s-rows" : "s-grid"; };
  $$("[data-view]", app).forEach((b) => b.addEventListener("click", () => { setView(b.dataset.view); paint(); }));
  const paint = () => {
    grid.innerHTML = last.slice(0, shown).map(view === "list" ? soundRow : soundCard).join("");
    const left = last.length - shown;
    $("#k-more").hidden = left <= 0;
    if (left > 0) $("#k-more-b").textContent = `Load more (${left} left)`;
    liveSoundCards(grid);
  };
  $("#k-more-b").addEventListener("click", () => { shown += PAGE; paint(); });
  setView(view);
  const draw = () => {
    shown = PAGE;
    let out = list.filter((a) => (state.kind === "all" || a.kind === state.kind) && (state.price === "all" || (state.price === "free") === (a.price === 0)) && (state.author === "all" || a.author === state.author));
    const by = { name: (x, y) => x.title.localeCompare(y.title), "price-asc": (x, y) => x.price - y.price || x.title.localeCompare(y.title), "price-desc": (x, y) => y.price - x.price || x.title.localeCompare(y.title), size: (x, y) => (y.footprint?.[0] || 0) * (y.footprint?.[1] || 0) - (x.footprint?.[0] || 0) * (x.footprint?.[1] || 0), knobs: (x, y) => y.knobCount - x.knobCount }[state.sort];
    out = out.sort(by);
    grid.innerHTML = out.map(card).join("");
    $("#k-empty").hidden = out.length > 0;
    liveCards(grid);
  };
  app.addEventListener("click", (e) => {
    const b = e.target.closest(".k-chip[data-f]"); if (!b) return;
    state[b.dataset.f] = b.dataset.v;
    $$(`.k-chip[data-f="${b.dataset.f}"]`, app).forEach((x) => x.classList.toggle("on", x === b));
    draw();
  });
  $("#k-sort").addEventListener("change", (e) => { state.sort = e.target.value; draw(); });
  draw();
}

// ---------- the asset page ----------
const partKey = (q) => `${q.t}|${q.p.join(",")}|${q.s ? q.s.join(",") : `${q.r},${q.h},${q.n}`}|${q.c}|${q.e ? 1 : 0}`;

/** New parts glow for a beat: what a rebuild added or repainted. */
function flashNew(v, prev, parts) {
  if (reduced || !prev) return;
  const was = new Set(prev.map(partKey));
  const fresh = parts.filter((q) => !was.has(partKey(q)));
  if (!fresh.length || fresh.length === parts.length && !prev.length) return;
  const g = partsToGroup(fresh);
  const accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#0070E0";
  const mat = new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.85, depthTest: false });
  g.traverse((o) => { if (o.isMesh) { o.material = mat; o.renderOrder = 10; } });
  v.scene.add(g);
  const start = performance.now();
  const f = (t) => {
    const k = (t - start) / 750;
    if (k >= 1) { v.scene.remove(g); g.traverse((o) => { if (o.isMesh) o.geometry.dispose(); }); mat.dispose(); v.tickers.delete(f); return; }
    mat.opacity = 0.85 * (1 - k) * (1 - k);
  };
  v.tickers.add(f);
}

function presetSwatch(vals) {
  const cs = Object.values(vals).filter((x) => /^#[0-9a-f]{6}$/i.test(x)).slice(0, 4);
  return `<i>${cs.map((c) => `<b style="background:${c}"></b>`).join("") || `<b style="background:var(--sunk)"></b>`}</i>`;
}

export async function pageAsset(app, id) {
  // the page's shape while the program loads: crumb, title, a stage and a knob panel
  app.innerHTML = `<div class="wrap a-page" aria-busy="true"><div class="skel" style="height:14px;width:140px;margin-bottom:18px"></div><div class="skel" style="height:44px;width:min(360px,60%)"></div><div class="skel" style="height:14px;width:min(520px,80%);margin:14px 0 24px"></div><div class="sp-hero"><div class="skel" style="min-height:400px;border-radius:var(--r-lg)"></div><div class="skel" style="min-height:400px;border-radius:var(--r-lg)"></div></div></div>`;
  let a;
  try { a = await detail(id); } catch { app.innerHTML = `<div class="wrap split2"><div><h1>That sound doesn't exist.</h1><p class="lede">It may have been removed, or the link has a typo.</p><p style="margin-top:24px"><a class="btn primary" href="#/sounds">Browse sounds</a></p></div></div>`; return; }
  if (a.format === "sound") return pageSound(app, a, { catalog: sounds, card: soundRow, liveCards: liveSoundCards });
  if (a.format !== "blocks") { location.hash = "#/sounds"; return; }
  const knobs = a.knobs || {};
  const values = Object.fromEntries(Object.entries(knobs).map(([k, d]) => [k, d.default]));
  const diff = () => Object.fromEntries(Object.entries(values).filter(([k, val]) => val !== knobs[k].default));
  const origin = location.origin;

  const control = (k, d) => {
    const label = esc(d.label || k);
    if (d.type === "range") return `<div class="a-range"><label for="k-${k}">${label}</label><output id="o-${k}">${d.default}</output><input type="range" id="k-${k}" data-k="${k}" min="${d.min}" max="${d.max}" step="${d.step || 1}" value="${d.default}" style="--p:${((d.default - d.min) / (d.max - d.min)) * 100}%"></div>`;
    if (d.type === "toggle") return `<label class="a-switch"><span>${label}</span><input type="checkbox" id="k-${k}" data-k="${k}" ${d.default ? "checked" : ""}><i></i></label>`;
    if (d.type === "choice") return `<div class="a-choice"><label>${label}</label><div data-choice="${k}"></div></div>`;
    return "";
  };
  const colours = Object.entries(knobs).filter(([, d]) => d.type === "color");
  const others = Object.entries(knobs).filter(([, d]) => d.type !== "color");
  const presets = Object.entries(a.presetValues || {});
  const kitName = a.kit || a.worldKit;

  app.innerHTML = `<div class="wrap a-page">
    <nav class="a-crumb" aria-label="Breadcrumb"><a href="#/kit">Kit</a><span>/</span><span>${esc(a.title)}</span></nav>
    <header class="a-head">
      <div>
        <h1>${esc(a.title)}</h1>
        <p class="a-sub">by <b>${esc(a.author)}</b>${a.footprint ? ` · ${m(a.footprint[0])} × ${m(a.footprint[1])} m` : ""}${kitName ? ` · ${esc(kitName)} kit` : ""} · ${Object.keys(knobs).length} knobs</p>
        <p class="a-desc">${esc(a.description)}</p>
      </div>
      <div class="a-buy">
        <span class="a-price">${price(a.price)}<small>${a.price > 0 ? "per license" : "no license needed"}</small></span>
        ${a.price > 0 ? `<a class="btn primary" href="#/budget">${icon("wallet")} License through a budget</a><span class="note">Your agent buys it inside a budget you approve once in PayPal. ${esc(a.author)} is paid from that order.</span>`
          : `<a class="btn primary" href="/api/assets/${esc(a.id)}/download.glb" id="a-glb">${icon("download-simple")} Download GLB</a><span class="note">The GLB is built from the knobs you set here.</span>`}
      </div>
    </header>

    <section class="a-hero">
      <div class="a-stage-wrap">
        <div class="a-stage" id="a-stage">
          <div class="a-viewer" id="a-main" role="img" aria-label="${esc(a.title)}, live 3D. Drag to orbit."></div>
          <div class="a-cmp off" id="a-cmp" aria-hidden="true"></div>
          <div class="a-handle off" id="a-handle"><button type="button" aria-label="Compare: drag to reveal the piece at its defaults" aria-valuemin="0" aria-valuemax="100" aria-valuenow="50" role="slider">${icon("arrows-left-right")}</button></div>
          <span class="a-cap left off" id="cap-l">Defaults</span><span class="a-cap right off" id="cap-r">Your remix</span>
          <div class="a-hud"><div id="a-looks" aria-label="Look"></div><div id="a-time" aria-label="Time of day"></div></div>
        </div>
        <div class="a-foot">
          <div class="a-readout" id="a-readout"><span>building…</span></div>
          <div class="a-tools"><button class="btn small" id="a-compare" aria-pressed="false">${icon("columns")} Compare</button></div>
          <div class="a-looknote" id="a-looknote"></div>
        </div>
      </div>
      <aside class="a-knobs">
        <h2>Knobs <button type="button" id="a-reset">Reset</button></h2>
        ${presets.length ? `<div class="a-group"><span>Colourways</span><div class="a-presets" id="a-presets">${presets.map(([n, vals]) => `<button type="button" class="a-preset" data-preset="${esc(n)}">${presetSwatch(vals)}${esc(n)}</button>`).join("")}</div></div>` : ""}
        ${colours.length ? `<div class="a-group"><span>Colours</span><div class="a-swatches">${colours.map(([k, d]) => `<label class="a-swatch" style="--c:${esc(d.default)}"><i></i><input type="color" id="k-${k}" data-k="${k}" value="${esc(d.default)}"><span>${esc(d.label || k)}</span><small id="o-${k}">${esc(d.default)}</small></label>`).join("")}</div></div>` : ""}
        ${others.length ? `<div class="a-group"><span>Shape</span>${others.map(([k, d]) => control(k, d)).join("")}</div>` : ""}
        <div class="a-group"><span>The program</span><div class="a-program" id="a-program"></div></div>
        <div class="a-group"><span>Rebuilds</span><ol class="a-log" id="a-log"><li class="empty">Change a knob. The piece is built again, not stretched.</li></ol></div>
      </aside>
    </section>

    <section class="a-place" id="a-place-sec">
      <div>
        <h2>In the street</h2>
        <p class="lede">A kit is a place. One plan call lays out the ${esc(kitName || "kit")}'s street; your remix of ${esc(a.title)} takes its spot and the rest is built around it.</p>
        <div class="a-program" id="a-place-code"></div>
      </div>
      <div class="a-place-stage" id="a-place"><div class="skel"></div></div>
    </section>

    <section class="a-more" id="a-more" hidden><h2>More from the kit</h2><div class="k-grid" id="a-more-grid"></div></section>
  </div>`;

  // ----- the viewer -----
  const v = createViewer($("#a-main"), { time: "day" });
  let look = "studio", time = "day", parts = null;
  const looknote = () => { const L = LOOKS.find((l) => l.id === look); $("#a-looknote").innerHTML = `<b>${esc(L.label)}.</b> ${esc(L.note)}<span class="tag${L.ships ? " ok" : ""}">${L.ships ? "ships in the GLB" : "viewer only"}</span>`; };
  segment($("#a-looks"), LOOKS, look, (id) => { look = id; applyLook(v, look, { night: time === "night" }); if (cmp.v) applyLook(cmp.v, look, { night: time === "night" }); looknote(); });
  segment($("#a-time"), [{ id: "day", label: "Day" }, { id: "dusk", label: "Dusk" }, { id: "night", label: "Night" }], time, (t) => { time = t; v.setTime(t); applyLook(v, look, { night: t === "night" }); if (cmp.v) { cmp.v.setTime(t); applyLook(cmp.v, look, { night: t === "night" }); } place.setTime?.(t); });
  looknote();

  // ----- compare: a second viewer at the defaults, camera locked to the main one -----
  const cmp = { v: null, on: false, at: 50 };
  const handle = $("#a-handle"), cmpEl = $("#a-cmp");
  const setAt = (pct) => { cmp.at = Math.max(0, Math.min(100, pct)); $("#a-stage").style.setProperty("--at", `${cmp.at}%`); $("button", handle).setAttribute("aria-valuenow", Math.round(cmp.at)); };
  setAt(50);
  const sync = () => { if (!cmp.v) return; const c = cmp.v.camera; c.position.copy(v.camera.position); c.quaternion.copy(v.camera.quaternion); c.fov = v.camera.fov; c.near = v.camera.near; c.far = v.camera.far; c.updateProjectionMatrix(); cmp.v.controls.target.copy(v.controls.target); };
  async function toggleCompare() {
    cmp.on = !cmp.on;
    $("#a-compare").classList.toggle("on", cmp.on); $("#a-compare").setAttribute("aria-pressed", cmp.on);
    [cmpEl, handle, $("#cap-l"), $("#cap-r")].forEach((el) => el.classList.toggle("off", !cmp.on));
    if (cmp.on && !cmp.v) {
      cmp.v = createViewer(cmpEl, { time });
      cmp.v.controls.enabled = false; cmp.v.controls.enableDamping = false; cmp.v.controls.minDistance = 0.01; cmp.v.controls.maxDistance = 1e5;
      const { parts: base } = await api(`/api/assets/${a.id}/parts.json`);
      cmp.v.setParts(base); applyLook(cmp.v, look, { night: time === "night" });
      v.tickers.add(sync);
    }
  }
  $("#a-compare").addEventListener("click", toggleCompare);
  const hb = $("button", handle);
  hb.addEventListener("pointerdown", (e) => {
    hb.setPointerCapture(e.pointerId);
    const r = $("#a-stage").getBoundingClientRect();
    const move = (ev) => setAt(((ev.clientX - r.left) / r.width) * 100);
    const up = () => { hb.removeEventListener("pointermove", move); hb.removeEventListener("pointerup", up); };
    hb.addEventListener("pointermove", move); hb.addEventListener("pointerup", up);
  });
  hb.addEventListener("keydown", (e) => { if (e.key === "ArrowLeft") setAt(cmp.at - 4); else if (e.key === "ArrowRight") setAt(cmp.at + 4); else return; e.preventDefault(); });

  // ----- the program and the log -----
  let hot = null;
  const program = () => {
    const d = diff();
    const body = Object.entries(d).map(([k, val]) => `\n  <span class="kn${k === hot ? " hot" : ""}" data-k="${k}">${k}: <span class="s">${esc(JSON.stringify(val))}</span></span>,`).join("");
    $("#a-program").innerHTML = `<button class="a-copy" id="a-copy" type="button">${icon("copy")} Copy</button><span class="k">import</span> { createAsset } <span class="k">from</span>\n  <span class="s">"${esc(origin)}/cdn/${esc(a.id)}.mjs${a.price > 0 ? "?lic=…" : ""}"</span>;\nscene.add(createAsset(${body ? `{${body}\n}` : `<span class="c">/* defaults */</span>`}));`;
    $("#a-copy").addEventListener("click", async () => {
      const text = `import { createAsset } from "${origin}/cdn/${a.id}.mjs${a.price > 0 ? "?lic=…" : ""}";\nscene.add(createAsset(${Object.keys(d).length ? JSON.stringify(d) : ""}));`;
      try { await navigator.clipboard.writeText(text); $("#a-copy").classList.add("done"); $("#a-copy").innerHTML = `${icon("check")} Copied`; setTimeout(program, 2000); } catch { toast("Select the code and copy it"); }
    });
    if (hot) requestAnimationFrame(() => requestAnimationFrame(() => $$(".kn.hot", app).forEach((el) => el.classList.remove("hot"))));
    if ($("#a-glb")) $("#a-glb").href = `/api/assets/${a.id}/download.glb?p=${encodeURIComponent(JSON.stringify(d))}`;
  };
  const log = [];
  const addLog = (entry) => {
    log.unshift(entry); log.length = Math.min(log.length, 6);
    $("#a-log").innerHTML = log.map((l) => `<li><b>${esc(l.what)}</b><span>${l.delta === 0 ? "repainted" : `${l.delta > 0 ? "+" : ""}${l.delta} parts`} · ${l.ms} ms</span></li>`).join("");
  };

  // ----- rebuild -----
  let n = 0, last = null;
  const rebuild = async (what) => {
    const run = ++n, t0 = performance.now();
    let res;
    try { res = await api(`/api/assets/${a.id}/parts.json?p=${encodeURIComponent(JSON.stringify(diff()))}`); } catch (e) { toast(e.message); return; }
    if (run !== n) return;
    const prev = parts; parts = res.parts;
    v.setParts(parts); applyLook(v, look, { night: time === "night" });
    flashNew(v, prev, parts);
    const ms = Math.max(1, Math.round(performance.now() - t0));
    const s = v.stats();
    $("#a-readout").innerHTML = `<span><b>${parts.length}</b> parts</span><span><b>${s.tris.toLocaleString()}</b> triangles</span><span>rebuilt in <b>${ms}</b> ms</span>`;
    if (what && prev) addLog({ what, delta: parts.length - prev.length, ms });
    program();
    place.update?.(parts);
    last = res.values;
  };
  const setKnob = (k, val, label) => {
    const old = values[k]; if (old === val) return;
    values[k] = val; hot = k;
    const d = knobs[k];
    const fmt = (x) => (d.type === "toggle" ? (x ? "on" : "off") : String(x));
    clearTimeout(rebuild.t);
    rebuild.t = setTimeout(() => rebuild(label || `${d.label || k} ${fmt(old)} → ${fmt(val)}`), 40);
  };
  const paint = () => {
    for (const [k, d] of Object.entries(knobs)) {
      const el = $(`#k-${k}`); const o = $(`#o-${k}`);
      if (d.type === "toggle") el.checked = values[k];
      else if (d.type === "choice") choices[k]?.set(values[k]);
      else if (el) { el.value = values[k]; if (d.type === "range") el.style.setProperty("--p", `${((values[k] - d.min) / (d.max - d.min)) * 100}%`); if (d.type === "color") el.closest(".a-swatch").style.setProperty("--c", values[k]); }
      if (o) o.textContent = values[k];
    }
    $$(".a-preset", app).forEach((b) => b.classList.toggle("on", Object.entries(a.presetValues[b.dataset.preset]).every(([k, val]) => values[k] === val)));
  };
  const choices = {};
  for (const [k, d] of others) if (d.type === "choice") choices[k] = segment($(`[data-choice="${k}"]`), d.options.map((o) => ({ id: o, label: o })), d.default, (val) => { setKnob(k, val); paint(); });
  $(".a-knobs").addEventListener("input", (e) => {
    const k = e.target.dataset.k; if (!k) return;
    const d = knobs[k];
    const val = d.type === "toggle" ? e.target.checked : d.type === "range" ? Number(e.target.value) : e.target.value.toUpperCase();
    if (d.type === "range") e.target.style.setProperty("--p", `${((val - d.min) / (d.max - d.min)) * 100}%`);
    if (d.type === "color") e.target.closest(".a-swatch").style.setProperty("--c", val);
    const o = $(`#o-${k}`); if (o) o.textContent = val;
    setKnob(k, val);
    $$(".a-preset", app).forEach((b) => b.classList.toggle("on", Object.entries(a.presetValues[b.dataset.preset]).every(([kk, vv]) => values[kk] === vv)));
  });
  $("#a-presets")?.addEventListener("click", (e) => {
    const b = e.target.closest(".a-preset"); if (!b) return;
    const vals = a.presetValues[b.dataset.preset];
    const changed = Object.entries(vals).filter(([k, val]) => knobs[k] && values[k] !== val);
    if (!changed.length) return;
    for (const [k, val] of changed) values[k] = val;
    hot = changed[0][0]; paint();
    clearTimeout(rebuild.t); rebuild.t = setTimeout(() => rebuild(`${b.dataset.preset} colourway`), 40);
  });
  $("#a-reset").addEventListener("click", () => {
    if (!Object.keys(diff()).length) return;
    for (const [k, d] of Object.entries(knobs)) values[k] = d.default;
    hot = null; paint();
    clearTimeout(rebuild.t); rebuild.t = setTimeout(() => rebuild("reset to defaults"), 40);
  });

  // ----- in the street: the kit's plan with this piece swapped for the remix -----
  const place = {};
  const prompt = /kyoto|japan|torii|shrine|pagoda/.test(a.tags.join(" ")) ? "a kyoto market street" : /harbour|coast|lighthouse|sea/.test(a.tags.join(" ")) ? "a seaside harbour street" : "a cosy little town";
  const placeCode = () => { const d = diff(); $("#a-place-code").innerHTML = `<span class="c">// the street</span>\nPOST /api/world/plan   { <span class="s">"prompt"</span>: <span class="s">"${esc(prompt)}"</span> }\n<span class="c">// every piece, rebuilt with its knobs; yours among them</span>\nPOST /api/world/parts  { <span class="s">"items"</span>: [ { <span class="s">"asset"</span>: <span class="s">"${esc(a.id)}"</span>, <span class="s">"knobs"</span>: ${esc(JSON.stringify(d))} }, … ] }`; };
  placeCode();
  async function mountPlace() {
    const el = $("#a-place"); el.innerHTML = `<div class="a-viewer" id="a-place-view" role="img" aria-label="${esc(a.title)} in the kit's street"></div><div id="a-place-time"></div>`;
    const pv = createViewer($("#a-place-view"), { time, autoRotate: !reduced });
    pv.controls.autoRotateSpeed = 0.35;
    segment($("#a-place-time"), [{ id: "day", label: "Day" }, { id: "dusk", label: "Dusk" }, { id: "night", label: "Night" }], time, (t) => pv.setTime(t));
    place.setTime = (t) => pv.setTime(t);
    const plan = await api("/api/world/plan", { method: "POST", body: { prompt } });
    const CELL = 6, cols = Math.round(plan.size[0] / CELL);
    let mine = plan.placements.filter((p) => p.asset === a.id);
    if (!mine.length) {
      // the planner did not use this piece: give it the centre lot on the far row, facing the road
      const cx = Math.floor(cols / 2), cz = 3;
      const inLot = (p) => p.asset !== "town-plaza" && p.at[0] >= cx * CELL - 0.5 && p.at[0] < (cx + 1) * CELL && p.at[2] >= cz * CELL - 0.5 && p.at[2] < (cz + 1) * CELL;
      plan.placements = plan.placements.filter((p) => !inLot(p));
      const [fw, fd] = a.footprint || [2, 2];
      mine = [{ asset: a.id, at: [cx * CELL + (CELL - fw) / 2, 0, cz * CELL + (CELL - fd) / 2], rot: 0, knobs: {} }];
      plan.placements.push(...mine);
    }
    // your remix takes one spot: the copy nearest the middle of the street; other copies keep the planner's knobs
    const mid = [plan.size[0] / 2, plan.size[1] / 2];
    mine.sort((x, y) => Math.hypot(x.at[0] - mid[0], x.at[2] - mid[1]) - Math.hypot(y.at[0] - mid[0], y.at[2] - mid[1]));
    mine = [mine[0]];
    const others = plan.placements.filter((p) => p !== mine[0]);
    const keys = [...new Set(others.map((p) => p.asset + "|" + JSON.stringify(p.knobs)))];
    const { parts: built } = await api("/api/world/parts", { method: "POST", body: { items: keys.map((k) => ({ asset: k.slice(0, k.indexOf("|")), knobs: JSON.parse(k.slice(k.indexOf("|") + 1)) })) } });
    const byKey = new Map(keys.map((k, i) => [k, built[i]]));
    pv.setTime(time);
    others.forEach((p, i) => { const g = pv.addPlaced(byKey.get(p.asset + "|" + JSON.stringify(p.knobs)), { at: p.at, rot: p.rot }); if (!reduced) pv.dropIn(g, i * 12); });
    let groups = [];
    place.update = (ps) => {
      groups.forEach((g) => { pv.content.remove(g); g.traverse((o) => { if (o.isMesh) o.geometry.dispose(); }); });
      groups = mine.map((p) => pv.addPlaced(ps, { at: p.at, rot: p.rot }));
      placeCode();
    };
    place.update(parts || (await api(`/api/assets/${a.id}/parts.json?p=${encodeURIComponent(JSON.stringify(diff()))}`)).parts);
    // a soft ring under the piece, so the eye finds it in the street
    const [fw, fd] = a.footprint || [2, 2];
    const ring = new THREE.Mesh(new THREE.RingGeometry(Math.hypot(fw, fd) / 2 + 0.6, Math.hypot(fw, fd) / 2 + 1.1, 48), new THREE.MeshBasicMaterial({ color: getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#0070E0", transparent: true, opacity: 0.55, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2;
    const p0 = mine[0]; ring.position.set(p0.at[0] + (p0.rot === 180 ? -fw / 2 : fw / 2), 0.03, p0.at[2] + (p0.rot === 180 ? -fd / 2 : fd / 2));
    pv.scene.add(ring);
    // frame the lot and its neighbours, looking at the piece from the road side
    const box = new THREE.Box3(new THREE.Vector3(ring.position.x - 12, 0, ring.position.z - 10), new THREE.Vector3(ring.position.x + 12, 9, ring.position.z + 10));
    await new Promise(requestAnimationFrame);
    pv.frame(box, { fit: 0.95 });
    pv.fitToRect(box, [0.04, 0.06, 0.96, 0.96]);
  }
  const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); mountPlace().catch((e) => { $("#a-place").innerHTML = `<p class="muted" style="padding:24px">${esc(e.message)}</p>`; }); } }, { rootMargin: "200px" });
  io.observe($("#a-place-sec"));

  // ----- more from the kit: same creator first -----
  catalog().then((list) => {
    const rest = list.filter((x) => x.id !== a.id && (x.author !== "oasis" || x.price > 0)).sort((x, y) => (y.author === a.author) - (x.author === a.author) || x.title.localeCompare(y.title)).slice(0, 5);
    if (!rest.length) return;
    $("#a-more").hidden = false; $("#a-more-grid").innerHTML = rest.map(card).join(""); liveCards($("#a-more-grid"));
  });

  await rebuild();
  paint();
}
