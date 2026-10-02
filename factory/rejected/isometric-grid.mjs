// Isometric lattice of lines or dots with balanced, seeded motifs of extruded cubes, lit and shaded in OKLab.
export const meta = {
  title: "Isometric Blocks",
  kind: "pattern",
  description: "An isometric triangle or dot grid with evenly spread sculpted cube motifs, adjustable lighting and shading. Use it for tech backgrounds, hero sections and slide decks.",
  tags: ["isometric", "grid", "cubes", "pattern", "background", "3d", "geometric", "dots"],
  price: 4,
  author: "oasis-factory",
  size: [800, 600],
};

export const params = {
  knobs: {
    background: { type: "color", role: "background", label: "Background", default: "#F3F1EC" },
    grid: { type: "color", role: "muted", label: "Grid", default: "#CBC4B6" },
    cube: { type: "color", role: "primary", label: "Cubes", default: "#3F5BD9" },
    accent: { type: "color", role: "highlight", label: "Accent cubes", default: "#FF8A5B" },
    mode: { type: "choice", label: "Grid mode", default: "lines + dots", options: ["lines", "dots", "lines + dots"] },
    shading: { type: "choice", label: "Shading palette", default: "tonal", options: ["tonal", "duotone", "paper", "wire"] },
    light: { type: "choice", label: "Light from", default: "left", options: ["left", "right", "top"] },
    cell: { type: "range", label: "Cell size", default: 24, min: 16, max: 36, step: 2 },
    density: { type: "range", label: "Cube density", default: 45, min: 10, max: 100, step: 5 },
    contrast: { type: "range", label: "Face contrast", default: 0.12, min: 0.04, max: 0.22, step: 0.01 },
    seed: { type: "range", label: "Seed", default: 7, min: 1, max: 200, step: 1 },
  },
  presets: {
    Blueprint: { background: "#0E1B33", grid: "#2D4A7A", cube: "#3D7BEA", accent: "#FFC24B" },
    Sage: { background: "#E8EDE6", grid: "#B7C4B3", cube: "#4F7A5E", accent: "#E9B44C" },
    Clay: { background: "#F6EEE7", grid: "#D9C3B3", cube: "#C4643F", accent: "#2E6F73" },
    Neon: { background: "#111114", grid: "#34343C", cube: "#7B61FF", accent: "#39F5C4" },
  },
};

const W = 800, H = 600;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const f = (n) => +n.toFixed(2);
const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
const MOTIFS = [
  [[0, 0, 3]],
  [[0, 0, 3], [1, 0, 2], [2, 0, 1]],
  [[0, 0, 2], [1, 0, 1], [0, 1, 1], [1, 1, 1]],
  [[0, 0, 2], [1, 0, 2], [0, 1, 2], [1, 1, 2]],
  [[0, 0, 2], [1, 0, 1], [0, 1, 1]],
  [[0, 0, 1], [1, 0, 1], [2, 0, 1]],
  [[0, 0, 2], [1, 0, 1], [2, 0, 2]],
  [[0, 0, 3], [1, 0, 1], [0, 1, 2]],
  [[0, 0, 2], [0, 1, 1], [1, 1, 1]],
];

function toLab(hex) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}

function fromLab(L, A, B) {
  const l = Math.pow(L + 0.3963377774 * A + 0.2158037573 * B, 3);
  const m = Math.pow(L - 0.1055613458 * A - 0.0638541728 * B, 3);
  const s = Math.pow(L - 0.0894841775 * A - 1.291485548 * B, 3);
  const rgb = [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
  return "#" + rgb.map((c) => {
    c = clamp(c, 0, 1);
    c = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
    return Math.round(c * 255).toString(16).padStart(2, "0");
  }).join("");
}

function tone(hex, dL, lo = 0, hi = 1, cmax = 0.37) {
  const [L, a, b] = toLab(hex);
  const C = Math.hypot(a, b), k = C > cmax ? cmax / C : 1;
  return fromLab(clamp(clamp(L, lo, hi) + dL, 0.04, 0.98), a * k, b * k);
}

function hash(x, y, s) {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

function faces(light, k) {
  if (light === "right") return { t: k, l: -k, r: 0 };
  if (light === "top") return { t: k * 1.1, l: -k * 0.45, r: -k * 0.8 };
  return { t: k, l: 0, r: -k };
}

function material(p, acc, bgL, F) {
  const sh = (hex, d) => tone(hex, d, 0.44, 0.72, 0.2);
  const solid = (hex) => ({ t: sh(hex, F.t), l: sh(hex, F.l), r: sh(hex, F.r) });
  const seam = (m) => ({ ...m, sw: 0.75, st: { t: tone(m.t, -0.06), l: tone(m.l, -0.06), r: tone(m.r, -0.06) } });
  const base = acc ? p.accent : p.cube;
  if (p.shading === "tonal") return seam(solid(base));
  if (p.shading === "duotone") {
    const c = solid(p.cube), a = solid(p.accent);
    return seam(acc ? { t: c.t, l: a.l, r: a.r } : { t: a.t, l: c.l, r: c.r });
  }
  if (p.shading === "paper") {
    const ink = tone(p.grid, bgL > 0.5 ? -0.22 : 0.22);
    const b = bgL < 0.5 ? 0.1 : -0.04, g = (d) => tone(p.background, b + d * 0.6);
    const m = acc ? solid(p.accent) : { t: g(F.t), l: g(F.l), r: g(F.r) };
    return { ...m, sw: 1, st: { t: ink, l: ink, r: ink } };
  }
  const line = tone(base, 0, bgL > 0.5 ? 0.3 : 0.62, bgL > 0.5 ? 0.62 : 0.9, 0.25);
  const op = (d) => f(clamp(0.1 + d * 1.3, 0.02, 0.4));
  return { t: line, wire: true, op: { t: op(F.t), l: op(F.l), r: op(F.r) } };
}

export default function render(p) {
  const s = p.cell, w = (s * Math.sqrt(3)) / 2, ox = W / 2, oy = H / 2;
  const bgL = toLab(p.background)[0];
  let gridC = p.grid;
  if (Math.abs(toLab(gridC)[0] - bgL) < 0.1) gridC = tone(p.background, bgL > 0.5 ? -0.16 : 0.16);
  const lw = s < 24 ? 0.75 : 1;

  let grid = "", defs = "";
  if (p.mode !== "dots") {
    let d = "";
    const c0 = Math.ceil(-ox / w), c1 = Math.floor((W - ox) / w);
    for (let c = c0; c <= c1; c++) d += `M${f(ox + c * w)} 0V${H}`;
    const span = ox / Math.sqrt(3);
    const k0 = Math.floor((-oy - span) / s) - 1, k1 = Math.ceil((H - oy + span) / s) + 1;
    for (let k = k0; k <= k1; k++) {
      d += `M0 ${f(oy - span + k * s)}L${W} ${f(oy + span + k * s)}`;
      d += `M0 ${f(oy + span + k * s)}L${W} ${f(oy - span + k * s)}`;
    }
    grid += `<path d="${d}" stroke="${gridC}" stroke-width="${lw}" fill="none" opacity="${p.mode === "lines" ? 0.85 : 0.55}"/>`;
  }
  if (p.mode !== "lines") {
    const r = f(Math.max(1.2, s * 0.065) * (p.mode === "dots" ? 1 : 1.3));
    const dot = (x, y) => `<circle cx="${f(x)}" cy="${f(y)}" r="${r}"/>`;
    defs += `<pattern id="dt" patternUnits="userSpaceOnUse" x="${f(ox)}" y="${f(oy)}" width="${f(2 * w)}" height="${s}"><g fill="${gridC}">${dot(0, 0)}${dot(2 * w, 0)}${dot(0, s)}${dot(2 * w, s)}${dot(w, s / 2)}</g></pattern>`;
    grid += `<rect width="${W}" height="${H}" fill="url(#dt)"/>`;
  }

  const seed = p.seed * 31 + 5, m = Math.round(s * 0.75 + 12);
  const zw = 5.5 * w, zh = 6.5 * s;
  const cols = Math.max(1, Math.floor((W - 2 * m) / zw)), rows = Math.max(1, Math.floor((H - 2 * m) / zh));
  const gx0 = (W - cols * zw) / 2, gy0 = (H - rows * zh) / 2;
  const bx = Math.floor(hash(3, 5, seed) * 4), by = Math.floor(hash(5, 3, seed) * 4);
  const zones = [];
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    zones.push({ i, j, rank: (BAYER[(j + by) % 4][(i + bx) % 4] + hash(i, j, seed) * 3) / 18 });
  }
  zones.sort((a, b) => a.rank - b.rank);
  const k = Math.max(1, Math.round((zones.length * p.density) / 100));
  const F = faces(p.light, p.contrast);
  const mats = [material(p, false, bgL, F), material(p, true, bgL, F)];

  const cubes = [];
  zones.slice(0, k).forEach((z, idx) => {
    let mo = MOTIFS[Math.floor(hash(z.i, z.j, seed + 2) * MOTIFS.length)];
    if (hash(z.i, z.j, seed + 3) < 0.5) mo = mo.map(([a, b, h]) => [b, a, h]);
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const [dx, dy, h] of mo) {
      const cx = (dx - dy) * w, cy = ((dx + dy) * s) / 2;
      x0 = Math.min(x0, cx - w); x1 = Math.max(x1, cx + w);
      y0 = Math.min(y0, cy - h * s); y1 = Math.max(y1, cy + s);
    }
    const zx = gx0 + (z.i + 0.5) * zw, zy = gy0 + (z.j + 0.5) * zh;
    const jx = (hash(z.i, z.j, seed + 5) - 0.5) * 2 * Math.max(0, (zw - (x1 - x0)) / 2 - w / 2);
    const jy = (hash(z.i, z.j, seed + 6) - 0.5) * 2 * Math.max(0, (zh - (y1 - y0)) / 2 - s / 2);
    const tx = zx + jx - (x0 + x1) / 2, ty = zy + jy - (y0 + y1) / 2;
    const c = Math.round((tx - ox) / w), rf = (ty - oy) / (s / 2);
    let r = Math.round(rf);
    if ((c + r) & 1) r += rf > r ? 1 : -1;
    const acc = k === 1 || idx % 5 === 1;
    for (const [dx, dy, h] of mo) {
      const X = (c + r) / 2 + dx, Y = (r - c) / 2 + dy;
      for (let Z = 0; Z < h; Z++) cubes.push({ X, Y, Z, acc, x: ox + (X - Y) * w, y: oy + ((X + Y) * s) / 2 - Z * s });
    }
  });
  cubes.sort((a, b) => a.X + a.Y + a.Z - (b.X + b.Y + b.Z) || a.Z - b.Z);

  const pt = (x, y) => `${f(x)},${f(y)}`;
  let body = "";
  for (const q of cubes) {
    const x = q.x, y = q.y, mt = mats[q.acc ? 1 : 0];
    const tp = `M${pt(x, y - s)}L${pt(x + w, y - s / 2)}L${pt(x, y)}L${pt(x - w, y - s / 2)}Z`;
    const left = `M${pt(x - w, y - s / 2)}L${pt(x, y)}L${pt(x, y + s)}L${pt(x - w, y + s / 2)}Z`;
    const right = `M${pt(x, y)}L${pt(x + w, y - s / 2)}L${pt(x + w, y + s / 2)}L${pt(x, y + s)}Z`;
    if (mt.wire) {
      body += `<g fill="${mt.t}" stroke="${mt.t}" stroke-width="${f(lw * 1.4)}" stroke-linejoin="round"><path d="${tp}" fill-opacity="${mt.op.t}"/><path d="${left}" fill-opacity="${mt.op.l}"/><path d="${right}" fill-opacity="${mt.op.r}"/></g>`;
    } else {
      body += `<g stroke-linejoin="round" stroke-width="${mt.sw}"><path d="${tp}" fill="${mt.t}" stroke="${mt.st.t}"/><path d="${left}" fill="${mt.l}" stroke="${mt.st.l}"/><path d="${right}" fill="${mt.r}" stroke="${mt.st.r}"/></g>`;
    }
  }
  if (p.shading !== "wire" && body) {
    const dx = p.light === "left" ? s * 0.12 : p.light === "right" ? -s * 0.12 : 0;
    defs += `<filter id="sh" x="-15%" y="-15%" width="130%" height="135%"><feDropShadow dx="${f(dx)}" dy="${f(s * 0.18)}" stdDeviation="${f(s * 0.22)}" flood-color="${tone(p.background, -0.35)}" flood-opacity="${bgL > 0.5 ? 0.22 : 0.4}"/></filter>`;
    body = `<g filter="url(#sh)">${body}</g>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><defs>${defs}</defs><rect width="${W}" height="${H}" fill="${p.background}"/>${grid}${body}</svg>`;
}
