# Demo video plan

**Tagline (one sentence):** Oasis turns a one-line brief into a brand film built from creators' 3D and 2D assets, and one PayPal order pays every creator in it.

## What Polyfork's video does, and where it stops

Polyfork's launch video ([youtube.com/watch?v=C9z3euC82ss](https://www.youtube.com/watch?v=C9z3euC82ss), 51 s) was read
frame by frame from YouTube's own storyboard thumbnails:

| Time | Beat | Why it works |
| --- | --- | --- |
| 0-8 s | "You bought a 3D model. You got a 3D model. One model." over a plain truck that fades. | The problem in one line, no voice needed. |
| 9-25 s | One watchtower. A real cursor drags real knobs: *reshape*, *recolor*, *remix* in big blue words. | One hero object, the real product UI, one verb at a time. |
| 26-30 s | The tower bursts into a crowd: "534 ... 950+ configurations. One asset." | Escalation: one becomes a thousand. |
| 31-40 s | "One import." One line of code, a windmill, engine logos. | Developer simplicity. |
| 40-48 s | "Completely AI-native": a terminal says "build me a tiny forest", "now a medieval town around it", "now make it night". | Agents build a world from the assets. |
| 48-51 s | "22 → 100+ new assets a week", a grid, the logo. | Scale. |

Every frame is the real product, there is one idea told in rising steps, it is calm and white with one accent, and it is
short. What it never shows: money moving, a finished thing a business would pay for, or who gets paid. Its terminal
text is too small to read.

## How Oasis wins the same three minutes

Polyfork sells the parts. Oasis shows the parts becoming a finished brand film, and the money moving to the people who
made each part, live, inside PayPal. The climax is the one thing no asset store can show: **PayPal approves and the
colour sweeps through the street**, then each creator's payout lands.

## The cut (v3, 95 s, no narration)

Pat's note on v2: it read as a feature list ("ten films, ten sentences, every creator paid"), which is the one thing
Polyfork's video never does. v3 is cut the way theirs is: one hero object (one brief, one street), the real product
on screen the whole time, one idea told in rising steps, one big word at a time, music instead of a voice. Every
frame is the real app or a server-rendered film; every number is from a real sandbox order.

| Time | On screen | The word | Why |
| --- | --- | --- | --- |
| 0:00-0:05 | White. The brief is typed by hand: *a 15-second teaser for "Momiji Ramen" on a Kyoto street at dusk*. | **One sentence.** | Polyfork's "one model"; our hero object is a sentence. |
| 0:05-0:13 | The Studio, zoomed into the viewer: the street drops in piece by piece, clay, and the first cut starts. | **becomes a street.** | The first wow: the sentence is now a place. |
| 0:13-0:29 | The film, full bleed, its own soundtrack. A word on each cut, none on the 3D title (the title is the word). | **Cut like an editor.** / **Whip.** / **Zoom.** / **Dusk to night.** | Polyfork's reshape / recolor / remix: one verb per beat. |
| 0:29-0:44 | The Studio, tucked top-right: Claude's cut swaps in; Dream; Hype; a ramp and a cut changed. | **Claude directs.** / **Dream.** / **Hype.** / **Instant.** | Real knobs, real cursor. |
| 0:44-1:00 | Clay street, cursor to Pay with PayPal; PayPal's own page; back in the Studio the colour sweeps through; the licence panel's payouts land, set large on the right. | **Clay until it is paid.** / **Paid.** / **Five creators. One order.** | The climax no asset store can show: money moving, live. |
| 1:00-1:08 | The one-order scene: every paid piece flies back to its maker, the order pays all five. | **Every piece, paid to its maker.** | Escalation from one street to its makers. |
| 1:08-1:24 | White, then six launch films land one by one, each with its real PayPal order id; the count. | **Or hand it to an agent.** / **6 films. 6 PayPal orders. $279.** | One becomes many (Polyfork's 950 configurations). |
| 1:24-1:29 | The Studio flips to 9:16. | **9:16 for Reels.** | Delivery. |
| 1:29-1:35 | Logo. | **Brief in. Brand film out. Every creator paid.** | End card, the only sentence of copy. |

Music: the Studio's own synthesised bed (`server/film-music.js`, mood `bright`, 96 s), so the demo's soundtrack is a
program too. Composition: `oasis-video/videos/oasis-demo-v3/build.py` (HyperFrames); footage from the Studio take
(`scripts/demo-take.mjs`) and the rendered films.

## The earlier structure (v2: problem 30 s, demo 90 s, business 30 s)

1. **Problem (0:00-0:30).** 91% of businesses use video to market themselves, and 63% already use AI video tools
   (Wyzowl, 2026). Hana runs a ramen shop in Kyoto and needs a 15-second teaser. AI tools give her pixels with no
   licence, built on work nobody was paid for. Mika makes the shop fronts those films are built from and never sees a
   cent.
2. **Demo (0:30-2:00), one unbroken journey in the real app.**
   - Type the brief, press Direct. The street drops in piece by piece and the cut plays: ramp, whip, zoom-through, the
     3D title slamming into the street, dusk turning to night, the end card.
   - Claude's cut arrives and swaps in. Switch Hype to Dream and back. Drag a speed ramp, change a transition. Each is
     instant.
   - It is clay: every paid piece. Pay with PayPal, approve, and the colour sweeps through the street. The payouts land:
     mika-blocks $5.40, shrinewright $1.80, parkline $2.70, tramworks $2.70.
   - Flip to 9:16 for Reels. Render the MP4.
3. **Business (2:00-2:30).** Every film is one PayPal order with many payees, so creative assets become a PayPal
   marketplace. Agents can run the same loop inside a budget a human approved in PayPal (Vault), over MCP. Next: more
   kits from more creators, and PayPal multiparty settlement for the split.

## Rules for the cut

- Real footage of the real app only; the film shots are the server-rendered MP4, not mock-ups.
- No code on screen. Large, readable UI; zoom into the timeline and the licence panel when they matter.
- One idea per beat, rising: one street, one cut, one edit, one payment, many creators.
