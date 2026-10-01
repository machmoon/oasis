## The Oasis asset contract

An asset is ONE self-contained ES module. It runs in a QuickJS sandbox: no imports, no DOM, no
fetch, no timers, no Math.random (use a seeded PRNG so the same knobs always give the same image).
It must render in under a second.

It exports exactly three things:

```js
export const meta = {
  title: "Human Title",             // 2-4 words, evocative, no "SVG" or "Generator"
  kind: "icons" | "illustration" | "pattern" | "background" | "ui" | "mockup" | "poster" | "brand" | "avatar" | "shape" | "type",
  description: "One sentence: what it is and what a designer would use it for.",
  tags: ["6-8", "lowercase", "search", "terms"],
  price: 0,                          // USD for a commercial licence; 0 = free. Typical 0-12.
  author: "oasis-factory",
  size: [w, h],                      // default canvas
};

export const params = {
  knobs: {
    // name: { type, label, default, ...}
    // type "color":  default "#RRGGBB" (6-digit hex only)
    // type "range":  default, min, max, step (numbers)
    // type "choice": default, options: [strings]
    // type "toggle": default true/false
    // type "text":   default string (headlines, labels, names) — keep text short
  },
  presets: {
    // 3-4 named colourways: { PresetName: { colorKnobName: "#RRGGBB", ... } } — colour knobs only
  },
};

export default function render(p) { return `<svg xmlns="http://www.w3.org/2000/svg" viewBox=... width=... height=...>...</svg>`; }
```

Rules that make an asset sell:
- 6-10 knobs that a designer actually wants: palette, proportions, counts, style choices, density,
  corner radius, a seed for generative work. Every knob must visibly change the output, and every
  combination must still look intentional — test the extremes in your head.
- Colour knobs come first, then choices, then ranges, then toggles.
- Real craft: considered spacing, optical alignment, restrained palettes, typographic hierarchy.
  Default output should look like a Dribbble shot, not a code demo.
- Text uses font-family stacks of system fonts only, e.g. "Helvetica Neue, Helvetica, Arial, sans-serif"
  or "Georgia, 'Times New Roman', serif" or "Menlo, Consolas, monospace". Escape &, <, > in text knobs.
- Pure SVG 1.1 plus gradients, masks, clipPaths, patterns and simple filters (feGaussianBlur,
  feTurbulence, feColorMatrix, feDropShadow). No foreignObject, no <script>, no external hrefs, no images.
- Keep the module under ~250 lines. No comments explaining the contract; a one-line header comment
  describing the asset is welcome.
