// Town Hedge: a clipped garden hedge run on the 6 m grid, with a flower border and an optional hinged gate.
// Block asset: build(p) returns parts in metres (origin at the footprint corner, y up, street side at z = 0).
export const meta = {
  title: "Town Hedge",
  kind: "3d",
  format: "blocks",
  kit: "Oasis Town",
  description: "A neatly clipped hedge with a flower border that tiles end to end along a 6 m lot edge, with an optional hinged picket gate between lantern posts.",
  tags: ["3d", "low poly", "hedge", "garden", "gate", "boundary", "flowers", "town"],
  price: 1,
  author: "oasis-factory",
  footprint: [6, 1],
  size: [1000, 1000],
};

export const params = {
  knobs: {
    leaf: { type: "color", role: "primary", label: "Leaf", default: "#79B86A" },
    gateColor: { type: "color", role: "secondary", label: "Gate paint", default: "#F6EEE0" },
    bloom: { type: "color", role: "highlight", label: "Blossom", default: "#F7B8CF" },
    height: { type: "range", label: "Height (m)", default: 1.1, min: 0.6, max: 1.8, step: 0.1 },
    gate: { type: "toggle", label: "Gate gap", default: true },
    flowers: { type: "toggle", label: "Flower border", default: true },
    lights: { type: "toggle", label: "Gate lanterns", default: true },
  },
  presets: {
    "Copper Beech": { leaf: "#A0563B", gateColor: "#2F7A55", bloom: "#F2B33D" },
    Boxwood: { leaf: "#3F7A47", gateColor: "#3E7BFA", bloom: "#FBFBFB" },
    "Lavender Lane": { leaf: "#6E9A63", gateColor: "#5B6270", bloom: "#A58BDA" },
  },
};

function hash(i) {
  let h = (Math.round(i * 1000) * 374761393 + 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
function hexToHsl(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  let h = 0, s = 0;
  if (d > 1e-6) {
    s = d / (1 - Math.abs(2 * l - 1));
    if (mx === r) h = ((g - b) / d) % 6;
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, s, l];
}
function hslToHex(h, s, l) {
  l = Math.max(0, Math.min(1, l));
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const f = (v) => Math.round(Math.max(0, Math.min(1, v + m)) * 255).toString(16).padStart(2, "0");
  return "#" + f(r) + f(g) + f(b);
}

export function build(p) {
  const parts = [];
  const box = (x, y, z, w, h, d, c, e) => parts.push({ t: "box", p: [x, y, z], s: [w, h, d], c, ...(e ? { e: true } : {}) });
  const cyl = (cx, y, cz, r, h, c, n) => parts.push({ t: "cyl", p: [cx, y, cz], r, h, c, n });

  // Foliage stays foliage under any brand: hue held in the green-to-copper band, saturation and
  // lightness clamped so the lit crown never washes out and the tones keep contrast with each other.
  let [lh, ls, ll] = hexToHsl(p.leaf);
  if (lh > 150 && lh <= 255) lh = 150;
  else if (lh > 255 || lh < 12) lh = 12;
  ls = Math.max(0.25, Math.min(0.58, ls));
  ll = Math.max(0.3, Math.min(0.47, ll));
  const tone = (dl) => hslToHex(lh, ls, Math.max(0.12, Math.min(0.52, ll + dl)));
  const leafCrown = tone(0.05), leafBase = tone(0), leafShade = tone(-0.07), leafDeep = tone(-0.17);

  // Blossom keeps a guaranteed lightness gap from the foliage around it.
  let [bh, bs, bl] = hexToHsl(p.bloom);
  if (Math.abs(bl - ll) < 0.24) bl = Math.min(0.9, ll + 0.3);
  const bloom = hslToHex(bh, bs, bl);

  const KERB = 0.12, Z0 = 0.3, Z1 = 0.92, D = Z1 - Z0;
  const H = p.height;
  const kerb = "#D9DCE1", paving = "#C2C8D0", mulch = "#6E5A46";
  const wood = "#8A6E52", woodDark = "#6F5843", metal = "#3B414B";
  const lit = "#FFD58A", unlit = "#4A5260";

  const GX0 = 2.3, GX1 = 3.7, POST = 0.24;
  const segments = p.gate ? [[0, GX0], [GX1, 6]] : [[0, 6]];

  box(0, 0, 0, 6, KERB, 1, kerb); // kerb strip over the whole footprint

  let k = 0;
  for (const [a, b] of segments) {
    const len = b - a;
    // one continuous clipped mass: shaded woody base, darker lower body, lit upper body, rounded crown
    const skirt = 0.12, crown = Math.min(0.18, H * 0.2);
    const bodyH = H - skirt - crown, lower = bodyH * 0.4;
    box(a, KERB, Z0 + 0.06, len, skirt, D - 0.12, leafDeep);
    box(a, KERB + skirt, Z0, len, lower, D, leafShade);
    box(a, KERB + skirt + lower, Z0, len, bodyH - lower, D, leafBase);
    parts.push({ t: "gable", p: [a, KERB + H - crown, Z0], s: [len, crown, D], c: leafCrown, axis: "x" });

    // mulch bed and an evenly spaced flower border in front of the hedge
    box(a, KERB, 0.04, len, 0.04, Z0 - 0.04, mulch);
    if (p.flowers) {
      const n = Math.max(1, Math.floor((len - 0.2) / 0.5));
      const start = a + (len - (n - 1) * 0.5) / 2;
      for (let i = 0; i < n; i++, k++) {
        const cx = start + i * 0.5, mh = 0.13 + hash(k * 3.7 + 1.3) * 0.06;
        cyl(cx, KERB + 0.04, 0.16, 0.12, mh, leafShade, 8);
        cyl(cx, KERB + 0.04 + mh, 0.16, 0.08, 0.07, bloom, 8);
      }
    }
  }

  if (p.gate) {
    const G = Math.max(0.8, H - 0.15);              // gate scales with the hedge
    const postTop = KERB + Math.max(H, G) + 0.15;   // posts always stand above both
    const PZ = Z0 - 0.04, ox0 = GX0 + POST, ox1 = GX1 - POST;

    box(GX0, KERB, 0, GX1 - GX0, 0.02, 1, paving); // path through the gap

    // posts stand at the hedge ends, proud of the hedge face, with caps and lanterns
    for (const px of [GX0, ox1]) {
      box(px, KERB, PZ, POST, postTop - KERB, POST, wood);
      box(px - 0.03, postTop, PZ - 0.03, POST + 0.06, 0.06, POST + 0.06, woodDark);
      const cx = px + POST / 2, cz = PZ + POST / 2, y = postTop + 0.06;
      box(cx - 0.09, y, cz - 0.09, 0.18, 0.04, 0.18, metal);
      box(cx - 0.08, y + 0.04, cz - 0.08, 0.16, 0.22, 0.16, p.lights ? lit : unlit, p.lights);
      box(cx - 0.11, y + 0.26, cz - 0.11, 0.22, 0.05, 0.22, metal);
      box(cx - 0.03, y + 0.31, cz - 0.03, 0.06, 0.05, 0.06, metal);
    }

    // gate leaf fitted to the opening with a 2 cm swing clearance each side
    const gx0 = ox0 + 0.02, gw = ox1 - ox0 - 0.04;
    const railZ = PZ + 0.1, pickZ = PZ + 0.05;
    const railLo = KERB + 0.15, railHi = KERB + G - 0.22;
    for (const ry of [railLo, railHi]) box(gx0, ry, railZ, gw, 0.08, 0.05, p.gateColor);
    const pickets = 7, pw = 0.09, gap = (gw - pickets * pw) / (pickets + 1);
    for (let i = 0; i < pickets; i++) {
      const dip = 0.05 * Math.abs(i - (pickets - 1) / 2);
      box(gx0 + gap + i * (pw + gap), KERB + 0.06, pickZ, pw, G - 0.06 - dip, 0.05, p.gateColor);
    }
    // hinges on the left post, latch on the right
    for (const ry of [railLo, railHi]) {
      box(ox0 - 0.03, ry - 0.01, PZ - 0.02, 0.06, 0.1, 0.1, metal);           // knuckle on the post edge
      box(ox0, ry + 0.01, pickZ - 0.025, 0.28, 0.06, 0.025, metal);          // strap across the pickets
    }
    box(ox1 - 0.16, KERB + G * 0.55, pickZ - 0.025, 0.19, 0.06, 0.025, metal);
  }

  return { parts };
}
