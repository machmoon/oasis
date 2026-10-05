// Runs an asset program inside QuickJS (WebAssembly), so community and AI-written programs
// never touch Node: no require, no fs, no network, a memory cap and a hard time limit.
import fs from "node:fs";
import { getQuickJS, shouldInterruptAfterDeadline } from "quickjs-emscripten";
import { validateParts, projectSvg } from "./blocks.js";

const QJS = await getQuickJS();
const MEMORY_LIMIT = 48 * 1024 * 1024;
const TIME_LIMIT_MS = 1500;
// Sound programs run per-sample loops in an interpreter: a 2 s render at 22.05 kHz needs more wall clock than an SVG
// (measured in QuickJS, see test/sound.test.mjs and the README's numbers; V8 does the same work in a few ms).
export const SOUND_TIME_LIMIT_MS = 6000;
export const SOUND_MAX_SECONDS = 4;
export const SOUND_SR = 22050;
// The DSP kit the program's build(knobs, ctx) receives: the same file the browser and the CDN import.
const DSP_SOURCE = fs.readFileSync(new URL("../public/sound-dsp.js", import.meta.url), "utf8");

export class AssetError extends Error {}

function withModule(source, fn, { timeLimit = TIME_LIMIT_MS, modules = null } = {}) {
  const rt = QJS.newRuntime();
  rt.setMemoryLimit(MEMORY_LIMIT);
  rt.setMaxStackSize(1024 * 1024);
  rt.setInterruptHandler(shouldInterruptAfterDeadline(Date.now() + timeLimit));
  // Only the names the host registers resolve; an asset's own `import` of anything else fails to load.
  if (modules) rt.setModuleLoader((name) => { if (!(name in modules)) throw new Error(`import of "${name}" is not allowed`); return modules[name]; });
  const vm = rt.newContext();
  try {
    const res = vm.evalCode(source, "asset.mjs", { type: "module" });
    if (res.error) {
      const err = vm.dump(res.error);
      res.error.dispose();
      throw new AssetError(`module failed to load: ${err?.message || JSON.stringify(err)}`);
    }
    const ns = res.value;
    try {
      return fn(vm, ns);
    } finally {
      ns.dispose();
    }
  } finally {
    vm.dispose();
    rt.dispose();
  }
}

function getJson(vm, ns, name) {
  const h = vm.getProp(ns, name);
  try {
    return vm.typeof(h) === "undefined" ? undefined : vm.dump(h);
  } finally {
    h.dispose();
  }
}

/** Reads `meta` and `params` without rendering. */
export function inspect(source) {
  return withModule(source, (vm, ns) => ({
    meta: getJson(vm, ns, "meta") || {},
    params: getJson(vm, ns, "params") || { knobs: {} },
  }));
}

// Calls one exported function with the resolved knob values and returns its plain result.
function callExport(vm, ns, name, values) {
  const fn = vm.getProp(ns, name);
  try {
    if (vm.typeof(fn) !== "function") return { missing: true };
    const json = vm.newString(JSON.stringify(values));
    const parse = vm.getProp(vm.global, "JSON");
    const parseFn = vm.getProp(parse, "parse");
    const arg = vm.unwrapResult(vm.callFunction(parseFn, parse, json));
    json.dispose(); parseFn.dispose(); parse.dispose();
    const out = vm.callFunction(fn, vm.undefined, arg);
    arg.dispose();
    if (out.error) {
      const err = vm.dump(out.error);
      out.error.dispose();
      throw new AssetError(`${name} failed: ${err?.message || JSON.stringify(err)}`);
    }
    const value = vm.dump(out.value);
    out.value.dispose();
    return { value };
  } finally {
    fn.dispose();
  }
}

/** Block assets: calls build(p) and returns validated parts (see server/blocks.js). */
export function buildSource(source, values) {
  return withModule(source, (vm, ns) => {
    const r = callExport(vm, ns, "build", values);
    if (r.missing) throw new AssetError("module has no build function");
    try { return validateParts(r.value); } catch (e) { throw new AssetError(e.message); }
  });
}

/** Returns an asset's SVG: its own render(p), or for block assets, an isometric projection of build(p). */
export function renderSource(source, values, opts = {}) {
  return withModule(source, (vm, ns) => {
    let r = callExport(vm, ns, "default", values);
    if (r.missing) {
      const b = callExport(vm, ns, "build", values);
      if (b.missing) throw new AssetError("module has no default render function or build function");
      let parts;
      try { parts = validateParts(b.value); } catch (e) { throw new AssetError(e.message); }
      const meta = getJson(vm, ns, "meta") || {};
      const [w, h] = meta.size || [1200, 1200];
      return projectSvg(parts, { width: w, height: h, background: values.backdrop || meta.background || "#E9ECF1", night: opts.night || values.time === "night" });
    }
    const svg = r.value;
    if (typeof svg !== "string" || !svg.trimStart().startsWith("<svg")) throw new AssetError("render must return an <svg> string");
    return svg;
  });
}

// ---------- sound programs ----------
// The asset and the DSP kit are two modules the host registers; a driver module runs build(values, ctx), checks the
// result and hands back the raw Float32Array buffer (no per-sample handles cross the sandbox boundary).
const SOUND_DRIVER = `
import * as dsp from "oasis:dsp";
import * as asset from "oasis:asset";
Math.random = () => { throw new Error("Math.random is not allowed: derive variation from the seed knob (ctx.rng)"); };
export const meta = asset.meta;
export const params = asset.params;
export function render(values, sr, maxSeconds) {
  if (typeof asset.build !== "function") throw new Error("module has no build function");
  const out = asset.build(values, { sr, ...dsp });
  const s = out && (out.samples || (out.length !== undefined ? out : null));
  if (!s || !s.length) throw new Error("build() must return { samples: Float32Array } (mono, -1..1)");
  if (s.length > maxSeconds * sr) throw new Error("sound is longer than " + maxSeconds + " s");
  const f = s instanceof Float32Array ? s : Float32Array.from(s);
  for (let i = 0; i < f.length; i++) if (!Number.isFinite(f[i])) throw new Error("sample " + i + " is not a finite number");
  return f.buffer;
}
`;

/** Runs a sound program: build(values, dsp) at sample rate sr; returns Float32Array samples (mono, -1..1). */
// timeLimit defaults to the production limit; only the corpus tests pass a longer one (see test/corpus.mjs).
export function renderSound(source, values, { sr = SOUND_SR, maxSeconds = SOUND_MAX_SECONDS, timeLimit = SOUND_TIME_LIMIT_MS } = {}) {
  return withModule(SOUND_DRIVER, (vm, ns) => {
    const fn = vm.getProp(ns, "render");
    const json = vm.newString(JSON.stringify(values));
    const parse = vm.getProp(vm.global, "JSON");
    const parseFn = vm.getProp(parse, "parse");
    const arg = vm.unwrapResult(vm.callFunction(parseFn, parse, json));
    const srH = vm.newNumber(sr), maxH = vm.newNumber(maxSeconds);
    json.dispose(); parseFn.dispose(); parse.dispose();
    const out = vm.callFunction(fn, vm.undefined, arg, srH, maxH);
    arg.dispose(); srH.dispose(); maxH.dispose(); fn.dispose();
    if (out.error) {
      const err = vm.dump(out.error);
      out.error.dispose();
      throw new AssetError(`build failed: ${err?.message || JSON.stringify(err)}`);
    }
    try {
      const ab = vm.getArrayBuffer(out.value);
      try { return new Float32Array(ab.value.buffer.slice(ab.value.byteOffset, ab.value.byteOffset + ab.value.byteLength)); } finally { ab.dispose(); }
    } finally { out.value.dispose(); }
  }, { timeLimit, modules: { "oasis:dsp": DSP_SOURCE, "oasis:asset": source } });
}
