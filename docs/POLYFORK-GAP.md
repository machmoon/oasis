# Polyfork gap: showing and rebuilding assets

Read on 2026-10-04: polyfork.dev (home), /assets, /kits, /editor, /agents, /prompt.txt and every post on
/blog (animals-v2, a-kit-is-a-place, characters-v2, inverse-kinematics-three-js,
worldclaw-and-the-3d-asset-supply-problem, terrain-that-joins, six-shader-looks-and-which-ones-you-can-keep).

Polyfork's one sentence is "Web-ready 3D assets you can reshape": an asset is "a small program made with code,
not a frozen mesh", and the whole site is built to prove it. Oasis has the same primitive (an ES module with
`meta`, `params` and `build(knobs)`) and a better reason for it (every rebuild is still the same licensed piece,
and one PayPal order pays every creator in a film), but the kit browser and asset page showed the primitive less
well than Polyfork does. This table is the lane: showing and rebuilding assets.

| What Polyfork does | Where | What Oasis had (taste-pass) | How Oasis is better now |
|---|---|---|---|
| **Reshape / recolor / remix knobs.** Typed knobs (colour zones, proportions, part counts), curated presets ("colourways"), model rebuilds in ~14 ms, live three.js on the page. Home: "turn the knobs in the store, in the browser, or in the files you downloaded". | home, /asset/{id}, animals-v2, characters-v2 | Same typed knobs (color, range, choice, toggle) and presets in `params`; a viewer with raw `<input type=range>` rows, no presets on the page, no sign that anything was *rebuilt* rather than scaled. | The rebuild is the hero. Every knob change re-runs `build(knobs)` in the server sandbox and the **new parts flash in the viewer** (parts diffed by geometry key, so three floors becoming five shows the two new floors, not a taller box). A **rebuild log** reads "floors 2 → 3, +6 parts, 41 ms". Presets are one-tap colourway chips. The program is shown live: the import line updates with only the knobs that differ from defaults, and the changed knob is highlighted. |
| **"Rebuilt, not stretched."** animals-v2: a fitting tool "compares the two silhouettes ... so a body too long for its height costs overlap instead of being stretched to match". | animals-v2 | The README said it ("a program: knobs rebuild it, they don't stretch it") but nothing on the page proved it. | **Before / after compare**: a split slider over the live viewer; the left half is the piece at its defaults, the right half the remix, cameras locked together, so a wider shop visibly gains awning stripes and windows instead of growing fatter. Pattern: the clay/licensed compare on the home page (`.compare` in site.css) and cult-ui's handle-over-image idiom; see "Borrowed" below. |
| **Shader looks on every model.** Palette reduction (bakes), toon/unlit (`KHR_materials_unlit`, bakes), inverted-hull outlines, ordered (Bayer) dithering patched at `#include <dithering_fragment>`, pixelation by rendering small, PS1 vertex snapping in clip space, underwater. The post says which looks "you can keep" in an export. | six-shader-looks | One lighting model (flat `MeshStandardMaterial`), a hidden wireframe toggle, day/dusk/night. | **Seven looks on every piece** (`public/looks.js`): Studio, Clay, Ink (unlit + edge lines), Flat, Dither (Bayer 4x4 at `dithering_fragment`, in sRGB as the post advises), Pixel (render at a fraction of the pixel ratio, `image-rendering: pixelated`), PS1 (clip-space snap at `project_vertex`). Each look says whether it **ships in the GLB** or is viewer-only, as Polyfork's post does. Ink uses `EdgesGeometry` lines instead of an inverted hull because an inverted hull of a merged box mesh opens at every corner; edge lines are the right outline for block geometry. Clay is also Oasis's *unlicensed* look, so the look menu and the payment story are the same thing. |
| **A kit is a place.** `buildKit({ folder, params })` rebuilds "the arrangement the kit was photographed and filmed in" in one call; `stage()` has nine time-of-day presets; after dusk "the place lights itself"; `place.blocked()`, `place.spots()`. | a-kit-is-a-place, /kits | The Studio already builds a street from the kit (`/api/world/plan` + `/api/world/parts`), and the home hero shows it, but a piece's own page never showed the piece in its place. | **"In the street"** on every asset page: one plan call for the kit's street, every placement of this piece swapped for *your* remix (or the piece dropped into the centre lot if the planner did not use it), built in the shared runtime, camera framed on the piece with the street around it, day / dusk / night. The two calls are printed next to it so an agent can do the same. Oasis keeps its own advantage: the place is the set of a film, and licensing the film pays every creator in it. |
| **Night lighting.** Emissive zones so a kit "lights itself after dusk"; the agent guide has a section on it. | prompt.txt, a-kit-is-a-place | Lit parts (`e: true`) glow at night in 3D and in the isometric thumbnail, but only the asset page could show night. | The kit grid hovers through **the piece rebuilt**: presets if it has them, then its night render (`render.png?night=1`, new), with a caption naming the remix. The grid itself proves "a program, not a mesh". |
| **The browser.** Category sidebar with counts, Free/Paid, IK filter, six sorts; cards with a status badge, thumbnail, title, tri count. | /assets | A flat grid: thumbnail, title, price, creator. No filters, no counts, no sort. | **Filter chips with counts** (Buildings, Ground, Street, Vehicles, Landmarks, Props), Free / Paid, and **by creator** (Polyfork has one factory; Oasis has named creators who get paid, so the creator is a first-class filter). Sort by name, price or footprint. Cards keep the mounted model sheet and add knob count and footprint in metres, the facts an agent reads before importing. |
| **Rigged characters as programs.** 32,640 bodies from one config; a garment "names a station on the body and asks for its cross-section"; five automated checks. | characters-v2 | Nothing comparable. The kit has one mascot (Agent Kiosk) and no rig. | Not built. Said plainly: Oasis has no characters and no rig. The nearest thing is that every piece is already a program checked by a separate grader (`factory/`). If characters come, the knob and looks surfaces built here apply unchanged. |
| **Inverse kinematics.** `walk.mjs`: closed-form two-link legs, gait by metres travelled, "grab the machine and lead it around" on the asset page. | inverse-kinematics-three-js | Nothing. The Studio animates the tram and cars along the street, not legs. | Not built. Out of lane and out of the kit's vocabulary (boxes, gables, cylinders, cones). |
| **Terrain that joins.** Each kit ships a terrain program; 64 m chunks, a 4 m skirt, heights agree at the seam by arithmetic. | terrain-that-joins | Flat ground tiles (`town-plaza`, `town-road`) on a 6 m grid; a street is tiles, not a height field. | Not built. The 6 m tile grid is Oasis's join rule; it is simpler and always joins, but it cannot roll. |
| **Agent guide.** `/prompt.txt`: "nothing here needs an SDK", Y-up metres, models rest on y=0, kits share one palette and one scale, `cdn/{id}-params.json`, matching assets, MCP. | /prompt.txt, /agents | `/llms.txt` covers the flow, MCP tools, x402 headers and the piece list; `get_asset` returns the knob schema. | Unchanged in this lane (another agent owns it). The asset page now prints the same calls an agent would make (import line, `parts.json`, the two street calls), so what a person sees and what the agent reads are one surface. |
| **Scene editor.** Click a model in the strip to drop it in; W/E/R move/rotate/scale; Day / Sunset / Night; export. | /editor | The Studio (a film, not a scene editor) and the agent's `edit_world`. | Not in this lane. |

## What was built (branch `design/assets`)

- `public/kit.css`: all styles for the kit browser and the asset page. Uses the shared tokens when `public/tokens.css`
  publishes them and falls back to site.css values.
- `public/kit.js`: the kit page (filters, sort, hover-rebuild cards) and the asset page (knobs, presets, live program,
  rebuild log, new-part flash, compare slider, looks, "in the street", related pieces). `site.js` routes `#/kit` and
  `#/a/:id` to it.
- `public/looks.js`: the seven looks, as functions over a `createViewer` instance.
- `render.png?night=1`: the isometric sheet at night, for the grid's hover.
- `public/world3d.js`: one fix. `frame({ keepAngle })` overwrote the camera position before reading its direction, so
  every reframe after a knob change (a taller building, a shorter fence) looked straight down at the roof.

Screenshots: `docs/gallery/assets-before/` (kit, asset, kit-dark) and `docs/gallery/assets-after/` (kit, kit-dark,
kit-hover-1/2, kit-filter-parkline, kit-phone, asset-1-defaults, asset-2-rebuild-flash, asset-3-remixed,
asset-4-compare, asset-5-street, asset-dark, asset-phone, look-clay/ink/dither/pixel/ps1/night).

## Borrowed

- Card frame: cult-ui `apps/www/registry/default/ui/minimal-card.tsx` (`MinimalCard` pads the image inside a
  `p-2` tile; `MinimalCardImage` draws the inset ring with layered box-shadows) and `texture-card.tsx` (nested
  1px borders for a mounted edge). Reproduced in vanilla CSS as `.k-card` / `.k-sheet`.
- Segmented control for looks and time: cult-ui `halo-segmented.tsx` (a track with a sliding thumb measured from the
  active item's rect; here the thumb is a CSS transform updated on change).
- Code block with a copy button: cult-ui `code-block.tsx` (tabs + copy state that flips to a check for 2 s).
- Compare handle: the home page's `.compare` in site.css (range input over the image, `--at` custom property),
  itself after the clay/licensed split; applied to two synchronised WebGL viewers instead of two images.
- Looks: three.js material patching at `#include <dithering_fragment>` and `#include <project_vertex>`
  (`three/src/renderers/shaders/ShaderChunk`), the approach Polyfork's post describes; edge lines from
  `three/src/geometries/EdgesGeometry.js`; the toon ramp from `three/examples/webgl_materials_variations_toon.html`.
