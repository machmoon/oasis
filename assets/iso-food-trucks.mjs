// Food Truck Plaza: an isometric diorama of food trucks, picnic tables and festoon lights on a paved slab, after Oasis Town.
export const meta = {
  title: "Food Truck Plaza",
  kind: "illustration",
  description: "A toy-like isometric food-truck plaza with serving hatches, striped awnings, picnic tables, planters and festoon lights. Use it for hero art, event pages and food or hospitality brands.",
  tags: ["isometric", "food truck", "plaza", "diorama", "street food", "string lights", "3d", "hero"],
  price: 8,
  author: "oasis-factory",
  size: [1600, 1100],
};

export const params = {
  knobs: {
    backdrop: { type: "color", role: "background", label: "Backdrop", default: "#ECE8E1" },
    truckA: { type: "color", role: "primary", label: "Truck A", default: "#E5484D" },
    truckB: { type: "color", role: "secondary", label: "Truck B", default: "#2F8F9D" },
    accent: { type: "color", role: "highlight", label: "Awnings & signs", default: "#F2B33D" },
    season: { type: "choice", label: "Season", default: "spring", options: ["spring", "summer", "autumn", "winter"] },
    time: { type: "choice", label: "Time", default: "day", options: ["day", "dusk", "night"] },
    trucks: { type: "range", label: "Trucks", default: 3, min: 2, max: 4, step: 1 },
    seed: { type: "range", label: "Arrangement", default: 7, min: 1, max: 99, step: 1 },
    lights: { type: "toggle", label: "String lights", default: true },
    trees: { type: "toggle", label: "Trees", default: true },
  },
  presets: {
    Taqueria: { backdrop: "#F3EBDD", truckA: "#2E7D4F", truckB: "#F28C28", accent: "#E5484D" },
    Pastel: { backdrop: "#F4EEF6", truckA: "#7FC8B5", truckB: "#F29BB2", accent: "#8E7CC3" },
    Harbour: { backdrop: "#E3EEF2", truckA: "#1F4E79", truckB: "#F2C94C", accent: "#2F8F9D" },
    NightMarket: { backdrop: "#161922", truckA: "#FF5C5C", truckB: "#3EC1D3", accent: "#FFD23F" },
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
function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export default function render(p) {
  const W = 1600, H = 1100;
  const r = rng(p.seed * 7717 + 3);
  const night = p.time === "night", dusk = p.time === "dusk";
  const dark = lum(p.backdrop) < 110 || night;
  const N = Math.round(p.trucks), L = N * 4.2 + 1.6, D = 9;
  const zTop = 4.0, zBot = -0.55;
  const spanX = (L + D + 0.8) * 0.866, spanY = (L + D + 0.8) * 0.5 + zTop - zBot;
  const S = Math.min((W - 180) / spanX, (H - 170) / spanY);
  const ox = W / 2 - ((L - D) * 0.866 * S) / 2;
  const oy = (H + spanY * S) / 2 - 20 + zBot * S;
  const LIGHT = (() => { const v = [2, -1, 3], n = Math.hypot(...v); return v.map((c) => c / n); })();
  const P = (x, y, z) => [ox + x * 0.866 * S - y * 0.866 * S, oy - x * 0.5 * S - y * 0.5 * S - z * S];
  const pts = (arr) => arr.map((q) => P(...q).map((v) => v.toFixed(1)).join(",")).join(" ");
  const shade = (hex, n) => lighten(hex, 0.2 * (n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2]));
  const LIT = "#FFD58A";
  const nightTint = (hex) => (hex === LIT ? hex : night ? mix(lighten(hex, -0.12), "#151B3A", 0.5) : dusk ? mix(hex, "#7A4A5C", 0.16) : hex);
  const poly = (arr, fill, extra = "") => {
    const raw = fill[0] === "!", f = raw ? fill.slice(1) : nightTint(fill);
    return `<polygon points="${pts(arr)}" fill="${f}" ${extra}${night && f === LIT ? ' filter="url(#glow)"' : ""}/>`;
  };
  const quad = (a, b, c, d, fill, extra) => poly([a, b, c, d], fill, extra);
  function box(x, y, z, dx, dy, dz, color, edge = true, raw = false) {
    const pre = raw ? "!" : "";
    const st = edge ? `stroke="${raw ? lighten(color, -0.18) : nightTint(lighten(color, -0.18))}" stroke-width="0.6" stroke-linejoin="round"` : "";
    return quad([x, y, z], [x, y + dy, z], [x, y + dy, z + dz], [x, y, z + dz], pre + shade(color, [-1, 0, 0]), st)
      + quad([x, y, z], [x + dx, y, z], [x + dx, y, z + dz], [x, y, z + dz], pre + shade(color, [0, -1, 0]), st)
      + quad([x, y, z + dz], [x + dx, y, z + dz], [x + dx, y + dy, z + dz], [x, y + dy, z + dz], pre + shade(color, [0, 0, 1]), st);
  }
  const ring = (cx, cy, cz, rad, xz) => Array.from({ length: 18 }, (_, k) => { const a = (k / 18) * Math.PI * 2; return xz ? [cx + rad * Math.cos(a), cy, cz + rad * Math.sin(a)] : [cx + rad * Math.cos(a), cy + rad * Math.sin(a), cz]; });
  const line = (a, b, c, w) => `<polyline points="${pts([a, b])}" stroke="${nightTint(c)}" stroke-width="${w}" fill="none" stroke-linecap="round"/>`;
  const items = [];
  const add = (x, y, svg, z = 0) => items.push([x + y - z * 0.001, svg]);

  const season = p.season, winter = season === "winter";
  const pave = winter ? (dark ? "#4A5060" : "#EEF0F2") : dark ? "#3B404B" : "#DCD6CB";
  const foliage = { spring: ["#F7B8CF", "#F29BBA", "#FBD3E2"], summer: ["#5FA35C", "#4E8F4C", "#79B86A"], autumn: ["#E58A3A", "#D4642E", "#F0B048"], winter: ["#F3F6F9", "#E3EAF0", "#FFFFFF"] }[season];
  const plantC = { spring: "#6FA35A", summer: "#4E8F4C", autumn: "#C9733A", winter: "#5C7A66" }[season];
  const wood = "#B5835A", steel = "#C9CED6", poleC = "#4E535C", snow = "#F7F9FB";
  const ink = (c) => (lum(c) > 150 ? "#1F2430" : "#FFFFFF");
  const stripe2 = lum(p.accent) > 200 ? "#2B2F38" : "#F7F7F5";

  let base = box(-0.4, -0.4, -0.55, L + 0.8, D + 0.8, 0.55, dark ? "#3A404C" : "#C9CED6");
  base += quad([0, 0, 0.002], [L, 0, 0.002], [L, D, 0.002], [0, D, 0.002], pave);
  for (let i = 1; i < L; i++) base += line([i, 0, 0.003], [i, D, 0.003], lighten(pave, -0.07), 0.8);
  for (let j = 1; j < D; j++) base += line([0, j, 0.003], [L, j, 0.003], lighten(pave, -0.07), 0.8);
  const pad = dark ? "#2F333B" : "#6B707A";
  base += quad([0.6, 6.0, 0.004], [L - 0.6, 6.0, 0.004], [L - 0.6, 8.4, 0.004], [0.6, 8.4, 0.004], pad);
  for (let i = 0; i <= N; i++) { const x = 0.8 + i * 4.2; base += quad([x - 0.04, 6.1, 0.005], [x + 0.04, 6.1, 0.005], [x + 0.04, 8.3, 0.005], [x - 0.04, 8.3, 0.005], "#E8E4D8"); }
  if (season === "spring" || season === "autumn") {
    for (let k = 0; k < 30 + N * 10; k++) { const x = 0.2 + r() * (L - 0.6), y = 0.2 + r() * 5.4, s = 0.07 + r() * 0.06; base += quad([x, y, 0.006], [x + s, y, 0.006], [x + s, y + s * 0.7, 0.006], [x, y + s * 0.7, 0.006], foliage[k % 3]); }
  }

  const cols = [p.truckA, p.truckB], flip = r() > 0.5 ? 1 : 0;
  let glows = "";
  function truck(x, y, c) {
    const tl = 3.4, td = 1.5, band = r() > 0.5, hx0 = x + 1.3, hx1 = x + tl - 0.35;
    let s = box(x + 0.15, y + 0.15, 0.18, tl - 0.3, td - 0.3, 0.27, "#2E3138", false);
    s += box(x + 0.85, y, 0.45, tl - 0.85, td, 1.55, c);
    s += box(x, y + 0.08, 0.45, 0.9, td - 0.16, 1.05, c);
    const glass = night ? "#2B3248" : "#6F86A0";
    s += quad([x - 0.003, y + 0.25, 0.95], [x - 0.003, y + td - 0.25, 0.95], [x - 0.003, y + td - 0.25, 1.38], [x - 0.003, y + 0.25, 1.38], shade(glass, [-1, 0, 0]));
    s += quad([x + 0.15, y + 0.077, 0.95], [x + 0.7, y + 0.077, 0.95], [x + 0.7, y + 0.077, 1.38], [x + 0.15, y + 0.077, 1.38], shade(glass, [0, -1, 0]));
    s += quad([x + 0.847, y + 0.3, 1.6], [x + 0.847, y + td - 0.3, 1.6], [x + 0.847, y + td - 0.3, 1.92], [x + 0.847, y + 0.3, 1.92], "#2B2F38");
    for (let k = 0; k < 3; k++) s += line([x + 0.845, y + 0.42, 1.69 + k * 0.08], [x + 0.845, y + 0.7 + r() * 0.35, 1.69 + k * 0.08], "#E8E4D8", 1.2);
    if (band) s += quad([x + 0.85, y - 0.003, 0.45], [x + tl, y - 0.003, 0.45], [x + tl, y - 0.003, 0.74], [x + 0.85, y - 0.003, 0.74], shade(lighten(c, -0.14), [0, -1, 0]));
    else s += quad([x + 0.85, y - 0.003, 0.8], [x + tl, y - 0.003, 0.8], [x + tl, y - 0.003, 0.88], [x + 0.85, y - 0.003, 0.88], "#F7F7F5");
    s += quad([hx0 - 0.05, y - 0.003, 0.95], [hx1 + 0.05, y - 0.003, 0.95], [hx1 + 0.05, y - 0.003, 1.71], [hx0 - 0.05, y - 0.003, 1.71], "#E6E8EB");
    s += quad([hx0, y - 0.004, 1.0], [hx1, y - 0.004, 1.0], [hx1, y - 0.004, 1.66], [hx0, y - 0.004, 1.66], night ? LIT : "#2E333D");
    if (!night) s += quad([hx0 + 0.1, y - 0.005, 1.38], [hx1 - 0.1, y - 0.005, 1.38], [hx1 - 0.1, y - 0.005, 1.42], [hx0 + 0.1, y - 0.005, 1.42], "#4A505C");
    s += box(hx0 - 0.08, y - 0.3, 0.94, hx1 - hx0 + 0.16, 0.3, 0.06, steel);
    s += box(hx0 + 0.15, y - 0.22, 1.0, 0.08, 0.08, 0.16, "#E5484D") + box(hx0 + 0.3, y - 0.22, 1.0, 0.08, 0.08, 0.16, "#F2C94C");
    s += line([hx0 - 0.08, y, 1.3], [hx0 - 0.08, y - 0.7, 2.0], "#8C929C", 1.2) + line([hx1 + 0.08, y, 1.3], [hx1 + 0.08, y - 0.7, 2.0], "#8C929C", 1.2);
    const n = Math.max(6, Math.round((hx1 - hx0) * 5)), a0 = hx0 - 0.12, a1 = hx1 + 0.12;
    for (let k = 0; k < n; k++) {
      const xa = a0 + ((a1 - a0) * k) / n, xb = a0 + ((a1 - a0) * (k + 1)) / n, col = k % 2 ? stripe2 : p.accent;
      s += quad([xa, y, 1.72], [xb, y, 1.72], [xb, y - 0.75, 2.02], [xa, y - 0.75, 2.02], shade(col, [0, 0.37, 0.93]));
      s += poly([[xa, y - 0.75, 2.02], [xb, y - 0.75, 2.02], [(xa + xb) / 2, y - 0.75, 1.88]], shade(col, [0, -1, 0]));
    }
    s += box(x + 0.82, y - 0.03, 2.0, tl - 0.79, td + 0.06, 0.06, winter ? snow : lighten(c, -0.1));
    if (winter) s += box(x, y + 0.08, 1.5, 0.9, td - 0.16, 0.05, snow, false);
    s += box(x + 1.1 + r() * 0.5, y + td - 0.55, 2.06, 0.3, 0.3, 0.22, "#9AA0A8");
    const sx0 = x + 1.55, sw = tl - 1.9;
    s += box(sx0, y + 0.45, 2.06, sw, 0.12, 0.5, p.accent, true, night);
    let bx = sx0 + 0.14;
    for (let k = 0; k < 3; k++) { const bw = 0.18 + r() * 0.2; if (bx + bw > sx0 + sw - 0.12) break; s += quad([bx, y + 0.447, 2.22], [bx + bw, y + 0.447, 2.22], [bx + bw, y + 0.447, 2.38], [bx, y + 0.447, 2.38], (night ? "!" : "") + ink(p.accent)); bx += bw + 0.1; }
    for (const wx of [x + 0.55, x + tl - 0.65]) { s += poly(ring(wx, y - 0.005, 0.3, 0.27, true), "#23262C"); s += poly(ring(wx, y - 0.006, 0.3, 0.11, true), "#A3A9B2"); }
    if (night) glows += `<polygon points="${pts(ring((hx0 + hx1) / 2, y - 1.1, 0.01, 1.5))}" fill="${LIT}" opacity="0.28" filter="url(#soft)"/>`;
    add(x + tl / 2, y + td / 2, s);
  }
  for (let i = 0; i < N; i++) truck(1.2 + i * 4.2, 6.4, cols[(i + flip) % 2]);

  function table(x, y, uc) {
    const legC = lighten(wood, -0.15);
    let s = box(x + 0.15, y + 0.92, 0, 0.08, 0.12, 0.38, legC) + box(x + 1.27, y + 0.92, 0, 0.08, 0.12, 0.38, legC) + box(x, y + 0.85, 0.38, 1.5, 0.28, 0.06, wood);
    s += box(x + 0.2, y + 0.3, 0, 0.08, 0.1, 0.62, legC) + box(x + 1.22, y + 0.3, 0, 0.08, 0.1, 0.62, legC) + box(x, y, 0.62, 1.5, 0.7, 0.07, wood);
    if (winter) s += box(x + 0.05, y + 0.05, 0.69, 1.4, 0.6, 0.03, snow, false);
    s += box(x + 0.15, y - 0.4, 0, 0.08, 0.12, 0.38, legC) + box(x + 1.27, y - 0.4, 0, 0.08, 0.12, 0.38, legC) + box(x, y - 0.45, 0.38, 1.5, 0.28, 0.06, wood);
    if (uc) {
      const cx = x + 0.75, cy = y + 0.35, h = 0.8, A = [cx - h, cy - h, 1.5], B = [cx + h, cy - h, 1.5], C = [cx + h, cy + h, 1.5], Dd = [cx - h, cy + h, 1.5], T = [cx, cy, 1.9];
      s += box(cx - 0.03, cy - 0.03, 0.69, 0.06, 0.06, 1.2, "#E6E8EB", false);
      s += poly([C, Dd, T], shade(uc, [0, 0.5, 0.85])) + poly([B, C, T], shade(uc, [0.5, 0, 0.85]));
      s += poly([A, B, T], shade(uc, [0, -0.5, 0.85])) + poly([Dd, A, T], shade(uc, [-0.5, 0, 0.85]));
    }
    add(x + 0.75, y + 0.35, s);
  }
  const slots = Math.floor((L - 2) / 2.2), sw = (L - 2) / slots, skip = slots > 3 ? Math.floor(r() * slots) : -1;
  const umbC = [p.accent, p.truckA, p.truckB];
  for (let k = 0; k < slots; k++) {
    const x = 1 + k * sw + (sw - 1.5) / 2 + (r() - 0.5) * 0.3, umb = r() > 0.45;
    if (k !== skip) table(x, 2.9, umb ? umbC[Math.floor(r() * 3)] : null);
  }

  function planter(x, y) {
    let s = box(x, y, 0, 1.0, 0.5, 0.38, "#B9BEC6") + box(x + 0.05, y + 0.05, 0.38, 0.9, 0.4, 0.02, "#6B5444", false);
    for (let k = 0; k < 4; k++) {
      const bx = x + 0.06 + k * 0.22, bh = 0.16 + r() * 0.16;
      s += box(bx, y + 0.1 + r() * 0.1, 0.4, 0.22, 0.22, bh, lighten(plantC, (r() - 0.5) * 0.1));
      if (season === "spring" || season === "summer") s += box(bx + 0.06, y + 0.16, 0.4 + bh, 0.09, 0.09, 0.07, season === "spring" ? "#F29BBA" : "#F2C94C", false);
      if (winter) s += box(bx + 0.02, y + 0.14, 0.4 + bh, 0.18, 0.16, 0.04, snow, false);
    }
    add(x + 0.5, y + 0.25, s);
  }
  const pc = Math.max(1, Math.floor((L - 5.2) / 1.8));
  for (let k = 0; k < pc; k++) planter(pc === 1 ? L / 2 - 0.5 : 2.9 + (k * (L - 6.8)) / (pc - 1), 0.25);

  if (p.trees) {
    const tree = (x, y) => {
      let s = box(x + 0.08, y + 0.08, 0, 0.14, 0.14, 0.75, "#7A5A43");
      const blobs = [];
      for (let k = 0; k < 8 + Math.floor(r() * 3); k++) blobs.push([x - 0.35 + r() * 0.65, y - 0.35 + r() * 0.65, 0.7 + r() * 0.7, 0.34 + r() * 0.2]);
      blobs.sort((a, b) => b[0] + b[1] - (a[0] + a[1]) || a[2] - b[2]);
      for (const [bx, by, bz, bs] of blobs) s += box(bx, by, bz, bs, bs, bs, foliage[Math.floor(r() * 3)]);
      return s;
    };
    for (const [tx, ty] of [[1.0, 0.6], [L - 1.4, 1.5], [L - 0.9, 4.6]]) add(tx + 0.15, ty + 0.15, tree(tx, ty));
  }

  const bulb = night || dusk ? LIT : "#F6E7B8", cord = dark ? "#8A909C" : "#3A3F48";
  let lightsSvg = "";
  function wire(a, b, sag) {
    const n = Math.max(6, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.65));
    let prev = a;
    for (let k = 1; k <= n; k++) {
      const t = k / n, q = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] - sag * 4 * t * (1 - t)];
      const [x1, y1] = P(...prev), [x2, y2] = P(...q), [bx, by] = P(q[0], q[1], q[2] - 0.15);
      lightsSvg += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${cord}" stroke-width="1.2"/>`;
      if (k < n) lightsSvg += `<line x1="${x2.toFixed(1)}" y1="${y2.toFixed(1)}" x2="${bx.toFixed(1)}" y2="${by.toFixed(1)}" stroke="${cord}" stroke-width="1"/><circle cx="${bx.toFixed(1)}" cy="${by.toFixed(1)}" r="${(0.09 * S).toFixed(1)}" fill="${bulb}" stroke="${night || dusk ? "none" : "#A89A78"}" stroke-width="0.8"${night ? ' filter="url(#glow)"' : ""}/>`;
      prev = q;
    }
  }
  if (p.lights) {
    const H0 = 3.8, A = [0.15, D - 0.45], B = [L - 0.25, D - 0.45], C = [L - 0.25, 0.35];
    for (const [x, y] of [A, B, C]) add(x + 0.05, y + 0.05, box(x - 0.04, y - 0.04, 0, 0.18, 0.18, 0.12, poleC) + box(x, y, 0.12, 0.1, 0.1, H0 - 0.12, poleC));
    const top = ([x, y]) => [x + 0.05, y + 0.05, H0 - 0.1];
    wire(top(A), top(B), 0.45);
    wire(top(B), top(C), 0.45);
    wire(top(A), top(C), 0.7);
  }

  items.sort((a, b) => b[0] - a[0]);
  const sky = night ? mix(p.backdrop, "#0E1224", 0.6) : dusk ? mix(p.backdrop, "#F2B8A0", 0.35) : p.backdrop;
  const g0 = night ? "#2A3358" : lighten(sky, 0.05);
  let stars = "";
  if (night) for (let k = 0; k < 36; k++) stars += `<circle cx="${(r() * W).toFixed(0)}" cy="${(r() * H * 0.4).toFixed(0)}" r="${(0.8 + r() * 1.2).toFixed(1)}" fill="#FFFFFF" opacity="${(0.3 + r() * 0.5).toFixed(2)}"/>`;
  const [sx, sy] = P(L / 2, D / 2, -0.55);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
<defs><radialGradient id="g" cx="50%" cy="38%" r="65%"><stop offset="0" stop-color="${g0}"/><stop offset="1" stop-color="${sky}"/></radialGradient>
<filter id="glow" x="-100%" y="-100%" width="300%" height="300%"><feDropShadow dx="0" dy="0" stdDeviation="4" flood-color="#FFC56B" flood-opacity="0.9"/></filter>
<filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="16"/></filter></defs>
<rect width="${W}" height="${H}" fill="url(#g)"/>${stars}
<ellipse cx="${sx.toFixed(1)}" cy="${(sy + 14).toFixed(1)}" rx="${((L + D) * 0.42 * S).toFixed(1)}" ry="${((L + D) * 0.07 * S).toFixed(1)}" fill="#000" opacity="${dark ? 0.35 : 0.12}" filter="url(#soft)"/>
${base}${glows}${items.map((i) => i[1]).join("")}${lightsSvg}
</svg>`;
}
