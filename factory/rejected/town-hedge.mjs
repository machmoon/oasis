// Town Hedge: a clipped garden hedge on a kerb, with an optional garden gate. Block asset: build(p)
// returns parts in metres on the Oasis Town grid (origin at the footprint's corner, y up, street side at z = 0).
export const meta = {
  title: "Town Hedge",
  kind: "3d",
  format: "blocks",
  kit: "Oasis Town",
  description: "A clipped, leafy garden hedge on a kerb that tiles end to end along a street, with flowering tops, topiary balls and an optional wooden garden gate.",
  tags: ["3d", "low poly", "hedge", "garden", "boundary", "gate", "topiary", "town", "kit"],
  price: 1,
  author: "oasis-factory",
  footprint: [6, 1],
  size: [1000, 1000],
};

export const params = {
  knobs: {
    leaf: { type: "color", role: "primary", label: "Leaf", default: "#79B86A" },
    bloom: { type: "color", role: "highlight", label: "Blossom", default: "#F7B8CF" },
    wood: { type: "color", role: "secondary", label: "Gate wood", default: "#8A6E52" },
    kerb: { type: "color", role: "muted", label: "Kerb", default: "#D9DCE1" },
    height: { type: "range", label: "Height (m)", default: 1.0, min: 0.6, max: 1.8, step: 0.1 },
    top: { type: "choice", label: "Top", default: "clipped", options: ["clipped", "stepped", "topiary"] },
    blossoms: { type: "range", label: "Blossom clusters", default: 4, min: 0, max: 9, step: 1 },
    gate: { type: "toggle", label: "Gate gap", default: true },
  },
  presets: {
    Formal: { leaf: "#2F7A55", bloom: "#F6EEE0", wood: "#5B6270", kerb: "#F3E3C8" },
    Autumn: { leaf: "#8E9A45", bloom: "#C8553D", wood: "#6E5440", kerb: "#D8DEE3" },
    Spring: { leaf: "#8CCB6E", bloom: "#F2B33D", wood: "#B08A62", kerb: "#F6EEE0" },
  },
};

// ---------- colour helpers ----------
function hexToRgb(h) {
  const s = String(h || "#79B86A").replace("#", "");
  const n = parseInt(s.length === 3 ? s.split("").map((c) => c + c).join("") : s.slice(0, 6), 16) || 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgbToHex(r) {
  return "#" + r.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("").toUpperCase();
}
function rgbToHsl(c) {
  const r = c[0] / 255, g = c[1] / 255, b = c[2] / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}
function hsl(h, s, l) {
  h = ((h % 360) + 360) % 360; s = Math.max(0, Math.min(1, s)); l = Math.max(0, Math.min(1, l));
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return rgbToHex([(r + m) * 255, (g + m) * 255, (b + m) * 255]);
}
// brand hue passes through, pulled toward a natural hue for the material, saturation/lightness clamped
function tune(hex, hue, pull, smin, smax, lmin, lmax) {
  let [h, s, l] = rgbToHsl(hexToRgb(hex));
  if (s < 0.04) h = hue;
  const d = ((hue - h + 540) % 360) - 180;
  return [h + d * pull, Math.max(smin, Math.min(smax, s)), Math.max(lmin, Math.min(lmax, l))];
}
function mix(h, to, t) {
  const a = hexToRgb(h), b = hexToRgb(to);
  return rgbToHex(a.map((v, i) => v + (b[i] - v) * t));
}
function hash(n) {
  n = (n ^ 61) ^ (n >>> 16); n = (n + (n << 3)) | 0; n ^= n >>> 4;
  n = Math.imul(n, 0x27d4eb2d); n ^= n >>> 15;
  return (n >>> 0) / 4294967296;
}

export function build(p) {
  const parts = [];
  const box = (x, y, z, w, h, d, c) => {
    if (w > 0.005 && h > 0.005 && d > 0.005) parts.push({ t: "box", p: [x, y, z], s: [w, h, d], c });
  };

  const L = 6;
  const H = Math.round(Math.max(0.6, Math.min(1.8, Number(p.height) || 1.0)) * 100) / 100;
  const gate = !!p.gate;
  const mode = p.top === "stepped" || p.top === "topiary" ? p.top : "clipped";

  // palette: every slot clamped so it keeps its material reading in any brand probe
  const [lh, ls, ll] = tune(p.leaf, 110, 0.6, 0.25, 0.48, 0.38, 0.52);
  const leaf = hsl(lh, ls, ll);
  const leafDark = hsl(lh, ls, ll - 0.06);
  const leafLight = hsl(lh, ls * 0.95, ll + 0.05);
  const leafTop = hsl(lh, ls * 0.92, ll + 0.09);
  const neck = hsl(lh, ls, ll - 0.12);
  const [wh, ws, wl] = tune(p.wood, 28, 0.85, 0.05, 0.32, 0.28, 0.44);
  const wood = hsl(wh, ws, wl);
  const woodDark = hsl(wh, ws, wl - 0.09);
  const slat = hsl(wh, ws * 0.9, wl + 0.07);
  const iron = "#3A3F4A";
  const [bh, bs, bl] = tune(p.bloom, 340, 0.3, 0.35, 0.75, 0.62, 0.82);
  const bloom = hsl(bh, bs, bl);
  const bloom2 = mix(bloom, "#FFFFFF", 0.4);
  const [kh, ks, kl] = tune(p.kerb, 210, 0, 0, 0.1, 0.78, 0.9);
  const kerb = hsl(kh, ks, kl);
  const path = mix(kerb, "#C9B79A", 0.6);

  // shared grid (one origin for everything)
  const KH = 0.12;              // kerb slab covers the whole 6 x 1 footprint
  const Z0 = 0.1, Z1 = 0.9;     // hedge body front / back
  const CRH = 0.12, CI = 0.04;  // crown height and shoulder inset
  const LV = [-0.03, 0.01, 0.05];
  const GAP0 = 2.35, GAP1 = 3.65, PW = 0.2;
  const segs = gate ? [[0, GAP0], [GAP1, L]] : [[0, L]];
  const step = Math.min(0.3, H * 0.3);
  const bodyT = mode === "stepped" ? H - step : H;

  // kerb base: one solid slab, so no ground ever shows through
  box(0, 0, 0, L, KH, 1, kerb);

  // soft clipped crown: a chain of overlapping lumps at alternating heights (lumpy silhouette)
  function crown(a, b, T, zf, zb, salt, rec) {
    const w = b - a, n = Math.max(1, Math.round(w / 0.55));
    const xs = [];
    for (let k = 0; k <= n; k++) {
      const inner = k > 0 && k < n;
      xs.push(a + (w * k) / n + (inner ? (hash(salt * 911 + Math.round(a * 10) * 37 + k) - 0.5) * 0.12 : 0));
    }
    let prev = -1;
    for (let k = 0; k < n; k++) {
      let idx = Math.floor(hash(salt * 313 + Math.round(xs[k] * 100)) * 3);
      if (idx === prev) idx = (idx + 1) % 3;
      prev = idx;
      const top = T + LV[idx];
      const x0 = k > 0 ? xs[k] - 0.03 : xs[k];
      box(x0, T - CRH, zf + CI, xs[k + 1] - x0, top - (T - CRH), zb - zf - 2 * CI, leafTop);
      if (rec) rec.push({ e0: xs[k], e1: xs[k + 1] - (k < n - 1 ? 0.03 : 0), top, zf: zf + CI });
    }
  }

  // leaf tufts: staggered, low-contrast clumps of varied size laid on a face (foliage texture)
  function tufts(u0, u1, y0, y1, salt, place) {
    if (y1 - y0 < 0.15 || u1 - u0 < 0.2) return;
    const rows = Math.max(1, Math.round((y1 - y0) / 0.32)), rh = (y1 - y0) / rows, cw = 0.44;
    for (let r = 0; r < rows; r++) {
      let k = 0;
      for (let cu = u0 + (r % 2 ? cw * 0.5 : 0); cu < u1 - 0.12; cu += cw, k++) {
        const key = salt * 7919 + r * 131 + k * 17 + Math.round(u0 * 10);
        let w = cw * (0.5 + 0.35 * hash(key));
        const th = rh * (0.5 + 0.3 * hash(key + 1));
        const u = cu + (cw - w) * hash(key + 2);
        const y = y0 + r * rh + (rh - th) * hash(key + 3);
        w = Math.min(w, u1 - u);
        if (w < 0.12) continue;
        const low = r < rows / 2;
        const c = hash(key + 4) < (low ? 0.65 : 0.35) ? leafDark : leafLight;
        const pr = hash(key + 5) < 0.5 ? 0.03 : 0.045;
        place(u, w, y, th, pr, c);
      }
    }
  }

  const bodyLumps = [], tierLumps = [], balls = [];

  segs.forEach(([a, b], si) => {
    const w = b - a;
    // main clipped body + crown
    box(a, KH, Z0, w, bodyT - CRH - KH, Z1 - Z0, leaf);
    crown(a, b, bodyT, Z0, Z1, 1 + si * 10, bodyLumps);
    // front-face foliage texture
    tufts(a + 0.04, b - 0.04, KH + 0.03, bodyT - CRH - 0.03, 2 + si * 10, (u, tw, y, th, pr, c) => box(u, y, Z0 - pr, tw, th, pr, c));
    // gate-side end faces get foliage too (outer ends stay flat so runs tile cleanly)
    if (gate) {
      const zA = 0.34, zB = Z1 - 0.04;
      if (b === GAP0) tufts(zA, zB, KH + 0.03, bodyT - CRH - 0.03, 3, (u, tw, y, th, pr, c) => box(GAP0, y, u, pr, th, tw, c));
      if (a === GAP1) tufts(zA, zB, KH + 0.03, bodyT - CRH - 0.03, 4, (u, tw, y, th, pr, c) => box(GAP1 - pr, y, u, pr, th, tw, c));
    }
    // stepped: a narrower upper tier growing out of the lower crown
    if (mode === "stepped") {
      box(a, bodyT - CRH, 0.26, w, H - bodyT, 0.48, leaf);
      crown(a, b, H, 0.26, 0.74, 5 + si * 10, tierLumps);
    }
    // topiary: evenly spaced clipped balls, built from boxes like the hedge, on a leafy neck
    if (mode === "topiary") {
      const n = Math.max(1, Math.round(w / 1.4));
      for (let i = 0; i < n; i++) {
        const cx = a + (w * (i + 0.5)) / n, c = H + 0.44;
        balls.push(cx);
        box(cx - 0.12, H - 0.06, 0.38, 0.24, c - 0.3 - (H - 0.06), 0.24, neck);
        box(cx - 0.22, c - 0.3, 0.28, 0.44, 0.6, 0.44, leaf);
        box(cx - 0.3, c - 0.18, 0.2, 0.6, 0.36, 0.6, leaf);
        box(cx - 0.14, c + 0.3, 0.36, 0.28, 0.04, 0.28, leafTop);
      }
    }
  });

  // blossom clusters: 3D blooms sitting fully on top of one crown lump, never overhanging
  const lumps = mode === "stepped" ? tierLumps : bodyLumps;
  const order = [0, 8, 4, 2, 6, 1, 7, 3, 5];
  let placed = 0;
  const want = Math.max(0, Math.min(9, p.blossoms | 0));
  for (const i of order) {
    if (placed >= want) break;
    const cx = 0.35 + i * 0.66;
    if (gate && cx > GAP0 - 0.3 && cx < GAP1 + 0.3) continue;
    if (balls.some((bx) => Math.abs(bx - cx) < 0.5)) continue;
    const m = lumps.find((q) => cx >= q.e0 && cx < q.e1);
    if (!m || m.e1 - m.e0 < 0.32) continue;
    const s = Math.max(m.e0 + 0.04, Math.min(m.e1 - 0.26, cx - 0.11));
    box(s, m.top, m.zf + 0.04, 0.16, 0.13, 0.16, bloom);
    box(s + 0.1, m.top, m.zf + 0.22, 0.11, 0.09, 0.11, bloom2);
    box(s, m.top, m.zf + 0.24, 0.09, 0.07, 0.09, bloom);
    placed++;
  }

  // garden gate: path inlay, posts that always stand proud of the hedge, arched slatted leaf
  if (gate) {
    const y0 = KH + 0.02;
    box(GAP0, KH, 0, GAP1 - GAP0, 0.02, 1, path);
    const postTop = H + 0.2;
    const pxL = GAP0, pxR = GAP1 - PW, PZ0 = 0.04, PZ1 = 0.3;
    for (const px of [pxL, pxR]) {
      box(px, y0, PZ0, PW, postTop - y0, PZ1 - PZ0, wood);
      box(px - 0.03, postTop, PZ0 - 0.03, PW + 0.06, 0.06, PZ1 - PZ0 + 0.06, woodDark);
      box(px + 0.05, postTop + 0.06, PZ0 + 0.08, PW - 0.1, 0.1, PZ1 - PZ0 - 0.16, woodDark);
    }
    const gx0 = pxL + PW, gx1 = pxR, gw = gx1 - gx0; // 0.9 m leaf
    const leafH = Math.max(0.5, Math.min(1.5, H - 0.2));
    const NS = 5, SW = 0.12, sg = (gw - NS * SW) / (NS + 1);
    const drop = [0.12, 0.05, 0, 0.05, 0.12];
    for (let i = 0; i < NS; i++) box(gx0 + sg + i * (SW + sg), y0 + 0.06, 0.12, SW, leafH - 0.06 - drop[i], 0.05, slat);
    const rails = [y0 + 0.16, y0 + Math.max(0.32, leafH - 0.28)];
    for (const ry of rails) {
      box(gx0, ry, 0.08, gw, 0.08, 0.04, wood);
      box(gx0, ry + 0.02, 0.06, 0.24, 0.04, 0.02, iron); // hinge strap from the left post
    }
    const ly = rails[1] + 0.02;
    box(gx1 - 0.2, ly, 0.06, 0.2, 0.04, 0.02, iron);      // latch bar runs into the right post
    box(pxR, ly - 0.03, PZ0 - 0.03, 0.12, 0.1, 0.03, iron); // keeper on the post face
  }

  return { parts };
}
