// Shrine Garden: an isometric Shinto shrine diorama with a torii, stone lanterns, a tiled hall, a gravel path and seasonal trees, in the Oasis Town kit.
export const meta = {
  title: "Shrine Garden",
  kind: "illustration",
  description: "A toy-like isometric shrine garden: a lacquered torii, paired stone lanterns flanking a raked gravel path, a dark-roofed hall and seasonal cherry or maple trees. Use it as a hero scene, event art or a calm brandable backdrop.",
  tags: ["isometric", "shrine", "japan", "torii", "diorama", "garden", "seasons", "lanterns"],
  price: 9,
  author: "oasis-factory",
  credit: "Isometric projection and lighting after jdan/isomer (MIT)",
  size: [1600, 1100],
};

export const params = {
  knobs: {
    backdrop: { type: "color", role: "background", label: "Backdrop", default: "#ECE8E1" },
    gate: { type: "color", role: "primary", label: "Torii lacquer", default: "#E0452B" },
    roof: { type: "color", role: "ink", label: "Roof tiles", default: "#3A3F4A" },
    glow: { type: "color", role: "highlight", label: "Lantern light", default: "#FFC46B" },
    season: { type: "choice", label: "Season", default: "spring", options: ["spring", "summer", "autumn", "winter"] },
    time: { type: "choice", label: "Time", default: "day", options: ["day", "dusk", "night"] },
    lanterns: { type: "range", label: "Lanterns", default: 6, min: 2, max: 8, step: 2 },
    seed: { type: "range", label: "Arrangement", default: 7, min: 1, max: 99, step: 1 },
    fence: { type: "toggle", label: "Stone fence", default: true },
    trees: { type: "toggle", label: "Trees", default: true },
  },
  presets: {
    Kyoto: { backdrop: "#F3E6D3", gate: "#C8371F", roof: "#6B3A2A", glow: "#FFD27A" },
    Moss: { backdrop: "#C9D8C5", gate: "#2B2B2E", roof: "#2F5A4A", glow: "#F6E7A8" },
    Sakura: { backdrop: "#FBE3EA", gate: "#E2553F", roof: "#6A4A6E", glow: "#FFB8C8" },
    Lantern: { backdrop: "#151A2A", gate: "#FF6B3D", roof: "#1F2433", glow: "#FFAA44" },
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
function tone(hex, lo, hi, smax) { const [h, s, l] = toHsl(hexRgb(hex)); return rgbHex(...fromHsl(h, Math.min(s, smax), Math.max(lo, Math.min(hi, l)))); }
function mix(a, b, t) { const A = hexRgb(a), B = hexRgb(b); return rgbHex(...A.map((v, i) => v + (B[i] - v) * t)); }
function lum(hex) { const [r, g, b] = hexRgb(hex); return (r * 299 + g * 587 + b * 114) / 1000; }
function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export default function render(p) {
  const W = 1600, H = 1100;
  const r = rng(p.seed * 9301 + 49297);
  const night = p.time === "night", dusk = p.time === "dusk";
  const dark = lum(p.backdrop) < 110 || night;
  const season = p.season, winter = season === "winter";
  const L = 14, D = 10, zTop = 1.6, zBot = -0.6;
  const spanX = (L + D + 0.8) * 0.866, spanY = (L + D + 0.8) * 0.5 + zTop - zBot;
  const S = Math.min((W - 200) / spanX, (H - 180) / spanY);
  const ox = W / 2 - ((L - D) * 0.866 * S) / 2;
  const oy = (H + spanY * S) / 2 - 10 + zBot * S;
  const LIGHT = (() => { const v = [2, -1, 3], n = Math.hypot(...v); return v.map((c) => c / n); })();
  const P = (x, y, z) => [ox + (x - y) * 0.866 * S, oy - (x + y) * 0.5 * S - z * S];
  const pts = (arr) => arr.map((q) => P(...q).map((v) => v.toFixed(1)).join(",")).join(" ");
  const shade = (hex, n) => { const m = Math.hypot(...n); return lighten(hex, (0.2 * (n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2])) / m); };

  const wood = "#5E4838";
  const gateC = tone(p.gate, 0.18, 0.5, 0.7);
  const pillarC = mix(gateC, wood, 0.3);
  const roofC = tone(p.roof, 0.14, 0.42, 0.5);
  const glowC = tone(p.glow, 0.62, 0.86, 1);
  const glowSet = new Set();
  const nightTint = (hex) => (glowSet.has(hex) ? hex : night ? mix(lighten(hex, -0.1), "#141A36", 0.5) : dusk ? mix(hex, "#7A4A5C", 0.16) : hex);
  const poly = (arr, fill, extra = "") => {
    const s = `<polygon points="${pts(arr)}" fill="${nightTint(fill)}" ${extra}/>`;
    return night && glowSet.has(fill) ? `<polygon points="${pts(arr)}" fill="${fill}" filter="url(#glow)"/>` + s : s;
  };
  const quad = (a, b, c, d, fill, extra) => poly([a, b, c, d], fill, extra);
  const line = (arr, col, w, extra = "") => `<polyline points="${pts(arr)}" fill="none" stroke="${nightTint(col)}" stroke-width="${(w * S).toFixed(2)}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;
  function box(x, y, z, dx, dy, dz, color, edge = true) {
    const st = edge ? `stroke="${nightTint(lighten(color, -0.16))}" stroke-width="0.6" stroke-linejoin="round"` : "";
    return quad([x, y, z], [x, y + dy, z], [x, y + dy, z + dz], [x, y, z + dz], shade(color, [-1, 0, 0]), st)
      + quad([x, y, z], [x + dx, y, z], [x + dx, y, z + dz], [x, y, z + dz], shade(color, [0, -1, 0]), st)
      + quad([x, y, z + dz], [x + dx, y, z + dz], [x + dx, y + dy, z + dz], [x, y + dy, z + dz], shade(color, [0, 0, 1]), st);
  }
  const items = [];
  const add = (x, y, svg) => items.push([x + y, svg]);

  const stone = winter ? "#C6C3BA" : "#B3AEA2", black = "#2A2624", snow = "#F4F7FA";
  const ground = { spring: "#B4C98C", summer: "#8FB86B", autumn: "#C7B07F", winter: "#EEF2F6" }[season];
  const gravel = winter ? "#F6F8FA" : "#DED7C7";
  const crown = { spring: ["#F7B8CF", "#F29BBA", "#FBD3E2"], summer: ["#5FA35C", "#4E8F4C", "#79B86A"], autumn: ["#E0562E", "#C9402B", "#EE8A3C"], winter: ["#F3F6F9", "#E3EAF0", "#FFFFFF"] }[season];
  const shrub = { spring: ["#6E9E57", "#7FAE62"], summer: ["#4F8A46", "#5E9A50"], autumn: ["#8E5A34", "#A0683A"], winter: ["#E6ECF1", "#D9E1E8"] }[season];
  const lampFill = night ? glowC : dusk ? mix(glowC, "#FFFFFF", 0.08) : mix(glowC, "#5A554D", 0.5);
  if (night || dusk) glowSet.add(lampFill);

  const n = Math.max(1, Math.min(4, Math.round(p.lanterns / 2)));
  const lxs = n === 1 ? [7.4] : Array.from({ length: n }, (_, i) => 3.6 + (i * 4.4) / (n - 1));
  const lan = []; for (const lx of lxs) lan.push([lx, 2.95], [lx, 7.05]);

  let base = box(-0.4, -0.4, -0.55, L + 0.8, D + 0.8, 0.55, dark ? "#2B2F38" : "#CBC6BB");
  base += quad([0, 0, 0.001], [L, 0, 0.001], [L, D, 0.001], [0, D, 0.001], ground);
  for (let k = 0; k < 8; k++) {
    const cx = 0.6 + r() * 8.6, cy = r() < 0.5 ? 0.8 + r() * 2.2 : 7.1 + r() * 2.2, rad = 0.4 + r() * 0.5;
    const ring = Array.from({ length: 7 }, (_, j) => { const a = (j / 7) * Math.PI * 2, rr = rad * (0.75 + r() * 0.4); return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, 0.003]; });
    base += poly(ring, winter ? "#E2E9F0" : lighten(ground, -0.06));
  }
  base += quad([9.3, 1.5, 0.006], [13.95, 1.5, 0.006], [13.95, 8.5, 0.006], [9.3, 8.5, 0.006], gravel);
  base += quad([0, 4, 0.006], [9.3, 4, 0.006], [9.3, 6, 0.006], [0, 6, 0.006], gravel);
  const rake = lighten(gravel, -0.07);
  for (let k = 1; k < 5; k++) base += line([[0, 4 + k * 0.4, 0.008], [9.3, 4 + k * 0.4, 0.008]], rake, 0.018);
  for (let k = 1; k <= 3; k++) { const e = k * 0.28; base += line([[10.2 - e, 2.6 - e, 0.008], [13.6 + e, 2.6 - e, 0.008], [13.6 + e, 7.4 + e, 0.008], [10.2 - e, 7.4 + e, 0.008], [10.2 - e, 2.6 - e, 0.008]], rake, 0.018); }
  for (let x = 0.35 + r() * 0.2; x < 9.0;) {
    const w = 0.5 + r() * 0.2, d = 0.8 + r() * 0.25, yc = 5 + (r() - 0.5) * 0.25;
    base += box(x, yc - d / 2, 0, w, d, 0.06, lighten(stone, -0.04), false);
    x += w + 0.24 + r() * 0.16;
  }
  if (season === "spring" || season === "autumn") {
    for (let k = 0; k < 60; k++) {
      const px = 0.3 + r() * (L - 0.6), py = 0.3 + r() * (D - 0.6);
      if (px > 10.1 && px < 13.7 && py > 2.5 && py < 7.5) continue;
      const s = 0.06, c = crown[Math.floor(r() * crown.length)];
      base += quad([px, py - s, 0.01], [px + s, py, 0.01], [px, py + s, 0.01], [px - s, py, 0.01], c);
    }
  }
  let pools = "";
  if (night || dusk) for (const [x, y] of [...lan, [10.2, 5]]) { const [cx, cy] = P(x, y, 0.01); pools += `<ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="${(1.2 * S).toFixed(1)}" ry="${(0.7 * S).toFixed(1)}" fill="url(#pool)" opacity="${night ? 0.9 : 0.4}"/>`; }

  let t = box(1.8, 6.6, 0, 0.3, 0.3, 3.3, gateC) + box(1.73, 6.53, 0, 0.44, 0.44, 0.32, black);
  t += box(1.86, 2.95, 2.5, 0.18, 4.1, 0.2, gateC);
  t += box(1.8, 3.4, 0, 0.3, 0.3, 3.3, gateC) + box(1.73, 3.33, 0, 0.44, 0.44, 0.32, black);
  t += box(1.86, 2.95, 2.5, 0.18, 0.45, 0.2, gateC);
  t += box(1.85, 4.75, 2.7, 0.16, 0.5, 0.5, black);
  t += quad([1.846, 4.82, 2.76], [1.846, 5.18, 2.76], [1.846, 5.18, 3.14], [1.846, 4.82, 3.14], "#C9A24A");
  t += quad([1.844, 4.87, 2.81], [1.844, 5.13, 2.81], [1.844, 5.13, 3.09], [1.844, 4.87, 3.09], black);
  t += box(1.75, 2.85, 3.2, 0.4, 4.3, 0.22, gateC);
  t += box(1.68, 7.4, 3.5, 0.54, 0.24, 0.2, black) + box(1.68, 2.6, 3.42, 0.54, 4.8, 0.2, black) + box(1.68, 2.36, 3.5, 0.54, 0.24, 0.2, black);
  if (winter) t += box(1.7, 2.4, 3.62, 0.5, 5.18, 0.06, snow, false);
  add(1.95, 3.5, t);

  for (const [x, y] of lan) {
    let s = box(x - 0.2, y - 0.2, 0, 0.4, 0.4, 0.14, stone) + box(x - 0.08, y - 0.08, 0.14, 0.16, 0.16, 0.6, stone);
    s += box(x - 0.18, y - 0.18, 0.74, 0.36, 0.36, 0.1, stone) + box(x - 0.13, y - 0.13, 0.84, 0.26, 0.26, 0.3, stone);
    s += quad([x - 0.134, y - 0.07, 0.9], [x - 0.134, y + 0.07, 0.9], [x - 0.134, y + 0.07, 1.08], [x - 0.134, y - 0.07, 1.08], lampFill);
    s += quad([x - 0.07, y - 0.134, 0.9], [x + 0.07, y - 0.134, 0.9], [x + 0.07, y - 0.134, 1.08], [x - 0.07, y - 0.134, 1.08], lampFill);
    s += box(x - 0.27, y - 0.27, 1.14, 0.54, 0.54, 0.06, stone);
    const cap = winter ? snow : stone;
    s += poly([[x - 0.27, y - 0.27, 1.2], [x - 0.27, y + 0.27, 1.2], [x, y, 1.44]], shade(cap, [-1, 0, 1.2]));
    s += poly([[x - 0.27, y - 0.27, 1.2], [x + 0.27, y - 0.27, 1.2], [x, y, 1.44]], shade(cap, [0, -1, 1.2]));
    s += box(x - 0.05, y - 0.05, 1.4, 0.1, 0.1, 0.12, stone);
    add(x, y, s);
  }

  const x0 = 10.6, x1 = 13.2, y0 = 3.0, y1 = 7.0, xm = (x0 + x1) / 2, ov = 0.55;
  const ex0 = x0 - ov, ex1 = x1 + ov, ey0 = y0 - ov, ey1 = y1 + ov, eave = 1.75, ridge = eave + 1.35;
  let h = box(10.2, 2.6, 0, 3.4, 4.8, 0.35, stone);
  h += box(9.9, 4.3, 0, 0.3, 1.4, 0.24, stone) + box(9.6, 4.3, 0, 0.3, 1.4, 0.12, stone);
  h += box(x0, y0, 0.35, x1 - x0, y1 - y0, 1.25, "#F2EADB");
  h += quad([x0, y0 - 0.003, 0.95], [x1, y0 - 0.003, 0.95], [x1, y0 - 0.003, 1.05], [x0, y0 - 0.003, 1.05], shade(wood, [0, -1, 0]));
  const fx = x0 - 0.004, paper = night ? glowC : dusk ? mix("#EFE6D2", glowC, 0.45) : "#EFE6D2";
  if (night) glowSet.add(paper);
  h += quad([fx, 4.42, 0.42], [fx, 5.58, 0.42], [fx, 5.58, 1.38], [fx, 4.42, 1.38], paper);
  for (let yy = 4.62; yy < 5.56; yy += 0.2) h += line([[fx, yy, 0.42], [fx, yy, 1.38]], wood, 0.014);
  for (let zz = 0.6; zz < 1.36; zz += 0.2) h += line([[fx, 4.42, zz], [fx, 5.58, zz]], wood, 0.014);
  for (const [a, b] of [[3.1, 4.3], [5.7, 6.9]]) {
    h += quad([fx, a, 0.42], [fx, b, 0.42], [fx, b, 1.38], [fx, a, 1.38], shade("#6A5040", [-1, 0, 0]));
    for (let zz = 0.58; zz < 1.36; zz += 0.16) h += line([[fx, a, zz], [fx, b, zz]], "#4A372B", 0.012);
  }
  for (const yb of [7.0, 5.7, 4.3, 3.0]) h += box(x0 - 0.14, yb - 0.1, 0.35, 0.2, 0.2, 1.3, pillarC);
  h += box(x0 - 0.16, y0 - 0.12, 1.5, 0.24, y1 - y0 + 0.24, 0.14, pillarC);
  h += box(10.3, 4.6, 0.35, 0.28, 0.8, 0.3, "#6B4A33");
  h += line([[10.2, 5, 1.62], [10.2, 5, 0.86]], "#E8E2D6", 0.035) + line([[10.2, 5, 1.62], [10.2, 5, 0.86]], pillarC, 0.035, `stroke-dasharray="${(0.05 * S).toFixed(1)} ${(0.05 * S).toFixed(1)}"`);
  const [bx, by] = P(10.2, 5, 1.55);
  h += `<circle cx="${bx.toFixed(1)}" cy="${by.toFixed(1)}" r="${(0.09 * S).toFixed(1)}" fill="${nightTint("#D4A542")}"/>`;
  const rope = Array.from({ length: 13 }, (_, i) => { const u = i / 12; return [10.32, 3.4 + u * 3.2, 1.45 - 0.16 * Math.sin(Math.PI * u)]; });
  h += line(rope, "#D9C27E", 0.075) + line(rope, "#A88E4C", 0.04, `stroke-dasharray="${(0.04 * S).toFixed(1)} ${(0.06 * S).toFixed(1)}"`);
  for (const yy of [3.95, 4.7, 5.3, 6.05]) {
    const zt = 1.45 - 0.16 * Math.sin((Math.PI * (yy - 3.4)) / 3.2) - 0.03;
    h += poly([[10.32, yy, zt], [10.32, yy + 0.08, zt], [10.32, yy + 0.08, zt - 0.1], [10.32, yy + 0.14, zt - 0.1], [10.32, yy + 0.14, zt - 0.22], [10.32, yy + 0.06, zt - 0.22], [10.32, yy + 0.06, zt - 0.12], [10.32, yy, zt - 0.12]], "#FBFAF6");
  }
  const slope = (c, nx) => (winter ? mix(shade(c, [nx, 0, 1.37]), snow, 0.78) : shade(c, [nx, 0, 1.37]));
  h += poly([[x0 + 0.1, y0 - 0.1, eave - 0.1], [xm, y0 - 0.1, ridge - 0.2], [x1 - 0.1, y0 - 0.1, eave - 0.1]], shade(wood, [0, -1, 0]));
  h += quad([xm, ey0, ridge], [xm, ey1, ridge], [ex1, ey1, eave], [ex1, ey0, eave], slope(roofC, 1));
  h += quad([ex0, ey0, eave], [ex0, ey1, eave], [xm, ey1, ridge], [xm, ey0, ridge], slope(roofC, -1));
  for (let yy = ey0 + 0.2; yy < ey1 - 0.05; yy += 0.22) h += line([[ex0, yy, eave], [xm, yy, ridge]], winter ? "#D9E0E8" : lighten(roofC, -0.08), 0.02);
  const edgeC = lighten(roofC, -0.1);
  h += quad([ex0, ey0, eave], [ex0, ey1, eave], [ex0, ey1, eave - 0.13], [ex0, ey0, eave - 0.13], shade(edgeC, [-1, 0, 0]));
  h += poly([[ex0, ey0, eave], [xm, ey0, ridge], [ex1, ey0, eave], [ex1, ey0, eave - 0.13], [xm, ey0, ridge - 0.13], [ex0, ey0, eave - 0.13]], shade(edgeC, [0, -1, 0]));
  h += box(xm - 0.15, ey0 + 0.05, ridge - 0.05, 0.3, ey1 - ey0 - 0.1, 0.18, winter ? snow : lighten(roofC, -0.05));
  for (const yy of [4.0, 5.0, 6.0]) h += box(xm - 0.32, yy - 0.08, ridge + 0.13, 0.64, 0.16, 0.13, lighten(roofC, 0.04));
  for (const yy of [ey1 - 0.15, ey0 + 0.15]) h += line([[xm - 0.45, yy, ridge + 0.6], [xm + 0.12, yy, ridge]], roofC, 0.07) + line([[xm + 0.45, yy, ridge + 0.6], [xm - 0.12, yy, ridge]], roofC, 0.07);
  add(xm, 5, h);

  if (p.fence) {
    const fc = lighten(stone, 0.03);
    const run = (ax, ay, bx2, by2) => {
      const len = Math.hypot(bx2 - ax, by2 - ay), k = Math.max(1, Math.round(len / 0.7)), alongX = by2 === ay;
      for (let i = 0; i <= k; i++) {
        const px = ax + ((bx2 - ax) * i) / k, py = ay + ((by2 - ay) * i) / k;
        let s = "";
        if (i < k) s += alongX ? box(px + 0.16, py + 0.02, 0.4, len / k - 0.16, 0.12, 0.1, fc) : box(px + 0.02, py + 0.16, 0.4, 0.12, len / k - 0.16, 0.1, fc);
        s += box(px, py, 0, 0.16, 0.16, 0.62, fc);
        if (winter) s += box(px - 0.01, py - 0.01, 0.62, 0.18, 0.18, 0.04, snow, false);
        add(px + 0.08, py + 0.08, s);
      }
    };
    run(0.12, 0.12, L - 0.28, 0.12); run(0.12, D - 0.28, L - 0.28, D - 0.28); run(L - 0.28, 0.12, L - 0.28, D - 0.28);
    run(0.12, 0.12, 0.12, 3.3); run(0.12, 6.7, 0.12, D - 0.28);
  }

  const tree = (x, y, big) => {
    const th = big ? 0.95 : 0.8;
    let s = box(x - 0.09, y - 0.09, 0, 0.18, 0.18, th + 0.2, "#6E5040");
    const blobs = [], cnt = (winter ? 5 : 9) + Math.floor(r() * 3), sp = big ? 1.0 : 0.8;
    for (let k = 0; k < cnt; k++) { const bs = winter ? 0.26 + r() * 0.16 : 0.34 + r() * 0.24; blobs.push([x - sp / 2 + r() * sp - bs / 2, y - sp / 2 + r() * sp - bs / 2, th + r() * 0.75, bs]); }
    blobs.sort((a, b) => b[0] + b[1] - (a[0] + a[1]) || a[2] - b[2]);
    for (const [bx2, by2, bz, bs] of blobs) s += box(bx2, by2, bz, bs, bs, bs, crown[Math.floor(r() * crown.length)]);
    return s;
  };
  const taken = lan.map(([x, y]) => [x, y, 0.9]);
  const slots = [[1.0, 8.75, true], [7.3, 8.7, false], [9.3, 8.95, true], [12.6, 8.9, true], [13.3, 0.95, false], [8.85, 1.0, false]];
  for (const [sx0, sy0, big] of slots) {
    const x = sx0 + (r() - 0.5) * 0.35, y = sy0 + (r() - 0.5) * 0.2;
    if (p.trees) add(x, y, tree(x, y, big));
    taken.push([x, y, 1.3]);
  }
  for (let k = 0, tries = 0; k < 5 && tries < 80; tries++) {
    const x = 0.9 + r() * 7.3, y = 0.85 + r() * 1.1;
    if (taken.some(([a, b, c]) => Math.hypot(a - x, b - y) < c + 0.4)) continue;
    taken.push([x, y, 0.8]); k++;
    let s = "";
    if (k % 3 === 0) s = box(x - 0.22, y - 0.18, 0, 0.44, 0.36, 0.22, lighten(stone, -0.08)) + box(x + 0.1, y + 0.05, 0, 0.24, 0.22, 0.14, lighten(stone, -0.12));
    else {
      const c = shrub[k % 2];
      s += box(x - 0.3, y - 0.22, 0.01, 0.42, 0.42, 0.3, c) + box(x + 0.02, y - 0.12, 0.01, 0.32, 0.32, 0.24, lighten(c, -0.03));
      s += box(x - 0.16, y - 0.1, 0.3, 0.3, 0.28, 0.16, lighten(c, 0.05));
    }
    add(x, y, s);
  }

  items.sort((a, b) => b[0] - a[0]);
  const sky = night ? mix(p.backdrop, "#0E1328", 0.62) : dusk ? mix(p.backdrop, "#F2B49A", 0.35) : p.backdrop;
  const gTop = night ? mix(sky, "#2A3358", 0.6) : lighten(sky, 0.04);
  let celestial = "";
  if (night) celestial = `<circle cx="1320" cy="170" r="70" fill="#F4F1E6" opacity="0.08"/><circle cx="1320" cy="170" r="34" fill="#F4F1E6"/>`;
  if (dusk) celestial = `<circle cx="260" cy="190" r="80" fill="${mix(glowC, "#FF8A5C", 0.4)}" opacity="0.18"/><circle cx="260" cy="190" r="44" fill="${mix(glowC, "#FF8A5C", 0.4)}" opacity="0.92"/>`;
  let flakes = "";
  if (winter) {
    const fl = lum(sky) < 170 ? "#FFFFFF" : "#AEBBC8";
    for (let k = 0; k < 70; k++) flakes += `<circle cx="${(r() * W).toFixed(0)}" cy="${(r() * H).toFixed(0)}" r="${(1.5 + r() * 2.5).toFixed(1)}" fill="${fl}" opacity="${(0.45 + r() * 0.4).toFixed(2)}"/>`;
  }
  const [sx, sy] = P(L / 2, D / 2, -0.55);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><defs>`
    + `<radialGradient id="g" cx="50%" cy="38%" r="65%"><stop offset="0" stop-color="${gTop}"/><stop offset="1" stop-color="${sky}"/></radialGradient>`
    + `<radialGradient id="pool"><stop offset="0" stop-color="${glowC}" stop-opacity="0.55"/><stop offset="0.5" stop-color="${glowC}" stop-opacity="0.2"/><stop offset="1" stop-color="${glowC}" stop-opacity="0"/></radialGradient>`
    + `<filter id="glow" x="-150%" y="-150%" width="400%" height="400%"><feGaussianBlur stdDeviation="${(0.09 * S).toFixed(1)}"/></filter>`
    + `<filter id="soft" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="18"/></filter></defs>`
    + `<rect width="${W}" height="${H}" fill="url(#g)"/>${celestial}`
    + `<ellipse cx="${sx.toFixed(1)}" cy="${(sy + 24).toFixed(1)}" rx="${((L + D) * 0.42 * S).toFixed(1)}" ry="${(1.1 * S).toFixed(1)}" fill="#000" opacity="${dark ? 0.35 : 0.14}" filter="url(#soft)"/>`
    + base + pools + items.map((i) => i[1]).join("") + flakes + `</svg>`;
}
