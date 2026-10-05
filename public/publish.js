// The creator side: publish a sound, and a creator's page. The publish page is npm's dry run made visible (the
// precedent is named in server/publish.js): paste a program, Check loads it in the server sandbox and runs the
// factory's harness across its knob space, and the page shows the render, the numbers, every gate and a play button
// per knob before anything is written. Publish re-runs the same check and lists the program under the creator's
// name. The creator page is what the ledger says they earned, order by order, plus forks and the royalty those paid.
import { audio, unlock, play, toBuffer, renderInWorker, analyse, drawWave, drawSpec, playhead } from "/audio.js";
import { segment, KIND_LABEL } from "/sound-page.js";
import { soundCard, liveSoundCards } from "/kit.js";

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const usd = (n) => `$${Number(n || 0).toFixed(2)}`;
const cents = (c) => usd((c || 0) / 100);
const price = (n) => (Number(n) === 0 ? "Free" : usd(n));
const icon = (name) => `<i class="ph-bold ph-${name}" aria-hidden="true"></i>`;
const api = async (path, { method = "GET", body } = {}) => { const r = await fetch(path, { method, headers: body ? { "Content-Type": "application/json" } : {}, body: body ? JSON.stringify(body) : undefined }); const j = await r.json().catch(() => ({})); if (!r.ok) throw Object.assign(new Error(j.error || `Request failed (${r.status})`), { status: r.status, code: j.code, errors: j.errors, warnings: j.warnings }); return j; };
const toast = (msg) => { const t = $("#toast"); if (!t) return; t.textContent = msg; t.classList.add("on"); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove("on"), 2600); };
const store = { get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} } };
for (const href of ["/sound.css", "/kit.css", "/pay.css", "/publish.css"]) if (!document.querySelector(`link[href="${href}"]`)) { const l = document.createElement("link"); l.rel = "stylesheet"; l.href = href; document.head.appendChild(l); }
const KINDS = ["sfx", "ambience", "ui", "impact", "foley", "music-loop"];

// The gates, in the order the harness states them (factory/harness-sound.mjs measure). Each knows which harness
// line fails or warns it; a line no gate claims is a load failure, shown on the first row.
const GATES = [
  { id: "load", label: "Loads in the sandbox", hint: "meta, params and build; no imports, no Math.random", fail: /does not load|must be "sound"|not a sound kind|build failed|seed range knob/ },
  { id: "length", label: "Length", hint: "0.05 to 4 s; ambiences and loops 2 to 4 s", fail: /longer than/, warn: /meta\.duration/, value: (r) => `${r.defaults.seconds.toFixed(2)} s` },
  { id: "peak", label: "Peak", hint: "0.5 to 0.95 after finish()", fail: /too quiet/, value: (r) => String(r.defaults.peak) },
  { id: "rms", label: "Loudness", hint: "RMS above 0.02", fail: /nearly silent/, value: (r) => `rms ${r.defaults.rms}` },
  { id: "silence", label: "Silence", hint: "under 60 % of the buffer; ambiences under 5 %", fail: /% of the buffer is silent/, value: (r) => `${Math.round(r.defaults.silence * 100)} %` },
  { id: "clip", label: "Clipping", hint: "no sample at the rail", fail: /clipped samples/, value: () => "0 samples" },
  { id: "knobs", label: "Every knob audible", hint: "RMS, centroid, envelope and length at each knob's extremes", fail: /no audible effect|only \d+ knobs/, warn: /subtle effect|knobs is a lot/, value: (r) => `${r.knobs} knobs, ${r.deadKnobs.length} dead` },
  { id: "seeds", label: "Seeds give distinct takes", hint: "waveform correlation under 0.995, still the same sound", fail: /seeds do not change/, warn: /seeds change the sound a lot/, value: (r) => (r.seedSimilarity === null ? "" : `correlation ${r.seedSimilarity}`) },
  { id: "ms", label: "Render time", hint: "under 1 s per render in the interpreter", fail: /too slow/, warn: /^slow:/, value: (r) => `${r.slowestMs} ms worst of ${r.renders}` },
  { id: "tail", label: "Ends in silence", hint: "fade() out; never a click", warn: /ends on a click/, value: () => "" },
];
function gateRows(report) {
  const claimed = new Set();
  const rows = GATES.map((g) => {
    const errs = (report?.errors || []).filter((e) => g.fail?.test(e)), warns = (report?.warnings || []).filter((w) => g.warn?.test(w));
    errs.forEach((e) => claimed.add(e)); warns.forEach((w) => claimed.add(w));
    const state = !report ? "" : errs.length ? "fail" : warns.length ? "warn" : "ok";
    const text = errs[0] || warns[0] || (report?.defaults && g.value ? g.value(report) : "");
    return { ...g, state, text };
  });
  const rest = (report?.errors || []).filter((e) => !claimed.has(e));
  if (rest.length) { rows[0].state = "fail"; rows[0].text = rest[0]; }
  return rows;
}
const gateList = (rows) => rows.map((g) => `<li class="pb-gate ${g.state}"><i aria-hidden="true"></i><span class="l">${esc(g.label)}</span><span class="v">${esc(g.text || g.hint)}</span></li>`).join("");
const fmt = (type, v) => (type === "toggle" ? (v ? "on" : "off") : String(v));

export async function pagePublish(app) {
  const who = store.get("oasis.creator") || {};
  app.innerHTML = `<div class="wrap pb-page">
    <header class="pb-head">
      <h1>Publish a sound.</h1>
      <p class="lede">Paste a program written to <a class="link" href="/contract.txt" target="_blank" rel="noopener">the contract</a>. The server renders it in the sandbox and runs the same harness the factory passes, across every knob. If it passes, it is listed under your name and every sale pays your PayPal.</p>
    </header>
    <div class="pb-grid">
      <section class="pb-src">
        <div class="pb-src-head"><span>The program</span><span class="pb-src-acts"><button class="btn small" type="button" id="pb-template">${icon("file-code")} Start from a template</button><label class="btn small" for="pb-file">${icon("upload-simple")} Upload .mjs</label><input type="file" id="pb-file" accept=".mjs,.js,text/javascript" hidden></span></div>
        <textarea id="pb-source" spellcheck="false" autocomplete="off" placeholder="export const meta = { title, kind, format: &quot;sound&quot;, … };
export const params = { knobs: { …, seed } };
export function build(p, ctx) { … return { samples }; }"></textarea>
        <div class="pb-src-foot"><span class="pb-lines" id="pb-lines">0 lines</span><button class="btn primary" type="button" id="pb-check">${icon("waveform")} Check it</button></div>
        <div class="pb-note err" id="pb-err" hidden role="alert"></div>
      </section>
      <aside class="pb-results" id="pb-results">
        <div class="sp-stage pb-stage" id="pb-stage" hidden>
          <div class="sp-wave"><span class="sp-axis">waveform</span><canvas id="pb-wave"></canvas></div>
          <div class="sp-spec"><span class="sp-axis">spectrogram</span><canvas id="pb-spec"></canvas></div>
          <div class="sp-ctl"><button class="s-play big" id="pb-play" aria-label="Play the defaults">${icon("play")}</button><span class="pb-playing" id="pb-playing">defaults</span></div>
        </div>
        <div class="sp-readout pb-readout" id="pb-readout" hidden></div>
        <div class="pb-gates-head"><span>What the harness measures</span><span class="pb-verdict" id="pb-verdict"></span></div>
        <ul class="pb-gates" id="pb-gates">${gateList(gateRows(null))}</ul>
        <div class="pb-knobs" id="pb-knobs" hidden></div>
      </aside>
    </div>
    <form class="pb-form" id="pb-form" novalidate hidden>
      <h2>The listing.</h2>
      <div class="pb-fields">
        <div class="pk-field"><label for="pb-title">Title</label><input class="pk-in" id="pb-title" maxlength="60" placeholder="Gravel Step"></div>
        <div class="pk-field"><label id="pb-kind-l">Kind</label><div id="pb-kind" aria-labelledby="pb-kind-l"></div></div>
        <div class="pk-field wide"><label for="pb-desc">One sentence</label><input class="pk-in" id="pb-desc" maxlength="240" placeholder="What it sounds like and what a game or film would use it for."></div>
        <div class="pk-field"><label for="pb-tags">Tags</label><input class="pk-in" id="pb-tags" maxlength="120" placeholder="footstep, gravel, walk"><span class="help">Up to eight, comma separated.</span></div>
        <div class="pk-field"><label for="pb-price">Price per licence</label><div class="a-range pb-price"><output id="pb-price-o" class="num">Free</output><input type="range" id="pb-price" min="0" max="50" step="0.5" value="0" style="--p:0%"></div><span class="help">$0 is free. Typical sounds sell for $1 to $6; you keep 90 %, 30 % of a fork's sale comes back to you.</span></div>
        <div class="pk-field"><label for="pb-author">Creator name</label><input class="pk-in" id="pb-author" maxlength="40" value="${esc(who.author || "")}" placeholder="foleyroom"><span class="help">Your page lives at /#/creator/&lt;name&gt;.</span></div>
        <div class="pk-field"><label for="pb-email">PayPal email for payouts</label><input class="pk-in" id="pb-email" type="email" maxlength="80" value="${esc(who.email || "")}" placeholder="you@example.com"><span class="help">${icon("paypal-logo")} Paid with PayPal Payouts once an order's 14-day refund window closes. Required for a priced sound.</span></div>
      </div>
      <div class="pb-note err" id="pb-form-err" hidden role="alert"></div>
      <div class="pb-form-foot"><button class="btn primary" type="submit" id="pb-go">${icon("upload-simple")} Publish</button><span class="note" id="pb-form-note">The check runs again on publish, on exactly this text.</span></div>
    </form>
    <section class="pb-done" id="pb-done" hidden></section>
  </div>`;

  const src = $("#pb-source"), stage = $("#pb-stage"), waveC = $("#pb-wave"), specC = $("#pb-spec");
  let checked = null, playing = null, defaultsBuffer = null;
  const lines = () => { $("#pb-lines").textContent = `${src.value ? src.value.split("\n").length : 0} lines`; };
  const draft = store.get("oasis.publish.draft"); if (draft) src.value = draft; lines();
  src.addEventListener("input", () => { lines(); store.set("oasis.publish.draft", src.value); if (checked) stale(); });
  const stale = () => { checked = null; $("#pb-form").hidden = true; $("#pb-verdict").textContent = "changed since the last check"; $("#pb-verdict").className = "pb-verdict"; };
  const setErr = (el, html) => { el.hidden = !html; el.innerHTML = html || ""; };

  $("#pb-template").addEventListener("click", async () => {
    if (src.value.trim() && !confirm("Replace what is in the editor with the template?")) return;
    src.value = await (await fetch("/api/publish/template")).text(); lines(); store.set("oasis.publish.draft", src.value); stale(); src.focus();
    toast("Soft Click loaded: five knobs, 27 lines. Check it, then make it yours.");
  });
  $("#pb-file").addEventListener("change", async (e) => { const f = e.target.files?.[0]; if (!f) return; src.value = await f.text(); lines(); store.set("oasis.publish.draft", src.value); stale(); e.target.value = ""; });

  const draw = (an, at = null) => { drawWave(waveC, an.wave, { at }); drawSpec(specC, an.spec, { at }); };
  new ResizeObserver(() => { if (checked?.analysis) draw(checked.analysis); }).observe(stage);
  const stopPlaying = () => { playing?.stop(); playing = null; $$(".s-play.on", app).forEach((b) => { b.classList.remove("on"); b.innerHTML = icon("play"); }); if (checked?.analysis) draw(checked.analysis); };
  /** Renders the checked source with knob values in the Worker and plays it, drawing the take on the stage. */
  const playValues = async (values, btn, label) => {
    await unlock();
    if (playing && btn.classList.contains("on")) { stopPlaying(); return; }
    stopPlaying();
    btn.classList.add("on"); btn.innerHTML = icon("stop"); $("#pb-playing").textContent = label;
    try {
      const { samples, sr } = await renderInWorker(checked.source, values, audio().sampleRate);
      const an = analyse(samples, sr, { cols: 320 }), buf = toBuffer(samples, sr);
      if (!btn.classList.contains("on")) return;
      const p = play(buf); playing = p;
      playhead(buf, p.startedAt, (at) => (at === null ? null : draw(an, at)));
      p.done.then(() => { if (playing === p) stopPlaying(); });
    } catch (e) { toast(e.message); stopPlaying(); }
  };
  $("#pb-play").addEventListener("click", () => checked && playValues(checked.values, $("#pb-play"), "defaults"));
  $("#pb-knobs").addEventListener("click", (e) => { const b = e.target.closest("[data-alt]"); if (!b || !checked) return; playValues({ ...checked.values, ...JSON.parse(b.dataset.alt) }, b, b.dataset.label); });

  $("#pb-check").addEventListener("click", async () => {
    const b = $("#pb-check"); b.disabled = true; b.innerHTML = `${icon("circle-notch")} Rendering in the sandbox…`;
    setErr($("#pb-err"), ""); stopPlaying();
    $("#pb-verdict").textContent = "running"; $("#pb-verdict").className = "pb-verdict";
    stage.hidden = false; stage.classList.add("busy");
    try {
      const c = await api("/api/publish/check", { method: "POST", body: { source: src.value } });
      c.source = src.value; checked = c; defaultsBuffer = null;
      stage.classList.remove("busy");
      if (c.analysis) { draw(c.analysis); $("#pb-readout").hidden = false; $("#pb-readout").innerHTML = `<span><b>${c.analysis.seconds.toFixed(2)}</b> s</span><span>peak <b>${c.analysis.peak}</b></span><span>rms <b>${c.analysis.rms}</b></span><span>centroid <b>${c.analysis.centroid}</b> Hz</span><span><b>${c.report.renders}</b> renders, worst <b>${c.report.slowestMs}</b> ms</span>`; }
      else { stage.hidden = true; $("#pb-readout").hidden = true; }
      $("#pb-gates").innerHTML = gateList(gateRows(c.report));
      $("#pb-verdict").textContent = c.ok ? `passes${c.report.warnings.length ? `, ${c.report.warnings.length} warning${c.report.warnings.length === 1 ? "" : "s"}` : ""}` : `${c.report.errors.length} problem${c.report.errors.length === 1 ? "" : "s"}`;
      $("#pb-verdict").className = `pb-verdict ${c.ok ? "ok" : "fail"}`;
      // a play button per knob: the harness's loudest-changing extreme for each, rendered in your browser on demand
      const knobs = c.params?.knobs || {};
      const rows = (c.report.knobEffects || []).map((k) => ({ ...k, from: fmt(k.type, c.values[k.knob]), to: fmt(k.type, Object.values(k.alt)[0]) }));
      if (knobs.seed) rows.push({ knob: "seed", label: "Seed", type: "range", alt: { seed: c.values.seed + 21 }, from: String(c.values.seed), to: String(c.values.seed + 21), distance: c.report.seedDistance, seed: true });
      $("#pb-knobs").hidden = !rows.length;
      $("#pb-knobs").innerHTML = `<div class="pb-gates-head"><span>Every knob, played at its far end</span></div>` + rows.map((k) => `<div class="pb-knob ${k.dead ? "fail" : k.subtle ? "warn" : "ok"}"><button class="s-play" type="button" data-alt="${esc(JSON.stringify(k.alt))}" data-label="${esc(`${k.label} ${k.to}`)}" aria-label="Play with ${esc(k.label)} at ${esc(k.to)}">${icon("play")}</button><span class="n">${esc(k.label)}</span><span class="d">${esc(k.from)} <i class="ph-bold ph-arrow-right" aria-hidden="true"></i> ${esc(k.to)}</span><span class="v">${k.seed ? `another take` : k.dead ? "no audible change" : k.subtle ? "subtle" : "audible"}${k.distance !== undefined ? ` · ${Number(k.distance).toFixed(2)}` : ""}</span></div>`).join("");
      if (c.ok) {
        const f = $("#pb-form"); f.hidden = false;
        $("#pb-title").value = c.meta.title || ""; $("#pb-desc").value = c.meta.description || ""; $("#pb-tags").value = (c.meta.tags || []).join(", ");
        setPrice(Math.min(50, Math.max(0, c.meta.price || 0)));
        kind.set(KINDS.includes(c.meta.kind) ? c.meta.kind : "sfx");
        if (!$("#pb-author").value && c.meta.author && !["you", "oasis-factory", "oasis"].includes(c.meta.author)) $("#pb-author").value = c.meta.author;
        $("#pb-form").scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        $("#pb-form").hidden = true;
        setErr($("#pb-err"), `<b>Not listed yet. The harness found:</b><ul>${c.report.errors.map((e) => `<li>${esc(e)}</li>`).join("")}</ul>${c.report.warnings.length ? `<span class="muted">Warnings: ${esc(c.report.warnings.join("; "))}</span>` : ""}`);
      }
    } catch (e) {
      stage.classList.remove("busy"); stage.hidden = true; $("#pb-readout").hidden = true; $("#pb-knobs").hidden = true; $("#pb-form").hidden = true;
      const rep = { errors: [e.message], warnings: [], knobs: 0, deadKnobs: [] };
      $("#pb-gates").innerHTML = gateList(gateRows(rep));
      $("#pb-verdict").textContent = "refused"; $("#pb-verdict").className = "pb-verdict fail";
      setErr($("#pb-err"), `<b>${e.code === "ERANDOM" ? "Math.random is refused." : e.code === "ELOAD" ? "The module did not load." : "Refused."}</b><span>${esc(e.message)}</span>`);
    }
    b.disabled = false; b.innerHTML = `${icon("waveform")} Check it`;
  });

  // the listing form
  const kind = segment($("#pb-kind"), KINDS.map((k) => ({ id: k, label: KIND_LABEL[k] || k })), "sfx", () => {});
  const priceIn = $("#pb-price"), priceOut = $("#pb-price-o");
  const setPrice = (v) => { priceIn.value = v; priceIn.style.setProperty("--p", `${(v / 50) * 100}%`); priceOut.textContent = price(v); $("#pb-email").required = v > 0; };
  priceIn.addEventListener("input", () => setPrice(Number(priceIn.value)));
  $("#pb-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!checked) { toast("Check the program first"); return; }
    const b = $("#pb-go"); b.disabled = true; b.innerHTML = `${icon("circle-notch")} Checking again and listing…`; setErr($("#pb-form-err"), "");
    const body = { source: checked.source, title: $("#pb-title").value, kind: kind(), tags: $("#pb-tags").value, description: $("#pb-desc").value, price: Number(priceIn.value), author: $("#pb-author").value.trim().toLowerCase(), payoutEmail: $("#pb-email").value.trim() || null };
    try {
      const a = await api("/api/publish", { method: "POST", body });
      store.set("oasis.creator", { author: body.author, email: body.payoutEmail || "" });
      store.set("oasis.publish.draft", "");
      $("#pb-form").hidden = true;
      const done = $("#pb-done"); done.hidden = false;
      done.innerHTML = `<div class="pb-done-card">
        <span class="pk-state live">${icon("seal-check")} Listed</span>
        <h2>${esc(a.title)} is live.</h2>
        <p>${esc(KIND_LABEL[a.kind] || a.kind)}, ${a.knobCount} knobs, ${price(a.price)}${a.price > 0 ? " per licence" : ""}, by <a href="#/creator/${encodeURIComponent(a.author)}">${esc(a.author)}</a>. Agents can find it now with <code>search_assets</code>; kits can pick it; ${a.price > 0 ? `every sale pays ${esc(body.payoutEmail)} with PayPal Payouts.` : "it imports free."}</p>
        <div class="a-program pb-import"><span class="k">import</span> { play } <span class="k">from</span> <span class="s">"${esc(location.origin)}/cdn/${esc(a.id)}.mjs${a.price > 0 ? "?lic=…" : ""}"</span>;</div>
        <div class="acts"><a class="btn primary" href="#/a/${esc(a.id)}">${icon("sliders-horizontal")} Open the sound</a><a class="btn" href="#/creator/${encodeURIComponent(a.author)}">${icon("user")} Your creator page</a><button class="btn" type="button" id="pb-again">${icon("plus")} Publish another</button></div>
      </div>`;
      done.scrollIntoView({ behavior: "smooth", block: "start" });
      $("#pb-again").addEventListener("click", () => { src.value = ""; lines(); stale(); done.hidden = true; $("#pb-stage").hidden = true; $("#pb-readout").hidden = true; $("#pb-knobs").hidden = true; $("#pb-gates").innerHTML = gateList(gateRows(null)); $("#pb-verdict").textContent = ""; window.scrollTo({ top: 0, behavior: "smooth" }); });
      toast(`Published ${a.title}`);
    } catch (err) {
      setErr($("#pb-form-err"), `<b>${esc(err.code === "EHARNESS" ? "The harness rejected it on the second run." : "Not published.")}</b><span>${esc(err.message)}</span>${err.errors?.length > 1 ? `<ul>${err.errors.slice(1).map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}`);
      b.disabled = false; b.innerHTML = `${icon("upload-simple")} Publish`;
    }
  });
}

export async function pageCreator(app, name) {
  app.innerHTML = `<div class="wrap pb-page cr-page" aria-busy="true"><div class="skel" style="height:14px;width:160px;margin-bottom:18px"></div><div class="skel" style="height:52px;width:min(320px,50%)"></div><div class="skel" style="height:14px;width:min(520px,80%);margin:14px 0 32px"></div><div class="s-grid">${Array.from({ length: 4 }, () => `<div class="s-skel"><div class="skel"></div><div class="skel t"></div><div class="skel t"></div></div>`).join("")}</div></div>`;
  let c;
  try { c = await api(`/api/creators/${encodeURIComponent(name)}`); } catch { app.innerHTML = `<div class="wrap split2"><div><h1>No creator called ${esc(name)}.</h1><p class="lede">Nobody has published under that name yet. Names are taken by publishing.</p><div style="margin-top:24px;display:flex;gap:12px"><a class="btn primary" href="#/publish">Publish a sound</a><a class="link" href="#/sounds">Browse sounds</a></div></div></div>`; return; }
  const when = (iso) => (iso ? new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "");
  const priced = c.sounds.filter((s) => s.price > 0).length;
  const role = (r) => (r === "creator" ? "creator share" : r === "parent" ? "royalty, parent of a fork" : "royalty, ancestor of a fork");
  app.innerHTML = `<div class="wrap pb-page cr-page">
    <nav class="a-crumb" aria-label="Breadcrumb"><a href="#/sounds">Sounds</a><span>/</span><span>Creators</span><span>/</span><span>${esc(c.name)}</span></nav>
    <header class="cr-head">
      <div class="cr-id"><span class="cr-face" aria-hidden="true">${esc(c.name[0].toUpperCase())}</span><div><h1>${esc(c.name)}</h1><p class="lede">${c.sounds.length ? `<span class="num">${c.sounds.length}</span> sound program${c.sounds.length === 1 ? "" : "s"} in the registry${priced ? `, ${priced} priced` : ""}${c.since ? `, since ${when(c.since)}` : ""}.` : "No programs listed yet."} ${c.hasPayout ? `Paid with PayPal Payouts to <span class="mono">${esc(c.payoutEmail)}</span>.` : "No PayPal email on file: shares are held until there is one."}</p></div></div>
      <div class="cr-stats">
        <div class="cr-stat"><b class="num">${cents(c.earned.cents)}</b><span>earned, ${c.earned.orders} order${c.earned.orders === 1 ? "" : "s"}</span></div>
        <div class="cr-stat"><b class="num">${cents(c.earned.royalties)}</b><span>royalties from forks</span></div>
        <div class="cr-stat"><b class="num">${c.forks.length}</b><span>fork${c.forks.length === 1 ? "" : "s"} of their programs</span></div>
      </div>
    </header>
    <section class="cr-sec"><h2>Sounds.</h2>${c.sounds.length ? `<div class="s-grid" id="cr-grid">${c.sounds.map(soundCard).join("")}</div>` : `<p class="muted">None yet.</p>`}</section>
    <div class="cr-cols">
      <section class="cr-sec"><div class="pk-col-h">Orders that paid ${esc(c.name)} <span>${c.orders.length ? `${c.orders.length} on the ledger` : ""}</span></div>
        ${c.orders.length ? `<div class="sales">${c.orders.map((o) => `<div class="sale"><div class="who" aria-hidden="true">${esc((o.agent || "B")[0].toUpperCase())}</div><div class="what"><b>${esc(o.agent || "A buyer")}</b> licensed ${esc(o.items.map((i) => i.title).join(", "))}${o.total !== undefined ? ` in a ${usd(o.total)} order` : ""}.<div class="split">${o.items.map((i) => `<span class="chip">${esc(role(i.role))} <b>${cents(i.cents)}</b></span>`).join("")}</div><div class="ids">PayPal order ${esc(o.orderId)} · ${when(o.at)}${o.status === "REFUNDED" ? " · refunded" : o.payout === "SENT" ? " · paid out" : o.payoutAfter ? ` · paid out after ${when(o.payoutAfter)}` : o.items.some((i) => i.held) ? " · held, no PayPal email" : ""}</div></div><div class="amt">${cents(o.cents)}</div></div>`).join("")}</div>`
        : `<div class="pk-note empty">${icon("receipt")}<b>Nothing paid yet</b><p>When a kit or an agent licenses one of these sounds, the PayPal order and ${esc(c.name)}'s share land here.</p></div>`}
      </section>
      <aside class="cr-side">
        <section class="cr-sec"><div class="pk-col-h">Forks of their programs <span>${c.forks.length ? "30 % of each fork's sale comes back" : ""}</span></div>
          ${c.forks.length ? `<div class="cr-forks">${c.forks.map((f) => `<a class="cr-fork" href="#/a/${esc(f.id)}"><img src="/api/assets/${encodeURIComponent(f.id)}/render.png?w=120" alt=""><span><b>${esc(f.title)}</b><span>by <em>${esc(f.author)}</em>, ${price(f.price)}, from ${esc(c.sounds.find((s) => f.lineage?.includes(s.id))?.title || "their program")}</span></span><span class="amt num">${cents(f.royaltyCents)}</span></a>`).join("")}</div>`
          : `<p class="muted">No forks yet. Anyone can fork a program with AI from its page; ${esc(c.name)} keeps a share of every sale down the lineage.</p>`}
        </section>
        <section class="cr-sec cr-payout"><div class="pk-col-h">Payout</div>
          <div class="cr-payout-card">${icon("paypal-logo")}<div><b>${c.hasPayout ? esc(c.payoutEmail) : "No PayPal email on file"}</b><span>${c.hasPayout ? "Shares are held for the 14-day refund window, then sent with PayPal Payouts, one batch per order." : `${cents(c.earned.held)} held. Publish with a PayPal email to be paid.`}</span></div></div>
        </section>
      </aside>
    </div>
  </div>`;
  if ($("#cr-grid")) liveSoundCards($("#cr-grid"));
}
