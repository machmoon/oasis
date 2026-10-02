// Layered Waves: correlated, seeded wave strata with an OKLCH lightness ramp, papercut depth and placement controls.
export const meta = {
  title: "Layered Waves",
  kind: "background",
  description: "Papercut wave strata for section heroes, footers and dividers, with anchor, coverage and depth controls plus a guaranteed lightness ramp for any brand.",
  tags: ["waves", "background", "divider", "layers", "papercut", "section", "hero", "landscape"],
  price: 0,
  author: "oasis-factory",
  size: [1440, 720],
};

export const params = {
  knobs: {
    background: { type: "color", role: "background", label: "Background", default: "#F5F1EB" },
    back: { type: "color", role: "secondary", label: "Far colour", default: "#9CC7CC" },
    front: { type: "color", role: "primary", label: "Near colour", default: "#163848" },
    ramp: { type: "choice", label: "Palette ramp", default: "blend", options: ["blend", "vivid", "tonal"] },
    anchor: { type: "choice", label: "Anchor edge", default: "bottom", options: ["bottom", "top", "both"] },
    coverage: { type: "range", label: "Coverage %", default: 55, min: 25, max: 90, step: 1 },
    layers: { type: "range", label: "Layers", default: 6, min: 2, max: 10, step: 1 },
    amplitude: { type: "range", label: "Amplitude", default: 45, min: 0, max: 100, step: 1 },
    frequency: { type: "range", label: "Frequency", default: 1.5, min: 0.5, max: 8, step: 0.5 },
    smoothness: { type: "range", label: "Smoothness", default: 90, min: 0, max: 100, step: 1 },
    depth: { type: "range", label: "Papercut depth", default: 55, min: 0, max: 100, step: 1 },
    seed: { type: "range", label: "Seed", default: 21, min: 1, max: 500, step: 1 },
  },
  presets: {
    Apricot: { background: "#FBF3EA", back: "#F6C38E", front: "#7E2A3A" },
    Aurora: { background: "#0D1020", back: "#6F5CF0", front: "#2BD1C1" },
    Mist: { background: "#EDF2EF", back: "#B9D4C8", front: "#2E5E50" },
    Ember: { background: "#190E0B", back: "#FFB04A", front: "#C23A2C" },
  },
};

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function toLab(hex) {
  const n = parseInt(hex.replace("#", ""), 16);
  const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const r = lin((n >> 16) & 255), g = lin((n >> 8) & 255), b = lin(n & 255);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}

function toHex([L, A, B]) {
  const l = Math.pow(L + 0.3963377774 * A + 0.2158037573 * B, 3);
  const m = Math.pow(L - 0.1055613458 * A - 0.0638541728 * B, 3);
  const s = Math.pow(L - 0.0894841775 * A - 1.291485548 * B, 3);
  const rgb = [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
  return "#" + rgb.map((c) => {
    c = Math.max(0, Math.min(1, c));
    c = c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
    return Math.round(c * 255).toString(16).padStart(2, "0");
  }).join("");
}

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lch = (L, C, h) => [L, C * Math.cos(h), C * Math.sin(h)];
const chroma = (c) => Math.hypot(c[1], c[2]);
const hue = (c) => Math.atan2(c[2], c[1]);
const angDist = (a, b) => { const d = Math.abs(a - b) % (2 * Math.PI); return d > Math.PI ? 2 * Math.PI - d : d; };

function palette(p, n, bg) {
  const far = toLab(p.back), near = toLab(p.front);
  const dir = bg[0] > 0.55 ? -1 : 1;
  const maxR = dir < 0 ? bg[0] - 0.17 : 0.94 - bg[0];
  const need = 0.032 * (n - 1);
  let lo = clamp(Math.abs(far[0] - bg[0]), 0.06, 0.3);
  let hi = Math.min(maxR, Math.max(Math.abs(near[0] - bg[0]), lo + need, 0.24));
  lo = Math.max(0.035, Math.min(lo, hi - need));
  const c1 = chroma(far), c2 = chroma(near);
  let h1 = hue(far), h2 = hue(near);
  if (c1 < 0.025) h1 = h2;
  if (c2 < 0.025) h2 = h1;
  let dh = h2 - h1;
  while (dh > Math.PI) dh -= 2 * Math.PI;
  while (dh <= -Math.PI) dh += 2 * Math.PI;
  if (Math.abs(dh) > 2.6) {
    const alt = dh > 0 ? dh - 2 * Math.PI : dh + 2 * Math.PI, olive = 1.92;
    if (angDist(h1 + alt / 2, olive) > angDist(h1 + dh / 2, olive)) dh = alt;
  }
  const cols = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const L = clamp(bg[0] + dir * (lo + (hi - lo) * Math.pow(t, 0.92)), 0.16, 0.95);
    let C, h;
    if (p.ramp === "tonal") { h = h2; C = Math.min(c2, 0.11) * (0.35 + 0.65 * t); }
    else {
      h = h1 + dh * t;
      C = c1 + (c2 - c1) * t;
      if (p.ramp === "vivid") C = Math.max(C, 0.12) * (1 + 0.25 * Math.sin(Math.PI * t));
      else C *= 0.6 + 0.4 * t;
    }
    cols.push(lch(L, Math.min(C, 0.19), h));
  }
  return { cols, light: dir < 0 };
}

function wavePath(nodes, smooth, bottom) {
  const k = smooth / 100, f = (v) => v.toFixed(1);
  let d = `M${f(nodes[0][0])},${f(nodes[0][1])}`;
  for (let i = 0; i < nodes.length - 1; i++) {
    const p0 = nodes[Math.max(0, i - 1)], p1 = nodes[i], p2 = nodes[i + 1], p3 = nodes[Math.min(nodes.length - 1, i + 2)];
    const c1 = [p1[0] + ((p2[0] - p0[0]) / 6) * k, p1[1] + ((p2[1] - p0[1]) / 6) * k];
    const c2 = [p2[0] - ((p3[0] - p1[0]) / 6) * k, p2[1] - ((p3[1] - p1[1]) / 6) * k];
    d += ` C${f(c1[0])},${f(c1[1])} ${f(c2[0])},${f(c2[1])} ${f(p2[0])},${f(p2[1])}`;
  }
  return `${d} L${f(nodes[nodes.length - 1][0])},${bottom} L${f(nodes[0][0])},${bottom}Z`;
}

function stack(p, n, covH, id, off, W, H, bg) {
  const r = rng(p.seed * 9301 + 49297 + off);
  const { cols, light } = palette(p, n, bg);
  const dp = p.depth / 100;
  const A = (p.amplitude / 100) * covH * 0.28;
  const top = H - covH, first = top + A, last = H - A * 0.8 - covH * 0.05;
  const span = Math.max(last - first, n * 6), gap = span / (n - 1);
  const fq = p.frequency;
  const fi = fq * (0.9 + 0.2 * r());
  const w1 = 1, w2 = (0.25 + 0.35 * r()) / (1 + fq * 0.15), w3 = (0.08 + 0.16 * r()) / (1 + fq * 0.3);
  const norm = w1 + w2 + w3;
  const ph1 = r() * 6.283, ph2 = r() * 6.283, ph3 = r() * 6.283;
  const drift = (0.3 + 0.5 * r()) * (r() < 0.5 ? -1 : 1);
  const sep = Math.max(4, gap * 0.3);
  const step = W / Math.max(10, Math.round(fi * 7));
  let defs = "", body = "", prev = null;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const base = first + span * Math.pow(t, 1.1);
    const Ai = A * (0.7 + 0.3 * t) * (0.9 + 0.2 * r());
    const fl = fi * (1 + (r() - 0.5) * 0.08), jit = (r() - 0.5) * 0.5;
    const raw = (x) => {
      const u = (x / W) * 6.283 * fl;
      return base + (Ai * (w1 * Math.sin(u + ph1 + i * drift + jit) + w2 * Math.sin(2.3 * u + ph2 - i * drift * 1.6) + w3 * Math.sin(3.7 * u + ph3 + i * 0.9))) / norm;
    };
    const pv = prev;
    const fn = pv ? (x) => { const a = raw(x), b = pv(x) + sep, k = sep * 0.7; return (a + b + Math.sqrt((a - b) * (a - b) + k * k)) / 2; } : raw;
    prev = fn;
    const nodes = [];
    for (let x = -step; x <= W + step * 1.01; x += step) nodes.push([x, fn(x)]);
    const col = cols[i], d = wavePath(nodes, p.smoothness, H + 80);
    let filt = "";
    if (i > 0 && dp > 0) {
      const b = cols[i - 1];
      const sc = toHex(light ? [b[0] * 0.5, b[1] * 0.45, b[2] * 0.45] : [b[0] * 0.3, b[1] * 0.3, b[2] * 0.3]);
      const sd = (0.5 + dp * Math.min(4.5, gap * 0.12)).toFixed(2);
      const dy = -(0.5 + dp * Math.min(3.5, gap * 0.1)).toFixed(2);
      defs += `<filter id="${id}${i}" x="-5%" y="-20%" width="110%" height="140%"><feDropShadow dx="0" dy="${dy}" stdDeviation="${sd}" flood-color="${sc}" flood-opacity="${(dp * (light ? 0.38 : 0.65)).toFixed(2)}"/></filter>`;
      filt = ` filter="url(#${id}${i})"`;
    }
    body += `<path d="${d}" fill="${toHex(col)}"${filt}/>`;
    if (dp > 0) {
      const rim = toHex([clamp(col[0] + 0.07, 0, 0.98), col[1] * 0.8, col[2] * 0.8]);
      body += `<path d="${d}" fill="url(#sheen)" opacity="${dp.toFixed(2)}"/><path d="${d}" fill="none" stroke="${rim}" stroke-width="1.4" stroke-opacity="${(dp * 0.75).toFixed(2)}"/>`;
    }
  }
  return { defs, body };
}

export default function render(p) {
  const W = 1440, H = 720;
  const bg = toLab(p.background);
  const n = clamp(Math.round(p.layers), 2, 10);
  const cov = (p.coverage / 100) * H;
  const flip = ` transform="translate(0 ${H}) scale(1 -1)"`;
  const lightBg = bg[0] > 0.55, dp = p.depth / 100;
  let defs = `<linearGradient id="sheen" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF" stop-opacity="${lightBg ? 0.16 : 0.08}"/><stop offset="0.3" stop-color="#FFFFFF" stop-opacity="0"/></linearGradient>`;
  let body = "";
  if (p.anchor === "both") {
    const lo = stack(p, n, cov * 0.56, "b", 0, W, H, bg);
    const hi = stack(p, Math.max(2, Math.ceil(n / 2)), cov * 0.4, "t", 7777, W, H, bg);
    defs += lo.defs + hi.defs;
    body = `<g${flip}>${hi.body}</g><g>${lo.body}</g>`;
  } else {
    const s = stack(p, n, cov, "w", 0, W, H, bg);
    defs += s.defs;
    body = `<g${p.anchor === "top" ? flip : ""}>${s.body}</g>`;
  }
  let grain = "";
  if (dp > 0) {
    const g = lightBg ? 0 : 1;
    defs += `<filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="${p.seed % 97}" stitchTiles="stitch"/><feColorMatrix type="matrix" values="0 0 0 0 ${g} 0 0 0 0 ${g} 0 0 0 0 ${g} 1.4 0 0 0 -0.55"/></filter>`;
    grain = `<rect width="${W}" height="${H}" filter="url(#grain)" opacity="${(dp * (lightBg ? 0.09 : 0.06)).toFixed(3)}"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><defs>${defs}</defs><rect width="${W}" height="${H}" fill="${p.background}"/>${body}${grain}</svg>`;
}
