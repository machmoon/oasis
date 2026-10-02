// Fills scripts/story.tmpl.md with the measured numbers in docs/numbers.json.
import fs from "node:fs";
const n = JSON.parse(fs.readFileSync("docs/numbers.json", "utf8"));
const sandbox = n.ordersCaptured > 0
  ? `- Real sandbox runs: ${n.ordersCaptured} order(s) captured, ${n.payoutBatches} royalty Payouts batch(es), ${n.refunds} refund(s).`
  : "- **Where this stands, plainly:** no sandbox order has been captured on the live deploy yet and no Payouts batch has been sent. Every path above is exercised by the tests against a fake PayPal client. Live counts of orders, verified webhooks and payouts: [oasis-design.onrender.com/#/status](https://oasis-design.onrender.com/#/status).";
let s = fs.readFileSync("scripts/story.tmpl.md", "utf8");
for (const [k, v] of Object.entries({ ...n, sandboxLine: sandbox })) s = s.replaceAll(`{{${k}}}`, String(v));
if (/\{\{/.test(s)) throw new Error("unfilled placeholder: " + s.match(/\{\{[^}]+\}\}/)[0]);
fs.writeFileSync("SUBMISSION.md", "# Oasis\n\n**Tagline:** Design assets built as tiny programs. Your AI agent remixes them into your brand and opens a PayPal order that only you can approve.\n\n" + s);
console.log("SUBMISSION.md written,", s.length, "chars");
