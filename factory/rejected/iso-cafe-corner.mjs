// Corner Cafe: an isometric two-storey corner cafe on its own slab, with a striped awning, umbrella terrace, lawn, bicycle, chalkboard and string lights, in the Oasis Town projection.
export const meta = {
  title: "Corner Cafe",
  kind: "illustration",
  description: "A toy-like isometric corner cafe with a striped awning, umbrella terrace, little lawn, bicycle, chalkboard and string lights that glow at dusk and night. A ready-made hero or spot illustration for food, hospitality and local-business brands.",
  tags: ["isometric", "cafe", "diorama", "terrace", "coffee", "street", "3d", "hero"],
  price: 8,
  author: "oasis-factory",
  credit: "Isometric projection and lighting after jdan/isomer (MIT)",
  size: [1600, 1100],
};

export const params = {
  knobs: {
    backdrop: { type: "color", role: "background", label: "Backdrop", default: "#EDE7DD" },
    awning: { type: "color", role: "primary", label: "Awning & shutters", default: "#1F5C4A" },
    umbrella: { type: "color", role: "secondary", label: "Umbrellas", default: "#D9654B" },
    accent: { type: "color", role: "highlight", label: "Sign, door & bike", default: "#E8B54A" },
    season: { type: "choice", label: "Season", default: "spring", options: ["spring", "summer", "autumn", "winter"] },
    time: { type: "choice", label: "Time", default: "dusk", options: ["day", "dusk", "night"] },
    tables: { type: "range", label: "Terrace tables", default: 4, min: 1, max: 6, step: 1 },
    seed: { type: "range", label: "Variation", default: 7, min: 1, max: 99, step: 1 },
    lights: { type: "toggle", label: "String lights (dusk & night)", default: true },
    name: { type: "text", label: "Cafe name", default: "Café Oasis" },
  },
  presets: {
    Riviera: { backdrop: "#E2EEF2", awning: "#1E5F8C", umbrella: "#3A86BF", accent: "#F6C445", season: "summer", time: "day", tables: 5 },
    Matcha: { backdrop: "#EEF0E4", awning: "#55753F", umbrella: "#93AE5E", accent: "#C08A4E", season: "spring", time: "day", tables: 2 },
    Bordeaux: { backdrop: "#F4E9E4", awning: "#7A2335", umbrella: "#B04A5C", accent: "#D9A441", season: "autumn", time: "dusk", tables: 6 },
    Midnight: { backdrop: "#15171E", awning: "#C2416B", umbrella: "#D46F8E", accent: "#F2C14E", season: "winter", time: "night", tables: 3 },
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
function tame(hex, sMax, l0, l1) { const [h, s, l] = toHsl(hexRgb(hex)); return rgbHex(...fromHsl(h, Math.min(s, sMax), Math.max(l0, Math.min(l1, l)))); }
function mix(a, b, t) { const A = hexRgb(a), B = hexRgb(b); return rgbHex(...A.map((v, i) => v + (B[i] - v) * t)); }
function lum(hex) { const [r, g, b] = hexRgb(hex); return (r * 299 + g * 587 + b * 114) / 1000; }
function relL(hex) { const c = hexRgb(hex).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; }
function cr(a, b) { const x = relL(a), y = relL(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
function onInk(bg) { return cr(bg, "#1F2430") >= cr(bg, "#FFF6E4") ? "#1F2430" : "#FFF6E4"; }
function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export default function render(p) {
  const W = 1600, H = 1100, sd = Math.round(p.seed), r = rng(sd * 7717 + 3), rL = rng(sd * 131 + 9), rS = rng(sd * 57 + 1);
  const night = p.time === "night", dusk = p.time === "dusk", season = p.season, winter = season === "winter";
  const dark = lum(p.backdrop) < 110 || night;
  const L = 10.6, D = 8.6, BX0 = 5.2, BX1 = 10, BY0 = 4.8, BY1 = 8.2, Z0 = 0.12, ZD = 0.18, ZF = 1.98, ZT = 3.12, ZL = Z0 + 0.07, bw = BX1 - BX0, bd = BY1 - BY0;
  const Q = (x, y, z) => [(x - y) * 0.866, -(x + y) * 0.5 - z];
  const fit = [[-0.4, -0.4, -0.55], [L + 0.4, -0.4, -0.55], [-0.4, D + 0.4, -0.55], [L + 0.4, D + 0.4, 0], [BX0, BY1, ZT + 0.8], [BX1, BY1, ZT + 0.8], [10.15, 0.75, 2.95]].map((q) => Q(...q));
  const u0 = Math.min(...fit.map((q) => q[0])), u1 = Math.max(...fit.map((q) => q[0])), v0 = Math.min(...fit.map((q) => q[1])), v1 = Math.max(...fit.map((q) => q[1]));
  const S = Math.min((W - 170) / (u1 - u0), (H - 140) / (v1 - v0));
  const ox = W / 2 - (S * (u0 + u1)) / 2, oy = H / 2 - (S * (v0 + v1)) / 2 - 8;
  const P = (x, y, z) => { const [u, v] = Q(x, y, z); return [ox + u * S, oy + v * S]; };
  const pts = (a) => a.map((q) => P(...q).map((v) => v.toFixed(1)).join(",")).join(" ");
  const LV = [2, -1, 3].map((c) => c / Math.hypot(2, -1, 3));
  const shade = (hex, n) => lighten(hex, 0.2 * (n[0] * LV[0] + n[1] * LV[1] + n[2] * LV[2]));
  const LIT = "#FFD58A";
  const nt = (hex) => (hex === LIT ? hex : night ? mix(lighten(hex, -0.12), "#151B3A", 0.5) : dusk ? mix(hex, "#7A4A5C", 0.16) : hex);
  const poly = (a, fill, extra = "") => `<polygon points="${pts(a)}" fill="${nt(fill)}"${fill === LIT && night ? ' filter="url(#glow)"' : ""} ${extra}/>`;
  const quad = (a, b, c, d, f, e) => poly([a, b, c, d], f, e);
  const lineRaw = (a, col, w, extra = "") => `<polyline points="${pts(a)}" fill="none" stroke="${col}" stroke-width="${w.toFixed(2)}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;
  const line = (a, col, w, extra = "") => lineRaw(a, nt(col), w, extra);
  function box(x, y, z, dx, dy, dz, c, edge = true) {
    const sh = (n) => (c === LIT ? c : shade(c, n));
    const st = edge && c !== LIT ? `stroke="${nt(lighten(c, -0.18))}" stroke-width="0.6" stroke-linejoin="round"` : "";
    return quad([x, y, z], [x, y + dy, z], [x, y + dy, z + dz], [x, y, z + dz], sh([-1, 0, 0]), st)
      + quad([x, y, z], [x + dx, y, z], [x + dx, y, z + dz], [x, y, z + dz], sh([0, -1, 0]), st)
      + quad([x, y, z + dz], [x + dx, y, z + dz], [x + dx, y + dy, z + dz], [x, y + dy, z + dz], sh([0, 0, 1]), st);
  }
  const items = [], add = (x, y, s) => items.push([x + y, s]);
  const sky = night ? mix(p.backdrop, "#0E1224", 0.6) : dusk ? mix(p.backdrop, "#F2B8A0", 0.35) : p.backdrop;

  const awnC = tame(p.awning, 0.5, 0.26, 0.5), umbC = tame(p.umbrella, 0.55, 0.34, 0.62), accC = tame(p.accent, 0.62, 0.34, 0.64);
  const grass = { spring: "#A9C48A", summer: "#8DB86B", autumn: "#C9B58E", winter: "#EEF2F6" }[season];
  const lawnCol = { spring: "#9DC07E", summer: "#7FAF5E", autumn: "#B7A66E", winter: "#F7F9FB" }[season];
  const paving = winter ? "#E6EAEE" : "#DAD5CC", deckCol = winter ? "#D2BFA6" : "#C99A6A";
  const foliage = { spring: ["#8CC07A", "#A6D08E", "#F4B6CC"], summer: ["#5FA35C", "#4E8F4C", "#79B86A"], autumn: ["#E58A3A", "#D4642E", "#F0B048"], winter: ["#F3F6F9", "#E3EAF0", "#FFFFFF"] }[season];
  const leafy = { spring: ["#7FB069", "#6A9E58"], summer: ["#4E8F4C", "#5FA35C"], autumn: ["#8A9A4E", "#A7883E"], winter: ["#4F6F5A", "#5E7E66"] }[season];
  const bloom = { spring: ["#F7A8C4", "#FFFFFF", "#F5D06A"], summer: ["#E5484D", "#FF8A5B", "#FFFFFF"], autumn: ["#E58A3A", "#C2452D", "#F0B048"], winter: ["#FFFFFF", "#C7323A", "#FFFFFF"] }[season];
  const walls = ["#F3E3C8", "#EFD9BC", "#F6EEE0", "#EAD2C0", "#DCE3E6", "#F1DCCB", "#E8E0CF"];
  const wall = walls[Math.floor(r() * walls.length)], ledge = lighten(wall, -0.1), trim = mix(wall, "#FFFFFF", 0.6);
  const shutters = r() > 0.45, shutterCol = tame(mix(awnC, "#2B2F38", 0.3), 0.3, 0.2, 0.4), frame = "#2E343D", glass = "#6F86A0", metal = "#3C424C", wood = "#B98552";
  const poleC = dark ? "#9AA2B0" : metal, wireC = dark ? mix(sky, "#FFFFFF", 0.55) : "#3C424C";
  const partner = (c) => (lum(c) > 185 ? mix(c, "#2B2F38", 0.6) : mix("#F8F5EF", wall, 0.25));

  // ---------- slab, paving, lawn, path, deck ----------
  let base = box(-0.4, -0.4, -0.55, L + 0.8, D + 0.8, 0.55, dark ? mix(sky, "#FFFFFF", 0.3) : "#C9CED6");
  base += quad([0, 0, 0.001], [L, 0, 0.001], [L, D, 0.001], [0, D, 0.001], grass);
  if (dark) base += lineRaw([[-0.4, D + 0.4, 0], [-0.4, -0.4, 0], [L + 0.4, -0.4, 0]], mix(sky, "#FFFFFF", 0.4), 1.4, 'opacity="0.8"');
  base += box(0.3, 0.3, 0, L - 0.6, D - 0.6, Z0, paving, false);
  for (let k = 1; k < L - 0.5; k++) base += line([[k, 0.3, Z0 + 0.001], [k, D - 0.3, Z0 + 0.001]], lighten(paving, -0.07), 1);
  for (let k = 1; k < D - 0.5; k++) base += line([[0.3, k, Z0 + 0.001], [L - 0.3, k, Z0 + 0.001]], lighten(paving, -0.07), 1);
  const pathC = lighten(paving, -0.09);
  base += quad([0.3, 5.5, Z0 + 0.002], [BX0, 5.5, Z0 + 0.002], [BX0, 6.5, Z0 + 0.002], [0.3, 6.5, Z0 + 0.002], pathC);
  for (let x = 0.8; x < BX0; x += 0.5) base += line([[x, 5.5, Z0 + 0.003], [x, 6.5, Z0 + 0.003]], lighten(pathC, -0.07), 0.9);
  base += line([[0.3, 6.0, Z0 + 0.003], [BX0, 6.0, Z0 + 0.003]], lighten(pathC, -0.07), 0.9);
  base += box(0.55, 0.55, Z0, 3.8, 3.1, 0.05, lighten(paving, -0.14), false) + box(0.62, 0.62, Z0, 3.66, 2.96, ZL - Z0, lawnCol, false);
  base += box(4.95, 0.75, Z0, 5.25, 4.05, 0.06, deckCol, false);
  for (let y = 1.09; y < 4.75; y += 0.34) base += line([[4.95, y, ZD + 0.001], [10.2, y, ZD + 0.001]], lighten(deckCol, -0.1), 0.9);
  if (!winter) for (let i = 0; i < 14; i++) {
    const x = 0.8 + rL() * 3.3, y = 0.8 + rL() * 2.6, s = 0.05;
    if (Math.hypot(x - 1.5, y - 1.7) < 0.7 || Math.hypot(x - 3.4, y - 1.2) < 0.6) continue;
    base += quad([x, y - s, ZL + 0.003], [x + s, y, ZL + 0.003], [x, y + s, ZL + 0.003], [x - s, y, ZL + 0.003], bloom[i % bloom.length]);
  }
  if (night || dusk) {
    const op = night ? 0.17 : 0.11;
    base += `<polygon points="${pts([[BX0 + 0.4, BY0, ZD + 0.003], [BX1 - 0.4, BY0, ZD + 0.003], [BX1 - 0.1, BY0 - 1.7, ZD + 0.003], [BX0 + 0.1, BY0 - 1.7, ZD + 0.003]])}" fill="${LIT}" opacity="${op}"/>`;
    base += `<polygon points="${pts([[BX0, 5.6, Z0 + 0.004], [BX0, 6.4, Z0 + 0.004], [BX0 - 1.3, 6.7, Z0 + 0.004], [BX0 - 1.3, 5.3, Z0 + 0.004]])}" fill="${LIT}" opacity="${op}"/>`;
    const pool = []; for (let i = 0; i < 20; i++) { const a = (i / 20) * Math.PI * 2; pool.push([0.8 + 0.9 * Math.cos(a), 4.6 + 0.9 * Math.sin(a), Z0 + 0.004]); }
    base += `<polygon points="${pts(pool)}" fill="${LIT}" opacity="${op * 0.8}"/>`;
  }
  if (season === "autumn") for (let i = 0; i < 46; i++) {
    const x = 0.5 + rL() * (L - 1), y = 0.5 + rL() * (D - 1), s = 0.07 + rL() * 0.05, c = foliage[Math.floor(rL() * 3)];
    if (x > BX0 - 0.1 && y > BY0 - 0.1) continue;
    const z = (x > 4.95 && y < 4.8 ? ZD : x > 0.62 && x < 4.28 && y > 0.62 && y < 3.58 ? ZL : Z0) + 0.005;
    base += quad([x, y - s, z], [x + s, y, z], [x, y + s, z], [x - s, y, z], c);
  }

  // ---------- the cafe ----------
  const fy = BY0 - 0.004, sx = BX0 - 0.004;
  const sh2 = (c, n) => (c === LIT ? c : shade(c, n));
  const fq = (xa, xb, za, zb, c, e) => quad([xa, fy, za], [xb, fy, za], [xb, fy, zb], [xa, fy, zb], sh2(c, [0, -1, 0]), e);
  const sq = (ya, yb, za, zb, c, e) => quad([sx, ya, za], [sx, yb, za], [sx, yb, zb], [sx, ya, zb], sh2(c, [-1, 0, 0]), e);
  const glG = night ? LIT : dusk ? "#F6C28B" : glass;
  let b = box(BX0, BY0, Z0, bw, bd, ZT - Z0, wall);
  b += box(BX0 - 0.04, BY0 - 0.04, Z0, 0.04, bd + 0.04, 0.22, ledge, false) + box(BX0 - 0.04, BY0 - 0.04, Z0, bw + 0.04, 0.04, 0.22, ledge, false);
  const bayW = (bw - 1.24) / 3;
  for (let i = 0; i < 3; i++) {
    const xa = BX0 + 0.4 + i * (bayW + 0.22), xb = xa + bayW, xm = (xa + xb) / 2;
    b += fq(xa - 0.06, xb + 0.06, 0.26, 1.42, frame) + fq(xa, xb, 0.34, 1.34, glG) + fq(xa, xb, 1.07, 1.11, frame) + fq(xm - 0.02, xm + 0.02, 0.34, 1.07, frame);
    if (!night) b += quad([xa + 0.12, fy, 0.34], [xa + 0.34, fy, 0.34], [xa + 0.7, fy, 1.07], [xa + 0.48, fy, 1.07], "#FFFFFF", 'opacity="0.2"');
  }
  b += sq(5.56, 6.44, Z0, 1.36, frame) + sq(5.62, 6.38, Z0, 1.3, accC) + sq(5.7, 6.3, 0.66, 1.2, glG) + sq(5.68, 5.73, 0.55, 0.64, "#D9D4CB");
  b += box(BX0 - 0.2, 5.5, Z0, 0.2, 1.0, 0.05, ledge, false);
  b += sq(6.8, 7.96, 0.26, 1.42, frame) + sq(6.86, 7.9, 0.34, 1.34, glG) + sq(6.86, 7.9, 1.07, 1.11, frame);
  let fasC = mix(tame(p.accent, 0.45, 0.32, 0.62), wall, 0.3);
  for (let i = 0; i < 8; i++) { const sc = nt(shade(fasC, [0, -1, 0])), ik = onInk(sc); if (cr(sc, ik) >= 4.5) break; fasC = lighten(fasC, ik === "#1F2430" ? 0.05 : -0.05); }
  b += box(BX0 - 0.08, BY0 + 0.25, 1.5, 0.08, bd - 0.5, 0.46, fasC);
  const fz = 1.5, fh = 0.46, fyF = BY0 - 0.08;
  b += box(BX0 + 0.25, fyF, fz, bw - 0.5, 0.08, fh, fasC);
  const signC = nt(shade(fasC, [0, -1, 0])), ink = onInk(signC);
  b += `<polygon points="${pts([[BX0 + 0.36, fyF - 0.003, fz + 0.06], [BX1 - 0.36, fyF - 0.003, fz + 0.06], [BX1 - 0.36, fyF - 0.003, fz + fh - 0.06], [BX0 + 0.36, fyF - 0.003, fz + fh - 0.06]])}" fill="none" stroke="${ink}" stroke-opacity="0.45" stroke-width="1.2"/>`;
  const raw = String(p.name || "").slice(0, 22).toUpperCase();
  if (raw.trim()) {
    const [ex, ey] = P(BX0 + bw / 2, fyF - 0.003, fz + fh / 2);
    const fs = Math.min(0.29 * S, ((bw - 1.0) * S) / (Math.max(5, raw.length) * 0.8));
    b += `<text transform="matrix(0.866 -0.5 0 1 ${ex.toFixed(1)} ${ey.toFixed(1)})" x="${(fs * 0.07).toFixed(1)}" y="${(fs * 0.36).toFixed(1)}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-weight="700" font-size="${fs.toFixed(1)}" letter-spacing="${(fs * 0.14).toFixed(1)}" fill="${ink}"${night && ink !== "#1F2430" ? ' filter="url(#glow)"' : ""}>${esc(raw)}</text>`;
  }
  b += box(BX0 - 0.06, BY0 - 0.06, ZF, 0.06, bd + 0.06, 0.07, ledge) + box(BX0 - 0.06, BY0 - 0.06, ZF, bw + 0.06, 0.06, 0.07, ledge);
  const wz0 = ZF + 0.3, wz1 = ZF + 0.96;
  const win = (front, c) => {
    const F = front ? fq : sq, lit = r() > 0.35, flower = r() > 0.4;
    const g = night ? (lit ? LIT : "#3B4256") : dusk && lit ? "#F6C28B" : glass;
    let s = shutters ? F(c - 0.5, c - 0.29, wz0, wz1, shutterCol) + F(c + 0.29, c + 0.5, wz0, wz1, shutterCol) : "";
    s += F(c - 0.29, c + 0.29, wz0 - 0.05, wz1 + 0.05, trim) + F(c - 0.23, c + 0.23, wz0, wz1, g) + F(c - 0.015, c + 0.015, wz0, wz1, trim) + F(c - 0.23, c + 0.23, wz0 + 0.42, wz0 + 0.45, trim);
    s += front ? box(c - 0.32, BY0 - 0.09, wz0 - 0.1, 0.64, 0.09, 0.05, ledge) : box(BX0 - 0.09, c - 0.32, wz0 - 0.1, 0.09, 0.64, 0.05, ledge);
    if (flower) {
      s += front ? box(c - 0.28, BY0 - 0.2, wz0 - 0.05, 0.56, 0.18, 0.13, "#7A5236") : box(BX0 - 0.2, c - 0.28, wz0 - 0.05, 0.18, 0.56, 0.13, "#7A5236");
      for (let k = 4; k >= 0; k--) {
        const t = c - 0.25 + k * 0.105, q = r(), col = q > 0.45 ? bloom[Math.floor(q * 10) % bloom.length] : leafy[Math.floor(q * 10) % leafy.length];
        s += front ? box(t, BY0 - 0.18, wz0 + 0.08, 0.1, 0.13, 0.1, col) : box(BX0 - 0.18, t, wz0 + 0.08, 0.13, 0.1, 0.1, col);
      }
    }
    return s;
  };
  for (let i = 0; i < 3; i++) b += win(false, BY0 + bd / 6 + (i * bd) / 3);
  for (let i = 0; i < 4; i++) b += win(true, BX0 + 0.6 + i * 1.2);
  const awn = (front, a0, a1, n) => {
    const zt = 1.44, zb = 1.14, dep = front ? 0.62 : 0.5, pc = partner(awnC);
    let s = "";
    for (let i = 0; i < n; i++) {
      const t0 = a0 + (i * (a1 - a0)) / n, t1 = a0 + ((i + 1) * (a1 - a0)) / n, tm = (t0 + t1) / 2, c = i % 2 ? pc : awnC;
      const A = (t, d, z) => (front ? [t, BY0 - d, z] : [BX0 - d, t, z]);
      s += quad(A(t0, 0, zt), A(t1, 0, zt), A(t1, dep, zb), A(t0, dep, zb), shade(c, front ? [0, -0.45, 0.9] : [-0.45, 0, 0.9]));
      s += poly([A(t0, dep, zb), A(t1, dep, zb), A(t1, dep, zb - 0.08), A(tm, dep, zb - 0.16), A(t0, dep, zb - 0.08)], shade(c, front ? [0, -1, 0] : [-1, 0, 0]));
      if (winter) s += quad(A(t0, 0, zt), A(t1, 0, zt), A(t1, 0.16, zt - 0.08), A(t0, 0.16, zt - 0.08), "#F7F9FB");
    }
    return s + (front ? poly([[a0, BY0, zt], [a0, BY0 - dep, zb], [a0, BY0, zb]], shade(awnC, [-1, 0, 0])) : poly([[BX0, a0, zt], [BX0 - dep, a0, zb], [BX0, a0, zb]], shade(awnC, [0, -1, 0])));
  };
  b += awn(false, 5.45, 6.55, 5) + awn(true, BX0 + 0.3, BX1 - 0.3, 13);
  b += box(BX0 - 0.05, BY0 - 0.05, ZT, bw + 0.1, bd + 0.1, 0.16, ledge);
  b += box(BX0 + 0.1, BY0 + 0.1, ZT + 0.16, bw - 0.2, bd - 0.2, 0.01, winter ? "#F7F9FB" : "#B9BEC6", false);
  if (r() < 0.5) b += box(BX0 + bw * 0.58, BY0 + bd * 0.42, ZT + 0.17, 0.55, 0.42, 0.34, "#E4E6EA") + box(BX0 + 0.7, BY0 + bd * 0.6, ZT + 0.17, 0.14, 0.14, 0.55, "#9AA0A8");
  else {
    b += box(BX0 + bw * 0.6, BY0 + 0.6, ZT + 0.17, 0.8, 0.55, 0.06, glass) + box(BX0 + 0.5, BY0 + bd * 0.6, ZT + 0.17, 1.5, 0.32, 0.2, "#8A5A3C");
    for (let k = 5; k >= 0; k--) b += box(BX0 + 0.52 + k * 0.24, BY0 + bd * 0.6 + 0.02, ZT + 0.37, 0.22, 0.26, 0.18 + r() * 0.1, leafy[k % 2]);
  }
  add(BX0 + bw / 2, BY0 + bd / 2, b);

  // ---------- props ----------
  const pot = (x, y, k = 1) => {
    const tc = "#C46A45", bl = [];
    let s = box(x - 0.15 * k, y - 0.15 * k, Z0, 0.3 * k, 0.3 * k, 0.28 * k, tc) + box(x - 0.18 * k, y - 0.18 * k, Z0 + 0.28 * k, 0.36 * k, 0.36 * k, 0.06 * k, lighten(tc, 0.06));
    for (let i = 0; i < 6; i++) bl.push([x - 0.2 * k + r() * 0.24 * k, y - 0.2 * k + r() * 0.24 * k, Z0 + (0.34 + r() * 0.32) * k, (0.15 + r() * 0.08) * k, r()]);
    bl.sort((a, c) => c[0] + c[1] - (a[0] + a[1]) || a[2] - c[2]);
    for (const [bx, by, bz, bs, c] of bl) s += box(bx, by, bz, bs, bs, bs, c > 0.68 ? bloom[Math.floor(c * 10) % bloom.length] : leafy[Math.floor(c * 10) % leafy.length]);
    return s;
  };
  const tree = (x, y, k) => {
    let s = box(x - 0.07 * k, y - 0.07 * k, ZL, 0.14 * k, 0.14 * k, 0.95 * k, "#7A5A43");
    const cz = ZL + 0.9 * k, bl = [];
    s += box(x - 0.34 * k, y - 0.34 * k, cz + 0.08 * k, 0.68 * k, 0.68 * k, 0.62 * k, foliage[0]);
    for (let i = 0; i < 16; i++) {
      const a = r() * Math.PI * 2, bz = cz + r() * 0.75 * k, top = bz > cz + 0.5 * k ? 0.5 : 1;
      const rr = (0.12 + r() * 0.32) * k * top, bs = (0.3 + r() * 0.18) * k;
      bl.push([x + rr * Math.cos(a) - bs / 2, y + rr * Math.sin(a) - bs / 2, bz, bs, Math.floor(r() * 3)]);
    }
    bl.sort((a, c) => c[0] + c[1] - (a[0] + a[1]) || a[2] - c[2]);
    for (const [bx, by, bz, bs, c] of bl) s += box(bx, by, bz, bs, bs, bs, foliage[c]);
    return s;
  };
  add(1.5, 1.7, tree(1.5, 1.7, 1));
  add(3.4, 1.2, tree(3.4, 1.2, 0.78));
  const chalk = (x0, y0) => {
    const bp = (u, t, back) => [x0 + u, y0 + (back ? 0.36 - 0.18 * t : 0.18 * t), Z0 + 0.92 * t];
    let s = quad(bp(0, 0, 1), bp(0.5, 0, 1), bp(0.5, 1, 1), bp(0, 1, 1), lighten(accC, -0.2));
    s += quad(bp(0, 0), bp(0.5, 0), bp(0.5, 1), bp(0, 1), shade(accC, [0, -0.98, 0.2])) + quad(bp(0.05, 0.1), bp(0.45, 0.1), bp(0.45, 0.92), bp(0.05, 0.92), "#2C3532");
    for (const t of [0.8, 0.68, 0.56]) { const l = 0.14 + r() * 0.2; s += line([bp(0.25 - l / 2, t), bp(0.25 + l / 2, t)], "#ECEAE2", 1.6); }
    s += line([bp(0.17, 0.42), bp(0.19, 0.2), bp(0.29, 0.2), bp(0.31, 0.42), bp(0.17, 0.42)], "#ECEAE2", 1.4) + line([bp(0.31, 0.36), bp(0.36, 0.33), bp(0.31, 0.28)], "#ECEAE2", 1.2);
    return s;
  };
  add(2.85, 4.78, chalk(2.6, 4.6));
  add(0.8, 4.6, box(0.76, 4.56, Z0, 0.08, 0.08, 2.0, poleC) + box(0.68, 4.48, 2.12, 0.24, 0.24, 0.3, night || dusk ? LIT : "#E8E4DA") + box(0.64, 4.44, 2.42, 0.32, 0.32, 0.06, poleC));
  add(1.65, 7.6, box(0.95, 7.42, Z0, 0.08, 0.34, 0.36, metal) + box(2.27, 7.42, Z0, 0.08, 0.34, 0.36, metal) + box(0.9, 7.4, Z0 + 0.36, 1.5, 0.38, 0.06, wood) + box(0.9, 7.74, Z0 + 0.42, 1.5, 0.06, 0.36, wood));
  add(4.85, 5.05, pot(4.85, 5.05, 1.1));
  add(4.85, 6.9, pot(4.85, 6.9, 1.1));
  const bike = (bx, y0) => {
    const zh = Z0 + 0.27, R = 0.27, yF = y0, yR = y0 + 0.55, fw = Math.max(2.2, 0.04 * S), tire = "#2B2F38";
    const wheel = (cy) => { const c = []; for (let i = 0; i <= 24; i++) { const a = (i / 24) * Math.PI * 2; c.push([bx, cy + R * Math.cos(a), zh + R * Math.sin(a)]); } return line(c, tire, Math.max(2.5, 0.05 * S)) + line([[bx, cy - R * 0.9, zh], [bx, cy + R * 0.9, zh]], "#9AA0A8", 0.8) + line([[bx, cy, zh - R * 0.9], [bx, cy, zh + R * 0.9]], "#9AA0A8", 0.8); };
    const B = [bx, y0 + 0.31, zh - 0.02], St = [bx, y0 + 0.41, zh + 0.42], Hd = [bx, y0 + 0.08, zh + 0.42], Hb = [bx, y0 + 0.04, zh + 0.56];
    let s = wheel(yR) + wheel(yF) + line([[bx, yR, zh], B, St, [bx, yR, zh]], accC, fw) + line([St, Hd, B], accC, fw) + line([Hd, [bx, yF, zh]], accC, fw) + line([Hd, Hb], metal, fw * 0.9);
    s += line([[bx - 0.13, Hb[1], Hb[2]], [bx + 0.13, Hb[1], Hb[2]]], metal, fw * 0.9) + line([[bx, y0 + 0.38, St[2] + 0.05], [bx, y0 + 0.52, St[2] + 0.05]], tire, fw * 1.5);
    s += box(bx - 0.13, yF - 0.22, zh + 0.3, 0.26, 0.2, 0.15, wood);
    for (let k = 2; k >= 0; k--) s += box(bx - 0.1 + k * 0.07, yF - 0.18, zh + 0.45, 0.08, 0.08, 0.08, bloom[k % bloom.length]);
    return s;
  };
  add(3.35, 7.65, bike(3.35, 7.35));
  const slots = [[1.7, 4.75], [3.75, 4.75], [0.6, 7.6], [2.75, 7.6], [4.15, 7.55], [4.3, 3.95]];
  for (let i = slots.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [slots[i], slots[j]] = [slots[j], slots[i]]; }
  for (const [x, y] of slots.slice(0, 3)) add(x, y, pot(x, y, 0.85 + r() * 0.2));

  // ---------- terrace: two staggered rows, kept clear of each other and of the light poles in projection ----------
  const layouts = [[[7.6, 2.5]], [[6.3, 3.3], [8.8, 1.9]], [[6.1, 3.3], [8.6, 3.3], [7.35, 1.75]], [[6.1, 3.3], [8.5, 3.3], [7.3, 1.75], [9.5, 1.75]],
    [[5.85, 3.3], [7.4, 3.3], [8.95, 3.3], [7.0, 1.75], [8.55, 1.75]], [[5.85, 3.3], [7.4, 3.3], [8.95, 3.3], [7.0, 1.75], [8.35, 1.75], [9.7, 1.75]]];
  const nT = Math.max(1, Math.min(6, Math.round(p.tables))), UR = nT >= 5 ? 0.52 : 0.62, CO = 0.48;
  const chair = (cx, cy, side) => box(cx - 0.09, cy - 0.09, ZD, 0.18, 0.18, 0.36, metal) + box(cx - 0.15, cy - 0.15, ZD + 0.36, 0.3, 0.3, 0.05, wood) + box(cx - 0.15, side > 0 ? cy + 0.11 : cy - 0.15, ZD + 0.41, 0.3, 0.04, 0.36, wood);
  const umbrella = (tx, ty) => {
    const N = 12, R = UR, zr = ZD + 1.15, za = ZD + 1.45, up = partner(umbC), rim = [], tris = [];
    for (let i = 0; i < N; i++) { const a = ((i + 0.5) / N) * Math.PI * 2; rim.push([tx + R * Math.cos(a), ty + R * Math.sin(a), zr]); }
    const ap = [tx, ty, za];
    let hem = "";
    for (let i = 0; i < N; i++) {
      const A = rim[i], B = rim[(i + 1) % N], v1 = A.map((v, k) => v - ap[k]), v2 = B.map((v, k) => v - ap[k]);
      let n = [v1[1] * v2[2] - v1[2] * v2[1], v1[2] * v2[0] - v1[0] * v2[2], v1[0] * v2[1] - v1[1] * v2[0]];
      if (n[2] < 0) n = n.map((v) => -v);
      const nl = Math.hypot(...n), col = i % 2 ? up : umbC, m = ((i + 1) / N) * Math.PI * 2;
      tris.push([A[0] + B[0] + A[1] + B[1], poly([ap, A, B], shade(col, n.map((v) => v / nl)))]);
      if (Math.cos(m) + Math.sin(m) < 0) hem += quad(A, B, [B[0], B[1], zr - 0.09], [A[0], A[1], zr - 0.09], shade(col, [Math.cos(m), Math.sin(m), 0]));
    }
    tris.sort((a, c) => c[0] - a[0]);
    return tris.map((t) => t[1]).join("") + hem + box(tx - 0.03, ty - 0.03, za - 0.02, 0.06, 0.06, 0.08, "#D9D4CB");
  };
  const furled = (tx, ty) => {
    const w = 0.11, z0 = ZD + 0.95, zm = ZD + 1.3, z1 = ZD + 1.7, c = umbC;
    const Bt = [tx, ty, z0], Tp = [tx, ty, z1], Lp = [tx, ty + w, zm], Rp = [tx + w, ty, zm], Fp = [tx - w * 0.7, ty - w * 0.7, zm];
    return poly([Bt, Lp, Tp, Fp], shade(c, [-1, 0, 0.2])) + poly([Bt, Fp, Tp, Rp], shade(c, [0, -1, 0.2])) + line([[tx - w * 0.6, ty - w * 0.3, zm + 0.04], [tx + w * 0.3, ty - w * 0.6, zm + 0.04]], partner(c), 1.6);
  };
  for (const [tx, ty] of layouts[nT - 1]) {
    add(tx, ty + CO, chair(tx, ty + CO, 1));
    add(tx, ty - CO, chair(tx, ty - CO, -1));
    add(tx, ty, box(tx - 0.04, ty - 0.04, ZD, 0.08, 0.08, 0.62, metal) + box(tx - 0.27, ty - 0.27, ZD + 0.62, 0.54, 0.54, 0.04, "#F1EEE8") + box(tx - 0.13, ty - 0.15, ZD + 0.66, 0.08, 0.08, 0.07, "#FFFFFF") + box(tx + 0.06, ty + 0.03, ZD + 0.66, 0.09, 0.09, 0.06, "#FFFFFF") + box(tx - 0.025, ty - 0.025, ZD + 0.66, 0.05, 0.05, winter ? 0.95 : 0.8, "#D9D4CB"));
    items.push([tx + ty - 0.7, winter ? furled(tx, ty) : umbrella(tx, ty)]);
  }

  // ---------- string lights: a fan hung from three deck poles, routed so no wire projects over the sign ----------
  let lightsSvg = "";
  if (p.lights && (night || dusk)) {
    const ph = 2.6, zt = ZD + ph, A = [5.0, 0.8, zt], B = [10.15, 0.8, zt], Dp = [10.15, 4.35, zt], M = [10.15, 2.575, zt - 0.3];
    for (const q of [A, B, Dp]) add(q[0], q[1], box(q[0] - 0.035, q[1] - 0.035, ZD, 0.07, 0.07, ph, poleC) + box(q[0] - 0.06, q[1] - 0.06, zt, 0.12, 0.12, 0.05, poleC));
    const rb = Math.max(3, 0.055 * S);
    const strand = (a, c, sag) => {
      const len = Math.hypot(c[0] - a[0], c[1] - a[1]), pos = (t) => [a[0] + (c[0] - a[0]) * t, a[1] + (c[1] - a[1]) * t, a[2] + (c[2] - a[2]) * t - sag * 4 * t * (1 - t)];
      const pl = []; for (let i = 0; i <= 16; i++) pl.push(pos(i / 16));
      let s = lineRaw(pl, wireC, 1.4, 'opacity="0.9"');
      const nb = Math.max(3, Math.round(len / 0.42));
      for (let i = 1; i < nb; i++) {
        const [X, Y] = P(...pos(i / nb)), cx = X.toFixed(1), cy = (Y + rb * 1.3).toFixed(1);
        s += `<rect x="${(X - rb * 0.4).toFixed(1)}" y="${Y.toFixed(1)}" width="${(rb * 0.8).toFixed(1)}" height="${(rb * 0.55).toFixed(1)}" rx="0.6" fill="${wireC}"/>`;
        s += `<circle cx="${cx}" cy="${cy}" r="${(rb * (night ? 2.8 : 2.1)).toFixed(1)}" fill="${LIT}" opacity="${night ? 0.2 : 0.18}"/><circle cx="${cx}" cy="${cy}" r="${rb.toFixed(1)}" fill="${night ? LIT : "#FFE3A3"}"${night ? ' filter="url(#glow)"' : ""}/>`;
      }
      return s;
    };
    lightsSvg = strand(A, B, 0.35) + strand(B, Dp, 0.3) + strand(A, Dp, 0.4) + strand(A, M, 0.36);
  }

  items.sort((a, c) => c[0] - a[0]);
  const grad = night ? `<radialGradient id="g" cx="50%" cy="40%" r="60%"><stop offset="0" stop-color="${mix(sky, "#2A3358", 0.6)}"/><stop offset="1" stop-color="${sky}"/></radialGradient>`
    : `<radialGradient id="g" cx="50%" cy="35%" r="65%"><stop offset="0" stop-color="${lighten(sky, dark ? 0.06 : 0.04)}"/><stop offset="1" stop-color="${sky}"/></radialGradient>`;
  let stars = "";
  if (night) for (let i = 0; i < 46; i++) stars += `<circle cx="${(rS() * W).toFixed(1)}" cy="${(rS() * H * 0.42).toFixed(1)}" r="${(0.8 + rS() * 1.4).toFixed(1)}" fill="#FFFFFF" opacity="${(0.25 + rS() * 0.5).toFixed(2)}"/>`;
  const [scx] = P(L / 2, D / 2, -0.55), [, scy] = P(-0.4, -0.4, -0.55);
  const shCol = dark ? mix(sky, "#000000", 0.75) : mix(sky, "#1F2430", 0.4);
  const shGrad = `<radialGradient id="shg" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="${shCol}" stop-opacity="${dark ? 0.95 : 0.55}"/><stop offset="0.55" stop-color="${shCol}" stop-opacity="${dark ? 0.55 : 0.3}"/><stop offset="1" stop-color="${shCol}" stop-opacity="0"/></radialGradient>`;
  const shadow = `<ellipse cx="${scx.toFixed(1)}" cy="${(scy - 0.45 * S).toFixed(1)}" rx="${((L + D) * 0.47 * S).toFixed(1)}" ry="${(1.5 * S).toFixed(1)}" fill="url(#shg)"/>`;
  const defs = `<defs>${grad}${shGrad}<filter id="glow" x="-60%" y="-60%" width="220%" height="220%"><feDropShadow dx="0" dy="0" stdDeviation="3.5" flood-color="#FFC861" flood-opacity="0.9"/></filter></defs>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${defs}<rect width="${W}" height="${H}" fill="url(#g)"/>${stars}${shadow}${base}${items.map((i) => i[1]).join("")}${lightsSvg}</svg>`;
}
