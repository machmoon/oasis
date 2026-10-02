// Oasis Station: an isometric toy railway station with a striped canopy, a commuter train, ticket booth, benches and a platform clock.
export const meta = {
  title: "Oasis Station",
  kind: "illustration",
  description: "A toy-like isometric railway station with a striped canopy, a commuter train, ticket booth, benches and a station clock. Use it for travel, commute, booking and logistics heroes, onboarding and empty states. Rename the station, set the crowd, change season and time, and apply your brand colours.",
  tags: ["isometric", "diorama", "train", "station", "travel", "commute", "transit", "empty state"],
  price: 10,
  author: "oasis-factory",
  size: [1600, 1100],
};

export const params = {
  knobs: {
    backdrop: { type: "color", role: "background", label: "Backdrop", default: "#E9ECF1" },
    train: { type: "color", role: "primary", label: "Train", default: "#2F7A55" },
    canopy: { type: "color", role: "secondary", label: "Canopy", default: "#E5484D" },
    accent: { type: "color", role: "highlight", label: "Clock & vending", default: "#F2B33D" },
    season: { type: "choice", label: "Season", default: "spring", options: ["spring", "summer", "autumn", "winter"] },
    time: { type: "choice", label: "Time", default: "day", options: ["day", "dusk", "night"] },
    crowd: { type: "choice", label: "Crowd", default: "quiet", options: ["empty", "quiet", "busy"] },
    cars: { type: "range", label: "Cars", default: 2, min: 1, max: 4, step: 1 },
    seed: { type: "range", label: "Arrangement", default: 7, min: 1, max: 99, step: 1 },
    name: { type: "text", label: "Station name", default: "MAPLE ST" },
  },
  presets: {
    Heritage: { backdrop: "#F1EBDD", train: "#8C2F39", canopy: "#1F4E5F", accent: "#E0A43B" },
    Nordic: { backdrop: "#DCE5EE", train: "#1F3A5F", canopy: "#E0A43B", accent: "#E5484D" },
    Sunset: { backdrop: "#F7E3D4", train: "#E2683C", canopy: "#5B3A6E", accent: "#2EC4B6" },
    Neon: { backdrop: "#14161C", train: "#B4FF39", canopy: "#6C5CE7", accent: "#00D1FF" },
  },
};

function hexRgb(h) { return [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); }
function rgbHex(r, g, b) { return "#" + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join(""); }
function toHsl(c) {
  const r = c[0] / 255, g = c[1] / 255, b = c[2] / 255;
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
function lighten(hex, amt) { const c = toHsl(hexRgb(hex)); const o = fromHsl(c[0], c[1], Math.max(0, Math.min(1, c[2] + amt))); return rgbHex(o[0], o[1], o[2]); }
function harm(hex, sMax, lMin, lMax) { const c = toHsl(hexRgb(hex)); const o = fromHsl(c[0], Math.min(c[1], sMax), Math.max(lMin, Math.min(lMax, c[2]))); return rgbHex(o[0], o[1], o[2]); }
function mix(a, b, t) { const A = hexRgb(a), B = hexRgb(b); return rgbHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t); }
function lum(hex) { const c = hexRgb(hex); return (c[0] * 299 + c[1] * 587 + c[2] * 114) / 1000; }
function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

export default function render(p) {
  const W = 1600, H = 1100;
  const r = rng(Math.round(p.seed) * 7717 + 13);
  const night = p.time === "night", dusk = p.time === "dusk", winter = p.season === "winter";
  const dkB = lum(p.backdrop) < 110, dark = dkB || night;
  const crowd = p.crowd === "empty" ? 0 : p.crowd === "busy" ? 2 : 1;
  const cars = Math.max(1, Math.min(4, Math.round(p.cars)));
  const trainC = harm(p.train, dkB ? 0.45 : 0.68, dkB ? 0.36 : 0.26, dkB ? 0.48 : 0.58);
  const canC = harm(p.canopy, dkB ? 0.4 : 0.72, dkB ? 0.32 : 0.3, dkB ? 0.44 : 0.64);
  const accC = harm(p.accent, dkB ? 0.6 : 0.85, 0.4, dkB ? 0.6 : 0.66);
  const X0 = 4.4 + cars * 0.3, CL = 3.0, GAP = 0.2, DEPTH = 9.0;
  const L = X0 + cars * (CL + GAP) - GAP + 1.4;
  const top = Math.max((L + DEPTH + 0.8) / 2, (L + 5.2) / 2 + 2.95, (L + 7.1) / 2 + 2.25), spanY = top + 0.95;
  const spanX = (L + DEPTH + 1.6) * 0.866;
  const S = Math.min((W - 160) / spanX, (H - 150) / spanY);
  const ox = W / 2 - ((L - DEPTH) * 0.866 * S) / 2;
  const oy = (H + spanY * S) / 2 - 0.95 * S - 15;
  const LV = [2, -1, 3].map((c) => c / Math.hypot(2, -1, 3));
  const P = (x, y, z) => [ox + x * 0.866 * S - y * 0.866 * S, oy - x * 0.5 * S - y * 0.5 * S - z * S];
  const pts = (arr) => arr.map((q) => P(q[0], q[1], q[2]).map((v) => v.toFixed(1)).join(",")).join(" ");
  const shade = (hex, n) => lighten(hex, 0.2 * (n[0] * LV[0] + n[1] * LV[1] + n[2] * LV[2]));
  const LIT = "#FFD58A", GLOW = "#FFF1C9";
  const lit = (c) => c === LIT || c === GLOW;
  const nightTint = (hex) => (lit(hex) ? hex : night ? mix(lighten(hex, -0.12), "#151B3A", 0.5) : dusk ? mix(hex, "#7A4A5C", 0.16) : dkB ? mix(hex, "#1A2033", 0.2) : hex);
  const poly = (arr, fill, extra) => `<polygon points="${pts(arr)}" fill="${nightTint(fill)}" ${extra || ""}${night && lit(fill) ? ' filter="url(#glow)"' : ""}/>`;
  const quad = (a, b, c, d, fill, extra) => poly([a, b, c, d], fill, extra);
  const line = (arr, col, w) => `<polyline points="${pts(arr)}" stroke="${nightTint(col)}" stroke-width="${w}" fill="none" stroke-linecap="round"/>`;
  function box(x, y, z, dx, dy, dz, color, edge) {
    const st = edge === false ? "" : `stroke="${nightTint(lighten(color, -0.18))}" stroke-width="0.6" stroke-linejoin="round"`;
    return quad([x, y, z], [x, y + dy, z], [x, y + dy, z + dz], [x, y, z + dz], shade(color, [-1, 0, 0]), st)
      + quad([x, y, z], [x + dx, y, z], [x + dx, y, z + dz], [x, y, z + dz], shade(color, [0, -1, 0]), st)
      + quad([x, y, z + dz], [x + dx, y, z + dz], [x + dx, y + dy, z + dz], [x, y + dy, z + dz], shade(color, [0, 0, 1]), st);
  }
  const ring = (cx, cy, cz, rad, pl, n) => { const o = []; const k0 = n || 28; for (let k = 0; k < k0; k++) { const t = (k / k0) * Math.PI * 2, a = Math.cos(t) * rad, b = Math.sin(t) * rad; o.push(pl === "xz" ? [cx + a, cy, cz + b] : [cx + a, cy + b, cz]); } return o; };
  const layer = () => { const a = []; return { add: (k, s) => { a.push([k, s]); }, out: () => a.sort((m, n) => n[0] - m[0]).map((q) => q[1]).join("") }; };
  const glass = (c, n) => (lit(c) ? c : shade(c, n));

  const ground0 = { spring: "#A9C48A", summer: "#8DBA6C", autumn: "#C9B58E", winter: "#EEF2F6" }[p.season];
  const ground = dkB ? mix(ground0, p.backdrop, 0.3) : ground0;
  const foliage = { spring: ["#F7B8CF", "#F29BBA", "#FBD3E2"], summer: ["#5FA35C", "#4E8F4C", "#79B86A"], autumn: ["#E58A3A", "#D4642E", "#F0B048"], winter: ["#5E7F6C", "#EEF3F8", "#4E6F5E"] }[p.season];
  const hedge = { spring: "#7FA56A", summer: "#4E8F4C", autumn: "#B07A3A", winter: "#5E7F6C" }[p.season];
  const bloom = { spring: "#F7B8CF", summer: "#F2D64B", autumn: "#E58A3A", winter: "#F4F7FA" }[p.season];
  const dots = { spring: ["#F7B8CF", "#FFFFFF"], summer: ["#F2D64B", "#FFFFFF"], autumn: ["#E58A3A", "#D4642E"], winter: ["#CFD8E2", "#B8C4D0"] }[p.season];
  const platC = dkB ? mix("#D6D2C8", p.backdrop, 0.4) : "#D6D2C8", edgeC = dkB ? mix("#ECE8DF", p.backdrop, 0.35) : "#ECE8DF";
  const walls = ["#F3E3C8", "#EFD9BC", "#F6EEE0", "#D8DEE3", "#EAD2C0"];
  const winC = night ? LIT : dusk ? "#F6C28B" : "#7E93A8";

  function tree(x, y) {
    let s = box(x + 0.08, y + 0.08, 0, 0.14, 0.14, 0.75, "#7A5A43");
    const blobs = [], n = 7 + Math.floor(r() * 3);
    for (let k = 0; k < n; k++) blobs.push([x - 0.28 + r() * 0.5, y - 0.28 + r() * 0.5, 0.8 + r() * 0.65, 0.32 + r() * 0.2]);
    blobs.sort((a, b) => b[0] + b[1] - (a[0] + a[1]) || a[2] - b[2]);
    for (const q of blobs) s += box(q[0], q[1], q[2], q[3], q[3], q[3], foliage[Math.floor(r() * foliage.length)]);
    return s;
  }
  const shrub = (x, y, w, d, h) => box(x, y, 0, w, d, h, hedge) + (winter ? box(x + 0.04, y + 0.04, h, w - 0.08, d - 0.08, 0.05, bloom, false) : box(x + w * 0.2, y + d * 0.25, h, w * 0.3, d * 0.3, 0.06, bloom, false));

  let base = box(-0.4, -0.4, -0.55, L + 0.8, DEPTH + 0.8, 0.55, dark ? "#2A2E37" : "#C9CED6");
  base += quad([0, 0, 0.001], [L, 0, 0.001], [L, DEPTH, 0.001], [0, DEPTH, 0.001], ground);
  for (let k = 0; k < 40; k++) {
    const fr = k % 3 === 0, x = 0.2 + r() * (L - 0.5), y = fr ? 0.1 + r() * 0.7 : 6.9 + r() * (DEPTH - 7.2);
    base += quad([x, y, 0.004], [x + 0.1, y, 0.004], [x + 0.1, y + 0.1, 0.004], [x, y + 0.1, 0.004], dots[k % 2]);
  }
  base += box(0, 1.2, 0, L, 1.7, 0.1, "#A49C90", false);
  for (let x = L - 0.45; x > 0.1; x -= 0.5) base += box(x, 1.42, 0.1, 0.2, 1.26, 0.03, "#7A6452", false);
  for (const yy of [2.34, 1.74]) base += box(0, yy, 0.13, L, 0.07, 0.07, "#8E949E", false);

  const back = layer();
  back.add(-99, box(0.15, 6.3, 0, L - 0.3, 0.38, 0.6, hedge) + (winter ? box(0.19, 6.34, 0.6, L - 0.38, 0.3, 0.05, bloom, false) : ""));
  for (const q of [[0.5, 7.0, 0.8], [1.5, 7.5, 0.6], [2.5, 7.05, 0.7]]) back.add(q[0] + q[1], shrub(q[0], q[1], q[2], 0.55, 0.32 + r() * 0.12));
  const tn = Math.max(2, Math.round((L - 5.0) / 2.3) + 1), skip = tn > 3 ? 1 + Math.floor(r() * (tn - 2)) : -1;
  for (let k = 0; k < tn; k++) {
    if (k === skip) continue;
    const x = 4.2 + (k * (L - 5.0)) / (tn - 1) + (r() - 0.5) * 0.4, y = 7.45 + r() * 0.35;
    back.add(x + y, tree(x, y));
  }

  let front = "";
  for (let x = 0.3; x < L - 0.25; x += 0.5) front += box(x, 0.95, 0, 0.07, 0.07, 0.3, "#9C7B5B", false);
  front += box(0.3, 0.96, 0.2, Math.floor((L - 0.55) / 0.5) * 0.5 + 0.07, 0.05, 0.05, "#9C7B5B", false);
  for (const fx of [L - 1.3, L * 0.5 - 0.35, 0.35]) front += shrub(fx, 0.18, 0.7, 0.5, 0.38 + r() * 0.1);

  let plat = box(0, 3.0, 0, L, 3.2, 0.45, platC);
  plat += quad([0, 2.997, 0.36], [L, 2.997, 0.36], [L, 2.997, 0.45], [0, 2.997, 0.45], lighten(platC, -0.08));
  plat += quad([0, 3.0, 0.452], [L, 3.0, 0.452], [L, 3.26, 0.452], [0, 3.26, 0.452], edgeC);
  plat += quad([0, 3.34, 0.453], [L, 3.34, 0.453], [L, 3.44, 0.453], [0, 3.44, 0.453], "#F2C94C");
  for (let x = 1; x < L - 0.2; x += 1) plat += line([[x, 3.5, 0.452], [x, 6.2, 0.452]], lighten(platC, -0.05), 1);
  const CA = X0 + 0.2, CB = L - 0.4;
  const nc = Math.max(2, Math.round((CB - CA - 0.8) / 3.2) + 1);
  const cols = []; for (let k = 0; k < nc; k++) cols.push(CA + 0.4 + (k * (CB - CA - 0.8)) / (nc - 1));
  const bays = cols.slice(1).map((c, k) => (c + cols[k]) / 2), bayW = cols[1] - cols[0];
  if (night) for (const c of cols) plat += `<polygon points="${pts(ring(c, 3.75, 0.454, 0.75, "xy"))}" fill="${LIT}" opacity="0.22"/>`;

  const it = layer();
  const tone = ["#E8C4A0", "#C68E62", "#8D5A3B", "#F1D3B5"], hair = ["#2B2118", "#5A3A22", "#C9A15A", "#1F2430"];
  const look = () => [[canC, trainC, "#4E6E8E", "#E9EBEE", "#3F4A5A"][Math.floor(r() * 5)], tone[Math.floor(r() * 4)], hair[Math.floor(r() * 4)]];
  const head = (x, y, z, lk) => box(x + 0.05, y + 0.03, z, 0.16, 0.16, 0.17, lk[1]) + box(x + 0.04, y + 0.05, z + 0.15, 0.18, 0.15, 0.05, lk[2]);
  const person = (x, y) => { const lk = look(); return box(x + 0.03, y + 0.02, 0.45, 0.2, 0.16, 0.42, "#353A45") + box(x, y, 0.87, 0.26, 0.2, 0.34, lk[0]) + head(x, y, 1.21, lk); };
  const seated = (x) => { const lk = look(); return box(x + 0.03, 3.86, 0.45, 0.2, 0.2, 0.4, "#353A45") + box(x, 4.04, 0.86, 0.26, 0.2, 0.34, lk[0]) + head(x, 4.05, 1.2, lk); };
  const wood = "#A8754A";
  const bench = (x, y) => box(x + 1.0, y + 0.06, 0.45, 0.08, 0.24, 0.35, "#4A4F58") + box(x + 0.12, y + 0.06, 0.45, 0.08, 0.24, 0.35, "#4A4F58")
    + box(x, y, 0.8, 1.2, 0.32, 0.06, wood) + box(x, y + 0.26, 0.86, 1.2, 0.06, 0.14, wood);
  let bs = box(0.6, 4.5, 0.45, 1.6, 1.3, 1.5, walls[Math.floor(r() * walls.length)]);
  bs += quad([0.85, 4.497, 1.08], [1.95, 4.497, 1.08], [1.95, 4.497, 1.62], [0.85, 4.497, 1.62], glass(winC, [0, -1, 0]));
  bs += quad([0.597, 4.85, 0.45], [0.597, 5.4, 0.45], [0.597, 5.4, 1.5], [0.597, 4.85, 1.5], shade(lighten(canC, -0.12), [-1, 0, 0]));
  bs += box(0.75, 4.3, 1.02, 1.3, 0.2, 0.05, "#8A6A4E") + box(0.45, 4.32, 1.95, 1.9, 1.62, 0.14, canC);
  if (winter) bs += box(0.55, 4.42, 2.09, 1.7, 1.42, 0.05, "#EEF3F8", false);
  it.add(6.55, bs);
  const vx = 2.7 + (X0 - 5) * 0.45;
  if (crowd) it.add(5.3, person(1.2, 3.98));
  if (crowd === 2) it.add(vx + 5.1, person(vx + 0.25, 4.82));
  const vend = (x, col) => box(x, 5.25, 0.45, 0.45, 0.38, 0.95, col)
    + quad([x + 0.06, 5.247, 0.72], [x + 0.3, 5.247, 0.72], [x + 0.3, 5.247, 1.3], [x + 0.06, 5.247, 1.3], night ? GLOW : "#2B3240")
    + quad([x + 0.34, 5.247, 0.85], [x + 0.4, 5.247, 0.85], [x + 0.4, 5.247, 1.1], [x + 0.34, 5.247, 1.1], "#1F2430");
  it.add(vx + 5.4, vend(vx, accC)); it.add(vx + 5.9, vend(vx + 0.5, "#E9EBEE"));
  const ccx = X0 - 1.4, ccy = 3.6, ccz = 2.55;
  let ck = box(ccx - 0.12, 3.58, 0.45, 0.24, 0.24, 0.1, "#4A515E") + box(ccx - 0.06, 3.64, 0.55, 0.12, 0.12, ccz - 0.85, "#4A515E");
  ck += poly(ring(ccx, ccy + 0.08, ccz, 0.34, "xz"), lighten(accC, -0.2)) + poly(ring(ccx, ccy, ccz, 0.34, "xz"), accC) + poly(ring(ccx, ccy - 0.004, ccz, 0.27, "xz"), night ? GLOW : "#FBFAF5");
  for (let k = 0; k < 12; k++) {
    const a = (k * Math.PI) / 6, q = k % 3 ? 0.035 : 0.065;
    ck += `<polyline points="${pts([[ccx + Math.sin(a) * (0.25 - q), ccy - 0.006, ccz + Math.cos(a) * (0.25 - q)], [ccx + Math.sin(a) * 0.25, ccy - 0.006, ccz + Math.cos(a) * 0.25]])}" stroke="#1F2430" stroke-width="${(0.014 * S).toFixed(1)}" fill="none"/>`;
  }
  const hm = night ? [9, 48] : dusk ? [6, 35] : [10, 10];
  const hand = (a, len, w) => `<polyline points="${pts([[ccx, ccy - 0.008, ccz], [ccx + Math.sin(a) * len, ccy - 0.008, ccz + Math.cos(a) * len]])}" stroke="#1F2430" stroke-width="${(w * S).toFixed(1)}" stroke-linecap="round" fill="none"/>`;
  ck += hand((((hm[0] % 12) + hm[1] / 60) / 12) * Math.PI * 2, 0.14, 0.03) + hand((hm[1] / 60) * Math.PI * 2, 0.21, 0.02);
  it.add(ccx + ccy, ck);
  for (const b of bays) {
    it.add(b + 4.26, bench(b - 0.6, 4.0) + (crowd === 2 ? seated(b - 0.2) : ""));
    if (r() < 0.6) it.add(b + 5.13, box(b + 0.8, 4.05, 0.45, 0.26, 0.26, 0.45, "#3E6B55") + box(b + 0.83, 4.08, 0.9, 0.2, 0.2, 0.02, "#2B3240", false));
    const show = r() < 0.8;
    if (crowd === 2 || (crowd === 1 && show)) it.add(b + 2.73, person(b - 1.05, 3.58));
    if (crowd === 2) it.add(b + 4.13, person(b + 0.35, 3.58));
  }
  const lampC = night ? LIT : dusk ? "#F6C28B" : "#E4E6EA";
  for (const c of cols) it.add(c + 3.9, box(c - 0.07, 3.83, 0.45, 0.14, 0.14, 1.95, "#59606C") + box(c - 0.12, 3.7, 1.86, 0.24, 0.13, 0.07, "#3A3F48") + quad([c - 0.12, 3.698, 1.8], [c + 0.12, 3.698, 1.8], [c + 0.12, 3.698, 1.86], [c - 0.12, 3.698, 1.86], lampC));

  const RF = 3.35, RB = 5.6, zf = 2.3, zb = 2.62, zy = (y) => zf + ((y - RF) / (RB - RF)) * (zb - zf);
  let roof = quad([CA, RF, zf], [CB, RF, zf], [CB, RB, zb], [CA, RB, zb], shade(canC, [0, -0.14, 0.99]));
  const sn = 0.025, y1 = RF + 0.14, y2 = RB - 0.08;
  if (winter) roof += quad([CA + 0.12, y1, zy(y1) + sn], [CB - 0.12, y1, zy(y1) + sn], [CB - 0.12, y2, zy(y2) + sn], [CA + 0.12, y2, zy(y2) + sn], shade("#EEF3F8", [0, -0.14, 0.99]));
  const rib = winter ? "#D2DBE5" : lighten(canC, -0.08), ya = winter ? y1 : RF, yb = winter ? y2 : RB, lift = winter ? sn + 0.003 : 0;
  for (let x = CA + 0.45; x < CB - 0.2; x += 0.45) roof += line([[x, ya, zy(ya) + lift], [x, yb, zy(yb) + lift]], rib, 1);
  roof += poly([[CA, RF, zf - 0.22], [CA, RF, zf], [CA, RB, zb], [CA, RB, zb - 0.1]], shade(lighten(canC, -0.08), [-1, 0, 0]));
  const ns = Math.max(6, Math.round((CB - CA) / 0.34));
  for (let i = 0; i < ns; i++) {
    const xa = CA + (i * (CB - CA)) / ns, xb = CA + ((i + 1) * (CB - CA)) / ns, c = shade(i % 2 ? "#F7F7F5" : canC, [0, -1, 0]);
    roof += quad([xa, RF, zf], [xb, RF, zf], [xb, RF, zf - 0.22], [xa, RF, zf - 0.22], c) + poly([[xa, RF, zf - 0.22], [xb, RF, zf - 0.22], [(xa + xb) / 2, RF, zf - 0.29]], c);
  }
  const nm = String(p.name || "").toUpperCase().trim().slice(0, Math.max(3, Math.floor((bayW - 1.0) / 0.2))).trim();
  if (nm) {
    const sy = 3.42, sb = bays[Math.floor((bays.length - 1) / 2)] - (3.9 - sy), sw = Math.max(1.1, nm.length * 0.2 + 0.5), x0 = sb - sw / 2;
    for (const hx of [x0 + 0.22, x0 + sw - 0.22]) roof += line([[hx, sy + 0.025, 1.92], [hx, sy + 0.025, zf - 0.24]], "#3A3F48", 1.3);
    roof += box(x0, sy, 1.56, sw, 0.05, 0.36, "#1E2530") + quad([x0, sy - 0.001, 1.56], [x0 + sw, sy - 0.001, 1.56], [x0 + sw, sy - 0.001, 1.59], [x0, sy - 0.001, 1.59], accC);
    const tp = P(sb, sy - 0.002, 1.66);
    roof += `<text transform="matrix(0.866,-0.5,0,1,${tp[0].toFixed(1)},${tp[1].toFixed(1)})" text-anchor="middle" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-weight="700" font-size="${(0.26 * S).toFixed(1)}" letter-spacing="${(0.015 * S).toFixed(1)}" fill="${night ? GLOW : "#F7F4EA"}">${esc(nm)}</text>`;
  }

  let trn = box(L - 0.55, 1.62, 0.13, 0.3, 0.86, 0.5, "#C2453A") + box(L - 0.6, 1.72, 0.45, 0.05, 0.66, 0.08, "#2B2F36");
  const stripe = lum(trainC) > 150 ? lighten(trainC, -0.28) : "#F1EAD2";
  const roofC = winter ? "#EEF3F8" : "#C9CDD3";
  const doorC = shade(lighten(trainC, -0.1), [0, -1, 0]);
  for (let i = cars - 1; i >= 0; i--) {
    const cx = X0 + i * (CL + GAP), y0 = 1.62, d = 0.86, fy = y0 - 0.003;
    let s = i < cars - 1 ? box(cx + CL - 0.02, 1.92, 0.4, GAP + 0.04, 0.2, 0.16, "#2B2F36") : "";
    for (const bx of [cx + 0.35, cx + CL - 1.05]) {
      s += box(bx, 1.7, 0.13, 0.7, 0.7, 0.2, "#2B2F36");
      for (const wx of [bx + 0.17, bx + 0.53]) s += poly(ring(wx, 1.697, 0.21, 0.1, "xz", 14), "#1F2430");
    }
    s += box(cx, y0, 0.33, CL, d, 0.45, trainC) + box(cx, y0, 0.78, CL, d, 0.08, stripe, false) + box(cx, y0, 0.86, CL, d, 0.46, trainC);
    s += box(cx + 0.06, y0 + 0.06, 1.32, CL - 0.12, d - 0.12, 0.1, roofC);
    for (const dx of [0.3, CL - 0.6]) {
      s += quad([cx + dx, fy, 0.38], [cx + dx + 0.3, fy, 0.38], [cx + dx + 0.3, fy, 1.24], [cx + dx, fy, 1.24], doorC);
      s += quad([cx + dx + 0.07, fy - 0.001, 0.92], [cx + dx + 0.23, fy - 0.001, 0.92], [cx + dx + 0.23, fy - 0.001, 1.18], [cx + dx + 0.07, fy - 0.001, 1.18], glass(winC, [0, -1, 0]));
    }
    for (let k = 0; k < 3; k++) { const wx = cx + 0.76 + k * 0.5; s += quad([wx, fy, 0.92], [wx + 0.38, fy, 0.92], [wx + 0.38, fy, 1.2], [wx, fy, 1.2], glass(winC, [0, -1, 0])); }
    if (i === (cars > 1 ? 1 : 0)) {
      const px = cx + CL / 2;
      s += box(px - 0.25, 1.9, 1.42, 0.5, 0.2, 0.05, "#5A5F68") + line([[px - 0.2, 2.0, 1.47], [px, 2.0, 1.75], [px + 0.2, 2.0, 1.47]], "#5A5F68", 1.6) + line([[px - 0.25, 2.0, 1.75], [px + 0.25, 2.0, 1.75]], "#5A5F68", 2);
    }
    if (i === 0) {
      const fx = cx - 0.003;
      s += quad([fx, y0 + 0.12, 0.92], [fx, y0 + d - 0.12, 0.92], [fx, y0 + d - 0.12, 1.22], [fx, y0 + 0.12, 1.22], glass(winC, [-1, 0, 0]));
      for (const hy of [y0 + 0.1, y0 + d - 0.24]) s += quad([fx, hy, 0.48], [fx, hy + 0.14, 0.48], [fx, hy + 0.14, 0.6], [fx, hy, 0.6], night ? GLOW : "#F1EAD2");
      s += quad([fx, y0 + 0.3, 1.25], [fx, y0 + d - 0.3, 1.25], [fx, y0 + d - 0.3, 1.31], [fx, y0 + 0.3, 1.31], accC);
    }
    trn += s;
  }

  const sky = night ? mix(p.backdrop, "#0E1224", 0.6) : dusk ? mix(p.backdrop, "#F2B8A0", 0.35) : p.backdrop;
  const grad = night ? `<radialGradient id="g" cx="50%" cy="40%" r="60%"><stop offset="0" stop-color="${mix(sky, "#3A4A80", 0.45)}"/><stop offset="1" stop-color="${sky}"/></radialGradient>`
    : `<radialGradient id="g" cx="50%" cy="35%" r="65%"><stop offset="0" stop-color="${lighten(sky, dkB ? 0.06 : 0.04)}"/><stop offset="1" stop-color="${sky}"/></radialGradient>`;
  let extras = "";
  if (night) {
    for (let k = 0; k < 40; k++) extras += `<circle cx="${(r() * W).toFixed(0)}" cy="${(r() * 260).toFixed(0)}" r="${(0.8 + r() * 1.4).toFixed(1)}" fill="#FFFFFF" opacity="${(0.3 + r() * 0.5).toFixed(2)}"/>`;
    extras += `<circle cx="${W - 200}" cy="130" r="30" fill="#F4EBD0" filter="url(#glow)"/>`;
  } else if (dusk) {
    extras += `<circle cx="${W - 210}" cy="150" r="52" fill="${mix(sky, "#FFB27A", 0.6)}" opacity="0.8"/>`;
  }
  const c0 = P(L / 2, DEPTH / 2, -0.55), bot = P(0, 0, -0.55)[1];
  const shCol = dark ? "#000000" : mix(p.backdrop, "#1F2430", 0.55);
  const shadow = `<ellipse cx="${c0[0].toFixed(1)}" cy="${((c0[1] + bot) / 2 + 14).toFixed(1)}" rx="${((L + DEPTH) * 0.44 * S).toFixed(1)}" ry="${((bot - c0[1]) * 0.7).toFixed(1)}" fill="${shCol}" opacity="${dark ? 0.4 : 0.22}" filter="url(#soft)"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><defs>${grad}<filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter><filter id="soft" x="-20%" y="-60%" width="140%" height="220%"><feGaussianBlur stdDeviation="22"/></filter></defs><rect width="${W}" height="${H}" fill="url(#g)"/>${extras}${shadow}${base}${back.out()}${plat}${it.out()}${roof}${trn}${front}</svg>`;
}
