// One QuickJS renderer per worker thread; the HTTP render path fans out across these.
import { parentPort } from "node:worker_threads";
import { renderSource, inspect, buildSource } from "./sandbox.js";

parentPort.on("message", ({ id, op, source, values, opts }) => {
  try {
    if (op === "inspect") parentPort.postMessage({ id, svg: inspect(source) });
    else if (op === "build") parentPort.postMessage({ id, svg: buildSource(source, values) });
    else parentPort.postMessage({ id, svg: renderSource(source, values, opts || {}) });
  } catch (e) {
    parentPort.postMessage({ id, error: e.message });
  }
});
