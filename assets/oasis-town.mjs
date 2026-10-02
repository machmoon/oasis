// Oasis Town: an isometric street diorama. Projection and face lighting follow jdan/isomer (MIT):
// x runs up-right and y up-left at 30 degrees, faces are lit by their normal against a light at (2, -1, 3),
// and shapes are painted far to near.
export const meta = {
  title: "Oasis Town",
  kind: "illustration",
  description: "A toy-like isometric street diorama: shops with striped awnings, a tram, cherry trees and lit windows. Every block is generated, so it grows, changes season and wears your brand.",
  tags: ["isometric", "diorama", "city", "street", "town", "3d", "hero", "low poly", "block"],
  price: 0,
  author: "oasis",
  credit: "Isometric projection and lighting after jdan/isomer (MIT)",
  size: [1600, 1100],
};

export const params = {
  knobs: {
    backdrop: { type: "color", role: "background", label: "Backdrop", default: "#E9ECF1" },
    awningA: { type: "color", role: "primary", label: "Awning A", default: "#E5484D" },
    awningB: { type: "color", role: "secondary", label: "Awning B", default: "#3E7BFA" },
    accent: { type: "color", role: "highlight", label: "Signs & vending", default: "#F2B33D" },
    tram: { type: "color", role: "primary", label: "Tram", default: "#2F7A55" },
    season: { type: "choice", label: "Season", default: "spring", options: ["spring", "summer", "autumn", "winter"] },
    time: { type: "choice", label: "Time", default: "day", options: ["day", "dusk", "night"] },
    blocks: { type: "range", label: "Street length", default: 4, min: 2, max: 6, step: 1 },
    height: { type: "range", label: "Building height", default: 2, min: 1, max: 4, step: 0.5 },
    seed: { type: "range", label: "Arrangement", default: 11, min: 1, max: 99, step: 1 },
    showTram: { type: "toggle", label: "Tram", default: true },
    trees: { type: "toggle", label: "Trees", default: true },
  },
  presets: {
    Kyoto: { backdrop: "#E9ECF1", awningA: "#E5484D", awningB: "#3E7BFA", accent: "#F2B33D", tram: "#2F7A55" },
    Seaside: { backdrop: "#E3F1F3", awningA: "#FF7A59", awningB: "#0E7C7B", accent: "#FFC857", tram: "#0E3B43" },
    Candy: { backdrop: "#FFF0F4", awningA: "#FF5C8A", awningB: "#7D5BA6", accent: "#FFB347", tram: "#3D0C2E" },
    Neon: { backdrop: "#14161C", awningA: "#B4FF39", awningB: "#6C5CE7", accent: "#00D1FF", tram: "#B4FF39" },
  },
};

// ---------- small colour helpers (HSL lighten, as isomer's Color.lighten) ----------
function hexRgb(h) { return [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); }
function rgbHex(r, g, b) { return "#" + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join(""); }
function toHsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  let h = 0, s = 0; const l = (mx + mn) / 2;
  if (mx !== mn) {
    const d = mx - mn;
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h /= 6;
  }
  return [h, s, l];
}
function fromHsl(h, s, l) {
  if (s === 0) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = (t) => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
  return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
}
function lighten(hex, amt) { const [h, s, l] = toHsl(hexRgb(hex)); return rgbHex(...fromHsl(h, s, Math.max(0, Math.min(1, l + amt)))); }
function mix(a, b, t) { const A = hexRgb(a), B = hexRgb(b); return rgbHex(...A.map((v, i) => v + (B[i] - v) * t)); }
function lum(hex) { const [r, g, b] = hexRgb(hex); return (r * 299 + g * 587 + b * 114) / 1000; }

function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export default function render(p) {
  const W = 1600, H = 1100;
  const r = rng(p.seed * 7717);
  const dark = lum(p.backdrop) < 110 || p.time === "night";
  const night = p.time === "night", dusk = p.time === "dusk";
  const L = Math.round(p.blocks) * 3 + 2; // street length in cells along x
  const DEPTH = 10; // y: near row (0-3), sidewalk, road (4.2-6.8), sidewalk, far row (7-10)
  // Fit the whole slab plus the tallest roof into the frame with a margin, then centre it.
  const zTop = 0.6 + (p.height + 1.2) * 0.75 + 1.4, zBot = -0.55;
  const spanX = (L + DEPTH + 0.8) * 0.866, spanY = (L + DEPTH + 0.8) * 0.5 + zTop - zBot;
  const S = Math.min((W - 180) / spanX, (H - 170) / spanY);
  const ox = W / 2 - ((L - DEPTH) * 0.866 * S) / 2;
  const oy = (H + spanY * S) / 2 - 20 + zBot * S;
  const LIGHT = (() => { const v = [2, -1, 3], n = Math.hypot(...v); return v.map((c) => c / n); })();
  const P = (x, y, z) => [ox + x * 0.866 * S - y * 0.866 * S, oy - x * 0.5 * S - y * 0.5 * S - z * S];
  const pts = (arr) => arr.map((q) => P(...q).map((v) => v.toFixed(1)).join(",")).join(" ");
  const shade = (hex, normal) => lighten(hex, 0.2 * (normal[0] * LIGHT[0] + normal[1] * LIGHT[1] + normal[2] * LIGHT[2]));
  const LIT = "#FFD58A";
  const nightTint = (hex) => (hex === LIT || hex === "#FFCF7A" ? hex : night ? mix(lighten(hex, -0.12), "#151B3A", 0.5) : dusk ? mix(hex, "#7A4A5C", 0.16) : hex);
  const poly = (arr, fill, extra = "") => `<polygon points="${pts(arr)}" fill="${nightTint(fill)}" ${extra}${night && (fill === LIT || fill === "#FFCF7A") ? ' filter="url(#glow)"' : ""}/>`;
  const quad = (a, b, c, d, fill, extra) => poly([a, b, c, d], fill, extra);

  // A box: the three faces seen from this view (top, the x-min face and the y-min face), lit like isomer.
  function box(x, y, z, dx, dy, dz, color, edge = true) {
    const st = edge ? `stroke="${nightTint(lighten(color, -0.18))}" stroke-width="0.6" stroke-linejoin="round"` : "";
    return quad([x, y, z], [x, y + dy, z], [x, y + dy, z + dz], [x, y, z + dz], shade(color, [-1, 0, 0]), st)
      + quad([x, y, z], [x + dx, y, z], [x + dx, y, z + dz], [x, y, z + dz], shade(color, [0, -1, 0]), st)
      + quad([x, y, z + dz], [x + dx, y, z + dz], [x + dx, y + dy, z + dz], [x, y + dy, z + dz], shade(color, [0, 0, 1]), st);
  }

  const items = []; // [depthKey, svg]
  const add = (x, y, svg, z = 0) => items.push([x + y - z * 0.001, svg]);

  // ---------- palette ----------
  const season = p.season;
  const groundCol = season === "winter" ? "#EEF2F6" : season === "autumn" ? "#C9B58E" : "#A9C48A";
  const sidewalk = "#D9DCE1", road = "#4A4F58", curb = "#BFC3CA";
  const walls = ["#F3E3C8", "#EFD9BC", "#E2C29B", "#F6EEE0", "#D8DEE3", "#EAD2C0", "#C9B49A"];
  const roofs = season === "winter" ? ["#F7F9FB"] : ["#5B6270", "#6F5B4D", "#4E5A66", "#7A6A5A"];
  const blossom = { spring: ["#F7B8CF", "#F29BBA", "#FBD3E2"], summer: ["#5FA35C", "#4E8F4C", "#79B86A"], autumn: ["#E58A3A", "#D4642E", "#F0B048"], winter: ["#F3F6F9", "#E3EAF0", "#FFFFFF"] }[season];

  // ---------- base slab and ground ----------
  let base = "";
  const slabTop = 0, slabH = 0.55;
  base += box(-0.4, -0.4, -slabH, L + 0.8, DEPTH + 0.8, slabH, dark ? "#2A2E37" : "#C9CED6");
  base += quad([0, 0, 0.001], [L, 0, 0.001], [L, DEPTH, 0.001], [0, DEPTH, 0.001], groundCol);
  // sidewalks and road (raised kerbs)
  base += box(0, 3.2, 0, L, 1, 0.12, sidewalk, false);
  base += box(0, 6.8, 0, L, 1, 0.12, sidewalk, false);
  base += quad([0, 4.2, 0.02], [L, 4.2, 0.02], [L, 6.8, 0.02], [0, 6.8, 0.02], road);
  for (let i = 0; i < L; i += 1.2) base += quad([i, 5.46, 0.03], [i + 0.6, 5.46, 0.03], [i + 0.6, 5.54, 0.03], [i, 5.54, 0.03], "#E8E2C8");
  // tram rails
  for (const yy of [4.75, 5.05, 5.95, 6.25]) base += quad([0, yy, 0.03], [L, yy, 0.03], [L, yy + 0.05, 0.03], [0, yy + 0.05, 0.03], "#8C929C");
  // crosswalks
  const cw = Math.max(1.5, Math.round(L * 0.33));
  for (let j = 0; j < 7; j++) { const yy = 4.3 + j * 0.36; base += quad([cw, yy, 0.035], [cw + 1.1, yy, 0.035], [cw + 1.1, yy + 0.2, 0.035], [cw, yy + 0.2, 0.035], "#F3F4F6"); }
  base += quad([0, 3.2, 0.122], [L, 3.2, 0.122], [L, 3.24, 0.122], [0, 3.24, 0.122], curb);

  // ---------- buildings ----------
  function building(x, y, w, d, floors, facing) {
    const h = 0.6 + floors * 0.75;
    const wall = walls[Math.floor(r() * walls.length)];
    const roof = roofs[Math.floor(r() * roofs.length)];
    let s = box(x, y, 0.12, w, d, h, wall);
    // windows on both visible faces; lit at night
    const winCol = night ? (r() > 0.25 ? "#FFD58A" : "#3B4256") : dusk ? "#F6C28B" : "#7E93A8";
    for (let f = 1; f < floors + 1; f++) {
      const z0 = 0.12 + 0.35 + f * 0.75 - 0.35;
      for (let i = 0; i < Math.floor(w / 0.7); i++) {
        const xx = x + 0.25 + i * 0.7;
        if (xx + 0.35 > x + w - 0.1) break;
        s += quad([xx, y - 0.002, z0], [xx + 0.35, y - 0.002, z0], [xx + 0.35, y - 0.002, z0 + 0.42], [xx, y - 0.002, z0 + 0.42], night && r() > 0.3 ? "#FFD58A" : shade(winCol, [0, -1, 0]));
      }
      for (let i = 0; i < Math.floor(d / 0.7); i++) {
        const yy = y + 0.25 + i * 0.7;
        if (yy + 0.35 > y + d - 0.1) break;
        s += quad([x - 0.002, yy, z0], [x - 0.002, yy + 0.35, z0], [x - 0.002, yy + 0.35, z0 + 0.42], [x - 0.002, yy, z0 + 0.42], night && r() > 0.3 ? "#FFD58A" : shade(winCol, [-1, 0, 0]));
      }
    }
    // shopfront: dark glass and a striped awning on the street side (y-min face)
    s += quad([x + 0.15, y - 0.003, 0.15], [x + w - 0.15, y - 0.003, 0.15], [x + w - 0.15, y - 0.003, 0.62], [x + 0.15, y - 0.003, 0.62], night ? "#FFCF7A" : "#3D4654");
    const stripes = Math.max(4, Math.round(w * 4));
    const aw = r() > 0.5 ? p.awningA : p.awningB;
    for (let i = 0; i < stripes; i++) {
      const xa = x + 0.1 + (i * (w - 0.2)) / stripes, xb = x + 0.1 + ((i + 1) * (w - 0.2)) / stripes;
      const c = i % 2 ? "#F7F7F5" : aw;
      s += quad([xa, y, 0.85], [xb, y, 0.85], [xb, y - 0.45, 0.62], [xa, y - 0.45, 0.62], shade(c, [0, -0.7, 0.7]));
    }
    s += quad([x + 0.1, y - 0.45, 0.62], [x + w - 0.1, y - 0.45, 0.62], [x + w - 0.1, y - 0.45, 0.56], [x + 0.1, y - 0.45, 0.56], shade(aw, [0, -1, 0]));
    // roof: gable (tiled) or flat with a parapet and an AC unit
    const top = 0.12 + h;
    if (r() > 0.4) {
      const ov = 0.12, ridge = top + Math.min(w, d) * 0.32;
      s += quad([x - ov, y - ov, top], [x + w + ov, y - ov, top], [x + w + ov, y + d / 2, ridge], [x - ov, y + d / 2, ridge], shade(roof, [0, -0.6, 0.8]), `stroke="${nightTint(lighten(roof, -0.15))}" stroke-width="0.6"`);
      s += poly([[x - ov, y - ov, top], [x - ov, y + d / 2, ridge], [x - ov, y + d + ov, top]], shade(wall, [-1, 0, 0]));
      s += quad([x - ov, y + d / 2, ridge], [x + w + ov, y + d / 2, ridge], [x + w + ov, y + d + ov, top], [x - ov, y + d + ov, top], shade(roof, [0, 0.6, 0.8]));
      for (let k = 1; k < 5; k++) { const t = k / 5; s += `<polyline points="${pts([[x - ov, y - ov + (d / 2 + ov) * t, top + (ridge - top) * t], [x + w + ov, y - ov + (d / 2 + ov) * t, top + (ridge - top) * t]])}" stroke="${nightTint(lighten(roof, -0.2))}" stroke-width="0.8" fill="none"/>`; }
    } else {
      s += box(x - 0.05, y - 0.05, top, w + 0.1, d + 0.1, 0.12, lighten(wall, -0.08));
      s += box(x + 0.15, y + 0.15, top + 0.12, w - 0.3, d - 0.3, 0.02, season === "winter" ? "#F7F9FB" : "#B9BEC6", false);
      s += box(x + w * 0.55, y + d * 0.5, top + 0.14, 0.35, 0.3, 0.25, "#E4E6EA");
    }
    // vertical shop sign on the street corner
    s += box(x + w - 0.05, y - 0.32, 1.0, 0.08, 0.28, 0.9, p.accent);
    for (let k = 0; k < 3; k++) s += quad([x + w - 0.05, y - 0.3, 1.15 + k * 0.25], [x + w - 0.05, y - 0.08, 1.15 + k * 0.25], [x + w - 0.05, y - 0.08, 1.27 + k * 0.25], [x + w - 0.05, y - 0.3, 1.27 + k * 0.25], "#1F2430");
    // AC units on the side
    if (r() > 0.4) s += box(x - 0.22, y + d * 0.4, 1.0 + r() * 0.6, 0.22, 0.32, 0.22, "#E9EBEE");
    add(x + w / 2, y + d / 2, s);
  }

  let cx = 0.2;
  while (cx < L - 1.4) {
    const w = 1.6 + Math.floor(r() * 3) * 0.4;
    if (cx + w > L - 0.1) break;
    building(cx, 7.75, w, 2.0, Math.max(1, Math.round(p.height + r() * 1.2 - 0.4)), "road");
    cx += w + 0.08;
  }
  cx = 0.2;
  while (cx < L - 1.4) {
    const w = 1.6 + Math.floor(r() * 3) * 0.4;
    if (cx + w > L - 0.1) break;
    if (Math.abs(cx - cw) < 1.4) { cx += 1.5; continue; }
    building(cx, 0.6, w, 2.0, Math.max(1, Math.round(p.height + r() * 1.2 - 0.6)), "edge");
    cx += w + 0.08;
  }

  // ---------- street furniture ----------
  for (let i = 1; i < L; i += 3.2) {
    // utility pole with a wire
    add(i, 7.0, box(i, 7.0, 0.12, 0.1, 0.1, 2.6, "#9AA0A8") + box(i - 0.25, 6.97, 2.4, 0.6, 0.06, 0.06, "#9AA0A8"));
  }
  for (let i = 2.2; i < L - 0.5; i += 4.1) {
    // vending machines in pairs
    add(i, 7.15, box(i, 7.15, 0.12, 0.35, 0.3, 0.75, p.accent) + box(i + 0.4, 7.15, 0.12, 0.35, 0.3, 0.75, "#E9EBEE") + quad([i + 0.05, 7.149, 0.4], [i + 0.3, 7.149, 0.4], [i + 0.3, 7.149, 0.8], [i + 0.05, 7.149, 0.8], "#2B3240"));
  }
  for (let i = 1.4; i < L; i += 5.3) {
    // traffic cones
    const cone = (x, y) => box(x, y, 0.12, 0.2, 0.2, 0.05, "#E8663A") + poly([[x + 0.03, y + 0.03, 0.17], [x + 0.17, y + 0.03, 0.17], [x + 0.1, y + 0.1, 0.55]], shade("#F07A3A", [0, -1, 0.3])) + poly([[x + 0.03, y + 0.03, 0.17], [x + 0.03, y + 0.17, 0.17], [x + 0.1, y + 0.1, 0.55]], shade("#F07A3A", [-1, 0, 0.3]));
    add(i, 3.45, cone(i, 3.45));
  }

  // ---------- trees ----------
  if (p.trees) {
    const tree = (x, y) => {
      let s = box(x + 0.08, y + 0.08, 0.12, 0.14, 0.14, 0.7, "#7A5A43");
      const n = 5 + Math.floor(r() * 3);
      const blobs = [];
      for (let k = 0; k < n + 3; k++) blobs.push([x - 0.35 + r() * 0.65, y - 0.35 + r() * 0.65, 0.8 + r() * 0.7, 0.34 + r() * 0.2]);
      blobs.sort((a, b) => b[0] + b[1] - (a[0] + a[1]) || a[2] - b[2]);
      for (const [bx, by, bz, bs] of blobs) s += box(bx, by, bz, bs, bs, bs, blossom[Math.floor(r() * blossom.length)]);
      return s;
    };
    for (let i = 0.6; i < L - 0.4; i += 2.2 + r() * 1.4) {
      if (Math.abs(i - cw - 0.5) > 1) add(i + 0.15, 3.25, tree(i, 3.35));
    }
    add(L - 0.6, DEPTH - 0.6, tree(L - 0.75, DEPTH - 0.7));
    add(0.3, DEPTH - 0.5, tree(0.25, DEPTH - 0.6));
    add(L - 0.5, 0.2, tree(L - 0.6, 0.15));
  }

  // ---------- tram ----------
  if (p.showTram) {
    const tx = Math.max(0.6, L * 0.55), ty = 4.6, tl = 3.2;
    let s = box(tx, ty, 0.08, tl, 0.85, 0.16, "#3A3F48");
    s += box(tx, ty, 0.24, tl, 0.85, 0.42, p.tram);
    s += box(tx, ty, 0.66, tl, 0.85, 0.45, "#F1EAD2");
    for (let i = 0; i < 6; i++) s += quad([tx + 0.25 + i * 0.5, ty - 0.003, 0.74], [tx + 0.6 + i * 0.5, ty - 0.003, 0.74], [tx + 0.6 + i * 0.5, ty - 0.003, 1.02], [tx + 0.25 + i * 0.5, ty - 0.003, 1.02], night ? "#FFD58A" : "#5E7187");
    s += box(tx + 0.05, ty + 0.05, 1.11, tl - 0.1, 0.75, 0.12, p.tram);
    s += box(tx + tl * 0.45, ty + 0.3, 1.23, 0.5, 0.25, 0.1, "#9AA0A8");
    s += `<polyline points="${pts([[tx + tl * 0.5, ty + 0.42, 1.33], [tx + tl * 0.62, ty + 0.42, 1.9]])}" stroke="#5A5F68" stroke-width="2" fill="none"/>`;
    add(tx + tl / 2, ty + 0.4, s, 0.1);
  }
  // overhead tram wire
  const wire = `<polyline points="${pts([[0, 5.45, 1.9], [L, 5.45, 1.9]])}" stroke="${dark ? "#6A7080" : "#5A5F68"}" stroke-width="1.2" fill="none" opacity="0.7"/>`;

  items.sort((a, b) => b[0] - a[0]);
  const sky = night ? mix(p.backdrop, "#0E1224", 0.6) : dusk ? mix(p.backdrop, "#F2B8A0", 0.35) : p.backdrop;
  const glow = night ? `<radialGradient id="g" cx="50%" cy="40%" r="60%"><stop offset="0" stop-color="#2A3358"/><stop offset="1" stop-color="${sky}"/></radialGradient>` : `<radialGradient id="g" cx="50%" cy="35%" r="65%"><stop offset="0" stop-color="${lighten(sky, 0.04)}"/><stop offset="1" stop-color="${sky}"/></radialGradient>`;
  const [sx, sy] = P(L / 2, DEPTH / 2, -slabH);
  const shadow = `<ellipse cx="${sx.toFixed(1)}" cy="${(sy + 18).toFixed(1)}" rx="${(L + DEPTH) * 0.5 * S}" ry="${(L + DEPTH) * 0.09 * S}" fill="#000" opacity="${dark ? 0.35 : 0.1}" filter="url(#blur)"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><defs>${glow}<filter id="blur" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="22"/></filter><filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><rect width="${W}" height="${H}" fill="url(#g)"/>${shadow}${base}${items.map((i) => i[1]).join("")}${wire}</svg>`;
}
