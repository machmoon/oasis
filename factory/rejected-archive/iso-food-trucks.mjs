// Food Truck Plaza: an isometric food-truck diorama with lit serving hatches, striped awnings, parasol tables, queues and festoon lights.
export const meta = {
  title: "Food Truck Plaza",
  kind: "illustration",
  description: "A toy-like isometric plaza of food trucks with lit serving hatches, striped awnings, parasol picnic tables, queuing diners and festoon string lights. Use it for event pages, menus and hero art in your brand colours.",
  tags: ["isometric", "food truck", "diorama", "street food", "festival", "plaza", "3d", "hero"],
  price: 8,
  author: "oasis-factory",
  credit: "Isometric projection and lighting after jdan/isomer (MIT)",
  size: [1600, 1100],
};

export const params = {
  knobs: {
    backdrop: { type: "color", role: "background", label: "Backdrop", default: "#EDE7DF" },
    truckA: { type: "color", role: "primary", label: "Truck A", default: "#E5484D" },
    truckB: { type: "color", role: "secondary", label: "Truck B", default: "#2F9E8F" },
    accent: { type: "color", role: "highlight", label: "Signs & parasols", default: "#F2B33D" },
    paving: { type: "color", role: "surface", label: "Paving", default: "#D9D2C7" },
    season: { type: "choice", label: "Season", default: "summer", options: ["spring", "summer", "autumn", "winter"] },
    time: { type: "choice", label: "Time", default: "dusk", options: ["day", "dusk", "night"] },
    trucks: { type: "range", label: "Trucks", default: 3, min: 2, max: 4, step: 1 },
    seed: { type: "range", label: "Arrangement", default: 7, min: 1, max: 99, step: 1 },
    lights: { type: "toggle", label: "String lights", default: true },
    trees: { type: "toggle", label: "Trees", default: true },
  },
  presets: {
    Picnic: { backdrop: "#E6F0E8", truckA: "#FF7A59", truckB: "#3E7BFA", accent: "#FFD23F", paving: "#E4DDD0" },
    Riviera: { backdrop: "#E3EEF5", truckA: "#0E7C7B", truckB: "#F2A541", accent: "#E5484D", paving: "#D7DEE3" },
    Sorbet: { backdrop: "#FFF1EC", truckA: "#FF8FAB", truckB: "#7D5BA6", accent: "#8FD3C3", paving: "#EADCD4" },
    Midnight: { backdrop: "#15171E", truckA: "#B4FF39", truckB: "#6C5CE7", accent: "#00D1FF", paving: "#3A3E4A" },
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
function tone(hex, smax, lo, hi) { const [h, s, l] = toHsl(hexRgb(hex)); return rgbHex(...fromHsl(h, Math.min(s, smax), Math.max(lo, Math.min(hi, l)))); }
function mix(a, b, t) { const A = hexRgb(a), B = hexRgb(b); return rgbHex(...A.map((v, i) => v + (B[i] - v) * t)); }
function lum(hex) { const [r, g, b] = hexRgb(hex); return (r * 299 + g * 587 + b * 114) / 1000; }
function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export default function render(p) {
  const W = 1600, H = 1100;
  const r = rng(p.seed * 9173 + 13);
  const night = p.time === "night", dusk = p.time === "dusk", winter = p.season === "winter";
  const dkB = lum(p.backdrop) < 110, dark = dkB || night;
  const tame = (c) => tone(c, dkB ? 0.58 : 0.9, dkB ? 0.42 : 0.34, dkB ? 0.62 : 0.7);
  const cA = tame(p.truckA), cB = tame(p.truckB), acc = tame(p.accent), CREAM = dkB ? "#E6E0D2" : "#F7F7F5";
  const N = Math.round(p.trucks), PITCH = 3.8, L = N * PITCH + 1, D = 10, BAY = 6.4, LAWN = 8.25, FRONT = 0.45, MID = 3.0;
  const XP = []; for (let k = 0; k <= N; k++) XP.push(0.45 + (k * (L - 0.9)) / N);
  const bb = [];
  for (const x of [-0.4, L + 0.4]) for (const y of [-0.4, D + 0.4]) bb.push([x, y, -0.55], [x, y, 0]);
  bb.push([2.7, 7.4, 3.4], [1.5 + (N - 1) * PITCH + 1.3, 7.4, 3.4], [L - 0.3, D - 0.4, 2.1]);
  const U = bb.map(([x, y]) => (x - y) * 0.866), V = bb.map(([x, y, z]) => -(x + y) * 0.5 - z);
  const u0 = Math.min(...U), u1 = Math.max(...U), v0 = Math.min(...V), v1 = Math.max(...V);
  const S = Math.min((W - 240) / (u1 - u0), (H - 220) / (v1 - v0));
  const ox = W / 2 - (S * (u0 + u1)) / 2, oy = H / 2 - (S * (v0 + v1)) / 2 - 8;
  const LIGHT = (() => { const v = [2, -1, 3], n = Math.hypot(...v); return v.map((c) => c / n); })();
  const P = (x, y, z) => [ox + (x - y) * 0.866 * S, oy - (x + y) * 0.5 * S - z * S];
  const pts = (arr) => arr.map((q) => P(...q).map((v) => v.toFixed(1)).join(",")).join(" ");
  const shade = (hex, n) => { const m = Math.hypot(...n) || 1; return lighten(hex, (0.2 * (n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2])) / m); };
  const LIT = "#FFD58A";
  const nightTint = (hex) => (hex === LIT ? hex : night ? mix(lighten(hex, -0.12), "#151B3A", 0.5) : dusk ? mix(hex, "#7A4A5C", 0.16) : hex);
  const poly = (arr, fill, extra = "") => `<polygon points="${pts(arr)}" fill="${nightTint(fill)}" ${extra}${night && fill === LIT ? ' filter="url(#glow)"' : ""}/>`;
  const quad = (a, b, c, d, fill, extra) => poly([a, b, c, d], fill, extra);
  const fy = (x0, x1, y, z0, z1, c) => quad([x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1], c);
  const fx = (y0, y1, x, z0, z1, c) => quad([x, y0, z0], [x, y1, z0], [x, y1, z1], [x, y0, z1], c);
  const FY = [0, -1, 0], FX = [-1, 0, 0];
  function box(x, y, z, dx, dy, dz, color, edge = true) {
    const st = edge ? `stroke="${nightTint(lighten(color, -0.18))}" stroke-width="0.6" stroke-linejoin="round"` : "";
    return quad([x, y, z], [x, y + dy, z], [x, y + dy, z + dz], [x, y, z + dz], shade(color, FX), st)
      + quad([x, y, z], [x + dx, y, z], [x + dx, y, z + dz], [x, y, z + dz], shade(color, FY), st)
      + quad([x, y, z + dz], [x + dx, y, z + dz], [x + dx, y + dy, z + dz], [x, y + dy, z + dz], shade(color, [0, 0, 1]), st);
  }
  const items = [];
  const add = (x, y, svg) => items.push([x + y, svg]);

  const ground0 = { spring: "#B5CF8E", summer: "#A9C48A", autumn: "#C9B58E", winter: "#EEF2F6" }[p.season];
  const groundCol = dkB ? mix(ground0, "#2A2E37", 0.35) : ground0;
  const blossom = { spring: ["#F7B8CF", "#F29BBA", "#FBD3E2"], summer: ["#5FA35C", "#4E8F4C", "#79B86A"], autumn: ["#E58A3A", "#D4642E", "#F0B048"], winter: ["#F3F6F9", "#E3EAF0", "#FFFFFF"] }[p.season];
  const flora = { spring: ["#6FAE5E", "#F29BBA", "#79B86A"], summer: ["#4E8F4C", "#79B86A", "#5FA35C"], autumn: ["#B9772F", "#D4642E", "#8E9A4C"], winter: ["#E3EAF0", "#F7F9FB", "#9DB0A0"] }[p.season];
  const wood = dkB ? "#8C6A4E" : "#B98A5E", leg = dkB ? "#5E4636" : "#7A5A43", poleC = dkB ? "#8A90A0" : "#4A4F58";

  // ---------- slab, paving (tamed to a narrow tonal band), truck bay, lawn ----------
  let base = box(-0.4, -0.4, -0.55, L + 0.8, D + 0.8, 0.55, dkB ? "#2A2E37" : "#C9CED6");
  const pv0 = tone(p.paving, 0.28, dkB ? 0.2 : 0.66, dkB ? 0.34 : 0.92), pv = winter ? mix(pv0, dkB ? "#59606C" : "#F2F5F8", 0.35) : pv0;
  const pv2 = lighten(pv, dkB ? 0.03 : -0.035), stone = dkB ? mix("#8A857E", pv, 0.4) : "#C4BAAD", seam = `stroke="${nightTint(lighten(pv, dkB ? 0.05 : -0.08))}" stroke-width="0.5"`;
  for (let i = 0; i < Math.ceil(L); i++) for (let j = 0; j < Math.ceil(BAY); j++) {
    const x1 = Math.min(i + 1, L), y1 = Math.min(j + 1, BAY);
    base += quad([i, j, 0.001], [x1, j, 0.001], [x1, y1, 0.001], [i, y1, 0.001], (i + j) % 2 ? pv2 : pv, seam);
  }
  base += quad([0, BAY, 0.002], [L, BAY, 0.002], [L, LAWN, 0.002], [0, LAWN, 0.002], dkB ? "#3A3F48" : "#565C66");
  base += quad([0, BAY, 0.004], [L, BAY, 0.004], [L, BAY + 0.07, 0.004], [0, BAY + 0.07, 0.004], "#E8E2C8");
  for (let k = 0; k <= N; k++) { const lx = 0.45 + k * PITCH; base += quad([lx - 0.035, BAY + 0.3, 0.004], [lx + 0.035, BAY + 0.3, 0.004], [lx + 0.035, LAWN - 0.15, 0.004], [lx - 0.035, LAWN - 0.15, 0.004], "#E8E2C8"); }
  base += quad([0, LAWN, 0.003], [L, LAWN, 0.003], [L, D, 0.003], [0, D, 0.003], groundCol);
  const fl = { spring: [44, ["#F29BBA", "#FBD3E2"], 0.07], summer: [12, [lighten(pv, dkB ? 0.07 : -0.1)], 0.07], autumn: [60, ["#D97A36", "#C2502E", "#E8A13A"], 0.1], winter: [26, ["#FFFFFF", "#F2F6FA"], 0.42] }[p.season];
  for (let k = 0; k < fl[0]; k++) { const x0 = r() * (L - 0.5), y0 = r() * (BAY - 0.5), s = 0.06 + r() * fl[2]; base += quad([x0, y0, 0.006], [x0 + s, y0, 0.006], [x0 + s, y0 + s * 0.7, 0.006], [x0, y0 + s * 0.7, 0.006], fl[1][k % fl[1].length]); }

  // ---------- trucks (seed picks menu, length, livery and queue) ----------
  const kinds = ["sign", "burger", "drink", "cone"], flip = r() > 0.5 ? 1 : 0;
  for (let i = 3; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [kinds[i], kinds[j]] = [kinds[j], kinds[i]]; }
  function truck(x, y, col, aw, kind, len, skirt) {
    const dep = 1.25, z0 = 0.34, h = 1.5, zt = z0 + h, yf = y - 0.004, hx0 = x + 0.3, hx1 = x + len - 0.85;
    let s = box(x - 0.6, y + 0.12, 0.16, len + 0.5, dep - 0.24, 0.18, "#3A3F48");
    for (const wx of [x - 0.55, x + 0.3, x + len - 0.75]) s += box(wx, y + 0.06, 0, 0.42, 0.16, 0.36, "#262A31");
    s += box(x, y, z0, len, dep, h, col);
    s += skirt ? fy(x, x + len, yf, z0, z0 + 0.42, shade(lighten(col, -0.14), FY)) : fy(x, x + len, yf, z0 + 0.08, z0 + 0.2, shade(CREAM, FY));
    s += fy(hx0 - 0.06, hx1 + 0.06, yf, z0 + 0.54, z0 + 1.21, shade(lighten(col, -0.18), FY));
    s += fy(hx0, hx1, yf - 0.001, z0 + 0.6, z0 + 1.15, night ? LIT : "#2E3440");
    if (!night) for (let k = 0; k < 4 && hx0 + 0.23 + k * 0.3 < hx1; k++) { const c0 = hx0 + 0.1 + k * 0.3; s += fy(c0, c0 + 0.13, yf - 0.002, z0 + 0.6, z0 + 0.72 + (k % 3) * 0.06, k % 2 ? acc : "#E9EBEE"); }
    s += box(hx0 - 0.06, y - 0.24, z0 + 0.54, hx1 - hx0 + 0.12, 0.24, 0.05, "#D3D7DD");
    for (let k = 0; k < 3; k++) s += box(hx0 + 0.15 + k * 0.32, y - 0.17, z0 + 0.59, 0.08, 0.08, 0.14 + (k % 2) * 0.06, k === 1 ? "#E5484D" : k ? "#F2C94C" : "#F7F7F5", false);
    const n = 8, za = z0 + 1.4, zb = z0 + 1.2, yo = y - 0.58, a0 = hx0 - 0.1, aw2 = hx1 - hx0 + 0.2;
    for (let i = 0; i < n; i++) { const xa = a0 + (i * aw2) / n, xb = a0 + ((i + 1) * aw2) / n; s += quad([xa, y, za], [xb, y, za], [xb, yo, zb], [xa, yo, zb], shade(i % 2 ? CREAM : aw, [0, -0.7, 0.7])); }
    s += fy(a0, a0 + aw2, yo, zb - 0.09, zb, shade(aw, FY));
    const m0 = x + len - 0.62;
    s += fy(m0, m0 + 0.48, yf, z0 + 0.5, z0 + 1.2, shade("#262B35", FY));
    for (let k = 0; k < 4; k++) s += fy(m0 + 0.07, m0 + 0.2 + ((k * 5) % 4) * 0.05, yf - 0.001, z0 + 1.03 - k * 0.14, z0 + 1.07 - k * 0.14, k ? "#E9E4D4" : acc);
    s += box(x + 0.06, y + 0.06, zt, len - 0.12, dep - 0.12, 0.05, winter ? "#F4F7FA" : lighten(col, 0.12), false);
    const cx = x + len / 2, cy = y + dep / 2;
    if (kind === "sign") {
      s += box(x + 0.35, cy - 0.06, zt + 0.05, len - 0.7, 0.12, 0.5, acc);
      let lx = x + 0.5;
      for (let k = 0; k < 6 && lx < x + len - 0.55; k++) { const w = 0.12 + ((k * 7 + p.seed) % 3) * 0.06; s += fy(lx, Math.min(lx + w, x + len - 0.45), cy - 0.064, zt + 0.2, zt + 0.38, "#1F2430"); lx += w + 0.07; }
    } else if (kind === "burger") {
      let z = zt + 0.05;
      for (const [w, hh, c] of [[0.8, 0.16, "#D99A4E"], [0.9, 0.05, "#6DB55A"], [0.84, 0.14, "#6B3E26"], [0.92, 0.04, acc], [0.8, 0.26, "#E3A85C"]]) { s += box(cx - w / 2, cy - w / 2, z, w, w, hh, c); z += hh; }
    } else if (kind === "drink") {
      s += box(cx - 0.3, cy - 0.3, zt + 0.05, 0.6, 0.6, 0.7, "#F4F1EA");
      s += fy(cx - 0.3, cx + 0.3, cy - 0.302, zt + 0.3, zt + 0.48, shade(acc, FY)) + fx(cy - 0.3, cy + 0.3, cx - 0.302, zt + 0.3, zt + 0.48, shade(acc, FX));
      s += box(cx - 0.34, cy - 0.34, zt + 0.75, 0.68, 0.68, 0.07, aw);
      s += `<polyline points="${pts([[cx + 0.05, cy, zt + 0.82], [cx + 0.22, cy + 0.12, zt + 1.4]])}" stroke="${nightTint(col)}" stroke-width="${(S * 0.07).toFixed(1)}" stroke-linecap="round" fill="none"/>`;
    } else {
      const c = [[-0.24, -0.24], [0.24, -0.24], [0.24, 0.24], [-0.24, 0.24]].map(([a, b]) => [cx + a, cy + b, zt + 0.62]), ap = [cx, cy, zt + 0.05];
      s += poly([c[0], c[3], ap], shade("#D9A25B", [-1, 0, -0.3])) + poly([c[0], c[1], ap], shade("#D9A25B", [0, -1, -0.3]));
      s += box(cx - 0.3, cy - 0.3, zt + 0.62, 0.6, 0.6, 0.34, "#F6C9D3") + box(cx - 0.22, cy - 0.22, zt + 0.96, 0.44, 0.44, 0.28, "#F4EBD0") + box(cx - 0.06, cy - 0.06, zt + 1.24, 0.12, 0.12, 0.12, "#D8394B");
    }
    s += box(x - 0.75, y + 0.08, z0, 0.75, dep - 0.16, 0.98, col);
    const glass = night ? "#26304A" : "#4F6378";
    s += fx(y + 0.22, y + dep - 0.22, x - 0.754, z0 + 0.5, z0 + 0.88, shade(glass, FX));
    s += fy(x - 0.62, x - 0.2, y + 0.076, z0 + 0.5, z0 + 0.88, shade(glass, FY));
    for (const hy of [y + 0.13, y + dep - 0.31]) s += fx(hy, hy + 0.18, x - 0.756, z0 + 0.12, z0 + 0.25, night ? LIT : "#F4EBD0");
    return s;
  }
  const shirts = ["#3E4A5C", "#C96B4B", "#5E7F6A", "#8A6FA8", "#D9A441", "#E9E4D4"], skins = ["#E8B894", "#C68C63", "#8D5B3E", "#F1CDB0"];
  const person = (x, y) => box(x, y, 0, 0.18, 0.14, 0.4, "#2F3440") + box(x - 0.03, y - 0.03, 0.4, 0.24, 0.2, 0.34, shirts[Math.floor(r() * 6)]) + box(x + 0.02, y, 0.75, 0.14, 0.14, 0.15, skins[Math.floor(r() * 4)]);
  for (let i = 0; i < N; i++) {
    const x = 1.5 + i * PITCH, y = 6.75, A = (i + flip) % 2 === 0, len = 2.4 + Math.floor(r() * 3) * 0.15;
    if (night) base += quad([x - 0.2, y - 1.7, 0.008], [x + 2.4, y - 1.7, 0.008], [x + 2.4, y, 0.008], [x - 0.2, y, 0.008], LIT, 'opacity="0.22"');
    add(x + 0.95, y + 0.6, truck(x, y, A ? cA : cB, A ? cB : cA, kinds[i], len, r() > 0.5));
    const q = Math.floor(r() * 3);
    for (let j = 0; j < q; j++) { const px = x + 0.5 + j * 0.55 + r() * 0.12, py = 5.8 + r() * 0.2; add(px + 0.09, py + 0.07, person(px, py)); }
  }

  // ---------- picnic tables; parasols only on the back row so canopies never stack ----------
  function table(x, y) {
    let s = box(x + 0.1, y + 0.8, 0.28, 1.2, 0.22, 0.05, wood);
    for (const lx of [x + 0.18, x + 1.14]) s += box(lx, y + 0.1, 0, 0.08, 0.6, 0.45, leg) + box(lx, y + 0.84, 0, 0.06, 0.12, 0.28, leg);
    s += box(x, y, 0.45, 1.4, 0.8, 0.06, winter ? "#E8EDF2" : wood);
    s += box(x + 0.2, y - 0.38, 0, 0.06, 0.12, 0.28, leg) + box(x + 1.14, y - 0.38, 0, 0.06, 0.12, 0.28, leg);
    return s + box(x + 0.1, y - 0.42, 0.28, 1.2, 0.22, 0.05, wood);
  }
  function umbrella(cx, cy, uc) {
    const stem = box(cx - 0.04, cy - 0.04, 0.51, 0.08, 0.08, 1.45, "#E9EBEE");
    if (winter) return stem + box(cx - 0.08, cy - 0.08, 1.05, 0.16, 0.16, 0.85, uc) + box(cx - 0.03, cy - 0.03, 1.9, 0.06, 0.06, 0.1, "#E9EBEE");
    const R = 0.74, zb = 1.62, hh = 0.34, ap = [cx, cy, zb + hh], F = [];
    for (let k = 0; k < 8; k++) {
      const a0 = (k * Math.PI) / 4 + Math.PI / 8, a1 = a0 + Math.PI / 4, am = a0 + Math.PI / 8, ca = Math.cos(am), sa = Math.sin(am);
      const c0 = [cx + R * Math.cos(a0), cy + R * Math.sin(a0), zb], c1 = [cx + R * Math.cos(a1), cy + R * Math.sin(a1), zb], col = k % 2 ? CREAM : uc;
      let s = poly([c0, c1, ap], shade(col, [ca * hh, sa * hh, R]), `stroke="${nightTint(lighten(col, -0.12))}" stroke-width="0.5" stroke-linejoin="round"`);
      if (ca + sa < 0.2) s += quad(c0, c1, [c1[0], c1[1], zb - 0.1], [c0[0], c0[1], zb - 0.1], shade(col, [ca, sa, 0]));
      F.push([ca + sa, s]);
    }
    return stem + F.sort((a, b) => b[0] - a[0]).map((f) => f[1]).join("") + box(cx - 0.035, cy - 0.035, zb + hh, 0.07, 0.07, 0.08, CREAM);
  }
  for (let k = 0; k < N; k++) {
    const fc = XP[k] + 2.4 + (r() - 0.5) * 0.2;
    add(fc, 1.4, table(fc - 0.7, 1.0));
    const bc = XP[k] + 2.8 + (r() - 0.5) * 0.2;
    add(bc, 4.1, table(bc - 0.7, 3.7) + (r() > 0.2 ? umbrella(bc, 4.1, acc) : ""));
  }

  // ---------- planters; light posts only on near rows, clear of every truck's hatch sightline ----------
  function planter(cx, cy, pole) {
    const x = cx - 0.35, y = cy - 0.35;
    let s = box(x, y, 0, 0.7, 0.7, 0.42, stone);
    s += quad([x + 0.06, y + 0.06, 0.421], [x + 0.64, y + 0.06, 0.421], [x + 0.64, y + 0.64, 0.421], [x + 0.06, y + 0.64, 0.421], "#6B5444");
    const parts = [];
    for (let k = 0; k < 4; k++) { const bx = x + 0.04 + r() * 0.36, by = y + 0.04 + r() * 0.36, bs = 0.22 + r() * 0.1; parts.push([bx + by, box(bx, by, 0.42, bs, bs, bs * 0.9, flora[k % 3])]); }
    if (pole) parts.push([x + y + 0.7, box(cx - 0.05, cy - 0.05, 0.42, 0.1, 0.1, 2.6, poleC) + box(cx - 0.09, cy - 0.09, 3.0, 0.18, 0.18, 0.06, poleC)]);
    return s + parts.sort((a, b) => b[0] - a[0]).map((q) => q[1]).join("");
  }
  for (const px of XP) { add(px, FRONT, planter(px, FRONT, p.lights)); add(px, MID, planter(px, MID, p.lights)); }

  // ---------- trees: lawn behind the trucks plus a seeded pair on the open left edge ----------
  if (p.trees) {
    const tree = (x, y) => {
      let s = box(x + 0.08, y + 0.08, 0, 0.14, 0.14, 0.75, "#7A5A43");
      const blobs = [];
      for (let k = 0; k < 8 + Math.floor(r() * 3); k++) blobs.push([x - 0.3 + r() * 0.55, y - 0.25 + r() * 0.45, 0.8 + r() * 0.75, 0.3 + r() * 0.18]);
      blobs.sort((a, b) => b[0] + b[1] - (a[0] + a[1]) || a[2] - b[2]);
      for (const [bx, by, bz, bs] of blobs) s += box(bx, by, bz, bs, bs, bs, blossom[Math.floor(r() * blossom.length)]);
      return s;
    };
    XP.forEach((px, k) => { if (k === 0 || k === N || r() > 0.3) add(px, 9.3, tree(px - 0.15, 8.9)); });
    if (r() > 0.25) add(0.45, 1.7, tree(0.35, 1.6));
    if (r() > 0.25) add(0.45, 4.65, tree(0.35, 4.55));
  }

  // ---------- festoon lights: rows and a zigzag over the front half, depth-sorted ----------
  if (p.lights) {
    const ph = 2.98, cyc = [acc, "#F7F1DE", cA, "#F7F1DE", cB, "#F7F1DE"], wire = dark ? "#8A90A0" : "#4A4F58", strings = [];
    for (let k = 0; k < N; k++) {
      strings.push([[XP[k], FRONT], [XP[k + 1], FRONT]], [[XP[k], MID], [XP[k + 1], MID]]);
      strings.push(k % 2 ? [[XP[k], MID], [XP[k + 1], FRONT]] : [[XP[k], FRONT], [XP[k + 1], MID]]);
    }
    let bi = 0;
    for (const [A, B] of strings) {
      const len = Math.hypot(B[0] - A[0], B[1] - A[1]), n = Math.max(6, Math.round(len / 0.48)), sag = 0.3 + len * 0.04, arr = [];
      for (let k = 0; k <= n; k++) { const t = k / n; arr.push([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, ph - sag * 4 * t * (1 - t)]); }
      for (let k = 0; k < n; k++) {
        const a = P(...arr[k]), b = P(...arr[k + 1]);
        items.push([(arr[k][0] + arr[k + 1][0] + arr[k][1] + arr[k + 1][1]) / 2 - 0.01, `<line x1="${a[0].toFixed(1)}" y1="${a[1].toFixed(1)}" x2="${b[0].toFixed(1)}" y2="${b[1].toFixed(1)}" stroke="${wire}" stroke-width="1.1" opacity="0.85"/>`]);
        if (k === 0) continue;
        const c = cyc[bi++ % cyc.length], fill = night ? mix(LIT, c, 0.2) : dusk ? mix("#FFE2A8", c, 0.35) : c;
        items.push([arr[k][0] + arr[k][1] - 0.02, `<circle cx="${a[0].toFixed(1)}" cy="${(a[1] + S * 0.07).toFixed(1)}" r="${(S * 0.065).toFixed(1)}" fill="${fill}" stroke="${nightTint(lighten(c, -0.25))}" stroke-width="0.6"${night || dusk ? ' filter="url(#glow)"' : ""}/>`]);
      }
    }
  }

  items.sort((a, b) => b[0] - a[0]);
  const sky = night ? mix(p.backdrop, "#0E1224", 0.6) : dusk ? mix(p.backdrop, "#F2B8A0", 0.3) : p.backdrop;
  const core = night ? "#2A3358" : dusk ? lighten(sky, 0.06) : lighten(sky, 0.04);
  const [sx, sy] = P(L / 2, D / 2, -0.55), [gx, gy] = P(L / 2, 2.2, 0);
  const pool = night && p.lights ? `<ellipse cx="${gx.toFixed(1)}" cy="${gy.toFixed(1)}" rx="${(L * 0.5 * S).toFixed(1)}" ry="${(L * 0.24 * S).toFixed(1)}" fill="${LIT}" opacity="0.1" filter="url(#soft)"/>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
<defs><radialGradient id="g" cx="50%" cy="42%" r="65%"><stop offset="0" stop-color="${core}"/><stop offset="1" stop-color="${sky}"/></radialGradient>
<filter id="glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="22"/></filter></defs>
<rect width="${W}" height="${H}" fill="url(#g)"/>
<ellipse cx="${sx.toFixed(1)}" cy="${(sy + 22).toFixed(1)}" rx="${((L + D) * 0.45 * S).toFixed(1)}" ry="${(S * 1.1).toFixed(1)}" fill="#000" opacity="${dark ? 0.35 : 0.13}" filter="url(#soft)"/>
${base}${items.map((q) => q[1]).join("")}${pool}</svg>`;
}
