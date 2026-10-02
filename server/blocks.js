// Block assets: a program's build(p) returns plain parts in metres (y up), and everything else is derived from
// them: the 3D model in the browser (public/world3d.js), GLB export, and this isometric SVG for thumbnails.
//
// Part types (all positions in metres, y up):
//   { t: "box",   p: [x, y, z], s: [w, h, d], c: "#hex", e?: true }        p is the min corner
//   { t: "gable", p: [x, y, z], s: [w, h, d], c, axis: "x" | "z" }        a pitched roof, ridge along axis
//   { t: "cyl",   p: [cx, y, cz], r, h, c, n?: 8 }                         n-sided prism standing on y
//   { t: "cone",  p: [cx, y, cz], r, h, c, n?: 8 }
// `e: true` marks a light (lit windows, lamps): emissive in 3D, glows at night.
//
// The isometric projection and face lighting follow jdan/isomer (MIT, js/isomer.js): 30-degree axes, faces lit by
// their normal against a light at (2, -1, 3) in isomer's space, painted far to near.

const MAX_PARTS = 8000;
const HEX = /^#[0-9a-fA-F]{6}$/;
const num = (v) => typeof v === "number" && Number.isFinite(v) && Math.abs(v) < 1000;
const vec = (a, n) => Array.isArray(a) && a.length === n && a.every(num);

/** Checks a build() result and returns clean parts, or throws with the first problem. */
export function validateParts(out) {
  const parts = Array.isArray(out) ? out : out?.parts;
  if (!Array.isArray(parts) || !parts.length) throw new Error("build() must return { parts: [...] } with at least one part");
  if (parts.length > MAX_PARTS) throw new Error(`too many parts (${parts.length} > ${MAX_PARTS})`);
  return parts.map((q, i) => {
    const bad = (m) => { throw new Error(`part ${i} (${q?.t}): ${m}`); };
    if (!q || typeof q !== "object") bad("not an object");
    if (!HEX.test(q.c || "")) bad("c must be a #rrggbb colour");
    const base = { t: q.t, c: q.c.toUpperCase(), ...(q.e ? { e: true } : {}) };
    if (q.t === "box" || q.t === "gable") {
      if (!vec(q.p, 3) || !vec(q.s, 3) || q.s.some((v) => v <= 0)) bad("needs p [x,y,z] and positive s [w,h,d]");
      return { ...base, p: q.p, s: q.s, ...(q.t === "gable" ? { axis: q.axis === "z" ? "z" : "x" } : {}) };
    }
    if (q.t === "cyl" || q.t === "cone") {
      if (!vec(q.p, 3) || !num(q.r) || q.r <= 0 || !num(q.h) || q.h <= 0) bad("needs p [cx,y,cz], r > 0 and h > 0");
      return { ...base, p: q.p, r: q.r, h: q.h, n: Math.max(3, Math.min(24, Math.round(q.n || 8))) };
    }
    bad("unknown type");
  });
}

/** Axis-aligned bounds of a part list: [[minX, minY, minZ], [maxX, maxY, maxZ]]. */
export function bounds(parts) {
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  const grow = (x, y, z) => { lo[0] = Math.min(lo[0], x); lo[1] = Math.min(lo[1], y); lo[2] = Math.min(lo[2], z); hi[0] = Math.max(hi[0], x); hi[1] = Math.max(hi[1], y); hi[2] = Math.max(hi[2], z); };
  for (const q of parts) {
    if (q.s) { grow(...q.p); grow(q.p[0] + q.s[0], q.p[1] + q.s[1], q.p[2] + q.s[2]); }
    else { grow(q.p[0] - q.r, q.p[1], q.p[2] - q.r); grow(q.p[0] + q.r, q.p[1] + q.h, q.p[2] + q.r); }
  }
  return [lo, hi];
}

// ---------- colour ----------
const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const rgbHex = (r, g, b) => "#" + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
function lighten(hex, amt) {
  let [r, g, b] = hexRgb(hex).map((v) => v / 255);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  let h = 0, s = 0;
  if (mx !== mn) {
    const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    h = (mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4) / 6;
  }
  const L = Math.max(0, Math.min(1, l + amt));
  if (s === 0) return rgbHex(L * 255, L * 255, L * 255);
  const q = L < 0.5 ? L * (1 + s) : L + s - L * s, p = 2 * L - q;
  const f = (t) => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
  return rgbHex(f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255);
}

/**
 * Renders parts as an isometric SVG. World (x, y up, z) maps to isomer's space as (x, z, y), viewed from -x/-z.
 * Faces are emitted per part and painted in order of depth, which is right for the separated, grid-aligned parts
 * kit pieces are made of.
 */
export function projectSvg(parts, { width = 1200, height = 1200, background = "#E9ECF1", night = false } = {}) {
  const LIGHT = (() => { const v = [2, -1, 3], n = Math.hypot(...v); return v.map((c) => c / n); })();
  // normal in world space (x, y, z) -> isomer space (x, z, y)
  const shade = (hex, [nx, ny, nz]) => lighten(hex, 0.2 * (nx * LIGHT[0] + nz * LIGHT[1] + ny * LIGHT[2]));
  const [lo, hi] = bounds(parts);
  const pad = 0.12;
  const proj = (x, y, z) => [(x - z) * 0.866, -(x + z) * 0.5 - y];
  // fit: project the 8 bound corners
  const corners = [];
  for (const x of [lo[0], hi[0]]) for (const y of [lo[1], hi[1]]) for (const z of [lo[2], hi[2]]) corners.push(proj(x, y, z));
  const minX = Math.min(...corners.map((c) => c[0])), maxX = Math.max(...corners.map((c) => c[0]));
  const minY = Math.min(...corners.map((c) => c[1])), maxY = Math.max(...corners.map((c) => c[1]));
  const S = Math.min((width * (1 - 2 * pad)) / (maxX - minX || 1), (height * (1 - 2 * pad)) / (maxY - minY || 1));
  const ox = width / 2 - ((minX + maxX) / 2) * S, oy = height / 2 - ((minY + maxY) / 2) * S;
  const P = (x, y, z) => { const [a, b] = proj(x, y, z); return `${(ox + a * S).toFixed(1)},${(oy + b * S).toFixed(1)}`; };
  const NIGHT = "#151B3A";
  const tint = (hex, lit) => (lit ? "#FFD58A" : night ? rgbHex(...hexRgb(lighten(hex, -0.1)).map((v, i) => v + (hexRgb(NIGHT)[i] - v) * 0.48)) : hex);
  const poly = (pts, fill, edge) => `<polygon points="${pts.map((q) => P(...q)).join(" ")}" fill="${fill}"${edge ? ` stroke="${edge}" stroke-width="0.5" stroke-linejoin="round"` : ""}/>`;

  const items = [];
  for (const q of parts) {
    const lit = q.e && night;
    const col = tint(q.c, lit);
    const edge = lighten(col, -0.18);
    let svg = "", key;
    if (q.t === "box") {
      const [x, y, z] = q.p, [w, h, d] = q.s;
      key = x + w / 2 + z + d / 2 - y * 0.01;
      svg += poly([[x, y, z], [x, y, z + d], [x, y + h, z + d], [x, y + h, z]], shade(col, [-1, 0, 0]), edge);
      svg += poly([[x, y, z], [x + w, y, z], [x + w, y + h, z], [x, y + h, z]], shade(col, [0, 0, -1]), edge);
      svg += poly([[x, y + h, z], [x + w, y + h, z], [x + w, y + h, z + d], [x, y + h, z + d]], shade(col, [0, 1, 0]), edge);
    } else if (q.t === "gable") {
      const [x, y, z] = q.p, [w, h, d] = q.s;
      key = x + w / 2 + z + d / 2 - y * 0.01;
      if (q.axis === "x") {
        const m = z + d / 2;
        svg += poly([[x, y, z + d], [x + w, y, z + d], [x + w, y + h, m], [x, y + h, m]], shade(col, [0, 0.7, 0.7]), edge);
        svg += poly([[x, y, z], [x + w, y, z], [x + w, y + h, m], [x, y + h, m]], shade(col, [0, 0.7, -0.7]), edge);
        svg += poly([[x, y, z], [x, y + h, m], [x, y, z + d]], shade(col, [-1, 0, 0]), edge);
      } else {
        const m = x + w / 2;
        svg += poly([[x + w, y, z], [x + w, y, z + d], [m, y + h, z + d], [m, y + h, z]], shade(col, [0.7, 0.7, 0]), edge);
        svg += poly([[x, y, z], [x, y, z + d], [m, y + h, z + d], [m, y + h, z]], shade(col, [-0.7, 0.7, 0]), edge);
        svg += poly([[x, y, z], [m, y + h, z], [x + w, y, z]], shade(col, [0, 0, -1]), edge);
      }
    } else {
      const [cx, y, cz] = q.p, n = q.n, r = q.r, h = q.h;
      key = cx + cz - y * 0.01;
      const ring = (yy, rr) => Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2 + Math.PI / n; return [cx + Math.cos(a) * rr, yy, cz + Math.sin(a) * rr]; });
      const bot = ring(y, r), top = q.t === "cyl" ? ring(y + h, r) : null, apex = [cx, y + h, cz];
      const sides = [];
      for (let i = 0; i < n; i++) {
        const a = bot[i], b = bot[(i + 1) % n];
        const mid = [(a[0] + b[0]) / 2 - cx, 0, (a[2] + b[2]) / 2 - cz];
        const len = Math.hypot(mid[0], mid[2]) || 1;
        const nrm = [mid[0] / len, q.t === "cone" ? r / h : 0, mid[2] / len];
        if (nrm[0] + nrm[2] > 0.0001) continue; // faces away from the viewer at -x/-z
        const face = q.t === "cyl" ? [a, b, top[(i + 1) % n], top[i]] : [a, b, apex];
        sides.push([-(mid[0] + mid[2]), poly(face, shade(col, nrm), edge)]);
      }
      sides.sort((A, B) => A[0] - B[0]);
      svg += sides.map((s) => s[1]).join("");
      if (top) svg += poly(top, shade(col, [0, 1, 0]), edge);
    }
    items.push([key, svg, q.e && night]);
  }
  items.sort((a, b) => b[0] - a[0]);
  const bg = night ? "#1B2135" : background;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
<defs><filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.5"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
<rect width="${width}" height="${height}" fill="${bg}"/>
${items.map(([, s, glow]) => (glow ? `<g filter="url(#glow)">${s}</g>` : s)).join("\n")}
</svg>`;
}
