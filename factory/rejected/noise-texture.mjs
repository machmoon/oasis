// Tileable organic noise: stitched feTurbulence layers (wash, body, inclusions) toned from the surface in OKLab.
export const meta = {
  title: "Quiet Grain",
  kind: "background",
  description: "Seamlessly tileable paper, plaster, stone and clay surfaces with fibres or flecks, toned to sit quietly behind UI and print.",
  tags: ["noise", "texture", "tileable", "seamless", "paper", "plaster", "stone", "surface"],
  price: 3,
  author: "oasis-factory",
  size: [512, 512],
};

export const params = {
  knobs: {
    background: { type: "color", role: "background", label: "Surface", default: "#F1ECE3" },
    tint: { type: "color", role: "ink", label: "Shadow tint", default: "#6E5B45" },
    highlight: { type: "color", role: "highlight", label: "Highlight tint", default: "#FFFDF7" },
    noise: { type: "choice", label: "Noise type", default: "fractal", options: ["fractal", "turbulence"] },
    inclusions: { type: "choice", label: "Inclusions", default: "fibres", options: ["none", "fibres", "flecks"] },
    scale: { type: "range", label: "Feature size", default: 4, min: 1, max: 10, step: 0.5 },
    octaves: { type: "range", label: "Octaves", default: 4, min: 1, max: 8, step: 1 },
    contrast: { type: "range", label: "Contrast", default: 30, min: 5, max: 100, step: 1 },
    seed: { type: "range", label: "Seed", default: 7, min: 1, max: 500, step: 1 },
    preview: { type: "toggle", label: "Show 2×2 repeat", default: false },
  },
  presets: {
    Paper: { background: "#F1ECE3", tint: "#6E5B45", highlight: "#FFFDF7" },
    Concrete: { background: "#B8B6B1", tint: "#2F3236", highlight: "#E9E7E2" },
    Slate: { background: "#1F262C", tint: "#070A0D", highlight: "#6F8291" },
    Clay: { background: "#C2694A", tint: "#4E1C0E", highlight: "#F4B999" },
  },
};

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const f = (n) => (Math.round(n * 10000) / 10000).toString();

function safeHex(hex, fb) {
  return /^#[0-9a-f]{6}$/i.test(String(hex || "")) ? hex : fb;
}

function toLab(hex) {
  const n = parseInt(hex.slice(1), 16);
  const lin = (v) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  const r = lin(((n >> 16) & 255) / 255), g = lin(((n >> 8) & 255) / 255), b = lin((n & 255) / 255);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function fromLab(L, a, b) {
  const gam = (v) => (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055);
  let out = [0, 0, 0];
  for (let i = 0; i < 12; i++) {
    const l = Math.pow(L + 0.3963377774 * a + 0.2158037573 * b, 3);
    const m = Math.pow(L - 0.1055613458 * a - 0.0638541728 * b, 3);
    const s = Math.pow(L - 0.0894841775 * a - 1.291485548 * b, 3);
    const rgb = [
      4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
      -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
      -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
    ];
    out = rgb;
    if (rgb.every((v) => v >= -0.001 && v <= 1.001)) break;
    a *= 0.85; b *= 0.85;
  }
  return out.map((v) => clamp(gam(clamp(v, 0, 1)), 0, 1));
}

function tone(surf, src, L, cmax, mix) {
  let a = surf[1] + (src[1] - surf[1]) * mix, b = surf[2] + (src[2] - surf[2]) * mix;
  const C = Math.hypot(a, b);
  if (C > cmax) { a *= cmax / C; b *= cmax / C; }
  return fromLab(clamp(L, 0.02, 0.995), a, b);
}

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return (h >>> 0) % 997;
}

function cm(inp, col, k, bias, res) {
  return `<feColorMatrix in="${inp}" type="matrix" values="0 0 0 0 ${f(col[0])} 0 0 0 0 ${f(col[1])} 0 0 0 0 ${f(col[2])} ${f(k[0])} ${f(k[1])} ${f(k[2])} ${f(k[3])} ${f(bias)}" result="${res}"/>`;
}

function capA(inp, cap, res) {
  return `<feColorMatrix in="${inp}" type="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 ${f(cap)} 0" result="${res}"/>`;
}

function layer(inp, col, k, bias, cap, res) {
  return cm(inp, col, k, bias, res + "0") + capA(res + "0", cap, res);
}

function turb(type, cx, cy, oct, seed, res, S) {
  return `<feTurbulence type="${type}" baseFrequency="${f(cx / S)} ${f(cy / S)}" numOctaves="${oct}" seed="${seed}" stitchTiles="stitch" result="${res}"/>`;
}

export default function render(p) {
  const S = 512;
  const bg = safeHex(p.background, "#F1ECE3");
  const ink = safeHex(p.tint, "#6E5B45");
  const hi = safeHex(p.highlight, "#FFFDF7");
  const turbMode = p.noise === "turbulence";
  const inc = ["none", "fibres", "flecks"].includes(p.inclusions) ? p.inclusions : "fibres";
  const size = clamp(Number(p.scale) || 4, 1, 10);
  const oct = clamp(Math.round(Number(p.octaves) || 4), 1, 8);
  const c = clamp(Number(p.contrast) || 30, 5, 100) / 100;
  const seed = ((Math.round(Number(p.seed) || 1) * 131 + hash((bg + ink + hi).toLowerCase())) % 99991) + 1;

  const surf = toLab(bg), tl = toLab(ink), hl = toLab(hi), Ls = surf[0];
  const shL = Math.max(0.03, tl[0] < Ls - 0.06 ? clamp(tl[0], Ls - 0.38, Ls - 0.12) : Ls - 0.2);
  const hiL = Math.min(0.995, hl[0] > Ls + 0.03 ? clamp(hl[0], Ls + 0.06, Ls + 0.3) : Ls + 0.16);
  const shadow = tone(surf, tl, shL, 0.09, 0.75);
  const light = tone(surf, hl, hiL, 0.07, 0.75);
  const deep = tone(surf, tl, shL - 0.1, 0.1, 0.85);
  const bright = tone(surf, hl, hiL + 0.04, 0.06, 0.8);
  const fibreCol = Ls > 0.5 ? tone(surf, tl, Ls - 0.16, 0.08, 0.8) : bright;

  const cx = Math.max(2, Math.round(56 / size));
  const W = Math.max(1, Math.round(cx / 4));
  const washCap = 0.12 + 0.3 * c;

  let fx = turb("fractalNoise", W, W, 3, seed + 11, "w", S) +
    layer("w", light, [-3, 0, 0, 0], 1.5, washCap, "wh") +
    layer("w", shadow, [3, 0, 0, 0], -1.5, washCap, "ws");
  const nodes = ["wh", "ws"];

  if (turbMode) {
    const kv = 7 + 5 * c, gH = 3 + 5 * c;
    fx += turb("turbulence", cx, cx, oct, seed, "n", S) +
      layer("n", light, [0, 0, gH, 0], -0.3 * gH, 0.2 + 0.6 * c, "mh") +
      layer("n", shadow, [-kv, 0, 0, 0], 1, 0.25 + 0.6 * c, "ms");
  } else {
    const g = 4.5 + 6 * c;
    fx += turb("fractalNoise", cx, cx, oct, seed, "n", S) +
      layer("n", light, [0, 0, -g * 0.9, 0], 0.5 * g * 0.9, 0.22 + 0.6 * c, "mh") +
      layer("n", shadow, [g / 2, g / 2, 0, 0], -0.49 * g, 0.18 + 0.62 * c, "ms");
  }
  nodes.push("mh", "ms");

  if (inc === "fibres") {
    const fc = clamp(Math.round(cx * 1.3), 6, 40), mc = Math.max(2, Math.round(cx * 0.7));
    fx += turb("turbulence", fc, Math.round(fc * 1.5), 2, seed + 23, "fn", S) +
      cm("fn", fibreCol, [-18, 0, 0, 0], 1, "fr0") +
      turb("fractalNoise", mc, mc, 2, seed + 37, "fmn", S) +
      cm("fmn", [0, 0, 0], [6, 0, 0, 0], -3.3, "fm") +
      `<feComposite in="fr0" in2="fm" operator="in" result="fr1"/>` +
      capA("fr1", 0.35 + 0.45 * c, "fr");
    nodes.push("fr");
  } else if (inc === "flecks") {
    const kc = Math.round(96 - size * 4);
    fx += turb("fractalNoise", kc, kc, 1, seed + 53, "k", S) +
      layer("k", bright, [0, 22, 0, 0], -22 * 0.67, 0.4 + 0.4 * c, "kl") +
      layer("k", deep, [22, 0, 0, 0], -22 * 0.67, 0.4 + 0.4 * c, "kd");
    nodes.push("kl", "kd");
  }

  const defs = `<filter id="tex" x="0" y="0" width="${S}" height="${S}" filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" color-interpolation-filters="sRGB">` +
    fx + `<feMerge>${nodes.map((n) => `<feMergeNode in="${n}"/>`).join("")}</feMerge></filter>`;

  const tile = `<rect width="${S}" height="${S}" fill="${bg}"/><rect width="${S}" height="${S}" fill="#000000" filter="url(#tex)"/>`;
  let body = tile;
  if (p.preview) {
    body = "";
    for (let i = 0; i < 4; i++) {
      body += `<g transform="translate(${(i % 2) * S / 2} ${Math.floor(i / 2) * S / 2}) scale(0.5)">${tile}</g>`;
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}"><defs>${defs}</defs>${body}</svg>`;
}
