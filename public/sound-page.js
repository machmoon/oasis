// The sound page: the program rendering live. Turn a knob and the sound is built again (in a Worker when the
// source is in hand, on the server otherwise), the waveform and spectrogram redraw, a take plays, the import line
// updates with the knobs at the call site, and a walk of 300 seeds shows that no two takes repeat. Paid sounds play
// with the preview watermark until a licence arrives (?lic=... from a kit order), then they play clean.
import { audio, unlock, loadWav, toBuffer, play, renderInWorker, analyse, drawWave, drawSpec, playhead } from "/audio.js";

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

/** Knob controls shared with the kit page: choice as a segmented control, range as a slider, toggle as a switch, seed with a dice. */
export function control(k, d) {
  const label = esc(d.label || k);
  if (k === "seed") return `<div class="a-seed"><label for="k-${k}">${label}</label><input type="number" id="k-${k}" data-k="${k}" min="${d.min}" max="${d.max}" step="1" value="${d.default}" class="num"><button type="button" class="btn small" id="a-dice" title="A new take">${icon("dice-five")} New take</button></div>`;
  if (d.type === "range") return `<div class="a-range"><label for="k-${k}">${label}</label><output id="o-${k}">${d.default}</output><input type="range" id="k-${k}" data-k="${k}" min="${d.min}" max="${d.max}" step="${d.step || 1}" value="${d.default}" style="--p:${((d.default - d.min) / (d.max - d.min)) * 100}%"></div>`;
  if (d.type === "toggle") return `<label class="a-switch"><span>${label}</span><input type="checkbox" id="k-${k}" data-k="${k}" ${d.default ? "checked" : ""}><i></i></label>`;
  if (d.type === "choice") return `<div class="a-choice"><label>${label}</label><div data-choice="${k}"></div></div>`;
  return "";
}

/** The renderer a page uses: Worker when the source is in hand, server otherwise. Resolves { buffer, analysis, ms, watermarked }. */
export function makeRenderer(a, { licence = null } = {}) {
  const source = a.source || null;
  return async (knobs) => {
    const t0 = performance.now();
    if (source) {
      const { samples, sr, ms } = await renderInWorker(source, knobs, audio().sampleRate);
      return { buffer: toBuffer(samples, sr), analysis: analyse(samples, sr, { cols: 320 }), ms, watermarked: false, where: "worker" };
    }
    const p = `?p=${encodeURIComponent(JSON.stringify(knobs))}`;
    const url = licence ? `/api/licenses/${licence}/render.wav${p}` : `/api/assets/${a.id}/render.wav${p}`;
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
          : a.price > 0 ? `<a class="btn primary" href="#/kits?vibe=${encodeURIComponent(a.title + " and what goes with it")}">${icon("sparkle")} Put it in a kit</a><span class="note">A kit is one PayPal order; or an agent licenses it inside a budget you approved once. ${esc(a.author)} is paid from that order.</span>`
          : `<a class="btn primary" href="/api/assets/${esc(a.id)}/download.wav" id="a-wav">${icon("download-simple")} Download WAV</a><span class="note">44.1 kHz, rendered from the knobs you set here.</span>`}
      </div>
    </header>

    <section class="sp-hero">
      <div class="sp-stage-wrap">
        <div class="sp-stage busy" id="sp-stage">
          <div class="sp-wave"><span class="sp-axis">waveform</span><canvas id="sp-wave"></canvas></div>
          <div class="sp-spec"><span class="sp-axis">spectrogram</span><canvas id="sp-spec"></canvas><div class="sp-ticks" id="sp-ticks" aria-hidden="true"></div></div>
          <div class="sp-ctl"><button class="s-play big" id="sp-play" aria-label="Play">${icon("play")}</button><button class="btn small" id="sp-loop" aria-pressed="false">${icon("repeat")} Loop</button></div>
          <span class="sp-wm" id="sp-wm" hidden></span>
          <div class="sp-err" id="sp-err" hidden role="alert"><b>The render failed.</b><span id="sp-err-msg"></span><button class="btn small" id="sp-retry" type="button">${icon("arrow-clockwise")} Try again</button></div>
        </div>
        <div class="sp-foot">
          <div class="sp-readout" id="sp-readout" aria-live="polite"><span class="skel"></span><span class="skel" style="width:80px"></span></div>
          <div class="sp-tools"><button class="btn small" id="sp-ab" aria-pressed="false" title="Play the defaults, then your remix">${icon("arrows-left-right")} A/B</button></div>
        </div>
      </div>
      <aside class="a-knobs">
        <h2>Knobs <button type="button" id="a-reset">Reset</button></h2>
        <div class="a-group"><span>The sound</span>${others.map(([k, d]) => control(k, d)).join("")}</div>
        ${knobs.seed ? `<div class="a-group"><span>Take</span>${control("seed", knobs.seed)}</div>` : ""}
        <div class="a-group"><span>The program</span><div class="a-program" id="a-program"></div></div>
        <div class="a-group"><span>Renders</span><ol class="a-log" id="a-log"><li class="empty">Change a knob. The sound is rendered again, not resampled.</li></ol></div>
      </aside>
    </section>

    ${knobs.seed ? `<section class="sp-walk" id="sp-walk-sec">
      <div>
        <h2>300 takes, no two alike.</h2>
        <p class="lede">The same program with your knobs, rendered once per seed and laid along a timeline. Each dot is one take: left to right is time, up is brighter, bigger is louder. A file played 300 times would be one dot.</p>
        <div class="a-program" id="sp-walk-code"></div>
      </div>
      <div class="sp-walk-stage" id="sp-walk"><div id="sp-walk-n" class="seg"></div><span class="sp-n" id="sp-walk-stat"></span><canvas id="sp-walk-canvas"></canvas><div class="sp-note" id="sp-walk-note"><span class="skel" style="width:160px;height:12px"></span></div><span class="sp-legend"><span>up: brighter</span><span>bigger: louder</span></span><div class="sp-ctl"><button class="s-play big" id="sp-walk-play" aria-label="Play the walk" disabled>${icon("play")}</button></div></div>
    </section>` : ""}

    <section class="sp-fork" id="sp-fork">
      <div>
        <h2>Fork it with AI.</h2>
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

    <section class="a-more" id="a-more" hidden><h2>More from ${esc(kitName || "the registry")}.</h2><div class="s-grid" id="a-more-grid"></div></section>
  </div>`;

  // ----- rendering -----
  const render = makeRenderer(a, { licence });
  const waveC = $("#sp-wave"), specC = $("#sp-spec"), stage = $("#sp-stage");
  let current = null, base = null, n = 0, loop = false, playing = null, lastValues = null;
  const draw = (at = null) => { if (!current) return; drawWave(waveC, current.analysis.wave, { at }); drawSpec(specC, current.analysis.spec, { at }); };
  new ResizeObserver(() => draw()).observe(stage);
  // frequency ticks: the bins follow analyse()'s curve (bin b at ((b+.5)/bins)^1.8 of sr/2), so a tick at f Hz sits at
  // (f / (sr/2))^(1/1.8) of the height from the bottom
  const ticks = (sr, bins) => {
    const ny = sr / 2;
    $("#sp-ticks").innerHTML = [500, 2000, 5000, ny].filter((f) => f <= ny).map((f) => { const y = 1 - Math.pow(f / ny, 1 / 1.8) * (1 - 0.5 / bins); return `<span style="top:${Math.min(96, Math.max(6, y * 100)).toFixed(1)}%">${f >= 1000 ? `${Math.round(f / 100) / 10}k` : f}</span>`; }).join("");
  };
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
  const playCurrent = () => {
    if (!current) return;
    playing?.stop();
    const p = play(current.buffer);
    playing = p; $("#sp-play").classList.add("on"); $("#sp-play").innerHTML = icon("stop");
    playhead(current.buffer, p.startedAt, draw);
    p.done.then(() => { if (playing !== p) return; playing = null; $("#sp-play").classList.remove("on"); $("#sp-play").innerHTML = icon("play"); if (loop) playCurrent(); });
  };
  const rebuild = async (what) => {
    const run = ++n; stage.classList.add("busy"); $("#sp-err").hidden = true;
    let res;
    try { res = await render(values); } catch (e) {
      if (run !== n || !stage.isConnected) return;
      stage.classList.remove("busy"); $("#sp-err").hidden = false; $("#sp-err-msg").textContent = e.message;
      if (!current) $("#sp-readout").innerHTML = `<span>nothing rendered yet</span>`;
      return;
    }
    if (run !== n || !stage.isConnected) return;
    current = res; base ||= res; lastValues = { ...values };
    stage.classList.remove("busy"); draw();
    const an = res.analysis;
    ticks(an.sr || res.buffer.sampleRate, an.spec?.[0]?.length || 64);
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
  };
  const choices = {};
  for (const [k, d] of others) if (d.type === "choice") choices[k] = segment($(`[data-choice="${k}"]`), d.options.map((o) => ({ id: o, label: o })), d.default, (val) => { setKnob(k, val); paint(); });
  const paint = () => {
    for (const [k, d] of Object.entries(knobs)) {
      const el = $(`#k-${k}`), o = $(`#o-${k}`);
      if (d.type === "toggle") el.checked = values[k];
      else if (d.type === "choice") choices[k]?.set(values[k]);
      else if (el) { el.value = values[k]; if (d.type === "range" && k !== "seed") el.style.setProperty("--p", `${((values[k] - d.min) / (d.max - d.min)) * 100}%`); }
      if (o) o.textContent = values[k];
    }
  };
  $(".a-knobs").addEventListener("input", (e) => {
    const k = e.target.dataset.k; if (!k) return;
    const d = knobs[k];
    const val = d.type === "toggle" ? e.target.checked : d.type === "range" ? Number(e.target.value) : e.target.value;
    if (d.type === "range" && k !== "seed") e.target.style.setProperty("--p", `${((val - d.min) / (d.max - d.min)) * 100}%`);
    const o = $(`#o-${k}`); if (o) o.textContent = val;
    setKnob(k, val);
  });
  $("#a-dice")?.addEventListener("click", () => { const d = knobs.seed; const v = d.min + Math.floor(Math.random() * (d.max - d.min + 1)); $("#k-seed").value = v; setKnob("seed", v, `new take, seed ${v}`); });
  $("#sp-retry").addEventListener("click", () => rebuild(current ? "retried" : null));
  $("#a-reset").addEventListener("click", () => { if (!Object.keys(diff()).length) return; for (const [k, d] of Object.entries(knobs)) values[k] = d.default; hot = null; paint(); clearTimeout(rebuild.t); rebuild.t = setTimeout(() => rebuild("reset to defaults"), 40); });
  $("#sp-play").addEventListener("click", async () => { await unlock(); if (playing) { playing.stop(); playing = null; loop = false; $("#sp-loop").classList.remove("on"); $("#sp-play").classList.remove("on"); $("#sp-play").innerHTML = icon("play"); return; } playCurrent(); });
  $("#sp-loop").addEventListener("click", async () => { loop = !loop; $("#sp-loop").classList.toggle("on", loop); $("#sp-loop").setAttribute("aria-pressed", loop); if (loop && !playing) { await unlock(); playCurrent(); } });
  $("#sp-ab").addEventListener("click", async () => {
    if (!base || !current || base === current) { toast("Change a knob first, then A/B against the defaults"); return; }
    await unlock(); playing?.stop();
    const b = $("#sp-ab"); b.classList.add("on");
    const pa = play(base.buffer); await pa.done; await new Promise((r) => setTimeout(r, 120));
    const pb = play(current.buffer); playhead(current.buffer, pb.startedAt, draw); await pb.done; b.classList.remove("on");
  });

  // ----- the walk -----
  const walkCode = () => { if (!$("#sp-walk-code")) return; const d = diff(); $("#sp-walk-code").innerHTML = `<span class="k">for</span> (<span class="k">let</span> i = 0; i &lt; 300; i++)\n  play(ctx, { ${Object.entries(d).filter(([k]) => k !== "seed").map(([k, v]) => `${k}: <span class="s">${esc(JSON.stringify(v))}</span>, `).join("")}seed: <span class="s">i</span> }, { when: i * 0.09 });`; };
  if (knobs.seed) {
    const stageW = $("#sp-walk"), canvas = $("#sp-walk-canvas"); let count = 300, walkBuf = null, takes = null, wp = null, wn = 0;
    segment($("#sp-walk-n"), [{ id: "24", label: "24" }, { id: "100", label: "100" }, { id: "300", label: "300" }], "300", (v) => { count = Number(v); loadWalk(); });
    const cssVar = (name, fb) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fb;
    // the scatter: a baseline with second marks, each take a translucent ink dot (the played one in the accent) with
    // a hairline so overlapping dots still read as separate takes in either theme
    const drawWalk = (at = null) => {
      const dpr = devicePixelRatio || 1, w = canvas.clientWidth, h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr; const g = canvas.getContext("2d"); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
      if (!takes) return;
      const ink = cssVar("--ink", "#15171C"), muted = cssVar("--muted", "#6B7280"), line = cssVar("--line", "#E2E5EB"), accent = cssVar("--accent", "#E08A1E"), surface = cssVar("--surface", "#fff");
      const left = 24, right = w - 24, top = 58, bottom = h - 46;
      const cs = takes.map((t) => t[2]), lo = Math.min(...cs) * 0.9, hi = Math.max(...cs) * 1.1 || 1, dur = walkBuf?.duration || takes.at(-1)[0] + 1;
      const xOf = (t) => left + (t / dur) * (right - left);
      // baseline and second marks
      g.fillStyle = line; g.fillRect(left, bottom, right - left, 1);
      g.font = `11px ${cssVar("--font-mono", "monospace")}`; g.fillStyle = muted; g.textAlign = "center";
      const step = dur > 20 ? 5 : dur > 8 ? 2 : 1;
      for (let s = 0; s <= dur; s += step) { const x = xOf(s); g.fillRect(x, bottom - 3, 1, 7); g.fillText(`${s}s`, x, bottom + 18); }
      // a soft band for the played moment
      if (at !== null) { g.fillStyle = accent; g.globalAlpha = 0.12; g.fillRect(xOf(Math.max(0, at - 0.1)), top, xOf(at + 0.1) - xOf(Math.max(0, at - 0.1)), bottom - top); g.globalAlpha = 1; }
      for (const [t, peak, cen] of takes) {
        const x = xOf(t), y = bottom - 8 - (Math.log(cen + 1) - Math.log(lo + 1)) / (Math.log(hi + 1) - Math.log(lo + 1)) * (bottom - top - 16); const r = 2 + peak * 6;
        const hot = at !== null && Math.abs(t - at) < 0.1;
        g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2);
        g.fillStyle = hot ? accent : ink; g.globalAlpha = hot ? 1 : 0.22; g.fill(); g.globalAlpha = hot ? 1 : 0.7;
        g.lineWidth = 1; g.strokeStyle = hot ? accent : surface; g.stroke(); g.globalAlpha = 1;
      }
      if (at !== null) { g.fillStyle = accent; g.fillRect(Math.round(xOf(at)) - 1, top - 8, 2, bottom - top + 8); }
    };
    const note = (html) => { const el = $("#sp-walk-note"); el.hidden = !html; el.innerHTML = html || ""; };
    async function loadWalk() {
      $("#sp-walk-stat").textContent = ""; $("#sp-walk-play").disabled = true;
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
        walkBuf = buf; takes = tk; note("");
        $("#sp-walk-stat").textContent = `${tk.length} takes · ${buf.duration.toFixed(1)} s · ${Math.round(performance.now() - t0)} ms`;
        $("#sp-walk-play").disabled = false;
        drawWalk();
      } catch (e) {
        if (run !== wn) return;
        takes = null; walkBuf = null; drawWalk();
        note(`<b>The walk could not be rendered.</b><span>${esc(e.message)}</span><button class="btn small" type="button" id="sp-walk-retry">${icon("arrow-clockwise")} Try again</button>`);
        $("#sp-walk-retry").addEventListener("click", loadWalk);
      }
    }
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); loadWalk(); } }, { rootMargin: "200px" });
    io.observe($("#sp-walk-sec"));
    new ResizeObserver(() => drawWalk()).observe(stageW);
    $("#sp-walk-play").addEventListener("click", async () => {
      await unlock();
      if (wp) { wp.stop(); wp = null; $("#sp-walk-play").innerHTML = icon("play"); $("#sp-walk-play").classList.remove("on"); drawWalk(); return; }
      if (!walkBuf) return;
      const p = play(walkBuf); wp = p; $("#sp-walk-play").innerHTML = icon("stop"); $("#sp-walk-play").classList.add("on");
      const c = audio(); const f = () => { if (wp !== p) return; const t = c.currentTime - p.startedAt; if (t >= walkBuf.duration) { wp = null; $("#sp-walk-play").innerHTML = icon("play"); $("#sp-walk-play").classList.remove("on"); drawWalk(); return; } drawWalk(t); requestAnimationFrame(f); }; f();
    });
    // a knob change rebuilds the walk too, lazily
    const origSet = setKnob;
    app.addEventListener("input", () => { if (takes) { clearTimeout(loadWalk.t); loadWalk.t = setTimeout(loadWalk, 900); } }, true);
    void origSet;
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
    $("#a-more").hidden = false; $("#a-more-grid").innerHTML = rest.map(card).join(""); liveCards($("#a-more-grid"));
  });

  await rebuild();
  paint();
}
