# Polyfork (Build with Gemini XPRIZE, 1st place) — Devpost summary as fetched 2026-10-01 from devpost.com/software/polyfork

Tagline: "3D assets you can recolor, resize, remix. Each model is a little program, AI-native, and fully customizable."

Inspiration: As software is increasingly written by agents, the next frontier is 3D. The browser lacks 3D asset infrastructure. Assets reimagined as parametric, AI-native, customisable in the browser before download. Models as code rather than binary files makes them compatible with agents.

What it does: 3D asset store where models are configurable programs. Geometry rebuilds when knobs change (a traffic cone goes 280 -> 472 triangles). Kits share "one 4 m grid, one palette, one set of build rules" — 513 of 583 models in kits. Ships as ES modules from a live CDN URL. 295 models free with no account. /llms.txt, REST API and MCP server: "14,524 API and MCP calls from 29 keys". 583 published models, 5,774 knobs, 175 new models a week.

How built: one person supervising an agent factory. One-line brief -> agent writes production brief + reference art (Gemini) -> agent writes geometry as code -> model renders itself through a validation harness -> a different agent in a fresh session grades against brief and kit rules, rejecting about two-thirds. "Every build writes down what it learned... four in ten of those lessons come from builds no person ever looked at." Vertex AI, AI Studio fallback, daily liveness checks.

Challenges: models passed self-checks but had rendering errors; grading agents agreed with builders until fresh sessions and kit standards; "The most useful thing I built is the harness that measures the finished GLB and contradicts the agent"; Stripe migration mid-hackathon.

Accomplishments: first sale on launch day Aug 1 2026; "54 paying customers, a free tier that is more than a third of the catalogue, and 43 of 100 founding lifetime seats sold. Related-party revenue is zero." $4,428 first-month revenue. Every finished model looked at by a person. Lessons from 1,743 graded passes applied to later builds.

Learned: human judgment for proportion; code-first was the single key decision; generalised feedback compounds; self-reported metrics need external verification.

Next: parallel build lanes, biggest programmatic 3D archive, train models on 10.3 GB of build transcripts, standard asset layer for prompt-to-world generators.

Built with: CSS, PHP, Three.js. Try it: polyfork.dev/try. Solo developer.
