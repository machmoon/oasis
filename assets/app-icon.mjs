// iOS-style app icon: continuous-corner squircle, two-stop gradient, path-built glyphs, feathered gloss and layered depth shadows.
export const meta = {
  title: "Squircle App Icon",
  kind: "icons",
  description: "A polished iOS-style app icon with six crafted glyphs, gradient body, gloss and depth, for app mockups, store listings and pitch decks.",
  tags: ["app icon", "ios", "squircle", "icon", "gradient", "mobile", "glyph", "branding"],
  price: 5,
  author: "oasis-factory",
  size: [1024, 1024],
};

export const params = {
  knobs: {
    top: { type: "color", role: "secondary", label: "Gradient top", default: "#3EC6FF" },
    bottom: { type: "color", role: "primary", label: "Gradient bottom", default: "#2B5BFF" },
    ink: { type: "color", role: "surface", label: "Glyph colour", default: "#FFFFFF" },
    backdrop: { type: "color", role: "background", label: "Backdrop", default: "#EEF1F6" },
    glyph: { type: "choice", label: "Glyph", default: "camera", options: ["camera", "note", "wave", "leaf", "bolt", "compass"] },
    style: { type: "choice", label: "Glyph style", default: "solid", options: ["solid", "outline", "duotone"] },
    scale: { type: "range", label: "Glyph size", default: 56, min: 40, max: 78, step: 1 },
    depth: { type: "range", label: "Depth shadow", default: 24, min: 0, max: 40, step: 1 },
    gloss: { type: "toggle", label: "Gloss", default: true },
    transparent: { type: "toggle", label: "Transparent backdrop", default: false },
  },
  presets: {
    Lagoon: { top: "#3EC6FF", bottom: "#2B5BFF", ink: "#FFFFFF", backdrop: "#EEF1F6" },
    Sunset: { top: "#FFB36B", bottom: "#FF4D6D", ink: "#FFFFFF", backdrop: "#FBF1EC" },
    Grove: { top: "#A6E36A", bottom: "#1E9E6A", ink: "#F6FFF2", backdrop: "#EDF3EC" },
    Midnight: { top: "#3A3F5C", bottom: "#0E0F1A", ink: "#FFD66B", backdrop: "#17181F" },
  },
};

const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, t) => {
  const A = rgb(a), B = rgb(b);
  return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join("");
};
const f = (n) => +n.toFixed(2);

function circ(x, y, r) {
  return `M${x + r},${y} a${r},${r} 0 1 0 ${-2 * r},0 a${r},${r} 0 1 0 ${2 * r},0 Z `;
}

function squircle(cx, cy, s) {
  const h = s / 2, R = s * 0.36, e = 2 / 4.6, steps = 40, o = h - R;
  let d = "";
  for (let q = 0; q < 4; q++) {
    const qx = q === 0 || q === 3 ? 1 : -1, qy = q < 2 ? 1 : -1;
    for (let i = 0; i <= steps; i++) {
      const t = ((q + i / steps) * Math.PI) / 2;
      const c = Math.abs(Math.cos(t)), sn = Math.abs(Math.sin(t));
      const x = cx + qx * (o + R * Math.pow(c, e));
      const y = cy + qy * (o + R * Math.pow(sn, e));
      d += (d ? "L" : "M") + x.toFixed(1) + "," + y.toFixed(1);
    }
  }
  return d + "Z";
}

function waveD() {
  const x0 = 18, x1 = 82, amp = 5.5, h = 4, k = (Math.PI * 3) / (x1 - x0), steps = 48;
  let d = "";
  for (const yc of [34, 50, 66]) {
    const ys = (x) => yc + amp * Math.sin(k * (x - x0));
    for (let i = 0; i <= steps; i++) {
      const x = x0 + ((x1 - x0) * i) / steps;
      d += (i ? "L" : "M") + f(x) + "," + f(ys(x) - h);
    }
    d += `A${h},${h} 0 0 1 ${x1},${f(ys(x1) + h)}`;
    for (let i = steps; i >= 0; i--) {
      const x = x0 + ((x1 - x0) * i) / steps;
      d += "L" + f(x) + "," + f(ys(x) + h);
    }
    d += `A${h},${h} 0 0 1 ${x0},${f(ys(x0) - h)}Z `;
  }
  return d;
}

const GLYPHS = {
  camera: {
    d: "M24,30 h8 l5,-8 h26 l5,8 h8 a10,10 0 0 1 10,10 v28 a10,10 0 0 1 -10,10 h-52 a10,10 0 0 1 -10,-10 v-28 a10,10 0 0 1 10,-10 Z " +
      circ(50, 54, 17) + circ(50, 54, 7) + circ(74, 40, 3),
  },
  note: {
    d: "M41,70 L41,38.9 L73,33.1 L73,52.8 A10,10 0 1 0 79,62 L79,22 L35,30 L35,60.8 A10,10 0 1 0 41,70 Z",
    shift: [0, -1],
  },
  wave: { d: waveD() },
  leaf: {
    d: "M50,14 C72,26 82,46 74,66 C68,80 56,86 50,86 C44,86 32,80 26,66 C18,46 28,26 50,14 Z " +
      "M50,25 C53.6,44 53.6,64 50,79 C46.4,64 46.4,44 50,25 Z",
    rot: 35,
  },
  bolt: { d: "M58,8 L24,56 H47 L42,92 L76,42 H53 Z" },
  compass: {
    d: circ(50, 50, 40) + circ(50, 50, 32) +
      "M66.3,33.7 L54.9,54.9 L33.7,66.3 L45.1,45.1 Z " + circ(50, 50, 3.5),
  },
};

function paint(style, c) {
  const line = `stroke="${c}" stroke-linejoin="round" stroke-linecap="round"`;
  if (style === "outline") return `fill="none" ${line} stroke-width="5"`;
  if (style === "duotone") return `fill="${c}" fill-opacity="0.32" fill-rule="evenodd" ${line} stroke-width="4.5"`;
  return `fill="${c}" fill-rule="evenodd" stroke="${c}" stroke-width="0.6" stroke-linejoin="round"`;
}

export default function render(p) {
  const W = 1024, S = 760, depth = p.depth;
  const cx = 512, cy = 512 - depth * 0.35, top = cy - S / 2;
  const sq = squircle(cx, cy, S);
  const dark = mix(p.bottom, "#000000", 0.62);
  const g = GLYPHS[p.glyph] || GLYPHS.camera;
  const full = `filterUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${W}"`;

  let defs = `<linearGradient id="body" gradientUnits="userSpaceOnUse" x1="${cx - S * 0.18}" y1="${top}" x2="${cx + S * 0.18}" y2="${top + S}"><stop offset="0" stop-color="${p.top}"/><stop offset="1" stop-color="${p.bottom}"/></linearGradient>`;
  defs += `<clipPath id="clip"><path d="${sq}"/></clipPath>`;
  defs += `<radialGradient id="bd" cx="0.5" cy="0.42" r="0.7"><stop offset="0" stop-color="${mix(p.backdrop, "#FFFFFF", 0.35)}"/><stop offset="1" stop-color="${p.backdrop}"/></radialGradient>`;
  defs += `<radialGradient id="glow" gradientUnits="userSpaceOnUse" cx="${cx}" cy="${top}" r="${S * 0.75}"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.16"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></radialGradient>`;

  let out = p.transparent ? "" : `<rect width="${W}" height="${W}" fill="url(#bd)"/>`;

  if (depth > 0) {
    defs += `<filter id="s1" ${full}><feGaussianBlur stdDeviation="${f(depth * 0.9)}"/></filter>`;
    defs += `<filter id="s2" ${full}><feGaussianBlur stdDeviation="${f(depth * 0.3)}"/></filter>`;
    defs += `<filter id="gs" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="${f(depth * 0.05)}"/></filter>`;
    defs += `<linearGradient id="shade" gradientUnits="userSpaceOnUse" x1="0" y1="${top + S * 0.5}" x2="0" y2="${top + S}"><stop offset="0" stop-color="${dark}" stop-opacity="0"/><stop offset="1" stop-color="${dark}" stop-opacity="${f((depth / 40) * 0.28)}"/></linearGradient>`;
    out += `<path d="${sq}" fill="${dark}" opacity="0.4" transform="translate(0 ${f(depth * 0.8)})" filter="url(#s1)"/>`;
    out += `<path d="${sq}" fill="${dark}" opacity="0.26" transform="translate(0 ${f(depth * 0.22)})" filter="url(#s2)"/>`;
  }

  out += `<path d="${sq}" fill="url(#body)"/>`;
  out += `<rect x="${cx - S / 2}" y="${top}" width="${S}" height="${S}" fill="url(#glow)" clip-path="url(#clip)"/>`;
  if (depth > 0) out += `<rect x="${cx - S / 2}" y="${top}" width="${S}" height="${S}" fill="url(#shade)" clip-path="url(#clip)"/>`;

  if (p.gloss) {
    defs += `<filter id="soft" ${full}><feGaussianBlur stdDeviation="${f(S * 0.03)}"/></filter>`;
    defs += `<linearGradient id="sheen" gradientUnits="userSpaceOnUse" x1="0" y1="${top}" x2="0" y2="${top + S * 0.42}"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.38"/><stop offset="0.6" stop-color="#FFFFFF" stop-opacity="0.12"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></linearGradient>`;
    out += `<g clip-path="url(#clip)"><ellipse cx="${cx}" cy="${f(top - S * 0.2)}" rx="${f(S * 0.92)}" ry="${f(S * 0.6)}" fill="url(#sheen)" filter="url(#soft)"/></g>`;
  }

  const gsz = (S * p.scale) / 100, k = gsz / 100;
  const sh = g.shift || [0, 0];
  const gx = cx - gsz / 2 + sh[0] * k, gy = cy - gsz / 2 + sh[1] * k;
  const rot = g.rot ? ` transform="rotate(${g.rot} 50 50)"` : "";
  let glyph = `<g transform="translate(${f(gx)} ${f(gy)}) scale(${f(k)})"><g${rot}>`;
  if (depth > 0) {
    glyph += `<g transform="translate(0 ${f(depth * 0.06)})" opacity="0.42" filter="url(#gs)"><path d="${g.d}" ${paint(p.style, dark)}/></g>`;
  }
  glyph += `<path d="${g.d}" ${paint(p.style, p.ink)}/></g></g>`;
  out += glyph;

  if (p.gloss) {
    defs += `<linearGradient id="rim" gradientUnits="userSpaceOnUse" x1="0" y1="${top}" x2="0" y2="${top + S * 0.45}"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.55"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></linearGradient>`;
    defs += `<linearGradient id="rimlo" gradientUnits="userSpaceOnUse" x1="0" y1="${top + S * 0.6}" x2="0" y2="${top + S}"><stop offset="0" stop-color="${dark}" stop-opacity="0"/><stop offset="1" stop-color="${dark}" stop-opacity="0.32"/></linearGradient>`;
    out += `<g clip-path="url(#clip)">`;
    out += `<path d="${sq}" fill="none" stroke="url(#rim)" stroke-width="6"/>`;
    out += `<path d="${sq}" fill="none" stroke="url(#rimlo)" stroke-width="5"/>`;
    out += `</g>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${W}" width="${W}" height="${W}"><defs>${defs}</defs>${out}</svg>`;
}
