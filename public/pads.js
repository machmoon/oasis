// Pads: a kit played as an MPC. The idea is Crate, the iPhone Duo MPC that won Bitrig Hacks (Devpost
// "crate-iphone-duo-mpc": describe a vibe, get a playable kit from your samples, jam on the pads, fold the phone to
// shape the sound and snap it open for the drop). Its source is not public (github.com/Shuhan-Zhang/crate-duo is gone),
// so this follows the write-up, not its code. What Oasis adds is what a sampler cannot do: a pad is a program, not a
// file. Every hit is a new take of the program (samplers call this round robin and fake it with a handful of
// recordings; here the takes are rendered from seeds), and a pad's knobs re-render its sound instead of filtering it.
//
// Timing is Chris Wilson's lookahead scheduler (github.com/cwilso/metronome js/metronome.js and metronomeworker.js,
// "A Tale of Two Clocks"): a Worker ticks every 25 ms, every tick schedules on the AudioContext clock whatever falls in
// the next 100 ms, and what is drawn is read back from a queue of { step, time } against currentTime in rAF.
// The keyboard is the 4x4 grid an MPC and Ableton's Drum Rack put on a computer keyboard: 1234 / QWER / ASDF / ZXCV.
import { audio, unlock, loadWav, output } from "/audio.js";
import { wav } from "/sound-dsp.js";
import { control } from "/sound-page.js";
import "/knob.js";

// styles: sound.css (crumbs, dials) and kit.css (a-dials), then pads.css; loaded once from here, as the other pages do
for (const href of ["/sound.css", "/kit.css", "/pads.css"]) if (!document.querySelector(`link[href="${href}"]`)) { const l = document.createElement("link"); l.rel = "stylesheet"; l.href = href; document.head.appendChild(l); }

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const icon = (name) => `<i class="ph-bold ph-${name}" aria-hidden="true"></i>`;
async function api(path) { const r = await fetch(path); if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || `${r.status}`); return r.json(); }

const KEYS = ["Digit1", "Digit2", "Digit3", "Digit4", "KeyQ", "KeyW", "KeyE", "KeyR", "KeyA", "KeyS", "KeyD", "KeyF", "KeyZ", "KeyX", "KeyC", "KeyV"];
const KEY_LABEL = (code) => code.replace(/^(Digit|Key)/, "");
const STEPS = 16;

/** A first pattern from what the parts are: kicks on the one and the and-of-three, snares and claps on two and four,
 * ticks and taps on the off-beats, a long bed once a bar. A starting point to play over, not a composition. */
function starter(pads) {
  const rx = (p, re) => re.test(`${p.item.name} ${p.item.title}`.toLowerCase());
  const used = new Set();
  const rows = pads.map(() => new Array(STEPS).fill(0));
  const take = (test) => { const i = pads.findIndex((p, j) => !used.has(j) && test(p)); if (i >= 0) used.add(i); return i; };
  const bed = take((p) => p.item.kind === "ambience" || p.item.duration >= 2.4);
  if (bed >= 0) rows[bed][0] = 2;
  const kick = take((p) => rx(p, /kick|boom|thump|stomp|drop|slam|thud|barrel|knock/));
  if (kick >= 0) [0, 6, 8, 11].forEach((s, n) => (rows[kick][s] = n === 0 ? 2 : 1));
  const snare = take((p) => rx(p, /snare|clap|crack|snap|slap|hit|strike|shut/));
  if (snare >= 0) [4, 12].forEach((s) => (rows[snare][s] = 2));
  const hat = take((p) => rx(p, /hat|tick|tap|click|clink|blip|ping|drip|step/) || p.item.kind === "ui");
  if (hat >= 0) for (let s = 2; s < STEPS; s += 4) rows[hat][s] = 1;
  const ghost = take((p) => p.item.duration < 1.2);
  if (ghost >= 0) [7, 15].forEach((s) => (rows[ghost][s] = 1));
  return rows;
}

const wavUrl = (p, seed) => {
  const knobs = { ...p.knobs, ...(seed === undefined ? {} : { seed }) };
  const q = Object.keys(knobs).length ? `?p=${encodeURIComponent(JSON.stringify(knobs))}` : "";
  return p.item.licence ? `/api/licenses/${p.item.licence}/render.wav${q}` : `/api/assets/${encodeURIComponent(p.item.assetId)}/render.wav${q}`;
};
const cardUrl = (p) => `/api/assets/${encodeURIComponent(p.item.assetId)}/render.png?w=320${Object.keys(p.knobs).length ? `&p=${encodeURIComponent(JSON.stringify(p.knobs))}` : ""}`;

export async function pagePads(app, id) {
  app.innerHTML = `<div class="pd-page"><div class="wrap"><div class="skel" style="height:520px;border-radius:var(--r-lg)"></div></div></div>`;
  let kit;
  try { kit = await api(`/api/kits/${encodeURIComponent(id)}`); } catch { app.innerHTML = `<div class="wrap split2"><div><h1>That kit doesn't exist.</h1><p class="lede">Make one from a vibe, then play it here.</p><p style="margin-top:24px"><a class="btn primary" href="#/kits">Make a kit</a></p></div></div>`; return; }
  const details = await Promise.all(kit.items.map((it) => api(`/api/assets/${encodeURIComponent(it.assetId)}`).catch(() => null)));
  const pads = kit.items.slice(0, 16).map((item, i) => ({ i, item, detail: details[i], key: KEYS[i], knobs: { ...(item.knobs || {}) }, rr: 4, vol: 0.85, pitch: 0, mute: false, takes: [], next: 0, loading: null }));
  const hasSeed = (p) => !!p.detail?.knobs?.seed;
  const ac = audio();

  // ---------- the master chain: pads -> fold (lowpass + drive) -> master -> the page's bus ----------
  const padsBus = ac.createGain(), lp = ac.createBiquadFilter(), drive = ac.createWaveShaper(), master = ac.createGain();
  lp.type = "lowpass"; lp.frequency.value = 20000; lp.Q.value = 0.7;
  const curve = (k) => { const n = 1024, c = new Float32Array(n); for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; c[i] = k > 0 ? Math.tanh(x * (1 + k * 6)) / Math.tanh(1 + k * 6) : x; } return c; };
  drive.curve = curve(0); drive.oversample = "2x";
  master.gain.value = 0.9;
  padsBus.connect(lp).connect(drive).connect(master).connect(output());
  /** The fold, Crate's hinge as one fader: 0 is open (flat), 1 is folded shut (dark, driven, ringing). */
  let fold = 0;
  const setFold = (f, glide = 0.03) => {
    fold = Math.max(0, Math.min(1, f));
    const t = ac.currentTime;
    lp.frequency.setTargetAtTime(20000 * Math.pow(220 / 20000, fold), t, glide);
    lp.Q.setTargetAtTime(0.7 + fold * 9, t, glide);
    drive.curve = curve(fold * 0.8);
    master.gain.setTargetAtTime(0.9 * (1 - fold * 0.25), t, glide);
  };

  // ---------- takes: each pad holds a pool of rendered takes, one per seed, and every hit plays the next ----------
  const load = (p) => {
    const base = Number(p.knobs.seed ?? p.detail?.knobs?.seed?.default ?? 1);
    const seeds = hasSeed(p) ? Array.from({ length: p.rr }, (_, n) => base + n) : [undefined];
    const job = Promise.all(seeds.map((s) => loadWav(wavUrl(p, s)))).then((bufs) => { if (p.loading === job) { p.takes = bufs; p.next = 0; p.loading = null; paintPad(p); } return bufs; });
    p.loading = job; paintPad(p);
    return job;
  };
  const queue = []; // { kind: "hit" | "step", i, time }
  const trigger = (p, when = ac.currentTime, accent = false) => {
    if (!p.takes.length || p.mute) return;
    const buf = p.takes[p.next % p.takes.length]; p.next++;
    const src = ac.createBufferSource(), g = ac.createGain();
    src.buffer = buf; src.playbackRate.value = Math.pow(2, p.pitch / 12);
    g.gain.value = p.vol * (accent ? 1 : 0.72);
    src.connect(g).connect(padsBus);
    src.start(when);
    queue.push({ kind: "hit", i: p.i, time: when, take: (p.next - 1) % p.takes.length });
  };

  // ---------- the sequencer ----------
  const rows = starter(pads);
  const seq = { bpm: 92, swing: 0.12, playing: false, recording: false, step: 0, nextTime: 0, startedAt: 0, shown: -1 };
  const stepDur = () => 60 / seq.bpm / 4;
  const schedule = () => {
    while (seq.nextTime < ac.currentTime + 0.1) {
      const s = seq.step, t = seq.nextTime + (s % 2 ? seq.swing * stepDur() : 0);
      pads.forEach((p, i) => { if (rows[i][s]) trigger(p, t, rows[i][s] === 2); });
      queue.push({ kind: "step", step: s, time: t });
      seq.nextTime += stepDur(); seq.step = (s + 1) % STEPS;
    }
  };
  const timer = new Worker(URL.createObjectURL(new Blob([`let t=null;onmessage=(e)=>{if(e.data==="start"){clearInterval(t);t=setInterval(()=>postMessage("tick"),25);}else{clearInterval(t);t=null;}};`], { type: "text/javascript" })));
  timer.onmessage = () => seq.playing && schedule();
  const start = async () => { await unlock(); seq.playing = true; seq.step = 0; seq.nextTime = ac.currentTime + 0.06; seq.startedAt = seq.nextTime; timer.postMessage("start"); paintTransport(); };
  const stop = () => { seq.playing = false; seq.recording = false; timer.postMessage("stop"); seq.shown = -1; $$(".pd-col.now", app).forEach((c) => c.classList.remove("now")); paintTransport(); };
  /** The step a live hit lands on while recording: the nearest 16th to now, on the clock the sequencer runs. */
  const nearestStep = () => {
    const d = stepDur(), rel = ac.currentTime - seq.startedAt;
    return ((Math.round(rel / d) % STEPS) + STEPS) % STEPS;
  };

  let selected = 0;
  app.innerHTML = `<div class="pd-page">
    <div class="wrap">
      <nav class="a-crumb" aria-label="Breadcrumb"><a href="#/kits">Kits</a><span>/</span><a href="#/kit/${esc(kit.id)}">${esc(kit.title)}</a><span>/</span><span>Pads</span></nav>
      <header class="pd-head">
        <div><h1>${esc(kit.title)}</h1><p class="pd-vibe">“${esc(kit.vibe)}”</p></div>
        <div class="pd-transport" role="group" aria-label="Transport">
          <button class="pd-btn pd-play" id="pd-play" type="button" aria-label="Play" title="Play (Space)">${icon("play")}</button>
          <button class="pd-btn pd-rec" id="pd-rec" type="button" aria-pressed="false" title="Record pads into the pattern (Enter)">${icon("record")}<span>Rec</span></button>
          <label class="pd-num"><span>BPM</span><input id="pd-bpm" type="number" min="60" max="180" step="1" value="${seq.bpm}" class="num"></label>
          <label class="pd-num"><span>Swing</span><input id="pd-swing" type="range" min="0" max="0.5" step="0.01" value="${seq.swing}"></label>
          <button class="pd-btn" id="pd-export" type="button" title="Render two bars to a WAV">${icon("download-simple")}<span>Export loop</span></button>
        </div>
      </header>

      <div class="pd-deck">
        <div class="pd-pads" id="pd-pads" role="group" aria-label="Pads">${pads.map((p) => `
          <button class="pd-pad" type="button" data-i="${p.i}" aria-label="${esc(p.item.name)}, key ${KEY_LABEL(p.key)}">
            <img src="${esc(cardUrl(p))}" alt="" width="320" height="160" loading="lazy">
            <span class="pd-key">${KEY_LABEL(p.key)}</span>
            <span class="pd-name">${esc(p.item.name)}</span>
            <span class="pd-rr" aria-hidden="true"></span>
          </button>`).join("")}${Array.from({ length: (4 - (pads.length % 4)) % 4 }, () => `<span class="pd-pad empty" aria-hidden="true"></span>`).join("")}
        </div>

        <aside class="pd-side">
          <div class="pd-fold">
            <div class="pd-fold-head"><b>Fold</b><span id="pd-fold-v" class="num">open</span></div>
            <div class="pd-fold-track" id="pd-fold" role="slider" tabindex="0" aria-label="Fold: darkens and drives the whole kit; let go for the drop" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i class="pd-fold-fill"></i><i class="pd-fold-thumb"></i></div>
            <p class="pd-help">Drag down to fold the kit shut. Let go and it snaps open for the drop. Hold <kbd>Shift</kbd> to keep it folded.</p>
          </div>
          <div class="pd-edit" id="pd-edit"></div>
        </aside>
      </div>

      <section class="pd-seq" aria-label="Pattern">
        <div class="pd-steps-head"><span></span>${Array.from({ length: STEPS }, (_, s) => `<span class="pd-col-h${s % 4 === 0 ? " beat" : ""}">${s % 4 === 0 ? s / 4 + 1 : ""}</span>`).join("")}</div>
        <div id="pd-rows">${pads.map((p, i) => `<div class="pd-row" data-i="${i}">
          <button class="pd-row-name" type="button" data-sel="${i}"><span class="pd-key">${KEY_LABEL(p.key)}</span>${esc(p.item.name)}</button>
          ${Array.from({ length: STEPS }, (_, s) => `<button class="pd-cell pd-col${s % 4 === 0 ? " beat" : ""}" type="button" data-i="${i}" data-s="${s}" data-col="${s}" aria-label="${esc(p.item.name)} step ${s + 1}" aria-pressed="false"></button>`).join("")}
        </div>`).join("")}</div>
        <p class="pd-help">Click a step to add a hit, again for an accent, again to clear. Every hit plays the next take of that pad's program, so a run of sixteenths never repeats the same sample.</p>
      </section>
    </div>
  </div>`;

  // ---------- painting ----------
  function paintPad(p) {
    const el = $(`.pd-pad[data-i="${p.i}"]`, app); if (!el) return;
    el.classList.toggle("loading", !!p.loading);
    el.classList.toggle("muted", p.mute);
    el.classList.toggle("sel", p.i === selected);
    $(".pd-rr", el).innerHTML = hasSeed(p) ? Array.from({ length: p.takes.length || p.rr }, (_, n) => `<i data-n="${n}"></i>`).join("") : "";
  }
  const paintCells = () => $$(".pd-cell", app).forEach((c) => { const v = rows[c.dataset.i][c.dataset.s]; c.dataset.v = v; c.setAttribute("aria-pressed", v > 0); });
  function paintTransport() {
    $("#pd-play").innerHTML = icon(seq.playing ? "stop" : "play"); $("#pd-play").setAttribute("aria-label", seq.playing ? "Stop" : "Play");
    $("#pd-play").classList.toggle("on", seq.playing);
    $("#pd-rec").classList.toggle("on", seq.recording); $("#pd-rec").setAttribute("aria-pressed", seq.recording);
  }
  function paintEdit() {
    const p = pads[selected], d = p.detail;
    const entries = d ? Object.entries(d.knobs).filter(([k]) => k !== "seed") : [];
    const vals = { ...Object.fromEntries(entries.map(([k, def]) => [k, def.default])), ...(p.item.values || {}), ...p.knobs };
    $("#pd-edit").innerHTML = `
      <div class="pd-edit-head"><span class="pd-key">${KEY_LABEL(p.key)}</span><div><b>${esc(p.item.name)}</b><span>${esc(p.item.title)} by ${esc(p.item.author)}</span></div><a class="pd-open" href="#/a/${esc(p.item.assetId)}${p.item.licence ? `?lic=${esc(p.item.licence)}` : ""}" title="Open the program">${icon("arrow-square-out")}</a></div>
      ${d?.presets?.length ? `<div class="pd-presets" role="group" aria-label="Presets">${d.presets.map((name) => `<button type="button" data-preset="${esc(name)}">${esc(name)}</button>`).join("")}</div>` : ""}
      <div class="a-dials pd-dials">${entries.filter(([, def]) => def.type === "range" || def.type === "choice").map(([k, def]) => control(k, { ...def, default: vals[k] })).join("")}</div>
      <div class="pd-mix">
        <label><span>Takes</span><select id="pd-rrsel"${hasSeed(p) ? "" : " disabled"}>${[1, 2, 4, 8].map((n) => `<option value="${n}"${n === (hasSeed(p) ? p.rr : 1) ? " selected" : ""}>${n === 1 ? "same take" : `${n} takes`}</option>`).join("")}</select></label>
        <label><span>Pitch</span><input type="range" id="pd-pitch" min="-12" max="12" step="1" value="${p.pitch}"><output class="num">${p.pitch > 0 ? "+" : ""}${p.pitch}</output></label>
        <label><span>Level</span><input type="range" id="pd-vol" min="0" max="1" step="0.01" value="${p.vol}"></label>
        <button type="button" class="pd-mute${p.mute ? " on" : ""}" id="pd-mute" aria-pressed="${p.mute}">${icon(p.mute ? "speaker-slash" : "speaker-high")} ${p.mute ? "Muted" : "Mute"}</button>
      </div>
      <p class="pd-help">${hasSeed(p) ? "Knobs re-render this pad from its program. Takes is how many seeds a run cycles through." : "Knobs re-render this pad from its program. This program has no seed knob, so every hit is the same take."}</p>`;
    // the dials glide to their values once their element upgrades; a change re-renders the pool after a breath
    let t = 0;
    $$("oasis-knob", $("#pd-edit")).forEach((kn) => kn.addEventListener("change", () => {
      const k = kn.dataset.k, def = d.knobs[k];
      if (kn.value === def.default) delete p.knobs[k]; else p.knobs[k] = kn.value;
      clearTimeout(t); t = setTimeout(() => { load(p).then(() => trigger(p)); $(`.pd-pad[data-i="${p.i}"] img`, app).src = cardUrl(p); }, 160);
    }));
    $$("[data-preset]", $("#pd-edit")).forEach((b) => b.addEventListener("click", async () => {
      const pv = d.presetValues?.[b.dataset.preset]; if (!pv) return;
      p.knobs = Object.fromEntries(Object.entries(pv).filter(([k, v]) => k !== "seed" && d.knobs[k] && v !== d.knobs[k].default));
      await load(p); trigger(p); $(`.pd-pad[data-i="${p.i}"] img`, app).src = cardUrl(p); paintEdit();
    }));
    $("#pd-rrsel").addEventListener("change", (e) => { p.rr = Number(e.target.value); load(p); });
    $("#pd-pitch").addEventListener("input", (e) => { p.pitch = Number(e.target.value); e.target.nextElementSibling.textContent = `${p.pitch > 0 ? "+" : ""}${p.pitch}`; });
    $("#pd-pitch").addEventListener("change", () => trigger(p));
    $("#pd-vol").addEventListener("input", (e) => { p.vol = Number(e.target.value); });
    $("#pd-mute").addEventListener("click", () => { p.mute = !p.mute; paintPad(p); paintEdit(); });
  }
  const select = (i) => { const was = selected; selected = i; paintPad(pads[was]); paintPad(pads[i]); $$(".pd-row", app).forEach((r) => r.classList.toggle("sel", Number(r.dataset.i) === i)); paintEdit(); };

  // ---------- input ----------
  const hit = async (i, { fromKey = false } = {}) => {
    const p = pads[i]; if (!p) return;
    await unlock();
    trigger(p, ac.currentTime, true);
    if (seq.playing && seq.recording) { rows[i][nearestStep()] = rows[i][nearestStep()] || 1; paintCells(); }
    if (!fromKey || selected !== i) select(i);
  };
  $("#pd-pads").addEventListener("pointerdown", (e) => { const b = e.target.closest(".pd-pad[data-i]"); if (!b) return; e.preventDefault(); hit(Number(b.dataset.i)); });
  $("#pd-rows").addEventListener("click", (e) => {
    const c = e.target.closest(".pd-cell"); const n = e.target.closest("[data-sel]");
    if (n) return select(Number(n.dataset.sel));
    if (!c) return;
    const i = Number(c.dataset.i), s = Number(c.dataset.s);
    rows[i][s] = (rows[i][s] + 1) % 3; paintCells();
    if (rows[i][s] && !seq.playing) { unlock().then(() => trigger(pads[i], ac.currentTime, rows[i][s] === 2)); }
  });
  $("#pd-play").addEventListener("click", () => (seq.playing ? stop() : start()));
  $("#pd-rec").addEventListener("click", async () => { seq.recording = !seq.recording; if (seq.recording && !seq.playing) await start(); paintTransport(); });
  $("#pd-bpm").addEventListener("change", (e) => { seq.bpm = Math.max(60, Math.min(180, Number(e.target.value) || 92)); e.target.value = seq.bpm; });
  $("#pd-swing").addEventListener("input", (e) => { seq.swing = Number(e.target.value); });
  const onKey = (e) => {
    if (e.target.closest("input, select, textarea, oasis-knob") || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.code === "Space") { e.preventDefault(); if (!e.repeat) seq.playing ? stop() : start(); return; }
    if (e.code === "Enter") { e.preventDefault(); $("#pd-rec").click(); return; }
    const i = KEYS.indexOf(e.code);
    if (i >= 0 && !e.repeat) { e.preventDefault(); hit(i, { fromKey: true }); $(`.pd-pad[data-i="${i}"]`, app)?.classList.add("down"); }
  };
  const onKeyUp = (e) => { const i = KEYS.indexOf(e.code); if (i >= 0) $(`.pd-pad[data-i="${i}"]`, app)?.classList.remove("down"); };
  addEventListener("keydown", onKey); addEventListener("keyup", onKeyUp);

  // the fold fader: pointer drag down folds; release springs it open unless Shift is held (keep it folded)
  const foldEl = $("#pd-fold"), foldV = $("#pd-fold-v");
  const paintFold = () => { foldEl.style.setProperty("--f", fold); foldEl.setAttribute("aria-valuenow", Math.round(fold * 100)); foldV.textContent = fold < 0.02 ? "open" : fold > 0.98 ? "shut" : `${Math.round(fold * 100)}%`; app.querySelector(".pd-deck").style.setProperty("--fold", fold); };
  const foldAt = (e) => { const r = foldEl.getBoundingClientRect(); return (e.clientY - r.top) / r.height; };
  let dragging = false;
  foldEl.addEventListener("pointerdown", async (e) => { await unlock(); dragging = true; foldEl.setPointerCapture(e.pointerId); setFold(foldAt(e)); paintFold(); });
  foldEl.addEventListener("pointermove", (e) => { if (!dragging) return; setFold(foldAt(e)); paintFold(); });
  const release = (e) => {
    if (!dragging) return; dragging = false;
    if (e.shiftKey) return;
    // the drop: open in one beat, on a spring-ish exponential glide
    const from = fold, t0 = performance.now(), dur = Math.min(600, stepDur() * 4 * 1000);
    setFold(0, dur / 4000);
    const anim = (now) => { const k = Math.min(1, (now - t0) / dur); fold = from * Math.pow(1 - k, 3); paintFold(); if (k < 1 && !dragging) requestAnimationFrame(anim); else if (!dragging) { fold = 0; paintFold(); } };
    requestAnimationFrame(anim);
  };
  foldEl.addEventListener("pointerup", release); foldEl.addEventListener("pointercancel", release);
  foldEl.addEventListener("keydown", (e) => { const d = { ArrowDown: 0.1, ArrowUp: -0.1, PageDown: 0.25, PageUp: -0.25, Home: -1, End: 1 }[e.key]; if (d === undefined) return; e.preventDefault(); e.stopPropagation(); setFold(fold + d); paintFold(); });

  // ---------- draw: what has sounded, read back against the audio clock (metronome.js draw()) ----------
  let raf = 0;
  const draw = () => {
    const now = ac.currentTime;
    while (queue.length && queue[0].time <= now) {
      const q = queue.shift();
      if (q.kind === "step") {
        if (q.step !== seq.shown) { $$(".pd-col.now", app).forEach((c) => c.classList.remove("now")); $$(`.pd-col[data-col="${q.step}"]`, app).forEach((c) => c.classList.add("now")); $$(".pd-col-h", app).forEach((h, s) => h.classList.toggle("now", s === q.step)); seq.shown = q.step; }
      } else {
        const el = $(`.pd-pad[data-i="${q.i}"]`, app);
        if (el) { el.classList.remove("hit"); void el.offsetWidth; el.classList.add("hit"); $$(".pd-rr i", el).forEach((d) => d.classList.toggle("on", Number(d.dataset.n) === q.take)); }
      }
    }
    raf = requestAnimationFrame(draw);
  };
  raf = requestAnimationFrame(draw);

  // ---------- export: two bars rendered offline through the same chain, open (fold at 0), to a WAV ----------
  $("#pd-export").addEventListener("click", async () => {
    const b = $("#pd-export"); b.disabled = true; b.innerHTML = `${icon("circle-notch")}<span>Rendering</span>`;
    try {
      await Promise.all(pads.map((p) => p.loading || p.takes));
      const sr = 44100, bars = 2, d = stepDur(), tail = 2, len = Math.ceil((bars * STEPS * d + tail) * sr);
      const off = new OfflineAudioContext(1, len, sr), bus = off.createGain(); bus.gain.value = 0.9; bus.connect(off.destination);
      const counters = pads.map(() => 0);
      for (let bar = 0; bar < bars; bar++) for (let s = 0; s < STEPS; s++) {
        const t = (bar * STEPS + s) * d + (s % 2 ? seq.swing * d : 0);
        pads.forEach((p, i) => {
          if (!rows[i][s] || p.mute || !p.takes.length) return;
          const src = off.createBufferSource(), g = off.createGain();
          src.buffer = p.takes[counters[i]++ % p.takes.length]; src.playbackRate.value = Math.pow(2, p.pitch / 12);
          g.gain.value = p.vol * (rows[i][s] === 2 ? 1 : 0.72);
          src.connect(g).connect(bus); src.start(t);
        });
      }
      const out = (await off.startRendering()).getChannelData(0);
      let peak = 0; for (const v of out) peak = Math.max(peak, Math.abs(v));
      if (peak > 0.98) for (let i = 0; i < out.length; i++) out[i] *= 0.98 / peak;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([wav(out, sr)], { type: "audio/wav" }));
      a.download = `${kit.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${seq.bpm}bpm.wav`;
      document.body.appendChild(a); a.click(); a.remove();
      const unpaid = pads.some((p) => !p.item.licence && p.item.price > 0 && rows[p.i].some(Boolean));
      b.innerHTML = `${icon("check")}<span>${unpaid ? "Exported, with preview ticks" : "Exported"}</span>`;
    } catch (err) { b.innerHTML = `${icon("warning")}<span>${esc(err.message)}</span>`; }
    setTimeout(() => { b.disabled = false; b.innerHTML = `${icon("download-simple")}<span>Export loop</span>`; }, 2600);
  });

  paintCells(); paintTransport(); paintFold(); select(0);
  pads.forEach(load);

  // leaving the page stops the clock and frees the chain
  addEventListener("hashchange", () => { stop(); timer.terminate(); cancelAnimationFrame(raf); removeEventListener("keydown", onKey); removeEventListener("keyup", onKeyUp); try { padsBus.disconnect(); master.disconnect(); } catch {} }, { once: true });
}
