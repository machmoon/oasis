// The independent grader: a fresh session that never saw the builder's reasoning. It sees the brief and
// renders (defaults, presets, extremes, a light and a dark brand) and decides publish or reject.
import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();
const SYSTEM = `You are the quality gate for Oasis, a marketplace of parametric design assets bought by professional product designers. You did not make this asset and owe its maker nothing. Most submissions should not ship: reject anything a senior designer would not pay for or would be embarrassed to use. Judge only what you see.

Score 1-10:
- craft: composition, spacing, typography, colour, polish at defaults
- range: does it still look intentional at presets, extremes and in both brand probes (light brand, dark brand)? anything clipped, overlapping, illegible or broken?
- usefulness: would a product designer actually use this in real work?
- knob_design: are the knobs the ones a designer wants, with sensible ranges?

Publish only if every score is at least 7 and nothing is broken in any render.
Also write ONE general lesson for future builders (not specific to this asset) that would have prevented the biggest flaw you saw, or null if there is no flaw worth generalising.

Return JSON only: {"scores":{"craft":n,"range":n,"usefulness":n,"knob_design":n},"verdict":"publish"|"reject","flaws":["..."],"lesson":"..."|null}`;

export async function grade({ brief, title, pngs, labels }) {
  const content = [];
  pngs.forEach((png, i) => {
    content.push({ type: "text", text: labels[i] });
    content.push({ type: "image", source: { type: "base64", media_type: "image/png", data: png.toString("base64") } });
  });
  content.push({ type: "text", text: `Brief: ${brief}\nAsset title: ${title}` });
  let msg;
  for (let attempt = 0; ; attempt++) {
    try {
      msg = await client.messages.create({ model: "claude-opus-5-5", max_tokens: 6000, output_config: { effort: "high" }, system: SYSTEM, messages: [{ role: "user", content }] });
      break;
    } catch (e) {
      if (attempt >= 4 || (e.status && e.status < 500 && e.status !== 429)) throw e;
      await new Promise((r) => setTimeout(r, 5000 * 2 ** attempt));
    }
  }
  const text = msg.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  return JSON.parse(text.match(/\{[\s\S]*\}/)[0]);
}
