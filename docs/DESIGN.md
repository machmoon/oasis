# Oasis design system

Everything visual on the site is spent from `public/tokens.css`. Load it before your page's stylesheet
(`index.html` already does; `film.html` and other standalone pages should add `<link rel="stylesheet" href="/tokens.css">`).
Nothing in this file is a suggestion: if a page needs a value that is not a token, add the token here first.

Design read: a product site whose hero is the product running. Dials: variance 7, motion 7, density 3.

## Where the patterns come from

Real, read source, named so it can be checked:

| Pattern | Source |
|---|---|
| Full-bleed hero band, copy inset over the live canvas, the subject pushed aside by a camera view offset rather than a layout column | polyfork.dev `style.css` (`.heroStage`, `.hsArt`, `.hsCopy`) and `hero-stage.js` (the beat loop, a cast of subjects, the headline answering the beat, yielding when the visitor touches the canvas) |
| Primary button is the ink, not a second hue; only the control that approves money is PayPal blue | polyfork.dev `style.css` (`.btn.blue`, comment "secondary buttons take the ink, not a second hue") |
| Kit tile: padded tile, inset top highlight, picture on an inner panel | nolly-studio/cult-ui `apps/www/registry/default/ui/minimal-card.tsx` |
| Pill label with an inset highlight (readouts, chips) | nolly-studio/cult-ui `apps/www/registry/default/ui/neumorph-eyebrow.tsx` |
| Money that rolls to its value on a spring (mass .8, stiffness 75, damping 15) | nolly-studio/cult-ui `apps/www/registry/default/ui/rolling-number.tsx`, ported to plain JS in `public/home.js` `springTo` |
| Clay and the colour sweep when a licence lands | Oasis `public/film-player.js` (`setClay`, `sweep`) |
| Light and dark guard pair (`@media (prefers-color-scheme: dark)` with `:root:not([data-theme="light"])`, plus `:root[data-theme="dark"]`) | shadcn/ui and Radix Themes CSS-variable theming |
| Spectrogram: one pixel per frame and bin painted into an ImageData, drawn scaled through the browser's bilinear filter | wavesurfer.js `src/spectrogram-setup.ts` (`paintColumnPixels`, `createImageBitmap`, `drawImage`), in `public/audio.js` `drawSpec` |
| Spectrogram colour map: Roseus, near-black through indigo, magenta and orange to near-white; the picture carries its own light in both themes | Audacity's default "Color (New)" scheme, `src/spectrogram/internal/roseuscolormaps.h` and `spectrogramcolors.cpp` (the table from github.com/dofuuz/roseus), packed in `public/spectrogram-roseus.js`; the same table is wavesurfer's `colorMap: 'roseus'` |
| Waveform playback: the played part in a second colour clipped to the playhead, plus a cursor line | wavesurfer.js `src/renderer.ts` `renderProgress`, in `public/audio.js` `drawWave` |
| Knob slider: 6px track, 16px thumb with a 1px accent border on the surface, a 4px soft ring on hover and focus | shadcn/ui `apps/v4/registry/new-york-v4/ui/slider.tsx` (`h-1.5`, `size-4 border-primary bg-white`, `hover:ring-4 ring-ring/50`), in `sound.css` `.a-range` |
| The silent hero's "Muted. Tap to listen" pill in the corner of the picture, turning "Listening" and fading after the gesture | the muted-autoplay unmute pill of video players (the same corner control YouTube, Vimeo and X put on autoplaying video), in `home.js` `mountHero` |

ui.watermelon.sh was read as a counter-example: its home is `font-mono` everywhere with `//EYEBROW` labels above every
section; Oasis uses no eyebrows and one text face.

## Type

One variable face, **Bricolage Grotesque** (OFL, `public/fonts/bricolage-grotesque-latin.woff2`), with a weight axis
(200 to 800) and an optical-size axis (12 to 96) that the browser drives from the font size, so display and text are
the same family drawn differently. Code and readouts are **Geist Mono** (OFL, `public/fonts/geist-mono-latin.woff2`).
Google Fonts is not loaded anywhere.

| Token | Value | Use |
|---|---|---|
| `--font-sans` | Bricolage Grotesque | everything that is not code |
| `--font-mono` | Geist Mono | code, ids, readouts |
| `--fs-xs` | 12px | captions, order ids |
| `--fs-sm` | 13.5px | chips, table meta, mono readouts |
| `--fs-base` | 16px | body |
| `--fs-md` | 18px | card titles |
| `--fs-lg` | 22px | lede, money in cards |
| `--fs-xl` | 28px | h3, big money |
| `--fs-2xl` | 36px | h2 on small screens |
| `--fs-3xl` | clamp(36px, 4vw, 52px) | h2 |
| `--fs-4xl` | clamp(44px, 5.2vw, 72px) | page h1 |
| `--fs-display` | clamp(52px, 7.2vw, 108px) | the home hero only |

Weights: `--w-light 300`, `--w-regular 400`, `--w-medium 500`, `--w-semibold 600`, `--w-bold 700`, `--w-black 800`.
Display is 800, h2 700, h3 600, body 400, UI labels 500 or 600.

Tracking tightens as size grows: `--ls-display -.045em`, `--ls-tight -.03em` (h1, h2), `--ls-snug -.015em` (h3),
`--ls-caps .06em` (the only place letter-spacing is positive). Line heights: `--lh-display .92`, `--lh-tight 1.05`,
`--lh-snug 1.25`, `--lh-body 1.55`.

Money and counts always line up: put `.num` (or `.money`) on the element, which sets `font-variant-numeric:
tabular-nums`. Headings get `text-wrap: balance`, paragraphs `text-wrap: pretty`.

Ready-made classes: `.t-display .t-h1 .t-h2 .t-h3 .t-lede .t-caps .num .mono`.

## Colour

One accent. Lantern (`--accent #E08A1E` light, `#F0A440` dark) is the only brand hue: fills, highlights, focus, large
accent text. For small text on the page background use `--accent-text` (`#A3600C` light), which passes AA; the raw
accent does not. PayPal's colours (`--paypal`, `--paypal-deep`, `--paypal-navy`) appear only on the control that
approves money. `--ok` is green for a landed payment, `--danger` for an error line.

| Token | Light | Dark |
|---|---|---|
| `--bg` | #F6F7F9 | #0F1115 |
| `--surface` | #FFFFFF | #171A20 |
| `--sunk` | #EEF0F4 | #1F232B |
| `--ink` | #15171C | #EDEEF2 |
| `--ink-2` | #40454F | #C4C9D4 |
| `--muted` | #6B7280 | #8F96A5 |
| `--line` / `--line-strong` | #E2E5EB / #C9CED8 | #272B34 / #3A404C |
| `--sheet` | #E9ECF1 | #E9ECF1 (the model sheet is always light; a light square in a dark tile reads as a mounted print) |

Shadows are tinted with `--shadow-color` (an RGB triple) and come in `--shadow-sm`, `--shadow`, `--shadow-lg`;
`--inset-top` is the 1px highlight along a tile's top edge; `--ring` is the focus ring.

Dark mode follows the system. To pin a page, set `data-theme="light|dark"` on `<html>`. A surface that has its own
light, such as the hero over a daytime sky or the model sheet, overrides the surface tokens locally (see `.hero` and
`.hero.night` in `site.css`) instead of reading the theme.

## Spacing and shape

4px steps: `--s-1 4`, `--s-2 8`, `--s-3 12`, `--s-4 16`, `--s-5 24`, `--s-6 32`, `--s-7 48`, `--s-8 64`, `--s-9 96`,
`--s-10 128`. Page gutter `--gutter` (24px, 16px under 768px), page measure `--measure 1240px` (`.wrap`).
Sections are `section.band` (96px vertical, 64px on phones).

Radii, and only these: buttons and chips are pills (`--r-pill`), controls and inputs `--r 12px`, inner panels
`--r-sm 8px`, frames and tiles `--r-lg 20px`. Nothing else is rounded.

## Motion

Durations: `--t-fast 120ms` (press, hover colour), `--t 200ms` (hover lift, chip state), `--t-slow 400ms` (panels,
fades), `--t-reveal 700ms` (entrances). Easings: `--ease-out cubic-bezier(.16,1,.3,1)` for almost everything,
`--ease-in-out cubic-bezier(.65,0,.35,1)` for sky and colour fades, `--ease-spring cubic-bezier(.34,1.4,.64,1)` for a
chip or number landing. Animate `transform` and `opacity` only. Everything that moves on its own is switched off
under `prefers-reduced-motion: reduce` (see the block at the end of `site.css`).

Layers: `--z-sticky 20` (top bar), `--z-overlay 30`, `--z-toast 40`, `--z-app 50` (the studio).

## Components in site.css you can reuse

`.btn` (`.primary`, `.paypal`, `.small`), `.link`, `.chip`, `.state` (`.live`, `.wait`), `.panel`, `.field`,
`.kv`, `.big`, `.secret`, `.code`, `.stage` (a live 3D frame), `.knob` / `.knobs`, `.readout`, `.piece` (kit tile),
`.sales` / `.sale` / `.creator` (the ledger), `.receipt`, `.skel`, `.rise` (entrance on scroll), `.toast`.

## Rules the home page follows (and other pages should)

- No eyebrows, no section numbers, no decorative dots, no em dashes. Headlines are short and sentence case.
- One accent on the page; PayPal blue only on the control that spends.
- A hero is the product doing its thing in the live runtime, never a static picture of it.
- Every count and amount is real data from the API, in tabular numerals.
