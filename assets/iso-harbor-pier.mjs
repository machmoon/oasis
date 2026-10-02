// Harbor Pier: an isometric harbour diorama with a plank pier, two moored sailboats, a striped lighthouse, a fish shop, crates, barrels and channel buoys.
export const meta = {
  title: "Harbor Pier",
  kind: "illustration",
  description: "A toy-like isometric harbour: plank pier over clear water, two moored sailboats, a striped lighthouse that sweeps its beam at night, a fish shop with an awning, crates, barrels and channel buoys. Use it as a hero or onboarding scene that changes season and wears your brand.",
  tags: ["isometric", "harbor", "pier", "lighthouse", "sailboat", "diorama", "nautical", "3d"],
  price: 10,
  author: "oasis-factory",
  credit: "Isometric projection and lighting after jdan/isomer (MIT)",
  size: [1600, 1100],
};

export const params = {
  knobs: {
    backdrop: { type: "color", role: "background", label: "Backdrop", default: "#E8EEF2" },
    water: { type: "color", role: "muted", label: "Water", default: "#3F9FC6" },
    sailA: { type: "color", role: "primary", label: "Sail & awning", default: "#F26B4F" },
    sailB: { type: "color", role: "secondary", label: "Second sail & sign", default: "#F2B33D" },
    stripes: { type: "color", role: "highlight", label: "Lighthouse stripes", default: "#D7263D" },
    season: { type: "choice", label: "Season", default: "summer", options: ["spring", "summer", "autumn", "winter"] },
    time: { type: "choice", label: "Time", default: "day", options: ["day", "dusk", "night"] },
    length: { type: "range", label: "Quay length", default: 2, min: 1, max: 4, step: 1 },
    bands: { type: "range", label: "Lighthouse bands", default: 3, min: 2, max: 7, step: 1 },
    seed: { type: "range", label: "Arrangement", default: 7, min: 1, max: 99, step: 1 },
  },
  presets: {
    Regatta: { backdrop: "#F4EFE7", water: "#2A8FB8", sailA: "#2F6FDE", sailB: "#F4F1EA", stripes: "#1F3A5F" },
    Nordic: { backdrop: "#E2E7EA", water: "#2F6F8F", sailA: "#1F3A5F", sailB: "#E8E2D0", stripes: "#B3261E" },
    Riviera: { backdrop: "#FFF3E6", water: "#1FB5C9", sailA: "#FF6F59", sailB: "#3A86FF", stripes: "#3A86FF" },
    Midnight: { backdrop: "#151A24", water: "#2C5D8A", sailA: "#B4FF39", sailB: "#00D1FF", stripes: "#F2B33D" },
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
function guardWater(hex) {
  let [h, s, l] = toHsl(hexRgb(hex));
  const lo = 0.47, hi = 0.62, dist = (a, b) => Math.min(Math.abs(a - b), 1 - Math.abs(a - b));
  if (s < 0.05 || h < lo || h > hi) h = s < 0.05 ? 0.56 : dist(h, lo) < dist(h, hi) ? lo : hi;
  return rgbHex(...fromHsl(h, Math.max(0.35, Math.min(0.85, s)), Math.max(0.3, Math.min(0.6, l))));
}
function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export default function render(p) {
  const W = 1600, H = 1100, TAU = Math.PI * 2;
  const r = rng(p.seed * 7919 + 13);
  const night = p.time === "night", dusk = p.time === "dusk";
  const dark = lum(p.backdrop) < 110 || night;
  const season = p.season, winter = season === "winter";
  const L = 8 + Math.round(p.length) * 2, D = 10, QY = 7.2, QZ = 0.35, ZB = -0.8;
  const px = 3.6 + (L - 10) * 0.35, PW = 1.5, PY0 = 1.0;
  const lx = L - 1.5, ly = 1.5, TT = 3.9, shedX = L - 2.9;
  const bA = { x: px - 1.3, y: 2.1 + r() * 0.8, sail: p.sailA, alt: p.sailB, hull: "#F4F1EA", side: 1 };
  const bB = { x: px + PW + 0.55, y: 1.5 + r() * 0.7, sail: p.sailB, alt: p.sailA, hull: "#2E3A4E", cabin: true, side: -1 };
  const postYs = []; for (let yy = QY - 0.6; yy > PY0 - 0.1; yy -= 1.4) postYs.push(yy);
  let wcol = guardWater(p.water);
  if (winter) wcol = mix(wcol, "#A9BCC8", 0.25);

  const buoys = [];
  const nBuoy = 2 + Math.round(p.length);
  for (let t = 0; t < 120 && buoys.length < nBuoy; t++) {
    const x = 0.7 + r() * (L - 1.4), y = 0.6 + r() * (QY - 1.8);
    if (x > px - 0.9 && x < px + PW + 0.7 && y > PY0 - 0.9) continue;
    if (Math.hypot(x - lx, y - ly) < 2.0) continue;
    if ([bA, bB].some((b) => Math.hypot(x - b.x - 0.4, y - b.y - 1.0) < 2.0)) continue;
    if (buoys.some((q) => Math.hypot(x - q[0], y - q[1]) < 1.8)) continue;
    buoys.push([x, y, buoys.length % 2]);
  }

  const proj = (x, y, z) => [(x - y) * 0.866, -(x + y) * 0.5 - z];
  const ext = [[0, 0, ZB - 0.2], [L, 0, ZB - 0.2], [0, D, ZB - 0.2], [L, D, QZ], [px - 3.15, 9.7, 2.5], [lx, ly, TT + 1.4], [bA.x + 0.4, bA.y + 0.7, 3.0], [bB.x + 0.4, bB.y + 0.7, 3.0]].map((q) => proj(...q));
  const xs = ext.map((e) => e[0]), ys = ext.map((e) => e[1]);
  const S = Math.min((W - 200) / (Math.max(...xs) - Math.min(...xs)), (H - 170) / (Math.max(...ys) - Math.min(...ys)));
  const ox = W / 2 - ((Math.max(...xs) + Math.min(...xs)) / 2) * S, oy = H / 2 - ((Math.max(...ys) + Math.min(...ys)) / 2) * S + 12;
  const P = (x, y, z) => [ox + (x - y) * 0.866 * S, oy + (-(x + y) * 0.5 - z) * S];
  const pts = (arr) => arr.map((q) => P(...q).map((v) => v.toFixed(1)).join(",")).join(" ");
  const LIGHT = (() => { const v = [2, -1, 3], n = Math.hypot(...v); return v.map((c) => c / n); })();
  const shade = (hex, n) => { const m = Math.hypot(...n) || 1; return lighten(hex, (0.2 * (n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2])) / m); };
  const LIT = "#FFD58A", WARM = "#FFCF7A";
  const nightTint = (hex) => (hex === LIT || hex === WARM ? hex : night ? mix(lighten(hex, -0.12), "#151B3A", 0.5) : dusk ? mix(hex, "#7A4A5C", 0.16) : hex);
  const poly = (arr, fill, extra = "") => `<polygon points="${pts(arr)}" fill="${nightTint(fill)}" ${extra}${night && (fill === LIT || fill === WARM) ? ' filter="url(#glow)"' : ""}/>`;
  const quad = (a, b, c, d, fill, extra) => poly([a, b, c, d], fill, extra);
  const line = (a, b, col, w = 1) => `<polyline points="${pts([a, b])}" stroke="${nightTint(col)}" stroke-width="${w}" fill="none" stroke-linecap="round"/>`;
  const edge = (c) => `stroke="${nightTint(lighten(c, -0.18))}" stroke-width="0.6" stroke-linejoin="round"`;
  function box(x, y, z, dx, dy, dz, color, e = true) {
    const st = e ? edge(color) : "";
    return quad([x, y, z], [x, y + dy, z], [x, y + dy, z + dz], [x, y, z + dz], shade(color, [-1, 0, 0]), st)
      + quad([x, y, z], [x + dx, y, z], [x + dx, y, z + dz], [x, y, z + dz], shade(color, [0, -1, 0]), st)
      + quad([x, y, z + dz], [x + dx, y, z + dz], [x + dx, y + dy, z + dz], [x, y + dy, z + dz], shade(color, [0, 0, 1]), st);
  }
  function cyl(cx, cy, z0, z1, r0, r1, col, flat) {
    let s = ""; const n = 18;
    for (let k = 0; k < n; k++) {
      const a0 = (k / n) * TAU, a1 = ((k + 1) / n) * TAU, m = (a0 + a1) / 2;
      if (Math.cos(m) + Math.sin(m) > 0.02) continue;
      const f = flat ? col : shade(col, [Math.cos(m), Math.sin(m), (r0 - r1) / (z1 - z0)]);
      s += quad([cx + Math.cos(a0) * r0, cy + Math.sin(a0) * r0, z0], [cx + Math.cos(a1) * r0, cy + Math.sin(a1) * r0, z0], [cx + Math.cos(a1) * r1, cy + Math.sin(a1) * r1, z1], [cx + Math.cos(a0) * r1, cy + Math.sin(a0) * r1, z1], f, `stroke="${nightTint(f)}" stroke-width="0.5"`);
    }
    return s;
  }
  const cap = (cx, cy, z, rr, col) => poly(Array.from({ length: 18 }, (_, k) => [cx + Math.cos((k / 18) * TAU) * rr, cy + Math.sin((k / 18) * TAU) * rr, z]), col);
  const items = [];
  const add = (x, y, svg) => items.push([x + y, svg]);
  const blossom = { spring: ["#F7B8CF", "#F29BBA", "#FBD3E2"], summer: ["#5FA35C", "#4E8F4C", "#79B86A"], autumn: ["#E58A3A", "#D4642E", "#F0B048"], winter: ["#F3F6F9", "#E3EAF0", "#FFFFFF"] }[season];

  // ---------- water basin and quay ----------
  const stone = "#BDB5A6", quayTop = winter ? "#EEF2F6" : "#D6CFC2", deep = lighten(wcol, -0.18), sand = "#D9C49A";
  let base = "";
  base += quad([0, 0, ZB], [0, QY, ZB], [0, QY, 0], [0, 0, 0], shade(deep, [-1, 0, 0])) + quad([0, 0, ZB], [L, 0, ZB], [L, 0, 0], [0, 0, 0], shade(deep, [0, -1, 0]));
  base += quad([0, 0, ZB], [0, QY, ZB], [0, QY, ZB + 0.14], [0, 0, ZB + 0.14], shade(sand, [-1, 0, 0])) + quad([0, 0, ZB], [L, 0, ZB], [L, 0, ZB + 0.14], [0, 0, ZB + 0.14], shade(sand, [0, -1, 0]));
  base += quad([0, 0, -0.05], [0, QY, -0.05], [0, QY, 0], [0, 0, 0], lighten(wcol, 0.1)) + quad([0, 0, -0.05], [L, 0, -0.05], [L, 0, 0], [0, 0, 0], lighten(wcol, 0.14));
  base += quad([0, QY, ZB], [0, D, ZB], [0, D, QZ], [0, QY, QZ], shade(stone, [-1, 0, 0]));
  base += quad([0, 0, 0], [L, 0, 0], [L, QY, 0], [0, QY, 0], wcol);
  base += `<polygon points="${pts([[0, 0, 0], [L, 0, 0], [L, QY, 0], [0, QY, 0]])}" fill="url(#sheen)"/>`;
  const blocked = (x, y) => (x > px - 0.4 && x < px + PW + 0.2 && y > PY0 - 0.3) || Math.hypot(x - lx, y - ly) < 1.4 || [bA, bB].some((b) => x > b.x - 0.3 && x < b.x + 1.1 && y > b.y - 0.9 && y < b.y + 2.5) || buoys.some((q) => Math.hypot(x - q[0], y - q[1]) < 0.45);
  for (let i = 0; i < 16 + L * 2; i++) {
    const x = r() * (L - 0.6), y = 0.2 + r() * (QY - 0.6), len = 0.25 + r() * 0.45;
    if (!blocked(x, y) && !blocked(x + len, y)) base += quad([x, y, 0.003], [x + len, y, 0.003], [x + len, y + 0.045, 0.003], [x, y + 0.045, 0.003], lighten(wcol, 0.16), 'opacity="0.75"');
  }
  base += quad([0, QY - 0.1, 0.003], [L, QY - 0.1, 0.003], [L, QY, 0.003], [0, QY, 0.003], lighten(wcol, 0.22), 'opacity="0.7"');
  base += quad([0, QY, 0], [L, QY, 0], [L, QY, QZ], [0, QY, QZ], shade(stone, [0, -1, 0]));
  base += quad([0, QY, 0], [L, QY, 0], [L, QY, 0.07], [0, QY, 0.07], "#5F7350");
  for (let x = 0.9; x < L; x += 1.1) base += line([x, QY - 0.002, 0.08], [x, QY - 0.002, QZ], lighten(stone, -0.14), 0.8);
  base += quad([0, QY, QZ], [L, QY, QZ], [L, D, QZ], [0, D, QZ], quayTop);
  for (let yy = QY + 0.7; yy < D; yy += 0.7) base += line([0, yy, QZ + 0.001], [L, yy, QZ + 0.001], lighten(quayTop, -0.07), 0.8);
  if (season === "spring" || season === "autumn") for (let i = 0; i < 26 + L * 2; i++) { const x = r() * L, y = QY + 0.15 + r() * 2.6; base += quad([x, y, QZ + 0.002], [x + 0.07, y, QZ + 0.002], [x + 0.07, y + 0.07, QZ + 0.002], [x, y + 0.07, QZ + 0.002], blossom[i % 3]); }
  base += box(0, QY, QZ, px - 0.05, 0.22, 0.05, lighten(stone, 0.06), false) + box(px + PW + 0.05, QY, QZ, L - px - PW - 0.05, 0.22, 0.05, lighten(stone, 0.06), false);

  // ---------- pier ----------
  {
    const wood = "#B98A5E", post = "#7A5A43";
    let s = box(px, PY0, QZ - 0.14, PW, QY - PY0, 0.14, wood);
    for (let yy = PY0 + 0.3; yy < QY - 0.05; yy += 0.3) s += line([px, yy, QZ + 0.001], [px + PW, yy, QZ + 0.001], lighten(wood, -0.16), 1);
    const loc = postYs.map((yy) => [px + PW - 0.08 + yy, box(px + PW - 0.17, yy, QZ, 0.15, 0.15, 0.22, post)]);
    loc.push([px + 1.05 + 6.0, barrel(px + 1.05, 6.0)], [px + 0.4 + 5.65, crate(px + 0.25, 5.45)]);
    loc.sort((a, b) => b[0] - a[0]);
    s += loc.map((q) => q[1]).join("");
    for (const yy of postYs) s += box(px - 0.17, yy, 0, 0.17, 0.17, QZ + 0.22, post);
    add(px + PW / 2, (PY0 + QY) / 2, s);
  }
  function crate(x, y, z = QZ) {
    const c = "#C49A6C"; let s = box(x, y, z, 0.42, 0.42, 0.42, c);
    for (const t of [0.14, 0.28]) s += line([x, y - 0.003, z + t], [x + 0.42, y - 0.003, z + t], lighten(c, -0.22), 0.8) + line([x - 0.003, y, z + t], [x - 0.003, y + 0.42, z + t], lighten(c, -0.25), 0.8);
    return s;
  }
  function barrel(x, y) {
    const c = "#9B6B43", hoop = "#5E4330";
    return cyl(x, y, QZ, QZ + 0.48, 0.17, 0.17, c) + cyl(x, y, QZ + 0.1, QZ + 0.14, 0.176, 0.176, hoop) + cyl(x, y, QZ + 0.34, QZ + 0.38, 0.176, 0.176, hoop) + cap(x, y, QZ + 0.48, 0.17, lighten(c, 0.08));
  }

  // ---------- boats (moored to the nearest pier post) ----------
  function boat(b) {
    const { x, y } = b, w = 0.8, len = 2.2, z0 = -0.06, dz = z0 + 0.44, cx = x + w / 2, ym = y + 0.75;
    let s = poly([[x - 0.15, y, 0.004], [cx, y - 0.85, 0.004], [x + w + 0.15, y, 0.004], [x + w + 0.15, y + len + 0.15, 0.004], [x - 0.15, y + len + 0.15, 0.004]], lighten(wcol, -0.07));
    s += box(x, y, z0, w, len, 0.44, b.hull);
    s += quad([x - 0.003, y, dz - 0.12], [x - 0.003, y + len, dz - 0.12], [x - 0.003, y + len, dz - 0.05], [x - 0.003, y, dz - 0.05], b.sail);
    s += quad([x + 0.07, y + 0.07, dz + 0.002], [x + w - 0.07, y + 0.07, dz + 0.002], [x + w - 0.07, y + len - 0.07, dz + 0.002], [x + 0.07, y + len - 0.07, dz + 0.002], "#C9A27A");
    s += quad([x, y, z0], [cx, y - 0.55, z0], [cx, y - 0.55, dz], [x, y, dz], shade(b.hull, [-0.8, -0.6, 0]), edge(b.hull));
    s += quad([x - 0.003, y, dz - 0.12], [cx, y - 0.553, dz - 0.12], [cx, y - 0.553, dz - 0.05], [x - 0.003, y, dz - 0.05], b.sail);
    s += poly([[x, y, dz], [x + w, y, dz], [cx, y - 0.55, dz]], shade(b.hull, [0, 0, 1]), edge(b.hull));
    if (b.cabin) { s += box(x + 0.15, y + 1.4, dz, w - 0.3, 0.6, 0.3, "#F1EAD2"); s += quad([x + 0.148, y + 1.5, dz + 0.1], [x + 0.148, y + 1.9, dz + 0.1], [x + 0.148, y + 1.9, dz + 0.22], [x + 0.148, y + 1.5, dz + 0.22], night ? LIT : "#5E7187"); }
    const py = postYs.reduce((a, c) => (Math.abs(c - y - 1.6) < Math.abs(a - y - 1.6) ? c : a), postYs[0]) + 0.08;
    const bxp = b.side > 0 ? x + w : x, pxp = b.side > 0 ? px - 0.085 : px + PW - 0.1;
    const a0 = [bxp, y + len - 0.35, dz + 0.02], a1 = [pxp, py, QZ + 0.2], am = [(a0[0] + a1[0]) / 2, (a0[1] + a1[1]) / 2, Math.min(a0[2], a1[2]) - 0.08];
    s += `<polyline points="${pts([a0, am, a1])}" stroke="${nightTint("#5E4330")}" stroke-width="1.3" fill="none" stroke-linecap="round"/>`;
    const sh = 1.6 + r() * 0.35;
    s += poly([[cx, ym + 0.06, dz + 0.35], [cx, ym + 0.06, dz + 0.35 + sh], [cx, ym + 1.3, dz + 0.35]], shade(b.sail, [-1, 0, 0]));
    s += line([cx, ym + 0.06, dz + 0.35 + sh * 0.5], [cx, ym + 0.7, dz + 0.35 + sh * 0.25], lighten(b.sail, 0.12), 1);
    s += line([cx, ym, dz + 0.33], [cx, ym + 1.35, dz + 0.33], "#5A5F68", 2);
    s += poly([[cx, ym, dz + sh + 0.5], [cx, ym + 0.38, dz + sh + 0.43], [cx, ym, dz + sh + 0.36]], b.alt);
    s += box(cx - 0.04, ym - 0.04, dz, 0.08, 0.08, sh + 0.5, "#E9E2D2", false);
    s += poly([[cx, ym - 0.08, dz + 0.25 + sh * 0.85], [cx, ym - 0.08, dz + 0.4], [cx, y - 0.35, dz + 0.4]], shade("#F7F5EE", [-1, 0, 0]));
    add(cx, y + len / 2, s);
  }
  boat(bA); boat(bB);

  // ---------- channel buoys ----------
  for (const [x, y, k] of buoys) {
    const col = k ? "#3F9E6B" : "#D94A3D";
    let s = poly(Array.from({ length: 14 }, (_, i) => [x + Math.cos((i / 14) * TAU) * 0.26, y + Math.sin((i / 14) * TAU) * 0.26, 0.004]), lighten(wcol, 0.14), 'opacity="0.8"');
    s += cyl(x, y, -0.04, 0.26, 0.14, 0.11, col) + cyl(x, y, 0.12, 0.17, 0.13, 0.125, "#F5F3EE") + cap(x, y, 0.26, 0.11, lighten(col, 0.1));
    s += box(x - 0.02, y - 0.02, 0.26, 0.04, 0.04, 0.22, "#3A3F48", false);
    s += night ? cap(x, y, 0.5, 0.06, LIT) : box(x - 0.05, y - 0.05, 0.48, 0.1, 0.1, 0.07, col, false);
    add(x, y, s);
  }

  // ---------- lighthouse on its rocks ----------
  {
    const rocks = [[0.75, 0.2, 0.7, 0.4], [0.1, 0.8, 0.6, 0.35], [0.6, 0.7, 0.5, 0.3], [-0.85, -0.1, 0.6, 0.32], [-0.2, -0.85, 0.65, 0.3], [-0.7, -0.65, 0.45, 0.22], [0.5, -0.6, 0.5, 0.26], [-0.55, 0.6, 0.5, 0.28]].map((q) => [q[0] + (r() - 0.5) * 0.2, q[1] + (r() - 0.5) * 0.2, q[2], q[3]]);
    rocks.sort((a, b) => b[0] + b[1] - (a[0] + a[1]));
    const rock = (q) => box(lx + q[0] - q[2] / 2, ly + q[1] - q[2] / 2, -0.05, q[2], q[2], q[3], winter ? "#C9D2DA" : "#8D949C");
    let s = rocks.filter((q) => q[0] + q[1] >= 0).map(rock).join("");
    s += cyl(lx, ly, 0, 0.6, 0.72, 0.68, "#E6E0D4") + cap(lx, ly, 0.6, 0.68, "#EDE8DE");
    const n = Math.round(p.bands) * 2, seg = (TT - 0.6) / n, rad = (z) => 0.5 - ((z - 0.6) / (TT - 0.6)) * 0.14;
    const pale = lum(p.stripes) > 200 ? "#2B3240" : "#F5F3EE";
    for (let i = 0; i < n; i++) { const z0 = 0.6 + i * seg; s += cyl(lx, ly, z0, z0 + seg, rad(z0), rad(z0 + seg), i % 2 ? pale : p.stripes); }
    const onFace = (z0, z1, hw) => { const rr = rad((z0 + z1) / 2) + 0.012, c = [lx - 0.707 * rr, ly - 0.707 * rr]; return [[c[0] - 0.707 * hw, c[1] + 0.707 * hw, z0], [c[0] + 0.707 * hw, c[1] - 0.707 * hw, z0], [c[0] + 0.707 * hw, c[1] - 0.707 * hw, z1], [c[0] - 0.707 * hw, c[1] + 0.707 * hw, z1]]; };
    s += poly(onFace(0.6, 1.1, 0.12), "#3D4654") + poly(onFace(2.15, 2.4, 0.07), night ? LIT : "#3D4654");
    s += cyl(lx, ly, TT, TT + 0.12, 0.6, 0.6, "#2B3240") + cap(lx, ly, TT + 0.12, 0.6, "#3A4252");
    s += cyl(lx, ly, TT + 0.12, TT + 0.68, 0.34, 0.34, night ? LIT : dusk ? "#F6C28B" : "#BFD8E2", night);
    for (const a of [200, 225, 250]) { const t = (a * Math.PI) / 180; s += line([lx + Math.cos(t) * 0.345, ly + Math.sin(t) * 0.345, TT + 0.12], [lx + Math.cos(t) * 0.345, ly + Math.sin(t) * 0.345, TT + 0.68], "#2B3240", 1.5); }
    for (let k = 0; k < 18; k++) {
      const a0 = (k / 18) * TAU, a1 = ((k + 1) / 18) * TAU, m = (a0 + a1) / 2;
      if (Math.cos(m) + Math.sin(m) > 0.02) continue;
      s += poly([[lx + Math.cos(a0) * 0.44, ly + Math.sin(a0) * 0.44, TT + 0.68], [lx + Math.cos(a1) * 0.44, ly + Math.sin(a1) * 0.44, TT + 0.68], [lx, ly, TT + 1.05]], shade(lighten(p.stripes, -0.06), [Math.cos(m), Math.sin(m), 1]), `stroke="${nightTint(lighten(p.stripes, -0.1))}" stroke-width="0.5"`);
    }
    const rail = [];
    for (let a = 135; a <= 315; a += 15) { const t = (a * Math.PI) / 180, q = [lx + Math.cos(t) * 0.58, ly + Math.sin(t) * 0.58]; rail.push([q[0], q[1], TT + 0.36]); if (a % 30 === 15) s += line([q[0], q[1], TT + 0.12], [q[0], q[1], TT + 0.36], "#2B3240", 1.2); }
    s += `<polyline points="${pts(rail)}" stroke="${nightTint("#2B3240")}" stroke-width="1.6" fill="none"/>`;
    s += line([lx, ly, TT + 1.05], [lx, ly, TT + 1.3], "#2B3240", 2);
    s += rocks.filter((q) => q[0] + q[1] < 0).map(rock).join("");
    add(lx, ly, s);
  }

  // ---------- fish shop ----------
  {
    const x = px - 3.15, y = 8.1, w = 2.5, d = 1.6, z = QZ, h = 1.35, wall = "#F3E3C8";
    let s = box(x, y, z, w, d, h, wall);
    s += quad([x + 0.2, y - 0.003, z + 0.12], [x + w - 0.95, y - 0.003, z + 0.12], [x + w - 0.95, y - 0.003, z + 0.8], [x + 0.2, y - 0.003, z + 0.8], night ? WARM : "#3D4654");
    s += quad([x + w - 0.7, y - 0.003, z], [x + w - 0.25, y - 0.003, z], [x + w - 0.25, y - 0.003, z + 0.92], [x + w - 0.7, y - 0.003, z + 0.92], "#6F5B4D");
    s += quad([x - 0.003, y + 0.5, z + 0.45], [x - 0.003, y + 1.05, z + 0.45], [x - 0.003, y + 1.05, z + 0.9], [x - 0.003, y + 0.5, z + 0.9], night ? LIT : shade("#7E93A8", [-1, 0, 0]));
    s += quad([x + 0.35, y - 0.004, z + 1.04], [x + w - 0.35, y - 0.004, z + 1.04], [x + w - 0.35, y - 0.004, z + 1.31], [x + 0.35, y - 0.004, z + 1.31], shade(p.sailB, [0, -1, 0]));
    const fg = lum(p.sailB) > 150 ? "#1F2430" : "#FFFFFF";
    for (let k = 0; k < 3; k++) {
      const fx = x + 0.75 + k * 0.5, fz = z + 1.175, yy = y - 0.006;
      s += poly(Array.from({ length: 12 }, (_, i) => [fx + Math.cos((i / 12) * TAU) * 0.15, yy, fz + Math.sin((i / 12) * TAU) * 0.065]), fg);
      s += poly([[fx - 0.12, yy, fz], [fx - 0.24, yy, fz + 0.07], [fx - 0.24, yy, fz - 0.07]], fg);
    }
    const stripeN = 10, aw = p.sailA, awAlt = lum(aw) > 215 ? "#2B3240" : "#F7F7F5";
    for (let i = 0; i < stripeN; i++) {
      const xa = x + 0.1 + (i * (w - 0.2)) / stripeN, xb = x + 0.1 + ((i + 1) * (w - 0.2)) / stripeN;
      s += quad([xa, y, z + 1.0], [xb, y, z + 1.0], [xb, y - 0.45, z + 0.75], [xa, y - 0.45, z + 0.75], shade(i % 2 ? awAlt : aw, [0, -0.7, 0.7]));
    }
    s += quad([x + 0.1, y - 0.45, z + 0.75], [x + w - 0.1, y - 0.45, z + 0.75], [x + w - 0.1, y - 0.45, z + 0.68], [x + 0.1, y - 0.45, z + 0.68], shade(aw, [0, -1, 0]));
    const top = z + h, ov = 0.12, ridge = top + d * 0.36, roof = winter ? "#F4F7FA" : "#4E5A66";
    s += quad([x - ov, y + d / 2, ridge], [x + w + ov, y + d / 2, ridge], [x + w + ov, y + d + ov, top], [x - ov, y + d + ov, top], shade(roof, [0, 0.6, 0.8]));
    s += poly([[x, y, top], [x, y + d / 2, ridge], [x, y + d, top]], shade(wall, [-1, 0, 0]));
    s += quad([x - ov, y - ov, top], [x + w + ov, y - ov, top], [x + w + ov, y + d / 2, ridge], [x - ov, y + d / 2, ridge], shade(roof, [0, -0.6, 0.8]), edge(roof));
    for (let k = 1; k < 5; k++) { const t = k / 5, yy = y - ov + (d / 2 + ov) * t, zz = top + (ridge - top) * t; s += line([x - ov, yy, zz], [x + w + ov, yy, zz], lighten(roof, -0.12), 0.8); }
    s += box(x + 0.25, y - 0.55, z, 1.3, 0.4, 0.42, "#DCE3E8");
    s += quad([x + 0.3, y - 0.5, z + 0.422], [x + 1.5, y - 0.5, z + 0.422], [x + 1.5, y - 0.2, z + 0.422], [x + 0.3, y - 0.2, z + 0.422], "#EAF4F8");
    for (let k = 0; k < 4; k++) { const fx = x + 0.38 + k * 0.28, fy = y - 0.42 + (k % 2) * 0.12; s += quad([fx, fy, z + 0.425], [fx + 0.2, fy, z + 0.425], [fx + 0.2, fy + 0.06, z + 0.425], [fx, fy + 0.06, z + 0.425], "#8FA0AE"); }
    add(x + w / 2, y + d / 2, s);
  }

  // ---------- shed, trees, crates, bollards ----------
  {
    const x = shedX, y = 8.0, w = 2.5, d = 1.6, h = 1.15, col = "#8FA4B2";
    let s = box(x, y, QZ, w, d, h, col);
    for (let xx = x + 0.18; xx < x + w - 0.05; xx += 0.18) s += line([xx, y - 0.003, QZ + 0.02], [xx, y - 0.003, QZ + h - 0.02], lighten(col, -0.1), 0.7);
    s += quad([x + 0.6, y - 0.005, QZ], [x + 1.6, y - 0.005, QZ], [x + 1.6, y - 0.005, QZ + 0.85], [x + 0.6, y - 0.005, QZ + 0.85], "#4E5A66");
    s += quad([x - 0.003, y + 0.5, QZ + 0.5], [x - 0.003, y + 1.1, QZ + 0.5], [x - 0.003, y + 1.1, QZ + 0.85], [x - 0.003, y + 0.5, QZ + 0.85], night ? LIT : shade("#7E93A8", [-1, 0, 0]));
    s += box(x - 0.06, y - 0.06, QZ + h, w + 0.12, d + 0.12, 0.08, winter ? "#F4F7FA" : "#6F7F8C");
    add(x + w / 2, y + d / 2, s);
  }
  const trees = [];
  for (let tx = 0.55; tx < px - 3.5; tx += 1.3) trees.push([tx, 8.6 + r() * 0.8]);
  trees.push([px + PW + 0.75, 9.25]);
  if (shedX - 0.75 > px + PW + 2.3) trees.push([shedX - 0.75, 9.3]);
  for (const [tx, ty] of trees) {
    let s = box(tx - 0.07, ty - 0.07, QZ, 0.14, 0.14, 0.75, "#7A5A43");
    const bl = [];
    for (let k = 0; k < 8; k++) bl.push([tx - 0.45 + r() * 0.6, ty - 0.45 + r() * 0.6, QZ + 0.75 + r() * 0.6, 0.32 + r() * 0.2]);
    bl.sort((a, b) => b[0] + b[1] - (a[0] + a[1]) || a[2] - b[2]);
    for (const [bx, by, bz, bs] of bl) s += box(bx, by, bz, bs, bs, bs, blossom[Math.floor(r() * 3)]);
    add(tx, ty, s);
  }
  const x0 = px + PW + 0.4, x1 = shedX - 0.3;
  const centres = [[x0 + r() * (x1 - x0), 8.0 + r() * 1.2], [x0 + r() * (x1 - x0), 8.0 + r() * 1.2]];
  for (let gx = x0; gx < x1 - 0.42; gx += 0.52) for (let gy = 7.55; gy < 9.5; gy += 0.52) {
    if (trees.some((t) => Math.hypot(t[0] - gx - 0.21, t[1] - gy - 0.21) < 0.85)) continue;
    const dd = Math.min(...centres.map((c) => Math.hypot(gx - c[0], (gy - c[1]) * 1.3)));
    if (r() > 0.9 - dd * 0.4) continue;
    if (r() < 0.5) { let s = crate(gx, gy); if (r() < 0.35) s += crate(gx + 0.02, gy + 0.02, QZ + 0.42); add(gx + 0.21, gy + 0.21, s); }
    else add(gx + 0.21, gy + 0.21, barrel(gx + 0.21, gy + 0.21));
  }
  for (let bx = x0 + 0.2; bx < L - 0.4; bx += 1.3) add(bx, 7.32, box(bx, 7.25, QZ + 0.05, 0.14, 0.14, 0.16, "#3A3F48"));

  // ---------- sky, beam, frame ----------
  items.sort((a, b) => b[0] - a[0]);
  const sky = night ? mix(p.backdrop, "#0E1224", 0.6) : dusk ? mix(p.backdrop, "#F2B8A0", 0.35) : p.backdrop;
  const grad = night ? `<radialGradient id="g" cx="50%" cy="35%" r="65%"><stop offset="0" stop-color="${mix(sky, "#2A3358", 0.6)}"/><stop offset="1" stop-color="${sky}"/></radialGradient>` : `<radialGradient id="g" cx="50%" cy="35%" r="65%"><stop offset="0" stop-color="${lighten(sky, dark ? 0.05 : 0.04)}"/><stop offset="1" stop-color="${sky}"/></radialGradient>`;
  const [lhx] = P(lx, ly, 0);
  let deco = "";
  if (night) for (let i = 0; i < 46; i++) deco += `<circle cx="${(r() * W).toFixed(1)}" cy="${(r() * H * 0.55).toFixed(1)}" r="${(0.8 + r() * 1.4).toFixed(1)}" fill="#FFFFFF" opacity="${(0.35 + r() * 0.5).toFixed(2)}"/>`;
  else for (let i = 0; i < 4; i++) {
    const gx = 220 + r() * (W - 440), gy = 70 + r() * 170, k = 7 + r() * 5;
    if (Math.abs(gx - lhx) < 110) continue;
    deco += `<path d="M${(gx - k).toFixed(1)} ${gy.toFixed(1)} q${(k / 2).toFixed(1)} ${(-k * 0.6).toFixed(1)} ${k.toFixed(1)} 0 q${(k / 2).toFixed(1)} ${(-k * 0.6).toFixed(1)} ${k.toFixed(1)} 0" stroke="${dark ? "#E6E9EE" : "#4A5160"}" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.7"/>`;
  }
  const shadow = `<polygon points="${[P(0, 0, ZB), P(L, 0, ZB), P(L, D, ZB), P(0, D, ZB)].map(([a, b]) => `${a.toFixed(1)},${(b + 16).toFixed(1)}`).join(" ")}" fill="#000000" opacity="${dark ? 0.35 : 0.16}" filter="url(#soft)"/>`;
  const [bx, by] = P(lx, ly, TT + 0.4);
  const ray = (deg, len) => [(bx + Math.cos((deg * Math.PI) / 180) * len).toFixed(1), (by - Math.sin((deg * Math.PI) / 180) * len).toFixed(1)];
  const beamDefs = `<linearGradient id="beam" gradientUnits="userSpaceOnUse" x1="${bx.toFixed(1)}" y1="${by.toFixed(1)}" x2="${ray(165, 1500).join('" y2="')}"><stop offset="0" stop-color="${LIT}" stop-opacity="0.55"/><stop offset="1" stop-color="${LIT}" stop-opacity="0"/></linearGradient><linearGradient id="beam2" gradientUnits="userSpaceOnUse" x1="${bx.toFixed(1)}" y1="${by.toFixed(1)}" x2="${ray(14, 600).join('" y2="')}"><stop offset="0" stop-color="${LIT}" stop-opacity="0.4"/><stop offset="1" stop-color="${LIT}" stop-opacity="0"/></linearGradient><radialGradient id="halo"><stop offset="0" stop-color="${LIT}" stop-opacity="0.65"/><stop offset="1" stop-color="${LIT}" stop-opacity="0"/></radialGradient>`;
  const beam = night ? `<polygon points="${bx.toFixed(1)},${by.toFixed(1)} ${ray(158, 1700).join(",")} ${ray(171, 1700).join(",")}" fill="url(#beam)"/><polygon points="${bx.toFixed(1)},${by.toFixed(1)} ${ray(9, 700).join(",")} ${ray(18, 700).join(",")}" fill="url(#beam2)"/><circle cx="${bx.toFixed(1)}" cy="${by.toFixed(1)}" r="${(S * 1.1).toFixed(1)}" fill="url(#halo)"/>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><defs>${grad}${beamDefs}<filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter><filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="16"/></filter><linearGradient id="sheen" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFFFF" stop-opacity="${night ? 0.05 : 0.18}"/><stop offset="0.6" stop-color="#FFFFFF" stop-opacity="0"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#g)"/>${deco}${shadow}${base}${items.map((i) => i[1]).join("")}${beam}</svg>`;
}
