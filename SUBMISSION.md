# Oasis

**Tagline:** Oasis turns a one-line brief into a brand film built from creators' 3D and 2D assets, and one PayPal order pays every creator in it.

## Inspiration

91% of businesses use video to market themselves, and 63% already use AI video tools (Wyzowl, 2026). Those tools
hand back pixels: no licence, no record of whose work went in, nobody paid. Hana runs a ramen shop and needs a
15-second teaser. Mika makes the 3D shop fronts that a film like that is built from, and has never been paid when one
of them appears in an ad.

We wanted the film and the payment to be the same object: every piece in the film is a licensable asset by a named
creator, and paying for the film pays all of them, in one PayPal order.

## What it does

**Type a brief, get a cut.** "A 15-second teaser for Momiji Ramen on a Kyoto market street at dusk." Oasis lays out a
street from creators' parametric 3D pieces, hangs 2D design assets on it as signs in the brand's colours (a roof
board, a poster), strings lanterns, and cuts the film like an After Effects editor: speed-ramped camera moves, a whip
pan with real motion blur, a zoom-through, a glitch cut, the brand's name as a 3D title that drops into the street
and slams down with a camera hit, dusk fading to night as the windows come on, and an end-card lockup with the
brand's monogram. The first cut plays instantly; Claude re-directs it in the background and its cut swaps in.

**Edit it like an editor.** A Premiere-style workspace: a multi-track timeline (camera clips as filmstrips,
transitions, titles, light, the soundtrack's waveform), an inspector with a speed-ramp graph per shot, transition and
shake controls, three edit styles (Hype, Clean, Dream), 16:9, 9:16 and 1:1, and a director you can talk to.

**Clay until it is paid for.** Before licensing the street is clay and the signs say PREVIEW. Pay with PayPal, approve,
and the colour sweeps through the street piece by piece while each creator's payout lands. Then render the MP4 (every
frame is a function of the film, so the server's render matches the preview frame for frame).

**One order, many payees.** The film's bill is one PayPal Orders v2 order with an itemised line for every paid piece,
sign and mark. On capture each creator's share is booked and paid out through PayPal Payouts.

**Agents can run the same loop.** Over MCP (`make_film`, `get_film`, `buy_assets`), an agent makes and licenses a film
inside a budget a human approved once in PayPal (Vault); an order over the budget is refused before PayPal is called.

## How we built it

- **An edit engine on three.js** (`public/film-fx.js`): Penner easings for speed ramps (from ai/easings.net), camera
  shake after pmndrs/drei's CameraShake but seeded so it lands on the same frame every render, sub-frame motion blur
  after Remotion's CameraMotionBlur, three's DigitalGlitch and glfx.js's zoom blur for transitions, UnrealBloom and
  Bokeh passes, ACES filmic tone mapping, a gradient sky from three's hemisphere-light example, and a 3D title in Anton
  (SIL OFL) converted to three's typeface format with a port of facetype.js, built glyph by glyph so it can be tracked.
- **Deterministic rendering:** the server opens the film's page in headless Chromium, seeks every frame and pipes
  them to ffmpeg, the way Remotion renders a composition. The soundtrack is synthesised from the film's seed.
- **Claude as director** (Sonnet 5.5, one typed `write_film` tool): it rewrites the brand copy, signs and shot list;
  the server validates every value (`cleanFilm`) and never trusts the model.
- **PayPal** ([PAYPAL.md](https://github.com/machmoon/oasis/blob/main/PAYPAL.md)): Orders v2 via
  `@paypal/paypal-server-sdk` with itemised `DIGITAL_GOODS`; server-side capture that checks the amount and currency
  and refunds on a mismatch; `PayPal-Request-Id` idempotency; signed webhooks; refunds that revoke licences; Payouts
  for creator shares; Vault setup tokens for agent budgets.

## Proof

- **Real sandbox orders for films**, created by the Studio's own checkout (`POST /api/films/:id/checkout`, then
  `/claim`): 4RP48008TN547052G ($36.00), 5AJ62778LN069470H and 9EY72208CR7286120 ($27.00 each), all captured and
  split across five creators. For unattended runs the order is approved with one of PayPal's published sandbox test
  cards instead of a person in PayPal's window; capture, the amount check and the licence are the normal code path.
- The earlier end-to-end sandbox run (mandate refusal, capture, refund revoking a licence, Payouts batch) is in
  [docs/SANDBOX-RUN.md](https://github.com/machmoon/oasis/blob/main/docs/SANDBOX-RUN.md).
- 46/46 tests pass, including price tampering, the capture race, amount-mismatch refunds, refund revocation, budgets,
  and that the director's junk (unknown transitions, out-of-range hits, a second title) is dropped.
- The catalogue: 22 parametric 3D programs and 68 2D design assets from 7 creator accounts (sandbox accounts).

## Challenges we ran into

- **One NaN pixel blacked out whole frames.** A degenerate normal on a bevel produced a NaN that bloom blurred across
  the picture; a pass now makes the HDR image finite before anything spreads it.
- **The title kept hiding behind the set.** On a market street there is often no clear spot; the planner now shoots
  the title from whichever end of the street is clear, and cheats the set for that one shot when neither is.
- **Waiting on a model is dead air.** The procedural cut plays at once and Claude's cut replaces it.

## What we learned

- Payment is most convincing when you can see it: clay turning to colour says "this was paid for" faster than any
  receipt.
- For agentic commerce the right primitive is not "the agent has a card": the human approves a budget once in PayPal,
  the server enforces it, and every creator is paid from the same order.

## What's next

More kits from more creators, PayPal Commerce Platform multiparty settlement so the split happens at capture, and
films longer than a teaser.
