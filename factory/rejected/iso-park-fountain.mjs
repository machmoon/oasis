// Oasis Park: an isometric park diorama with a tiered round fountain, paths, flower bed, benches, lamps, a cubic tree grove and a playground.
export const meta = {
  title: "Oasis Park",
  kind: "illustration",
  description: "A toy-like isometric park with a tiered stone fountain and ducks, cross paths, a planted flower bed, benches, glowing lamp posts, a seasonal grove of cubic trees and a playground slide. Use it for hero art, onboarding screens or civic and lifestyle brands.",
  tags: ["isometric", "park", "fountain", "diorama", "trees", "playground", "3d", "seasons"],
  price: 7,
  author: "oasis-factory",
  size: [1600, 1100],
};

export const params = {
  knobs: {
    backdrop: { type: "color", role: "background", label: "Backdrop", default: "#E9ECF1" },
    water: { type: "color", role: "secondary", label: "Water", default: "#3FA7D6" },
    path: { type: "color", role: "surface", label: "Paths", default: "#E3D6BE" },
    accent: { type: "color", role: "primary", label: "Benches, slide & flowers", default: "#E5484D" },
    season: { type: "choice", label: "Season", default: "spring", options: ["spring", "summer", "autumn", "winter"] },
    time: { type: "choice", label: "Time", default: "day", options: ["day", "dusk", "night"] },
    density: { type: "range", label: "Tree density", default: 0.6, min: 0.1, max: 1, step: 0.05 },
    tiers: { type: "range", label: "Fountain tiers", default: 2, min: 1, max: 3, step: 1 },
    seed: { type: "range", label: "Arrangement", default: 7, min: 1, max: 99, step: 1 },
    playground: { type: "toggle", label: "Playground", default: true },
  },
  presets: {
    Lagoon: { backdrop: "#BFE3DC", water: "#0FA3A0", path: "#FFF1D2", accent: "#FF8A3D" },
    Terracotta: { backdrop: "#F3E2D3", water: "#3D7FB8", path: "#C47A52", accent: "#2F6F5E" },
    Sorbet: { backdrop: "#FBE3EC", water: "#62B6F0", path: "#F7D6E0", accent: "#7D5BA6" },
    Midnight: { backdrop: "#131722", water: "#38C6F4", path: "#B9B4C8", accent: "#C8F03C" },
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
function guardWater(hex) {
  let [h, s, l] = toHsl(hexRgb(hex));
  const lo = 0.47, hi = 0.61, d = (a, b) => Math.min(Math.abs(a - b), 1 - Math.abs(a - b));
  if (h < lo || h > hi) h = d(h, lo) < d(h, hi) ? lo : hi;
  return rgbHex(...fromHsl(h, Math.max(0.42, s), Math.min(0.6, Math.max(0.38, l))));
}
function guardPaint(hex) {
  let [h, s, l] = toHsl(hexRgb(hex));
  s = Math.min(s, 0.7); l = Math.min(0.54, Math.max(0.36, l));
  if (h > 0.14 && h < 0.45) { l = Math.min(l, 0.4); s = Math.min(s, 0.6); }
  return rgbHex(...fromHsl(h, s, l));
}
function guardBloom(hex) {
  const [h, s, l] = toHsl(hexRgb(hex));
  if ((h > 0.12 && h < 0.5) || s < 0.3) return "#E5577A";
  return rgbHex(...fromHsl(h, Math.max(0.55, s), Math.min(0.66, Math.max(0.5, l))));
}
function guardPath(hex) { const [h, s, l] = toHsl(hexRgb(hex)); return rgbHex(...fromHsl(h, Math.min(s, 0.5), Math.min(0.9, Math.max(0.56, l)))); }

export default function render(p) {
  const W = 1600, H = 1100, G = 16, C = 8, R = 2.5, RI = 2.15, TAU = Math.PI * 2;
  const r = rng(p.seed * 7717 + 13);
  const flip = rng(p.seed * 131 + 7)() < 0.5, everFrac = 0.16 + r() * 0.26;
  const night = p.time === "night", dusk = p.time === "dusk";
  const season = p.season, winter = season === "winter", tiersN = Math.round(p.tiers);
  const sky0 = night ? mix(p.backdrop, "#0A0F20", 0.72) : dusk ? mix(p.backdrop, "#F2B8A0", 0.35) : p.backdrop;
  const sky = winter && !night && lum(p.backdrop) >= 110 ? mix(sky0, "#C3D0DE", 0.22) : sky0;
  const darkBg = lum(sky) < 110, dark = darkBg || night;
  const zTop = 3.6, slabH = 0.55;
  const S = Math.min((W - 220) / (2 * G * 0.866), (H - 200) / (G + zTop + 0.8));
  const ox = W / 2, oy = (H + (G + zTop - slabH) * S) / 2 + 6;
  const LIGHT = (() => { const v = [2, -1, 3], n = Math.hypot(...v); return v.map((c) => c / n); })();
  let MIR = false;
  const P = (x, y, z) => { if (MIR) [x, y] = [y, x]; return [ox + (x - y) * 0.866 * S, oy - (x + y) * 0.5 * S - z * S]; };
  const pts = (arr) => arr.map((q) => P(...q).map((v) => v.toFixed(1)).join(",")).join(" ");
  const shade = (hex, n) => { const m = MIR ? [n[1], n[0], n[2]] : n; return lighten(hex, 0.2 * (m[0] * LIGHT[0] + m[1] * LIGHT[1] + m[2] * LIGHT[2])); };
  const LIT = "#FFD58A";
  const nightTint = (hex) => (hex === LIT ? hex : night ? mix(lighten(hex, -0.14), "#22305E", 0.34) : dusk ? mix(hex, "#7A4A5C", 0.16) : hex);
  const poly = (arr, fill, extra = "") => `<polygon points="${pts(arr)}" fill="${nightTint(fill)}" ${extra}${night && fill === LIT ? ' filter="url(#lit)"' : ""}/>`;
  const quad = (a, b, c, d, fill, extra) => poly([a, b, c, d], fill, extra);
  const line = (arr, col, w, op = 1) => `<polyline points="${pts(arr)}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" opacity="${op}"/>`;
  const circ = (cx, cy, rad, z, n = 40) => Array.from({ length: n }, (_, i) => [cx + rad * Math.cos((i / n) * TAU), cy + rad * Math.sin((i / n) * TAU), z]);
  function box(x, y, z, dx, dy, dz, color, edge = true) {
    const st = edge ? `stroke="${nightTint(lighten(color, -0.18))}" stroke-width="0.6" stroke-linejoin="round"` : "";
    return quad([x, y, z], [x, y + dy, z], [x, y + dy, z + dz], [x, y, z + dz], shade(color, [-1, 0, 0]), st)
      + quad([x, y, z], [x + dx, y, z], [x + dx, y, z + dz], [x, y, z + dz], shade(color, [0, -1, 0]), st)
      + quad([x, y, z + dz], [x + dx, y, z + dz], [x + dx, y + dy, z + dz], [x, y + dy, z + dz], shade(color, [0, 0, 1]), st);
  }
  function cyl(cx, cy, rad, z0, h, col, n = 28, topCol = col) {
    let s = "";
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * TAU, a1 = ((i + 1) / n) * TAU, am = (a0 + a1) / 2, c = Math.cos(am), si = Math.sin(am);
      if (c + si >= 0) continue;
      const f = shade(col, [c, si, 0]);
      s += quad([cx + rad * Math.cos(a0), cy + rad * Math.sin(a0), z0], [cx + rad * Math.cos(a1), cy + rad * Math.sin(a1), z0], [cx + rad * Math.cos(a1), cy + rad * Math.sin(a1), z0 + h], [cx + rad * Math.cos(a0), cy + rad * Math.sin(a0), z0 + h], f, `stroke="${nightTint(f)}" stroke-width="0.6"`);
    }
    return s + poly(circ(cx, cy, rad, z0 + h, n), shade(topCol, [0, 0, 1]), `stroke="${nightTint(lighten(col, -0.12))}" stroke-width="0.6"`);
  }
  const items = [];
  const add = (x, y, svg) => items.push([x + y, svg]);

  // ---------- palette (brand colours pass through role guards) ----------
  const grass = { spring: "#A9C48A", summer: "#8DBA6E", autumn: "#C9B58E", winter: "#E6ECF2" }[season];
  const foliage = { spring: ["#F7B8CF", "#F29BBA", "#FBD3E2"], summer: ["#5FA35C", "#4E8F4C", "#79B86A"], autumn: ["#E58A3A", "#D4642E", "#F0B048"], winter: [] }[season];
  const waterC = winter ? mix(guardWater(p.water), "#EEF5F9", 0.6) : guardWater(p.water);
  let pathC = guardPath(p.path);
  for (let k = 0; k < 3 && Math.abs(lum(pathC) - lum(grass)) < 50; k++) pathC = lighten(pathC, lum(pathC) >= lum(grass) && lum(grass) < 200 ? 0.12 : -0.12);
  const stone = lum(pathC) > 170 ? "#C4C9D0" : "#E6E2DA", snow = "#F7F9FB", bark = "#6E5140";
  const iron = darkBg ? "#5B6375" : "#3A3F48", acc = guardPaint(p.accent), bloomC = guardBloom(p.accent);
  const spray = night ? lighten(guardWater(p.water), 0.38) : nightTint(lighten(waterC, 0.32));
  const hedge = winter ? "#4E7B63" : season === "autumn" ? "#8C7A3C" : "#5E9A55";
  let slabC = night ? "#5A6582" : darkBg ? mix(sky, "#9AA3B8", 0.5) : winter ? "#A7B2C0" : "#C9CED6";
  for (let k = 0; k < 4 && Math.abs(lum(slabC) - lum(sky)) < 45; k++) slabC = lighten(slabC, lum(sky) > 128 ? -0.08 : 0.08);

  // ---------- layout: lamps and benches on the path arms, flower bed front, playground on a seeded side ----------
  const lampPts = [], benches = [];
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    lampPts.push([C + dx * 4.9 - (dx === 0 ? 1.05 : 0), C + dy * 4.9 - (dy === 0 ? 1.05 : 0)]);
    lampPts.push([C + dx * 6.25 + (dx === 0 ? 1.05 : 0), C + dy * 6.25 + (dy === 0 ? 1.05 : 0)]);
    benches.push(dx !== 0 ? [C + dx * 4.6 - 0.6, C + 0.88, C + dx * 4.6 + 0.6, C + 1.3, "x"] : [C + 0.88, C + dy * 4.6 - 0.6, C + 1.3, C + dy * 4.6 + 0.6, "y"]);
  }
  const play = [C + 2, 0.55, C + 6.3, 4.8], pr = flip ? [play[1], play[0], play[3], play[2]] : play;
  const px = play[0] + 2.2, py = 3.2;
  const bed = [C - 5.2, C - 5.2, 2.6];

  // ---------- base slab, lawn, paths ----------
  let base = box(-0.4, -0.4, -slabH, G + 0.8, G + 0.8, slabH, slabC);
  base += quad([0, 0, 0.001], [G, 0, 0.001], [G, G, 0.001], [0, G, 0.001], grass);
  for (let i = 0; i < G; i += 2) base += quad([0, i, 0.004], [G, i, 0.004], [G, i + 1, 0.004], [0, i + 1, 0.004], lighten(grass, winter ? -0.02 : 0.03));
  base += line([[0, G, 0.005], [0, 0, 0.005], [G, 0, 0.005]], nightTint(lighten(grass, -0.2)), 1.4, 0.8);
  if (dark) base += line([[-0.4, G + 0.4, 0], [-0.4, -0.4, 0], [G + 0.4, -0.4, 0]], night ? "#9FB0D8" : lighten(slabC, 0.2), 1.4, 0.7);
  base += box(0, C - 0.8, 0, G, 1.6, 0.06, pathC, false) + box(C - 0.8, 0, 0, 1.6, G, 0.06, pathC, false);
  const seamC = nightTint(lighten(pathC, -0.08)), kerb = nightTint(lighten(pathC, -0.22));
  for (let i = 0.5; i < G; i += 1) {
    if (Math.abs(i - C) < R + 1.2) continue;
    base += line([[i, C - 0.8, 0.062], [i, C + 0.8, 0.062]], seamC, 0.8) + line([[C - 0.8, i, 0.062], [C + 0.8, i, 0.062]], seamC, 0.8);
  }
  for (const v of [C - 0.8, C + 0.8]) base += line([[0, v, 0.063], [G, v, 0.063]], kerb, 1.1) + line([[v, 0, 0.063], [v, G, 0.063]], kerb, 1.1);
  base += cyl(C, C, R + 1.2, 0, 0.06, pathC, 48);
  base += `<polygon points="${pts(circ(C, C, R + 0.6, 0.062, 48))}" fill="none" stroke="${seamC}" stroke-width="0.9" stroke-dasharray="6 5"/>`;
  if (p.playground) {
    MIR = flip;
    base += box(play[0] + 0.2, play[1] + 0.2, 0, 3.9, 3.85, 0.12, "#A97B55") + quad([play[0] + 0.32, play[1] + 0.32, 0.121], [play[0] + 3.98, play[1] + 0.32, 0.121], [play[0] + 3.98, play[1] + 3.93, 0.121], [play[0] + 0.32, play[1] + 3.93, 0.121], winter ? "#F1EEE8" : "#E9D3A3");
    MIR = false;
  }
  {
    const [bx, by, bw] = bed, t = 0.22, hh = 0.3;
    const blooms = season === "autumn" ? foliage : [bloomC, lighten(bloomC, 0.14), "#FFF4D6"];
    const cap = (x, y, dx, dy, z) => (winter ? box(x, y, z, dx, dy, 0.05, snow, false) : "");
    const wall = (x, y, dx, dy) => box(x, y, 0.01, dx, dy, hh, hedge) + cap(x, y, dx, dy, 0.01 + hh);
    base += quad([bx, by, 0.01], [bx + bw, by, 0.01], [bx + bw, by + bw, 0.01], [bx, by + bw, 0.01], winter ? snow : "#8A6A4E");
    base += wall(bx, by + bw - t, bw, t) + wall(bx + bw - t, by, t, bw - t);
    const n = 4, st = (bw - 2 * t) / n, cells = [];
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) cells.push([i, j]);
    cells.sort((a, b) => b[0] + b[1] - (a[0] + a[1]));
    for (const [i, j] of cells) {
      const cx = bx + t + (i + 0.5) * st, cy = by + t + (j + 0.5) * st;
      base += box(cx - 0.15, cy - 0.15, 0.01, 0.3, 0.3, 0.24, winter ? hedge : lighten(hedge, 0.05));
      base += winter ? cap(cx - 0.16, cy - 0.16, 0.32, 0.32, 0.25) : box(cx - 0.09, cy - 0.09, 0.25, 0.18, 0.18, 0.16, blooms[(i * 3 + j * 2) % 3]);
    }
    base += wall(bx, by, t, bw - t) + wall(bx + t, by, bw - 2 * t, t);
  }
  if (night || dusk) for (const [lx, ly] of lampPts) { const [gx, gy] = P(lx, ly, 0.07); base += `<ellipse cx="${gx.toFixed(1)}" cy="${gy.toFixed(1)}" rx="${(1.6 * S * 1.2247).toFixed(1)}" ry="${(1.6 * S * 0.707).toFixed(1)}" fill="url(#pool)"/>`; }

  // ---------- fountain: stone basin, water (ice in winter), ducks, tiered bowls and spray ----------
  let jetTop = 0;
  {
    const h = 0.55, wz = 0.4, n = 40, rimC = winter ? snow : stone;
    const at = (rad, a, z) => [C + rad * Math.cos(a), C + rad * Math.sin(a), z];
    const seam = `stroke="${nightTint(lighten(stone, -0.16))}" stroke-width="0.7" stroke-linejoin="round"`;
    let far = "", inner = "", near = "", outer = "";
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * TAU, a1 = ((i + 1) / n) * TAU, am = (a0 + a1) / 2, c = Math.cos(am), si = Math.sin(am);
      const top = quad(at(R, a0, h), at(R, a1, h), at(RI, a1, h), at(RI, a0, h), shade(rimC, [0, 0, 1]), seam);
      if (c + si < 0) { near += top; const f = shade(stone, [c, si, 0]); outer += quad(at(R, a0, 0.06), at(R, a1, 0.06), at(R, a1, h), at(R, a0, h), f, `stroke="${nightTint(f)}" stroke-width="0.6"`); }
      else { far += top; const f = shade(stone, [-c, -si, 0]); inner += quad(at(RI, a0, h), at(RI, a1, h), at(RI, a1, wz), at(RI, a0, wz), f, `stroke="${nightTint(f)}" stroke-width="0.6"`); }
    }
    let pool = poly(circ(C, C, RI, wz, 48), waterC);
    if (night) { const [gx, gy] = P(C, C, wz); pool += `<ellipse cx="${gx.toFixed(1)}" cy="${gy.toFixed(1)}" rx="${(RI * S * 1.2247).toFixed(1)}" ry="${(RI * S * 0.707).toFixed(1)}" fill="url(#wg)"/>`; }
    if (winter) for (const [a, l1, a2] of [[0.3, 1.9, 0.5], [2.4, 1.7, 2.1], [4.2, 2.0, 4.5]]) pool += line([at(0.35, a, wz + 0.004), at(1.1, a + 0.15, wz + 0.004), at(l1, a2, wz + 0.004)], "#FFFFFF", 1.2, 0.8);
    else for (const k of [0.8, 1.35, 1.85]) pool += `<polygon points="${pts(circ(C, C, k, wz + 0.004, 40))}" fill="none" stroke="${nightTint(lighten(waterC, 0.16))}" stroke-width="1.1" opacity="0.7"/>`;
    let ducks = "";
    if (!winter) {
      const dr = rng(p.seed * 53 + 3), a1 = (0.44 + dr() * 0.14) * TAU, dRad = tiersN === 1 ? 1.05 : 1.5;
      for (const a of [a1, a1 + (0.2 + dr() * 0.07) * TAU]) { const [ux, uy] = at(dRad, a, 0); ducks += box(ux - 0.14, uy - 0.09, wz, 0.28, 0.18, 0.12, "#FFFFFF") + box(ux - 0.16, uy - 0.05, wz + 0.12, 0.1, 0.1, 0.1, "#FFFFFF") + box(ux - 0.22, uy - 0.03, wz + 0.15, 0.06, 0.05, 0.03, "#F2A33A"); }
    }
    let col = "", z = wz;
    const levels = [[RI, wz]];
    col += cyl(C, C, 0.3, z, 0.75, stone); z += 0.75;
    const bowls = [[1.05, 0.92, 0.24], [0.62, 0.52, 0.2]];
    for (let t = 0; t < tiersN - 1; t++) {
      const [br, wr, bh] = bowls[t], lowZ = levels[levels.length - 1][1];
      col += cyl(C, C, br, z, bh, stone, 28, rimC) + poly(circ(C, C, wr, z + bh - 0.03, 32), waterC);
      if (winter) for (let i = 0; i < 9; i++) { const a = (0.39 + i * 0.055) * TAU, len = 0.18 + 0.1 * (i % 3); col += `<polygon points="${pts([at(br, a - 0.05, z), at(br, a + 0.05, z), at(br + 0.02, a, z - len)])}" fill="#F4FAFD" opacity="0.9"/>`; }
      else {
        const arcT = [], arcB = [];
        for (let i = 0; i <= 16; i++) { const a = (0.75 + i / 32) * TAU; arcT.push(at(br, a, z + bh)); arcB.unshift(at(br + 0.1, a, lowZ)); }
        col += `<polygon points="${pts(arcT.concat(arcB))}" fill="${night ? spray : nightTint(lighten(waterC, 0.22))}" opacity="0.5"/>`;
      }
      levels.push([wr, z + bh - 0.03]); z += bh;
      col += cyl(C, C, 0.2 - t * 0.05, z, 0.55, stone); z += 0.55;
    }
    col += cyl(C, C, 0.12, z, 0.14, lighten(stone, 0.05), 28, winter ? snow : lighten(stone, 0.05)); z += 0.14;
    const [lr, lz] = levels[levels.length - 1], land = lr * 0.72, rise = 0.45 + 0.12 * tiersN, d = z - lz;
    const A = 2 * (rise + Math.sqrt(rise * rise + rise * d)), B = A + d;
    let sprB = "", sprF = "";
    jetTop = z + rise + 0.4;
    if (!winter) {
      for (let j = 0; j < 10; j++) {
        const a = ((j + 0.5) / 10) * TAU, c = Math.cos(a), si = Math.sin(a), arr = [];
        for (let k = 0; k <= 12; k++) { const t = k / 12; arr.push([C + c * land * t, C + si * land * t, z + A * t - B * t * t]); }
        const sv = line(arr, spray, 2.6, 0.88) + `<polygon points="${pts(circ(C + c * land, C + si * land, 0.13, lz + 0.005, 12))}" fill="none" stroke="${spray}" stroke-width="1" opacity="0.8"/>`;
        if (c + si > 0) sprB += sv; else sprF += sv;
      }
      sprF += line([[C, C, z], [C, C, jetTop]], spray, 3.4, 0.92);
    }
    add(C, C, far + inner + pool + sprB + col + ducks + sprF + near + outer);
  }

  // ---------- lamps and benches ----------
  const lampOn = night || dusk;
  for (const [x, y] of lampPts) add(x, y, box(x - 0.09, y - 0.09, 0.06, 0.18, 0.18, 0.12, iron) + box(x - 0.04, y - 0.04, 0.18, 0.08, 0.08, 1.9, iron) + box(x - 0.14, y - 0.14, 2.08, 0.28, 0.28, 0.32, lampOn ? LIT : "#F1ECE0", !lampOn) + box(x - 0.17, y - 0.17, 2.4, 0.34, 0.34, 0.06, iron) + (winter ? box(x - 0.17, y - 0.17, 2.46, 0.34, 0.34, 0.05, snow, false) : ""));
  for (const [x0, y0, x1, y1, o] of benches) {
    let s;
    if (o === "x") s = box(x0 + 0.1, y0 + 0.05, 0.06, 0.08, 0.3, 0.36, iron) + box(x1 - 0.18, y0 + 0.05, 0.06, 0.08, 0.3, 0.36, iron) + box(x0, y1 - 0.08, 0.5, 1.2, 0.07, 0.38, acc) + box(x0, y0, 0.42, 1.2, 0.36, 0.07, acc);
    else s = box(x0 + 0.05, y0 + 0.1, 0.06, 0.3, 0.08, 0.36, iron) + box(x0 + 0.05, y1 - 0.18, 0.06, 0.3, 0.08, 0.36, iron) + box(x1 - 0.08, y0, 0.5, 0.07, 1.2, 0.38, acc) + box(x0, y0, 0.42, 0.36, 1.2, 0.07, acc);
    add((x0 + x1) / 2, (y0 + y1) / 2, s);
  }

  // ---------- playground: slide tower and seesaw (mirrored to the left lawn on some seeds) ----------
  if (p.playground) {
    MIR = flip;
    const pw = 0.9, ph = 1.3, post = "#EEF0F3", x0 = px + 0.2, x1 = px + 0.7;
    const postAt = (i, j) => box(px + i * (pw - 0.1), py + j * (pw - 0.1), 0.13, 0.1, 0.1, ph + 0.62, post);
    let s = postAt(1, 1) + box(px, py, ph, pw, pw, 0.1, lighten(acc, -0.12)) + postAt(1, 0) + postAt(0, 1) + postAt(0, 0);
    const o = 0.12, ap = [px + pw / 2, py + pw / 2, ph + 1.2], rz = ph + 0.75;
    s += poly([[px - o, py - o, rz], [px - o, py + pw + o, rz], ap], shade(winter ? snow : acc, [-0.7, 0, 0.7])) + poly([[px - o, py - o, rz], [px + pw + o, py - o, rz], ap], shade(acc, [0, -0.7, 0.7]));
    for (const yy of [py + 0.25, py + 0.65]) s += line([[px - 0.55, yy, 0.13], [px, yy, ph + 0.1]], nightTint(post), 2.4);
    for (let k = 1; k < 5; k++) { const t = k / 5; s += line([[px - 0.55 + 0.55 * t, py + 0.25, 0.13 + (ph - 0.03) * t], [px - 0.55 + 0.55 * t, py + 0.65, 0.13 + (ph - 0.03) * t]], nightTint(post), 1.8); }
    s += box(x0 + 0.2, py - 2.15, 0.13, 0.08, 0.08, 0.2, iron);
    s += quad([x0, py, ph + 0.05], [x1, py, ph + 0.05], [x1, py - 1.9, 0.33], [x0, py - 1.9, 0.33], shade(acc, [0, -0.6, 0.8])) + quad([x0, py - 1.9, 0.33], [x1, py - 1.9, 0.33], [x1, py - 2.3, 0.3], [x0, py - 2.3, 0.3], shade(acc, [0, 0, 1]));
    s += quad([x1, py, ph + 0.05], [x1, py - 2.3, 0.3], [x1, py - 2.3, 0.44], [x1, py, ph + 0.19], shade(acc, [-1, 0, 0]));
    s += quad([x0, py, ph + 0.05], [x0, py - 2.3, 0.3], [x0, py - 2.3, 0.44], [x0, py, ph + 0.19], shade(acc, [-1, 0, 0]), `stroke="${nightTint(lighten(acc, -0.2))}" stroke-width="0.6"`);
    const sx0 = play[0] + 0.7, sx1 = play[0] + 1.9, sy = 1.55, sw = 0.22, plank = lighten(acc, 0.12);
    let ss = box(play[0] + 1.24, sy, 0.13, 0.12, sw, 0.24, iron);
    ss += quad([sx0, sy, 0.24], [sx1, sy, 0.62], [sx1, sy, 0.68], [sx0, sy, 0.3], shade(plank, [0, -1, 0])) + quad([sx0, sy, 0.3], [sx1, sy, 0.68], [sx1, sy + sw, 0.68], [sx0, sy + sw, 0.3], shade(plank, [-0.3, 0, 0.95]));
    ss += box(sx0 + 0.12, sy + 0.08, 0.34, 0.05, 0.06, 0.22, iron) + box(sx1 - 0.18, sy + 0.08, 0.72, 0.05, 0.06, 0.22, iron);
    MIR = false;
    add(px + pw / 2, py + pw / 2, s);
    add(play[0] + 1.3, sy + 0.1, ss);
  }

  // ---------- trees: dart-throw against every footprint and silhouette; density sets spacing so all lawns fill evenly ----------
  const inRect = (x, y, x0, y0, x1, y1, pad) => x > x0 - pad && x < x1 + pad && y > y0 - pad && y < y1 + pad;
  const free = (x, y) => {
    if (x < 0.6 || y < 0.6 || x > G - 0.6 || y > G - 0.6) return false;
    if (Math.abs(x - C) < 1.35 || Math.abs(y - C) < 1.35 || Math.hypot(x - C, y - C) < R + 1.85) return false;
    if (lampPts.some(([lx, ly]) => Math.hypot(x - lx, y - ly) < 1.2)) return false;
    if (benches.some((b) => inRect(x, y, b[0], b[1], b[2], b[3], 0.8))) return false;
    if (inRect(x, y, bed[0], bed[1], bed[0] + bed[2], bed[1] + bed[2], 0.65)) return false;
    return !(p.playground && inRect(x, y, pr[0], pr[1], pr[2], pr[3], 0.55));
  };
  const keep = lampPts.map(([x, y]) => [x, y, 0.25, 1.3]).concat(benches.map((b) => [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2, 0.75, 0]), [[bed[0] + bed[2] / 2, bed[1] + bed[2] / 2, 1.9, 0]]);
  if (p.playground) for (const [kx, ky, hw, bk] of [[px + 0.45, py + 0.45, 0.7, 2.6], [px + 0.45, 1.6, 0.6, 0.3], [play[0] + 1.3, 1.65, 0.7, 0.3]]) keep.push(flip ? [ky, kx, hw, bk] : [kx, ky, hw, bk]);
  const hides = (x, y) => keep.some(([kx, ky, hw, bk]) => { const dd = kx + ky - x - y; return Math.abs(x - y - kx + ky) < hw + 1.05 && dd > -bk && dd < 4.3; });
  const spacing = 1.2 + (1 - p.density) * 1.9, cand = [];
  for (let gx = 0.75; gx < G - 0.5; gx += 0.5) for (let gy = 0.75; gy < G - 0.5; gy += 0.5) {
    const x = gx + (r() - 0.5) * 0.4, y = gy + (r() - 0.5) * 0.4, key = r(), kind = r(), dx = x - C, dy = y - C;
    if (dx < 0 && dy < 0 && Math.abs(dx - dy) < 4.4) continue;
    if (free(x, y) && !hides(x, y)) cand.push([x, y, key, kind]);
  }
  cand.sort((a, b) => a[2] - b[2]);
  const trees = [];
  for (const t of cand) if (!trees.some(([a, b]) => { const ex = Math.abs(a - t[0]), ey = Math.abs(b - t[1]); return Math.max(ex, ey) < 1.12 || Math.hypot(ex, ey) < spacing; })) trees.push(t);
  const ever = winter ? ["#3F6B55", "#4B7A62", "#58876E"] : ["#3F7D4E", "#4E8F5A", "#5FA066"];
  for (const [x, y, , kind] of trees) {
    let s = "";
    if (season === "autumn") for (let k = 0; k < 3; k++) { const lx = x - 0.45 + r() * 0.8, ly = y - 0.45 + r() * 0.8; s += quad([lx, ly, 0.01], [lx + 0.12, ly, 0.01], [lx + 0.12, ly + 0.12, 0.01], [lx, ly + 0.12, 0.01], foliage[k]); }
    if (kind < everFrac) {
      s += box(x - 0.07, y - 0.07, 0.06, 0.14, 0.14, 0.6, bark);
      [[0.38, 0.55, 0.6], [0.29, 1.15, 0.55], [0.19, 1.7, 0.45]].forEach(([hw, z0, hz], i) => { s += box(x - hw, y - hw, z0, 2 * hw, 2 * hw, hz, ever[i]); if (winter) s += box(x - hw - 0.02, y - hw - 0.02, z0 + hz, 2 * hw + 0.04, 2 * hw + 0.04, 0.05, snow, false); });
    } else if (winter) {
      const br = [];
      for (let k = 0; k < 5; k++) { const a = (k / 5) * TAU + r() * 0.8; br.push([Math.cos(a), Math.sin(a), 0.32 + r() * 0.16, 0.62 + k * 0.13]); }
      const draw = (back) => br.filter(([c, si]) => (c + si > 0) === back).map(([c, si, len, z0]) => { const tx = x + c * len, ty = y + si * len, tz = z0 + 0.55; return line([[x, y, z0], [x + c * len * 0.5, y + si * len * 0.5, z0 + 0.32], [tx, ty, tz]], nightTint(bark), 2.6) + box(tx - 0.05, ty - 0.05, tz - 0.02, 0.1, 0.1, 0.06, snow, false); }).join("");
      s += draw(true) + box(x - 0.07, y - 0.07, 0.06, 0.14, 0.14, 1.25, bark) + box(x - 0.09, y - 0.09, 1.31, 0.18, 0.18, 0.05, snow, false) + draw(false);
    } else {
      s += box(x - 0.07, y - 0.07, 0.06, 0.14, 0.14, 0.8, bark);
      const blobs = [];
      for (let k = 0; k < 7 + Math.floor(r() * 3); k++) blobs.push([x - 0.5 + r() * 0.5, y - 0.5 + r() * 0.5, 0.75 + r() * 0.7, 0.34 + r() * 0.16]);
      blobs.sort((a, b) => b[0] + b[1] - (a[0] + a[1]) || a[2] - b[2]);
      for (const [bx, by, bz, bs] of blobs) s += box(bx, by, bz, bs, bs, bs, foliage[Math.floor(r() * foliage.length)]);
    }
    add(x, y, s);
  }

  // ---------- compose ----------
  items.sort((a, b) => b[0] - a[0]);
  const grad = night ? `<radialGradient id="g" cx="50%" cy="40%" r="65%"><stop offset="0" stop-color="#26305A"/><stop offset="1" stop-color="${sky}"/></radialGradient>` : `<radialGradient id="g" cx="50%" cy="35%" r="65%"><stop offset="0" stop-color="${lighten(sky, 0.04)}"/><stop offset="1" stop-color="${sky}"/></radialGradient>`;
  let stars = "";
  if (night) { const sr = rng(p.seed * 31 + 5); for (let i = 0; i < 46; i++) stars += `<circle cx="${(sr() * W).toFixed(0)}" cy="${(sr() * H * 0.42).toFixed(0)}" r="${(0.8 + sr() * 1.4).toFixed(1)}" fill="#FFFFFF" opacity="${(0.3 + sr() * 0.5).toFixed(2)}"/>`; }
  let halos = "";
  if (lampOn) for (const [x, y] of lampPts) { const [hx, hy] = P(x, y, 2.24); halos += `<circle cx="${hx.toFixed(1)}" cy="${hy.toFixed(1)}" r="${(S * 0.55).toFixed(1)}" fill="${LIT}" opacity="${night ? 0.5 : 0.22}" filter="url(#halo)"/>`; }
  if (night && !winter) { const [hx, hy] = P(C, C, jetTop * 0.6); halos += `<ellipse cx="${hx.toFixed(1)}" cy="${hy.toFixed(1)}" rx="${(S * 1.4).toFixed(1)}" ry="${(S * jetTop * 0.6).toFixed(1)}" fill="${spray}" opacity="0.22" filter="url(#halo)"/>`; }
  const [sx, sy] = P(G / 2, G / 2, -slabH);
  const shadow = `<ellipse cx="${sx.toFixed(1)}" cy="${(sy + 16).toFixed(1)}" rx="${(G * 0.95 * S).toFixed(1)}" ry="${(G * 0.26 * S).toFixed(1)}" fill="#000" opacity="${dark ? 0.4 : 0.12}" filter="url(#soft)"/>`;
  const wl = lighten(guardWater(p.water), 0.3);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><defs>${grad}<filter id="lit" x="-60%" y="-60%" width="220%" height="220%"><feDropShadow dx="0" dy="0" stdDeviation="4" flood-color="${LIT}" flood-opacity="0.9"/></filter><filter id="soft" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="18"/></filter><filter id="halo" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="9"/></filter><radialGradient id="pool"><stop offset="0" stop-color="${LIT}" stop-opacity="${night ? 0.55 : 0.28}"/><stop offset="1" stop-color="${LIT}" stop-opacity="0"/></radialGradient><radialGradient id="wg"><stop offset="0" stop-color="${wl}" stop-opacity="0.9"/><stop offset="0.7" stop-color="${wl}" stop-opacity="0.35"/><stop offset="1" stop-color="${wl}" stop-opacity="0"/></radialGradient></defs><rect width="${W}" height="${H}" fill="url(#g)"/>${stars}${shadow}${base}${items.map((i) => i[1]).join("")}${halos}</svg>`;
}
