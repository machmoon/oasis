// Corner Cafe: a corner cafe glazed on both street faces, with a wrap-around sign and parasol tables on the
// pavement. Block asset: build(p) returns parts in metres on the Oasis Town grid (origin at the footprint's
// corner, y up, street side at z = 0). The building's front face sits at z = 1.6, so the strip z 0..1.5 is terrace.
export const meta = {
  title: "Corner Cafe",
  kind: "3d",
  format: "blocks",
  kit: "Oasis Town",
  description: "A corner cafe glazed on both street faces, with a lit counter behind the glass and parasol tables on the pavement, made to anchor a town square corner.",
  tags: ["3d", "low poly", "cafe", "coffee", "building", "terrace", "parasol", "town", "kit"],
  price: 4,
  author: "oasis-factory",
  footprint: [6, 6],
  size: [1000, 1000],
};

export const params = {
  knobs: {
    wall: { type: "color", role: "surface", label: "Walls", default: "#F6EEE0" },
    parasol: { type: "color", role: "primary", label: "Parasols", default: "#E5484D" },
    trim: { type: "color", role: "ink", label: "Frames & sign", default: "#2F7A55" },
    tables: { type: "range", label: "Terrace tables", default: 2, min: 0, max: 3, step: 1 },
    floors: { type: "range", label: "Floors", default: 1, min: 1, max: 2, step: 1 },
    roof: { type: "choice", label: "Roof", default: "gable", options: ["gable", "flat"] },
    lights: { type: "toggle", label: "Lights", default: true },
  },
  presets: {
    Harbour: { wall: "#D8DEE3", parasol: "#3E7BFA", trim: "#2B3242" },
    Blossom: { wall: "#F3E3C8", parasol: "#F7B8CF", trim: "#8A6E52" },
    Matcha: { wall: "#E3F2EA", parasol: "#F2B33D", trim: "#3B4A44" },
  },
};

// ---- colour helpers: every derived tone is a lightness shift that works for near-black and near-white inputs ----
function rgb(h) {
  const n = parseInt(String(h).slice(1), 16) || 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function hex(c) {
  return "#" + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
}
function lum(h) {
  const c = rgb(h);
  return (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255;
}
// move a colour to a target luminance: darken by scaling, lighten by mixing toward white (keeps the hue)
function toLum(h, t) {
  const c = rgb(h), l = lum(h);
  t = Math.max(0, Math.min(1, t));
  if (l > t && l > 0) return hex(c.map((v) => (v * t) / l));
  const a = l >= 1 ? 0 : (t - l) / (1 - l);
  return hex(c.map((v) => v + (255 - v) * a));
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function build(p) {
  const parts = [];
  const box = (x, y, z, w, h, d, c, e) => parts.push({ t: "box", p: [x, y, z], s: [w, h, d], c, ...(e ? { e: true } : {}) });
  const cyl = (x, y, z, r, h, c, n, e) => parts.push({ t: "cyl", p: [x, y, z], r, h, c, n, ...(e ? { e: true } : {}) });

  const on = !!p.lights;
  const wood = "#8A6E52", leaf = "#79B86A", leafDark = "#5E9A52", metal = "#5B6270", kerb = "#D9DCE1";
  const cream = "#F6EEE0", glass = "#7E93A8", glassGlint = "#DCE8F2", unlitLamp = "#E9E2D2";
  const roofC = "#C8553D", roofDark = "#9A3E2C", deck = "#8C929C";

  // walls, with structural tones that always separate from them
  const wall = p.wall, wl = lum(wall), darkWall = wl < 0.35;
  const tl = lum(p.trim);
  const trim = darkWall ? toLum(p.trim, clamp(tl, 0.55, 0.75)) : toLum(p.trim, Math.min(tl, 0.42));
  const edge = darkWall ? toLum(wall, wl + 0.2) : toLum(wall, wl * 0.8);   // cornice, bands, gable vent
  const ink = lum(trim) < 0.45 ? cream : "#2B3242";                        // sign emblem on the trim band
  const canopy = p.parasol, pl = lum(canopy);
  const rim = pl < 0.3 ? toLum(canopy, pl + 0.22) : toLum(canopy, pl * 0.68);

  // shopfront glass: transom always reads as blue glass; lower panes glow warm when lit, with a darker interior
  const paneC = on ? "#FFD58A" : glass;
  const intC = on ? "#D9984E" : "#5C7085";
  const topC = on ? "#FFF0CF" : "#B9C8D6";
  const pendC = on ? "#FFF4DC" : "#B9C8D6";
  const glintC = on ? "#FFF6E6" : "#E6EEF5";

  // ---- shared grid ----
  const B = 0.06;
  const x0 = 0.3, W = 5.4, x1 = x0 + W;
  const z0 = 1.6, D = 4.1, z1 = z0 + D;
  const G = 3.1, F = 2.6;
  const floors = clamp(Math.round(p.floors), 1, 2);
  const top = G + (floors - 1) * F;
  const gy0 = 0.4, ty = 2.0, gy1 = 2.45;          // sill, transom, head of the shop glazing
  const SY = 2.58, SH = 0.34;                     // sign band

  // ---- pavement around the building, never under it ----
  box(0, 0, 0, 6, B, z0, kerb);
  box(0, 0, z0, x0, B, 6 - z0, kerb);
  box(x1, 0, z0, 6 - x1, B, 6 - z0, kerb);
  box(x0, 0, z1, W, B, 6 - z1, kerb);

  // ---- shell: one closed box per storey ----
  box(x0, 0, z0, W, G, D, wall);
  if (floors > 1) box(x0, G, z0, W, F, D, wall);

  // place a face-mounted part: face "f" is the street front (u = x), "s" the corner side at x0 (u = z)
  const onFace = (face, u, y, w, h, off, th, c, e) =>
    face === "f" ? box(u, y, z0 - off, w, h, th, c, e) : box(x0 - off, y, u, th, h, w, c, e);

  // ---- wrap-around glazing ----
  function glazing(face, u0, u1, contents) {
    const bays = contents.length, bw = (u1 - u0) / bays;
    onFace(face, u0, gy0, u1 - u0, ty - gy0, 0.03, 0.03, paneC, on);           // lower panes
    onFace(face, u0, ty + 0.06, u1 - u0, gy1 - ty - 0.06, 0.03, 0.03, glass); // transom glass
    contents.forEach((what, k) => {
      const bx = u0 + k * bw, mid = bx + bw / 2;
      const d = (u, y, w, h, c, e) => onFace(face, u, y, w, h, 0.05, 0.02, c, e);
      // diagonal glints: stepped, overlapping streaks in the upper-left of each pane
      for (let i = 0; i < 3; i++) d(bx + 0.12 + i * 0.06, 1.3 + i * 0.17, 0.1, 0.24, glintC, on);
      d(bx + 0.14, ty + 0.1, 0.08, 0.14, glassGlint);
      d(bx + 0.2, ty + 0.2, 0.08, 0.14, glassGlint);
      // pendant lamp seen through the glass
      d(mid - 0.01, 1.82, 0.02, ty - 1.82, intC);
      d(mid - 0.12, 1.68, 0.24, 0.14, pendC, on);
      if (what === "table") {
        d(mid - 0.32, 0.92, 0.64, 0.06, intC);
        d(mid - 0.04, gy0, 0.08, 0.52, intC);
      } else {
        d(bx, gy0, bw, 0.55, intC);                    // counter
        d(bx, 0.95, bw, 0.05, topC);                   // counter top
        if (what === "machine") d(mid + 0.1, 1.0, 0.36, 0.36, intC);
        if (what === "barista") {
          d(mid - 0.18, 1.0, 0.36, 0.38, intC);
          d(mid - 0.11, 1.42, 0.22, 0.22, intC);
        }
      }
    });
    for (let k = 0; k <= bays; k++) onFace(face, u0 + k * bw - 0.04, gy0, 0.08, gy1 - gy0, 0.07, 0.07, trim);
    onFace(face, u0, ty, u1 - u0, 0.06, 0.07, 0.07, trim);
    onFace(face, u0 - 0.04, gy1, u1 - u0 + 0.08, 0.07, 0.07, 0.07, trim);
    onFace(face, u0 - 0.06, gy0 - 0.07, u1 - u0 + 0.12, 0.07, 0.14, 0.14, trim);
  }
  const gx0 = x0 + 0.26, gx1 = 4.5;
  glazing("f", gx0, gx1, ["table", "machine", "barista"]);
  const sz0 = z0 + 0.26, sz1 = z0 + 2.66;
  glazing("s", sz0, sz1, ["table", "table"]);

  // corner post ties the two glazed faces together
  box(x0 - 0.08, B, z0 - 0.08, 0.22, SY - B, 0.22, trim);

  // ---- wrap-around sign band with a coffee-cup emblem on each face ----
  box(x0 - 0.08, SY, z0 - 0.08, x1 - 0.1 - (x0 - 0.08), SH, 0.08, trim);
  box(x0 - 0.08, SY, z0, 0.08, SH, 2.9, trim);
  function emblem(face, c, ruleW) {
    const put = (du, y, w, h) => onFace(face, face === "f" ? c + du : c - du - w, y, w, h, 0.11, 0.03, ink);
    put(-0.26, SY + 0.05, 0.52, 0.05);   // saucer
    put(-0.16, SY + 0.1, 0.32, 0.16);    // cup
    put(0.16, SY + 0.13, 0.08, 0.09);    // handle
    put(-0.09, SY + 0.27, 0.04, 0.05);   // steam
    put(0.05, SY + 0.27, 0.04, 0.05);
    put(-0.5 - ruleW, SY + 0.15, ruleW, 0.04);
    put(0.5, SY + 0.15, ruleW, 0.04);
  }
  emblem("f", (gx0 + gx1) / 2, 0.95);
  emblem("s", z0 + 1.45, 0.6);

  // ---- door, lamp and planter at the right end of the front ----
  const dx = 4.75;
  box(dx, B, z0 - 0.05, 0.9, 2.15 - B, 0.05, trim);
  box(dx + 0.15, 0.95, z0 - 0.08, 0.6, 1.0, 0.03, paneC, on);
  box(dx + 0.25, 1.35, z0 - 0.1, 0.08, 0.32, 0.02, glintC, on);
  box(dx + 0.06, 0.95, z0 - 0.08, 0.05, 0.28, 0.03, kerb);
  box(dx + 0.4, 2.36, z0 - 0.3, 0.1, 0.06, 0.3, metal);
  box(dx + 0.37, 2.2, z0 - 0.33, 0.16, 0.16, 0.16, on ? "#FFD58A" : unlitLamp, on);

  box(5.66, B, 1.15, 0.3, 0.4, 0.4, wood);
  box(5.68, 0.46, 1.17, 0.26, 0.22, 0.36, leaf);
  box(5.72, 0.68, 1.24, 0.16, 0.16, 0.2, leafDark);

  // side details: rear window on the far side, downpipe on the corner side
  box(x1, 0.9, z0 + 2.4, 0.04, 1.2, 1.0, glass);
  box(x0 - 0.08, B, z1 - 0.3, 0.08, top - 0.16 - B, 0.08, edge);

  // ---- bands around the top of each storey ----
  const band = (y, h) => {
    box(x0 - 0.04, y, z0 - 0.04, W + 0.08, h, 0.04, edge);
    box(x0 - 0.04, y, z0, 0.04, h, D, edge);
    box(x1, y, z0, 0.04, h, D, edge);
  };
  band(top - 0.16, 0.16);                                // cornice

  // ---- upper storey: four matching windows, all lit or all glass ----
  function win(face, u, y, w, h) {
    onFace(face, u, y, w, h, 0.03, 0.03, on ? "#FFD58A" : glass, on);
    for (let i = 0; i < 2; i++) onFace(face, u + 0.1 + i * 0.06, y + 0.15 + i * 0.2, 0.08, 0.26, 0.05, 0.02, glintC, on);
    onFace(face, u - 0.06, y, 0.06, h, 0.07, 0.07, trim);
    onFace(face, u + w, y, 0.06, h, 0.07, 0.07, trim);
    onFace(face, u + w / 2 - 0.03, y, 0.06, h, 0.07, 0.07, trim);
    onFace(face, u, y + h * 0.62, w, 0.05, 0.07, 0.07, trim);
    onFace(face, u - 0.08, y + h, w + 0.16, 0.08, 0.08, 0.08, trim);
    onFace(face, u - 0.1, y - 0.08, w + 0.2, 0.08, 0.12, 0.12, trim);
  }
  if (floors > 1) {
    band(G - 0.06, 0.12);                                // floor band, clear of the sign
    const wy = G + 0.6;
    win("f", x0 + 0.9, wy, 1.0, 1.3);
    win("f", x1 - 2.0, wy, 1.0, 1.3);
    win("s", z0 + 0.6, wy, 1.0, 1.3);
    win("s", z0 + 2.4, wy, 1.0, 1.3);
  }

  // ---- roof ----
  if (p.roof === "gable") {
    const RH = 1.6, ov = 0.3, RH2 = (RH * (D + 2 * ov)) / D;
    parts.push({ t: "gable", p: [x0, top, z0 - ov], s: [W, RH2, D + 2 * ov], c: roofC, axis: "x" });
    // wall-coloured gable ends laid on the roof's end faces, leaving a terracotta verge around them
    parts.push({ t: "gable", p: [x0 - 0.04, top, z0], s: [0.04, RH, D], c: wall, axis: "x" });
    parts.push({ t: "gable", p: [x1, top, z0], s: [0.04, RH, D], c: wall, axis: "x" });
    box(x0 - 0.07, top + 0.35, z0 + D / 2 - 0.25, 0.03, 0.45, 0.5, edge);   // attic vent
    box(x0 - 0.1, top + 0.47, z0 + D / 2 - 0.2, 0.03, 0.05, 0.4, trim);
    box(x0 - 0.1, top + 0.62, z0 + D / 2 - 0.2, 0.03, 0.05, 0.4, trim);
    box(x0 - 0.06, top + RH2 - 0.1, z0 + D / 2 - 0.12, W + 0.12, 0.16, 0.24, roofDark); // ridge cap
    box(x0, top - 0.08, z0 - ov, W, 0.08, 0.05, roofDark);                // eave fascia
    box(x1 - 1.4, top, z0 + D * 0.62, 0.5, RH2 + 0.35, 0.5, edge);        // chimney
    box(x1 - 1.46, top + RH2 + 0.35, z0 + D * 0.62 - 0.06, 0.62, 0.1, 0.62, roofDark);
  } else {
    box(x0, top, z0, W, 0.1, D, deck);
    box(x0 - 0.06, top, z0 - 0.06, W + 0.12, 0.45, 0.16, edge);           // parapet front
    box(x0 - 0.06, top, z1 - 0.1, W + 0.12, 0.45, 0.16, edge);            // parapet back
    box(x0 - 0.06, top, z0 + 0.1, 0.16, 0.45, D - 0.2, edge);             // parapet sides
    box(x1 - 0.1, top, z0 + 0.1, 0.16, 0.45, D - 0.2, edge);
    box(x1 - 1.8, top + 0.1, z0 + 2.0, 1.1, 0.7, 1.1, "#D8DEE3");         // rooftop unit
    box(x0 + 0.7, top + 0.1, z0 + 2.6, 0.5, 1.0, 0.5, roofC);             // flue
  }

  // ---- terrace: fixed slots in x 0.4..4.3, z 0.14..1.42, clear of corner post, door and planter ----
  const n = clamp(Math.round(p.tables), 0, 3);
  const slots = n === 1 ? [2.4] : n === 2 ? [1.6, 3.2] : n === 3 ? [0.9, 2.35, 3.8] : [];
  const tz = 0.78, PR = 0.5;
  for (const tx of slots) {
    cyl(tx, B, tz, 0.18, 0.04, metal, 8);
    cyl(tx, B + 0.04, tz, 0.04, 0.72 - B - 0.04, metal, 6);
    cyl(tx, 0.72, tz, 0.32, 0.04, cream, 10);
    for (const side of [-1, 1]) {
      const cz = side < 0 ? 0.14 : 1.0, cx = tx - 0.21;
      box(cx, B, cz, 0.04, 0.43 - B, 0.42, wood);          // side panels read as solid legs
      box(cx + 0.38, B, cz, 0.04, 0.43 - B, 0.42, wood);
      box(cx, 0.43, cz, 0.42, 0.05, 0.42, wood);           // seat
      box(cx, 0.48, side < 0 ? cz : cz + 0.37, 0.42, 0.45, 0.05, wood); // back, facing outward
    }
    cyl(tx, 0.76, tz, 0.03, 1.18, wood, 6);
    cyl(tx, 1.94, tz, PR, 0.08, rim, 10);
    parts.push({ t: "cone", p: [tx, 2.02, tz], r: PR, h: 0.36, c: canopy, n: 10 });
    cyl(tx, 2.36, tz, 0.04, 0.1, rim, 6);
  }

  return { parts };
}
