# An agent runs a launch campaign on Oasis over MCP

Recorded 2026-10-04T00:33:27.283Z by `scripts/campaign-agent.mjs` against `http://localhost:5177/mcp`.
The agent is Claude (claude-opus-5-5) with no Oasis code: only the MCP tools `make_film`, `get_film`.

**Brief:** You're the creative director at a tiny launch agency, and it's Friday. Six clients need a launch film by tonight. Make all six on Oasis with make_film, one in each world it knows: a Kyoto street, a seaside town, a snowy winter village, a candy-pastel street, an autumn high street, and San Francisco. The clients are fictional small businesses and startups that you invent, and the films should make people laugh: deadpan, warm, a little absurd, like a good parody ad. Put the brand name in quotes in each brief, give each one a punchline, and name the world in the brief so Oasis builds the right street. Keep it kind: no real people, no real brands, nothing mean. Make the San Francisco one vertical (9:16) for Reels, and the rest landscape. When all six are made, check one with get_film, then give me a one-line pitch for each.

**→ `make_film`** `{"brief":"A 15-second deadpan teaser for \"Slow Noodle Co.\" on a Kyoto street at dusk: a ramen shop so calm its noodles take a full minute to slurp. Lanterns flicker, the camera pushes in patiently on the sign. Punchline end card: \"Fast food? We've heard of it.\"","format":"16:9","agent_name":"Friday Launch Agency"}`

**←** `{ "film_id": "f74d90f5eeb", "title": "Slow Noodle Co.", "link": "http://localhost:5177/#/film/f74d90f5eeb", "seconds": 17.5, "shots": [ "orbit 4.5s dusk", "dolly 3.5s dusk + card", "dolly 3.2s dusk", "crane 3.5s dusk", "static 2.8s night + card" ], "signs": [ "Marquee Wordmark (roof) by oasis-factory", "Retro Sunset (kerb) by oasis-factory", "Quiet Quote Card (roof) by oasis-factory" ], "brand": {`

**→ `make_film`** `{"brief":"A 15-second warm parody ad for \"Gull Friends Insurance\" in a sunny seaside town: the first policy that covers chips stolen by seagulls. Orbit the harbour-front shop, dolly past cheerful signs. Punchline end card: \"They'll take your chips. Not your peace of mind.\"","format":"16:9","agent_name":"Friday Launch Agency"}`

**←** `{ "film_id": "f7a44d54f56", "title": "Gull Friends Insurance", "link": "http://localhost:5177/#/film/f7a44d54f56", "seconds": 16, "shots": [ "orbit 3s day", "dolly 2.4s day + card", "push 2.2s day", "dolly 3s day", "crane 2.8s dusk", "static 2.6s night + card" ], "signs": [ "Marquee Wordmark (roof) by oasis-factory", "Retro Sunset (kerb) by oasis-factory", "Clickworthy Thumbnail (roof) by oasis-fa`

**→ `make_film`** `{"brief":"A 15-second cosy launch film for \"Mitten Matchmakers\" in a snowy winter village: a tiny shop that reunites lonely single mittens with new partners. Night crane over glowing snowy rooftops, push-in on the shop sign. Punchline end card: \"Every left deserves a right.\"","format":"16:9","agent_name":"Friday Launch Agency"}`

**←** `{ "film_id": "f4a8bbc1005", "title": "Mitten Matchmakers: Every Left Deserves a Right", "link": "http://localhost:5177/#/film/f4a8bbc1005", "seconds": 15.6, "shots": [ "crane 4s night", "dolly 3s night", "push 3.3s night", "crane 2.5s night", "static 2.8s night + card" ], "signs": [ "Marquee Wordmark (roof) by oasis-factory", "Quiet Quote Card (kerb) by oasis-factory", "Admit One Ticket (kerb) by `

**→ `make_film`** `{"brief":"A 15-second absurdly earnest teaser for \"Sprinkle Compliance Ltd.\" on a candy-pastel street: certified inspectors who make sure every cupcake has enough sprinkles. Dolly down the pastel shopfronts, orbit the sign. Punchline end card: \"Zero tolerance for plain.\"","format":"16:9","agent_name":"Friday Launch Agency"}`

**←** `{ "film_id": "f101afa739b", "title": "Sprinkle Compliance Ltd.", "link": "http://localhost:5177/#/film/f101afa739b", "seconds": 16, "shots": [ "orbit 3s day", "dolly 2.4s day + card", "push 2.2s day", "dolly 3s day", "crane 2.8s dusk", "static 2.6s night + card" ], "signs": [ "Marquee Wordmark (roof) by oasis-factory", "Bauhaus Grid Poster (kerb) by oasis-factory", "Admit One Ticket (kerb) by oasi`

**→ `make_film`** `{"brief":"A 15-second deadpan launch film for \"Leaf It To Us\" on an autumn high street: a concierge service that hand-picks the single crunchiest leaf and delivers it to your doorstep for stepping on. Slow dolly through orange shopfronts, push-in on the sign. Punchline end card: \"Crunch, curated.\"","format":"16:9","agent_name":"Friday Launch Agency"}`

**←** `{ "film_id": "fb6ee3f4e1b", "title": "Leaf It To Us", "link": "http://localhost:5177/#/film/fb6ee3f4e1b", "seconds": 17.5, "shots": [ "orbit 4.5s day", "dolly 3.5s day + card", "dolly 3.2s day", "crane 3.5s dusk", "static 2.8s night + card" ], "signs": [ "Marquee Wordmark (roof) by oasis-factory", "Raster Event Poster (kerb) by oasis-factory" ], "brand": { "primary": "#C8553D", "secondary": "#7A4A`

**→ `make_film`** `{"brief":"A 15-second vertical Reels parody for \"Nap.ai\" in San Francisco: a startup with an AI that does absolutely nothing so you can rest, pitched with full tech-launch seriousness. Push-in on a hilly SF street, orbit the shop sign, night crane finish. Punchline end card: \"Now with 0% more features.\"","format":"9:16","agent_name":"Friday Launch Agency"}`

**←** `{ "film_id": "f3886d45a30", "title": "Nap.ai: Does Nothing. Beautifully.", "link": "http://localhost:5177/#/film/f3886d45a30", "seconds": 16, "shots": [ "orbit 3s night", "dolly 2.4s night + card", "push 2.2s night", "dolly 3s night", "crane 2.8s night", "static 2.6s night + card" ], "signs": [ "Marquee Wordmark (roof) by oasis-factory", "Raster Event Poster (kerb) by oasis-factory", "Admit One Ti`

**→ `get_film`** `{"film_id":"f3886d45a30"}`

**←** `{ "film_id": "f3886d45a30", "title": "Nap.ai: Does Nothing. Beautifully.", "link": "http://localhost:5177/#/film/f3886d45a30", "seconds": 16, "shots": [ "orbit 3s night", "dolly 2.4s night + card", "push 2.2s night", "dolly 3s night", "crane 2.8s night", "static 2.6s night + card" ], "signs": [ "Marquee Wordmark (roof) by oasis-factory", "Raster Event Poster (kerb) by oasis-factory", "Admit One Ti`

**Agent:** I made all six films. None are finished yet: when I checked Nap.ai, it was still waiting to render, with no MP4. None are licensed either, because I didn't have a mandate (budget token). So right now the paid pieces will render grey and the signs will have watermarks. If you send me a mandate, I'll license all six. That's $279 in total.

**The pitches:**

1. **"Slow Noodle Co."** (Kyoto, dusk, blossom): a ramen shop so calm a slurp takes a full minute. *"Fast food? We've heard of it."* · [film](http://localhost:5177/#/film/f74d90f5eeb) · $44
2. **"Gull Friends Insurance"** (seaside town): finally, cover for chips stolen by seagulls. *"They'll take your chips. Not your peace of mind."* · [film](http://localhost:5177/#/film/f7a44d54f56) · $57
3. **"Mitten Matchmakers"** (snowy winter village, night): reuniting lonely single mittens with new partners. *"Every left deserves a right."* · [film](http://localhost:5177/#/film/f4a8bbc1005) · $33
4. **"Sprinkle Compliance Ltd."** (candy-pastel street): certified inspectors making sure every cupcake has enough sprinkles. *"Zero tolerance for plain."* · [film](http://localhost:5177/#/film/f101afa739b) · $49
5. **"Leaf It To Us"** (autumn high street, falling leaves): the single crunchiest leaf, hand-picked and delivered to your door. *"Crunch, curated."* · [film](http://localhost:5177/#/film/fb6ee3f4e1b) · $44
6. **"Nap.ai"** (San Francisco, foggy night, 9:16 for Reels): an AI that does absolutely nothing so you can rest. *"Now with 0% more features."* · [film](http://localhost:5177/#/film/f3886d45a30) · $52

