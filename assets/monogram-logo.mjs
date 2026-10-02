// Monogram logo: 1-3 letters set in an optically balanced container, with keyline, outline and hollow treatments.
export const meta = {
  title: "Signet Monogram",
  kind: "brand",
  description: "A refined 1-3 letter monogram mark in circle, squircle, hexagon or shield containers for logos, favicons, seals and social avatars.",
  tags: ["monogram", "logo", "brand", "initials", "emblem", "badge", "seal", "identity"],
  price: 9,
  author: "oasis-factory",
  size: [512, 512],
};

export const params = {
  knobs: {
    primary: { type: "color", role: "primary", label: "Mark colour", default: "#1E2A44" },
    ink: { type: "color", role: "surface", label: "Letter colour (on fill)", default: "#F3EBDD" },
    background: { type: "color", role: "background", label: "Background", default: "#E9E2D6" },
    letters: { type: "text", label: "Letters (1-3)", default: "MR" },
    container: { type: "choice", label: "Container", default: "circle", options: ["circle", "squircle", "hexagon", "shield", "none"] },
    font: { type: "choice", label: "Typeface", default: "serif", options: ["serif", "sans", "geometric", "mono"] },
    style: { type: "choice", label: "Treatment", default: "inset", options: ["solid", "inset", "outline", "hollow"] },
    weight: { type: "range", label: "Weight", default: 2, min: 0, max: 10, step: 0.5 },
    tracking: { type: "range", label: "Letter spacing", default: 4, min: -10, max: 20, step: 1 },
    transparent: { type: "toggle", label: "Transparent background", default: false },
  },
  presets: {
    Navy: { primary: "#1E2A44", ink: "#F3EBDD", background: "#E9E2D6" },
    Terracotta: { primary: "#B5532F", ink: "#FFF4E8", background: "#F6EDE3" },
    Forest: { primary: "#24423A", ink: "#E7D9B8", background: "#F1EEE6" },
    Noir: { primary: "#C9A45C", ink: "#111111", background: "#111111" },
  },
};

const FONTS = {
  serif: { f: "Didot, 'Bodoni 72', 'Bodoni MT', Georgia, 'Times New Roman', serif", w: 400, k: 1, cap: 0.35 },
  sans: { f: "'Helvetica Neue', Helvetica, Arial, sans-serif", w: 600, k: 0.95, cap: 0.36 },
  geometric: { f: "Futura, 'Century Gothic', 'Avenir Next', 'Trebuchet MS', sans-serif", w: 500, k: 0.97, cap: 0.37 },
  mono: { f: "Menlo, Consolas, 'Courier New', monospace", w: 500, k: 0.92, cap: 0.365 },
};

const FIT = { circle: 1, squircle: 1.06, hexagon: 0.95, shield: 0.9, none: 1.4 };

const f = (n) => (Math.round(n * 100) / 100).toString();

function esc(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function roundedPolygon(pts, rad) {
  const n = pts.length;
  const corners = pts.map((c, i) => {
    const a = pts[(i - 1 + n) % n], b = pts[(i + 1) % n];
    const la = Math.hypot(a[0] - c[0], a[1] - c[1]), lb = Math.hypot(b[0] - c[0], b[1] - c[1]);
    return {
      p1: [c[0] + ((a[0] - c[0]) / la) * rad, c[1] + ((a[1] - c[1]) / la) * rad],
      c,
      p2: [c[0] + ((b[0] - c[0]) / lb) * rad, c[1] + ((b[1] - c[1]) / lb) * rad],
    };
  });
  let d = `M${f(corners[0].p1[0])},${f(corners[0].p1[1])}`;
  for (let i = 0; i < n; i++) {
    const k = corners[i], nx = corners[(i + 1) % n];
    d += ` Q${f(k.c[0])},${f(k.c[1])} ${f(k.p2[0])},${f(k.p2[1])} L${f(nx.p1[0])},${f(nx.p1[1])}`;
  }
  return d + "Z";
}

function shapePath(kind, cx, cy, R) {
  if (kind === "circle") {
    return `M${f(cx - R)},${f(cy)} a${f(R)},${f(R)} 0 1,0 ${f(2 * R)},0 a${f(R)},${f(R)} 0 1,0 ${f(-2 * R)},0Z`;
  }
  if (kind === "squircle") {
    const r = R * 0.94, e = 2 / 5, N = 144;
    let d = "";
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
      const x = cx + r * Math.sign(c) * Math.pow(Math.abs(c), e);
      const y = cy + r * Math.sign(s) * Math.pow(Math.abs(s), e);
      d += `${i ? "L" : "M"}${f(x)},${f(y)}`;
    }
    return d + "Z";
  }
  if (kind === "hexagon") {
    const r = R * 1.07, pts = [];
    for (let i = 0; i < 6; i++) {
      const a = ((-90 + i * 60) * Math.PI) / 180;
      pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
    return roundedPolygon(pts, R * 0.13);
  }
  if (kind === "shield") {
    const w = R * 0.84, top = cy - R * 0.94, bot = cy + R * 1.02, mid = cy + R * 0.12, rr = R * 0.12;
    return `M${f(cx - w)},${f(top + rr)} Q${f(cx - w)},${f(top)} ${f(cx - w + rr)},${f(top)}` +
      ` Q${f(cx)},${f(top + R * 0.07)} ${f(cx + w - rr)},${f(top)} Q${f(cx + w)},${f(top)} ${f(cx + w)},${f(top + rr)}` +
      ` L${f(cx + w)},${f(mid)} C${f(cx + w)},${f(mid + R * 0.5)} ${f(cx + w * 0.42)},${f(bot - R * 0.16)} ${f(cx)},${f(bot)}` +
      ` C${f(cx - w * 0.42)},${f(bot - R * 0.16)} ${f(cx - w)},${f(mid + R * 0.5)} ${f(cx - w)},${f(mid)}Z`;
  }
  return "";
}

export default function render(p) {
  const S = 512, cx = S / 2, cy = S / 2, R = 196;
  const kind = FIT[p.container] ? p.container : "circle";
  const F = FONTS[p.font] || FONTS.serif;
  const w = Math.max(0, Number(p.weight) || 0);
  const tr = Number(p.tracking) || 0;

  let chars = Array.from(String(p.letters == null ? "" : p.letters).replace(/\s+/g, "")).slice(0, 3);
  if (!chars.length) chars = ["A"];
  const n = chars.length;

  const spread = 1 + (Math.max(0, tr) * (n - 1) * 0.6) / 100;
  const fs = (R * [1.1, 0.74, 0.56][n - 1] * FIT[kind] * F.k * (1 - w * 0.006)) / spread;
  const ls = n > 1 ? (fs * tr) / 100 : 0;
  const ty = cy + fs * F.cap - (kind === "shield" ? R * 0.07 : 0);
  const glyphs = chars.map((c, i) => (i ? `<tspan dx="${f(ls)}">${esc(c)}</tspan>` : esc(c))).join("");

  const hasBox = kind !== "none";
  const filled = hasBox && (p.style === "solid" || p.style === "inset");
  const letterCol = filled ? p.ink : p.primary;

  let box = "";
  if (hasBox) {
    const d = shapePath(kind, cx, cy, R);
    if (filled) {
      box = `<path d="${d}" fill="${p.primary}"/>`;
      if (p.style === "inset") {
        const gap = R * 0.075, k = (R - gap) / R, sw = (1.5 + w * 0.35) / k;
        const oy = kind === "shield" ? cy + R * 0.02 : cy;
        box += `<g transform="translate(${f(cx)} ${f(oy)}) scale(${f(k)}) translate(${f(-cx)} ${f(-oy)})"><path d="${d}" fill="none" stroke="${p.ink}" stroke-width="${f(sw)}" stroke-linejoin="round"/></g>`;
      }
    } else {
      const sw = 3 + w * 1.2;
      box = `<path d="${d}" fill="none" stroke="${p.primary}" stroke-width="${f(sw)}" stroke-linejoin="round"/>`;
    }
  }

  let paint;
  if (p.style === "hollow") {
    paint = `fill="none" stroke="${letterCol}" stroke-width="${f(((1.2 + w * 0.45) * fs) / 150)}"`;
  } else {
    const sw = (w * fs) / 160;
    paint = sw > 0 ? `fill="${letterCol}" stroke="${letterCol}" stroke-width="${f(sw)}"` : `fill="${letterCol}"`;
  }

  const letters = `<text x="${f(cx)}" y="${f(ty)}" text-anchor="middle" font-family="${F.f}" font-size="${f(fs)}" font-weight="${F.w}" stroke-linejoin="round" ${paint}>${glyphs}</text>`;
  const bg = p.transparent ? "" : `<rect width="${S}" height="${S}" fill="${p.background}"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}">${bg}${box}${letters}</svg>`;
}
