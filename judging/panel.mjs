// A mock judging panel: three judges with different lenses score two Devpost submissions on the
// PayPal AI Hackathon rubric, independently, then name what would most raise the weaker scores.
import fs from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
import "dotenv/config";

const client = new Anthropic();
const A = fs.readFileSync(process.argv[2] || "SUBMISSION.md", "utf8");
const B = fs.readFileSync("judging/polyfork-devpost.md", "utf8");
const JUDGES = [
  { name: "Developer-platform judge", lens: "You run developer relations for a payments platform. You care whether the platform's APIs are central, used correctly and in depth, and whether the build is real, robust and reproducible." },
  { name: "Design and product judge", lens: "You are a principal product designer. You care about craft, coherence, the quality of the output a user actually gets, and whether the experience is intuitive and delightful." },
  { name: "Venture judge", lens: "You are an early-stage investor. You care about evidence: traction, measured claims, defensibility, and whether this becomes a real business. You distrust unmeasured claims." },
];
const RUBRIC = "Technological implementation, Design, Potential impact, Quality/innovation of the idea, Presentation (how well the submission communicates and proves itself). Score each 1-10; be harsh and use the full range.";

async function judge(j) {
  const msg = await client.messages.create({
    model: "claude-opus-5-5",
    max_tokens: 8000,
    output_config: { effort: "high" },
    system: `${j.lens} You are judging hackathon submissions. Judge only from the text given; reward specific, verifiable evidence and penalise vague or unproven claims. Do not favour either entry for its position.`,
    messages: [{ role: "user", content: `Rubric: ${RUBRIC}\n\n=== Submission X ===\n${A}\n\n=== Submission Y ===\n${B}\n\nReturn JSON only: {"X":{"scores":{"tech":n,"design":n,"impact":n,"idea":n,"presentation":n},"total":n,"strongest":"...","weakest":"..."},"Y":{...same},"winner":"X|Y","margin_reason":"one sentence","X_top_fixes":["three specific things that would most raise X's scores"]}` }],
  });
  const text = msg.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  return { judge: j.name, ...JSON.parse(text.match(/\{[\s\S]*\}/)[0]) };
}

const results = await Promise.all(JUDGES.map(judge));
let x = 0, y = 0;
for (const r of results) {
  x += r.X.total; y += r.Y.total;
  console.log(`\n## ${r.judge}: X ${r.X.total} vs Y ${r.Y.total} -> ${r.winner}\n  X: ${JSON.stringify(r.X.scores)}\n  Y: ${JSON.stringify(r.Y.scores)}\n  why: ${r.margin_reason}\n  X weakest: ${r.X.weakest}\n  fixes:\n   - ${r.X_top_fixes.join("\n   - ")}`);
}
console.log(`\nPANEL TOTAL  Oasis(X) ${x}  vs  Polyfork(Y) ${y}`);
fs.writeFileSync(`judging/round-${Date.now()}.json`, JSON.stringify(results, null, 2));
