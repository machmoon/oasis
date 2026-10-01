// What a licence downloads. Every format comes from the same baked remix.
import { toPng } from "./catalog.js";

const pascal = (s) => s.replace(/(^|[^a-zA-Z0-9]+)([a-zA-Z0-9])/g, (_, __, c) => c.toUpperCase()).replace(/^[0-9]/, "A$&");

/** SVG markup -> a React component. Hyphenated attributes become camelCase, as SVGR does. */
export function toJsx(svg, name) {
  const body = svg
    .replace(/<\?xml[^>]*>/, "")
    .replace(/\s([a-z]+(?:-[a-z]+)+)=/g, (m, attr) => (attr.startsWith("data-") || attr.startsWith("aria-") ? m : " " + attr.replace(/-([a-z])/g, (_, c) => c.toUpperCase()) + "="))
    .replace(/\sclass=/g, " className=")
    .replace(/xlink:href=/g, "xlinkHref=")
    .replace(/xmlns:xlink=/g, "xmlnsXlink=")
    .replace(/<svg /, "<svg {...props} ");
  return `// ${name} — licensed from Oasis. Pass any <svg> props (className, width, aria-label...).\nexport default function ${pascal(name)}(props) {\n  return (\n    ${body.trim()}\n  );\n}\n`;
}

export function toCss(svg, id) {
  const uri = "data:image/svg+xml," + encodeURIComponent(svg).replace(/'/g, "%27").replace(/"/g, "%22");
  return `/* ${id} — licensed from Oasis */\n.oasis-${id} {\n  background-image: url("${uri}");\n  background-size: cover;\n  background-position: center;\n}\n`;
}

export function toModule(asset, values) {
  return `// ${asset.title} — the Oasis program you licensed. Call render(remix) to rebuild it, or change\n// any knob. Knob values below are your remix.\nexport const remix = ${JSON.stringify(values, null, 2)};\n\n${asset.source}`;
}

export const FORMATS = {
  svg: { type: "image/svg+xml", ext: "svg", make: (svg) => svg },
  png: { type: "image/png", ext: "png", make: (svg) => toPng(svg, 2048) },
  jsx: { type: "text/javascript", ext: "jsx", make: (svg, a) => toJsx(svg, a.title) },
  css: { type: "text/css", ext: "css", make: (svg, a) => toCss(svg, a.id) },
  mjs: { type: "text/javascript", ext: "mjs", make: (svg, a, values) => toModule(a, values) },
  json: { type: "application/json", ext: "json", make: (svg, a, values) => JSON.stringify({ asset: a.id, knobs: values }, null, 2) },
};
