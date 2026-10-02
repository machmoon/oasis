// Colour palette swatch card: five swatches with computed HEX/RGB labels in stripe, circle or chip layouts.
export const meta = {
  title: "Palette Swatch Card",
  kind: "brand",
  description: "A presentation-ready colour palette card with five swatches and live hex labels, for moodboards, brand guides and design hand-offs.",
  tags: ["palette", "colour", "swatches", "brand guide", "moodboard", "hex", "style guide"],
  price: 0,
  author: "oasis-factory",
  size: [960, 640],
};

export const params = {
  knobs: {
    c1: { type: "color", role: "ink", label: "Swatch 1", default: "#1F2A44" },
    c2: { type: "color", role: "secondary", label: "Swatch 2", default: "#3E6B6B" },
    c3: { type: "color", role: "muted", label: "Swatch 3", default: "#C9A66B" },
    c4: { type: "color", role: "surface", label: "Swatch 4", default: "#E8DCC8" },
    c5: { type: "color", role: "primary", label: "Swatch 5", default: "#D9643A" },
    paper: { type: "color", role: "background", label: "Card", default: "#FBF8F3" },
    name: { type: "text", label: "Palette name", default: "Mesa at Dusk" },
    layout: { type: "choice", label: "Layout", default: "stripes", options: ["stripes", "circles", "cards"] },
    radius: { type: "range", label: "Corner radius", default: 18, min: 0, max: 48, step: 1 },
    showRgb: { type: "toggle", label: "Show RGB values", default: true },
  },
  presets: {
    Mesa: { c1: "#1F2A44", c2: "#3E6B6B", c3: "#C9A66B", c4: "#E8DCC8", c5: "#D9643A", paper: "#FBF8F3" },
    Nordic: { c1: "#2E3440", c2: "#5E81AC", c3: "#88C0D0", c4: "#D8DEE9", c5: "#A3BE8C", paper: "#F6F7F9" },
    Citrus: { c1: "#264027", c2: "#3C6E47", c3: "#F2C14E", c4: "#F78154", c5: "#FDF0D5", paper: "#FFFDF8" },
    Midnight: { c1: "#7B61FF", c2: "#00D1FF", c3: "#FF5C8A", c4: "#FFD166", c5: "#F1F1F6", paper: "#14141C" },
  },
};

const MONO = "Menlo, Consolas, 'Courier New', monospace";
const SANS = "'Helvetica Neue', Helvetica, Arial, sans-serif";

function hex(c) {
  let h = String(c || "#000000").replace("#", "").replace(/[^0-9a-fA-F]/g, "");
  if (h.length === 3) h = h.split("").map((x) => x + x).join("");
  while (h.length < 6) h += "0";
  return "#" + h.slice(0, 6).toUpperCase();
}
function rgb(c) {
  const h = hex(c).slice(1);
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}
function lum(c) {
  const [r, g, b] = rgb(c).map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function mix(a, b, t) {
  const A = rgb(a), B = rgb(b);
  return "#" + A.map((v, i) => {
    const s = Math.round(v + (B[i] - v) * t).toString(16);
    return s.length < 2 ? "0" + s : s;
  }).join("").toUpperCase();
}
function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
const f = (n) => (+n).toFixed(1);
const on = (c) => (lum(c) > 0.3 ? "#14141A" : "#FFFFFF");

export default function render(p) {
  const W = 960, H = 640;
  const cols = [p.c1, p.c2, p.c3, p.c4, p.c5].map(hex);
  const paper = hex(p.paper);
  const pl = lum(paper);
  const dark = pl < 0.4;
  const ink = dark ? "#F4F2EE" : "#16161A";
  const backdrop = mix(paper, dark ? "#000000" : "#1A1A22", dark ? 0.35 : 0.07);
  const r = Math.max(0, +p.radius || 0);
  const cardR = Math.min(8 + r * 1.0, 56);
  const raw = String(p.name || "Untitled").slice(0, 40);
  const name = esc(raw);
  const rgbTxt = (c) => rgb(c).join("  ");

  const cx = 40, cy = 40, cw = 880, ch = 560;
  const X0 = 88, X1 = 872, RW = X1 - X0, Y0 = 188, Y1 = 552, RH = Y1 - Y0;

  const fs = Math.min(42, 600 / (Math.max(1, raw.length) * 0.6));

  let defs = `<filter id="cs" x="-10%" y="-10%" width="120%" height="130%"><feDropShadow dx="0" dy="14" stdDeviation="18" flood-color="#000000" flood-opacity="${dark ? 0.45 : 0.12}"/></filter>`;
  defs += `<filter id="ss" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#000000" flood-opacity="${dark ? 0.4 : 0.1}"/></filter>`;

  let header = `<text x="${X0}" y="104" font-family="${SANS}" font-size="12" font-weight="600" letter-spacing="2.4" fill="${ink}" fill-opacity="0.55">COLOUR PALETTE · 05</text>`;
  header += `<text x="${X0}" y="${f(104 + 18 + fs * 0.82)}" font-family="${SANS}" font-size="${f(fs)}" font-weight="700" letter-spacing="${f(-fs * 0.02)}" fill="${ink}">${name}</text>`;
  for (let i = 4; i >= 0; i--) {
    const dx = X1 - 12 - (4 - i) * 16;
    header += `<circle cx="${dx}" cy="100" r="11" fill="${cols[i]}" stroke="${paper}" stroke-width="3"/>`;
  }
  header += `<line x1="${X0}" y1="166" x2="${X1}" y2="166" stroke="${ink}" stroke-opacity="0.1" stroke-width="1"/>`;

  const nearPaper = (c) => Math.abs(lum(c) - pl) < 0.06;
  let body = "";
  if (p.layout === "circles") {
    const gap = 28;
    const d = (RW - gap * 4) / 5;
    const block = d + (p.showRgb ? 72 : 50);
    const top = Y0 + (RH - block) / 2;
    const ccy = top + d / 2;
    body += `<line x1="${X0}" y1="${f(ccy)}" x2="${X1}" y2="${f(ccy)}" stroke="${ink}" stroke-opacity="0.08" stroke-width="1" stroke-dasharray="2 6"/>`;
    cols.forEach((c, i) => {
      const x = X0 + d / 2 + i * (d + gap);
      const ring = nearPaper(c) ? ` stroke="${ink}" stroke-opacity="0.12" stroke-width="1"` : "";
      body += `<circle cx="${f(x)}" cy="${f(ccy)}" r="${f(d / 2)}" fill="${c}"${ring}/>`;
      body += `<text x="${f(x)}" y="${f(ccy + 4)}" text-anchor="middle" font-family="${SANS}" font-size="12" font-weight="600" letter-spacing="1.5" fill="${on(c)}" fill-opacity="0.75">0${i + 1}</text>`;
      body += `<text x="${f(x)}" y="${f(ccy + d / 2 + 36)}" text-anchor="middle" font-family="${MONO}" font-size="15" font-weight="700" letter-spacing="0.6" fill="${ink}">${c}</text>`;
      if (p.showRgb) body += `<text x="${f(x)}" y="${f(ccy + d / 2 + 60)}" text-anchor="middle" font-family="${MONO}" font-size="12" fill="${ink}" fill-opacity="0.6">${rgbTxt(c)}</text>`;
    });
  } else if (p.layout === "cards") {
    const gap = 20;
    const w = (RW - gap * 4) / 5;
    const rr = Math.min(r, 40);
    const chip = dark ? mix(paper, "#FFFFFF", 0.07) : "#FFFFFF";
    const split = RH * 0.64;
    cols.forEach((c, i) => {
      const x = X0 + i * (w + gap);
      defs += `<clipPath id="k${i}"><rect x="${f(x)}" y="${Y0}" width="${f(w)}" height="${RH}" rx="${f(rr)}"/></clipPath>`;
      body += `<rect x="${f(x)}" y="${Y0}" width="${f(w)}" height="${RH}" rx="${f(rr)}" fill="${chip}" filter="url(#ss)"/>`;
      body += `<rect x="${f(x)}" y="${Y0}" width="${f(w)}" height="${f(split)}" fill="${c}" clip-path="url(#k${i})"/>`;
      body += `<text x="${f(x + 16 + rr * 0.15)}" y="${f(Y0 + 30 + rr * 0.15)}" font-family="${SANS}" font-size="11" font-weight="600" letter-spacing="1.8" fill="${on(c)}" fill-opacity="0.7">0${i + 1}</text>`;
      const lx = x + 16, ly = Y0 + split;
      body += `<text x="${f(lx)}" y="${f(ly + 36)}" font-family="${MONO}" font-size="15" font-weight="700" letter-spacing="0.4" fill="${ink}">${c}</text>`;
      if (p.showRgb) body += `<text x="${f(lx)}" y="${f(ly + 60)}" font-family="${MONO}" font-size="12" fill="${ink}" fill-opacity="0.6">${rgbTxt(c)}</text>`;
      body += `<text x="${f(lx + rr * 0.15)}" y="${f(Y1 - 18 - rr * 0.1)}" font-family="${SANS}" font-size="10" font-weight="600" letter-spacing="1.8" fill="${ink}" fill-opacity="0.45">NO. 0${i + 1}</text>`;
      body += `<circle cx="${f(x + w - 20 - rr * 0.15)}" cy="${f(Y1 - 22 - rr * 0.1)}" r="4" fill="${c}"${nearPaper(c) || lum(c) > 0.85 ? ` stroke="${ink}" stroke-opacity="0.2" stroke-width="1"` : ""}/>`;
    });
  } else {
    const rr = Math.min(r, 60);
    const w = RW / 5;
    const inset = rr * 0.3;
    const pad = 20 + inset;
    const ty = Y0 + 32 + inset;
    const by = Y1 - 26 - inset;
    defs += `<clipPath id="st"><rect x="${X0}" y="${Y0}" width="${RW}" height="${RH}" rx="${f(rr)}"/></clipPath>`;
    let g = "";
    cols.forEach((c, i) => {
      const x = X0 + i * w;
      const t = on(c);
      g += `<rect x="${f(x)}" y="${Y0}" width="${f(w + (i < 4 ? 1 : 0))}" height="${RH}" fill="${c}"/>`;
      g += `<text x="${f(x + pad)}" y="${f(ty)}" font-family="${SANS}" font-size="11" font-weight="600" letter-spacing="1.8" fill="${t}" fill-opacity="0.7">0${i + 1}</text>`;
      if (p.showRgb) g += `<text x="${f(x + pad)}" y="${f(by)}" font-family="${MONO}" font-size="12" fill="${t}" fill-opacity="0.75">${rgbTxt(c)}</text>`;
      g += `<text x="${f(x + pad)}" y="${f(p.showRgb ? by - 22 : by)}" font-family="${MONO}" font-size="15" font-weight="700" letter-spacing="0.4" fill="${t}">${c}</text>`;
    });
    body += `<g clip-path="url(#st)">${g}</g>`;
    if (cols.some(nearPaper)) body += `<rect x="${X0 + 0.5}" y="${Y0 + 0.5}" width="${RW - 1}" height="${RH - 1}" rx="${f(rr)}" fill="none" stroke="${ink}" stroke-opacity="0.08"/>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><defs>${defs}</defs>` +
    `<rect width="${W}" height="${H}" fill="${backdrop}"/>` +
    `<rect x="${cx}" y="${cy}" width="${cw}" height="${ch}" rx="${f(cardR)}" fill="${paper}" filter="url(#cs)"/>` +
    header + body + `</svg>`;
}
