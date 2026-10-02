// Park Gazebo: an octagonal bandstand with slim posts, a balustrade, a front stair and a flared, pointed roof.
// Block asset: build(p) returns parts in metres on the Oasis Town grid (origin at the footprint's corner, y up,
// street side at z = 0).
export const meta = {
  title: "Park Gazebo",
  kind: "3d",
  format: "blocks",
  kit: "Oasis Town",
  description: "An octagonal park gazebo with a plank floor, a railing, a front stair, bracket lanterns and a flared pointed roof with a lantern finial, sized for a town square or park.",
  tags: ["3d", "low poly", "gazebo", "bandstand", "park", "pavilion", "town", "kit"],
  price: 3,
  author: "oasis-factory",
  footprint: [4, 4],
  size: [900, 1000],
};

export const params = {
  knobs: {
    posts: { type: "color", role: "surface", label: "Posts & rails", default: "#F6EEE0" },
    roof: { type: "color", role: "primary", label: "Roof", default: "#C8553D" },
    floor: { type: "color", role: "muted", label: "Floor planks", default: "#8A6E52" },
    finial: { type: "color", role: "highlight", label: "Finial", default: "#F2B33D" },
    size: { type: "range", label: "Span (m)", default: 2.8, min: 2.2, max: 3.2, step: 0.2 },
    pitch: { type: "range", label: "Roof height (m)", default: 2.0, min: 1.4, max: 3.0, step: 0.2 },
    lights: { type: "toggle", label: "Lanterns lit", default: true },
  },
  presets: {
    Seaside: { posts: "#F6EEE0", roof: "#3E7BFA", floor: "#D8DEE3", finial: "#F2B33D" },
    Garden: { posts: "#F3E3C8", roof: "#2F7A55", floor: "#8A6E52", finial: "#F7B8CF" },
    Slate: { posts: "#D8DEE3", roof: "#5B6270", floor: "#8A6E52", finial: "#E5484D" },
  },
};

// ---- colour helpers: keep the brand hue, hold saturation and lightness in a band per role ----
function toHsl(hex) {
  const n = parseInt(String(hex).replace("#", ""), 16) || 0;
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
  return [h, Math.min(1, s), l];
}
function toHex(h, s, l) {
  h = ((h % 360) + 360) % 360;
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
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function band(hex, sMax, lMin, lMax) {
  const [h, s, l] = toHsl(hex);
  return [h, Math.min(s, sMax), clamp(l, lMin, lMax)];
}
const hueDist = (a, b) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };

export function build(p) {
  const parts = [];
  const box = (x, y, z, w, h, d, c, e) => parts.push({ t: "box", p: [x, y, z], s: [w, h, d], c, ...(e ? { e: true } : {}) });
  const cyl = (x, y, z, r, h, c, n, e) => parts.push({ t: "cyl", p: [x, y, z], r, h, c, n, ...(e ? { e: true } : {}) });
  const cone = (x, y, z, r, h, c, n) => parts.push({ t: "cone", p: [x, y, z], r, h, c, n });

  // ---- role colours ----
  const P = band(p.posts, 0.35, 0.2, 0.94);          // painted timber: light, or a calm charcoal for dark brands
  const R = band(p.roof, 0.75, 0.26, 0.5);           // mid-dark so sunlit faces keep their colour
  const F = band(p.floor, 0.45, 0.3, 0.62);
  if (Math.abs(F[2] - P[2]) < 0.22) F[2] = P[2] > 0.5 ? P[2] - 0.3 : P[2] + 0.3; // rails always read over the floor
  const H = band(p.finial, 0.85, 0.48, 0.62);
  const dh = hueDist(H[0], R[0]);
  if (dh > 35 && dh < 150) H[0] = hueDist(42, R[0]) > 25 ? 42 : (R[0] + 180) % 360; // no clashing pairs: fall back to gilt
  const post = toHex(...P), roof = toHex(...R), fascia = toHex(R[0], R[1], R[2] - 0.08);
  const deck = toHex(...F), fin = toHex(...H);
  const stone = "#D9DCE1", lit = "#FFD58A", glass = "#7E93A8", metal = "#5B6270";

  // ---- one octagon system: flats face the four axes, the entrance flat faces -z ----
  const C8 = Math.cos(Math.PI / 8), T8 = Math.tan(Math.PI / 8);
  const apo = p.size / 2, t = (p.size - 2.2) / 1.0;   // base apothem, 0..1 across the size range
  const cx = 2, cz = Math.max(2, apo + 0.58);          // keep room for the stair in front, roof inside the lot
  const Rb = apo / C8;
  const BASE = 0.35, FY = BASE + 0.04;                 // stone plinth, plank floor on top
  const Ap = apo - 0.2, Rp = Ap / C8;                  // post ring
  const PW = 0.18, PH = 2.1 + 0.7 * t;                 // bigger gazebos stand taller
  const topY = BASE + PH;

  // plinth and plank floor (stone shows in the gaps, so the floor reads as boards, not a slab)
  cyl(cx, 0, cz, Rb, BASE, stone, 8);
  const ad = apo - 0.12, pitchB = 0.28, bw0 = 0.23;
  const nB = Math.floor((2 * ad) / pitchB);
  const zStart = cz - (nB * pitchB) / 2;
  for (let i = 0; i < nB; i++) {
    const z1 = zStart + i * pitchB + (pitchB - bw0) / 2, z2 = z1 + bw0;
    const far = Math.max(Math.abs(z1 - cz), Math.abs(z2 - cz));
    const hw = Math.min(ad, ad * (1 + T8) - far);
    if (hw > 0.1) box(cx - hw, BASE, z1, 2 * hw, 0.04, bw0, deck);
  }

  // entry stair: two treads square to the front flat, within its width, inside the lot
  const zF = cz - apo;
  const SW = 2 * apo * T8 - 0.12;
  const td = Math.min(0.28, (zF - 0.02) / 2);
  box(cx - SW / 2, 0, zF - td, SW, BASE * 2 / 3, td + 0.04, stone);
  box(cx - SW / 2, 0, zF - 2 * td, SW, BASE / 3, td, stone);

  // posts at the corners (22.5 + 45k degrees); edge 5 is the -z entrance
  const pts = [];
  for (let k = 0; k < 8; k++) {
    const a = Math.PI / 8 + k * Math.PI / 4;
    pts.push([cx + Rp * Math.cos(a), cz + Rp * Math.sin(a)]);
  }
  for (const [x, z] of pts) box(x - PW / 2, BASE, z - PW / 2, PW, PH, PW, post);

  // railing on every edge except the entrance
  const rail = (A, B, y, h, th) => {
    const dx = B[0] - A[0], dz = B[1] - A[1], len = Math.hypot(dx, dz);
    if (Math.abs(dz) < 1e-6) { box(Math.min(A[0], B[0]), y, A[1] - th / 2, Math.abs(dx), h, th, post); return; }
    if (Math.abs(dx) < 1e-6) { box(A[0] - th / 2, y, Math.min(A[1], B[1]), th, h, Math.abs(dz), post); return; }
    const s = 0.07 / len, m = Math.ceil(len / 0.06);
    for (let i = 0; i <= m; i++) {
      const u = s + (1 - 2 * s) * (i / m);
      box(A[0] + dx * u - th / 2 - 0.005, y, A[1] + dz * u - th / 2 - 0.005, th + 0.01, h, th + 0.01, post);
    }
  };
  const edgeLen = 2 * Ap * T8;
  const nb = Math.max(2, Math.round(edgeLen / 0.3) - 1);
  for (let k = 0; k < 8; k++) {
    if (k === 5) continue;
    const A = pts[k], B = pts[(k + 1) % 8];
    rail(A, B, FY + 0.85, 0.08, 0.08);
    rail(A, B, FY + 0.1, 0.06, 0.07);
    for (let i = 1; i <= nb; i++) {
      const u = i / (nb + 1);
      const x = A[0] + (B[0] - A[0]) * u, z = A[1] + (B[1] - A[1]) * u;
      box(x - 0.025, FY + 0.16, z - 0.025, 0.05, 0.69, 0.05, post);
    }
  }

  // bench against the back railing: seat on two legs
  const bw = Math.min(1.0, edgeLen - 0.3), bz = cz + Ap - 0.07 - 0.38;
  for (const lx of [cx - bw / 2 + 0.04, cx + bw / 2 - 0.12]) box(lx, FY, bz + 0.04, 0.08, 0.38, 0.3, post);
  box(cx - bw / 2, FY + 0.38, bz, bw, 0.07, 0.38, post);

  // bracket lanterns: an arm from each entrance post's street face, a hexagonal lantern hanging from its tip
  const Ly = FY + 1.75;
  for (const k of [5, 6]) {
    const [x, z] = pts[k];
    const fz = z - PW / 2, lz = fz - 0.26;
    box(x - 0.03, Ly, lz - 0.05, 0.06, 0.06, fz - lz + 0.07, metal);            // arm, keyed into the post
    box(x - 0.025, Ly - 0.22, fz - 0.03, 0.05, 0.22, 0.05, metal);              // brace plate under the arm
    cyl(x, Ly - 0.07, lz, 0.015, 0.08, metal, 6);                               // hook
    cone(x, Ly - 0.19, lz, 0.13, 0.12, metal, 6);                               // cap
    cyl(x, Ly - 0.45, lz, 0.095, 0.26, p.lights ? lit : glass, 6, p.lights);    // glass
    cyl(x, Ly - 0.49, lz, 0.075, 0.04, metal, 6);                               // base
  }

  // roof: ring beam on the posts, fascia, then a flared two-pitch cone (shallow skirt, steep spire)
  cyl(cx, topY, cz, Rp + 0.14, 0.2, post, 8);
  const E = apo + 0.22;                                 // eave radius, stays inside the 4 m lot
  cyl(cx, topY + 0.2, cz, E, 0.12, fascia, 12);
  const coneY = topY + 0.32, h1 = 0.5;
  cone(cx, coneY, cz, E, h1, roof, 12);
  const yS = coneY + h1 / 2;
  cone(cx, yS, cz, E / 2 + 0.05, p.pitch - h1 / 2, roof, 12);

  // pendant lamp under the ceiling
  cyl(cx, topY - 0.35, cz, 0.03, 0.4, metal, 6);
  cyl(cx, topY - 0.65, cz, 0.15, 0.3, p.lights ? lit : glass, 8, p.lights);
  cone(cx, topY - 0.35, cz, 0.2, 0.14, metal, 8);

  // finial: stem out of the apex, lantern, cap
  const apex = coneY + p.pitch;
  cyl(cx, apex - 0.25, cz, 0.06, 0.45, fin, 8);
  cyl(cx, apex + 0.2, cz, 0.13, 0.22, p.lights ? lit : fin, 8, p.lights);
  cone(cx, apex + 0.42, cz, 0.17, 0.26, fin, 8);

  return { parts };
}
