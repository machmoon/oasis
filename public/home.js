// Oasis home. The hero is the product running: one sound program (a footstep) plays while its knobs turn by
// themselves, the waveform and spectrogram redraw for every render, then a vibe is typed, a kit is chosen, and a
// PayPal order lands: the preview tick lifts off every part as each creator's share appears. The loop is shaped
// after polyfork.dev's hero film (their hero-stage.js: one stage, a cast of briefs, beats that each change one thing,
// the headline answering the beat, and the film yielding when a visitor touches the stage). Sound needs a gesture,
// so the hero runs silent until "Listen" is pressed and then plays every render it draws. The pictures are wavesurfer
// (public/wave.js): each render morphs out of the last one, the spectrogram is the Spectrogram plugin in Roseus, and
// the hero's knobs are read-only <oasis-knob>s (public/knob.js) that the film turns.
import { audio, unlock, unlocked, onUnlock, loadWav } from "/audio.js";
import { controls } from "/sound-page.js";
import { mountWave } from "/wave.js";
import "/knob.js";

const $ = (s, el = document) => el.querySelector(s);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
if (!document.querySelector('link[href="/sound.css"]')) { const l = document.createElement("link"); l.rel = "stylesheet"; l.href = "/sound.css"; document.head.appendChild(l); }

const VIBES = [
  { vibe: "rainy cyberpunk alley footsteps and UI clicks", kit: "Neon Alley", steps: [{ surface: "wet-concrete", weight: 0.6, wetness: 0.8 }, { surface: "wet-concrete", weight: 0.9, wetness: 1 }] },
  { vibe: "a cosy wooden tavern with a creaking door", kit: "Tavern Night", steps: [{ surface: "wood", weight: 0.7 }, { surface: "wood", weight: 1, pace: 0.6 }] },
  { vibe: "a snowy mountain trail at dusk", kit: "Snowline", steps: [{ surface: "snow", weight: 0.5 }, { surface: "snow", weight: 0.95, wetness: 0.3 }] },
  { vibe: "a gravel courtyard, heavy boots", kit: "Courtyard", steps: [{ surface: "gravel", weight: 0.4 }, { surface: "gravel", weight: 1, pace: 1.6 }] },
];
const HERO_SOUND = "footstep";

/** A spring to a value, the way cult-ui's RollingNumber animates money (rolling-number.tsx: mass .8, stiffness 75, damping 15). */
function springTo(from, to, onStep, { mass = 0.8, stiffness = 75, damping = 15 } = {}) {
  let x = from, v = 0, last = performance.now();
  return new Promise((resolve) => {
    const step = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const a = (-stiffness * (x - to) - damping * v) / mass;
      v += a * dt; x += v * dt;
      if (Math.abs(x - to) < 0.005 && Math.abs(v) < 0.01) { onStep(to); resolve(); return; }
      onStep(x); requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}

export async function pageHome(app, ctx) {
  const { api, esc, usd, price, icon, catalog, drawSales, viewers, reduced, rise } = ctx;
  app.innerHTML = `
  <section class="hero" id="hero" aria-label="Oasis rendering and licensing a sound kit, live">
    <div class="hero-stage hero-sound" id="hero-stage">
      <div class="hs-pic" id="hs-ws"><span class="sp-axis">waveform</span><span class="sp-axis spec" id="hs-spec-axis">spectrogram</span><button class="hs-unlock" id="hs-listen" type="button" aria-label="Unmute: play every render">${icon("speaker-slash")} Muted. Tap to listen</button></div>
      <div class="hs-knobs" id="hs-knobs"></div>
    </div>
    <div class="wrap"><div class="hero-copy">
      <h1><span class="line on" data-beat="vibe">Vibe in.</span><span class="line" data-beat="kit">Kit out.</span><span class="line" data-beat="paid">Creators paid.</span></h1>
      <p class="lede">Every sound is a program with knobs. Describe a vibe, get a tuned kit, and one PayPal order pays every creator.</p>
      <div class="cta"><a class="btn primary" href="#/kits">Make a kit</a><a class="btn" href="#/sounds">Browse sounds</a></div>
    </div></div>
    <div class="hero-readout" id="readout" aria-live="polite"><i class="live"></i><span>rendering a footstep</span></div>
    <div class="hero-pay" id="hero-pay"><div class="hero-chips" id="hero-chips"></div><span class="btn paypal pay" id="pay-btn">${icon("paypal-logo")} Pay <span class="money num" id="pay-money">$0.00</span></span></div>
  </section>

  <section class="wrap band">
    <div class="rebuild">
      <div><div class="rebuild-stage hs-stage2" id="rb-stage"><div id="rb-ws"></div><button class="s-play big" id="rb-play" aria-label="Play">${icon("play")}</button><span class="readout" id="rb-readout"></span></div></div>
      <div>
        <h2>Rendered, not resampled</h2>
        <p class="lede">Turn a knob and the sound is built again: heavier is a lower, longer thump with more stones shifting, not the same file played louder.</p>
        <div class="rebuild-knobs" id="rb-knobs"></div>
        <div class="rebuild-import" id="rb-import"></div>
      </div>
    </div>
  </section>

  <section class="wrap band" id="pay">
    <div class="order">
      <div>
        <h2>One order, every creator</h2>
        <p class="lede">A kit is a bill. Approve it once in PayPal and each creator's share is booked from the same order; previews lose their watermark the moment it lands.</p>
        <a class="btn" href="#/budget">Give an agent a budget</a>
      </div>
      <div class="receipt" id="receipt"><div class="skel" style="height:280px"></div></div>
    </div>
  </section>

  <section class="wrap band" id="sales-sec" hidden>
    <div class="head"><h2>Paid so far</h2></div>
    <div class="ledger"><div class="sales" id="sales"></div><div class="creators" id="creators"></div></div>
  </section>

  <section class="wrap band agents-band">
    <h2>Agents run the same loop</h2>
    <p class="lede">Connect Claude Code over MCP. It searches, previews, makes the kit and licenses it inside a budget you approved once.</p>
    <div class="cmd"><span id="cmd-text"></span><button type="button" id="cmd-copy">Copy</button></div>
    <div class="tools" aria-label="MCP tools">${["search_assets", "preview_asset", "make_kit", "buy_assets", "get_budget"].map((t) => `<code>${t}</code>`).join("")}</div>
  </section>

  <section class="wrap band">
    <div class="kit-head"><h2>From creators' programs</h2><a class="link" href="#/sounds">All sounds</a></div>
    <div class="s-grid" id="kit"></div>
  </section>`;

  const cmd = `claude mcp add --transport http oasis ${location.origin}/mcp`;
  $("#cmd-text").textContent = cmd;
  $("#cmd-copy").addEventListener("click", async () => { try { await navigator.clipboard.writeText(cmd); ctx.toast("Copied"); } catch { ctx.toast("Select the command and copy it"); } });

  drawKitRow($("#kit"), { catalog });
  drawSales().then((n) => { if (n) $("#sales-sec").hidden = false; });
  mountRebuild({ api, esc, icon, reduced });
  // the bill shows a real paid kit at once (the latest licensed one, with its PayPal order), so the band is never an
  // empty frame waiting on the hero; a bill the hero builds later replaces it
  let heroBilled = false;
  api("/api/kits").then((ks) => ks.find((k) => k.licensed)).then((k) => k && api(`/api/kits/${encodeURIComponent(k.id)}`)).then((kit) => { if (kit && !heroBilled) drawReceipt($("#receipt"), kit, { esc, usd, icon }); }).catch(() => {});
  const hero = mountHero({ api, esc, usd, icon, reduced, onBill: (kit) => { heroBilled = true; drawReceipt($("#receipt"), kit, { esc, usd, icon }); } });
  viewers.push({ dispose: hero.stop });
  rise(app);
}

// ---------- the hero ----------
function mountHero({ api, esc, usd, icon, reduced, onBill }) {
  const el = $("#hero"), stage = $("#hero-stage"), readout = $("#readout"), payBtn = $("#pay-btn"), money = $("#pay-money"), chips = $("#hero-chips"), knobsEl = $("#hs-knobs");
  const lines = [...el.querySelectorAll("h1 .line")];
  let alive = true, paused = 0, offscreen = false, current = null;
  // the picture: waveform over spectrogram, sized from the stage (the knob strip keeps its own height)
  const wsEl = $("#hs-ws"), avail = Math.max(200, stage.clientHeight - 88 - 30), wh = Math.round(avail * 0.44);
  $("#hs-spec-axis").style.top = `${30 + wh + 8}px`;
  wsEl.style.setProperty("--wave-h", `${30 + wh}px`);
  const wave = mountWave(wsEl, { height: wh, spectrogram: avail - wh, specLabels: false, hover: false, compact: true, barWidth: 3, barGap: 1, barRadius: 2 });
  const stop = () => { alive = false; off(); wave.destroy(); };
  // the unmute pill: pressed once, it turns the accent, says so, and fades out of the picture's way
  const listening = () => { const b = $("#hs-listen"); if (!b || b.classList.contains("on")) return; b.innerHTML = `${icon("speaker-high")} Listening`; b.classList.add("on"); b.setAttribute("aria-label", "Listening"); setTimeout(() => b.classList.add("gone"), 2200); };
  $("#hs-listen").addEventListener("click", async () => { await unlock(); listening(); if (current) wave.play(); });
  const off = onUnlock((s) => { const b = $("#hs-listen"); if (!b) { off(); return; } if (s === "running") listening(); });
  stage.addEventListener("pointerdown", () => { paused = performance.now() + 6000; });
  const io = new IntersectionObserver((es) => { offscreen = !es[0].isIntersecting; }, { threshold: 0.05 });
  io.observe(stage);
  const wait = async () => { while (alive && (offscreen || paused > performance.now())) await sleep(200); };
  const beat = (name) => lines.forEach((l) => { const i = ["vibe", "kit", "paid"].indexOf(l.dataset.beat), j = ["vibe", "kit", "paid"].indexOf(name); l.classList.toggle("on", i === j); l.classList.toggle("done", i < j); });
  const say = (html, live = false) => { if (!readout.isConnected) { alive = false; return; } readout.innerHTML = `<i class="${live ? "live" : ""}"></i><span class="t">${html}</span>`; };

  let meta = null;
  const KNOBS = ["surface", "weight", "pace", "wetness"];
  const values = {};
  // read-only dials the film turns: each value glides on Motion's spring (knob.js), the knob that moved is lit
  const paintKnobs = (hot = null) => {
    if (!meta) return;
    if (!knobsEl.children.length) knobsEl.innerHTML = KNOBS.filter((k) => meta.knobs[k]).map((k) => { const d = meta.knobs[k]; return d.type === "choice" ? `<oasis-knob readonly data-k="${k}" label="${esc(d.label || k)}" options="${esc(d.options.join("|"))}" value="${esc(values[k] ?? d.default)}"></oasis-knob>` : `<oasis-knob readonly data-k="${k}" label="${esc(d.label || k)}" min="${d.min}" max="${d.max}" step="${d.step || (d.max - d.min) / 100}" value="${values[k] ?? d.default}"></oasis-knob>`; }).join("");
    knobsEl.querySelectorAll("oasis-knob").forEach((el) => { const k = el.dataset.k; el.classList.toggle("hot", k === hot); if (String(el.value) !== String(values[k])) el.value = values[k]; });
  };
  const cache = new Map();
  async function render(knobs, lic = null) {
    const key = JSON.stringify(knobs) + (lic || "");
    if (!cache.has(key)) cache.set(key, (async () => {
      const q = `?p=${encodeURIComponent(JSON.stringify(knobs))}${lic ? `&lic=${lic}` : ""}`;
      const [buffer, an] = await Promise.all([loadWav(`/api/assets/${HERO_SOUND}/render.wav${q}`), api(`/api/assets/${HERO_SOUND}/sound.json${q}`)]);
      return { buffer, an, wm: buffer.oasisWatermarked };
    })().catch((e) => { cache.delete(key); throw e; }));
    return cache.get(key);
  }
  async function show(knobs, what, hot) {
    Object.assign(values, knobs);
    current = await render(values);
    if (!stage.isConnected) { alive = false; return; }
    paintKnobs(hot);
    await wave.show(current.buffer, { dim: current.wm });
    say(what, true);
    if (unlocked()) wave.play();
  }
  async function type(text) {
    if (reduced) { say(`"${esc(text)}"`, true); return; }
    for (let i = 1; i <= text.length && alive; i += 2) { say(`"${esc(text.slice(0, i))}<span class="caret"></span>`, true); await sleep(26); }
    say(`"${esc(text)}"`, true); await sleep(400);
  }
  async function pay(kit) {
    onBill?.(kit);
    chips.innerHTML = "";
    const creators = {};
    for (const i of kit.items) if (i.price > 0) creators[i.author] = (creators[i.author] || 0) + i.price;
    say(`one PayPal order, <b>${Object.keys(creators).length} creators</b>`);
    payBtn.classList.add("in");
    if (!reduced) await springTo(0, kit.total, (x) => (money.textContent = usd(x))); else money.textContent = usd(kit.total);
    await sleep(reduced ? 0 : 500);
    payBtn.classList.add("press"); await sleep(160); payBtn.classList.remove("press");
    Object.entries(creators).sort((a, b) => b[1] - a[1]).forEach(([who, v], i) => { const chip = document.createElement("span"); chip.className = "chip"; chip.innerHTML = `${esc(who)} <b>+${usd(v)}</b>`; chips.appendChild(chip); setTimeout(() => chip.classList.add("in"), reduced ? 0 : 300 + i * 420); });
    // the licence lands: the watermark tick lifts; the clean render is drawn and heard
    el.classList.add("paid");
    if (current) { current = { ...current, wm: false }; wave.show(current.buffer, { dim: false, morph: false }); }
    say(`<b>${usd(kit.total)}</b> paid to ${Object.keys(creators).length} creators in one PayPal order · previews now clean`);
    if (unlocked()) await sleep(300);
  }
  async function loop() {
    try { meta = await api(`/api/assets/${HERO_SOUND}`); } catch { say("the registry is busy"); return; }
    for (const [k, d] of Object.entries(meta.knobs)) values[k] = d.default;
    paintKnobs();
    for (let i = 0; alive; i = (i + 1) % VIBES.length) {
      const v = VIBES[i];
      try {
        await wait();
        beat("vibe"); el.classList.remove("paid");
        payBtn.classList.remove("in"); chips.querySelectorAll(".chip").forEach((c) => c.classList.remove("in"));
        await type(v.vibe);
        // the knobs turn: the program renders each state and plays it
        for (const [j, step] of v.steps.entries()) {
          if (!alive) return;
          const hot = Object.keys(step).find((k) => step[k] !== values[k]) || "surface";
          await show({ ...step, seed: 10 + i * 7 + j }, `<b>footstep</b> by foleyroom: ${Object.entries(step).map(([k, val]) => `${k} <b>${val}</b>`).join(", ")}`, hot);
          await sleep(reduced ? 0 : 1500);
        }
        for (let s = 0; s < 3 && alive; s++) { await show({ seed: 100 + i * 10 + s }, `another take: seed <b>${100 + i * 10 + s}</b>, same knobs`, "seed"); await sleep(reduced ? 0 : 700); }
        beat("kit");
        await wait();
        let kit;
        try { kit = await api("/api/kits", { method: "POST", body: { vibe: v.vibe, quick: true } }); } catch { kit = null; }
        if (!alive) return;
        if (kit) say(`kit <b>${esc(kit.title)}</b>: ${kit.items.length} sounds from ${kit.creators.length} creators`, true);
        await sleep(reduced ? 0 : 1600);
        await wait();
        beat("paid");
        if (kit) await pay(kit);
        if (reduced) return;
        await sleep(4200);
      } catch (e) { say("the registry is busy, trying again"); await sleep(3000); }
    }
  }
  loop();
  return { stop };
}

// ---------- rendered, not resampled ----------
async function mountRebuild({ api, esc, icon, reduced }) {
  const stage = $("#rb-stage"), knobsEl = $("#rb-knobs"), imp = $("#rb-import"), out = $("#rb-readout");
  const id = HERO_SOUND;
  const a = await api(`/api/assets/${id}`).catch(() => null);
  if (!a || !stage.isConnected) return;
  const knobs = a.knobs || {};
  const values = Object.fromEntries(Object.entries(knobs).map(([k, d]) => [k, d.default]));
  const show = ["surface", "weight", "pace", "wetness", "seed"].filter((k) => knobs[k]);
  // the same controls as the sound page (sound-page.js controls: rotary knobs, choices with detents, a seed with a dice)
  knobsEl.innerHTML = controls(show.map((k) => [k, { ...knobs[k], label: knobs[k].label || k[0].toUpperCase() + k.slice(1) }]));
  const diff = () => Object.fromEntries(Object.entries(values).filter(([k, val]) => val !== knobs[k].default));
  const schedule = () => { clearTimeout(rebuild.t); rebuild.t = setTimeout(() => rebuild(true), 60); };
  $("#a-dice", knobsEl)?.addEventListener("click", () => { const d = knobs.seed; values.seed = d.min + Math.floor(Math.random() * (d.max - d.min + 1)); $("#k-seed", knobsEl).value = values.seed; schedule(); });
  let n = 0, current = null;
  const rbH = Math.max(260, stage.clientHeight || 360), rbW = Math.round(rbH * 0.42);
  const wave = mountWave($("#rb-ws"), { height: rbW, spectrogram: rbH - rbW, specLabels: false, barWidth: 3, barGap: 1, barRadius: 2,
    onState: (on) => { const b = $("#rb-play"); if (!b) return; b.classList.toggle("on", on); b.innerHTML = icon(on ? "stop" : "play"); } });
  const rebuild = async (playIt) => {
    const run = ++n, t0 = performance.now();
    const q = `?p=${encodeURIComponent(JSON.stringify(diff()))}`;
    const [buffer, an] = await Promise.all([loadWav(`/api/assets/${id}/render.wav${q}`), api(`/api/assets/${id}/sound.json${q}`)]);
    if (run !== n || !stage.isConnected) return;
    current = { buffer, an };
    await wave.show(buffer, { dim: buffer.oasisWatermarked });
    out.innerHTML = `<b>${an.seconds.toFixed(2)}</b> s, peak <b>${an.peak}</b>, centroid <b>${an.centroid}</b> Hz, <b>${Math.round(performance.now() - t0)}</b> ms`;
    const d = diff();
    imp.innerHTML = `<span class="k">import</span> { play } <span class="k">from</span> <span class="s">"${esc(location.origin)}/cdn/${id}.mjs?lic=…"</span>;\nplay(ctx, ${Object.keys(d).length ? esc(JSON.stringify(d)) : "{}"});`;
    if (playIt && unlocked()) wave.play();
  };
  knobsEl.addEventListener("input", (e) => {
    const k = e.target.dataset.k; if (!k) return;
    const d = knobs[k];
    values[k] = d.type === "toggle" ? e.target.checked : d.type === "range" ? Number(e.target.value) : e.target.value;
    const o = $(`#o-${k}`, knobsEl); if (o) o.textContent = e.target.value;
    schedule();
  });
  $("#rb-play").addEventListener("click", async () => { await unlock(); if (current) wave.toggle(); });
  await rebuild(false);
}

// ---------- the receipt ----------
function drawReceipt(el, kit, { esc, usd, icon }) {
  if (!el?.isConnected) return;
  const by = {};
  for (const i of kit.items) if (i.price > 0) { by[i.author] ||= { usd: 0, lines: [] }; by[i.author].usd += i.price; by[i.author].lines.push(i); }
  const creators = Object.entries(by).sort((a, b) => b[1].usd - a[1].usd);
  el.innerHTML = `<div class="r-head"><b>${esc(kit.title)}</b><span>${kit.items.length} sounds, ${creators.length} creators</span></div>
    ${creators.map(([who, c]) => `<div class="r-who"><div class="r-name">${esc(who)}<em class="num">${usd(c.usd)}</em></div>${c.lines.map((l) => `<div class="r-line"><span>${esc(l.name)}</span><span class="num">${usd(l.price)}</span></div>`).join("")}</div>`).join("")}
    <div class="r-total"><span>${kit.licence ? "Paid in one PayPal order" : "One PayPal order"}</span><b class="num">${usd(kit.total)}</b></div>
    <div class="r-paypal">${icon("paypal-logo")} ${kit.licence ? `Order ${esc(kit.licence.orderId)}, itemised per part. Shares paid out with PayPal Payouts.` : "Orders v2, itemised per part. Shares paid out with PayPal Payouts."}</div>`;
}

// ---------- the sounds row ----------
// the same card the sounds browser shows (public/kit.js soundCard: the centroid-coloured waveform, play in the corner),
// eight of them from different kits so the row shows the registry's range rather than one kit's
async function drawKitRow(el, { catalog }) {
  const [all, { soundCard, liveSoundCards }] = await Promise.all([catalog(), import("/kit.js")]);
  if (!el.isConnected) return;
  const seen = new Set(), list = [];
  for (const a of all) { if (list.length >= 8) break; if (seen.has(a.kit)) continue; seen.add(a.kit); list.push(a); }
  el.innerHTML = list.map(soundCard).join("");
  liveSoundCards(el);
}
