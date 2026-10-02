// Every number quoted in the submission comes from here: counted from the repo, the test run, the
// factory log and the live store. Nothing is typed by hand.
import fs from "node:fs";
import { execSync } from "node:child_process";
import * as catalog from "../server/catalog.js";

await catalog.load();
const all = catalog.allAssets();
const knobs = all.reduce((s, a) => s + Object.keys(a.params.knobs || {}).length, 0);
const colour = all.flatMap((a) => Object.values(a.params.knobs || {}).filter((k) => k.type === "color"));
const stats = fs.existsSync("factory/stats.jsonl") ? fs.readFileSync("factory/stats.jsonl", "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
const firstGrades = stats.filter((s) => s.grades?.length);
const firstReject = firstGrades.filter((s) => s.grades[0].verdict !== "publish").length;
const harnessCaught = stats.filter((s) => (s.harness?.[0]?.errors || []).length).length;
const lessons = fs.existsSync("factory/lessons.md") ? fs.readFileSync("factory/lessons.md", "utf8").split("\n").filter((l) => l.startsWith("- ")).length : 0;
let tests = "?";
try { const out = execSync("npm test 2>&1", { encoding: "utf8", timeout: 600000 }); const m = out.match(/ℹ pass (\d+)/); const f = out.match(/ℹ fail (\d+)/); tests = `${m?.[1]}/${Number(m?.[1]) + Number(f?.[1] || 0)}`; } catch (e) { const m = String(e.stdout).match(/ℹ pass (\d+)/); tests = `${m?.[1] || 0} (some failing)`; }
let live = {};
try { live = JSON.parse(execSync("curl -s -m 30 https://oasis-design.onrender.com/api/config", { encoding: "utf8" })); } catch {}
const orders = fs.existsSync("data/orders") ? fs.readdirSync("data/orders").map((f) => JSON.parse(fs.readFileSync(`data/orders/${f}`, "utf8"))) : [];
const n = {
  assets: all.length,
  kitAssets: all.filter((a) => a.id === "oasis-town" || a.id.startsWith("iso-")).length,
  knobs,
  colourKnobs: colour.length,
  roleKnobs: colour.filter((k) => k.role).length,
  forks: all.filter((a) => a.forkedFrom).length,
  factoryAuthored: all.filter((a) => a.author === "oasis-factory").length,
  handAuthored: all.filter((a) => a.author === "oasis").length,
  factoryV1: all.filter((a) => a.author === "oasis-factory").length - stats.filter((s) => s.verdict === "published").length,
  factoryBuilds: stats.length,
  factoryPublished: stats.filter((s) => s.verdict === "published").length,
  factoryRejected: stats.filter((s) => s.verdict && s.verdict !== "published").length,
  graderFirstPassReject: firstGrades.length ? `${firstReject} of ${firstGrades.length}` : "n/a",
  harnessCaughtFirstPass: `${harnessCaught} of ${stats.length}`,
  lessons,
  tests,
  liveAssets: live.assets ?? "offline",
  paypalReady: live.paypalReady ?? false,
  agentReady: live.agentReady ?? false,
  ordersCaptured: orders.filter((o) => o.status === "COMPLETED").length,
  payoutBatches: orders.filter((o) => o.payoutBatch?.id).length,
  refunds: orders.filter((o) => o.status === "REFUNDED").length,
};
fs.writeFileSync("judging/numbers.json", JSON.stringify(n, null, 2));
console.log(JSON.stringify(n, null, 2));
