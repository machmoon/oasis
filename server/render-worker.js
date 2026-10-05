// One QuickJS renderer per worker thread; the HTTP render path fans out across these.
import { parentPort } from "node:worker_threads";
import { renderSource, inspect, buildSource, renderSound } from "./sandbox.js";
import { measure } from "../factory/harness-sound.mjs";

parentPort.on("message", ({ id, op, source, values, opts }) => {
  try {
    if (op === "inspect") parentPort.postMessage({ id, svg: inspect(source) });
    // the publish check: the factory's harness (fifteen-odd sandbox renders) off the main thread
    else if (op === "harness") parentPort.postMessage({ id, svg: measure(source) });
    else if (op === "build") parentPort.postMessage({ id, svg: buildSource(source, values) });
    else if (op === "sound") { const s = renderSound(source, values, opts?.sr ? { sr: opts.sr } : {}); parentPort.postMessage({ id, svg: s }, [s.buffer]); }
    else parentPort.postMessage({ id, svg: renderSource(source, values, opts || {}) });
  } catch (e) {
    parentPort.postMessage({ id, error: e.message });
  }
});
