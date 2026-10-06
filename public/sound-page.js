// The sound page: the program rendering live. Turn a knob and the sound is built again (in a Worker when the
// source is in hand, on the server otherwise), the waveform and spectrogram redraw, a take plays, the import line
// updates with the knobs at the call site, and a walk of 300 seeds shows that no two takes repeat. Paid sounds play
// with the preview watermark until a licence arrives (?lic=... from a kit order), then they play clean.
// The pictures are wavesurfer.js (public/wave.js): the waveform with a hover readout of time and level, a timeline,
// the Roseus spectrogram under it, the old take morphing into the new one on every rebuild, and a live spectrum and
// scope while it plays. Knobs are <oasis-knob> (public/knob.js, after webaudio-controls). The 300-take walk is a d3
// scatter (d3-scale) over a zoomed wavesurfer walk with a Minimap and a Regions highlight of the take that is playing.
import { audio, unlock, loadWav, toBuffer, play, renderInWorker, analyse, setBusLook } from "/audio.js";
import { LOOKS } from "/fx.js";
import { mountWave, mountLive, WaveSurfer, Minimap, Regions, ROSEUS_STOPS, onTheme } from "/wave.js";
import { scaleLinear, scaleLog, scaleSqrt } from "d3-scale";
import "/knob.js";
import { mountKeys } from "/keys.js";
import { playableNotes, noteKnob } from "/keys-core.js";

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const usd = (n) => `$${Number(n || 0).toFixed(2)}`;
const price = (n) => (Number(n) === 0 ? "Free" : usd(n));
const icon = (name) => `<i class="ph-bold ph-${name}" aria-hidden="true"></i>`;
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const api = async (path, { method = "GET", body } = {}) => { const r = await fetch(path, { method, headers: body ? { "Content-Type": "application/json" } : {}, body: body ? JSON.stringify(body) : undefined }); const j = await r.json().catch(() => ({})); if (!r.ok) throw Object.assign(new Error(j.error || `Request failed (${r.status})`), { status: r.status }); return j; };
const toast = (msg) => { const t = $("#toast"); if (!t) return; t.textContent = msg; t.classList.add("on"); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove("on"), 2600); };
export const KIND_LABEL = { sfx: "SFX", ambience: "Ambience", ui: "UI", impact: "Impact", foley: "Foley", "music-loop": "Music" };

export function segment(el, items, value, onChange) {
  el.classList.add("seg");
  el.innerHTML = `<span class="thumb" aria-hidden="true"></span>${items.map((it) => `<button type="button" role="radio" data-v="${esc(it.id)}" aria-checked="${it.id === value}" class="${it.id === value ? "on" : ""}">${esc(it.label)}</button>`).join("")}`;
  el.setAttribute("role", "radiogroup");
  const place = () => { const on = $(".on", el), th = $(".thumb", el); if (!on) return; th.style.width = `${on.offsetWidth}px`; th.style.transform = `translateX(${on.offsetLeft}px)`; };
  el.addEventListener("click", (e) => { const b = e.target.closest("button[data-v]"); if (!b || b.classList.contains("on")) return; $$("button", el).forEach((x) => { x.classList.toggle("on", x === b); x.setAttribute("aria-checked", x === b); }); place(); onChange(b.dataset.v); });
  requestAnimationFrame(place); new ResizeObserver(place).observe(el);
  return { set(v) { const b = $(`button[data-v="${CSS.escape(v)}"]`, el); if (b && !b.classList.contains("on")) b.click(); } };
}

/** Knob controls shared with the home page: range and choice as rotary <oasis-knob>s (choices with detents), toggle as a
 * switch, seed as a number with a dice. */
export function control(k, d) {
  const label = esc(d.label || k);
  if (k === "seed") return `<div class="a-seed"><label for="k-${k}">${label}</label><input type="number" id="k-${k}" data-k="${k}" min="${d.min}" max="${d.max}" step="1" value="${d.default}" class="num"><button type="button" class="btn small" id="a-dice" title="A new take">${icon("dice-five")} New take</button></div>`;
  if (d.type === "range") return `<oasis-knob id="k-${k}" data-k="${k}" label="${label}" min="${d.min}" max="${d.max}" step="${d.step || (d.max - d.min) / 100}" value="${d.default}" default="${d.default}"></oasis-knob>`;
  if (d.type === "choice") return `<oasis-knob id="k-${k}" data-k="${k}" label="${label}" options="${esc(d.options.join("|"))}" value="${esc(d.default)}" default="${esc(d.default)}"></oasis-knob>`;
  if (d.type === "toggle") return `<label class="a-switch"><span>${label}</span><input type="checkbox" id="k-${k}" data-k="${k}" ${d.default ? "checked" : ""}><i></i></label>`;
  return "";
}
/** Lays a set of knobs out: the dials in one row that wraps, switches and the seed under them. */
export function controls(entries) {
  const dial = entries.filter(([k, d]) => k !== "seed" && (d.type === "range" || d.type === "choice"));
  const rest = entries.filter(([k, d]) => !dial.some(([j]) => j === k));
  return `${dial.length ? `<div class="a-dials">${dial.map(([k, d]) => control(k, d)).join("")}</div>` : ""}${rest.map(([k, d]) => control(k, d)).join("")}`;
}

/** The renderer a page uses: Worker when the source is in hand, server otherwise. Resolves { buffer, analysis, ms, watermarked }.
 * `analysis: false` skips the numbers (the keyboard renders a note per key and only needs the buffer). */
export function makeRenderer(a, { licence = null, analysis = true } = {}) {
  const source = a.source || null;
  return async (knobs) => {
    const t0 = performance.now();
    if (source) {
      const { samples, sr, ms } = await renderInWorker(source, knobs, audio().sampleRate);
      return { buffer: toBuffer(samples, sr), analysis: analysis ? analyse(samples, sr, { cols: 320 }) : null, ms, watermarked: false, where: "worker" };
    }
    const p = `?p=${encodeURIComponent(JSON.stringify(knobs))}`;
    const url = licence ? `/api/licenses/${licence}/render.wav${p}` : `/api/assets/${a.id}/render.wav${p}`;
    // the keyboard (public/keys.js) asks for the samples only: same WAV route, so an unpaid preview keeps its watermark
    if (!analysis) { const buffer = await loadWav(url); return { buffer, analysis: null, ms: Math.round(performance.now() - t0), watermarked: buffer.oasisWatermarked, where: "server" }; }
    const [buffer, an] = await Promise.all([loadWav(url), api(licence ? `/api/assets/${a.id}/sound.json${p}&lic=${licence}` : `/api/assets/${a.id}/sound.json${p}`)]);
    return { buffer, analysis: an, ms: Math.round(performance.now() - t0), watermarked: buffer.oasisWatermarked, where: "server" };
  };
}

export async function pageSound(app, a, { catalog: list, card, liveCards }) {
  const knobs = a.knobs || {};
  const values = Object.fromEntries(Object.entries(knobs).map(([k, d]) => [k, d.default]));
  const diff = () => Object.fromEntries(Object.entries(values).filter(([k, val]) => val !== knobs[k].default));
  const origin = location.origin;
  const params = new URLSearchParams(location.hash.split("?")[1] || "");
  const licence = params.get("lic");
  const others = Object.entries(knobs).filter(([k]) => k !== "seed");
  const kitName = a.kit || a.worldKit;
  const notes = playableNotes(knobs); // a voice with a note knob gets a keyboard under the stage

  app.innerHTML = `<div class="wrap a-page">
    <nav class="a-crumb" aria-label="Breadcrumb"><a href="#/sounds">Sounds</a>${kitName ? `<span>/</span><a href="#/sounds?kit=${encodeURIComponent(kitName)}">${esc(kitName)}</a>` : ""}<span>/</span><span>${esc(a.title)}</span></nav>
    <header class="a-head">
      <div>
        <h1>${esc(a.title)}</h1>
        <p class="a-sub">by <a class="a-by" href="#/creator/${encodeURIComponent(a.author)}">${esc(a.author)}</a>${kitName ? ` for the ${esc(kitName)} kit` : ""}. ${esc(KIND_LABEL[a.kind] || a.kind)}, ${Object.keys(knobs).length} knobs, <span class="num">${a.duration}</span> s.</p>
        <p class="a-desc">${esc(a.description)}</p>
      </div>
      <div class="a-buy">
        <span class="a-price">${price(a.price)}<small>${a.price > 0 ? "per licence" : "no licence needed"}</small></span>
        ${licence ? `<span class="btn primary" style="pointer-events:none">${icon("seal-check")} Licensed</span><span class="note">This sound plays clean here: your kit's order paid ${esc(a.author)}.</span>`
          : a.price > 0 ? `<button class="btn primary" type="button" id="a-license">${icon("seal-check")} License it, ${price(a.price)}</button><a class="btn" href="#/kits?vibe=${encodeURIComponent(a.title + " and what goes with it")}">${icon("sparkle")} Put it in a kit</a><span class="note">One PayPal order, with the knobs you set here. ${esc(a.author)} is paid from it.</span>`
          : `<a class="btn primary" href="/api/assets/${esc(a.id)}/download.wav" id="a-wav">${icon("download-simple")} Download WAV</a><span class="note">44.1 kHz, rendered from the knobs you set here.</span>`}
      </div>
    </header>

    <section class="sp-hero">
      <div class="sp-stage-wrap">
        <div class="sp-stage busy" id="sp-stage">
          <div class="sp-ws" id="sp-ws"><span class="sp-axis">waveform</span><span class="sp-axis spec">spectrogram</span></div>
          <div class="sp-tl" id="sp-tl" aria-hidden="true"></div>
          <div class="sp-bar"><div class="sp-ctl"><button class="s-play big" id="sp-play" aria-label="Play">${icon("play")}</button><button class="btn small" id="sp-loop" aria-pressed="false">${icon("repeat")} Loop</button></div><div class="sp-live" id="sp-live" aria-hidden="true"></div></div>
          <span class="sp-wm" id="sp-wm" hidden></span>
          <div class="sp-err" id="sp-err" hidden role="alert"><b>The render failed.</b><span id="sp-err-msg"></span><button class="btn small" id="sp-retry" type="button">${icon("arrow-clockwise")} Try again</button></div>
        </div>
        <div class="sp-foot">
          <div class="sp-readout" id="sp-readout" aria-live="polite"><span class="skel"></span><span class="skel" style="width:80px"></span></div>
          <div class="sp-tools"><label class="s-sel" title="Listen through a look. The WAV download stays dry; a kit's loop export on Pads keeps it."><span>Look</span><select id="sp-look">${LOOKS.map((l) => `<option value="${l.id}">${esc(l.label)}</option>`).join("")}</select></label><button class="btn small" id="sp-ab" aria-pressed="false" title="Play the defaults, then your remix">${icon("arrows-left-right")} A/B</button></div>
        </div>
        ${notes.length ? `<section class="sp-keys" id="sp-keys" aria-label="Play ${esc(a.title)} on a keyboard"></section>` : ""}
      </div>
      <aside class="a-knobs">
        <h2>Knobs <button type="button" id="a-reset">Reset</button></h2>
        <div class="a-group"><span>The sound</span>${controls(others)}</div>
        ${knobs.seed ? `<div class="a-group"><span>Take</span>${control("seed", knobs.seed)}</div>` : ""}
        <div class="a-group"><span>The program</span><div class="a-program" id="a-program"></div></div>
        <div class="a-group"><span>Renders</span><ol class="a-log" id="a-log"><li class="empty">Change a knob. The sound is rendered again, not resampled.</li></ol></div>
      </aside>
    </section>

    ${knobs.seed ? `<section class="sp-walk" id="sp-walk-sec">
      <div>
        <h2>300 takes, no two alike</h2>
        <p class="lede">The same program with your knobs, rendered once per seed and laid along a timeline. Each dot is one take: left to right is time, up is brighter, bigger is louder. Press play and each take lights up as it sounds; click a dot to hear it. A file played 300 times would be one dot.</p>
        <div class="a-program" id="sp-walk-code"></div>
      </div>
      <div class="sp-walk-stage" id="sp-walk">
        <div class="sp-walk-head"><div id="sp-walk-n" class="seg"></div><span class="sp-legend"><span>up: brighter</span><span>bigger: louder</span></span><span class="sp-n" id="sp-walk-stat"></span></div>
        <svg class="sp-walk-plot" id="sp-walk-plot" role="img" aria-label="Each take as a dot: time across, brightness up, size by level"></svg>
        <div class="sp-walk-foot"><button class="s-play big" id="sp-walk-play" aria-label="Play the walk" disabled>${icon("play")}</button><div class="sp-walk-waves"><div id="sp-walk-wave"></div><div id="sp-walk-mini"></div></div></div>
        <div class="sp-note" id="sp-walk-note"><span class="skel" style="width:160px;height:12px"></span></div>
      </div>
    </section>` : ""}

    <section class="sp-fork" id="sp-fork">
      <div>
        <h2>Fork it with AI</h2>
        <p class="lede">Describe a new direction and Claude rewrites this program into a new sound that keeps what makes it good. The fork is yours to sell; ${esc(a.author)} keeps a share of every sale, down the lineage.</p>
        ${a.parent ? `<div class="lineage"><span class="chip">forked from <a href="#/a/${esc(a.parent.id)}">${esc(a.parent.title)}</a></span></div>` : ""}
        ${a.children?.length ? `<div class="lineage">${a.children.map((c) => `<a class="chip" href="#/a/${esc(c.id)}">${esc(c.title)} <b>${price(c.price)}</b></a>`).join("")}</div>` : ""}
      </div>
      <form id="fork-form">
        <textarea id="fork-text" placeholder="e.g. make it a heavy boot on a metal catwalk, with a longer ring"></textarea>
        <div class="row"><input id="fork-author" placeholder="Your creator name" maxlength="40"><input id="fork-email" placeholder="PayPal email for payouts (optional)" maxlength="80"><input id="fork-price" type="number" min="0" max="50" step="0.5" placeholder="Price $" style="max-width:110px"></div>
        <div class="row"><button class="btn primary" type="submit" id="fork-go">${icon("sparkle")} Fork with AI</button><span class="note" id="fork-note">About a minute. The sandbox and the harness check the result before it is listed.</span></div>
      </form>
    </section>

    <section class="a-more" id="a-more" hidden><h2>More from ${esc(kitName || "the registry")}</h2><div class="s-grid" id="a-more-grid"></div></section>
  </div>`;

  // ----- rendering -----
  const render = makeRenderer(a, { licence });
  const stage = $("#sp-stage");
  let current = null, base = null, n = 0, loop = false, lastValues = null;
  const phone = stage.clientWidth < 600;
  const playBtn = $("#sp-play");
  const setPlaying = (on) => { playBtn.classList.toggle("on", on); playBtn.innerHTML = icon(on ? "stop" : "play"); playBtn.setAttribute("aria-label", on ? "Stop" : "Play"); };
  const wave = mountWave($("#sp-ws"), { height: phone ? 128 : 184, spectrogram: phone ? 120 : 168, timeline: $("#sp-tl"), barWidth: phone ? 2 : 3, barGap: 1, barRadius: 2,
    onState: (on) => { setPlaying(on); if (!on && loop && current && wave.media.currentTime === 0) setTimeout(() => loop && wave.play(), 30); } });
  const live = mountLive($("#sp-live"));
  // License it: a one-part kit with the knobs as they are now, then that kit's PayPal checkout
  $("#a-license")?.addEventListener("click", async (e) => {
    const b = e.currentTarget; b.disabled = true; b.innerHTML = `${icon("circle-notch")} Preparing the order`;
    try { const k = await api("/api/kits/single", { method: "POST", body: { assetId: a.id, knobs: diff() } }); location.hash = `#/kit/${k.id}`; }
    catch (err) { toast(err.message); b.disabled = false; b.innerHTML = `${icon("seal-check")} License it, ${price(a.price)}`; }
  });
  // a look is for listening here; it comes off when the page does
  $("#sp-look").addEventListener("change", (e) => { setBusLook(e.target.value); e.target.closest(".s-sel").classList.toggle("set", e.target.value !== "dry"); });
  const offRoute = () => { if (!stage.isConnected) { wave.destroy(); live.destroy(); setBusLook("dry"); removeEventListener("hashchange", offRoute); } };
  addEventListener("hashchange", () => setTimeout(offRoute, 0));
  const log = [];
  const addLog = (entry) => { log.unshift(entry); log.length = Math.min(log.length, 6); $("#a-log").innerHTML = log.map((l) => `<li><b>${esc(l.what)}</b><span>${l.ms} ms · ${l.where}</span></li>`).join(""); };
  let hot = null;
  const program = () => {
    const d = diff();
    const body = Object.entries(d).map(([k, val]) => `\n  <span class="kn${k === hot ? " hot" : ""}" data-k="${k}">${k}: <span class="s">${esc(JSON.stringify(val))}</span></span>,`).join("");
    const url = `${origin}/cdn/${a.id}.mjs${a.price > 0 ? (licence ? `?lic=${licence.slice(0, 6)}…` : "?lic=…") : ""}`;
    $("#a-program").innerHTML = `<button class="a-copy" id="a-copy" type="button">${icon("copy")} Copy</button><span class="k">import</span> { play } <span class="k">from</span>\n  <span class="s">"${esc(url)}"</span>;\nplay(audioContext, ${body ? `{${body}\n}` : `<span class="c">/* defaults */</span>`});`;
    $("#a-copy").addEventListener("click", async () => { try { await navigator.clipboard.writeText(`import { play } from "${url}";\nplay(audioContext, ${JSON.stringify(d)});`); $("#a-copy").classList.add("done"); $("#a-copy").innerHTML = `${icon("check")} Copied`; setTimeout(program, 2000); } catch { toast("Select the code and copy it"); } });
    if (hot) requestAnimationFrame(() => requestAnimationFrame(() => $$(".kn.hot", app).forEach((el) => el.classList.remove("hot"))));
    if ($("#a-wav")) $("#a-wav").href = `/api/assets/${a.id}/download.wav?p=${encodeURIComponent(JSON.stringify(d))}`;
    walkCode();
  };
  const playCurrent = () => { if (current) wave.play(); };
  // the keyboard: every note at the current knobs, rendered ahead through the same renderer (public/keys.js)
  const keyKnob = notes.length ? noteKnob(knobs) : null;
  const keyStrip = notes.length ? mountKeys($("#sp-keys"), { notes, knobName: keyKnob, render: makeRenderer(a, { licence, analysis: false }), values: () => values, title: "Play it", label: `${a.title} keyboard` }) : null;
  if (keyStrip) addEventListener("hashchange", () => setTimeout(() => { if (!stage.isConnected) keyStrip.destroy(); }, 0), { once: true });
  const rebuild = async (what) => {
    const run = ++n; stage.classList.add("busy"); $("#sp-err").hidden = true;
    let res;
    try { res = await render(values); } catch (e) {
      if (run !== n || !stage.isConnected) return;
      if (!stage.isConnected) return;
      stage.classList.remove("busy"); $("#sp-err").hidden = false; $("#sp-err-msg").textContent = e.message;
      if (!current) $("#sp-readout").innerHTML = `<span>nothing rendered yet</span>`;
      return;
    }
    if (run !== n || !stage.isConnected) return;
    current = res; base ||= res; lastValues = { ...values };
    stage.classList.remove("busy");
    await wave.show(res.buffer, { dim: res.watermarked });
    const an = res.analysis;
    $("#sp-readout").innerHTML = `<span><b>${an.seconds.toFixed(2)}</b> s</span><span>peak <b>${an.peak}</b></span><span>rms <b>${an.rms}</b></span><span>centroid <b>${an.centroid}</b> Hz</span><span>rendered in <b>${res.ms}</b> ms${res.where === "worker" ? " in your browser" : ""}</span>`;
    const wm = $("#sp-wm"); wm.hidden = false;
    wm.className = `sp-wm${res.watermarked ? "" : " clean"}`; wm.innerHTML = res.watermarked ? `${icon("waveform")} preview: a soft tick until licensed` : `${icon("seal-check")} ${a.price > 0 ? "licensed, clean" : "free, clean"}`;
    if (what) addLog({ what, ms: res.ms, where: res.where === "worker" ? "worker" : "server" });
    program();
    if (what && (audio().state === "running")) playCurrent();
  };
  const fmt = (d, x) => (d.type === "toggle" ? (x ? "on" : "off") : String(x));
  const setKnob = (k, val, label) => {
    const old = values[k]; if (old === val) return;
    values[k] = val; hot = k;
    const d = knobs[k];
    clearTimeout(rebuild.t);
    rebuild.t = setTimeout(() => rebuild(label || `${d.label || k} ${fmt(d, old)} → ${fmt(d, val)}`), 60);
    if (k !== keyKnob) keyStrip?.changed(); // the note knob only picks the stage's note; the keys already hold every note
  };
  const paint = () => {
    for (const [k, d] of Object.entries(knobs)) {
      const el = $(`#k-${k}`), o = $(`#o-${k}`);
      if (d.type === "toggle") el.checked = values[k];
      else if (el && String(el.value) !== String(values[k])) el.value = values[k];
      if (o) o.textContent = values[k];
    }
  };
  $(".a-knobs").addEventListener("input", (e) => {
    const k = e.target.dataset.k; if (!k) return;
    const d = knobs[k];
    const val = d.type === "toggle" ? e.target.checked : d.type === "range" ? Number(e.target.value) : e.target.value;
    const o = $(`#o-${k}`); if (o) o.textContent = val;
    setKnob(k, val);
  });
  $("#a-dice")?.addEventListener("click", () => { const d = knobs.seed; const v = d.min + Math.floor(Math.random() * (d.max - d.min + 1)); $("#k-seed").value = v; setKnob("seed", v, `new take, seed ${v}`); });
  $("#sp-retry").addEventListener("click", () => rebuild(current ? "retried" : null));
  $("#a-reset").addEventListener("click", () => { if (!Object.keys(diff()).length) return; for (const [k, d] of Object.entries(knobs)) values[k] = d.default; hot = null; paint(); clearTimeout(rebuild.t); rebuild.t = setTimeout(() => rebuild("reset to defaults"), 40); keyStrip?.changed(); });
  $("#sp-play").addEventListener("click", async () => { await unlock(); if (wave.playing) { loop = false; $("#sp-loop").classList.remove("on"); $("#sp-loop").setAttribute("aria-pressed", "false"); wave.stop(); return; } playCurrent(); });
  $("#sp-loop").addEventListener("click", async () => { loop = !loop; $("#sp-loop").classList.toggle("on", loop); $("#sp-loop").setAttribute("aria-pressed", loop); if (loop && !wave.playing) { await unlock(); playCurrent(); } });
  $("#sp-ab").addEventListener("click", async () => {
    if (!base || !current || base === current) { toast("Change a knob first, then A/B against the defaults"); return; }
    await unlock(); wave.stop();
    const b = $("#sp-ab"); b.classList.add("on");
    const pa = play(base.buffer); await pa.done; await new Promise((r) => setTimeout(r, 120));
    await wave.play(); await new Promise((r) => wave.ws.once("finish", r)); b.classList.remove("on");
  });

  // ----- the walk -----
  const walkCode = () => { if (!$("#sp-walk-code")) return; const d = diff(); $("#sp-walk-code").innerHTML = `<span class="k">for</span> (<span class="k">let</span> i = 0; i &lt; 300; i++)\n  play(ctx, { ${Object.entries(d).filter(([k]) => k !== "seed").map(([k, v]) => `${k}: <span class="s">${esc(JSON.stringify(v))}</span>, `).join("")}seed: <span class="s">i</span> }, { when: i * 0.09 });`; };
  if (knobs.seed) {
    // The scatter is d3-scale (src/linear.js, src/log.js, src/sqrt.js: scaleLinear/scaleLog/scaleSqrt and their
    // .ticks()), drawn as SVG: x is when the take starts, y its spectral centroid on a log axis, the radius its peak, the
    // fill its brightness through the Roseus ramp. Under it the walk itself is a zoomed wavesurfer that scrolls while it
    // plays, a Minimap (src/plugins/minimap.ts) with the whole walk, and one Regions region (src/plugins/regions.ts) on
    // the take that is sounding; the dot for that take lights up in the accent and keeps a warm ring once heard.
    const plot = $("#sp-walk-plot"), stageW = $("#sp-walk");
    let count = 300, walkBuf = null, takes = null, wn = 0, hot = -1, heard = new Set();
    segment($("#sp-walk-n"), [{ id: "24", label: "24" }, { id: "100", label: "100" }, { id: "300", label: "300" }], "300", (v) => { count = Number(v); loadWalk(); });
    const regions = Regions.create();
    const walkPlay = $("#sp-walk-play");
    const walk = mountWave($("#sp-walk-wave"), { height: 64, barWidth: 2, barGap: 1, barRadius: 1, hover: false,
      wsOptions: { minPxPerSec: 80, autoScroll: true, autoCenter: true, fillParent: true },
      extraPlugins: [regions, Minimap.create({ container: $("#sp-walk-mini"), height: 26, waveColor: "rgb(128 134 146 / .55)", progressColor: "rgb(224 138 30 / .9)", overlayColor: "rgb(224 138 30 / .16)", cursorWidth: 0, interact: true, normalize: false })],
      onState: (on) => { walkPlay.classList.toggle("on", on); walkPlay.innerHTML = icon(on ? "stop" : "play"); walkPlay.setAttribute("aria-label", on ? "Stop the walk" : "Play the walk"); } });
    let region = null, geo = null;
    const stops = ROSEUS_STOPS.slice(1, 6).reverse();
    const ramp = scaleLinear().domain(stops.map((_, i) => i / (stops.length - 1))).range(stops).clamp(true);
    const drawPlot = () => {
      const w = plot.clientWidth, h = plot.clientHeight;
      if (!takes || !w) { plot.innerHTML = ""; return; }
      const m = { l: 44, r: 16, t: 14, b: 26 };
      const dur = walkBuf?.duration || takes.at(-1)[0] + 1;
      const cs = takes.map((t) => t[2]).filter((c) => c > 0), ps = takes.map((t) => t[1]);
      const x = scaleLinear().domain([0, dur]).range([m.l, w - m.r]);
      const y = scaleLog().domain([Math.max(20, Math.min(...cs) * 0.92), Math.max(...cs) * 1.08]).range([h - m.b, m.t]);
      const r = scaleSqrt().domain([0, Math.max(...ps) || 1]).range([1.5, count > 100 ? 6 : 9]);
      const c = scaleLinear().domain(y.domain().map(Math.log)).range([0.08, 1]);
      const lo = y.domain()[0];
      geo = { x, y };
      const fmtHz = (f) => (f >= 1000 ? `${+(f / 1000).toFixed(1)}k` : `${Math.round(f)}`);
      let yt = y.ticks(4); if (yt.length > 5) yt = yt.filter((_, i) => i % Math.ceil(yt.length / 5) === 0);
      plot.innerHTML = `<g class="grid">${yt.map((f) => `<line x1="${m.l}" x2="${w - m.r}" y1="${y(f).toFixed(1)}" y2="${y(f).toFixed(1)}"/><text x="${m.l - 8}" y="${(y(f) + 3.5).toFixed(1)}" text-anchor="end">${fmtHz(f)}</text>`).join("")}
        ${x.ticks(Math.max(3, Math.floor(w / 110))).map((s) => `<line class="v" x1="${x(s).toFixed(1)}" x2="${x(s).toFixed(1)}" y1="${m.t}" y2="${h - m.b}"/><text x="${x(s).toFixed(1)}" y="${h - 8}" text-anchor="middle">${s}s</text>`).join("")}
        <text class="unit" x="${m.l - 8}" y="${m.t - 2}" text-anchor="end">Hz</text></g>
        <line class="ph" id="sp-walk-ph" y1="${m.t}" y2="${h - m.b}" x1="-9" x2="-9"/>
        <g class="dots">${takes.map(([t, pk, cen], i) => `<circle data-i="${i}" cx="${x(t).toFixed(1)}" cy="${y(Math.max(cen, lo)).toFixed(1)}" r="${r(pk).toFixed(2)}" fill="${ramp(c(Math.log(Math.max(cen, lo))))}"${heard.has(i) ? ' class="heard"' : ""}><title>take ${i + 1}: ${t.toFixed(2)} s, peak ${pk}, ${Math.round(cen)} Hz</title></circle>`).join("")}</g>`;
      if (hot >= 0) light(hot, true);
    };
    const light = (i, force = false) => {
      if (i === hot && !force) return;
      plot.querySelector("circle.hot")?.classList.replace("hot", "heard");
      hot = i; if (i < 0 || !takes) return;
      heard.add(i);
      const el = plot.querySelector(`circle[data-i="${i}"]`); if (!el) return;
      el.classList.remove("heard"); el.classList.add("hot"); el.parentNode.appendChild(el);
      const at = takes[i][0], gap = takes[1] ? takes[1][0] - takes[0][0] : 0.3, end = Math.min(walkBuf.duration, at + gap);
      if (region) region.setOptions({ start: at, end }); else region = regions.addRegion({ start: at, end, color: "rgb(224 138 30 / .22)", drag: false, resize: false });
    };
    walk.ws.on("timeupdate", (t) => {
      if (!takes || !geo) return;
      const ph = plot.querySelector("#sp-walk-ph"); if (ph) { const px = geo.x(t).toFixed(1); ph.setAttribute("x1", px); ph.setAttribute("x2", px); }
      let i = -1; for (let j = 0; j < takes.length && takes[j][0] <= t + 1e-3; j++) i = j;
      light(i);
    });
    plot.addEventListener("click", async (e) => {
      const el = e.target.closest("circle[data-i]"); if (!el || !walkBuf) return;
      await unlock(); walk.ws.setTime(takes[Number(el.dataset.i)][0]); if (!walk.playing) walk.ws.play();
    });
    const note = (html) => { const el = $("#sp-walk-note"); el.hidden = !html; el.innerHTML = html || ""; };
    async function loadWalk() {
      $("#sp-walk-stat").textContent = ""; walkPlay.disabled = true;
      note(takes ? "" : `<span class="skel" style="width:160px;height:12px"></span><span>rendering ${count} takes on the server</span>`);
      if (takes) $("#sp-walk-stat").textContent = `rendering ${count} takes…`;
      const run = ++wn; const t0 = performance.now();
      const gap = count > 100 ? 0.09 : count > 24 ? 0.2 : 0.3;
      try {
        const r = await fetch(`/api/sounds/${a.id}/walk`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ count, gap, knobs: diff(), lic: licence || undefined }) });
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || `the walk failed (${r.status})`);
        const tk = JSON.parse(r.headers.get("X-Oasis-Takes") || "[]");
        const buf = await audio().decodeAudioData(await r.arrayBuffer());
        if (run !== wn) return;
        walkBuf = buf; takes = tk; heard = new Set(); hot = -1; note("");
        regions.clearRegions(); region = null;
        await walk.show(buf, { morph: false, dim: r.headers.get("X-Oasis-Watermarked") === "1" });
        $("#sp-walk-stat").textContent = `${tk.length} takes · ${buf.duration.toFixed(1)} s · ${Math.round(performance.now() - t0)} ms`;
        walkPlay.disabled = false;
        drawPlot();
      } catch (e) {
        if (run !== wn) return;
        takes = null; walkBuf = null; drawPlot();
        note(`<b>The walk could not be rendered.</b><span>${esc(e.message)}</span><button class="btn small" type="button" id="sp-walk-retry">${icon("arrow-clockwise")} Try again</button>`);
        $("#sp-walk-retry").addEventListener("click", loadWalk);
      }
    }
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); loadWalk(); } }, { rootMargin: "200px" });
    io.observe($("#sp-walk-sec"));
    new ResizeObserver(() => drawPlot()).observe(stageW);
    onTheme(drawPlot);
    walkPlay.addEventListener("click", async () => { await unlock(); if (walk.playing) { walk.ws.pause(); return; } if (walkBuf) walk.ws.play(); });
    // a knob change rebuilds the walk too, lazily: only while the walk is on screen (a 300-take render queued behind
    // every knob turn would hold up the stage's own rebuild), otherwise once it scrolls back into view
    let walkSeen = false, walkStale = false;
    new IntersectionObserver((es) => { walkSeen = es[0].isIntersecting; if (walkSeen && walkStale && takes) { walkStale = false; loadWalk(); } }).observe(stageW);
    app.addEventListener("input", () => { if (!takes) return; if (!walkSeen) { walkStale = true; return; } clearTimeout(loadWalk.t); loadWalk.t = setTimeout(loadWalk, 900); }, true);
    addEventListener("hashchange", () => setTimeout(() => { if (!stageW.isConnected) walk.destroy(); }, 0), { once: true });
  }

  // ----- fork with AI -----
  $("#fork-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const instruction = $("#fork-text").value.trim(); if (instruction.length < 3) { toast("Say how to change it"); return; }
    const b = $("#fork-go"); b.disabled = true; b.innerHTML = `${icon("circle-notch")} Writing a new program…`; $("#fork-note").textContent = "Claude is rewriting the program; the sandbox renders it; the harness checks the knobs.";
    try {
      const f = await api(`/api/assets/${a.id}/fork`, { method: "POST", body: { instruction, author: $("#fork-author").value || "anonymous", payoutEmail: $("#fork-email").value || null, price: $("#fork-price").value || undefined } });
      toast(`Forked: ${f.title}`); location.hash = `#/a/${f.id}`;
    } catch (err) { toast(err.message); b.disabled = false; b.innerHTML = `${icon("sparkle")} Fork with AI`; $("#fork-note").textContent = err.message; }
  });

  // ----- more from the kit -----
  list().then((all) => {
    const rest = all.filter((x) => x.id !== a.id).sort((x, y) => ((y.kit === kitName) - (x.kit === kitName)) || ((y.author === a.author) - (x.author === a.author)) || x.title.localeCompare(y.title)).slice(0, 5);
    if (!rest.length) return;
    if (!$("#a-more")) return; // the visitor has already left the page
    $("#a-more").hidden = false; $("#a-more-grid").innerHTML = rest.map(card).join(""); liveCards($("#a-more-grid"));
  });

  await rebuild();
  paint();
}
