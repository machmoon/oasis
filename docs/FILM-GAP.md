# Oasis films against Polyfork

What Polyfork's assets and kits can do (read from every post on polyfork.dev/blog on 2026-10-04), what an Oasis
film does today, and where the film is better. Polyfork sells parts and shows them in a viewer; Oasis shows the
parts becoming a finished brand film, with the rebuild happening on screen. The film is the one surface Polyfork
does not have, so every item below is judged by one question: does the shot show what a parametric asset system
can do that a mesh library cannot?

## What Polyfork has (their blog, post by post)

| Post | What they ship | The idea worth keeping |
| --- | --- | --- |
| Three.js shader looks, now live on every model | Seven looks on 1,937 models: palette reduction (OKLab nearest colour, rewrites `COLOR_0`), toon/unlit, inverted-hull outline (width in pixels, offset in view space scaled by depth), ordered dithering (Bayer, four levels minimum), pixelation (render small, upscale nearest), PS1 vertex snapping (snap in clip space after projection, 64 cells minimum), underwater (per-channel absorption, caustics as three sine gratings). Only palette and toon survive `.glb` export: "if the effect is a property of the mesh it exports; of the camera or frame, it does not." | A look is a per-model preview toggle. A film has a grade, chosen once for the whole piece. |
| Build a whole low-poly 3D world in three.js with one call (a kit is a place) | A kit is a composed place: `LAYOUT.json` (617 placements of 60 parts for the Medieval Village), `kit.mjs` builds it, `stage.mjs` lights it (nine times of day, a 0..1 day-to-night continuum, parts declare their own lit zones so "after dusk the place lights itself"), `city.mjs` grows a town (168 x 104 m, ~2,000 placements, 1.6 s). Merges static placements into a dozen draw calls. `blocked()` and `spots()` for navigation. | Lighting as a continuum. A kit that knows which of its parts glow. |
| Terrain v1: every kit ships a procedural ground generator | Heights are `baseHeight(worldX, worldZ, seed)` shared by every kit, plus kit character times a skirt weight that is zero at chunk edges, so chunks from different kits "agree because they are computing the same thing." 64 m chunks, 4 m skirt, 0.5-4 m pitch, a level-clearing knob that flattens the middle for buildings. Colour blends across 14 m near seams. Rivers trace downhill. | The arithmetic join. A street that sits in a landscape instead of on a slab. |
| Characters v2: characters are programs | A character is a config (age, figure, build in 8 steps, 6 expressions, 26 colour zones, 14 garment slots) built in ~14 ms into a rigged humanoid; 32,640 bodies from 85 characters. Garments query the body's cross-section, so one coat fits a child and an elder. Frozen skeleton for Mixamo. | A person is a program with knobs, like a building. |
| Animals v2 | 47 rigged animals, one skin, idle/walk/run (idle/swim/swim fast) authored as key poses with foot contact intervals and a stride distance so feet never slide. | Clips carry stride distance: motion is a function of distance, not of the clock. |
| Inverse kinematics in three.js: legs that find the ground | `/cdn/walk.mjs`: a two-link law-of-cosines IK per leg per frame, gait phased by metres travelled (so `poseAt(d)` is scrub-safe and recordable), footholds from `raycastGround` once per step. 0 mm drift on the cargo walker. | Everything is phased by distance or by the frame, never by wall time. Oasis already renders this way. |
| Hunyuan3D WorldClaw and the 3D asset supply problem | Argues that agentic world builders generate each object fresh, so sets are incoherent and a prototype is frozen; a parametric library (23,366 declared knobs across the catalogue) gives 300 trees from one Tall Pine by turning knobs. | Coherence is a property of a set. The knob is the product. |

Their launch video (docs/VIDEO-PLAN.md): one hero object, real cursor on real knobs, reshape / recolor / remix as big
words, one tower becoming 950 configurations. No money, no finished thing, nobody paid.

## What an Oasis film does today (before this branch)

A street of 60-80 placements from 22 parametric block programs, two 2D assets hung as signs in the brand's colours,
five or six shots (orbit, dolly, push, crane, static) with Penner speed ramps, whip / zoom / glitch / flash cuts,
seeded camera shake, sub-frame motion blur, a dusk-to-night light continuum with windows and signs that come on, a
3D title in Anton that drops and slams, a broadcast lower third and a monogram end card, weather, a synthesised
soundtrack from the film's seed, three formats, and a frame-exact server render. Clay until licensed; licensing
paints the street.

What it never shows: the rebuild. The knobs that make every piece a program are turned in the planner, off screen,
and the finished street is the first thing the viewer sees. That is Polyfork's whole pitch, and the film did not make it.

## The gap, and where Oasis is better

| | Polyfork | Oasis film, after this branch | Better because |
| --- | --- | --- | --- |
| The street assembles | A static composed layout; a town grows in 1.6 s but off screen. | The first shot is the assembly: pieces drop in piece by piece along the street, each landing with a settle, in the order the camera reads them. | The viewer watches the set being built from parts. It is the "kit is a place" idea as a shot, not a sentence. |
| Pieces rebuild as they land | Knobs turn in the viewer, one model at a time, by hand. | Each piece lands as its stock program (default knobs), then rebuilds into its remix with a pop: a two-floor shop becomes the brief's three-floor shop with the brand's awning. Shown in clay too, so shape changes read before licensing. | Rebuild is the film's own motion vocabulary, not a cursor on a slider. Hundreds of rebuilds in one shot. |
| A knob turns mid-film | Same. | A `rebuild` shot: the camera holds on the hero while one knob walks its range (floors 1 -> 3 -> 2, roof gable -> flat) with the knob's name and value set on screen as a readout; the roof sign rides the new roofline. | The product demo is inside the deliverable. |
| Shader looks | Seven per-model viewer toggles; a `?look=` on the CDN. | A film-wide grade the brief can ask for ("a pixel-art teaser", "cel-shaded", "PS1", "dithered print", "Game Boy"): toon (posterised light + depth outline in pixels), pixel, dither (Bayer 4x4), PS1 (vertex snap in clip space), palette (the brand's own colours, nearest in OKLab). Deterministic per frame, the same in the preview and the render. | A look is a grade, chosen once and kept for the whole film, and the palette look uses the brand's palette instead of a generic one. |
| Terrain that joins | Per-kit heightfield, joined by arithmetic. | A ground that joins the street: flat on the grid (their level-clearing) and rising into hills with their `baseHeight * skirtWeight` arithmetic outside it, themed (grass, sand, snow), so crane and orbit shots no longer see the edge of the slab. | Same arithmetic, used where it shows: in the wide shots. |
| Lighting as a continuum | Nine presets and a 0..1 slider. | Already a continuum inside a shot (dusk to night in one crane); kept. | Equal, and ours happens inside a cut. |
| Characters | 85 rigged programs, 47 animals, IK walkers. | The kit has one character, the Agent Kiosk robot (a mascot on a plinth, no rig). Not built here; stated plainly rather than faked. | Not better. A real gap for the kit, not the film. |
| Titles | None (a viewer). | A 3D Anton title that drops with weight: an impact ring on the road, a dust puff, an aberration spike and a camera hit on the slam. | A film thing; they have nothing to compare. |
| Whip pans | None. | Sub-frame samples plus a directional smear along the pan, so the whip reads as a smear and not as ghosting. | Same. |
| Match cuts | None. | `cut: "match"`: the incoming camera inherits the outgoing look direction and eases into its own over the first frames, so the eye line carries across the cut. | Same. |
| Speed ramps with sound | None. | The soundtrack now carries the cut: a whoosh on every whip and zoom, a riser into a flash, a sub boom and a hit when the title lands, soft ticks as pieces land. All synthesised from the film, muxed by ffmpeg. | Same. |
| Typography | n/a | One display face (Anton) for the 3D title, the end card name and the knob readout; Source Sans 3 for the small line, with weight contrast (Anton vs 500) and a strict scale (name 11% of the short side, sub 2.6%, readout 3.2%). | Same. |
| Export | Palette and toon bake into the `.glb`. | The film is the export. | Different product. |

## Deterministic render rule (unchanged)

Every addition is a function of the film and the second: drop times are hashed from placement ids, the rebuild
schedule from the shot, the look from the film, the sound from the seed. Frame N is drawn from the film alone, so
the Studio preview, the WebM export and the server MP4 agree frame for frame.
