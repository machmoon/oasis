// Oasis Studio: describe a film, watch the set build, cut it like an editor, license it in one PayPal order.
// The workspace is laid out like Premiere Pro and After Effects: brief and parts on the left, the picture in the
// middle, the inspector on the right, a multi-track timeline along the bottom (camera, cuts, titles, light, sound).
// The timeline follows Remotion Studio's model (remotion-dev/remotion, packages/studio/src/components/Timeline):
// one playhead over blocks sized by duration, seeking the same deterministic player the renderer uses.
// The speed graph in the inspector is After Effects' Graph Editor, reduced to what a shot needs: position over time
// as the line, speed as the fill under it.
import { createFilmPlayer } from "/film-player.js";
import { CURVES } from "/film-fx.js";

const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const usd = (n) => `$${Number(n || 0).toFixed(2)}`;
const icon = (name) => `<i class="ph-bold ph-${name}" aria-hidden="true"></i>`;
const tc = (t, fps = 30) => { const s = Math.floor(t), f = Math.round((t - s) * fps) % fps; return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}:${String(f).padStart(2, "0")}`; };
const store = { get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} } };
async function api(path, { method = "GET", body } = {}) {
  const r = await fetch(path, { method, headers: body ? { "Content-Type": "application/json" } : {}, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(j.error || `Request failed (${r.status})`), { status: r.status });
  return j;
}
/** One toast at a time, inside the viewer (sonner's model: an icon, a line, an optional action; it moves with
 *  transform and fades with opacity, see studio.css). kind: "ok" | "err" | "" */
function toast(msg, { kind = "", action = null, label = "", ms = 3200, html = false } = {}) {
  let t = $("#studio-toast");
  const host = $(".stagewrap") || document.body;
  if (!t) { t = document.createElement("div"); t.id = "studio-toast"; t.setAttribute("role", "status"); }
  if (t.parentElement !== host) host.appendChild(t);
  t.className = `studio-toast ${kind}`;
  t.innerHTML = `${icon(kind === "ok" ? "check" : kind === "err" ? "warning" : "info")}<span>${html ? msg : esc(msg)}</span>${action ? `<button type="button" class="act">${esc(label)}</button>` : ""}`;
  if (action) t.querySelector(".act").onclick = () => { t.classList.remove("on"); action(); };
  requestAnimationFrame(() => t.classList.add("on"));
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove("on"), ms);
}
/** The amount springs from 0 to its value (cult-ui rolling-number.tsx, reduced to one ease-out). */
function countUp(el, to, ms = 700) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) { el.textContent = usd(to); return; }
  const start = performance.now();
  const step = (now) => { const k = Math.min(1, (now - start) / ms), e = 1 - Math.pow(1 - k, 3); el.textContent = usd(to * e); if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
/** halo-segmented's sliding thumb: one element moved under the pressed button. */
function segThumb(seg) {
  if (!seg) return;
  let th = seg.querySelector(".thumb");
  if (!th) { th = document.createElement("i"); th.className = "thumb"; th.setAttribute("aria-hidden", "true"); seg.prepend(th); }
  const on = seg.querySelector("button.on");
  if (!on) { th.style.width = "0"; return; }
  th.style.width = `${on.offsetWidth}px`;
  th.style.transform = `translateX(${on.offsetLeft}px)`;
}
const sliderFill = (el) => el.style.setProperty("--v", `${((el.value - el.min) / (el.max - el.min)) * 100}%`);
const note = (kind, ic, title, text, acts = "") => `<div class="note ${kind} enter">${icon(ic)}<b>${esc(title)}</b><p>${esc(text)}</p>${acts ? `<div class="acts">${acts}</div>` : ""}</div>`;
const skel = (n = 3) => `<div class="sk-stack"><div class="sk title"></div>${Array.from({ length: n }, () => `<div class="sk line"></div>`).join("")}</div>`;

const EXAMPLES = [
  'a 15-second teaser for "Momiji Ramen" on a Kyoto market street at dusk',
  'a launch film for "Tidepool", a surf shop on a sunny seaside street',
  'a launch film for "Vibecheck", an AI-native oat latte startup in San Francisco that just raised its seed round',
  'a Monday-morning teaser for "Grr Mondays", a coffee cart for people who hate Mondays, on an autumn high street, #GrrMondays energy',
  'a calm winter night in "Northlight", a ski town with a tram at Christmas',
];
const SHOT = { orbit: "Orbit", dolly: "Dolly", push: "Push in", crane: "Crane", static: "Hold" };
const RAMP = { smooth: "Smooth", expo: "Ramp", punch: "Punch", build: "Build", quart: "Ease", linear: "Linear" };
const CUT = { cut: ["Cut", "scissors"], whip: ["Whip", "wind"], zoom: ["Zoom", "arrows-out"], glitch: ["Glitch", "waveform"], flash: ["Flash", "lightning"] };
const STYLES = {
  hype: { name: "Hype", note: "Ramps, whips and a title that lands", icon: "lightning" },
  clean: { name: "Clean", note: "Calm moves and straight cuts", icon: "minus" },
  dream: { name: "Dream", note: "Soft light, slow and bright", icon: "cloud" },
};
const LIGHT = { day: "#CFE3F7", dusk: "#F0B892", night: "#26305A" };
const AVATAR = ["#0070E0", "#001C64", "#12805C", "#B45309", "#7C3AED", "#DB2777", "#0E7490"];

let player = null, film = null, pollTimer = 0, recording = false, sel = 0, timers = [];

export function leaveStudio() {
  player?.dispose(); player = null; film = null;
  clearTimeout(pollTimer);
  timers.forEach(clearTimeout); timers = [];
  document.body.classList.remove("in-studio");
  delete document.documentElement.dataset.theme;
}

const LOGO = `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 3 28 10 16 17 4 10Z" fill="#0070E0"/><path d="M4 10 16 17V30L4 23Z" fill="#001C64"/><path d="M28 10 16 17V30L28 23Z" fill="#003087"/><path d="M16 6.5 22 10 16 13.5 10 10Z" fill="#FFC439"/></svg>`;

/** #/studio (fresh) or #/film/:id (a saved film). */
export async function pageStudio(app, id) {
  document.documentElement.dataset.theme = "light";
  document.body.classList.add("in-studio");
  if (!document.getElementById("studio-css")) {
    const l = document.createElement("link"); l.id = "studio-css"; l.rel = "stylesheet"; l.href = "/studio.css"; document.head.appendChild(l);
    const f = document.createElement("link"); f.rel = "stylesheet"; f.href = "https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;600;700;800&family=Source+Code+Pro:wght@500;600&display=swap"; document.head.appendChild(f);
  }
  const budget = store.get("oasis.budget");
  app.innerHTML = `<div class="studio-app" id="studio">
    <header class="sa-bar">
      <a class="sa-logo" href="#/" aria-label="Oasis home">${LOGO} Oasis</a>
      <span class="sa-sep"></span>
      <span class="sa-title" id="sa-title">Studio</span>
      <span class="grow"></span>
      <a class="sa-budget${budget?.token ? "" : " none"}" href="${budget?.id ? `#/budget/${esc(budget.id)}` : "#/budget"}" id="sa-budget">${icon("wallet")} <span>${budget?.token ? "PayPal budget" : "No budget yet"}</span></a>
      <button class="b" id="share" type="button">${icon("link-simple")} <span class="lbl">Share</span></button>
      <button class="b pri" id="export" type="button">${icon("export")} <span class="lbl">Export</span></button>
    </header>

    <aside class="sa-left" aria-label="Brief and parts">
      <section class="pnl">
        <h1>Make a film</h1>
        <p class="sub">Describe it. Oasis builds the street from 3D programs, hangs 2D signs in your brand and cuts it like an editor.</p>
        <form id="brief" novalidate>
          <label class="pnl-h" for="brief-text">Brief</label>
          <textarea class="ta" id="brief-text" rows="3" maxlength="400" placeholder="${esc(EXAMPLES[0])}"></textarea>
          <div class="ex" id="examples">${EXAMPLES.map((e) => `<button type="button" data-ex="${esc(e)}">${esc(e.match(/"([^"]+)"/)?.[1] || e)}</button>`).join("")}</div>
          <button class="b pri big" id="direct" type="submit">${icon("sparkle")} Direct the film</button>
          <p class="director" id="director-chip" hidden><span class="spin" aria-hidden="true"></span>Claude is directing the cut. The first cut plays meanwhile.</p>
          <div id="brief-err"></div>
        </form>
        <div id="say"></div>
      </section>
      <section class="pnl">
        <div class="pnl-h">Edit style</div>
        <div class="styles" id="styles">${Object.entries(STYLES).map(([k, s]) => `<button type="button" class="sty" data-style="${k}" aria-pressed="false"><span class="sty-ic">${icon(s.icon)}</span><b>${s.name}</b><small>${s.note}</small></button>`).join("")}</div>
      </section>
      <section class="pnl">
        <form id="change" novalidate>
          <label class="pnl-h" for="change-text">Ask the director</label>
          <input class="in" id="change-text" maxlength="300" placeholder="e.g. a faster opening">
        </form>
      </section>
      <section class="pnl" id="parts"><div class="pnl-h">In this film</div>${skel(4)}</section>
    </aside>

    <section class="sa-view">
      <div class="stagewrap"><div class="screen" id="screen"><div class="screen-empty busy" id="screen-empty"><span class="spin" aria-hidden="true"></span><span id="screen-note">Building the set</span></div></div></div>
      <div class="transport">
        <button class="ib" id="to-start" aria-label="Go to start">${icon("skip-back")}</button>
        <button class="play" id="play" aria-label="Play">${icon("play")}</button>
        <button class="ib" id="to-end" aria-label="Go to end">${icon("skip-forward")}</button>
        <span class="tc" id="tc">00:00:00 <span>/ 00:00:00</span></span><span class="fps" id="fps">30 fps</span><span class="sa-state wait" id="vstate">Preview</span>
        <span class="grow"></span>
        <div class="seg" id="formats" role="group" aria-label="Format">${["16:9", "9:16", "1:1"].map((k) => `<button type="button" data-f="${k}" title="${k === "16:9" ? "Landscape" : k === "9:16" ? "Vertical, for Reels and Shorts" : "Square"}">${k}</button>`).join("")}</div>
      </div>
    </section>

    <section class="sa-time" aria-label="Timeline">
      <div class="tl-corner">Tracks</div>
      <div class="tl-name" style="grid-row:2">${icon("video-camera")} Camera</div>
      <div class="tl-name" style="grid-row:3">${icon("text-t")} Titles</div>
      <div class="tl-name" style="grid-row:4">${icon("sun-horizon")} Light</div>
      <div class="tl-name" style="grid-row:5">${icon("waveform")} Sound</div>
      <div class="tl-body" id="tl"><div class="tl-ruler" id="ruler"></div><div class="tl-track" id="trk-cam"></div><div class="tl-track" id="trk-title"></div><div class="tl-track" id="trk-light"></div><div class="tl-track" id="trk-sound"></div><div class="playhead" id="ph"></div></div>
    </section>

    <aside class="sa-right" aria-label="Inspector and licence">
      <section class="pnl" id="licence"><div class="pnl-h">Licence</div>${skel(3)}<div class="sk btn" style="margin-top:14px"></div></section>
      <section class="pnl" id="inspect"><div class="pnl-h">Shot</div>${skel(3)}</section>
      <section class="pnl" id="exportpnl"><div class="pnl-h">Export</div><div class="sk btn"></div></section>
    </aside>
  </div>`;

  $("#examples").addEventListener("click", (e) => { const b = e.target.closest("[data-ex]"); if (b) { $("#brief-text").value = b.dataset.ex; $("#brief-text").focus(); } });
  $("#brief").addEventListener("submit", async (e) => {
    e.preventDefault();
    const brief = $("#brief-text").value.trim();
    if (!brief) { $("#brief-text").focus(); return toast("Say what the film is about", { kind: "err" }); }
    await makeFilm(brief);
  });
  $("#change").addEventListener("submit", async (e) => {
    e.preventDefault();
    const request = $("#change-text").value.trim();
    if (!request || !film) return;
    const inp = $("#change-text");
    inp.disabled = true; inp.value = "Directing…";
    try { await mountFilm(await api(`/api/films/${film.id}/direct`, { method: "POST", body: { request } })); inp.value = ""; }
    catch (err) { toast(err.message, { kind: "err" }); inp.value = request; }
    inp.disabled = false;
  });
  $("#styles").addEventListener("click", async (e) => {
    const b = e.target.closest("[data-style]");
    if (!b || !film || b.classList.contains("on")) return;
    markStyle(b.dataset.style);
    try { await mountFilm(await api(`/api/films/${film.id}/style`, { method: "POST", body: { style: b.dataset.style } }), { keep: true }); }
    catch (err) { toast(err.message, { kind: "err" }); markStyle(film.edit?.style); }
  });
  $("#share").addEventListener("click", async () => {
    if (!film) return;
    try { await navigator.clipboard.writeText(film.link); toast("Link copied", { kind: "ok" }); } catch { toast(film.link); }
  });
  $("#export").addEventListener("click", async () => {
    if (!film) return;
    const r = film.render || {};
    if (r.status === "done") { const a = document.createElement("a"); a.href = `/api/films/${film.id}/film.mp4`; a.download = `${film.title}.mp4`; a.click(); return; }
    if (r.status === "rendering" || r.status === "queued") return;
    if (!film.renderer) { $("#quick")?.click(); return; }
    try { await api(`/api/films/${film.id}/render`, { method: "POST" }); film.render = { status: "queued", progress: 0 }; drawExport(film); poll(film.id); } catch (e) { toast(e.message, { kind: "err" }); }
  });
  if (!pageStudio.keys) { addEventListener("keydown", keys); addEventListener("resize", () => segThumb($("#formats"))); pageStudio.keys = true; }

  if (id) {
    try { await mountFilm(await api(`/api/films/${encodeURIComponent(id)}`)); }
    catch (e) { screenFail(e.status === 404 ? "That film doesn't exist" : "The film could not load", e.status === 404 ? "It may have been removed, or the link has a typo." : e.message, `<a class="b pri" href="#/studio">Start a new film</a>`); }
  } else {
    // never an empty screen: the first example is laid out procedurally (no model call) while you type
    $("#brief-text").value = EXAMPLES[0];
    try { await mountFilm(await api("/api/films", { method: "POST", body: { brief: EXAMPLES[0], direct: false } }), { example: true }); }
    catch (e) { screenFail("The set could not build", e.message, `<button class="b pri" type="button" onclick="location.reload()">Try again</button>`); }
  }
}

/** The whole workspace says the same thing when there is no film: the screen explains, the panels go quiet. */
function screenFail(title, text, acts = "") {
  const screen = $("#screen");
  if (screen) screen.innerHTML = `<div class="screen-empty" id="screen-empty">${note("err", "film-slate", title, text, acts)}</div>`;
  $("#parts").innerHTML = `<div class="pnl-h">In this film</div><p class="inspect-empty">Nothing yet.</p>`;
  $("#licence").innerHTML = `<div class="pnl-h">Licence</div><p class="inspect-empty">There is no film to license.</p>`;
  $("#inspect").innerHTML = `<div class="pnl-h">Shot</div><p class="inspect-empty">Pick a shot on the timeline once the film is in.</p>`;
  $("#exportpnl").innerHTML = "";
  $("#sa-title").textContent = "Studio";
}

function keys(e) {
  if (!player || !document.body.classList.contains("in-studio")) return;
  if (e.target.closest("input, textarea")) return;
  if (e.key === " ") { e.preventDefault(); player.playing ? player.pause() : player.play(); }
  else if (e.key === "ArrowRight") player.goto(Math.min(player.duration, player.time + (e.shiftKey ? 1 : 1 / 30)));
  else if (e.key === "ArrowLeft") player.goto(Math.max(0, player.time - (e.shiftKey ? 1 : 1 / 30)));
  else if (e.key === "Home") player.goto(0);
}

function markStyle(k) {
  document.querySelectorAll(".sty").forEach((b) => { const on = b.dataset.style === k; b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); });
}

async function makeFilm(brief) {
  // Never wait on the model: the procedural cut plays at once, Claude's cut replaces it when it is ready.
  const btn = $("#direct");
  btn.setAttribute("aria-busy", "true"); btn.innerHTML = `<span class="spin" aria-hidden="true"></span> Building the street…`;
  $("#brief-err").innerHTML = "";
  try {
    const f = await api("/api/films", { method: "POST", body: { brief, direct: false } });
    history.replaceState(null, "", `#/film/${f.id}`); // the URL is the film; no hashchange, so the page stays mounted
    await mountFilm(f);
    directInBackground(f.id);
  } catch (e) {
    $("#brief-err").innerHTML = note("err", "warning", "The street could not be built", e.message);
    toast(e.message, { kind: "err" });
  }
  btn.removeAttribute("aria-busy"); btn.innerHTML = `${icon("sparkle")} Direct the film`;
}

async function directInBackground(id) {
  const chip = $("#director-chip");
  chip.hidden = false;
  try {
    const next = await api(`/api/films/${id}/direct`, { method: "POST", body: { request: "Cut this film for the brief." } });
    if (film?.id !== id) return;
    toast("Claude's cut is in.", { kind: "ok" });
    await mountFilm(next, { keep: true });
  } catch (e) {
    if (e.status !== 503 && film?.id === id) {
      $("#say").innerHTML = note("err", "warning", "The director could not cut this one", e.message, `<button class="b" type="button" id="redirect">Try again</button>`);
      $("#redirect")?.addEventListener("click", () => { $("#say").innerHTML = ""; directInBackground(id); });
    }
  }
  chip.hidden = true;
}

async function mountFilm(f, { example = false, keep = false, reveal = false, sweepMs = 2800 } = {}) {
  const at = keep && player ? player.time : 0;
  film = f;
  clearTimeout(pollTimer);
  player?.dispose(); player = null;
  sel = Math.min(sel, f.shots.length - 1);
  const screen = $("#screen");
  screen.innerHTML = `<div class="screen-empty busy" id="screen-empty"><span class="spin" aria-hidden="true"></span><span id="screen-note">Building the set</span></div>`;
  $("#say").innerHTML = f.say ? `<p class="say"><b>Director:</b> ${esc(f.say)}</p>` : "";
  if (!example) $("#brief-text").value = f.brief;
  $("#sa-title").innerHTML = `${esc(f.title)}<small>${f.seconds} s</small><small>${f.shots.length} shots</small><small>${f.size.join(" × ")}</small>`;
  document.title = `${f.title}: Oasis Studio`;
  markStyle(f.edit?.style || "clean");
  // back from PayPal: claim the licence with the token this browser kept when it opened the order
  const pending = !f.licensed && store.get(`oasis.film.${f.id}`);
  if (pending?.order) {
    api(`/api/films/${f.id}/claim`, { method: "POST", body: { order_id: pending.order, claim_token: pending.claim } })
      .then((next) => { store.set(`oasis.film.${f.id}`, null); mountFilm(next, { keep: true, reveal: true }); })
      .catch((e) => { if (e.status === 404) store.set(`oasis.film.${f.id}`, null); else toast(e.message, { kind: "err" }); });
  }
  drawBudget(f);
  drawParts(f);
  drawLicence(f);
  drawExport(f);

  screen.style.aspectRatio = `${f.size[0]} / ${f.size[1]}`;
  screen.classList.toggle("tall", f.size[1] > f.size[0]);
  screen.classList.toggle("sq", f.size[1] === f.size[0]);
  const stage = document.createElement("div");
  stage.className = "stage-film";
  screen.appendChild(stage);
  try {
    await document.fonts.ready;
    player = await createFilmPlayer(stage, f, { audio: true, reveal });
    window.__player = player; // for smoke tests
    window.__replayReveal = (ms) => mountFilm(film, { keep: true, reveal: true, sweepMs: ms || 2800 }); // for checks and demo takes
  } catch (e) {
    screenFail("The set could not build", e.message, `<button class="b pri" type="button" onclick="location.reload()">Try again</button>`);
    return;
  }
  $("#screen-empty")?.remove();
  const vs = $("#vstate");
  vs.className = `sa-state ${f.licensed ? "live" : "wait"}`;
  vs.textContent = f.licensed ? "Licensed" : "Preview";
  wireTransport();
  drawTimeline();
  drawInspector();
  drawWave();
  if (reveal) {
    // the licence lands on screen: hold a wide shot of the street, let the colour sweep through it, then the
    // receipt lands line by line as each creator is paid
    drawLicence(f, { paying: true });
    player.goto(Math.min(player.duration * 0.12, 1.2));
    await player.sweep(sweepMs);
    if (film !== f) return;
    vs.classList.add("pop");
    $("#sa-budget")?.classList.add("pop");
    drawLicence(f, { land: true });
    player.play(player.time);
    const n = (f.licence?.creators || []).length;
    setTimeout(() => { if (film === f) toast(n ? `${n} creator${n > 1 ? "s" : ""} paid from one PayPal order.` : "Licensed.", { kind: "ok", ms: 4000 }); }, n * 160 + 500);
  } else if (keep) player.goto(Math.min(at, player.duration));
  else if (!matchMedia("(prefers-reduced-motion: reduce)").matches) player.buildIn().then(() => { if (player && !player.playing) player.play(0); });
}

// ---------- transport ----------
function wireTransport() {
  const play = $("#play");
  const seg = $("#formats");
  seg.querySelectorAll("button").forEach((b) => b.classList.toggle("on", b.dataset.f === film.format));
  segThumb(seg);
  seg.onclick = async (e) => {
    const b = e.target.closest("button");
    if (!b || b.dataset.f === film.format) return;
    const was = film.format;
    seg.querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b)); segThumb(seg);
    b.disabled = true;
    try { await mountFilm(await api(`/api/films/${film.id}/format`, { method: "POST", body: { format: b.dataset.f } }), { keep: true }); }
    catch (err) { toast(err.message, { kind: "err" }); b.disabled = false; seg.querySelectorAll("button").forEach((x) => x.classList.toggle("on", x.dataset.f === was)); segThumb(seg); }
  };
  play.onclick = () => (player.playing ? player.pause() : player.play());
  $("#to-start").onclick = () => player.goto(0);
  $("#to-end").onclick = () => player.goto(player.duration);
  const paint = (info, playing) => {
    $("#tc").innerHTML = `${tc(info.t)} <span>/ ${tc(player.duration)}</span>`;
    play.innerHTML = icon(playing ? "pause" : "play");
    play.setAttribute("aria-label", playing ? "Pause" : "Play");
    $("#ph").style.left = `${(info.t / player.duration) * 100}%`;
    if (info.i !== sel) { sel = info.i; selectClip(); }
  };
  player.onTime(paint);
  paint({ t: 0, i: 0 }, false);
}

// ---------- timeline ----------
function drawTimeline() {
  const D = player.duration, pct = (t) => `${(t / D) * 100}%`;
  // ruler: a tick every half second, a label every second
  let r = "";
  for (let t = 0; t <= D + 1e-6; t += 0.5) { const maj = Math.abs(t - Math.round(t)) < 1e-6; r += `<i class="${maj ? "maj" : ""}" style="left:${pct(t)}"></i>${maj && t < D - 0.3 ? `<b style="left:${pct(t)}">${Math.round(t)}s</b>` : ""}`; }
  $("#ruler").innerHTML = r;
  // camera clips, each a filmstrip of its own frames; the cut into each shot as a diamond on its left edge
  const cam = $("#trk-cam");
  cam.innerHTML = film.shots.map((s, i) => `<div class="clip${i === sel ? " on" : ""}" data-i="${i}" style="left:calc(${pct(player.starts[i])} + 1px);width:calc(${pct(s.seconds)} - 2px)" title="${esc(SHOT[s.kind])}, ${s.seconds}s, ${RAMP[s.ramp || "smooth"]} ramp"><span>${esc(SHOT[s.kind])}</span></div>`).join("")
    + film.shots.slice(1).map((s, j) => { const i = j + 1, k = s.cut || "cut"; return `<button class="cutmark${k !== "cut" ? " fx" : ""}" data-cut="${i}" style="left:${pct(player.starts[i])}" title="${CUT[k][0]} into ${esc(SHOT[s.kind])}" aria-label="${CUT[k][0]} into shot ${i + 1}">${icon(CUT[k][1])}</button>`; }).join("");
  // thumbnails: one still per clip, tiled across it
  requestAnimationFrame(() => {
    if (!player) return;
    const t0 = player.time;
    cam.querySelectorAll(".clip").forEach((el) => { const i = Number(el.dataset.i), s = film.shots[i]; el.style.backgroundImage = `url(${player.still(player.starts[i] + s.seconds * 0.6, 200)})`; });
    player.goto(t0);
  });
  cam.onclick = (e) => {
    const c = e.target.closest(".clip"), m = e.target.closest(".cutmark");
    if (m) { sel = Number(m.dataset.cut); player.goto(player.starts[sel] + 0.01); selectClip(); drawInspector(true); return; }
    if (c) { sel = Number(c.dataset.i); selectClip(); player.goto(player.starts[sel] + 0.01); drawInspector(); }
  };
  // titles, cards and hits
  const tt = [];
  film.shots.forEach((s, i) => {
    const st = player.starts[i];
    if (s.title) tt.push(`<div class="bar title" style="left:${pct(st + Math.max(0, (s.title.at ?? 1) - 0.42))};width:calc(${pct(st + s.seconds - Math.max(0, (s.title.at ?? 1) - 0.42) - st)} - 2px)" title="3D title: ${esc(s.title.text)}">3D title</div><div class="bar hit" style="left:${pct(st + (s.title.at ?? 1))}" title="Impact"></div>`);
    if (s.card) tt.push(`<div class="bar card" style="left:calc(${pct(st)} + 1px);width:calc(${pct(s.seconds)} - 2px)">${s.card.layout === "lower" ? "Lower third" : "End card"}</div>`);
  });
  $("#trk-title").innerHTML = tt.join("");
  $("#trk-light").innerHTML = film.shots.map((s, i) => `<div class="light" style="left:calc(${pct(player.starts[i])} + 1px);width:calc(${pct(s.seconds)} - 2px);background:linear-gradient(90deg, ${LIGHT[s.time]}, ${LIGHT[s.timeTo || s.time]})" title="${s.time}${s.timeTo ? ` to ${s.timeTo}` : ""}"></div>`).join("");
  // scrubbing on the ruler and the empty parts of the tracks
  const tl = $("#tl");
  const seekAt = (x) => { const b = tl.getBoundingClientRect(); player.goto(Math.min(1, Math.max(0, (x - b.left) / b.width)) * player.duration); };
  $("#ruler").onpointerdown = (e) => { const el = e.currentTarget; el.setPointerCapture(e.pointerId); player.pause(); seekAt(e.clientX); el.onpointermove = (ev) => seekAt(ev.clientX); el.onpointerup = () => { el.onpointermove = null; }; };
}
function selectClip() { document.querySelectorAll("#trk-cam .clip").forEach((el) => el.classList.toggle("on", Number(el.dataset.i) === sel)); drawInspector(); }

async function drawWave() {
  const el = $("#trk-sound");
  if (!film.musicUrl) { el.innerHTML = `<span class="fine">No soundtrack</span>`; return; }
  el.innerHTML = `<canvas class="wave"></canvas>`;
  const cv = el.querySelector("canvas");
  try {
    const buf = await (await fetch(film.musicUrl)).arrayBuffer();
    const ac = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(1, 44100, 44100);
    const audio = await ac.decodeAudioData(buf);
    const data = audio.getChannelData(0), W = cv.width = cv.clientWidth * 2, H = cv.height = cv.clientHeight * 2;
    const g = cv.getContext("2d"), span = Math.min(1, audio.duration / player.duration), cols = Math.floor(W * span / 3);
    g.fillStyle = "#7FB2EE";
    for (let c = 0; c < cols; c++) {
      let peak = 0; const a = Math.floor((c / cols) * data.length), b = Math.floor(((c + 1) / cols) * data.length);
      for (let i = a; i < b; i += 16) peak = Math.max(peak, Math.abs(data[i]));
      const h = Math.max(2, peak * H * 0.9);
      g.fillRect(c * 3, (H - h) / 2, 2, h);
    }
  } catch { el.innerHTML = ""; }
}

// ---------- inspector ----------
function drawInspector(focusCut = false) {
  if (!film || !player) return;
  const s = film.shots[sel], ramp = s.ramp || "smooth", cut = s.cut || "cut";
  const box = $("#inspect");
  box.innerHTML = `
    <div class="pnl-h">Shot ${sel + 1} of ${film.shots.length} <span>${[SHOT[s.kind], s.card ? (s.card.layout === "lower" ? "lower third" : "end card") : "", s.title ? "3D title" : ""].filter(Boolean).map(esc).join(", ")}</span></div>
    <dl class="kv">
      <dt>Length</dt><dd><span class="stepper"><button type="button" data-len="-0.2" aria-label="Shorter">−</button><output>${s.seconds.toFixed(1)}s</output><button type="button" data-len="0.2" aria-label="Longer">+</button></span></dd>
      <dt>Light</dt><dd>${s.time}${s.timeTo ? ` → ${s.timeTo}` : ""}</dd>
      <dt>Lens</dt><dd>${Math.round(18 / Math.tan((s.fov * Math.PI) / 360))} mm</dd>
    </dl>
    <figure class="curvebox" aria-label="Speed graph">${curveSvg(ramp)}<figcaption><span>Position</span><span>Speed</span></figcaption></figure>
    <div class="pnl-h" style="margin-top:12px">Speed ramp</div>
    <div class="sa-chips" id="ramps">${Object.entries(RAMP).map(([k, n]) => `<button type="button" data-ramp="${k}" class="${k === ramp ? "on" : ""}">${n}</button>`).join("")}</div>
    ${sel > 0 ? `<div class="pnl-h" style="margin-top:14px" id="cut-h">Transition in</div>
    <div class="sa-chips" id="cuts">${Object.entries(CUT).map(([k, [n, ic]]) => `<button type="button" data-cutk="${k}" class="${k === cut ? "on" : ""}">${icon(ic)} ${n}</button>`).join("")}</div>` : ""}
    <div class="pnl-h" style="margin-top:14px">Camera shake <span id="shake-v">${Math.round((s.shake || 0) * 100)}%</span></div>
    <input class="slider" type="range" id="shake" min="0" max="100" step="5" value="${Math.round((s.shake || 0) * 100)}" aria-label="Camera shake">`;
  if (focusCut) $("#cut-h")?.scrollIntoView({ block: "nearest" });
  box.querySelectorAll("[data-len]").forEach((b) => (b.onclick = () => patch({ seconds: Math.round((s.seconds + Number(b.dataset.len)) * 10) / 10 })));
  box.querySelector("#ramps").onclick = (e) => { const b = e.target.closest("[data-ramp]"); if (b) patch({ ramp: b.dataset.ramp }); };
  box.querySelector("#cuts")?.addEventListener("click", (e) => { const b = e.target.closest("[data-cutk]"); if (b) patch({ cut: b.dataset.cutk }); });
  const sh = box.querySelector("#shake");
  sliderFill(sh);
  sh.oninput = () => { $("#shake-v").textContent = `${sh.value}%`; sliderFill(sh); };
  sh.onchange = () => patch({ shake: Number(sh.value) / 100 });
}

/** The After Effects speed graph for a ramp: position over the shot as a line, speed as the fill under it. */
function curveSvg(name) {
  const f = CURVES[name] || CURVES.smooth, W = 280, H = 84, pad = 8, n = 64;
  const pts = [], sp = [];
  let max = 0;
  for (let i = 0; i <= n; i++) { const x = i / n, v = (f(Math.min(1, x + 1e-3)) - f(Math.max(0, x - 1e-3))) / (Math.min(1, x + 1e-3) - Math.max(0, x - 1e-3)); sp.push(v); max = Math.max(max, v); }
  for (let i = 0; i <= n; i++) pts.push([pad + (i / n) * (W - 2 * pad), H - pad - f(i / n) * (H - 2 * pad)]);
  const speed = sp.map((v, i) => `${pad + (i / n) * (W - 2 * pad)},${H - pad - (v / max) * (H - 2 * pad) * 0.92}`).join(" ");
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><g class="grid">${[0.25, 0.5, 0.75].map((k) => `<line x1="${pad}" x2="${W - pad}" y1="${pad + k * (H - 2 * pad)}" y2="${pad + k * (H - 2 * pad)}"/>`).join("")}</g><polygon class="speed" points="${pad},${H - pad} ${speed} ${W - pad},${H - pad}"/><polyline class="pos" points="${pts.map((p) => p.join(",")).join(" ")}"/><circle class="dot" cx="${pad}" cy="${H - pad}" r="3.5"/><circle class="dot" cx="${W - pad}" cy="${pad}" r="3.5"/></svg>`;
}

/** One shot edit: the server validates it, the player swaps the cut in place, and the timeline redraws. */
async function patch(change) {
  const i = sel;
  try {
    const next = await api(`/api/films/${film.id}/shots/${i}`, { method: "POST", body: change });
    film = { ...film, shots: next.shots, seconds: next.seconds, render: next.render };
    player.setCut(next.shots);
    $("#sa-title").innerHTML = `${esc(film.title)}<small>${film.seconds} s</small><small>${film.shots.length} shots</small><small>${film.size.join(" × ")}</small>`;
    drawTimeline();
    drawInspector();
    drawExport(film);
  } catch (e) { toast(e.message, { kind: "err" }); }
}

// ---------- parts, licence, export ----------
function drawParts(f) {
  const lines = f.bill.lines;
  const row = (l) => `<div class="part"><img src="/api/assets/${encodeURIComponent(l.asset)}/render.png?w=96" alt="" loading="lazy"><div><b>${esc(l.title)}</b><span>${esc(l.author)}</span><small class="kind">${l.kind === "3d" ? "3D" : "2D"}${l.placed > 1 ? ` ×${l.placed}` : ""}</small></div><em class="${l.price ? "" : "free"}">${l.price ? usd(l.price) : "Free"}</em></div>`;
  const paid = lines.filter((l) => l.price > 0), free = lines.filter((l) => !l.price);
  $("#parts").innerHTML = `<div class="pnl-h">In this film <span>${lines.length} programs, ${new Set(paid.map((l) => l.author)).size} paid creators</span></div>
    <div class="parts">${paid.map(row).join("")}</div>
    ${free.length ? `<details><summary class="more">${free.length} free pieces</summary><div class="parts">${free.map(row).join("")}</div></details>` : ""}`;
}

/** The top bar says what money state this film is in: licensed (by which order), a budget ready to spend, or none. */
function drawBudget(f) {
  const b = store.get("oasis.budget"), el = $("#sa-budget");
  const dev = f.licensed && /^DEV-/.test(f.licence?.orderId || "");
  el.classList.toggle("none", !f.licensed && !b?.token);
  el.classList.toggle("paid", !!f.licensed);
  el.innerHTML = f.licensed ? `${icon("seal-check")} <span>${dev ? "Licensed locally, no PayPal order" : `Licensed, PayPal order <code>${esc(f.licence.orderId)}</code>`}</span>` : b?.token ? `${icon("wallet")} <span>PayPal budget ready</span>` : `${icon("wallet")} <span>No budget yet</span>`;
}

/** The licence panel has four states: the bill with a PayPal button (preview), the bill greyed while PayPal is
 *  charged (paying), the receipt landing line by line after the colour sweep (land), and the receipt at rest. */
function drawLicence(f, { paying = false, land = false } = {}) {
  const bill = f.bill, budget = store.get("oasis.budget"), by = (k) => bill.lines.filter((l) => l.price > 0 && l.kind === k).reduce((a, l) => a + l.price, 0);
  const paid = bill.lines.filter((l) => l.price > 0);
  const payees = [...new Set(paid.map((l) => l.author))]; // only creators with a paid piece are paid
  const face = (c) => { const a = paid.find((l) => l.author === c); return `<span class="face" title="${esc(c)}">${a ? `<img src="/api/assets/${encodeURIComponent(a.asset)}/render.png?w=52" alt="">` : esc(c.slice(0, 1).toUpperCase())}</span>`; };
  const lic = f.licence || {}, dev = /^DEV-/.test(lic.orderId || "");
  const rows = (lic.creators || []).map((c, i) => `<div class="po" style="--i:${i}"><span><i class="tick">${icon("check")}</i>${esc(c.author)}</span><b data-usd="${c.usd}">${land ? usd(0) : usd(c.usd)}</b></div>`);
  if (lic.platformUsd) rows.push(`<div class="po fee" style="--i:${rows.length}"><span>Oasis platform fee, ${lic.platformPct}%</span><b data-usd="${lic.platformUsd}">${land ? usd(0) : usd(lic.platformUsd)}</b></div>`);
  rows.push(`<div class="po sum" style="--i:${rows.length}"><span>PayPal order</span><b data-usd="${lic.total || 0}">${land ? usd(0) : usd(lic.total || 0)}</b></div>`);
  $("#licence").innerHTML = `<div class="pnl-h">Licence <span class="sa-state ${f.licensed ? "live" : "wait"}${land ? " pop" : ""}">${f.licensed ? "Licensed" : paying ? "Paying" : "Preview"}</span></div>
    ${f.licensed
      ? dev ? `<p class="fine">Licensed with a local development licence. No PayPal order was placed.</p>`
        : `<div class="paid-head">${icon("seal-check")}<b>Paid in one PayPal order</b><code>${esc(lic.orderId)}</code></div>
           <div class="sa-receipt${land ? " land" : ""}" id="receipt">${rows.join("")}</div>`
      : `<div class="bill">
          <div class="row"><span>3D programs</span><b>${usd(by("3d"))}</b></div>
          <div class="row"><span>2D signs and cards</span><b>${usd(by("2d"))}</b></div>
          <div class="row tot"><span>One order</span><b>${usd(bill.total)}</b></div>
        </div>
        <div class="sa-creators">${payees.map(face).join("")}<small>${payees.length} creators paid from one approval</small></div>
        ${paying
          ? `<div class="paying"><div class="po"><span><span class="spin" aria-hidden="true" style="margin-right:8px;vertical-align:-2px"></span>PayPal is confirming the order</span></div></div>`
          : `<div class="sa-pay">${budget?.token
              ? `<button class="ppbtn" id="license" type="button">License with <em>Pay<b>Pal</b></em> budget</button>`
              : `<button class="ppbtn" id="checkout" type="button">Pay with <em>Pay<b>Pal</b></em></button><p class="alt">or <a href="#/budget">give an agent a PayPal budget</a></p>`}
             <div id="pay-err"></div>
             <p class="fine">The clay street turns to colour and every creator is paid.</p></div>`}`}`;
  if (land) {
    // the amounts count up as each line lands, the total last, so the money is seen to arrive
    $("#receipt").querySelectorAll(".po b[data-usd]").forEach((b, i) => setTimeout(() => countUp(b, Number(b.dataset.usd), 650), i * 160 + 140));
  }
  const fail = (b, label, e) => {
    b.removeAttribute("aria-busy"); b.innerHTML = label;
    $("#pay-err").innerHTML = note("err", "warning", e.status === 503 ? "Checkout is not connected" : "PayPal could not take the order", e.message);
    toast(e.message, { kind: "err" });
  };
  $("#checkout")?.addEventListener("click", async () => {
    const b = $("#checkout"); b.setAttribute("aria-busy", "true"); b.innerHTML = `<span class="spin" aria-hidden="true"></span> Opening PayPal…`; $("#pay-err").innerHTML = "";
    try {
      const o = await api(`/api/films/${f.id}/checkout`, { method: "POST" });
      store.set(`oasis.film.${f.id}`, { order: o.order_id, claim: o.claim_token });
      location.href = o.approve_url; // PayPal's own approval page; it returns to this film
    } catch (e) { fail(b, `Pay with <em>Pay<b>Pal</b></em>`, e); }
  });
  $("#license")?.addEventListener("click", async () => {
    const b = $("#license"); b.setAttribute("aria-busy", "true"); b.innerHTML = `<span class="spin" aria-hidden="true"></span> Charging your PayPal budget…`; $("#pay-err").innerHTML = "";
    try {
      const next = await api(`/api/films/${f.id}/license`, { method: "POST", body: { mandate: budget.token, agent_name: "Oasis Studio" } });
      await mountFilm(next, { keep: true, reveal: true });
    } catch (e) { fail(b, `License with <em>Pay<b>Pal</b></em> budget`, e); }
  });
}


function drawExport(f) {
  const r = f.render || { status: "idle" }, pct = Math.round((r.progress || 0) * 100), busy = r.status === "rendering" || r.status === "queued";
  const eb = $("#export");
  eb.innerHTML = r.status === "done" ? `${icon("download-simple")} <span class="lbl">Download MP4</span>` : busy ? `<span class="spin" aria-hidden="true"></span> <span class="lbl">Rendering ${pct}%</span>` : `${icon("export")} <span class="lbl">Render MP4</span>`;
  $("#exportpnl").innerHTML = `<div class="pnl-h">Export <span>${f.size.join(" × ")}, ${f.fps} fps${f.music ? ", with sound" : ""}</span></div>
    <div class="export-row">
    ${r.status === "done" ? `<a class="b pri big" href="/api/films/${f.id}/film.mp4" download="${esc(f.title)}.mp4">${icon("download-simple")} Download MP4</a><p class="fine">${(r.bytes / 1e6).toFixed(1)} MB, rendered frame by frame.</p>`
      : busy ? `<div class="sa-progress" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct}%"></i></div><p class="fine">${r.status === "queued" ? "Queued for the renderer." : `Rendering frame by frame with motion blur, ${pct}%.`}</p>`
      : r.status === "failed" ? note("err", "warning", "The render failed", r.error || "The renderer gave up on this one.", `<button class="b" id="render" type="button">${icon("arrow-counter-clockwise")} Try again</button>`)
      : f.renderer ? `<button class="b pri big" id="render" type="button">${icon("film-reel")} Render MP4</button>` : ""}
    <button class="b big" id="quick" type="button">${icon("record")} Quick export (WebM)</button>
    </div>`;
  $("#render")?.addEventListener("click", async () => {
    const b = $("#render"); b.setAttribute("aria-busy", "true");
    try { await api(`/api/films/${f.id}/render`, { method: "POST" }); film.render = { status: "queued", progress: 0 }; drawExport(film); poll(f.id); }
    catch (e) { b.removeAttribute("aria-busy"); toast(e.message, { kind: "err" }); }
  });
  $("#quick")?.addEventListener("click", async () => {
    if (recording || !player) return;
    recording = true;
    const b = $("#quick"); b.setAttribute("aria-busy", "true"); b.innerHTML = `<span class="spin" aria-hidden="true"></span> Recording one playthrough…`;
    try {
      const blob = await player.record();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = `${f.title}.webm`; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
      toast("WebM saved.", { kind: "ok" });
    } catch (e) { toast(e.message, { kind: "err" }); }
    recording = false; b.removeAttribute("aria-busy"); b.innerHTML = `${icon("record")} Quick export (WebM)`;
  });
  if (busy) poll(f.id);
}

function poll(id) {
  clearTimeout(pollTimer);
  pollTimer = setTimeout(async () => {
    if (!film || film.id !== id) return;
    try {
      const f = await api(`/api/films/${id}`);
      const was = film.render?.status;
      film = { ...film, render: f.render };
      drawExport(film);
      if (f.render?.status === "done" && was !== "done") toast("Your film is rendered.", { kind: "ok", ms: 6000, label: "Download", action: () => $("#export")?.click() });
      else if (f.render?.status === "failed" && was !== "failed") toast("The render failed.", { kind: "err" });
    } catch {}
  }, 1500);
}
