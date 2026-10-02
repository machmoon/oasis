// Fills scripts/story.tmpl.md with the measured numbers in docs/numbers.json.
import fs from "node:fs";
const n = JSON.parse(fs.readFileSync("docs/numbers.json", "utf8"));
const run = fs.existsSync("docs/SANDBOX-RUN.md") ? fs.readFileSync("docs/SANDBOX-RUN.md", "utf8") : "";
const ids = (re) => [...run.matchAll(re)].map((m) => m[1]);
const sandbox = run
  ? `- **It runs against the real PayPal sandbox** ([docs/SANDBOX-RUN.md](https://github.com/machmoon/oasis/blob/main/docs/SANDBOX-RUN.md), \`npm run sandbox-demo\`): an over-budget agent order refused by the mandate; orders ${ids(/PayPal order (\w+)/g).join(", ")} captured (${ids(/capture (\w+)/g).join(", ")}); refund ${ids(/refund ([A-Z0-9]{10,})/g).join(", ")} revoking the licence (download then returns 410) and returning the budget; and a fork-of-a-fork sale paid upstream as Payouts batch ${ids(/Payouts batch (\w+)/g).join(", ")}. In that run, approval used PayPal's published sandbox test card instead of a person logging in.`
  : "- **Where this stands:** no sandbox order has been captured yet.";
let s = fs.readFileSync("scripts/story.tmpl.md", "utf8");
for (const [k, v] of Object.entries({ ...n, sandboxLine: sandbox })) s = s.replaceAll(`{{${k}}}`, String(v));
if (/\{\{/.test(s)) throw new Error("unfilled placeholder: " + s.match(/\{\{[^}]+\}\}/)[0]);
fs.writeFileSync("SUBMISSION.md", "# Oasis\n\n**Tagline:** Design assets built as tiny programs. Your AI agent remixes them into your brand and opens a PayPal order that only you can approve.\n\n" + s);
console.log("SUBMISSION.md written,", s.length, "chars");
