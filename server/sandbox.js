// Runs an asset program inside QuickJS (WebAssembly), so community and AI-written programs
// never touch Node: no require, no fs, no network, a memory cap and a hard time limit.
import { getQuickJS, shouldInterruptAfterDeadline } from "quickjs-emscripten";

const QJS = await getQuickJS();
const MEMORY_LIMIT = 48 * 1024 * 1024;
const TIME_LIMIT_MS = 1500;

export class AssetError extends Error {}

function withModule(source, fn) {
  const rt = QJS.newRuntime();
  rt.setMemoryLimit(MEMORY_LIMIT);
  rt.setMaxStackSize(1024 * 1024);
  rt.setInterruptHandler(shouldInterruptAfterDeadline(Date.now() + TIME_LIMIT_MS));
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

/** Calls the module's default export with resolved knob values and returns its SVG. */
export function renderSource(source, values) {
  return withModule(source, (vm, ns) => {
    const fn = vm.getProp(ns, "default");
    try {
      if (vm.typeof(fn) !== "function") throw new AssetError("module has no default render function");
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
        throw new AssetError(`render failed: ${err?.message || JSON.stringify(err)}`);
      }
      const svg = vm.dump(out.value);
      out.value.dispose();
      if (typeof svg !== "string" || !svg.trimStart().startsWith("<svg")) throw new AssetError("render must return an <svg> string");
      return svg;
    } finally {
      fn.dispose();
    }
  });
}
