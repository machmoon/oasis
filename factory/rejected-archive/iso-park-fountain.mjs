// Oasis Park: an isometric park diorama with a box-built fountain, paths, benches, glowing lamps, planted cubic trees and a slide.
export const meta = {
  title: "Oasis Park",
  kind: "illustration",
  description: "A toy-like isometric park diorama with a box-built fountain, paving, benches, glowing lamp posts, planted cubic trees and a playground slide. Framing leaves copy space for hero sections, and it sits beside Oasis Town as spot art.",
  tags: ["isometric", "diorama", "park", "fountain", "trees", "playground", "3d", "hero"],
  price: 7,
  author: "oasis-factory",
  size: [1600, 1200],
};

export const params = {
  knobs: {
    backdrop: { type: "color", role: "background", label: "Backdrop", default: "#E9ECF1" },
    water: { type: "color", role: "primary", label: "Water", default: "#4FB3D9" },
    path: { type: "color", role: "surface", label: "Paths", default: "#E6DCC8" },
    accent: { type: "color", role: "secondary", label: "Slide & benches", default: "#E5484D" },
    season: { type: "choice", label: "Season", default: "spring", options: ["spring", "summer", "autumn", "winter"] },
    time: { type: "choice", label: "Time", default: "dusk", options: ["day", "dusk", "night"] },
    framing: { type: "choice", label: "Framing", default: "center", options: ["center", "left", "right"] },
    density: { type: "range", label: "Tree density", default: 0.7, min: 0.2, max: 1, step: 0.1 },
    seed: { type: "range", label: "Arrangement", default: 7, min: 1, max: 99, step: 1 },
    playground: { type: "toggle", label: "Playground", default: true },
  },
  presets: {
    Lagoon: { backdrop: "#E3F1F3", water: "#1FA6A0", path: "#F2E6CF", accent: "#FF7A59" },
    Candy: { backdrop: "#FFF0F4", water: "#7FC8F8", path: "#F7D9E3", accent: "#7D5BA6" },
    Sandstone: { backdrop: "#F4EBDD", water: "#3E7BFA", path: "#D9B98C", accent: "#2F7A55" },
    Midnight: { backdrop: "#14161C", water: "#3EE0FF", path: "#8A8FA0", accent: "#B4FF39" },
  },
};

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
const clamp = (v, [a, b]) => Math.max(a, Math.min(b, v));
function guard(hex, hr, sr, lr) {
  let [h, s, l] = toHsl(hexRgb(hex));
  if (hr) {
    const d = (a, b) => Math.min(Math.abs(a - b), 1 - Math.abs(a - b));
    if (s < 0.08) h = (hr[0] + hr[1]) / 2;
    else if (h < hr[0] || h > hr[1]) h = d(h, hr[0]) < d(h, hr[1]) ? hr[0] : hr[1];
  }
  return rgbHex(...fromHsl(h, clamp(s, sr), clamp(l, lr)));
}
function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export default function render(p) {
  const W = 1600, H = 1200, N = 12, cx = N / 2, cy = N / 2;
  const r = rng(p.seed * 7717 + 31);
  const darkBg = lum(p.backdrop) < 110;
  const time = darkBg && p.time === "day" ? "night" : p.time;
  const night = time === "night", dusk = time === "dusk", lampsOn = night || dusk;
  const dark = darkBg || night;
  const WATER = guard(p.water, [0.5, 0.6], [0.45, 0.85], [0.42, 0.62]);
  const PATH = guard(p.path, null, [0, 0.4], [0.74, 0.9]);
  const ACC = guard(p.accent, null, [0.35, 1], [0.38, 0.62]);
  const zTop = 3.0;
  const spanX = (2 * N + 0.8) * 0.866, spanY = (2 * N + 0.8) * 0.5 + zTop + 0.6;
  const S0 = Math.min((W - 200) / spanX, (H - 220) / spanY);
  const S = p.framing === "center" ? S0 : S0 * 0.72, half = (spanX * S) / 2;
  const ox = p.framing === "left" ? 90 + half : p.framing === "right" ? W - 90 - half : W / 2;
  const oy = H / 2 + ((N + 0.2 + zTop - 0.95) * S) / 2 + 10 - S * 1.3;
  const LIGHT = (() => { const v = [2, -1, 3], n = Math.hypot(...v); return v.map((c) => c / n); })();
  const P = (x, y, z) => [ox + (x - y) * 0.866 * S, oy - (x + y) * 0.5 * S - z * S];
  const pts = (arr) => arr.map((q) => P(...q).map((v) => v.toFixed(1)).join(",")).join(" ");
  const shade = (hex, n) => lighten(hex, 0.2 * (n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2]));
  const LIT = "#FFD58A", IRON = "#3A3F48";
  const nightTint = (hex) => (night ? mix(lighten(hex, -0.12), "#151B3A", 0.5) : dusk ? mix(hex, "#E3876F", 0.13) : hex);
  const poly = (arr, fill, extra = "", lit = false) => `<polygon points="${pts(arr)}" fill="${lit ? fill : nightTint(fill)}" ${extra}/>`;
  const quad = (a, b, c, d, fill, extra, lit) => poly([a, b, c, d], fill, extra, lit);
  const ln = (a, b, col, w, op = 1) => `<polyline points="${pts([a, b])}" stroke="${nightTint(col)}" stroke-width="${w.toFixed(2)}" fill="none" stroke-linecap="round" opacity="${op}"/>`;
  const circ = (x, y, rad, z, n = 48) => Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2; return [x + rad * Math.cos(a), y + rad * Math.sin(a), z]; });
  function box(x, y, z, dx, dy, dz, color, edge = true, lit = false) {
    const st = edge ? `stroke="${lit ? lighten(color, -0.18) : nightTint(lighten(color, -0.18))}" stroke-width="0.6" stroke-linejoin="round"` : "";
    return quad([x, y, z], [x, y + dy, z], [x, y + dy, z + dz], [x, y, z + dz], shade(color, [-1, 0, 0]), st, lit)
      + quad([x, y, z], [x + dx, y, z], [x + dx, y, z + dz], [x, y, z + dz], shade(color, [0, -1, 0]), st, lit)
      + quad([x, y, z + dz], [x + dx, y, z + dz], [x + dx, y + dy, z + dz], [x, y + dy, z + dz], shade(color, [0, 0, 1]), st, lit);
  }
  const items = [];
  const add = (x, y, svg, k = 0) => items.push([x + y - k, svg]);

  const season = p.season;
  const grass = { spring: "#A9C48A", summer: "#8DB86E", autumn: "#C8B489", winter: "#EEF2F6" }[season];
  const crowns = { spring: ["#F7B8CF", "#F29BBA", "#FBD3E2", "#F5C6D6"], summer: ["#5FA35C", "#4E8F4C", "#79B86A"], autumn: ["#E58A3A", "#D4642E", "#F0B048", "#C9503A"], winter: ["#F3F6F9", "#E3EAF0", "#FFFFFF"] }[season];
  const flowers = { spring: ["#F7B8CF", "#FFFFFF", "#F2B33D"], summer: ["#FFFFFF", "#F2B33D", "#E5484D"], autumn: ["#E58A3A", "#F0B048"], winter: [] }[season];
  const stone = "#DCD6CB", stoneB = "#CFC8BB", edgeCol = lighten(PATH, -0.14);
  const sx = cx + 2.85, sy = cy - 4.85;
  const lamps = [45, 135, 315].map((d) => [cx + 3.45 * Math.cos((d * Math.PI) / 180), cy + 3.45 * Math.sin((d * Math.PI) / 180)]);
  { const d = N / 2 - 1.3; lamps.push([cx + d, cy - 1.12], [cx - d, cy - 1.12], [cx - 1.12, cy + d], [cx - 1.12, cy - d]); }
  const benches = [[cx + 3.3, cy + 0.92, 1.1, 0.34], [cx - 4.4, cy + 0.92, 1.1, 0.34], [cx + 0.92, cy + 3.3, 0.34, 1.1], [cx + 0.92, cy - 4.4, 0.34, 1.1]];
  const inPlay = (x, y, m) => p.playground && x > sx - m && x < sx + 2 + m && y > sy - m && y < sy + 2 + m;
  const flowerFree = (x, y) => Math.abs(x - cx) > 1.3 && Math.abs(y - cy) > 1.3 && Math.hypot(x - cx, y - cy) > 3.4 && !inPlay(x, y, 0.3);
  const treeFree = (x, y) => x > 0.75 && y > 0.75 && x < N - 0.75 && y < N - 0.75
    && Math.abs(x - cx) > 1.6 && Math.abs(y - cy) > 1.6 && Math.hypot(x - cx, y - cy) > 3.9 && !inPlay(x, y, 0.75)
    && lamps.every(([a, b]) => Math.hypot(a - x, b - y) > 0.95)
    && benches.every(([bx, by, w, d]) => !(x > bx - 0.6 && x < bx + w + 0.6 && y > by - 0.6 && y < by + d + 0.6));

  // ---------- base: slab, lawn, paving, sandpit, flowers, lamp pools ----------
  let base = box(-0.4, -0.4, -0.55, N + 0.8, N + 0.8, 0.55, dark ? "#2A2E37" : "#C9CED6");
  base += quad([0, 0, 0.001], [N, 0, 0.001], [N, N, 0.001], [0, N, 0.001], grass);
  for (let i = 0; i < N; i += 2) base += quad([i, 0, 0.002], [i + 1, 0, 0.002], [i + 1, N, 0.002], [i, N, 0.002], lighten(grass, 0.025));
  const pst = `stroke="${nightTint(edgeCol)}" stroke-width="1"`;
  base += quad([0, cy - 0.8, 0.01], [N, cy - 0.8, 0.01], [N, cy + 0.8, 0.01], [0, cy + 0.8, 0.01], PATH, pst);
  base += quad([cx - 0.8, 0, 0.01], [cx + 0.8, 0, 0.01], [cx + 0.8, N, 0.01], [cx - 0.8, N, 0.01], PATH, pst);
  for (let t = 0.5; t < N; t += 0.7) if (Math.abs(t - cx) > 3) base += ln([t, cy - 0.8, 0.011], [t, cy + 0.8, 0.011], edgeCol, 0.8, 0.6) + ln([cx - 0.8, t, 0.011], [cx + 0.8, t, 0.011], edgeCol, 0.8, 0.6);
  base += poly(circ(cx, cy, 3.0, 0.012, 64), PATH, pst);
  base += `<polygon points="${pts(circ(cx, cy, 2.62, 0.013, 64))}" fill="none" stroke="${nightTint(edgeCol)}" stroke-width="1.2" stroke-dasharray="${(S * 0.3).toFixed(1)} ${(S * 0.08).toFixed(1)}"/>`;
  if (p.playground) {
    base += box(sx, sy, 0, 2, 2, 0.08, "#B8946A");
    base += quad([sx + 0.1, sy + 0.1, 0.081], [sx + 1.9, sy + 0.1, 0.081], [sx + 1.9, sy + 1.9, 0.081], [sx + 0.1, sy + 1.9, 0.081], season === "winter" ? "#F3F1EC" : "#E8D5A6");
  }
  for (let i = 0; i < 46 && flowers.length; i++) {
    const x = 0.5 + r() * (N - 1), y = 0.5 + r() * (N - 1);
    if (!flowerFree(x, y)) continue;
    for (let k = 0; k < 3; k++) {
      const fx = x + (r() - 0.5) * 0.4, fy = y + (r() - 0.5) * 0.4, fc = flowers[Math.floor(r() * flowers.length)];
      base += poly([[fx - 0.06, fy, 0.02], [fx, fy - 0.06, 0.02], [fx + 0.06, fy, 0.02], [fx, fy + 0.06, 0.02]], fc);
    }
  }
  if (lampsOn) for (const [x, y] of lamps) base += `<polygon points="${pts(circ(x, y, 1.45, 0.03))}" fill="url(#pool)" opacity="${night ? 1 : 0.75}"/>`;

  // ---------- fountain ----------
  const R = 2.0, segs = 24, wl = lighten(WATER, 0.22);
  for (let i = 0; i < segs; i++) {
    const a = (i / segs) * Math.PI * 2, bx = cx + R * Math.cos(a), by = cy + R * Math.sin(a);
    add(bx, by, box(bx - 0.3, by - 0.3, 0, 0.6, 0.6, 0.5, i % 2 ? stone : stoneB));
  }
  let wat = poly(circ(cx, cy, R - 0.3, 0.4, 56), WATER);
  for (const k of [1.05, 1.45]) wat += `<polygon points="${pts(circ(cx, cy, k, 0.401))}" fill="none" stroke="${nightTint(wl)}" stroke-width="1.4" opacity="0.6"/>`;
  add(cx, cy, wat);
  const arc = (a, r0, z0, r1, z1) => {
    const c = Math.cos(a), s = Math.sin(a), rm = r0 + (r1 - r0) * 0.6;
    const [x0, y0] = P(cx + r0 * c, cy + r0 * s, z0), [x1, y1] = P(cx + rm * c, cy + rm * s, z0 + 0.35), [x2, y2] = P(cx + r1 * c, cy + r1 * s, z1);
    return `<path d="M${x0.toFixed(1)} ${y0.toFixed(1)}Q${x1.toFixed(1)} ${y1.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}" stroke="${nightTint(wl)}" stroke-width="${(S * 0.05).toFixed(1)}" fill="none" stroke-linecap="round" opacity="0.8"/>`;
  };
  let backArcs = "", frontArcs = "";
  for (let i = 0; i < 12; i++) {
    const a = ((i + 0.5) / 12) * Math.PI * 2, front = Math.cos(a) + Math.sin(a) < 0;
    if (front) frontArcs += arc(a, 0.42, 1.68, 0.68, 1.02) + arc(a, 0.85, 1.01, 1.4, 0.4);
    else backArcs += arc(a, 0.85, 1.01, 1.4, 0.4);
  }
  let ped = box(cx - 0.45, cy - 0.45, 0.4, 0.9, 0.9, 0.45, stone);
  ped += box(cx - 0.85, cy - 0.85, 0.85, 1.7, 1.7, 0.16, stoneB);
  ped += quad([cx - 0.73, cy - 0.73, 1.012], [cx + 0.73, cy - 0.73, 1.012], [cx + 0.73, cy + 0.73, 1.012], [cx - 0.73, cy + 0.73, 1.012], WATER);
  ped += box(cx - 0.14, cy - 0.14, 1.01, 0.28, 0.28, 0.55, stone);
  ped += box(cx - 0.42, cy - 0.42, 1.56, 0.84, 0.84, 0.12, stoneB);
  ped += quad([cx - 0.34, cy - 0.34, 1.682], [cx + 0.34, cy - 0.34, 1.682], [cx + 0.34, cy + 0.34, 1.682], [cx - 0.34, cy + 0.34, 1.682], WATER);
  ped += ln([cx, cy, 1.68], [cx, cy, 2.45], wl, S * 0.07, 0.85);
  add(cx, cy, backArcs, 0.005); add(cx, cy, ped, 0.01); add(cx, cy, frontArcs, 0.015);

  // ---------- benches and lamps ----------
  function bench(x, y, alongX) {
    if (alongX) return box(x, y + 0.3, 0.39, 1.1, 0.06, 0.32, ACC) + box(x + 0.08, y + 0.05, 0, 0.08, 0.26, 0.32, IRON) + box(x + 0.94, y + 0.05, 0, 0.08, 0.26, 0.32, IRON) + box(x, y, 0.32, 1.1, 0.34, 0.07, ACC);
    return box(x + 0.3, y, 0.39, 0.06, 1.1, 0.32, ACC) + box(x + 0.05, y + 0.08, 0, 0.26, 0.08, 0.32, IRON) + box(x + 0.05, y + 0.94, 0, 0.26, 0.08, 0.32, IRON) + box(x, y, 0.32, 0.34, 1.1, 0.07, ACC);
  }
  for (const [x, y, w] of benches) add(x + 0.55, y + 0.55, bench(x, y, w > 1));
  function lamp(x, y) {
    let s = box(x - 0.11, y - 0.11, 0, 0.22, 0.22, 0.14, IRON);
    s += box(x - 0.045, y - 0.045, 0.14, 0.09, 0.09, 1.28, IRON, false);
    if (lampsOn) { const [gx, gy] = P(x, y, 1.56); s += `<circle cx="${gx.toFixed(1)}" cy="${gy.toFixed(1)}" r="${(S * (night ? 0.75 : 0.6)).toFixed(1)}" fill="${LIT}" opacity="${night ? 0.75 : 0.6}" filter="url(#blur)"/>`; }
    s += box(x - 0.12, y - 0.12, 1.42, 0.24, 0.24, 0.28, lampsOn ? LIT : "#F4F1E8", false, lampsOn);
    return s + box(x - 0.16, y - 0.16, 1.7, 0.32, 0.32, 0.06, IRON);
  }
  for (const [x, y] of lamps) add(x, y, lamp(x, y));

  // ---------- playground: slide tower and seesaw ----------
  if (p.playground) {
    const tx = sx + 0.4, ty = sy + 1.25, hi = 1.0, ac = ACC;
    let s = box(tx + 0.62, ty + 0.62, 0, 0.08, 0.08, 1.6, IRON);
    s += box(tx, ty, hi - 0.1, 0.7, 0.7, 0.1, "#EDEAE4");
    for (const [a, b] of [[0.62, 0], [0, 0.62], [0, 0]]) s += box(tx + a, ty + b, 0, 0.08, 0.08, 1.6, IRON);
    for (let z = 0.2; z < hi - 0.1; z += 0.2) s += ln([tx - 0.01, ty + 0.1, z], [tx - 0.01, ty + 0.62, z], IRON, S * 0.03);
    const ap = [tx + 0.35, ty + 0.35, 2.0], o = 0.1;
    s += poly([[tx - o, ty - o, 1.6], [tx - o, ty + 0.7 + o, 1.6], ap], shade(ac, [-0.7, 0, 0.7]));
    s += poly([[tx - o, ty - o, 1.6], [tx + 0.7 + o, ty - o, 1.6], ap], shade(ac, [0, -0.7, 0.7]));
    const ye = ty - 1.25;
    s += quad([tx + 0.12, ty, hi], [tx + 0.58, ty, hi], [tx + 0.58, ye, 0.14], [tx + 0.12, ye, 0.14], shade(ac, [0, -0.6, 0.8]));
    s += quad([tx + 0.58, ty, hi], [tx + 0.58, ye, 0.14], [tx + 0.58, ye, 0.26], [tx + 0.58, ty, hi + 0.12], lighten(ac, 0.08));
    s += quad([tx + 0.12, ty, hi], [tx + 0.12, ye, 0.14], [tx + 0.12, ye, 0.26], [tx + 0.12, ty, hi + 0.12], shade(ac, [-1, 0, 0]));
    s += ln([tx + 0.35, ty - 0.05, hi + 0.01], [tx + 0.35, ye + 0.05, 0.15], lighten(ac, 0.2), S * 0.025, 0.7);
    add(tx + 0.35, ty, s);
    const qx = sx + 1.35, q0 = sy + 0.25, q1 = sy + 1.55, sc2 = lighten(ac, 0.12);
    let ss = box(qx + 0.02, sy + 0.82, 0.08, 0.16, 0.16, 0.2, IRON);
    ss += quad([qx, q0, 0.12], [qx + 0.2, q0, 0.12], [qx + 0.2, q1, 0.46], [qx, q1, 0.46], shade(sc2, [0, -0.3, 0.95]));
    ss += quad([qx, q0, 0.12], [qx, q1, 0.46], [qx, q1, 0.4], [qx, q0, 0.06], shade(sc2, [-1, 0, 0]));
    add(qx + 0.1, sy + 0.9, ss);
  }

  // ---------- trees: planted on a jittered grid, crowns bounded so they never touch ----------
  function tree(x, y) {
    const sc = 0.82 + r() * 0.18, rc = 0.5 * sc;
    if (r() < 0.25) {
      let s = box(x - 0.07, y - 0.07, 0, 0.14, 0.14, 0.4, "#7A5A43");
      for (let k = 0; k < 4; k++) { const z = (0.9 - k * 0.2) * sc; s += box(x - z / 2, y - z / 2, (0.35 + k * 0.38) * sc, z, z, 0.4 * sc, season === "winter" && k === 3 ? "#F3F6F9" : k % 2 ? "#3F7A55" : "#4A8A60"); }
      return s;
    }
    let s = box(x - 0.07, y - 0.07, 0, 0.14, 0.14, 0.75 * sc, "#7A5A43");
    const blobs = [[x - 0.3 * sc, y - 0.3 * sc, 0.72 * sc, 0.6 * sc]];
    for (let k = 0; k < 7; k++) { const bs = (0.3 + r() * 0.16) * sc; blobs.push([x - rc + r() * (2 * rc - bs), y - rc + r() * (2 * rc - bs), (0.7 + r() * 0.6) * sc, bs]); }
    blobs.sort((a, b) => b[0] + b[1] - (a[0] + a[1]) || a[2] - b[2]);
    for (const [bx, by, bz, bs] of blobs) s += box(bx, by, bz, bs, bs, bs, crowns[Math.floor(r() * crowns.length)]);
    return s;
  }
  const g = 1.35, cands = [];
  for (let i = 0; i * g < N; i++) for (let j = 0; j * g < N; j++) {
    const x = 0.8 + i * g + (r() - 0.5) * 0.2, y = 0.8 + j * g + (r() - 0.5) * 0.2;
    if (treeFree(x, y)) cands.push([x, y, r()]);
  }
  cands.sort((a, b) => a[2] - b[2]);
  for (const [x, y] of cands.slice(0, Math.round(p.density * cands.length))) add(x, y, tree(x, y));

  items.sort((a, b) => b[0] - a[0]);
  const sky = night ? mix(p.backdrop, "#0E1224", 0.6) : dusk ? mix(p.backdrop, darkBg ? "#5A3A4A" : "#F2B8A0", darkBg ? 0.25 : 0.38) : p.backdrop;
  const core = night ? "#2A3358" : dusk ? mix(sky, "#FFE6C8", darkBg ? 0.12 : 0.5) : lighten(sky, 0.04);
  const [shx, shy] = P(cx, cy, -0.55);
  const defs = `<defs><radialGradient id="bg" cx="50%" cy="42%" r="65%"><stop offset="0" stop-color="${core}"/><stop offset="1" stop-color="${sky}"/></radialGradient>`
    + `<radialGradient id="pool"><stop offset="0" stop-color="${LIT}" stop-opacity="0.55"/><stop offset="1" stop-color="${LIT}" stop-opacity="0"/></radialGradient>`
    + `<filter id="blur" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="${(S * 0.25).toFixed(1)}"/></filter>`
    + `<filter id="soft" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="${(S * 0.45).toFixed(1)}"/></filter></defs>`;
  const shadow = `<ellipse cx="${shx.toFixed(1)}" cy="${(shy + S * 0.7).toFixed(1)}" rx="${((N + 0.8) * 0.82 * S).toFixed(1)}" ry="${((N + 0.8) * 0.47 * S).toFixed(1)}" fill="#000" opacity="${dark ? 0.35 : 0.14}" filter="url(#soft)"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${defs}<rect width="${W}" height="${H}" fill="url(#bg)"/>${shadow}${base}${items.map((i) => i[1]).join("")}</svg>`;
}
