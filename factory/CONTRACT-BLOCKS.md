## The Oasis 3D block asset contract

An asset is ONE self-contained ES module that describes a low-poly 3D model as plain data. It runs in a QuickJS
sandbox: no imports, no DOM, no fetch, no timers, no Math.random (derive any variation from a knob such as `seed`
with a small hash). It must build in well under a second.

It exports exactly three things:

```js
export const meta = {
  title: "Human Title",              // 2-4 words
  kind: "3d",
  format: "blocks",
  kit: "Oasis Town",
  description: "One sentence: what it is and how it fits a little town.",
  tags: ["3d", "low poly", "...6-8 lowercase search terms"],
  price: 0,                          // USD; 0-6 for kit pieces
  author: "oasis-factory",
  footprint: [w, d],                 // metres it occupies on the ground, e.g. [6, 6] for a building lot
  size: [1000, 1000],                // thumbnail canvas
};

export const params = { knobs: { /* as below */ }, presets: { /* 2-3 named colourways, colour knobs only */ } };

export function build(p) { return { parts: [ /* parts */ ] }; }
```

Knob types: `color` (default "#RRGGBB"; give a `role` (surface | ink | muted | primary | secondary | highlight) ONLY to
painted surfaces such as walls, awnings, trim and signs, so Brand Mode can re-skin them; materials such as water,
foliage, glass, stone, metal, wood and lamps never get a role), `range` (default, min, max, step), `choice` (default, options), `toggle`.
5-8 knobs that a level designer would actually reach for: colours, proportions (height, width, floors, count),
style choices, and a `lights` toggle where windows or lamps exist.

Parts (metres, y up; the model sits on y = 0; its footprint starts at x = 0, z = 0; the FRONT faces -z, the street):
- `{ t: "box", p: [x, y, z], s: [w, h, d], c: "#RRGGBB" }`: p is the min corner
- `{ t: "gable", p: [x, y, z], s: [w, h, d], c, axis: "x" | "z" }`: a pitched roof, ridge along the axis
- `{ t: "cyl", p: [cx, y, cz], r, h, c, n }`: an n-sided prism standing on y (n 6-12)
- `{ t: "cone", p: [cx, y, cz], r, h, c, n }`
- add `e: true` to anything that gives light (lit windows, lamp heads, neon): it glows at night

Rules that make a kit piece good:
- Real scale: doors about 2 m tall and 0.9 m wide, a storey about 2.6 m, a person-height counter about 1 m,
  benches 0.45 m. Pieces from the same kit must look right side by side on the 6 m grid.
- Toy-like and readable from above at 45 degrees: chunky silhouettes, 3-6 colours, one accent colour. Small
  details (handles, frames, signs) are thin boxes laid on faces, never floating.
- Every part touches the ground or another part. No z-fighting: details sit 0.02-0.06 m proud of the face.
- Under 600 parts. Prefer a few big boxes plus a handful of telling details over hundreds of tiny ones.
- Every knob must visibly change the model at its extremes (the harness rejects dead knobs).
- The kit palette: walls #F3E3C8 #F6EEE0 #D8DEE3, roofs #5B6270 #C8553D, awning red #E5484D, tram green #2F7A55,
  sky blue #3E7BFA, sun #F2B33D, blossom #F7B8CF, leaf #79B86A, wood #8A6E52, kerb #D9DCE1, glass #7E93A8,
  lit #FFD58A. Use them as defaults so new pieces match the existing kit.

Reference pieces from the kit are included below. Match their scale and style exactly.
