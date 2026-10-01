// Instagram quote card: auto-fitting quote type, oversized sculpted quote marks, *accent* words, and paper/gradient grounds.
export const meta = {
  title: "Quiet Quote Card",
  kind: "poster",
  description: "A square social quote card that auto-fits your text under oversized quote marks, for Instagram posts, carousels and LinkedIn shares.",
  tags: ["quote", "instagram", "social media", "card", "typography", "square", "post", "editorial"],
  price: 3,
  author: "oasis-factory",
  size: [1080, 1080],
};

export const params = {
  knobs: {
    background: { type: "color", label: "Background", default: "#F3EDE2" },
    ink: { type: "color", label: "Text", default: "#1E1B18" },
    accent: { type: "color", label: "Accent", default: "#C8553D" },
    quote: { type: "text", label: "Quote (wrap *words* to accent)", default: "Make the thing you wish existed. Then make it *a little kinder.*" },
    author: { type: "text", label: "Author", default: "Studio Notes" },
    style: { type: "choice", label: "Background style", default: "paper", options: ["solid", "gradient", "paper"] },
    align: { type: "choice", label: "Alignment", default: "left", options: ["left", "center", "right"] },
    typeface: { type: "choice", label: "Typeface", default: "serif", options: ["serif", "serif italic", "sans", "mono"] },
    markSize: { type: "range", label: "Quote mark size", default: 100, min: 40, max: 160, step: 5 },
    frame: { type: "toggle", label: "Inset frame", default: false },
  },
  presets: {
    Ivory: { background: "#F3EDE2", ink: "#1E1B18", accent: "#C8553D" },
    Midnight: { background: "#121826", ink: "#F2EFE9", accent: "#E9B44C" },
    Sage: { background: "#DDE5D6", ink: "#1F2D24", accent: "#4F7A45" },
    Blush: { background: "#F6DCD3", ink: "#3A1F2B", accent: "#B23A48" },
  },
};

const S = 1080, P = 108;
const FACES = {
  serif: { family: "Georgia, 'Times New Roman', serif", weight: 400, italic: false, k: 0.92, lh: 1.2, ls: "0" },
  "serif italic": { family: "Georgia, 'Times New Roman', serif", weight: 400, italic: true, k: 0.87, lh: 1.2, ls: "0" },
  sans: { family: "Helvetica Neue, Helvetica, Arial, sans-serif", weight: 700, italic: false, k: 0.96, lh: 1.12, ls: "-0.02em" },
  mono: { family: "Menlo, Consolas, monospace", weight: 500, italic: false, mono: 0.6, lh: 1.32, ls: "-0.01em" },
};
const SANS = "Helvetica Neue, Helvetica, Arial, sans-serif";
const TAIL = "M4 78C2 40 26 10 74 0L78 12C52 22 40 36 38 48Z";

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function hex(c) {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mix(a, b, t) {
  const A = hex(a), B = hex(b);
  return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join("");
}

function charEm(ch) {
  if (ch === " ") return 0.26;
  if (/[ilj.,;:'!|\u2019\u2018]/.test(ch)) return 0.28;
  if (/[frt\-()"]/.test(ch)) return 0.36;
  if (/[mw]/.test(ch)) return 0.8;
  if (/[MW]/.test(ch)) return 0.92;
  if (/[A-Z]/.test(ch)) return 0.7;
  if (/[0-9]/.test(ch)) return 0.55;
  return 0.52;
}
function measure(str, face) {
  if (face.mono) return str.length * face.mono;
  let w = 0;
  for (const ch of str) w += charEm(ch);
  return w * face.k;
}

function parseWords(raw) {
  const words = [];
  let on = false, cur = "", curA = false;
  for (const ch of String(raw || "")) {
    if (ch === "*") { on = !on; continue; }
    if (/\s/.test(ch)) {
      if (cur) words.push({ t: cur, a: curA });
      cur = "";
    } else {
      if (!cur) curA = on;
      cur += ch;
    }
  }
  if (cur) words.push({ t: cur, a: curA });
  return words.length ? words : [{ t: "\u2026", a: false }];
}

function wrap(words, maxEm, face) {
  const sp = measure(" ", face);
  const lines = [[]];
  let len = 0;
  for (const w of words) {
    const line = lines[lines.length - 1];
    const ww = measure(w.t, face);
    if (line.length && len + sp + ww > maxEm) {
      lines.push([w]);
      len = ww;
    } else {
      len += (line.length ? sp : 0) + ww;
      line.push(w);
    }
  }
  return lines;
}

function renderLine(line, accent) {
  const runs = [];
  for (const w of line) {
    const last = runs[runs.length - 1];
    if (last && last.a === w.a) last.t.push(esc(w.t));
    else runs.push({ a: w.a, t: [esc(w.t)] });
  }
  return runs.map((r) => (r.a ? `<tspan fill="${accent}">${r.t.join(" ")}</tspan>` : r.t.join(" "))).join(" ");
}

function mark(x, y, s, fill) {
  const one = `<circle cx="50" cy="74" r="46"/><path d="${TAIL}"/>`;
  return `<g transform="translate(${x.toFixed(1)},${y.toFixed(1)}) scale(${s.toFixed(4)})" fill="${fill}">${one}<g transform="translate(122,0)">${one}</g></g>`;
}

export default function render(p) {
  const face = FACES[p.typeface] || FACES.serif;
  const bg = p.background, ink = p.ink, acc = p.accent;
  const anchor = p.align === "center" ? "middle" : p.align === "right" ? "end" : "start";
  const ax = p.align === "center" ? S / 2 : p.align === "right" ? S - P : P;

  let defs = "", ground = `<rect width="${S}" height="${S}" fill="${bg}"/>`;
  if (p.style === "gradient") {
    defs += `<linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${bg}"/><stop offset="1" stop-color="${mix(bg, acc, 0.32)}"/></linearGradient>`;
    defs += `<radialGradient id="glow" cx="0.92" cy="0.06" r="0.75"><stop offset="0" stop-color="${acc}" stop-opacity="0.32"/><stop offset="1" stop-color="${acc}" stop-opacity="0"/></radialGradient>`;
    ground = `<rect width="${S}" height="${S}" fill="url(#lg)"/><rect width="${S}" height="${S}" fill="url(#glow)"/>`;
  } else if (p.style === "paper") {
    const shade = mix(bg, "#000000", 0.5);
    defs += `<filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" seed="11" stitchTiles="stitch"/><feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -1.1 0 0 0 0.66"/></filter>`;
    defs += `<filter id="mottle" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.006" numOctaves="3" seed="7"/><feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -1.4 0 0 0 0.8"/></filter>`;
    defs += `<filter id="fiber" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.01 0.05" numOctaves="2" seed="4"/><feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -1.6 0 0 0 0.9"/></filter>`;
    defs += `<radialGradient id="vig" cx="0.5" cy="0.45" r="0.75"><stop offset="0.55" stop-color="${shade}" stop-opacity="0"/><stop offset="1" stop-color="${shade}" stop-opacity="0.14"/></radialGradient>`;
    ground += `<rect width="${S}" height="${S}" filter="url(#mottle)" opacity="0.1"/><rect width="${S}" height="${S}" filter="url(#fiber)" opacity="0.06"/><rect width="${S}" height="${S}" filter="url(#grain)" opacity="0.22"/><rect width="${S}" height="${S}" fill="url(#vig)"/>`;
  }

  const authorY = S - P;
  const hasAuthor = String(p.author || "").trim().length > 0;
  const regionBottom = hasAuthor ? authorY - 104 : S - P;
  const markH = 2 * p.markSize, ms = markH / 120, markW = 200 * ms;
  const gap = 40 + markH * 0.12;
  const W = S - 2 * P;
  const availH = regionBottom - P - markH - gap;

  const words = parseWords(p.quote);
  const longest = Math.max(...words.map((w) => measure(w.t, face)));
  let fs = 104, lines = [];
  for (; fs >= 28; fs -= 2) {
    const maxEm = W / fs;
    lines = wrap(words, maxEm, face);
    if (longest <= maxEm && lines.length * fs * face.lh <= availH) break;
  }
  fs = Math.max(fs, 28);
  const lh = fs * face.lh;
  const blockH = (lines.length - 1) * lh + fs * 0.74;
  const groupH = markH + gap + blockH;
  const top = P + Math.max(0, (regionBottom - P - groupH) * 0.42);

  const mx = p.align === "center" ? S / 2 - markW / 2 : p.align === "right" ? S - P - markW : P - 2 * ms;
  const marks = mark(mx, top, ms, acc);

  const y0 = top + markH + gap + fs * 0.74;
  const fontAttrs = `font-family="${face.family}" font-size="${fs}" font-weight="${face.weight}"${face.italic ? ' font-style="italic"' : ""} letter-spacing="${face.ls}" fill="${ink}" text-anchor="${anchor}"`;
  const body = lines
    .map((l, i) => `<text xml:space="preserve" x="${ax}" y="${(y0 + i * lh).toFixed(1)}" ${fontAttrs}>${renderLine(l, acc)}</text>`)
    .join("");

  let byline = "";
  if (hasAuthor) {
    const rw = 56, track = 5;
    const rx = p.align === "center" ? S / 2 - rw / 2 : p.align === "right" ? S - P - rw : P;
    const bx = ax + (p.align === "right" ? track : p.align === "center" ? track / 2 : 0);
    byline = `<rect x="${rx}" y="${authorY - 52}" width="${rw}" height="4" rx="2" fill="${acc}"/>` +
      `<text x="${bx}" y="${authorY}" font-family="${SANS}" font-size="26" font-weight="600" letter-spacing="${track}" fill="${ink}" fill-opacity="0.78" text-anchor="${anchor}">${esc(String(p.author).trim().toUpperCase())}</text>`;
  }

  const frame = p.frame
    ? `<rect x="40" y="40" width="${S - 80}" height="${S - 80}" fill="none" stroke="${ink}" stroke-opacity="0.22" stroke-width="2"/>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}"><defs>${defs}</defs>${ground}${frame}${marks}${body}${byline}</svg>`;
}
