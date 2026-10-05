# A kit over MCP

Recorded 2026-10-05T06:04:58.336Z by `scripts/mcp-kit-session.mjs` against `http://localhost:8795/mcp`.

Tools: `search_assets`, `get_asset`, `preview_asset`, `buy_assets`, `make_kit`, `get_kit`, `get_budget`

**→ `search_assets`** `{"query":"footstep"}` (4 ms)

```json
[
  {
    "asset_id": "footstep",
    "title": "Footstep",
    "kind": "foley",
    "kit": null,
    "author": "foleyroom",
    "price_usd": 3,
    "seconds": 0.5,
    "description": "One footstep whose surface, weight, pace and wetness are knobs; every seed is a different step, so a walk never repeats.",
    "knobs": [
      "surface",
      "weight",
      "pace",
      "wetness",
      "seed"
    ],
    "preview_wav": "http://localhost:8795/api/assets/footstep/render.wav",
    "card_png": "http://localhost:8795/api/assets/footstep/render.png"
  }
]
```


**→ `preview_asset`** `{"asset_id":"footstep","knobs":{"surface":"wood","weight":0.8,"seed":7}}` (26 ms)

```json
{"asset_id":"footstep","knobs":{"surface":"wood","weight":0.8,"pace":1,"wetness":0,"seed":7},"price_usd":3,"seconds":0.45,"peak":0.82,"rms":0.188,"centroid_hz":161,"watermarked":true}
```
returned: audio audio/wav 19 KB, image image/png 6 KB

**→ `make_kit`** `{"vibe":"a cosy wooden tavern with a crackling fire and a creaking door","agent_name":"the kit client"}` (11529 ms)

```json
{
  "kit_id": "kaf4d66b19c",
  "title": "Hearthside Tavern",
  "vibe": "a cosy wooden tavern with a crackling fire and a creaking door",
  "link": "http://localhost:8795/#/kit/kaf4d66b19c",
  "planned_by": "claude-sonnet-5-5",
  "parts": [
    {
      "name": "Tavern Door Creak Open",
      "asset_id": "wooden-door",
      "kind": "sfx",
      "author": "foleyroom",
      "price_usd": 3,
      "knobs": {
        "action": "open",
        "size": 0.65,
        "age": 0.85,
        "force": 0.3,
        "room": false,
        "seed": 412
      },
      "reason": "The old, slow hinge is the creaking door the vibe asks for, with a room tail to place it indoors.",
      "preview_wav": "http://localhost:8795/api/assets/wooden-door/render.wav?p=%7B%22action%22%3A%22open%22%2C%22size%22%3A0.65%2C%22age%22%3A0.85%2C%22force%22%3A0.3%2C%22room%22%3Afalse%2C%22seed%22%3A412%7D",
      "module": null,
      "wav": null
    },
    {
      "name": "Tavern Door Ease Shut",
      "asset_id": "wooden-door",
      "kind": "sfx",
      "author": "foleyroom",
      "price_usd": 0,
      "knobs": {
        "size": 0.65,
        "age": 0.7,
        "force": 0.35,
        "room": false,
        "seed": 1873
      },
      "reason": "This is the matching close, with a different seed so the creak and rattle don't repeat.",
      "preview_wav": "http://localhost:8795/api/assets/wooden-door/render.wav?p=%7B%22size%22%3A0.65%2C%22age%22%3A0.7%2C%22force%22%3A0.35%2C%22room%22%3Afalse%2C%22seed%22%3A1873%7D",
      "module": null,
      "wav": null
    },
    {
      "name": "Plank Step L",
      "asset_id": "footstep",
      "kind": "foley",
      "author": "foleyroom",
      "price_usd": 3,
      "knobs": {
        "surface": "wood",
        "weight": 0.6,
        "pace": 0.9,
        "seed": 207
      },
      "reason": "A dry, medium-weight step on wooden floorboards.",
      "preview_wav": "http://localhost:8795/api/assets/footstep/render.wav?p=%7B%22surface%22%3A%22wood%22%2C%22weight%22%3A0.6%2C%22pace%22%3A0.9%2C%22seed%22%3A207%7D",
      "module": null,
      "wav": null
    },
    {
      "name": "Plank Step R",
      "asset_id": "footstep",
      "kind": "foley",
      "author": "foleyroom",
      "price_usd": 0,
      "knobs": {
        "surface": "wood",
        "weight": 0.65,
        "pace": 0.9,
        "seed": 3359
      },
      "reason": "A second seed gives the other foot, so a walk across the tavern floor never repeats.",
      "preview_wav": "http://localhost:87
```


**→ `get_kit`** `{"kit_id":"kaf4d66b19c"}` (2 ms)

```json
{
  "kit_id": "kaf4d66b19c",
  "title": "Hearthside Tavern",
  "vibe": "a cosy wooden tavern with a crackling fire and a creaking door",
  "link": "http://localhost:8795/#/kit/kaf4d66b19c",
  "planned_by": "claude-sonnet-5-5",
  "parts": [
    {
      "name": "Tavern Door Creak Open",
      "asset_id": "wooden-door",
      "kind": "sfx",
      "author": "foleyroom",
      "price_usd": 3,
      "knobs": {
        "action": "open",
        "size": 0.65,
        "age": 0.85,
        "force": 0.3,
        "room": false,
        "seed": 412
      },
      "reason": "The old, slow hinge is the creaking door the vibe asks for, with a room tail to place it indoors.",
      "preview_wav": "http://localhost:8795/api/assets/wooden-door/render.wav?p=%7B%22action%22%3A%22open%22%2C%22size%22%3A0.65%2C%22age%22%3A0.85%2C%22force%22%3A0.3%2C%22room%22%3Afalse%2C%22seed%22%3A412%7D",
      "module": null,
      "wav": null
    },
    {
      "name": "Tavern Door Ease Shut",
      "asset_id": "wooden-door",
      "kind": "sfx",
      "author": "foleyroom",
      "price_usd": 0,
      "knobs": {
        "size": 0.65,
        "age": 0.7,
        "force": 0.35,
        "room": false,
        "seed": 1873
      },
      "reason": "This is the matching close, with a different seed so the creak and rattle don't repeat.",
      "preview_wav": "http://localhost:8795/api/assets/wooden-door/render.wav?p=%7B%22size%22%3A0.65%2C%22age%22%3A0.7%2C%22force%22%3A0.35%2C%22room%22%3Afalse%2C%22seed%22%3A1873%7D",
      "module": null,
      "wav": null
    },
    {
      "name": "Plank Step L",
      "asset_id": "footstep",
      "kind": "foley",
      "author": "foleyroom",
      "price_usd": 3,
      "knobs": {
        "surface": "wood",
        "weight": 0.6,
        "pace": 0.9,
        "seed": 207
      },
      "reason": "A dry, medium-weight step on wooden floorboards.",
      "preview_wav": "http://localhost:8795/api/assets/footstep/render.wav?p=%7B%22surface%22%3A%22wood%22%2C%22weight%22%3A0.6%2C%22pace%22%3A0.9%2C%22seed%22%3A207%7D",
      "module": null,
      "wav": null
    },
    {
      "name": "Plank Step R",
      "asset_id": "footstep",
      "kind": "foley",
      "author": "foleyroom",
      "price_usd": 0,
      "knobs": {
        "surface": "wood",
        "weight": 0.65,
        "pace": 0.9,
        "seed": 3359
      },
      "reason": "A second seed gives the other foot, so a walk across the tavern floor never repeats.",
      "preview_wav": "http://localhost:87
```

