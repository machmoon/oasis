// The harness measures a finished asset and contradicts the builder when it's wrong. It renders the
// program across its whole knob space and checks facts a model can't talk its way around.
import { Resvg } from "@resvg/resvg-js";
import { inspect, renderSource } from "../server/sandbox.js";
import { resolveKnobs, applyPreset, brandKnobs } from "../server/knobs.js";

const W = 160;
function raster(svg) {
  const img = new Resvg(svg, { fitTo: { mode: "width", value: W }, font: { loadSystemFonts: true } }).render();
  return { px: img.pixels, w: img.width, h: img.height };
}
function diff(a, b) {
  if (a.w !== b.w || a.h !== b.h) return 1;
  let d = 0;
  for (let i = 0; i < a.px.length; i += 4) d += Math.abs(a.px[i] - b.px[i]) + Math.abs(a.px[i + 1] - b.px[i + 1]) + Math.abs(a.px[i + 2] - b.px[i + 2]);
  return d / ((a.px.length / 4) * 765);
}
function variance(r) {
  let s = 0, s2 = 0, n = r.px.length / 4;
  for (let i = 0; i < r.px.length; i += 4) { const l = 0.299 * r.px[i] + 0.587 * r.px[i + 1] + 0.114 * r.px[i + 2]; s += l; s2 += l * l; }
  return s2 / n - (s / n) ** 2;
}
function seeded(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const invert = (h) => "#" + [1, 3, 5].map((i) => (255 - parseInt(h.slice(i, i + 2), 16)).toString(16).padStart(2, "0")).join("");

export const BRAND_PROBES = {
  light: { background: "#F5EBDD", ink: "#0E3B43", primary: "#0E7C7B", secondary: "#FF7A59", highlight: "#FFC857" },
  dark: { background: "#0D0F14", ink: "#F4F6FA", primary: "#B4FF39", secondary: "#6C5CE7", highlight: "#00D1FF" },
};

export function measure(src) {
  const report = { errors: [], warnings: [], renders: 0, slowestMs: 0, svgBytes: 0, deadKnobs: [], knobs: 0, colourKnobs: 0, rolelessColours: [] };
  let meta, params;
  try { ({ meta, params } = inspect(src)); } catch (e) { report.errors.push(`does not load: ${e.message}`); return report; }
  const knobs = Object.entries(params.knobs || {});
  report.knobs = knobs.length;
  let lastSvg = "";
  const run = (input, label) => {
    const values = resolveKnobs(params, input);
    const t = performance.now();
    let svg;
    try { svg = renderSource(src, values); } catch (e) { report.errors.push(`${label}: ${e.message}`); return null; }
    const ms = performance.now() - t;
    report.renders++;
    report.slowestMs = Math.max(report.slowestMs, Math.round(ms));
    report.svgBytes = Math.max(report.svgBytes, svg.length);
    lastSvg = svg;
    if (/<script|foreignObject|href="http/i.test(svg)) report.errors.push(`${label}: forbidden content in SVG`);
    try { return raster(svg); } catch (e) { report.errors.push(`${label}: invalid SVG (${e.message})`); return null; }
  };
  const base = run({}, "defaults");
  if (!base) return report;
  const baseSvg = lastSvg;
  if (variance(base) < 15) report.errors.push("defaults render nearly blank");
  for (const name of Object.keys(params.presets || {})) run(applyPreset(params, name), `preset ${name}`);
  const lo = {}, hi = {};
  for (const [n, k] of knobs) if (k.type === "range") { lo[n] = k.min; hi[n] = k.max; }
  run(lo, "all ranges at min");
  run(hi, "all ranges at max");
  const r = seeded(7);
  for (let i = 0; i < 6; i++) {
    const inp = {};
    for (const [n, k] of knobs) {
      if (k.type === "range") inp[n] = k.min + r() * (k.max - k.min);
      else if (k.type === "choice") inp[n] = k.options[Math.floor(r() * k.options.length)];
      else if (k.type === "toggle") inp[n] = r() > 0.5;
    }
    run(inp, `random combination ${i + 1}`);
  }
  // Every knob must visibly change the output somewhere in its range.
  for (const [n, k] of knobs) {
    let alts = [];
    if (k.type === "range") alts = [{ [n]: k.min }, { [n]: k.max }];
    else if (k.type === "choice") alts = k.options.filter((o) => o !== k.default).slice(0, 3).map((o) => ({ [n]: o }));
    else if (k.type === "toggle") alts = [{ [n]: !k.default }];
    else if (k.type === "color") alts = [{ [n]: invert(k.default) }];
    else if (k.type === "text") alts = [{ [n]: "Zebra Quartz 42" }];
    if (k.type === "color") { report.colourKnobs++; if (!k.role) report.rolelessColours.push(n); }
    let best = 0, changed = false;
    for (const a of alts) { const out = run(a, `knob ${n}`); if (out) { best = Math.max(best, diff(base, out)); if (lastSvg !== baseSvg) changed = true; } }
    if (!changed) {
      // Conditional knobs (an accent that only shows with terraces on) count if some context reveals them.
      const contexts = [];
      const flipped = {};
      for (const [m, kk] of knobs) if (kk.type === "toggle" && m !== n) flipped[m] = !kk.default;
      contexts.push(flipped);
      for (const [m, kk] of knobs) if (kk.type === "choice" && m !== n) for (const o of kk.options) if (o !== kk.default) contexts.push({ [m]: o });
      for (const ctx of contexts.slice(0, 12)) {
        run(ctx, `context for ${n}`);
        const ctxSvg = lastSvg;
        for (const a of alts) { run({ ...ctx, ...a }, `knob ${n} in context`); if (lastSvg !== ctxSvg) { changed = true; break; } }
        if (changed) break;
      }
      if (changed) (report.conditionalKnobs ||= []).push(n);
      else report.deadKnobs.push(n);
    }
    else if (best < 0.0005) (report.subtleKnobs ||= []).push(n);
  }
  for (const [label, b] of Object.entries(BRAND_PROBES)) run(brandKnobs(params, b), `brand ${label}`);
  if (report.slowestMs > 700) report.errors.push(`too slow: ${report.slowestMs} ms worst render`);
  else if (report.slowestMs > 300) report.warnings.push(`slow: ${report.slowestMs} ms worst render`);
  if (report.svgBytes > 1_500_000) report.errors.push(`SVG too large: ${(report.svgBytes / 1e6).toFixed(1)} MB`);
  if (report.deadKnobs.length) report.errors.push(`knobs with no visible effect: ${report.deadKnobs.join(", ")}`);
  if (report.knobs < 5) report.errors.push(`only ${report.knobs} knobs`);
  if (report.subtleKnobs?.length) report.warnings.push(`knobs with very subtle effect: ${report.subtleKnobs.join(", ")}`);
  if (report.rolelessColours.length) report.warnings.push(`colour knobs without a brand role: ${report.rolelessColours.join(", ")}`);
  return report;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const fs = await import("node:fs");
  let pass = 0, n = 0;
  for (const f of fs.readdirSync("assets").filter((f) => f.endsWith(".mjs"))) {
    const rep = measure(fs.readFileSync(`assets/${f}`, "utf8"));
    n++;
    if (!rep.errors.length) pass++;
    console.log(`${rep.errors.length ? "FAIL" : "ok  "} ${f.padEnd(28)} ${rep.renders} renders, worst ${rep.slowestMs}ms ${rep.errors.join(" | ")} ${rep.warnings.join(" | ")}`);
  }
  console.log(`\n${pass}/${n} pass the harness`);
}
