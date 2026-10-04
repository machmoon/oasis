# An agent runs a launch campaign on Oasis over MCP

Recorded 2026-10-04T02:08:15.121Z by `scripts/campaign-agent.mjs` against `http://localhost:5177/mcp`.
The agent is Claude (claude-opus-5-5) with no Oasis code: only the MCP tools `make_film`, `get_film`.

**Brief:** Throwback week. Make four short launch films on Oasis with make_film, each built on a classic internet meme from the late 1990s or early 2000s, for fictional small businesses you invent. Use only memes nobody owns: the Y2K bug panic, dial-up internet and the 56k loading wait, the bouncing screensaver logo that never quite hits the corner, "under construction" homepages with hit counters, chain emails that say forward this to ten friends, and the phrase "All your base are belong to us". Do not use real people, real brands, product names, song lyrics or characters. Put the brand name in quotes in each brief, give each a deadpan punchline for the end card, and name a world so Oasis builds the right street: use a Kyoto street, a seaside town, a snowy winter village and a candy-pastel street, one each. All landscape. When they are made, give me a one-line pitch for each.

**→ `make_film`** `{"brief":"A 15-second launch teaser for \"Dial-Up Dango\", a tiny dango stall on a Kyoto street at dusk. The meme is the 56k dial-up loading wait: signs show a progress bar crawling across the shopfront, a sign reading \"CONNECTING... 3%\", then \"CONNECTING... 4%\", while lanterns glow and the camera pushes in patiently. The skewers arrive one dumpling at a time, like a picture loading line by line. Deadpan end card: \"Dial-Up Dango. Fresh skewers, loading at 56k. Worth the wait.\"","format":"1`

**←** `{ "film_id": "f459c85a0b7", "title": "Dial-Up Dango: Now Loading", "link": "http://localhost:5177/#/film/f459c85a0b7", "seconds": 16, "shots": [ "orbit 3s dusk", "dolly 2.4s dusk + card", "push 2.2s dusk", "dolly 3s dusk", "crane 2.8s dusk", "static 2.6s night + card" ], "signs": [ "Marquee Wordmark (roof) by oasis-factory", "Bauhaus Grid Poster (kerb) by oasis-factory" ], "brand": { "primary": "#`

**→ `make_film`** `{"brief":"A 15-second launch teaser for \"Almost Corner Surf Rentals\", a little board-rental shack in a seaside town. The meme is the bouncing screensaver logo that never quite hits the corner: a shop sign slides diagonally across the beachfront, bounces off a wall, drifts toward the corner... and misses by a hair, again and again, as the camera orbits the boardwalk. Gulls look on, unimpressed. Deadpan end card: \"Almost Corner Surf Rentals. So close. Every single time.\"","format":"16:9"}`

**←** `{ "film_id": "f1a65788320", "title": "Almost Corner Surf Rentals", "link": "http://localhost:5177/#/film/f1a65788320", "seconds": 13, "shots": [ "orbit 3s day", "dolly 2.2s day + card", "push 2.4s day", "crane 2.8s dusk", "static 2.6s night + card" ], "signs": [ "Marquee Wordmark (roof) by oasis-factory", "Marquee Wordmark (roof) by oasis-factory", "Raster Event Poster (kerb) by oasis-factory", "Q`

**→ `make_film`** `{"brief":"A 15-second launch teaser for \"Millennium Mittens\", a knitwear shop in a snowy winter village. The meme is the Y2K bug panic: signs count down \"11:59:57... 11:59:58...\", a hand-lettered sign warns \"PREPARE FOR Y2K\", and the shop window stacks mittens like emergency supplies. Night crane shot rises over the village at midnight as the clock rolls over to \"01/01/1900\" and absolutely nothing happens except snow. Deadpan end card: \"Millennium Mittens. The world didn't end. Your han`

**←** `{ "film_id": "f377760c094", "title": "Millennium Mittens: Nothing Happens", "link": "http://localhost:5177/#/film/f377760c094", "seconds": 16, "shots": [ "orbit 3s night", "dolly 2.4s night + card", "push 2.2s night", "dolly 3s night", "crane 2.8s night", "static 2.6s night + card" ], "signs": [ "Marquee Wordmark (roof) by oasis-factory", "Raster Event Poster (kerb) by oasis-factory", "Clickworthy`

**→ `make_film`** `{"brief":"A 15-second launch teaser for \"Forward Fudge\", a fudge shop on a candy-pastel street. The meme is the chain email: signs in pastel pink and mint read \"FW: FW: FW: FW: SWEET LUCK\", \"Forward this fudge to ten friends\", and \"A girl in 1998 did not share her fudge. Her fudge was fine.\" The camera dollies past a shopfront under a blinking \"UNDER CONSTRUCTION\" banner with a hit counter reading 000007. Deadpan end card: \"Forward Fudge. Share with ten friends. Nothing bad will happe`

**←** `{ "film_id": "f57305f4526", "title": "Forward Fudge: FW: FW: Sweet Luck", "link": "http://localhost:5177/#/film/f57305f4526", "seconds": 14.6, "shots": [ "orbit 2.4s day", "dolly 2.6s day + card", "push 2s day", "dolly 2.6s day", "crane 2.4s dusk", "static 2.6s night + card" ], "signs": [ "Marquee Wordmark (roof) by oasis-factory", "Admit One Ticket (kerb) by oasis-factory", "Clickworthy Thumbnail`

**Agent:** I made all four throwback films. Each one is landscape and set on a different street.

1. **"Dial-Up Dango"** (Kyoto street, dusk, 16s): a dango stall whose skewers load one dumpling at a time, at 56k speed. *End card: "Fresh skewers, loading at 56k. Worth the wait."* [Watch](http://localhost:5177/#/film/f459c85a0b7)
2. **"Almost Corner Surf Rentals"** (seaside town, 13s): the shop sign bounces across the boardwalk like the old screensaver logo and misses the corner every time. *End card: "So close. Every single time."* [Watch](http://localhost:5177/#/film/f1a65788320)
3. **"Millennium Mittens"** (snowy winter village, night, 16s): the whole village braces for Y2K at midnight, and all that happens is snow. *End card: "The world didn't end. Your hands were still cold."* [Watch](http://localhost:5177/#/film/f377760c094)
4. **"Forward Fudge"** (candy-pastel street, 14.6s): a fudge shop runs on chain-email luck, with an "under construction" banner and a hit counter stuck at 000007. *End card: "Share with ten friends. Nothing bad will happen. Probably."* [Watch](http://localhost:5177/#/film/f57305f4526)

I used four of your six memes and left out "All your base are belong to us."

**Not licensed yet:** the films haven't been licensed and are still waiting to render. Until they're licensed, paid set pieces show up grey and the signs carry a watermark. Licensing all four costs **$207** in total ($48 + $54 + $58 + $47). If you send me your funded budget token (it starts with mdt_), I'll license them and that will pay every creator.

