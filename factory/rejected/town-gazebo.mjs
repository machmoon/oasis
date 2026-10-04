// Park Gazebo: an octagonal park gazebo with painted posts, a baluster railing and a pointed roof.
// Block asset: build(p) returns parts in metres on the Oasis Town grid (origin at the footprint's corner,
// y up, street side at z = 0). The open entrance, its steps and two gate lanterns face the street.
export const meta = {
  title: "Park Gazebo",
  kind: "3d",
  format: "blocks",
  kit: "Oasis Town",
  description: "An octagonal park gazebo on a stone plinth with painted posts, a baluster railing, lantern-topped gate pillars and a pointed or two-tier roof, sized for a 4 m corner of a town park.",
  tags: ["3d", "low poly", "gazebo", "park", "bandstand", "pavilion", "town", "kit", "block"],
  price: 3,
  author: "oasis-factory",
  footprint: [4, 4],
  size: [1000, 1000],
};

export const params = {
  knobs: {
    posts: { type: "color", role: "surface", label: "Posts & balusters", default: "#F6EEE0" },
    roof: { type: "color", role: "primary", label: "Roof", default: "#C8553D" },
    rail: { type: "color", role: "secondary", label: "Handrail & frieze", default: "#5B6270" },
    finial: { type: "color", role: "highlight", label: "Finial", default: "#F2B33D" },
    size: { type: "range", label: "Diameter (m)", default: 2.8, min: 2.4, max: 3.2, step: 0.1 },
    roofStyle: { type: "choice", label: "Roof style", default: "pointed", options: ["pointed", "tiered"] },
    railing: { type: "toggle", label: "Railing", default: true },
    lights: { type: "toggle", label: "Lanterns lit", default: true },
  },
  presets: {
    Tram: { posts: "#F3E3C8", roof: "#2F7A55", rail: "#3D4A44", finial: "#F2B33D" },
    Harbour: { posts: "#D8DEE3", roof: "#3E7BFA", rail: "#2B3242", finial: "#E5484D" },
    Blossom: { posts: "#FBF3F5", roof: "#B8577E", rail: "#7A3B57", finial: "#F7B8CF" },
  },
};

// ---- colour helpers: every brand colour is fitted into the band its slot was designed for ----
function toRgb(hex) {
  const n = parseInt(String(hex).replace("#", ""), 16);
  if (!isFinite(n)) return [128, 128, 128];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function toHex(r, g, b) {
  const h = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return "#" + h(r) + h(g) + h(b);
}
function luma(rgb) {
  return (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255;
}
// Clamp HSL lightness and saturation, then clamp perceived luminance (so lime or cyan cannot
// blow out on lit facets even when its HSL lightness looks moderate). Darkening is multiplicative.
function fit(hex, lMin, lMax, sMax, yMin, yMax) {
  let [r, g, b] = toRgb(hex).map((v) => v / 255);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  let h = 0, s = 0, l = (mx + mn) / 2;
  if (mx !== mn) {
    const d = mx - mn;
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    if (mx === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  l = Math.max(lMin, Math.min(lMax, l));
  s = Math.min(sMax, s);
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, pp = 2 * l - q;
  const f = (t) => {
    t = (t + 1) % 1;
    if (t < 1 / 6) return pp + (q - pp) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return pp + (q - pp) * (2 / 3 - t) * 6;
    return pp;
  };
  let rgb = [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
  const Y = luma(rgb);
  if (Y > yMax) rgb = rgb.map((v) => v * (yMax / Y));
  else if (Y < yMin) {
    const t = (yMin - Y) / (1 - Y);
    rgb = rgb.map((v) => v + (255 - v) * t);
  }
  return toHex(rgb[0], rgb[1], rgb[2]);
}
function darken(hex, k) {
  const [r, g, b] = toRgb(hex);
  return toHex(r * (1 - k), g * (1 - k), b * (1 - k));
}

export function build(p) {
  const parts = [];
  const box = (x, y, z, w, h, d, c, e) => parts.push({ t: "box", p: [x, y, z], s: [w, h, d], c, ...(e ? { e: true } : {}) });
  const cyl = (x, y, z, r, h, c, n, e) => parts.push({ t: "cyl", p: [x, y, z], r, h, c, n: n || 8, ...(e ? { e: true } : {}) });
  const cone = (x, y, z, r, h, c, n) => parts.push({ t: "cone", p: [x, y, z], r, h, c, n: n || 8 });

  // fixed materials: a solid, clearly darker stone footing so the piece sits on the ground
  const APRON = "#7C828C", PLINTH = "#A3A9B1", STEP = "#BCC1C8", PIER = "#8E949E";
  const DECKWOOD = "#6E5641", IRON = "#343941", LIT = "#FFD58A", UNLIT = "#5F5E5A";

  // brand-fitted colours
  const roofC = fit(p.roof, 0.28, 0.5, 0.6, 0.16, 0.42);   // mid-dark, muted: facets never wash out
  const fascia = darken(roofC, 0.35);                         // eave edge always darker than the roof
  const railC = fit(p.rail, 0.18, 0.42, 0.5, 0.12, 0.36);   // dark: reads against the pale posts
  const postC = fit(p.posts, 0.8, 0.95, 0.4, 0.72, 0.95);   // pale painted timber
  const postFoot = darken(postC, 0.18);
  const finC = fit(p.finial, 0.42, 0.62, 0.85, 0.3, 0.7);

  // geometry: nested octagons keep a margin between the inner circumradius and the outer inradius,
  // so nothing pokes past the roof whatever the prism phase
  const C8 = Math.cos(Math.PI / 8), S8 = Math.sin(Math.PI / 8);
  const cx = 2, cz = 2.1;
  const Rd = Math.max(1.2, Math.min(1.6, p.size / 2));   // deck circumradius
  const Rp = Rd * C8 - 0.12;                              // post ring
  const Rb = (Rp + 0.12) / C8;                            // ring beam covers every post top
  const roofR = (Rb + 0.14) / C8;                         // roof clears the beam on every side (max 1.84)
  const SLOPE = 0.8;                                      // one roof pitch for every tier: identical facet shading
  const DECK = 0.38, PH = 2.4;                            // human-scale posts, constant across sizes
  const postTop = DECK + PH;
  const bandH = 0.26, FAS = 0.08;
  const roofBase = postTop + bandH;

  // footing: dark apron, stone plinth, timber deck
  cyl(cx, 0, cz, Rd + 0.22, 0.06, APRON, 8);
  cyl(cx, 0, cz, Rd + 0.1, 0.18, PLINTH, 8);
  cyl(cx, 0.18, cz, Rd, 0.2, DECKWOOD, 8);

  // octagon of posts: flat sides face the axes so the entrance edge faces the street squarely
  const V = [];
  for (let k = 0; k < 8; k++) {
    const a = ((22.5 + 45 * k) * Math.PI) / 180;
    V.push([cx + Rp * Math.cos(a), cz + Rp * Math.sin(a)]);
  }

  // entrance steps sized to the open front edge: three ~0.13 m risers up to the deck
  const entW = 2 * Rp * S8;
  const sw = entW + 0.1;
  const front = cz - Rd;
  const zIn = cz - 0.8 * Rd;
  const pz = front - 0.45;
  box(cx - sw / 2, 0, pz, sw, 0.13, zIn - pz, STEP);
  box(cx - sw / 2, 0.13, front - 0.22, sw, 0.12, zIn - (front - 0.22), STEP);

  // gate pillars flanking the steps, each topped with a lantern: deliberate entry lighting
  for (const px of [cx - sw / 2 - 0.22, cx + sw / 2]) {
    const cheekX = px < cx ? px + 0.1 : px;
    box(cheekX, 0, pz + 0.22, 0.12, 0.3, zIn - (pz + 0.22), PIER);       // low cheek wall
    box(px, 0, pz, 0.22, 0.62, 0.22, PIER);                               // pillar
    box(px - 0.03, 0.62, pz - 0.03, 0.28, 0.05, 0.28, STEP);              // pillar cap
    box(px + 0.04, 0.67, pz + 0.04, 0.14, 0.04, 0.14, IRON);              // lantern base
    box(px + 0.03, 0.71, pz + 0.03, 0.16, 0.22, 0.16, p.lights ? LIT : UNLIT, p.lights);
    box(px, 0.93, pz, 0.22, 0.05, 0.22, IRON);                            // lantern roof
    box(px + 0.08, 0.98, pz + 0.08, 0.06, 0.05, 0.06, IRON);              // knob
  }

  // posts with a darker foot block
  for (const [x, z] of V) {
    box(x - 0.105, DECK, z - 0.105, 0.21, 0.14, 0.21, postFoot);
    box(x - 0.08, DECK + 0.14, z - 0.08, 0.16, PH - 0.14, 0.16, postC);
  }

  if (p.railing) {
    for (let k = 0; k < 8; k++) {
      if (k === 5) continue; // front entrance stays open
      const A = V[k], B = V[(k + 1) % 8];
      const dx = B[0] - A[0], dz = B[1] - A[1];
      const L = Math.hypot(dx, dz);
      const axisX = Math.abs(dz) < 1e-3, axisZ = Math.abs(dx) < 1e-3;
      const nb = Math.max(3, Math.round(L / 0.22));
      for (let i = 1; i < nb; i++) {
        const t = i / nb;
        box(A[0] + dx * t - 0.03, DECK + 0.12, A[1] + dz * t - 0.03, 0.06, 0.72, 0.06, postC);
      }
      for (const [ry, rh] of [[DECK + 0.84, 0.08], [DECK + 0.06, 0.06]]) {
        if (axisX) box(Math.min(A[0], B[0]), ry, A[1] - 0.04, Math.abs(dx), rh, 0.08, railC);
        else if (axisZ) box(A[0] - 0.04, ry, Math.min(A[1], B[1]), 0.08, rh, Math.abs(dz), railC);
        else {
          const m = Math.ceil(L / 0.04);
          for (let j = 1; j < m; j++) {
            const t = j / m;
            cyl(A[0] + dx * t, ry, A[1] + dz * t, 0.045, rh, railC, 8);
          }
        }
      }
    }
  } else {
    // without the railing a round bench keeps the deck from reading empty (rail colour seat)
    cyl(cx, DECK, cz, Rp * 0.42, 0.42, postFoot, 8);
    cyl(cx, DECK + 0.42, cz, Rp * 0.5, 0.06, railC, 8);
  }

  // ring beam with a proud frieze band in the handrail colour
  cyl(cx, postTop, cz, Rb, bandH, postC, 8);
  cyl(cx, postTop + 0.1, cz, Rb + 0.03, 0.06, railC, 8);

  // central pendant lantern, hung from the roof and seen through the open front
  const lt = postTop - 0.5;
  box(cx - 0.015, lt + 0.05, cz - 0.015, 0.03, roofBase + 0.2 - (lt + 0.05), 0.03, IRON);
  box(cx - 0.17, lt, cz - 0.17, 0.34, 0.05, 0.34, IRON);
  box(cx - 0.13, lt - 0.32, cz - 0.13, 0.26, 0.32, 0.26, p.lights ? LIT : UNLIT, p.lights);
  box(cx - 0.08, lt - 0.37, cz - 0.08, 0.16, 0.05, 0.16, IRON);

  // dark eave edge, then the slope starts immediately
  cyl(cx, roofBase, cz, roofR, FAS, fascia, 8);
  const slopeY = roofBase + FAS;

  let tip;
  if (p.roofStyle === "tiered") {
    // two tiers at the same pitch (similar cones), separated by a short posts-colour lantern drum
    const H1 = SLOPE * roofR;
    cone(cx, slopeY, cz, roofR, H1, roofC, 8);
    const drumY = slopeY + H1 * 0.5;              // lower cone circumradius here is roofR / 2
    const drumR = roofR * 0.4, drumH = 0.3;       // inside the cone's inradius at that height
    cyl(cx, drumY, cz, drumR, drumH, postC, 8);
    const r2 = roofR * 0.56;
    cyl(cx, drumY + drumH, cz, r2, 0.06, fascia, 8);
    const H2 = SLOPE * r2;
    cone(cx, drumY + drumH + 0.06, cz, r2, H2, roofC, 8);
    tip = drumY + drumH + 0.06 + H2;
  } else {
    const RH = SLOPE * roofR;
    cone(cx, slopeY, cz, roofR, RH, roofC, 8);
    tip = slopeY + RH;
  }

  // finial: iron spike with a highlight ball and point
  cyl(cx, tip - 0.14, cz, 0.04, 0.32, IRON, 6);
  cyl(cx, tip + 0.14, cz, 0.15, 0.2, finC, 8);
  cone(cx, tip + 0.34, cz, 0.15, 0.2, finC, 8);

  return { parts };
}
