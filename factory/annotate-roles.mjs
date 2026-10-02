// Gives every colour knob a semantic role so one brand palette can re-skin the whole catalogue.
// Roles: background, surface, ink, muted, primary, secondary, highlight. Claude assigns them from the
// program source plus a render; the result is written into the module's knob definitions.
import fs from "node:fs";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import "dotenv/config";
import { inspect, renderSource } from "../server/sandbox.js";
import { resolveKnobs } from "../server/knobs.js";
import { Resvg } from "@resvg/resvg-js";

export const ROLES = ["background", "surface", "ink", "muted", "primary", "secondary", "highlight"];
const client = new Anthropic();

export async function rolesFor(src) {
  const { params, meta } = inspect(src);
  const colours = Object.entries(params.knobs).filter(([, k]) => k.type === "color");
  if (!colours.length) return {};
  const png = new Resvg(renderSource(src, resolveKnobs(params, {})), { fitTo: { mode: "width", value: 512 }, font: { loadSystemFonts: true } }).render().asPng();
  const msg = await client.messages.create({
    model: "claude-opus-5-5",
    max_tokens: 4000,
    output_config: { effort: "low" },
    messages: [{
      role: "user",
      content: [
        { type: "image", source: { type: "base64", media_type: "image/png", data: png.toString("base64") } },
        { type: "text", text: `Asset "${meta.title}". Its colour knobs (name, label, default):\n${colours.map(([n, k]) => `${n} | ${k.label} | ${k.default}`).join("\n")}\n\nAssign each knob one role from: background (page/canvas), surface (cards, panels on the background), ink (text, outlines, main lines), muted (secondary text, faint lines, shadows), primary (main brand/accent colour), secondary (second accent), highlight (small pops: badges, sparkles, sun). A brand palette will be mapped to these roles, so choose what keeps the asset legible and attractive. Several knobs may share a role. Return JSON only: {"knobName":"role",...}` },
      ],
    }],
  });
  const text = msg.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  const roles = JSON.parse(text.match(/\{[\s\S]*\}/)[0]);
  for (const [n, r] of Object.entries(roles)) if (!ROLES.includes(r)) delete roles[n];
  return roles;
}

/** Writes role: "x" into each colour knob literal of the module source. */
export function applyRoles(src, roles) {
  let out = src;
  for (const [name, role] of Object.entries(roles)) {
    const re = new RegExp(`(\\b${name}\\s*:\\s*\\{\\s*type:\\s*["']color["'])(?!\\s*,\\s*role)`);
    out = out.replace(re, `$1, role: "${role}"`);
  }
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const files = [
    ...fs.readdirSync("assets").filter((f) => f.endsWith(".mjs")).map((f) => ({ kind: "asset", file: path.join("assets", f) })),
    ...fs.readdirSync("seed/forks").filter((f) => f.endsWith(".json")).map((f) => ({ kind: "seed", file: path.join("seed/forks", f) })),
  ];
  let done = 0;
  const queue = [...files];
  await Promise.all(Array.from({ length: 6 }, async () => {
    while (queue.length) {
      const f = queue.shift();
      const doc = f.kind === "seed" ? JSON.parse(fs.readFileSync(f.file, "utf8")) : null;
      const src = doc ? doc.source : fs.readFileSync(f.file, "utf8");
      if (/role:\s*"/.test(src)) continue;
      try {
        const roles = await rolesFor(src);
        const next = applyRoles(src, roles);
        inspect(next);
        if (doc) fs.writeFileSync(f.file, JSON.stringify({ ...doc, source: next }, null, 2));
        else fs.writeFileSync(f.file, next);
        console.log(`ok ${++done} ${f.file} ${JSON.stringify(roles)}`);
      } catch (e) {
        console.log(`FAIL ${f.file}: ${e.message}`);
      }
    }
  }));
}
