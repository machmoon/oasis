// Windmill: a tapered tower mill on its own 4x4 lawn plate, with a gabled entrance porch, a turning cap and four
// lattice sails. Block asset: build(p) returns parts in metres on the Oasis Town grid (origin at the footprint's
// corner, y up, street side at z = 0).
export const meta = {
  title: "Town Windmill",
  kind: "3d",
  format: "blocks",
  kit: "Oasis Town",
  description: "A tapered tower windmill on a 4x4 lawn plate, with a porch, flour sacks and four lattice sails that can face the street or the side, a landmark for the edge of a little town.",
  tags: ["3d", "low poly", "windmill", "mill", "landmark", "farm", "town", "kit", "block"],
  price: 3,
  author: "oasis-factory",
  footprint: [4, 4],
  size: [1000, 1000],
};

export const params = {
  knobs: {
    tower: { type: "color", role: "surface", label: "Tower", default: "#D8DEE3" },
    sails: { type: "color", role: "primary", label: "Sail cloth", default: "#F6EEE0" },
    cap: { type: "color", role: "secondary", label: "Cap & trim", default: "#C8553D" },
    height: { type: "range", label: "Tower height (m)", default: 7, min: 6.5, max: 10, step: 0.5 },
    angle: { type: "choice", label: "Sail angle", default: "face street", options: ["face street", "face side"] },
    capStyle: { type: "choice", label: "Cap", default: "cone", options: ["cone", "dome"] },
    lights: { type: "toggle", label: "Lit windows", default: true },
  },
  presets: {
    Kyoto: { tower: "#F3E3C8", sails: "#E5484D", cap: "#5B6270" },
    Blossom: { tower: "#F6EEE0", sails: "#F7B8CF", cap: "#2F7A55" },
    Harbour: { tower: "#F6EEE0", sails: "#3E7BFA", cap: "#3B4A5C" },
  },
};

const rgb = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const hex = (a) => "#" + a.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("").toUpperCase();
const mix = (a, b, t) => { const A = rgb(a), B = rgb(b); return hex(A.map((v, i) => v + (B[i] - v) * t)); };
const lum = (c) => { const [r, g, b] = rgb(c); return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; };
const clampLum = (c, lo, hi) => {
  let out = c;
  for (let i = 0; i < 14 && lum(out) < lo; i++) out = mix(out, "#FFFFFF", 0.12);
  for (let i = 0; i < 14 && lum(out) > hi; i++) out = mix(out, "#000000", 0.08);
  return out;
};

export function build(p) {
  const parts = [];
  const box = (x, y, z, w, h, d, c, e) => parts.push({ t: "box", p: [x, y, z], s: [w, h, d], c, ...(e ? { e: true } : {}) });
  const cyl = (cx, y, cz, r, h, c, n) => parts.push({ t: "cyl", p: [cx, y, cz], r, h, c, n });

  // ---- colours: brand inputs keep their roles; lightness is clamped so the form always reads ----
  const tower = clampLum(p.tower, 0.25, 0.88);
  const porchWall = mix(tower, "#FFFFFF", 0.25);
  const plinth = mix(tower, "#5B6270", 0.45);
  let cap = p.cap;
  for (let i = 0; i < 10 && Math.abs(lum(cap) - lum(tower)) < 0.18; i++) cap = lum(tower) > 0.5 ? mix(cap, "#000000", 0.12) : mix(cap, "#FFFFFF", 0.12);
  const collar = mix(cap, "#000000", 0.18);
  const frame = "#6E5641", darkWood = "#4A3B2C", doorWood = "#8A6E52"; // sail frames are always wood
  let sail = mix(p.sails, "#F6EEE0", 0.35);                             // tinted canvas, never a raw accent
  for (let i = 0; i < 12 && lum(sail) < 0.6; i++) sail = mix(sail, "#FFFFFF", 0.1);
  const kerb = "#D9DCE1", leaf = "#79B86A", sack = "#F6EEE0";
  const lit = "#FFD58A", glass = mix("#5E7186", tower, 0.15);
  const win = p.lights ? lit : glass;

  // ---- ground plate: the 4x4 footprint as a kerbed lawn ----
  const G = 0.14;
  box(0, 0, 0, 4, 0.1, 4, kerb);
  box(0.15, 0.1, 0.15, 3.7, 0.04, 3.7, leaf);

  // ---- tower: one-colour tapering 12-sided drums on a plinth ----
  const CX = 2, CZ = 2.3, R0 = 1.6, R1 = 1.05, BASE = 0.2, H = p.height;
  const S = Math.max(4, Math.round(H / 1.4)), hs = H / S;
  const rad = (k) => R0 + ((R1 - R0) * k) / (S - 1);
  cyl(CX, G, CZ, R0 + 0.08, BASE, plinth, 12);
  for (let k = 0; k < S; k++) cyl(CX, G + BASE + k * hs, CZ, rad(k), hs, tower, 12);
  const top = G + BASE + H;

  // ---- entrance porch: closed box sunk into the tower, gable facing the street ----
  const PZ0 = 0.45, PZ1 = CZ - 0.6, PW = 1.9, PH = 2.55, PR = 0.7;
  const porchTop = G + PH + PR;
  box(CX - PW / 2, G, PZ0, PW, PH, PZ1 - PZ0, porchWall);
  parts.push({ t: "gable", p: [CX - PW / 2 - 0.12, G + PH, PZ0 - 0.15], s: [PW + 0.24, PR, PZ1 - PZ0 + 0.15], c: cap, axis: "z" });
  box(CX - 0.6, G, 0.15, 1.2, 0.12, PZ0 - 0.15, plinth);                    // doorstep
  box(CX - 0.57, G + 0.12, PZ0 - 0.04, 1.14, 2.17, 0.04, cap);             // door frame
  box(CX - 0.45, G + 0.12, PZ0 - 0.07, 0.9, 2.05, 0.03, doorWood);         // door leaf
  box(CX + 0.25, G + 1.05, PZ0 - 0.1, 0.08, 0.08, 0.03, darkWood);         // handle
  for (const s of [-1, 1]) {                                               // porch lamps
    const lx = CX + s * 0.76;
    box(lx - 0.11, G + 1.5, PZ0 - 0.05, 0.22, 0.4, 0.05, cap);
    box(lx - 0.07, G + 1.56, PZ0 - 0.08, 0.14, 0.28, 0.03, win, p.lights);
  }
  // flour sacks beside the porch
  box(3.1, G, 0.3, 0.5, 0.55, 0.42, sack);
  box(3.15, G + 0.55, 0.36, 0.4, 0.38, 0.32, sack);
  box(3.08, G + 0.4, 0.28, 0.54, 0.06, 0.46, doorWood);                    // tie band

  // ---- sail sizing: grows with the tower, lowest sweep always clears the porch ----
  const COL = 0.5, hubY = top + COL / 2;
  const reach = hubY - porchTop - 0.6;
  const R = Math.min(1.2 + 0.3 * H, reach / Math.hypot(1, 0.4));
  const BW = 0.4 * R, SH = 0.13, FW = 0.2, RIN = 0.7, nS = 0.3;
  const side = p.angle === "face side";
  const N0 = side ? CX : CZ;
  const collarFront = N0 - (R1 + 0.2);
  const dirs = [
    { u: [0, 1], v: [1, 0] }, { u: [-1, 0], v: [0, 1] },
    { u: [0, -1], v: [-1, 0] }, { u: [1, 0], v: [0, -1] },
  ];
  // a rectangle in sail-plane coords (u across, v up from the hub), n along the plane normal (toward camera = smaller)
  const Q = (u0, u1, v0, v1, n, dn, c) => {
    if (u1 - u0 < 1e-6 || v1 - v0 < 1e-6) return;
    if (side) box(n, hubY + v0, CZ - u1, dn, v1 - v0, u1 - u0, c);
    else box(CX + u0, hubY + v0, n, u1 - u0, v1 - v0, dn, c);
  };
  // would a facade point be hidden behind the sails from the 45-degree camera?
  const covered = (x, y, z) => {
    const t = (side ? x : z) - nS;
    const u = side ? CZ - (z - t) : x - t - CX, v = y + t - hubY, m = 0.3;
    if (Math.abs(u) < 0.35 + m && Math.abs(v) < 0.35 + m) return true;
    for (const d of dirs) {
      const r = u * d.u[0] + v * d.u[1], o = u * d.v[0] + v * d.v[1];
      if (r >= 0.3 - m && r <= R + m && o >= -SH - m && o <= BW + m) return true;
    }
    return false;
  };

  // ---- windows: a staggered spiral, alternating faces, only where the sails never hide them ----
  const wW = 0.55, wh = Math.min(0.8, hs - 0.45);
  let count = 0;
  for (let k = 1; k < S - 1 && count < 4; k++) {
    const r = rad(k), y = G + BASE + k * hs + (hs - wh) / 2, dep = 0.2;
    if (k % 2 === 0) {
      const zf = CZ - r - 0.03;
      if (y - 0.1 < porchTop + 0.15) continue;
      const pts = [[CX - wW / 2, y - 0.1], [CX + wW / 2, y - 0.1], [CX - wW / 2, y + wh], [CX + wW / 2, y + wh]];
      if (pts.some(([x, yy]) => covered(x, yy, zf))) continue;
      box(CX - wW / 2, y, zf, wW, wh, dep, win, p.lights);
      box(CX - wW / 2 - 0.08, y - 0.1, zf - 0.04, wW + 0.16, 0.1, dep + 0.04, cap);
    } else {
      const xf = CX - r - 0.03;
      const pts = [[CZ - wW / 2, y - 0.1], [CZ + wW / 2, y - 0.1], [CZ - wW / 2, y + wh], [CZ + wW / 2, y + wh]];
      if (pts.some(([z, yy]) => covered(xf, yy, z))) continue;
      box(xf, y, CZ - wW / 2, dep, wh, wW, win, p.lights);
      box(xf - 0.04, y - 0.1, CZ - wW / 2 - 0.08, dep + 0.04, 0.1, wW + 0.16, cap);
    }
    count++;
  }

  // ---- cap: collar, then a cone or a stepped dome, each with a finial ----
  const CR = R1 + 0.45;
  cyl(CX, top, CZ, R1 + 0.2, COL, collar, 12);
  if (p.capStyle === "dome") {
    const fr = [1, 0.92, 0.78, 0.56, 0.3], th = 0.34;
    fr.forEach((f, i) => cyl(CX, top + COL + i * th, CZ, CR * f, th, cap, 12));
    const fy = top + COL + fr.length * th;
    cyl(CX, fy, CZ, 0.08, 0.35, frame, 8);
    cyl(CX, fy + 0.35, CZ, 0.17, 0.2, frame, 8);
  } else {
    parts.push({ t: "cone", p: [CX, top + COL, CZ], r: CR, h: 2.2, c: cap, n: 12 });
    cyl(CX, top + COL + 2.0, CZ, 0.1, 0.45, frame, 8);
  }

  // ---- hub: shaft from the collar, boss in front of the sail plane ----
  Q(-0.18, 0.18, -0.18, 0.18, nS, collarFront + 0.2 - nS, frame);
  Q(-0.35, 0.35, -0.35, 0.35, nS - 0.23, 0.23, frame);
  Q(-0.15, 0.15, -0.15, 0.15, nS - 0.27, 0.04, darkWood);

  // ---- sails: four axis-aligned blades, each spar + trailing edge + bars framing clean cloth panels ----
  const nC = Math.max(2, Math.round((R - RIN) / 1.0));
  const bars = [];
  for (let i = 1; i <= nC; i++) bars.push(RIN + ((R - RIN) * i) / (nC + 1));
  const edges = [RIN + FW];
  for (const b of bars) edges.push(b - FW / 2, b + FW / 2);
  edges.push(R - FW);
  for (const d of dirs) {
    const rect = (r0, r1, o0, o1, n, dn, c) => {
      const ua = d.u[0] * r0 + d.v[0] * o0, va = d.u[1] * r0 + d.v[1] * o0;
      const ub = d.u[0] * r1 + d.v[0] * o1, vb = d.u[1] * r1 + d.v[1] * o1;
      Q(Math.min(ua, ub), Math.max(ua, ub), Math.min(va, vb), Math.max(va, vb), n, dn, c);
    };
    rect(0.3, R, -SH, SH, nS - 0.08, 0.16, frame);               // spar
    rect(RIN, R, BW - FW, BW, nS - 0.03, 0.1, frame);             // trailing edge
    rect(RIN, RIN + FW, SH, BW - FW, nS - 0.03, 0.1, frame);      // root bar
    rect(R - FW, R, SH, BW - FW, nS - 0.03, 0.1, frame);          // tip bar
    for (const b of bars) rect(b - FW / 2, b + FW / 2, SH, BW - FW, nS - 0.03, 0.1, frame);
    for (let i = 0; i < edges.length; i += 2) rect(edges[i], edges[i + 1], SH, BW - FW, nS, 0.06, sail);
  }
  return { parts };
}
