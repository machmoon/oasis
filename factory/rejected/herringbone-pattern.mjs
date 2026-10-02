// Seamless herringbone tiles: rational-angle period fitting, OKLCH-harmonised glaze spread, split strips and four surface finishes.
export const meta = {
  title: "Herringbone Tiles",
  kind: "pattern",
  description: "A truly seamless herringbone surface with single, double or triple strips, any angle, grout, glaze spread and glazed, zellige, parquet or matte finishes, for backdrops, packaging and interior mockups.",
  tags: ["herringbone", "tile", "parquet", "zellige", "seamless", "pattern", "floor", "texture"],
  price: 0,
  author: "oasis-factory",
  size: [800, 800],
};

export const params = {
  knobs: {
    tile: { type: "color", role: "primary", label: "Tile", default: "#6E8F7A" },
    tile2: { type: "color", role: "secondary", label: "Variation tone", default: "#B9CFBB" },
    grout: { type: "color", role: "background", label: "Grout", default: "#F2EEE6" },
    finish: { type: "choice", label: "Finish", default: "glazed", options: ["matte", "glazed", "zellige", "parquet"] },
    strips: { type: "choice", label: "Strips", default: "single", options: ["single", "double", "triple"] },
    angle: { type: "range", label: "Angle", default: 45, min: 0, max: 165, step: 15 },
    length: { type: "range", label: "Plank length (× width)", default: 4, min: 2, max: 8, step: 1 },
    width: { type: "range", label: "Plank width", default: 28, min: 16, max: 40, step: 1 },
    gap: { type: "range", label: "Grout gap", default: 2.5, min: 0, max: 8, step: 0.5 },
    variation: { type: "range", label: "Colour variation", default: 45, min: 0, max: 100, step: 1 },
  },
  presets: {
    Oak: { tile: "#9A6A3F", tile2: "#C9965F", grout: "#3A2A1E" },
    Clay: { tile: "#C2603F", tile2: "#E39A74", grout: "#F7EEE4" },
    Midnight: { tile: "#1C2742", tile2: "#47689A", grout: "#C9B07A" },
    Marble: { tile: "#DCD9D2", tile2: "#F6F4EF", grout: "#7D7A74" },
  },
};

const hex2rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const rgb2hex = (c) => "#" + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
const cl = (x, a, b) => Math.max(a, Math.min(b, x));
const f1 = (v) => v.toFixed(1);
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const gam = (c) => 255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);

function toLch(hex) {
  const [r, g, b] = hex2rgb(hex).map(lin);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return [L, Math.hypot(A, B), Math.atan2(B, A)];
}

function lch(L, C, h) {
  L = cl(L, 0, 1);
  for (let n = 0; n < 14; n++) {
    const a = C * Math.cos(h), b = C * Math.sin(h);
    const l = Math.pow(L + 0.3963377774 * a + 0.2158037573 * b, 3);
    const m = Math.pow(L - 0.1055613458 * a - 0.0638541728 * b, 3);
    const s = Math.pow(L - 0.0894841775 * a - 1.291485548 * b, 3);
    const rgb = [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s].map(gam);
    if (rgb.every((x) => x >= -0.5 && x <= 255.5) || n === 13) return rgb2hex(rgb);
    C *= 0.88;
  }
}

function hash(a, b, c, s) {
  let x = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ Math.imul(c | 0, 1442695041) ^ Math.imul(s | 0, 1274126177);
  x = Math.imul(x ^ (x >>> 13), 1274126177);
  x = Math.imul(x ^ (x >>> 16), 2246822519);
  x ^= x >>> 15;
  return (x >>> 0) / 4294967296;
}

function lg(id, ax, rev, stops) {
  const [a, b] = rev ? [1, 0] : [0, 1];
  const pos = ax === "y" ? `x1="0" y1="${a}" x2="0" y2="${b}"` : `x1="${a}" y1="0" x2="${b}" y2="0"`;
  return `<linearGradient id="${id}" ${pos}>${stops.map(([o, c, op]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${op}"/>`).join("")}</linearGradient>`;
}

export default function render(p) {
  const fin = p.finish;
  const k = Math.round(p.length), sN = { single: 1, double: 2, triple: 3 }[p.strips] || 1;
  let W = p.width;
  if (k * W > 170) W = 170 / k;
  const L = k * W, th = W / sN, g = Math.min(p.gap, th * 0.3), tk0 = th - g;

  let best = null;
  for (let al = 0; al <= 3; al++) for (let be = -3; be <= 3; be++) {
    if (!al && !be) continue;
    for (let j = 0; j < 4; j++) {
      const ph = (Math.atan2(be, al) * 180) / Math.PI + 45 + 90 * j;
      const x = (((ph - p.angle) % 180) + 180) % 180;
      const sc = Math.min(x, 180 - x) + 0.3 * (al * al + be * be);
      if (!best || sc < best.sc) best = { sc, al, be, ph };
    }
  }
  const { al, be } = best, phi = (best.ph * Math.PI) / 180;
  const S0 = L * Math.sqrt(2 * (al * al + be * be));
  const n = Math.max(1, Math.round(800 / S0)), S = n * S0;
  const a1 = -n * k * be, b1 = n * al, a2 = n * k * al, b2 = n * be, Dt = a1 * b2 - a2 * b1;
  const red = (i, m) => {
    const s = Math.floor((b2 * i - a2 * m) / Dt), r = Math.floor((a1 * m - b1 * i) / Dt);
    return [i - s * a1 - r * a2, m - s * b1 - r * b2];
  };

  const A = Math.cos(phi), B = Math.sin(phi), C = -B, D = A;
  const fwd = (x, y) => [A * x + C * y, B * x + D * y];
  const inv = (X, Y) => [A * X + B * Y, -B * X + A * Y];
  let umin = Infinity, umax = -Infinity, vmin = Infinity, vmax = -Infinity;
  for (const [X, Y] of [[0, 0], [S, 0], [0, S], [S, S]]) {
    const [x, y] = inv(X, Y);
    umin = Math.min(umin, x + y); umax = Math.max(umax, x + y);
    vmin = Math.min(vmin, x - y); vmax = Math.max(vmax, x - y);
  }
  const i0 = Math.floor(umin / (2 * W)) - k - 2, i1 = Math.ceil(umax / (2 * W)) + 2;
  const m0 = Math.floor(vmin / (2 * L)) - 2, m1 = Math.ceil(vmax / (2 * L)) + 2;

  let [L1, C1, h1] = toLch(p.tile), [L2, C2, h2] = toLch(p.tile2);
  const grey2 = C2 < 0.025;
  L1 = cl(L1, 0.34, 0.88); C1 = Math.min(C1, 0.12);
  if (C1 < 0.025) h1 = h2;
  L2 = cl(cl(L2, L1 - 0.28, L1 + 0.28), 0.3, 0.95);
  C2 = cl(C2, C1 * 0.65, Math.max(C1 * 0.65, 0.13));
  const dh = grey2 ? 0 : cl(wrap(h2 - h1), -0.5, 0.5);
  const v = p.variation / 100;
  const Lm = L1 + (L2 - L1) * v * 0.5;
  let [gL, gC, gh] = toLch(p.grout);
  gL = cl(gL, 0.28, 0.95); gC = Math.min(gC, 0.06);
  if (gC < 0.012) { gC = 0.012; gh = h1; }
  if (g > 0 && Math.abs(gL - Lm) < 0.15) {
    const dir = gL >= Lm ? 1 : -1;
    gL = Lm + dir * 0.15;
    if (gL > 0.96 || gL < 0.2) gL = Lm - dir * 0.15;
    gL = cl(gL, 0.2, 0.96);
  }
  const groutHex = lch(gL, gC, gh);

  const litTop = A - 0.45 * B > 0, litLeft = 0.45 * A + B > 0;
  const rx = fin === "glazed" ? tk0 * 0.1 : fin === "parquet" ? Math.min(0.8, tk0 * 0.04) : Math.min(1.2, tk0 * 0.05);
  const seam = g < 0.6, sw = ((0.8 * S) / 800).toFixed(2);
  const R = (L + W) / 2;
  const planks = [], overH = [], overV = [], streaks = [], grain = [];

  const emit = (x, y, w, h, t, i, m) => {
    const [cx, cy] = fwd(x + w / 2, y + h / 2);
    if (cx < -R || cx > S + R || cy < -R || cy > S + R) return;
    const [ri, rm] = red(i, m), hor = t === 0;
    for (let s = 0; s < sN; s++) {
      const hs = (c) => hash(ri, rm, (t * 4 + s) * 32 + c, 7);
      const sx = hor ? x : x + s * th, sy = hor ? y + s * th : y;
      const x0 = sx + g / 2, y0 = sy + g / 2, w0 = (hor ? w : th) - g, h0 = (hor ? th : h) - g;
      const len = hor ? w0 : h0, tk = hor ? h0 : w0;
      const tt = v * hs(0);
      const Lp = L1 + (L2 - L1) * tt + (hs(1) - 0.5) * 0.06 * v, Cp = C1 + (C2 - C1) * tt, hp = h1 + dh * tt;
      let shp;
      if (fin === "zellige") {
        const jj = (c) => hs(c) * tk * 0.09;
        const pts = [[x0 + jj(2), y0 + jj(3)], [x0 + w0 - jj(4), y0 + jj(5)], [x0 + w0 - jj(6), y0 + h0 - jj(7)], [x0 + jj(8), y0 + h0 - jj(9)]];
        shp = `<path d="M${pts.map((q) => `${f1(q[0])},${f1(q[1])}`).join("L")}Z"`;
      } else shp = `<rect x="${f1(x0)}" y="${f1(y0)}" width="${f1(w0)}" height="${f1(h0)}" rx="${f1(rx)}"`;
      const st = seam ? ` stroke="${lch(Lp - 0.1, Cp, hp)}" stroke-width="${sw}"` : "";
      planks.push(`${shp} fill="${lch(Lp, Cp, hp)}"${st}/>`);
      if (fin !== "matte") (hor ? overH : overV).push(`${shp}/>`);
      const pt = (sv, o) => (hor ? `${f1(x0 + sv)},${f1(y0 + o)}` : `${f1(x0 + o)},${f1(y0 + sv)}`);
      if ((fin === "glazed" || fin === "zellige") && hs(10) < 0.8) {
        const off = (hor ? litTop : litLeft) ? tk * 0.2 : tk * 0.8;
        const a = 0.08 + hs(11) * 0.35, b = Math.min(0.92, a + 0.2 + hs(12) * 0.35);
        streaks.push(`<path d="M${pt(len * a, off)}L${pt(len * b, off)}"/>`);
      }
      if (fin === "parquet") {
        const col = lch(Lp - 0.08, Cp * 1.1, hp), lines = 2 + Math.floor(hs(13) * 4);
        for (let q = 0; q < lines; q++) {
          const off = tk * (0.14 + 0.72 * ((q + hs(20 + q)) / lines)), dv = (hs(30 + q) - 0.5) * tk * 0.3;
          const s0 = len * (0.04 + hs(40 + q) * 0.3), s1 = len * (0.96 - hs(50 + q) * 0.3);
          grain.push(`<path d="M${pt(s0, off)} Q${pt((s0 + s1) / 2, off + dv)} ${pt(s1, off)}" stroke="${col}"/>`);
        }
      }
    }
  };

  for (let i = i0; i <= i1; i++) for (let m = m0; m <= m1; m++) {
    const x = i * W + m * L, y = i * W - m * L;
    emit(x, y, L, W, 0, i, m);
    emit(x + L, y + W - L, W, L, 1, i, m);
  }

  const GL = [[0, "#FFFFFF", 0.24], [0.1, "#FFFFFF", 0.07], [0.55, "#FFFFFF", 0], [0.9, "#000000", 0.03], [1, "#000000", 0.12]];
  const PQ = [[0, "#000000", 0.1], [0.28, "#000000", 0], [0.72, "#FFFFFF", 0.05], [1, "#000000", 0.09]];
  let defs = "", idH = "oh", idV = "ov";
  if (fin === "glazed") defs = lg("oh", "y", !litTop, GL) + lg("ov", "x", !litLeft, GL);
  else if (fin === "parquet") defs = lg("oh", "x", false, PQ) + lg("ov", "y", false, PQ);
  else if (fin === "zellige") {
    defs = `<radialGradient id="zr" cx="0.5" cy="0.5" r="0.62"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.12"/><stop offset="0.55" stop-color="#FFFFFF" stop-opacity="0"/><stop offset="0.85" stop-color="#000000" stop-opacity="0.06"/><stop offset="1" stop-color="#000000" stop-opacity="0.2"/></radialGradient>`;
    idH = idV = "zr";
  }
  const Sv = S.toFixed(2);
  const bf = (Math.max(1, Math.round(S / (W * 0.9))) / S).toFixed(5);
  defs += `<filter id="tx" filterUnits="userSpaceOnUse" x="0" y="0" width="${Sv}" height="${Sv}"><feTurbulence type="fractalNoise" baseFrequency="${bf}" numOctaves="3" seed="4" stitchTiles="stitch"/><feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.9 0 0 0 -0.4"/></filter>`;
  const noiseOp = { matte: 0.5, glazed: 0.3, zellige: 0.9, parquet: 0.55 }[fin];

  const mtx = `matrix(${A.toFixed(6)} ${B.toFixed(6)} ${C.toFixed(6)} ${D.toFixed(6)} 0 0)`;
  let body = `<g transform="${mtx}">${planks.join("")}</g>`;
  if (grain.length) body += `<g transform="${mtx}" fill="none" stroke-width="${(tk0 * 0.035).toFixed(2)}" stroke-linecap="round" opacity="0.6">${grain.join("")}</g>`;
  if (fin !== "matte") body += `<g transform="${mtx}"><g fill="url(#${idH})">${overH.join("")}</g><g fill="url(#${idV})">${overV.join("")}</g></g>`;
  if (streaks.length) body += `<g transform="${mtx}" fill="none" stroke="#FFFFFF" stroke-width="${(tk0 * 0.08).toFixed(2)}" stroke-linecap="round" opacity="${fin === "zellige" ? 0.42 : 0.32}">${streaks.join("")}</g>`;
  body += `<rect width="${Sv}" height="${Sv}" filter="url(#tx)" opacity="${noiseOp}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${Sv} ${Sv}" width="800" height="800"><defs>${defs}</defs><rect width="${Sv}" height="${Sv}" fill="${groutHex}"/>${body}</svg>`;
}
