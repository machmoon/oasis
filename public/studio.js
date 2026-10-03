// Oasis Studio: describe a film, watch the set build, scrub the cut, license it in one order, render the MP4.
// Layout follows Remotion Studio (remotion-dev/remotion, packages/studio/src/components/Timeline): the picture in
// the middle, the timeline under it with the playhead over shot blocks, properties on the side.
import { createFilmPlayer } from "/film-player.js";

const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const usd = (n) => `$${Number(n || 0).toFixed(2)}`;
const price = (n) => (Number(n) === 0 ? "Free" : usd(n));
const icon = (name) => `<i class="ph-bold ph-${name}" aria-hidden="true"></i>`;
const clock = (t) => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, "0")}`;
const store = { get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} } };
async function api(path, { method = "GET", body } = {}) {
  const r = await fetch(path, { method, headers: body ? { "Content-Type": "application/json" } : {}, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(j.error || `Request failed (${r.status})`), { status: r.status });
  return j;
}
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg; t.classList.add("on");
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove("on"), 2800);
}

const EXAMPLES = [
  'a 15-second teaser for "Momiji Ramen" on a Kyoto market street at dusk',
  'a launch film for "Tidepool", a surf shop on a sunny seaside street',
  'a winter night in "Northlight", a ski town with a tram at Christmas',
];
const SHOT_NAMES = { orbit: "Orbit", dolly: "Dolly", push: "Push in", crane: "Crane", static: "Hold" };

let player = null, film = null, pollTimer = 0, recording = false;

export function leaveStudio() {
  player?.dispose(); player = null; film = null;
  clearTimeout(pollTimer);
  delete document.documentElement.dataset.theme;
}

/** #/studio (fresh) or #/film/:id (a saved film). */
export async function pageStudio(app, id) {
  document.documentElement.dataset.theme = "dark"; // the studio is a dark room; the rest of the site keeps its theme
  app.innerHTML = `<div class="studio">
    <aside class="s-brief">
      <h1>Make a film.</h1>
      <p class="lede">Describe it. Oasis builds the set from kit pieces, hangs 2D signs in your brand, cuts the shots and renders the MP4. One order pays every creator.</p>
      <form id="brief" novalidate>
        <div class="field"><label for="brief-text">What is it about?</label><textarea id="brief-text" rows="3" maxlength="400" placeholder="${esc(EXAMPLES[0])}"></textarea></div>
        <div class="chips" id="examples">${EXAMPLES.map((e) => `<button type="button" class="chip" data-ex="${esc(e)}">${esc(e.match(/"([^"]+)"/)?.[1] || e)}</button>`).join("")}</div>
        <button class="btn primary" id="direct" type="submit">${icon("film-slate")} Direct it</button>
        <ol class="steps" id="steps" hidden><li data-step="set">Laying out the street</li><li data-step="signs">Hanging the signs</li><li data-step="cut">Cutting the shots with Claude</li></ol>
      </form>
      <div id="say"></div>
      <form id="change" hidden novalidate>
        <div class="field"><label for="change-text">Change something</label><input type="text" id="change-text" maxlength="300" placeholder="Slower last shot, and make it rain red lanterns"></div>
        <button class="btn" type="submit" id="change-go">${icon("chat-circle-text")} Ask the director</button>
      </form>
      <p class="muted s-agents">Agents can do this too: <code>make_film</code> over MCP, licensed inside a human's budget. <a href="/llms.txt">llms.txt</a></p>
    </aside>
    <section class="s-main">
      <div class="screen" id="screen"><div class="screen-empty" id="screen-empty"><div class="skel"></div><span id="screen-note">Building the set</span></div></div>
      <div class="transport" id="transport" hidden>
        <button class="tbtn" id="play" aria-label="Play">${icon("play")}</button>
        <span class="tclock" id="tclock">0:00.0 / 0:00.0</span>
        <div class="scrub" id="scrub" role="slider" aria-label="Time" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" tabindex="0"><div class="segs" id="segs"></div><div class="head" id="head"></div></div>
        <div class="formats" id="formats" role="group" aria-label="Format">${["16:9", "9:16", "1:1"].map((k) => `<button class="fbtn" data-f="${k}" title="${k === "16:9" ? "Landscape" : k === "9:16" ? "Vertical, for Reels and Shorts" : "Square"}">${k}</button>`).join("")}</div>
      </div>
      <div class="strip" id="strip"></div>
    </section>
    <aside class="s-bill" id="bill"><div class="skel" style="height:220px"></div></aside>
  </div>`;

  $("#examples").addEventListener("click", (e) => { const b = e.target.closest("[data-ex]"); if (b) { $("#brief-text").value = b.dataset.ex; $("#brief-text").focus(); } });
  $("#brief").addEventListener("submit", async (e) => {
    e.preventDefault();
    const brief = $("#brief-text").value.trim();
    if (!brief) { $("#brief-text").focus(); return toast("Say what the film is about"); }
    await makeFilm(app, brief);
  });
  $("#change").addEventListener("submit", async (e) => {
    e.preventDefault();
    const request = $("#change-text").value.trim();
    if (!request || !film) return;
    const go = $("#change-go");
    go.disabled = true; go.innerHTML = `${icon("hourglass")} Directing…`;
    try {
      const next = await api(`/api/films/${film.id}/direct`, { method: "POST", body: { request } });
      $("#change-text").value = "";
      await mountFilm(next);
    } catch (err) { toast(err.message); }
    go.disabled = false; go.innerHTML = `${icon("chat-circle-text")} Ask the director`;
  });

  if (id) {
    try { await mountFilm(await api(`/api/films/${encodeURIComponent(id)}`)); }
    catch { $("#screen-note").textContent = "That film doesn't exist."; $("#screen-empty .skel").remove(); $("#bill").innerHTML = ""; }
  } else {
    // never an empty screen: the first example is laid out procedurally (no model call) while you type
    $("#brief-text").value = EXAMPLES[0];
    try { await mountFilm(await api("/api/films", { method: "POST", body: { brief: EXAMPLES[0], direct: false } }), { example: true }); } catch (e) { $("#screen-note").textContent = e.message; }
  }
}

async function makeFilm(app, brief) {
  const btn = $("#direct"), steps = $("#steps");
  btn.disabled = true; btn.innerHTML = `${icon("hourglass")} Directing…`;
  steps.hidden = false;
  steps.querySelectorAll("li").forEach((li) => li.classList.remove("done", "on"));
  const li = (k) => steps.querySelector(`[data-step="${k}"]`);
  li("set").classList.add("on");
  const t1 = setTimeout(() => { li("set").classList.replace("on", "done"); li("signs").classList.add("on"); }, 500);
  const t2 = setTimeout(() => { li("signs").classList.replace("on", "done"); li("cut").classList.add("on"); }, 1100);
  try {
    const f = await api("/api/films", { method: "POST", body: { brief } });
    clearTimeout(t1); clearTimeout(t2);
    steps.querySelectorAll("li").forEach((x) => { x.classList.remove("on"); x.classList.add("done"); });
    history.replaceState(null, "", `#/film/${f.id}`); // the URL is the film; no hashchange, so the page stays mounted
    await mountFilm(f);
  } catch (e) {
    clearTimeout(t1); clearTimeout(t2);
    toast(e.message);
  }
  steps.hidden = true;
  btn.disabled = false; btn.innerHTML = `${icon("film-slate")} Direct it`;
}

async function mountFilm(f, { example = false } = {}) {
  film = f;
  clearTimeout(pollTimer);
  player?.dispose(); player = null;
  const screen = $("#screen");
  screen.innerHTML = `<div class="screen-empty" id="screen-empty"><div class="skel"></div><span id="screen-note">Building the set</span></div>`;
  $("#say").innerHTML = f.say ? `<blockquote class="say">${esc(f.say)}</blockquote>` : "";
  $("#change").hidden = false;
  if (!example) $("#brief-text").value = f.brief;
  document.title = `${f.title}: Oasis Studio`;
  drawBill(f);

  screen.style.aspectRatio = `${f.size[0]} / ${f.size[1]}`;
  screen.classList.toggle("tall", f.size[1] > f.size[0]);
  const stage = document.createElement("div");
  stage.className = "stage-film";
  screen.appendChild(stage);
  try {
    await document.fonts.ready;
    player = await createFilmPlayer(stage, f, { audio: true });
    window.__player = player; // for smoke tests
  } catch (e) {
    $("#screen-note").textContent = `The set could not build: ${e.message}`;
    return;
  }
  $("#screen-empty")?.remove();
  drawTransport(f);
  drawStrip(f);
}

function drawTransport(f) {
  const tr = $("#transport"), play = $("#play"), head = $("#head"), scrub = $("#scrub"), clk = $("#tclock");
  tr.hidden = false;
  $("#formats").querySelectorAll(".fbtn").forEach((b) => b.classList.toggle("on", b.dataset.f === f.format));
  $("#formats").onclick = async (e) => {
    const b = e.target.closest(".fbtn");
    if (!b || b.dataset.f === film.format) return;
    b.disabled = true;
    try { await mountFilm(await api(`/api/films/${film.id}/format`, { method: "POST", body: { format: b.dataset.f } })); } catch (err) { toast(err.message); b.disabled = false; }
  };
  const tint = { day: "var(--seg-day)", dusk: "var(--seg-dusk)", night: "var(--seg-night)" };
  $("#segs").innerHTML = f.shots.map((s) => `<span style="flex:${s.seconds};background:${tint[s.time]}" title="${esc(SHOT_NAMES[s.kind])}, ${s.seconds}s, ${s.time}"></span>`).join("");
  const paint = (info, playing) => {
    head.style.left = `${(info.t / player.duration) * 100}%`;
    clk.textContent = `${clock(info.t)} / ${clock(player.duration)}`;
    scrub.setAttribute("aria-valuenow", Math.round((info.t / player.duration) * 100));
    play.innerHTML = icon(playing ? "pause" : "play");
    play.setAttribute("aria-label", playing ? "Pause" : "Play");
    $("#strip")?.querySelectorAll(".shot").forEach((el, i) => el.classList.toggle("on", i === info.i));
  };
  player.onTime(paint);
  paint({ t: 0, i: 0 }, false);
  play.onclick = () => (player.playing ? player.pause() : player.play());
  paint.last = 0;
  const seekAt = (clientX) => { const r = scrub.getBoundingClientRect(); player.goto(Math.min(1, Math.max(0, (clientX - r.left) / r.width)) * player.duration); };
  scrub.onpointerdown = (e) => { scrub.setPointerCapture(e.pointerId); seekAt(e.clientX); scrub.onpointermove = (ev) => seekAt(ev.clientX); };
  scrub.onpointerup = () => { scrub.onpointermove = null; };
  scrub.onkeydown = (e) => { if (e.key === "ArrowRight") player.goto(Math.min(player.duration, player.time + 0.5)); if (e.key === "ArrowLeft") player.goto(Math.max(0, player.time - 0.5)); if (e.key === " ") { e.preventDefault(); play.click(); } };
  // when paused, the player only draws on goto(); keep the clock honest after a pause
  player.onTime((info, playing) => { if (!playing) paint(info, false); });
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches) player.buildIn().then(() => { if (player && !player.playing) player.play(0); });
}

function drawStrip(f) {
  const strip = $("#strip");
  strip.innerHTML = f.shots.map((s, i) => `<button class="shot${i === 0 ? " on" : ""}" data-i="${i}"><img alt="" src="${player.still(player.starts[i] + s.seconds / 2, 320)}"><b>${esc(SHOT_NAMES[s.kind])}${s.card ? " + card" : ""}</b><span>${s.seconds}s at ${s.time}</span></button>`).join("");
  player.goto(0);
  strip.onclick = (e) => { const b = e.target.closest(".shot"); if (b) player.goto(player.starts[Number(b.dataset.i)] + 0.01); };
}

function drawBill(f) {
  const bill = f.bill, budget = store.get("oasis.budget");
  const group = (use) => bill.lines.filter((l) => l.use === use);
  const lines = (list) => list.map((l) => `<div class="line"><span>${esc(l.title)}<small>${esc(l.author)}</small></span><em>${price(l.price)}</em></div>`).join("");
  const set = group("set"), signs = group("sign"), cards = group("card");
  const r = f.render || { status: "idle" };
  $("#bill").innerHTML = `
    <h2>${esc(f.title)}</h2>
    <p class="muted" style="margin:6px 0 18px">${f.seconds}s, ${f.shots.length} shots, ${f.world.placements.length} pieces from ${bill.creators.length} creators.</p>
    <div class="bom">
      <h3>The set <span>${set.length} programs</span></h3>${lines(set.slice(0, 5))}${set.length > 5 ? `<details><summary>${set.length - 5} more pieces</summary>${lines(set.slice(5))}</details>` : ""}
      ${signs.length ? `<h3>Signs <span>2D, in your brand</span></h3>${lines(signs)}` : ""}
      ${cards.length ? `<h3>Cards</h3>${lines(cards)}` : ""}
      <h3>Air and sound</h3>
      <div class="line"><span>${f.weather === "none" ? "Clear air" : { blossom: "Cherry blossom", snow: "Snow", rain: "Rain", leaves: "Autumn leaves" }[f.weather]}<small>weather, a function of time and seed</small></span><em>Free</em></div>
      ${f.music ? `<div class="line"><span>Soundtrack, ${esc(f.music.mood)}<small>plucked strings and a pad, synthesised from this film's seed</small></span><em>Free</em></div>` : ""}
      <div class="total"><span>Licenses everything, once</span><em>${usd(bill.total)}</em></div>
    </div>
    <div class="palette" aria-label="Brand palette">${["primary", "secondary", "highlight", "background", "ink"].map((k) => `<i style="background:${esc(f.brand[k])}" title="${k}"></i>`).join("")}</div>
    <div class="licence">
      ${f.licensed
        ? `<span class="state live">Licensed</span><p>PayPal order <code>${esc(f.licence.orderId)}</code>. ${f.licence.creators?.length ? `Paid: ${f.licence.creators.map((c) => `${esc(c.author)} ${usd(c.usd)}`).join(", ")}.` : ""}</p>`
        : `<span class="state wait">Preview</span><p>Paid pieces are grey and signs are watermarked until the film is licensed.</p>
           ${budget?.token ? `<button class="btn primary" id="license">${icon("hand-coins")} License with my budget</button>` : `<a class="btn primary" href="#/budget">${icon("hand-coins")} Give your agent a budget</a>`}`}
    </div>
    <div class="export" id="export">
      ${r.status === "done" ? `<a class="btn primary" href="/api/films/${f.id}/film.mp4" download="${esc(f.title)}.mp4">${icon("download-simple")} Download MP4</a><p class="muted">${f.size.join("×")}, ${f.fps} fps${f.music ? ", with soundtrack" : ""}, ${(r.bytes / 1e6).toFixed(1)} MB.</p>`
        : r.status === "rendering" || r.status === "queued" ? `<div class="progress" role="progressbar" aria-valuenow="${Math.round((r.progress || 0) * 100)}"><i style="width:${Math.round((r.progress || 0) * 100)}%"></i></div><p class="muted">Rendering frame by frame on the server, ${Math.round((r.progress || 0) * 100)}%.</p>`
        : r.status === "failed" ? `<p class="err">Render failed: ${esc(r.error)}</p><button class="btn" id="render">${icon("film-reel")} Try again</button>`
        : f.renderer ? `<button class="btn" id="render">${icon("film-reel")} Render MP4</button>` : ""}
      <button class="btn" id="quick">${icon("record")} Quick export (WebM)</button>
      <p class="muted"><a href="${esc(f.link)}">Share this film</a></p>
    </div>`;
  $("#license")?.addEventListener("click", async () => {
    const b = $("#license"); b.disabled = true; b.innerHTML = `${icon("hourglass")} Charging your PayPal budget…`;
    try {
      const next = await api(`/api/films/${f.id}/license`, { method: "POST", body: { mandate: budget.token, agent_name: "Oasis Studio" } });
      toast(next.licence?.total ? `Licensed. PayPal order ${next.licence.orderId}.` : "Licensed.");
      await mountFilm(next);
    } catch (e) { toast(e.message); b.disabled = false; b.innerHTML = `${icon("hand-coins")} License with my budget`; }
  });
  $("#render")?.addEventListener("click", async () => {
    try { await api(`/api/films/${f.id}/render`, { method: "POST" }); poll(f.id); } catch (e) { toast(e.message); }
  });
  $("#quick")?.addEventListener("click", async () => {
    if (recording || !player) return;
    recording = true;
    const b = $("#quick"); b.disabled = true; b.innerHTML = `${icon("record")} Recording one playthrough…`;
    try {
      const blob = await player.record();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = `${f.title}.webm`; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
    } catch (e) { toast(e.message); }
    recording = false; b.disabled = false; b.innerHTML = `${icon("record")} Quick export (WebM)`;
  });
  if (r.status === "rendering" || r.status === "queued") poll(f.id);
}

function poll(id) {
  clearTimeout(pollTimer);
  pollTimer = setTimeout(async () => {
    if (!film || film.id !== id) return;
    try {
      const f = await api(`/api/films/${id}`);
      film = { ...film, render: f.render };
      drawBill(film);
      if (f.render?.status === "done") toast("Your film is rendered.");
    } catch {}
  }, 1500);
}
