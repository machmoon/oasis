// Park Bench: a slatted town bench on painted end frames, with optional timber planters at each end.
// Block asset: build(p) returns parts in metres on the Oasis Town grid (origin at the footprint's corner, y up,
// street side at z = 0). Length is the overall length; planters keep a fixed real size and the seat takes the rest.
export const meta = {
  title: "Park Bench",
  kind: "3d",
  format: "blocks",
  kit: "Oasis Town",
  description: "A slatted park bench on painted end frames with optional flowering planters at each end, sized to line a town street or square.",
  tags: ["3d", "low poly", "bench", "park", "street furniture", "planter", "seating", "town"],
  price: 1,
  author: "oasis-factory",
  footprint: [2, 1],
  size: [1000, 1000],
};

export const params = {
  knobs: {
    wood: { type: "color", role: "secondary", label: "Wood", default: "#8A6E52" },
    frame: { type: "color", role: "ink", label: "Frame", default: "#2F7A55" },
    flowers: { type: "color", role: "highlight", label: "Flowers", default: "#F7B8CF" },
    length: { type: "range", label: "Length (m)", default: 2, min: 1.5, max: 3, step: 0.1 },
    slats: { type: "range", label: "Seat slats", default: 4, min: 3, max: 6, step: 1 },
    back: { type: "choice", label: "Back", default: "slatted", options: ["slatted", "backless"] },
    planters: { type: "toggle", label: "Planters", default: true },
  },
  presets: {
    Harbour: { wood: "#A88A6A", frame: "#3E7BFA", flowers: "#F2B33D" },
    Civic: { wood: "#6E5440", frame: "#5B6270", flowers: "#E5484D" },
    Orchard: { wood: "#B08A5E", frame: "#2B3242", flowers: "#FFFFFF" },
  },
};

export function build(p) {
  const parts = [];
  const box = (x, y, z, w, h, d, c) => parts.push({ t: "box", p: [x, y, z], s: [w, h, d], c });
  const cyl = (cx, y, cz, r, h, c, n) => parts.push({ t: "cyl", p: [cx, y, cz], r, h, c, n: n || 10 });

  // ---- colour guards -------------------------------------------------------------------------------------
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const hex = (c) => [1, 3, 5].map((i) => parseInt(String(c).slice(i, i + 2), 16) || 0);
  const toHex = (a) => "#" + a.map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, "0")).join("");
  const toHsl = (c) => {
    const [r, g, b] = hex(c).map((v) => v / 255);
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
    if (mx === mn) return [0, 0, l];
    const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [h * 60, s, l];
  };
  const fromHsl = (h, s, l) => {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s, m = 2 * l - q;
    const f = (t) => {
      t = ((t % 1) + 1) % 1;
      if (t < 1 / 6) return m + (q - m) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return m + (q - m) * (2 / 3 - t) * 6;
      return m;
    };
    const k = h / 360;
    return toHex([f(k + 1 / 3), f(k), f(k - 1 / 3)].map((v) => v * 255));
  };
  const shade = (c, k) => toHex(hex(c).map((v) => v * k));

  // wood always reads as timber: hue folded into the warm band, saturation and lightness bounded
  const woodTone = (c) => {
    let [h, s, l] = toHsl(c);
    if (h < 15 || h > 48) h = 15 + (h / 360) * 33;
    return fromHsl(h, clamp(s, 0.18, 0.45), clamp(l, 0.32, 0.6));
  };
  // painted frame: any hue, lightness kept in a band that shades well and separates from wood and paving
  const frameTone = (c) => {
    const [h, s, l] = toHsl(c);
    return fromHsl(h, s, clamp(l, 0.2, 0.5));
  };
  // flowers: any hue, always a bright bloom that pops off the leaves
  const bloomTone = (c) => {
    let [h, s, l] = toHsl(c);
    if (s > 0.1) s = Math.max(s, 0.5);
    return fromHsl(h, s, clamp(l, 0.55, 0.9));
  };

  const wood = woodTone(p.wood);
  const woodAlt = shade(wood, 0.9);
  const frame = frameTone(p.frame);
  const bloom = bloomTone(p.flowers);
  const planterWood = shade(wood, 0.84), planterSeam = shade(wood, 0.7);
  // fixed materials
  const kerb = "#D9DCE1", soil = "#6B5440", sun = "#F2B33D";
  const leafDark = "#5E9A52", leaf = "#79B86A", leafLight = "#8FC77F";

  // ---- layout --------------------------------------------------------------------------------------------
  const L = clamp(Number(p.length) || 2, 1.5, 3);
  const X0 = 1 - L / 2, X1 = 1 + L / 2; // centred on the 2 m footprint
  const G = 0.05; // paving pad height
  const pl = !!p.planters;
  const hasBack = p.back !== "backless";
  const PW = 0.4, PD = 0.64, PZ = 0.16, PH = 0.48, GAP = 0.06; // planters: fixed real size
  const sx0 = pl ? X0 + PW + GAP : X0, sx1 = pl ? X1 - PW - GAP : X1, SL = sx1 - sx0;

  box(X0 - 0.05, 0, 0.1, L + 0.1, G, 0.8, kerb); // paving pad

  // ---- end frames: each a closed side frame (front leg, rear leg or post, seat rail, foot rail) ------------
  const fw = 0.08, RAIL = 0.34, SEAT = 0.45, BACK_TOP = 0.9;
  const zF = 0.2, zB = 0.64; // seat front / back edge
  const zLegF = zF + 0.03; // front leg sits just behind the seat's front lip
  const zLegB = hasBack ? zB : zB - 0.03 - fw; // rear member: back post behind the seat, or a leg under it
  const inset = pl ? 0.12 : 0; // with planters, frames step in so the legs show in the gap
  const frames = [sx0 + inset, sx1 - inset - fw];
  if (SL > 1.6) frames.splice(1, 0, sx0 + SL / 2 - fw / 2);

  for (const fx of frames) {
    box(fx, G, zLegF, fw, RAIL - G, fw, frame); // front leg
    if (hasBack) box(fx, G, zLegB, fw, BACK_TOP - G, fw, frame); // back post, ground to back top
    else box(fx, G, zLegB, fw, RAIL - G, fw, frame); // rear leg
    box(fx, RAIL, zLegF, fw, 0.06, zLegB + (hasBack ? 0 : fw) - zLegF, frame); // seat rail on the legs
    box(fx, G + 0.06, zLegF + fw, fw, 0.06, zLegB - zLegF - fw, frame); // foot rail, leg to leg
  }

  // ---- seat slats across the seat depth, resting on the rails -----------------------------------------------
  const n = clamp(Math.round(p.slats), 3, 6);
  const sgap = 0.025, sw = (zB - zF - sgap * (n - 1)) / n;
  for (let i = 0; i < n; i++) box(sx0, RAIL + 0.06, zF + i * (sw + sgap), SL, 0.05, sw, i % 2 ? woodAlt : wood);

  // ---- back: slats on the front face of the posts, painted cap across the post tops -------------------------
  if (hasBack) {
    [0.52, 0.66, 0.8].forEach((y, k) => box(sx0, y, zB - 0.04, SL, 0.1, 0.04, k % 2 ? woodAlt : wood));
    box(sx0 - 0.02, BACK_TOP, zB - 0.05, SL + 0.04, 0.04, fw + 0.07, frame);
  }

  // ---- armrests on a free-standing bench (planters act as the ends otherwise) ------------------------------
  if (!pl) {
    const armEnd = hasBack ? zB - 0.04 : zB - 0.03;
    for (const fx of [frames[0], frames[frames.length - 1]]) {
      box(fx, SEAT, zLegF, fw, 0.22, fw, frame); // front arm post over the front leg
      if (!hasBack) box(fx, SEAT, zLegB, fw, 0.22, fw, frame); // rear arm post over the rear leg
      box(fx - 0.02, SEAT + 0.22, zF - 0.02, fw + 0.04, 0.05, armEnd - zF + 0.02, wood); // arm top
    }
  }

  // ---- planters: timber boxes with painted corner posts and rim, soil, flowering shrubs ---------------------
  if (pl) {
    const flower = (cx, y, cz, r) => {
      cyl(cx, y, cz, r, 0.03, bloom, 8);
      cyl(cx, y + 0.03, cz, r * 0.4, 0.012, sun, 6);
    };
    const shrub = (cx, cz, y, tall, off) => {
      const tiers = [[0.16, 0.12, leafDark], [0.12, tall ? 0.12 : 0.09, leaf], [0.07, 0.07, leafLight]];
      const tops = [];
      let yy = y;
      for (const [r, h, c] of tiers) { cyl(cx, yy, cz, r, h, c); yy += h; tops.push(yy); }
      // blooms nestle on each leafy ledge, on the street- and camera-facing side
      for (const a of [205, 265, 325]) {
        const t = ((a + off) * Math.PI) / 180;
        flower(cx + 0.135 * Math.cos(t), tops[0], cz + 0.135 * Math.sin(t), 0.035);
      }
      for (const a of [235, 305]) {
        const t = ((a + off) * Math.PI) / 180;
        flower(cx + 0.092 * Math.cos(t), tops[1], cz + 0.092 * Math.sin(t), 0.03);
      }
      flower(cx, tops[2], cz, 0.035);
    };
    [X0, X1 - PW].forEach((px, side) => {
      box(px + 0.02, G, PZ + 0.02, PW - 0.04, PH, PD - 0.04, planterWood); // timber body
      for (const [cx, cz] of [[px, PZ], [px + PW - 0.06, PZ], [px, PZ + PD - 0.06], [px + PW - 0.06, PZ + PD - 0.06]]) {
        box(cx, G, cz, 0.06, PH, 0.06, frame); // painted corner posts
      }
      box(px + 0.06, G + PH / 2 - 0.02, PZ, PW - 0.12, 0.04, 0.02, planterSeam); // board seam, front
      const sideX = side === 0 ? px : px + PW - 0.02;
      box(sideX, G + PH / 2 - 0.02, PZ + 0.06, 0.02, 0.04, PD - 0.12, planterSeam); // board seam, outer side
      box(px - 0.01, G + PH, PZ - 0.01, PW + 0.02, 0.05, PD + 0.02, frame); // painted rim
      box(px + 0.04, G + PH + 0.05, PZ + 0.04, PW - 0.08, 0.02, PD - 0.08, soil); // soil
      const cx = px + PW / 2, top = G + PH + 0.07;
      shrub(cx, PZ + 0.18, top, false, side * 15);
      shrub(cx, PZ + PD - 0.18, top, true, 20 - side * 15);
    });
  }

  return { parts };
}
