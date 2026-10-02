// Packaging label: die-cut rectangle, oval or round label with rim band, ornament border, ribbon variant and net weight.
export const meta = {
  title: "Pantry Label",
  kind: "brand",
  description: "A vintage product label for jars, bottles and bags, with an ornament border, ribbon variant, net weight and print texture, ready for packaging mockups.",
  tags: ["label", "packaging", "jar", "sticker", "vintage", "product", "ornament", "branding"],
  price: 8,
  author: "oasis-factory",
  size: [600, 600],
};

export const params = {
  knobs: {
    paper: { type: "color", role: "background", label: "Paper", default: "#F4EBDA" },
    ink: { type: "color", role: "ink", label: "Ink", default: "#2B2118" },
    accent: { type: "color", role: "primary", label: "Accent", default: "#B5452B" },
    shape: { type: "choice", label: "Shape", default: "oval", options: ["rectangle", "oval", "circle"] },
    border: { type: "choice", label: "Border style", default: "beaded", options: ["double", "beaded", "rope", "stitched"] },
    texture: { type: "choice", label: "Texture overlay", default: "grain", options: ["none", "grain", "linen", "speckle"] },
    name: { type: "text", label: "Product name", default: "Wildflower Honey" },
    variant: { type: "text", label: "Variant", default: "Raw & Unfiltered" },
    weight: { type: "range", label: "Net weight (g)", default: 340, min: 50, max: 1000, step: 10 },
    rim: { type: "range", label: "Rim band", default: 0, min: 0, max: 28, step: 2 },
  },
  presets: {
    Apothecary: { paper: "#E6EEE7", ink: "#1E3A32", accent: "#3E7C67", shape: "circle", border: "double", texture: "linen" },
    Midnight: { paper: "#1B2236", ink: "#F1E6CF", accent: "#D4A24C", shape: "rectangle", border: "rope", texture: "grain" },
    Blush: { paper: "#FBE9E4", ink: "#4A1F2A", accent: "#C9566E", shape: "oval", border: "stitched", texture: "speckle" },
    Kraft: { paper: "#C9A77C", ink: "#1F1610", accent: "#1F3D5C", shape: "circle", border: "beaded", texture: "none" },
  },
};

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const hex = (c) => "#" + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
const mix = (a, b, t) => { const x = rgb(a), y = rgb(b); return hex(x.map((v, i) => v + (y[i] - v) * t)); };
const lum = (h) => { const c = rgb(h).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const best = (bg) => (contrast("#FFFFFF", bg) >= contrast("#141414", bg) ? "#FFFFFF" : "#141414");
const textOn = (bg, pref, min = 4.5) => (contrast(pref, bg) >= min ? pref : best(bg));

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const S = 600, C = 300;
const DIM = { rectangle: [250, 190], oval: [272, 200], circle: [232, 232] };

function shapeEl(shape, o, attrs) {
  const [a, b] = DIM[shape];
  if (shape === "rectangle") {
    const rx = Math.max(3, 18 - o * 0.5);
    return `<rect x="${C - a + o}" y="${C - b + o}" width="${2 * (a - o)}" height="${2 * (b - o)}" rx="${rx}" ${attrs}/>`;
  }
  if (shape === "circle") return `<circle cx="${C}" cy="${C}" r="${a - o}" ${attrs}/>`;
  return `<ellipse cx="${C}" cy="${C}" rx="${a - o}" ry="${b - o}" ${attrs}/>`;
}

function halfW(shape, y, o) {
  const [a, b] = DIM[shape];
  if (shape === "rectangle") return a - o;
  const t = y / (b - o);
  return (a - o) * Math.sqrt(Math.max(0, 1 - t * t));
}

function border(p, i, lc, paper) {
  const s = p.shape, f = `fill="none" stroke="${lc}"`;
  if (p.border === "double") return shapeEl(s, i, `${f} stroke-width="2.6"`) + shapeEl(s, i + 7, `${f} stroke-width="1"`);
  if (p.border === "beaded") return shapeEl(s, i, `${f} stroke-width="1"`) + shapeEl(s, i + 7, `${f} stroke-width="4" stroke-dasharray="0 9" stroke-linecap="round"`) + shapeEl(s, i + 14, `${f} stroke-width="1"`);
  if (p.border === "rope") return shapeEl(s, i + 5, `${f} stroke-width="8"`) + shapeEl(s, i + 5, `fill="none" stroke="${paper}" stroke-width="8" stroke-dasharray="1.6 5.4" stroke-opacity="0.85"`) + shapeEl(s, i, `${f} stroke-width="0.9"`) + shapeEl(s, i + 10, `${f} stroke-width="0.9"`);
  return shapeEl(s, i, `${f} stroke-width="1.4"`) + shapeEl(s, i + 7, `${f} stroke-width="1.4" stroke-dasharray="6 4" stroke-linecap="round"`);
}

function sprig(x, y, dir, col) {
  let leaves = "";
  for (let k = 0; k < 4; k++) {
    const t = 6 + k * 9, up = k % 2 ? 1 : -1, ang = up * -35, cy = up * 4 - t * 0.08;
    leaves += `<ellipse cx="${t + 3}" cy="${cy}" rx="5.2" ry="2.2" transform="rotate(${ang} ${t + 3} ${cy})" fill="${col}"/>`;
  }
  leaves += `<ellipse cx="41" cy="-3.2" rx="4.6" ry="2" transform="rotate(-10 41 -3.2)" fill="${col}"/>`;
  return `<g transform="translate(${x} ${y}) scale(${dir} 1)"><path d="M0,0 Q20,-1 40,-3" fill="none" stroke="${col}" stroke-width="1.2" stroke-linecap="round"/>${leaves}</g>`;
}

export default function render(p) {
  const paper = p.paper, ink = textOn(paper, p.ink);
  const lc = contrast(p.accent, paper) >= 2.4 ? p.accent : ink;
  const eyebrowCol = textOn(paper, p.accent);
  const lightPaper = lum(paper) > 0.3;
  const canvas = lightPaper ? mix(mix(paper, p.accent, 0.2), "#000000", 0.05) : mix(mix(paper, "#000000", 0.5), p.accent, 0.06);
  const dark = lum(canvas) < 0.18;
  const shadowCol = dark ? "#000000" : mix(canvas, "#000000", 0.45);
  const edge = mix(paper, canvas, 0.5);
  const sh = p.shape, rim = p.rim, bi = 16 + rim * 0.75, inner = bi + 20;

  let defs = `<filter id="sh" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="9"/></filter>`;
  defs += `<clipPath id="lab">${shapeEl(sh, 0, "")}</clipPath>`;
  const [ir, ig, ib] = rgb(ink).map((v) => (v / 255).toFixed(3));
  let tex = "";
  if (p.texture === "grain") {
    defs += `<filter id="gr" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="7"/><feColorMatrix type="matrix" values="0 0 0 0 ${ir} 0 0 0 0 ${ig} 0 0 0 0 ${ib} 1.7 0 0 0 -0.7"/></filter>`;
    tex = `<rect width="${S}" height="${S}" filter="url(#gr)" opacity="0.32" clip-path="url(#lab)"/>`;
  } else if (p.texture === "linen") {
    defs += `<pattern id="ln" width="4" height="4" patternUnits="userSpaceOnUse"><path d="M0,0.5H4M0.5,0V4" stroke="${ink}" stroke-width="0.6" opacity="0.5"/><path d="M0,2.5H4" stroke="${ink}" stroke-width="0.4" opacity="0.3"/></pattern>`;
    tex = `<rect width="${S}" height="${S}" fill="url(#ln)" opacity="0.16" clip-path="url(#lab)"/>`;
  } else if (p.texture === "speckle") {
    let h = 17; for (const ch of String(p.name)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const r = rng(h); let dots = "";
    for (let k = 0; k < 260; k++) {
      const x = 30 + r() * 540, y = 70 + r() * 460, rad = 0.4 + r() * r() * 1.8;
      dots += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${rad.toFixed(2)}"/>`;
    }
    tex = `<g fill="${ink}" opacity="0.28" clip-path="url(#lab)">${dots}</g>`;
  }

  let band = "";
  if (rim > 0) {
    band = shapeEl(sh, 0, `fill="${p.accent}"`) + shapeEl(sh, rim, `fill="${paper}"`);
    if (rim >= 12) band += shapeEl(sh, rim / 2, `fill="none" stroke="${best(p.accent)}" stroke-width="0.8" stroke-opacity="0.4" stroke-dasharray="2 3"`);
  }

  const SANS = "Helvetica Neue, Helvetica, Arial, sans-serif", SERIF = "Georgia, 'Times New Roman', serif";
  let body = "";

  const eyebrow = "SMALL BATCH", ey = C - 86, ew = eyebrow.length * (12 * 0.66 + 3.5);
  body += `<text x="${C + 1.75}" y="${ey}" text-anchor="middle" font-family="${SANS}" font-size="12" font-weight="700" letter-spacing="3.5" fill="${eyebrowCol}">${eyebrow}</text>`;
  const gx = ew / 2 + 12;
  body += sprig(C + gx, ey - 4, 1, lc) + sprig(C - gx, ey - 4, -1, lc);

  const dy = C - 62, dw = Math.min(96, halfW(sh, dy - C, inner) - 24);
  body += `<path d="M${C - dw},${dy}H${C - 9}M${C + 9},${dy}H${C + dw}" stroke="${lc}" stroke-width="1"/><path d="M${C},${dy - 4} L${C + 4},${dy} L${C},${dy + 4} L${C - 4},${dy}Z" fill="${lc}"/>`;

  const name = String(p.name).trim() || " ";
  const availN = 2 * halfW(sh, -18, inner) - 40;
  const ns = Math.max(18, Math.min(58, availN / (name.length * 0.53)));
  body += `<text x="${C}" y="${(C - 16 + ns * 0.34).toFixed(1)}" text-anchor="middle" font-family="${SERIF}" font-size="${ns.toFixed(1)}" fill="${ink}">${esc(name)}</text>`;

  const vtxt = String(p.variant).trim().toUpperCase();
  if (vtxt) {
    const ry = C + 42, rh = 32, maxBody = 2 * halfW(sh, ry - C + rh / 2 + 8, inner) - 52;
    let vs = 13.5, tw = vtxt.length * (vs * 0.68 + 2);
    if (tw + 44 > maxBody) { vs = Math.max(8, vs * (maxBody - 44) / tw); tw = vtxt.length * (vs * 0.68 + 2); }
    const bw = Math.min(maxBody, tw + 44), L = C - bw / 2, R = C + bw / 2, t = ry - rh / 2, b = ry + rh / 2;
    const tail = mix(p.accent, "#000000", 0.22), fold = mix(p.accent, "#000000", 0.45);
    const tailL = `${L + 10},${t + 8} ${L - 22},${t + 8} ${L - 12},${b} ${L - 22},${b + 8} ${L + 10},${b + 8}`;
    const tailR = `${R - 10},${t + 8} ${R + 22},${t + 8} ${R + 12},${b} ${R + 22},${b + 8} ${R - 10},${b + 8}`;
    body += `<polygon points="${tailL}" fill="${tail}"/><polygon points="${tailR}" fill="${tail}"/>`;
    body += `<polygon points="${L},${b} ${L + 10},${b} ${L + 10},${b + 8}" fill="${fold}"/><polygon points="${R},${b} ${R - 10},${b} ${R - 10},${b + 8}" fill="${fold}"/>`;
    body += `<rect x="${L}" y="${t}" width="${bw}" height="${rh}" fill="${p.accent}"/>`;
    body += `<path d="M${L + 4},${t + 3.5}H${R - 4}M${L + 4},${b - 3.5}H${R - 4}" stroke="${best(p.accent)}" stroke-width="0.6" opacity="0.35"/>`;
    body += `<text x="${C + 1}" y="${(ry + vs * 0.36).toFixed(1)}" text-anchor="middle" font-family="${SANS}" font-size="${vs.toFixed(1)}" font-weight="700" letter-spacing="2" fill="${best(p.accent)}">${esc(vtxt)}</text>`;
  }

  const g = p.weight, oz = (g / 28.3495).toFixed(1);
  const wt = `NET WT ${g >= 1000 ? (g / 1000) + " KG" : g + " G"} · ${oz} OZ`;
  const wy = C + 98, ww = wt.length * (11 * 0.64 + 2.2);
  const rw = Math.min(26, halfW(sh, wy - 4 - C, inner) - ww / 2 - 10);
  body += `<text x="${C + 1.1}" y="${wy}" text-anchor="middle" font-family="${SANS}" font-size="11" letter-spacing="2.2" fill="${ink}">${wt}</text>`;
  if (rw > 8) body += `<path d="M${C - ww / 2 - 8 - rw},${wy - 4}H${C - ww / 2 - 8}M${C + ww / 2 + 8},${wy - 4}H${C + ww / 2 + 8 + rw}" stroke="${lc}" stroke-width="1"/>`;

  const shadow = `<g transform="translate(0 10)" filter="url(#sh)" opacity="${dark ? 0.6 : 0.32}">${shapeEl(sh, 0, `fill="${shadowCol}"`)}</g>`;
  const label = shapeEl(sh, 0, `fill="${paper}"`);
  const outline = shapeEl(sh, 0.5, `fill="none" stroke="${rim > 0 ? mix(p.accent, canvas, 0.4) : edge}" stroke-width="1"`);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}"><defs>${defs}</defs><rect width="${S}" height="${S}" fill="${canvas}"/>${shadow}${label}${band}${tex}${outline}${border(p, bi, lc, paper)}${body}</svg>`;
}
