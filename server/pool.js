// A small worker pool so concurrent thumbnail renders don't queue behind each other on the main thread.
import { Worker } from "node:worker_threads";
import os from "node:os";

const SIZE = Number(process.env.OASIS_RENDER_WORKERS) || Math.max(1, Math.min(6, os.availableParallelism() - 1));
const workers = [];
const queue = [];
const pending = new Map();
let seq = 0;

function spawn() {
  const w = new Worker(new URL("./render-worker.js", import.meta.url));
  w.busy = false;
  w.on("message", ({ id, svg, error }) => {
    const p = pending.get(id);
    if (!p) return;
    clearTimeout(p.timer);
    pending.delete(id);
    w.busy = false;
    if (error) p.reject(Object.assign(new Error(error), { status: 422 }));
    else p.resolve(svg);
    pump();
  });
  w.on("error", (e) => {
    console.error("render worker died", e);
    workers.splice(workers.indexOf(w), 1);
    workers.push(spawn());
  });
  return w;
}

const DEADLINE_MS = 3000;

function pump() {
  for (const w of workers) {
    if (!queue.length) return;
    if (w.busy) continue;
    const job = queue.shift();
    w.busy = true;
    pending.set(job.id, job);
    // QuickJS's own interrupt can't fire while a program thrashes the allocator, so the wall clock is
    // enforced from outside: a render that overruns gets its whole worker terminated and replaced.
    job.timer = setTimeout(() => {
      if (!pending.has(job.id)) return;
      pending.delete(job.id);
      job.reject(Object.assign(new Error(`render exceeded ${DEADLINE_MS} ms`), { status: 422 }));
      workers.splice(workers.indexOf(w), 1);
      w.removeAllListeners();
      w.terminate();
      workers.push(spawn());
      pump();
    }, DEADLINE_MS);
    w.postMessage({ id: job.id, op: job.op, source: job.source, values: job.values });
  }
}

export function renderInPool(source, values) {
  if (!workers.length) for (let i = 0; i < SIZE; i++) workers.push(spawn());
  return new Promise((resolve, reject) => {
    queue.push({ id: ++seq, source, values, resolve, reject });
    pump();
  });
}

/** Reads meta and params of an untrusted program off the main thread, under the same deadline. */
export function inspectInPool(source) {
  if (!workers.length) for (let i = 0; i < SIZE; i++) workers.push(spawn());
  return new Promise((resolve, reject) => {
    queue.push({ id: ++seq, op: "inspect", source, resolve, reject });
    pump();
  });
}

/** Block assets: build(p) off the main thread, under the same deadline. Resolves to validated parts. */
export function buildInPool(source, values) {
  if (!workers.length) for (let i = 0; i < SIZE; i++) workers.push(spawn());
  return new Promise((resolve, reject) => {
    queue.push({ id: ++seq, op: "build", source, values, resolve, reject });
    pump();
  });
}
