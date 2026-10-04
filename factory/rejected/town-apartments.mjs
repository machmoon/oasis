// Town Apartments: a walk-up block of flats whose planted balconies sit in loggias between two full-height wall
// piers, with a lobby canopy and a timber water tank raised on a stand at the front corner of the roof.
// Block asset: build(p) returns parts in metres on the Oasis Town grid (origin at the footprint's corner, y up,
// street side at z = 0).
//
// Scale lock, shared with town-shop.mjs so the two stand side by side on the 6 m grid:
//   ground storey 3.1 m, upper storeys 2.6 m, doors 0.9 x 2.1 m, windows 1.2-1.3 m tall with ink sills,
//   balcony rail 1.0 m, roof #5B6270, glass #7E93A8, lit #FFD58A, wood #8A6E52, kerb #D9DCE1.
export const meta = {
  title: "Town Apartments",
  kind: "3d",
  format: "blocks",
  kit: "Oasis Town",
  description: "A walk-up apartment block with planted loggia balconies, a lobby canopy and a rooftop water tank; it gives a little town some height on one 6 m lot.",
  tags: ["3d", "low poly", "building", "apartments", "flats", "balcony", "residential", "water tank", "town", "kit"],
  price: 4,
  author: "oasis-factory",
  footprint: [6, 6],
  size: [1000, 1000],
};

export const params = {
  knobs: {
    wall: { type: "color", role: "surface", label: "Walls", default: "#F3E3C8" },
    balcony: { type: "color", role: "primary", label: "Balconies & canopy", default: "#E5484D" },
    floors: { type: "range", label: "Floors", default: 5, min: 3, max: 7, step: 1 },
    width: { type: "range", label: "Width (m)", default: 5, min: 4, max: 6, step: 1 },
    tank: { type: "toggle", label: "Water tank", default: true },
    lights: { type: "toggle", label: "Lit windows", default: true },
  },
  presets: {
    Harbour: { wall: "#D8DEE3", balcony: "#3E7BFA" },
    Tram: { wall: "#F6EEE0", balcony: "#2F7A55" },
    Brick: { wall: "#C8553D", balcony: "#F6EEE0" },
  },
};

export function build(p) {
  const parts = [];
  const box = (x, y, z, w, h, d, c, e) =>
    parts.push({ t: "box", p: [x, y, z], s: [w, h, d], c, ...(e ? { e: true } : {}) });
  const cyl = (cx, y, cz, r, h, c, n) => parts.push({ t: "cyl", p: [cx, y, cz], r, h, c, n });
  const cone = (cx, y, cz, r, h, c, n) => parts.push({ t: "cone", p: [cx, y, cz], r, h, c, n });

  // ---- colour: every secondary tone is a tonal step of its own knob. Dark inputs step toward white (by more),
  // light inputs step toward deep ink, so bands, corners and caps stay visible on near-black and near-white.
  const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  const toHex = (a) => "#" + a.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("").toUpperCase();
  const lum = (c) => { const [r, g, b] = hex(c); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };
  const mix = (c, t, k) => { const a = hex(c), b = hex(t); return toHex(a.map((v, i) => v + (b[i] - v) * k)); };
  const dark = (c) => lum(c) < 0.4;
  const tone = (c, k) => (dark(c) ? mix(c, "#FFFFFF", Math.min(0.7, k * 1.7)) : mix(c, "#1E2230", k));

  const glass = "#7E93A8", lit = "#FFD58A", roof = "#5B6270", kerb = "#D9DCE1", wood = "#8A6E52";
  const metal = "#A7AFBA", leaf = "#79B86A", leafDark = mix("#79B86A", "#1E2230", 0.25), blossom = "#F7B8CF";
  const recessTone = tone(p.wall, 0.14); // loggia back wall: the wall colour in shade
  const bandTone = tone(p.wall, 0.18);
  const cornerTone = tone(p.wall, 0.22);
  const skirtTone = tone(p.wall, 0.32);
  const slabTone = tone(p.wall, 0.08);
  const frame = dark(p.wall) ? kerb : roof; // sills and door frames
  const railCap = tone(p.balcony, 0.32);
  const pane = p.lights ? lit : glass; // all windows behave the same: no random dark patches

  // ---- one shared grid. Body is 0.2 m narrower than the lot so overhangs stay inside the footprint.
  const W = p.width - 0.2, D = 4.5, GROUND = 3.1, FLOOR = 2.6, PIER = 0.55, LOG = 0.75;
  const x0 = (6 - W) / 2, z0 = 1.2, zf = z0 - LOG, zb = z0 + D; // z0 loggia back wall, zf pier fronts
  const H = GROUND + (p.floors - 1) * FLOOR;
  const bx0 = x0 + PIER, bx1 = x0 + W - PIER, bayW = bx1 - bx0, cx = x0 + W / 2;
  const midZ = (zf + zb) / 2, sideZ = [midZ - 1.375, midZ + 0.375];

  // ---- volume: main block, two full-height piers, and a recess panel so the loggia wall follows the wall knob
  box(x0, 0, z0, W, H, D, p.wall);
  box(x0, 0, zf, PIER, H, LOG, p.wall);
  box(x0 + W - PIER, 0, zf, PIER, H, LOG, p.wall);
  box(bx0 - 0.01, 0, z0 - 0.02, bayW + 0.02, H, 0.02, recessTone);
  // corner quoins own every vertical edge, 0.06 proud, so the volume reads even in a black colourway
  for (const qx of [x0 - 0.06, x0 + W - 0.14])
    for (const qz of [zf - 0.06, zb - 0.14]) box(qx, 0, qz, 0.2, H, 0.2, cornerTone);

  // horizontal band on side faces and pier fronts (quoins cover the corners)
  const wrapBand = (y, h, t, c) => {
    box(x0 - t, y, zf - t, t, h, zb - (zf - t), c);
    box(x0 + W, y, zf - t, t, h, zb - (zf - t), c);
    box(x0, y, zf - t, PIER, h, t, c);
    box(x0 + W - PIER, y, zf - t, PIER, h, t, c);
  };
  wrapBand(0, 0.4, 0.04, skirtTone);

  const frontWin = (x, y, w, h) => {
    box(x, y, z0 - 0.06, w, h, 0.04, pane, p.lights);
    box(x - 0.05, y - 0.08, z0 - 0.12, w + 0.1, 0.08, 0.1, frame);
  };
  const sideWins = (y) => {
    for (const z of sideZ) {
      box(x0 - 0.04, y, z, 0.06, 1.2, 1.0, pane, p.lights);
      box(x0 - 0.1, y - 0.08, z - 0.05, 0.1, 0.08, 1.1, frame);
      box(x0 + W - 0.02, y, z, 0.06, 1.2, 1.0, pane, p.lights);
      box(x0 + W, y, z - 0.05, 0.1, 0.08, 1.1, frame);
    }
  };

  // ---- ground floor: doorstep, 0.9 m lobby door with side light, canopy, flanking windows
  box(cx - 0.9, 0, zf - 0.3, 1.8, 0.12, z0 - 0.02 - (zf - 0.3), kerb);
  box(cx - 0.75, 0.12, z0 - 0.05, 1.6, 2.3, 0.03, frame);
  box(cx - 0.65, 0.12, z0 - 0.08, 0.9, 2.1, 0.03, pane, p.lights);
  box(cx + 0.35, 0.12, z0 - 0.08, 0.4, 2.1, 0.03, pane, p.lights);
  box(cx + 0.1, 1.0, z0 - 0.1, 0.06, 0.28, 0.02, "#F2B33D"); // handle
  box(cx - 1.0, 2.42, zf - 0.35, 2.0, 0.14, z0 - 0.02 - (zf - 0.35), p.balcony); // canopy
  box(cx - 1.0, 2.42, zf - 0.37, 2.0, 0.14, 0.02, railCap); // fascia
  box(cx - 0.3, 2.45, zf - 0.39, 0.6, 0.08, 0.02, "#FBFBFB"); // house number
  box(cx - 0.15, 2.3, zf + 0.05, 0.3, 0.12, 0.3, p.lights ? lit : "#E9ECEF", p.lights); // canopy lamp
  const gw = bayW / 2 - 1.35;
  if (gw >= 0.45) {
    frontWin(bx0 + 0.2, 0.85, gw, 1.3);
    frontWin(cx + 1.15, 0.85, gw, 1.3);
  }
  sideWins(0.85);

  // ---- upper floors: loggia balcony, one calm glazing group, plants at the ends
  const avail = bayW - 1.8;
  const nWin = avail >= 2.4 ? 2 : 1;
  const winW = Math.min(1.2, (avail - (nWin - 1) * 0.3) / nWin);
  const groupW = 0.9 + nWin * (winW + 0.3);
  const gx0 = bx0 + (bayW - groupW) / 2;
  const posts = bayW > 3.2 ? [0, 0.5, 1] : [0, 1];

  for (let f = 1; f < p.floors; f++) {
    const yF = GROUND + (f - 1) * FLOOR;
    const deck = yF + 0.02;
    wrapBand(yF - 0.08, 0.12, 0.03, bandTone);
    box(bx0 - 0.02, yF - 0.12, zf - 0.05, bayW + 0.04, 0.14, z0 - (zf - 0.05), slabTone); // slab into piers
    // balcony door + windows on the recess panel
    box(gx0, deck, z0 - 0.06, 0.9, 2.05, 0.04, pane, p.lights);
    box(gx0 - 0.05, deck + 2.05, z0 - 0.1, 1.0, 0.07, 0.08, frame);
    for (let k = 0; k < nWin; k++) frontWin(gx0 + 1.2 + k * (winW + 0.3), deck + 0.75, winW, 1.25);
    // railing: hero panel, darker kick band, posts and cap give it edges in any colour
    box(bx0 - 0.02, deck, zf - 0.05, bayW + 0.04, 0.95, 0.06, p.balcony);
    box(bx0 - 0.02, deck, zf - 0.07, bayW + 0.04, 0.12, 0.02, railCap);
    for (const t of posts) box(bx0 + t * (bayW - 0.08), deck + 0.12, zf - 0.07, 0.08, 0.83, 0.02, railCap);
    box(bx0 - 0.04, deck + 0.95, zf - 0.09, bayW + 0.08, 0.07, 0.14, railCap);
    // plants alternate ends floor by floor; the widest block gets both
    const ends = [];
    if (f % 2 === 1 || p.width >= 6) ends.push(0);
    if (f % 2 === 0 || p.width >= 6) ends.push(1);
    for (const side of ends) {
      const px = side ? bx1 - 0.46 : bx0 + 0.1;
      const mx = px + 0.18, mz = zf + 0.26;
      box(px, deck, zf + 0.08, 0.36, 0.35, 0.36, wood);
      const top = deck + 0.35;
      const kind = (f + side) % 3;
      if (kind === 0) {
        box(mx - 0.26, top, zf + 0.03, 0.52, 0.65, 0.46, leaf);
        box(mx + (side ? -0.24 : 0), top + 0.65, zf + 0.1, 0.24, 0.28, 0.28, leafDark);
      } else if (kind === 1) {
        cone(mx, top, mz, 0.24, 1.15, leafDark, 7);
      } else {
        box(mx - 0.24, top, zf + 0.04, 0.48, 0.62, 0.44, leaf);
        for (const [fx, fz] of [[-0.18, 0.06], [0.02, 0.2], [0.08, 0.02]])
          box(mx + fx, top + 0.62, zf + fz, 0.12, 0.08, 0.12, blossom);
      }
    }
    sideWins(yF + 0.8);
  }

  // ---- roof: slab, corner-resolved parapet with a pale coping that outlines the roof by day and night
  box(x0 - 0.1, H, zf - 0.1, W + 0.2, 0.2, zb - zf + 0.2, roof);
  const RY = H + 0.2;
  const ring = (y, h, c) => {
    box(x0 - 0.1, y, zf - 0.1, W + 0.2, h, 0.15, c);
    box(x0 - 0.1, y, zb - 0.05, W + 0.2, h, 0.15, c);
    box(x0 - 0.1, y, zf + 0.05, 0.15, h, zb - zf - 0.1, c);
    box(x0 + W - 0.05, y, zf + 0.05, 0.15, h, zb - zf - 0.1, c);
  };
  ring(RY, 0.3, roof);
  ring(RY + 0.3, 0.05, kerb);

  // stair hut, back-right (farthest from the camera, never in front of the tank)
  const hx = x0 + W - 1.65, hz = zb - 1.75;
  box(hx, RY, hz, 1.5, 2.3, 1.6, p.wall);
  box(hx - 0.1, RY + 2.3, hz - 0.1, 1.7, 0.15, 1.8, roof);
  box(hx + 0.35, RY, hz - 0.03, 0.8, 1.95, 0.03, frame);
  box(hx + 0.67, RY + 2.02, hz - 0.08, 0.16, 0.12, 0.08, p.lights ? lit : "#E9ECEF", p.lights);
  box(hx - 0.04, RY + 1.0, hz + 0.5, 0.04, 0.6, 0.6, pane, p.lights);

  // ---- water tank: front-left of the roof, raised on a tall stand so the whole tub clears the parapet
  if (p.tank) {
    const tx = x0 + 0.95, tz = zf + 1.15, LEG = 1.4;
    for (const lx of [-0.55, 0.43]) for (const lz of [-0.55, 0.43]) box(tx + lx, RY, tz + lz, 0.12, LEG, 0.12, roof);
    box(tx - 0.55, RY + 0.6, tz - 0.55, 1.1, 0.08, 0.08, roof); // front brace
    box(tx - 0.55, RY + 0.6, tz - 0.55, 0.08, 0.08, 1.1, roof); // side brace
    box(tx - 0.72, RY + LEG, tz - 0.72, 1.44, 0.12, 1.44, roof);
    const T = RY + LEG + 0.12;
    cyl(tx, T, tz, 0.72, 1.5, wood, 12);
    cyl(tx, T + 0.3, tz, 0.75, 0.08, metal, 12);
    cyl(tx, T + 1.1, tz, 0.75, 0.08, metal, 12);
    cone(tx, T + 1.5, tz, 0.82, 0.6, metal, 12);
    box(tx - 0.72, T, tz - 0.72, 0.14, 0.14, 0.14, p.lights ? lit : "#E9ECEF", p.lights); // marker lamp
  }

  return { parts };
}
