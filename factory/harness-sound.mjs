// The sound harness: renders a program across its knob space in the real sandbox and measures what a model can't
// talk its way around: length, peak, RMS, silence, clipping, that every knob audibly changes the render, that seeds
// give distinct takes of the same sound, and the CPU cost in the interpreter. Same role as factory/harness.mjs for
// SVG assets; the numbers come from public/sound-dsp.js analyse(), which the pages draw from too.
import { inspect, renderSound, SOUND_SR } from "../server/sandbox.js";
import { resolveKnobs } from "../server/knobs.js";
import { analyse } from "../public/sound-dsp.js";

const seeded = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

/** Normalised cross-correlation at zero lag over the shorter length: 1 is the same take, ~0 unrelated. */
function similarity(a, b) {
  const n = Math.min(a.length, b.length); let ab = 0, aa = 0, bb = 0;
  for (let i = 0; i < n; i++) { ab += a[i] * b[i]; aa += a[i] * a[i]; bb += b[i] * b[i]; }
  return aa && bb ? ab / Math.sqrt(aa * bb) : 1;
}
/** How different two renders are, as a designer would hear it: level, brightness, envelope shape, length. */
function distance(x, y) {
  const d = Math.abs(Math.log((x.rms + 1e-4) / (y.rms + 1e-4))) + Math.abs(Math.log((x.centroid + 50) / (y.centroid + 50))) + Math.abs(Math.log((x.seconds + 0.01) / (y.seconds + 0.01)));
  let shape = 0; const n = Math.min(x.wave.length, y.wave.length);
  for (let i = 0; i < n; i++) shape += Math.abs((x.wave[i][1] - x.wave[i][0]) - (y.wave[i][1] - y.wave[i][0]));
  return d + shape / n * 4;
}

export function measure(src, { sr = SOUND_SR } = {}) {
  // knobEffects: one row per knob with the loudest-changing extreme and how far it moved, so the publish page can
  // offer a play button per knob and say what the harness heard.
  const report = { errors: [], warnings: [], renders: 0, slowestMs: 0, knobs: 0, deadKnobs: [], subtleKnobs: [], knobEffects: [], seedSimilarity: null, defaults: null };
  let meta, params;
  try { ({ meta, params } = inspect(src)); } catch (e) { report.errors.push(`does not load: ${e.message}`); return report; }
  if (meta.format !== "sound") report.errors.push('meta.format must be "sound"');
  if (!["sfx", "ambience", "ui", "impact", "foley", "music-loop"].includes(meta.kind)) report.errors.push(`meta.kind "${meta.kind}" is not a sound kind`);
  const knobs = Object.entries(params.knobs || {});
  report.knobs = knobs.length;
  if (!params.knobs?.seed || params.knobs.seed.type !== "range") report.errors.push("a seed range knob is required");
  const run = (input, label) => {
    const values = resolveKnobs(params, input);
    const t = performance.now();
    let s;
    try { s = renderSound(src, values, { sr }); } catch (e) { report.errors.push(`${label}: ${e.message}`); return null; }
    const ms = performance.now() - t;
    report.renders++;
    report.slowestMs = Math.max(report.slowestMs, Math.round(ms));
    const a = analyse(s, sr, { cols: 48, bins: 24 });
    a.samples = s;
    if (a.clipped > 0) report.errors.push(`${label}: ${a.clipped} clipped samples`);
    if (a.peak < 0.3) report.errors.push(`${label}: too quiet (peak ${a.peak})`);
    if (a.rms < 0.015) report.errors.push(`${label}: nearly silent (rms ${a.rms})`);
    const quietCap = meta.kind === "ambience" || meta.kind === "music-loop" ? 0.08 : 0.7;
    if (a.silence > quietCap) report.errors.push(`${label}: ${Math.round(a.silence * 100)}% of the buffer is silent`);
    const tail = Math.max(Math.abs(s[s.length - 1]), Math.abs(s[s.length - 2]));
    if (tail > 0.02) report.warnings.push(`${label}: ends on a click (last sample ${tail.toFixed(3)})`);
    if (!Number.isNaN(a.centroid) && a.centroid === 0) report.errors.push(`${label}: no spectral content`);
    return a;
  };
  const base = run({}, "defaults");
  if (!base) return report;
  report.defaults = { seconds: +base.seconds.toFixed(3), peak: base.peak, rms: base.rms, centroid: base.centroid, silence: base.silence };
  if (meta.duration && Math.abs(base.seconds - meta.duration) > Math.max(0.15, meta.duration * 0.5)) report.warnings.push(`meta.duration ${meta.duration}s but the default render is ${base.seconds.toFixed(2)}s`);
  // every knob must audibly change the render at an extreme
  for (const [n, k] of knobs) {
    if (n === "seed") continue;
    let alts = [];
    if (k.type === "range") alts = [{ [n]: k.min }, { [n]: k.max }];
    else if (k.type === "choice") alts = k.options.filter((o) => o !== k.default).slice(0, 3).map((o) => ({ [n]: o }));
    else if (k.type === "toggle") alts = [{ [n]: !k.default }];
    let best = 0, bestAlt = alts[0] || {};
    for (const alt of alts) { const out = run(alt, `knob ${n}`); if (out) { const d = distance(base, out); if (d > best) { best = d; bestAlt = alt; } } }
    report.knobEffects.push({ knob: n, label: k.label || n, type: k.type, alt: bestAlt, distance: +best.toFixed(3), dead: best < 0.03, subtle: best >= 0.03 && best < 0.12 });
    if (best < 0.03) report.deadKnobs.push(n);
    else if (best < 0.12) report.subtleKnobs.push(n);
  }
  // seeds: distinct takes that are still the same sound
  if (params.knobs?.seed) {
    const takes = [base, ...[2, 3, 4].map((seed) => run({ seed: params.knobs.seed.min + seed * 7 }, `seed ${seed}`)).filter(Boolean)];
    let maxSim = 0, maxDist = 0;
    for (let i = 1; i < takes.length; i++) { maxSim = Math.max(maxSim, similarity(takes[0].samples, takes[i].samples)); maxDist = Math.max(maxDist, distance(takes[0], takes[i])); }
    report.seedSimilarity = +maxSim.toFixed(3);
    report.seedDistance = +maxDist.toFixed(3);
    if (takes.length > 1 && maxSim > 0.995) report.errors.push(`seeds do not change the take (waveform correlation ${maxSim.toFixed(3)})`);
    if (maxDist > 1.6) report.warnings.push(`seeds change the sound a lot (distance ${maxDist.toFixed(2)}); takes should stay the same sound`);
  }
  // random combinations, and the slowest render overall
  const r = seeded(11);
  for (let i = 0; i < 4; i++) {
    const inp = {};
    for (const [n, k] of knobs) {
      if (k.type === "range") inp[n] = k.min + r() * (k.max - k.min);
      else if (k.type === "choice") inp[n] = k.options[Math.floor(r() * k.options.length)];
      else if (k.type === "toggle") inp[n] = r() > 0.5;
    }
    run(inp, `random combination ${i + 1}`);
  }
  if (report.slowestMs > 2500) report.errors.push(`too slow: ${report.slowestMs} ms worst render in the sandbox`);
  else if (report.slowestMs > 1000) report.warnings.push(`slow: ${report.slowestMs} ms worst render`);
  if (report.deadKnobs.length) report.errors.push(`knobs with no audible effect: ${report.deadKnobs.join(", ")}`);
  if (report.subtleKnobs.length) report.warnings.push(`knobs with a subtle effect: ${report.subtleKnobs.join(", ")}`);
  if (report.knobs < 4) report.errors.push(`only ${report.knobs} knobs`);
  if (report.knobs > 9) report.warnings.push(`${report.knobs} knobs is a lot`);
  // the error list is deduplicated: one message per failure kind, with the first label
  report.errors = [...new Set(report.errors)].slice(0, 12);
  report.warnings = [...new Set(report.warnings)].slice(0, 12);
  return report;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const fs = await import("node:fs");
  const dir = process.argv[2] || "sounds";
  let pass = 0, n = 0;
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(".mjs"))) {
    const rep = measure(fs.readFileSync(`${dir}/${f}`, "utf8"));
    n++;
    if (!rep.errors.length) pass++;
    console.log(`${rep.errors.length ? "FAIL" : "ok  "} ${f.padEnd(28)} ${rep.renders} renders, worst ${rep.slowestMs}ms, seeds sim ${rep.seedSimilarity} ${JSON.stringify(rep.defaults)} ${rep.errors.join(" | ")} ${rep.warnings.join(" | ")}`);
  }
  console.log(`\n${pass}/${n} pass the harness`);
}
