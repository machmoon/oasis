// Checkout Street: the Oasis purchase flow as a toy diorama. An agent kiosk sends a cart of asset cubes down the
// street to a toll gate that only opens when the human approves, and the cubes end up at the buyer's house.
// Projection and face lighting follow jdan/isomer (MIT), as in oasis-town.mjs: x runs up-right, y up-left at
// 30 degrees, faces are lit by their normal against a light at (2, -1, 3), shapes are painted far to near.
export const meta = {
  title: "Checkout Street",
  kind: "illustration",
  description: "An isometric toy street that tells a story: an agent kiosk, a market stall stacked with asset cubes, a toll gate that opens when you approve, and the house the order is delivered to. Flip the gate, restyle every block.",
  tags: ["isometric", "diorama", "checkout", "flow", "agent", "hero", "street", "3d", "block", "story"],
  price: 0,
  author: "oasis",
  credit: "Isometric projection and lighting after jdan/isomer (MIT)",
  size: [1600, 1000],
};

export const params = {
  knobs: {
    backdrop: { type: "color", role: "background", label: "Backdrop", default: "#E9ECF1" },
    stall: { type: "color", role: "primary", label: "Stall awning", default: "#E5484D" },
    gate: { type: "color", role: "secondary", label: "Gate & booth", default: "#3E7BFA" },
    cubes: { type: "color", role: "highlight", label: "Asset cubes", default: "#F2B33D" },
    house: { type: "color", label: "House", default: "#F3E3C8" },
    approved: { type: "toggle", label: "Approved (gate open)", default: false },
    items: { type: "range", label: "Items in the cart", default: 4, min: 1, max: 6, step: 1 },
    season: { type: "choice", label: "Season", default: "spring", options: ["spring", "summer", "autumn", "winter"] },
    time: { type: "choice", label: "Time", default: "day", options: ["day", "night"] },
    trees: { type: "toggle", label: "Trees", default: true },
  },
  presets: {
    Kyoto: { backdrop: "#E9ECF1", stall: "#E5484D", gate: "#3E7BFA", cubes: "#F2B33D", house: "#F3E3C8" },
    Seaside: { backdrop: "#E3F1F3", stall: "#FF7A59", gate: "#0E7C7B", cubes: "#FFC857", house: "#F5EBDD" },
    Candy: { backdrop: "#FFF0F4", stall: "#FF5C8A", gate: "#7D5BA6", cubes: "#FFB347", house: "#FBE7EF" },
    Midnight: { backdrop: "#14161C", stall: "#B4FF39", gate: "#6C5CE7", cubes: "#00D1FF", house: "#2A2E3A" },
  },
};

// ---------- colour helpers ----------
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
const lighten = (hex, amt) => { const [h, s, l] = toHsl(hexRgb(hex)); return rgbHex(...fromHsl(h, s, Math.max(0, Math.min(1, l + amt)))); };
const mix = (a, b, t) => { const A = hexRgb(a), B = hexRgb(b); return rgbHex(...A.map((v, i) => v + (B[i] - v) * t)); };
const lum = (hex) => { const [r, g, b] = hexRgb(hex); return (r * 299 + g * 587 + b * 114) / 1000; };

export default function render(p) {
  const W = 1600, H = 1000;
  const night = p.time === "night";
  const dark = night || lum(p.backdrop) < 110;
  const L = 17, D = 7; // street length (x) and depth (y)
  const zTop = 3.4, zBot = -0.55;
  const spanX = (L + D + 0.8) * 0.866, spanY = (L + D + 0.8) * 0.5 + zTop - zBot;
  const S = Math.min((W - 40) / spanX, (H - 60) / spanY);
  const ox = W / 2 - ((L - D) * 0.866 * S) / 2;
  const oy = (H + spanY * S) / 2 + zBot * S;
  const LIGHT = (() => { const v = [2, -1, 3], n = Math.hypot(...v); return v.map((c) => c / n); })();
  const P = (x, y, z) => [ox + (x - y) * 0.866 * S, oy - (x + y) * 0.5 * S - z * S];
  const pts = (arr) => arr.map((q) => P(...q).map((v) => v.toFixed(1)).join(",")).join(" ");
  const shade = (hex, n) => lighten(hex, 0.2 * (n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2]));
  const LIT = "#FFD58A";
  const tint = (hex) => (hex === LIT ? hex : night ? mix(lighten(hex, -0.1), "#151B3A", 0.48) : hex);
  const poly = (arr, fill, extra = "") => `<polygon points="${pts(arr)}" fill="${tint(fill)}" ${extra}${night && fill === LIT ? ' filter="url(#glow)"' : ""}/>`;
  const quad = (a, b, c, d, fill, extra) => poly([a, b, c, d], fill, extra);
  function box(x, y, z, dx, dy, dz, color, edge = true) {
    const st = edge ? `stroke="${tint(lighten(color, -0.18))}" stroke-width="0.6" stroke-linejoin="round"` : "";
    return quad([x, y, z], [x, y + dy, z], [x, y + dy, z + dz], [x, y, z + dz], shade(color, [-1, 0, 0]), st)
      + quad([x, y, z], [x + dx, y, z], [x + dx, y, z + dz], [x, y, z + dz], shade(color, [0, -1, 0]), st)
      + quad([x, y, z + dz], [x + dx, y, z + dz], [x + dx, y + dy, z + dz], [x, y + dy, z + dz], shade(color, [0, 0, 1]), st);
  }
  // A roof prism running along x (ridge at mid-y).
  function roofX(x, y, z, dx, dy, h, color) {
    const m = y + dy / 2;
    return poly([[x, y, z], [x + dx, y, z], [x + dx, m, z + h], [x, m, z + h]], shade(color, [0, -0.7, 0.7]))
      + poly([[x, y, z], [x, m, z + h], [x, y + dy, z]], shade(color, [-1, 0, 0]));
  }

  const items = [];
  const add = (x, y, svg, z = 0) => items.push([x + y - z * 0.001, svg]);
  const season = p.season;
  const ground = season === "winter" ? "#EEF2F6" : season === "autumn" ? "#C9B58E" : "#A9C48A";
  const path = "#D9DCE1", road = "#4A4F58";
  const blossom = { spring: ["#F7B8CF", "#F29BBA", "#FBD3E2"], summer: ["#5FA35C", "#4E8F4C", "#79B86A"], autumn: ["#E58A3A", "#D4642E", "#F0B048"], winter: ["#F3F6F9", "#E3EAF0", "#FFFFFF"] }[season];

  // ---------- slab, lawn, street ----------
  let base = box(-0.4, -0.4, -0.55, L + 0.8, D + 0.8, 0.55, dark ? "#2A2E37" : "#C9CED6");
  base += quad([0, 0, 0.001], [L, 0, 0.001], [L, D, 0.001], [0, D, 0.001], ground);
  base += quad([0, 2.6, 0.02], [L, 2.6, 0.02], [L, 4.4, 0.02], [0, 4.4, 0.02], road);
  for (let i = 0.4; i < L; i += 1.3) base += quad([i, 3.46, 0.03], [i + 0.65, 3.46, 0.03], [i + 0.65, 3.54, 0.03], [i, 3.54, 0.03], "#E8E2C8");
  base += box(0, 1.8, 0, L, 0.8, 0.1, path, false);
  base += box(0, 4.4, 0, L, 0.8, 0.1, path, false);

  // ---------- 1. agent kiosk: a friendly robot on a plinth ----------
  {
    const x = 1.2, y = 5.5;
    let s = box(x - 0.2, y - 0.2, 0.1, 1.6, 1.4, 0.25, "#C9CED6");
    s += box(x, y, 0.35, 1.2, 1.0, 1.0, "#F6F7F9");
    s += box(x + 0.1, y - 0.01, 0.55, 1.0, 0.02, 0.62, night ? "#1C2333" : "#2B3242", false);
    for (const ex of [0.32, 0.72]) s += box(x + ex, y - 0.03, 0.82, 0.16, 0.02, 0.16, "#7CF0C2", false);
    s += box(x + 0.15, y + 0.1, 1.35, 0.9, 0.8, 0.5, "#F6F7F9");
    s += box(x + 0.55, y + 0.45, 1.85, 0.08, 0.08, 0.5, "#8C929C", false);
    s += box(x + 0.47, y + 0.37, 2.35, 0.24, 0.24, 0.24, p.cubes);
    add(x + 1, y + 1, s, 0);
  }

  // ---------- 2. market stall with the cart of asset cubes ----------
  {
    const x = 5.2, y = 5.3;
    let s = box(x, y, 0.1, 2.6, 1.4, 0.9, "#E7D3B5");
    for (const px of [0, 2.45]) for (const py of [0, 1.25]) s += box(x + px, y + py, 1.0, 0.15, 0.15, 1.1, "#8A6E52", false);
    const stripes = 6;
    for (let i = 0; i < stripes; i++) {
      const sx = x - 0.15 + (i * 2.9) / stripes;
      s += box(sx, y - 0.25, 2.1, 2.9 / stripes, 1.9, 0.18, i % 2 ? "#FBFBFB" : p.stall, false);
    }
    const n = Math.round(p.items), cubeCols = [p.cubes, p.stall, p.gate, lighten(p.cubes, -0.15), "#79B86A", "#F7B8CF"];
    for (let i = 0; i < n; i++) {
      const cx = x + 0.3 + (i % 3) * 0.72, cy = y + 0.45, cz = 1.0 + Math.floor(i / 3) * 0.5;
      s += box(cx, cy, cz, 0.5, 0.5, 0.5, cubeCols[i % cubeCols.length]);
    }
    add(x + 2.6, y + 1.4, s, 0);
  }

  // ---------- 3. toll gate: closed until the human approves ----------
  {
    const x = 10.4;
    let booth = box(x + 0.2, 4.7, 0.1, 1.2, 1.2, 1.5, p.gate);
    booth += box(x + 0.3, 4.69, 0.75, 1.0, 0.02, 0.55, night ? LIT : "#DCEBFF", false);
    booth += roofX(x + 0.05, 4.55, 1.6, 1.5, 1.5, 0.45, lighten(p.gate, -0.18));
    add(x + 1.4, 5.9, booth, 0);
    add(x + 0.6, 2.2, box(x + 0.5, 1.9, 0.1, 0.35, 0.35, 0.95, p.gate), 0);
    // The arm: pointing across the road when closed, raised when approved.
    let arm = "";
    if (!p.approved) {
      const segs = 6, y0 = 2.1, y1 = 4.6;
      for (let i = 0; i < segs; i++) {
        const ya = y0 + ((y1 - y0) * i) / segs, yb = y0 + ((y1 - y0) * (i + 1)) / segs;
        arm += box(x + 0.6, ya, 0.85, 0.16, yb - ya, 0.16, i % 2 ? "#FBFBFB" : p.stall, false);
      }
      add(x + 0.8, 4.6, arm, 0.9);
    } else {
      for (let i = 0; i < 6; i++) arm += box(x + 0.6, 2.1, 1.05 + i * 0.36, 0.16, 0.16, 0.36, i % 2 ? "#FBFBFB" : p.stall, false);
      add(x + 0.8, 2.3, arm, 1.5);
    }
  }

  // ---------- 4. the buyer's house; cubes arrive once approved ----------
  {
    const x = 13.4, y = 5.0;
    let s = box(x, y, 0.1, 2.6, 1.8, 1.5, p.house);
    s += box(x + 0.4, y - 0.01, 0.1, 0.6, 0.02, 0.95, lighten(p.house, -0.45), false);
    s += box(x + 1.35, y - 0.01, 0.7, 0.7, 0.02, 0.5, night || p.approved ? LIT : "#7E93A8", false);
    s += roofX(x - 0.15, y - 0.15, 1.6, 2.9, 2.1, 0.9, season === "winter" ? "#F7F9FB" : "#5B6270");
    s += box(x + 2.0, y + 0.4, 1.9, 0.3, 0.3, 0.6, "#B98A6A");
    add(x + 2.6, y + 1.8, s, 0);
    if (p.approved) {
      const n = Math.round(p.items), cubeCols = [p.cubes, p.stall, p.gate, lighten(p.cubes, -0.15), "#79B86A", "#F7B8CF"];
      let c = "";
      for (let i = 0; i < n; i++) c += box(x + 0.3 + (i % 3) * 0.55, y - 0.5, 0.1 + Math.floor(i / 3) * 0.42, 0.4, 0.4, 0.4, cubeCols[i % cubeCols.length]);
      add(x + 2.0, y - 0.1, c, 0);
    }
  }

  // ---------- cubes travelling on the road (stopped at the gate until approved) ----------
  {
    const n = Math.min(3, Math.round(p.items));
    const cubeCols = [p.cubes, p.stall, p.gate];
    for (let i = 0; i < n; i++) {
      const cx = p.approved ? 12.3 + i * 0.7 : 8.3 + i * 0.75;
      add(cx + 0.45, 3.65, box(cx, 3.2, 0.05, 0.45, 0.45, 0.45, cubeCols[i % 3]), 0.05);
    }
  }

  // ---------- trees and lamps ----------
  if (p.trees) {
    const spots = [[3.6, 6.3], [9.2, 6.1], [0.6, 0.6], [4.5, 0.8], [8.4, 0.6], [12.4, 0.9], [16.2, 0.7], [16.3, 6.4]];
    for (const [tx, ty] of spots) {
      let t = box(tx, ty, 0.1, 0.16, 0.16, 0.55, "#7A5A43", false);
      t += box(tx - 0.27, ty - 0.27, 0.6, 0.7, 0.7, 0.5, blossom[0]);
      t += box(tx - 0.12, ty - 0.12, 1.1, 0.4, 0.4, 0.32, blossom[2]);
      add(tx + 0.4, ty + 0.4, t, 0);
    }
  }
  for (const lx of [3, 7.6, 12.2, 15.6]) {
    let l = box(lx, 1.95, 0.1, 0.08, 0.08, 1.3, "#5A606B", false) + box(lx - 0.08, 1.87, 1.4, 0.24, 0.24, 0.14, night ? LIT : "#E8EAEE", false);
    add(lx + 0.1, 2.0, l, 0);
  }

  items.sort((a, b) => b[0] - a[0]);
  const bg = night && !dark ? "#1B2135" : p.backdrop;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
<defs><filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<radialGradient id="shadow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#000" stop-opacity="${dark ? 0.45 : 0.16}"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient></defs>
<rect width="${W}" height="${H}" fill="${bg}"/>
<ellipse cx="${W / 2}" cy="${H - 70}" rx="${W * 0.36}" ry="40" fill="url(#shadow)"/>
${base}
${items.map((i) => i[1]).join("\n")}
</svg>`;
}
