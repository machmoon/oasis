// The independent sound grader: a fresh session that never saw the builder's reasoning. It "listens" through pictures
// (waveform over spectrogram for the defaults, each choice, the range extremes and two seeds) and the harness's
// numbers, and decides publish or reject. Same role as factory/grader.mjs for SVG assets.
import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();
const MODEL = process.env.FACTORY_GRADER_MODEL || "claude-opus-5-5";
const SYSTEM = `You are the quality gate for Oasis, a registry of parametric sound programs bought by game audio designers and film sound editors. You did not make this sound and owe its maker nothing. Most submissions should not ship: reject anything a working sound designer would not pay for or would be embarrassed to put in a scene.

You judge from renders shown as pictures (the waveform on top, a spectrogram below: time left to right, frequency low at the bottom to high at the top, hotter colour is louder) and from measured numbers (seconds, peak, RMS, spectral centroid in Hz, fraction of silence). Read them like an engineer: a footstep should be a sharp transient with a short tail, not a 2 s wash; rain should be dense and even with no gaps; a UI click should be under 0.3 s and bright; a kick should have energy at the bottom with a pitch drop visible as a falling line; an ambience must have no silent gaps and must not end abruptly.

Score 1-10:
- realism: does the picture match what the brief describes, at defaults? (the right length, envelope and spectrum for the thing)
- range: do the choice and range extremes still read as the same kind of sound, each clearly different, nothing broken, silent, clipped or absurdly long?
- variation: do the two seeds look like two takes of one sound (same shape, different detail), not identical and not unrelated?
- knob_design: are the knobs the ones a sound designer wants for this sound, with sensible defaults?

Publish only if every score is at least 7 and nothing is broken in any render.
Also write ONE general lesson for future builders (not specific to this sound) that would have prevented the biggest flaw you saw, or null if there is no flaw worth generalising.

Return JSON only: {"scores":{"realism":n,"range":n,"variation":n,"knob_design":n},"verdict":"publish"|"reject","flaws":["..."],"lesson":"..."|null}`;

export async function gradeSound({ brief, title, pngs, labels, numbers }) {
  const content = [];
  pngs.forEach((png, i) => {
    content.push({ type: "text", text: `${labels[i]}: ${numbers[i]}` });
    content.push({ type: "image", source: { type: "base64", media_type: "image/png", data: png.toString("base64") } });
  });
  content.push({ type: "text", text: `Brief: ${brief}\nSound title: ${title}` });
  let msg;
  for (let attempt = 0; ; attempt++) {
    try {
      msg = await client.messages.create({ model: MODEL, max_tokens: 4000, output_config: { effort: "medium" }, system: SYSTEM, messages: [{ role: "user", content }] });
      break;
    } catch (e) {
      if (attempt >= 4 || (e.status && e.status < 500 && e.status !== 429)) throw e;
      await new Promise((r) => setTimeout(r, 5000 * 2 ** attempt));
    }
  }
  const text = msg.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  return JSON.parse(text.match(/\{[\s\S]*\}/)[0]);
}
