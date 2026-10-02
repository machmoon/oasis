// Oasis Station: a toy-like isometric train station with a gabled canopy, a short train, a ticket booth, benches, vending machines and a clock.
export const meta = {
  title: "Oasis Station",
  kind: "illustration",
  description: "An isometric little train station diorama in the Oasis Town kit, with a striped canopy, a ridge-mounted name board, benches, vending machines and a short train. Use it as hero art for travel, mobility and onboarding scenes.",
  tags: ["isometric", "diorama", "train", "station", "railway", "3d", "hero", "toy"],
  price: 10,
  author: "oasis-factory",
  size: [1600, 1100],
};

export const params = {
  knobs: {
    backdrop: { type: "color", role: "background", label: "Backdrop", default: "#E9ECF1" },
    train: { type: "color", role: "primary", label: "Train", default: "#2F7A55" },
    canopy: { type: "color", role: "secondary", label: "Canopy", default: "#E5484D" },
    accent: { type: "color", role: "highlight", label: "Sign & vending", default: "#F2B33D" },
    season: { type: "choice", label: "Season", default: "spring", options: ["spring", "summer", "autumn", "winter"] },
    time: { type: "choice", label: "Time", default: "day", options: ["day", "dusk", "night"] },
    cars: { type: "range", label: "Cars", default: 2, min: 1, max: 4, step: 1 },
    seed: { type: "range", label: "Arrangement", default: 7, min: 1, max: 99, step: 1 },
    people: { type: "toggle", label: "Passengers", default: true },
    name: { type: "text", label: "Station name", default: "Hanamachi" },
  },
  presets: {
    Bullet: { backdrop: "#DCE6F2", train: "#F4F5F7", canopy: "#1F4E9C", accent: "#E5484D" },
    Terracotta: { backdrop: "#F4E7D6", train: "#B5482A", canopy: "#2C6E6A", accent: "#F2B33D" },
    Lagoon: { backdrop: "#D3EDEF", train: "#F2B33D", canopy: "#0E7C7B", accent: "#FF7A59" },
    Midnight: { backdrop: "#151A2A", train: "#F25F5C", canopy: "#F2B33D", accent: "#4CC9F0" },
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
function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export default function render(p) {
  const W = 1600, H = 1100;
  const r = rng(p.seed * 7717 + 5);
  const night = p.time === "night", dusk = p.time === "dusk", lamps = night || dusk;
  const dk = lum(p.backdrop) < 110, dark = dk || night;
  const env = (h) => (dk ? mix(lighten(h, -0.3), p.backdrop, 0.3) : h);
  const cars = Math.round(p.cars), CL = 3.1, CG = 0.28;
  const trainLen = cars * CL + (cars - 1) * CG;
  const L = trainLen + 4.8, D = 7.6, PZ = 0.5, PX0 = 0.3, PX1 = L - 0.3, PY0 = 2.75, PY1 = 5.95;
  const c0 = 2.7, c1 = L - 2.3, cLen = c1 - c0;
  const rx0 = c0 - 0.2, rx1 = c1 + 0.2, ry0 = 3.85, ry1 = PY1, ryM = (ry0 + ry1) / 2, ez = 2.51, rz = 2.84;
  const raw = String(p.name == null ? "" : p.name).trim().slice(0, 16) || "Station", nm = esc(raw);
  const nch = Math.max(3, raw.length), f0 = 0.44;
  const signW = Math.max(1.4, Math.min(rx1 - rx0 - 0.3, nch * 0.64 * f0 + 0.5)), fsW = Math.min(f0, (signW - 0.4) / (nch * 0.64));
  const smid = (rx0 + rx1) / 2, sx0 = smid - signW / 2;

  const ext = [[-0.4, -0.4, -0.55], [L + 0.4, -0.4, -0.55], [-0.4, D + 0.4, -0.55], [L + 0.4, D + 0.4, 0], [0.5, D - 0.2, 2.25], [L - 0.5, D - 0.2, 2.25], [sx0, ryM, rz + 0.96], [sx0 + signW, ryM, rz + 0.96], [L - 1.25, 3.5, 3.36]];
  let u0 = 1e9, u1 = -1e9, v0 = 1e9, v1 = -1e9;
  for (const [x, y, z] of ext) { const u = (x - y) * 0.866, v = -(x + y) * 0.5 - z; u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); }
  const S = Math.min((W - 240) / (u1 - u0), (H - 230) / (v1 - v0));
  const ox = W / 2 - (S * (u0 + u1)) / 2, oy = H / 2 + 12 - (S * (v0 + v1)) / 2;
  const LIGHT = (() => { const v = [2, -1, 3], n = Math.hypot(...v); return v.map((c) => c / n); })();
  const P = (x, y, z) => [ox + (x - y) * 0.866 * S, oy + (-(x + y) * 0.5 - z) * S];
  const pts = (arr) => arr.map((q) => P(...q).map((v) => v.toFixed(1)).join(",")).join(" ");
  const shade = (hex, n) => lighten(hex, 0.2 * (n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2]));
  const LIT = "#FFD58A", LIT2 = "#FFCF7A";
  const isLit = (h) => h === LIT || h === LIT2;
  const nightTint = (hex) => (isLit(hex) ? hex : night ? mix(lighten(hex, -0.12), "#151B3A", 0.5) : dusk ? mix(hex, "#7A4A5C", 0.16) : hex);
  const poly = (arr, fill, extra = "") => `<polygon points="${pts(arr)}" fill="${nightTint(fill)}" ${extra}${night && isLit(fill) ? ' filter="url(#glow)"' : ""}/>`;
  const quad = (a, b, c, d, fill, extra) => poly([a, b, c, d], fill, extra);
  const fy = (x0, x1, y, z0, z1, c) => quad([x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1], c);
  const fx = (x, y0, y1, z0, z1, c) => quad([x, y0, z0], [x, y1, z0], [x, y1, z1], [x, y0, z1], c);
  const top = (x0, x1, y0, y1, z, c) => quad([x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z], c);
  const line = (pp, col, w) => `<polyline points="${pts(pp)}" stroke="${nightTint(col)}" stroke-width="${((w * S) / 60).toFixed(2)}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  function box(x, y, z, dx, dy, dz, color, edge = true) {
    const st = edge ? `stroke="${nightTint(lighten(color, -0.18))}" stroke-width="0.6" stroke-linejoin="round"` : "";
    return quad([x, y, z], [x, y + dy, z], [x, y + dy, z + dz], [x, y, z + dz], shade(color, [-1, 0, 0]), st)
      + quad([x, y, z], [x + dx, y, z], [x + dx, y, z + dz], [x, y, z + dz], shade(color, [0, -1, 0]), st)
      + quad([x, y, z + dz], [x + dx, y, z + dz], [x + dx, y + dy, z + dz], [x, y + dy, z + dz], shade(color, [0, 0, 1]), st);
  }
  const back = [], mid = [], near = [];
  const add = (arr, x, y, svg) => arr.push([x + y, svg]);
  const flush = (arr) => arr.sort((a, b) => b[0] - a[0]).map((i) => i[1]).join("");

  const winter = p.season === "winter", snow = env("#F7F9FB");
  const groundCol = env(winter ? "#EEF2F6" : p.season === "autumn" ? "#C9B58E" : p.season === "summer" ? "#93BA74" : "#A9C48A");
  const blossom = { spring: ["#F7B8CF", "#F29BBA", "#FBD3E2"], summer: ["#5FA35C", "#4E8F4C", "#79B86A"], autumn: ["#E58A3A", "#D4642E", "#F0B048"], winter: ["#F3F6F9", "#E3EAF0", "#FFFFFF"] }[p.season].map(env);
  const hedgeCol = env({ spring: "#7FAF6A", summer: "#5E9A55", autumn: "#C47A3A", winter: "#E8EEF3" }[p.season]);
  const band = lum(p.train) > 175 ? mix(p.train, "#2B3240", 0.72) : env("#F1EAD2");
  const stripeAlt = lum(p.canopy) > 200 ? lighten(p.canopy, -0.3) : env("#F7F7F5");
  const steel = env("#5A606B"), ink = "#1F2430", wood = env("#B9875A");
  const tree = (x, y) => {
    let s = box(x + 0.08, y + 0.08, 0, 0.14, 0.14, 0.75, env("#7A5A43"));
    const blobs = [];
    for (let k = 0; k < 8 + Math.floor(r() * 3); k++) blobs.push([x - 0.35 + r() * 0.65, y - 0.35 + r() * 0.65, 0.8 + r() * 0.7, 0.34 + r() * 0.2]);
    blobs.sort((a, b) => b[0] + b[1] - (a[0] + a[1]) || a[2] - b[2]);
    for (const [bx, by, bz, bs] of blobs) s += box(bx, by, bz, bs, bs, bs, blossom[Math.floor(r() * blossom.length)]);
    return s;
  };
  const cloth = ["#3E4A5C", "#C8553D", "#5B7C99", "#E8D9B5", "#7A5C8E", "#4E7D5B"].map(env), skin = ["#F1C9A5", "#D9A07A", "#A86F4C", "#7A4B32"].map(env);
  const pick = (a) => a[Math.floor(r() * a.length)];

  // ---------- slab, ground, track, platform ----------
  let base = box(-0.4, -0.4, -0.55, L + 0.8, D + 0.8, 0.55, dk ? lighten(p.backdrop, 0.12) : mix("#C9CED6", p.backdrop, 0.35));
  base += top(0, L, 0, D, 0.001, groundCol);
  base += box(0, 0.8, 0, L, 1.75, 0.1, env(winter ? "#C9CDD3" : "#A39C90"), false);
  for (let i = 0.15; i < L - 0.2; i += 0.42) base += top(i, i + 0.2, 1.0, 2.35, 0.102, env("#6B5546"));
  for (const yy of [1.3, 1.98]) base += box(0, yy, 0.1, L, 0.07, 0.07, env("#8C929C"), false);
  base += box(PX0, PY0, 0, PX1 - PX0, PY1 - PY0, PZ, env("#D9DCE1"));
  base += top(PX0, PX1, PY0, PY0 + 0.14, PZ + 0.002, env("#F3F4F6")) + top(PX0, PX1, PY0 + 0.22, PY0 + 0.36, PZ + 0.002, env("#E8C547"));
  for (let i = PX0 + 1; i < PX1 - 0.2; i += 1) base += top(i, i + 0.025, PY0 + 0.45, PY1, PZ + 0.002, env("#C9CDD3"));

  // ---------- canopy bays: posts, benches, vending, seated passengers ----------
  const nB = Math.max(2, Math.round(cLen / 1.9)), bayW = cLen / nB, vb = Math.floor(r() * nB);
  for (let k = 0; k <= nB; k++) { const px = Math.max(c0 + 0.1, Math.min(c1 - 0.2, c0 + k * bayW)); add(back, px, 5.45, box(px, 5.4, PZ, 0.12, 0.12, 1.9, steel)); }
  const vend = (x, col) => {
    let v = box(x, 4.3, PZ, 0.55, 0.5, 1.2, col);
    v += fy(x + 0.07, x + 0.48, 4.297, PZ + 0.62, PZ + 1.08, lamps ? LIT : env("#2B3240"));
    const prod = ["#E5484D", "#3E7BFA", "#F7F7F5", "#4CAF7A"];
    for (let row = 0; row < 3; row++) for (let c = 0; c < 4; c++) v += fy(x + 0.1 + c * 0.095, x + 0.16 + c * 0.095, 4.295, PZ + 0.68 + row * 0.13, PZ + 0.76 + row * 0.13, prod[(c + row) % 4]);
    return v + fy(x + 0.12, x + 0.43, 4.297, PZ + 0.12, PZ + 0.24, env("#2B3240")) + fy(x + 0.4, x + 0.46, 4.296, PZ + 0.38, PZ + 0.54, env("#E9EBEE"));
  };
  for (let g = 0; g < nB; g++) {
    const m = c0 + g * bayW + bayW / 2;
    if (g === vb) { add(back, m, 4.55, vend(m - 0.58, p.accent) + vend(m + 0.03, env("#E9EBEE"))); continue; }
    const bw = Math.min(1.3, bayW - 0.3), bx = m - bw / 2, leg = env("#4A4F58");
    let s = "";
    for (const lx of [bx + 0.1, bx + bw - 0.15]) s += box(lx, 4.64, PZ + 0.31, 0.05, 0.05, 0.36, leg);
    s += box(bx, 4.62, PZ + 0.38, bw, 0.05, 0.11, wood) + box(bx, 4.62, PZ + 0.54, bw, 0.05, 0.11, wood);
    for (const lx of [bx + 0.1, bx + bw - 0.16]) s += box(lx, 4.3, PZ, 0.06, 0.3, 0.25, leg);
    s += box(bx, 4.25, PZ + 0.25, bw, 0.4, 0.06, wood);
    if (p.people && r() > 0.4) {
      const sx = bx + 0.15 + r() * (bw - 0.5), pants = env("#2F3540");
      s += box(sx, 4.44, PZ + 0.31, 0.2, 0.16, 0.32, pick(cloth)) + box(sx + 0.04, 4.46, PZ + 0.63, 0.12, 0.12, 0.13, pick(skin));
      s += box(sx + 0.01, 4.24, PZ + 0.31, 0.18, 0.2, 0.08, pants) + box(sx + 0.02, 4.18, PZ, 0.16, 0.07, 0.31, pants);
    }
    add(back, m, 4.45, s);
  }
  for (let i = 0.5; i < L - 0.6; i += 2.1 + r() * 1.3) add(back, i + 0.15, 6.6, tree(i, 6.75));

  // ---------- ticket booth (nearer than the canopy gable) ----------
  {
    const bx = 0.75, by = 3.85, bw = 1.5, bd = 1.4, bh = 1.45, z0 = PZ, tp = z0 + bh;
    let s = box(bx, by, z0, bw, bd, bh, env("#F3E3C8"));
    s += fy(bx + 0.2, bx + bw - 0.2, by - 0.003, z0 + 0.55, z0 + 1.15, lamps ? LIT2 : env("#3D4654"));
    s += box(bx + 0.15, by - 0.18, z0 + 0.5, bw - 0.3, 0.18, 0.06, env("#C9B49A"));
    s += fx(bx - 0.003, by + 0.3, by + bd - 0.3, z0 + 0.6, z0 + 1.15, night ? LIT : shade(env("#7E93A8"), [-1, 0, 0]));
    s += box(bx - 0.12, by - 0.12, tp, bw + 0.24, bd + 0.24, 0.14, p.canopy);
    const ts = tp + 0.14 + (winter ? 0.04 : 0);
    if (winter) s += box(bx - 0.1, by - 0.1, tp + 0.14, bw + 0.2, bd + 0.2, 0.04, snow, false);
    s += box(bx + 0.2, by + 0.3, ts, bw - 0.4, 0.08, 0.3, p.accent);
    for (let k = 0; k < 3; k++) s += fy(bx + 0.35 + k * 0.28, bx + 0.53 + k * 0.28, by + 0.297, ts + 0.1, ts + 0.2, ink);
    add(mid, bx + bw / 2, by + bd / 2, s);
  }

  // ---------- station clock ----------
  {
    const kx = L - 1.0, ky = 3.7, zc = 3.05, R = 0.2;
    let s = box(kx, ky, PZ, 0.1, 0.1, 2.3, steel) + box(kx - 0.22, ky - 0.17, 2.78, 0.54, 0.44, 0.54, "#2B3240");
    const [hh, mm] = night ? [9, 50] : dusk ? [6, 40] : [10, 10];
    const ah = ((hh % 12) + mm / 60) * Math.PI / 6, am = (mm * Math.PI) / 30, face = lamps ? LIT2 : "#F7F7F5";
    const circ = (f) => { const a = []; for (let i = 0; i < 28; i++) { const t = (i / 28) * Math.PI * 2; a.push(f(Math.sin(t) * R, Math.cos(t) * R)); } return a; };
    const yF = ky - 0.173, xC = kx + 0.05, xF = kx - 0.223, yC = ky + 0.05;
    s += poly(circ((u, v) => [xC + u, yF, zc + v]), face) + line([[xC, yF, zc], [xC + Math.sin(ah) * 0.11, yF, zc + Math.cos(ah) * 0.11]], ink, 2.2) + line([[xC, yF, zc], [xC + Math.sin(am) * 0.16, yF, zc + Math.cos(am) * 0.16]], ink, 1.4);
    s += poly(circ((u, v) => [xF, yC - u, zc + v]), lamps ? face : lighten(face, -0.06)) + line([[xF, yC, zc], [xF, yC - Math.sin(ah) * 0.11, zc + Math.cos(ah) * 0.11]], ink, 2.2) + line([[xF, yC, zc], [xF, yC - Math.sin(am) * 0.16, zc + Math.cos(am) * 0.16]], ink, 1.4);
    add(mid, kx, ky, s);
  }

  // ---------- standing passengers: behind the tactile line, clear of booth and clock ----------
  if (p.people) {
    const xs = [], lo = c0 - 0.3, hi = L - 1.9;
    for (let t = 0; t < 40 && xs.length < cars + 2; t++) { const x = lo + r() * (hi - lo); if (xs.every((q) => Math.abs(q - x) > 0.45)) xs.push(x); }
    for (const x of xs) {
      const y = 3.2 + r() * 0.2;
      let s = box(x, y, PZ, 0.16, 0.12, 0.26, env("#2F3540")) + box(x - 0.02, y - 0.02, PZ + 0.26, 0.2, 0.16, 0.3, pick(cloth)) + box(x + 0.02, y, PZ + 0.56, 0.12, 0.12, 0.13, pick(skin));
      if (r() > 0.55) s += box(x + 0.18, y, PZ + 0.28, 0.06, 0.12, 0.15, env("#7A5A43"));
      add(mid, x + 0.08, y + 0.06, s);
    }
  }

  // ---------- gabled canopy, valance, lamps, ridge name board ----------
  const roofTone = winter ? snow : dk ? mix(p.canopy, p.backdrop, 0.2) : lighten(p.canopy, -0.07), seam = lighten(roofTone, -0.13);
  let canopy = box(rx0, ry0, 2.35, rx1 - rx0, ry1 - ry0, 0.16, p.canopy);
  canopy += quad([rx0, ryM, rz], [rx1, ryM, rz], [rx1, ry1, ez], [rx0, ry1, ez], shade(roofTone, [0, 0.6, 0.8]));
  canopy += poly([[rx0, ry0, ez], [rx0, ryM, rz], [rx0, ry1, ez]], shade(p.canopy, [-1, 0, 0]));
  canopy += quad([rx0, ry0, ez], [rx1, ry0, ez], [rx1, ryM, rz], [rx0, ryM, rz], shade(roofTone, [0, -0.6, 0.8]));
  for (let x = rx0 + 0.45; x < rx1 - 0.1; x += 0.45) canopy += line([[x, ry0, ez], [x, ryM, rz]], seam, 0.7);
  canopy += line([[rx0, ryM, rz], [rx1, ryM, rz]], lighten(roofTone, -0.18), 1.4);
  const ns = Math.max(6, Math.round((rx1 - rx0) * 3.2)), vy = ry0 - 0.005;
  for (let i = 0; i < ns; i++) {
    const xa = rx0 + (i * (rx1 - rx0)) / ns, xb = rx0 + ((i + 1) * (rx1 - rx0)) / ns, c = shade(i % 2 ? stripeAlt : p.canopy, [0, -1, 0]);
    canopy += quad([xa, vy, 2.35], [xb, vy, 2.35], [xb, vy, 2.19], [(xa + xb) / 2, vy, 2.15], c) + quad([xa, vy, 2.19], [(xa + xb) / 2, vy, 2.15], [xb, vy, 2.19], [xa, vy, 2.19], c);
  }
  for (let k = 1; k < nB; k++) { const lx = c0 + k * bayW; canopy += line([[lx, 3.97, 2.35], [lx, 3.97, 2.17]], steel, 1.2) + box(lx - 0.08, 3.91, 2.01, 0.16, 0.12, 0.16, lamps ? LIT : env("#E4E6EA")); }
  for (const hx of [sx0 + 0.25, sx0 + signW - 0.3]) canopy += box(hx, ryM - 0.02, rz - 0.02, 0.05, 0.05, 0.16, steel, false);
  const bz = rz + 0.12;
  canopy += box(sx0, ryM - 0.03, bz, signW, 0.06, 0.84, lamps ? LIT2 : "#F7F7F5");
  canopy += fy(sx0, sx0 + signW, ryM - 0.033, bz, bz + 0.1, p.accent) + fy(sx0, sx0 + signW, ryM - 0.033, bz + 0.74, bz + 0.84, p.accent);
  const [tx, ty] = P(smid, ryM - 0.035, bz + 0.42 - fsW * 0.35);
  canopy += `<text transform="matrix(0.866,-0.5,0,1,${tx.toFixed(1)},${ty.toFixed(1)})" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="${(fsW * S).toFixed(1)}" font-weight="700" letter-spacing="${(fsW * S * 0.04).toFixed(2)}" text-anchor="middle" fill="${nightTint(ink)}">${nm}</text>`;

  // ---------- train ----------
  const tx0 = (L - trainLen) / 2 + 0.2, ty0 = 1.1, td = 1.15, roofCol = winter ? snow : env("#9AA0A8");
  const winDay = dusk ? "#F6C28B" : env("#5E7187");
  const win = () => (night ? (r() > 0.15 ? LIT : "#3B4256") : dusk && r() > 0.55 ? LIT : shade(winDay, [0, -1, 0]));
  let trainSvg = "";
  for (let c = 0; c < cars; c++) {
    const x = tx0 + c * (CL + CG), y = ty0;
    let s = box(x + 0.35, y + 0.12, 0.17, CL - 0.7, td - 0.24, 0.14, "#3A3F48", false);
    if (c > 0) s += box(x - CG, y + 0.48, 0.4, CG, 0.2, 0.18, "#3A3F48");
    s += box(x, y, 0.31, CL, td, 0.44, p.train) + box(x, y, 0.75, CL, td, 0.5, band) + fy(x, x + CL, y - 0.003, 0.66, 0.71, p.accent);
    for (const dx of [x + 0.5, x + CL - 0.9]) s += fy(dx, dx + 0.4, y - 0.004, 0.36, 1.16, shade(lighten(p.train, -0.1), [0, -1, 0])) + fy(dx + 0.08, dx + 0.32, y - 0.005, 0.82, 1.08, win());
    const w0 = x + 1.02, w1 = x + CL - 1.02, ww = (w1 - w0 - 0.24) / 3;
    for (let i = 0; i < 3; i++) s += fy(w0 + i * (ww + 0.12), w0 + i * (ww + 0.12) + ww, y - 0.004, 0.85, 1.12, win());
    s += box(x + 0.06, y + 0.06, 1.25, CL - 0.12, td - 0.12, 0.1, roofCol);
    for (const ax of [x + 0.6, x + CL - 1.2]) s += box(ax, y + 0.3, 1.35, 0.6, 0.55, 0.12, env("#C4C9D0"));
    if (c === 0) {
      const hl = lamps ? LIT : "#FFF3C4";
      s += fx(x - 0.003, y + 0.15, y + td - 0.15, 0.85, 1.15, win()) + fx(x - 0.004, y + 0.14, y + 0.32, 0.44, 0.54, hl) + fx(x - 0.004, y + td - 0.32, y + td - 0.14, 0.44, 0.54, hl);
    }
    trainSvg = s + trainSvg;
  }

  // ---------- low front hedges (below the train's sightline) ----------
  for (let x = 0.15; x < L - 0.5; ) {
    const w = Math.min(0.8 + r() * 1.4, L - 0.15 - x);
    if (r() > 0.3) add(near, x + w / 2, 0.35, box(x, 0.15, 0, w, 0.4, 0.26, hedgeCol));
    x += w + 0.3;
  }

  const sky = night ? mix(p.backdrop, "#0E1224", 0.6) : dusk ? mix(p.backdrop, "#F2B8A0", 0.35) : p.backdrop;
  const glow = night ? `<radialGradient id="g" cx="50%" cy="40%" r="60%"><stop offset="0" stop-color="#2A3358"/><stop offset="1" stop-color="${sky}"/></radialGradient>` : `<radialGradient id="g" cx="50%" cy="35%" r="65%"><stop offset="0" stop-color="${lighten(sky, 0.04)}"/><stop offset="1" stop-color="${sky}"/></radialGradient>`;
  const [sx, sy] = P(L / 2, D / 2, -0.55);
  const shadow = `<ellipse cx="${sx.toFixed(1)}" cy="${(sy + 18).toFixed(1)}" rx="${((L + D) * 0.47 * S).toFixed(1)}" ry="${((L + D) * 0.2 * S).toFixed(1)}" fill="${dark ? "#000000" : "#1D2330"}" opacity="${dark ? 0.35 : 0.16}" filter="url(#soft)"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><defs>${glow}<filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="0" stdDeviation="4" flood-color="#FFC861" flood-opacity="0.85"/></filter><filter id="soft" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="22"/></filter></defs><rect width="${W}" height="${H}" fill="url(#g)"/>${shadow}${base}${flush(back)}${canopy}${flush(mid)}${trainSvg}${flush(near)}</svg>`;
}
