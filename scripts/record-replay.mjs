// Records one real agent run from a running Oasis server into public/replays/<name>.json, event for event, so
// the agent page can replay it when the live agent is off. Run: node scripts/record-replay.mjs [name] [base]
import fs from "node:fs";

const name = process.argv[2] || "tidepool";
const BASE = process.argv[3] || "http://localhost:8787";
const brief = process.env.BRIEF || "I'm launching Tidepool, a calm meditation app: deep teal #0E3B43, sand #F5EBDD, coral #FF7A59. I need an app icon, a hero background, a pricing card and testimonial avatars. Budget $20.";

const res = await fetch(BASE + "/api/agent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: brief, budget: 20, cart: [] }) });
if (!res.ok) throw new Error(`agent: ${res.status} ${await res.text()}`);
const events = [];
const dec = new TextDecoder();
let buf = "";
for await (const chunk of res.body) {
  buf += dec.decode(chunk, { stream: true });
  let i;
  while ((i = buf.indexOf("\n\n")) >= 0) {
    const block = buf.slice(0, i);
    buf = buf.slice(i + 2);
    const ev = block.match(/^event: (.*)$/m)?.[1];
    const data = block.match(/^data: (.*)$/m)?.[1];
    if (!ev || !data || ev === "chat" || ev === "done") continue;
    const d = JSON.parse(data);
    if (d.previewUrl) d.previewUrl = d.previewUrl.replace(/^https?:\/\/[^/]+/, "");
    // Merge text deltas into sentences so the replay reads at a steady pace.
    const last = events.at(-1);
    if (ev === "text" && last?.[0] === "text" && !/[.!?:]\s*$/.test(last[1].delta)) last[1].delta += d.delta;
    else events.push([ev, d]);
  }
}
fs.writeFileSync(`public/replays/${name}.json`, JSON.stringify({ recorded: new Date().toISOString(), brief, events }, null, 1));
const counts = events.reduce((m, [e]) => ((m[e] = (m[e] || 0) + 1), m), {});
console.log(`public/replays/${name}.json`, counts);
