// Bauhaus poster: a seeded modular grid of circles, semicircles, quarter circles and bars above a set headline.
export const meta = {
  title: "Bauhaus Grid Poster",
  kind: "poster",
  description: "Seeded Bauhaus-style compositions on a modular grid with a set headline, for event posters, covers and wall art.",
  tags: ["bauhaus", "poster", "geometric", "modernist", "grid", "primary colors", "generative", "typography"],
  price: 6,
  author: "oasis-factory",
  size: [600, 800],
};

export const params = {
  knobs: {
    paper: { type: "color", role: "background", label: "Paper", default: "#F1EADB" },
    ink: { type: "color", role: "ink", label: "Ink", default: "#1B1A19" },
    red: { type: "color", role: "primary", label: "Red", default: "#D63A2B" },
    yellow: { type: "color", role: "highlight", label: "Yellow", default: "#F2B42E" },
    blue: { type: "color", role: "secondary", label: "Blue", default: "#1F4F9E" },
    style: { type: "choice", label: "Composition", default: "balanced", options: ["tiles", "balanced", "open"] },
    headline: { type: "text", label: "Headline", default: "BAUHAUS" },
    grid: { type: "range", label: "Grid size", default: 4, min: 3, max: 7, step: 1 },
    seed: { type: "range", label: "Seed", default: 23, min: 1, max: 500, step: 1 },
    texture: { type: "toggle", label: "Paper texture", default: true },
  },
  presets: {
    Primary: { paper: "#F1EADB", ink: "#1B1A19", red: "#D63A2B", yellow: "#F2B42E", blue: "#1F4F9E" },
    Dessau: { paper: "#E6DFD0", ink: "#24221F", red: "#B9533A", yellow: "#DDAE4C", blue: "#2E5A73" },
    Night: { paper: "#15171C", ink: "#EFE8D8", red: "#E5532F", yellow: "#F4C23B", blue: "#3D7DD8" },
    Sorbet: { paper: "#FBF4EC", ink: "#2B2A33", red: "#EF8A7E", yellow: "#F6D185", blue: "#7FA4E6" },
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

const f = (n) => +n.toFixed(2);
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function pickColor(r, items, weights, ex) {
  const cand = [];
  let tot = 0;
  items.forEach((c, i) => { if (!ex.includes(c) && weights[i] > 0) { cand.push([c, weights[i]]); tot += weights[i]; } });
  if (!cand.length) return items[0];
  let x = r() * tot;
  for (const [c, w] of cand) if ((x -= w) <= 0) return c;
  return cand[cand.length - 1][0];
}

function pickType(r, table) {
  const keys = Object.keys(table);
  let tot = 0;
  keys.forEach((k) => (tot += table[k]));
  let x = r() * tot;
  for (const k of keys) if ((x -= table[k]) <= 0) return k;
  return keys[0];
}

const SOLO = { circle: 1, half: 1, quarter: 1, bar: 1, stripes: 1 };

function geo(type, s) {
  const h = f(s / 2), S = f(s);
  switch (type) {
    case "circle": return `M0,${h}A${h},${h} 0 1 1 ${S},${h}A${h},${h} 0 1 1 0,${h}Z`;
    case "half": return `M0,${S}A${h},${h} 0 0 1 ${S},${S}Z`;
    case "quarter": return `M0,0H${S}A${S},${S} 0 0 1 0,${S}Z`;
    case "bar": return `M0,${f(s * 0.36)}H${S}V${f(s * 0.64)}H0Z`;
    case "stripes": return [0.16, 0.44, 0.72].map((y) => `M0,${f(s * y)}H${S}V${f(s * (y + 0.12))}H0Z`).join("");
    default: return "";
  }
}

const band = (R, q) => `M${f(R)},0A${f(R)},${f(R)} 0 0 1 0,${f(R)}L0,${f(q)}A${f(q)},${f(q)} 0 0 0 ${f(q)},0Z`;

function shape(type, s, A, B) {
  const h = s / 2;
  if (SOLO[type]) return `<path d="${geo(type, s)}" fill="${A}"/>`;
  if (type === "split")
    return `<path d="M${f(h)},0A${f(h)},${f(h)} 0 0 0 ${f(h)},${f(s)}Z" fill="${A}"/>` +
      `<path d="M${f(h)},0A${f(h)},${f(h)} 0 0 1 ${f(h)},${f(s)}Z" fill="${B}"/>`;
  if (type === "rainbow")
    return `<path d="${band(s, s * 0.66)}" fill="${A}"/><path d="${geo("quarter", s * 0.33)}" fill="${B}"/>`;
  if (type === "ring")
    return `<circle cx="${f(h)}" cy="${f(h)}" r="${f(s * 0.33)}" fill="none" stroke="${A}" stroke-width="${f(s * 0.15)}"/>` +
      `<circle cx="${f(h)}" cy="${f(h)}" r="${f(s * 0.1)}" fill="${B}"/>`;
  return "";
}

export default function render(p) {
  const W = 600, H = 800;
  const cols = Math.max(3, Math.min(7, Math.round(p.grid)));
  const c = Math.floor(520 / cols), G = c * cols, M = Math.round((W - G) / 2);
  const r = rng(p.seed * 9973 + cols * 131);
  const [fillP, bgP] = { tiles: [0.96, 0.62], balanced: [0.78, 0.3], open: [0.55, 0] }[p.style] || [0.78, 0.3];
  const pal = [p.red, p.yellow, p.blue, p.ink];
  const wts = [3, 2.4, 3, 1.4];
  const cellTypes = { circle: 2, half: 3, quarter: 3, split: 1.2, rainbow: 1, ring: 1, bar: 1.5, stripes: 1 };
  const bigTypes = { circle: 3, quarter: 3, half: 2, rainbow: 1.5, split: 1 };

  const occ = Array.from({ length: cols }, () => Array(cols).fill(false));
  const bgs = Array.from({ length: cols }, () => Array(cols).fill(null));
  const at = (i, j) => (i >= 0 && j >= 0 && i < cols && j < cols ? bgs[j][i] : null);
  const nb = (i, j, k) => {
    const out = [];
    for (let a = 0; a < k; a++) [at(i + a, j - 1), at(i + a, j + k), at(i - 1, j + a), at(i + k, j + a)].forEach((v) => v && out.push(v));
    return out;
  };

  const tile = (i, j, k, types, bgChance) => {
    const s = k * c;
    const bg = r() < bgChance ? pickColor(r, pal, wts, nb(i, j, k)) : null;
    if (bg) for (let a = 0; a < k; a++) for (let d = 0; d < k; d++) bgs[j + d][i + a] = bg;
    const type = pickType(r, types);
    const o = Math.floor(r() * 4);
    const A = pickColor(r, pal, wts, [bg]);
    const B = pickColor(r, pal.concat([p.paper]), wts.concat([bg ? 1.5 : 0]), [A, bg || p.paper]);
    const box = `M0,0H${f(s)}V${f(s)}H0Z`;
    const inner = bg && SOLO[type] && r() < 0.3
      ? `<path d="${box}${geo(type, s)}" fill-rule="evenodd" fill="${bg}"/>`
      : (bg ? `<path d="${box}" fill="${bg}"/>` : "") + shape(type, s, A, B);
    return `<g transform="translate(${M + i * c},${M + j * c}) rotate(${o * 90} ${f(s / 2)} ${f(s / 2)})">${inner}</g>`;
  };

  let body = "";
  const nBig = cols >= 5 ? 2 : 1;
  for (let b = 0; b < nBig; b++) {
    const k = b === 0 && cols >= 6 ? 3 : 2;
    for (let t = 0; t < 40; t++) {
      const i = Math.floor(r() * (cols - k + 1)), j = Math.floor(r() * (cols - k + 1));
      let free = true;
      for (let a = 0; a < k; a++) for (let d = 0; d < k; d++) if (occ[j + d][i + a]) free = false;
      if (!free) continue;
      for (let a = 0; a < k; a++) for (let d = 0; d < k; d++) occ[j + d][i + a] = true;
      body += tile(i, j, k, bigTypes, Math.min(1, bgP + 0.2));
      break;
    }
  }

  for (let j = 0; j < cols; j++) {
    for (let i = 0; i < cols; i++) {
      if (occ[j][i]) continue;
      if (r() > fillP) { r(); continue; }
      body += tile(i, j, 1, cellTypes, bgP);
    }
  }

  let marks = "";
  if (p.style !== "tiles") {
    let d = "";
    for (let j = 0; j <= cols; j++) {
      for (let i = 0; i <= cols; i++) {
        const x = M + i * c, y = M + j * c;
        d += `M${x - 4},${y}H${x + 4}M${x},${y - 4}V${y + 4}`;
      }
    }
    marks = `<path d="${d}" stroke="${p.ink}" stroke-width="0.8" opacity="0.35" fill="none"/>`;
  }

  const sans = "'Helvetica Neue', Helvetica, Arial, sans-serif";
  const display = "Futura, 'Century Gothic', 'Avenir Next', 'Helvetica Neue', Helvetica, Arial, sans-serif";
  const no = String(Math.round(p.seed)).padStart(3, "0");
  const raw = String(p.headline || "").trim().toUpperCase().slice(0, 22);
  const base = H - M;
  let type = "", metaY = base;

  if (raw.length) {
    const n = raw.length;
    const fs = Math.max(26, Math.min(170, (G * 0.98) / (n * 0.66)));
    const est = n * 0.64 * fs;
    const fit = n > 1 && est > G * 0.82 ? ` textLength="${f(G + fs * 0.05)}" lengthAdjust="spacing"` : "";
    type += `<text x="${f(M - fs * 0.03)}" y="${base}" font-family="${display}" font-size="${f(fs)}" font-weight="700"${fit} fill="${p.ink}">${esc(raw)}</text>`;
    metaY = Math.round(base - fs * 0.71 - Math.max(18, fs * 0.2));
  }
  const label = (x, anchor, s) => `<text x="${x}" y="${metaY}" text-anchor="${anchor}" font-family="${sans}" font-size="11" font-weight="500" letter-spacing="2.4" fill="${p.ink}" opacity="0.85">${s}</text>`;
  type += `<rect x="${M}" y="${metaY - 20}" width="${G}" height="1" fill="${p.ink}" opacity="0.7"/>` +
    label(M, "start", "FORM · FARBE · FLÄCHE") + label(M + G, "end", `Nº ${no}`);

  let defs = "", grain = "";
  if (p.texture) {
    const sd = Math.round(p.seed);
    defs = `<defs>` +
      `<filter id="gr" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="${sd}" stitchTiles="stitch"/><feColorMatrix type="matrix" values="0 0 0 0 0.2  0 0 0 0 0.15  0 0 0 0 0.1  1.8 0 0 0 -0.7"/></filter>` +
      `<filter id="mo" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="3" seed="${sd + 7}"/><feColorMatrix type="matrix" values="0 0 0 0 0.35  0 0 0 0 0.27  0 0 0 0 0.16  0.9 0 0 0 -0.35"/></filter>` +
      `<filter id="sp" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves="1" seed="${sd + 13}"/><feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 0.97  2.4 0 0 0 -1.5"/></filter>` +
      `<radialGradient id="vg" cx="0.5" cy="0.45" r="0.75"><stop offset="0.6" stop-color="#3A2A14" stop-opacity="0"/><stop offset="1" stop-color="#3A2A14" stop-opacity="0.14"/></radialGradient>` +
      `</defs>`;
    grain = `<rect width="${W}" height="${H}" filter="url(#mo)" opacity="0.35"/>` +
      `<rect width="${W}" height="${H}" filter="url(#gr)" opacity="0.45"/>` +
      `<rect width="${W}" height="${H}" filter="url(#sp)" opacity="0.35"/>` +
      `<rect width="${W}" height="${H}" fill="url(#vg)"/>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${defs}` +
    `<rect width="${W}" height="${H}" fill="${p.paper}"/>${marks}${body}${type}${grain}</svg>`;
}
