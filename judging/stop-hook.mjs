#!/usr/bin/env node
// Stop hook: a 4-judge panel modelled on the roles of the PayPal AI Hackathon's published judging panel scores Oasis
// against past PayPal hackathon winners and the current XPRIZE winner, on the hackathon's five criteria. Until the
// deadline (and after it, while any reference still beats Oasis with any judge) it blocks stopping and hands Claude
// the panel's fixes.
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { createRequire } from "node:module";

const ROOT = "/Users/patliu/Desktop/Coding/oasis";
const require = createRequire(ROOT + "/package.json");
const Anthropic = require("@anthropic-ai/sdk").default;
require("dotenv").config({ path: ROOT + "/.env" });
const DEADLINE = new Date("2026-10-02T08:30:00-07:00");
const OUT = path.join(ROOT, "judging");
const read = (f) => (fs.existsSync(f) ? fs.readFileSync(f, "utf8") : "");

let input = {};
// The first complete JSON object in a model reply, ignoring any prose or second object after it.
function firstJson(text) {
  const start = text.indexOf("{");
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i >= 0 && i < text.length; i++) {
    const c = text[i];
    if (inStr) { if (esc) esc = false; else if (c === "\\") esc = true; else if (c === '"') inStr = false; continue; }
    if (c === '"') inStr = true;
    else if (c === "{") depth++;
    else if (c === "}" && --depth === 0) return JSON.parse(text.slice(start, i + 1));
  }
  throw new Error("no JSON object in reply");
}
try { input = JSON.parse(fs.readFileSync(0, "utf8") || "{}"); } catch {}

function facts() {
  const sh = (c) => { try { return execSync(c, { cwd: ROOT, encoding: "utf8", timeout: 120000, stdio: ["ignore", "pipe", "pipe"] }).trim(); } catch (e) { return (e.stdout || "").toString().trim() || "failed"; } };
  const live = sh("curl -s -m 20 -o /dev/null -w '%{http_code}' https://oasis-design.onrender.com/api/config");
  const cfg = sh("curl -s -m 20 https://oasis-design.onrender.com/api/config");
  const tests = sh("npm test 2>&1 | grep -E '^ℹ (tests|pass|fail)' | tr '\\n' ' '");
  const assets = fs.readdirSync(path.join(ROOT, "assets")).filter((f) => f.endsWith(".mjs")).length;
  const stats = read(path.join(ROOT, "factory/stats.jsonl")).split("\n").filter(Boolean).map((l) => JSON.parse(l));
  const pub = stats.filter((s) => s.verdict === "published").length;
  const devpost = read(path.join(OUT, "devpost-status.txt")).trim() || "not submitted yet";
  return `Live URL https://oasis-design.onrender.com HTTP ${live}; /api/config ${cfg.slice(0, 200)}
Tests: ${tests}
Catalogue: ${assets} built-in assets. Factory v2 builds logged: ${stats.length}, published ${pub}, rejected ${stats.length - pub}.
Devpost: ${devpost}
Repo: https://github.com/machmoon/oasis (last commit: ${sh("git log -1 --format='%h %s %cr'")})`;
}

function screenshots() {
  // Fresh screenshots of the live (or local) UI so the Design score is earned on pixels, not prose.
  const shotsDir = path.join(OUT, "shots");
  fs.mkdirSync(shotsDir, { recursive: true });
  try {
    execSync(`node ${path.join(OUT, "shoot.mjs")}`, { cwd: ROOT, timeout: 240000, stdio: "ignore" });
  } catch {}
  return fs.existsSync(shotsDir) ? fs.readdirSync(shotsDir).filter((f) => f.endsWith(".png")).sort().map((f) => path.join(shotsDir, f)) : [];
}

const JUDGES = [
  { role: "PayPal Developer Advocate", lens: "You advocate for PayPal's developer platform. You reward projects that make PayPal central and use it correctly and in depth (Orders, approval, capture, webhooks, payouts), that a developer could learn from, and whose demo actually runs." },
  { role: "PayPal Engineering Manager", lens: "You manage a payments engineering team and have judged agentic-app hackathon tracks. You care about correctness and robustness: idempotency, verification, failure handling, security of agent-initiated payments, tests, and whether it is deployed and works end to end." },
  { role: "PayPal Senior Product Manager", lens: "You own a payments product. You care about a real customer problem, a sharp story, potential impact and business viability, a delightful and coherent UX, and evidence (users, numbers) over claims." },
  { role: "Sponsor developer-relations engineer (hosting platform)", lens: "You run devrel for a cloud platform and judge many hackathons. You care about craft and design quality, how well the submission presents and proves itself (live link, video, README, visuals), and creativity." },
];
const CRITERIA = "tech (technological implementation), design (UI/UX, completeness, coherence, visual quality), impact (potential impact), idea (quality and originality of the idea), presentation (how well it communicates and proves itself)";

async function judge(client, j, oasisText, refsText, images) {
  const content = [];
  for (const [label, file] of images) {
    content.push({ type: "text", text: label });
    content.push({ type: "image", source: { type: "base64", media_type: "image/png", data: fs.readFileSync(file).toString("base64") } });
  }
  content.push({ type: "text", text: `=== OASIS (the entry under judgement) ===\n${oasisText}\n\n=== REFERENCE PROJECTS ===\n${refsText}\n\nScore Oasis and each reference R1-R5 on: ${CRITERIA}. Each 1-10, harsh, full range, evidence over claims; a claim with no proof (no live link, placeholder numbers like {{x}}, unsubmitted) scores low. Judge design from the screenshots. Return JSON only:\n{"scores":{"Oasis":{"tech":n,"design":n,"impact":n,"idea":n,"presentation":n},"R1":{...},"R2":{...},"R3":{...},"R4":{...},"R5":{...}},"oasis_rank":n,"verdict":"one sentence","fixes":["the 4 most valuable concrete changes to Oasis, highest impact first"]}` });
  const msg = await client.messages.create({ model: "claude-opus-5-5", max_tokens: 8000, output_config: { effort: "high" }, system: `You are a judge for the PayPal AI Hackathon on Devpost. Your role: ${j.role}. ${j.lens} You are fair, specific and hard to impress.`, messages: [{ role: "user", content }] });
  const text = msg.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  return { judge: j.role, ...firstJson(text) };
}

async function main() {
  const now = new Date();
  const oasisText = `${read(path.join(ROOT, "SUBMISSION.md"))}\n\n--- Verified facts (collected automatically just now) ---\n${facts()}`;
  const refsText = `${read(path.join(OUT, "references.md"))}\n\n${read(path.join(OUT, "polyfork-devpost.md"))}`;
  const shots = screenshots();
  const images = [
    ...shots.map((f) => [`Oasis screenshot: ${path.basename(f, ".png")}`, f]),
    ...fs.readdirSync(path.join(OUT, "refs")).filter((f) => f.endsWith(".png")).map((f) => [`Reference screenshot (R1 Polyfork): ${f}`, path.join(OUT, "refs", f)]),
  ].slice(0, 12);
  const client = new Anthropic();
  const results = await Promise.all(JUDGES.map((j) => judge(client, j, oasisText, refsText, images).catch((e) => ({ judge: j.role, error: e.message }))));
  const total = (s) => (s ? Object.values(s).reduce((a, b) => a + b, 0) : 0);
  const ok = results.filter((r) => r.scores);
  const sum = { Oasis: 0, R1: 0, R2: 0, R3: 0, R4: 0, R5: 0 };
  for (const r of ok) for (const k of Object.keys(sum)) sum[k] += total(r.scores[k]);
  const beaten = Object.keys(sum).filter((k) => k !== "Oasis" && sum[k] >= sum.Oasis);
  const perJudgeLosses = ok.flatMap((r) => Object.keys(sum).filter((k) => k !== "Oasis" && total(r.scores[k]) >= total(r.scores.Oasis)).map((k) => `${k} with ${r.judge}`));
  const lines = [`Panel ${now.toLocaleString("en-US", { timeZone: "America/Los_Angeles" })}: totals ${Object.entries(sum).map(([k, v]) => `${k} ${v}`).join(", ")}`];
  for (const r of results) lines.push(r.error ? `- ${r.judge}: error ${r.error}` : `- ${r.judge}: Oasis ${total(r.scores.Oasis)} ${JSON.stringify(r.scores.Oasis)}; R1 ${total(r.scores.R1)}; ${r.verdict}\n  fixes: ${r.fixes.join(" | ")}`);
  const report = lines.join("\n");
  fs.writeFileSync(path.join(OUT, "latest.md"), report + "\n");
  fs.appendFileSync(path.join(OUT, "history.jsonl"), JSON.stringify({ at: now.toISOString(), sum, results }) + "\n");
  const won = ok.length === JUDGES.length && perJudgeLosses.length === 0;
  if (now < DEADLINE || !won) {
    if (now >= DEADLINE && !won && Number(read(path.join(OUT, ".post-deadline-blocks")) || 0) >= 6) {
      console.log(JSON.stringify({ systemMessage: `Judge panel: ${lines[0]}. Deadline passed; not blocking further.` }));
      return;
    }
    if (now >= DEADLINE) fs.writeFileSync(path.join(OUT, ".post-deadline-blocks"), String((Number(read(path.join(OUT, ".post-deadline-blocks")) || 0) + 1)));
    const why = won ? `Oasis currently beats every reference with every judge, but keep improving until ${DEADLINE.toLocaleTimeString("en-US", { timeZone: "America/Los_Angeles" })} PT.` : `Oasis still loses: ${perJudgeLosses.slice(0, 8).join("; ") || beaten.join(", ")}.`;
    console.log(JSON.stringify({ decision: "block", reason: `${why}\n\n${report}\n\nWork the highest-impact fixes above, verify them, commit and redeploy, then stop again to be re-judged. (Full report: oasis/judging/latest.md)` }));
  } else {
    console.log(JSON.stringify({ systemMessage: `Judge panel: Oasis beats every reference with every judge. ${lines[0]}` }));
  }
}

main().catch((e) => console.log(JSON.stringify({ systemMessage: `judge hook error: ${e.message}` })));
