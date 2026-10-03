# Oasis

**Tagline:** Design assets built as tiny programs. Your AI agent remixes them into your brand and opens a PayPal order that only you can approve.

## Inspiration

Agents can build an app in a minute. Ask one for a *place*, a little town for a game level, a product launch scene, a
playable diorama for a website, and it stalls. It can generate a picture, which is flat, unlicensed and different every
time. Or a person spends a week stitching together models from a dozen stores, each in a different style, scale and
licence, and pays each store separately.

We wanted the opposite: describe a place and watch it build itself out of real, consistent, licensable 3D pieces. Then
change it by talking to it, reshape any piece by hand, and buy the whole thing in one go, with every creator whose
piece you used getting paid. The payment is the part an agent must never do alone, so that's what PayPal's order
approval is for: the agent can build and ask, only the human can pay.

## What it does

**Describe a place. Watch it build.** Type "a Kyoto market street at dusk" and Oasis lays out a street from a kit of
parametric low-poly 3D pieces (15 today: shops, cottages, apartment flats, market stalls, a torii gate, a
tram, cars, fountains, benches, trees, lamps, road and plaza tiles), then Claude art-directs it: names the place,
picks a palette, swaps pieces so it tells the story. Pieces drop in one by one, in real 3D you can orbit. The tram runs
its rails; at night the windows glow.

**Talk to it.** "Make it night and turn the tram mint green." Claude edits the world through a small set of operations
(set, add, remove, time) and only the pieces that changed rebuild.

**Reshape anything.** Click any piece and its knobs appear: floors, width, roof style, awning colour, lit windows. Every
piece is a program, so a three-storey shop *becomes* a five-storey shop; nothing is stretched.

**Buy the whole world in one PayPal approval.** The world's bill of materials is one order: one licence per piece type,
covering every remix of it in that world, paying every creator. Buying unlocks the world as a single **GLB** for
three.js, Unity, Godot or Blender, plus each piece's program. Worlds have share links.

**Any agent can build and buy.** Over MCP (`/mcp`), `build_world` and `edit_world` return a link and a bill;
`create_order` with `world_id` opens the PayPal order inside a **mandate**, a budget the human issued that the server
holds and enforces (shaped after the IntentMandate in Google's AP2). The agent can ask; it can't pay.

The same store also sells 83 2D design assets (icons, UI, posters) built the same way, with Brand Mode re-skinning
every one in your palette.

**Make a film of it.** The studio (`/#/studio`) turns a brief into a short film: the street is built from the kit, 2D
design assets (a wordmark, a poster) are hung on it as roof and kerb signs in the brand's colours, Claude directs the
cut (orbit, a dolly down the road, a push-in on the shop, a night crane past the glowing sign, an end card), and the
server renders the MP4 frame by frame, so the same brief always gives the same film. The street is alive: the tram
runs, cars drive, cherry blossom or snow falls by theme, and the light fades from dusk to night inside a shot as the
windows and the sign come on. Even the soundtrack is a program, synthesised from the film's seed and muxed in. The same
cut renders landscape, vertical or square. Every piece, sign and card
in it is one line on one bill, licensed in one order inside the human's budget. Until it is licensed, paid pieces
render grey and signs carry a watermark. Agents get the same thing over MCP with `make_film` and `get_film`.

## How we built it

**A 3D engine where every model is a program.** A kit piece is an ES module whose `build(p)` returns plain parts (boxes,
gabled roofs, prisms, cones) in metres on one 6 m grid. The server runs it in a sandbox and returns the parts; the
browser merges them per colour into flat-shaded three.js meshes with soft shadows and day/dusk/night lighting; the
server writes the same parts to GLB with glTF-Transform and projects them to isometric SVG for thumbnails. One source,
three outputs, so the file you buy is exactly the model you saw.

**The world planner.** A deterministic street generator lays out road, buildings, greenery and props from the
prompt's theme, so a world appears instantly; Claude then art-directs it by calling an `edit_world` tool with typed
operations that the server validates against every piece's knob schema.

**PayPal, end to end** (walkthrough with code references: [PAYPAL.md](https://github.com/machmoon/oasis/blob/main/PAYPAL.md)):
- **Orders v2** via `@paypal/paypal-server-sdk`: itemised `DIGITAL_GOODS`, `PAY_NOW`, `NO_SHIPPING`, return URLs so an
  MCP agent can hand a human the `payer-action` link, and the agent's name and cap in the order description.
- **Smart Buttons** in the asset page, the cart and inside the agent chat.
- **Capture is server-side and verified:** licences are issued only if the captured amount and currency equal what
  the server priced; a mismatch is refunded automatically. One capture per order, because the browser, the return URL
  and a webhook can race.
- **`PayPal-Request-Id` idempotency** on create, capture and refund.
- **Webhooks**, verified with `verify-webhook-signature`: `CHECKOUT.ORDER.APPROVED` captures orders whose tab closed,
  `PAYMENT.CAPTURE.REFUNDED` revokes licences, `PAYMENT.PAYOUTS-ITEM.*` tracks each royalty.
- **Payouts** for royalties, held until the refund window closes and cancelled by a refund; **refunds** within 14 days
  through the Payments API. In production the creator split moves to **PayPal Commerce Platform** (per-unit `payee` +
  `platform_fees`) so refunds unwind it automatically.
- **It runs against the real PayPal sandbox** ([docs/SANDBOX-RUN.md](https://github.com/machmoon/oasis/blob/main/docs/SANDBOX-RUN.md), `npm run sandbox-demo`): an over-budget agent order refused by the mandate; orders 47M93830FG9553221, 8V3397808V699150W captured (56834260T0051970X, 7BX91257JM822105U); refund 8GM623335Y0788449 revoking the licence (download then returns 410) and returning the budget; and a fork-of-a-fork sale paid upstream as Payouts batch CXTQ4BE5FC6GC. In that run, approval used PayPal's published sandbox test card instead of a person logging in.

**The asset factory.** 59 of the 83 assets were written by an agent pipeline (21 are
hand-written programs, 3 are AI forks). The first 36 came from factory v1 (builder self-review only, all since
re-checked by the harness). Every build since tonight's v2 goes through the full gate below: 63 builds,
23 published, 40 rejected (the factory is stopped for judging, so these match `factory/stats.jsonl` line for line). Nothing ships on the builder's word:
1. Claude writes a program from a one-line brief and critiques its own renders.
2. **A harness measures it.** Every asset is rendered across its knob space: defaults, presets, every range at min and
   max, random combinations, and a light and a dark brand. Blank output, slow renders, oversize SVG, missing brand
   roles and **dead knobs** (a knob whose every value yields byte-identical SVG) are rejected.
3. **An independent grader in a fresh session**, which never saw the builder's reasoning, looks at those renders and
   publishes or rejects. It has caught real bugs a self-review missed: a checkout screen whose order total didn't add
   up, a login screen whose focus ring turned the error colour on one brand.
4. Each verdict writes one general lesson into every later build's prompt (115 so far).

Every verdict, with the grader's main finding, and every test name are in
[docs/PROOF.md](https://github.com/machmoon/oasis/blob/main/docs/PROOF.md), generated from the factory log and the test run.

**Safety.** Asset programs, including AI-written forks, run in QuickJS compiled to WebAssembly: no `require`, no file
system, no network, a 48 MB heap. An allocation storm can outrun QuickJS's own interrupt (it took 8.3 s to die in
testing), so every server render runs in a worker thread that is **terminated at 3 s**. Output must be SVG and is only
shown through `<img>`. Paid source never leaves the server; catalogue previews are low-res raster comps.

**Tested.** 30/30 tests pass: price tampering, the capture race, amount-mismatch refunds, refund revocation,
webhook replays, pending and denied captures, declined cards, spending mandates (two orders racing for the last dollars), order ownership, royalty cents along a fork chain, sandbox escapes and the deadline kill.

**Stack.** Node + Express, a no-build vanilla JS store, Claude Opus 5.5 (agent, forks, factory, grader), MCP Streamable
HTTP, resvg, Playwright, Render.

## Challenges we ran into

- **The builder approves its own dead knobs.** On the first 40 assets, a pixel-diff harness flagged 22 with at least one
  knob that barely changed anything; the stricter byte-identical rule found 3 that changed nothing at their defaults. "Every knob
  must change the bytes" became a hard gate.
- **A memory bomb beat the sandbox's own clock.** The fix was a deadline enforced from outside, by killing the worker.
- **Brand Mode on dark brands** made light components unreadable until themed components learned to follow the
  brand's background luminance.
- **Royalties in cents.** 30% of $7.99 split across a parent and grandparents must sum to exactly 799 cents. Tested.

## Accomplishments that we're proud of

- A prompt becomes a real, orbitable 3D world in seconds, and you can keep talking to it.
- One PayPal approval buys a world made of many creators' pieces, and the GLB you download is the model you saw.
- An outside agent can do the whole loop over MCP, but only spends what a human allowed and never pays on its own.

## What we learned

- **Models as programs** is what makes agents useful in 3D: a planner can read a piece's knobs, change one, and the
  geometry rebuilds. Files can't be art-directed; programs can.
- **Agents should edit, not rewrite.** Asking Claude to rewrite a 50-piece layout as JSON broke; giving it typed
  operations that the server validates made it fast and reliable.
- For agentic commerce the right primitive isn't "the agent has a card". It's **the agent creates the order, the human
  approves it, the server enforces the budget**, and PayPal's order approval already works that way.

## What's next

More kits from the agent factory (the harness and grader now run on the 3D format), walkable worlds, a three.js
`createWorld()` import for any saved world, and PayPal Commerce Platform onboarding so creator splits settle at capture.
