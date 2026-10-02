// One QuickJS renderer per worker thread; the HTTP render path fans out across these.
import { parentPort } from "node:worker_threads";
import { renderSource, inspect } from "./sandbox.js";

parentPort.on("message", ({ id, op, source, values }) => {
  try {
    if (op === "inspect") parentPort.postMessage({ id, svg: inspect(source) });
    else parentPort.postMessage({ id, svg: renderSource(source, values) });
  } catch (e) {
    parentPort.postMessage({ id, error: e.message });
  }
});
