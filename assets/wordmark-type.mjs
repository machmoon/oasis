// Display wordmark: per-glyph set type with outlined, stacked-shadow, stencil and gradient treatments.
export const meta = {
  title: "Marquee Wordmark",
  kind: "type",
  description: "A bold display wordmark from your own text, with outlined, stacked-shadow, stencil and gradient treatments for logos, headers and merch.",
  tags: ["wordmark", "logo", "typography", "display", "lettering", "brand", "headline", "retro"],
  price: 6,
  author: "oasis-factory",
  size: [1200, 400],
};

export const params = {
  knobs: {
    ink: { type: "color", role: "ink", label: "Ink", default: "#1B1B1F" },
    accent: { type: "color", role: "primary", label: "Accent", default: "#FF5A36" },
    background: { type: "color", role: "background", label: "Background", default: "#F4EFE6" },
    style: { type: "choice", label: "Style", default: "stacked shadow", options: ["outlined", "stacked shadow", "stencil", "gradient fill"] },
    typeface: { type: "choice", label: "Typeface", default: "grotesk", options: ["grotesk", "didone", "slab", "mono"] },
    spacing: { type: "range", label: "Letter spacing", default: 6, min: -6, max: 40, step: 1 },
    slant: { type: "range", label: "Slant", default: 8, min: -20, max: 20, step: 1 },
    depth: { type: "range", label: "Effect depth", default: 10, min: 0, max: 24, step: 1 },
    rules: { type: "toggle", label: "Framing rules", default: true },
    text: { type: "text", label: "Wordmark", default: "SOLSTICE" },
  },
  presets: {
    Classic: { ink: "#1B1B1F", accent: "#FF5A36", background: "#F4EFE6" },
    Riviera: { ink: "#0E3B43", accent: "#F2B134", background: "#F7F3EA" },
    Neon: { ink: "#F5F5F7", accent: "#FF2E88", background: "#111015" },
    Mint: { ink: "#10302A", accent: "#3DDC97", background: "#EAF6F0" },
  },
};

const FACES = {
  grotesk: { family: "'Helvetica Neue', Helvetica, Arial, sans-serif", weight: 800, cap: 0.72, k: 1 },
  didone: { family: "Didot, 'Bodoni 72', 'Bodoni MT', Georgia, 'Times New Roman', serif", weight: 700, cap: 0.68, k: 0.94 },
  slab: { family: "Rockwell, 'Roboto Slab', 'Arvo', Georgia, serif", weight: 700, cap: 0.7, k: 1 },
  mono: { family: "Menlo, Consolas, 'Courier New', monospace", weight: 700, cap: 0.7, mono: 0.6 },
};

const UP = { A: .72, B: .72, C: .72, D: .72, E: .66, F: .61, G: .78, H: .72, I: .28, J: .56, K: .72, L: .61, M: .83,
  N: .72, O: .78, P: .67, Q: .78, R: .72, S: .67, T: .61, U: .72, V: .67, W: .94, X: .67, Y: .67, Z: .61 };
const ROUND = "BCDGOPQRSU0689abcdegopqsu";
const HCUT = { A: .3, E: .5, F: .5, H: .5, K: .5, L: .45, T: .45, I: .45, J: .55, N: .5, M: .5, W: .5, V: .55, Y: .4, X: .5, Z: .5 };

function adv(ch, f) {
  if (f.mono) return f.mono;
  if (ch === " ") return 0.28;
  let w = UP[ch];
  if (w == null) {
    if (/[a-z]/.test(ch)) w = "ijl".includes(ch) ? .28 : "ft".includes(ch) ? .34 : ch === "r" ? .4 : "mw".includes(ch) ? .86 : .58;
    else if (/[0-9]/.test(ch)) w = .58;
    else if ("&@%".includes(ch)) w = .76;
    else w = .34;
  }
  return w * f.k;
}

function hex(c) { const n = parseInt(String(c).slice(1), 16) || 0; return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function mix(a, b, t) {
  const A = hex(a), B = hex(b);
  return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join("");
}
const n1 = (v) => +v.toFixed(1);
const esc = (c) => (c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : c);

export default function render(p) {
  const W = 1200, H = 400, CX = W / 2;
  const f = FACES[p.typeface] || FACES.grotesk;
  const chars = Array.from(String(p.text || "").trim() || "Wordmark").slice(0, 24);
  const sp = p.spacing / 100;
  const advs = chars.map((c) => adv(c, f));
  const totalEm = advs.reduce((a, b) => a + b, 0) + sp * (chars.length - 1);
  const tan = Math.tan((p.slant * Math.PI) / 180);
  const d = p.depth;
  const extEm = p.style === "stacked shadow" ? 2 * (0.02 + d * 0.003)
    : p.style === "outlined" ? d * 0.004 : p.style === "stencil" ? d * 0.003 : 0;
  const fs = Math.min(230, 1000 / Math.max(0.5, totalEm + f.cap * Math.abs(tan) + extEm + 0.04));
  const wordW = totalEm * fs, capH = f.cap * fs, ext = extEm * fs;
  const baseY = H / 2 + capH / 2 - ext * 0.35;
  const x0 = CX - wordW / 2 - (capH * tan) / 2 - ext * 0.35;

  const centers = [];
  let x = x0;
  advs.forEach((a) => { centers.push(x + (a * fs) / 2); x += (a + sp) * fs; });

  const glyphs = chars.map((c, i) => (c === " " ? "" :
    `<text x="${n1(centers[i])}" y="${n1(baseY)}" text-anchor="middle">${esc(c)}</text>`)).join("");
  const word = (attrs, dx = 0, dy = 0) =>
    `<g transform="translate(${n1(dx + tan * dy)} ${n1(dy)})" ${attrs}>${glyphs}</g>`;

  let defs = `<filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7"/><feColorMatrix values="0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0.06 0"/></filter>`;
  let body = "";

  if (p.style === "stacked shadow") {
    const off = fs * (0.02 + d * 0.003), sw = fs * 0.016;
    const layers = [[2, mix(p.accent, p.background, 0.5)], [1, p.accent], [0, p.ink]];
    body = layers.map(([k, c]) =>
      word(`fill="${p.background}" stroke="${p.background}" stroke-width="${n1(sw * 2)}" stroke-linejoin="round"`, k * off, k * off) +
      word(`fill="${c}"`, k * off, k * off)).join("");
  } else if (p.style === "outlined") {
    const sw = fs * (0.014 + d * 0.0008), off = fs * d * 0.004;
    body = (d > 0 ? word(`fill="${p.accent}"`, off, off) : "") +
      word(`fill="none" stroke="${p.ink}" stroke-width="${n1(sw)}" stroke-linejoin="round"`);
  } else if (p.style === "stencil") {
    const cw = fs * (0.035 + d * 0.0015), off = fs * d * 0.003;
    let cuts = "";
    chars.forEach((c, i) => {
      if (ROUND.includes(c)) {
        cuts += `<rect x="${n1(centers[i] - cw / 2)}" y="${n1(baseY - fs * 1.1)}" width="${n1(cw)}" height="${n1(fs * 1.5)}" fill="#000"/>`;
      } else if (HCUT[c] != null) {
        const w = advs[i] * fs;
        cuts += `<rect x="${n1(centers[i] - w / 2 - 4)}" y="${n1(baseY - capH * HCUT[c] - cw / 2)}" width="${n1(w + 8)}" height="${n1(cw)}" fill="#000"/>`;
      }
    });
    defs += `<mask id="st" maskUnits="userSpaceOnUse" x="${-W}" y="${-H}" width="${W * 3}" height="${H * 3}"><rect x="${-W}" y="${-H}" width="${W * 3}" height="${H * 3}" fill="#fff"/>${cuts}</mask>`;
    const sh = d > 0 ? `<g transform="translate(${n1(off + tan * off)} ${n1(off)})"><g fill="${p.accent}" opacity="0.9" mask="url(#st)">${glyphs}</g></g>` : "";
    body = sh + word(`fill="${p.ink}" mask="url(#st)"`);
  } else {
    const dy = fs * d * 0.0025;
    defs += `<linearGradient id="wg" gradientUnits="userSpaceOnUse" x1="${n1(x0)}" y1="${n1(baseY - capH)}" x2="${n1(x0 + wordW)}" y2="${n1(baseY)}"><stop offset="0" stop-color="${p.ink}"/><stop offset="1" stop-color="${p.accent}"/></linearGradient>` +
      `<linearGradient id="sh" gradientUnits="userSpaceOnUse" x1="0" y1="${n1(baseY - capH)}" x2="0" y2="${n1(baseY)}"><stop offset="0" stop-color="#fff" stop-opacity="0.38"/><stop offset="0.5" stop-color="#fff" stop-opacity="0"/></linearGradient>` +
      `<filter id="ds" x="-10%" y="-30%" width="120%" height="170%"><feDropShadow dx="0" dy="${n1(dy)}" stdDeviation="${n1(dy * 0.8)}" flood-color="${p.ink}" flood-opacity="0.3"/></filter>`;
    body = word(`fill="url(#wg)"${d > 0 ? ' filter="url(#ds)"' : ""}`) + word(`fill="url(#sh)"`);
  }

  let rules = "";
  if (p.rules) {
    const pad = Math.max(24, capH * 0.3 + ext * 0.25);
    const half = wordW / 2 + (capH * Math.abs(tan)) / 2 + ext * 0.35 + 32;
    const ys = [baseY - capH - pad, baseY + ext * 0.7 + pad];
    const s = Math.max(5, fs * 0.03), lw = Math.max(2, fs * 0.01);
    ys.forEach((y) => {
      rules += `<line x1="${n1(CX - half + s * 2)}" y1="${n1(y)}" x2="${n1(CX + half - s * 2)}" y2="${n1(y)}" stroke="${p.accent}" stroke-width="${n1(lw)}"/>`;
      [CX - half, CX + half].forEach((ex) => {
        rules += `<path d="M${n1(ex)} ${n1(y - s)} L${n1(ex + s)} ${n1(y)} L${n1(ex)} ${n1(y + s)} L${n1(ex - s)} ${n1(y)}Z" fill="${p.accent}"/>`;
      });
    });
  }

  const font = `font-family="${f.family}" font-size="${n1(fs)}" font-weight="${f.weight}"`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><defs>${defs}</defs>` +
    `<rect width="${W}" height="${H}" fill="${p.background}"/><rect width="${W}" height="${H}" filter="url(#grain)"/>${rules}` +
    `<g ${font} transform="translate(${CX} ${n1(baseY)}) skewX(${-p.slant}) translate(${-CX} ${n1(-baseY)})">${body}</g></svg>`;
}
