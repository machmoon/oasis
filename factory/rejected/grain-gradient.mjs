// Grain Gradient: four-stop linear, radial or sweep gradients blended in OKLCH with gamut mapping, finished with soft clumped film grain.
export const meta = {
  title: "Grain Gradient",
  kind: "background",
  description: "Soft multi-stop gradients with true film grain, perceptual colour blending and tone balance, for hero backgrounds, wallpapers, social posts and cover art.",
  tags: ["gradient", "grain", "noise", "background", "texture", "wallpaper", "conic", "film"],
  price: 5,
  author: "oasis-factory",
  size: [1200, 800],
};

export const params = {
  knobs: {
    c1: { type: "color", role: "background", label: "Stop 1 (deep)", default: "#141433" },
    c2: { type: "color", role: "primary", label: "Stop 2", default: "#5B3FD1" },
    c3: { type: "color", role: "secondary", label: "Stop 3", default: "#EC5F95" },
    c4: { type: "color", role: "highlight", label: "Stop 4 (light)", default: "#FFC890" },
    type: { type: "choice", label: "Gradient type", default: "linear", options: ["linear", "radial", "conic"] },
    blend: { type: "choice", label: "Colour blending", default: "vivid", options: ["vivid", "oklch", "oklab"] },
    aspect: { type: "choice", label: "Format", default: "landscape", options: ["landscape", "widescreen", "square", "portrait", "story"] },
    angle: { type: "range", label: "Angle", default: 135, min: 0, max: 360, step: 1 },
    balance: { type: "range", label: "Tone balance (deep to light)", default: -15, min: -100, max: 100, step: 1 },
    softness: { type: "range", label: "Stop softness", default: 75, min: 0, max: 100, step: 1 },
    grain: { type: "range", label: "Grain intensity", default: 40, min: 0, max: 100, step: 1 },
    grainScale: { type: "range", label: "Grain scale", default: 1.2, min: 0.5, max: 3, step: 0.1 },
    chromaGrain: { type: "toggle", label: "Colour grain", default: false },
    vignette: { type: "toggle", label: "Edge fade", default: true },
  },
  presets: {
    "Peach Fuzz": { c1: "#F2DDD2", c2: "#F0AE9C", c3: "#E2809E", c4: "#FFF7EA", type: "radial", angle: 220, aspect: "square" },
    Aurora: { c1: "#04141F", c2: "#0E6A68", c3: "#35D39F", c4: "#D8F36C", type: "conic", angle: 30, grain: 50, chromaGrain: true },
    Citrus: { c1: "#FFF2C2", c2: "#FFC53A", c3: "#FF7A3D", c4: "#D42E5B", type: "linear", angle: 200, blend: "oklab", softness: 35, grainScale: 2, aspect: "portrait" },
    "Night Bloom": { c1: "#07060F", c2: "#2B1A5E", c3: "#C2399A", c4: "#FF9E6B", type: "radial", angle: 300, balance: -40, aspect: "widescreen" },
  },
};

const SIZES = { landscape: [1200, 800], widescreen: [1600, 900], square: [1000, 1000], portrait: [960, 1200], story: [1080, 1920] };
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));

function toLab(h) {
  const n = parseInt(String(h).replace("#", "").slice(0, 6), 16) || 0;
  const lin = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const r = lin(((n >> 16) & 255) / 255), g = lin(((n >> 8) & 255) / 255), b = lin((n & 255) / 255);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return { L, a: A, b: B, C: Math.hypot(A, B), h: Math.atan2(B, A) };
}
function labToLin(L, A, B) {
  const l = Math.pow(L + 0.3963377774 * A + 0.2158037573 * B, 3);
  const m = Math.pow(L - 0.1055613458 * A - 0.0638541728 * B, 3);
  const s = Math.pow(L - 0.0894841775 * A - 1.291485548 * B, 3);
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
}
const inGamut = (c) => c.every((v) => v > -0.0015 && v < 1.0015);
function lchHex(L, C, h) {
  L = clamp(L);
  const at = (c) => labToLin(L, c * Math.cos(h), c * Math.sin(h));
  let rgb = at(C);
  if (!inGamut(rgb)) {
    let lo = 0, hi = C;
    for (let i = 0; i < 12; i++) {
      const mid = (lo + hi) / 2;
      if (inGamut(at(mid))) lo = mid; else hi = mid;
    }
    rgb = at(lo);
  }
  const enc = (c) => {
    c = clamp(c);
    return Math.round((c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055) * 255);
  };
  return "#" + rgb.map((v) => enc(v).toString(16).padStart(2, "0")).join("").toUpperCase();
}

function mixStops(A, B, u, mode) {
  const L = A.L + (B.L - A.L) * u;
  if (mode === "oklab") {
    const a = A.a + (B.a - A.a) * u, b = A.b + (B.b - A.b) * u;
    return lchHex(L, Math.hypot(a, b), Math.atan2(b, a));
  }
  const hA = A.C < 0.03 ? B.h : A.h, hB = B.C < 0.03 ? A.h : B.h;
  let dh = hB - hA;
  while (dh > Math.PI) dh -= Math.PI * 2;
  while (dh < -Math.PI) dh += Math.PI * 2;
  let C = A.C + (B.C - A.C) * u;
  if (mode === "vivid") C *= 1 + 0.45 * Math.sin(Math.PI * u);
  return lchHex(L, C, hA + dh * u);
}

function makeSampler(p) {
  const S = [p.c1, p.c2, p.c3, p.c4].map(toLab);
  const others = (S[1].L + S[2].L + S[3].L) / 3;
  let g = Math.pow(2, -(Number(p.balance) || 0) / 50);
  if (S[0].L < 0.35 && others - S[0].L > 0.25) g *= 1.35;
  const s = clamp((Number(p.softness) || 0) / 100);
  const hold = (1 - s) * 0.36;
  const ease = (u) => {
    const v = clamp((u - hold) / (1 - 2 * hold));
    const sm = v * v * (3 - 2 * v);
    return sm + (v - sm) * s * 0.5;
  };
  return (q) => {
    const x = Math.pow(clamp(q), g) * 3;
    const i = Math.min(2, Math.floor(x));
    return mixStops(S[i], S[i + 1], ease(x - i), p.blend);
  };
}

function stopList(sample, flip) {
  let out = "";
  const K = 72;
  for (let i = 0; i <= K; i++) {
    const t = i / K;
    out += `<stop offset="${t.toFixed(4)}" stop-color="${sample(flip ? 1 - t : t)}"/>`;
  }
  return out;
}

function grainFilter(W, H, p) {
  const sc = Number(p.grainScale) || 1;
  const amt = 0.34 * Math.pow(clamp(p.grain / 100), 0.8);
  const mat = p.chromaGrain
    ? "4 0 0 0 -1.5 2.2 1.8 0 0 -1.5 2.2 0 1.8 0 -1.5 0 0 0 0 1"
    : "4 0 0 0 -1.5 4 0 0 0 -1.5 4 0 0 0 -1.5 0 0 0 0 1";
  return `<filter id="grain" x="0" y="0" width="${W}" height="${H}" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">` +
    `<feTurbulence type="fractalNoise" baseFrequency="${(0.9 / sc).toFixed(3)}" numOctaves="2" seed="11" stitchTiles="stitch" result="t"/>` +
    `<feGaussianBlur in="t" stdDeviation="${(0.28 * sc).toFixed(2)}" result="tb"/>` +
    `<feColorMatrix in="tb" type="matrix" values="${mat}" result="n"/>` +
    `<feComposite in="SourceGraphic" in2="n" operator="arithmetic" k1="0" k2="1" k3="${amt.toFixed(3)}" k4="${(-amt / 2).toFixed(3)}"/></filter>`;
}

export default function render(p) {
  const [W, H] = SIZES[p.aspect] || SIZES.landscape;
  const sample = makeSampler(p);
  const a = ((Number(p.angle) || 0) * Math.PI) / 180;
  const ca = Math.cos(a), sa = Math.sin(a);
  const cx = W / 2, cy = H / 2, M = Math.min(W, H);
  const soft = clamp((Number(p.softness) || 0) / 100);
  let defs = "", base = "";

  if (p.type === "radial") {
    const fx = cx + ca * W * 0.22, fy = cy + sa * H * 0.22;
    const r = Math.max(...[[0, 0], [W, 0], [0, H], [W, H]].map(([x, y]) => Math.hypot(x - fx, y - fy))) * 0.98;
    defs += `<radialGradient id="g" gradientUnits="userSpaceOnUse" cx="${fx.toFixed(1)}" cy="${fy.toFixed(1)}" r="${r.toFixed(1)}">${stopList(sample, true)}</radialGradient>`;
    base = `<rect width="${W}" height="${H}" fill="url(#g)"/>`;
  } else if (p.type === "conic") {
    const R = Math.hypot(W, H) * 1.2, N = 180, step = (Math.PI * 2) / N;
    const ox = cx - ca * W * 0.12, oy = cy - sa * H * 0.12;
    const reg = `x="${-W * 0.2}" y="${-H * 0.2}" width="${W * 1.4}" height="${H * 1.4}" filterUnits="userSpaceOnUse"`;
    defs += `<filter id="soft" ${reg}><feGaussianBlur stdDeviation="${(M * (0.008 + 0.018 * soft)).toFixed(1)}"/></filter>`;
    defs += `<filter id="melt" ${reg}><feGaussianBlur stdDeviation="${(M * 0.12).toFixed(1)}"/></filter>`;
    defs += `<radialGradient id="cm" gradientUnits="userSpaceOnUse" cx="${ox.toFixed(1)}" cy="${oy.toFixed(1)}" r="${(M * 0.6).toFixed(1)}"><stop offset="0" stop-color="#fff"/><stop offset="0.3" stop-color="#fff" stop-opacity="0.9"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>`;
    defs += `<mask id="core" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="url(#cm)"/></mask>`;
    let wedges = "";
    for (let i = 0; i < N; i++) {
      const f = (i + 0.5) / N, q = 1 - Math.abs(2 * f - 1);
      const a0 = a + i * step - step * 0.2, a1 = a + (i + 1) * step + step * 0.2;
      wedges += `<path d="M${ox.toFixed(1)},${oy.toFixed(1)}L${(ox + Math.cos(a0) * R).toFixed(1)},${(oy + Math.sin(a0) * R).toFixed(1)}L${(ox + Math.cos(a1) * R).toFixed(1)},${(oy + Math.sin(a1) * R).toFixed(1)}Z" fill="${sample(q)}"/>`;
    }
    base = `<rect width="${W}" height="${H}" fill="${sample(0.5)}"/><g filter="url(#soft)">${wedges}</g><g mask="url(#core)"><g filter="url(#melt)">${wedges}</g></g>`;
  } else {
    const L = Math.abs((W / 2) * ca) + Math.abs((H / 2) * sa);
    defs += `<linearGradient id="g" gradientUnits="userSpaceOnUse" x1="${(cx - ca * L).toFixed(1)}" y1="${(cy - sa * L).toFixed(1)}" x2="${(cx + ca * L).toFixed(1)}" y2="${(cy + sa * L).toFixed(1)}">${stopList(sample, false)}</linearGradient>`;
    base = `<rect width="${W}" height="${H}" fill="url(#g)"/>`;
  }

  if (p.vignette) {
    defs += `<radialGradient id="vg" gradientUnits="userSpaceOnUse" cx="${cx}" cy="${cy}" r="${(Math.hypot(W, H) / 2).toFixed(1)}"><stop offset="0.5" stop-color="${sample(0)}" stop-opacity="0"/><stop offset="1" stop-color="${sample(0)}" stop-opacity="0.5"/></radialGradient>`;
    base += `<rect width="${W}" height="${H}" fill="url(#vg)"/>`;
  }

  let body = base;
  if (p.grain > 0) {
    defs += grainFilter(W, H, p);
    body = `<g filter="url(#grain)">${base}</g>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><defs>${defs}</defs>${body}</svg>`;
}
