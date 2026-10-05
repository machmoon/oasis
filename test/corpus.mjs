// Corpus checks for the catalogue's sound programs (241 and growing). Each program costs several seconds of
// interpreter time in QuickJS, so run one after another on the main thread these tests took ~18 min and, on a loaded
// machine, tripped the sandbox's production time limit ("build failed: interrupted") as false failures.
//
// What this does, and where each idea comes from:
// - Fan out across the render worker pool (server/pool.js), the way jest's `test.concurrent` (jestjs/jest
//   packages/jest-circus/src/run.ts: concurrent tests go through `pLimit(getState().maxConcurrency)`) and Node's test
//   runner `concurrency` option (nodejs/node lib/internal/test_runner/test.js: a subtest starts only while
//   `this.concurrency > this.activeSubtests`) bound a slow corpus by a concurrency limit. Here the limit is the pool's
//   worker count, since the CPU work happens in worker threads rather than in the test's own event loop.
// - Give the corpus a longer sandbox clock than production (TEST_TIME_LIMIT_MS). The production limits in
//   server/sandbox.js and server/pool.js are unchanged; only these tests pass a longer one.
// - Retry once, with little else running, on a timing error, and report what stays slow as a timing failure apart from correctness
//   failures (the retry is jest's `jest.retryTimes`, jest-circus run.ts `numRetriesAvailable`, limited to one try and
//   to errors that depend on the clock).
// - Cache passing harness reports by content hash, so the full harness only re-runs on changed programs. This is
//   ESLint's `--cache --cache-strategy content` (eslint/eslint lib/cli-engine/lint-result-cache.js): an entry is keyed
//   by the file's content hash and is invalid when the hash of the config (there: ESLint's version + Node's version
//   + the config) changes. Here the "config" is the harness, the sandbox, the DSP kit and the knob resolver.
//   Unlike ESLint we cache passing reports only, so a failing program is always measured afresh.
//   OASIS_TEST_CACHE=0 turns it off (as `eslint` without `--cache`); the file lives in node_modules/.cache/oasis,
//   the find-cache-dir convention babel-loader and ava use.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { harnessInPool, soundInPool } from "../server/pool.js";
import { SOUND_TIME_LIMIT_MS, SOUND_SR } from "../server/sandbox.js";
import { SLOW_RENDER_MS } from "../factory/harness-sound.mjs";
import os from "node:os";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
export const TEST_TIME_LIMIT_MS = SOUND_TIME_LIMIT_MS * 4;
// The pool's wall clock only guards against a hung worker here; the sandbox's own interrupt is the real limit.
const SOUND_DEADLINE = TEST_TIME_LIMIT_MS + 5000;
const HARNESS_DEADLINE = 10 * 60 * 1000;

const RETRY_CONCURRENCY = 1;
/** Runs fn over items with at most n in flight (p-limit's contract, as jest-circus uses it). */
async function limit(n, items, fn) {
  const queue = [...items];
  await Promise.all(Array.from({ length: Math.min(n, queue.length) }, async () => { while (queue.length) await fn(queue.shift()); }));
}

// The harness's "too slow" gate is wall clock, so on a busy machine a program that is well inside it when idle can
// cross it. The test applies the gate to the faster of the two attempts, scaled by how busy the machine is right now
// (1-minute load average per core): exactly SLOW_RENDER_MS when idle, 1.5x at load 5 on ten cores and above. An interrupted
// render (the 4x test time limit above) is never excused.
// Capped at 1.5x: the load average lags, and just after the fan-out it still counts this test's own workers.
export const slowAllowance = () => Math.min(1.5, 1 + Math.max(0, os.loadavg()[0]) / os.availableParallelism());

/** Errors that depend on wall clock rather than on what the program computes. */
export const isTiming = (msg) => /interrupted|render exceeded|too slow/.test(msg);

const sha = (s) => crypto.createHash("sha256").update(s).digest("hex");
const CONFIG_HASH = sha([process.version, TEST_TIME_LIMIT_MS, ...["factory/harness-sound.mjs", "server/sandbox.js", "public/sound-dsp.js", "server/knobs.js"].map((f) => fs.readFileSync(path.join(ROOT, f), "utf8"))].join("\0"));
const CACHE_FILE = path.join(ROOT, "node_modules/.cache/oasis/sound-harness.json");
const useCache = process.env.OASIS_TEST_CACHE !== "0";

function readCache() {
  if (!useCache) return {};
  try {
    const c = JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));
    return c.config === CONFIG_HASH ? c.entries : {};
  } catch { return {}; }
}
function writeCache(entries) {
  if (!useCache) return;
  try {
    fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
    const tmp = `${CACHE_FILE}.${process.pid}`;
    fs.writeFileSync(tmp, JSON.stringify({ config: CONFIG_HASH, entries }));
    fs.renameSync(tmp, CACHE_FILE);
  } catch {}
}

/**
 * Runs the harness over every sound. Returns { correctness, timing, notes (excused slow renders), cached, measured }.
 * A program whose only errors are timing errors is re-measured once on its own; whatever is still slow after that
 * goes in `timing`, everything else in `correctness`.
 */
export async function harnessCorpus(sounds) {
  const cache = readCache(), next = {};
  const correctness = [], timing = [];
  let cached = 0;
  const todo = [];
  for (const a of sounds) {
    const h = sha(a.source);
    if (cache[h]) { next[h] = true; cached++; } else todo.push({ a, h });
  }
  const reports = await Promise.all(todo.map(({ a }) => harnessInPool(a.source, { timeLimit: TEST_TIME_LIMIT_MS, deadline: HARNESS_DEADLINE }).catch((e) => ({ errors: [`harness: ${e.message}`] }))));
  // Retry timing failures once, after the fan-out has drained and one at a time, so a retry isn't
  // competing with a full pool (on Apple silicon a busy pool spills onto the efficiency cores, which alone can push a
  // render past the harness's 2.5 s "too slow" gate).
  const retry = todo.map((x, i) => (reports[i].errors.some(isTiming) ? i : -1)).filter((i) => i >= 0);
  const notes = [];
  await limit(RETRY_CONCURRENCY, retry, async (i) => {
    const first = reports[i];
    const again = await harnessInPool(todo[i].a.source, { timeLimit: TEST_TIME_LIMIT_MS, deadline: HARNESS_DEADLINE }).catch((e) => ({ errors: [`harness: ${e.message}`] }));
    const best = Math.min(first.slowestMs ?? Infinity, again.slowestMs ?? Infinity), gate = Math.round(SLOW_RENDER_MS * slowAllowance());
    const onlyGate = again.errors.filter(isTiming).every((e) => /too slow/.test(e));
    if (onlyGate && again.errors.some((e) => /too slow/.test(e)) && best <= gate) {
      again.errors = again.errors.filter((e) => !/too slow/.test(e));
      notes.push(`${todo[i].a.id}: worst render ${best} ms, over the ${SLOW_RENDER_MS} ms gate but inside ${gate} ms at load ${os.loadavg()[0].toFixed(1)}`);
    }
    reports[i] = again;
  });
  for (let i = 0; i < todo.length; i++) {
    const { a, h } = todo[i];
    const errors = reports[i].errors;
    const slow = errors.filter(isTiming), wrong = errors.filter((e) => !isTiming(e));
    if (wrong.length) correctness.push(`${a.id}: ${wrong.join(" | ")}`);
    if (slow.length) timing.push(`${a.id}: ${slow.join(" | ")}`);
    if (!errors.length) next[h] = true;
  }
  writeCache(next);
  return { correctness, timing, notes, cached, measured: todo.length };
}

/** Renders every sound once at its defaults across the pool; retries a timed-out render once. */
export async function renderCorpus(sounds, valuesOf, check) {
  const one = (a) => soundInPool(a.source, valuesOf(a), SOUND_SR, { timeLimit: TEST_TIME_LIMIT_MS, deadline: SOUND_DEADLINE });
  const failures = [], timing = [];
  await Promise.all(sounds.map(async (a) => {
    let s;
    try { s = await one(a); } catch (e) {
      if (!isTiming(e.message)) { failures.push(`${a.id}: ${e.message}`); return; }
      try { s = await one(a); } catch (e2) { (isTiming(e2.message) ? timing : failures).push(`${a.id}: ${e2.message}`); return; }
    }
    const why = check(a, s);
    if (why) failures.push(`${a.id}: ${why}`);
  }));
  return { failures, timing };
}
