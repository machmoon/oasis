// Campus Quad: an isometric university quad (brick hall, staged clock tower, crossing paths, fountain, benches, lamps and a bike rack) in the Oasis Town kit style.
export const meta = {
  title: "Campus Quad",
  kind: "illustration",
  description: "A toy-like isometric university quad with a brick hall, clock tower, hanging banners, crossing lawn paths, a fountain, benches and a bike rack, for school, edtech and alumni hero art.",
  tags: ["isometric", "campus", "university", "school", "diorama", "clock tower", "education", "3d"],
  price: 9,
  author: "oasis-factory",
  credit: "Isometric projection and lighting after jdan/isomer (MIT)",
  size: [1600, 1200],
};

export const params = {
  knobs: {
    backdrop: { type: "color", role: "background", label: "Backdrop", default: "#E9ECF1" },
    brick: { type: "color", role: "primary", label: "Brick", default: "#B0503A" },
    banner: { type: "color", role: "secondary", label: "Banners", default: "#24418A" },
    trim: { type: "color", role: "highlight", label: "Clock & crest", default: "#E8B23A" },
    season: { type: "choice", label: "Season", default: "spring", options: ["spring", "summer", "autumn", "winter"] },
    time: { type: "choice", label: "Time", default: "day", options: ["day", "dusk", "night"] },
    tower: { type: "range", label: "Tower height", default: 2, min: 1, max: 4, step: 0.5 },
    bikes: { type: "range", label: "Bikes in rack", default: 5, min: 2, max: 8, step: 1 },
    seed: { type: "range", label: "Layout", default: 11, min: 1, max: 99, step: 1 },
    lamps: { type: "toggle", label: "Lamp posts", default: true },
  },
  presets: {
    "Ivy Autumn": { backdrop: "#F1EBE1", brick: "#8E3B2E", banner: "#1E5B3A", trim: "#D9A441", season: "autumn", time: "dusk", tower: 2.5, bikes: 6, seed: 14 },
    "Winter Term": { backdrop: "#1B2230", brick: "#9C5A48", banner: "#7A1F2B", trim: "#E8C15A", season: "winter", time: "night", tower: 3.5, bikes: 3, seed: 22, lamps: true },
    "Summer School": { backdrop: "#EAF4F0", brick: "#C8734F", banner: "#0E7C7B", trim: "#FFC857", season: "summer", time: "day", tower: 1, bikes: 8, seed: 9, lamps: false },
    Convocation: { backdrop: "#EEEAF6", brick: "#A0523F", banner: "#5B3FA8", trim: "#F2C14E", season: "spring", time: "day", tower: 4, bikes: 4, seed: 40 },
  },
};

function hexRgb(h) { return [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); }
function rgbHex(r, g, b) { return "#" + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("").toUpperCase(); }
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
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function harm(hex, sMin, sMax, lMin, lMax, hT = 0, pull = 0, hSpan = 1) {
  let [h, s, l] = toHsl(hexRgb(hex));
  if (pull) h = (hT + clamp((((h - hT + 1.5) % 1) - 0.5) * (1 - pull), -hSpan, hSpan) + 1) % 1;
  return rgbHex(...fromHsl(h, clamp(s, sMin, sMax), clamp(l, lMin, lMax)));
}
function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export default function render(p) {
  const W = 1600, H = 1200, Q = 12, TAU = Math.PI * 2;
  const r = rng(p.seed * 7919 + 3);
  const night = p.time === "night", dusk = p.time === "dusk";
  const darkBg = lum(p.backdrop) < 110, dark = night || darkBg;
  const season = p.season, winter = season === "winter";
  const hx = 1.5, hy = 9, hw = 9, hd = 2.2, hH = 2.45, top = hH + 0.1, rg = top + 0.75, ym = hy + hd / 2;
  const bel = p.tower >= 3 ? 0.85 : 0, pinn = p.tower >= 2.5;
  const shaftTop = top + 0.8 + p.tower * 0.9, clockTop = shaftTop + 1.18, belZ = clockTop + 0.18, belTop = belZ + bel;
  const spireBase = bel ? belTop + 0.14 : belZ, apex = spireBase + 1.6 + p.tower * 0.15;
  const topU = 7.75 + apex + 0.5, botU = -0.95, spanX = (Q + 0.8) * 2 * 0.866, spanY = topU - botU;
  const S = Math.min((W - 240) / spanX, (H - 200) / spanY);
  const ox = W / 2, oy = H / 2 + ((topU + botU) / 2) * S + 10;
  const LIGHT = (() => { const v = [2, -1, 3], n = Math.hypot(...v); return v.map((c) => c / n); })();
  const P = (x, y, z) => [ox + (x - y) * 0.866 * S, oy - (x + y) * 0.5 * S - z * S];
  const pts = (arr) => arr.map((q) => P(...q).map((v) => v.toFixed(1)).join(",")).join(" ");
  const LIT = "#FFD58A", GLOW = [LIT, "#FFE9B0", "#FFE7A8"], glowy = (h) => GLOW.includes(h);
  const shade = (hex, n) => (glowy(hex) ? hex : lighten(hex, 0.2 * (n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2])));
  const nightTint = (hex) => (glowy(hex) ? hex : night ? mix(lighten(hex, -0.12), "#151B3A", 0.5) : dusk ? mix(hex, "#7A4A5C", 0.16) : hex);
  const poly = (arr, fill, extra = "") => `<polygon points="${pts(arr)}" fill="${nightTint(fill)}" ${extra}${night && glowy(fill) ? ' filter="url(#glow)"' : ""}/>`;
  const quad = (a, b, c, d, fill, extra) => poly([a, b, c, d], fill, extra);
  const line = (arr, col, w, extra = "") => `<polyline points="${pts(arr)}" stroke="${nightTint(col)}" stroke-width="${w.toFixed(2)}" stroke-linecap="round" stroke-linejoin="round" fill="none" ${extra}/>`;
  function box(x, y, z, dx, dy, dz, color, edge = true) {
    const st = edge ? `stroke="${nightTint(lighten(color, -0.18))}" stroke-width="0.6" stroke-linejoin="round"` : "";
    return quad([x, y, z], [x, y + dy, z], [x, y + dy, z + dz], [x, y, z + dz], shade(color, [-1, 0, 0]), st)
      + quad([x, y, z], [x + dx, y, z], [x + dx, y, z + dz], [x, y, z + dz], shade(color, [0, -1, 0]), st)
      + quad([x, y, z + dz], [x + dx, y, z + dz], [x + dx, y + dy, z + dz], [x, y + dy, z + dz], shade(color, [0, 0, 1]), st);
  }
  const circ = (cx, cy, R, z, n = 44) => Array.from({ length: n }, (_, k) => [cx + R * Math.cos((k / n) * TAU), cy + R * Math.sin((k / n) * TAU), z]);
  const FY = (c) => (u, z) => [u, c, z], FX = (c) => (u, z) => [c, u, z];
  const arch = (map, u, z0, w, ht, fill) => {
    const rr = w / 2, zc = z0 + ht - rr, a = [map(u - rr, z0), map(u + rr, z0)];
    for (let k = 0; k <= 8; k++) { const t = (Math.PI * k) / 8; a.push(map(u + rr * Math.cos(t), zc + rr * Math.sin(t))); }
    return poly(a, fill);
  };

  // brand roles mapped into material ranges: brick stays in the crimson-to-tan family, cloth is dyed, trim is gilded
  const brick = harm(p.brick, 0.3, 0.5, 0.32, 0.44, 0.04, 0.75, 0.045);
  let banner = harm(p.banner, 0.25, 0.66, 0.26, 0.52);
  if (Math.abs(lum(banner) - lum(brick)) < 42) banner = lighten(banner, lum(brick) > 95 ? -0.17 : 0.17);
  const trim = harm(p.trim, 0.35, 0.68, 0.5, 0.64, 0.12, 0.25);
  let lawn = { spring: "#A9C48A", summer: "#8DB872", autumn: "#A8AC6E", winter: "#EEF2F6" }[season];
  if (darkBg && !night) lawn = mix(lawn, p.backdrop, 0.14);
  const pathCol = winter ? "#CBD2DA" : season === "autumn" ? "#E4D8BE" : "#DCCFB2", stone = "#E8DDC8", roofCol = winter ? "#F3F6F9" : "#4F5866", iron = "#3A3F48";
  const glass = night ? "#3B4256" : dusk ? "#F2C08E" : "#7E93A8";
  const blossom = { spring: ["#F7B8CF", "#F29BBA", "#FBD3E2"], summer: ["#5FA35C", "#4E8F4C", "#79B86A"], autumn: ["#E58A3A", "#D4642E", "#F0B048"], winter: ["#F2F6F9"] }[season];
  const sky = night ? mix(p.backdrop, "#0E1224", 0.6) : dusk ? mix(p.backdrop, "#F2B8A0", 0.35) : p.backdrop;

  // ---------- paths and their exclusion field ----------
  const pattern = p.seed % 3, ring = pattern === 2;
  const segs = [[6, -0.5, 6, 8, 0.6], [-0.5, 4, 12.5, 4, 0.5]];
  if (pattern === 1) segs.push([0.5, -0.4, 11.5, 8.4, 0.42], [11.5, -0.4, 0.5, 8.4, 0.42]);
  const segD = (x, y, [ax, ay, bx, by, w]) => { const dx = bx - ax, dy = by - ay, t = clamp(((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy), 0, 1); return Math.hypot(x - ax - t * dx, y - ay - t * dy) - w; };
  const pathDist = (x, y) => {
    let d = Math.hypot(x - 6, y - 4) - 1.1;
    for (const s of segs) d = Math.min(d, segD(x, y, s));
    if (ring) d = Math.min(d, Math.abs(Math.hypot(x - 6, y - 4) - 2.0) - 0.3);
    return Math.min(d, 7.9 - y);
  };
  const strip = ([ax, ay, bx, by, w], col) => { const L = Math.hypot(bx - ax, by - ay), nx = (-(by - ay) / L) * w, ny = ((bx - ax) / L) * w; return quad([ax + nx, ay + ny, 0.012], [bx + nx, by + ny, 0.012], [bx - nx, by - ny, 0.012], [ax - nx, ay - ny, 0.012], col); };

  const slabCol = dark ? mix(sky, "#9AA3B5", 0.32) : "#C9CED6";
  let g = box(-0.4, -0.4, -0.55, Q + 0.8, Q + 0.8, 0.55, slabCol);
  g += quad([0, 0, 0.002], [Q, 0, 0.002], [Q, Q, 0.002], [0, Q, 0.002], lawn);
  let paths = "";
  if (!winter) for (let i = 0; i < Q; i += 1.6) paths += quad([i, 0, 0.004], [i + 0.8, 0, 0.004], [i + 0.8, 7.9, 0.004], [i, 7.9, 0.004], lighten(lawn, 0.03));
  if (ring) paths += poly(circ(6, 4, 2.3, 0.008), pathCol) + poly(circ(6, 4, 1.7, 0.009), lawn);
  for (const s of segs) paths += strip(s, pathCol);
  paths += poly(circ(6, 4, 1.1, 0.014), lighten(pathCol, 0.04));
  paths += quad([1, 7.9, 0.016], [11, 7.9, 0.016], [11, 9.2, 0.016], [1, 9.2, 0.016], mix(pathCol, stone, 0.5));

  // ---------- props on explicit slots, recorded in an occupancy map ----------
  const items = [], occ = [], lampPos = [];
  const add = (x, y, svg) => items.push([x + y, svg]);
  const bench = (x0, y0, backAtMin) => {
    const wood = "#9A6B47";
    let s = box(x0 + 0.05, y0 + 0.08, 0.012, 0.3, 0.06, 0.3, iron) + box(x0 + 0.05, y0 + 0.81, 0.012, 0.3, 0.06, 0.3, iron);
    const seat = box(x0, y0, 0.3, 0.4, 0.95, 0.07, wood) + (winter ? box(x0 + 0.02, y0 + 0.02, 0.37, 0.36, 0.91, 0.03, "#F7F9FB", false) : "");
    const back = box(backAtMin ? x0 : x0 + 0.33, y0, 0.37, 0.07, 0.95, 0.36, wood);
    return s + (backAtMin ? seat + back : back + seat);
  };
  for (const [x0, y0, bm] of [[4.4, 0.6, true], [7.15, 0.6, false], [4.4, 6.35, true], [7.15, 6.35, false]]) { add(x0 + 0.2, y0 + 0.47, bench(x0, y0, bm)); occ.push([x0 + 0.2, y0 + 0.47, 0.75]); }
  const pools = [];
  if (p.lamps) {
    const lg = night ? "#FFE7A8" : dusk ? "#FFE2A0" : "#F4EBD2";
    for (const [x, y] of [[5.15, 0.3], [6.85, 0.3], [0.8, 7.7], [11.45, 7.45], [0.45, 3.3], [11.55, 4.7]]) {
      if (pathDist(x, y) < 0.12 && y < 7.4) continue;
      add(x, y, box(x - 0.04, y - 0.04, 0.012, 0.08, 0.08, 1.45, iron) + box(x - 0.1, y - 0.1, 1.45, 0.2, 0.2, 0.24, lg) + box(x - 0.12, y - 0.12, 1.69, 0.24, 0.24, 0.05, iron));
      occ.push([x, y, 0.6]); lampPos.push([x, y]);
      if (night) pools.push(`<polygon points="${pts(circ(x, y, 0.75, 0.02, 28))}" fill="${LIT}" opacity="0.2"/>`);
    }
  }
  const water = winter ? "#DCE9F1" : "#8FC3D4";
  add(6, 4, box(5.45, 3.45, 0.014, 1.1, 1.1, 0.26, stone) + quad([5.55, 3.55, 0.276], [6.45, 3.55, 0.276], [6.45, 4.45, 0.276], [5.55, 4.45, 0.276], water)
    + box(5.92, 3.92, 0.27, 0.16, 0.16, 0.42, stone) + box(5.75, 3.75, 0.69, 0.5, 0.5, 0.08, stone) + quad([5.8, 3.8, 0.775], [6.2, 3.8, 0.775], [6.2, 4.2, 0.775], [5.8, 4.2, 0.775], water) + box(5.97, 3.97, 0.77, 0.06, 0.06, 0.14, stone));

  // ---------- bike rack: a paved pad, dark hoops and chunky two-tone bikes that read at small sizes ----------
  const nb = Math.round(p.bikes), sp = 0.42, bx0 = 1.85, bw = Math.max(2.2, S * 0.036), pz = 0.07;
  const bikeCols = [banner, trim, lighten(brick, 0.1), "#55657A"], padCol = winter ? "#B8C0CA" : mix(pathCol, "#8C929C", 0.45);
  add(bx0, 8.0, box(bx0 - 0.42, 7.98, 0.016, nb * sp + 0.44, 0.85, pz - 0.016, padCol, false));
  for (let i = 0; i <= nb; i++) { const x = bx0 - 0.21 + i * sp; add(x, 8.42, line([[x, 8.26, pz], [x, 8.26, 0.5], [x, 8.58, 0.5], [x, 8.58, pz]], iron, S * 0.032)); }
  for (let i = 0; i < nb; i++) {
    const x = bx0 + i * sp, c = bikeCols[(i + Math.floor(r() * 2)) % bikeCols.length], wr = 0.17, zc = pz + wr;
    const wheel = (yc) => `<polygon points="${pts(Array.from({ length: 20 }, (_, k) => [x, yc + wr * Math.cos((k / 20) * TAU), zc + wr * Math.sin((k / 20) * TAU)]))}" fill="none" stroke="${nightTint("#1E2128")}" stroke-width="${(bw * 1.2).toFixed(2)}"/>`;
    const rear = [x, 8.12, zc], bb = [x, 8.38, zc + 0.02], seat = [x, 8.3, zc + 0.3], head = [x, 8.58, zc + 0.3];
    add(x, 8.4, wheel(8.7) + line([rear, bb, head, seat, rear], c, bw) + line([seat, bb], c, bw) + line([head, [x, 8.7, zc]], c, bw)
      + line([[x, 8.25, zc + 0.35], [x, 8.36, zc + 0.35]], "#1E2128", bw * 1.5) + line([[x - 0.1, 8.6, zc + 0.37], [x + 0.1, 8.6, zc + 0.37]], "#1E2128", bw) + wheel(8.12));
  }

  // ---------- trees: stratified over the open lawn with world and screen-space clearance ----------
  const tree = (x, y, sc) => {
    let s = box(x - 0.07, y - 0.07, 0.012, 0.14, 0.14, 0.75 * sc, "#7A5A43");
    if (winter) {
      for (let k = 0; k < 3; k++) {
        const b = (0.62 - k * 0.15) * sc, z0 = (0.45 + k * 0.42) * sc, zt = z0 + 0.8 * sc, c = k === 2 ? "#F2F6F9" : k ? "#4A7A60" : "#3E6B55";
        s += poly([[x - b, y - b, z0], [x + b, y - b, z0], [x, y, zt]], shade(c, [0, -0.7, 0.7])) + poly([[x - b, y - b, z0], [x - b, y + b, z0], [x, y, zt]], shade(c, [-0.7, 0, 0.7]));
      }
      return s;
    }
    const blobs = [];
    for (let k = 0, n = 8 + Math.floor(r() * 3); k < n; k++) blobs.push([x - 0.45 * sc + r() * 0.55 * sc, y - 0.45 * sc + r() * 0.55 * sc, (0.75 + r() * 0.7) * sc, (0.32 + r() * 0.18) * sc]);
    blobs.sort((a, b) => b[0] + b[1] - (a[0] + a[1]) || a[2] - b[2]);
    for (const [bx, by, bz, bs] of blobs) s += box(bx, by, bz, bs, bs, bs, blossom[Math.floor(r() * blossom.length)]);
    return s;
  };
  const clash = (x, y, a, b, wx, wy) => Math.abs(x - y - (a - b)) < wx && Math.abs(x + y - (a + b)) < wy;
  const cells = [];
  for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) cells.push([i, j]);
  for (let i = cells.length - 1; i > 0; i--) { const k = Math.floor(r() * (i + 1)); [cells[i], cells[k]] = [cells[k], cells[i]]; }
  const planted = [];
  for (const [i, j] of cells) {
    if (planted.length >= 8) break;
    for (let t = 0; t < 10; t++) {
      const x = 0.7 + (i + r()) * 2.65, y = 0.6 + (j + r()) * 2.2;
      if (pathDist(x, y) < 0.95 || (y > 4.6 && x > 3.9 && x < 8.1)) continue;
      if (occ.some(([a, b, rr]) => Math.hypot(x - a, y - b) < rr + 0.8)) continue;
      if (planted.some(([a, b]) => Math.hypot(x - a, y - b) < 1.9 || clash(x, y, a, b, 1.3, 2.4))) continue;
      if (lampPos.some(([a, b]) => clash(x, y, a, b, 0.9, 2.2))) continue;
      if ([[3.75, 9], [8.25, 9]].some(([a, b]) => clash(x, y, a, b, 1.2, 3))) continue;
      planted.push([x, y]); occ.push([x, y, 0.95]); break;
    }
  }
  let leaves = "";
  for (const [x, y] of planted) {
    add(x, y, tree(x, y, 0.92 + r() * 0.22));
    if (season === "autumn") for (let k = 0; k < 7; k++) { const lx = x + (r() - 0.5) * 1.7, ly = y + (r() - 0.5) * 1.7; if (pathDist(lx, ly) > 0.05) leaves += quad([lx, ly, 0.02], [lx + 0.09, ly, 0.02], [lx + 0.09, ly + 0.09, 0.02], [lx, ly + 0.09, 0.02], blossom[k % 3]); }
  }
  add(0.65, 10.9, tree(0.65, 10.9, 0.95));
  add(11.4, 8.9, tree(11.4, 8.9, 1.0));

  // ---------- the hall ----------
  const course = (map, a, b, z0, z1) => { let s = ""; for (let z = z0; z < z1; z += 0.16) s += line([map(a, z), map(b, z)], lighten(brick, -0.12), S * 0.012, 'opacity="0.55"'); return s; };
  const quoins = (x, y, z0, z1) => { let s = ""; for (let z = z0, k = 0; z + 0.14 <= z1; z += 0.17, k++) s += box(x - 0.012, y - 0.012, z, k % 2 ? 0.22 : 0.12, k % 2 ? 0.12 : 0.22, 0.14, stone, false); return s; };
  const win = (map, u, z0, w, ht, n) => {
    const lit = night && r() > 0.3;
    return arch(map, u, z0 - 0.04, w + 0.1, ht + 0.07, shade(stone, n)) + arch(map, u, z0, w, ht, lit ? LIT : shade(glass, n)) + line([map(u, z0), map(u, z0 + ht - w / 2)], shade(stone, n), S * 0.018);
  };
  const front = FY(hy - 0.004), side = FX(hx - 0.004);
  let h = box(hx - 0.06, hy - 0.06, 0.012, hw + 0.12, hd + 0.12, 0.33, stone) + box(hx, hy, 0.34, hw, hd, hH - 0.34, brick);
  h += course(front, hx, hx + hw, 0.5, hH) + course(side, hy, hy + hd, 0.5, hH) + quoins(hx, hy, 0.36, hH);
  h += box(hx - 0.04, hy - 0.04, 1.38, hw + 0.08, hd + 0.08, 0.08, stone) + box(hx - 0.06, hy - 0.06, hH, hw + 0.12, hd + 0.12, 0.1, stone);
  for (const u of [2.05, 2.8, 4.6, 7.4, 9.2, 9.95]) for (const z0 of [0.6, 1.62]) h += win(front, u, z0, 0.36, 0.62, [0, -1, 0]);
  for (const u of [9.6, 10.6]) for (const z0 of [0.6, 1.62]) h += win(side, u, z0, 0.36, 0.62, [-1, 0, 0]);
  const flag = [[-0.25, 2.3], [0.25, 2.3], [0.25, 0.95], [0, 1.13], [-0.25, 0.95]], bc = shade(banner, [0, -1, 0]);
  const hem = `stroke="${nightTint(mix(stone, bc, 0.25))}" stroke-width="${(S * 0.014).toFixed(2)}" stroke-linejoin="round"`;
  for (const bx of [3.75, 8.25]) {
    const F = FY(hy - 0.1), Fw = FY(hy - 0.006), on = (sh, m = F, du = 0, dz = 0) => sh.map(([u, z]) => m(bx + u + du, z + dz));
    h += poly(on(flag, Fw, 0.07, -0.07), lighten(brick, -0.22), 'opacity="0.35"');
    h += line([Fw(bx - 0.3, 2.34), F(bx - 0.3, 2.34)], iron, S * 0.025) + line([Fw(bx + 0.3, 2.34), F(bx + 0.3, 2.34)], iron, S * 0.025);
    h += poly(on(flag), bc, hem) + poly(on([[-0.25, 2.3], [0, 2.3], [0, 1.13], [-0.25, 0.95]]), lighten(bc, 0.05));
    h += poly(on([[-0.25, 2.3], [0.25, 2.3], [0.25, 2.21], [-0.25, 2.21]]), lighten(bc, -0.1)) + poly(on([[-0.25, 1.33], [0.25, 1.33], [0.25, 1.41], [-0.25, 1.41]]), trim);
    h += poly(on([[0, 1.99], [0.12, 1.84], [0, 1.69], [-0.12, 1.84]]), trim) + poly(on([[0, 1.91], [0.055, 1.84], [0, 1.77], [-0.055, 1.84]]), bc);
    h += line([F(bx - 0.36, 2.33), F(bx + 0.36, 2.33)], iron, S * 0.035);
  }
  const tf = FY(8.696);
  h += box(5.14, 8.64, 0.012, 1.72, 0.42, 0.33, stone) + box(5.2, 8.7, 0.34, 1.6, 0.3, top - 0.34, brick) + course(tf, 5.2, 6.8, 0.5, top) + quoins(5.2, 8.7, 0.36, top);
  h += arch(tf, 6, 0.34, 0.88, 1.24, shade(stone, [0, -1, 0])) + arch(tf, 6, 0.34, 0.66, 1.08, night ? "#FFCF7A" : "#4A3328") + line([tf(6, 0.34), tf(6, 1.05)], "#2B1E17", S * 0.015);
  h += win(tf, 6, 1.8, 0.3, 0.5, [0, -1, 0]) + box(5.3, 8.2, 0.012, 1.4, 0.5, 0.11, stone) + box(5.4, 8.45, 0.12, 1.2, 0.25, 0.11, stone);
  const ov = 0.12, rst = `stroke="${nightTint(lighten(roofCol, -0.15))}" stroke-width="0.6"`;
  h += quad([hx - ov, hy - ov, top], [hx + hw + ov, hy - ov, top], [hx + hw + ov, ym, rg], [hx - ov, ym, rg], shade(roofCol, [0, -0.6, 0.8]), rst);
  h += poly([[hx - ov, hy - ov, top], [hx - ov, ym, rg], [hx - ov, hy + hd + ov, top]], shade(brick, [-1, 0, 0]));
  h += quad([hx - ov, ym, rg], [hx + hw + ov, ym, rg], [hx + hw + ov, hy + hd + ov, top], [hx - ov, hy + hd + ov, top], shade(roofCol, [0, 0.6, 0.8]));
  for (let k = 1; k < 5; k++) { const t = k / 5; h += line([[hx - ov, hy - ov + (hd / 2 + ov) * t, top + (rg - top) * t], [hx + hw + ov, hy - ov + (hd / 2 + ov) * t, top + (rg - top) * t]], lighten(roofCol, -0.2), 0.8); }
  for (const cx of [hx + 0.8, hx + hw - 1.15]) h += box(cx, ym + 0.1, rg - 0.08, 0.35, 0.35, 0.7, brick) + box(cx - 0.04, ym + 0.06, rg + 0.62, 0.43, 0.43, 0.08, stone);
  // tower shaft: one continuous body with a recessed panel and a lancet that stretches, capped by a single crown
  h += quad([5.2, 8.7, top], [6.8, 8.7, top], [6.8, 8.7, shaftTop], [5.2, 8.7, shaftTop], shade(brick, [0, -1, 0]), `stroke="${nightTint(lighten(brick, -0.18))}" stroke-width="0.6"`);
  h += poly([[5.2, 8.7, top], [5.2, hy - ov, top], [5.2, ym, rg], [5.2, 10.3, rg], [5.2, 10.3, shaftTop], [5.2, 8.7, shaftTop]], shade(brick, [-1, 0, 0]));
  h += course(tf, 5.2, 6.8, top + 0.1, shaftTop) + quoins(5.2, 8.7, top, shaftTop);
  const pz0 = rg + 0.1, pz1 = shaftTop - 0.16, wz0 = pz0 + 0.14, wht = pz1 - pz0 - 0.28;
  h += quad([5.45, 8.698, pz0], [6.55, 8.698, pz0], [6.55, 8.698, pz1], [5.45, 8.698, pz1], shade(lighten(brick, -0.07), [0, -1, 0]));
  h += win(tf, 6, wz0, 0.34, wht, [0, -1, 0]) + win(FX(5.196), 9.5, wz0, 0.3, wht, [-1, 0, 0]);
  for (let z = wz0 + 0.55; z < wz0 + wht - 0.35; z += 0.55) h += line([tf(5.83, z), tf(6.17, z)], shade(stone, [0, -1, 0]), S * 0.018) + line([[5.194, 9.35, z], [5.194, 9.65, z]], shade(stone, [-1, 0, 0]), S * 0.018);
  h += box(5.1, 8.6, shaftTop, 1.8, 1.8, 0.12, stone) + box(5.15, 8.65, shaftTop + 0.12, 1.7, 1.7, 1.0, brick) + box(5.06, 8.56, clockTop - 0.06, 1.88, 1.88, 0.24, stone);
  const zc = shaftTop + 0.62, [hh, mm] = night ? [11, 52] : dusk ? [6, 42] : [10, 8];
  const ha = ((hh % 12) + mm / 60) / 12 * TAU, ma = (mm / 60) * TAU, face = night ? "#FFE9B0" : "#F6EFDC";
  for (const map of [(u, v) => [6 + u, 8.645, zc + v], (u, v) => [5.145, 9.5 - u, zc + v]]) {
    const ringP = (R) => Array.from({ length: 28 }, (_, k) => map(R * Math.sin((k / 28) * TAU), R * Math.cos((k / 28) * TAU)));
    h += poly(ringP(0.45), trim) + poly(ringP(0.38), face);
    for (let k = 0; k < 12; k++) { const a = (k / 12) * TAU; h += line([map(0.3 * Math.sin(a), 0.3 * Math.cos(a)), map(0.35 * Math.sin(a), 0.35 * Math.cos(a))], "#232733", S * 0.014); }
    h += line([map(0, 0), map(0.2 * Math.sin(ha), 0.2 * Math.cos(ha))], "#232733", S * 0.03) + line([map(0, 0), map(0.31 * Math.sin(ma), 0.31 * Math.cos(ma))], "#232733", S * 0.018);
  }
  if (bel) {
    h += box(5.2, 8.7, belZ, 1.6, 1.6, bel, brick);
    for (const [map, u, n] of [[FY(8.696), 6, [0, -1, 0]], [FX(5.196), 9.5, [-1, 0, 0]]]) {
      h += arch(map, u, belZ + 0.08, 0.66, bel - 0.16, shade(stone, n)) + arch(map, u, belZ + 0.11, 0.52, bel - 0.24, "#2B2F38");
      for (let k = 1; k < 4; k++) h += line([map(u - 0.24, belZ + 0.11 + k * 0.13), map(u + 0.24, belZ + 0.11 + k * 0.13)], shade(stone, n), S * 0.02);
    }
    h += box(5.12, 8.62, belTop - 0.04, 1.76, 1.76, 0.18, stone);
  }
  const pin = (x, y) => box(x, y, spireBase, 0.16, 0.16, 0.2, stone) + poly([[x, y, spireBase + 0.2], [x + 0.16, y, spireBase + 0.2], [x + 0.08, y + 0.08, spireBase + 0.58]], shade(roofCol, [0, -0.75, 0.66])) + poly([[x, y, spireBase + 0.2], [x, y + 0.16, spireBase + 0.2], [x + 0.08, y + 0.08, spireBase + 0.58]], shade(roofCol, [-0.75, 0, 0.66])) + box(x + 0.06, y + 0.06, spireBase + 0.56, 0.04, 0.04, 0.06, trim, false);
  if (pinn) h += pin(6.78, 8.56) + pin(5.06, 10.28);
  const sb = pinn ? 0.12 : 0, ap = [6, 9.5, apex];
  h += poly([[5.06 + sb, 8.56 + sb, spireBase], [6.94 - sb, 8.56 + sb, spireBase], ap], shade(roofCol, [0, -0.75, 0.66])) + poly([[5.06 + sb, 8.56 + sb, spireBase], [5.06 + sb, 10.44 - sb, spireBase], ap], shade(roofCol, [-0.75, 0, 0.66]));
  h += line([[5.06 + sb, 8.56 + sb, spireBase], ap], lighten(roofCol, 0.12), S * 0.012) + line([ap, [6, 9.5, apex + 0.42]], iron, S * 0.02) + box(5.95, 9.45, apex + 0.16, 0.1, 0.1, 0.1, trim, false);
  if (pinn) h += pin(5.06, 8.56);

  // ---------- sky, shadow, assembly ----------
  items.sort((a, b) => b[0] - a[0]);
  const grad = night ? `<radialGradient id="g" cx="50%" cy="40%" r="60%"><stop offset="0" stop-color="#2A3358"/><stop offset="1" stop-color="${sky}"/></radialGradient>` : `<radialGradient id="g" cx="50%" cy="38%" r="65%"><stop offset="0" stop-color="${lighten(sky, darkBg ? 0.1 : 0.04)}"/><stop offset="1" stop-color="${sky}"/></radialGradient>`;
  let sky2 = "";
  if (night) {
    const sr = rng(p.seed + 101);
    for (let k = 0; k < 46; k++) sky2 += `<circle cx="${(sr() * W).toFixed(1)}" cy="${(sr() * H * 0.42).toFixed(1)}" r="${(0.8 + sr() * 1.4).toFixed(1)}" fill="#F4EBD2" opacity="${(0.35 + sr() * 0.5).toFixed(2)}"/>`;
    sky2 += `<circle cx="${W - 250}" cy="180" r="90" fill="#F4EBD2" opacity="0.07"/><circle cx="${W - 250}" cy="180" r="44" fill="#F4EBD2"/>`;
  } else if (dusk) sky2 += `<circle cx="${W - 260}" cy="${H * 0.24}" r="70" fill="${mix(sky, "#FFD9A8", 0.7)}" opacity="0.8"/>`;
  const shadow = `<ellipse cx="${W / 2}" cy="${(oy + 0.85 * S).toFixed(1)}" rx="${(Q * 0.8 * S).toFixed(1)}" ry="${(0.9 * S).toFixed(1)}" fill="${dark ? mix(sky, "#000000", 0.75) : mix(sky, "#1C2230", 0.55)}" opacity="${dark ? 0.75 : 0.28}" filter="url(#soft)"/>`;
  const rim = dark ? line([[-0.4, -0.4, 0], [Q + 0.4, -0.4, 0]], lighten(slabCol, 0.18), 1.2) + line([[-0.4, -0.4, 0], [-0.4, Q + 0.4, 0]], lighten(slabCol, 0.12), 1.2) : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><defs>${grad}<filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter><filter id="soft" x="-30%" y="-150%" width="160%" height="400%"><feGaussianBlur stdDeviation="22"/></filter><clipPath id="lc"><polygon points="${pts([[0, 0, 0], [Q, 0, 0], [Q, Q, 0], [0, Q, 0]])}"/></clipPath></defs><rect width="${W}" height="${H}" fill="url(#g)"/>${sky2}${shadow}${g}${rim}<g clip-path="url(#lc)">${paths}${leaves}${pools.join("")}</g>${h}${items.map((i) => i[1]).join("")}</svg>`;
}
